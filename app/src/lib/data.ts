// Capa de datos del dashboard: tipos, filtros, buckets temporales y KPIs.
// Fuente: public/data/users.json, generado con sql/04_dashboard_export.sql (una fila por usuario).

export type User = {
  id: string
  s: string // signup 'YYYY-MM-DDTHH:MI'
  ch: string // canal
  pl: string // plataforma
  x: string // experiencia
  v: string // versión app
  p: number // precio mensual USD
  c: 0 | 1 // convirtió en 14 días
  m: 0 | 1 // cohorte madura (14 días completos al corte)
  ps: number // proyectos 7d (regla oficial)
  ts: number // tareas 7d (regla oficial)
  pt: number // proyectos 7d (tolerancia -15h)
  tt: number // tareas 7d (tolerancia -15h)
  rm: 0 | 1 // configuró recordatorio (7d)
  cl: 0 | 1 // invitó colaborador (7d)
}

export type Dataset = { generated_at: string; extraction_date: string; users: User[] }

export type DimKey = 'ch' | 'pl' | 'x' | 'v' | 'p'

export type Dim = { key: DimKey; label: string; values: string[]; display?: (v: string) => string }

// Orden fijo de valores = orden fijo de color (el color sigue a la entidad, nunca al ranking).
export const DIMS: Dim[] = [
  { key: 'ch', label: 'Canal', values: ['Organic', 'Paid Search', 'Referral', 'Creator Campaign'] },
  { key: 'pl', label: 'Dispositivo', values: ['iOS', 'Android', 'Web'] },
  { key: 'x', label: 'Experiencia', values: ['Classic', 'Guided'] },
  { key: 'v', label: 'Versión app', values: ['3.1', '3.2', '4.1', 'Web'], display: (v) => (v === 'Web' ? 'Web' : `v${v}`) },
  { key: 'p', label: 'Precio mensual', values: ['12', '15', '18'], display: (v) => `$${v}` },
]

export const dimByKey = (k: DimKey) => DIMS.find((d) => d.key === k)!
export const displayValue = (k: DimKey, v: string) => dimByKey(k).display?.(v) ?? v

/** Filtro de una dimensión: incluir o excluir un conjunto de valores (vacío = todos). */
export type DimFilter = { mode: 'in' | 'out'; values: string[] }
export type Filters = Record<DimKey, DimFilter>

export const emptyDimFilter = (): DimFilter => ({ mode: 'in', values: [] })
export const emptyFilters = (): Filters => ({ ch: emptyDimFilter(), pl: emptyDimFilter(), x: emptyDimFilter(), v: emptyDimFilter(), p: emptyDimFilter() })
export const isActive = (f: DimFilter) => f.values.length > 0
export const anyActive = (f: Filters) => DIMS.some((d) => isActive(f[d.key]))
export const inc = (...values: string[]): DimFilter => ({ mode: 'in', values })
export const exc = (...values: string[]): DimFilter => ({ mode: 'out', values })
export const filtersOf = (partial: Partial<Filters>): Filters => ({ ...emptyFilters(), ...partial })

/** Etiqueta legible de un filtro de dimensión: "iOS", "iOS / Web", "Sin Creator Campaign". */
export function dimFilterLabel(k: DimKey, f: DimFilter): string {
  const names = f.values.map((v) => displayValue(k, v))
  if (f.mode === 'out') return `Sin ${names.join(', ')}`
  return names.length <= 2 ? names.join(' / ') : `${dimByKey(k).label}: ${names.length} valores`
}

/** Nombre automático de un segmento a partir de sus filtros. */
export function filtersLabel(f: Filters): string {
  const parts = DIMS.filter((d) => isActive(f[d.key])).map((d) => dimFilterLabel(d.key, f[d.key]))
  return parts.length ? parts.join(' · ') : 'Todos'
}

export type Grain = 'dia' | 'semana' | 'mes'
export type Rule = 'oficial' | 'tolerante'

