export type EtiquetaCategoria = "comportamento" | "acao" | "interesse";

export interface EtiquetaDef {
  nome: string;
  categoria: EtiquetaCategoria;
  /** classes tailwind usando tokens semânticos de etiqueta */
  className: string;
}

const COMPORTAMENTO = "bg-[var(--tag-green)]/15 text-[var(--tag-green)] border-[var(--tag-green)]/40";
const COMPORTAMENTO_ALT = "bg-[var(--tag-yellow)]/15 text-[var(--tag-yellow)] border-[var(--tag-yellow)]/40";
const ACAO = "bg-[var(--tag-red)]/15 text-[var(--tag-red)] border-[var(--tag-red)]/40";
const ACAO_ALT = "bg-[var(--tag-orange)]/15 text-[var(--tag-orange)] border-[var(--tag-orange)]/40";
const INTERESSE = "bg-[var(--tag-blue)]/15 text-[var(--tag-blue)] border-[var(--tag-blue)]/40";
const INTERESSE_ALT = "bg-[var(--tag-purple)]/15 text-[var(--tag-purple)] border-[var(--tag-purple)]/40";

export const ETIQUETAS: EtiquetaDef[] = [
  { nome: "CLIENTE ATIVO", categoria: "comportamento", className: COMPORTAMENTO },
  { nome: "CLIENTE INATIVO", categoria: "comportamento", className: COMPORTAMENTO_ALT },
  { nome: "CLIENTE VIP", categoria: "comportamento", className: COMPORTAMENTO },
  { nome: "PRIMEIRA COMPRA", categoria: "comportamento", className: COMPORTAMENTO_ALT },
  { nome: "RECORRENTE", categoria: "comportamento", className: COMPORTAMENTO },
  { nome: "ALTO POTENCIAL", categoria: "comportamento", className: COMPORTAMENTO_ALT },

  { nome: "RETORNAR CONTATO", categoria: "acao", className: ACAO },
  { nome: "AGUARDANDO RESPOSTA", categoria: "acao", className: ACAO_ALT },
  { nome: "ENVIAR CATÁLOGO", categoria: "acao", className: ACAO_ALT },
  { nome: "FINALIZAR PEDIDO", categoria: "acao", className: ACAO },

  { nome: "REPOSIÇÃO", categoria: "interesse", className: INTERESSE },
  { nome: "NOVIDADES", categoria: "interesse", className: INTERESSE_ALT },
  { nome: "PROMOÇÕES", categoria: "interesse", className: INTERESSE },
  { nome: "PREÇO", categoria: "interesse", className: INTERESSE_ALT },
];

export const CATEGORIA_LABEL: Record<EtiquetaCategoria, string> = {
  comportamento: "Comportamento",
  acao: "Ação",
  interesse: "Interesse",
};

export function etiquetaClass(nome: string): string {
  return (
    ETIQUETAS.find((e) => e.nome === nome)?.className ??
    "bg-muted text-muted-foreground border-border"
  );
}
