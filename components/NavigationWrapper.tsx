'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import LeftNavigation from './LeftNavigation';

export default function NavigationWrapper() {
  const pathname = usePathname();
  
  // Hide navigation on auth pages and root page
  const isAuthPage = pathname?.startsWith('/auth') || pathname === '/';
  
  useEffect(() => {
    // Add/remove class to body based on navigation visibility
    if (isAuthPage) {
      document.body.classList.add('no-navigation');
    } else {
      document.body.classList.remove('no-navigation');
    }
  }, [isAuthPage]);
  
  if (isAuthPage) {
    return null;
  }
  
  return <LeftNavigation />;
}

