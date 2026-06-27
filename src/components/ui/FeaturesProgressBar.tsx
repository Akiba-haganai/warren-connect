const features = [
  { name: "Authentication & profiles", done: true },
  { name: "Feed with posts, likes, comments", done: true },
  { name: "Marketplace with pagination", done: true },
  { name: "Multi‑image products & bulk upload", done: true },
  { name: "Accommodation with gallery & amenities", done: true },
  { name: "Roommate finder with preferences", done: true },
  { name: "Real‑time chat with unread counts", done: true },
  { name: "Notifications (in‑app + push ready)", done: true },
  { name: "Shops with collaborators", done: true },
  { name: "Shop reviews", done: true },
  { name: "Saved items with price‑drop alerts", done: true },
  { name: "Admin dashboard (reports, ban, hide)", done: true },
  { name: "Verification system", done: true },
  { name: "Tagging system & tag page", done: true },
  { name: "Global search", done: true },
  { name: "Dark mode & accessibility", done: true },
  { name: "PWA install, offline, update toast", done: true },
  { name: "Onboarding carousel & landing page", done: true },
  { name: "Legal pages & AdSense ready", done: true },
  { name: "Performance audit & error tracking", done: false },
  { name: "Push notification E2E test", done: false },
  { name: "Production deploy", done: false },
];

export default function FeatureProgressBar() {
  const done = features.filter((f) => f.done).length;
  const total = features.length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Project completion
        </span>
        <span className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full mb-3" style={{ background: "var(--color-border)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct === 100 ? "var(--color-success)" : "var(--color-primary)",
          }}
        />
      </div>
      <ul className="grid grid-cols-2 gap-1">
        {features.map((f) => (
          <li
            key={f.name}
            className="text-[11px] flex items-center gap-1"
            style={{
              color: f.done ? "var(--color-text-secondary)" : "var(--color-text-muted)",
            }}
          >
            <span style={{ color: f.done ? "var(--color-success)" : "var(--color-border)" }}>
              {f.done ? "✓" : "○"}
            </span>
            {f.name}
          </li>
        ))}
      </ul>
    </div>
  );
}