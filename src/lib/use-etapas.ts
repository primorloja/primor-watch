import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Etapa {
  id: string;
  nome: string;
  ordem: number;
  cor: string | null;
  /** valor correspondente em leads.status_funil */
  slug: string;
}

export function slugifyEtapa(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function useEtapas() {
  return useQuery({
    queryKey: ["funil-etapas"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Etapa[]> => {
      const { data, error } = await supabase
        .from("funil_etapas")
        .select("id,nome,ordem,cor")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((e) => ({
        id: e.id as string,
        nome: e.nome as string,
        ordem: Number(e.ordem),
        cor: (e.cor as string | null) ?? null,
        slug: slugifyEtapa(e.nome as string),
      }));
    },
  });
}
