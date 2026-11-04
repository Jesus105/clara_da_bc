# Conector de Google Sheets (cuenta personal)

Construye y verifica el análisis de TaskNest en Google Sheets **solo con fórmulas y tablas dinámicas**:
https://docs.google.com/spreadsheets/d/1093RwUhI0yNnJEYubFMV7DY_s0dMPBRGRhFgUNspINg/edit

## Conexión

| Pieza | Detalle |
|---|---|
| Credencial | Service account propia (proyecto personal de Google Cloud). La llave vive **fuera del repo** en `~/.config/tasknest-gsheets/service_account.json` (permisos 600). |
| Acceso | El Sheet está compartido con la service account como **Editor**. |
| Por qué service account y no OAuth | Las apps OAuth personales en modo "testing" vencen el token cada 7 días; la service account no vence. |
| Cliente | `gsheets_client.py`: Sheets API v4, reintentos con backoff exponencial ante 429/5xx, escritura por lotes. |
| MCP | `google-sheets` en el `.mcp.json` del proyecto (`mcp-google-sheets==0.6.3` con `mcp<2` fijado: la versión publicada no arranca con el SDK de MCP 2.x). Probado con handshake MCP real (20 herramientas). Disponible para Claude Code en sesiones nuevas. |

## Uso

```bash
cd tools/gsheets
.venv/bin/python build_workbook.py            # reconstruye el libro desde cero (~40 s, idempotente)
.venv/bin/python build_workbook.py --charts   # solo rehace las gráficas
.venv/bin/python verify_workbook.py           # compara 61 celdas clave con el SQL y busca errores de fórmula
```

Primera vez: `python3 -m venv .venv && .venv/bin/pip install google-api-python-client google-auth`.

## Qué construye

```
raw_trial_users, raw_product_events   CSV pegados tal cual (texto azul = input)
params                                supuestos editables, como rangos con nombre (LAUNCH, ACT_DAYS, CONV_DAYS, SKEW_MIN, CUTOFF…)
events_prep                           1 fila por evento: XLOOKUP del signup, minutos desde el signup, banderas de ventana
user_facts                            1 fila por usuario: COUNTIFS sobre events_prep → activación, conversión, ingreso, madurez
Pivot Tables                          5 tablas dinámicas nativas sobre user_facts
1–7                                   análisis con AVERAGEIFS / COUNTIFS / SUMPRODUCT sobre rangos con nombre (uf_*)
Conclusions                           hallazgos con evidencia en texto vivo (fórmulas), recomendación
```

## Verificación (última corrida)

- 61/61 celdas clave coinciden con el análisis SQL (dashboard, descomposición tasa/mix, Guided contra Classic con IC, lift controlado, Android 3.2, aha, precio, tiempo a pago, canales).
- 0 errores de fórmula en las hojas de análisis ni en muestras de `user_facts` y `events_prep`.
- El Sheet detectó dos redondeos dobles del análisis original, que se corrigieron en todos los entregables: contrafactual de mix **36.8 %** (no 36.9 %) y pagadores en 7 días **74.3 %** (no 74.4 %).
