/**
 * Deterministic, self-contained placeholder art for a menu item — an initials
 * badge in a color picked from the brand palette, rendered as an inline SVG
 * data URI. No network request, so it never shows a broken-image icon and
 * never depends on external art we don't have.
 */

const PALETTE: readonly [bg: string, fg: string][] = [
  ["#7d1f2d", "#fff9f0"], // lacquer maroon / cream
  ["#b7893b", "#2a1c10"], // brass / dark roast
  ["#77856c", "#fff9f0"], // sage / cream
  ["#3a1a14", "#f3ebe0"], // dark roast / clay
  ["#c98a63", "#2a1c10"], // caramel / dark roast
  ["#5b6b83", "#fff9f0"], // slate blue / cream
];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Up to 2 uppercase initials from the item's name. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&apos;",
  );
}

/** A square SVG data URI: colored rounded square + centered initials. */
export function placeholderImage(seed: string, size = 96): string {
  const [bg, fg] = PALETTE[hash(seed) % PALETTE.length];
  const label = escapeXml(initials(seed));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 96 96">` +
    `<rect width="96" height="96" rx="18" fill="${bg}"/>` +
    `<text x="48" y="58" font-family="Georgia, 'Lora', serif" font-size="32" font-weight="600" ` +
    `fill="${fg}" text-anchor="middle">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
