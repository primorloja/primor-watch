import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "gestora" | "vendedora";

export function normalizeRole(raw: unknown): Role {
  return raw === "gestora" ? "gestora" : "vendedora";
}

export async function getCurrentRole(): Promise<Role> {
  const { data } = await supabase.auth.getUser();
  return normalizeRole(data.user?.user_metadata?.role);
}

export function useRole(): Role | null {
  const [role, setRole] = useState<Role | null>(null);
  useEffect(() => {
    let mounted = true;
    getCurrentRole().then((r) => {
      if (mounted) setRole(r);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setRole(normalizeRole(session?.user?.user_metadata?.role));
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return role;
}
