import { Share2 } from "lucide-react";
import { useState } from "react";

interface Props {
  title: string;
  text: string;
  url?: string;
}

export default function ShareButton({ title, text, url }: Props) {
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    if (typeof navigator.share !== "function") return;
    try {
      await navigator.share({ title, text, url: url || window.location.href });
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // user cancelled or error
    }
  };

  if (typeof navigator.share !== "function") return null;

  return (
    <button
      onClick={handleShare}
      className="btn-ghost text-xs flex items-center gap-1"
    >
      <Share2 size={14} />
      {shared ? "Shared!" : "Share"}
    </button>
  );
}