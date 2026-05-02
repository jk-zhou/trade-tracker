'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <main className="w-full min-h-screen p-4 md:p-8 max-w-4xl mx-auto flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-lg text-center max-w-md w-full space-y-4">
        <div className="flex justify-center">
          <div className="p-3 bg-destructive/10 rounded-full">
            <AlertTriangle size={32} className="text-destructive" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Failed to load dashboard data. This is usually caused by a temporary issue
          with the market data API. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-primary hover:bg-blue-600 text-primary-foreground px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    </main>
  );
}
