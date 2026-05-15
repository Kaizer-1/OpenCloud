import React from 'react'

interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? String(error) }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center bg-background">
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="max-w-lg rounded bg-muted px-4 py-2 font-mono text-xs text-destructive">
            {this.state.message || 'Unknown error'}
          </p>
          <p className="text-xs text-muted-foreground">Check the browser console for the full stack trace.</p>
          <a href="/dashboard" className="text-sm text-indigo-500 underline">← Back to Dashboard</a>
          <button
            className="text-xs text-muted-foreground underline"
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
