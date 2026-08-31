CREATE OR REPLACE FUNCTION public.is_gestora()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt() -> 'user_metadata' ->> 'role') = 'gestora', false);
$$;

REVOKE ALL ON FUNCTION public.is_gestora() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_gestora() TO authenticated, service_role;