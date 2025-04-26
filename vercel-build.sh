#!/bin/bash

# Script pour préparer le déploiement sur Vercel
echo "Préparation du déploiement Vercel..."

# Vérifier si le dossier frontend existe
if [ -d "frontend" ]; then
  echo "Dossier frontend trouvé, copie des fichiers nécessaires..."
  
  # Copier les fichiers importants à la racine pour le déploiement
  cp -r frontend/src ./src
  cp -r frontend/public ./public
  cp frontend/next.config.js ./next.config.js
  cp frontend/package.json ./package.json
  cp frontend/package-lock.json ./package-lock.json
  cp frontend/tsconfig.json ./tsconfig.json
  cp frontend/.env.production ./.env.production
  
  echo "Structure de fichiers préparée pour le déploiement."
else
  echo "ERREUR: Dossier frontend non trouvé!"
  exit 1
fi
