"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton(props: { title?: string; isCollapsed?: boolean }) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <button
      className="nav-action-btn nav-action-btn-logout"
      onClick={logout}
      title={props.isCollapsed ? 'Logout' : undefined}
    >
      <LogOut className="nav-action-icon" />
      {!props.isCollapsed && <span className="nav-action-label">Logout</span>}
    </button>
  );
}
