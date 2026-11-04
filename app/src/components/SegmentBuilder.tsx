import { Copy, Plus, Split, X } from 'lucide-react'
import { ConditionChips } from './ConditionChips'
import { usePopover } from './FilterBar'
import { DIMS, type DimKey, type Filters, type User, emptyFilters, filtersLabel, inc, matches, userValue } from '../lib/data'

export type Segment = { id: number; name: string; filters: Filters }

export const MAX_SEGMENTS = 4
const LETTERS = ['A', 'B', 'C', 'D']

type Props = {
  segments: Segment[]
  setSegments: (s: Segment[]) => void
  base: User[] // usuarios en el rango de fechas
  colors: string[]
  nextId: () => number
}

/** Condiciones que todos los grupos tienen en común (se conservan al dividir por una dimensión). */
function commonFilters(segments: Segment[], except: DimKey): Filters {
  const out = emptyFilters()
  for (const d of DIMS) {
    if (d.key === except) continue
    const first = JSON.stringify(segments[0]?.filters[d.key])
    if (segments.every((s) => JSON.stringify(s.filters[d.key]) === first)) out[d.key] = structuredClone(segments[0].filters[d.key])
  }
  return out
}

export function SegmentBuilder({ segments, setSegments, base, colors, nextId }: Props) {
  const update = (id: number, patch: Partial<Segment>) => setSegments(segments.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const full = segments.length >= MAX_SEGMENTS

  const overlap = (() => {
    if (segments.length < 2) return 0
    let n = 0
    for (const u of base) {
      let hits = 0
      for (const s of segments) if (matches(u, s.filters)) hits++
      if (hits > 1) n++
    }
    return n
  })()

  const splitBy = (k: DimKey) => {
    const common = commonFilters(segments, k)
    const scoped = base.filter((u) => matches(u, common))
    const present = DIMS.find((d) => d.key === k)!.values.filter((v) => scoped.some((u) => userValue(u, k) === v))
    setSegments(present.slice(0, MAX_SEGMENTS).map((v) => ({ id: nextId(), name: '', filters: { ...structuredClone(common), [k]: inc(v) } })))
  }

  return (
    <div className="space-y-2">
      {segments.map((s, i) => {
        const n = base.reduce((acc, u) => acc + (matches(u, s.filters) ? 1 : 0), 0)
        return (
          <div key={s.id} className="rounded-xl p-3 border flex gap-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <div className="flex flex-col items-center gap-1 pt-0.5">
              <span
                className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[13px] font-semibold"
                style={{ background: 'var(--surface-1)', boxShadow: `inset 0 0 0 2px ${colors[i]}` }}
                aria-label={`Grupo ${LETTERS[i]}`}
              >
                {LETTERS[i]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-2">
                <input
                  value={s.name}
                  placeholder={filtersLabel(s.filters)}
                  onChange={(e) => update(s.id, { name: e.target.value })}
                  aria-label={`Nombre del grupo ${LETTERS[i]}`}
                  title="Puedes escribir un nombre propio"
                  className="flex-1 min-w-[180px] bg-transparent text-[14px] font-semibold outline-none placeholder:text-[var(--text-primary)] focus:placeholder:text-[var(--text-muted)]"
                />
                <span className="text-[12px] tnum shrink-0 order-last basis-full sm:order-none sm:basis-auto" style={{ color: n < 30 ? 'var(--warning-ink)' : 'var(--text-muted)' }}>
                  {n.toLocaleString('es-MX')} usuarios{n < 30 ? ' · muestra chica' : ''}
                </span>
                <button
                  className="p-1.5 rounded hover:bg-[var(--surface-1)] disabled:opacity-30"
                  title="Duplicar grupo"
                  aria-label="Duplicar grupo"
                  disabled={full}
                  onClick={() => setSegments([...segments, { id: nextId(), name: '', filters: structuredClone(s.filters) }])}
                >
                  <Copy size={14} />
                </button>
                <button
                  className="p-1.5 rounded hover:bg-[var(--surface-1)] disabled:opacity-30"
                  title="Eliminar grupo"
                  aria-label="Eliminar grupo"
                  disabled={segments.length <= 1}
                  onClick={() => setSegments(segments.filter((x) => x.id !== s.id))}
                >
                  <X size={14} />
                </button>
              </div>
              <ConditionChips
                filters={s.filters}
                onChange={(f) => update(s.id, { filters: f })}
                base={base}
                emptyLabel="Todos los usuarios"
                addLabel="Agregar condición"
              />
            </div>
          </div>
        )
      })}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          className="chip"
          disabled={full}
          style={full ? { opacity: 0.4 } : undefined}
          onClick={() => setSegments([...segments, { id: nextId(), name: '', filters: emptyFilters() }])}
        >
          <Plus size={14} /> Agregar grupo
        </button>
        <SplitMenu onPick={splitBy} />
        {overlap > 0 && (
          <span className="text-[12px]" style={{ color: 'var(--warning-ink)' }}>
            ⚠ {overlap.toLocaleString('es-MX')} usuarios están en más de un grupo.
          </span>
        )}
      </div>
    </div>
  )
}

function SplitMenu({ onPick }: { onPick: (k: DimKey) => void }) {
  const { open, setOpen, ref } = usePopover()
  return (
    <div className="relative" ref={ref}>
      <button className="chip" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Split size={14} /> Un grupo por cada valor de…
      </button>
      {open && (
        <div className="absolute z-40 mt-1 card shadow-lg py-1 w-[280px]" role="menu">
          <div className="px-3 py-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Reemplaza los grupos. Conserva las condiciones que todos tienen en común.
          </div>
          {DIMS.map((d) => (
            <button
              key={d.key}
              role="menuitem"
              className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-[var(--surface-2)]"
              onClick={() => {
                onPick(d.key)
                setOpen(false)
              }}
            >
              {d.label}{' '}
              <span style={{ color: 'var(--text-muted)' }}>({d.values.map((v) => d.display?.(v) ?? v).join(', ')})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
