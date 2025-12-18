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

/**
 * Refreshes the Metabase dashboard URL with a new JWT token
 * @param dashboardId - The ID of the Metabase dashboard
 * @returns The new iframe URL with embedded JWT token
 * @throws Error if dashboardId is invalid or URL generation fails
 */
export async function refreshDashboardUrl(dashboardId: number): Promise<string> {
  if (!dashboardId || dashboardId <= 0) {
    throw new Error("Invalid dashboard ID");
  }
  
  try {
    return generateMetabaseIframeUrl(dashboardId);
  } catch (error) {
    console.error("Error generating dashboard URL:", error);
    throw new Error("Failed to generate dashboard URL");
  }
}

/**
 * Fetches dashboard profiles based on user role and permissions
 * @returns Dashboard profiles and initial configuration
 * @throws Error if authentication fails or data fetch fails
 */
export async function fetchDashboardProfiles(): Promise<DashboardProfilesResult> {
  const supabase = await createClient();

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Role check
  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (roleError) {
    console.error("Error fetching user role:", roleError);
    // Continue without role - user will only see their own dashboard
  }

  const role = (roleRow?.role as UserRole | undefined) || null;
  const isAdminView = role === "admin" || role === "super_admin";

  // Build query for profiles with dashboards only
  let query = supabase
    .from("profiles")
    .select("id, first_name, last_name, email, metabase_dashboard_id")
    .not("metabase_dashboard_id", "is", null)
    .order("first_name", { ascending: true });

  // Non-admin users can only see their own dashboard
  if (!isAdminView) {
    query = query.eq("id", user.id);
  }

  const { data: profiles, error: profilesError } = await query;
  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    throw new Error(profilesError.message || "Failed to fetch profiles");
  }

  // Transform profiles to options
  const profileOptions: DashboardProfileOption[] =
    profiles?.map((p) => {
      const firstName = p.first_name || "";
      const lastName = p.last_name || "";
      const email = p.email || "";
      
      const label = firstName || lastName
        ? `${firstName} ${lastName}`.trim()
        : email || "Unbekanntes Profil";

      return {
        id: p.id as string,
        label,
        dashboardId: p.metabase_dashboard_id as number,
      };
    }) || [];

  // Determine initial selection (prefer current user, else first available)
  const currentProfile = profileOptions.find((p) => p.id === user.id) || profileOptions[0];
  const initialProfileId = currentProfile?.id || user.id;
  const initialDashboardId = currentProfile?.dashboardId ?? null;
  
  let initialIframeUrl: string | null = null;
  if (initialDashboardId) {
    try {
      initialIframeUrl = generateMetabaseIframeUrl(initialDashboardId);
    } catch (error) {
      console.error("Error generating initial iframe URL:", error);
      // Continue without URL - will show error message
    }
  }

  return {
    profiles: profileOptions,
    initialProfileId,
    initialDashboardId,
    initialIframeUrl,
    isAdminView,
  };
}