// ---------- Rango de fechas (cohorte de registro, inclusivo) ----------

export type DateRange = { from: string; to: string } // 'YYYY-MM-DD'
export const DATA_FROM = '2026-04-01'
export const DATA_TO = '2026-07-31'
export const LAUNCH_DAY = '2026-06-01'

export const RANGE_PRESETS: { key: string; label: string; hint?: string; range: DateRange }[] = [
  { key: 'todo', label: 'Todo el periodo', hint: '1 abr – 31 jul', range: { from: DATA_FROM, to: DATA_TO } },
  { key: 'pre', label: 'Antes del Onboarding Guiado', hint: '1 abr – 31 may', range: { from: DATA_FROM, to: '2026-05-31' } },
  { key: 'post', label: 'Después del Onboarding Guiado', hint: '1 jun – 31 jul', range: { from: LAUNCH_DAY, to: DATA_TO } },
  { key: 'a32', label: 'Desde Android 3.2', hint: '20 jun – 31 jul', range: { from: '2026-06-20', to: DATA_TO } },
  { key: 'maduras', label: 'Todo, con CVR ya completa', hint: '1 abr – 24 jul', range: { from: DATA_FROM, to: '2026-07-24' } },
  { key: 'post-maduras', label: 'Después, con CVR ya completa', hint: '1 jun – 24 jul', range: { from: LAUNCH_DAY, to: '2026-07-24' } },
  { key: 'abr', label: 'Abril', range: { from: '2026-04-01', to: '2026-04-30' } },
  { key: 'may', label: 'Mayo', range: { from: '2026-05-01', to: '2026-05-31' } },
  { key: 'jun', label: 'Junio', range: { from: '2026-06-01', to: '2026-06-30' } },
  { key: 'jul', label: 'Julio', range: { from: '2026-07-01', to: '2026-07-31' } },
]

export const presetOf = (r: DateRange) => RANGE_PRESETS.find((p) => p.range.from === r.from && p.range.to === r.to)

export function fmtDay(d: string) {
  return `${+d.slice(8, 10)} ${MESES[+d.slice(5, 7) - 1]}`
}
export const rangeLabel = (r: DateRange) => `${fmtDay(r.from)} – ${fmtDay(r.to)}`

export const ts = (s: string) =>
  Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16))

export const userValue = (u: User, k: DimKey) => String(u[k])

export function matches(u: User, f: Filters, exclude?: DimKey): boolean {
  for (const d of DIMS) {
    if (d.key === exclude) continue
    const df = f[d.key]
    if (!df.values.length) continue
    const hit = df.values.includes(userValue(u, d.key))
    if (df.mode === 'in' ? !hit : hit) return false
  }
  return true
}

export function inRange(u: User, r: DateRange) {
  const d = u.s.slice(0, 10)
  return d >= r.from && d <= r.to
}

export function applyFilters(users: User[], f: Filters, range: DateRange, exclude?: DimKey): User[] {
  return users.filter((u) => inRange(u, range) && matches(u, f, exclude))
}

/** Conteo por valor de una dimensión, respetando el resto de filtros (para los menús). */
export function countsFor(users: User[], f: Filters, k: DimKey): Record<string, number> {
  const c: Record<string, number> = {}
  for (const u of users) if (matches(u, f, k)) c[userValue(u, k)] = (c[userValue(u, k)] ?? 0) + 1
  return c
}

// ---------- Agregación ----------

export type Agg = {
  n: number
  conv: number
  immature: number
  act: number
  proj: number
  t3: number
  tasks: number
  projects: number
  rev: number
  rem: number
  cl: number
  a32: number // usuarios Android 3.2 (instrumentación de tareas rota)
}

