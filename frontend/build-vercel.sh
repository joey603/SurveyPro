#!/bin/bash

echo "Installation des dépendances..."
npm install --legacy-peer-deps

echo "Installation des packages manquants spécifiques..."
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities intro.js intro.js-react typescript --legacy-peer-deps

echo "Installation de tailwindcss et autres dépendances CSS nécessaires..."
npm install tailwindcss autoprefixer postcss --legacy-peer-deps

# Créer un lien symbolique pour @/utils
echo "Configuration des alias de chemin..."
if [ ! -d "node_modules/@" ]; then
  mkdir -p node_modules/@
fi
ln -sf $(pwd)/src node_modules/@

# Corriger les problèmes de conflit PostCSS
echo "Correction de la configuration PostCSS..."
rm -f postcss.config.mjs

echo "Construction de l'application..."
NEXT_TELEMETRY_DISABLED=1 SKIP_TYPE_CHECK=true next build 