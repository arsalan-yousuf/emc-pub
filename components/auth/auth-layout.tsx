import { AuthIllustration } from './auth-illustration';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-50px)] w-full rounded-xl shadow-lg">
      {/* Left Panel - Illustration */}
      {/* <div className="hidden lg:flex lg:w-1/2">
        <AuthIllustration />
      </div> */}

      {/* Right Panel - Form */}
      <div className="flex w-full flex-col items-center justify-center bg-white p-6 md:p-12 lg:w-1/2 dark:bg-[#1a1a1f]">
        <div className="w-full max-w-md">
          {/* <div className="mb-8">
            <h1 className="mb-3 text-4xl font-bold bg-gradient-to-r from-[#2563eb] to-[#1e40af] bg-clip-text text-transparent">
              {title}
            </h1>
            {subtitle && (
              <p className="text-base text-center text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div> */}
          {children}
        </div>
      </div>
    </div>
  );
}

