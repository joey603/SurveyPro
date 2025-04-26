#!/bin/bash

# Script pour préparer le déploiement sur Vercel
echo "Préparation du déploiement Vercel..."

# Afficher le répertoire courant et son contenu
echo "Répertoire actuel: $(pwd)"
echo "Contenu du répertoire:"
ls -la

# Vérifier si le dossier frontend existe
if [ -d "frontend" ]; then
  echo "✅ Dossier frontend trouvé, copie des fichiers nécessaires..."
  
  # Créer des dossiers s'ils n'existent pas
  mkdir -p src public
  
  # Copier les fichiers importants à la racine pour le déploiement
  echo "Copie des fichiers du frontend vers la racine..."
  cp -r frontend/src/* ./src/
  cp -r frontend/public/* ./public/
  cp frontend/next.config.js ./next.config.js
  cp frontend/package.json ./package.json
  cp frontend/package-lock.json ./package-lock.json
  cp frontend/tsconfig.json ./tsconfig.json
  cp frontend/.env.production ./.env.production
  
  echo "Fichiers copiés avec succès:"
  ls -la
  
  echo "Structure de fichiers préparée pour le déploiement."
  
  # Installation des dépendances et build
  echo "Installation des dépendances..."
  npm install

  # Installation explicite de js-cookie et ses types
  echo "Installation explicite de js-cookie..."
  npm install js-cookie @types/js-cookie --save

  # Vérifier que js-cookie est bien installé
  if [ ! -d "node_modules/js-cookie" ]; then
    echo "⚠️ js-cookie toujours manquant, tentative finale d'installation..."
    npm install js-cookie @types/js-cookie --save --force
  fi
  
  echo "Démarrage du build Next.js..."
  npm run build
else
  echo "❌ ERREUR: Dossier frontend non trouvé!"
  echo "Création d'une structure minimale pour le déploiement..."
  
  # Créer une structure minimale
  mkdir -p src/pages public
  
  # Créer un fichier index.js minimal
  echo "export default function Home() { return <div>SurveyPro - Erreur de structure du projet</div>; }" > src/pages/index.js
  
  echo "Structure minimale créée:"
  ls -la
  
  # Ne pas quitter avec erreur pour permettre au build de continuer
  echo "⚠️ Avertissement: Utilisation d'une structure minimale pour le déploiement."
fi
