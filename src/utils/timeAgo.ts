export const timeAgo = (date: string | Date): string => {
  const now = new Date();
  const past = new Date(date);
  const diffSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffSeconds / 86400);
    return `${days}d ago`;
  }
};