'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface DashboardIframeProps {
  iframeKey: string;
  iframeUrl: string;
  dashboardId: number;
  refreshDashboardUrl: (dashboardId: number) => Promise<string>;
}

export default function DashboardIframe({ iframeKey, iframeUrl, dashboardId, refreshDashboardUrl }: DashboardIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // const [currentUrl, setCurrentUrl] = useState<string | null>(null);
console.log("Rafaqat", iframeKey, "iframeUrl", iframeUrl);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Regenerate the iframe URL with a fresh JWT token via server action
      const newUrl = await refreshDashboardUrl(dashboardId);
      if (iframeRef.current) {
        iframeRef.current.src = newUrl;
      }
      // setCurrentUrl(newUrl);
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
// useEffect(() => {
//   setCurrentUrl(iframeUrl);
// }, [iframeUrl]);
  return (
    <div className="w-full h-full relative">
      {/* Refresh Button - positioned relative to container */}
      <div className="absolute top-0.5 right-0.5 z-10 opacity-80">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-3xl shadow-md hover:shadow-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh Dashboard"
          type="button"
        >
          <RefreshCw 
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} 
          />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>

      {/* Iframe */}
      {iframeUrl && <iframe
      // id={iframeKey+'iframe'}
        key={iframeKey +'iframe'}
        ref={iframeRef}
        src={iframeUrl}
        // src={currentUrl}
        width="100%"
        height="100%"
        style={{ 
          minHeight: 'calc(100vh - 40px)', 
          border: 'none', 
          width: '100%',
          display: 'block'
        }}
        className="rounded-lg"
      />}
    </div>
  );
}