export function aggregate(users: User[], rule: Rule): Agg {
  const a: Agg = { n: 0, conv: 0, immature: 0, act: 0, proj: 0, t3: 0, tasks: 0, projects: 0, rev: 0, rem: 0, cl: 0, a32: 0 }
  for (const u of users) {
    const p = rule === 'oficial' ? u.ps : u.pt
    const t = rule === 'oficial' ? u.ts : u.tt
    a.n++
    a.conv += u.c
    a.immature += u.m ? 0 : 1
    a.act += p >= 1 && t >= 3 ? 1 : 0
    a.proj += p >= 1 ? 1 : 0
    a.t3 += t >= 3 ? 1 : 0
    a.tasks += t
    a.projects += p
    a.rev += u.c ? u.p : 0
    a.rem += u.rm
    a.cl += u.cl
    a.a32 += u.v === '3.2' ? 1 : 0
  }
  return a
}

// ---------- KPIs ----------

export type Fmt = 'pct' | 'num' | 'usd' | 'int'
export type MetricKey = 'cvr' | 'act' | 'proj' | 't3' | 'tasksAvg' | 'tasksPerProj' | 'rem' | 'cl' | 'rpts' | 'users'

export type Metric = {
  key: MetricKey
  label: string
  fmt: Fmt
  desc: string
  usesTasks: boolean // afectado por el bug de Android 3.2
  value: (a: Agg) => number | null
  rate?: (a: Agg) => { k: number; n: number } // proporción binomial (para IC)
}

const ratio = (num: number, den: number) => (den > 0 ? num / den : null)

export const METRICS: Metric[] = [
  { key: 'cvr', label: 'CVR 14 días', fmt: 'pct', usesTasks: false, desc: 'Usuarios que pagaron dentro de los 14 días posteriores al registro ÷ usuarios.', value: (a) => ratio(a.conv, a.n), rate: (a) => ({ k: a.conv, n: a.n }) },
  { key: 'act', label: 'Activación 7d', fmt: 'pct', usesTasks: true, desc: '≥1 proyecto y ≥3 tareas en los primeros 7 días ÷ usuarios.', value: (a) => ratio(a.act, a.n), rate: (a) => ({ k: a.act, n: a.n }) },
  { key: 'proj', label: '% con proyecto', fmt: 'pct', usesTasks: false, desc: 'Usuarios con ≥1 proyecto en 7 días ÷ usuarios.', value: (a) => ratio(a.proj, a.n), rate: (a) => ({ k: a.proj, n: a.n }) },
  { key: 't3', label: '% con ≥3 tareas', fmt: 'pct', usesTasks: true, desc: 'Usuarios con ≥3 tareas en 7 días ÷ usuarios. Es el “momento aha”.', value: (a) => ratio(a.t3, a.n), rate: (a) => ({ k: a.t3, n: a.n }) },
  { key: 'tasksAvg', label: 'Tareas por usuario', fmt: 'num', usesTasks: true, desc: 'Tareas creadas en 7 días ÷ usuarios.', value: (a) => ratio(a.tasks, a.n) },
  { key: 'tasksPerProj', label: 'Tareas por proyecto', fmt: 'num', usesTasks: true, desc: 'Tareas ÷ proyectos (7 días). Ratio de salud de la telemetría: < 2.5× indica pérdida de eventos.', value: (a) => ratio(a.tasks, a.projects) },
  { key: 'rem', label: '% con recordatorio', fmt: 'pct', usesTasks: false, desc: 'Usuarios que configuraron un recordatorio en 7 días ÷ usuarios.', value: (a) => ratio(a.rem, a.n), rate: (a) => ({ k: a.rem, n: a.n }) },
  { key: 'cl', label: '% invita colaborador', fmt: 'pct', usesTasks: false, desc: 'Usuarios que invitaron a un colaborador en 7 días ÷ usuarios.', value: (a) => ratio(a.cl, a.n), rate: (a) => ({ k: a.cl, n: a.n }) },
  { key: 'rpts', label: 'Ingreso por trial', fmt: 'usd', usesTasks: false, desc: 'Precio del primer mes si convierte (0 si no) ÷ usuarios.', value: (a) => ratio(a.rev, a.n) },
  { key: 'users', label: 'Usuarios', fmt: 'int', usesTasks: false, desc: 'Registros de prueba en la cohorte.', value: (a) => a.n },
]

