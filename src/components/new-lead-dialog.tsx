import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  VENDEDORAS,
  STATUS_FUNIL,
  STATUS_LABEL,
  PERFIL_LABEL,
} from "@/lib/primor";
import { toast } from "sonner";

export function NewLeadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [perfil, setPerfil] = useState<string>("none");
  const [responsavel, setResponsavel] = useState<string>("");
  const [status, setStatus] = useState<string>("novo");
  const [observacoes, setObservacoes] = useState("");

  function reset() {
    setTelefone("");
    setNome("");
    setCidade("");
    setPerfil("none");
    setResponsavel("");
    setStatus("novo");
    setObservacoes("");
  }

  async function handleSave() {
    const tel = telefone.trim();
    if (!/^\+55\d{10,11}$/.test(tel)) {
      toast.error("Telefone inválido. Use o formato +55XXXXXXXXXXX");
      return;
    }
    if (!responsavel) {
      toast.error("Selecione a vendedora responsável");
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("leads").insert({
      telefone_e164: tel,
      nome: nome.trim() || null,
      cidade: cidade.trim() || null,
      perfil: perfil === "none" ? null : perfil,
      responsavel,
      status_funil: status,
      observacoes: observacoes.trim() || null,
      criado_em: now,
      ultima_interacao_em: now,
    });
    setSaving(false);
    if (error) {
      if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
        toast.error("Já existe um lead com esse telefone cadastrado");
      } else {
        toast.error("Erro ao criar lead: " + error.message);
      }
      return;
    }
    toast.success("Lead criado com sucesso");
    qc.invalidateQueries({ queryKey: ["leads"] });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="tel">Telefone *</Label>
            <Input
              id="tel"
              placeholder="+5511999999999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Perfil</Label>
            <Select value={perfil} onValueChange={setPerfil}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {Object.entries(PERFIL_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Responsável *</Label>
            <Select value={responsavel} onValueChange={setResponsavel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a vendedora" />
              </SelectTrigger>
              <SelectContent>
                {VENDEDORAS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Status inicial</Label>
            <Select value={status} onValueChange={setStatus}>
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
          <div className="grid gap-1.5">
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Criar lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
