import toast from "react-hot-toast";

interface ShareItemOptions {
  title: string;
  price?: number | string;
  location?: string;
  type: "post" | "product" | "accommodation";
  id: string;
}

export function shareToWhatsApp({ title, price, location, type, id }: ShareItemOptions) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://warren-market.vercel.app";
  let targetUrl = `${origin}/post/${id}`;
  let message = `💬 *${title}*\n\nRead and reply on PLAWZA:\n${targetUrl}`;

  if (type === "product") {
    targetUrl = `${origin}/marketplace/${id}`;
    const priceText = price ? ` - *K${price}*` : "";
    message = `🛒 *${title}*${priceText}\n\nCheck it out on PLAWZA:\n${targetUrl}`;
  } else if (type === "accommodation") {
    targetUrl = `${origin}/accommodation/${id}`;
    const priceText = price ? ` - *K${price}/mo*` : "";
    const locText = location ? ` (${location})` : "";
    message = `🏠 *${title}*${priceText}${locText}\n\nView details & contact owner on PLAWZA:\n${targetUrl}`;
  }

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  try {
    window.open(waUrl, "_blank", "noopener,noreferrer");
  } catch {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message);
      toast.success("Link copied! Paste it in your WhatsApp chat.");
    }
  }
}
