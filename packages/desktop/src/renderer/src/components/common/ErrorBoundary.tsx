import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { IconButton } from '@renderer/components/common/IconButton';
import { useUIStore } from '@renderer/store/uiStore';

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

  getErrorDetailsText = (): string => {
    const errorText = this.state.error ? this.state.error.toString() : 'Unknown error';
    const stackText = this.state.error?.stack ?? '';
    const componentStackText = this.state.errorInfo?.componentStack ?? '';
    return [
      'Carvd Studio Error',
      `Time: ${new Date().toISOString()}`,
      '',
      `Error: ${errorText}`,
      stackText ? `Stack:\n${stackText}` : '',
      componentStackText ? `Component Stack:${componentStackText}` : ''
    ]
      .filter(Boolean)
      .join('\n\n');
  };

  copyTextToClipboard = async (text: string): Promise<void> => {
    if (window.navigator.clipboard?.writeText) {
      await window.navigator.clipboard.writeText(text);
      return;
    }

    // Fallback for environments without navigator.clipboard
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };

  handleCopyError = async (): Promise<void> => {
    try {
      await this.copyTextToClipboard(this.getErrorDetailsText());
      useUIStore.getState().showToast('Error copied to clipboard', 'success');
    } catch {
      useUIStore.getState().showToast('Failed to copy error details', 'error');
    }
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
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-end">
                  <IconButton label="Copy error details" size="sm" variant="ghost" onClick={this.handleCopyError}>
                    <Copy size={14} />
                  </IconButton>
                </div>
                <details className="text-left p-3 bg-surface border border-border rounded-md max-h-[200px] overflow-auto">
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
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <Button size="default" variant="outline" onClick={this.handleRecover}>
                Try Again
              </Button>
              <Button size="default" onClick={this.handleReload}>
                <RefreshCw size={16} />
                Reload App
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
