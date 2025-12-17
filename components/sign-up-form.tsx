"use client";

import { cn, getSiteUrl } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Registrieren</CardTitle>
          <CardDescription>Neues Konto erstellen</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
                  <Label htmlFor="firstName">Vorname</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Nachname</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              {/* <div className="grid gap-2">
                  <Label htmlFor="dashboardId">Dashboard ID</Label>
                <Input
                    id="dashboardId"
                    type="number"
                    placeholder="12"
                  required
                    value={dashboardId}
                    onChange={(e) => setDashboardId(e.target.value)}
                />
                  <p className="text-xs text-muted-foreground invisible">
                    Placeholder for alignment
                  </p>
              </div> */}
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="d.jeworski@emc-direct.de"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Nur @emc-direct.de E-Mail-Adressen sind erlaubt
                </p>
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="repeat-password">Passwort wiederholen</Label>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Konto wird erstellt..." : "Registrieren"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Bereits ein Konto?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Anmelden
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
