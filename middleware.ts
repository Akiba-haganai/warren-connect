/**
 * Vercel Edge Middleware for Dynamic OpenGraph Previews
 * Intercepts requests ONLY from social crawlers (WhatsApp, Facebook, Twitter, LinkedIn, etc.)
 * to serve pre-rendered OpenGraph HTML meta tags.
 * Regular human visitors pass through untouched directly to the Vite SPA.
 */

export const config = {
  matcher: ["/marketplace/:id*", "/accommodation/:id*"],
};

export default async function middleware(req: Request) {
  const userAgent = req.headers.get("user-agent") || "";
  const isCrawler =
    /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|TelegramBot|Slackbot|discordbot|Applebot|Pinterest|Googlebot|bingbot/i.test(
      userAgent
    );

  // For regular human visitors, pass through directly to the Vite SPA shell
  if (!isCrawler) {
    return;
  }

  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split("/").filter(Boolean);
  const resourceType = parts[0]; // "marketplace" or "accommodation"
  const resourceId = parts[1];

  if (!resourceId) return;

  // NOTE: no hardcoded fallback here on purpose. If these env vars aren't set
  // in the Vercel project settings, we skip the DB lookup entirely and serve
  // the static default preview below rather than silently using a baked-in key.
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  const defaultBanner = `${url.origin}/og-image-1200x630.png`;

  let title = "PLAWZA — Campus Marketplace & Student Hub";
  let description = "Find student deals, campus housing, and connect with your campus community on PLAWZA.";
  let imageUrl = defaultBanner;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[MIDDLEWARE-OG] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars — serving static default preview."
    );
  } else {
    try {
      if (resourceType === "marketplace") {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(resourceId)}&select=title,description,price,image_url,moderation_status`,
          {
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
            },
          }
        );
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
          const item = data[0];
          title = `${item.title} - K${Number(item.price || 0).toLocaleString()} | PLAWZA`;
          if (item.description) {
            description = item.description.slice(0, 160);
          }
          if (item.image_url && !item.image_url.includes("pending-uploads")) {
            if (item.image_url.startsWith("http")) {
              imageUrl = item.image_url;
            } else {
              const bucket = item.image_url.startsWith("product-images/") ? "product-images" : "public-images";
              const cleanPath = item.image_url.replace(/^(product-images|public-images)\//, "");
              imageUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
            }
          }
        }
      } else if (resourceType === "accommodation") {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/accommodations?id=eq.${encodeURIComponent(resourceId)}&select=title,description,monthly_rent,location,image_url,moderation_status`,
          {
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
            },
          }
        );
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
          const item = data[0];
          title = `${item.title} - K${Number(item.monthly_rent || 0).toLocaleString()}/mo | PLAWZA`;
          description = `${item.location ? `${item.location} • ` : ""}${
            item.description ? item.description.slice(0, 140) : "Student housing listing on PLAWZA"
          }`;
          if (item.image_url && !item.image_url.includes("pending-uploads")) {
            if (item.image_url.startsWith("http")) {
              imageUrl = item.image_url;
            } else {
              const bucket = item.image_url.startsWith("accommodation-images/") ? "accommodation-images" : "public-images";
              const cleanPath = item.image_url.replace(/^(accommodation-images|public-images)\//, "");
              imageUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
            }
          }
        }
      }
    } catch (err) {
      console.error("[MIDDLEWARE-OG] Fetch error:", err);
    }
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
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
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
      "Cache-Control": "public, max-age=60, s-maxage=3600",
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
