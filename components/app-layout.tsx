"use client"

import type React from "react"

import { useUser } from "@/contexts/UserContext"
import LeftNavigation from "./LeftNavigation"
import { usePathname } from "next/navigation"

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, isLoading } = useUser()
  const pathname = usePathname()

  // Don't show navigation on auth pages or if user is not logged in
  const isAuthPage = pathname?.startsWith("/auth")
  const showNavigation = user && !isAuthPage && !isLoading

  if (!showNavigation) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <LeftNavigation />
      <main className="flex-1 ml-72 transition-all duration-300">{children}</main>
    </div>
  )
}
