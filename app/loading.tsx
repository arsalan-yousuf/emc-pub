'use client';

export default function GlobalLoading() {
  return (
    <div className="w-full h-full flex items-center justify-center p-8 min-h-screen ">
      <div className="text-center">
        <div className="relative mx-auto mb-6 w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin"></div>
          <div
            className="absolute inset-2 rounded-full border-4 border-transparent border-b-purple-500 border-l-pink-500 animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1s" }}
          ></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm"></div>
        </div>

        <p className="text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent animate-pulse">
          Wird geladen...
        </p>
      </div>
    </div>
  );
}


