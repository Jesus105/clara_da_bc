import { ArrowLeft, Clock } from 'lucide-react'

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-8 py-20">
      <a href="#/" className="inline-flex items-center gap-1 text-[13px] mb-6" style={{ color: 'var(--text-secondary)' }}>
        <ArrowLeft size={14} /> Inicio
      </a>
      <div className="card p-8">
        <Clock size={22} style={{ color: 'var(--text-muted)' }} />
        <h1 className="text-[22px] font-semibold mt-3">{title}</h1>
        <p className="mt-2 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          Esta sección está en construcción. Mientras tanto, el dashboard ya está disponible.
        </p>
        <a href="#/dashboard/timeline" className="chip mt-5" style={{ color: 'var(--accent)' }}>
          Ir al dashboard
        </a>
      </div>
    </div>
  )
}
