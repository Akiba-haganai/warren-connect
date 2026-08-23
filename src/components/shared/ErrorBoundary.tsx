import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;              // ✅ added
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const isChunkError = error.name === "ChunkLoadError" || error.message.includes("Failed to fetch dynamically imported module");
    return { hasError: true, error, isChunkError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    
    if (this.state.isChunkError) {
      console.warn("Chunk load error detected. Unregistering SW and reloading...");
      const reload = () => setTimeout(() => window.location.reload(), 1500);
      
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
          reload();
        }).catch(reload);
      } else {
        reload();
      }
      return;
    }
    
    this.props.onError?.(error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, isChunkError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div className="fixed inset-0 z-[9999] bg-white dark:bg-gray-900 flex flex-col items-center justify-center">
            <RefreshCw size={40} className="animate-spin" style={{ color: "var(--color-accent)", marginBottom: 16 }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
              Updating App...
            </h2>
            <p className="text-sm mt-2" style={{ color: "var(--color-text-secondary)" }}>
              Fetching the latest version.
            </p>
          </div>
        );
      }

      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <AlertTriangle size={40} style={{ color: "var(--color-accent)", marginBottom: 12 }} />
          <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
            Something went wrong
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleRetry}
            className="btn-primary mt-4 flex items-center gap-2 w-auto px-6"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}