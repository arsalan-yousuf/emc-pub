'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import LeftNavigation from './LeftNavigation';
import { useUser } from '@/contexts/UserContext';

export default function NavigationWrapper() {
  const pathname = usePathname();
  const { user, isLoading } = useUser();
  
  // Hide navigation on auth pages
  const isAuthPage = pathname?.startsWith('/auth');
  
  // Hide navigation on root page only if user is not authenticated
  const shouldHideOnRoot = pathname === '/' && (!user || isLoading);
  
  useEffect(() => {
    // Add/remove class to body based on navigation visibility
    if (isAuthPage || shouldHideOnRoot) {
      document.body.classList.add('no-navigation');
    } else {
      document.body.classList.remove('no-navigation');
    }
  }, [isAuthPage, shouldHideOnRoot]);
  
  // Don't show navigation on auth pages
  if (isAuthPage) {
    return null;
  }
  
  // Don't show navigation on root page if user is not authenticated
  if (shouldHideOnRoot) {
    return null;
  }
  
  // Don't show navigation if user is not authenticated (wait for loading to complete first)
  if (!isLoading && !user) {
    return null;
  }
  
  // Show navigation for authenticated users (including on root page)
  return <LeftNavigation />;
}

