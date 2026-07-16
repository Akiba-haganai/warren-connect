export async function computePHash(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(8, 8);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to get 2d context");

  ctx.drawImage(img, 0, 0, 8, 8);
  const { data } = ctx.getImageData(0, 0, 8, 8);

  const grays: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    grays.push((data[i] + data[i + 1] + data[i + 2]) / 3);
  }

  const avg = grays.reduce((a, b) => a + b, 0) / grays.length;
  return grays.map((g) => (g >= avg ? "1" : "0")).join("");
}

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) {
    // fallback: compare up to min length
    const len = Math.min(a.length, b.length);
    let d = 0;
    for (let i = 0; i < len; i++) if (a[i] !== b[i]) d++;
    return d + Math.abs(a.length - b.length);
  }

  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

export function scoreListingRisk(title: string, description: string): number {
  const RISK_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
    { pattern: /pay(ment)? first|send money before/i, weight: 5 },
    { pattern: /urgent sale|must sell today|leaving country/i, weight: 3 },
    { pattern: /no returns?|final sale.{0,10}no exceptions/i, weight: 2 },
    { pattern: /whatsapp only|contact.{0,10}outside.{0,10}app/i, weight: 3 },
    { pattern: /western union|moneygram/i, weight: 4 },
  ];

  const text = `${title} ${description}`.toLowerCase();
  return RISK_PATTERNS.reduce((sum, { pattern, weight }) => sum + (pattern.test(text) ? weight : 0), 0);
}

