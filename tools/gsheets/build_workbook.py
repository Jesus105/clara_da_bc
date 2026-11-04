"""Construye el análisis de TaskNest en Google Sheets *desde cero*, solo con fórmulas.

Lo único pegado como valores son los CSV originales (hojas raw_) y los parámetros (hoja params).
Todo lo demás es fórmula: events_prep → user_facts → tablas dinámicas → hojas de análisis → conclusiones.

Uso:  .venv/bin/python build_workbook.py      (reconstruye el libro completo; idempotente)
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

from gsheets_client import Sheets

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent

USERS = list(csv.reader(open(ROOT / "data" / "raw" / "trial_users.csv", newline="")))
EVENTS = list(csv.reader(open(ROOT / "data" / "raw" / "product_events.csv", newline="")))
UL = len(USERS)  # última fila de usuarios (con encabezado en la fila 1)
EL = len(EVENTS)  # última fila de eventos

# ---------------------------------------------------------------- estilo
BLUE, INK, GREY, MUTED, LIGHT, WHITE = "#2a78d6", "#0b0b0b", "#52514e", "#898781", "#f3f2ef", "#ffffff"
INPUT, GOOD, BAD, ORANGE = "#1155cc", "#006300", "#d03b3b", "#eb6834"
PCT, PP, PP2 = "0.0%", '+0.0" pp";-0.0" pp";0.0" pp"', '+0.00" pp";-0.00" pp";0.00" pp"'
USD, USDD, INT, INTD, DEC2 = "$0.00", "+$0.00;-$0.00;$0.00", "#,##0", "+#,##0;-#,##0;0", "0.00"
DATE, DT, X = "yyyy-mm-dd", "yyyy-mm-dd hh:mm", '0.00"×"'

S = Sheets()
WR: list[tuple[str, list[list]]] = []  # escrituras pendientes (rango, filas)
RQ: list[dict] = []  # requests de formato / estructura
CF: list[dict] = []  # formato condicional
REF: dict[str, str] = {}  # celdas clave para verificación y conclusiones
SID: dict[str, int] = {}


def col(i: int) -> str:
    s = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


def a1(sh: str, r: int, c: int) -> str:
    return f"'{sh}'!{col(c)}{r}"


def rgb(h: str) -> dict:
    h = h.lstrip("#")
    return {"red": int(h[0:2], 16) / 255, "green": int(h[2:4], 16) / 255, "blue": int(h[4:6], 16) / 255}


def grid(sh: str, r1: int, c1: int, r2: int, c2: int) -> dict:
    return {"sheetId": SID[sh], "startRowIndex": r1 - 1, "endRowIndex": r2, "startColumnIndex": c1, "endColumnIndex": c2 + 1}


def fmt(sh, r1, c1, r2, c2, nf=None, bold=None, size=None, fg=None, bg=None, italic=None, h=None, wrap=None, v=None):
    f, fields = {}, []
    if nf:
        f["numberFormat"] = {"type": "NUMBER", "pattern": nf}
        fields.append("userEnteredFormat.numberFormat")
    tf = {}
    for key, val, name in [("bold", bold, "bold"), ("fontSize", size, "fontSize"), ("italic", italic, "italic")]:
        if val is not None:
            tf[key] = val
            fields.append(f"userEnteredFormat.textFormat.{name}")
    if fg:
        tf["foregroundColor"] = rgb(fg)
        fields.append("userEnteredFormat.textFormat.foregroundColor")
    if tf:
        f["textFormat"] = tf
    if bg:
        f["backgroundColor"] = rgb(bg)
        fields.append("userEnteredFormat.backgroundColor")
    if h:
        f["horizontalAlignment"] = h
        fields.append("userEnteredFormat.horizontalAlignment")
    if v:
        f["verticalAlignment"] = v
        fields.append("userEnteredFormat.verticalAlignment")
    if wrap:
        f["wrapStrategy"] = "WRAP"
        fields.append("userEnteredFormat.wrapStrategy")
    RQ.append({"repeatCell": {"range": grid(sh, r1, c1, r2, c2), "cell": {"userEnteredFormat": f}, "fields": ",".join(fields)}})


def border_bottom(sh, r, c1, c2, color=GREY, style="SOLID"):
    RQ.append({"updateBorders": {"range": grid(sh, r, c1, r, c2), "bottom": {"style": style, "color": rgb(color)}}})


def put(sh: str, r: int, c: int, rows: list[list]):
    WR.append((a1(sh, r, c), rows))


def page_title(sh: str, title: str, sub: str):
    put(sh, 1, 0, [[title], [sub]])
    fmt(sh, 1, 0, 1, 0, bold=True, size=18, fg=INK)
    fmt(sh, 2, 0, 2, 0, italic=True, fg=GREY, size=10)


def section(sh: str, r: int, text: str, sub: str | None = None):
    put(sh, r, 0, [[text]] + ([[sub]] if sub else []))
    fmt(sh, r, 0, r, 0, bold=True, size=13, fg=INK)
    if sub:
        fmt(sh, r + 1, 0, r + 1, 0, italic=True, fg=GREY, size=10)


def note(sh: str, r: int, text: str, c: int = 0):
    put(sh, r, c, [[text]])
    fmt(sh, r, c, r, c, italic=True, fg=GREY, size=10)


def table(sh: str, r: int, c: int, header: list, rows: list[list], nfs: dict | None = None, pp_cols=(), status_cols=()):
    """Escribe encabezado + filas, da formato y devuelve (primera, última) fila de datos."""
    put(sh, r, c, [header] + rows)
    c2 = c + len(header) - 1
    fmt(sh, r, c, r, c2, bold=True, fg=WHITE, bg=BLUE, wrap=True, v="MIDDLE")
    r1, r2 = r + 1, r + len(rows)
    if rows:
        fmt(sh, r1, c, r2, c, h="LEFT")
        for i in range(r1, r2 + 1):
            border_bottom(sh, i, c, c2, color="#e1e0d9")
    for ci, nf in (nfs or {}).items():
        fmt(sh, r1, c + ci, r2, c + ci, nf=nf)
    for ci in pp_cols:
        rng = grid(sh, r1, c + ci, r2, c + ci)
        CF.append({"addConditionalFormatRule": {"rule": {"ranges": [rng], "booleanRule": {"condition": {"type": "NUMBER_GREATER", "values": [{"userEnteredValue": "0"}]}, "format": {"textFormat": {"foregroundColor": rgb(BLUE), "bold": True}}}}, "index": 0}})
        CF.append({"addConditionalFormatRule": {"rule": {"ranges": [rng], "booleanRule": {"condition": {"type": "NUMBER_LESS", "values": [{"userEnteredValue": "0"}]}, "format": {"textFormat": {"foregroundColor": rgb(BAD), "bold": True}}}}, "index": 0}})
    for ci in status_cols:
        rng = grid(sh, r1, c + ci, r2, c + ci)
        CF.append({"addConditionalFormatRule": {"rule": {"ranges": [rng], "booleanRule": {"condition": {"type": "TEXT_STARTS_WITH", "values": [{"userEnteredValue": "✓"}]}, "format": {"textFormat": {"foregroundColor": rgb(GOOD), "bold": True}}}}, "index": 0}})
        CF.append({"addConditionalFormatRule": {"rule": {"ranges": [rng], "booleanRule": {"condition": {"type": "TEXT_STARTS_WITH", "values": [{"userEnteredValue": "⚠"}]}, "format": {"textFormat": {"foregroundColor": rgb(BAD), "bold": True}}}}, "index": 0}})
    return r1, r2


CHARTS: list[dict] = []


def chart(sh: str, spec: dict, row: int, colix: int, w: int = 620, h: int = 340):
    CHARTS.append({"addChart": {"chart": {"spec": spec, "position": {"overlayPosition": {"anchorCell": {"sheetId": SID[sh], "rowIndex": row - 1, "columnIndex": colix}, "widthPixels": w, "heightPixels": h}}}}})


def src(sh, r1, c, r2):
    return {"sourceRange": {"sources": [grid(sh, r1, c, r2, c)]}}


def basic_chart(title, kind, sh, domain, series, r1, r2, vtitle=None, htitle=None, colors=None, stacked=False):
    return {
        "title": title,
        "titleTextFormat": {"bold": True, "fontSize": 12},
        "basicChart": {
            "chartType": kind,
            "legendPosition": "BOTTOM_LEGEND",
            "headerCount": 1,
            "axis": [{"position": "BOTTOM_AXIS", "title": htitle or ""}, {"position": "LEFT_AXIS", "title": vtitle or ""}],
            "domains": [{"domain": src(sh, r1, domain, r2)}],
            "series": [
                {"series": src(sh, r1, s, r2), "targetAxis": "BOTTOM_AXIS" if kind == "BAR" else "LEFT_AXIS", **({"colorStyle": {"rgbColor": rgb(colors[i])}} if colors else {})}
                for i, s in enumerate(series)
            ],
            **({"stackedType": "STACKED"} if stacked else {}),
        },
    }


# ---------------------------------------------------------------- estructura del libro
SHEETS = [
    ("README", BLUE, 80, 8),
    ("Conclusions", BLUE, 60, 6),
    ("1 Data Quality", "#4f9a61", 60, 12),
    ("2 Dashboard vs Reality", "#4f9a61", 60, 12),
    ("3 Channel Mix", "#4f9a61", 60, 16),
    ("4 Guided vs Classic", "#4f9a61", 80, 20),
    ("5 Android 3.2", "#4f9a61", 60, 14),
    ("6 Users", "#4f9a61", 90, 12),
    ("7 Weekly Timeline", "#4f9a61", 60, 12),
    ("Pivot Tables", ORANGE, 60, 34),
    ("params", MUTED, 30, 4),
    ("user_facts", MUTED, UL, 32),
    ("events_prep", MUTED, EL, 14),
    ("raw_trial_users", "#9aa0a6", UL, 9),
    ("raw_product_events", "#9aa0a6", EL, 5),
]
DATA_SHEETS = {"params", "user_facts", "events_prep", "raw_trial_users", "raw_product_events"}


def reset_workbook():
    meta = S.meta("properties,sheets.properties,namedRanges")
    reqs = [{"deleteNamedRange": {"namedRangeId": nr["namedRangeId"]}} for nr in meta.get("namedRanges", [])]
    reqs.append({"addSheet": {"properties": {"title": "__tmp__"}}})
    reqs.append({"updateSpreadsheetProperties": {"properties": {"locale": "en_US", "timeZone": "America/Mexico_City"}, "fields": "locale,timeZone"}})
    S.batch(reqs)
    S.batch([{"deleteSheet": {"sheetId": sh["properties"]["sheetId"]}} for sh in meta["sheets"]])
    adds = []
    for i, (title, color, rows, cols) in enumerate(SHEETS):
        adds.append({"addSheet": {"properties": {"title": title, "index": i, "tabColorStyle": {"rgbColor": rgb(color)},
                                                  "gridProperties": {"rowCount": rows, "columnCount": cols, "hideGridlines": title not in DATA_SHEETS,
                                                                     "frozenRowCount": 1 if title in DATA_SHEETS - {"params"} else 0}}}})
    res = S.batch(adds)
    for rep in res[0]["replies"]:
        p = rep["addSheet"]["properties"]
        SID[p["title"]] = p["sheetId"]
    tmp = [s["properties"]["sheetId"] for s in S.meta()["sheets"] if s["properties"]["title"] == "__tmp__"]
    S.batch([{"deleteSheet": {"sheetId": tmp[0]}}])


def named(name: str, sh: str, r1: int, c: int, r2: int | None = None):
    RQ.append({"addNamedRange": {"namedRange": {"name": name, "range": grid(sh, r1, c, r2 or r1, c)}}})


# ---------------------------------------------------------------- 1) datos crudos
def load_raw():
    print("· Pegando CSV en hojas raw_ …")
    S.write_chunked("raw_trial_users", 1, USERS)
    S.write_chunked("raw_product_events", 1, EVENTS)
    for sh, n, last in [("raw_trial_users", 9, UL), ("raw_product_events", 5, EL)]:
        fmt(sh, 1, 0, 1, n - 1, bold=True, bg=LIGHT, fg=INK)
        fmt(sh, 2, 0, last, n - 1, fg=INPUT)  # azul = dato de entrada (pegado)
    fmt("raw_trial_users", 2, 1, UL, 1, nf=DT)
    fmt("raw_trial_users", 2, 8, UL, 8, nf=DT)
    fmt("raw_product_events", 2, 2, EL, 2, nf=DT)


# ---------------------------------------------------------------- 2) parámetros
PARAMS = [
    ("LAUNCH", "2026-06-01", "Guided Onboarding + Creator Campaign launch. Pre = sign-ups before this date.", DATE),
    ("ACT_DAYS", "7", "Activation window (days after sign-up).", "0"),
    ("CONV_DAYS", "14", "Trial conversion window (days after sign-up).", "0"),
    ("SKEW_MIN", "900", "Clock-skew tolerance in minutes (15 h) for the sensitivity version of activation.", "0"),
    ("MIN_TASKS", "3", "Tasks needed to count as activated (plus ≥1 project).", "0"),
    ("BROKEN_PLATFORM", "Android", "Platform with broken task tracking.", None),
    ("BROKEN_VERSION", "3.2", "App version that under-logs task_created (from Jun 20).", None),
    ("HEALTH_MIN", "2.5", "Tasks per project below this value = events are being lost.", "0.0"),
    ("LAST_EVENT", f"=MAX(raw_product_events!C2:C{EL})", "Last event in the data (formula).", DT),
    ("CUTOFF", "=INT(B11)", "Extraction cutoff = start of the last event day (conservative). Cohorts need 14 full days before it.", DATE),
]


def build_params():
    sh = "params"
    put(sh, 1, 0, [["Parameters (inputs in blue, formulas in black)"]])
    fmt(sh, 1, 0, 1, 0, bold=True, size=14)
    rows = [[n, v, d] for n, v, d, _ in PARAMS]
    table(sh, 2, 0, ["Name (named range)", "Value", "What it is"], rows)
    for i, (n, v, d, nf) in enumerate(PARAMS):
        r = 3 + i
        named(n, sh, r, 1)
        if nf:
            fmt(sh, r, 1, r, 1, nf=nf)
        fmt(sh, r, 1, r, 1, fg=INK if str(v).startswith("=") else INPUT, bold=True)


# ---------------------------------------------------------------- 3) events_prep
EV_COLS = [
    ("event_id", "=raw_product_events!A{r}"),
    ("user_id", "=raw_product_events!B{r}"),
    ("event_at", "=raw_product_events!C{r}"),
    ("event_name", "=raw_product_events!D{r}"),
    ("app_version", "=raw_product_events!E{r}"),
    ("signup_at", "=XLOOKUP({user_id},raw_trial_users!$A$2:$A$%d,raw_trial_users!$B$2:$B$%d)" % (UL, UL)),
    ("minutes_from_signup", "=ROUND(({event_at}-{signup_at})*1440)"),
    ("hours_from_signup", "={minutes_from_signup}/60"),
    ("before_signup", "=IF({minutes_from_signup}<0,1,0)"),
    ("in_7d", "=IF(AND({minutes_from_signup}>=0,{minutes_from_signup}<=ACT_DAYS*1440),1,0)"),
    ("in_7d_tol", "=IF(AND({minutes_from_signup}>=-SKEW_MIN,{minutes_from_signup}<=ACT_DAYS*1440),1,0)"),
    ("in_14d_tol", "=IF(AND({minutes_from_signup}>=-SKEW_MIN,{minutes_from_signup}<=CONV_DAYS*1440),1,0)"),
    ("version_mismatch", "=IF({app_version}=XLOOKUP({user_id},raw_trial_users!$A$2:$A$%d,raw_trial_users!$F$2:$F$%d),0,1)" % (UL, UL)),
]
EV_NAMED = {"user_id": "ev_user", "event_name": "ev_name", "minutes_from_signup": "ev_minutes", "before_signup": "ev_before",
            "in_7d": "ev_in7", "in_7d_tol": "ev_in7tol", "in_14d_tol": "ev_in14tol", "version_mismatch": "ev_mismatch"}


def rows_from(cols, last):
    letters = {k: col(i) for i, (k, _) in enumerate(cols)}
    out = []
    for r in range(2, last + 1):
        refs = {k: f"{L}{r}" for k, L in letters.items()}
        out.append([t.format(r=r, **refs) for _, t in cols])
    return out


def build_events_prep():
    sh = "events_prep"
    print("· Fórmulas de events_prep …")
    S.write(f"'{sh}'!A1", [[k for k, _ in EV_COLS]])
    S.write_chunked(sh, 2, rows_from(EV_COLS, EL), chunk=1500)
    fmt(sh, 1, 0, 1, len(EV_COLS) - 1, bold=True, bg=LIGHT)
    fmt(sh, 2, 2, EL, 2, nf=DT)
    fmt(sh, 2, 5, EL, 5, nf=DT)
    fmt(sh, 2, 7, EL, 7, nf="0.0")
    for i, (k, _) in enumerate(EV_COLS):
        if k in EV_NAMED:
            named(EV_NAMED[k], sh, 2, i, EL)


# ---------------------------------------------------------------- 4) user_facts
UF_COLS = [
    ("user_id", "=raw_trial_users!A{r}"),
    ("signup_at", "=raw_trial_users!B{r}"),
    ("acquisition_channel", "=raw_trial_users!C{r}"),
    ("platform", "=raw_trial_users!D{r}"),
    ("onboarding_experience", "=raw_trial_users!E{r}"),
    ("app_version", "=raw_trial_users!F{r}"),
    ("monthly_price_usd", "=raw_trial_users!H{r}"),
    ("converted_at", '=IF(raw_trial_users!I{r}="","",raw_trial_users!I{r})'),
    ("period", '=IF({signup_at}<LAUNCH,"Pre","Post")'),
    ("signup_week", "=INT({signup_at})-WEEKDAY({signup_at},3)"),
    ("signup_month", '=TEXT({signup_at},"yyyy-mm")'),
    ("signup_hour", "=HOUR({signup_at})"),
    ("projects_7d", '=COUNTIFS(ev_user,{user_id},ev_name,"project_created",ev_in7,1)'),
    ("tasks_7d", '=COUNTIFS(ev_user,{user_id},ev_name,"task_created",ev_in7,1)'),
    ("projects_7d_tol", '=COUNTIFS(ev_user,{user_id},ev_name,"project_created",ev_in7tol,1)'),
    ("tasks_7d_tol", '=COUNTIFS(ev_user,{user_id},ev_name,"task_created",ev_in7tol,1)'),
    ("tasks_14d_tol", '=COUNTIFS(ev_user,{user_id},ev_name,"task_created",ev_in14tol,1)'),
    ("reminder_7d", '=IF(COUNTIFS(ev_user,{user_id},ev_name,"reminder_set",ev_minutes,"<="&ACT_DAYS*1440)>0,1,0)'),
    ("collaborator_7d", '=IF(COUNTIFS(ev_user,{user_id},ev_name,"collaborator_invited",ev_minutes,"<="&ACT_DAYS*1440)>0,1,0)'),
    ("activated", "=IF(AND({projects_7d}>=1,{tasks_7d}>=MIN_TASKS),1,0)"),
    ("activated_tol", "=IF(AND({projects_7d_tol}>=1,{tasks_7d_tol}>=MIN_TASKS),1,0)"),
    ("has_project", "=IF({projects_7d}>=1,1,0)"),
    ("has_3_tasks", "=IF({tasks_7d}>=MIN_TASKS,1,0)"),
    ("converted_14d", '=IF({converted_at}="",0,IF({converted_at}<={signup_at}+CONV_DAYS,1,0))'),
    ("revenue_1m", "={converted_14d}*{monthly_price_usd}"),
    ("days_to_pay", '=IF({converted_at}="","",{converted_at}-{signup_at})'),
    ("mature_14d", "=IF({signup_at}+CONV_DAYS<=CUTOFF,1,0)"),
    ("mature_7d", "=IF({signup_at}+ACT_DAYS<=CUTOFF,1,0)"),
    ("broken_tracking", "=IF(AND({platform}=BROKEN_PLATFORM,{app_version}=BROKEN_VERSION),1,0)"),
    ("is_guided", '=IF({onboarding_experience}="Guided",1,0)'),
]
UFI = {k: i for i, (k, _) in enumerate(UF_COLS)}


def build_user_facts():
    sh = "user_facts"
    print("· Fórmulas de user_facts …")
    S.write(f"'{sh}'!A1", [[k for k, _ in UF_COLS]])
    S.write_chunked(sh, 2, rows_from(UF_COLS, UL), chunk=900)
    fmt(sh, 1, 0, 1, len(UF_COLS) - 1, bold=True, bg=LIGHT, wrap=True)
    for k in ("signup_at", "converted_at"):
        fmt(sh, 2, UFI[k], UL, UFI[k], nf=DT)
    fmt(sh, 2, UFI["signup_week"], UL, UFI["signup_week"], nf=DATE)
    fmt(sh, 2, UFI["days_to_pay"], UL, UFI["days_to_pay"], nf="0.00")
    for k, i in UFI.items():
        named(f"uf_{k}", sh, 2, i, UL)


# ---------------------------------------------------------------- 5) hojas de análisis
def uf(k):
    return f"uf_{k}"


def build_data_quality():
    sh = "1 Data Quality"
    page_title(sh, "1 · Data quality: what can we trust?", "Every check is a formula on the raw tabs. 'Expected' is the baseline documented in the analysis; status turns red if the data changes.")
    checks = [
        ("Trial users (rows)", "=COUNTA(raw_trial_users!A2:A)", 1800, "One row per trial sign-up", INT),
        ("Unique user_id", "=COUNTUNIQUE(raw_trial_users!A2:A)", 1800, "No duplicate users", INT),
        ("Product events (rows)", "=COUNTA(raw_product_events!A2:A)", 10220, "", INT),
        ("Unique event_id", "=COUNTUNIQUE(raw_product_events!A2:A)", 10220, "No duplicate events", INT),
        ("Orphan events (user not found)", f"=SUMPRODUCT(--ISNA(MATCH(raw_product_events!B2:B{EL},raw_trial_users!A2:A{UL},0)))", 0, "Every event belongs to a user", INT),
        ("Users without any event", f"=SUMPRODUCT(--(COUNTIF(raw_product_events!B2:B{EL},raw_trial_users!A2:A{UL})=0))", 0, "", INT),
        ("App version mismatches (event vs user)", "=SUM(ev_mismatch)", 0, "Users never change version", INT),
        ("Payments before sign-up", f'=SUMPRODUCT((raw_trial_users!I2:I{UL}<>"")*(raw_trial_users!I2:I{UL}<raw_trial_users!B2:B{UL}))', 0, "", INT),
        ("Payments not on the hour", f'=SUMPRODUCT((raw_trial_users!I2:I{UL}<>"")*(MINUTE(raw_trial_users!I2:I{UL})<>0))', 0, "All payments land on the hour → hourly billing batch", INT),
        ("Payments after day 14", '=COUNTIF(uf_days_to_pay,">14")', 3, "2–6 h late (billing batch); excluded by the official 14-day rule", INT),
        ("Events stamped BEFORE sign-up", "=SUM(ev_before)", 1928, "Clock skew between systems (time zones)", INT),
        ("Earliest event vs sign-up (hours)", "=MIN(ev_minutes)/60", -14.88, "≈ −15 h: the time-zone range", "0.00"),
        ("Users without 14 complete days", "=COUNTIF(uf_mature_14d,0)", 155, "Sign-ups from Jul 24: conversion still incomplete", INT),
        ("Users without 7 complete days", "=COUNTIF(uf_mature_7d,0)", 20, "Activation still incomplete", INT),
        ("Android 3.1 tasks per user (7 d)", '=SUMIFS(uf_tasks_7d,uf_platform,"Android",uf_app_version,"3.1")/COUNTIFS(uf_platform,"Android",uf_app_version,"3.1")', 2.81, "Healthy tracking", "0.00"),
        ("Android 3.2 tasks per user (7 d)", '=SUMIFS(uf_tasks_7d,uf_platform,"Android",uf_app_version,"3.2")/COUNTIFS(uf_platform,"Android",uf_app_version,"3.2")', 0.94, "⅓ of 3.1 overnight → tracking bug (see tab 5)", "0.00"),
    ]
    rows = []
    for i, (name, f, exp, why, _) in enumerate(checks):
        r = 5 + i
        rows.append([name, f, exp, f'=IF(ROUND(B{r},2)=ROUND(C{r},2),"✓ as expected","⚠ changed")', why])
    r1, r2 = table(sh, 4, 0, ["Check", "Value", "Expected (baseline)", "Status", "What it means"], rows, status_cols=[3])
    for i, (*_, nf) in enumerate(checks):
        fmt(sh, r1 + i, 1, r1 + i, 2, nf=nf)
    REF.update({"dq_users": f"'{sh}'!B5", "dq_events": f"'{sh}'!B7", "dq_orphans": f"'{sh}'!B9", "dq_before": f"'{sh}'!B15",
                "dq_after14": f"'{sh}'!B14", "dq_immature14": f"'{sh}'!B17", "dq_immature7": f"'{sh}'!B18"})

    r = r2 + 3
    section(sh, r, "Events by type", "task_created is the only repeatable event, so any tracking failure on it distorts activation.")
    evs = ["trial_started", "app_open", "project_created", "task_created", "reminder_set", "collaborator_invited"]
    rows = [[e, f"=COUNTIF(ev_name,A{r + 3 + i})", f'=COUNTUNIQUE(FILTER(ev_user,ev_name=A{r + 3 + i}))', f"=B{r + 3 + i}/C{r + 3 + i}"] for i, e in enumerate(evs)]
    table(sh, r + 2, 0, ["event_name", "Events", "Users", "Events per user"], rows, nfs={1: INT, 2: INT, 3: DEC2})


def build_dashboard():
    sh = "2 Dashboard vs Reality"
    page_title(sh, "2 · What the dashboard shows vs. what happened", "The company dashboard compares two periods. That mixes Guided with everything else that changed on Jun 1 and Jun 20.")
    section(sh, 4, "A. The dashboard view: Apr–May vs Jun–Jul")
    P = uf("period")
    rows = [
        ["Sign-ups", f'=COUNTIF({P},"Pre")', f'=COUNTIF({P},"Post")', "=C7-B7"],
        ["Activation (7 d, official)", f'=AVERAGEIFS(uf_activated,{P},"Pre")', f'=AVERAGEIFS(uf_activated,{P},"Post")', "=(C8-B8)*100"],
        ["Trial conversion (14 d)", f'=AVERAGEIFS(uf_converted_14d,{P},"Pre")', f'=AVERAGEIFS(uf_converted_14d,{P},"Post")', "=(C9-B9)*100"],
        ["Revenue per trial (1st month)", f'=AVERAGEIFS(uf_revenue_1m,{P},"Pre")', f'=AVERAGEIFS(uf_revenue_1m,{P},"Post")', "=C10-B10"],
        ["Share with Guided Onboarding", f'=AVERAGEIFS(uf_is_guided,{P},"Pre")', f'=AVERAGEIFS(uf_is_guided,{P},"Post")', "=(C11-B11)*100"],
        ["Share from Creator Campaign", f'=COUNTIFS(uf_acquisition_channel,"Creator Campaign",{P},"Pre")/B7', f'=COUNTIFS(uf_acquisition_channel,"Creator Campaign",{P},"Post")/C7', "=(C12-B12)*100"],
        ["Share on Android 3.2", f'=AVERAGEIFS(uf_broken_tracking,{P},"Pre")', f'=AVERAGEIFS(uf_broken_tracking,{P},"Post")', "=(C13-B13)*100"],
    ]
    table(sh, 6, 0, ["Metric", "Apr–May (Pre)", "Jun–Jul (Post)", "Change"], rows, pp_cols=[3])
    fmt(sh, 7, 1, 7, 2, nf=INT); fmt(sh, 7, 3, 7, 3, nf=INTD)
    for r in (8, 9, 11, 12, 13):
        fmt(sh, r, 1, r, 2, nf=PCT); fmt(sh, r, 3, r, 3, nf=PP)
    fmt(sh, 10, 1, 10, 2, nf=USD); fmt(sh, 10, 3, 10, 3, nf=USDD)
    REF.update({"pre_act": f"'{sh}'!B8", "post_act": f"'{sh}'!C8", "pre_cvr": f"'{sh}'!B9", "post_cvr": f"'{sh}'!C9", "pre_rpts": f"'{sh}'!B10", "post_rpts": f"'{sh}'!C10"})
    note(sh, 14, "Reading: activation and conversion fall, but in the same weeks Creator Campaign went from ~4% to ~34% of sign-ups and Android 3.2 appeared. A period comparison cannot isolate Guided.")

    section(sh, 16, "B. The fair view: same weeks (Jun–Jul), Classic vs Guided")
    X = uf("onboarding_experience")
    rows = [
        ["Sign-ups", f'=COUNTIFS({P},"Post",{X},"Classic")', f'=COUNTIFS({P},"Post",{X},"Guided")', "=C19-B19"],
        ["Activation (official)", f'=AVERAGEIFS(uf_activated,{P},"Post",{X},"Classic")', f'=AVERAGEIFS(uf_activated,{P},"Post",{X},"Guided")', "=(C20-B20)*100"],
        ["Activation, excl. Android 3.2", f'=AVERAGEIFS(uf_activated,{P},"Post",{X},"Classic",uf_broken_tracking,0)', f'=AVERAGEIFS(uf_activated,{P},"Post",{X},"Guided",uf_broken_tracking,0)', "=(C21-B21)*100"],
        ["Trial conversion (14 d)", f'=AVERAGEIFS(uf_converted_14d,{P},"Post",{X},"Classic")', f'=AVERAGEIFS(uf_converted_14d,{P},"Post",{X},"Guided")', "=(C22-B22)*100"],
        ["Revenue per trial", f'=AVERAGEIFS(uf_revenue_1m,{P},"Post",{X},"Classic")', f'=AVERAGEIFS(uf_revenue_1m,{P},"Post",{X},"Guided")', "=C23-B23"],
    ]
    table(sh, 18, 0, ["Metric (Jun–Jul sign-ups)", "Classic", "Guided", "Guided − Classic"], rows, pp_cols=[3])
    fmt(sh, 19, 1, 19, 2, nf=INT); fmt(sh, 19, 3, 19, 3, nf=INTD)
    for r in (20, 21, 22):
        fmt(sh, r, 1, r, 2, nf=PCT); fmt(sh, r, 3, r, 3, nf=PP)
    fmt(sh, 23, 1, 23, 2, nf=USD); fmt(sh, 23, 3, 23, 3, nf=USDD)
    REF.update({"rpts_classic": f"'{sh}'!B23", "rpts_guided": f"'{sh}'!C23"})
    note(sh, 24, "Reading: compared within the same weeks, Guided is ahead on every metric. Significance and robustness are tested in tab 4.")


def build_mix():
    sh = "3 Channel Mix"
    page_title(sh, "3 · Why did conversion drop? Rate vs mix by channel", "Rate effect = Post share × (Post CVR − Pre CVR). Mix effect = (Post share − Pre share) × (Pre CVR − Pre total CVR). They add up exactly to the total change.")
    chans = ["Creator Campaign", "Referral", "Organic", "Paid Search"]
    C, P, V = uf("acquisition_channel"), uf("period"), uf("converted_14d")
    rows = []
    for i, ch in enumerate(chans):
        r = 6 + i
        rows.append([ch, f'=COUNTIFS({C},$A{r},{P},"Pre")', f'=COUNTIFS({C},$A{r},{P},"Post")',
                     f'=AVERAGEIFS({V},{C},$A{r},{P},"Pre")', f'=AVERAGEIFS({V},{C},$A{r},{P},"Post")',
                     f"=B{r}/B$10", f"=C{r}/C$10", f"=G{r}*(E{r}-D{r})*100", f"=(G{r}-F{r})*(D{r}-D$10)*100", f"=H{r}+I{r}"])
    rows.append(["Total", "=SUM(B6:B9)", "=SUM(C6:C9)", f'=AVERAGEIFS({V},{P},"Pre")', f'=AVERAGEIFS({V},{P},"Post")',
                 "=SUM(F6:F9)", "=SUM(G6:G9)", "=SUM(H6:H9)", "=SUM(I6:I9)", "=SUM(J6:J9)"])
    table(sh, 5, 0, ["Channel", "Users Pre", "Users Post", "CVR Pre", "CVR Post", "Share Pre", "Share Post", "Rate effect", "Mix effect", "Total"],
          rows, nfs={1: INT, 2: INT, 3: PCT, 4: PCT, 5: PCT, 6: PCT, 7: PP2, 8: PP2, 9: PP2}, pp_cols=[7, 8, 9])
    fmt(sh, 10, 0, 10, 9, bold=True, bg=LIGHT)
    put(sh, 12, 0, [["Closure check: Σ total vs (CVR Post − CVR Pre)", "=J10", "=(E10-D10)*100", '=IF(ABS(B12-C12)<0.000001,"✓ closes exactly","⚠ does not close")'],
                    ["Jun–Jul CVR with the Apr–May channel mix", "=SUMPRODUCT(E6:E9,F6:F9)", "", ""]])
    fmt(sh, 12, 1, 12, 2, nf=PP2); fmt(sh, 13, 1, 13, 1, nf=PCT, bold=True)
    fmt(sh, 12, 0, 13, 0, bold=True)
    CF.append({"addConditionalFormatRule": {"rule": {"ranges": [grid(sh, 12, 3, 12, 3)], "booleanRule": {"condition": {"type": "TEXT_STARTS_WITH", "values": [{"userEnteredValue": "✓"}]}, "format": {"textFormat": {"foregroundColor": rgb(GOOD), "bold": True}}}}, "index": 0}})
    REF.update({"mix_rate": f"'{sh}'!H10", "mix_mix": f"'{sh}'!I10", "mix_total": f"'{sh}'!J10", "mix_creator_mix": f"'{sh}'!I6",
                "mix_counterfactual": f"'{sh}'!B13", "mix_closure": f"'{sh}'!D12", "share_creator_pre": f"'{sh}'!F6", "share_creator_post": f"'{sh}'!G6"})
    note(sh, 15, "Reading: all four channels converted better after launch (positive rate effects). The drop comes from the mix: Creator Campaign, the lowest-converting channel, grew from ~4% to ~34% of sign-ups.")

    # Datos del waterfall
    put(sh, 17, 0, [["Waterfall data (pp)", "Value"], ["Apr–May CVR", "=D10*100"], ["Better rates within channels", "=H10"], ["Channel mix", "=I10"], ["Jun–Jul CVR", "=E10*100"]])
    fmt(sh, 17, 0, 17, 1, bold=True, fg=WHITE, bg=BLUE)
    fmt(sh, 18, 1, 21, 1, nf="0.00")
    chart(sh, {
        "title": "Conversion Apr–May → Jun–Jul (pp)", "titleTextFormat": {"bold": True, "fontSize": 12},
        "waterfallChart": {
            "domain": {"data": src(sh, 18, 0, 21)},
            "series": [{"data": src(sh, 18, 1, 21), "customSubtotals": [{"subtotalIndex": 3, "label": "Jun–Jul CVR", "dataIsSubtotal": True}],
                        "positiveColumnsStyle": {"colorStyle": {"rgbColor": rgb(BLUE)}}, "negativeColumnsStyle": {"colorStyle": {"rgbColor": rgb(BAD)}},
                        "subtotalColumnsStyle": {"colorStyle": {"rgbColor": rgb(GREY)}}, "hideTrailingSubtotal": True}],
            "stackedType": "SEQUENTIAL", "connectorLineStyle": {"type": "SOLID", "width": 1},
        },
    }, 17, 3, 620, 330)


def ci_rows(sh, start, specs):
    """Filas: métrica, n Classic, Classic, n Guided, Guided, lift, SE, IC bajo, IC alto, significativo."""
    rows = []
    for i, (label, extra) in enumerate(specs):
        r = start + i
        base = f'uf_period,"Post"{extra}'
        metric = "uf_activated" if "Activation" in label else ("uf_has_3_tasks" if "≥3" in label else "uf_converted_14d")
        rows.append([label,
                     f'=COUNTIFS({base},uf_onboarding_experience,"Classic")', f'=AVERAGEIFS({metric},{base},uf_onboarding_experience,"Classic")',
                     f'=COUNTIFS({base},uf_onboarding_experience,"Guided")', f'=AVERAGEIFS({metric},{base},uf_onboarding_experience,"Guided")',
                     f"=(E{r}-C{r})*100", f"=SQRT(E{r}*(1-E{r})/D{r}+C{r}*(1-C{r})/B{r})*100", f"=F{r}-1.96*G{r}", f"=F{r}+1.96*G{r}",
                     f'=IF(OR(H{r}>0,I{r}<0),"✓ significant","≈ could be noise")'])
    return rows


def build_guided():
    sh = "4 Guided vs Classic"
    page_title(sh, "4 · Does Guided beat Classic? (same weeks, Jun–Jul)", "95% CI for a difference of two proportions: lift ± 1.96 × √(p₁(1−p₁)/n₁ + p₂(1−p₂)/n₂). Significant if the interval excludes 0.")
    section(sh, 4, "A. Headline comparison with confidence intervals")
    specs = [("Conversion 14 d (all Jun–Jul sign-ups)", ""), ("Conversion 14 d (complete cohorts only)", ",uf_mature_14d,1"),
             ("Activation (official, all versions)", ""), ("Activation (excl. Android 3.2)", ",uf_broken_tracking,0"), ("Users with ≥3 tasks (excl. Android 3.2)", ",uf_broken_tracking,0")]
    rows = ci_rows(sh, 6, specs)
    r1, r2 = table(sh, 5, 0, ["Metric", "n Classic", "Classic", "n Guided", "Guided", "Lift", "Std. error", "95% CI low", "95% CI high", "Verdict"], rows,
                   nfs={1: INT, 2: PCT, 3: INT, 4: PCT, 5: PP, 6: PP, 7: PP, 8: PP}, pp_cols=[5], status_cols=[9])
    REF.update({"g_cvr_lift": f"'{sh}'!F6", "g_cvr_lo": f"'{sh}'!H6", "g_cvr_hi": f"'{sh}'!I6", "g_cvr_c": f"'{sh}'!C6", "g_cvr_g": f"'{sh}'!E6",
                "g_mature_lift": f"'{sh}'!F7", "g_act_lift": f"'{sh}'!F9", "g_act_lo": f"'{sh}'!H9", "g_act_hi": f"'{sh}'!I9", "g_act_c": f"'{sh}'!C9", "g_act_g": f"'{sh}'!E9"})
    chart(sh, basic_chart("Classic vs Guided, Jun–Jul", "BAR", sh, 0, [2, 4], 5, 10, colors=[BLUE, ORANGE]), 5, 11, 680, 320)

    section(sh, 13, "B. Assignment bias? Lift within channel × platform (12 strata)", "The rollout was not random (iOS got more Guided than Web). Weighting the lift of each stratum by its size removes that imbalance.")
    strata = [(c, p) for c in ["Creator Campaign", "Organic", "Paid Search", "Referral"] for p in ["Android", "iOS", "Web"]]
    rows = []
    for i, (c, p) in enumerate(strata):
        r = 17 + i
        base = f'uf_period,"Post",uf_acquisition_channel,$A{r},uf_platform,$B{r}'
        rows.append([c, p, f'=COUNTIFS({base},uf_onboarding_experience,"Guided")', f'=AVERAGEIFS(uf_converted_14d,{base},uf_onboarding_experience,"Guided")',
                     f'=COUNTIFS({base},uf_onboarding_experience,"Classic")', f'=AVERAGEIFS(uf_converted_14d,{base},uf_onboarding_experience,"Classic")',
                     f"=(D{r}-F{r})*100", f"=C{r}+E{r}"])
    table(sh, 16, 0, ["Channel", "Platform", "n Guided", "CVR Guided", "n Classic", "CVR Classic", "Lift", "Weight (n)"], rows,
          nfs={2: INT, 3: PCT, 4: INT, 5: PCT, 6: PP, 7: INT}, pp_cols=[6])
    put(sh, 30, 0, [["Standardized lift (weighted by stratum size)", "", "", "", "", "", "=SUMPRODUCT(G17:G28,H17:H28)/SUM(H17:H28)"],
                    ["Raw lift (tab 4A)", "", "", "", "", "", "=F6"],
                    ["Strata with a negative lift (all small)", "", "", "", "", "", "=COUNTIF(G17:G28,\"<0\")"]])
    fmt(sh, 30, 0, 32, 0, bold=True); fmt(sh, 30, 6, 31, 6, nf=PP2, bold=True); fmt(sh, 32, 6, 32, 6, nf="0")
    REF.update({"g_std_lift": f"'{sh}'!G30", "g_neg_strata": f"'{sh}'!G32"})

    section(sh, 34, "C. A hidden trend? Classic before vs after launch, by channel", "If Classic is flat, the calendar didn't change conversion; Guided's lift is not a seasonal effect.")
    rows = []
    for i, c in enumerate(["Creator Campaign", "Organic", "Paid Search", "Referral"]):
        r = 37 + i
        rows.append([c, f'=AVERAGEIFS(uf_converted_14d,uf_acquisition_channel,$A{r},uf_period,"Pre")',
                     f'=AVERAGEIFS(uf_converted_14d,uf_acquisition_channel,$A{r},uf_period,"Post",uf_onboarding_experience,"Classic")',
                     f'=AVERAGEIFS(uf_converted_14d,uf_acquisition_channel,$A{r},uf_period,"Post",uf_onboarding_experience,"Guided")',
                     f"=(C{r}-B{r})*100", f"=(D{r}-C{r})*100"])
    table(sh, 36, 0, ["Channel", "Classic Apr–May", "Classic Jun–Jul", "Guided Jun–Jul", "Classic change", "Guided − Classic"], rows,
          nfs={1: PCT, 2: PCT, 3: PCT, 4: PP, 5: PP}, pp_cols=[4, 5])

    section(sh, 42, "D. Every platform? (Jun–Jul sign-ups)")
    plats = [("iOS", "4.1"), ("Web", "Web"), ("Android", "3.1"), ("Android", "3.2")]
    rows = []
    for i, (p, v) in enumerate(plats):
        r = 45 + i
        base = f'uf_period,"Post",uf_platform,$A{r},uf_app_version,$B{r}'
        rows.append([p, v, f'=AVERAGEIFS(uf_converted_14d,{base},uf_onboarding_experience,"Classic")', f'=AVERAGEIFS(uf_converted_14d,{base},uf_onboarding_experience,"Guided")', f"=(D{r}-C{r})*100"])
    table(sh, 44, 0, ["Platform", "Version", "CVR Classic", "CVR Guided", "Lift"], rows, nfs={2: PCT, 3: PCT, 4: PP}, pp_cols=[4])
    fmt(sh, 45, 1, 48, 1, h="LEFT")
    put(sh, 49, 0, [["Platforms where Guided is ahead", "", "", "", '=COUNTIF(E45:E48,">0")&" of 4"']])
    fmt(sh, 49, 0, 49, 4, bold=True)
    REF["g_platforms_ahead"] = f"'{sh}'!E49"


def build_android():
    sh = "5 Android 3.2"
    page_title(sh, "5 · Is the activation drop real? Android 3.1 vs 3.2", "Android 3.2 (from Jun 20) changed how task_created is tracked. Metrics built on task events collapse; metrics that don't use them stay flat.")
    def a(v, expr):
        return expr.replace("{v}", v)
    metrics = [
        ("Users", 'COUNTIFS(uf_platform,"Android",uf_app_version,"{v}")', INT, "—"),
        ("Tasks per user (7 d)", 'SUMIFS(uf_tasks_7d,uf_platform,"Android",uf_app_version,"{v}")/COUNTIFS(uf_platform,"Android",uf_app_version,"{v}")', DEC2, "Yes"),
        ("Users with ≥3 tasks", 'AVERAGEIFS(uf_has_3_tasks,uf_platform,"Android",uf_app_version,"{v}")', PCT, "Yes"),
        ("Activation", 'AVERAGEIFS(uf_activated,uf_platform,"Android",uf_app_version,"{v}")', PCT, "Yes"),
        ("Tasks per project (health ratio)", 'SUMIFS(uf_tasks_7d,uf_platform,"Android",uf_app_version,"{v}")/SUMIFS(uf_projects_7d,uf_platform,"Android",uf_app_version,"{v}")', X, "Yes"),
        ("Users with a project", 'AVERAGEIFS(uf_has_project,uf_platform,"Android",uf_app_version,"{v}")', PCT, "No"),
        ("Trial conversion (14 d)", 'AVERAGEIFS(uf_converted_14d,uf_platform,"Android",uf_app_version,"{v}")', PCT, "No"),
        ("Paying users who look “activated”", 'AVERAGEIFS(uf_activated,uf_platform,"Android",uf_app_version,"{v}",uf_converted_14d,1)', PCT, "Yes"),
    ]
    rows = [[m, "=" + a("3.1", e), "=" + a("3.2", e), dep] for m, e, _, dep in metrics]
    table(sh, 4, 0, ["Metric", "Android 3.1 (to Jun 19)", "Android 3.2 (from Jun 20)", "Uses task events?"], rows)
    for i, (*_, nf, _d) in enumerate(metrics):
        fmt(sh, 5 + i, 1, 5 + i, 2, nf=nf)
    REF.update({"a31_3t": f"'{sh}'!B7", "a32_3t": f"'{sh}'!C7", "a31_tpp": f"'{sh}'!B9", "a32_tpp": f"'{sh}'!C9",
                "a31_cvr": f"'{sh}'!B11", "a32_cvr": f"'{sh}'!C11", "a31_proj": f"'{sh}'!B10", "a32_proj": f"'{sh}'!C10", "a31_pay_act": f"'{sh}'!B12", "a32_pay_act": f"'{sh}'!C12"})
    note(sh, 13, "Reading: task-based metrics fall by two thirds or more, while projects and conversion don't move. If users had really stopped creating tasks, they would have stopped paying too → it's a tracking bug.")

    section(sh, 15, "Telemetry health by sign-up week (tasks per project)", "Below the HEALTH_MIN line (params) the app is losing task events.")
    put(sh, 17, 0, [["Week", "Android 3.1", "Android 3.2", "Health threshold"]])
    fmt(sh, 17, 0, 17, 3, bold=True, fg=WHITE, bg=BLUE)
    put(sh, 18, 0, [['=SORT(UNIQUE(FILTER(uf_signup_week,uf_platform="Android")))']])
    rows = []
    for r in range(18, 37):
        rows.append([f'=IFERROR(SUMIFS(uf_tasks_7d,uf_signup_week,$A{r},uf_platform,"Android",uf_app_version,"3.1")/SUMIFS(uf_projects_7d,uf_signup_week,$A{r},uf_platform,"Android",uf_app_version,"3.1"),"")',
                     f'=IFERROR(SUMIFS(uf_tasks_7d,uf_signup_week,$A{r},uf_platform,"Android",uf_app_version,"3.2")/SUMIFS(uf_projects_7d,uf_signup_week,$A{r},uf_platform,"Android",uf_app_version,"3.2"),"")',
                     f'=IF($A{r}="","",HEALTH_MIN)'])
    put(sh, 18, 1, rows)
    fmt(sh, 18, 0, 36, 0, nf=DATE); fmt(sh, 18, 1, 36, 3, nf="0.00")
    chart(sh, basic_chart("Tasks per project by sign-up week, Android", "LINE", sh, 0, [1, 2, 3], 17, 36, vtitle="Tasks per project", colors=[MUTED, BAD, INK]), 4, 5, 560, 320)


def build_users():
    sh = "6 Users"
    page_title(sh, "6 · Beyond the question: what we learned about users", "Aha moment, price sensitivity, time to pay and channel quality. Task-based cuts exclude Android 3.2.")
    section(sh, 4, "A. The 'aha' moment: conversion by tasks created in the first 14 days", "Excludes Android 3.2 (it under-counts tasks).")
    rows = []
    for i, k in enumerate(["0", "1", "2", "3", "4", "5", "6+"]):
        r = 7 + i
        crit = '">=6"' if k == "6+" else k
        rows.append([k, f"=COUNTIFS(uf_tasks_14d_tol,{crit},uf_broken_tracking,0)", f"=AVERAGEIFS(uf_converted_14d,uf_tasks_14d_tol,{crit},uf_broken_tracking,0)"])
    table(sh, 6, 0, ["Tasks (14 d)", "Users", "CVR 14 d"], rows, nfs={1: INT, 2: PCT})
    put(sh, 15, 0, [["CVR with 0–2 tasks", '=AVERAGEIFS(uf_converted_14d,uf_tasks_14d_tol,"<3",uf_broken_tracking,0)'],
                    ["CVR with 3+ tasks", '=AVERAGEIFS(uf_converted_14d,uf_tasks_14d_tol,">=3",uf_broken_tracking,0)'],
                    ["Multiplier at the 3rd task", "=B16/B15"]])
    fmt(sh, 15, 0, 17, 0, bold=True); fmt(sh, 15, 1, 16, 1, nf=PCT, bold=True); fmt(sh, 17, 1, 17, 1, nf='0.0"×"', bold=True)
    REF.update({"aha_low": f"'{sh}'!B15", "aha_high": f"'{sh}'!B16", "aha_t0": f"'{sh}'!C7", "aha_t3": f"'{sh}'!C10"})
    chart(sh, basic_chart("Conversion by tasks created (first 14 days)", "COLUMN", sh, 0, [2], 6, 13, vtitle="CVR 14 d", htitle="Tasks", colors=[BLUE]), 4, 4, 520, 300)

    section(sh, 20, "B. Price: does a cheaper plan convert more?", "Price was assigned in the same proportions to every segment (see the balance table): a natural experiment.")
    rows = []
    for i, p in enumerate([12, 15, 18]):
        r = 23 + i
        rows.append([p, f"=COUNTIF(uf_monthly_price_usd,$A{r})", f"=AVERAGEIFS(uf_converted_14d,uf_monthly_price_usd,$A{r})", f"=AVERAGEIFS(uf_revenue_1m,uf_monthly_price_usd,$A{r})",
                     f'=AVERAGEIFS(uf_converted_14d,uf_monthly_price_usd,$A{r},uf_period,"Pre")', f'=AVERAGEIFS(uf_converted_14d,uf_monthly_price_usd,$A{r},uf_period,"Post",uf_onboarding_experience,"Guided")'])
    table(sh, 22, 0, ["Monthly price", "Users", "CVR 14 d", "Revenue per trial", "CVR Classic Apr–May", "CVR Guided Jun–Jul"], rows, nfs={0: USD, 1: INT, 2: PCT, 3: USD, 4: PCT, 5: PCT})
    put(sh, 27, 0, [["Arc price elasticity ($12 → $18)", "=((C25-C23)/((C25+C23)/2))/((A25-A23)/((A25+A23)/2))"],
                    ["CVR $12 − CVR $18", "=(C23-C25)*100"],
                    ["95% CI low", "=B28-1.96*SQRT(C23*(1-C23)/B23+C25*(1-C25)/B25)*100"],
                    ["95% CI high", "=B28+1.96*SQRT(C23*(1-C23)/B23+C25*(1-C25)/B25)*100"],
                    ["Revenue per trial: $18 vs $12", "=D25/D23-1"],
                    ["Revenue per trial: $18 vs $15", "=D25/D24-1"]])
    fmt(sh, 27, 0, 32, 0, bold=True); fmt(sh, 27, 1, 27, 1, nf="0.000", bold=True); fmt(sh, 28, 1, 30, 1, nf=PP)
    fmt(sh, 31, 1, 32, 1, nf="+0%", bold=True)
    REF.update({"elasticity": f"'{sh}'!B27", "price_diff": f"'{sh}'!B28", "price_lo": f"'{sh}'!B29", "price_hi": f"'{sh}'!B30",
                "rpts12": f"'{sh}'!D23", "rpts15": f"'{sh}'!D24", "rpts18": f"'{sh}'!D25", "rpts_18v12": f"'{sh}'!B31"})
    chart(sh, basic_chart("Revenue per trial by monthly price", "COLUMN", sh, 0, [3], 22, 25, vtitle="Revenue per trial", colors=[BLUE]), 20, 7, 420, 260)

    put(sh, 35, 0, [["Price mix by channel (share of users)", "$12", "$15", "$18"]])
    fmt(sh, 35, 0, 35, 3, bold=True, fg=WHITE, bg=BLUE)
    rows = []
    for i, c in enumerate(["Creator Campaign", "Organic", "Paid Search", "Referral"]):
        r = 36 + i
        rows.append([c] + [f"=COUNTIFS(uf_acquisition_channel,$A{r},uf_monthly_price_usd,{p})/COUNTIF(uf_acquisition_channel,$A{r})" for p in (12, 15, 18)])
    put(sh, 36, 0, rows)
    fmt(sh, 36, 1, 39, 3, nf="0%")
    note(sh, 40, "Reading: every channel gets ~25/55/20 of each price, so price differences are not confounded by channel. Conversion barely moves with price, so the highest price earns the most per trial (first payment only; retention unknown).")

    section(sh, 43, "C. When do users pay? Days from sign-up to payment", "Converters within 14 days.")
    rows = []
    for d in range(14):
        r = 46 + d
        rows.append([d, f'=COUNTIFS(uf_days_to_pay,">="&A{r},uf_days_to_pay,"<"&(A{r}+1),uf_converted_14d,1)', f"=B{r}/SUM($B$46:$B$59)", f"=SUM($C$46:C{r})"])
    table(sh, 45, 0, ["Day", "Payers", "% of payers", "Cumulative"], rows, nfs={1: INT, 2: PCT, 3: PCT})
    put(sh, 61, 0, [["Median days to pay", "=MEDIAN(FILTER(uf_days_to_pay,uf_converted_14d=1))"], ["Payers within the first 7 days", "=D52"]])
    fmt(sh, 61, 0, 62, 0, bold=True); fmt(sh, 61, 1, 61, 1, nf="0.0", bold=True); fmt(sh, 62, 1, 62, 1, nf=PCT, bold=True)
    REF.update({"pay_median": f"'{sh}'!B61", "pay_7d": f"'{sh}'!B62"})
    chart(sh, basic_chart("Share of payers by day since sign-up", "COLUMN", sh, 0, [2], 45, 59, vtitle="% of payers", htitle="Day", colors=[BLUE]), 43, 5, 520, 300)

    section(sh, 65, "D. Channel quality", "Activation-based columns exclude Android 3.2.")
    rows = []
    for i, c in enumerate(["Referral", "Organic", "Paid Search", "Creator Campaign"]):
        r = 68 + i
        C = f"uf_acquisition_channel,$A{r}"
        rows.append([c, f"=COUNTIF(uf_acquisition_channel,$A{r})", f"=AVERAGEIFS(uf_converted_14d,{C})", f"=AVERAGEIFS(uf_revenue_1m,{C})",
                     f"=AVERAGEIFS(uf_activated,{C},uf_broken_tracking,0)", f"=AVERAGEIFS(uf_converted_14d,{C},uf_activated,1,uf_broken_tracking,0)",
                     f"=AVERAGEIFS(uf_converted_14d,{C},uf_activated,0,uf_broken_tracking,0)"])
    table(sh, 67, 0, ["Channel", "Users", "CVR 14 d", "Revenue per trial", "Activation", "CVR if activated", "CVR if not activated"], rows,
          nfs={1: INT, 2: PCT, 3: USD, 4: PCT, 5: PCT, 6: PCT})
    put(sh, 73, 0, [["Referral vs Creator Campaign: revenue per trial", "=D68/D71"]])
    fmt(sh, 73, 0, 73, 0, bold=True); fmt(sh, 73, 1, 73, 1, nf='0.0"×"', bold=True)
    REF.update({"rpts_referral": f"'{sh}'!D68", "rpts_creator": f"'{sh}'!D71", "creator_act_cvr": f"'{sh}'!F71", "chan_ratio": f"'{sh}'!B73"})


def build_timeline():
    sh = "7 Weekly Timeline"
    page_title(sh, "7 · Weekly cohorts", "One row per sign-up week (Monday start). Conversion for the last two weeks is incomplete (cohorts without 14 days).")
    put(sh, 4, 0, [["Week", "Sign-ups", "CVR 14 d", "Activation (excl. 3.2)", "Guided share", "Creator Campaign share", "Android 3.2 share", "CVR complete?"]])
    fmt(sh, 4, 0, 4, 7, bold=True, fg=WHITE, bg=BLUE, wrap=True)
    put(sh, 5, 0, [["=SORT(UNIQUE(uf_signup_week))"]])
    rows = []
    for r in range(5, 24):
        w = f"uf_signup_week,$A{r}"
        rows.append([f'=IF($A{r}="","",COUNTIF(uf_signup_week,$A{r}))', f'=IF($A{r}="","",AVERAGEIFS(uf_converted_14d,{w}))',
                     f'=IF($A{r}="","",AVERAGEIFS(uf_activated,{w},uf_broken_tracking,0))', f'=IF($A{r}="","",AVERAGEIFS(uf_is_guided,{w}))',
                     f'=IF($A{r}="","",COUNTIFS({w},uf_acquisition_channel,"Creator Campaign")/B{r})', f'=IF($A{r}="","",AVERAGEIFS(uf_broken_tracking,{w}))',
                     f'=IF($A{r}="","",IF(COUNTIFS({w},uf_mature_14d,0)>0,"⚠ incomplete","✓"))'])
    put(sh, 5, 1, rows)
    fmt(sh, 5, 0, 23, 0, nf=DATE); fmt(sh, 5, 1, 23, 1, nf=INT); fmt(sh, 5, 2, 23, 6, nf="0%")
    CF.append({"addConditionalFormatRule": {"rule": {"ranges": [grid(sh, 5, 7, 23, 7)], "booleanRule": {"condition": {"type": "TEXT_STARTS_WITH", "values": [{"userEnteredValue": "⚠"}]}, "format": {"textFormat": {"foregroundColor": rgb(BAD)}}}}, "index": 0}})
    chart(sh, basic_chart("Conversion and activation by sign-up week", "LINE", sh, 0, [2, 3], 4, 22, colors=[BLUE, "#1baf7a"]), 4, 9, 620, 300)
    chart(sh, basic_chart("What changed in the mix: Guided, Creator Campaign and Android 3.2 shares", "LINE", sh, 0, [4, 5, 6], 4, 22, colors=[ORANGE, "#6250d6", BAD]), 21, 9, 620, 300)
    note(sh, 25, "Reading: from the week of Jun 1, Guided (~60%) and Creator Campaign (~35%) arrive together, and Android 3.2 appears from Jun 20. That is why period comparisons mislead.")


def build_pivots():
    sh = "Pivot Tables"
    page_title(sh, "Pivot tables (native) on user_facts", "Same numbers as the analysis tabs, built with Data → Pivot table. Averages of 0/1 columns = rates.")
    source = {"sheetId": SID["user_facts"], "startRowIndex": 0, "endRowIndex": UL, "startColumnIndex": 0, "endColumnIndex": len(UF_COLS)}

    def pv(anchor_row, anchor_col, title, rows, cols, values, filters=None):
        put(sh, anchor_row - 1, anchor_col, [[title]])
        fmt(sh, anchor_row - 1, anchor_col, anchor_row - 1, anchor_col, bold=True, size=11)
        spec = {"source": source, "rows": [{"sourceColumnOffset": UFI[r], "showTotals": True, "sortOrder": "ASCENDING"} for r in rows],
                "columns": [{"sourceColumnOffset": UFI[c], "showTotals": True, "sortOrder": "ASCENDING"} for c in cols],
                "values": [{"summarizeFunction": f, "sourceColumnOffset": UFI[v], "name": n} for n, f, v in values], "valueLayout": "HORIZONTAL"}
        if filters:
            spec["filterSpecs"] = [{"columnOffsetIndex": UFI[k], "filterCriteria": {"visibleValues": vals}} for k, vals in filters.items()]
        RQ.append({"updateCells": {"rows": [{"values": [{"pivotTable": spec}]}], "start": {"sheetId": SID[sh], "rowIndex": anchor_row - 1, "columnIndex": anchor_col}, "fields": "pivotTable"}})

    pv(5, 0, "PV1 · The dashboard: period × experience (CVR)", ["period"], ["onboarding_experience"], [("CVR 14 d", "AVERAGE", "converted_14d")])
    pv(5, 6, "PV2 · Channel × period (users and CVR)", ["acquisition_channel"], ["period"], [("Users", "COUNTA", "user_id"), ("CVR 14 d", "AVERAGE", "converted_14d")])
    pv(18, 0, "PV3 · Android version: tasks vs projects vs conversion", ["app_version"], [], [("Users", "COUNTA", "user_id"), ("≥3 tasks", "AVERAGE", "has_3_tasks"), ("Has project", "AVERAGE", "has_project"), ("CVR 14 d", "AVERAGE", "converted_14d")], {"platform": ["Android"]})
    pv(18, 7, "PV4 · Price: conversion and revenue per trial", ["monthly_price_usd"], [], [("Users", "COUNTA", "user_id"), ("CVR 14 d", "AVERAGE", "converted_14d"), ("Revenue per trial", "AVERAGE", "revenue_1m")])
    pv(30, 0, "PV5 · Jun–Jul only: experience × channel (CVR)", ["acquisition_channel"], ["onboarding_experience"], [("CVR 14 d", "AVERAGE", "converted_14d")], {"period": ["Post"]})
    # formatos de las zonas de pivotes
    fmt(sh, 6, 1, 9, 4, nf=PCT)
    for cc in (8, 10, 12):  # PV2: columnas de CVR (Post, Pre, total)
        fmt(sh, 8, cc, 12, cc, nf=PCT)
    fmt(sh, 19, 2, 23, 4, nf=PCT)
    fmt(sh, 19, 9, 23, 9, nf=PCT); fmt(sh, 19, 10, 23, 10, nf=USD)
    fmt(sh, 31, 1, 37, 4, nf=PCT)


def build_conclusions():
    sh = "Conclusions"
    page_title(sh, "Conclusions: answer to the CPO", "Every number below is a live formula pointing to the analysis tabs. Change the data or a parameter and the text updates.")
    put(sh, 4, 0, [["Answer: EXPAND Guided Onboarding to 90% of new users and keep a 10% random holdout. The dashboard drop is not caused by it."]])
    fmt(sh, 4, 0, 4, 0, bold=True, size=14, fg=WHITE, bg=INK, wrap=True)
    RQ.append({"mergeCells": {"range": grid(sh, 4, 0, 4, 3), "mergeType": "MERGE_ALL"}})
    R = REF
    t = lambda ref, f: f'TEXT({ref},"{f}")'
    findings = [
        ("1", "The dashboard compares periods, not cohorts.",
         f'="Activation "&{t(R["pre_act"], "0.0%")}&" → "&{t(R["post_act"], "0.0%")}&"; conversion "&{t(R["pre_cvr"], "0.0%")}&" → "&{t(R["post_cvr"], "0.0%")}&". Guided, Creator Campaign and Android 3.2 all landed in the same weeks."', "2 Dashboard vs Reality"),
        ("2", "The conversion drop is channel mix: every channel improved.",
         f'="Rate effect "&{t(R["mix_rate"], "+0.00;-0.00")}&" pp, mix effect "&{t(R["mix_mix"], "+0.00;-0.00")}&" pp (Creator Campaign alone "&{t(R["mix_creator_mix"], "+0.00;-0.00")}&" pp), total "&{t(R["mix_total"], "+0.00;-0.00")}&" pp. With the Apr–May mix, Jun–Jul CVR would be "&{t(R["mix_counterfactual"], "0.0%")}&"."', "3 Channel Mix"),
        ("3", "The activation drop is a tracking bug in Android 3.2.",
         f'="Users with ≥3 tasks "&{t(R["a31_3t"], "0.0%")}&" → "&{t(R["a32_3t"], "0.0%")}&", tasks per project "&{t(R["a31_tpp"], "0.00")}&" → "&{t(R["a32_tpp"], "0.00")}&", but conversion "&{t(R["a31_cvr"], "0.0%")}&" → "&{t(R["a32_cvr"], "0.0%")}&" and projects "&{t(R["a31_proj"], "0.0%")}&" → "&{t(R["a32_proj"], "0.0%")}&"."', "5 Android 3.2"),
        ("4", "In the same weeks, Guided converts and activates more.",
         f'="Conversion "&{t(R["g_cvr_g"], "0.0%")}&" vs "&{t(R["g_cvr_c"], "0.0%")}&" ("&{t(R["g_cvr_lift"], "+0.0;-0.0")}&" pp, 95% CI "&{t(R["g_cvr_lo"], "+0.0;-0.0")}&" to "&{t(R["g_cvr_hi"], "+0.0;-0.0")}&"); activation excl. 3.2 "&{t(R["g_act_g"], "0.0%")}&" vs "&{t(R["g_act_c"], "0.0%")}&"; revenue per trial "&{t(R["rpts_guided"], "$0.00")}&" vs "&{t(R["rpts_classic"], "$0.00")}&"."', "4 Guided vs Classic"),
        ("5", "The lift survives the stress tests (still observational).",
         f'="Controlled for channel × platform: "&{t(R["g_std_lift"], "+0.0;-0.0")}&" pp; complete cohorts: "&{t(R["g_mature_lift"], "+0.0;-0.0")}&" pp; Guided ahead on "&{R["g_platforms_ahead"]}&" platforms; "&{R["g_neg_strata"]}&" of 12 small strata negative (noise). Not randomized → keep a holdout."', "4 Guided vs Classic"),
        ("6", "The 'aha' moment is the 3rd task.",
         f'="Conversion "&{t(R["aha_low"], "0.0%")}&" with 0–2 tasks vs "&{t(R["aha_high"], "0.0%")}&" with 3+ ("&TEXT({R["aha_high"]}/{R["aha_low"]},"0.0")&"×). Onboarding should push users to 3 tasks fast."', "6 Users"),
        ("7", "Price barely moves conversion, so $18 earns the most per trial.",
         f'="Elasticity "&{t(R["elasticity"], "0.00")}&"; $12 vs $18 CVR "&{t(R["price_diff"], "+0.0;-0.0")}&" pp (95% CI "&{t(R["price_lo"], "+0.0;-0.0")}&" to "&{t(R["price_hi"], "+0.0;-0.0")}&"); revenue per trial "&{t(R["rpts12"], "$0.00")}&" / "&{t(R["rpts15"], "$0.00")}&" / "&{t(R["rpts18"], "$0.00")}&"."', "6 Users"),
        ("8", "Users decide in the first week.",
         f'={t(R["pay_7d"], "0%")}&" of payers pay within 7 days; median "&{t(R["pay_median"], "0.0")}&" days. Nudges belong in days 2–6."', "6 Users"),
        ("9", "Channel quality varies a lot.",
         f'="Revenue per trial: Referral "&{t(R["rpts_referral"], "$0.00")}&" vs Creator Campaign "&{t(R["rpts_creator"], "$0.00")}&" ("&{t(R["chan_ratio"], "0.0")}&"×). Even activated Creator users convert at "&{t(R["creator_act_cvr"], "0%")}&": an intent problem, not a product problem."', "6 Users"),
    ]
    rows = [[n, f, ev, f'=HYPERLINK("#gid={SID[where]}","→ {where}")'] for n, f, ev, where in findings]
    r1, r2 = table(sh, 6, 0, ["#", "Finding", "Evidence (live from the analysis tabs)", "Where"], rows)
    fmt(sh, r1, 0, r2, 3, wrap=True, v="TOP")
    fmt(sh, r1, 1, r2, 1, bold=True)

    r = r2 + 2
    section(sh, r, "Recommendation")
    recs = [["Now", "Expand Guided to 90% of new users; 10% Classic randomized by user_id (holdout)."],
            ["Now", "P0 fix for task tracking on Android 3.2."],
            ["Now", "Rebuild the dashboard: by channel, complete cohorts only, Android 3.2 flagged."],
            ["Month 1", "Guided 2.0 focused on getting users to 3 tasks in 72 h."],
            ["Month 1", "Test $15 vs $18 with 90-day retention; test a 7-day trial."],
            ["Month 2", "Audit Creator Campaign acquisition cost (CAC)."]]
    table(sh, r + 1, 1, ["When", "Action"], recs)
    r = r + 2 + len(recs) + 1
    section(sh, r, "What would change the recommendation")
    put(sh, r + 1, 1, [["• Holdout lift below 2 pp after 6 weeks"], ["• Guided users churn more in months 2–3"], ["• Android activation doesn't recover after the fix"]])


def build_readme():
    sh = "README"
    page_title(sh, "TaskNest · Guided Onboarding analysis (built 100% in Google Sheets)", "Should TaskNest expand, modify or stop Guided Onboarding? This workbook rebuilds the whole analysis with formulas and pivot tables, so any analyst can audit every number.")
    put(sh, 4, 0, [["How to read this workbook"]])
    fmt(sh, 4, 0, 4, 0, bold=True, size=13)
    flow = [["1", "raw_trial_users, raw_product_events", "The original CSV files, pasted as-is (blue text = pasted input). Nothing else is pasted."],
            ["2", "params", "Assumptions in one place (launch date, 7/14-day windows, clock-skew tolerance, extraction cutoff). Change one and everything recalculates."],
            ["3", "events_prep", "One row per event: looks up the user's sign-up (XLOOKUP), minutes from sign-up and window flags (0/1)."],
            ["4", "user_facts", "One row per user: projects and tasks in each window (COUNTIFS on events_prep), activation, conversion, revenue, maturity, broken-tracking flag."],
            ["5", "Pivot Tables", "Native pivot tables on user_facts: the same cuts an analyst would explore by hand."],
            ["6", "Tabs 1–7", "The analysis: every cell is a formula (AVERAGEIFS / COUNTIFS / SUMPRODUCT) on named ranges like uf_converted_14d."],
            ["7", "Conclusions", "Findings and recommendation; the evidence text is built from live formulas."]]
    table(sh, 5, 0, ["Step", "Tab", "What it does"], flow)
    fmt(sh, 6, 0, 12, 2, wrap=True, v="TOP")

    put(sh, 15, 0, [["Tab index"]])
    fmt(sh, 15, 0, 15, 0, bold=True, size=13)
    idx = [("Conclusions", "Answer to the CPO + live evidence"), ("1 Data Quality", "Integrity checks and known data issues"),
           ("2 Dashboard vs Reality", "Why the company dashboard misleads"), ("3 Channel Mix", "Rate vs mix decomposition of the conversion drop"),
           ("4 Guided vs Classic", "Same-weeks comparison with 95% CI + robustness"), ("5 Android 3.2", "The tracking bug behind the activation drop"),
           ("6 Users", "Aha moment, price, time to pay, channel quality"), ("7 Weekly Timeline", "Weekly cohorts and mix shifts"),
           ("Pivot Tables", "Native pivots"), ("params", "Assumptions"), ("user_facts", "User-level model (formulas)"),
           ("events_prep", "Event-level preparation (formulas)"), ("raw_trial_users", "Pasted CSV"), ("raw_product_events", "Pasted CSV")]
    rows = [[f'=HYPERLINK("#gid={SID[t]}","{t}")', d] for t, d in idx]
    table(sh, 16, 0, ["Tab", "Content"], rows)

    r = 16 + len(idx) + 3
    put(sh, r, 0, [["Definitions"]])
    fmt(sh, r, 0, r, 0, bold=True, size=13)
    defs = [["Activation", "≥1 project_created AND ≥3 task_created within 7 days of sign-up (official dashboard rule)."],
            ["Trial conversion (CVR 14 d)", "Payment recorded ≤14 days after sign-up."],
            ["Revenue per trial", "Monthly price if converted within 14 days, else 0, averaged over all trials (first month only)."],
            ["Complete cohort", "Sign-up + 14 days ≤ extraction cutoff (start of the last event day)."],
            ["Same weeks", "Guided vs Classic compared only among Jun–Jul sign-ups (Guided didn't exist before)."],
            ["pp", "Percentage points: the difference between two rates."]]
    table(sh, r + 1, 0, ["Term", "Definition"], defs)
    r = r + 2 + len(defs) + 1
    put(sh, r, 0, [["How to audit any number: click it → every value is a formula → follow it to user_facts → events_prep → raw_. Named ranges are listed in Data → Named ranges."]])
    fmt(sh, r, 0, r, 0, italic=True, fg=GREY, wrap=False)


def widths():
    reqs = []
    def w(sh, c, px):
        reqs.append({"updateDimensionProperties": {"range": {"sheetId": SID[sh], "dimension": "COLUMNS", "startIndex": c, "endIndex": c + 1}, "properties": {"pixelSize": px}, "fields": "pixelSize"}})
    for sh in ["1 Data Quality", "2 Dashboard vs Reality", "3 Channel Mix", "4 Guided vs Classic", "5 Android 3.2", "6 Users"]:
        w(sh, 0, 300)
        for c in range(1, 10):
            w(sh, c, 110)
    w("1 Data Quality", 4, 430); w("1 Data Quality", 3, 130)
    w("4 Guided vs Classic", 9, 140)
    w("7 Weekly Timeline", 0, 110)
    for c in range(1, 8):
        w("7 Weekly Timeline", c, 105)
    w("Conclusions", 0, 40); w("Conclusions", 1, 330); w("Conclusions", 2, 620); w("Conclusions", 3, 190)
    w("README", 0, 220); w("README", 1, 290); w("README", 2, 640)
    w("params", 0, 190); w("params", 1, 150); w("params", 2, 620)
    for sh, n in [("raw_trial_users", 9), ("raw_product_events", 5), ("events_prep", len(EV_COLS)), ("user_facts", len(UF_COLS))]:
        reqs.append({"autoResizeDimensions": {"dimensions": {"sheetId": SID[sh], "dimension": "COLUMNS", "startIndex": 0, "endIndex": n}}})
        reqs.append({"setBasicFilter": {"filter": {"range": {"sheetId": SID[sh]}}}})
    return reqs


def charts_only():
    """Rehace solo las gráficas (borra las existentes y las vuelve a crear)."""
    meta = S.meta("sheets(properties,charts(chartId))")
    for sh in meta["sheets"]:
        SID[sh["properties"]["title"]] = sh["properties"]["sheetId"]
    old = [{"deleteEmbeddedObject": {"objectId": c["chartId"]}} for sh in meta["sheets"] for c in sh.get("charts", [])]
    if old:
        S.batch(old)
    build_data_quality(); build_dashboard(); build_mix(); build_guided(); build_android(); build_users(); build_timeline()
    S.batch(CHARTS, chunk=20)
    (HERE / "workbook_refs.json").write_text(json.dumps(REF, indent=2))
    print(f"{len(CHARTS)} gráficas creadas")


def main():
    import sys
    if "--charts" in sys.argv:
        return charts_only()
    print("Reiniciando libro …")
    reset_workbook()
    load_raw()
    build_params()
    S.batch(RQ); RQ.clear()  # rangos con nombre de params antes de las fórmulas
    build_events_prep()
    S.batch(RQ); RQ.clear()
    build_user_facts()
    S.batch(RQ); RQ.clear()
    print("· Hojas de análisis …")
    build_data_quality(); build_dashboard(); build_mix(); build_guided(); build_android(); build_users(); build_timeline(); build_pivots()
    build_conclusions(); build_readme()
    S.write_many(WR)
    print("· Formato, pivotes, formato condicional y gráficas …")
    S.batch(RQ + widths())
    S.batch(CF)
    S.batch(CHARTS, chunk=20)
    (HERE / "workbook_refs.json").write_text(json.dumps(REF, indent=2))
    print(f"Listo: https://docs.google.com/spreadsheets/d/{S.id}/edit")


if __name__ == "__main__":
    main()
