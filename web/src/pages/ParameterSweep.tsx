import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSimulations } from '@/hooks/useSimulations'
import { simulationApi, sweepApi } from '@/lib/api'
import type { SweepDimension, SweepResult, SweepConfig } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Play, AlertCircle } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ── helpers ────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
      {...props}
    />
  )
}

function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
      {...props}
    />
  )
}

const DIMENSION_LABELS: Record<SweepDimension, string> = {
  VM_COUNT:        'VM Count',
  VM_MIPS:         'VM MIPS',
  HOST_COUNT:      'Host Count',
  CLOUDLET_COUNT:  'Cloudlet Count',
  CLOUDLET_LENGTH: 'Cloudlet Length (MI)',
}

const METRIC_KEYS = [
  { key: 'makespan',          label: 'Makespan (s)',      color: '#6366f1' },
  { key: 'avgExecTime',       label: 'Avg Exec Time (s)', color: '#f59e0b' },
  { key: 'totalCost',         label: 'Total Cost ($)',    color: '#10b981' },
  { key: 'throughput',        label: 'Throughput (cl/s)', color: '#ef4444' },
  { key: 'avgWaitTime',       label: 'Avg Wait Time (s)', color: '#8b5cf6' },
  { key: 'totalEnergyWh',     label: 'Energy (Wh)',       color: '#f97316' },
] as const

type MetricKey = typeof METRIC_KEYS[number]['key']

// ── result chart ───────────────────────────────────────────────────────────────

