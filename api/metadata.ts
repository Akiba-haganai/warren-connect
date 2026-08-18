import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  const { url, headers, query } = req;
  const userAgent = headers["user-agent"] || "";
  console.log(`[OG-PROXY] URL: ${url} | UA: ${userAgent}`);
  
  const protocol = headers["x-forwarded-proto"] || "https";
  const host = headers["x-forwarded-host"] || headers.host;
  
  let html = "";
  try {
    // Fetch the standard React PWA index.html shell so the app still mounts normally
    const response = await fetch(`${protocol}://${host}/index.html`);
    html = await response.text();
  } catch (err) {
    console.error("[OG-PROXY] Failed to fetch index.html:", err);
    return res.status(500).send("Error loading app");
  }

  const { type, id } = query;
  if (!id || !type) {
    return res.status(200).send(html);
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).send(html);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  let title = "PLAWZA";
  let description = "The all-in-one student marketplace.";
  let imageUrl = `${protocol}://${host}/icons/icon-512.png`;
  
  try {
    if (type === "product") {
      const { data } = await supabase.from("products").select("title, description, price, image_url").eq("id", id).single();
      if (data) {
        title = `${data.title} - K${data.price} | PLAWZA`;
        description = data.description || description;
        if (data.image_url) {
           imageUrl = data.image_url.startsWith("http") ? data.image_url : `${supabaseUrl}/storage/v1/object/public/product-images/${data.image_url}`;
        }
      }
    } else if (type === "accommodation") {
      const { data } = await supabase.from("accommodations").select("title, description, monthly_rent, image_url").eq("id", id).single();
      if (data) {
        title = `${data.title} - K${data.monthly_rent}/mo | PLAWZA`;
        description = data.description || description;
        if (data.image_url) {
           imageUrl = data.image_url.startsWith("http") ? data.image_url : `${supabaseUrl}/storage/v1/object/public/accommodation-images/${data.image_url}`;
        }
      }
    }
  } catch (err) {
    console.error("[OG-PROXY] Supabase fetch error:", err);
  }

  const ogTags = `
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${protocol}://${host}${url}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
  `;

  // Inject meta tags into the <head>
  const finalHtml = html.replace("</head>", `${ogTags}\n  </head>`);
  
  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=3600");
  res.status(200).send(finalHtml);
}
