import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'https://frontend.moa.software',
    'http://frontend.moa.software',
  ],
};

export default nextConfig;
