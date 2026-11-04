# Cómo usar la skill `tasknest-analyst`

Es un "analista experto" para Claude: conoce el caso, el modelo de datos, las métricas y las trampas, y responde con **SQL en vivo** sobre la base `tasknest`.

Ejemplos de preguntas:
- *"¿Cuánto convierte Guided vs Classic en las mismas semanas?"*
- *"¿Por qué cayó la conversión? Sepáralo en tasa y mix."*
- *"Llegó data nueva, ¿las conclusiones siguen en pie?"*

## Opción A · Claude Code (técnica, la más completa: con datos en vivo)

1. Levanta la base: `./scripts/setup_postgres.sh` (requiere Docker).
2. En la raíz del repo ejecuta `claude`, y aprueba el servidor `postgres-tasknest`.
3. La skill está en `.claude/skills/tasknest-analyst/` y se carga sola. Pregunta lo que quieras.

## Opción B · Claude.ai / Claude Desktop (sin terminal)

1. Genera o toma el archivo `tasknest-analyst-skill.zip` (se crea con `./scripts/make_zip.sh`).
2. En Claude: **Settings → Capabilities → Skills → Upload skill** y sube el zip.
3. Sin conexión a la base, la skill sirve con el contexto, las definiciones y la metodología. Para consultas en vivo se necesita la Opción A.

## Qué contiene

| Archivo (`references/`) | Contenido |
|---|---|
| `business_context.md` | La pregunta del negocio y la respuesta vigente |
| `data_model.md` | Tablas, vistas, dominios y problemas de calidad conocidos |
| `metrics.md` | Definiciones oficiales de cada métrica |
| `methodology.md` | Tasa vs mix, comparación en las mismas semanas, intervalos de confianza |
| `queries.md` | Consultas SQL listas por tipo de pregunta |
| `pitfalls.md` | Trampas (Android 3.2, desfase de reloj, cohortes inmaduras) |
| `new_data_playbook.md` | Qué hacer cuando llega data nueva |
| `report_format.md` | Formato de los reportes |
