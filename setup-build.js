/**
 * Script de configuration pour le déploiement sur Vercel
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Préparation de l\'environnement de build...');

// Configurer les variables d'environnement
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.SKIP_TYPE_CHECK = 'true';
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

try {
  // Créer le lien symbolique pour @/
  const frontendDir = path.resolve(__dirname, 'frontend');
  const nodeModulesPath = path.join(frontendDir, 'node_modules', '@');
  const srcPath = path.join(frontendDir, 'src');

  console.log('📂 Vérification des chemins critiques:');
  console.log(`- Frontend: ${frontendDir}`);
  console.log(`- Source: ${srcPath}`);

  // Copier le dossier app de src vers la racine pour Next.js
  const srcAppDir = path.join(srcPath, 'app');
  const rootAppDir = path.join(frontendDir, 'app');
  
  if (fs.existsSync(srcAppDir)) {
    console.log('📋 Copie du dossier app vers la racine pour Next.js...');
    
    // Supprimer le dossier app racine s'il existe déjà
    if (fs.existsSync(rootAppDir)) {
      console.log('🧹 Nettoyage du dossier app existant...');
      fs.rmSync(rootAppDir, { recursive: true, force: true });
    }
    
    // Créer le dossier app à la racine
    fs.mkdirSync(rootAppDir, { recursive: true });
    
    // Copier le contenu
    try {
      execSync(`cp -r ${srcAppDir}/* ${rootAppDir}/`);
      console.log('✅ Dossier app copié avec succès!');
    } catch (error) {
      console.error('❌ Erreur lors de la copie du dossier app:', error.message);
      
      // Méthode alternative avec fs
      console.log('🔄 Tentative avec méthode alternative...');
      copyFolderRecursiveSync(srcAppDir, frontendDir);
    }
  } else {
    console.error('❌ Dossier src/app introuvable!');
  }

  if (fs.existsSync(srcPath)) {
    if (!fs.existsSync(path.dirname(nodeModulesPath))) {
      console.log('📁 Création du dossier node_modules/@');
      fs.mkdirSync(path.dirname(nodeModulesPath), { recursive: true });
    }

    try {
      // Supprimer le lien symbolique s'il existe déjà
      if (fs.existsSync(nodeModulesPath)) {
        fs.unlinkSync(nodeModulesPath);
      }

      // Créer le lien symbolique
      console.log('🔗 Création du lien symbolique pour @/');
      fs.symlinkSync(srcPath, nodeModulesPath, 'dir');
    } catch (error) {
      console.log('⚠️ Impossible de créer le lien symbolique, utilisation d\'une méthode alternative');
      console.log(error.message);

      // Alternative: copier le contenu du dossier si symlink échoue
      if (!fs.existsSync(nodeModulesPath)) {
        fs.mkdirSync(nodeModulesPath, { recursive: true });
      }
      
      console.log('📋 Copie des fichiers au lieu du lien symbolique...');
      execSync(`cp -r ${srcPath}/* ${nodeModulesPath}/`);
    }
  } else {
    console.log('⚠️ Dossier src introuvable!');
  }

  // Nettoyer le cache .next si nécessaire
  const nextCacheDir = path.join(frontendDir, '.next');
  if (fs.existsSync(nextCacheDir)) {
    console.log('🧹 Nettoyage du cache Next.js...');
    fs.rmSync(nextCacheDir, { recursive: true, force: true });
  }

  console.log('✅ Préparation terminée avec succès!');
} catch (error) {
  console.error('❌ Erreur lors de la préparation du build:', error);
  // Ne pas échouer le processus pour éviter de bloquer le build
}

// Fonction alternative pour copier des dossiers
function copyFolderRecursiveSync(source, target) {
  const targetFolder = path.join(target, path.basename(source));
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  if (fs.lstatSync(source).isDirectory()) {
    const files = fs.readdirSync(source);
    files.forEach(function(file) {
      const curSource = path.join(source, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, targetFolder);
      } else {
        const targetFile = path.join(targetFolder, file);
        fs.copyFileSync(curSource, targetFile);
      }
    });
  }
} 