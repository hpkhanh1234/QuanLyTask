"use client";

/* ─── Base pulse bar ─── */
function Bar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
    />
  );
}

/* ─── Card skeleton ─── */
export function SkeletonCard() {
  return (
    <div className="card animate-pulse space-y-4">
      <Bar className="h-5 w-1/3" />
      <Bar className="h-4 w-2/3" />
      <Bar className="h-4 w-1/2" />
    </div>
  );
}

/* ─── Table skeleton ─── */
export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden p-0 animate-pulse">
      {/* Header */}
      <div className="flex gap-4 px-6 py-3 bg-vnpt-lightblue/50 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <Bar key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex gap-4 px-6 py-4 border-b border-gray-100 last:border-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Bar key={c} className={`h-4 ${c === 0 ? "w-1/4" : "flex-1"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Stat cards skeleton ─── */
export function SkeletonStatCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-200" />
            <div className="space-y-2">
              <Bar className="h-3 w-16" />
              <Bar className="h-5 w-10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Detail page skeleton ─── */
export function SkeletonDetail() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        <div className="card space-y-4">
          <div className="flex justify-between">
            <div className="space-y-2">
              <Bar className="h-6 w-2/3" />
              <Bar className="h-4 w-1/4" />
            </div>
            <Bar className="h-6 w-20 rounded-full" />
          </div>
          <div className="space-y-3">
            <Bar className="h-4 w-full" />
            <Bar className="h-4 w-5/6" />
            <Bar className="h-4 w-3/4" />
          </div>
        </div>
        <div className="card space-y-4">
          <Bar className="h-5 w-1/4" />
          <Bar className="h-20 w-full" />
          <Bar className="h-16 w-full" />
        </div>
      </div>
      {/* Sidebar */}
      <div className="space-y-6">
        <div className="card space-y-4">
          <Bar className="h-5 w-1/3" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-gray-200" />
              <div className="space-y-1.5">
                <Bar className="h-3 w-16" />
                <Bar className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
        <div className="card space-y-4">
          <Bar className="h-5 w-1/3" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Bar key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Tabs skeleton ─── */
export function SkeletonTabs() {
  return (
    <div className="flex gap-1 bg-vnpt-lightblue p-1.5 rounded-xl animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <Bar key={i} className="h-10 w-28 rounded-lg" />
      ))}
    </div>
  );
}

/* ─── Chart skeleton ─── */
export function SkeletonChart() {
  return (
    <div className="card animate-pulse">
      <Bar className="h-5 w-1/3 mb-4" />
      <div className="h-64 bg-gray-100 rounded-lg flex items-end justify-around px-4 pb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="w-8 bg-gray-200 rounded-t"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Form skeleton ─── */
export function SkeletonForm() {
  return (
    <div className="card animate-pulse space-y-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Bar className="h-4 w-1/4" />
          <Bar className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <Bar className="h-10 w-32 rounded-lg" />
    </div>
  );
}

/* ─── Notification list skeleton ─── */
export function SkeletonNotifications({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Bar className="h-4 w-2/3" />
            <Bar className="h-3 w-full" />
            <Bar className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
