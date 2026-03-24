import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  /* config options here */
  // Silence Turbopack default in Next.js 16 for PWA support
  // @ts-ignore - Turbopack config is valid but might not be in types yet
  turbopack: {},
};

export default withPWA(nextConfig);
