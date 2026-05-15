import { Link } from 'react-router-dom'
import { useSimulations } from '@/hooks/useSimulations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Activity, CheckCircle, XCircle, DollarSign, Clock } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, PieChart, Pie, Legend,
} from 'recharts'
import type { SimulationSummary } from '@/lib/api'

function fmt(n: number, d = 2) { return (n ?? 0).toFixed(d) }

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub?: string
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}<span className="text-xs">{label}</span>
        </div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default function Analytics() {
  const { data: simulations, isLoading } = useSimulations()
  const completed = simulations?.filter(s => s.status === 'COMPLETED') ?? []
  const failed = simulations?.filter(s => s.status === 'FAILED') ?? []
  const total = simulations?.length ?? 0

  // Aggregate stats across completed runs
  const totalCloudlets = completed.reduce((acc, s) => acc + s.totalCloudlets, 0)
  const totalCompleted = completed.reduce((acc, s) => acc + s.completedCloudlets, 0)
  const totalFailed = completed.reduce((acc, s) => acc + s.failedCloudlets, 0)
  const totalCost = completed.reduce((acc, s) => acc + (s.totalCost ?? 0), 0)
  const avgMakespan = completed.length
    ? completed.reduce((acc, s) => acc + s.makespan, 0) / completed.length
    : 0
  const successRate = totalCloudlets > 0 ? totalCompleted / totalCloudlets : 0

  // Makespan trend (last 20 completed runs, ordered by createdAt)
  const makespanTrend = [...completed]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-20)
    .map((s, i) => ({ run: `#${i + 1}`, makespan: parseFloat(s.makespan.toFixed(2)), name: s.name }))

  // Cloudlet count per run (last 15)
  const cloudletCounts = [...completed]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-15)
    .map((s, i) => ({
      run: `#${i + 1}`,
      completed: s.completedCloudlets,
      failed: s.failedCloudlets,
      name: s.name,
    }))

  // Status distribution pie
  const statusData = [
    { name: 'Completed', value: completed.length, color: '#10b981' },
    { name: 'Failed', value: failed.length, color: '#ef4444' },
    { name: 'Other', value: total - completed.length - failed.length, color: '#94a3b8' },
  ].filter(d => d.value > 0)

  // Cost per run
  const costTrend = [...completed]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-15)
    .map((s, i) => ({ run: `#${i + 1}`, cost: parseFloat((s.totalCost ?? 0).toFixed(4)), name: s.name }))

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="font-semibold">Analytics</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-8 space-y-6">

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="pt-4 space-y-2">
                  <Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-24" />
                </CardContent></Card>
              ))}
            </div>
            <Card><CardContent className="py-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          </div>
        ) : total === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Activity className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No simulations yet. Run one to see analytics.</p>
              <Button asChild size="sm" className="mt-4">
                <Link to="/simulations/new">New Simulation</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── KPI row ── */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard icon={<Activity className="h-4 w-4" />}
                label="Total Runs" value={String(total)}
                sub={`${completed.length} completed · ${failed.length} failed`} />
              <StatCard icon={<CheckCircle className="h-4 w-4" />}
                label="Cloudlet Success Rate" value={`${(successRate * 100).toFixed(1)}%`}
                sub={`${totalCompleted} / ${totalCloudlets} cloudlets`} />
              <StatCard icon={<Clock className="h-4 w-4" />}
                label="Avg Makespan" value={`${fmt(avgMakespan)}s`}
                sub="across completed runs" />
              <StatCard icon={<DollarSign className="h-4 w-4" />}
                label="Total Cost" value={`$${fmt(totalCost, 4)}`}
                sub="all completed runs" />
            </div>

            {/* ── Charts row 1: makespan trend + status pie ── */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Makespan Trend</CardTitle>
                  <p className="text-xs text-muted-foreground">Last {makespanTrend.length} completed runs</p>
                </CardHeader>
                <CardContent>
                  {makespanTrend.length < 2 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center">Need at least 2 completed runs</p>
                  ) : (
                    <div style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={makespanTrend} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="run" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={v => `${v}s`} tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={val => [`${(val as number).toFixed(2)}s`, 'Makespan']}
                            labelFormatter={(_: unknown, payload: any) => payload?.[0]?.payload?.name ?? ''}
                          />
                          <Line type="monotone" dataKey="makespan" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Run Status Distribution</CardTitle></CardHeader>
                <CardContent>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                          outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}>
                          {statusData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Legend />
                        <Tooltip formatter={val => [val, 'runs']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Charts row 2: cloudlet counts + cost trend ── */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Cloudlets per Run</CardTitle>
                  <p className="text-xs text-muted-foreground">Last {cloudletCounts.length} completed runs</p>
                </CardHeader>
                <CardContent>
                  {cloudletCounts.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center">No completed runs yet</p>
                  ) : (
                    <div style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cloudletCounts} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                          <XAxis dataKey="run" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(val, name) => [val, name === 'completed' ? 'Completed' : 'Failed']}
                            labelFormatter={(_: unknown, payload: any) => payload?.[0]?.payload?.name ?? ''}
                          />
                          <Legend formatter={n => n === 'completed' ? 'Completed' : 'Failed'} />
                          <Bar dataKey="completed" stackId="cl" fill="#10b981" radius={[0, 0, 0, 0]} isAnimationActive={false} />
                          <Bar dataKey="failed" stackId="cl" fill="#ef4444" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Cost per Run</CardTitle>
                  <p className="text-xs text-muted-foreground">Last {costTrend.length} completed runs</p>
                </CardHeader>
                <CardContent>
                  {costTrend.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center">No completed runs yet</p>
                  ) : (
                    <div style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={costTrend} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                          <XAxis dataKey="run" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={val => [`$${(val as number).toFixed(4)}`, 'Total cost']}
                            labelFormatter={(_: unknown, payload: any) => payload?.[0]?.payload?.name ?? ''}
                          />
                          <Bar dataKey="cost" fill="#6366f1" radius={3} isAnimationActive={false}>
                            {costTrend.map((_, i) => (
                              <Cell key={i} fill={i === costTrend.length - 1 ? '#8b5cf6' : '#6366f1'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Recent runs table ── */}
            <Card>
              <CardHeader><CardTitle className="text-base">All Runs</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="py-2 pr-4 text-left font-medium">Name</th>
                        <th className="py-2 pr-4 text-left font-medium">Status</th>
                        <th className="py-2 pr-4 text-right font-medium">Cloudlets</th>
                        <th className="py-2 pr-4 text-right font-medium">Failed</th>
                        <th className="py-2 pr-4 text-right font-medium">Makespan</th>
                        <th className="py-2 text-right font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(simulations ?? []).map(s => (
                        <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer">
                          <td className="py-1.5 pr-4">
                            <Link to={`/simulations/${s.id}`} className="font-medium hover:underline">{s.name}</Link>
                          </td>
                          <td className="py-1.5 pr-4">
                            <span className={`text-xs font-medium ${
                              s.status === 'COMPLETED' ? 'text-emerald-600' :
                              s.status === 'FAILED' ? 'text-destructive' : 'text-muted-foreground'
                            }`}>{s.status}</span>
                          </td>
                          <td className="py-1.5 pr-4 text-right tabular-nums">
                            {s.status === 'COMPLETED' ? `${s.completedCloudlets}/${s.totalCloudlets}` : '—'}
                          </td>
                          <td className="py-1.5 pr-4 text-right tabular-nums">
                            {s.status === 'COMPLETED'
                              ? <span className={s.failedCloudlets > 0 ? 'text-destructive' : ''}>{s.failedCloudlets}</span>
                              : '—'}
                          </td>
                          <td className="py-1.5 pr-4 text-right tabular-nums">
                            {s.status === 'COMPLETED' ? `${s.makespan.toFixed(2)}s` : '—'}
                          </td>
                          <td className="py-1.5 text-right tabular-nums">
                            {s.status === 'COMPLETED' ? `$${(s.totalCost ?? 0).toFixed(4)}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
