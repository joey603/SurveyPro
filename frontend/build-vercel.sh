#!/bin/bash
set -e

echo "🚀 Début du script de déploiement sur Vercel..."

# Affichage de l'environnement
echo "📋 Informations sur l'environnement:"
node -v
npm -v
pwd
ls -la

echo "📦 Installation des dépendances..."
npm install --legacy-peer-deps

echo "🔍 Installation des packages spécifiques manquants..."
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities intro.js intro.js-react typescript tailwindcss@3.3.0 postcss@latest autoprefixer@latest --legacy-peer-deps

# Créer un lien symbolique pour @/utils
echo "🔧 Configuration des alias de chemin..."
if [ ! -d "node_modules/@" ]; then
  mkdir -p node_modules/@
fi
ln -sf $(pwd)/src node_modules/@

# Corriger les problèmes de conflit PostCSS
echo "🛠️ Correction de la configuration PostCSS..."
if [ -f "postcss.config.mjs" ]; then
  echo "Suppression de postcss.config.mjs"
  rm -f postcss.config.mjs
fi

# S'assurer que next.config.js est correctement configuré
echo "✅ Vérification de la configuration Next.js..."
if [ -f "next.config.js" ]; then
  echo "next.config.js existe déjà"
else
  echo "Création d'un fichier next.config.js par défaut"
  cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  output: 'standalone',
  images: {
    domains: ['res.cloudinary.com', 'surveypro-ir3u.onrender.com', 'vercel.app'],
    unoptimized: true,
  },
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
EOF
fi

echo "🏗️ Construction de l'application..."
export NEXT_TELEMETRY_DISABLED=1
export SKIP_TYPE_CHECK=true
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

echo "✅ Build terminé avec succès" 