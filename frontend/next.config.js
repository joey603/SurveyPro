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
  // Configuration pour éviter les erreurs de pré-rendu
  reactStrictMode: false,
  // Désactiver le prérendu statique des pages
  experimental: {
    disableOptimizedLoading: true,
    esmExternals: 'loose'
  },
  // Augmenter la limite de mémoire pour le build
  webpack: (config, { isServer }) => {
    // Augmenter la limite de mémoire pour le bundle
    config.performance = {
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    };
    
    // Si ce n'est pas le serveur, ajouter react comme externe
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    
    return config;
  },
  // Rewrites API
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://surveypro-ir3u.onrender.com/api/:path*',
      },
    ];
  },
  // Désactiver les vérifications de taille du bundle
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  }
};

module.exports = nextConfig; 