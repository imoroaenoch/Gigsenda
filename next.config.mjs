import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
});

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  serverExternalPackages: [
    "firebase-admin",
    "firebase-admin/app",
    "firebase-admin/firestore",
    "firebase-admin/auth",
    "google-auth-library",
    "@google-cloud/firestore",
    "@google-cloud/storage",
    "cloudinary",
  ],
  experimental: {
    serverComponentsExternalPackages: [
      "firebase-admin",
      "firebase-admin/app",
      "firebase-admin/firestore",
      "firebase-admin/auth",
      "google-auth-library",
      "@google-cloud/firestore",
      "@google-cloud/storage",
      "cloudinary",
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
});

export default nextConfig;
