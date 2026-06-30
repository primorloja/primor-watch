import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  STATUS_FUNIL,
  STATUS_LABEL,
  VENDEDORAS,
  PERFIL_LABEL,
  formatBRL,
  relativeFromNow,
  type StatusFunil,
} from "@/lib/primor";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Search } from "lucide-react";
import { LeadDrawer } from "@/components/lead-drawer";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";

const searchSchema = z.object({
  leadId: z.string().optional(),
  view: z.enum(["tabela", "kanban"]).optional(),
});

export const Route = createFileRoute("/_authenticated/leads")({
  validateSearch: searchSchema,
  component: LeadsPage,
});

type Lead = {
  id: string;
  nome: string | null;
  telefone_e164: string;
  cidade: string | null;
  perfil: string | null;
  responsavel: string;
  status_funil: string;
  qualificado_ia: boolean | null;
  valor_venda: number | null;
  ultima_interacao_em: string | null;
  criado_em: string | null;
};

function LeadsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [view, setView] = useState<"tabela" | "kanban">(search.view ?? "tabela");
  const [q, setQ] = useState("");
  const [fResp, setFResp] = useState<string>("all");
  const [fCidade, setFCidade] = useState<string>("all");
  const [fPerfil, setFPerfil] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fQual, setFQual] = useState<string>("all");
  const [drawerId, setDrawerId] = useState<string | null>(search.leadId ?? null);

  useEffect(() => {
    setDrawerId(search.leadId ?? null);
  }, [search.leadId]);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id,nome,telefone_e164,cidade,perfil,responsavel,status_funil,qualificado_ia,valor_venda,ultima_interacao_em,criado_em",
        )
        .order("ultima_interacao_em", { ascending: false, nullsFirst: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const cidades = useMemo(
    () => Array.from(new Set(leads.map((l) => l.cidade).filter(Boolean) as string[])).sort(),
    [leads],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (fResp !== "all" && l.responsavel !== fResp) return false;
      if (fCidade !== "all" && l.cidade !== fCidade) return false;
      if (fPerfil !== "all" && l.perfil !== fPerfil) return false;
      if (fStatus !== "all" && l.status_funil !== fStatus) return false;
      if (fQual === "yes" && !l.qualificado_ia) return false;
      if (fQual === "no" && l.qualificado_ia) return false;
      if (term) {
        const hay = `${l.nome ?? ""} ${l.telefone_e164}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [leads, q, fResp, fCidade, fPerfil, fStatus, fQual]);

  async function updateStatus(id: string, status: StatusFunil) {
    const { error } = await supabase.from("leads").update({ status_funil: status }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    qc.invalidateQueries({ queryKey: ["leads"] });
  }

  function openLead(id: string) {
    setDrawerId(id);
    navigate({ to: "/leads", search: { leadId: id, view } });
  }

  return (
    <div className="p-4 md:p-8 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} leads</p>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as "tabela" | "kanban")}>
          <TabsList>
            <TabsTrigger value="tabela">Tabela</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-6">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nome ou telefone..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <FilterSelect value={fResp} onChange={setFResp} placeholder="Vendedora" options={VENDEDORAS.map((v) => ({ value: v, label: v }))} />
          <FilterSelect
            value={fCidade}
            onChange={setFCidade}
            placeholder="Cidade"
            options={cidades.map((c) => ({ value: c, label: c }))}
          />
          <FilterSelect
            value={fPerfil}
            onChange={setFPerfil}
            placeholder="Perfil"
            options={Object.entries(PERFIL_LABEL).map(([v, l]) => ({ value: v, label: l }))}
          />
          <FilterSelect
            value={fStatus}
            onChange={setFStatus}
            placeholder="Status"
            options={STATUS_FUNIL.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          />
          <FilterSelect
            value={fQual}
            onChange={setFQual}
            placeholder="Qualif. IA"
            options={[
              { value: "yes", label: "Sim" },
              { value: "no", label: "Não" },
            ]}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : view === "tabela" ? (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Nome</th>
                  <th className="px-4 py-2 font-medium">Vendedora</th>
                  <th className="px-4 py-2 font-medium">Cidade</th>
                  <th className="px-4 py-2 font-medium">Perfil</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Qualif.</th>
                  <th className="px-4 py-2 font-medium">Valor</th>
                  <th className="px-4 py-2 font-medium">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => openLead(l.id)}
                    className="border-t cursor-pointer hover:bg-accent/50"
                  >
                    <td className="px-4 py-2 font-medium">{l.nome || l.telefone_e164}</td>
                    <td className="px-4 py-2">{l.responsavel}</td>
                    <td className="px-4 py-2 text-muted-foreground">{l.cidade || "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{l.perfil ? PERFIL_LABEL[l.perfil] ?? l.perfil : "—"}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={l.status_funil as StatusFunil} />
                    </td>
                    <td className="px-4 py-2">
                      {l.qualificado_ia ? (
                        <Badge className="bg-[var(--rose-accent)] text-white border-transparent gap-1">
                          <Sparkles className="h-3 w-3" />
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{l.valor_venda != null ? formatBRL(Number(l.valor_venda)) : "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{relativeFromNow(l.ultima_interacao_em)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Nenhum lead encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <KanbanBoard leads={filtered} onOpen={openLead} onMove={updateStatus} />
      )}

      <LeadDrawer
        leadId={drawerId}
        open={!!drawerId}
        onOpenChange={(o) => {
          if (!o) {
            setDrawerId(null);
            navigate({ to: "/leads", search: { view } });
          }
        }}
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}: todos</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const STATUS_COLORS: Record<StatusFunil, string> = {
  novo: "bg-muted text-foreground",
  em_atendimento: "bg-[color-mix(in_oklab,var(--sage-soft)_60%,white)] text-foreground",
  qualificado: "bg-[var(--sage-soft)] text-foreground",
  negociando: "bg-[color-mix(in_oklab,var(--sage)_30%,white)] text-foreground",
  vendido: "bg-[var(--sage)] text-primary-foreground",
  perdido: "bg-muted text-muted-foreground line-through",
};

function StatusBadge({ status }: { status: StatusFunil }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-muted"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function KanbanBoard({
  leads,
  onOpen,
  onMove,
}: {
  leads: Lead[];
  onOpen: (id: string) => void;
  onMove: (id: string, status: StatusFunil) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const overStatus = e.over?.id as StatusFunil | undefined;
    if (!overStatus) return;
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status_funil === overStatus) return;
    onMove(id, overStatus);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {STATUS_FUNIL.map((s) => {
          const items = leads.filter((l) => l.status_funil === s);
          return <KanbanColumn key={s} status={s} items={items} onOpen={onOpen} />;
        })}
      </div>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  items,
  onOpen,
}: {
  status: StatusFunil;
  items: Lead[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="min-w-[260px] w-[260px] shrink-0 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">{STATUS_LABEL[status]}</h3>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-lg p-2 space-y-2 min-h-[200px] border ${
          isOver ? "bg-accent border-primary" : "bg-muted/30 border-transparent"
        }`}
      >
        {items.map((l) => (
          <KanbanCard key={l.id} lead={l} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({ lead, onOpen }: { lead: Lead; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(lead.id)}
      className="bg-card border rounded-md p-3 text-sm cursor-grab active:cursor-grabbing shadow-sm hover:shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium truncate">{lead.nome || lead.telefone_e164}</div>
        {lead.qualificado_ia && (
          <Sparkles className="h-3.5 w-3.5 text-[var(--rose-accent)] shrink-0" />
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-1 truncate">{lead.responsavel}</div>
      {lead.cidade && <div className="text-xs text-muted-foreground truncate">{lead.cidade}</div>}
      {lead.valor_venda != null && (
        <div className="text-xs mt-1 font-medium">{formatBRL(Number(lead.valor_venda))}</div>
      )}
    </div>
  );
}
