import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown, Settings2 } from 'lucide-react'
import { DATA_FROM, DATA_TO, type DateRange, RANGE_PRESETS, type Rule, presetOf, rangeLabel } from '../lib/data'

export function Segmented({
  label,
  value,
  options,
  onChange,
  title,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  title?: string
}) {
  return (
    <div className="seg" role="group" aria-label={label} title={title}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  return { open, setOpen, ref }
}

// ------------------------------------------------------------- Rango de fechas

export function DateRangeMenu({ range, onChange }: { range: DateRange; onChange: (r: DateRange) => void }) {
  const { open, setOpen, ref } = usePopover()
  const [from, setFrom] = useState(range.from)
  const [to, setTo] = useState(range.to)
  useEffect(() => {
    setFrom(range.from)
    setTo(range.to)
  }, [range, open])

  const preset = presetOf(range)
  const valid = from && to && from <= to && from >= DATA_FROM && to <= DATA_TO

  return (
    <div className="relative" ref={ref}>
      <button className="chip" data-active={preset?.key !== 'todo'} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        <CalendarDays size={15} style={{ color: 'var(--accent)' }} />
        <span className="font-medium">{preset ? preset.label : rangeLabel(range)}</span>
        {preset && preset.key !== 'todo' && <span style={{ color: 'var(--text-muted)' }}>· {rangeLabel(range)}</span>}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute z-40 mt-1 card shadow-lg py-1 w-[310px]" role="dialog" aria-label="Fechas de registro">
          <div className="px-3 pt-1 pb-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Usuarios que se registraron en…
          </div>
          {RANGE_PRESETS.map((p) => {
            const on = preset?.key === p.key
            return (
              <button
                key={p.key}
                onClick={() => {
                  onChange(p.range)
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-left hover:bg-[var(--surface-2)]"
              >
                <span className="w-4 inline-flex justify-center">{on && <Check size={16} strokeWidth={3} />}</span>
                <span className={on ? 'font-semibold' : ''}>{p.label}</span>
                <span className="ml-auto text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {p.hint}
                </span>
              </button>
            )
          })}
          <div className="border-t mt-1 pt-2 px-3 pb-2" style={{ borderColor: 'var(--grid)' }}>
            <div className="text-[12px] mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
              Elegir fechas exactas
            </div>
            <div className="flex items-center gap-2">
              <label className="flex-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Desde
                <input type="date" value={from} min={DATA_FROM} max={DATA_TO} onChange={(e) => setFrom(e.target.value)} className="chip w-full px-2 mt-0.5" />
              </label>
              <label className="flex-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Hasta
                <input type="date" value={to} min={DATA_FROM} max={DATA_TO} onChange={(e) => setTo(e.target.value)} className="chip w-full px-2 mt-0.5" />
              </label>
            </div>
            {!valid && (
              <div className="text-[11px] mt-1" style={{ color: 'var(--critical)' }}>
                Elige fechas entre el 1 abr y el 31 jul, con “desde” antes que “hasta”.
              </div>
            )}
            <button
              disabled={!valid}
              onClick={() => {
                onChange({ from, to })
                setOpen(false)
              }}
              className="mt-2 w-full h-8 rounded-lg text-[13px] font-medium disabled:opacity-40"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
            >
              Aplicar fechas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------- Opciones avanzadas

export function OptionsMenu({ rule, setRule }: { rule: Rule; setRule: (r: Rule) => void }) {
  const { open, setOpen, ref } = usePopover()
  const opts: { value: Rule; title: string; desc: string }[] = [
    { value: 'oficial', title: 'Regla oficial del dashboard', desc: 'Cuenta solo eventos registrados después del signup.' },
    {
      value: 'tolerante',
      title: 'Corregir desfase de reloj',
      desc: 'Incluye eventos con hora hasta 15 h antes del signup. Hay 1,928 eventos así, sobre todo de quienes se registran de noche.',
    },
  ]
  return (
    <div className="relative" ref={ref}>
      <button className="chip" data-active={rule !== 'oficial'} aria-expanded={open} onClick={() => setOpen((o) => !o)} title="Opciones de cálculo">
        <Settings2 size={15} /> Opciones
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 card shadow-lg p-3 w-[320px]" role="dialog" aria-label="Opciones de cálculo">
          <div className="text-[13px] font-semibold mb-1">Cómo contar la activación</div>
          <p className="text-[12px] mb-2" style={{ color: 'var(--text-muted)' }}>
            Activación = ≥1 proyecto y ≥3 tareas en los primeros 7 días.
          </p>
          {opts.map((o) => (
            <button
              key={o.value}
              onClick={() => setRule(o.value)}
              className="w-full text-left p-2 rounded-lg flex gap-2 hover:bg-[var(--surface-2)]"
              style={rule === o.value ? { boxShadow: 'inset 0 0 0 1px var(--accent)' } : undefined}
            >
              <span
                className="mt-0.5 w-4 h-4 rounded-full border inline-flex items-center justify-center shrink-0"
                style={{ borderColor: rule === o.value ? 'var(--accent)' : 'var(--axis)' }}
              >
                {rule === o.value && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}
              </span>
              <span>
                <span className="block text-[13px] font-medium">{o.title}</span>
                <span className="block text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {o.desc}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