export const metricByKey = (k: MetricKey) => METRICS.find((m) => m.key === k)!
export const PRODUCT_METRICS: MetricKey[] = ['act', 'proj', 't3', 'tasksAvg', 'tasksPerProj', 'rem', 'cl']

export function fmtValue(v: number | null | undefined, f: Fmt, digits?: number): string {
  if (v == null || Number.isNaN(v)) return '—'
  switch (f) {
    case 'pct':
      return `${(v * 100).toFixed(digits ?? 1)}%`
    case 'usd':
      return `$${v.toFixed(digits ?? 2)}`
    case 'int':
      return Math.round(v).toLocaleString('es-MX')
    default:
      return v.toFixed(digits ?? 2)
  }
}

/** Diferencia en las unidades naturales de la métrica (pp para %, absoluta para el resto). */
export function fmtDelta(d: number | null, f: Fmt): string {
  if (d == null || Number.isNaN(d)) return '—'
  const sign = d > 0 ? '+' : d < 0 ? '−' : '±'
  const a = Math.abs(d)
  if (f === 'pct') return `${sign}${(a * 100).toFixed(1)} pp`
  if (f === 'usd') return `${sign}$${a.toFixed(2)}`
  if (f === 'int') return `${sign}${Math.round(a).toLocaleString('es-MX')}`
  return `${sign}${a.toFixed(2)}`
}

/** IC 95% de la diferencia de dos proporciones (Wald, varianza no agrupada). */
export function diffCI(a: { k: number; n: number }, b: { k: number; n: number }) {
  if (!a.n || !b.n) return null
  const pa = a.k / a.n
  const pb = b.k / b.n
  const se = Math.sqrt((pa * (1 - pa)) / a.n + (pb * (1 - pb)) / b.n)
  const d = pa - pb
  return { d, lo: d - 1.96 * se, hi: d + 1.96 * se, significant: Math.abs(d) > 1.96 * se }
}

// ---------- Buckets temporales ----------

export type Bucket = { key: string; start: number; end: number; label: string }

const DAY = 86_400_000
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function bucketStart(t: number, g: Grain): number {
  const d = new Date(t)
  if (g === 'mes') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
  if (g === 'dia') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const day0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return day0 - ((d.getUTCDay() + 6) % 7) * DAY // lunes
}

function bucketEnd(start: number, g: Grain): number {
  if (g === 'dia') return start + DAY
  if (g === 'semana') return start + 7 * DAY
  const d = new Date(start)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
}

export function bucketLabel(start: number, g: Grain): string {
  const d = new Date(start)
  return g === 'mes' ? `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}` : `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`
}

/** Buckets continuos que cubren el rango completo (incluye periodos sin registros). */
export function bucketsForRange(r: DateRange, g: Grain): Bucket[] {
  const from = Date.UTC(+r.from.slice(0, 4), +r.from.slice(5, 7) - 1, +r.from.slice(8, 10))
  const to = Date.UTC(+r.to.slice(0, 4), +r.to.slice(5, 7) - 1, +r.to.slice(8, 10))
  const out: Bucket[] = []
  for (let s = bucketStart(from, g); s <= to; s = bucketEnd(s, g)) out.push({ key: String(s), start: s, end: bucketEnd(s, g), label: bucketLabel(s, g) })
  return out
}

export function groupByBucket(users: User[], g: Grain): Map<number, User[]> {
  const m = new Map<number, User[]>()
  for (const u of users) {
    const k = bucketStart(ts(u.s), g)
    const arr = m.get(k)
    if (arr) arr.push(u)
    else m.set(k, [u])
  }
  return m
}

export const EVENTS = [
  { t: Date.UTC(2026, 5, 1), label: 'Guided + Creator Campaign' },
  { t: Date.UTC(2026, 5, 20), label: 'Android 3.2' },
]

export const MIN_N = 15 // por debajo, el punto se marca como frágil
