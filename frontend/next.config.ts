import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ['192.168.31.121:3000', '192.168.31.121'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5000/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://127.0.0.1:5000/socket.io/:path*',
      },
    ];
  },
};

export default nextConfig;
