'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
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
  LogOut,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { isAdmin, getUserRole, isSuperAdmin } from '@/lib/user-roles';
import type { UserRole } from '@/lib/user-roles';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Email Gen', href: '/emailgen', icon: Mail },
  { label: 'Customer Search', href: '/customers', icon: Search },
  { label: 'Analytics', href: '/analytics', icon: BarChart },
  { label: 'Summary Gen', href: '/summaries', icon: FileText },
  { label: 'User Profiles', href: '/admin/profiles', icon: User, adminOnly: true },
];

interface UserProfile {
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  dashboard_id?: number;
}

export default function LeftNavigation() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isUserSuperAdmin, setIsUserSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  // const logout = async () => {
  //   const supabase = createClient();
  //   await supabase.auth.signOut();
  //   window.location.href = '/auth/login';
  // };

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('nav-collapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
    setMounted(true);
  }, []);

  // Fetch user data and check admin status
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // Fetch profile information
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, metabase_dashboard_id')
          .eq('id', authUser.id)
          .single();

        const fullName = profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.first_name || profile?.last_name
          ? profile.first_name || profile.last_name
          : authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0];

        setUser({
          email: authUser.email,
          name: fullName,
          first_name: profile?.first_name,
          last_name: profile?.last_name,
          dashboard_id: profile?.metabase_dashboard_id
        });

        // Check if user is admin or super_admin
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
        const superAdminStatus = await isSuperAdmin();
        setIsUserSuperAdmin(superAdminStatus);
        
        // Get user role
        const role = await getUserRole(authUser.id);
        setUserRole(role);
      }

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          // Fetch profile information
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, metabase_dashboard_id')
            .eq('id', session.user.id)
            .single();

          const fullName = profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : profile?.first_name || profile?.last_name
            ? profile.first_name || profile.last_name
            : session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0];

          setUser({
            email: session.user.email,
            name: fullName,
            first_name: profile?.first_name,
            last_name: profile?.last_name,
            dashboard_id: profile?.metabase_dashboard_id
          });

          // Check if user is admin or super_admin
          const adminStatus = await isAdmin();
          setIsUserAdmin(adminStatus);
          const superAdminStatus = await isSuperAdmin();
          setIsUserSuperAdmin(superAdminStatus);
          
          // Get user role
          const role = await getUserRole(session.user.id);
          setUserRole(role);
        } else {
          setUser(null);
          setIsUserAdmin(false);
          setIsUserSuperAdmin(false);
          setUserRole(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    fetchUser();
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('nav-collapsed', String(newState));
  };

  return (
    <nav 
      className={`left-navigation ${isCollapsed ? 'collapsed' : 'expanded'}`}
      aria-label="Main navigation"
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
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {isCollapsed ? (
            <ChevronRight className="nav-toggle-icon" />
          ) : (
            <ChevronLeft className="nav-toggle-icon" />
          )}
        </button>

        {/* Navigation Items */}
        <ul className="nav-list">
          {navItems.map((item) => {
            // Email Gen is always visible
            if (item.href === '/emailgen') {
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
            }
            
            // Hide admin-only items if user is not admin or super_admin
            if (item.adminOnly && !isUserAdmin) {
              return null;
            }
            
            // Admins and super_admins can view all screens
            if (isUserAdmin || isUserSuperAdmin) {
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
            }
            
            // For non-admins: Hide all other items if user has no role
            if (!userRole) {
              return null;
            }

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
        {user && (
          <div className="nav-user">
            <div className="nav-user-avatar">
              <User className="nav-user-icon" />
            </div>
            {!isCollapsed && (
              <div className="nav-user-info">
                <div className="nav-user-name" title={user.email}>
                  {user.name || user.email?.split('@')[0] || 'User'}
                </div>
                {user.email && user.name && (
                  <div className="nav-user-email" title={user.email}>
                    {user.email}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Theme Switcher and Logout */}
        <div className="nav-actions">
          {mounted && (
            <button
              className="nav-action-btn"
              onClick={() => {
                const themes = ['light', 'dark', 'system'];
                const currentIndex = themes.indexOf(theme || 'system');
                const nextIndex = (currentIndex + 1) % themes.length;
                setTheme(themes[nextIndex]);
              }}
              title={isCollapsed ? `Theme: ${theme || 'system'}` : undefined}
            >
              {theme === 'light' ? (
                <Sun className="nav-action-icon" />
              ) : theme === 'dark' ? (
                <Moon className="nav-action-icon" />
              ) : (
                <Laptop className="nav-action-icon" />
              )}
              {!isCollapsed && <span className="nav-action-label">Theme</span>}
            </button>
          )}
          
          {user && (
            // <button
            //   className="nav-action-btn nav-action-btn-logout"
            //   onClick={async () => {
            //     // const supabase = createClient();
            //     // await supabase.auth.signOut();
            //     // window.location.href = '/auth/login';
            //     logout();
            //   }}
            //   title={isCollapsed ? 'Logout' : undefined}
            // >
            //   <LogOut className="nav-action-icon" />
            //   {!isCollapsed && <span className="nav-action-label">Logout</span>}
            // </button>
            <LogoutButton isCollapsed={isCollapsed} />
          )}
        </div>
      </div>
    </nav>
  );
}

