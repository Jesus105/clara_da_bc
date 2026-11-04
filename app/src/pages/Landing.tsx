import { ArrowRight, BarChart3, Bot, Presentation, Sheet } from 'lucide-react'

type Option = {
  href: string
  title: string
  desc: string
  icon: React.ComponentType<{ size?: number }>
  ready: boolean
}

const OPTIONS: Option[] = [
  {
    href: '#/dashboard/timeline',
    title: 'Dashboard',
    desc: 'Timeline de CVR y KPIs de tareas y proyectos, con comparativos por canal, dispositivo, experiencia, versión y precio.',
    icon: BarChart3,
    ready: true,
  },
  {
    href: '#/deck-analisis/1',
    title: 'Deck de análisis',
    desc: 'La historia completa para el CPO (en inglés): por qué el dashboard engaña, el efecto real de Guided, qué aprendimos de los usuarios y la recomendación.',
    icon: Presentation,
    ready: true,
  },
  {
    href: '#/deck-ia/1',
    title: 'Deck de uso de IA',
    desc: 'El pipeline completo (en inglés): negocio → PostgreSQL → MCP → supuestos → análisis guiado → entregables → skill, y cómo se validó cada número.',
    icon: Bot,
    ready: true,
  },
  {
    href: 'https://docs.google.com/spreadsheets/d/1093RwUhI0yNnJEYubFMV7DY_s0dMPBRGRhFgUNspINg/edit',
    title: 'Análisis en Google Sheets',
    desc: 'El análisis completo rehecho desde cero con fórmulas y tablas dinámicas (en inglés), para que cualquier analista audite cada número.',
    icon: Sheet,
    ready: true,
  },
]

export function Landing() {
  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-8 py-12 sm:py-20">
      <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--accent)' }}>
        Caso de negocio · Data Analyst
      </p>
      <h1 className="text-[32px] sm:text-[40px] font-semibold leading-tight max-w-[760px]">
        TaskNest: ¿expandir, modificar o detener el Onboarding Guiado?
      </h1>
      <p className="mt-4 text-[16px] max-w-[720px]" style={{ color: 'var(--text-secondary)' }}>
        El dashboard mostraba caídas en activación y conversión desde el lanzamiento. El análisis muestra que se deben a un cambio de mezcla de canales y a
        un error de medición en Android. En las mismas semanas, Guided convierte más que Classic.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((o) => {
          const Icon = o.icon
          return (
            <a
              key={o.href}
              href={o.href}
              className="card p-5 group flex flex-col gap-3 transition-shadow hover:shadow-md"
              aria-disabled={!o.ready}
              {...(o.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-lg inline-flex items-center justify-center" style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}>
                  <Icon size={20} />
                </span>
                {!o.ready && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                    Próximamente
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-[17px] font-semibold">{o.title}</h2>
                <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                  {o.desc}
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: o.ready ? 'var(--accent)' : 'var(--text-muted)' }}>
                {o.ready ? 'Abrir' : 'Ver estado'} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </a>
          )
        })}
      </div>

      <p className="mt-10 text-[12px]" style={{ color: 'var(--text-muted)' }}>
        Caso ficticio y sintético · 1,800 trials y 10,220 eventos · Datos extraídos al 7-ago-2026
      </p>
    </div>
  )
}
