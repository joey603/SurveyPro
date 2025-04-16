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
    domains: ['res.cloudinary.com', 'surveypro-ir3u.onrender.com', 'vercel.app'],
    formats: ['image/avif', 'image/webp'],
    unoptimized: true,
  },
  // Configuration pour le déploiement
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
        },
      ],
    };
  },
  // Ajouter des en-têtes pour CORS
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS,PATCH' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  }
};

module.exports = nextConfig; 