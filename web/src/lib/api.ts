const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    const err = new ApiError(res.status, body.error ?? res.statusText)
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After')
      err.retryAfter = retryAfter ? parseInt(retryAfter, 10) : undefined
    }
    throw err
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export class ApiError extends Error {
  status: number
  retryAfter?: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const api = {
  get:    <T>(path: string) => request<T>(path),
  post:   <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body != null ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser { userId: number; email: string }
export const authApi = {
  register: (email: string, password: string) =>
    api.post<AuthUser>('/auth/register', { email, password }),
  login: (email: string, password: string) =>
    api.post<AuthUser>('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me:     () => api.get<AuthUser>('/auth/me'),
}

// ── Simulation config types ───────────────────────────────────────────────────

export type VmAllocationPolicyType  = 'SIMPLE' | 'SIMPLER'
export type VmSchedulerType         = 'TIME_SHARED' | 'SPACE_SHARED' | 'TIME_SHARED_OVERSUBSCRIPTION'
export type CloudletSchedulerType   = 'TIME_SHARED' | 'SPACE_SHARED' | 'DYNAMIC_WORKLOAD'
export type UtilizationModelType    = 'FULL' | 'NULL' | 'STOCHASTIC'
export type SimulationStatus        = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
export type PowerModelType          = 'NONE' | 'LINEAR' | 'SQUARE' | 'CUBIC'

export interface HostConfig {
  mips: number
  numberOfPes: number
  ram: number
  bw: number
  storage: number
  vmScheduler: VmSchedulerType
  // Tier 2 – power model
  powerModel: PowerModelType | null
  maxPowerW: number | null
  idlePowerPercent: number | null
  // Tier 2 – failure injection
  failureProbability: number | null
  failureTimeS: number | null
}

export interface DatacenterConfig {
  name: string
  architecture: string
  os: string
  vmm: string
  timeZone: number
  costPerSec: number
  costPerMem: number
  costPerStorage: number
  costPerBw: number
  schedulingInterval: number
  vmAllocationPolicy: VmAllocationPolicyType
  hosts: HostConfig[]
  // Tier 3 – network
  networkLatencyMs: number | null
  networkBandwidthMbps: number | null
}

export interface VmConfig {
  mips: number
  numberOfPes: number
  ram: number
  bw: number
  size: number
  vmm: string
  cloudletScheduler: CloudletSchedulerType
}

export interface CloudletConfig {
  length: number
  numberOfPes: number
  fileSize: number
  outputSize: number
  utilizationModelCpu: UtilizationModelType
  utilizationModelRam: UtilizationModelType
  utilizationModelBw: UtilizationModelType
  assignedVmId: number | null
  deadline: number | null
}

export interface SimulationConfig {
  templateId?: string | null
  name: string
  datacenters: DatacenterConfig[]
  vms: VmConfig[]
  cloudlets: CloudletConfig[]
  simulationClock: number
  traceFlag: boolean
}

// ── Simulation result types ───────────────────────────────────────────────────

export interface CloudletResult {
  id: number
  status: string
  datacenterId: number
  vmId: number
  submissionTime: number
  startTime: number
  finishTime: number
  execTime: number
  waitingTime: number
  cpuCostRate: number
  cpuCost: number
  bwCost: number
  totalCost: number
  slaViolated: boolean
  failureReason: string | null
}

export interface VmStats {
  vmId: number
  cloudletCount: number
  completedCount: number
  avgExecTime: number
  totalCost: number
  cpuUtilization: number
}

export interface HostEnergy {
  hostId: number
  datacenterName: string
  avgCpuUtilization: number
  peakPowerW: number
  avgPowerW: number
  energyWh: number
  runtimeS: number
}

export interface FailureEvent {
  datacenterName: string
  hostId: number
  failureTimeS: number
  affectedCloudlets: number
  affectedCloudletIds: number[]
}

export interface SummaryStats {
  totalCloudlets: number
  completedCloudlets: number
  failedCloudlets: number
  makespan: number
  avgExecTime: number
  minExecTime: number
  maxExecTime: number
  p95ExecTime: number
  avgWaitTime: number
  maxWaitTime: number
  totalCost: number
  throughput: number
  slaViolations: number
  slaViolationRate: number
  // Tier 2 – energy
  totalEnergyWh: number
  avgPowerW: number
  // Tier 2 – failure injection
  injectedFailures: number
}

export interface SimulationSummary {
  id: number
  name: string
  status: SimulationStatus
  createdAt: string
  templateId: string | null
  totalCloudlets: number
  completedCloudlets: number
  failedCloudlets: number
  makespan: number
  totalCost: number
}

export interface SimulationResult {
  id: number
  name: string
  status: SimulationStatus
  createdAt: string
  completedAt: string | null
  config: SimulationConfig
  summary: SummaryStats
  cloudlets: CloudletResult[]
  vmStats: VmStats[]
  hostEnergy: HostEnergy[]
  failureEvents: FailureEvent[]
  logs: string
  logsTruncated: boolean
}

export interface TemplateMeta {
  id: string
  name: string
  description: string
}

// ── Sweep types ───────────────────────────────────────────────────────────────

export type SweepDimension =
  | 'VM_COUNT'
  | 'VM_MIPS'
  | 'HOST_COUNT'
  | 'CLOUDLET_COUNT'
  | 'CLOUDLET_LENGTH'

export interface SweepConfig {
  name: string
  baseConfig: SimulationConfig
  dimension: SweepDimension
  start: number
  end: number
  step: number
}

export interface SweepPointResult {
  paramValue: number
  paramCount: number
  summary: SummaryStats
}

export interface SweepResult {
  name: string
  dimension: string
  points: SweepPointResult[]
}

// ── API clients ───────────────────────────────────────────────────────────────

export const simulationApi = {
  submit: (config: SimulationConfig) =>
    api.post<{ simulationId: number; status: string }>('/simulations', config),
  list: () => api.get<SimulationSummary[]>('/simulations'),
  get:  (id: number) => api.get<SimulationResult>(`/simulations/${id}`),
}

export const templateApi = {
  list: () => api.get<TemplateMeta[]>('/templates'),
  get:  (id: string) => api.get<SimulationConfig>(`/templates/${id}`),
}

export const savedConfigApi = {
  save:   (config: SimulationConfig) => api.post<SavedConfigMeta>('/configs', config),
  list:   () => api.get<SavedConfigMeta[]>('/configs'),
  get:    (id: number) => api.get<SimulationConfig>(`/configs/${id}`),
  delete: (id: number) => api.delete<void>(`/configs/${id}`),
}

export const sweepApi = {
  run: (config: SweepConfig) => api.post<SweepResult>('/sweeps', config),
}

export interface SavedConfigMeta {
  id: number
  name: string
  createdAt: string
}
