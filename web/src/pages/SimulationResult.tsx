import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSimulationResult } from '@/hooks/useSimulations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Clock, CheckCircle, AlertCircle, Loader2, Download,
  XCircle, DollarSign, Zap, AlertTriangle, Activity, Flame,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import type { CloudletResult, VmStats, HostEnergy, FailureEvent, SimulationStatus, SimulationResult as SimResult } from '@/lib/api'

// ── helpers ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SimulationStatus }) {
  const variants = { COMPLETED: 'success', FAILED: 'destructive', RUNNING: 'warning', QUEUED: 'secondary' } as const
  return <Badge variant={variants[status] ?? 'default'}>{status}</Badge>
}

function fmt(n: number | undefined | null, d = 2) {
  const x = Number(n)
  return isFinite(x) ? x.toFixed(d) : '—'
}
function fmtPct(n: number) { return `${(n * 100).toFixed(1)}%` }

// ── summary card ───────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, sub, highlight }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: 'warn' | 'bad' | 'energy'
}) {
  const border = highlight === 'bad' ? 'border-destructive/40'
    : highlight === 'warn' ? 'border-yellow-500/40'
    : highlight === 'energy' ? 'border-emerald-500/40' : ''
  const textColor = highlight === 'bad' ? 'text-destructive'
    : highlight === 'warn' ? 'text-yellow-600'
    : highlight === 'energy' ? 'text-emerald-600'
    : 'text-muted-foreground'
  return (
    <Card className={border}>
      <CardContent className="pt-4">
        <div className={`flex items-center gap-2 mb-1 ${textColor}`}>
          {icon}<span className="text-xs">{label}</span>
        </div>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ── cloudlet table ─────────────────────────────────────────────────────────────

function CloudletTable({ cloudlets }: { cloudlets: CloudletResult[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="py-2 pr-3 text-left font-medium">ID</th>
            <th className="py-2 pr-3 text-left font-medium">Status</th>
            <th className="py-2 pr-3 text-left font-medium">SLA</th>
            <th className="py-2 pr-3 text-left font-medium">DC</th>
            <th className="py-2 pr-3 text-left font-medium">VM</th>
            <th className="py-2 pr-3 text-right font-medium">Start</th>
            <th className="py-2 pr-3 text-right font-medium">Finish</th>
            <th className="py-2 pr-3 text-right font-medium">Exec (s)</th>
            <th className="py-2 pr-3 text-right font-medium">Wait (s)</th>
            <th className="py-2 text-right font-medium">Cost ($)</th>
          </tr>
        </thead>
        <tbody>
          {cloudlets.map(c => (
            <tr key={c.id} className={`border-b last:border-0 text-xs ${
              c.failureReason ? 'bg-red-500/5' : c.slaViolated ? 'bg-yellow-500/5' : ''
            }`}>
              <td className="py-1.5 pr-3">{c.id}</td>
              <td className="py-1.5 pr-3">
                <Badge variant={c.status === 'SUCCESS' ? 'success' : 'destructive'}>{c.status}</Badge>
              </td>
              <td className="py-1.5 pr-3">
                {c.failureReason
                  ? <span title={c.failureReason}><Flame className="h-3.5 w-3.5 text-red-500" /></span>
                  : c.slaViolated
                  ? <span title="SLA deadline missed"><AlertTriangle className="h-3.5 w-3.5 text-yellow-500" /></span>
                  : <span className="text-muted-foreground/30">—</span>}
              </td>
              <td className="py-1.5 pr-3">{c.datacenterId}</td>
              <td className="py-1.5 pr-3">{c.vmId}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(c.startTime)}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(c.finishTime)}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(c.execTime)}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(c.waitingTime)}</td>
              <td className="py-1.5 text-right tabular-nums">{fmt(c.totalCost, 4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── VM stats table ─────────────────────────────────────────────────────────────

function VmStatsTable({ vmStats }: { vmStats: VmStats[] }) {
  if (!vmStats?.length) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="py-2 pr-4 text-left">VM</th>
            <th className="py-2 pr-4 text-right">Cloudlets</th>
            <th className="py-2 pr-4 text-right">Completed</th>
            <th className="py-2 pr-4 text-right">Avg Exec (s)</th>
            <th className="py-2 pr-4 text-right">Total Cost ($)</th>
            <th className="py-2 text-right">CPU Util.</th>
          </tr>
        </thead>
        <tbody>
          {vmStats.map(v => (
            <tr key={v.vmId} className="border-b last:border-0">
              <td className="py-1.5 pr-4 font-medium">VM {v.vmId}</td>
              <td className="py-1.5 pr-4 text-right tabular-nums">{v.cloudletCount}</td>
              <td className="py-1.5 pr-4 text-right tabular-nums">{v.completedCount}</td>
              <td className="py-1.5 pr-4 text-right tabular-nums">{fmt(v.avgExecTime)}</td>
              <td className="py-1.5 pr-4 text-right tabular-nums">{fmt(v.totalCost, 4)}</td>
              <td className="py-1.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${Math.min(100, v.cpuUtilization * 100).toFixed(1)}%` }} />
                  </div>
                  <span className="tabular-nums text-xs w-10 text-right">{fmtPct(v.cpuUtilization)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── host energy table ──────────────────────────────────────────────────────────

function HostEnergyTable({ hostEnergy }: { hostEnergy: HostEnergy[] }) {
  if (!hostEnergy?.length) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="py-2 pr-4 text-left">Host</th>
            <th className="py-2 pr-4 text-left">Datacenter</th>
            <th className="py-2 pr-4 text-right">Avg CPU Util.</th>
            <th className="py-2 pr-4 text-right">Avg Power (W)</th>
            <th className="py-2 pr-4 text-right">Peak Power (W)</th>
            <th className="py-2 text-right">Energy (Wh)</th>
          </tr>
        </thead>
        <tbody>
          {hostEnergy.map(h => (
            <tr key={`${h.datacenterName}-${h.hostId}`} className="border-b last:border-0">
              <td className="py-1.5 pr-4 font-medium">Host {h.hostId}</td>
              <td className="py-1.5 pr-4 text-muted-foreground">{h.datacenterName}</td>
              <td className="py-1.5 pr-4 text-right tabular-nums">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${h.avgCpuUtilization > 0.8 ? 'bg-red-500' : h.avgCpuUtilization > 0.5 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, h.avgCpuUtilization * 100).toFixed(1)}%` }} />
                  </div>
                  <span className="text-xs w-10 text-right">{fmtPct(h.avgCpuUtilization)}</span>
                </div>
              </td>
              <td className="py-1.5 pr-4 text-right tabular-nums">{fmt(h.avgPowerW, 1)} W</td>
              <td className="py-1.5 pr-4 text-right tabular-nums">{fmt(h.peakPowerW, 1)} W</td>
              <td className="py-1.5 text-right tabular-nums font-medium text-emerald-600">{fmt(h.energyWh, 4)} Wh</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── failure events ─────────────────────────────────────────────────────────────

function FailureEventsPanel({ events }: { events: FailureEvent[] }) {
  if (!events?.length) return null
  return (
    <div className="space-y-2">
      {events.map((ev, i) => (
        <div key={i} className="rounded-md border border-red-300/40 bg-red-500/5 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-1">
            <Flame className="h-4 w-4" />
            Host {ev.hostId} failed at T={ev.failureTimeS.toFixed(1)}s in {ev.datacenterName}
          </div>
          <p className="text-xs text-muted-foreground">
            {ev.affectedCloudlets} cloudlet{ev.affectedCloudlets !== 1 ? 's' : ''} terminated —
            IDs: {ev.affectedCloudletIds.join(', ')}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── failure diagnosis ──────────────────────────────────────────────────────────

interface DiagnosisItem { severity: 'critical' | 'warning' | 'info'; text: string }
interface Diagnosis { headline: string; causes: DiagnosisItem[]; fixes: DiagnosisItem[] }

function buildDiagnosis(data: SimResult): Diagnosis {
  const s    = data.summary
  const cfg  = data.config
  const cls  = data.cloudlets ?? []
  const evts = data.failureEvents ?? []
  const slaCls = cls.filter(c => c.slaViolated && !c.failureReason)
  const causes: DiagnosisItem[] = []
  const fixes: DiagnosisItem[]  = []

  // ── host failure analysis ──────────────────────────────────────────────────
  if (evts.length > 0) {
    const totalEvents  = evts.reduce((n, ev) => n + ev.affectedCloudlets, 0)
    const uniqueFailed = new Set(evts.flatMap(ev => ev.affectedCloudletIds)).size
    const pct = s.totalCloudlets > 0 ? Math.round(uniqueFailed / s.totalCloudlets * 100) : 0
    causes.push({
      severity: 'critical',
      text: `${evts.length} host crash${evts.length > 1 ? 'es' : ''} generated ${totalEvents} termination event${totalEvents > 1 ? 's' : ''}, leaving ${uniqueFailed} unique cloudlet${uniqueFailed > 1 ? 's' : ''} (${pct}% of ${s.totalCloudlets}) failed.`,
    })

    // Use simulation clock (total configured duration) as the reference, not makespan
    // (makespan = when the last successful cloudlet finished, which can be shorter than
    //  the clock if some cloudlets were still queued when a host crashed)
    const simClock = cfg?.simulationClock ?? s.makespan
    evts.forEach(ev => {
      const whenPct = simClock > 0 ? (ev.failureTimeS / simClock * 100).toFixed(0) : '?'
      // "early" = crashed before cloudlets had enough time to finish
      const early = ev.failureTimeS < s.avgExecTime
      causes.push({
        severity: early ? 'critical' : 'warning',
        text: `Host ${ev.hostId} in ${ev.datacenterName} crashed at T=${ev.failureTimeS.toFixed(1)}s (${whenPct}% of the ${simClock}s clock)${early ? ` — before most cloudlets could finish (avg exec ${fmt(s.avgExecTime)}s)` : ''}, terminating cloudlet${ev.affectedCloudlets > 1 ? 's' : ''} ${ev.affectedCloudletIds.join(', ')}.`,
      })
    })

    // Multiple failures in the same datacenter → cascading risk
    const dcCounts: Record<string, number> = {}
    evts.forEach(ev => { dcCounts[ev.datacenterName] = (dcCounts[ev.datacenterName] ?? 0) + 1 })
    Object.entries(dcCounts).filter(([, n]) => n > 1).forEach(([dc, n]) => {
      causes.push({
        severity: 'warning',
        text: `${dc} suffered ${n} separate host crashes — all cloudlets assigned to that datacenter were at risk.`,
      })
    })

    // Fix 1 — delay the failure time
    fixes.push({
      severity: 'critical',
      text: `Set "Failure Time (s)" on failing hosts to a value larger than average exec time (~${fmt(s.avgExecTime)}s). Hosts that crash before cloudlets finish guarantee failures.`,
    })

    // Fix 2 — lower failure probability
    const hostFPs = (cfg?.datacenters ?? []).flatMap(dc =>
      dc.hosts.filter(h => (h.failureProbability ?? 0) > 0).map(h => h.failureProbability ?? 0)
    )
    if (hostFPs.length > 0) {
      const maxFP = Math.max(...hostFPs)
      fixes.push({
        severity: maxFP > 0.5 ? 'critical' : 'warning',
        text: `Lower Failure Probability (currently up to ${(maxFP * 100).toFixed(0)}%). Above 50% a host is more likely to crash than survive, making failures nearly guaranteed.`,
      })
    }

    // Fix 3 — spread the workload
    const vmCount  = cfg?.vms?.length ?? 0
    const clPerVm  = vmCount > 0 ? (s.totalCloudlets / vmCount).toFixed(1) : '?'
    if (vmCount > 0 && s.totalCloudlets / vmCount > 4) {
      fixes.push({
        severity: 'info',
        text: `Add more VMs (currently ${vmCount}, ~${clPerVm} cloudlets each). A single host failure affects fewer cloudlets when the workload is spread across more VMs.`,
      })
    }

    // Fix 4 — use multiple datacenters
    const dcCount = cfg?.datacenters?.length ?? 1
    if (dcCount < 2) {
      fixes.push({
        severity: 'info',
        text: `Add a second datacenter with no failure probability configured and assign some VMs there. A host crash in one datacenter then only affects part of the workload.`,
      })
    }
  }

  // ── SLA violation analysis ─────────────────────────────────────────────────
  if (slaCls.length > 0) {
    const pct = Math.round(slaCls.length / s.totalCloudlets * 100)
    causes.push({
      severity: 'warning',
      text: `${slaCls.length} cloudlet${slaCls.length > 1 ? 's' : ''} (${pct}%) missed their SLA deadline. Average exec time was ${fmt(s.avgExecTime)}s (p95: ${fmt(s.p95ExecTime)}s).`,
    })
    const maxVmMips = Math.max(...(cfg?.vms?.map(v => v.mips) ?? [1]), 1)
    const totalLen  = (cfg?.cloudlets ?? []).reduce((n, c) => n + c.length, 0)
    const avgLen    = cfg?.cloudlets?.length ? totalLen / cfg.cloudlets.length : 0
    if (avgLen > 0) {
      const est = avgLen / maxVmMips
      causes.push({
        severity: 'info',
        text: `Avg cloudlet length (${Math.round(avgLen).toLocaleString()} MI) ÷ fastest VM MIPS (${maxVmMips.toLocaleString()}) ≈ ${est.toFixed(1)}s expected exec time — close to or over the deadline.`,
      })
      fixes.push({
        severity: 'warning',
        text: `Increase VM MIPS above ${maxVmMips.toLocaleString()} or shorten cloudlet length so tasks finish before their deadline expires.`,
      })
    }
  }

  // ── high contention / long wait times ─────────────────────────────────────
  if (s.avgWaitTime > 1 && s.avgWaitTime > s.avgExecTime * 0.25) {
    const waitShare = Math.round(s.avgWaitTime / (s.avgWaitTime + s.avgExecTime) * 100)
    causes.push({
      severity: 'warning',
      text: `VM overload: cloudlets spent ${waitShare}% of their total time waiting in queue (avg wait ${fmt(s.avgWaitTime)}s vs avg exec ${fmt(s.avgExecTime)}s).`,
    })
    fixes.push({
      severity: 'info',
      text: `Add more VMs or switch to Time-Shared scheduling to reduce queuing. Currently ${s.totalCloudlets} cloudlets share ${cfg?.vms?.length ?? '?'} VM${(cfg?.vms?.length ?? 1) > 1 ? 's' : ''}.`,
    })
  }

  // ── natural (non-injected) failures ───────────────────────────────────────
  // These happen without any failure probability setting — pure misconfiguration.
  const injectedIds = new Set(evts.flatMap(ev => ev.affectedCloudletIds))
  const naturallyFailed = cls.filter(c => c.status === 'FAILED' && !c.failureReason && !injectedIds.has(c.id))
  // Never started = execTime 0 → VM was never placed on a host
  const neverStarted = naturallyFailed.filter(c => c.execTime === 0)
  // Started but cut short = execTime > 0 → simulation clock ran out
  const clockCut = naturallyFailed.filter(c => c.execTime > 0)

  // 1. Simulation clock too short
  const simClock   = cfg?.simulationClock ?? 0
  const maxVmMips  = (cfg?.vms ?? []).reduce((m, v) => Math.max(m, v.mips), 1)
  const avgClLen   = cfg?.cloudlets?.length
    ? cfg.cloudlets.reduce((n, c) => n + c.length, 0) / cfg.cloudlets.length
    : 0
  const estExecTime = maxVmMips > 0 && avgClLen > 0 ? avgClLen / maxVmMips : 0
  if (clockCut.length > 0 || (simClock > 0 && estExecTime > simClock)) {
    causes.push({
      severity: 'critical',
      text: clockCut.length > 0
        ? `${clockCut.length} cloudlet${clockCut.length > 1 ? 's' : ''} started but were cut off — simulation clock (${simClock}s) ended before they could finish. At ${maxVmMips.toLocaleString()} MIPS, avg cloudlet needs ~${estExecTime.toFixed(1)}s.`
        : `Simulation clock (${simClock}s) is shorter than the estimated execution time per cloudlet (~${estExecTime.toFixed(1)}s at ${maxVmMips.toLocaleString()} MIPS) — cloudlets will not finish.`,
    })
    fixes.push({
      severity: 'critical',
      text: `Increase Simulation Clock from ${simClock}s to at least ${Math.ceil(estExecTime * 1.5)}s (estimated exec ${estExecTime.toFixed(1)}s × 1.5 safety margin to account for queuing).`,
    })
  }

  // 2. VM never placed on a host (resource mismatch)
  if (neverStarted.length > 0) {
    const allHosts   = (cfg?.datacenters ?? []).flatMap(dc => dc.hosts)
    const maxHostRam     = allHosts.reduce((m, h) => Math.max(m, h.ram),         0)
    const maxHostPes     = allHosts.reduce((m, h) => Math.max(m, h.numberOfPes), 0)
    const maxHostStorage = allHosts.reduce((m, h) => Math.max(m, h.storage),     0)
    const maxHostBw      = allHosts.reduce((m, h) => Math.max(m, h.bw),          0)
    const maxHostMips    = allHosts.reduce((m, h) => Math.max(m, h.mips),        0)

    const unplaceable = (cfg?.vms ?? []).filter(vm =>
      vm.ram > maxHostRam ||
      vm.numberOfPes > maxHostPes ||
      vm.size > maxHostStorage ||
      vm.bw > maxHostBw
    )

    if (unplaceable.length > 0) {
      causes.push({
        severity: 'critical',
        text: `${neverStarted.length} cloudlet${neverStarted.length > 1 ? 's' : ''} never started because ${unplaceable.length} VM${unplaceable.length > 1 ? 's' : ''} could not be placed on any host — the VM asks for more resources than any host provides.`,
      })
      unplaceable.forEach((vm, i) => {
        const issues: string[] = []
        if (vm.ram         > maxHostRam)     issues.push(`RAM ${vm.ram.toLocaleString()} MB > host max ${maxHostRam.toLocaleString()} MB`)
        if (vm.numberOfPes > maxHostPes)     issues.push(`PEs ${vm.numberOfPes} > host max ${maxHostPes}`)
        if (vm.size        > maxHostStorage) issues.push(`Storage ${vm.size.toLocaleString()} MB > host max ${maxHostStorage.toLocaleString()} MB`)
        if (vm.bw          > maxHostBw)      issues.push(`BW ${vm.bw.toLocaleString()} Mbps > host max ${maxHostBw.toLocaleString()} Mbps`)
        fixes.push({
          severity: 'critical',
          text: `VM ${i}: ${issues.join(', ')}. Either increase the host capacity or reduce this VM's requirements.`,
        })
      })
    } else {
      // Hosts look sufficient — likely an allocation policy rejection
      causes.push({
        severity: 'critical',
        text: `${neverStarted.length} cloudlet${neverStarted.length > 1 ? 's' : ''} (IDs: ${neverStarted.slice(0, 6).map(c => c.id).join(', ')}${neverStarted.length > 6 ? '…' : ''}) never started. Hosts have enough capacity on paper (max ${maxHostRam.toLocaleString()} MB RAM, ${maxHostMips.toLocaleString()} MIPS) but the VM allocation policy rejected placement — possibly because multiple VMs together exceed a single host's free resources.`,
      })
      fixes.push({
        severity: 'critical',
        text: `Add more hosts, or add a second datacenter. The ${cfg?.datacenters?.[0]?.vmAllocationPolicy ?? 'SIMPLE'} policy allocates each VM to one host — if all VMs need more RAM than one host alone has free, they get rejected.`,
      })
    }
  }

  // 3. Cloudlet requests more PEs than any VM provides
  const maxVmPes = (cfg?.vms ?? []).reduce((m, v) => Math.max(m, v.numberOfPes), 1)
  const oversizedCls = (cfg?.cloudlets ?? []).filter(c => c.numberOfPes > maxVmPes)
  if (oversizedCls.length > 0) {
    causes.push({
      severity: 'critical',
      text: `${oversizedCls.length} cloudlet${oversizedCls.length > 1 ? 's' : ''} request ${oversizedCls[0].numberOfPes} PE${oversizedCls[0].numberOfPes > 1 ? 's' : ''} but no VM has more than ${maxVmPes} PE${maxVmPes > 1 ? 's' : ''} — these cloudlets can never be scheduled on any VM.`,
    })
    fixes.push({
      severity: 'critical',
      text: `Reduce cloudlet PEs to ≤ ${maxVmPes} (the maximum across all VMs), or add a VM with at least ${oversizedCls[0].numberOfPes} PEs to handle these cloudlets.`,
    })
  }

  if (causes.length === 0) {
    causes.push({ severity: 'info', text: 'No failures or SLA violations detected — simulation ran cleanly.' })
  }

  // ── headline ───────────────────────────────────────────────────────────────
  let headline: string
  if (evts.length > 0) {
    const pct = s.totalCloudlets > 0 ? Math.round(s.failedCloudlets / s.totalCloudlets * 100) : 0
    headline = `${pct}% of cloudlets failed — ${evts.length} host crash${evts.length > 1 ? 'es' : ''} terminated tasks mid-execution`
  } else if (slaCls.length > 0) {
    headline = `${slaCls.length} cloudlet${slaCls.length > 1 ? 's' : ''} exceeded their SLA deadline`
  } else if (s.failedCloudlets > 0) {
    headline = `${s.failedCloudlets} cloudlet${s.failedCloudlets > 1 ? 's' : ''} failed`
  } else {
    headline = 'Simulation completed with no failures'
  }

  return { headline, causes, fixes }
}

function FailureDiagnosisCard({ data }: { data: SimResult }) {
  const d = buildDiagnosis(data)
  const itemIcon = {
    critical: <XCircle      className="h-3.5 w-3.5 text-destructive  mt-0.5 flex-shrink-0" />,
    warning:  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500   mt-0.5 flex-shrink-0" />,
    info:     <Activity      className="h-3.5 w-3.5 text-blue-500     mt-0.5 flex-shrink-0" />,
  }
  return (
    <Card className="border-orange-300/50 bg-orange-500/[0.04]">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <CardTitle className="text-base text-orange-700 dark:text-orange-400">Failure Diagnosis</CardTitle>
            <p className="text-sm font-medium">{d.headline}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* What caused it */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            What caused it
          </p>
          <ul className="space-y-2">
            {d.causes.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-snug">
                {itemIcon[c.severity]}
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Suggested fixes */}
        {d.fixes.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Suggested fixes
            </p>
            <ol className="space-y-2">
              {d.fixes.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-snug">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground mt-0.5">
                    {i + 1}
                  </span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── cost breakdown card ────────────────────────────────────────────────────────

function CostBreakdownCard({ data }: { data: SimResult }) {
  const cls = data.cloudlets ?? []
  const totalCpuCost = cls.reduce((s, c) => s + c.cpuCost, 0)
  const totalBwCost  = cls.reduce((s, c) => s + c.bwCost,  0)
  const totalCost    = cls.reduce((s, c) => s + c.totalCost, 0)
  const cpuPct = totalCost > 0 ? (totalCpuCost / totalCost * 100) : 0
  const bwPct  = totalCost > 0 ? (totalBwCost  / totalCost * 100) : 0

  const vmCosts: Record<number, { cpu: number; bw: number; total: number; count: number }> = {}
  cls.forEach(c => {
    if (!vmCosts[c.vmId]) vmCosts[c.vmId] = { cpu: 0, bw: 0, total: 0, count: 0 }
    vmCosts[c.vmId].cpu   += c.cpuCost
    vmCosts[c.vmId].bw    += c.bwCost
    vmCosts[c.vmId].total += c.totalCost
    vmCosts[c.vmId].count += 1
  })

  const dcs = data.config?.datacenters ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" />Cost Breakdown
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          How the total cost is composed across all cloudlets.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* ── total summary with visual bar ── */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-500" />
              CPU Processing Cost
              <span className="text-xs text-muted-foreground">({cpuPct.toFixed(1)}%)</span>
            </span>
            <span className="tabular-nums font-medium">${fmt(totalCpuCost, 4)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              Bandwidth Cost
              <span className="text-xs text-muted-foreground">({bwPct.toFixed(1)}%)</span>
            </span>
            <span className="tabular-nums font-medium">${fmt(totalBwCost, 4)}</span>
          </div>
          {totalCost > 0 && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted flex">
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${cpuPct.toFixed(1)}%` }} />
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${bwPct.toFixed(1)}%` }} />
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums text-base">${fmt(totalCost, 4)}</span>
          </div>
        </div>

        {/* ── datacenter pricing rates ── */}
        {dcs.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Pricing Rates Applied
            </p>
            <div className="space-y-2">
              {dcs.map(dc => (
                <div key={dc.name} className="rounded border bg-background p-3">
                  <p className="text-xs font-medium mb-1.5">{dc.name}</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <span>CPU (cost/sec) — <span className="text-foreground font-medium tabular-nums">${dc.costPerSec}/s</span></span>
                    <span>RAM (cost/MB) — <span className="text-foreground font-medium tabular-nums">${dc.costPerMem}/MB</span></span>
                    <span>Storage (cost/MB) — <span className="text-foreground font-medium tabular-nums">${dc.costPerStorage}/MB</span></span>
                    <span>Bandwidth (cost/unit) — <span className="text-foreground font-medium tabular-nums">${dc.costPerBw}/unit</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── per-VM cost table ── */}
        {Object.keys(vmCosts).length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Per-VM Cost
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 pr-4 text-left">VM</th>
                    <th className="py-2 pr-4 text-right">Cloudlets</th>
                    <th className="py-2 pr-4 text-right">CPU Cost</th>
                    <th className="py-2 pr-4 text-right">BW Cost</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(vmCosts)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([vmId, costs]) => (
                      <tr key={vmId} className="border-b last:border-0 text-xs">
                        <td className="py-1.5 pr-4 font-medium">VM {vmId}</td>
                        <td className="py-1.5 pr-4 text-right tabular-nums">{costs.count}</td>
                        <td className="py-1.5 pr-4 text-right tabular-nums text-indigo-600">${fmt(costs.cpu, 4)}</td>
                        <td className="py-1.5 pr-4 text-right tabular-nums text-emerald-600">${fmt(costs.bw, 4)}</td>
                        <td className="py-1.5 text-right tabular-nums font-medium">${fmt(costs.total, 4)}</td>
                      </tr>
                    ))}
                  <tr className="border-t text-xs font-semibold bg-muted/20">
                    <td className="py-1.5 pr-4">Total</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{cls.length}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums text-indigo-600">${fmt(totalCpuCost, 4)}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums text-emerald-600">${fmt(totalBwCost, 4)}</td>
                    <td className="py-1.5 text-right tabular-nums">${fmt(totalCost, 4)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── timeline viewer (Gantt + scrubber) ────────────────────────────────────────

function TimelineViewer({ cloudlets, makespan }: { cloudlets: CloudletResult[]; makespan: number }) {
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const animRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const baseTimeRef = useRef<number>(0)
  const SPEED = 0.5  // simulation-seconds per real-second

  const step = useCallback((now: number) => {
    const elapsed = (now - startRef.current) / 1000
    const simTime = Math.min(baseTimeRef.current + elapsed * SPEED, makespan)
    setCurrentTime(simTime)
    if (simTime < makespan) {
      animRef.current = requestAnimationFrame(step)
    } else {
      setPlaying(false)
    }
  }, [makespan])

  const play = () => {
    if (playing) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      setPlaying(false)
      baseTimeRef.current = currentTime
      return
    }
    if (currentTime >= makespan) {
      setCurrentTime(0)
      baseTimeRef.current = 0
    } else {
      baseTimeRef.current = currentTime
    }
    startRef.current = performance.now()
    setPlaying(true)
    animRef.current = requestAnimationFrame(step)
  }

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current) }, [])

  const vmIds = [...new Set(cloudlets.map(c => c.vmId))].sort((a, b) => a - b)
  const ROW_H = 28
  const LABEL_W = 52
  const svgH = vmIds.length * ROW_H + 24

  const colorFor = (c: CloudletResult, t: number): string => {
    if (c.failureReason) return '#ef4444'
    if (c.slaViolated) return '#f59e0b'
    if (t < c.startTime) return '#e2e8f0'
    if (t <= c.finishTime) return '#6366f1'
    return '#10b981'
  }
  const opacityFor = (c: CloudletResult, t: number): number => {
    if (t < c.startTime) return 0.3
    if (t <= c.finishTime) return 1
    return 0.6
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Button size="sm" variant="outline" onClick={play}>
          {playing ? '⏸ Pause' : currentTime >= makespan ? '↺ Replay' : '▶ Play'}
        </Button>
        <input type="range" min={0} max={makespan} step={makespan / 200}
          value={currentTime}
          onChange={e => { if (animRef.current) cancelAnimationFrame(animRef.current); setPlaying(false); baseTimeRef.current = Number(e.target.value); setCurrentTime(Number(e.target.value)) }}
          className="flex-1 min-w-24 accent-indigo-500" />
        <span className="text-xs tabular-nums text-muted-foreground w-20 text-right">
          T = {currentTime.toFixed(2)}s
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        {[['bg-slate-200','Not started'],['bg-indigo-500','Running'],['bg-emerald-500','Completed'],
          ['bg-yellow-500','SLA violation'],['bg-red-500','Injected failure']].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${c}`} />{l}
          </span>
        ))}
      </div>

      {/* SVG Gantt */}
      <div className="overflow-x-auto rounded border bg-background p-2">
        <svg width="100%" height={svgH} style={{ minWidth: 500 }}>
          {vmIds.map((vmId, row) => {
            const y = row * ROW_H + 4
            const rowCls = cloudlets.filter(c => c.vmId === vmId)
            return (
              <g key={vmId}>
                <text x={LABEL_W - 4} y={y + ROW_H / 2} textAnchor="end"
                  dominantBaseline="middle" fontSize={11} fill="currentColor">
                  VM {vmId}
                </text>
                <line x1={LABEL_W} x2="100%" y1={y} y2={y} stroke="#e2e8f0" strokeWidth={0.5} />
                {rowCls.map(c => {
                  const xPct = (v: number) => `${LABEL_W + (v / (makespan || 1)) * (100 - LABEL_W / 5)}%`
                  return (
                    <g key={c.id}>
                      <title>CL {c.id} | {c.status} | {fmt(c.startTime)}s → {fmt(c.finishTime)}s</title>
                      <rect
                        x={xPct(c.startTime)} y={y + 3}
                        width={`${((c.finishTime - c.startTime) / (makespan || 1)) * (100 - LABEL_W / 5)}%`}
                        height={ROW_H - 7}
                        fill={colorFor(c, currentTime)}
                        opacity={opacityFor(c, currentTime)}
                        rx={2} />
                      <text
                        x={xPct(c.startTime + (c.finishTime - c.startTime) / 2)}
                        y={y + ROW_H / 2} textAnchor="middle" dominantBaseline="middle"
                        fontSize={9} fill="white" opacity={opacityFor(c, currentTime)}>
                        {c.id}
                      </text>
                    </g>
                  )
                })}
              </g>
            )
          })}
          {/* Current time cursor */}
          {makespan > 0 && (
            <line
              x1={`${LABEL_W + (currentTime / makespan) * (100 - LABEL_W / 5)}%`}
              x2={`${LABEL_W + (currentTime / makespan) * (100 - LABEL_W / 5)}%`}
              y1={0} y2={svgH}
              stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 2" />
          )}
        </svg>
      </div>
    </div>
  )
}

// ── charts ─────────────────────────────────────────────────────────────────────

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#f97316','#06b6d4']

function GanttChart({ cloudlets }: { cloudlets: CloudletResult[] }) {
  if (!cloudlets.length) return null
  const vmIds = [...new Set(cloudlets.map(c => c.vmId))].sort((a, b) => a - b)
  const data = vmIds.map(vmId => {
    const row: Record<string, number | string> = { vmId: `VM ${vmId}` }
    cloudlets.filter(c => c.vmId === vmId).forEach(c => {
      row[`offset_${c.id}`] = c.startTime
      row[`exec_${c.id}`] = c.execTime
    })
    return row
  })
  return (
    <div style={{ height: Math.max(120, vmIds.length * 50 + 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" barSize={18}
          margin={{ left: 16, right: 24, top: 8, bottom: 8 }}>
          <XAxis type="number" domain={[0, 'dataMax']} tickFormatter={v => `${v}s`} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="vmId" width={50} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(val, name) => {
              if (String(name).startsWith('offset_')) return [null, null]
              return [`${(val as number).toFixed(2)}s`, `Cloudlet ${String(name).replace('exec_','')}`]
            }}
            filterNull />
          {cloudlets.map((c, i) => [
            <Bar key={`o_${c.id}`} dataKey={`offset_${c.id}`} stackId={`v${c.vmId}`}
              fill="transparent" isAnimationActive={false} />,
            <Bar key={`e_${c.id}`} dataKey={`exec_${c.id}`} stackId={`v${c.vmId}`}
              fill={COLORS[i % COLORS.length]} radius={2} isAnimationActive={false} />,
          ])}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function StatusPieChart({ cloudlets }: { cloudlets: CloudletResult[] }) {
  const PIE = { SUCCESS: '#10b981', FAILED: '#ef4444', OTHER: '#94a3b8' }
  const counts: Record<string, number> = {}
  for (const c of cloudlets) {
    const k = c.status === 'SUCCESS' || c.status === 'FAILED' ? c.status : 'OTHER'
    counts[k] = (counts[k] ?? 0) + 1
  }
  const data = Object.entries(counts).map(([name, value]) => ({ name, value }))
  if (!data.length) return null
  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
            {data.map(e => <Cell key={e.name} fill={(PIE as any)[e.name] ?? PIE.OTHER} />)}
          </Pie>
          <Legend /><Tooltip formatter={v => [v, 'cloudlets']} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function ExecTimeChart({ cloudlets }: { cloudlets: CloudletResult[] }) {
  const data = cloudlets.map(c => ({ name: `CL ${c.id}`, execTime: c.execTime }))
  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={v => `${v}s`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={v => [`${(v as number).toFixed(2)}s`, 'Exec time']} />
          <Bar dataKey="execTime" radius={3}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function WaitTimeChart({ cloudlets }: { cloudlets: CloudletResult[] }) {
  const data = cloudlets.map(c => ({ name: `CL ${c.id}`, wait: c.waitingTime, sla: c.slaViolated }))
  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={v => `${v}s`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={v => [`${(v as number).toFixed(2)}s`, 'Wait']} />
          <Bar dataKey="wait" radius={3}>
            {data.map((d, i) => <Cell key={i} fill={d.sla ? '#f59e0b' : COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function CostBreakdownChart({ cloudlets }: { cloudlets: CloudletResult[] }) {
  const data = cloudlets.filter(c => c.status === 'SUCCESS')
    .map(c => ({ name: `CL ${c.id}`, cpu: +c.cpuCost.toFixed(4), bw: +c.bwCost.toFixed(4) }))
  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v, n) => [`$${(v as number).toFixed(4)}`, n === 'cpu' ? 'CPU' : 'BW']} />
          <Legend formatter={n => n === 'cpu' ? 'CPU' : 'Bandwidth'} />
          <Bar dataKey="cpu" stackId="c" fill="#6366f1" isAnimationActive={false} />
          <Bar dataKey="bw"  stackId="c" fill="#10b981" radius={[3,3,0,0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function EnergyChart({ hostEnergy }: { hostEnergy: HostEnergy[] }) {
  const data = hostEnergy.map(h => ({
    name: `H${h.hostId} (${h.datacenterName})`,
    energyWh: +h.energyWh.toFixed(4),
    avgW: +h.avgPowerW.toFixed(1),
  }))
  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={v => `${v}Wh`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v, n) => [n === 'energyWh' ? `${v}Wh` : `${v}W`, n === 'energyWh' ? 'Energy' : 'Avg Power']} />
          <Legend />
          <Bar dataKey="energyWh" fill="#10b981" radius={3} name="Energy (Wh)" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── export helpers ─────────────────────────────────────────────────────────────

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function downloadCsv(cloudlets: CloudletResult[], filename: string) {
  const header = 'id,status,slaViolated,failureReason,datacenterId,vmId,startTime,finishTime,execTime,waitingTime,cpuCost,bwCost,totalCost'
  const rows = cloudlets.map(c =>
    `${c.id},${c.status},${c.slaViolated},"${c.failureReason ?? ''}",${c.datacenterId},${c.vmId},${c.startTime},${c.finishTime},${c.execTime},${c.waitingTime},${c.cpuCost},${c.bwCost},${c.totalCost}`)
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── tab system ─────────────────────────────────────────────────────────────────

type Tab = 'results' | 'energy' | 'failures' | 'timeline' | 'logs'

function TabBar({ active, onChange, tabs }: {
  active: Tab; onChange: (t: Tab) => void
  tabs: { id: Tab; label: string; badge?: number | string }[]
}) {
  return (
    <div className="flex gap-1 border-b mb-4 flex-wrap">
      {tabs.map(t => (
        <button key={t.id} type="button"
          onClick={() => onChange(t.id)}
          className={`px-3 py-1.5 text-sm rounded-t-md transition-colors relative ${
            active === t.id
              ? 'bg-background border border-b-background -mb-px font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}>
          {t.label}
          {t.badge !== undefined && t.badge !== 0 && (
            <span className="ml-1.5 rounded-full bg-destructive/20 text-destructive text-xs px-1.5 py-0.5">
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── main page ──────────────────────────────────────────────────────────────────

export default function SimulationResult() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error } = useSimulationResult(Number(id))
  const s = data?.summary
  const [tab, setTab] = useState<Tab>('results')

  const hasEnergy   = (data?.hostEnergy?.length ?? 0) > 0
  const hasFailures = (data?.failureEvents?.length ?? 0) > 0

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="font-semibold truncate">{data?.name ?? 'Simulation'}</span>
          {data && <StatusBadge status={data.status} />}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-8 space-y-6">

        {isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}><CardContent className="pt-4 space-y-2">
                  <Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-28" />
                </CardContent></Card>
              ))}
            </div>
          </div>
        )}

        {!isLoading && (data?.status === 'QUEUED' || data?.status === 'RUNNING') && (
          <Card><CardContent className="flex items-center gap-3 py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Simulation {data?.status?.toLowerCase()}…</span>
          </CardContent></Card>
        )}

        {(error || data?.status === 'FAILED') && (
          <Card className="border-destructive"><CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-sm text-destructive">
              {error ? (error as Error).message : 'Simulation failed'}
            </span>
          </CardContent></Card>
        )}

        {data?.status === 'COMPLETED' && s && (
          <>
            {/* ── Row 1: core metrics ── */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryCard icon={<CheckCircle className="h-4 w-4" />} label="Completed"
                value={`${s.completedCloudlets} / ${s.totalCloudlets}`}
                sub={s.failedCloudlets > 0 ? `${s.failedCloudlets} failed` : 'all succeeded'} />
              <SummaryCard icon={<Clock className="h-4 w-4" />} label="Makespan"
                value={`${fmt(s.makespan)}s`}
                sub={`Throughput: ${fmt(s.throughput, 2)} cl/s`} />
              <SummaryCard icon={<DollarSign className="h-4 w-4" />} label="Total Cost"
                value={`$${fmt(s.totalCost, 4)}`} />
              <SummaryCard icon={<Clock className="h-4 w-4" />} label="Avg Exec Time"
                value={`${fmt(s.avgExecTime)}s`}
                sub={`p95: ${fmt(s.p95ExecTime)}s · max: ${fmt(s.maxExecTime)}s`} />
            </div>

            {/* ── Row 2: wait/SLA/energy ── */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryCard icon={<Clock className="h-4 w-4" />} label="Avg Wait Time"
                value={`${fmt(s.avgWaitTime)}s`} sub={`max: ${fmt(s.maxWaitTime)}s`} />
              <SummaryCard icon={<AlertTriangle className="h-4 w-4" />} label="SLA Violations"
                value={`${s.slaViolations}`}
                sub={s.totalCloudlets > 0 ? `${fmtPct(s.slaViolationRate)} of cloudlets` : undefined}
                highlight={s.slaViolations > 0 ? 'warn' : undefined} />
              <SummaryCard icon={<XCircle className="h-4 w-4" />} label="Failed Cloudlets"
                value={`${s.failedCloudlets}`}
                sub={s.injectedFailures > 0 ? `${s.injectedFailures} from host failure` : undefined}
                highlight={s.failedCloudlets > 0 ? 'bad' : undefined} />
              {hasEnergy
                ? <SummaryCard icon={<Zap className="h-4 w-4" />} label="Total Energy"
                    value={`${fmt(s.totalEnergyWh, 4)} Wh`}
                    sub={`Avg power: ${fmt(s.avgPowerW, 1)} W`}
                    highlight="energy" />
                : <SummaryCard icon={<Activity className="h-4 w-4" />} label="Min Exec Time"
                    value={`${fmt(s.minExecTime)}s`} />}
            </div>

            {/* ── Tab navigation ── */}
            <TabBar active={tab} onChange={setTab} tabs={[
              { id: 'results',  label: 'Results & Charts' },
              { id: 'energy',   label: 'Energy / Power', badge: hasEnergy ? data.hostEnergy.length : 0 },
              { id: 'failures', label: 'Failures', badge: hasFailures ? data.failureEvents.length : 0 },
              { id: 'timeline', label: 'Timeline' },
              { id: 'logs',     label: 'Logs' },
            ]} />

            {/* ── RESULTS tab ── */}
            {tab === 'results' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Cloudlet Results</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm"
                        onClick={() => downloadCsv(data.cloudlets, `sim-${data.id}-cloudlets.csv`)}>
                        <Download className="h-3.5 w-3.5 mr-1" />CSV
                      </Button>
                      <Button variant="outline" size="sm"
                        onClick={() => downloadJson(data, `sim-${data.id}-result.json`)}>
                        <Download className="h-3.5 w-3.5 mr-1" />JSON
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent><CloudletTable cloudlets={data.cloudlets} /></CardContent>
                </Card>

                {data.vmStats?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">Per-VM Breakdown</CardTitle></CardHeader>
                    <CardContent><VmStatsTable vmStats={data.vmStats} /></CardContent>
                  </Card>
                )}

                <CostBreakdownCard data={data} />

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Exec Time per Cloudlet</CardTitle></CardHeader>
                    <CardContent><ExecTimeChart cloudlets={data.cloudlets} /></CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Cloudlet Status</CardTitle></CardHeader>
                    <CardContent><StatusPieChart cloudlets={data.cloudlets} /></CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Wait Time per Cloudlet</CardTitle>
                      {s.slaViolations > 0 && (
                        <p className="text-xs text-yellow-600">Yellow = SLA deadline missed</p>
                      )}
                    </CardHeader>
                    <CardContent><WaitTimeChart cloudlets={data.cloudlets} /></CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Cost Breakdown (CPU vs BW)</CardTitle></CardHeader>
                    <CardContent><CostBreakdownChart cloudlets={data.cloudlets} /></CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader><CardTitle className="text-base">Gantt Chart (static, by VM)</CardTitle></CardHeader>
                  <CardContent><GanttChart cloudlets={data.cloudlets} /></CardContent>
                </Card>
              </div>
            )}

            {/* ── ENERGY tab ── */}
            {tab === 'energy' && (
              <div className="space-y-6">
                {hasEnergy ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Host Energy Consumption</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Only hosts with a Power Model configured appear here.
                          Add LINEAR / SQUARE / CUBIC in the host editor to enable tracking.
                        </p>
                      </CardHeader>
                      <CardContent><HostEnergyTable hostEnergy={data.hostEnergy} /></CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-base">Energy per Host</CardTitle></CardHeader>
                      <CardContent><EnergyChart hostEnergy={data.hostEnergy} /></CardContent>
                    </Card>

                    {/* Network info (if configured) */}
                    {data.config?.datacenters?.some(dc => dc.networkLatencyMs != null) && (
                      <Card>
                        <CardHeader><CardTitle className="text-base">Network Configuration</CardTitle></CardHeader>
                        <CardContent>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-xs text-muted-foreground">
                                <th className="py-2 pr-4 text-left">Datacenter</th>
                                <th className="py-2 pr-4 text-right">Latency (ms)</th>
                                <th className="py-2 text-right">Bandwidth (Mbps)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.config.datacenters.filter(dc => dc.networkLatencyMs != null).map(dc => (
                                <tr key={dc.name} className="border-b last:border-0">
                                  <td className="py-1.5 pr-4 font-medium">{dc.name}</td>
                                  <td className="py-1.5 pr-4 text-right tabular-nums">{dc.networkLatencyMs} ms</td>
                                  <td className="py-1.5 text-right tabular-nums">
                                    {dc.networkBandwidthMbps != null ? `${dc.networkBandwidthMbps} Mbps` : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                      <Zap className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground font-medium">No power model configured</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Enable energy tracking by setting a Power Model (LINEAR / SQUARE / CUBIC) on one
                        or more hosts when creating a simulation.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ── FAILURES tab ── */}
            {tab === 'failures' && (
              <div className="space-y-6">
                {(hasFailures || s.slaViolations > 0 || s.failedCloudlets > 0) ? (
                  <>
                    {/* Failure events (host crashes) */}
                    {hasFailures && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Failure Events</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {s.injectedFailures} cloudlet{s.injectedFailures !== 1 ? 's' : ''} were
                            terminated by host failure injection.
                          </p>
                        </CardHeader>
                        <CardContent>
                          <FailureEventsPanel events={data.failureEvents} />
                        </CardContent>
                      </Card>
                    )}

                    {/* Diagnosis — what went wrong and how to fix it */}
                    <FailureDiagnosisCard data={data} />

                    {/* Failed cloudlets detail */}
                    {data.cloudlets.some(c => c.failureReason != null || c.slaViolated) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Failed Cloudlets</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            Rows highlighted in red failed due to host injection; yellow rows missed their SLA deadline.
                          </p>
                        </CardHeader>
                        <CardContent>
                          <CloudletTable cloudlets={data.cloudlets.filter(c => c.failureReason != null || c.slaViolated)} />
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                      <Flame className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground font-medium">No failures injected</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Set Failure Probability &gt; 0 on one or more hosts (in the Tier 2 section
                        of the host editor) to simulate host crashes.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ── TIMELINE tab ── */}
            {tab === 'timeline' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Animated Timeline</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Scrub or press Play to watch cloudlets execute across VMs over simulation time.
                  </p>
                </CardHeader>
                <CardContent>
                  <TimelineViewer cloudlets={data.cloudlets} makespan={s.makespan} />
                </CardContent>
              </Card>
            )}

            {/* ── LOGS tab ── */}
            {tab === 'logs' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Simulation Logs</CardTitle>
                  {data.logsTruncated && (
                    <p className="text-xs text-yellow-600">⚠ Truncated at 5 MB</p>
                  )}
                </CardHeader>
                <CardContent>
                  <pre className="max-h-96 overflow-auto rounded bg-muted p-3 text-xs leading-relaxed">
                    {data.logs || '(no logs)'}
                  </pre>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {data?.status === 'FAILED' && data.logs && (
          <Card>
            <CardHeader><CardTitle className="text-base">Error Details</CardTitle></CardHeader>
            <CardContent>
              <pre className="rounded bg-muted p-3 text-xs text-destructive">{data.logs}</pre>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
