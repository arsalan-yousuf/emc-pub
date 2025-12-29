"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // Redirect to welcome page - role fetching and redirect logic moved there
      if (data.user) {
        router.push("/home");
      } else {
        router.push("/auth/login");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="relative bg-white/95 rounded-2xl min-w-[400px]">
        {/* Gradient border effect */}
        {/* <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-2xl opacity-20 blur-sm"></div> */}
        <div className="absolute -inset-0.5 rounded-2xl opacity-20 blur-sm"></div>
        {/* <div className="absolute -inset-0.5 bg-transparent rounded-2xl opacity-20 blur-sm"></div> */}

        {/* Main card container with glassmorphism */}
        <div className="relative bg-transparent backdrop-blur-xl rounded-2xl shadow-2xl p-8">
          {/* Header section */}
          <div className="text-center mb-8">
            {/* <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2"> */}
            <h2 className="text-3xl font-bold bg-gradient-to-r from-[#0B3C5D] via-[#2F6FA3] to-[#7FB7D8] bg-clip-text text-transparent mb-2">
              Willkommen zurück
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Melden Sie sich bei Ihrem Konto an</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            {/* Email Input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                E-Mail-Adresse
              </label>
              <div className="relative group">
                <Input
                  id="email"
                  type="email"
                  placeholder="example@emc-direct.de"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 px-4 bg-white/50 dark:bg-gray-800/50 border-2 border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 group-hover:border-gray-400 dark:group-hover:border-gray-500"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                Passwort
              </label>
              <div className="relative group">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 px-4 pr-12 bg-white/50 dark:bg-gray-800/50 border-2 border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 group-hover:border-gray-400 dark:group-hover:border-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2F6FA3] dark:hover:text-[#7FB7D8] transition-colors duration-200 focus:outline-none"
                  aria-label={showPassword ? "Passwort ausblenden" : "Passwort anzeigen"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-[#2F6FA3] hover:text-[#0B3C5D] dark:text-[#7FB7D8] dark:hover:text-[#2F6FA3] font-medium transition-colors duration-200 hover:underline underline-offset-2"
                >
                  Passwort vergessen?
                </Link>
              </div>
            </div>

            {/* Error Message */}
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

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              // className="relative h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold text-white transition-all duration-300 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden group"
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
                    Wird angemeldet...
                  </span>
                ) : (
                  "ANMELDEN"
                )}
              </span>
            </button>

            {/* Sign Up Link */}
            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Noch kein Konto?{" "}
                <Link
                  href="/auth/sign-up"
                  className="text-[#2F6FA3] dark:text-[#7FB7D8] font-semibold hover:text-[#0B3C5D] dark:hover:text-[#2F6FA3] transition-colors duration-200 hover:underline underline-offset-2"
                >
                  Jetzt registrieren
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


// ------------------------------------------------------------
//  Old Login Form
// ------------------------------------------------------------

// "use client";

// import { cn } from "@/lib/utils";
// import { createClient } from "@/lib/supabase/client";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useState } from "react";
// // import { getUserRole } from "@/lib/user-roles";

// export function LoginForm({
//   className,
//   ...props
// }: React.ComponentPropsWithoutRef<"div">) {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const router = useRouter();

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     const supabase = createClient();
//     setIsLoading(true);
//     setError(null);

//     try {
//       const { data, error } = await supabase.auth.signInWithPassword({
//         email,
//         password,
//       });
//       if (error) throw error;
      
//       // Check user role and redirect accordingly
//       // if (data.user) {
//         // const userRole = await getUserRole(data.user.id);
//         // // If user has no role, redirect to emailgen, otherwise to dashboard
//         // if (!userRole) {
//         //   router.push("/emailgen");
//         // } else {
//         //   router.push("/dashboard");
//         // }
//       // } else {
//       //   router.push("/dashboard");
//       // }
//       if (data.user) {
//                 router.push("/");
//               } else {
//                 router.push("/");
//               }
//     } catch (error: unknown) {
//       setError(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className={cn("flex flex-col gap-6", className)} {...props}>
//       <Card>
//         <CardHeader>
//           <CardTitle className="text-2xl">Anmelden</CardTitle>
//           <CardDescription>
//             Geben Sie Ihre E-Mail-Adresse ein, um sich bei Ihrem Konto anzumelden
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleLogin}>
//             <div className="flex flex-col gap-6">
//               <div className="grid gap-2">
//                 <Label htmlFor="email">E-Mail</Label>
//                 <Input
//                   id="email"
//                   type="email"
//                   placeholder="m@example.com"
//                   required
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                 />
//               </div>
//               <div className="grid gap-2">
//                 <div className="flex items-center">
//                   <Label htmlFor="password">Passwort</Label>
//                   <Link
//                     href="/auth/forgot-password"
//                     className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
//                   >
//                     Passwort vergessen?
//                   </Link>
//                 </div>
//                 <Input
//                   id="password"
//                   type="password"
//                   required
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                 />
//               </div>
//               {error && <p className="text-sm text-red-500">{error}</p>}
//               <Button type="submit" className="w-full" disabled={isLoading}>
//                 {isLoading ? "Wird angemeldet..." : "Anmelden"}
//               </Button>
//             </div>
//             <div className="mt-4 text-center text-sm">
//               Noch kein Konto?{" "}
//               <Link
//                 href="/auth/sign-up"
//                 className="underline underline-offset-4"
//               >
//                 Registrieren
//               </Link>
//             </div>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }