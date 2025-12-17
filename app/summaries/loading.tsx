'use client';

export default function GlobalLoading() {
  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="text-center">
        <div className="loading" style={{ margin: '0 auto 12px', width: '36px', height: '36px', borderWidth: '4px' }}></div>
        <p className="text-sm text-muted-foreground mt-2">Wird geladen...</p>
      </div>
    </div>
  );
}


