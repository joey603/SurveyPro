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