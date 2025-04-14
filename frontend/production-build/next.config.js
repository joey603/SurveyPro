/** @type {import('next').NextConfig} */
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
  // Utiliser uniquement le client-side rendering
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  // Configuration des images
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig; 