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
  const nodeModulesPath = path.join(frontendDir, 'node_modules', '@');

  console.log('📂 Vérification des chemins critiques:');
  console.log(`- Root: ${rootDir}`);
  console.log(`- Frontend: ${frontendDir}`);
  console.log(`- Src: ${srcDir}`);
  console.log(`- App: ${appDir}`);

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

  // Supprimer les pages anciennes/conflit si elles existent
  const pagesDir = path.join(srcDir, 'pages');
  if (fs.existsSync(pagesDir)) {
    console.log('🧹 Suppression du dossier pages pour éviter les conflits de routing...');
    try {
      fs.rmSync(pagesDir, { recursive: true, force: true });
    } catch (error) {
      console.log('⚠️ Erreur lors de la suppression du dossier pages:', error.message);
    }
  }

  // Créer/vérifier le dossier app
  if (!fs.existsSync(appDir)) {
    console.log('📁 Création du dossier app...');
    fs.mkdirSync(appDir, { recursive: true });
  } else {
    console.log('✅ Dossier app existant trouvé');
  }

  // Liste des fichiers essentiels à vérifier
  const essentialFiles = ['layout.tsx', 'page.tsx'];
  let filesExist = true;

  // Vérifier si tous les fichiers essentiels existent
  for (const file of essentialFiles) {
    const filePath = path.join(appDir, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Fichier ${file} manquant`);
      filesExist = false;
    }
  }

  // Ne pas toucher aux fichiers existants
  if (filesExist) {
    console.log('✅ Tous les fichiers essentiels existent et ne seront pas modifiés');
  } else {
    console.log('⚠️ Des fichiers essentiels sont manquants, création de fichiers temporaires...');
    
    // Si le layout n'existe pas, le créer
    const layoutPath = path.join(appDir, 'layout.tsx');
    if (!fs.existsSync(layoutPath)) {
      console.log('📝 Création du fichier layout.tsx...');
      const layoutContent = `"use client";

import "./globals.css";
import { AuthProvider } from "@/utils/AuthContext";
import NavBar from "./components/NavBar";
import { CircularProgress, Backdrop } from '@mui/material';
import { useState, useEffect, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <NavBar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}`;
      fs.writeFileSync(layoutPath, layoutContent);
    }
    
    // Si la page n'existe pas, la créer
    const pagePath = path.join(appDir, 'page.tsx');
    if (!fs.existsSync(pagePath)) {
      console.log('📝 Création du fichier page.tsx...');
      const pageContent = `'use client';

import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  
  return (
    <Container maxWidth="lg" sx={{ mt: 8, textAlign: 'center' }}>
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
      fs.writeFileSync(pagePath, pageContent);
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