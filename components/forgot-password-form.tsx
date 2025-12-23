"use client";

import { cn, getSiteUrl } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteUrl()}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a3e] p-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#2563eb] to-[#1e40af] bg-clip-text text-transparent">E-Mail prüfen</h2>
          <p className="text-base text-gray-600 dark:text-gray-400">
            Anweisungen zum Zurücksetzen des Passworts wurden gesendet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
              Wenn Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort registriert haben, erhalten Sie
            eine E-Mail zum Zurücksetzen Ihres Passworts.
            </p>
        </div>
      ) : (
        <form onSubmit={handleForgotPassword} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
                  <Input
                    id="email"
                    type="email"
              placeholder="E-Mail-Adresse *"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
              className="h-12 border-gray-300 dark:border-gray-600 focus:border-[#2563eb] focus:ring-[#2563eb] dark:bg-[#2a2a3e] dark:text-white"
                  />
                </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="h-12 w-full rounded-lg bg-gradient-to-r from-[#2563eb] to-[#1e40af] font-semibold text-white transition-all hover:from-[#1e40af] hover:to-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            {isLoading ? "Wird gesendet..." : "E-MAIL ZUM ZURÜCKSETZEN SENDEN"}
          </button>

          <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                Bereits ein Konto?{" "}
                <Link
                  href="/auth/login"
              className="text-[#2563eb] font-medium hover:text-[#1e40af] hover:underline dark:text-[#3b82f6] dark:hover:text-[#60a5fa]"
                >
                  Anmelden
                </Link>
              </div>
            </form>
      )}
    </div>
  );
}
