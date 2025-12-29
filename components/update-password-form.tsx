"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react"


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
      router.push("/home");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="relative rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <div className="relative">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#0B3C5D] via-[#2F6FA3] to-[#7FB7D8] dark:from-[#2F6FA3] dark:via-[#5A9FC5] dark:to-[#7FB7D8] bg-clip-text text-transparent mb-2">
              Neues Passwort festlegen
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Geben Sie Ihr neues Passwort ein</p>
          </div>

          <form onSubmit={handleForgotPassword} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Neues Passwort *
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Geben Sie Ihr neues Passwort ein"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-gray-300 dark:border-gray-600 pr-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-[#2F6FA3] hover:bg-[#2F6FA3]/10 dark:text-gray-500 dark:hover:text-[#7FB7D8] dark:hover:bg-[#7FB7D8]/10 transition-all duration-200"
                  aria-label={showPassword ? "Passwort ausblenden" : "Passwort anzeigen"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 animate-in fade-in slide-in-from-top-1 duration-300">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="relative h-12 w-full rounded-lg bg-gradient-to-r from-[#0B3C5D] via-[#2F6FA3] to-[#7FB7D8] font-semibold text-white transition-all hover:from-[#082A3F] hover:via-[#1E5A8A] hover:to-[#5A9FC5] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              <span className="relative flex items-center justify-center gap-2">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Wird gespeichert..." : "PASSWORT AKTUALISIEREN"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
