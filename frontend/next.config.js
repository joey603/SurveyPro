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
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
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