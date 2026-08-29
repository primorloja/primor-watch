export const ORIGENS = [
  "Meta Ads",
  "Google Ads",
  "WhatsApp Orgânico",
  "Instagram Orgânico",
  "TikTok",
  "Indicação",
  "Cliente Antigo",
  "Marketplace",
  "Outro",
] as const;

export type Origem = (typeof ORIGENS)[number];

export const ORIGENS_PAGAS: string[] = ["Meta Ads", "Google Ads"];
