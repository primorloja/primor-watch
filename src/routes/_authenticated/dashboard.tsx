import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PeriodFilter } from "@/components/period-filter";
import {
  getPeriodRange,
  formatBRL,
  formatPercent,
  STATUS_FUNIL,
  STATUS_LABEL,
  VENDEDORAS,
  relativeFromNow,
  type PeriodKey,
  type PeriodRange,
  type StatusFunil,
} from "@/lib/primor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

type Lead = {
  id: string;
  responsavel: string;
  cidade: string | null;
  perfil: string | null;
  status_funil: string;
  qualificado_ia: boolean | null;
  valor_venda: number | null;
  data_venda: string | null;
  criado_em: string | null;
  ultima_interacao_em: string | null;
  nome: string | null;
  telefone_e164: string;
};

function useLeads(range: PeriodRange) {
  return useQuery({
    queryKey: ["leads", range.from?.toISOString() ?? null, range.to?.toISOString() ?? null],
    queryFn: async () => {
      let q = supabase
        .from("leads")
        .select(
          "id,responsavel,cidade,perfil,status_funil,qualificado_ia,valor_venda,data_venda,criado_em,ultima_interacao_em,nome,telefone_e164",
        )
        .order("criado_em", { ascending: false })
        .limit(1000);
      if (range.from) q = q.gte("criado_em", range.from.toISOString());
      if (range.to) q = q.lte("criado_em", range.to.toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });
}

function DashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [custom, setCustom] = useState<PeriodRange>({ from: null, to: null });
  const [vendMetric, setVendMetric] = useState<"leads" | "qualificados" | "vendas" | "faturamento">("leads");
  const range = useMemo(() => getPeriodRange(period, custom), [period, custom]);
  const { data: leads = [], isLoading } = useLeads(range);

  const kpis = useMemo(() => {
    const total = leads.length;
    const qualificados = leads.filter((l) => l.qualificado_ia).length;
    const vendidos = leads.filter((l) => l.status_funil === "vendido");
    const faturamento = vendidos.reduce((acc, l) => acc + (Number(l.valor_venda) || 0), 0);
    const conversao = total > 0 ? (vendidos.length / total) * 100 : 0;
    const ticketMedio = vendidos.length > 0 ? faturamento / vendidos.length : 0;
    return {
      total,
      qualificados,
      qualificadosPct: total > 0 ? (qualificados / total) * 100 : 0,
      conversao,
      faturamento,
      ticketMedio,
      vendidosCount: vendidos.length,
    };
  }, [leads]);

  const funilData = useMemo(() => {
    return STATUS_FUNIL.map((s) => ({
      status: STATUS_LABEL[s],
      qtd: leads.filter((l) => l.status_funil === s).length,
    }));
  }, [leads]);

  const leadsPorDia = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach((l) => {
      if (!l.criado_em) return;
      const d = new Date(l.criado_em);
      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, qtd]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        qtd,
      }));
  }, [leads]);

  const vendedorasData = useMemo(() => {
    return VENDEDORAS.map((v) => {
      const ls = leads.filter((l) => l.responsavel === v);
      const vendidos = ls.filter((l) => l.status_funil === "vendido");
      const fat = vendidos.reduce((acc, l) => acc + (Number(l.valor_venda) || 0), 0);
      return {
        nome: v,
        leads: ls.length,
        qualificados: ls.filter((l) => l.qualificado_ia).length,
        vendas: vendidos.length,
        faturamento: fat,
      };
    });
  }, [leads]);

  const semInteracao = useMemo(() => {
    return [...leads]
      .filter((l) => l.status_funil !== "vendido" && l.status_funil !== "perdido")
      .sort((a, b) => {
        const da = a.ultima_interacao_em ? new Date(a.ultima_interacao_em).getTime() : 0;
        const db = b.ultima_interacao_em ? new Date(b.ultima_interacao_em).getTime() : 0;
        return da - db;
      })
      .slice(0, 8);
  }, [leads]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Visão Geral</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhamento do atendimento da IA no WhatsApp
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} custom={custom} onCustomChange={setCustom} />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando dados...</div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <Kpi title="Total de Leads" value={kpis.total.toString()} />
            <Kpi
              title="Qualificados pela IA"
              value={kpis.qualificados.toString()}
              hint={formatPercent(kpis.qualificadosPct)}
            />
            <Kpi title="Conversão" value={formatPercent(kpis.conversao)} hint={`${kpis.vendidosCount} vendas`} />
            <Kpi title="Faturamento" value={formatBRL(kpis.faturamento)} />
            <Kpi title="Ticket Médio" value={formatBRL(kpis.ticketMedio)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funil de leads</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funilData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis type="category" dataKey="status" stroke="var(--muted-foreground)" fontSize={12} width={110} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                    <Bar dataKey="qtd" fill="var(--sage)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads criados por dia</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={leadsPorDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                    <Line type="monotone" dataKey="qtd" stroke="var(--sage)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Comparativo entre vendedoras</CardTitle>
              <div className="flex flex-wrap gap-1">
                {(["leads", "qualificados", "vendas", "faturamento"] as const).map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={vendMetric === m ? "default" : "outline"}
                    onClick={() => setVendMetric(m)}
                  >
                    {m === "leads" ? "Leads" : m === "qualificados" ? "Qualificados" : m === "vendas" ? "Vendas" : "Faturamento"}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendedorasData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    formatter={(v: number) => (vendMetric === "faturamento" ? formatBRL(v) : v)}
                  />
                  <Bar dataKey={vendMetric} fill="var(--sage)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads sem interação recente</CardTitle>
            </CardHeader>
            <CardContent>
              {semInteracao.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada por aqui — bom trabalho!</p>
              ) : (
                <ul className="divide-y">
                  {semInteracao.map((l) => (
                    <li key={l.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to="/leads"
                          search={{ leadId: l.id } as never}
                          className="font-medium hover:underline truncate"
                        >
                          {l.nome || l.telefone_e164}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {l.responsavel} · {STATUS_LABEL[l.status_funil as StatusFunil] ?? l.status_funil}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{relativeFromNow(l.ultima_interacao_em)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
