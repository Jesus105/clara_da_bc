// Gráficas SVG del deck (lienzo fijo 1280×720, así que se usan px absolutos).
// Reglas de la skill de dataviz: marcas delgadas, extremos redondeados de 4px anclados a la base,
// 2px de separación entre barras, etiquetas directas selectivas, grid y ejes recesivos, texto en tinta (no en color de serie).

export const C = {
  classic: '#2a78d6', // slot 1 (igual que en el dashboard)
  guided: '#eb6834', // slot 2
  neutral: '#b5b3ab',
  ink: '#0b0b0b',
  ink2: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  pos: '#2a78d6', // diverging: polo positivo
  neg: '#e34948', // diverging: polo negativo
  total: '#52514e',
  surface: '#fcfcfb',
}

const pct = (v: number, d = 1) => `${v.toFixed(d)}%`

/** Barra horizontal con extremo derecho redondeado (4px), anclada a la izquierda. */
function hbarPath(x0: number, x1: number, y: number, h: number, r = 4) {
  const w = Math.max(0, x1 - x0)
  const rr = Math.min(r, w, h / 2)
  return `M${x0},${y} H${x0 + w - rr} Q${x0 + w},${y} ${x0 + w},${y + rr} V${y + h - rr} Q${x0 + w},${y + h} ${x0 + w - rr},${y + h} H${x0} Z`
}

/** Columna vertical con extremo superior redondeado (4px), anclada a la base. */
function vbarPath(x: number, w: number, yTop: number, yBase: number, r = 4) {
  const h = Math.max(0, yBase - yTop)
  const rr = Math.min(r, h, w / 2)
  return `M${x},${yBase} V${yTop + rr} Q${x},${yTop} ${x + rr},${yTop} H${x + w - rr} Q${x + w},${yTop} ${x + w},${yTop + rr} V${yBase} Z`
}

// ------------------------------------------------------------------ Barras horizontales (agrupadas, con IC)

export type HValue = { v: number; color: string; ci?: [number, number]; name?: string }
export type HRow = { label: string; sub?: string; values: HValue[] }

export function HBars({
  rows,
  width,
  max,
  fmt = (v: number) => pct(v),
  labelW = 210,
  barH = 16,
  rowGap = 18,
}: {
  rows: HRow[]
  width: number
  max: number
  fmt?: (v: number) => string
  labelW?: number
  barH?: number
  rowGap?: number
}) {
  const valueW = 64
  const plotW = width - labelW - valueW
  const x = (v: number) => labelW + (Math.max(0, v) / max) * plotW
  let y = 4
  const layout = rows.map((r) => {
    const h = r.values.length * barH + (r.values.length - 1) * 2
    const top = y
    y += h + rowGap
    return { r, top, h }
  })
  const height = y - rowGap + 6
  return (
    <svg width={width} height={height} role="img">
      <line x1={labelW} x2={labelW} y1={0} y2={height} stroke={C.axis} />
      {layout.map(({ r, top, h }) => (
        <g key={r.label}>
          <text x={labelW - 12} y={top + h / 2} dy={r.sub ? '-0.2em' : '0.35em'} textAnchor="end" fontSize="14" fill={C.ink}>
            {r.label}
          </text>
          {r.sub && (
            <text x={labelW - 12} y={top + h / 2} dy="1.05em" textAnchor="end" fontSize="11.5" fill={C.muted}>
              {r.sub}
            </text>
          )}
          {r.values.map((val, i) => {
            const by = top + i * (barH + 2)
            const end = Math.max(x(val.v), val.ci ? x(val.ci[1]) : 0)
            return (
              <g key={i}>
                <path d={hbarPath(labelW + 1, x(val.v), by, barH)} fill={val.color}>
                  <title>{`${val.name ? val.name + ': ' : ''}${fmt(val.v)}`}</title>
                </path>
                {val.ci && (
                  <g stroke={C.ink2} strokeWidth="1.5">
                    <line x1={x(val.ci[0])} x2={x(val.ci[1])} y1={by + barH / 2} y2={by + barH / 2} />
                    <line x1={x(val.ci[0])} x2={x(val.ci[0])} y1={by + 3} y2={by + barH - 3} />
                    <line x1={x(val.ci[1])} x2={x(val.ci[1])} y1={by + 3} y2={by + barH - 3} />
                  </g>
                )}
                <text x={end + 8} y={by + barH / 2} dy="0.35em" fontSize="13" fontWeight={600} fill={C.ink} className="tnum">
                  {fmt(val.v)}
                </text>
              </g>
            )
          })}
        </g>
      ))}
    </svg>
  )
}

