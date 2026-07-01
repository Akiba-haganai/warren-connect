export function timeAgo(date: string | Date | null): string {
  if (!date) return "";

  const now = Date.now();
  const then = new Date(date).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return "Yesterday";
  return new Date(then).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  const diffSec = (Date.now() - new Date(lastSeen).getTime()) / 1000;
  return diffSec <= 60; // online if heartbeat within last 60 seconds
}