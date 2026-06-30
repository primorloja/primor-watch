import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PeriodFilter } from "@/components/period-filter";
import {
  getPeriodRange,
  VENDEDORAS,
  formatBRL,
  formatPercent,
  type PeriodKey,
  type PeriodRange,
} from "@/lib/primor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/vendedoras")({
  component: VendedorasPage,
});

type Lead = {
  responsavel: string;
  status_funil: string;
  qualificado_ia: boolean | null;
  valor_venda: number | null;
  criado_em: string | null;
};

function VendedorasPage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [custom, setCustom] = useState<PeriodRange>({ from: null, to: null });
  const [rankBy, setRankBy] = useState<"faturamento" | "conversao">("faturamento");
  const range = useMemo(() => getPeriodRange(period, custom), [period, custom]);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads-vend", range.from?.toISOString() ?? null, range.to?.toISOString() ?? null],
    queryFn: async () => {
      let q = supabase
        .from("leads")
        .select("responsavel,status_funil,qualificado_ia,valor_venda,criado_em")
        .limit(2000);
      if (range.from) q = q.gte("criado_em", range.from.toISOString());
      if (range.to) q = q.lte("criado_em", range.to.toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const stats = useMemo(() => {
    return VENDEDORAS.map((v) => {
      const ls = leads.filter((l) => l.responsavel === v);
      const total = ls.length;
      const qual = ls.filter((l) => l.qualificado_ia).length;
      const vendidos = ls.filter((l) => l.status_funil === "vendido");
      const fat = vendidos.reduce((acc, l) => acc + (Number(l.valor_venda) || 0), 0);
      const conv = total > 0 ? (vendidos.length / total) * 100 : 0;
      const ticket = vendidos.length > 0 ? fat / vendidos.length : 0;
      return {
        nome: v,
        total,
        qualPct: total > 0 ? (qual / total) * 100 : 0,
        conv,
        fat,
        ticket,
      };
    });
  }, [leads]);

  const ranking = useMemo(() => {
    return [...stats].sort((a, b) =>
      rankBy === "faturamento" ? b.fat - a.fat : b.conv - a.conv,
    );
  }, [stats, rankBy]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Vendedoras</h1>
          <p className="text-sm text-muted-foreground">Comparativo entre as 4 vendedoras</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} custom={custom} onCustomChange={setCustom} />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.nome}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{s.nome}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Total de leads" value={String(s.total)} />
                  <Row label="Qualificados IA" value={formatPercent(s.qualPct)} />
                  <Row label="Conversão" value={formatPercent(s.conv)} />
                  <Row label="Faturamento" value={formatBRL(s.fat)} highlight />
                  <Row label="Ticket médio" value={formatBRL(s.ticket)} />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Ranking</CardTitle>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={rankBy === "faturamento" ? "default" : "outline"}
                  onClick={() => setRankBy("faturamento")}
                >
                  Faturamento
                </Button>
                <Button
                  size="sm"
                  variant={rankBy === "conversao" ? "default" : "outline"}
                  onClick={() => setRankBy("conversao")}
                >
                  Conversão
                </Button>
              </div>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ranking} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis type="category" dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} width={90} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    formatter={(v: number) =>
                      rankBy === "faturamento" ? formatBRL(v) : formatPercent(v)
                    }
                  />
                  <Bar dataKey={rankBy === "faturamento" ? "fat" : "conv"} fill="var(--sage)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}
