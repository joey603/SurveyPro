/**
 * Script de vérification de la structure du projet pour le déploiement sur Vercel
 */
const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification de la structure du projet pour Next.js...');

// Chemins critiques
const rootDir = __dirname;
const srcDir = path.join(rootDir, 'src');
const srcAppDir = path.join(srcDir, 'app');
const rootAppDir = path.join(rootDir, 'app');
const pagesDir = path.join(rootDir, 'pages');

// Informations sur l'environnement
console.log('📂 Contenu du répertoire racine:');
try {
  const rootFiles = fs.readdirSync(rootDir);
  console.log(rootFiles);
} catch (error) {
  console.error(`❌ Erreur lors de la lecture du répertoire racine: ${error.message}`);
}

// Vérifier si les dossiers app ou pages existent
let appExists = fs.existsSync(rootAppDir);
let pagesExists = fs.existsSync(pagesDir);
let srcAppExists = fs.existsSync(srcAppDir);

console.log(`App dir exists: ${appExists}`);
console.log(`Pages dir exists: ${pagesExists}`);
console.log(`Src/app dir exists: ${srcAppExists}`);

// Si aucun des dossiers n'existe, créer un dossier pages minimal
if (!appExists && !pagesExists) {
  console.log('🛠️ Création d\'un dossier pages minimal...');
  try {
    // Créer le dossier pages
    fs.mkdirSync(pagesDir, { recursive: true });
    
    // Créer un fichier _app.js minimal
    const appContent = `
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;
    `;
    fs.writeFileSync(path.join(pagesDir, '_app.js'), appContent);
    
    // Créer un fichier index.js minimal
    const indexContent = `
export default function Home() {
  return (
    <div>
      <h1>SurveyPro - Application en cours de chargement</h1>
      <p>Patientez pendant le déploiement...</p>
    </div>
  );
}
    `;
    fs.writeFileSync(path.join(pagesDir, 'index.js'), indexContent);
    
    // Créer un dossier styles et un fichier CSS minimal
    const stylesDir = path.join(rootDir, 'styles');
    fs.mkdirSync(stylesDir, { recursive: true });
    fs.writeFileSync(path.join(stylesDir, 'globals.css'), 'body { font-family: sans-serif; }');
    
    console.log('✅ Structure minimale créée avec succès');
  } catch (error) {
    console.error(`❌ Erreur lors de la création de la structure minimale: ${error.message}`);
  }
}

// Si le dossier src/app existe mais pas app à la racine, copier le contenu
if (srcAppExists && !appExists) {
  console.log('🔄 Copie du dossier src/app vers la racine...');
  try {
    // Fonction pour copier récursivement
    function copyRecursive(src, dest) {
      const exists = fs.existsSync(src);
      if (!exists) {
        console.error(`❌ Le dossier source n'existe pas: ${src}`);
        return;
      }
      
      const stats = fs.statSync(src);
      if (stats.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(function(childItemName) {
          copyRecursive(
            path.join(src, childItemName),
            path.join(dest, childItemName)
          );
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    }
    
    // Créer le dossier app à la racine
    fs.mkdirSync(rootAppDir, { recursive: true });
    
    // Copier le contenu
    copyRecursive(srcAppDir, rootAppDir);
    console.log('✅ Dossier src/app copié avec succès vers la racine');
  } catch (error) {
    console.error(`❌ Erreur lors de la copie du dossier src/app: ${error.message}`);
  }
}

console.log('✅ Vérification terminée'); 