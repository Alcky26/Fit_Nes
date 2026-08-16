import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

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

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled error:', error, info.componentStack)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="page error-boundary">
          <h1>Something went wrong</h1>
          <p>
            The app hit an unexpected error. Your data is safe in this browser's storage — reloading usually fixes
            it.
          </p>
          <button type="button" className="btn btn--primary btn--lg" onClick={this.handleReload}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
