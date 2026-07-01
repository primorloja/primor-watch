
-- Aggregation RPCs for dashboard (avoid 1000-row PostgREST limit).

CREATE OR REPLACE FUNCTION public.dashboard_kpis(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(total bigint, qualificados bigint, vendidos bigint, faturamento numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    count(*)::bigint,
    count(*) FILTER (WHERE qualificado_ia IS TRUE)::bigint,
    count(*) FILTER (WHERE status_funil = 'vendido')::bigint,
    COALESCE(sum(valor_venda) FILTER (WHERE status_funil = 'vendido'), 0)::numeric
  FROM public.leads
  WHERE (p_from IS NULL OR criado_em >= p_from)
    AND (p_to   IS NULL OR criado_em <= p_to);
$$;

CREATE OR REPLACE FUNCTION public.dashboard_funil(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(status_funil text, qtd bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT status_funil, count(*)::bigint
  FROM public.leads
  WHERE (p_from IS NULL OR criado_em >= p_from)
    AND (p_to   IS NULL OR criado_em <= p_to)
  GROUP BY status_funil;
$$;

CREATE OR REPLACE FUNCTION public.dashboard_leads_por_dia(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(dia date, qtd bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (criado_em AT TIME ZONE 'America/Sao_Paulo')::date AS dia, count(*)::bigint
  FROM public.leads
  WHERE (p_from IS NULL OR criado_em >= p_from)
    AND (p_to   IS NULL OR criado_em <= p_to)
    AND criado_em IS NOT NULL
  GROUP BY 1
  ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.dashboard_vendedoras(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(responsavel text, leads bigint, qualificados bigint, vendas bigint, faturamento numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    responsavel,
    count(*)::bigint,
    count(*) FILTER (WHERE qualificado_ia IS TRUE)::bigint,
    count(*) FILTER (WHERE status_funil = 'vendido')::bigint,
    COALESCE(sum(valor_venda) FILTER (WHERE status_funil = 'vendido'), 0)::numeric
  FROM public.leads
  WHERE (p_from IS NULL OR criado_em >= p_from)
    AND (p_to   IS NULL OR criado_em <= p_to)
  GROUP BY responsavel;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_kpis(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_funil(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_leads_por_dia(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_vendedoras(timestamptz, timestamptz) TO authenticated;
