import { useNavigate, Link } from 'react-router-dom'
import { useSavedConfigs, useDeleteSavedConfig } from '@/hooks/useSimulations'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { ArrowLeft, FolderOpen, Play, Trash2 } from 'lucide-react'
import type { SavedConfigMeta } from '@/lib/api'

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

export default function SavedConfigs() {
  const navigate = useNavigate()
  const { data: configs, isLoading } = useSavedConfigs()
  const deleteConfig = useDeleteSavedConfig()

  const handleLoad = (id: number) => {
    navigate('/simulations/new', { state: { savedConfigId: id } })
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this saved config?')) return
    try {
      await deleteConfig.mutateAsync(id)
      toast({ title: 'Config deleted' })
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="font-semibold">Saved Configs</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !configs?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <CardTitle className="mb-1 text-base">No saved configs yet</CardTitle>
              <CardDescription className="mb-6 max-w-xs">
                Configure a simulation and click "Save Config" to save it here for later reuse.
              </CardDescription>
              <Button asChild size="sm">
                <Link to="/simulations/new">New simulation</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y rounded-md border">
            {configs.map((cfg: SavedConfigMeta) => (
              <div key={cfg.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{cfg.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(cfg.createdAt)}</p>
                </div>
                <div className="ml-4 flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleLoad(cfg.id)}>
                    <Play className="h-3.5 w-3.5 mr-1" />Load
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(cfg.id)}
                    disabled={deleteConfig.isPending}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
