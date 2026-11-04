import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { Segmented, usePopover } from './FilterBar'
import { DIMS, type Dim, type DimFilter, type Filters, type User, countsFor, displayValue, emptyDimFilter, isActive } from '../lib/data'

/**
 * Filtros escritos como frases: "Canal es Creator Campaign", "Dispositivo no es Web".
 * Solo se muestran las condiciones activas; el resto se agrega con "+ Agregar".
 */
export function ConditionChips({
  filters,
  onChange,
  base,
  emptyLabel = 'Todos los usuarios',
  addLabel = 'Agregar filtro',
}: {
  filters: Filters
  onChange: (f: Filters) => void
  base: User[]
  emptyLabel?: string
  addLabel?: string
}) {
  const active = DIMS.filter((d) => isActive(filters[d.key]))
  const available = DIMS.filter((d) => !isActive(filters[d.key]))
  const set = (d: Dim, f: DimFilter) => onChange({ ...filters, [d.key]: f })

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active.length === 0 && (
        <span className="text-[13px] mr-1" style={{ color: 'var(--text-muted)' }}>
          {emptyLabel}
        </span>
      )}
      {active.map((d) => (
        <ConditionTag key={d.key} dim={d} value={filters[d.key]} counts={countsFor(base, filters, d.key)} onChange={(f) => set(d, f)} />
      ))}
      {available.length > 0 && <AddCondition dims={available} label={addLabel} filters={filters} base={base} onChange={onChange} />}
    </div>
  )
}

export function conditionText(dim: Dim, f: DimFilter) {
  const names = f.values.map((v) => displayValue(dim.key, v))
  const joiner = f.mode === 'in' ? ' o ' : ' ni '
  return { dim: dim.label, op: f.mode === 'in' ? 'es' : 'no es', values: names.join(joiner) }
}

function ConditionTag({ dim, value, counts, onChange }: { dim: Dim; value: DimFilter; counts: Record<string, number>; onChange: (f: DimFilter) => void }) {
  const { open, setOpen, ref } = usePopover()
  const t = conditionText(dim, value)
  return (
    <div className="relative" ref={ref}>
      <span
        className="inline-flex items-center h-8 rounded-full text-[13px] border"
        style={{ borderColor: 'var(--accent)', background: 'var(--surface-1)' }}
      >
        <button className="pl-3 pr-1 h-full inline-flex items-center gap-1" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span style={{ color: 'var(--text-secondary)' }}>{t.dim}</span>
          <span style={{ color: value.mode === 'out' ? 'var(--critical)' : 'var(--text-muted)' }}>{t.op}</span>
          <strong className="max-w-[220px] truncate">{t.values}</strong>
        </button>
        <button
          className="h-full pl-1 pr-2.5 inline-flex items-center rounded-r-full hover:bg-[var(--surface-2)]"
          aria-label={`Quitar filtro de ${dim.label}`}
          title="Quitar"
          onClick={() => onChange(emptyDimFilter())}
        >
          <X size={13} />
        </button>
      </span>
      {open && <ConditionEditor dim={dim} value={value} counts={counts} onChange={onChange} onDone={() => setOpen(false)} />}
    </div>
  )
}

function AddCondition({ dims, label, filters, base, onChange }: { dims: Dim[]; label: string; filters: Filters; base: User[]; onChange: (f: Filters) => void }) {
  const { open, setOpen, ref } = usePopover()
  const [dim, setDim] = useState<Dim | null>(null)
  const close = () => {
    setOpen(false)
    setDim(null)
  }
  return (
    <div className="relative" ref={ref}>
      <button
        className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-[13px] border border-dashed hover:bg-[var(--surface-2)]"
        style={{ borderColor: 'var(--axis)', color: 'var(--text-secondary)' }}
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
      >
        <Plus size={14} /> {label}
      </button>
      {open && !dim && (
        <div className="absolute z-40 mt-1 card shadow-lg py-1 min-w-[200px]" role="menu">
          <div className="px-3 py-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Filtrar por…
          </div>
          {dims.map((d) => (
            <button
              key={d.key}
              role="menuitem"
              className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-[var(--surface-2)]"
              onClick={() => setDim(d)}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}
      {open && dim && (
        <ConditionEditor
          dim={dim}
          value={filters[dim.key]}
          counts={countsFor(base, filters, dim.key)}
          onChange={(f) => onChange({ ...filters, [dim.key]: f })}
          onDone={close}
        />
      )}
    </div>
  )
}

function ConditionEditor({
  dim,
  value,
  counts,
  onChange,
  onDone,
}: {
  dim: Dim
  value: DimFilter
  counts: Record<string, number>
  onChange: (f: DimFilter) => void
  onDone: () => void
}) {
  const toggle = (v: string) => onChange({ ...value, values: value.values.includes(v) ? value.values.filter((x) => x !== v) : [...value.values, v] })
  return (
    <div className="absolute z-40 mt-1 card shadow-lg py-2 w-[260px]" role="dialog" aria-label={`Filtro de ${dim.label}`}>
      <div className="px-3 flex items-center gap-2 mb-2">
        <span className="text-[13px] font-semibold">{dim.label}</span>
        <Segmented
          label="Operador"
          value={value.mode}
          options={[
            { value: 'in', label: 'es' },
            { value: 'out', label: 'no es' },
          ]}
          onChange={(m) => onChange({ ...value, mode: m as 'in' | 'out' })}
        />
      </div>
      {dim.values.map((v) => {
        const on = value.values.includes(v)
        const c = counts[v] ?? 0
        return (
          <button
            key={v}
            role="checkbox"
            aria-checked={on}
            onClick={() => toggle(v)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-left hover:bg-[var(--surface-2)]"
            style={{ opacity: c === 0 && !on ? 0.45 : 1 }}
          >
            <span
              className="w-4 h-4 rounded inline-flex items-center justify-center border shrink-0"
              style={{ borderColor: on ? 'var(--accent)' : 'var(--axis)', background: on ? 'var(--accent)' : 'transparent', color: 'var(--accent-ink)' }}
            >
              {on && <Check size={12} strokeWidth={3} />}
            </span>
            <span>{displayValue(dim.key, v)}</span>
            <span className="ml-auto tnum text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {c.toLocaleString('es-MX')} usuarios
            </span>
          </button>
        )
      })}
      <div className="border-t mt-2 pt-2 px-3 flex items-center justify-between" style={{ borderColor: 'var(--grid)' }}>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {value.mode === 'in' ? 'Solo los marcados' : 'Todos menos los marcados'}
        </span>
        <button className="h-7 px-3 rounded-lg text-[12px] font-medium" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }} onClick={onDone}>
          Listo
        </button>
      </div>
    </div>
  )
}
