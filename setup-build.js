/**
 * Script de configuration pour le déploiement sur Vercel
 */
const fs = require('fs');
const path = require('path');

console.log('🚀 Préparation de l\'environnement de build...');

// Configurer les variables d'environnement
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.SKIP_TYPE_CHECK = 'true';
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

// Fonction pour copier des dossiers récursivement
function copyFolderRecursiveSync(source, target) {
  // Vérifier que le dossier source existe
  if (!fs.existsSync(source)) {
    console.error(`❌ Le dossier source n'existe pas: ${source}`);
    return false;
  }

  // Créer le dossier cible si nécessaire
  const targetFolder = path.join(target, path.basename(source));
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
    console.log(`📁 Dossier créé: ${targetFolder}`);
  }

  // Lire le contenu du dossier source
  if (fs.lstatSync(source).isDirectory()) {
    const files = fs.readdirSync(source);
    console.log(`📋 Contenu à copier de ${source}: ${files.length} fichiers/dossiers`);
    
    // Copier chaque fichier/dossier
    files.forEach(function(file) {
      const curSource = path.join(source, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        // C'est un dossier, copier récursivement
        copyFolderRecursiveSync(curSource, targetFolder);
      } else {
        // C'est un fichier, le copier directement
        const targetFile = path.join(targetFolder, file);
        fs.copyFileSync(curSource, targetFile);
        console.log(`📄 Fichier copié: ${file}`);
      }
    });
    return true;
  }
  return false;
}

// Fonction pour copier tout le contenu d'un dossier vers un autre (sans créer de sous-dossier)
function copyDirContentsSync(source, target) {
  // Vérifier que le dossier source existe
  if (!fs.existsSync(source)) {
    console.error(`❌ Le dossier source n'existe pas: ${source}`);
    return false;
  }

  // Créer le dossier cible s'il n'existe pas
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
    console.log(`📁 Dossier cible créé: ${target}`);
  }

  // Lire le contenu du dossier source
  const files = fs.readdirSync(source);
  console.log(`📋 Contenu à copier de ${source} vers ${target}: ${files.length} fichiers/dossiers`);

  // Copier chaque fichier/dossier
  files.forEach(function(file) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    
    if (fs.lstatSync(curSource).isDirectory()) {
      // C'est un dossier, copier récursivement
      copyFolderRecursiveSync(curSource, target);
    } else {
      // C'est un fichier, le copier directement
      fs.copyFileSync(curSource, curTarget);
      console.log(`📄 Fichier copié: ${file}`);
    }
  });
  
  return true;
}

try {
  // Résoudre les chemins
  const frontendDir = path.resolve(__dirname, 'frontend');
  const nodeModulesPath = path.join(frontendDir, 'node_modules', '@');
  const srcPath = path.join(frontendDir, 'src');
  const srcAppDir = path.join(srcPath, 'app');
  const rootAppDir = path.join(frontendDir, 'app');
  
  console.log('📂 Vérification des chemins:');
  console.log(`- Frontend: ${frontendDir}`);
  console.log(`- Source: ${srcPath}`);
  console.log(`- Source App: ${srcAppDir}`);
  console.log(`- Root App: ${rootAppDir}`);
  
  // 1. Créer le dossier app à la racine pour Next.js
  if (fs.existsSync(srcAppDir)) {
    console.log('📋 Préparation du dossier app racine pour Next.js...');
    
    // Supprimer le dossier app racine s'il existe déjà
    if (fs.existsSync(rootAppDir)) {
      console.log('🧹 Nettoyage du dossier app existant...');
      fs.rmSync(rootAppDir, { recursive: true, force: true });
    }
    
    // Créer le dossier app à la racine
    fs.mkdirSync(rootAppDir, { recursive: true });
    console.log('✅ Dossier app racine créé');
    
    // Copier le contenu
    console.log('📋 Copie du contenu app...');
    const copySuccess = copyDirContentsSync(srcAppDir, rootAppDir);
    
    if (copySuccess) {
      console.log('✅ Contenu app copié avec succès');
    } else {
      console.error('❌ Échec de la copie du contenu app');
    }
  } else {
    console.error('❌ Dossier src/app introuvable:', srcAppDir);
    console.log('Contenu de src:', fs.existsSync(srcPath) ? fs.readdirSync(srcPath) : 'Dossier src inexistant');
  }
  
  // 2. Créer alias @ pour src
  if (fs.existsSync(srcPath)) {
    console.log('🔗 Configuration de l\'alias @ pour src...');
    
    // Créer le dossier pour l'alias si nécessaire
    if (!fs.existsSync(path.dirname(nodeModulesPath))) {
      fs.mkdirSync(path.dirname(nodeModulesPath), { recursive: true });
    }
    
    // Copier le contenu de src vers l'alias @
    if (fs.existsSync(nodeModulesPath)) {
      fs.rmSync(nodeModulesPath, { recursive: true, force: true });
    }
    
    fs.mkdirSync(nodeModulesPath, { recursive: true });
    copyDirContentsSync(srcPath, nodeModulesPath);
    console.log('✅ Alias @ configuré');
  } else {
    console.error('❌ Dossier src introuvable');
  }
  
  // 3. Nettoyer le cache .next si nécessaire
  const nextCacheDir = path.join(frontendDir, '.next');
  if (fs.existsSync(nextCacheDir)) {
    console.log('🧹 Nettoyage du cache Next.js...');
    fs.rmSync(nextCacheDir, { recursive: true, force: true });
  }
  
  console.log('✅ Préparation terminée avec succès!');
} catch (error) {
  console.error('❌ Erreur lors de la préparation du build:', error);
  // Ne pas échouer le processus
} 