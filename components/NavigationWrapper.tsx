'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import LeftNavigation from './LeftNavigation';
import { useUser } from '@/contexts/UserContext';

export default function NavigationWrapper() {
  const pathname = usePathname();
  const { user, isLoading } = useUser();
  
  // Hide navigation on auth pages and root page (which redirects)
  const isAuthPage = pathname?.startsWith('/auth') || pathname === '/';
  
  useEffect(() => {
    // Add/remove class to body based on navigation visibility
    if (isAuthPage) {
      document.body.classList.add('no-navigation');
    } else {
      document.body.classList.remove('no-navigation');
    }
  }, [isAuthPage]);
  
  // Don't show navigation on auth pages or root page
  if (isAuthPage) {
    return null;
  }
  
  // Don't show navigation if user is not authenticated (wait for loading to complete first)
  if (!isLoading && !user) {
    return null;
  }
  
  // Show navigation for authenticated users (including on root page)
  return <LeftNavigation />;
}

