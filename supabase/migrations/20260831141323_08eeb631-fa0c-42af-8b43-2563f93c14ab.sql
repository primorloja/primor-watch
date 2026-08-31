-- Função auxiliar para ler o perfil do JWT
CREATE OR REPLACE FUNCTION public.is_gestora()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'gestora',
    false
  );
$$;

-- Substitui a política ampla por políticas por operação
DROP POLICY IF EXISTS autenticados_full_access_leads ON public.leads;

CREATE POLICY leads_select ON public.leads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY leads_insert ON public.leads
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY leads_update ON public.leads
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY leads_delete_gestora ON public.leads
  FOR DELETE TO authenticated USING (public.is_gestora());

-- Excluir lead remove também as vendas vinculadas
ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS vendas_lead_id_fkey;
ALTER TABLE public.vendas
  ADD CONSTRAINT vendas_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;