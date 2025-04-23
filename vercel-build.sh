#!/bin/bash
set -e

echo "🚀 Démarrage du script de build Vercel..."
echo "📋 Vérification de l'environnement:"
node -v
npm -v

# Installation des dépendances racine
echo "📦 Installation des dépendances racine..."
npm install --no-audit --no-fund

# Accès au dossier frontend et build
echo "🔧 Navigation vers le dossier frontend..."
cd frontend || { echo "❌ Erreur: Dossier frontend introuvable"; exit 1; }

echo "📦 Installation des dépendances frontend..."
npm install --no-audit --no-fund --legacy-peer-deps || { echo "❌ Erreur: Installation des dépendances frontend échouée"; exit 1; }

# Vérification des packages critiques
echo "🔍 Vérification des packages critiques..."
npm list next || npm install next@latest --legacy-peer-deps
npm list react react-dom || npm install react@latest react-dom@latest --legacy-peer-deps

# Création d'un lien symbolique pour les alias si nécessaire
echo "🔗 Configuration des alias..."
if [ ! -d "node_modules/@" ]; then
  mkdir -p node_modules/@
  ln -sf "$(pwd)/src" node_modules/@
fi

# Nettoyage du cache Next.js si nécessaire
echo "🧹 Nettoyage du cache Next.js..."
if [ -d ".next" ]; then
  rm -rf .next
fi

# Exécution du build avec variables d'environnement optimisées
echo "🏗️ Construction de l'application..."
export NEXT_TELEMETRY_DISABLED=1
export SKIP_TYPE_CHECK=true 
export NODE_OPTIONS="--max-old-space-size=4096"

echo "Exécution de la commande build..."
npm run build || { echo "❌ Erreur: Build échoué"; exit 1; }

echo "✅ Build terminé avec succès!"
