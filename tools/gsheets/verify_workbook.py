"""Verifica el libro de Google Sheets contra las cifras del análisis en SQL (PostgreSQL).

1) Lee las celdas clave (workbook_refs.json) y las compara con los baselines del análisis.
2) Recorre las hojas de análisis buscando errores de fórmula (#REF!, #N/A, #VALUE!, #DIV/0!, #ERROR!, #NAME?).
"""
import json
from pathlib import Path

from gsheets_client import Sheets

HERE = Path(__file__).resolve().parent
REF = json.loads((HERE / "workbook_refs.json").read_text())

# baseline (valor esperado, tolerancia) — cifras del análisis SQL / skill tasknest-analyst
EXPECTED = {
    "dq_users": (1800, 0), "dq_events": (10220, 0), "dq_orphans": (0, 0), "dq_before": (1928, 0), "dq_after14": (3, 0),
    "dq_immature14": (155, 0), "dq_immature7": (20, 0),
    "pre_act": (0.5013, 0.0006), "post_act": (0.3701, 0.0006), "pre_cvr": (0.3260, 0.0006), "post_cvr": (0.2891, 0.0006),
    "pre_rpts": (4.82, 0.006), "post_rpts": (4.29, 0.006),
    "mix_rate": (3.79, 0.006), "mix_mix": (-7.49, 0.006), "mix_total": (-3.70, 0.006), "mix_creator_mix": (-6.75, 0.006),
    "mix_counterfactual": (0.3685, 0.0003), "share_creator_pre": (0.037, 0.0006), "share_creator_post": (0.341, 0.0006),
    "g_cvr_c": (0.2457, 0.0006), "g_cvr_g": (0.3172, 0.0006), "g_cvr_lift": (7.15, 0.06), "g_cvr_lo": (1.6, 0.06), "g_cvr_hi": (12.7, 0.06),
    "g_mature_lift": (8.7, 0.06), "g_act_c": (0.4184, 0.0006), "g_act_g": (0.5098, 0.0006), "g_act_lift": (9.14, 0.06),
    "g_act_lo": (1.9, 0.06), "g_act_hi": (16.4, 0.06), "g_std_lift": (6.93, 0.006), "g_neg_strata": (3, 0),
    "rpts_classic": (3.61, 0.006), "rpts_guided": (4.73, 0.006),
    "a31_3t": (0.510, 0.0006), "a32_3t": (0.081, 0.0006), "a31_tpp": (4.48, 0.006), "a32_tpp": (1.54, 0.006),
    "a31_cvr": (0.291, 0.0006), "a32_cvr": (0.310, 0.0006), "a31_proj": (0.628, 0.0006), "a32_proj": (0.609, 0.0006),
    "a31_pay_act": (0.669, 0.0006), "a32_pay_act": (0.071, 0.0006),
    "aha_t0": (0.177, 0.0006), "aha_t3": (0.395, 0.0006),
    "elasticity": (-0.142, 0.0006), "price_diff": (1.7, 0.06), "price_lo": (-4.6, 0.06), "price_hi": (8.1, 0.06),
    "rpts12": (3.73, 0.006), "rpts15": (4.59, 0.006), "rpts18": (5.29, 0.006),
    "pay_median": (4.8, 0.06), "pay_7d": (0.7432, 0.0006),
    "rpts_referral": (6.99, 0.006), "rpts_creator": (1.95, 0.006), "creator_act_cvr": (0.253, 0.0006),
}
TEXT_EXPECTED = {"mix_closure": "✓ closes exactly", "g_platforms_ahead": "4 of 4"}
ANALYSIS = ["Conclusions", "README", "1 Data Quality", "2 Dashboard vs Reality", "3 Channel Mix", "4 Guided vs Classic",
            "5 Android 3.2", "6 Users", "7 Weekly Timeline", "Pivot Tables", "params"]


def main():
    s = Sheets()
    keys = list(EXPECTED) + list(TEXT_EXPECTED)
    vals = s.batch_get([REF[k] for k in keys])
    ok = bad = 0
    for k, v in zip(keys, vals):
        got = v[0][0] if v and v[0] else None
        if k in TEXT_EXPECTED:
            good = got == TEXT_EXPECTED[k]
            exp = TEXT_EXPECTED[k]
        else:
            exp, tol = EXPECTED[k]
            good = isinstance(got, (int, float)) and abs(got - exp) <= tol + 1e-9
        ok += good
        bad += not good
        if not good:
            print(f"  ✗ {k:20s} {REF[k]:32s} got={got!r} expected={exp!r}")
    print(f"Celdas clave: {ok} OK, {bad} con diferencia (de {len(keys)})")

    errs = []
    for sh, grid in zip(ANALYSIS, s.batch_get([f"'{t}'!A1:AH100" for t in ANALYSIS], render="FORMATTED_VALUE")):
        for i, row in enumerate(grid):
            for j, c in enumerate(row):
                if isinstance(c, str) and c.startswith("#") and c.rstrip("!?0/").upper() in {"#REF", "#N/A", "#VALUE", "#DIV", "#ERROR", "#NAME", "#NUM"}:
                    errs.append(f"{sh}!R{i + 1}C{j + 1}={c}")
    # muestreo de las hojas de modelo (filas 2..60 y últimas)
    for sh, rng in [("user_facts", "A2:AD60"), ("user_facts", "A1780:AD1801"), ("events_prep", "A2:M60"), ("events_prep", "A10200:M10221")]:
        for i, row in enumerate(s.get(f"'{sh}'!{rng}", render="FORMATTED_VALUE")):
            errs += [f"{sh}!{rng}+{i}:{c}" for c in row if isinstance(c, str) and c.startswith("#") and len(c) < 9]
    print(f"Errores de fórmula encontrados: {len(errs)}")
    for e in errs[:20]:
        print("  ", e)

    # conclusiones: que el texto vivo se haya resuelto
    concl = s.get("'Conclusions'!C7:C15", render="FORMATTED_VALUE")
    print("\nConclusiones (texto vivo):")
    for row in concl:
        print("  •", row[0] if row else "(vacío)")


if __name__ == "__main__":
    main()
