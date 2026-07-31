export default function RoommateCardSkeleton() {
  return (
    <div
      className="rounded-2xl p-4 flex gap-3 animate-pulse"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div
        className="rounded-full flex-shrink-0"
        style={{ width: 48, height: 48, background: "var(--color-border)" }}
      />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3.5 rounded w-1/2" style={{ background: "var(--color-border)" }} />
        <div className="h-3 rounded w-1/3" style={{ background: "var(--color-border)" }} />
        <div className="h-3 rounded w-2/3" style={{ background: "var(--color-border)" }} />
        <div className="flex gap-1 pt-1">
          <div className="h-4 w-14 rounded-full" style={{ background: "var(--color-border)" }} />
          <div className="h-4 w-12 rounded-full" style={{ background: "var(--color-border)" }} />
        </div>
      </div>
    </div>
  );
}
