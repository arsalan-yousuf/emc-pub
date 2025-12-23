// "use client";

// import { cn } from "@/lib/utils";
// import { createClient } from "@/lib/supabase/client";
// import { Input } from "@/components/ui/input";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useState } from "react";
// import { Eye, EyeOff } from "lucide-react";

// export function LoginForm({
//   className,
//   ...props
// }: React.ComponentPropsWithoutRef<"div">) {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
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
//       // Redirect to welcome page - role fetching and redirect logic moved there
//       if (data.user) {
//         router.push("/");
//       } else {
//         router.push("/");
//       }
//     } catch (error: unknown) {
//       setError(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className={cn("flex flex-col gap-6", className)} {...props}>
//       <form onSubmit={handleLogin} className="flex flex-col gap-6">
//         {/* Email Input */}
//         <div className="flex flex-col gap-2">
//                 <Input
//                   id="email"
//                   type="email"
//             placeholder="E-Mail-Adresse *"
//                   required
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//             className="h-12 border-gray-300 dark:border-gray-600 focus:border-[#2563eb] focus:ring-[#2563eb] dark:bg-[#2a2a3e] dark:text-white"
//                 />
//               </div>

//         {/* Password Input */}
//         <div className="flex flex-col gap-2">
//           <div className="relative">
//             <Input
//               id="password"
//               type={showPassword ? "text" : "password"}
//               placeholder="Passwort *"
//               required
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               className="h-12 border-gray-300 dark:border-gray-600 pr-10 focus:border-[#2563eb] focus:ring-[#2563eb] dark:bg-[#2a2a3e] dark:text-white"
//             />
//             <button
//               type="button"
//               onClick={() => setShowPassword(!showPassword)}
//               className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2563eb] dark:text-gray-500 dark:hover:text-[#3b82f6]"
//               aria-label={showPassword ? "Passwort ausblenden" : "Passwort anzeigen"}
//             >
//               {showPassword ? (
//                 <EyeOff className="h-5 w-5" />
//               ) : (
//                 <Eye className="h-5 w-5" />
//               )}
//             </button>
//           </div>
//           <div className="flex justify-end">
//                   <Link
//                     href="/auth/forgot-password"
//               className="text-sm text-[#2563eb] hover:text-[#1e40af] hover:underline dark:text-[#3b82f6] dark:hover:text-[#60a5fa]"
//                   >
//                     Passwort vergessen?
//                   </Link>
//                 </div>
//               </div>

//         {/* Error Message */}
//         {error && (
//           <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
//         )}

//         {/* Sign In Button */}
//         <button
//           type="submit"
//           disabled={isLoading}
//           className="h-12 w-full rounded-lg bg-gradient-to-r from-[#2563eb] to-[#1e40af] font-semibold text-white transition-all hover:from-[#1e40af] hover:to-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
//         >
//           {isLoading ? "Wird angemeldet..." : "ANMELDEN"}
//         </button>

//         {/* Sign Up Link */}
//         <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
//               Noch kein Konto?{" "}
//               <Link
//                 href="/auth/sign-up"
//             className="text-[#2563eb] font-medium hover:text-[#1e40af] hover:underline dark:text-[#3b82f6] dark:hover:text-[#60a5fa]"
//               >
//                 Registrieren
//               </Link>
//             </div>
//           </form>
//     </div>
//   );
// }


// ------------------------------------------------------------
//  Old Login Form
// ------------------------------------------------------------

"use client";

import { cn } from "@/lib/utils";
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
// import { getUserRole } from "@/lib/user-roles";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      
      // Check user role and redirect accordingly
      // if (data.user) {
        // const userRole = await getUserRole(data.user.id);
        // // If user has no role, redirect to emailgen, otherwise to dashboard
        // if (!userRole) {
        //   router.push("/emailgen");
        // } else {
        //   router.push("/dashboard");
        // }
      // } else {
      //   router.push("/dashboard");
      // }
      if (data.user) {
                router.push("/");
              } else {
                router.push("/");
              }
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
          <CardTitle className="text-2xl">Anmelden</CardTitle>
          <CardDescription>
            Geben Sie Ihre E-Mail-Adresse ein, um sich bei Ihrem Konto anzumelden
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Passwort</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Passwort vergessen?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Wird angemeldet..." : "Anmelden"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Noch kein Konto?{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                Registrieren
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}