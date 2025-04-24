/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  eslint: {
    // Désactiver la vérification ESLint pendant la construction
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorer les erreurs TS durant la construction pour production
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  distDir: '.next',
  // Webpack configuration pour les alias
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src')
    };
    return config;
  },
  // Configuration des images
  images: {
    domains: ['res.cloudinary.com', 'surveypro-ir3u.onrender.com', 'vercel.app'],
    unoptimized: true,
  },
  // Rewrites API
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/api/:path*',
      },
    ];
  }
};

module.exports = nextConfig; 