/**
 * Script pour vérifier que React est correctement installé avant le build
 */
console.log('🚀 Vérification des dépendances React...');

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  // Vérifier si React est installé
  let reactInstalled = false;
  let reactDomInstalled = false;
  try {
    require.resolve('react');
    reactInstalled = true;
    console.log('✓ React est installé');
  } catch (e) {
    console.log('⚠️ React n\'est pas installé, installation en cours...');
  }

  try {
    require.resolve('react-dom');
    reactDomInstalled = true;
    console.log('✓ React DOM est installé');
  } catch (e) {
    console.log('⚠️ React DOM n\'est pas installé, installation en cours...');
  }

  // Installer React s'il est manquant
  if (!reactInstalled || !reactDomInstalled) {
    console.log('📦 Installation des dépendances React...');
    try {
      execSync('npm install react@18.2.0 react-dom@18.2.0 --no-save --force', { stdio: 'inherit' });
      console.log('✅ Installation terminée');
    } catch (error) {
      console.error('❌ Erreur lors de l\'installation de React:', error);
      process.exit(1);
    }
  }

  console.log('✅ Vérification des dépendances React terminée avec succès');
} catch (error) {
  console.error('❌ Erreur lors de la vérification des dépendances React:', error);
  process.exit(1);
}
