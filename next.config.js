/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  // Next 14 chỉ chạy src/instrumentation.ts khi bật flag này
  experimental: {
    instrumentationHook: true,
  },
  // Allow ngrok cross-origin requests
  allowedDevOrigins: [
    'https://*.ngrok-free.app',
    'https://*.ngrok.io',
    'http://localhost:3000',
  ],
};

module.exports = nextConfig;
