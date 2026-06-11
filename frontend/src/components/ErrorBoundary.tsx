import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-bg-primary text-text-primary">
          <div className="text-center">
            <h1 className="text-xl font-bold mb-2">Algo deu errado</h1>
            <p className="text-sm text-text-muted mb-4">{this.state.error?.message}</p>
            <button onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm">
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
