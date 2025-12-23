"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Update this route to redirect to an authenticated route. The user already has an active session.
      router.push("/dashboard");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleForgotPassword} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="relative">
                <Input
                  id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Neues Passwort *"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
              className="h-12 border-gray-300 dark:border-gray-600 pr-10 focus:border-[#2563eb] focus:ring-[#2563eb] dark:bg-[#2a2a3e] dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2563eb] dark:text-gray-500 dark:hover:text-[#3b82f6]"
              aria-label={showPassword ? "Passwort ausblenden" : "Passwort anzeigen"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
              </div>
            </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-lg bg-gradient-to-r from-[#2563eb] to-[#1e40af] font-semibold text-white transition-all hover:from-[#1e40af] hover:to-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          {isLoading ? "Wird gespeichert..." : "PASSWORT AKTUALISIEREN"}
        </button>
          </form>
    </div>
  );
}
