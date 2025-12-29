"use client"

import { useUser } from "@/contexts/UserContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function HomePage() {
    const router = useRouter()
    const { user, profile, role, isLoading } = useUser()

    useEffect(() => {
        // Redirect unauthenticated users to login
        if (!isLoading && !user) {
            router.replace("/auth/login")
        }
    }, [user, isLoading, router])

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
                <div className="text-center">
                    <div className="relative mx-auto mb-6 w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin"></div>
                        <div
                            className="absolute inset-2 rounded-full border-4 border-transparent border-b-purple-500 border-l-pink-500 animate-spin"
                            style={{ animationDirection: "reverse", animationDuration: "1s" }}
                        ></div>
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm"></div>
                    </div>

                    <p className="text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent animate-pulse">
                        Wird geladen...
                    </p>
                </div>
            </main>
        )
    }

    // If user is not authenticated, show nothing (redirecting)
    if (!user) {
        return null
        // redirect to login page
        // router.push("/auth/login")
        // return (
        //   <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        //     <div className="text-center px-6 max-w-2xl">
        //       <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12">
        //         <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
        //           Willkommen bei EMC Sales Cockpit
        //         </h1>
        //         <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">Bitte melden Sie sich an, um fortzufahren</p>
        //         <Link
        //           href="/auth/login"
        //           className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
        //         >
        //           Zur Anmeldung
        //         </Link>
        //       </div>
        //     </div>
        //   </main>
        // )
    }

    const userName = profile?.name || profile?.first_name || user?.email?.split("@")[0] || "Benutzer"
    const greeting = getGreeting()
    const roleLabel = getRoleLabel(role)
    const currentDate = new Date().toLocaleDateString("de-DE", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    })

    return (
        <div className="flex items-center justify-center min-h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 -m-5 h-full">
            <div className="text-center max-w-4xl w-full">
                <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-[2.5rem] p-12 md:p-20 border border-white/20 dark:border-gray-700/30 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                                <span className="text-gray-900 dark:text-white">{greeting} </span>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                                    {userName.split(" ")[0] + ","}
                                </span>
                            </h1>
                            <p className="text-3xl md:text-5xl font-medium text-gray-800 dark:text-gray-200">
                                willkommen im <span className="font-bold">EMC Sales Cockpit</span>
                            </p>
                        </div>

                        <div className="h-px w-24 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-auto"></div>

                        <div className="space-y-6">
                            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
                            Ihr zentraler Arbeitsbereich für effiziente und strukturierte Vertriebsarbeit.
                            </p>

                            {roleLabel && (
                                <div className="pt-4">
                                    <span className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 block mb-2">
                                        Ihre Rolle
                                    </span>
                                    <div className="inline-flex items-center px-6 py-2 rounded-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-3 animate-pulse"></div>
                                        <span className="text-lg font-medium text-gray-800 dark:text-gray-200">{roleLabel}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* <div className="mt-16 flex items-center justify-center gap-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span>System bereit</span>
                    </div> */}
                </div>
            </div>
        </div>
    )
}

/**
 * Returns a greeting based on the current time of day
 */
function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) {
        return "Guten Morgen"
    } else if (hour < 18) {
        return "Guten Tag"
    } else {
        return "Guten Abend"
    }
}

/**
 * Returns a human-readable label for the user's role
 */
function getRoleLabel(role: string | null): string {
    if (!role) return "Staff Member"

    const roleLabels: Record<string, string> = {
        super_admin: "Super Administrator",
        admin: "Administrator",
        sales_support: "Sales Support",
        sales: "Sales",
    }

    return roleLabels[role] || role
}