'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { LogoutButton } from './logout-button';
import { 
  LayoutDashboard, 
  Mail, 
  Search, 
  BarChart, 
  FileText,
  ChevronLeft,
  ChevronRight,
  User,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useUser } from '@/contexts/UserContext';
import type { UserRole } from '@/lib/user-roles';

// ============================================================================
// Type Definitions
// ============================================================================

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}


// ============================================================================
// Constants
// ============================================================================

const NAV_ITEMS: NavItem[] = [
  { label: 'Vertriebs-Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'E-Mail-Generator', href: '/emailgen', icon: Mail },
  { label: 'Kundensuche', href: '/customers', icon: Search },
  { label: 'Auswertungen', href: '/analytics', icon: BarChart },
  { label: 'Call-Zusammenfassung', href: '/summaries', icon: FileText },
  { label: 'Benutzerprofile', href: '/admin/profiles', icon: User, adminOnly: true },
];

const PUBLIC_ROUTES = ['/emailgen', '/customers', '/analytics'];
const THEMES = ['light', 'dark', 'system'] as const;
const STORAGE_KEY_COLLAPSED = 'nav-collapsed';

export default function LeftNavigation() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  
  // Get user data from context (fetched after login)
  const { profile, isAdmin, isSuperAdmin, role, isLoading } = useUser();

  // ============================================================================
  // Effects
  // ============================================================================

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY_COLLAPSED);
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
    setMounted(true);
  }, []);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const toggleCollapse = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(STORAGE_KEY_COLLAPSED, String(newState));
  }, [isCollapsed]);

  // Theme switching disabled - light theme is now default
  // const handleThemeToggle = useCallback(() => {
  //   const currentIndex = THEMES.indexOf((theme as typeof THEMES[number]) || 'system');
  //   const nextIndex = (currentIndex + 1) % THEMES.length;
  //   setTheme(THEMES[nextIndex]);
  // }, [theme, setTheme]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter(item => {
      // Public routes are always visible immediately
      if (PUBLIC_ROUTES.includes(item.href)) {
        return true;
      }
      
      // Admin-only items: show if admin, hide if not admin and check is complete
      if (item.adminOnly) {
        // If still loading, hide admin items (prevents flash)
        if (isLoading) {
          return false;
        }
        // Show if admin, hide if not
        return isAdmin || isSuperAdmin;
      }
      
      // Non-public, non-admin items: show if user has role or is admin
      // Show immediately if we have a role, or wait for check to complete
      if (role) {
        return true;
      }
      
      // If still loading, show item optimistically (non-admin items)
      // This allows non-admin navigation to appear immediately
      if (isLoading) {
        return true;
      }
      
      // After check completes, admins can see all items
      if (isAdmin || isSuperAdmin) {
        return true;
      }
      
      // Non-admins without role cannot see non-public items
      return false;
    });
  }, [isAdmin, isSuperAdmin, role, isLoading]);

  const themeIcon = useMemo(() => {
    if (theme === 'light') return Sun;
    if (theme === 'dark') return Moon;
    return Laptop;
  }, [theme]);

  const roleLabel = useMemo(() => {
    if (!role) return 'Staff';
    const roleLabels: Record<string, string> = {
      'super_admin': 'Super Admin',
      'admin': 'Admin',
      'sales_support': 'Sales Support',
      'sales': 'Sales',
    };
    return roleLabels[role] || role;
  }, [role]);

  return (
    <nav 
      className={`left-navigation ${isCollapsed ? 'collapsed' : 'expanded'}`}
      aria-label="Hauptnavigation"
    >
      <div className="nav-content">
        {/* App Title */}
        <div className="nav-header">
          {!isCollapsed ? (
            // <h2 className="nav-title">EMC Sales</h2>
            <Image src="/EMC_Logo-removebg.png" alt="EMC Sales Logo" width={120} height={50} />
          ) : (
            // <div className="nav-title-icon">EMC</div>
            <Image src="/EMC_Logo-removebg.png" alt="EMC Sales Logo" width={50} height={30} />
          )}
        </div>

        {/* Toggle Button */}
        <button
          className="nav-toggle-btn"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? 'Navigation erweitern' : 'Navigation einklappen'}
        >
          {isCollapsed ? (
            <ChevronRight className="nav-toggle-icon" />
          ) : (
            <ChevronLeft className="nav-toggle-icon" />
          )}
        </button>

        {/* Navigation Items */}
        <ul className="nav-list">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <li key={item.href} className="nav-item">
                <Link
                  href={item.href}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="nav-icon" />
                  {!isCollapsed && <span className="nav-label">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* User Info */}
        {profile && (
          <div className="nav-user">
            <div className="nav-user-avatar">
              <User className="nav-user-icon" />
            </div>
            {!isCollapsed && (
              <div className="nav-user-info">
                <div className="nav-user-name" title={profile.email}>
                  {profile.name || profile.email?.split('@')[0] || 'Benutzer'}
                </div>
                <div className="nav-user-role" title={`Rolle: ${roleLabel}`}>
                  {roleLabel}
                </div>
                {profile.email && profile.name && (
                  <div className="nav-user-email" title={profile.email}>
                    {profile.email}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Theme Switcher and Logout */}
        <div className="nav-actions">
          {/* Theme switching disabled - light theme is now default */}
          {/* {mounted && (
            <button
              className="nav-action-btn"
              onClick={handleThemeToggle}
              title={isCollapsed ? `Design: ${theme || 'system'}` : undefined}
              aria-label={`Design wechseln zu ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'}`}
            >
              {React.createElement(themeIcon, { className: 'nav-action-icon' })}
              {!isCollapsed && <span className="nav-action-label">Design</span>}
            </button>
          )} */}
          
          {profile && (
            <LogoutButton isCollapsed={isCollapsed} />
          )}
        </div>
      </div>
    </nav>
  );
}

