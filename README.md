# TaskNest · Business Case de Data Analyst (Clara)

**Pregunta:** ¿el CPO debe expandir, modificar o detener el Onboarding Guiado?
**Respuesta:** **expandirlo al 90 % de los usuarios nuevos y dejar un 10 % de holdout aleatorio.** La caída del dashboard no la causa Guided: es un cambio de mezcla de canal (Creator Campaign) más un error de medición (Android 3.2).

🌐 Sitio público: https://tasknest-business-case.vercel.app
📊 Google Sheet (solo fórmulas): https://docs.google.com/spreadsheets/d/1093RwUhI0yNnJEYubFMV7DY_s0dMPBRGRhFgUNspINg/edit

> 👤 **¿No eres técnico?** Abre `LEEME_PRIMERO.md`. No necesitas instalar nada.

## Estructura

```
.
├── LEEME_PRIMERO.md              👋 Guía para personas no técnicas
├── entregables/                  🎯 Lo que se presenta
│   ├── TaskNest_CVR_Analysis.xlsx    Análisis completo en Excel (fórmulas auditables)
│   ├── TaskNest_Analysis_Deck_EN.pdf Deck de análisis (8 slides)
│   ├── TaskNest_AI_Use_Deck_EN.pdf   Deck de uso de IA (7 slides)
│   └── ANALISIS_COMPLETO_TASKNEST.md Reporte completo en español
├── docs/                         📚 Contexto y documentación
│   ├── BRIEF_PROYECTO.md           Resumen del proyecto, paso a paso y uso de IA
│   ├── COMO_USAR_LA_SKILL.md       Cómo usar la skill (Claude Code o Claude.ai)
│   ├── 01_caso/                    Brief original del caso (es + pdf)
│   ├── 02_comprension/             Comprensión de negocio y de datos, supuestos
│   └── 03_borradores_previos/      Guía inicial (cifras luego corregidas)
├── data/raw/                     🗃️ trial_users y product_events (.csv y .xlsx)
├── docker-compose.yml            🐳 Servidor PostgreSQL 16 con los CSV montados
├── sql/                          🧮 01 schema · 02 carga · 03 vistas analíticas · 04 export del dashboard
├── scripts/                      ⚙️ setup_postgres.sh · verify_db.sh · export_dashboard_data.sh · make_zip.sh · build_pdfs.sh
├── .mcp.json                     🔌 MCP de PostgreSQL para Claude Code
├── .claude/skills/tasknest-analyst/   🧠 Skill de análisis (SKILL.md + references/)
├── analysis/                     🐍 Script de análisis en Python (versión previa)
├── app/                          📈 Dashboard + decks (React 19 + Vite + Tailwind), ver app/README.md
└── tools/gsheets/                🧾 Construcción y verificación del Google Sheet
```

## Orden de lectura

1. `docs/BRIEF_PROYECTO.md`: qué se hizo y cómo.
2. `docs/01_caso/TaskNest_Candidate_Brief_es.md`: el caso.
3. `docs/02_comprension/`: supuestos de negocio y de datos.
4. `entregables/`: Excel, reporte y decks.

> `FASE_1_…`, `GUIA_…`, `DATA_UNDERSTANDING_…` y `analysis/analisis_tasknest.py` son documentos previos que se conservan como contexto. Contienen cifras que se corrigieron después (ver la tabla de errores en `BRIEF_PROYECTO.md`).

## Quickstart: base de datos en Docker

Requisitos: Docker (o Colima en Mac).

```bash
./scripts/setup_postgres.sh   # levanta Postgres, crea el schema, carga los CSV y crea las vistas
./scripts/verify_db.sh        # verifica: 1,800 usuarios, 10,220 eventos, integridad referencial
```

Conexión: `postgresql://postgres:<DB_PASSWORD>@localhost:5432/tasknest`. El script crea un `.env` con una contraseña aleatoria (no se sube a git); ahí la encuentras.
Resetear: `docker compose down -v && ./scripts/setup_postgres.sh`

## Claude Code: skill + MCP de Postgres

1. Levanta la base (arriba).
2. Abre Claude Code en la raíz del repo (`claude`) y aprueba el servidor `postgres-tasknest` (requiere Node/`npx`).
3. La skill `tasknest-analyst` se carga sola (más detalles y la versión para Claude.ai en `docs/COMO_USAR_LA_SKILL.md`). Ejemplos:
   - *"¿Cuánto convierte Guided vs Classic en las mismas semanas?"*
   - *"Llegó data nueva, revisa si las conclusiones siguen en pie"*

La skill corre SQL en vivo y documenta contexto, modelo de datos, métricas, metodología, trampas y formato de reporte en `.claude/skills/tasknest-analyst/references/`.

## Dashboard (opcional)

```bash
cd app && npm install
npm run data   # regenera public/data/users.json desde Postgres (requiere el contenedor arriba)
npm run dev    # http://localhost:5173
```

`app/public/` lleva copias de los PDFs porque el sitio los sirve de forma estática.

## Google Sheets (opcional)

Requiere una service account propia; la llave nunca se versiona. Ver `tools/gsheets/README.md` y `.mcp.google-sheets.example.json`.

## Datos

1,800 trials (1-abr → 31-jul-2026) y 10,220 eventos. Tres cambios coinciden en el tiempo y hay que separarlos: lanzamiento de Guided (1-jun, sin aleatorizar), Creator Campaign (1-jun) y Android 3.2 (20-jun, dejó de registrar `task_created`).

## PDFs de toda la documentación

Cada `.md` tiene su `.pdf` al lado (generado con LaTeX), pensado para quien no usa editores de texto. Para regenerarlos después de editar un `.md`:

```bash
brew install pandoc          # y tener LaTeX con xelatex (p. ej. TinyTeX o MacTeX)
./scripts/build_pdfs.sh
```

Los `.md` de `.claude/skills/` no se convierten: son instrucciones internas de la skill.

## Compartir con alguien no técnico (.zip)

```bash
./scripts/make_zip.sh
```
Los zips ya listos están en `descargas/`. El script los regenera junto al repo y los copia ahí: `TaskNest_Clara_BusinessCase.zip` (paquete completo, con `LEEME_PRIMERO.md`) y `tasknest-analyst-skill.zip` (solo la skill, para subir a Claude.ai).
