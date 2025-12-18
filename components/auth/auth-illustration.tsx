import Image from 'next/image';

export function AuthIllustration() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[#1e40af] via-[#2563eb] to-[#3b82f6]">
      <Image
        src="/Dashboard2.jpg"
        alt="EMC Sales Dashboard"
        fill
        className="object-cover"
        priority
        quality={90}
      />
      {/* Blue overlay to match app theme */}
      {/* <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb]/40 via-[#1e40af]/30 to-[#3b82f6]/40" /> */}
    </div>
  );
}

