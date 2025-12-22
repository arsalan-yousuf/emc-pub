import SummaryContainer from "@/components/SummaryContainer";

// This page depends on authenticated user state via cookies/Supabase.
// Mark as dynamic and non-cached to avoid prerender/blocking-route issues.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SummariesPage() {
  // User role is now fetched via UserContext on the client side
  return <SummaryContainer />;
}

