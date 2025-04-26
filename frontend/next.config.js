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
  // Configuration critique pour Vercel - désactiver complètement le rendu statique
  output: 'standalone',
  experimental: {
    // Désactiver complètement le pré-rendu statique
    isrMemoryCacheSize: 0,
    // Désactiver la génération au moment de la construction
    staticPageGenerationTimeout: 0,
  },
  // Désactiver tous les rendus statiques
  staticPageGenerationTimeout: 0,
  // Forcer l'utilisation du mode client
  reactStrictMode: false,
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