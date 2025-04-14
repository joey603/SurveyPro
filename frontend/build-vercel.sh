#!/bin/bash

echo "Installation des dépendances..."
npm install --legacy-peer-deps

echo "Installation des packages manquants spécifiques..."
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities intro.js intro.js-react --legacy-peer-deps

# Créer un lien symbolique pour @/utils
echo "Configuration des alias de chemin..."
if [ ! -d "node_modules/@" ]; then
  mkdir -p node_modules/@
fi
ln -sf $(pwd)/src node_modules/@

echo "Construction de l'application..."
NEXT_TELEMETRY_DISABLED=1 next build 