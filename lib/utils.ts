import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Get the site URL for redirects in auth emails.
 * Prefers NEXT_PUBLIC_SITE_URL env var (for production),
 * otherwise falls back to window.location.origin (for development).
 */
export function getSiteUrl(): string {
  // Server-side: use env var or default
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  }
  
  // Client-side: prefer env var, fallback to current origin
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
}
