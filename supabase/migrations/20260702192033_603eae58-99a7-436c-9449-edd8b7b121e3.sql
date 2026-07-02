
CREATE OR REPLACE FUNCTION public.dashboard_kpis(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(total bigint, qualificados bigint, vendidos bigint, faturamento numeric)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  WITH l AS (
    SELECT
      count(*)::bigint AS total,
      count(*) FILTER (WHERE qualificado_ia IS TRUE)::bigint AS qualificados
    FROM public.leads
    WHERE (p_from IS NULL OR criado_em >= p_from)
      AND (p_to IS NULL OR criado_em <= p_to)
  ),
  v AS (
    SELECT
      count(*)::bigint AS vendidos,
      COALESCE(sum(valor), 0)::numeric AS faturamento
    FROM public.vendas
    WHERE (p_from IS NULL OR data_venda >= p_from::date)
      AND (p_to IS NULL OR data_venda <= p_to::date)
  )
  SELECT l.total, l.qualificados, v.vendidos, v.faturamento FROM l, v;
$$;

CREATE OR REPLACE FUNCTION public.dashboard_vendedoras(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(responsavel text, leads bigint, qualificados bigint, vendas bigint, faturamento numeric)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  WITH l AS (
    SELECT
      responsavel,
      count(*)::bigint AS leads,
      count(*) FILTER (WHERE qualificado_ia IS TRUE)::bigint AS qualificados
    FROM public.leads
    WHERE (p_from IS NULL OR criado_em >= p_from)
      AND (p_to IS NULL OR criado_em <= p_to)
    GROUP BY responsavel
  ),
  v AS (
    SELECT
      ld.responsavel,
      count(*)::bigint AS vendas,
      COALESCE(sum(vd.valor), 0)::numeric AS faturamento
    FROM public.vendas vd
    JOIN public.leads ld ON ld.id = vd.lead_id
    WHERE (p_from IS NULL OR vd.data_venda >= p_from::date)
      AND (p_to IS NULL OR vd.data_venda <= p_to::date)
    GROUP BY ld.responsavel
  )
  SELECT
    COALESCE(l.responsavel, v.responsavel) AS responsavel,
    COALESCE(l.leads, 0) AS leads,
    COALESCE(l.qualificados, 0) AS qualificados,
    COALESCE(v.vendas, 0) AS vendas,
    COALESCE(v.faturamento, 0) AS faturamento
  FROM l FULL OUTER JOIN v ON l.responsavel = v.responsavel;
$$;

-- Aggregated purchase counts/totals per lead
CREATE OR REPLACE FUNCTION public.leads_compras_agg()
RETURNS TABLE(lead_id uuid, qtd bigint, total numeric)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT lead_id, count(*)::bigint, COALESCE(sum(valor), 0)::numeric
  FROM public.vendas
  GROUP BY lead_id;
$$;

GRANT EXECUTE ON FUNCTION public.leads_compras_agg() TO authenticated;
