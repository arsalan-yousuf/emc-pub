import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { generateMetabaseIframeUrl } from "@/lib/metabase";
import DashboardIframe from "@/components/dashboard/DashboardIframe";

// Server action for refreshing dashboard URL
async function refreshDashboardUrl(dashboardId: number): Promise<string> {
  'use server';
  return generateMetabaseIframeUrl(dashboardId);
}

async function DashboardContent() {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect("/auth/login");
  }

  // Fetch user's profile to get dashboard_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('dashboard_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.dashboard_id) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-2">
            Dashboard ID not found
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact your administrator to set up your dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Generate initial iframe URL using the library function
  const iframeUrl = generateMetabaseIframeUrl(profile.dashboard_id);

  return (
    <DashboardIframe 
      iframeUrl={iframeUrl} 
      dashboardId={profile.dashboard_id}
      refreshDashboardUrl={refreshDashboardUrl}
    />
  );
}

function DashboardLoading() {
  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="text-center">
        <div className="loading" style={{ margin: '0 auto' }}></div>
        <p className="text-sm text-muted-foreground mt-4">Loading dashboard...</p>
      </div>
    </div>
  );
}

export default function ProtectedPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
