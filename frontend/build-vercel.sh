#!/bin/bash

echo "Installation des dépendances..."
npm install --legacy-peer-deps

echo "Installation des packages manquants spécifiques..."
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities intro.js intro.js-react --legacy-peer-deps

echo "Construction de l'application..."
NEXT_TELEMETRY_DISABLED=1 next build 