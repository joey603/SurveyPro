/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Désactiver la vérification ESLint pendant la construction
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorer les erreurs TS durant la construction pour production
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['res.cloudinary.com', 'surveypro-ir3u.onrender.com', 'vercel.app'],
    unoptimized: true,
  },
  // Configuration spéciale pour Vercel
  output: 'standalone',
  // Désactiver complètement le pré-rendu statique
  experimental: {
    disableStaticImages: true,
    appDocumentPreloading: false,
  },
  // Configuration pour éviter les erreurs de pré-rendu
  reactStrictMode: false,
  staticPageGenerationTimeout: 60,
  // Rewrites API
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://surveypro-ir3u.onrender.com/api/:path*',
      },
    ];
  }
};

module.exports = nextConfig; 