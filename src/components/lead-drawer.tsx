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
import { STATUS_FUNIL, STATUS_LABEL, PERFIL_LABEL, formatDateTime, type StatusFunil } from "@/lib/primor";
import { Sparkles } from "lucide-react";
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
  valor_venda: number | null;
  data_venda: string | null;
  observacoes: string | null;
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
  const [valor, setValor] = useState<string>("");
  const [dataVenda, setDataVenda] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setStatus((lead.status_funil as StatusFunil) ?? "novo");
      setValor(lead.valor_venda != null ? String(lead.valor_venda) : "");
      setDataVenda(lead.data_venda ? lead.data_venda.slice(0, 10) : "");
      setObservacoes(lead.observacoes ?? "");
    }
  }, [lead?.id]);

  async function handleSave() {
    if (!lead) return;
    setSaving(true);
    const data_venda =
      status === "vendido"
        ? dataVenda
          ? new Date(dataVenda).toISOString()
          : new Date().toISOString()
        : null;
    const { error } = await supabase
      .from("leads")
      .update({
        status_funil: status,
        valor_venda: valor === "" ? null : Number(valor),
        observacoes: observacoes || null,
        data_venda,
      })
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
              <Info label="Cidade" value={lead.cidade || "—"} />
              <Info label="Perfil" value={lead.perfil ? PERFIL_LABEL[lead.perfil] ?? lead.perfil : "—"} />
              <Info label="Criado em" value={formatDateTime(lead.criado_em)} />
              <Info label="Última interação" value={formatDateTime(lead.ultima_interacao_em)} />
            </div>

            <div className="space-y-3 border-t pt-4">
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
                <Label>Valor da venda (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              {status === "vendido" && (
                <div className="space-y-2">
                  <Label>Data da venda</Label>
                  <Input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} />
                </div>
              )}
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
