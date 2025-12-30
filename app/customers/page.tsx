"use client";

import { useState, useEffect, useRef } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CustomersPage() {
  // Use environment variable for testing, otherwise use production URL
  const customerSearchUrl = process.env.NEXT_PUBLIC_CUSTOMER_SEARCH_URL || 'http://192.168.115.2/kundensuche/';
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set a timeout to detect if service is unavailable (10 seconds)
  // This catches network timeouts before the browser shows its error page
  useEffect(() => {
    if (isLoading && !hasError) {
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setHasError(true);
      }, 10000); // 10 seconds timeout - catches network errors faster
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [isLoading, hasError]);

  const handleIframeLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Additional check: verify iframe actually loaded content
    // If the iframe loaded but we can't access it, it might be a browser error page
    try {
      const iframe = iframeRef.current;
      if (iframe) {
        // Try to access iframe content (may fail due to CORS, but that's okay)
        // If it's a browser error page, the iframe might be accessible but empty
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        
        // If we can access the document, check if it looks like an error page
        if (iframeDoc) {
          const bodyText = iframeDoc.body?.innerText?.toLowerCase() || '';
          const isErrorPage = bodyText.includes('took too long') || 
                             bodyText.includes('unable to connect') ||
                             bodyText.includes('this site can\'t be reached') ||
                             bodyText.includes('err_');
          
          if (isErrorPage) {
            setIsLoading(false);
            setHasError(true);
            return;
          }
        }
      }
    } catch (e) {
      // CORS error - can't access iframe content, assume it loaded successfully
      // This is expected for cross-origin iframes
    }
    
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsLoading(false);
    setHasError(true);
  };

  const handleRetry = () => {
    setIsRetrying(true);
    setHasError(false);
    setIsLoading(true);
    
    // Force iframe reload
    if (iframeRef.current) {
      iframeRef.current.src = customerSearchUrl;
    }

    // Reset retrying state after a moment
    retryTimeoutRef.current = setTimeout(() => {
      setIsRetrying(false);
    }, 1000);
  };

  return (
    <div className="w-full h-full relative" style={{ minHeight: 'calc(100vh - 40px)' }}>
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Kundensuche wird geladen</CardTitle>
              <CardDescription className="text-center">
                Verbindung zum Kundensuche-Tool wird hergestellt...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="loading" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
              <p className="text-sm text-muted-foreground text-center">
                Dies funktioniert nur, wenn Sie im Büro sind.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-center mb-2">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-center">Kundensuche ist derzeit nicht verfügbar</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="text-sm text-muted-foreground text-center space-y-2">
                <p>
                  Diese Funktion funktioniert nur, wenn Sie mit dem Büronetzwerk verbunden sind.
                </p>
                <p>
                  Bitte versuchen Sie es erneut, wenn Sie wieder im Büro sind
                </p>
              </div>
              <Button 
                onClick={handleRetry} 
                disabled={isRetrying}
                className="w-full"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Wird erneut versucht...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Erneut versuchen
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={customerSearchUrl}
        width="100%"
        height="100%"
        title="Kundensuche"
        allow="fullscreen"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        style={{ 
          minHeight: 'calc(100vh - 40px)', 
          border: 'none', 
          width: '100%',
          display: hasError ? 'none' : 'block',
          borderRadius: '8px'
        }}
      />
    </div>
  );
}

