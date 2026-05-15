import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { RequireAuth } from '@/components/RequireAuth'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from '@/components/Toaster'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import NewSimulation from '@/pages/NewSimulation'
import SimulationResult from '@/pages/SimulationResult'
import SavedConfigs from '@/pages/SavedConfigs'
import Analytics from '@/pages/Analytics'
import Compare from '@/pages/Compare'
import ParameterSweep from '@/pages/ParameterSweep'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/simulations/new" element={<RequireAuth><NewSimulation /></RequireAuth>} />
            <Route path="/simulations/:id" element={<RequireAuth><SimulationResult /></RequireAuth>} />
            <Route path="/configs" element={<RequireAuth><SavedConfigs /></RequireAuth>} />
            <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
            <Route path="/compare" element={<RequireAuth><Compare /></RequireAuth>} />
            <Route path="/sweep" element={<RequireAuth><ParameterSweep /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  )
}