// ------------------------------------------------------------------ Columnas verticales

export function VBars({
  data,
  width,
  height,
  max,
  fmt = (v: number) => pct(v),
  showValues = true,
  valueSize = 12.5,
  xTitle,
}: {
  data: { label: string; v: number; color: string }[]
  width: number
  height: number
  max: number
  fmt?: (v: number) => string
  showValues?: boolean
  valueSize?: number
  xTitle?: string
}) {
  const M = { l: 8, r: 8, t: 22, b: xTitle ? 44 : 26 }
  const plotW = width - M.l - M.r
  const plotH = height - M.t - M.b
  const slot = plotW / data.length
  const bw = Math.min(56, slot - 2)
  const base = M.t + plotH
  const y = (v: number) => base - (v / max) * plotH
  return (
    <svg width={width} height={height} role="img">
      <line x1={M.l} x2={width - M.r} y1={base} y2={base} stroke={C.axis} />
      {data.map((d, i) => {
        const cx = M.l + slot * i + slot / 2
        return (
          <g key={d.label}>
            <path d={vbarPath(cx - bw / 2, bw, y(d.v), base)} fill={d.color}>
              <title>{`${d.label}: ${fmt(d.v)}`}</title>
            </path>
            {showValues && (
              <text x={cx} y={y(d.v) - 6} textAnchor="middle" fontSize={valueSize} fontWeight={600} fill={C.ink} className="tnum">
                {fmt(d.v)}
              </text>
            )}
            <text x={cx} y={base + 17} textAnchor="middle" fontSize="12.5" fill={C.ink2}>
              {d.label}
            </text>
          </g>
        )
      })}
      {xTitle && (
        <text x={width / 2} y={height - 6} textAnchor="middle" fontSize="12" fill={C.muted}>
          {xTitle}
        </text>
      )}
    </svg>
  )
}

// ------------------------------------------------------------------ Cascada (waterfall)

