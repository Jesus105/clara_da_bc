import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Info, Lightbulb, Scale, TrendingUp } from 'lucide-react'
import { ConditionChips } from '../components/ConditionChips'
import { DateRangeMenu, OptionsMenu, Segmented } from '../components/FilterBar'
import { LineChart, type Point, type Series } from '../components/LineChart'
import { type Segment, SegmentBuilder } from '../components/SegmentBuilder'
import {
  type Agg,
  type Bucket,
  DATA_FROM,
  DATA_TO,
  type DateRange,
  type Dataset,
  EVENTS,
  type Filters,
  type Grain,
  LAUNCH_DAY,
  MIN_N,
  type Metric,
  type MetricKey,
  PRODUCT_METRICS,
  type Rule,
  type User,
  aggregate,
  anyActive,
  applyFilters,
  bucketsForRange,
  diffCI,
  emptyFilters,
  exc,
  filtersLabel,
  filtersOf,
  fmtDelta,
  fmtValue,
  groupByBucket,
  inc,
  isActive,
  matches,
  metricByKey,
  rangeLabel,
} from '../lib/data'

type Tab = 'timeline' | 'comparativo'

const SERIES_VARS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)']
const FULL: DateRange = { from: DATA_FROM, to: DATA_TO }
const POST: DateRange = { from: LAUNCH_DAY, to: DATA_TO }

function useDataset() {
  const [data, setData] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    fetch('/data/users.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(String(e)))
  }, [])
  return { data, error }
}

/** Serie temporal de una métrica para un conjunto de usuarios. */
function buildPoints(users: User[], buckets: Bucket[], grain: Grain, rule: Rule, metric: Metric): Point[] {
  const g = groupByBucket(users, grain)
  return buckets.map((b) => {
    const us = g.get(b.start) ?? []
    if (!us.length) return { value: null, n: 0, fragile: true }
    const a = aggregate(us, rule)
    const immature = metric.key === 'cvr' && a.immature > 0
    const small = a.n < MIN_N
    const notes: string[] = []
    if (immature) notes.push(`${a.immature} usuarios aún sin 14 días: CVR incompleta`)
    if (small) notes.push(`Menos de ${MIN_N} usuarios: tómalo con cautela`)
    if (metric.usesTasks && a.a32 > 0) notes.push(`${Math.round((100 * a.a32) / a.n)}% Android 3.2 (tareas sub-registradas)`)
    return { value: metric.value(a), n: a.n, fragile: immature || small, note: notes.join(' · ') || undefined }
  })
}

// ---------------------------------------------------------------- Preguntas guía (comparativo)

type Question = {
  q: string
  answer: string
  range: DateRange
  metric: MetricKey
  groups: { name?: string; f: Partial<Filters> }[]
}

