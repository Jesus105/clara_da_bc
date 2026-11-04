"""Cliente robusto para Google Sheets (cuenta personal, service account).

- Credencial: SERVICE_ACCOUNT_PATH o ~/.config/tasknest-gsheets/service_account.json (fuera del repo).
- Reintentos con backoff exponencial + jitter ante 429 / 5xx / errores de red.
- Helpers para escribir valores por lotes y enviar batchUpdate en bloques.
Nunca imprime la llave.
"""
from __future__ import annotations

import os
import random
import time
from pathlib import Path
from typing import Any, Iterable

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
DEFAULT_KEY = Path.home() / ".config" / "tasknest-gsheets" / "service_account.json"
SPREADSHEET_ID = os.environ.get("TASKNEST_SHEET_ID", "1093RwUhI0yNnJEYubFMV7DY_s0dMPBRGRhFgUNspINg")
RETRYABLE = {429, 500, 502, 503, 504}


def credentials():
    path = Path(os.environ.get("SERVICE_ACCOUNT_PATH", DEFAULT_KEY)).expanduser()
    if not path.exists():
        raise FileNotFoundError(f"No se encontró la credencial en {path}")
    return service_account.Credentials.from_service_account_file(str(path), scopes=SCOPES)


def service():
    return build("sheets", "v4", credentials=credentials(), cache_discovery=False)


def with_retry(fn, *, tries: int = 7, base: float = 1.5):
    """Ejecuta fn() con backoff exponencial ante errores transitorios."""
    for attempt in range(tries):
        try:
            return fn()
        except HttpError as e:
            status = getattr(e.resp, "status", None)
            if status not in RETRYABLE or attempt == tries - 1:
                raise
        except (ConnectionError, TimeoutError, OSError):
            if attempt == tries - 1:
                raise
        sleep = base ** attempt + random.random()
        print(f"  ↻ reintento {attempt + 1} en {sleep:.1f}s")
        time.sleep(sleep)


class Sheets:
    def __init__(self, spreadsheet_id: str = SPREADSHEET_ID):
        self.id = spreadsheet_id
        self.svc = service()
        self.ss = self.svc.spreadsheets()

    # ---------- lectura
    def meta(self, fields: str = "properties,sheets.properties") -> dict:
        return with_retry(lambda: self.ss.get(spreadsheetId=self.id, fields=fields).execute())

    def sheet_ids(self) -> dict[str, int]:
        return {s["properties"]["title"]: s["properties"]["sheetId"] for s in self.meta()["sheets"]}

    def get(self, rng: str, render: str = "UNFORMATTED_VALUE") -> list[list[Any]]:
        res = with_retry(lambda: self.ss.values().get(spreadsheetId=self.id, range=rng, valueRenderOption=render).execute())
        return res.get("values", [])

    def batch_get(self, ranges: list[str], render: str = "UNFORMATTED_VALUE") -> list[list[list[Any]]]:
        res = with_retry(lambda: self.ss.values().batchGet(spreadsheetId=self.id, ranges=ranges, valueRenderOption=render).execute())
        return [vr.get("values", []) for vr in res.get("valueRanges", [])]

    # ---------- escritura
    def write(self, rng: str, rows: list[list[Any]], raw: bool = False):
        body = {"values": rows}
        opt = "RAW" if raw else "USER_ENTERED"
        return with_retry(lambda: self.ss.values().update(spreadsheetId=self.id, range=rng, valueInputOption=opt, body=body).execute())

    def write_chunked(self, sheet: str, start_row: int, rows: list[list[Any]], first_col: str = "A", chunk: int = 2500):
        """Escribe muchas filas en bloques (evita payloads gigantes)."""
        for i in range(0, len(rows), chunk):
            part = rows[i : i + chunk]
            r0 = start_row + i
            self.write(f"'{sheet}'!{first_col}{r0}", part)
            print(f"  · {sheet}: filas {r0}–{r0 + len(part) - 1}")

    def write_many(self, data: list[tuple[str, list[list[Any]]]], chunk: int = 60):
        """Escribe muchos rangos (A1, filas) en pocas llamadas values.batchUpdate."""
        for i in range(0, len(data), chunk):
            part = [{"range": r, "values": v} for r, v in data[i : i + chunk]]
            body = {"valueInputOption": "USER_ENTERED", "data": part}
            with_retry(lambda: self.ss.values().batchUpdate(spreadsheetId=self.id, body=body).execute())

    def batch(self, requests: Iterable[dict], chunk: int = 400):
        reqs = list(requests)
        out = []
        for i in range(0, len(reqs), chunk):
            part = reqs[i : i + chunk]
            out.append(with_retry(lambda: self.ss.batchUpdate(spreadsheetId=self.id, body={"requests": part}).execute()))
        return out


if __name__ == "__main__":
    s = Sheets()
    m = s.meta()
    p = m["properties"]
    print("Título:", p["title"], "| locale:", p.get("locale"), "| zona:", p.get("timeZone"))
    for sh in m["sheets"]:
        gp = sh["properties"].get("gridProperties", {})
        print(f"  hoja '{sh['properties']['title']}' id={sh['properties']['sheetId']} {gp.get('rowCount')}×{gp.get('columnCount')}")
