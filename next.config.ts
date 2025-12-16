import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Increased from default 1mb to handle long voice recordings
    }
  },
};

export default nextConfig;
