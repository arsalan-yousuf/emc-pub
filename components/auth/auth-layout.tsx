import Image from 'next/image';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-[calc(100vh-100px)] h-full w-full rounded-xl shadow-xl overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/AuthBack7.png"
          alt="EMC Sales Dashboard"
          fill
          className="object-cover object-left"
          priority
          quality={90}
        />
        {/* Overlay for better readability */}
        {/* <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/40 to-transparent" /> */}
      </div>

      {/* Grid Layout with Centered Form Panel */}
      <div className="grid grid-cols-2 h-full w-full px-6 md:px-10 lg:px-16">
        {/* Column 1: Empty space for background */}
        <div></div>
        
        {/* Column 2: Centered auth forms */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl shadow-xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

