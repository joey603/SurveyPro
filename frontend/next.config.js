/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: '.next',
  output: 'standalone',
  
  // Ignorer les erreurs TypeScript et ESLint pendant le build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Configuration des images
  images: {
    domains: ['res.cloudinary.com', 'surveypro-ir3u.onrender.com', 'vercel.app', 'localhost'],
    unoptimized: true,
  },
  
  // Configuration des redirections API
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://surveypro-ir3u.onrender.com/api/:path*',
      },
    ];
  },
  
  // Configuration des alias
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname + '/src',
    };
    return config;
  },
};

module.exports = nextConfig; 