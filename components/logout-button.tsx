"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton(props: { title?: string; isCollapsed?: boolean }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    // Prevent multiple clicks
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    // Set a timeout to ensure we always redirect, even if signOut hangs
    const redirectTimeout = setTimeout(() => {
      window.location.replace("/auth/login");
    }, 1000); // Redirect after 1 second regardless
    
    try {
    const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
      }
      
      // Clear timeout and redirect immediately if signOut completes
      clearTimeout(redirectTimeout);
      window.location.replace("/auth/login");
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear timeout and redirect on error
      clearTimeout(redirectTimeout);
      window.location.replace("/auth/login");
    }
  };

  return (
    <button
      className="nav-action-btn nav-action-btn-logout"
      onClick={logout}
      disabled={isLoggingOut}
      title={props.isCollapsed ? 'Logout' : undefined}
      type="button"
    >
      <LogOut className="nav-action-icon" />
      {!props.isCollapsed && (
        <span className="nav-action-label">
          {isLoggingOut ? 'Logging out...' : props.title || 'Logout'}
        </span>
      )}
    </button>
  );
}
