import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the
 * child component tree and displays a fallback UI instead of crashing.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to electron-log via IPC (if available)
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleRecover = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="fixed inset-0 bg-bg flex items-center justify-center z-[10000]">
          <div className="max-w-[500px] p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-danger-bg mb-6">
              <AlertTriangle size={48} className="text-danger" />
            </div>
            <h2 className="m-0 mb-3 text-2xl font-semibold text-text">Something went wrong</h2>
            <p className="m-0 mb-6 text-sm text-text-secondary leading-relaxed">
              An unexpected error occurred. Your work may have been auto-saved.
            </p>
            {this.state.error && (
              <details className="text-left mb-6 p-3 bg-surface border border-border rounded-md max-h-[200px] overflow-auto">
                <summary className="cursor-pointer text-[13px] text-text-muted mb-2">Error details</summary>
                <pre className="font-mono text-[11px] text-text-secondary whitespace-pre-wrap break-words mt-2">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre className="font-mono text-[11px] text-text-secondary whitespace-pre-wrap break-words mt-2">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button onClick={this.handleRecover} className="btn btn-md btn-outline btn-secondary">
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="btn btn-md btn-filled btn-primary inline-flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