const QUESTIONS: Question[] = [
  {
    q: '¿Por qué cayó la conversión del dashboard?',
    answer: 'Creator Campaign convierte a menos de la mitad que el resto. Al pasar de 4% a 34% de los registros, bajó el promedio aunque cada canal mejoró.',
    range: FULL,
    metric: 'cvr',
    groups: [{ f: { ch: exc('Creator Campaign') } }, { f: { ch: inc('Creator Campaign') } }],
  },
  {
    q: '¿Guided convierte más que Classic?',
    answer: 'Sí: en las mismas semanas (jun–jul), Guided convierte ~7 pp más y la diferencia es significativa.',
    range: POST,
    metric: 'cvr',
    groups: [{ f: { x: inc('Classic') } }, { f: { x: inc('Guided') } }],
  },
  {
    q: '¿La caída de activación es real o es Android 3.2?',
    answer: 'Es de medición: con v3.2 la activación se desploma, pero la CVR y el % con proyecto no cambian. La app dejó de registrar tareas.',
    range: FULL,
    metric: 'act',
    groups: [
      { name: 'Android v3.1', f: { v: inc('3.1') } },
      { name: 'Android v3.2', f: { v: inc('3.2') } },
    ],
  },
  {
    q: '¿Guided ayuda a activar? (sin Android 3.2)',
    answer: 'Sí: quitando la versión con la medición rota, Guided activa ~9 pp más que Classic.',
    range: POST,
    metric: 'act',
    groups: [
      { name: 'Classic', f: { x: inc('Classic'), v: exc('3.2') } },
      { name: 'Guided', f: { x: inc('Guided'), v: exc('3.2') } },
    ],
  },
  {
    q: '¿Cobrar más caro baja la conversión?',
    answer: 'Casi nada: la CVR se mueve ~2 pp entre $12 y $18 (no significativo). Por eso $18 deja el mayor ingreso por trial.',
    range: FULL,
    metric: 'cvr',
    groups: [{ f: { p: inc('12') } }, { f: { p: inc('15') } }, { f: { p: inc('18') } }],
  },
  {
    q: '¿En qué dispositivo rinde mejor Creator Campaign?',
    answer: 'iOS convierte un poco mejor, pero en todos los dispositivos Creator queda muy por debajo de los demás canales.',
    range: FULL,
    metric: 'cvr',
    groups: [
      { f: { ch: inc('Creator Campaign'), pl: inc('iOS') } },
      { f: { ch: inc('Creator Campaign'), pl: inc('Android') } },
      { f: { ch: inc('Creator Campaign'), pl: inc('Web') } },
    ],
  },
  {
    q: '¿Cuánto vale el mejor segmento frente al peor?',
    answer: 'Referral en iOS deja ~5× más ingreso por trial que Creator en Android: el canal pesa más que cualquier cambio de producto.',
    range: FULL,
    metric: 'rpts',
    groups: [{ f: { ch: inc('Referral'), pl: inc('iOS') } }, { f: { ch: inc('Creator Campaign'), pl: inc('Android') } }],
  },
  {
    q: '¿Está sana la medición de tareas en Android?',
    answer: 'No desde el 20-jun: v3.2 registra ~1.5 tareas por proyecto contra ~4.5 de v3.1. Debajo de 2.5× hay pérdida de eventos.',
    range: FULL,
    metric: 'tasksPerProj',
    groups: [
      { name: 'Android v3.1', f: { v: inc('3.1') } },
      { name: 'Android v3.2', f: { v: inc('3.2') } },
    ],
  },
]

const TIMELINE_EXAMPLES: { label: string; f: Partial<Filters> }[] = [
  { label: 'Solo iOS', f: { pl: inc('iOS') } },
  { label: 'Sin Creator Campaign', f: { ch: exc('Creator Campaign') } },
  { label: 'Solo Guided', f: { x: inc('Guided') } },
  { label: 'Sin Android 3.2', f: { v: exc('3.2') } },
]

const METRIC_GROUPS: { title: string; keys: MetricKey[] }[] = [
  { title: 'Negocio', keys: ['cvr', 'rpts', 'users'] },
  { title: 'Uso del producto', keys: PRODUCT_METRICS },
]

// ---------------------------------------------------------------- Página

