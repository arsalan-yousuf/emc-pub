"use server";

import { createClient } from "@/lib/supabase/server";
import { generateMetabaseIframeUrl } from "@/lib/metabase";
import type { UserRole } from "@/lib/user-roles";

export interface DashboardProfileOption {
  id: string;
  label: string;
  dashboardId: number;
}

export interface DashboardProfilesResult {
  profiles: DashboardProfileOption[];
  initialProfileId: string;
  initialDashboardId: number | null;
  initialIframeUrl: string | null;
  isAdminView: boolean;
}

export async function refreshDashboardUrl(dashboardId: number): Promise<string> {
  return generateMetabaseIframeUrl(dashboardId);
}

export async function fetchDashboardProfiles(): Promise<DashboardProfilesResult> {
  const supabase = await createClient();

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Role check
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const role = (roleRow?.role as UserRole | undefined) || null;
  const isAdminView = role === "admin" || role === "super_admin";

  // Profiles with dashboards only
  let query = supabase
    .from("profiles")
    .select("id, first_name, last_name, email, metabase_dashboard_id")
    .not("metabase_dashboard_id", "is", null)
    .order("first_name", { ascending: true });

  if (!isAdminView) {
    query = query.eq("id", user.id);
  }

  const { data: profiles, error: profilesError } = await query;
  if (profilesError) {
    throw new Error(profilesError.message || "Failed to fetch profiles");
  }

  const profileOptions: DashboardProfileOption[] =
    profiles?.map((p) => ({
      id: p.id as string,
      label:
        (p.first_name || p.last_name)
          ? `${p.first_name || ""} ${p.last_name || ""}`.trim()
          : p.email || "Unbekanntes Profil",
      dashboardId: p.metabase_dashboard_id as number,
    })) || [];

  // Determine initial selection (prefer current user, else first available)
  const currentProfile = profileOptions.find((p) => p.id === user.id) || profileOptions[0];
  const initialProfileId = currentProfile?.id || user.id;
  const initialDashboardId = currentProfile?.dashboardId ?? null;
  const initialIframeUrl = initialDashboardId
    ? generateMetabaseIframeUrl(initialDashboardId)
    : null;

  return {
    profiles: profileOptions,
    initialProfileId,
    initialDashboardId,
    initialIframeUrl,
    isAdminView,
  };
}


