/**
 * Capa padrão para listas sem imagem enviada.
 *
 * A capa é um SVG gerado localmente (data URI) com os tokens da marca, então
 * uma lista nunca nasce sem identidade visual e o upload pode continuar opcional.
 */

type CoverPalette = {
  from: string;
  to: string;
  accent: string;
};

const COVER_PALETTES: CoverPalette[] = [
  { from: "#31614F", to: "#1F3F33", accent: "#C08A3E" },
  { from: "#3B5F6B", to: "#24404A", accent: "#D2A15A" },
  { from: "#5A4A63", to: "#372C3F", accent: "#C99A6B" },
  { from: "#6B5140", to: "#423227", accent: "#D8AE72" },
  { from: "#44603C", to: "#2A3D26", accent: "#CFA24B" },
];

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitial(title: string) {
  const firstLetter = title.trim().replace(/[^\p{L}\p{N}]/gu, "").charAt(0);
  return (firstLetter || "W").toLocaleUpperCase("pt-BR");
}

/**
 * Gera uma capa determinística a partir do nome da lista: o mesmo título sempre
 * devolve a mesma arte, então a capa não "pisca" entre renders.
 */
export function buildDefaultListCover(title: string) {
  const seed = hashString(title.trim().toLocaleLowerCase("pt-BR") || "wishly");
  const palette = COVER_PALETTES[seed % COVER_PALETTES.length];
  const initial = getInitial(title);

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">`,
    `<defs>`,
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0" stop-color="${palette.from}"/>`,
    `<stop offset="1" stop-color="${palette.to}"/>`,
    `</linearGradient>`,
    `</defs>`,
    `<rect width="1200" height="800" fill="url(#bg)"/>`,
    `<circle cx="980" cy="170" r="240" fill="${palette.accent}" opacity="0.16"/>`,
    `<circle cx="215" cy="660" r="180" fill="${palette.accent}" opacity="0.1"/>`,
    `<text x="600" y="470" text-anchor="middle" font-family="Inter, system-ui, sans-serif"`,
    ` font-size="320" font-weight="600" fill="#F6F4F0" opacity="0.92">${initial}</text>`,
    `</svg>`,
  ].join("");

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Resolve a capa a ser exibida: a enviada pela pessoa ou a capa gerada.
 */
export function resolveListCover(coverUrl: string | null | undefined, title: string) {
  const trimmed = coverUrl?.trim();
  return trimmed ? trimmed : buildDefaultListCover(title);
}
