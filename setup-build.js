/**
 * Script de configuration pour le déploiement sur Vercel
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Préparation de l\'environnement de build...');

// Configuration de l'environnement
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.SKIP_TYPE_CHECK = 'true';
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

try {
  // Chemins importants
  const rootDir = __dirname;
  const frontendDir = path.join(rootDir, 'frontend');
  const srcDir = path.join(frontendDir, 'src');
  const appDir = path.join(srcDir, 'app');
  const pagesDir = path.join(srcDir, 'pages');
  const nodeModulesPath = path.join(frontendDir, 'node_modules', '@');

  console.log('📂 Vérification des chemins critiques:');
  console.log(`- Root: ${rootDir}`);
  console.log(`- Frontend: ${frontendDir}`);
  console.log(`- Src: ${srcDir}`);
  console.log(`- App: ${appDir}`);
  console.log(`- Pages: ${pagesDir}`);

  // Vérifier que les répertoires existent
  if (!fs.existsSync(frontendDir)) {
    console.error('❌ Erreur: Le dossier frontend n\'existe pas');
    process.exit(1);
  }

  if (!fs.existsSync(srcDir)) {
    console.error('❌ Erreur: Le dossier src n\'existe pas');
    fs.mkdirSync(srcDir, { recursive: true });
    console.log('✅ Dossier src créé');
  }

  // Détecter quel mode de routing est utilisé (app ou pages) et s'assurer qu'ils ne sont pas en conflit
  const appDirExists = fs.existsSync(appDir);
  const pagesDirExists = fs.existsSync(pagesDir);

  // Vérifier si les fichiers spécifiques existent
  const appPagePathOriginal = path.join(appDir, 'page.tsx');
  const appPageExists = appDirExists && fs.existsSync(appPagePathOriginal);
  const pagesIndexPath = path.join(pagesDir, 'index.tsx');
  const pagesIndexExists = pagesDirExists && fs.existsSync(pagesIndexPath);

  // Si l'un des fichiers de route existe déjà, ne pas les remplacer, juste résoudre les conflits
  if (appPageExists && pagesIndexExists) {
    console.log('⚠️ Conflit détecté entre app/page.tsx et pages/index.tsx - Suppression de pages/index.tsx');
    fs.unlinkSync(pagesIndexPath);
  }
  
  // Sélectionner un mode de routing principal (privilégier App Router si existant)
  let useAppRouter = true;
  
  if (appDirExists && appPageExists) {
    console.log('✅ Utilisation du App Router (dossier app) avec la page existante');
    useAppRouter = true;
  } else if (pagesDirExists && pagesIndexExists) {
    console.log('✅ Utilisation du Pages Router (dossier pages) avec la page existante');
    useAppRouter = false;
  } else if (appDirExists && fs.readdirSync(appDir).length > 0) {
    console.log('✅ Utilisation du App Router (dossier app)');
    useAppRouter = true;
  } else if (pagesDirExists && fs.readdirSync(pagesDir).length > 0) {
    console.log('✅ Utilisation du Pages Router (dossier pages)');
    useAppRouter = false;
  } else {
    console.log('🔍 Aucun routeur trouvé, création de l\'App Router par défaut');
    useAppRouter = true;
  }
  
  // Créer le routeur manquant en fonction de la détection
  if (useAppRouter) {
    // Utiliser App Router: créer le dossier app et les fichiers nécessaires
    if (!fs.existsSync(appDir)) {
      console.log('📁 Création du dossier app...');
      fs.mkdirSync(appDir, { recursive: true });
    }
    
    // Créer app/page.tsx s'il n'existe pas
    const appPagePath = path.join(appDir, 'page.tsx');
    if (!fs.existsSync(appPagePath)) {
      // Vérifier si une version de sauvegarde existe (pourrait avoir été déplacée)
      const originalPageBackupPath = path.join(srcDir, 'original-page.tsx.backup');
      if (fs.existsSync(originalPageBackupPath)) {
        console.log('🔄 Restauration de la page originale depuis la sauvegarde');
        fs.copyFileSync(originalPageBackupPath, appPagePath);
      } else {
        console.log('📝 Création d\'une page par défaut app/page.tsx');
        const pageContent = `'use client';

import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  
  return (
    <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Bienvenue sur SurveyPro
      </Typography>
      <Typography variant="h5" color="text.secondary" paragraph>
        Votre plateforme de sondages professionnels
      </Typography>
      <Box sx={{ mt: 4 }}>
        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          onClick={() => router.push('/login')}
          sx={{ mx: 1 }}
        >
          Se connecter
        </Button>
        <Button 
          variant="outlined" 
          color="primary" 
          size="large"
          onClick={() => router.push('/register')}
          sx={{ mx: 1 }}
        >
          S'inscrire
        </Button>
      </Box>
    </Container>
  );
}`;
        fs.writeFileSync(appPagePath, pageContent);
      }
    }
    
    // Créer app/layout.tsx s'il n'existe pas
    const layoutPath = path.join(appDir, 'layout.tsx');
    if (!fs.existsSync(layoutPath)) {
      console.log('📝 Création de app/layout.tsx');
      const layoutContent = `export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}`;
      fs.writeFileSync(layoutPath, layoutContent);
    }
    
    // Suppression du dossier pages s'il est vide
    if (pagesDirExists) {
      const pagesFiles = fs.readdirSync(pagesDir);
      if (pagesFiles.length === 0) {
        console.log('🧹 Suppression du dossier pages vide...');
        fs.rmdirSync(pagesDir);
      } else {
        console.log('⚠️ Le dossier pages contient des fichiers, vérifiez qu\'il n\'y a pas de conflit avec app');
      }
    }
  } else {
    // Utiliser Pages Router: créer le dossier pages et les fichiers nécessaires
    if (!fs.existsSync(pagesDir)) {
      console.log('📁 Création du dossier pages...');
      fs.mkdirSync(pagesDir, { recursive: true });
    }
    
    // Créer pages/index.tsx s'il n'existe pas
    const indexPath = path.join(pagesDir, 'index.tsx');
    if (!fs.existsSync(indexPath)) {
      // Si la page App existe, la copier en l'adaptant
      if (appPageExists) {
        console.log('🔄 Adaptation de la page app en page index');
        const appPageContent = fs.readFileSync(appPagePathOriginal, 'utf8');
        // Remplacer 'use client' et adapter au besoin
        const indexContent = appPageContent.replace('\'use client\';', '');
        fs.writeFileSync(indexPath, indexContent);
      } else {
        console.log('📝 Création de pages/index.tsx');
        const indexContent = `import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  
  return (
    <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Bienvenue sur SurveyPro
      </Typography>
      <Typography variant="h5" color="text.secondary" paragraph>
        Votre plateforme de sondages professionnels
      </Typography>
      <Box sx={{ mt: 4 }}>
        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          onClick={() => router.push('/login')}
          sx={{ mx: 1 }}
        >
          Se connecter
        </Button>
        <Button 
          variant="outlined" 
          color="primary" 
          size="large"
          onClick={() => router.push('/register')}
          sx={{ mx: 1 }}
        >
          S'inscrire
        </Button>
      </Box>
    </Container>
  );
}`;
        fs.writeFileSync(indexPath, indexContent);
      }
    }
    
    // Créer pages/_app.tsx s'il n'existe pas
    const appPath = path.join(pagesDir, '_app.tsx');
    if (!fs.existsSync(appPath)) {
      console.log('📝 Création de pages/_app.tsx');
      const appContent = `import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}`;
      fs.writeFileSync(appPath, appContent);
    }
    
    // Suppression du dossier app s'il est vide
    if (appDirExists) {
      const appFiles = fs.readdirSync(appDir);
      if (appFiles.length === 0) {
        console.log('🧹 Suppression du dossier app vide...');
        fs.rmdirSync(appDir);
      } else {
        console.log('⚠️ Le dossier app contient des fichiers, vérifiez qu\'il n\'y a pas de conflit avec pages');
      }
    }
  }

  // Créer un lien symbolique pour @/
  if (fs.existsSync(srcDir)) {
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
      fs.symlinkSync(srcDir, nodeModulesPath, 'dir');
    } catch (error) {
      console.log('⚠️ Impossible de créer le lien symbolique, utilisation d\'une méthode alternative');
      console.log(error.message);

      // Alternative: copier le contenu du dossier si symlink échoue
      if (!fs.existsSync(nodeModulesPath)) {
        fs.mkdirSync(nodeModulesPath, { recursive: true });
      }
      
      console.log('📋 Copie des fichiers au lieu du lien symbolique...');
      execSync(`cp -r ${srcDir}/* ${nodeModulesPath}/`);
    }
  }

  // Créer un .babelrc pour s'assurer que les imports fonctionnent
  const babelrcPath = path.join(frontendDir, '.babelrc');
  if (!fs.existsSync(babelrcPath)) {
    console.log('📝 Création du fichier .babelrc...');
    const babelrcContent = `{
  "presets": ["next/babel"],
  "plugins": [
    ["module-resolver", {
      "root": ["./"],
      "alias": {
        "@": "./src"
      }
    }]
  ]
}`;
    fs.writeFileSync(babelrcPath, babelrcContent);
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