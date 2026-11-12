export function BoardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6" aria-busy="true" aria-label="Loading leaderboard">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton mt-4 h-10 w-72" />
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-3 items-end gap-3">
        <div className="skeleton h-36" />
        <div className="skeleton h-44" />
        <div className="skeleton h-32" />
      </div>
      <div className="card mt-6 divide-y divide-line">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <div className="skeleton size-8 rounded-full" />
            <div className="skeleton h-4 flex-1" />
            <div className="skeleton h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
