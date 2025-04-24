#!/bin/bash

# Script pour orchestrer le build sur Vercel
echo "Démarrage du processus de build pour Vercel..."

# Assurer que nous sommes bien dans le répertoire frontend
cd frontend

# Exécuter le script de build du frontend
echo "Exécution du build du frontend..."
chmod +x build-vercel.sh
./build-vercel.sh

echo "Build terminé avec succès!"
