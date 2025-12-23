"use client";

import { cn, getSiteUrl } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // const [dashboardId, setDashboardId] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwörter stimmen nicht überein");
      setIsLoading(false);
      return;
    }

    // Validate company email domain
    // const allowedDomain = "emc-direct.de";
    // if (!email.toLowerCase().endsWith(`@${allowedDomain}`)) {
    //   setError(`Only ${allowedDomain} email addresses are allowed`);
    //   setIsLoading(false);
    //   return;
    // }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getSiteUrl()}/dashboard`,
          data: {
            first_name: firstName,
            last_name: lastName,
            email: email,
            // dashboard_id: dashboardId,
          },
        },
      });
      if (error) throw error;
      
      // Profile will be automatically created by the database trigger
      // No need to manually insert it here to avoid race conditions
      
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSignUp} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* First Name */}
          <div className="flex flex-col gap-2">
                <Input
                  id="firstName"
                  type="text"
              placeholder="Vorname *"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
              className="h-12 border-gray-300 dark:border-gray-600 focus:border-[#2563eb] focus:ring-[#2563eb] dark:bg-[#2a2a3e] dark:text-white"
                />
              </div>

          {/* Last Name */}
          <div className="flex flex-col gap-2">
                <Input
                  id="lastName"
                  type="text"
              placeholder="Nachname *"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
              className="h-12 border-gray-300 dark:border-gray-600 focus:border-[#2563eb] focus:ring-[#2563eb] dark:bg-[#2a2a3e] dark:text-white"
                />
              </div>
        </div>

        {/* Email */}
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
          <p className="text-xs text-gray-500 dark:text-gray-400">
                  Nur @emc-direct.de E-Mail-Adressen sind erlaubt
                </p>
              </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <div className="relative">
                <Input
                  id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Passwort *"
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

        {/* Repeat Password */}
        <div className="flex flex-col gap-2">
          <div className="relative">
                <Input
                  id="repeat-password"
              type={showRepeatPassword ? "text" : "password"}
              placeholder="Passwort wiederholen *"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
              className="h-12 border-gray-300 dark:border-gray-600 pr-10 focus:border-[#2563eb] focus:ring-[#2563eb] dark:bg-[#2a2a3e] dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowRepeatPassword(!showRepeatPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2563eb] dark:text-gray-500 dark:hover:text-[#3b82f6]"
              aria-label={showRepeatPassword ? "Hide password" : "Show password"}
            >
              {showRepeatPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
                </div>
              </div>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {/* Sign Up Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-lg bg-gradient-to-r from-[#2563eb] to-[#1e40af] font-semibold text-white transition-all hover:from-[#1e40af] hover:to-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          {isLoading ? "Konto wird erstellt..." : "REGISTRIEREN"}
        </button>

        {/* Sign In Link */}
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
    </div>
  );
}
