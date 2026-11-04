# TaskNest · Business Case App

Landing con 4 secciones (Dashboard, Deck de análisis, Deck de uso de IA, Análisis en Google Sheets). Por ahora solo el **Dashboard** está construido.

## Stack

React 19 + Vite 6 + Tailwind 4 + TypeScript (el mismo stack del frontend de `clara`). Es una app **100 % estática**:
los datos son un JSON de una fila por usuario (`public/data/users.json`, ~350 KB) generado con SQL desde Postgres.
El filtrado y la agregación corren en el navegador.

## Datos

```bash
# Requiere el contenedor tasknest-postgres corriendo (docker compose up -d en la raíz)
npm run data        # ejecuta sql/04_dashboard_export.sql -> public/data/users.json
```

Todos los flags (conversión a 14 días, cohorte madura, proyectos y tareas a 7 días con regla oficial y con tolerancia de −15 h) se calculan en SQL.

## Desarrollo

```bash
npm install
npm run dev         # http://localhost:5173
npm run build       # dist/
```

## Despliegue

**En producción (público):** https://tasknest-business-case.vercel.app — proyecto `tasknest-business-case` en Vercel (cuenta jesus105).
Para volver a publicar: `npm run deploy` (compila, restaura el vínculo al proyecto y publica a producción).


`vercel.json` ya está listo (build `npm run build`, salida `dist`, rutas SPA). Hay que importar la carpeta `app/` como proyecto en Vercel
o correr `npx vercel --prod` desde `app/`. Cualquier hosting estático sirve (Netlify, Render Static Site, GitHub Pages).

## Dashboard

- **Barra de controles**: fechas de registro (presets o fechas exactas), "Ver por" día, semana o mes, y ⚙ Opciones (corrección del desfase de reloj en la activación).
- **Timeline**: filtros escritos como frases ("Canal **no es** Creator Campaign", "Dispositivo **es** iOS") con "+ Agregar filtro" y atajos de ejemplo. Muestra KPIs contra el total, la CVR por cohorte y un KPI de producto a elegir, con una línea gris para el total.
- **Comparativo**, guiado en 3 pasos:
  0. *Empieza con una pregunta*: 8 preguntas del caso que arman grupos, fechas y KPI, y muestran la respuesta.
  1. *Grupos* (A–D): cada grupo es una combinación de condiciones. "Un grupo por cada valor de…" divide por una dimensión y conserva las condiciones comunes.
  2. *Qué medir*: KPIs de negocio y de uso del producto.
  3. *Resultado*: primero la respuesta en una frase ("✓ Diferencia real" o "≈ Puede ser ruido"), luego la gráfica y la tabla con todos los KPIs.
- **Avisos**: Android 3.2 en KPIs de tareas, comparar experiencias con fechas previas al 1-jun, grupos chicos y puntos huecos (dato frágil).
