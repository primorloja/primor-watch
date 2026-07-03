import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { STATUS_FUNIL, STATUS_LABEL, PERFIL_LABEL, formatBRL, formatDate, formatDateTime, type StatusFunil } from "@/lib/primor";
import { Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Lead = {
  id: string;
  nome: string | null;
  telefone_e164: string;
  cidade: string | null;
  perfil: string | null;
  responsavel: string;
  criado_em: string | null;
  ultima_interacao_em: string | null;
  status_funil: string;
  qualificado_ia: boolean | null;
  observacoes: string | null;
};

type Venda = {
  id: string;
  valor: number;
  data_venda: string;
  observacao: string | null;
  registrado_por: string | null;
  created_at: string;
};

type ChatMsg = {
  id: number;
  created_at: string;
  message: {
    type: "human" | "ai" | string;
    content: string | Record<string, unknown>;
  };
};

export function LeadDrawer({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data: lead } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
      if (error) throw error;
      return data as Lead | null;
    },
    enabled: !!leadId && open,
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ["vendas", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from("vendas")
        .select("id,valor,data_venda,observacao,registrado_por,created_at")
        .eq("lead_id", leadId)
        .order("data_venda", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Venda[];
    },
    enabled: !!leadId && open,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["chat", lead?.telefone_e164],
    queryFn: async () => {
      if (!lead) return [];
      const session = `primor_${lead.telefone_e164}`;
      const { data, error } = await supabase
        .from("n8n_chat_histories")
        .select("id,created_at,message")
        .eq("session_id", session)
        .order("id", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as ChatMsg[];
    },
    enabled: !!lead && open,
  });

  const [status, setStatus] = useState<StatusFunil>("novo");
  const [observacoes, setObservacoes] = useState("");
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [perfil, setPerfil] = useState<string>("");
  const [responsavel, setResponsavel] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const VENDEDORAS = ["Thamiris", "Julyana", "Gabrielle", "Fernanda"];

  // Nova compra
  const [novoValor, setNovoValor] = useState("");
  const [novaData, setNovaData] = useState(() => new Date().toISOString().slice(0, 10));
  const [novaObs, setNovaObs] = useState("");
  const [registrando, setRegistrando] = useState(false);

  useEffect(() => {
    if (lead) {
      setStatus((lead.status_funil as StatusFunil) ?? "novo");
      setObservacoes(lead.observacoes ?? "");
      setNome(lead.nome ?? "");
      setCidade(lead.cidade ?? "");
      setPerfil(lead.perfil ?? "");
      setResponsavel(lead.responsavel ?? "");
    }
  }, [lead?.id]);

  const totalComprado = vendas.reduce((s, v) => s + Number(v.valor || 0), 0);
  const numCompras = vendas.length;
  const ticketMedio = numCompras > 0 ? totalComprado / numCompras : 0;

  async function handleSave() {
    if (!lead) return;
    setSaving(true);
    const updatePayload: Record<string, unknown> = {
      status_funil: status,
      observacoes: observacoes || null,
      nome: nome.trim() || null,
      cidade: cidade.trim() || null,
      perfil: perfil || null,
    };
    if (responsavel && responsavel !== lead.responsavel) {
      updatePayload.responsavel = responsavel;
    }
    const { error } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", lead.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Lead atualizado");
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["lead", lead.id] });
  }

  async function syncLeadFromVendas(leadIdArg: string) {
    const { data } = await supabase
      .from("vendas")
      .select("valor,data_venda")
      .eq("lead_id", leadIdArg)
      .order("data_venda", { ascending: false })
      .limit(1);
    const latest = data?.[0];
    await supabase
      .from("leads")
      .update({
        valor_venda: latest ? Number(latest.valor) : null,
        data_venda: latest ? new Date(latest.data_venda).toISOString() : null,
      })
      .eq("id", leadIdArg);
  }

  async function handleRegistrarCompra() {
    if (!lead) return;
    const valorNum = Number(novoValor);
    if (!valorNum || valorNum <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!novaData) {
      toast.error("Informe a data da venda");
      return;
    }
    setRegistrando(true);
    const { error } = await supabase.from("vendas").insert({
      lead_id: lead.id,
      valor: valorNum,
      data_venda: novaData,
      observacao: novaObs.trim() || null,
      registrado_por: lead.responsavel,
    });
    if (error) {
      setRegistrando(false);
      toast.error("Erro ao registrar compra: " + error.message);
      return;
    }
    await syncLeadFromVendas(lead.id);
    setRegistrando(false);
    setNovoValor("");
    setNovaObs("");
    setNovaData(new Date().toISOString().slice(0, 10));
    toast.success("Compra registrada");
    qc.invalidateQueries({ queryKey: ["vendas", lead.id] });
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["lead", lead.id] });
    qc.invalidateQueries({ queryKey: ["leads-compras"] });
    qc.invalidateQueries({ queryKey: ["dash-kpis"] });
    qc.invalidateQueries({ queryKey: ["dash-vend"] });
    qc.invalidateQueries({ queryKey: ["vend-rpc"] });
  }

  async function handleExcluirCompra(vendaId: string) {
    if (!lead) return;
    const { error } = await supabase.from("vendas").delete().eq("id", vendaId);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    await syncLeadFromVendas(lead.id);
    toast.success("Compra excluída");
    qc.invalidateQueries({ queryKey: ["vendas", lead.id] });
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["lead", lead.id] });
    qc.invalidateQueries({ queryKey: ["leads-compras"] });
    qc.invalidateQueries({ queryKey: ["dash-kpis"] });
    qc.invalidateQueries({ queryKey: ["dash-vend"] });
    qc.invalidateQueries({ queryKey: ["vend-rpc"] });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        <SheetHeader className="p-6 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <span className="truncate">{lead?.nome || lead?.telefone_e164 || "Lead"}</span>
            {lead?.qualificado_ia && (
              <Badge className="bg-[var(--rose-accent)] text-white border-transparent gap-1">
                <Sparkles className="h-3 w-3" /> Qualificado pela IA
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>
        {!lead ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Telefone" value={lead.telefone_e164} />
              <Info label="Vendedora" value={lead.responsavel} />
              <Info label="Criado em" value={formatDateTime(lead.criado_em)} />
              <Info label="Última interação" value={formatDateTime(lead.ultima_interacao_em)} />
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label>Nome</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do lead" />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" />
                </div>
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select value={perfil || "__none"} onValueChange={(v) => setPerfil(v === "__none" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Não definido</SelectItem>
                      <SelectItem value="pf">{PERFIL_LABEL["pf"]}</SelectItem>
                      <SelectItem value="lojista">{PERFIL_LABEL["lojista"]}</SelectItem>
                      <SelectItem value="revendedor">{PERFIL_LABEL["revendedor"]}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as StatusFunil)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FUNIL.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Notas internas sobre o lead..."
                />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="font-medium">Histórico de Compras</h3>

              <div className="grid grid-cols-3 gap-2">
                <MiniCard label="Total comprado" value={formatBRL(totalComprado)} />
                <MiniCard label="Nº de compras" value={String(numCompras)} />
                <MiniCard label="Ticket médio" value={formatBRL(ticketMedio)} />
              </div>

              {vendas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma compra registrada.</p>
              ) : (
                <ul className="divide-y border rounded-md">
                  {vendas.map((v) => (
                    <li key={v.id} className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{formatBRL(Number(v.valor))}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(v.data_venda)}</span>
                        </div>
                        {v.observacao && (
                          <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                            {v.observacao}
                          </div>
                        )}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir compra?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. A compra de {formatBRL(Number(v.valor))} de {formatDate(v.data_venda)} será removida.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleExcluirCompra(v.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-3 border rounded-md p-3 bg-muted/30">
                <div className="text-sm font-medium">Registrar nova compra</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={novoValor}
                      onChange={(e) => setNovoValor(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data da venda</Label>
                    <Input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Textarea
                    rows={2}
                    value={novaObs}
                    onChange={(e) => setNovaObs(e.target.value)}
                    placeholder="Detalhes da compra (opcional)"
                  />
                </div>
                <Button onClick={handleRegistrarCompra} disabled={registrando} className="w-full">
                  {registrando ? "Registrando..." : "Registrar Compra"}
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Histórico da conversa</h3>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem mensagens registradas.</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => {
                    const isHuman = m.message?.type === "human";
                    let content = "";
                    const raw = m.message?.content;
                    if (typeof raw === "string") {
                      try {
                        const parsed = JSON.parse(raw);
                        content = parsed?.resposta ?? raw;
                      } catch {
                        content = raw;
                      }
                    } else if (raw && typeof raw === "object") {
                      content = (raw as Record<string, string>).resposta ?? JSON.stringify(raw);
                    }
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isHuman ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                            isHuman
                              ? "bg-muted text-foreground rounded-bl-sm"
                              : "bg-primary text-primary-foreground rounded-br-sm"
                          }`}
                        >
                          <div>{content}</div>
                          <div className={`mt-1 text-[10px] opacity-70`}>
                            {formatDateTime(m.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value}</div>
    </div>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
