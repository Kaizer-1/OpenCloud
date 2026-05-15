import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form'
import {
  useSubmitSimulation, useTemplates, useTemplate,
  useSavedConfig, useSaveConfig,
} from '@/hooks/useSimulations'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Save, Zap, AlertTriangle } from 'lucide-react'
import type { SimulationConfig, HostConfig, VmConfig, CloudletConfig, DatacenterConfig } from '@/lib/api'

// ── helpers ────────────────────────────────────────────────────────────────────

/** Abbreviate large numbers for compact range hints: 1,048,576 → "1M", 10,000,000,000 → "10B" */
const abbr = (n: number): string => {
  if (n >= 1e9)     return `${+(n / 1e9).toFixed(1).replace(/\.0$/, '')}B`
  if (n >= 1e6)     return `${+(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 100_000) return `${Math.round(n / 1_000)}K`
  return n.toLocaleString('en-US')
}

// ── default values ─────────────────────────────────────────────────────────────

const defaultHost = (): HostConfig => ({
  mips: 1000, numberOfPes: 1, ram: 2048, bw: 10000, storage: 1000000,
  vmScheduler: 'TIME_SHARED',
  powerModel: null, maxPowerW: null, idlePowerPercent: null,
  failureProbability: null, failureTimeS: null,
})
const defaultDc = (): DatacenterConfig => ({
  name: 'Datacenter_0', architecture: 'x86', os: 'Linux', vmm: 'Xen',
  timeZone: 10.0, costPerSec: 3.0, costPerMem: 0.05, costPerStorage: 0.001, costPerBw: 0.0,
  schedulingInterval: 0.0, vmAllocationPolicy: 'SIMPLE', hosts: [defaultHost()],
  networkLatencyMs: null, networkBandwidthMbps: null,
})
const defaultVm = (): VmConfig => ({
  mips: 1000, numberOfPes: 1, ram: 512, bw: 1000, size: 10000, vmm: 'Xen', cloudletScheduler: 'TIME_SHARED',
})
const defaultCloudlet = (): CloudletConfig => ({
  length: 400000, numberOfPes: 1, fileSize: 300, outputSize: 300,
  utilizationModelCpu: 'FULL', utilizationModelRam: 'FULL', utilizationModelBw: 'FULL',
  assignedVmId: null, deadline: null,
})
const defaultConfig = (): SimulationConfig => ({
  templateId: null, name: '', datacenters: [defaultDc()], vms: [defaultVm()],
  cloudlets: [defaultCloudlet()], simulationClock: 11.0, traceFlag: false,
})

// ── derived limit types ────────────────────────────────────────────────────────

interface VmLimits { maxMips: number; maxPes: number; maxRam: number; maxBw: number; maxSize: number }
interface CloudletLimits { maxLength: number; maxPes: number; maxDeadline: number }

// ── component ─────────────────────────────────────────────────────────────────

export default function NewSimulation() {
  const navigate = useNavigate()
  const location = useLocation()
  const savedConfigId: number | null = (location.state as any)?.savedConfigId ?? null

  const submit = useSubmitSimulation()
  const saveConfig = useSaveConfig()
  const { data: templates } = useTemplates()

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const { data: templateConfig } = useTemplate(selectedTemplate)
  const { data: loadedSavedConfig } = useSavedConfig(savedConfigId)

  const form = useForm<SimulationConfig>({ defaultValues: defaultConfig() })
  const { register, control, handleSubmit, reset, getValues, trigger, formState: { errors } } = form

  const { fields: dcFields, append: appendDc, remove: removeDc } = useFieldArray({ control, name: 'datacenters' })
  const { fields: vmFields, append: appendVm, remove: removeVm } = useFieldArray({ control, name: 'vms' })
  const { fields: clFields, append: appendCl, remove: removeCl } = useFieldArray({ control, name: 'cloudlets' })

  const [vmGenCount, setVmGenCount] = useState(5)
  const [clGenCount, setClGenCount] = useState(10)

  if (templateConfig && selectedTemplate) {
    reset({ ...templateConfig, name: templateConfig.name || '' })
    setSelectedTemplate(null)
  }
  if (loadedSavedConfig && savedConfigId) {
    reset({ ...loadedSavedConfig })
    window.history.replaceState({}, '')
  }

  // ── dynamic limit computation ───────────────────────────────────────────────

  const watchedDcs   = useWatch({ control, name: 'datacenters' })
  const watchedVms   = useWatch({ control, name: 'vms' })
  const watchedClock = useWatch({ control, name: 'simulationClock' })

  const allHosts = (watchedDcs ?? []).flatMap((dc: any) => dc?.hosts ?? [])
  const vmLimits: VmLimits = {
    maxMips: allHosts.reduce((m: number, h: any) => Math.max(m, Number(h?.mips)        || 0), 1),
    maxPes:  allHosts.reduce((m: number, h: any) => Math.max(m, Number(h?.numberOfPes) || 0), 1),
    maxRam:  allHosts.reduce((m: number, h: any) => Math.max(m, Number(h?.ram)         || 0), 512),
    maxBw:   allHosts.reduce((m: number, h: any) => Math.max(m, Number(h?.bw)          || 0), 1),
    maxSize: allHosts.reduce((m: number, h: any) => Math.max(m, Number(h?.storage)     || 0), 100),
  }

  const clock    = Math.max(0.1, Number(watchedClock) || 11)
  const allVms   = (watchedVms ?? []) as any[]
  const maxVmMips = allVms.reduce((m: number, vm: any) => Math.max(m, Number(vm?.mips)        || 0), 1)
  const maxVmPes  = allVms.reduce((m: number, vm: any) => Math.max(m, Number(vm?.numberOfPes) || 0), 1)
  const cloudletLimits: CloudletLimits = {
    maxLength:   Math.max(1, Math.floor(maxVmMips * clock)),
    maxPes:      Math.max(1, maxVmPes),
    maxDeadline: clock,
  }

  const vmFieldCount = vmFields.length
  const clFieldCount = clFields.length

  useEffect(() => {
    for (let i = 0; i < vmFieldCount; i++) {
      void trigger(`vms.${i}.mips` as any)
      void trigger(`vms.${i}.numberOfPes` as any)
      void trigger(`vms.${i}.ram` as any)
      void trigger(`vms.${i}.bw` as any)
      void trigger(`vms.${i}.size` as any)
    }
  }, [vmLimits.maxMips, vmLimits.maxPes, vmLimits.maxRam, vmLimits.maxBw, vmLimits.maxSize, vmFieldCount]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    for (let i = 0; i < clFieldCount; i++) {
      void trigger(`cloudlets.${i}.length` as any)
      void trigger(`cloudlets.${i}.numberOfPes` as any)
      void trigger(`cloudlets.${i}.deadline` as any)
    }
  }, [cloudletLimits.maxLength, cloudletLimits.maxPes, cloudletLimits.maxDeadline, clFieldCount]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── handlers ───────────────────────────────────────────────────────────────

  const onSubmit = async (data: SimulationConfig) => {
    try {
      const result = await submit.mutateAsync(data)
      navigate(`/simulations/${result.simulationId}`)
    } catch (e) {
      toast({ title: 'Submission failed', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const handleSaveConfig = async () => {
    try {
      const data = getValues()
      await saveConfig.mutateAsync(data)
      toast({ title: 'Config saved', description: `"${data.name}" saved to your configs.` })
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="font-semibold">New Simulation</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Name ── */}
          <Card>
            <CardHeader><CardTitle className="text-base">Simulation Name</CardTitle></CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="My simulation"
                  {...register('name', { required: 'Name is required' })} />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* ── Templates ── */}
          {templates && (
            <Card>
              <CardHeader><CardTitle className="text-base">Load Template</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {templates.map(t => (
                    <Button key={t.id} type="button" variant="outline" size="sm"
                      onClick={() => setSelectedTemplate(t.id)}>
                      {t.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Datacenters ── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Datacenters</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => appendDc(defaultDc())}>
                <Plus className="h-3 w-3 mr-1" />Add DC
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {dcFields.map((dc, di) => (
                <DatacenterSection key={dc.id} index={di} control={control} register={register}
                  errors={errors} onRemove={() => removeDc(di)} canRemove={dcFields.length > 1} />
              ))}
            </CardContent>
          </Card>

          {/* ── VMs ── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Virtual Machines</CardTitle>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => appendVm(defaultVm())}>
                  <Plus className="h-3 w-3 mr-1" />Add VM
                </Button>
                <div className="flex items-center gap-1">
                  <input type="number" min={1} max={100} value={vmGenCount}
                    onChange={e => setVmGenCount(Math.max(1, Math.min(100, Number(e.target.value))))}
                    className="h-8 w-14 rounded-md border border-input bg-background px-2 text-xs" />
                  <Button type="button" variant="secondary" size="sm"
                    onClick={() => { for (let i = 0; i < vmGenCount; i++) appendVm(defaultVm()) }}>
                    Generate
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {vmFields.map((vm, vi) => (
                <VmRow key={vm.id} index={vi} control={control} register={register}
                  errors={errors} vmLimits={vmLimits}
                  onRemove={() => removeVm(vi)} canRemove={vmFields.length > 1} />
              ))}
            </CardContent>
          </Card>

          {/* ── Cloudlets ── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Cloudlets</CardTitle>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => appendCl(defaultCloudlet())}>
                  <Plus className="h-3 w-3 mr-1" />Add Cloudlet
                </Button>
                <div className="flex items-center gap-1">
                  <input type="number" min={1} max={1000} value={clGenCount}
                    onChange={e => setClGenCount(Math.max(1, Math.min(1000, Number(e.target.value))))}
                    className="h-8 w-14 rounded-md border border-input bg-background px-2 text-xs" />
                  <Button type="button" variant="secondary" size="sm"
                    onClick={() => { for (let i = 0; i < clGenCount; i++) appendCl(defaultCloudlet()) }}>
                    Generate
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {clFields.map((cl, ci) => (
                <CloudletRow key={cl.id} index={ci} control={control} register={register}
                  errors={errors} cloudletLimits={cloudletLimits}
                  onRemove={() => removeCl(ci)} canRemove={clFields.length > 1}
                  vmCount={vmFields.length} />
              ))}
            </CardContent>
          </Card>

          {/* ── Global Settings ── */}
          <Card>
            <CardHeader><CardTitle className="text-base">Global Settings</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField label="Simulation Clock" range="0.1 – 1M" error={errors.simulationClock?.message}>
                <Input type="number" step="0.1"
                  {...register('simulationClock', {
                    valueAsNumber: true,
                    min: { value: 0.1, message: 'Must be > 0' },
                    max: { value: 1000000, message: 'Must be ≤ 1,000,000' },
                  })} />
              </FormField>
              <div className="flex items-end gap-2 pb-1">
                <input type="checkbox" id="traceFlag" {...register('traceFlag')} className="h-4 w-4" />
                <Label htmlFor="traceFlag">Trace flag (verbose logging)</Label>
              </div>
            </CardContent>
          </Card>

          {/* ── Submit ── */}
          <div className="flex justify-end gap-3 items-center">
            <Button type="button" variant="outline" asChild><Link to="/dashboard">Cancel</Link></Button>
            <Button type="button" variant="secondary" onClick={handleSaveConfig}
              disabled={saveConfig.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {saveConfig.isPending ? 'Saving…' : 'Save Config'}
            </Button>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? 'Submitting…' : 'Run Simulation'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}

// ── sub-components ─────────────────────────────────────────────────────────────

function DatacenterSection({ index, control, register, errors, onRemove, canRemove }: any) {
  const [open, setOpen] = useState(true)
  const { fields: hostFields, append, remove } = useFieldArray({ control, name: `datacenters.${index}.hosts` })
  const dcErrors = errors?.datacenters?.[index]

  return (
    <div className="rounded-md border">
      <button type="button"
        className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium"
        onClick={() => setOpen(o => !o)}>
        <span>Datacenter {index + 1}</span>
        <div className="flex items-center gap-2">
          {canRemove && (
            <span onClick={e => { e.stopPropagation(); onRemove() }}
              className="cursor-pointer text-destructive hover:text-destructive/80">
              <Trash2 className="h-3.5 w-3.5" />
            </span>
          )}
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <FormField label="Name">
              <Input {...register(`datacenters.${index}.name`)} />
            </FormField>
            <FormField label="Architecture">
              <Input {...register(`datacenters.${index}.architecture`)} />
            </FormField>
            <FormField label="OS">
              <Input {...register(`datacenters.${index}.os`)} />
            </FormField>
            <FormField label="VMM">
              <Input {...register(`datacenters.${index}.vmm`)} />
            </FormField>
            <FormField label="Time Zone" range="-12 – 14" error={dcErrors?.timeZone?.message}>
              <Input type="number" step="0.5"
                {...register(`datacenters.${index}.timeZone`, {
                  valueAsNumber: true,
                  min: { value: -12, message: 'Min −12' },
                  max: { value: 14, message: 'Max 14' },
                })} />
            </FormField>
            <FormField label="Scheduling Interval" range="0 – 3,600 s" error={dcErrors?.schedulingInterval?.message}>
              <Input type="number" step="0.1"
                {...register(`datacenters.${index}.schedulingInterval`, {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Must be ≥ 0' },
                  max: { value: 3600, message: 'Must be ≤ 3,600 s' },
                })} />
            </FormField>
            <FormField label="Cost/CPU-sec" range="0 – 100" error={dcErrors?.costPerSec?.message}>
              <Input type="number" step="0.01"
                {...register(`datacenters.${index}.costPerSec`, {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Must be ≥ 0' },
                  max: { value: 100, message: 'Must be ≤ 100' },
                })} />
            </FormField>
            <FormField label="Cost/MB RAM" range="0 – 1.0" error={dcErrors?.costPerMem?.message}>
              <Input type="number" step="0.001"
                {...register(`datacenters.${index}.costPerMem`, {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Must be ≥ 0' },
                  max: { value: 1.0, message: 'Must be ≤ 1.0 (typical: 0.05)' },
                })} />
            </FormField>
            <FormField label="Cost/MB Storage" range="0 – 0.1" error={dcErrors?.costPerStorage?.message}>
              <Input type="number" step="0.0001"
                {...register(`datacenters.${index}.costPerStorage`, {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Must be ≥ 0' },
                  max: { value: 0.1, message: 'Must be ≤ 0.1 (typical: 0.001)' },
                })} />
            </FormField>
            <FormField label="Cost/Mbps BW" range="0 – 100" error={dcErrors?.costPerBw?.message}>
              <Input type="number" step="0.01"
                {...register(`datacenters.${index}.costPerBw`, {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Must be ≥ 0' },
                  max: { value: 100, message: 'Must be ≤ 100' },
                })} />
            </FormField>
            <FormField label="VM Allocation Policy">
              <Controller control={control} name={`datacenters.${index}.vmAllocationPolicy`}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIMPLE">Simple (First Fit)</SelectItem>
                      <SelectItem value="SIMPLER">Simpler</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
            </FormField>
          </div>

          {/* Tier 3 – Network */}
          <div className="rounded border border-dashed border-blue-400/40 bg-blue-500/5 p-3 space-y-2">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Network (Tier 3) — informational; affects result display
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Latency to broker" range="0 – 60K ms" error={dcErrors?.networkLatencyMs?.message}>
                <Controller control={control} name={`datacenters.${index}.networkLatencyMs`}
                  rules={{ min: { value: 0, message: 'Must be ≥ 0' }, max: { value: 60000, message: 'Must be ≤ 60,000 ms' } }}
                  render={({ field }) => (
                    <Input type="number" step="1" placeholder="none"
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                  )} />
              </FormField>
              <FormField label="Link bandwidth" range="1 – 1M Mbps" error={dcErrors?.networkBandwidthMbps?.message}>
                <Controller control={control} name={`datacenters.${index}.networkBandwidthMbps`}
                  rules={{ min: { value: 1, message: 'Must be ≥ 1 Mbps' }, max: { value: 1000000, message: 'Must be ≤ 1,000,000 Mbps' } }}
                  render={({ field }) => (
                    <Input type="number" step="100" placeholder="none"
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                  )} />
              </FormField>
            </div>
          </div>

          {/* Hosts */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hosts</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => append(defaultHost())}>
                <Plus className="h-3 w-3 mr-1" />Add Host
              </Button>
            </div>
            <div className="space-y-2">
              {hostFields.map((host, hi) => (
                <HostRow key={host.id} dcIndex={index} hostIndex={hi}
                  register={register} control={control} errors={errors}
                  onRemove={() => remove(hi)} canRemove={hostFields.length > 1} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function HostRow({ dcIndex, hostIndex, register, control, errors, onRemove, canRemove }: any) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const base = `datacenters.${dcIndex}.hosts.${hostIndex}`
  const hostErrors = errors?.datacenters?.[dcIndex]?.hosts?.[hostIndex]

  return (
    <div className="rounded border p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <FormField label="MIPS/PE" range="100 – 1M" error={hostErrors?.mips?.message}>
          <Input type="number" {...register(`${base}.mips`, {
            valueAsNumber: true,
            min: { value: 100, message: 'Min 100' },
            max: { value: 1000000, message: 'Max 1,000,000' },
          })} />
        </FormField>
        <FormField label="PEs" range="1 – 256" error={hostErrors?.numberOfPes?.message}>
          <Input type="number" {...register(`${base}.numberOfPes`, {
            valueAsNumber: true,
            min: { value: 1, message: 'Min 1' },
            max: { value: 256, message: 'Max 256' },
          })} />
        </FormField>
        <FormField label="RAM (MB)" range="512 – 1M" error={hostErrors?.ram?.message}>
          <Input type="number" {...register(`${base}.ram`, {
            valueAsNumber: true,
            min: { value: 512, message: 'Min 512 MB' },
            max: { value: 1048576, message: 'Max 1,048,576 MB' },
          })} />
        </FormField>
        <FormField label="BW (Mbps)" range="100 – 1M" error={hostErrors?.bw?.message}>
          <Input type="number" {...register(`${base}.bw`, {
            valueAsNumber: true,
            min: { value: 100, message: 'Min 100 Mbps' },
            max: { value: 1000000, message: 'Max 1,000,000 Mbps' },
          })} />
        </FormField>
        <FormField label="Storage (MB)" range="1K – 10B" error={hostErrors?.storage?.message}>
          <Input type="number" {...register(`${base}.storage`, {
            valueAsNumber: true,
            min: { value: 1000, message: 'Min 1,000 MB' },
            max: { value: 10000000000, message: 'Max 10,000,000,000 MB' },
          })} />
        </FormField>
        <FormField label="VM Scheduler">
          <Controller control={control} name={`${base}.vmScheduler`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TIME_SHARED">Time Shared</SelectItem>
                  <SelectItem value="SPACE_SHARED">Space Shared</SelectItem>
                  <SelectItem value="TIME_SHARED_OVERSUBSCRIPTION">Time Shared (Over-sub)</SelectItem>
                </SelectContent>
              </Select>
            )} />
        </FormField>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Tier 2: Power model &amp; Failure injection
        </button>
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="ml-auto text-xs text-destructive hover:underline">
            Remove host
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-3 rounded border border-dashed border-amber-400/40 bg-amber-500/5 p-3 sm:grid-cols-3 lg:grid-cols-5">
          <FormField label={<span className="flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-500" />Power Model</span>}>
            <Controller control={control} name={`${base}.powerModel`}
              render={({ field }) => (
                <Select value={field.value ?? 'none'} onValueChange={v => field.onChange(v === 'none' ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="LINEAR">Linear</SelectItem>
                    <SelectItem value="SQUARE">Square</SelectItem>
                    <SelectItem value="CUBIC">Cubic</SelectItem>
                  </SelectContent>
                </Select>
              )} />
          </FormField>
          <FormField label={<span className="flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-500" />Max Power (W)</span>} range="1 – 10K" error={hostErrors?.maxPowerW?.message}>
            <Controller control={control} name={`${base}.maxPowerW`}
              rules={{ min: { value: 1, message: 'Min 1 W' }, max: { value: 10000, message: 'Max 10,000 W' } }}
              render={({ field }) => (
                <Input type="number" step="10" placeholder="e.g. 250"
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
              )} />
          </FormField>
          <FormField label={<span className="flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-500" />Idle Power</span>} range="0 – 1" error={hostErrors?.idlePowerPercent?.message}>
            <Controller control={control} name={`${base}.idlePowerPercent`}
              rules={{ min: { value: 0, message: 'Min 0' }, max: { value: 1, message: 'Max 1' } }}
              render={({ field }) => (
                <Input type="number" step="0.05" placeholder="0.40"
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
              )} />
          </FormField>
          <FormField label={<span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-500" />Failure Prob.</span>} range="0 – 1" error={hostErrors?.failureProbability?.message}>
            <Controller control={control} name={`${base}.failureProbability`}
              rules={{ min: { value: 0, message: 'Min 0' }, max: { value: 1, message: 'Max 1' } }}
              render={({ field }) => (
                <Input type="number" step="0.05" placeholder="0 = no failure"
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
              )} />
          </FormField>
          <FormField label={<span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-500" />Failure Time (s)</span>} range="0 – 1M s" error={hostErrors?.failureTimeS?.message}>
            <Controller control={control} name={`${base}.failureTimeS`}
              rules={{ min: { value: 0, message: 'Must be ≥ 0' }, max: { value: 1000000, message: 'Max 1,000,000 s' } }}
              render={({ field }) => (
                <Input type="number" step="0.5" placeholder="random"
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
              )} />
          </FormField>
        </div>
      )}
    </div>
  )
}

function VmRow({ index, control, register, errors, onRemove, canRemove, vmLimits }: any) {
  const vmErrors = errors?.vms?.[index]
  const { maxMips, maxPes, maxRam, maxBw, maxSize } = vmLimits as VmLimits

  return (
    <div className="grid grid-cols-2 gap-2 rounded border p-3 sm:grid-cols-3 lg:grid-cols-7">
      <div className="col-span-full text-xs font-medium text-muted-foreground">VM {index}</div>

      <FormField label="MIPS" range={`1 – ${abbr(maxMips)}`} error={vmErrors?.mips?.message}>
        <Input type="number" {...register(`vms.${index}.mips`, {
          valueAsNumber: true,
          min: { value: 1, message: 'Min 1' },
          max: { value: maxMips, message: `Max ${abbr(maxMips)} (best host MIPS)` },
        })} />
      </FormField>
      <FormField label="PEs" range={`1 – ${maxPes}`} error={vmErrors?.numberOfPes?.message}>
        <Input type="number" {...register(`vms.${index}.numberOfPes`, {
          valueAsNumber: true,
          min: { value: 1, message: 'Min 1' },
          max: { value: maxPes, message: `Max ${maxPes} (best host PEs)` },
        })} />
      </FormField>
      <FormField label="RAM (MB)" range={`128 – ${abbr(maxRam)}`} error={vmErrors?.ram?.message}>
        <Input type="number" {...register(`vms.${index}.ram`, {
          valueAsNumber: true,
          min: { value: 128, message: 'Min 128 MB' },
          max: { value: maxRam, message: `Max ${abbr(maxRam)} MB (best host RAM)` },
        })} />
      </FormField>
      <FormField label="BW (Mbps)" range={`1 – ${abbr(maxBw)}`} error={vmErrors?.bw?.message}>
        <Input type="number" {...register(`vms.${index}.bw`, {
          valueAsNumber: true,
          min: { value: 1, message: 'Min 1 Mbps' },
          max: { value: maxBw, message: `Max ${abbr(maxBw)} Mbps (best host BW)` },
        })} />
      </FormField>
      <FormField label="Size (MB)" range={`100 – ${abbr(maxSize)}`} error={vmErrors?.size?.message}>
        <Input type="number" {...register(`vms.${index}.size`, {
          valueAsNumber: true,
          min: { value: 100, message: 'Min 100 MB' },
          max: { value: maxSize, message: `Max ${abbr(maxSize)} MB (best host storage)` },
        })} />
      </FormField>
      <FormField label="Cloudlet Scheduler">
        <Controller control={control} name={`vms.${index}.cloudletScheduler`}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TIME_SHARED">Time Shared</SelectItem>
                <SelectItem value="SPACE_SHARED">Space Shared</SelectItem>
                <SelectItem value="DYNAMIC_WORKLOAD">Dynamic Workload</SelectItem>
              </SelectContent>
            </Select>
          )} />
      </FormField>

      {canRemove && (
        <div className="flex items-end">
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  )
}

function CloudletRow({ index, control, register, errors, onRemove, canRemove, vmCount, cloudletLimits }: any) {
  const clErrors = errors?.cloudlets?.[index]
  const { maxLength, maxPes, maxDeadline } = cloudletLimits as CloudletLimits

  return (
    <div className="grid grid-cols-2 gap-2 rounded border p-3 sm:grid-cols-4 lg:grid-cols-9">
      <div className="col-span-full text-xs font-medium text-muted-foreground">Cloudlet {index}</div>

      <FormField label="Length (MI)" range={`1 – ${abbr(maxLength)}`} error={clErrors?.length?.message}>
        <Input type="number" {...register(`cloudlets.${index}.length`, {
          valueAsNumber: true,
          min: { value: 1, message: 'Min 1 MI' },
          max: { value: maxLength, message: `Max ${abbr(maxLength)} MI (fastest VM × clock)` },
        })} />
      </FormField>
      <FormField label="PEs" range={`1 – ${maxPes}`} error={clErrors?.numberOfPes?.message}>
        <Input type="number" {...register(`cloudlets.${index}.numberOfPes`, {
          valueAsNumber: true,
          min: { value: 1, message: 'Min 1' },
          max: { value: maxPes, message: `Max ${maxPes} (best VM PEs)` },
        })} />
      </FormField>
      <FormField label="File Size" range="1 – 100M" error={clErrors?.fileSize?.message}>
        <Input type="number" {...register(`cloudlets.${index}.fileSize`, {
          valueAsNumber: true,
          min: { value: 1, message: 'Min 1' },
          max: { value: 100000000, message: 'Max 100,000,000' },
        })} />
      </FormField>
      <FormField label="Output Size" range="1 – 100M" error={clErrors?.outputSize?.message}>
        <Input type="number" {...register(`cloudlets.${index}.outputSize`, {
          valueAsNumber: true,
          min: { value: 1, message: 'Min 1' },
          max: { value: 100000000, message: 'Max 100,000,000' },
        })} />
      </FormField>
      <FormField label="CPU Util.">
        <Controller control={control} name={`cloudlets.${index}.utilizationModelCpu`}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL">Full</SelectItem>
                <SelectItem value="NULL">None</SelectItem>
                <SelectItem value="STOCHASTIC">Stochastic</SelectItem>
              </SelectContent>
            </Select>
          )} />
      </FormField>
      <FormField label="Deadline (s)" range={`0.1 – ${abbr(maxDeadline)}`} error={clErrors?.deadline?.message}>
        <Controller control={control} name={`cloudlets.${index}.deadline`}
          rules={{ min: { value: 0.1, message: 'Min 0.1 s' }, max: { value: maxDeadline, message: `Max ${abbr(maxDeadline)} s (simulation clock)` } }}
          render={({ field }) => (
            <Input type="number" step="0.1" placeholder="none"
              value={field.value ?? ''}
              onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
          )} />
      </FormField>
      <FormField label="Assign to VM">
        <Controller control={control} name={`cloudlets.${index}.assignedVmId`}
          render={({ field }) => (
            <Select value={field.value != null ? String(field.value) : 'auto'}
              onValueChange={v => field.onChange(v === 'auto' ? null : Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                {Array.from({ length: vmCount }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>VM {i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
      </FormField>

      {canRemove && (
        <div className="flex items-end">
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ── FormField ─────────────────────────────────────────────────────────────────
// The range hint always occupies one line (h-[14px]) even when absent.
// This keeps every input in a grid row vertically aligned regardless of
// whether its neighbour has a range hint or not.

function FormField({
  label, children, error, range,
}: {
  label: React.ReactNode
  children: React.ReactNode
  error?: string
  range?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs font-medium leading-none">{label}</Label>
      <span className="h-[14px] text-[10px] leading-none text-muted-foreground">
        {range ?? ''}
      </span>
      {children}
      {error && <p className="mt-0.5 text-xs text-destructive leading-tight">{error}</p>}
    </div>
  )
}
