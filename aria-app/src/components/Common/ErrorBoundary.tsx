import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ARIA frontend error', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="error-boundary" role="alert">
        <div className="error-boundary-card">
          <div className="brand-mark" aria-hidden="true">!</div>
          <h1>ARIA needs to reload</h1>
          <p>The application encountered an unexpected display error. Reloading will restore the latest saved state.</p>
          <button className="primary-button" onClick={() => window.location.reload()}>Reload application</button>
        </div>
      </main>
    )
  }
}
