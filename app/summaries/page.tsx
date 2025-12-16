import SummaryContainer from "@/components/SummaryContainer";
import { getUserRoleServer } from "@/lib/user-roles-server";

export default async function SummariesPage() {
  // Fetch user role at the page level (server-side)
  const initialRole = await getUserRoleServer();

  return <SummaryContainer initialRole={initialRole} />;
}

