import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State {
  error: Error | null;
}

/**
 * Global error boundary — a rendering crash shows a recoverable panel
 * instead of a blank window.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[VOXEL] UI crash:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-radial-glow px-8 text-center">
          <TriangleAlert className="h-10 w-10 text-amber-400" />
          <div>
            <p className="text-lg font-semibold">Something broke in the interface</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              The shell caught the error — your projects and settings are safe
              on disk. Reload to continue.
            </p>
          </div>
          <pre className="max-w-lg overflow-auto rounded-lg border border-border/60 bg-card/60 p-3 text-left font-mono text-[10px] text-muted-foreground">
            {this.state.error.message}
          </pre>
          <Button variant="gradient" onClick={() => window.location.reload()}>
            <RotateCcw className="h-4 w-4" /> Reload VOXEL
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
