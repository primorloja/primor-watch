
ALTER FUNCTION public.dashboard_kpis(timestamptz, timestamptz) SECURITY INVOKER;
ALTER FUNCTION public.dashboard_funil(timestamptz, timestamptz) SECURITY INVOKER;
ALTER FUNCTION public.dashboard_leads_por_dia(timestamptz, timestamptz) SECURITY INVOKER;
ALTER FUNCTION public.dashboard_vendedoras(timestamptz, timestamptz) SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.dashboard_kpis(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dashboard_funil(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dashboard_leads_por_dia(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dashboard_vendedoras(timestamptz, timestamptz) FROM PUBLIC, anon;
