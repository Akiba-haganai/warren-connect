/**
 * Vercel Edge Middleware for Dynamic OpenGraph Previews
 * Intercepts requests ONLY from social crawlers (WhatsApp, Facebook, Twitter, LinkedIn)
 * to serve pre-rendered OpenGraph HTML meta tags.
 * Regular human browser visitors pass through untouched to the Vite SPA.
 */

export const config = {
  matcher: ["/marketplace/:id*", "/accommodation/:id*"],
};

const SUPABASE_URL = "https://wryuhcujgslhwtvpxeey.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyeXVoY3VqZ3NsaHd0dnB4ZWV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDkyMzQsImV4cCI6MjA4NjMyNTIzNH0.R2gO51lZ89xL1mU0d6768a48-qS5-yQ5c2ZgO51lZ89";

const DEFAULT_BANNER = "https://plawza.com/icons/og-image-1200x630.png";

export default async function middleware(req: Request) {
  const userAgent = req.headers.get("user-agent") || "";
  const isCrawler =
    /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|TelegramBot|Slackbot|discordbot/i.test(
      userAgent
    );

  // For regular human visitors, pass through to Vite SPA index.html
  if (!isCrawler) {
    return;
  }

  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split("/").filter(Boolean);
  const resourceType = parts[0]; // "marketplace" or "accommodation"
  const resourceId = parts[1];

  if (!resourceId) return;

  let title = "PLAWZA — Find places. Find opportunities.";
  let description = "Campus marketplace, accommodation, businesses and student culture.";
  let imageUrl = DEFAULT_BANNER;

  try {
    if (resourceType === "marketplace") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/products?id=eq.${resourceId}&select=title,description,price,image_url,moderation_status`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      const data = await res.json();
      if (data && data[0] && data[0].moderation_status === "approved") {
        const item = data[0];
        title = `${item.title} | PLAWZA Marketplace`;
        description = `K${Number(item.price).toLocaleString()} • ${
          item.description ? item.description.slice(0, 150) : "Available on PLAWZA Marketplace"
        }`;
        if (item.image_url && !item.image_url.includes("pending-uploads")) {
          imageUrl = item.image_url;
        }
      }
    } else if (resourceType === "accommodation") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/accommodations?id=eq.${resourceId}&select=title,description,monthly_rent,location,image_url,moderation_status`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      const data = await res.json();
      if (data && data[0] && data[0].moderation_status === "approved") {
        const item = data[0];
        title = `${item.title} | PLAWZA Housing`;
        description = `K${Number(item.monthly_rent).toLocaleString()}/mo • ${
          item.location || "Student Housing"
        } — ${item.description ? item.description.slice(0, 120) : ""}`;
        if (item.image_url && !item.image_url.includes("pending-uploads")) {
          imageUrl = item.image_url;
        }
      }
    }
  } catch {
    // Fall back to default title & banner on network error
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <!-- OpenGraph Meta Tags -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(req.url)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${escapeHtml(req.url)}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <img src="${escapeHtml(imageUrl)}" alt="Preview" />
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
