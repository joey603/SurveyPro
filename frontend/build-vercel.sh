#!/bin/bash

# Script personnalisé pour le déploiement sur Vercel
echo "🚀 Démarrage du script de build personnalisé pour Vercel"

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
  echo "❌ Erreur: package.json non trouvé. Vérifiez le répertoire."
  exit 1
fi

# Assurer que node_modules est supprimé pour une installation propre
echo "🧹 Nettoyage des dépendances existantes..."
rm -rf node_modules
rm -rf .next

# Installer toutes les dépendances avec --force pour résoudre les conflits
echo "📦 Installation des dépendances avec --force et --legacy-peer-deps..."
npm install --force --legacy-peer-deps

# Vérifier que react et react-dom sont bien installés
if [ ! -d "node_modules/react" ] || [ ! -d "node_modules/react-dom" ]; then
  echo "⚠️ React ou ReactDOM manquant, installation forcée..."
  npm install react@18.3.1 react-dom@18.3.1 --save --legacy-peer-deps --force
fi

# Construction de l'application Next.js
echo "🏗️ Construction de l'application Next.js..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

echo "✅ Script de build terminé avec succès"
exit 0 