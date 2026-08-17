import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  category?: string;
}

const DEFAULT_TITLE = "PLAWZA — Find places. Find opportunities.";
const DEFAULT_DESC = "Campus marketplace, accommodation, student businesses and culture.";
const DEFAULT_IMAGE = "https://plawza.com/icons/og-image-1200x630.png";

export function useSEOHead({ title, description, image, url, type = "website" }: SEOProps) {
  useEffect(() => {
    const pageTitle = title ? `${title} | PLAWZA` : DEFAULT_TITLE;
    const pageDesc = description || DEFAULT_DESC;
    const pageImage = image && !image.includes("pending-uploads") ? image : DEFAULT_IMAGE;
    const pageUrl = url || window.location.href;

    // 1. Title
    document.title = pageTitle;

    // Helper to set or create meta tag
    const setMetaTag = (selector: string, attrName: string, attrVal: string, contentVal: string) => {
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute("content", contentVal);
    };

    // 2. Standard Meta
    setMetaTag('meta[name="description"]', "name", "description", pageDesc);

    // 3. OpenGraph Tags
    setMetaTag('meta[property="og:type"]', "property", "og:type", type);
    setMetaTag('meta[property="og:url"]', "property", "og:url", pageUrl);
    setMetaTag('meta[property="og:title"]', "property", "og:title", pageTitle);
    setMetaTag('meta[property="og:description"]', "property", "og:description", pageDesc);
    setMetaTag('meta[property="og:image"]', "property", "og:image", pageImage);

    // 4. Twitter Card Tags
    setMetaTag('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMetaTag('meta[name="twitter:url"]', "name", "twitter:url", pageUrl);
    setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", pageTitle);
    setMetaTag('meta[name="twitter:description"]', "name", "twitter:description", pageDesc);
    setMetaTag('meta[name="twitter:image"]', "name", "twitter:image", pageImage);

    return () => {
      // Restore default title on unmount
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, image, url, type]);
}
