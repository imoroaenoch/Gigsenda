/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
};

export default nextConfig;
