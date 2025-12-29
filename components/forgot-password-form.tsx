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
      <div className="relative">
        {/* Gradient border effect */}
        {/* <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-2xl opacity-20 blur-sm"></div> */}

        {/* Main card container with glassmorphism */}
        <div className="relative bg-white/95 backdrop-blur-xs rounded-2xl shadow-2xl p-8">
          {success ? (
            <div className="flex flex-col gap-4 text-center">
              {/* Success icon */}
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-3xl font-bold bg-gradient-to-r from-[#0B3C5D] via-[#2F6FA3] to-[#7FB7D8] bg-clip-text text-transparent">
                E-Mail gesendet
              </h2>

              <div className="space-y-3">
                <p className="text-base text-gray-700 dark:text-gray-300 font-medium">
                  Anweisungen zum Zurücksetzen des Passworts wurden gesendet
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Wenn Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort registriert haben, erhalten Sie eine E-Mail
                  zum Zurücksetzen Ihres Passworts.
                </p>
              </div>

              <Link
                href="/auth/login"
                className="mt-6 inline-flex items-center justify-center h-12 px-6 rounded-xl bg-gradient-to-r from-[#0B3C5D] via-[#2F6FA3] to-[#7FB7D8] font-semibold text-white transition-all duration-300 hover:from-[#082A3F] hover:via-[#1E5A8A] hover:to-[#5A9FC5] shadow-lg hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
              >
                Zurück zur Anmeldung
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-[#0B3C5D] via-[#2F6FA3] to-[#7FB7D8] bg-clip-text text-transparent mb-2">
                  Passwort vergessen?
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Geben Sie Ihre E-Mail-Adresse ein, um Ihr Passwort zurückzusetzen
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                    E-Mail-Adresse
                  </label>
                  <div className="relative group">
                    <Input
                      id="email"
                      type="email"
                      placeholder="max@beispiel.de"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 px-4 bg-white/50 dark:bg-gray-800/50 border-2 border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 group-hover:border-gray-400 dark:group-hover:border-gray-500"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <svg
                      className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative h-12 w-full rounded-xl bg-gradient-to-r from-[#0B3C5D] via-[#2F6FA3] to-[#7FB7D8] font-semibold text-white transition-all duration-300 hover:from-[#082A3F] hover:via-[#1E5A8A] hover:to-[#5A9FC5] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden group"
                >
                  {/* Button shine effect */}
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                  <span className="relative">
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Wird gesendet...
                      </span>
                    ) : (
                      "PASSWORT ZURÜCKSETZEN"
                    )}
                  </span>
                </button>

                <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Erinnern Sie sich an Ihr Passwort?{" "}
                    <Link
                      href="/auth/login"
                      className="text-[#2F6FA3] dark:text-[#7FB7D8] font-semibold hover:text-[#0B3C5D] dark:hover:text-[#2F6FA3] transition-colors duration-200 hover:underline underline-offset-2"
                    >
                      Zurück zur Anmeldung
                    </Link>
                  </p>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
