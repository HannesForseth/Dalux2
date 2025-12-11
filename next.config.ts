import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Empty turbopack config to satisfy Next.js 16
  turbopack: {},
  webpack: (config) => {
    // Handle canvas for react-pdf (used when building with webpack)
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
