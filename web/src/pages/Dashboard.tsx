import { Link } from 'react-router-dom'
import { useLogout, useAuth } from '@/hooks/useAuth'
import { useSimulations } from '@/hooks/useSimulations'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { LogOut, Plus, Activity, Folder, Moon, Sun, BarChart2, GitCompare, Shuffle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { SimulationStatus } from '@/lib/api'

function StatusBadge({ status }: { status: SimulationStatus }) {
  const variants = {
    COMPLETED: 'success',
    FAILED: 'destructive',
    RUNNING: 'warning',
    QUEUED: 'secondary',
  } as const
  return <Badge variant={variants[status] ?? 'default'}>{status}</Badge>
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

export default function Dashboard() {
  const { data: user } = useAuth()
  const logout = useLogout()
  const { data: simulations, isLoading } = useSimulations()
  const { dark, toggle: toggleDark } = useDarkMode()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <span className="font-semibold">OpenCloud</span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/analytics"><BarChart2 className="h-4 w-4 mr-1" />Analytics</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/compare"><GitCompare className="h-4 w-4 mr-1" />Compare</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sweep"><Shuffle className="h-4 w-4 mr-1" />Sweep</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/configs"><Folder className="h-4 w-4 mr-1" />Saved</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleDark} aria-label="Toggle dark mode">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Simulations</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Run and review your Cloud experiments
            </p>
          </div>
          <Button asChild>
            <Link to="/simulations/new">
              <Plus className="h-4 w-4" />
              New simulation
            </Link>
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="divide-y rounded-md border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-20 shrink-0" />
              </div>
            ))}
          </div>
        ) : !simulations?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Activity className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <CardTitle className="mb-1 text-base">No simulations yet</CardTitle>
              <CardDescription className="mb-6 max-w-xs">
                Pick a template, configure your infrastructure, and run your first simulation.
              </CardDescription>
              <Button asChild size="sm">
                <Link to="/simulations/new">
                  <Plus className="h-4 w-4" />
                  New simulation
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y rounded-md border">
            {simulations.map(sim => (
              <Link key={sim.id} to={`/simulations/${sim.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{sim.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(sim.createdAt)}</p>
                </div>
                <div className="ml-4 flex items-center gap-4 shrink-0">
                  {sim.status === 'COMPLETED' && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {sim.completedCloudlets}/{sim.totalCloudlets} cloudlets · {sim.makespan.toFixed(1)}s
                    </span>
                  )}
                  <StatusBadge status={sim.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