export function Waterfall({
  steps,
  width,
  height,
  min,
  max,
}: {
  steps: { label: string; v: number; kind: 'total' | 'delta' }[]
  width: number
  height: number
  min: number
  max: number
}) {
  const M = { l: 8, r: 8, t: 30, b: 46 }
  const plotW = width - M.l - M.r
  const plotH = height - M.t - M.b
  const slot = plotW / steps.length
  const bw = Math.min(88, slot - 24)
  const y = (v: number) => M.t + plotH - ((v - min) / (max - min)) * plotH
  let running = 0
  const bars = steps.map((s) => {
    let a: number, b: number
    if (s.kind === 'total') {
      a = min
      b = s.v
      running = s.v
    } else {
      a = running
      b = running + s.v
      running = b
    }
    return { ...s, a, b }
  })
  return (
    <svg width={width} height={height} role="img">
      <line x1={M.l} x2={width - M.r} y1={y(min)} y2={y(min)} stroke={C.axis} />
      {bars.map((s, i) => {
        const cx = M.l + slot * i + slot / 2
        const top = Math.min(y(s.a), y(s.b))
        const bot = Math.max(y(s.a), y(s.b))
        const color = s.kind === 'total' ? C.total : s.v >= 0 ? C.pos : C.neg
        const next = bars[i + 1]
        return (
          <g key={s.label}>
            {s.kind === 'total' ? (
              <path d={vbarPath(cx - bw / 2, bw, top, bot)} fill={color} />
            ) : (
              <rect x={cx - bw / 2} y={top} width={bw} height={Math.max(2, bot - top)} rx={4} fill={color} />
            )}
            {next && <line x1={cx + bw / 2} x2={cx + slot - bw / 2} y1={y(s.b)} y2={y(s.b)} stroke={C.muted} strokeWidth="1" />}
            <text x={cx} y={top - 8} textAnchor="middle" fontSize="15" fontWeight={700} fill={C.ink} className="tnum">
              {s.kind === 'total' ? pct(s.v) : `${s.v > 0 ? '+' : '−'}${Math.abs(s.v).toFixed(1)} pp`}
            </text>
            {s.label.split('\n').map((line, k) => (
              <text key={k} x={cx} y={y(min) + 18 + k * 15} textAnchor="middle" fontSize="12.5" fill={C.ink2}>
                {line}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

// ------------------------------------------------------------------ Dumbbell (antes → después)

export function Dumbbell({
  rows,
  width,
  min,
  max,
  aLabel,
  bLabel,
  labelW = 170,
  rowH = 52,
}: {
  rows: { label: string; sub?: string; a: number; b: number }[]
  width: number
  min: number
  max: number
  aLabel: string
  bLabel: string
  labelW?: number
  rowH?: number
}) {
  const M = { t: 30, r: 40 }
  const plotW = width - labelW - M.r
  const x = (v: number) => labelW + ((v - min) / (max - min)) * plotW
  const height = M.t + rows.length * rowH
  const ticks = [10, 20, 30, 40, 50].filter((t) => t >= min && t <= max)
  return (
    <svg width={width} height={height} role="img">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={M.t - 6} y2={height - 8} stroke={C.grid} />
          <text x={x(t)} y={M.t - 12} textAnchor="middle" fontSize="11" fill={C.muted} className="tnum">
            {t}%
          </text>
        </g>
      ))}
      {rows.map((r, i) => {
        const cy = M.t + i * rowH + rowH / 2
        return (
          <g key={r.label}>
            <text x={labelW - 14} y={cy} dy={r.sub ? '-0.2em' : '0.35em'} textAnchor="end" fontSize="14" fill={C.ink}>
              {r.label}
            </text>
            {r.sub && (
              <text x={labelW - 14} y={cy} dy="1.1em" textAnchor="end" fontSize="11.5" fill={C.muted}>
                {r.sub}
              </text>
            )}
            <line x1={x(r.a)} x2={x(r.b)} y1={cy} y2={cy} stroke={C.ink2} strokeWidth="2" />
            <circle cx={x(r.a)} cy={cy} r={6} fill={C.surface} stroke={C.muted} strokeWidth="2">
              <title>{`${aLabel}: ${pct(r.a)}`}</title>
            </circle>
            <circle cx={x(r.b)} cy={cy} r={6} fill={C.classic} stroke={C.surface} strokeWidth="2">
              <title>{`${bLabel}: ${pct(r.b)}`}</title>
            </circle>
            <text x={x(Math.min(r.a, r.b)) - 12} y={cy} dy="0.35em" textAnchor="end" fontSize="12" fill={C.muted} className="tnum">
              {pct(Math.min(r.a, r.b))}
            </text>
            <text x={x(Math.max(r.a, r.b)) + 12} y={cy} dy="0.35em" fontSize="12.5" fontWeight={600} fill={C.ink} className="tnum">
              {pct(Math.max(r.a, r.b))}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ------------------------------------------------------------------ Leyenda (rect para barras, punto para dumbbell)

export function Legend({ items, shape = 'rect' }: { items: { label: string; color: string; hollow?: boolean }[]; shape?: 'rect' | 'dot' }) {
  return (
    <div className="flex gap-4 text-[13px]" style={{ color: C.ink2 }}>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <svg width="14" height="14" aria-hidden>
            {shape === 'rect' ? (
              <rect x="1" y="3" width="12" height="8" rx="2" fill={it.color} />
            ) : (
              <circle cx="7" cy="7" r="5" fill={it.hollow ? C.surface : it.color} stroke={it.hollow ? C.muted : C.surface} strokeWidth="2" />
            )}
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  )
}

/** IC 95% de una proporción (en %), para whiskers por grupo. */
export const ci95 = (p: number, n: number): [number, number] => {
  const q = p / 100
  const h = 1.96 * Math.sqrt((q * (1 - q)) / n) * 100
  return [p - h, p + h]
}
