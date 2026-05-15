import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { simulationApi, templateApi, savedConfigApi, type SimulationConfig } from '@/lib/api'

export function useSimulations() {
  return useQuery({
    queryKey: ['simulations'],
    queryFn: simulationApi.list,
  })
}

export function useSimulationResult(id: number) {
  return useQuery({
    queryKey: ['simulation', id],
    queryFn: () => simulationApi.get(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'COMPLETED' || status === 'FAILED') return false
      return 1000
    },
  })
}

export function useSubmitSimulation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (config: SimulationConfig) => simulationApi.submit(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulations'] })
    },
  })
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: templateApi.list,
    staleTime: Infinity,
  })
}

export function useTemplate(id: string | null) {
  return useQuery({
    queryKey: ['template', id],
    queryFn: () => templateApi.get(id!),
    enabled: !!id,
    staleTime: Infinity,
  })
}

export function useSavedConfigs() {
  return useQuery({
    queryKey: ['savedConfigs'],
    queryFn: savedConfigApi.list,
  })
}

export function useSavedConfig(id: number | null) {
  return useQuery({
    queryKey: ['savedConfig', id],
    queryFn: () => savedConfigApi.get(id!),
    enabled: id != null,
  })
}

export function useSaveConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (config: SimulationConfig) => savedConfigApi.save(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedConfigs'] })
    },
  })
}

export function useDeleteSavedConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => savedConfigApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedConfigs'] })
    },
  })
}
