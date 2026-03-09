import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'https://frontend.moa.software',
    'http://frontend.moa.software',
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://backend:3000'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
