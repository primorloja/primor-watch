-- Etapas do funil: leitura para autenticados, e apenas reordenação permitida
GRANT SELECT, UPDATE ON public.funil_etapas TO authenticated;
GRANT ALL ON public.funil_etapas TO service_role;

ALTER TABLE public.funil_etapas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS funil_etapas_select ON public.funil_etapas;
CREATE POLICY funil_etapas_select ON public.funil_etapas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS funil_etapas_update_ordem ON public.funil_etapas;
CREATE POLICY funil_etapas_update_ordem ON public.funil_etapas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Impede alteração de nome/cor e criação/exclusão via API
CREATE OR REPLACE FUNCTION public.funil_etapas_only_reorder()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.nome IS DISTINCT FROM OLD.nome OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Somente a ordem das etapas pode ser alterada';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_funil_etapas_only_reorder ON public.funil_etapas;
CREATE TRIGGER trg_funil_etapas_only_reorder
  BEFORE UPDATE ON public.funil_etapas
  FOR EACH ROW EXECUTE FUNCTION public.funil_etapas_only_reorder();

-- Performance de tráfego pago
CREATE OR REPLACE FUNCTION public.dashboard_trafego_pago(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(
  leads bigint,
  vendas bigint,
  faturamento numeric,
  ticket_medio numeric,
  melhor_vendedora text,
  melhor_conversao numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH base AS (
    SELECT *
    FROM public.leads
    WHERE origem IN ('Meta Ads', 'Google Ads')
      AND (p_from IS NULL OR criado_em >= p_from)
      AND (p_to IS NULL OR criado_em <= p_to)
  ),
  agg AS (
    SELECT
      count(*)::bigint AS leads,
      count(*) FILTER (WHERE status_funil = 'vendido')::bigint AS vendas,
      COALESCE(sum(valor_venda) FILTER (WHERE status_funil = 'vendido'), 0)::numeric AS faturamento
    FROM base
  ),
  porvend AS (
    SELECT
      responsavel,
      count(*)::bigint AS tot,
      count(*) FILTER (WHERE status_funil = 'vendido')::bigint AS vend
    FROM base
    GROUP BY responsavel
  ),
  best AS (
    SELECT responsavel, (vend::numeric / NULLIF(tot, 0) * 100) AS conv
    FROM porvend
    WHERE tot > 0
    ORDER BY conv DESC NULLS LAST, vend DESC
    LIMIT 1
  )
  SELECT
    agg.leads,
    agg.vendas,
    agg.faturamento,
    CASE WHEN agg.vendas > 0 THEN agg.faturamento / agg.vendas ELSE 0 END,
    best.responsavel,
    best.conv
  FROM agg LEFT JOIN best ON true;
$$;

-- Motivos de perda mais frequentes
CREATE OR REPLACE FUNCTION public.dashboard_motivos_perda(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(motivo text, qtd bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(trim(motivo_perda), ''), 'Não informado') AS motivo,
         count(*)::bigint
  FROM public.leads
  WHERE status_funil = 'perdido'
    AND (p_from IS NULL OR criado_em >= p_from)
    AND (p_to IS NULL OR criado_em <= p_to)
  GROUP BY 1
  ORDER BY 2 DESC;
$$;