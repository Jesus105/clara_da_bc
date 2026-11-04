import { ArrowDown, ArrowRight, Check } from 'lucide-react'
import { C } from '../deck/charts'
import { Bullets, Callout, DeckViewer, Panel, type SlideDef, Stat } from './Deck'

// Deck de uso de IA (nota de IA que pide el brief), en el mismo formato corto del deck de análisis.

type Owner = 'AI' | 'Me' | 'Both'
const OWNER: Record<Owner, { label: string; bg: string; fg: string }> = {
  AI: { label: 'AI-led · I reviewed', bg: '#eef4fc', fg: '#184f95' },
  Me: { label: 'I led · AI executed', bg: '#fdeee6', fg: '#8a3a12' },
  Both: { label: 'Together', bg: '#f3f2ef', fg: C.ink2 },
}

function OwnerTag({ o }: { o: Owner }) {
  return (
    <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: OWNER[o].bg, color: OWNER[o].fg }}>
      {OWNER[o].label}
    </span>
  )
}

function Node({ title, sub, dark }: { title: string; sub?: string; dark?: boolean }) {
  return (
    <div
      className="rounded-xl border px-4 py-3 text-center"
      style={{ borderColor: dark ? C.ink : C.grid, background: dark ? C.ink : C.surface, color: dark ? '#fff' : C.ink }}
    >
      <div className="text-[16px] font-semibold">{title}</div>
      {sub && (
        <div className="text-[12px] mt-0.5" style={{ color: dark ? 'rgba(255,255,255,0.7)' : C.ink2 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

const STEPS: { n: number; t: string; o: Owner; out: string }[] = [
  { n: 1, t: 'Understand the business problem', o: 'Both', out: 'Case framing, timeline, hypotheses' },
  { n: 2, t: 'Load the data into PostgreSQL', o: 'AI', out: 'Schema, indexes, views (Docker)' },
  { n: 3, t: 'Connect Claude Code through MCP', o: 'AI', out: 'Read-only, live SQL' },
  { n: 4, t: 'Review the data assumptions', o: 'Me', out: '9 issues caught and fixed' },
  { n: 5, t: 'Business + data + AI → analysis', o: 'Me', out: 'Findings and recommendation' },
  { n: 6, t: 'Build the deliverables', o: 'AI', out: 'Report, dashboard, deck' },
  { n: 7, t: 'Abstract it into a skill', o: 'Both', out: 'tasknest-analyst' },
]

const SLIDES: SlideDef[] = [
  {
    id: 'title',
    title: '',
    notes:
      'The brief asked how AI influenced the work and how I validated it. Short version: AI did most of the execution (SQL, code, drafts); I framed the problem, chose the methods, made every judgment call, and verified every number against the raw data.',
    render: () => (
      <div className="h-full flex flex-col justify-center pb-6">
        <div className="text-[14px] font-semibold uppercase tracking-wide mb-4" style={{ color: C.classic }}>
          TaskNest · AI-use note
        </div>
        <h1 className="text-[52px] leading-[1.08] font-semibold max-w-[1080px]" style={{ color: C.ink }}>
          AI did the heavy lifting. I made the calls and checked every number.
        </h1>
        <div className="mt-14 flex gap-16">
          <Stat value="7 steps" label="From business question to a reusable skill" />
          <Stat value="9 issues" label="Caught in AI-drafted material before the CPO saw them" />
          <Stat value="1 source" label="Every number is SQL on the raw tables" />
        </div>
        <p className="mt-14 text-[13px]" style={{ color: C.muted }}>
          Tools: Claude Code (Claude) · PostgreSQL 16 in Docker · MCP server for Postgres · React + Vite · Playwright for automated checks
        </p>
      </div>
    ),
  },
  {
    id: 'pipeline',
    title: 'The pipeline: from business question to a reusable skill',
    notes:
      'Seven steps. The tag on each one says who led it. Setup and building were AI-led with my review; the two steps that decide the answer, reviewing assumptions and the analysis itself, were led by me with AI executing.',
    render: () => (
      <div className="h-full flex flex-col justify-center gap-8 pb-4">
        <div className="grid grid-cols-7 gap-2 items-stretch">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative">
              <div
                className="h-full rounded-xl border p-3 flex flex-col"
                style={{ borderColor: s.o === 'Me' ? C.guided : C.grid, background: C.surface, boxShadow: s.o === 'Me' ? `inset 0 0 0 1px ${C.guided}` : undefined }}
              >
                <span
                  className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[14px] font-semibold"
                  style={{ background: s.o === 'Me' ? C.guided : C.classic, color: '#fff' }}
                >
                  {s.n}
                </span>
                <div className="text-[15px] font-semibold mt-3 leading-snug" style={{ color: C.ink }}>
                  {s.t}
                </div>
                <div className="mt-2">
                  <OwnerTag o={s.o} />
                </div>
                <div className="mt-auto pt-4 text-[12.5px]" style={{ color: C.ink2 }}>
                  {s.out}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight size={16} className="absolute top-1/2 -right-[13px] -translate-y-1/2 z-10" style={{ color: C.muted, background: C.surface, borderRadius: 8 }} />
              )}
            </div>
          ))}
        </div>
        <Callout>
          <strong>The two steps that decide the answer (4 and 5) were led by me.</strong> AI accelerated everything around them: setup, queries,
          statistics, code and drafts.
        </Callout>
      </div>
    ),
  },
  {
    id: 'data-layer',
    title: 'Steps 2–3: a data layer built for scale and trust',
    notes:
      'Instead of analyzing spreadsheets, I loaded the two files into PostgreSQL and connected Claude Code to it through a read-only MCP server. That makes every number a query anyone can re-run, the same SQL scales to production volumes, and the AI can read the data but never modify it.',
    render: () => (
      <div className="h-full grid grid-cols-[1fr_380px] gap-12 items-center pb-6">
        <div className="flex flex-col items-center gap-2">
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3 w-full">
            <Node title="CSV files" sub="trial_users · product_events" />
            <ArrowRight size={20} style={{ color: C.muted }} />
            <Node title="PostgreSQL 16" sub="tables · indexes · views" />
            <ArrowRight size={20} style={{ color: C.muted }} />
            <Node title="MCP server" sub="read-only SQL" />
          </div>
          <ArrowDown size={20} style={{ color: C.muted }} className="ml-auto mr-[14%]" />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 w-full">
            <Node title="Me" sub="questions · judgment · review" dark />
            <span className="text-[22px]" style={{ color: C.muted }}>
              ⇄
            </span>
            <Node title="Claude Code" sub="writes and runs SQL, code, drafts" />
          </div>
          <ArrowDown size={20} style={{ color: C.muted }} />
          <div className="grid grid-cols-4 gap-2 w-full">
            {['Report', 'Dashboard', 'Deck', 'Skill'].map((d) => (
              <div key={d} className="rounded-lg py-2 text-center text-[14px] font-semibold" style={{ background: '#eef4fc', color: '#184f95' }}>
                {d}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          {[
            ['Scalable', 'The same SQL works on 1,800 rows or on production volumes.'],
            ['Reproducible', 'Every number is a query anyone can re-run.'],
            ['Safe', 'Read-only MCP: the AI can query the data, never modify it.'],
          ].map(([t, d]) => (
            <div key={t}>
              <div className="text-[22px] font-semibold" style={{ color: C.ink }}>
                {t}
              </div>
              <div className="text-[15px] mt-0.5" style={{ color: C.ink2 }}>
                {d}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'assumptions',
    title: 'Step 4: AI drafts are hypotheses. Nine issues caught before the CPO saw them',
    notes:
      'The first AI-assisted drafts sounded confident and contained real errors: wrong numbers, overstated claims, and biases hidden in the database views. Querying the raw data through the MCP caught all of these. This is the main reason I treat anything AI writes as a draft until it is verified.',
    render: () => (
      <table className="deck-table deck-table-lg" style={{ fontSize: 15.5 }}>
        <thead>
          <tr>
            <th style={{ width: 420 }}>What the draft said</th>
            <th>What the data says</th>
            <th style={{ width: 170 }}>Type</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Revenue per trial Apr–May = $4.85', '$4.82', 'Wrong number'],
            ['Price groups 434 / 970 / 396 users', '450 / 986 / 364', 'Wrong number'],
            ['“Guided wins in 100% of segments”', 'True by channel and platform; 3 of 12 small cells negative', 'Overstated'],
            ['“Guided reduces price sensitivity”', 'Price is just as inelastic in Classic before launch', 'Unsupported'],
            ['“Irrefutable, expand to 100% now”', 'Observational evidence → expand to 90% with a holdout', 'Overconfident'],
            ['Activation view counts events from sign-up only', 'Drops clock-skewed events: evening sign-ups −13 pp', 'Hidden bias'],
            ['Three “complete cohort” definitions in use', 'Unified to one conservative cutoff', 'Inconsistency'],
            ['Pay-day histogram from a rounded view', 'Recomputed unrounded (74% within 7 days holds)', 'Rounding'],
            ['Extraction time read from the MCP output', 'MCP shifts timestamps by the UTC offset; fixed in SQL', 'Tooling'],
          ].map(([a, b, t]) => (
            <tr key={a}>
              <td>
                <span style={{ color: C.ink2, textDecoration: 'line-through', textDecorationColor: C.neg }}>{a}</span>
              </td>
              <td style={{ color: C.ink }}>{b}</td>
              <td style={{ color: C.muted }}>{t}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
  {
    id: 'analysis',
    title: 'Step 5: the analysis was guided by me; AI executed it',
    notes:
      'Division of labor. The judgment calls that determine the answer were mine: what question to answer, what a fair comparison is, how to treat the Android data, which method to use, and how strong a claim the evidence supports. AI wrote and ran the queries and statistics and drafted the material. I reused the rate/mix method from my own BI analyst skill, built at a previous job.',
    render: () => (
      <div className="h-full flex flex-col justify-center gap-6 pb-4">
        <div className="grid grid-cols-2 gap-6">
          <Panel title="I decided">
            <Bullets
              size={17}
              items={[
                'The real question: separate three overlapping changes, not just “did KPIs drop?”',
                'Fair comparison = same weeks (Guided vs Classic), never Pre vs Post',
                'Android 3.2 is a tracking problem, not a behavior change',
                'Method for the drop: rate/mix decomposition from my own BI analyst playbook',
                'Strength of the claim: observational → recommend a 90/10 holdout',
                'Go beyond the question: aha moment, price, timing, channels',
                'What to discard as artifact or noise',
              ]}
            />
          </Panel>
          <Panel title="AI executed" className="self-start">
            <Bullets
              size={17}
              items={[
                'Wrote and ran dozens of SQL queries live through the MCP',
                'Computed confidence intervals, decompositions and stratified lifts',
                'Proposed hypotheses for me to test or reject',
                'Drafted the narrative, the dashboard code and the deck',
                'Re-ran checks every time a definition changed',
              ]}
            />
          </Panel>
        </div>
        <div className="rounded-xl px-5 py-3.5 text-[16px]" style={{ background: C.ink, color: '#fff' }}>
          <strong>Accountability:</strong> every number, assumption and recommendation was reviewed and is owned by me.
        </div>
      </div>
    ),
  },
  {
    id: 'deliverables',
    title: 'Steps 6–7: one source of truth, four deliverables',
    notes:
      'Every deliverable reads from the same SQL, so the numbers agree everywhere. Each one also has its own check: closure of the decomposition, automated browser tests for the dashboard, a visual review of every slide, and 18 SQL templates executed for the skill, plus a simulated new-data load that was rolled back.',
    render: () => (
      <div className="h-full flex flex-col items-center justify-center gap-3 pb-6">
        <div className="w-[360px]">
          <Node title="SQL on PostgreSQL" sub="raw tables · one definition per metric" dark />
        </div>
        <ArrowDown size={20} style={{ color: C.muted }} />
        <div className="grid grid-cols-4 gap-4 w-full mb-3">
          {[
            ['Analysis report', 'Full storytelling and findings', 'Every figure traced to a query; the rate/mix decomposition closes exactly to the total.'],
            ['Interactive dashboard', 'Timeline + segment comparisons', 'SQL export feeds the app; automated browser tests matched SQL on every scenario.'],
            ['Decision deck', '8 slides for the CPO', 'Figures reconciled with the report and dashboard; every slide rendered and reviewed.'],
            ['tasknest-analyst skill', 'Lets stakeholders ask new questions', '18 SQL templates executed and matched baselines; new-data playbook tested with a rolled-back load.'],
          ].map(([t, s, v]) => (
            <div key={t} className="rounded-xl border p-4 flex flex-col" style={{ borderColor: C.grid, background: C.surface }}>
              <div className="text-[18px] font-semibold" style={{ color: C.ink }}>
                {t}
              </div>
              <div className="text-[13.5px] mt-1" style={{ color: C.ink2 }}>
                {s}
              </div>
              <div className="mt-4 pt-3 border-t text-[14.5px] flex gap-2" style={{ borderColor: C.grid, color: C.ink }}>
                <Check size={16} className="shrink-0 mt-0.5" style={{ color: C.classic }} />
                <span>{v}</span>
              </div>
            </div>
          ))}
        </div>
        <Callout>
          The skill encodes what was learned (definitions, pitfalls, methods, baselines), so the next analysis starts where this one ended.
        </Callout>
      </div>
    ),
  },
  {
    id: 'validation',
    title: 'How I validated, and the limits',
    notes:
      'Six controls: raw tables only, exact closure checks, reconciliation across deliverables, artifact and noise tests, automated tests, and my own review of every claim. And the limits I state openly: synthetic data, an observational design, first-payment revenue only, and an AI that can be confidently wrong.',
    render: () => (
      <div className="h-full grid grid-cols-[1fr_400px] gap-10 items-center pb-6">
        <div className="space-y-4">
          {[
            ['Raw tables only', 'Recomputed from trial_users and product_events; pre-built views reviewed, not trusted'],
            ['Closure checks', 'Ratio decompositions sum exactly to the total change'],
            ['Reconciliation', 'Report = dashboard = deck = skill, number by number'],
            ['Artifact and noise tests', 'Every “insight” checked for data issues, mix and sample size'],
            ['Automated tests', '18 SQL blocks executed; browser tests on the dashboard and deck'],
            ['Human review', 'I read and approved every claim and recommendation'],
          ].map(([t, d]) => (
            <div key={t} className="flex gap-3 items-start">
              <span className="w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0" style={{ background: C.classic, color: '#fff' }}>
                <Check size={16} strokeWidth={3} />
              </span>
              <span>
                <span className="block text-[19px] font-semibold" style={{ color: C.ink }}>
                  {t}
                </span>
                <span className="block text-[15.5px]" style={{ color: C.ink2 }}>
                  {d}
                </span>
              </span>
            </div>
          ))}
        </div>
        <Panel title="Limits">
          <Bullets
            size={16}
            items={[
              'Synthetic case data',
              'Rollout not randomized → observational evidence; the holdout provides proof',
              'Revenue is first payment only (no LTV or churn yet)',
              'AI can be confidently wrong → treated as a draft until verified',
            ]}
          />
        </Panel>
      </div>
    ),
  },
]

export function AiDeck() {
  return <DeckViewer slides={SLIDES} route="deck-ia" title="AI-use deck · how the analysis was built" pdf="/TaskNest_AI_Use_Deck_EN.pdf" footer="TaskNest · AI-use note" />
}
