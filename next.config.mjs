/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "firebase-admin",
      "google-auth-library",
      "@google-cloud/firestore",
      "@firebase/firestore",
      "cloudinary",
    ],
  },
  serverExternalPackages: [
    "firebase-admin",
    "google-auth-library",
    "@google-cloud/firestore",
    "@firebase/firestore",
    "cloudinary",
  ],
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
