import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  declare props: Readonly<Props>
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-sundown-bg p-8">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-xl font-bold text-sundown-text">
              Something went wrong
            </h1>
            <p className="text-sundown-muted text-sm">
              The app ran into an unexpected error. Reload to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-lg bg-sundown-gold text-black font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
