import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Download, StickyNote } from 'lucide-react'
import { C, Dumbbell, HBars, Legend, VBars, Waterfall, ci95 } from '../deck/charts'
import { AHA, ANDROID, ANDROID_EXTRA, CONCURRENT, COUNTERFACTUAL, DASHBOARD, DECOMP, DECOMP_TOTAL, PAY_DAY, PRICE, STRATIFIED_LIFT } from '../deck/data'

const W = 1280
const H = 720

// ------------------------------------------------------------------ Piezas de slide

export type SlideDef = { id: string; title: string; render: () => React.ReactNode; notes: string }

export function Frame({ n, total, title, footer = 'TaskNest · Guided Onboarding analysis · Synthetic case data', children }: { n: number; total: number; title?: React.ReactNode; footer?: string; children: React.ReactNode }) {
  return (
    <div className="deck-slide" style={{ width: W, height: H }}>
      <div className="absolute inset-0 flex flex-col" style={{ padding: '44px 64px 0' }}>
        {title && (
          <header className="mb-6">
            <h2 className="text-[30px] leading-[1.15] font-semibold max-w-[1100px]" style={{ color: C.ink }}>
              {title}
            </h2>
          </header>
        )}
        <div className="flex-1 min-h-0 relative">{children}</div>
        <footer className="h-[44px] flex items-center justify-between text-[12px] border-t" style={{ color: C.muted, borderColor: C.grid }}>
          <span>{footer}</span>
          <span className="tnum">
            {n} / {total}
          </span>
        </footer>
      </div>
    </div>
  )
}

