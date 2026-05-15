import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSimulations } from '@/hooks/useSimulations'
import { simulationApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, TrendingDown, TrendingUp, Minus, Award } from 'lucide-react'
import type { SummaryStats, SimulationSummary, SimulationResult } from '@/lib/api'

// ── safe number helpers ────────────────────────────────────────────────────────

function n(v: number | undefined): number {
  const x = Number(v)
  return isFinite(x) ? x : 0
}
function fmt(v: number | undefined, d = 2): string {
  return n(v).toFixed(d)
}

// ── delta cell ─────────────────────────────────────────────────────────────────

function Delta({ a, b, lowerIsBetter = false }: { a: number; b: number; lowerIsBetter?: boolean }) {
  const sa = n(a)
  const sb = n(b)
  if (sa === 0 && sb === 0) return <span className="text-muted-foreground text-xs">—</span>
  const diff = sb - sa
  if (Math.abs(diff) < 0.00001) {
    return (
      <span className="text-muted-foreground text-xs flex items-center gap-0.5">
        <Minus className="h-3 w-3" /> same
      </span>
    )
  }
  const improved = lowerIsBetter ? diff < 0 : diff > 0
  const pctRaw = sa !== 0 ? (diff / sa) * 100 : 0
  const pct = isFinite(pctRaw) ? pctRaw.toFixed(1) : '—'
  return (
    <span className={`text-xs flex items-center gap-0.5 ${improved ? 'text-emerald-600' : 'text-destructive'}`}>
      {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {diff > 0 ? '+' : ''}{fmt(diff, 2)} ({diff > 0 ? '+' : ''}{pct}%)
    </span>
  )
}

// ── metric row ─────────────────────────────────────────────────────────────────

function MRow({ label, a, b, lowerIsBetter = false, display }: {
  label: string; a: number | undefined; b: number | undefined
  lowerIsBetter?: boolean; display: (v: number) => string
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4 text-xs text-muted-foreground">{label}</td>
      <td className="py-2 pr-4 text-right tabular-nums text-sm font-medium">{display(n(a))}</td>
      <td className="py-2 pr-4 text-right tabular-nums text-sm font-medium">{display(n(b))}</td>
      <td className="py-2 text-right"><Delta a={n(a)} b={n(b)} lowerIsBetter={lowerIsBetter} /></td>
    </tr>
  )
}

// ── scorecard ──────────────────────────────────────────────────────────────────

function Scorecard({ sA, sB, nameA, nameB }: {
  sA: SummaryStats; sB: SummaryStats; nameA: string; nameB: string
}) {
  const rateA = n(sA.totalCloudlets) > 0 ? n(sA.completedCloudlets) / n(sA.totalCloudlets) : 0
  const rateB = n(sB.totalCloudlets) > 0 ? n(sB.completedCloudlets) / n(sB.totalCloudlets) : 0

  const hasEnergy = n(sA.totalEnergyWh) > 0 || n(sB.totalEnergyWh) > 0

  const cats = [
    { label: 'Faster makespan',     a: n(sA.makespan),       b: n(sB.makespan),       lowerBetter: true  },
    { label: 'Higher success rate', a: rateA,                 b: rateB,                lowerBetter: false },
    { label: 'Lower avg wait',      a: n(sA.avgWaitTime),    b: n(sB.avgWaitTime),    lowerBetter: true  },
    { label: 'Lower total cost',    a: n(sA.totalCost),      b: n(sB.totalCost),      lowerBetter: true  },
    { label: 'Higher throughput',   a: n(sA.throughput),     b: n(sB.throughput),     lowerBetter: false },
    { label: 'Fewer SLA violations',a: n(sA.slaViolations),  b: n(sB.slaViolations),  lowerBetter: true  },
    ...(hasEnergy ? [{ label: 'Lower energy use', a: n(sA.totalEnergyWh), b: n(sB.totalEnergyWh), lowerBetter: true }] : []),
  ].map(c => {
    const tie = Math.abs(c.a - c.b) < 0.00001
    const winsA = !tie && (c.lowerBetter ? c.a < c.b : c.a > c.b)
    return { ...c, tie, winsA }
  })

  const winsA = cats.filter(c => !c.tie && c.winsA).length
  const winsB = cats.filter(c => !c.tie && !c.winsA).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className={`rounded-lg p-3 ${winsA >= winsB ? 'bg-indigo-500/10 border border-indigo-500/30' : 'bg-muted/40'}`}>
          <p className="text-xs text-muted-foreground truncate mb-1">{nameA}</p>
          <p className="text-3xl font-bold">{winsA}</p>
          <p className="text-xs text-muted-foreground">categories won</p>
          {winsA > winsB && (
            <p className="text-xs text-indigo-500 font-medium mt-1 flex items-center justify-center gap-1">
              <Award className="h-3 w-3" /> Winner
            </p>
          )}
        </div>
        <div className={`rounded-lg p-3 ${winsB > winsA ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-muted/40'}`}>
          <p className="text-xs text-muted-foreground truncate mb-1">{nameB}</p>
          <p className="text-3xl font-bold">{winsB}</p>
          <p className="text-xs text-muted-foreground">categories won</p>
          {winsB > winsA && (
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center justify-center gap-1">
              <Award className="h-3 w-3" /> Winner
            </p>
          )}
        </div>
      </div>

      <div className="divide-y rounded-md border text-xs">
        {cats.map(c => (
          <div key={c.label} className="flex items-center px-3 py-1.5">
            <span className={`w-4 shrink-0 font-bold ${!c.tie && c.winsA ? 'text-indigo-500' : 'text-muted-foreground/30'}`}>
              {!c.tie && c.winsA ? '✓' : ''}
            </span>
            <span className="flex-1 text-center text-muted-foreground">{c.label}</span>
            <span className={`w-4 shrink-0 text-right font-bold ${!c.tie && !c.winsA ? 'text-emerald-600' : 'text-muted-foreground/30'}`}>
              {c.tie ? '—' : !c.winsA ? '✓' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── simulation picker ──────────────────────────────────────────────────────────

function RunPicker({ value, onChange, simulations, exclude }: {
  value: number | null; onChange: (id: number) => void
  simulations: SimulationSummary[]; exclude: number | null
}) {
  return (
    <select
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      value={value ?? ''}
      onChange={e => {
        const v = e.target.value
        if (v !== '') onChange(Number(v))
      }}
    >
      <option value="">Select a simulation…</option>
      {simulations
        .filter(s => s.status === 'COMPLETED' && s.id !== exclude)
        .map(s => (
          <option key={s.id} value={String(s.id)}>{s.name} (#{s.id})</option>
        ))}
    </select>
  )
}

// ── summary panel ──────────────────────────────────────────────────────────────

function RunSummaryPanel({ run, label }: { run: SimulationResult; label: string }) {
  const s = run.summary
  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium truncate">{run.name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
        <span>Cloudlets</span><span className="tabular-nums text-right">{n(s?.completedCloudlets)}/{n(s?.totalCloudlets)}</span>
        <span>Makespan</span><span className="tabular-nums text-right">{fmt(s?.makespan)}s</span>
        <span>Avg exec</span><span className="tabular-nums text-right">{fmt(s?.avgExecTime)}s</span>
        <span>Total cost</span><span className="tabular-nums text-right">${fmt(s?.totalCost, 4)}</span>
      </div>
    </div>
  )
}

// ── main ───────────────────────────────────────────────────────────────────────

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams()

  const rawA = searchParams.get('a')
  const rawB = searchParams.get('b')
  const idA = rawA && !isNaN(Number(rawA)) ? Number(rawA) : null
  const idB = rawB && !isNaN(Number(rawB)) ? Number(rawB) : null

  const { data: simulations, isLoading: simsLoading } = useSimulations()

  const { data: runA, isLoading: loadingA, isError: errA } = useQuery({
    queryKey: ['sim-compare', idA],
    queryFn: () => simulationApi.get(idA!),
    enabled: idA !== null && idA > 0,
    staleTime: 60_000,
    retry: 1,
  })

  const { data: runB, isLoading: loadingB, isError: errB } = useQuery({
    queryKey: ['sim-compare', idB],
    queryFn: () => simulationApi.get(idB!),
    enabled: idB !== null && idB > 0,
    staleTime: 60_000,
    retry: 1,
  })

  function pick(side: 'a' | 'b', id: number) {
    setSearchParams(
      prev => { const p = new URLSearchParams(prev); p.set(side, String(id)); return p },
      { replace: true }
    )
  }

  const sA = runA?.summary
  const sB = runB?.summary
  const bothSelected = idA !== null && idB !== null
  const loading = (idA !== null && loadingA) || (idB !== null && loadingB)
  const ready = bothSelected && !loading && !!sA && !!sB

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="font-semibold">Compare Simulations</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-8 space-y-6">

        {/* Pickers */}
        <Card>
          <CardHeader><CardTitle className="text-base">Select Two Runs</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Run A — baseline</p>
              {simsLoading ? <Skeleton className="h-9 w-full" /> : (
                <RunPicker value={idA} onChange={id => pick('a', id)}
                  simulations={simulations ?? []} exclude={idB} />
              )}
              {runA && <RunSummaryPanel run={runA} label="A" />}
              {errA && <p className="text-xs text-destructive">Failed to load this simulation.</p>}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Run B — comparison</p>
              {simsLoading ? <Skeleton className="h-9 w-full" /> : (
                <RunPicker value={idB} onChange={id => pick('b', id)}
                  simulations={simulations ?? []} exclude={idA} />
              )}
              {runB && <RunSummaryPanel run={runB} label="B" />}
              {errB && <p className="text-xs text-destructive">Failed to load this simulation.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && (
          <Card><CardContent className="py-6 space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
          </CardContent></Card>
        )}

        {/* Prompt */}
        {!bothSelected && !loading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Select two completed simulations above to compare.</p>
            </CardContent>
          </Card>
        )}

        {/* Comparison */}
        {ready && sA && sB && runA && runB && (
          <>
            {/* Scorecard */}
            <Card>
              <CardHeader><CardTitle className="text-base">Head-to-Head</CardTitle></CardHeader>
              <CardContent>
                <Scorecard sA={sA} sB={sB} nameA={runA.name} nameB={runB.name} />
              </CardContent>
            </Card>

            {/* Full diff table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Metrics Breakdown</CardTitle>
                <p className="text-xs text-muted-foreground">Delta = B minus A. Green = improvement, red = regression.</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="py-2 pr-4 text-left font-medium w-40">Metric</th>
                        <th className="py-2 pr-4 text-right font-medium">
                          <span className="inline-block max-w-[110px] truncate align-bottom">{runA.name}</span>
                        </th>
                        <th className="py-2 pr-4 text-right font-medium">
                          <span className="inline-block max-w-[110px] truncate align-bottom">{runB.name}</span>
                        </th>
                        <th className="py-2 text-right font-medium">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      <MRow label="Total cloudlets"   a={sA.totalCloudlets}     b={sB.totalCloudlets}     display={v => String(Math.round(v))} />
                      <MRow label="Completed"         a={sA.completedCloudlets} b={sB.completedCloudlets} display={v => String(Math.round(v))} />
                      <MRow label="Failed"            a={sA.failedCloudlets}    b={sB.failedCloudlets}    display={v => String(Math.round(v))} lowerIsBetter />
                      <MRow label="Makespan"          a={sA.makespan}           b={sB.makespan}           display={v => `${fmt(v)}s`}          lowerIsBetter />
                      <MRow label="Avg exec time"     a={sA.avgExecTime}        b={sB.avgExecTime}        display={v => `${fmt(v)}s`}          lowerIsBetter />
                      <MRow label="Min exec time"     a={sA.minExecTime}        b={sB.minExecTime}        display={v => `${fmt(v)}s`}          lowerIsBetter />
                      <MRow label="Max exec time"     a={sA.maxExecTime}        b={sB.maxExecTime}        display={v => `${fmt(v)}s`}          lowerIsBetter />
                      <MRow label="p95 exec time"     a={sA.p95ExecTime}        b={sB.p95ExecTime}        display={v => `${fmt(v)}s`}          lowerIsBetter />
                      <MRow label="Avg wait time"     a={sA.avgWaitTime}        b={sB.avgWaitTime}        display={v => `${fmt(v)}s`}          lowerIsBetter />
                      <MRow label="Max wait time"     a={sA.maxWaitTime}        b={sB.maxWaitTime}        display={v => `${fmt(v)}s`}          lowerIsBetter />
                      <MRow label="Throughput"        a={sA.throughput}         b={sB.throughput}         display={v => `${fmt(v)} cl/s`} />
                      <MRow label="Total cost"        a={sA.totalCost}          b={sB.totalCost}          display={v => `$${fmt(v, 4)}`}       lowerIsBetter />
                      <MRow label="SLA violations"    a={sA.slaViolations}      b={sB.slaViolations}      display={v => String(Math.round(v))} lowerIsBetter />
                      <MRow label="SLA violation rate" a={sA.slaViolationRate}  b={sB.slaViolationRate}   display={v => `${(v * 100).toFixed(1)}%`} lowerIsBetter />
                      {(n(sA.totalEnergyWh) > 0 || n(sB.totalEnergyWh) > 0) && (<>
                        <MRow label="Total energy"    a={sA.totalEnergyWh}      b={sB.totalEnergyWh}      display={v => `${fmt(v, 3)} Wh`}           lowerIsBetter />
                        <MRow label="Avg power"       a={sA.avgPowerW}          b={sB.avgPowerW}          display={v => `${fmt(v, 1)} W`}            lowerIsBetter />
                      </>)}
                      {(n(sA.injectedFailures) > 0 || n(sB.injectedFailures) > 0) && (
                        <MRow label="Injected failures" a={sA.injectedFailures} b={sB.injectedFailures}   display={v => String(Math.round(v))} lowerIsBetter />
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Jump links */}
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/simulations/${idA}`}>Full result: {runA.name}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/simulations/${idB}`}>Full result: {runB.name}</Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