function SweepChart({ result, dimension }: { result: SweepResult; dimension: SweepDimension }) {
  const [selected, setSelected] = useState<MetricKey>('makespan')

  const metric = METRIC_KEYS.find(m => m.key === selected)!
  const data = result.points.map(p => ({
    param: p.paramValue,
    value: (p.summary as unknown as Record<string, number>)[selected] ?? 0,
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {METRIC_KEYS.map(m => (
          <button
            key={m.key}
            onClick={() => setSelected(m.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
              ${selected === m.key
                ? 'bg-indigo-500 text-white border-indigo-500'
                : 'bg-background text-muted-foreground border-input hover:bg-muted/50'
              }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="param"
            label={{ value: DIMENSION_LABELS[dimension], position: 'insideBottom', offset: -4, fontSize: 11 }}
            tick={{ fontSize: 11 }}
          />
          <YAxis tick={{ fontSize: 11 }} width={60} />
          <Tooltip
            formatter={(v: number) => [v.toFixed(4), metric.label]}
            labelFormatter={(l: number) => `${DIMENSION_LABELS[dimension]}: ${l}`}
          />
          <Legend verticalAlign="top" height={28} />
          <Line
            type="monotone"
            dataKey="value"
            name={metric.label}
            stroke={metric.color}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── result table ───────────────────────────────────────────────────────────────

function SweepTable({ result, dimension }: { result: SweepResult; dimension: SweepDimension }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="py-2 pr-3 text-left font-medium">{DIMENSION_LABELS[dimension]}</th>
            <th className="py-2 pr-3 text-right font-medium">Makespan (s)</th>
            <th className="py-2 pr-3 text-right font-medium">Completed</th>
            <th className="py-2 pr-3 text-right font-medium">Avg Exec (s)</th>
            <th className="py-2 pr-3 text-right font-medium">Throughput</th>
            <th className="py-2 pr-3 text-right font-medium">Total Cost</th>
            <th className="py-2 pr-3 text-right font-medium">Energy (Wh)</th>
          </tr>
        </thead>
        <tbody>
          {result.points.map((p, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="py-2 pr-3 tabular-nums font-medium">{p.paramValue}</td>
              <td className="py-2 pr-3 tabular-nums text-right">{p.summary.makespan.toFixed(2)}</td>
              <td className="py-2 pr-3 tabular-nums text-right">
                {p.summary.completedCloudlets}/{p.summary.totalCloudlets}
              </td>
              <td className="py-2 pr-3 tabular-nums text-right">{p.summary.avgExecTime.toFixed(2)}</td>
              <td className="py-2 pr-3 tabular-nums text-right">{p.summary.throughput.toFixed(3)}</td>
              <td className="py-2 pr-3 tabular-nums text-right">${p.summary.totalCost.toFixed(4)}</td>
              <td className="py-2 pr-3 tabular-nums text-right">
                {p.summary.totalEnergyWh > 0 ? p.summary.totalEnergyWh.toFixed(3) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── main ───────────────────────────────────────────────────────────────────────

export default function ParameterSweep() {
  const { data: simulations, isLoading: simsLoading } = useSimulations()

  const [baseSimId, setBaseSimId] = useState<number | null>(null)
  const [sweepName, setSweepName] = useState('')
  const [dimension, setDimension] = useState<SweepDimension>('VM_COUNT')
  const [start, setStart] = useState('2')
  const [end, setEnd] = useState('8')
  const [step, setStep] = useState('2')

  const { data: baseSim, isLoading: baseSimLoading } = useQuery({
    queryKey: ['sim-sweep-base', baseSimId],
    queryFn: () => simulationApi.get(baseSimId!),
    enabled: baseSimId !== null,
    staleTime: 60_000,
  })

  const sweep = useMutation({
    mutationFn: (cfg: SweepConfig) => sweepApi.run(cfg),
  })

  const completedSims = simulations?.filter(s => s.status === 'COMPLETED') ?? []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!baseSim) return

    const startN = parseFloat(start)
    const endN = parseFloat(end)
    const stepN = parseFloat(step)

    if (isNaN(startN) || isNaN(endN) || isNaN(stepN) || stepN <= 0 || startN > endN) return

    const points = Math.ceil((endN - startN) / stepN) + 1
    if (points > 10) {
      alert(`This sweep would generate ${points} points, which exceeds the 10-point limit. Reduce the range or increase the step.`)
      return
    }

    const cfg: SweepConfig = {
      name: sweepName || `Sweep: ${DIMENSION_LABELS[dimension]}`,
      baseConfig: baseSim.config,
      dimension,
      start: startN,
      end: endN,
      step: stepN,
    }
    sweep.mutate(cfg)
  }

  const pointCount = (() => {
    const s = parseFloat(start), e = parseFloat(end), st = parseFloat(step)
    if (isNaN(s) || isNaN(e) || isNaN(st) || st <= 0 || s > e) return null
    return Math.ceil((e - s) / st) + 1
  })()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="font-semibold">Parameter Sweep</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-8 space-y-6">

        {/* Config form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sweep Configuration</CardTitle>
            <p className="text-xs text-muted-foreground">
              Vary one dimension across a range and collect performance metrics at each point. Max 10 points.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Base simulation */}
              <Field label="Base simulation">
                {simsLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select
                    value={baseSimId ?? ''}
                    onChange={e => setBaseSimId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Select a completed simulation…</option>
                    {completedSims.map(s => (
                      <option key={s.id} value={String(s.id)}>{s.name} (#{s.id})</option>
                    ))}
                  </Select>
                )}
                {baseSimId !== null && baseSimLoading && (
                  <p className="text-xs text-muted-foreground">Loading base config…</p>
                )}
                {baseSim && (
                  <p className="text-xs text-muted-foreground">
                    {baseSim.config.vms.length} VMs · {baseSim.config.cloudlets.length} cloudlets ·{' '}
                    {baseSim.config.datacenters.reduce((s, d) => s + d.hosts.length, 0)} hosts
                  </p>
                )}
              </Field>

              {/* Sweep name */}
              <Field label="Sweep name">
                <Input
                  placeholder={`Sweep: ${DIMENSION_LABELS[dimension]}`}
                  value={sweepName}
                  onChange={e => setSweepName(e.target.value)}
                />
              </Field>

              {/* Dimension + range */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="col-span-2 sm:col-span-1">
                  <Field label="Dimension">
                    <Select value={dimension} onChange={e => setDimension(e.target.value as SweepDimension)}>
                      {(Object.keys(DIMENSION_LABELS) as SweepDimension[]).map(d => (
                        <option key={d} value={d}>{DIMENSION_LABELS[d]}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="Start">
                  <Input type="number" value={start} onChange={e => setStart(e.target.value)} min="1" step="1" />
                </Field>
                <Field label="End">
                  <Input type="number" value={end} onChange={e => setEnd(e.target.value)} min="1" step="1" />
                </Field>
                <Field label="Step">
                  <Input type="number" value={step} onChange={e => setStep(e.target.value)} min="1" step="1" />
                </Field>
              </div>

              {/* Point count preview */}
              {pointCount !== null && (
                <p className={`text-xs ${pointCount > 10 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {pointCount} point{pointCount !== 1 ? 's' : ''} will be simulated
                  {pointCount > 10 && ' — exceeds 10-point limit'}
                </p>
              )}

              {sweep.isError && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{sweep.error instanceof Error ? sweep.error.message : 'Sweep failed'}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={!baseSim || sweep.isPending || (pointCount !== null && pointCount > 10)}
                className="w-full sm:w-auto"
              >
                {sweep.isPending ? (
                  <>
                    <span className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent mr-2" />
                    Running sweep…
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1.5" />
                    Run sweep
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {sweep.isPending && (
          <Card>
            <CardContent className="py-8 space-y-3">
              <p className="text-sm text-center text-muted-foreground">Running simulations…</p>
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </CardContent>
          </Card>
        )}

        {sweep.data && (() => {
          const result = sweep.data
          return (
            <>
              {/* Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{result.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {result.points.length} data points · dimension: {DIMENSION_LABELS[dimension]}
                  </p>
                </CardHeader>
                <CardContent>
                  <SweepChart result={result} dimension={dimension} />
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Raw Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <SweepTable result={result} dimension={dimension} />
                </CardContent>
              </Card>
            </>
          )
        })()}

      </main>
    </div>
  )
}