export function Bullets({ items, size = 17 }: { items: React.ReactNode[]; size?: number }) {
  return (
    <ul className="space-y-3" style={{ fontSize: size, color: C.ink2, lineHeight: 1.4 }}>
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[9px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.classic }} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

export function Callout({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-[15px] leading-snug"
      style={{ background: tone === 'info' ? '#eef4fc' : '#fff4dc', color: tone === 'info' ? '#184f95' : '#6b4a00' }}
    >
      {children}
    </div>
  )
}

export function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div>
      <div className="text-[34px] font-semibold leading-none" style={{ color: C.ink }}>
        {value}
      </div>
      <div className="text-[14px] mt-1.5" style={{ color: C.ink2 }}>
        {label}
      </div>
      {sub && (
        <div className="text-[12px] mt-0.5" style={{ color: C.muted }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export function Panel({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border p-4 ${className}`} style={{ borderColor: C.grid, background: C.surface }}>
      {title && (
        <div className="text-[14px] font-semibold mb-2" style={{ color: C.ink }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}


// ------------------------------------------------------------------ Slides

const SLIDES: SlideDef[] = [
  {
    id: 'title',
    title: '',
    notes:
      'Open with the answer. The dashboard showed lower activation and conversion after Guided launched. Neither drop is caused by Guided. My recommendation: expand it to 90% and keep a 10% random holdout to get causal proof.',
    render: () => (
      <div className="h-full flex flex-col justify-center pb-6">
        <div className="text-[14px] font-semibold uppercase tracking-wide mb-4" style={{ color: C.classic }}>
          TaskNest · Guided Onboarding · Recommendation for the CPO
        </div>
        <h1 className="text-[56px] leading-[1.06] font-semibold max-w-[1050px]" style={{ color: C.ink }}>
          Expand Guided Onboarding. The dashboard drop isn't caused by it.
        </h1>
        <div className="mt-14 flex gap-16">
          <Stat value="+7.2 pp" label="Conversion vs Classic, same weeks" sub="31.7% vs 24.6% · 95% CI +1.6 to +12.7" />
          <Stat value="+31%" label="Revenue per trial" sub="$4.73 vs $3.61" />
          <Stat value="90 / 10" label="Rollout with a random holdout" sub="To turn strong evidence into proof" />
        </div>
        <p className="mt-14 text-[13px]" style={{ color: C.muted }}>
          1,800 trial sign-ups (Apr 1 – Jul 31, 2026) · 10,220 product events · all numbers recomputed with SQL from raw tables
        </p>
      </div>
    ),
  },
  {
    id: 'context',
    title: 'Three changes landed at once, and the dashboard mixed them',
    notes:
      'Guided, a big influencer campaign and an Android release that changed task tracking all landed within three weeks, with no randomization. The dashboard compares April–May with June–July, so it blends all three. My job was to separate them.',
    render: () => (
      <div className="h-full grid grid-cols-[1fr_440px] gap-12 items-center pb-6">
        <div className="relative pl-1">
          <div className="absolute left-[9px] top-3 bottom-3 w-[2px]" style={{ background: C.grid }} />
          {[
            { d: 'Apr 1', t: 'Baseline: 100% Classic', s: '' },
            { d: 'Jun 1', t: 'Guided rollout to ~60% of new users', s: 'Not randomized', hi: true },
            { d: 'Jun 1', t: 'Creator Campaign starts', s: 'Influencer traffic: 4% → 34% of sign-ups', hi: true },
            { d: 'Jun 20', t: 'Android 3.2 changes task tracking', s: 'Tasks stop being logged', hi: true },
          ].map((e, k) => (
            <div key={k} className="relative flex gap-5 py-3.5">
              <span className="mt-[6px] w-[18px] h-[18px] rounded-full shrink-0" style={{ background: e.hi ? C.classic : C.axis, boxShadow: `0 0 0 4px ${C.surface}` }} />
              <span className="w-[72px] shrink-0 text-[18px] font-semibold" style={{ color: e.hi ? C.classic : C.muted }}>
                {e.d}
              </span>
              <span>
                <span className="block text-[21px] font-semibold" style={{ color: C.ink }}>
                  {e.t}
                </span>
                {e.s && (
                  <span className="block text-[15px]" style={{ color: C.ink2 }}>
                    {e.s}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: C.muted }}>
            Dashboard: Apr–May → Jun–Jul
          </div>
          <Panel>
            <Stat value={`${DASHBOARD.pre.act}% → ${DASHBOARD.post.act.toFixed(1)}%`} label="Activation (7 days)" />
          </Panel>
          <Panel>
            <Stat value={`${DASHBOARD.pre.cvr}% → ${DASHBOARD.post.cvr.toFixed(1)}%`} label="Trial conversion (14 days)" />
          </Panel>
        </div>
      </div>
    ),
  },
  {
    id: 'mix',
    title: 'The conversion drop is channel mix: every channel actually improved',
    notes:
      'Splitting the 3.7-point drop: rates within channels went up 3.8 points; the shift toward Creator Campaign, which converts at 13%, took away 7.5. Every channel improved. With the old channel mix, June–July would have converted at 36.8%.',
    render: () => (
      <div className="h-full grid grid-cols-[480px_1fr] gap-10">
        <div>
          <Waterfall
            width={480}
            height={400}
            min={20}
            max={42}
            steps={[
              { label: 'Apr–May', v: DASHBOARD.pre.cvr, kind: 'total' },
              { label: 'Better rates\nin every channel', v: DECOMP_TOTAL.rate, kind: 'delta' },
              { label: 'More Creator\nCampaign traffic', v: DECOMP_TOTAL.mix, kind: 'delta' },
              { label: 'Jun–Jul', v: DASHBOARD.post.cvr, kind: 'total' },
            ]}
          />
          <p className="text-[12.5px]" style={{ color: C.muted }}>
            Trial conversion. Axis starts at 20%.
          </p>
        </div>
        <div>
          <div className="mb-1">
            <Legend
              shape="dot"
              items={[
                { label: 'Apr–May', color: C.muted, hollow: true },
                { label: 'Jun–Jul', color: C.classic },
              ]}
            />
          </div>
          <Dumbbell
            width={620}
            min={5}
            max={55}
            aLabel="Apr–May"
            bLabel="Jun–Jul"
            labelW={170}
            rowH={76}
            rows={DECOMP.map((d) => ({ label: d.ch, sub: `share ${d.wPre}% → ${d.wPost}%`, a: d.convPre, b: d.convPost })).sort((x, y) => y.b - x.b)}
          />
          <div className="mt-3">
            <Callout>
              With the Apr–May channel mix, Jun–Jul conversion would be <strong>{COUNTERFACTUAL.postWithPreMix}%</strong>, not 28.9%.
            </Callout>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'android',
    title: 'The activation drop is a tracking bug in Android 3.2',
    notes:
      'On Android 3.2 the metrics that depend on task events collapse, while projects and conversion stay flat. If users had really stopped creating tasks, they would have stopped paying. Only 7% of 3.2 payers look activated, versus 67% on 3.1.',
    render: () => (
      <div className="h-full grid grid-cols-[1fr_340px] gap-10">
        <div>
          <div className="mb-3">
            <Legend
              items={[
                { label: 'Android 3.1 (until Jun 19)', color: C.neutral },
                { label: 'Android 3.2 (from Jun 20)', color: C.neg },
              ]}
            />
          </div>
          <HBars
            width={760}
            max={70}
            labelW={220}
            barH={32}
            rowGap={34}
            rows={ANDROID.map((r) => ({
              label: r.metric,
              sub: r.metric.includes('tasks') || r.metric === 'Activation' ? 'uses task events' : 'no task events',
              values: [
                { v: r.v31, color: C.neutral, name: '3.1' },
                { v: r.v32, color: C.neg, name: '3.2' },
              ],
            }))}
          />
        </div>
        <div className="pt-10 space-y-8">
          <Stat value={`${ANDROID_EXTRA.payersActivated[0]}% → ${ANDROID_EXTRA.payersActivated[1]}%`} label="Paying users who look “activated”" />
          <Callout>Users kept creating projects and paying. Only the task events disappeared.</Callout>
        </div>
      </div>
    ),
  },
  {
    id: 'concurrent',
    title: 'In the same weeks, Guided converts and activates more',
    notes:
      'The fair comparison: Guided versus Classic users who signed up in the same weeks. Conversion is about seven points higher, nearly nine on complete cohorts, and activation without Android 3.2 is nine points higher. It holds when controlling for channel and platform, Classic is flat before versus after, and Guided leads on every platform. Still observational, hence the holdout.',
    render: () => (
      <div className="h-full flex flex-col">
        <div className="grid grid-cols-[1fr_300px] gap-10 flex-1">
          <div>
            <div className="mb-3">
              <Legend
                items={[
                  { label: 'Classic', color: C.classic },
                  { label: 'Guided', color: C.guided },
                ]}
              />
            </div>
            <HBars
              width={780}
              max={60}
              labelW={220}
              barH={38}
              rowGap={50}
              rows={CONCURRENT.map((r) => ({
                label: r.metric.startsWith('Activation') ? 'Activation' : 'Conversion',
                sub: r.metric.includes('complete') ? 'complete cohorts only' : r.metric.includes('excl') ? 'excl. Android 3.2' : 'all Jun–Jul sign-ups',
                values: [
                  { v: r.classic.p, color: C.classic, ci: ci95(r.classic.p, r.classic.n), name: 'Classic' },
                  { v: r.guided.p, color: C.guided, ci: ci95(r.guided.p, r.guided.n), name: 'Guided' },
                ],
              }))}
            />
            <p className="text-[12.5px] mt-1" style={{ color: C.muted }}>
              Jun 1 – Jul 31 sign-ups. Whiskers: 95% CI.
            </p>
          </div>
          <div className="space-y-6 pt-8">
            {CONCURRENT.map((r) => (
              <div key={r.metric}>
                <div className="text-[30px] font-semibold leading-none" style={{ color: C.ink }}>
                  +{r.lift} pp
                </div>
                <div className="text-[12.5px] mt-1" style={{ color: C.muted }}>
                  95% CI +{r.ci[0]} to +{r.ci[1]}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            [`+${STRATIFIED_LIFT} pp`, 'controlling for channel × platform'],
            ['Flat', 'Classic before vs after, in every channel'],
            ['4 of 4', 'platforms with Guided ahead'],
            ['Observational', 'not randomized → keep a holdout'],
          ].map(([v, l]) => (
            <div key={l} className="rounded-xl px-4 py-3" style={{ background: '#f3f2ef' }}>
              <div className="text-[18px] font-semibold" style={{ color: C.ink }}>
                {v}
              </div>
              <div className="text-[13px]" style={{ color: C.ink2 }}>
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'users',
    title: 'What we learned about our users',
    notes:
      'Three facts that shape what comes next. One: conversion jumps at the third task, so onboarding should push users to three tasks fast. Two: price barely moves conversion, so the $18 plan earns the most per trial. Three: three quarters of payers pay in the first week, so nudges belong in days two to six.',
    render: () => (
      <div className="h-full grid grid-cols-3 gap-6">
        <Panel title="The 3rd task is the “aha” moment">
          <VBars
            width={330}
            height={440}
            max={50}
            valueSize={11}
            fmt={(v) => `${v.toFixed(0)}%`}
            xTitle="Tasks created (14 days)"
            data={AHA.map((a) => ({ label: a.tasks, v: a.cvr, color: Number(a.tasks.replace('+', '')) >= 3 ? C.classic : C.neutral }))}
          />
          <p className="text-[14px] mt-2" style={{ color: C.ink2 }}>
            Conversion ~17% → ~41% at the 3rd task.
          </p>
        </Panel>
        <Panel title="Price barely moves conversion">
          <VBars
            width={330}
            height={440}
            max={6}
            fmt={(v) => `$${v.toFixed(2)}`}
            xTitle="Revenue per trial · (conversion)"
            data={PRICE.map((p) => ({ label: `${p.price} (${p.cvr.toFixed(0)}%)`, v: p.rpts, color: C.classic }))}
          />
          <p className="text-[14px] mt-2" style={{ color: C.ink2 }}>
            $18 earns +42% per trial vs $12.
          </p>
        </Panel>
        <Panel title="Users decide in the first week">
          <VBars
            width={330}
            height={440}
            max={14}
            showValues={false}
            xTitle="Days from sign-up to payment"
            data={PAY_DAY.map((v, i) => ({ label: i % 2 === 0 ? String(i) : '', v, color: i <= 6 ? C.classic : C.neutral }))}
          />
          <p className="text-[14px] mt-2" style={{ color: C.ink2 }}>
            74% of payers pay within 7 days.
          </p>
        </Panel>
      </div>
    ),
  },
  {
    id: 'reco',
    title: 'Recommendation: expand, measure properly, fix the instruments',
    notes:
      'Expand to 90% with a 10% random holdout. Fix Android tracking as a P0 and rebuild the dashboard by channel. Then act on what we learned: Guided 2.0 focused on the third task, test the $18 price and a 7-day trial, and audit Creator Campaign acquisition cost. I am explicit about what would change my mind.',
    render: () => (
      <div className="h-full grid grid-cols-[1fr_380px] gap-8">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl px-6 py-5" style={{ background: C.ink, color: '#fff' }}>
            <div className="text-[30px] font-semibold leading-tight">Guided to 90% of new users, 10% random holdout.</div>
            <div className="text-[15px] mt-1 opacity-75">≈ +39 paying customers / month at full rollout · +31% revenue per trial</div>
          </div>
          <table className="deck-table deck-table-lg">
            <tbody>
              {[
                ['Now', 'Fix Android 3.2 task tracking (P0)'],
                ['Now', 'Rebuild the dashboard: by channel, complete cohorts, UTC'],
                ['Month 1', 'Guided 2.0: get users to 3 tasks in 72 h'],
                ['Month 1', 'Test $15 vs $18 with 90-day retention'],
                ['Month 2', 'Test a 7-day trial · audit Creator Campaign CAC'],
              ].map(([w, a]) => (
                <tr key={a}>
                  <td style={{ width: 110, color: C.classic, fontWeight: 600 }}>{w}</td>
                  <td style={{ color: C.ink }}>{a}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Panel title="What would change my mind" className="self-start">
          <Bullets
            size={15.5}
            items={[
              'Holdout lift below 2 pp after 6 weeks',
              'Guided users churn more in months 2–3',
              "Android activation doesn't recover after the fix",
            ]}
          />
        </Panel>
      </div>
    ),
  },
  {
    id: 'appendix',
    title: 'Appendix: definitions and data notes',
    notes: 'Reference for reviewers.',
    render: () => (
      <div className="h-full grid grid-cols-2 gap-10 text-[14px]" style={{ color: C.ink2 }}>
        <div className="space-y-3">
          <p>
            <strong>Activation:</strong> ≥1 project and ≥3 tasks within 7 days of sign-up.
          </p>
          <p>
            <strong>Conversion:</strong> paid ≤14 days after sign-up. Complete cohorts = signed up by Jul 24.
          </p>
          <p>
            <strong>Revenue per trial:</strong> first-month price if converted, else 0 (not LTV).
          </p>
          <p>
            <strong>Rate / mix split:</strong> Rate<sub>c</sub> = w<sub>post</sub> × Δr<sub>c</sub>; Mix<sub>c</sub> = Δw<sub>c</sub> × (r<sub>pre,c</sub> − R
            <sub>pre</sub>). Sums exactly to −3.7 pp.
          </p>
          <p>
            <strong>Confidence intervals:</strong> 95%, difference of two proportions. Controlled lift: 12 channel × platform strata.
          </p>
        </div>
        <div className="space-y-3">
          <p>
            <strong>Android 3.2:</strong> tasks per user 2.81 → 0.94; activation on 3.2 excluded where noted.
          </p>
          <p>
            <strong>Clock skew:</strong> 1,928 events stamped before sign-up. Correcting it doesn't change Guided's lift (+7.4 vs +7.6 pp).
          </p>
          <p>
            <strong>Incomplete cohorts:</strong> 122 users from Jul 25 lack 14 days; results hold on complete cohorts (+8.7 pp).
          </p>
          <p>
            <strong>Price:</strong> assigned ~25/55/20 across all segments (natural experiment); elasticity −0.14.
          </p>
          <p>
            <strong>Data:</strong> trial_users (1,800) and product_events (10,220) in PostgreSQL. Synthetic case data.
          </p>
        </div>
      </div>
    ),
  },
]

// ------------------------------------------------------------------ Página

function useScale(ref: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setScale(Math.min(width / W, height / H))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return scale
}

function renderSlide(s: SlideDef, i: number, total: number, footer?: string) {
  return (
    <Frame n={i + 1} total={total} title={s.title || undefined} footer={footer}>
      {s.render()}
    </Frame>
  )
}

export function Deck() {
  return <DeckViewer slides={SLIDES} route="deck-analisis" title="Analysis deck · Guided Onboarding" pdf="/TaskNest_Analysis_Deck_EN.pdf" />
}

export function DeckViewer({ slides: SLIDES, route, title, pdf, footer }: { slides: SlideDef[]; route: string; title: string; pdf: string; footer?: string }) {
  const print = location.hash.includes('/print')
  const initial = () => {
    const m = location.hash.match(new RegExp(`${route}/(\\d+)`))
    return m ? Math.min(SLIDES.length - 1, Math.max(0, Number(m[1]) - 1)) : 0
  }
  const [i, setI] = useState(initial)
  const [notes, setNotes] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const scale = useScale(stageRef)

  useEffect(() => {
    if (!print) history.replaceState(null, '', `#/${route}/${i + 1}`)
  }, [i, print, route])

  useEffect(() => {
    if (print) return
    const on = (e: KeyboardEvent) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) setI((x) => Math.min(SLIDES.length - 1, x + 1))
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) setI((x) => Math.max(0, x - 1))
      else if (e.key === 'Home') setI(0)
      else if (e.key === 'End') setI(SLIDES.length - 1)
      else if (e.key.toLowerCase() === 'n') setNotes((v) => !v)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [print])

  if (print)
    return (
      <div className="deck deck-print">
        {SLIDES.map((s, k) => (
          <div key={s.id} className="deck-page">
            {renderSlide(s, k, SLIDES.length, footer)}
          </div>
        ))}
      </div>
    )

  return (
    <div className="deck deck-viewer h-screen flex flex-col">
      <div className="h-12 shrink-0 flex items-center gap-3 px-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <a href="#/" className="inline-flex items-center gap-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={14} /> Inicio
        </a>
        <span className="text-[13px] font-semibold ml-2">{title}</span>
        <div className="ml-auto flex items-center gap-2">
          <button className="chip" aria-pressed={notes} onClick={() => setNotes((v) => !v)} title="Speaker notes (N)">
            <StickyNote size={14} /> Notes
          </button>
          <a className="chip" href={pdf} download>
            <Download size={14} /> PDF
          </a>
        </div>
      </div>

      <div ref={stageRef} className="flex-1 min-h-0 relative overflow-hidden">
        <div
          className="absolute shadow-xl"
          style={{ width: W, height: H, left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(${scale * 0.96})`, transformOrigin: 'center' }}
        >
          {renderSlide(SLIDES[i], i, SLIDES.length, footer)}
        </div>
      </div>

      {notes && (
        <div className="shrink-0 max-h-[22vh] overflow-auto px-6 py-3 border-t text-[14px] leading-relaxed" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
          <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Speaker notes · slide {i + 1}
          </div>
          {SLIDES[i].notes}
        </div>
      )}

      <div className="h-14 shrink-0 flex items-center justify-center gap-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button className="chip" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} aria-label="Previous slide">
          <ChevronLeft size={16} />
        </button>
        <div className="flex gap-1.5" role="tablist" aria-label="Slides">
          {SLIDES.map((s, k) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={k === i}
              aria-label={`Slide ${k + 1}`}
              onClick={() => setI(k)}
              className="h-2 rounded-full transition-all"
              style={{ width: k === i ? 22 : 8, background: k === i ? 'var(--accent)' : 'var(--axis)' }}
            />
          ))}
        </div>
        <button className="chip" onClick={() => setI((x) => Math.min(SLIDES.length - 1, x + 1))} disabled={i === SLIDES.length - 1} aria-label="Next slide">
          <ChevronRight size={16} />
        </button>
        <span className="text-[12px] tnum ml-2" style={{ color: 'var(--text-muted)' }}>
          {i + 1} / {SLIDES.length} · ← → to navigate · N for notes
        </span>
      </div>
    </div>
  )
}
