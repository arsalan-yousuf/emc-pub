// "use client"

// import { useUser } from "@/contexts/UserContext"
// import Link from "next/link"
// import { useRouter } from "next/navigation";

// export default function Home() {
//   const router = useRouter();
//   const { user, profile, role, isLoading } = useUser()
//   console.log("role in page.tsx", role)
//   // Show loading state while checking authentication
//   if (isLoading) {
//     return (
//       <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
//         <div className="text-center">
//           <div className="loading mx-auto mb-4"></div>
//           <p className="text-gray-600 dark:text-gray-400">Wird geladen...</p>
//         </div>
//       </main>
//     )
//   }

//   // If user is not authenticated, show login prompt
//   if (!user) {
//     // redirect to login page
//     router.push("/auth/login")
//     // return (
//     //   <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
//     //     <div className="text-center px-6 max-w-2xl">
//     //       <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12">
//     //         <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
//     //           Willkommen bei EMC Sales Cockpit
//     //         </h1>
//     //         <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">Bitte melden Sie sich an, um fortzufahren</p>
//     //         <Link
//     //           href="/auth/login"
//     //           className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
//     //         >
//     //           Zur Anmeldung
//     //         </Link>
//     //       </div>
//     //     </div>
//     //   </main>
//     // )
//   }
//   else{
//     if(role === "sales_support" || role === "sales" || role === "super_admin" || role === "admin"){
//       router.push("/dashboard")
//     }
//     else{
//       router.push("/emailgen")
//     }
//   }

//   const userName = profile?.name || profile?.first_name || user?.email?.split("@")[0] || "Benutzer"
//   const greeting = getGreeting()
//   const roleLabel = getRoleLabel(role)
//   const currentDate = new Date().toLocaleDateString("de-DE", {
//     weekday: "long",
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//   })

//   return (
//     <div className="flex items-center justify-center min-h-[calc(100vh-40px)] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 -m-5">
//       <div className="text-center max-w-4xl w-full py-12 px-4">
//         <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-2xl p-12 md:p-16 border border-white/20 dark:border-gray-700/50">
//           {/* Main greeting section */}
//           <div className="mb-8 space-y-4">
//             <div className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
//               <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{currentDate}</p>
//             </div>

//             <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mb-4">
//               {greeting}
//             </h1>

//             <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{userName}</h2>

//             {roleLabel && (
//               <div className="inline-block px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full shadow-lg mt-4">
//                 <p className="text-sm font-semibold tracking-wide">{roleLabel}</p>
//               </div>
//             )}
//           </div>

//           {/* Welcome message */}
//           <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
//             <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 font-light leading-relaxed">
//               Willkommen bei Ihrem
//             </p>
//             <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-2">EMC Sales Cockpit</p>
//             <p className="text-base text-gray-500 dark:text-gray-400 mt-6 max-w-2xl mx-auto leading-relaxed">
//               Ihr zentrales Portal für effiziente Vertriebsaktivitäten und nahtlose Zusammenarbeit
//             </p>
//           </div>

//           {/* Status indicator */}
//           <div className="mt-12 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
//             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
//             <span>System aktiv und bereit</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// /**
//  * Returns a greeting based on the current time of day
//  */
// function getGreeting(): string {
//   const hour = new Date().getHours()
//   if (hour < 12) {
//     return "Guten Morgen"
//   } else if (hour < 18) {
//     return "Guten Tag"
//   } else {
//     return "Guten Abend"
//   }
// }

// /**
//  * Returns a human-readable label for the user's role
//  */
// function getRoleLabel(role: string | null): string {
//   if (!role) return ""

//   const roleLabels: Record<string, string> = {
//     super_admin: "Super Administrator",
//     admin: "Administrator",
//     sales_support: "Sales Support",
//     sales: "Sales",
//   }

//   return roleLabels[role] || role
// }





// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------

"use client"

import { useUser } from "@/contexts/UserContext"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const { user, role, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/auth/login")
      } else {
        if (role === "super_admin" || role === "admin" || role === "sales_support" || role === "sales") {
          router.replace("/dashboard")
        } else {
          router.replace("/emailgen")
        }
      }
    }
  }, [user, role, isLoading, router])

  // While loading or redirecting, show nothing (or a loader)
  return null
}
