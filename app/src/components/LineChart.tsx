import { useEffect, useMemo, useRef, useState } from 'react'
import { Table2 } from 'lucide-react'
import { type Bucket, type Fmt, fmtValue } from '../lib/data'

export type Point = { value: number | null; n: number; fragile: boolean; note?: string }
export type Series = { id: string; label: string; color: string; points: Point[]; reference?: boolean }

type Props = {
  buckets: Bucket[]
  series: Series[]
  fmt: Fmt
  events?: { t: number; label: string }[]
  height?: number
  ariaLabel: string
}

const R = 4 // radio de marcador (8px)

function niceStep(x: number) {
  if (x <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(x)))
  const m = x / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p
}

function eventLabelPos(px: number, label: string, k: number, width: number) {
  const w = label.length * 6 + 6 // ancho aproximado a 11px
  let right = k % 2 === 1
  if (!right && px - w < 0) right = true
  if (right && px + w > width) right = false
  return { x: right ? px + 4 : px - 4, textAnchor: right ? ('start' as const) : ('end' as const) }
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

export function LineChart({ buckets, series, fmt, events = [], height = 300, ariaLabel }: Props) {
  const [wrapRef, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  const multi = series.length >= 2
  const directLabels = multi && series.length <= 5 && width > 560
  const M = { l: 52, r: directLabels ? 132 : 20, t: 26, b: 30 }
  const plotW = Math.max(0, width - M.l - M.r)
  const plotH = height - M.t - M.b
  const n = buckets.length
  const step = n > 1 ? plotW / (n - 1) : 0
  const x = (i: number) => M.l + (n > 1 ? i * step : plotW / 2)

  const { yMax, ticks } = useMemo(() => {
    let max = 0
    for (const s of series) for (const p of s.points) if (p.value != null && p.value > max) max = p.value
    if (max === 0) max = fmt === 'pct' ? 0.1 : 1
    const st = niceStep((max * 1.08) / 4)
    const top = Math.ceil((max * 1.08) / st) * st
    const t: number[] = []
    for (let v = 0; v <= top + 1e-9; v += st) t.push(v)
    return { yMax: top, ticks: t }
  }, [series, fmt])

  const y = (v: number) => M.t + plotH - (v / yMax) * plotH

  const paths = useMemo(
    () =>
      series.map((s) => {
        let d = ''
        let pen = false
        s.points.forEach((p, i) => {
          if (p.value == null) {
            pen = false
            return
          }
          d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`
          pen = true
        })
        return d
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, width, yMax, height],
  )

  const eventX = events
    .map((e) => {
      if (n < 2) return null
      const i = buckets.findIndex((b) => e.t >= b.start && e.t < b.end)
      if (i < 0) return null
      const frac = (e.t - buckets[i].start) / (buckets[i].end - buckets[i].start)
      return { ...e, px: x(i) + frac * step }
    })
    .filter(Boolean) as { t: number; label: string; px: number }[]

  // Etiquetas directas: se quita el prefijo común (p. ej. "Creator Campaign · ") para que se distingan.
  const shortLabels = useMemo(() => {
    const toks = series.map((s) => s.label.split(' · '))
    let k = 0
    while (toks.every((t) => t.length > k + 1 && t[k] === toks[0][k])) k++
    const out = toks.map((t) => {
      const l = t.slice(k).join(' · ')
      return l.length > 18 ? l.slice(0, 17) + '…' : l
    })
    return new Set(out).size === out.length ? out : null // si siguen ambiguas, solo leyenda
  }, [series])

  // Etiquetas directas con anti-colisión vertical (mín. 15px).
  const labels = useMemo(() => {
    if (!directLabels || !shortLabels) return []
    const items = series
      .map((s, si) => {
        let idx = -1
        for (let i = s.points.length - 1; i >= 0; i--)
          if (s.points[i].value != null) {
            idx = i
            break
          }
        return idx < 0 ? null : { s, text: shortLabels[si], y: y(s.points[idx].value!) }
      })
      .filter(Boolean) as { s: Series; text: string; y: number }[]
    items.sort((a, b) => a.y - b.y)
    for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < 15) items[i].y = items[i - 1].y + 15
    const overflow = items.length ? items[items.length - 1].y - (M.t + plotH) : 0
    if (overflow > 0) items.forEach((it) => (it.y -= overflow))
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, directLabels, shortLabels, width, yMax, height])

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = n > 1 ? Math.round((px - M.l) / step) : 0
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1))
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1))
    else if (e.key === 'Escape') setHover(null)
    else return
    e.preventDefault()
  }

  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 64))))
  const tooltipLeft = hover != null ? x(hover) : 0
  const flip = hover != null && tooltipLeft > width * 0.6

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-2">
        {multi ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]" style={{ color: 'var(--text-secondary)' }} aria-label="Leyenda">
            {series.map((s) => (
              <li key={s.id} className="inline-flex items-center gap-1.5">
                <svg width="16" height="8" aria-hidden>
                  <line x1="0" y1="4" x2="16" y2="4" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
                </svg>
                {s.label}
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <button className="chip shrink-0" aria-pressed={showTable} onClick={() => setShowTable((v) => !v)}>
          <Table2 size={14} /> {showTable ? 'Ocultar tabla' : 'Ver tabla'}
        </button>
      </div>

      <div ref={wrapRef} className="relative" style={{ height }}>
        {width > 0 && n > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={ariaLabel}
            tabIndex={0}
            onKeyDown={onKey}
            onBlur={() => setHover(null)}
            style={{ display: 'block', outline: 'none' }}
          >
            {/* Grid y eje Y */}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.l} x2={M.l + plotW} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--axis)' : 'var(--grid)'} strokeWidth="1" />
                <text x={M.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--text-muted)" className="tnum">
                  {fmtValue(t, fmt, fmt === 'pct' ? 0 : fmt === 'int' ? 0 : 1)}
                </text>
              </g>
            ))}

            {/* Eje X */}
            {buckets.map((b, i) =>
              i % labelEvery === 0 ? (
                <text key={b.key} x={x(i)} y={M.t + plotH + 18} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
                  {b.label}
                </text>
              ) : null,
            )}

            {/* Eventos */}
            {eventX.map((e, k) => (
              <g key={e.label}>
                <line x1={e.px} x2={e.px} y1={M.t - 4} y2={M.t + plotH} stroke="var(--text-muted)" strokeWidth="1" opacity="0.6" />
                {/* Alterna lado (izq/der) para que no choquen; si no cabe en el borde, se voltea. */}
                <text {...eventLabelPos(e.px, e.label, k, width)} y={M.t - 8} fontSize="11" fill="var(--text-secondary)">
                  {e.label}
                </text>
              </g>
            ))}

            {/* Líneas */}
            {series.map((s, si) => (
              <path
                key={s.id}
                d={paths[si]}
                fill="none"
                stroke={s.color}
                strokeWidth={s.reference ? 1.5 : 2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}

            {/* Marcadores: llenos = sólido; huecos = frágil (n bajo o cohorte sin 14 días) */}
            {series.map((s) =>
              s.reference
                ? null
                : s.points.map((p, i) =>
                    p.value == null ? null : (
                      <circle
                        key={s.id + i}
                        cx={x(i)}
                        cy={y(p.value)}
                        r={hover === i ? R + 1 : R}
                        fill={p.fragile ? 'var(--surface-1)' : s.color}
                        stroke={p.fragile ? s.color : 'var(--surface-1)'}
                        strokeWidth="2"
                      />
                    ),
                  ),
            )}

            {/* Etiquetas directas */}
            {labels.map(({ s, text, y: ly }) => (
              <g key={s.id} transform={`translate(${M.l + plotW + 10},${ly})`}>
                <line x1="0" x2="10" y1="0" y2="0" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
                <text x="15" dy="0.32em" fontSize="12" fill="var(--text-secondary)">
                  {text}
                </text>
              </g>
            ))}

            {/* Crosshair */}
            {hover != null && <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={M.t + plotH} stroke="var(--text-muted)" strokeWidth="1" />}

            <rect
              x={M.l - step / 2}
              y={M.t}
              width={plotW + step}
              height={plotH}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}

        {hover != null && (
          <div
            className="absolute pointer-events-none card shadow-lg px-3 py-2 text-[12px] z-10"
            style={{
              top: M.t + 8,
              left: flip ? undefined : tooltipLeft + 12,
              right: flip ? width - tooltipLeft + 12 : undefined,
              minWidth: 180,
            }}
            role="status"
          >
            <div className="mb-1" style={{ color: 'var(--text-muted)' }}>
              Cohorte: {buckets[hover].label}
            </div>
            {series.map((s) => {
              const p = s.points[hover]
              return (
                <div key={s.id} className="flex items-center gap-2 py-0.5">
                  <svg width="12" height="6" aria-hidden>
                    <line x1="0" y1="3" x2="12" y2="3" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <strong className="tnum" style={{ color: 'var(--text-primary)' }}>
                    {fmtValue(p?.value, fmt)}
                  </strong>
                  <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span className="ml-auto tnum" style={{ color: 'var(--text-muted)' }}>
                    n={p?.n ?? 0}
                  </span>
                </div>
              )
            })}
            {series.some((s) => s.points[hover]?.note) && (
              <div className="mt-1 pt-1 border-t" style={{ borderColor: 'var(--grid)', color: 'var(--warning-ink)' }}>
                {[...new Set(series.map((s) => s.points[hover]?.note).filter(Boolean))].join(' · ')}
              </div>
            )}
          </div>
        )}
      </div>

      {showTable && (
        <div className="mt-3 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cohorte</th>
                {series.map((s) => (
                  <th key={s.id} colSpan={2}>
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buckets.map((b, i) => (
                <tr key={b.key}>
                  <td>{b.label}</td>
                  {series.map((s) => (
                    <FragmentCells key={s.id} p={s.points[i]} fmt={fmt} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FragmentCells({ p, fmt }: { p?: Point; fmt: Fmt }) {
  return (
    <>
      <td style={{ color: p?.fragile ? 'var(--text-muted)' : undefined }}>
        {fmtValue(p?.value, fmt)}
        {p?.fragile ? '*' : ''}
      </td>
      <td style={{ color: 'var(--text-muted)' }}>n={p?.n ?? 0}</td>
    </>
  )
}
