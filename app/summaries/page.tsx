import SummaryContainer from "@/components/SummaryContainer";
import { getUserRoleServer } from "@/lib/user-roles-server";

// This page depends on authenticated user state via cookies/Supabase.
// Mark as dynamic and non-cached to avoid prerender/blocking-route issues.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SummariesPage() {
  // Fetch user role at the page level (server-side)
  const initialRole = await getUserRoleServer();

  return <SummaryContainer initialRole={initialRole} />;
}

