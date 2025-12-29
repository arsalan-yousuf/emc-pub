"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useUser } from "@/contexts/UserContext"
import { LogoutButton } from "./logout-button"
import { LayoutDashboard, Mail, Search, BarChart, FileText, ChevronLeft, ChevronRight, User } from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: "Vertriebs-Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "E-Mail-Generator", href: "/emailgen", icon: Mail },
  { label: "Kundensuche", href: "/customers", icon: Search },
  { label: "Auswertungen", href: "/analytics", icon: BarChart },
  { label: "Call-Zusammenfassung", href: "/summaries", icon: FileText },
  { label: "Benutzerprofile", href: "/admin/profiles", icon: User, adminOnly: true },
]

const PUBLIC_ROUTES = ["/emailgen", "/customers", "/analytics"]
const STORAGE_KEY_COLLAPSED = "nav-collapsed"

export default function LeftNavigation() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const { profile, role, isAdmin, isSuperAdmin, isLoading } = useUser()

  // Load collapse state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COLLAPSED)
    if (saved !== null) setIsCollapsed(saved === "true")
  }, [])

  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem(STORAGE_KEY_COLLAPSED, String(newState))
  }

  // Compute visible nav items
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (PUBLIC_ROUTES.includes(item.href)) return true
    if (item.adminOnly) return !isLoading && (isAdmin || isSuperAdmin)
    return !isLoading && (role || isAdmin || isSuperAdmin)
  })

  const roleLabel = (() => {
    if (!role) return "Staff Member"
    const map: Record<string, string> = {
      super_admin: "Super Admin",
      admin: "Admin",
      sales_support: "Sales Support",
      sales: "Sales",
    }
    return map[role] || "Staff Member"
  })()

  return (
    <nav
      className={`left-navigation ${isCollapsed ? "collapsed" : "expanded"} h-screen bg-gradient-to-b from-white/90 via-blue-50/80 to-indigo-50/90 dark:from-gray-800/90 dark:via-gray-900/80 dark:to-gray-800/90 backdrop-blur-xl border-r border-white/20 dark:border-gray-700/50 shadow-xl transition-all duration-300 flex flex-col fixed left-0 top-0 z-50`}
      aria-label="Hauptnavigation"
    >
      <div className="flex flex-col h-full justify-between p-4">
        <div>
          {/* Logo */}
          <div className="flex items-center justify-center py-6 mb-4">
            <Link href="/home" className="transition-transform hover:scale-105">
              <Image
                src="/EMC_Logo-removebg.png"
                alt="EMC Sales Logo"
                width={isCollapsed ? 40 : 120}
                height={isCollapsed ? 24 : 50}
                className="transition-all duration-300"
              />
            </Link>
          </div>

          {/* Toggle Button */}
          <button
            className="flex items-center justify-center w-full py-2 mb-6 rounded-lg hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 text-gray-700 dark:text-gray-300"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Navigation erweitern" : "Navigation einklappen"}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          {/* Nav Items */}
          <ul className="flex flex-col gap-2">
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 ${isCollapsed ? "px-3" : "px-3.5"} py-3 rounded-lg transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30"
                        : "text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/50 hover:shadow-md"
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className={`${isCollapsed ? "w-5 h-5" : "w-5 h-5"} flex-shrink-0`} />
                    {!isCollapsed && (
                      <span className={`text-sm font-medium ${isActive ? "font-semibold" : ""}`}>{item.label}</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {/* User Info + Logout */}
        {profile && ( 
          <div
            className={`${
              isCollapsed ? "p-1" : "p-4 border border-white/30 dark:border-gray-600/30 shadow-lg bg-white/60 dark:bg-gray-700/50 backdrop-blur-sm rounded-xl"
            } `}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg">
                <User size={20} />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {profile.name || profile.email?.split("@")[0] || "Benutzer"}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{roleLabel}</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/50">
                <LogoutButton isCollapsed={isCollapsed} />
              </div>
            )}
            {isCollapsed && (
              <div className="mt-2">
                <LogoutButton isCollapsed={isCollapsed} />
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
