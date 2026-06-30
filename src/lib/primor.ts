export type PeriodKey = "today" | "7d" | "30d" | "month" | "custom" | "all";

export interface PeriodRange {
  from: Date | null;
  to: Date | null;
}

export const VENDEDORAS = ["Thamiris", "Julyana", "Gabrielle", "Fernanda"] as const;
export type Vendedora = (typeof VENDEDORAS)[number];

export const STATUS_FUNIL = [
  "novo",
  "em_atendimento",
  "qualificado",
  "negociando",
  "vendido",
  "perdido",
] as const;
export type StatusFunil = (typeof STATUS_FUNIL)[number];

export const STATUS_LABEL: Record<StatusFunil, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  qualificado: "Qualificado",
  negociando: "Negociando",
  vendido: "Vendido",
  perdido: "Perdido",
};

export const PERFIL_LABEL: Record<string, string> = {
  pf: "Pessoa Física",
  lojista: "Lojista",
  revendedor: "Revendedor",
};

export function getPeriodRange(key: PeriodKey, custom?: PeriodRange): PeriodRange {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  switch (key) {
    case "today":
      return { from: start, to: endOfToday };
    case "7d": {
      const from = new Date(start);
      from.setDate(from.getDate() - 6);
      return { from, to: endOfToday };
    }
    case "30d": {
      const from = new Date(start);
      from.setDate(from.getDate() - 29);
      return { from, to: endOfToday };
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to: endOfToday };
    }
    case "custom":
      return custom ?? { from: null, to: null };
    case "all":
    default:
      return { from: null, to: null };
  }
}

export function formatBRL(value: number | null | undefined): string {
  if (value == null || isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export function formatPercent(value: number): string {
  if (!isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function relativeFromNow(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  const months = Math.floor(days / 30);
  return `há ${months}mes`;
}
