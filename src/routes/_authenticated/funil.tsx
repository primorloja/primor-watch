import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEtapas, type Etapa } from "@/lib/use-etapas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/funil")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { getCurrentRole } = await import("@/lib/use-role");
    const { redirect } = await import("@tanstack/react-router");
    const role = await getCurrentRole();
    if (role !== "gestora") throw redirect({ to: "/leads" });
  },
  component: FunilPage,
});

function FunilPage() {
  const { data: etapas = [], isLoading } = useEtapas();
  const qc = useQueryClient();
  const [ordem, setOrdem] = useState<Etapa[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOrdem(etapas);
  }, [etapas]);

  function move(index: number, dir: -1 | 1) {
    const next = [...ordem];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index]!;
    const b = next[target]!;
    next[index] = b;
    next[target] = a;
    setOrdem(next);
  }

  async function salvar() {
    setSaving(true);
    for (let i = 0; i < ordem.length; i++) {
      const e = ordem[i]!;
      const { error } = await supabase
        .from("funil_etapas")
        .update({ ordem: i + 1 })
        .eq("id", e.id);
      if (error) {
        setSaving(false);
        toast.error("Erro ao salvar ordem: " + error.message);
        return;
      }
    }
    setSaving(false);
    toast.success("Ordem do funil atualizada");
    qc.invalidateQueries({ queryKey: ["funil-etapas"] });
  }

  const dirty = ordem.some((e, i) => etapas[i]?.id !== e.id);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Configurações do Funil</h1>
        <p className="text-sm text-muted-foreground">
          Reordene as etapas exibidas no Kanban e nos filtros.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Etapas (nomes fixos)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Os nomes das etapas não podem ser alterados, criados ou excluídos — integrações
            externas dependem desses valores exatos.
          </p>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <ul className="divide-y border rounded-md">
              {ordem.map((e, i) => (
                <li key={e.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                    <span className="font-medium truncate">{e.nome}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      disabled={i === ordem.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button onClick={salvar} disabled={!dirty || saving} className="w-full">
            {saving ? "Salvando..." : "Salvar ordem"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
