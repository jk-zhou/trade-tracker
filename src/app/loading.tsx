export default function Loading() {
  return (
    <main className="w-full min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <div className="h-9 w-48 bg-muted/50 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted/30 rounded mt-2 animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-muted/30 rounded-full animate-pulse" />
          <div className="h-10 w-28 bg-primary/30 rounded-full animate-pulse" />
        </div>
      </header>

      {/* Tab skeleton */}
      <div className="flex border-b border-border mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 py-3 flex justify-center">
            <div className="h-4 w-16 bg-muted/40 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-3">
            <div className="h-3 w-20 bg-muted/40 rounded animate-pulse" />
            <div className="h-7 w-24 bg-muted/30 rounded animate-pulse" />
            <div className="space-y-1">
              <div className="h-3 w-full bg-muted/20 rounded animate-pulse" />
              <div className="h-3 w-full bg-muted/20 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
        <div className="h-5 w-40 bg-muted/40 rounded animate-pulse mb-6" />
        <div className="h-[350px] w-full bg-muted/10 rounded-lg animate-pulse flex items-center justify-center">
          <div className="text-muted-foreground/30 text-sm">Loading chart data...</div>
        </div>
      </div>
    </main>
  );
}
