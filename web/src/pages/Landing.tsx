import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  ArrowRight, Server, BarChart3, Zap, Settings2,
  CheckCircle, Layers, Cpu, Database, Activity,
} from 'lucide-react'

// ── mock simulation card shown in hero ────────────────────────────────────────

const MOCK_BARS = [
  { vm: 'VM 0', offset: 0,  width: 78, color: '#6366f1', label: 'CL 0' },
  { vm: 'VM 0', offset: 0,  width: 58, color: '#8b5cf6', label: 'CL 1' },
  { vm: 'VM 1', offset: 0,  width: 100, color: '#ec4899', label: 'CL 2' },
  { vm: 'VM 1', offset: 0,  width: 68, color: '#f59e0b', label: 'CL 3' },
]

function MockCard() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_80px_rgba(99,102,241,0.15)] backdrop-blur-sm overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-red-500/70" />
        <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
        <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
        <span className="ml-2 text-xs text-white/40 font-mono">opencloud — simulation #0042</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Status row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="text-sm font-semibold text-white">Multi-DC Production Sim</span>
          </div>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
            COMPLETED
          </span>
        </div>

        {/* Config summary */}
        <div className="flex gap-3 text-[11px] text-white/40">
          <span className="flex items-center gap-1"><Server className="h-3 w-3" />2 datacenters</span>
          <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />6 VMs</span>
          <span className="flex items-center gap-1"><Database className="h-3 w-3" />12 cloudlets</span>
        </div>

        {/* Mini Gantt */}
        <div className="space-y-2">
          {['VM 0', 'VM 1'].map((vm, vi) => (
            <div key={vm} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-[11px] text-white/40 font-mono">{vm}</span>
              <div className="relative flex-1 h-5 rounded bg-white/5">
                {MOCK_BARS.filter(b => b.vm === vm).map((b, i) => (
                  <div key={i}
                    className="absolute top-1 h-3 rounded-sm"
                    style={{
                      left: `${b.offset}%`,
                      width: `${b.width * 0.42}%`,
                      background: b.color,
                      opacity: 0.85,
                      marginLeft: i * 2,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-between text-[10px] text-white/25 font-mono pt-0.5 px-12">
            <span>0s</span><span>200s</span><span>400s</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
          {[
            { label: 'Makespan', value: '400.01s' },
            { label: 'Avg Exec', value: '200.00s' },
            { label: 'Total Cost', value: '$2.4000' },
          ].map(m => (
            <div key={m.label}>
              <p className="text-[10px] text-white/35">{m.label}</p>
              <p className="text-sm font-semibold text-white tabular-nums">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar row */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-white/40">
            <span>Cloudlets completed</span>
            <span>12 / 12</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10">
            <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── features data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Layers,
    title: 'Multi-Datacenter Topology',
    description:
      'Design complex datacenter hierarchies with heterogeneous hosts, configurable CPU, memory, bandwidth, and storage at every layer of the stack.',
  },
  {
    icon: Settings2,
    title: 'Policy Benchmarking',
    description:
      'Compare time-shared versus space-shared VM schedulers, dynamic workload allocation strategies, and VM placement policies — side by side.',
  },
  {
    icon: Zap,
    title: 'Real-Time Execution',
    description:
      'Submit jobs and track them live. Our execution engine queues and runs simulations sequentially with full stdout capture and live status polling.',
  },
  {
    icon: BarChart3,
    title: 'Deep Analytics',
    description:
      'Gantt charts, per-cloudlet execution timelines, cost breakdowns, and status distribution charts — every run generates a full analytical report.',
  },
]

// ── how it works ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: '01',
    icon: Server,
    title: 'Design Your Topology',
    description:
      'Use the form builder or load one of nine built-in presets. Configure hosts, VMs, scheduling policies, and workloads at any scale.',
  },
  {
    n: '02',
    icon: Activity,
    title: 'Run the Simulation',
    description:
      'Submit your configuration. The engine processes it, captures execution metrics, and streams status back to your browser in real time.',
  },
  {
    n: '03',
    icon: BarChart3,
    title: 'Analyze & Iterate',
    description:
      'Explore Gantt charts, cost tables, and execution breakdowns. Save configurations, tweak parameters, and compare runs.',
  },
]

// ── landing page ──────────────────────────────────────────────────────────────

export default function Landing() {
  const { data: user } = useAuth()
  const isAuthenticated = !!user

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── nav ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#020817]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">OpenCloud</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-white/60 md:flex">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#why" className="hover:text-white transition-colors">Why OpenCloud</a>
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                <Link to="/dashboard">Open Dashboard <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                  <Link to="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── hero ── */}
      <section className="relative overflow-hidden bg-[#020817] pt-14">
        {/* Radial glow */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.22) 0%, transparent 70%)' }} />
        {/* Dot grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:py-32">
          {/* Left */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Cloud Infrastructure Simulation Platform
            </div>

            <h1 className="text-[3.25rem] font-extrabold leading-[1.08] tracking-tight text-white lg:text-[4.5rem]">
              Model Any Cloud.{' '}
              <span className="block bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-500 bg-clip-text text-transparent">
                Test Every Decision.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/55">
              OpenCloud is a browser-based simulation engine for cloud infrastructure.
              Design multi-datacenter environments, benchmark scheduling policies,
              and analyse workload performance — before a single server is provisioned.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25">
                  <Link to="/dashboard">Open Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25">
                    <Link to="/register">Get started free <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/25">
                    <Link to="/login">Sign in</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Quick stats */}
            <div className="mt-10 flex flex-wrap gap-6 border-t border-white/10 pt-8">
              {[
                { value: '100+', label: 'VMs per run' },
                { value: '1 000+', label: 'Cloudlets supported' },
                { value: '9', label: 'Built-in presets' },
                { value: 'Zero', label: 'Infrastructure needed' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-white tabular-nums">{s.value}</p>
                  <p className="text-xs text-white/40">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — mock card */}
          <div className="flex justify-center lg:justify-end">
            <MockCard />
          </div>
        </div>
      </section>

      {/* ── features ── */}
      <section id="features" className="bg-background py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-indigo-500">Capabilities</p>
            <h2 className="text-4xl font-bold tracking-tight">Everything you need to simulate</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              From a single VM to a fleet of heterogeneous datacenters — OpenCloud handles any topology you can describe.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map(f => (
              <div key={f.title}
                className="group rounded-2xl border border-border bg-card p-7 transition-all duration-200 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5">
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/20 transition-colors group-hover:bg-indigo-500/20">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── how it works ── */}
      <section id="how-it-works" className="bg-muted/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-indigo-500">Process</p>
            <h2 className="text-4xl font-bold tracking-tight">From config to insight in three steps</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                {/* connector line */}
                {i < STEPS.length - 1 && (
                  <div className="absolute top-7 left-[calc(50%+2.5rem)] hidden w-[calc(100%-5rem)] h-px bg-gradient-to-r from-indigo-500/40 to-transparent md:block" />
                )}
                <div className="text-center">
                  <div className="relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/25">
                    <step.icon className="h-6 w-6 text-white" />
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-background text-[10px] font-bold text-indigo-500 ring-1 ring-border">
                      {step.n.replace('0', '')}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── why simulate ── */}
      <section id="why" className="bg-[#020817] py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-indigo-400">The Problem</p>
          <h2 className="mb-8 text-4xl font-bold tracking-tight text-white">
            Cloud decisions made without data are{' '}
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">expensive guesses.</span>
          </h2>
          <p className="mb-8 text-lg leading-relaxed text-white/55">
            The wrong VM scheduler wastes CPU. An undersized host pool creates resource contention.
            Misconfigured bandwidth allocation stalls time-sensitive workloads.
            These aren't edge cases — they're everyday engineering decisions that affect performance and cost at scale.
          </p>
          <p className="mb-12 text-lg leading-relaxed text-white/55">
            OpenCloud gives engineers a sandboxed environment to run those experiments first.
            Model the topology, simulate the load, read the results — then build with confidence.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: CheckCircle, text: 'Validate assumptions before production' },
              { icon: CheckCircle, text: 'Benchmark competing scheduling strategies' },
              { icon: CheckCircle, text: 'Forecast infrastructure costs accurately' },
            ].map(item => (
              <div key={item.text}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-left text-sm text-white/70">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── final cta ── */}
      <section className="relative overflow-hidden bg-background py-24">
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <h2 className="mt-4 text-4xl font-bold tracking-tight">Start simulating today.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Free to use. No infrastructure required. No credit card.
            Set up your first simulation in under two minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {isAuthenticated ? (
              <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25">
                <Link to="/dashboard">Open Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25">
                  <Link to="/register">Create free account <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/login">Sign in</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── footer ── */}
      <footer className="border-t bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-indigo-500 to-violet-600">
              <Activity className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-foreground">OpenCloud</span>
          </div>
          <p>Simulate infrastructure. Make better decisions.</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link to="/register" className="hover:text-foreground transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
