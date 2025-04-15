/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Désactiver la vérification ESLint pendant la construction
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorer les erreurs TS durant la construction pour production
    ignoreBuildErrors: true,
  },
  trailingSlash: true,
  output: 'standalone',
  // Spécifier un dossier de build personnalisé
  distDir: 'build',
  // Ignorer les erreurs pendant la construction
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  experimental: {
    // Ignorer les erreurs pendant la construction
    skipTrailingSlashRedirect: true,
    skipMiddlewareUrlNormalize: true,
    // Ignorer les erreurs de page non trouvée pendant le build
    missingSuspenseWithCSRBailout: false,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      'intro.js': path.resolve(__dirname, 'node_modules/intro.js'),
      'intro.js/introjs.css': path.resolve(__dirname, 'node_modules/intro.js/introjs.css'),
    };
    return config;
  },
  // Configuration des images
  images: {
    domains: ['res.cloudinary.com'],
    formats: ['image/avif', 'image/webp'],
    unoptimized: true,
  },
  // Configuration pour le déploiement
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://surveypro-backend.onrender.com/api/:path*',
      },
      {
        source: '/survey-answer',
        destination: '/survey-answer',
      },
      {
        source: '/survey-answer/:path*',
        destination: '/survey-answer',
      }
    ];
  }
};

module.exports = nextConfig; 