export function Dashboard() {
  const { data, error } = useDataset()
  const [tab, setTab] = useState<Tab>(() => (location.hash.includes('comparativo') ? 'comparativo' : 'timeline'))
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [range, setRange] = useState<DateRange>(FULL)
  const [grain, setGrain] = useState<Grain>('semana')
  const [rule, setRule] = useState<Rule>('oficial')
  const [productMetric, setProductMetric] = useState<MetricKey>('act')
  const [cmpMetric, setCmpMetric] = useState<MetricKey>(QUESTIONS[0].metric)
  const idRef = useRef(0)
  const nextId = () => ++idRef.current
  const [segments, setSegments] = useState<Segment[]>(() => QUESTIONS[0].groups.map((g, i) => ({ id: 100 + i, name: g.name ?? '', filters: filtersOf(g.f) })))
  const [activeQ, setActiveQ] = useState<number | null>(0)

  useEffect(() => {
    history.replaceState(null, '', `#/dashboard/${tab}`)
  }, [tab])

  const users = data?.users ?? []
  const universe = useMemo(() => applyFilters(users, emptyFilters(), range), [users, range])
  const filtered = useMemo(() => applyFilters(users, filters, range), [users, filters, range])
  const buckets = useMemo(() => bucketsForRange(range, grain), [range, grain])

  // Un cambio manual en el comparativo "suelta" la pregunta activa.
  const manual =
    <T,>(fn: (v: T) => void) =>
    (v: T) => {
      setActiveQ(null)
      fn(v)
    }

  const askQuestion = (i: number) => {
    const q = QUESTIONS[i]
    setRange(q.range)
    setCmpMetric(q.metric)
    setSegments(q.groups.map((g) => ({ id: nextId(), name: g.name ?? '', filters: filtersOf(g.f) })))
    setActiveQ(i)
  }

  if (error)
    return (
      <Shell>
        <p style={{ color: 'var(--critical)' }}>No se pudo cargar la data: {error}</p>
      </Shell>
    )
  if (!data)
    return (
      <Shell>
        <p style={{ color: 'var(--text-muted)' }}>Cargando datos…</p>
      </Shell>
    )

  return (
    <Shell>
      {/* Pestañas */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4" role="tablist">
        <TabCard
          active={tab === 'timeline'}
          onClick={() => setTab('timeline')}
          icon={<TrendingUp size={18} />}
          title="Timeline"
          desc="Cómo evoluciona un grupo de usuarios en el tiempo."
        />
        <TabCard
          active={tab === 'comparativo'}
          onClick={() => setTab('comparativo')}
          icon={<Scale size={18} />}
          title="Comparativo"
          desc="Compara 2 a 4 grupos lado a lado, por ejemplo Creator en iOS contra Android."
        />
      </div>

      {/* Barra de controles */}
      <div className="lg:sticky top-0 z-30 -mx-4 px-4 sm:-mx-8 sm:px-8 py-3 mb-5 border-b" style={{ background: 'var(--page)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeMenu range={range} onChange={tab === 'comparativo' ? manual(setRange) : setRange} />
          {tab === 'timeline' ? (
            <>
              <span className="text-[13px] ml-1" style={{ color: 'var(--text-muted)' }}>
                Filtros:
              </span>
              <ConditionChips filters={filters} onChange={setFilters} base={universe} emptyLabel="ninguno" />
              {anyActive(filters) && (
                <button className="text-[12px] underline ml-1" style={{ color: 'var(--text-secondary)' }} onClick={() => setFilters(emptyFilters())}>
                  Quitar todos
                </button>
              )}
            </>
          ) : (
            <span className="text-[13px] ml-1" style={{ color: 'var(--text-muted)' }}>
              Los grupos se definen abajo, en el paso 1.
            </span>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Ver por
            </span>
            <Segmented
              label="Ver por"
              value={grain}
              options={[
                { value: 'dia', label: 'Día' },
                { value: 'semana', label: 'Semana' },
                { value: 'mes', label: 'Mes' },
              ]}
              onChange={(v) => setGrain(v as Grain)}
            />
            <OptionsMenu rule={rule} setRule={setRule} />
          </div>
        </div>
        {tab === 'timeline' && (
          <div className="mt-2 text-[12px] flex flex-wrap items-center gap-x-2 gap-y-1" style={{ color: 'var(--text-muted)' }}>
            <span>
              <strong style={{ color: 'var(--text-secondary)' }}>{filtered.length.toLocaleString('es-MX')}</strong> de {universe.length.toLocaleString('es-MX')} usuarios
              registrados del {rangeLabel(range)}
            </span>
            {!anyActive(filters) && (
              <>
                <span>· Prueba:</span>
                {TIMELINE_EXAMPLES.map((e) => (
                  <button key={e.label} className="underline" style={{ color: 'var(--accent)' }} onClick={() => setFilters(filtersOf(e.f))}>
                    {e.label}
                  </button>
                ))}
              </>
            )}
            {rule === 'tolerante' && <span>· Activación con corrección de reloj</span>}
          </div>
        )}
      </div>

      {tab === 'timeline' ? (
        filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <TimelineTab
            filtered={filtered}
            universe={universe}
            buckets={buckets}
            grain={grain}
            rule={rule}
            hasFilters={anyActive(filters)}
            selectionLabel={filtersLabel(filters)}
            productMetric={productMetric}
            setProductMetric={setProductMetric}
          />
        )
      ) : (
        <CompareTab
          base={universe}
          buckets={buckets}
          grain={grain}
          rule={rule}
          range={range}
          setRange={manual(setRange)}
          metric={cmpMetric}
          setMetric={manual(setCmpMetric)}
          segments={segments}
          setSegments={manual(setSegments)}
          nextId={nextId}
          activeQ={activeQ}
          onAsk={askQuestion}
        />
      )}

      <Methodology />
    </Shell>
  )
}

function TabCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="card text-left p-3.5 flex gap-3 items-start transition-shadow"
      style={active ? { boxShadow: 'inset 0 0 0 2px var(--accent)' } : { opacity: 0.85 }}
    >
      <span
        className="w-9 h-9 rounded-lg inline-flex items-center justify-center shrink-0"
        style={{ background: active ? 'var(--accent)' : 'var(--surface-2)', color: active ? 'var(--accent-ink)' : 'var(--text-secondary)' }}
      >
        {icon}
      </span>
      <span>
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="block text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {desc}
        </span>
      </span>
    </button>
  )
}

function EmptyState() {
  return (
    <div className="card p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
      Ningún usuario cumple estos filtros y fechas. Por ejemplo, iOS solo tiene la versión 4.1, y v3.2 solo existe desde el 20-jun.
    </div>
  )
}

// ---------------------------------------------------------------- Timeline

function TimelineTab(p: {
  filtered: User[]
  universe: User[]
  buckets: Bucket[]
  grain: Grain
  rule: Rule
  hasFilters: boolean
  selectionLabel: string
  productMetric: MetricKey
  setProductMetric: (m: MetricKey) => void
}) {
  const agg = useMemo(() => aggregate(p.filtered, p.rule), [p.filtered, p.rule])
  const aggU = useMemo(() => aggregate(p.universe, p.rule), [p.universe, p.rule])

  const seriesFor = (m: Metric): Series[] => {
    const s: Series[] = [
      { id: 'sel', label: p.hasFilters ? p.selectionLabel : 'Todos los usuarios', color: SERIES_VARS[0], points: buildPoints(p.filtered, p.buckets, p.grain, p.rule, m) },
    ]
    if (p.hasFilters) s.push({ id: 'ref', label: 'Total', color: 'var(--ref-line)', reference: true, points: buildPoints(p.universe, p.buckets, p.grain, p.rule, m) })
    return s
  }

  const cvr = metricByKey('cvr')
  const pm = metricByKey(p.productMetric)
  const tiles: MetricKey[] = ['users', 'cvr', 'rpts', 'act', 'proj', 't3', 'tasksAvg']

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {tiles.map((k) => (
          <KpiTile key={k} metric={metricByKey(k)} agg={agg} ref_={p.hasFilters ? aggU : null} />
        ))}
      </div>

      <section className="card p-4 sm:p-5">
        <ChartHeader
          title="Conversión a pago (CVR 14 días)"
          desc={p.hasFilters ? 'Tu selección (azul) contra el total (gris). ' + cvr.desc : cvr.desc}
        />
        {p.grain === 'dia' && <DayNote />}
        <LineChart ariaLabel="Timeline de CVR a 14 días" buckets={p.buckets} series={seriesFor(cvr)} fmt="pct" events={EVENTS} />
        <Legend2 />
      </section>

      <section className="card p-4 sm:p-5">
        <ChartHeader title="Uso del producto: tareas y proyectos" desc={pm.desc} />
        <div className="flex flex-wrap gap-2 mb-3">
          {PRODUCT_METRICS.map((k) => (
            <button key={k} className="chip" aria-pressed={p.productMetric === k} onClick={() => p.setProductMetric(k)}>
              {metricByKey(k).label}
            </button>
          ))}
        </div>
        {pm.usesTasks && agg.a32 > 0 && <A32Warning share={agg.a32 / agg.n} />}
        <LineChart ariaLabel={`Timeline de ${pm.label}`} buckets={p.buckets} series={seriesFor(pm)} fmt={pm.fmt} events={EVENTS} />
        <Legend2 />
      </section>
    </div>
  )
}

function KpiTile({ metric, agg, ref_ }: { metric: Metric; agg: Agg; ref_: Agg | null }) {
  const v = metric.value(agg)
  const r = ref_ ? metric.value(ref_) : null
  const showDelta = ref_ && metric.key !== 'users' && v != null && r != null
  const d = showDelta ? v! - r! : null
  return (
    <div className="card p-3" title={metric.desc}>
      <div className="text-[12px] flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
        {metric.label}
        {metric.usesTasks && agg.a32 > 0 && (
          <span title="Incluye Android 3.2: las tareas están sub-registradas">
            <AlertTriangle size={12} style={{ color: 'var(--warning-ink)' }} aria-label="Incluye Android 3.2" />
          </span>
        )}
      </div>
      <div className="text-[22px] font-semibold mt-0.5">{fmtValue(v, metric.fmt)}</div>
      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
        {metric.key === 'users' && ref_
          ? `${((100 * agg.n) / Math.max(1, ref_.n)).toFixed(0)}% del total`
          : showDelta
            ? `${fmtDelta(d, metric.fmt)} vs total`
            : ' '}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Comparativo

type Group = { id: string; label: string; color: string; users: User[] }

function CompareTab(p: {
  base: User[]
  buckets: Bucket[]
  grain: Grain
  rule: Rule
  range: DateRange
  setRange: (r: DateRange) => void
  metric: MetricKey
  setMetric: (m: MetricKey) => void
  segments: Segment[]
  setSegments: (s: Segment[]) => void
  nextId: () => number
  activeQ: number | null
  onAsk: (i: number) => void
}) {
  const metric = metricByKey(p.metric)

  const groups: Group[] = useMemo(
    () =>
      p.segments.map((s, i) => ({
        id: String(s.id),
        label: s.name.trim() || filtersLabel(s.filters),
        color: SERIES_VARS[i % SERIES_VARS.length],
        users: p.base.filter((u) => matches(u, s.filters)),
      })),
    [p.segments, p.base],
  )

  const series: Series[] = groups.map((g) => ({ id: g.id, label: g.label, color: g.color, points: buildPoints(g.users, p.buckets, p.grain, p.rule, metric) }))
  const aggs = groups.map((g) => ({ ...g, agg: aggregate(g.users, p.rule) }))
  const tableMetrics: MetricKey[] = ['users', 'cvr', 'rpts', 'act', 'proj', 't3', 'tasksAvg', 'tasksPerProj']
  const anyA32 = metric.usesTasks && aggs.some((a) => a.agg.a32 > 0)
  const involvesExperience = p.segments.some((s) => isActive(s.filters.x))
  const includesPre = p.range.from < LAUNCH_DAY
  const q = p.activeQ != null ? QUESTIONS[p.activeQ] : null
  const allPts = series.flatMap((s) => s.points.filter((pt) => pt.n > 0))
  const fragileShare = allPts.length ? allPts.filter((pt) => pt.n < MIN_N).length / allPts.length : 0

  return (
    <div className="space-y-5">
      <section className="card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1 text-[14px] font-semibold">
          <Lightbulb size={16} style={{ color: 'var(--accent)' }} /> Empieza con una pregunta
        </div>
        <p className="text-[12px] mb-3" style={{ color: 'var(--text-muted)' }}>
          Cada pregunta arma los grupos, las fechas y el KPI por ti. Después puedes ajustar lo que quieras.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {QUESTIONS.map((x, i) => (
            <button
              key={x.q}
              onClick={() => p.onAsk(i)}
              className="text-left text-[13px] p-2.5 rounded-lg border hover:bg-[var(--surface-2)]"
              style={
                p.activeQ === i
                  ? { borderColor: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)', background: 'var(--surface-2)' }
                  : { borderColor: 'var(--border)' }
              }
              aria-pressed={p.activeQ === i}
            >
              {x.q}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-4 sm:p-5 space-y-6">
        <Step n={1} title="¿Qué grupos quieres comparar?" hint="Cada grupo es una combinación de condiciones. Ejemplo: Canal es Creator Campaign + Dispositivo es iOS.">
          <SegmentBuilder segments={p.segments} setSegments={p.setSegments} base={p.base} colors={SERIES_VARS} nextId={p.nextId} />
        </Step>

        <Step n={2} title="¿Qué quieres medir?">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {METRIC_GROUPS.map((g) => (
              <div key={g.title} className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12px] mr-1" style={{ color: 'var(--text-muted)' }}>
                  {g.title}
                </span>
                {g.keys.map((k) => (
                  <button key={k} className="chip" style={{ height: 30 }} aria-pressed={p.metric === k} onClick={() => p.setMetric(k)}>
                    {metricByKey(k).label}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <p className="text-[12px] mt-2" style={{ color: 'var(--text-muted)' }}>
            {metric.desc}
          </p>
        </Step>

        <Step n={3} title="Resultado">
          {q && (
            <div className="mb-3 p-3 rounded-lg text-[13px] flex gap-2" style={{ background: 'var(--surface-2)' }}>
              <Lightbulb size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
              <span>
                <strong>{q.q}</strong> {q.answer}
              </span>
            </div>
          )}
          {aggs.length >= 2 && <Headline aggs={aggs} metric={metric} />}

          {anyA32 && <A32Warning share={null} />}
          {involvesExperience && includesPre && (
            <div className="mb-3 p-2.5 rounded-lg text-[12px] flex flex-wrap gap-2 items-center" style={{ background: 'var(--warning-bg)', color: 'var(--warning-ink)' }}>
              <AlertTriangle size={14} className="shrink-0" aria-hidden />
              <span>
                <strong>Ojo:</strong> antes del 1-jun todos eran Classic, así que comparar experiencias con esas fechas mezcla semanas distintas.
              </span>
              <button className="chip" style={{ height: 26 }} onClick={() => p.setRange({ from: LAUNCH_DAY, to: p.range.to < LAUNCH_DAY ? DATA_TO : p.range.to })}>
                Usar fechas desde el 1-jun
              </button>
            </div>
          )}
          {p.grain === 'dia' && <DayNote />}
          {p.grain !== 'mes' && fragileShare > 0.4 && (
            <p className="text-[12px] mb-2" style={{ color: 'var(--text-muted)' }}>
              Los grupos son chicos para verlos por {p.grain === 'dia' ? 'día' : 'semana'} ({Math.round(fragileShare * 100)}% de los puntos tienen menos de {MIN_N}{' '}
              usuarios). Cambia “Ver por” a <strong>Mes</strong> o usa la tabla de abajo, que suma todo el periodo.
            </p>
          )}

          <LineChart ariaLabel={`Comparativo de ${metric.label}`} buckets={p.buckets} series={series} fmt={metric.fmt} events={EVENTS} />
          <Legend2 />

          <h3 className="text-[14px] font-semibold mt-6 mb-1">Todos los KPIs del periodo ({rangeLabel(p.range)})</h3>
          <p className="text-[12px] mb-2" style={{ color: 'var(--text-muted)' }}>
            La columna resaltada es la que estás midiendo. “Δ vs A” compara cada grupo contra el grupo A.
          </p>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Grupo</th>
                  {tableMetrics.map((k) => (
                    <th key={k} style={k === p.metric ? { color: 'var(--text-primary)', fontWeight: 600 } : undefined}>
                      {metricByKey(k).label}
                    </th>
                  ))}
                  <th style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Δ vs A</th>
                </tr>
              </thead>
              <tbody>
                {aggs.map((a, i) => {
                  const first = aggs[0]
                  const va = metric.value(a.agg)
                  const v0 = metric.value(first.agg)
                  const ci = i > 0 && metric.rate ? diffCI(metric.rate(a.agg), metric.rate(first.agg)) : null
                  return (
                    <tr key={a.id}>
                      <td>
                        <span className="inline-flex items-center gap-2">
                          <svg width="12" height="6" aria-hidden>
                            <line x1="0" y1="3" x2="12" y2="3" stroke={a.color} strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          <span style={{ color: 'var(--text-muted)' }}>{'ABCD'[i]}</span> {a.label}
                        </span>
                      </td>
                      {tableMetrics.map((k) => {
                        const m = metricByKey(k)
                        return (
                          <td key={k} style={k === p.metric ? { fontWeight: 600, background: 'var(--surface-2)' } : undefined}>
                            {fmtValue(m.value(a.agg), m.fmt)}
                          </td>
                        )
                      })}
                      <td>
                        {i === 0 ? (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        ) : (
                          <span title={ci ? `IC 95% [${fmtDelta(ci.lo, 'pct')}, ${fmtDelta(ci.hi, 'pct')}]` : undefined}>
                            {fmtDelta(va != null && v0 != null ? va - v0 : null, metric.fmt)}
                            {ci && (
                              <span style={{ color: ci.significant ? 'var(--good)' : 'var(--text-muted)', marginLeft: 6 }}>
                                {ci.significant ? '✓ real' : '≈ ruido'}
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Step>
      </section>
    </div>
  )
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[12px] font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          {n}
        </span>
        <h2 className="text-[15px] font-semibold">{title}</h2>
      </div>
      {hint && (
        <p className="text-[12px] mb-2 ml-8" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      )}
      <div className={hint ? '' : 'mt-2'}>{children}</div>
    </div>
  )
}

/** La respuesta primero: diferencia entre grupos en una frase. */
function Headline({ aggs, metric }: { aggs: { label: string; agg: Agg }[]; metric: Metric }) {
  const vals = aggs.map((a) => ({ ...a, v: metric.value(a.agg) })).filter((a) => a.v != null) as { label: string; agg: Agg; v: number }[]
  if (vals.length < 2) return null
  const [a, b] = aggs.length === 2 ? [vals[1], vals[0]] : [...vals].sort((x, y) => y.v - x.v).filter((_, i, arr) => i === 0 || i === arr.length - 1)
  const ci = metric.rate ? diffCI(metric.rate(a.agg), metric.rate(b.agg)) : null
  const rel = b.v !== 0 ? (a.v - b.v) / b.v : null
  return (
    <div className="mb-3 p-3 rounded-lg border text-[13px] flex flex-wrap items-baseline gap-x-2 gap-y-1" style={{ borderColor: 'var(--border)' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{aggs.length === 2 ? `${metric.label}:` : `${metric.label}, el más alto vs el más bajo:`}</span>
      <strong>{a.label}</strong>
      <span className="tnum">{fmtValue(a.v, metric.fmt)}</span>
      <span style={{ color: 'var(--text-muted)' }}>vs</span>
      <strong>{b.label}</strong>
      <span className="tnum">{fmtValue(b.v, metric.fmt)}</span>
      <span className="text-[16px] font-semibold ml-1">{fmtDelta(a.v - b.v, metric.fmt)}</span>
      {rel != null && metric.key !== 'users' && (
        <span style={{ color: 'var(--text-secondary)' }}>
          ({rel >= 0 ? '+' : '−'}
          {Math.abs(rel * 100).toFixed(0)}% relativo)
        </span>
      )}
      {ci && (
        <span
          className="ml-1 px-2 py-0.5 rounded-full text-[12px] font-medium"
          title={`IC 95% [${fmtDelta(ci.lo, 'pct')}, ${fmtDelta(ci.hi, 'pct')}]`}
          style={{ background: 'var(--surface-2)', color: ci.significant ? 'var(--good)' : 'var(--text-secondary)' }}
        >
          {ci.significant ? '✓ Diferencia real (significativa)' : '≈ Puede ser ruido (no significativa)'}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Piezas compartidas

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <a href="#/" className="inline-flex items-center gap-1 text-[13px] mb-2" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft size={14} /> Inicio
          </a>
          <h1 className="text-[24px] font-semibold">Dashboard de conversión y activación</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            TaskNest · 1,800 usuarios de prueba registrados entre el 1-abr y el 31-jul-2026 · datos al 7-ago
          </p>
        </div>
      </header>
      {children}
    </div>
  )
}

function ChartHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
        {desc}
      </p>
    </div>
  )
}

function DayNote() {
  return (
    <p className="text-[12px] mb-2" style={{ color: 'var(--text-muted)' }}>
      Vista por día: hay ~15 registros diarios, así que cada punto brinca mucho. Úsala para ubicar fechas, no para leer tendencias.
    </p>
  )
}

function Legend2() {
  return (
    <p className="mt-2 text-[11px] flex items-center gap-3 flex-wrap" style={{ color: 'var(--text-muted)' }}>
      <span className="inline-flex items-center gap-1">
        <svg width="10" height="10" aria-hidden>
          <circle cx="5" cy="5" r="3.5" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" />
        </svg>
        punto hueco = tómalo con cautela (pocos usuarios o CVR aún incompleta)
      </span>
      <span>· Pasa el cursor sobre la gráfica para ver los valores</span>
    </p>
  )
}

function A32Warning({ share }: { share: number | null }) {
  return (
    <div className="mb-3 p-2.5 rounded-lg text-[12px] flex gap-2 items-start" style={{ background: 'var(--warning-bg)', color: 'var(--warning-ink)' }}>
      <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
      <span>
        <strong>Atención:</strong> incluye usuarios de Android 3.2{share != null ? ` (${(share * 100).toFixed(0)}%)` : ''}, versión que desde el 20-jun no
        registra bien las tareas. Este KPI se ve más bajo de lo real. Para verlo limpio, agrega la condición <em>Versión app no es v3.2</em>.
      </span>
    </div>
  )
}

function Methodology() {
  return (
    <details className="card p-4 mt-6 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
      <summary className="cursor-pointer font-medium inline-flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Info size={14} /> Definiciones y notas
      </summary>
      <ul className="mt-3 space-y-1.5 list-disc pl-5">
        <li>
          <strong>Fechas:</strong> filtran por fecha de <em>registro</em>. Cada usuario conserva sus ventanas de 7 y 14 días aunque terminen fuera del rango.
        </li>
        <li>
          <strong>CVR 14 días:</strong> usuarios que pagaron dentro de los 14 días posteriores al registro ÷ usuarios. Los registrados desde el 25-jul (122) aún no
          cumplían 14 días al corte, así que su CVR está incompleta. La opción de fechas “con CVR ya completa” los deja fuera.
        </li>
        <li>
          <strong>Activación:</strong> ≥1 proyecto y ≥3 tareas en los primeros 7 días. En <em>Opciones</em> puedes corregir el desfase de reloj (1,928 eventos con
          hora anterior al registro).
        </li>
        <li>
          <strong>Android 3.2</strong> (desde 20-jun) no registra bien las tareas: afecta activación, % con ≥3 tareas, tareas por usuario y tareas por proyecto. No
          afecta CVR ni % con proyecto.
        </li>
        <li>
          <strong>Ingreso por trial:</strong> precio del primer mes si convierte, 0 si no. No es LTV.
        </li>
        <li>
          <strong>“✓ Diferencia real”</strong> significa que el intervalo de confianza al 95% no cruza cero. El rollout de Guided no fue aleatorio: las comparaciones
          son observacionales.
        </li>
        <li>Las semanas empiezan en lunes. La primera y la última del rango pueden ser parciales.</li>
      </ul>
    </details>
  )
}
