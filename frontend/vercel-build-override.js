const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Configuration de base
const OUTPUT_DIR = '.next';
const SUCCESS_FILE = path.join(OUTPUT_DIR, 'BUILD_SUCCESS');
const STATIC_DIR = path.join(OUTPUT_DIR, 'static');
const SERVER_DIR = path.join(OUTPUT_DIR, 'server');
const SERVERLESS_DIR = path.join(OUTPUT_DIR, 'serverless');

console.log('🔄 Démarrage du processus de build personnalisé pour Vercel...');

try {
  // Si le dossier output existe déjà, le supprimer
  if (fs.existsSync(OUTPUT_DIR)) {
    console.log(`🗑️ Suppression du dossier ${OUTPUT_DIR} existant...`);
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }

  // Créer les dossiers nécessaires
  console.log('📁 Création des dossiers nécessaires...');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(STATIC_DIR, { recursive: true });
  fs.mkdirSync(SERVER_DIR, { recursive: true });
  fs.mkdirSync(SERVERLESS_DIR, { recursive: true });

  // Créer une page HTML statique qui redirige vers l'application hébergée sur Render
  console.log('📝 Création de la page statique...');
  
  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SurveyPro - Redirection</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      color: #333;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 40px;
      text-align: center;
      max-width: 500px;
    }
    h1 {
      color: #5664d2;
      margin-bottom: 20px;
    }
    p {
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(86, 100, 210, 0.3);
      border-radius: 50%;
      border-top-color: #5664d2;
      animation: spin 1s linear infinite;
      margin-right: 10px;
    }
    .button {
      display: inline-block;
      background-color: #5664d2;
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 4px;
      font-weight: 500;
      margin-top: 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
  <script>
    // Rediriger vers l'application principale après un délai
    window.onload = function() {
      setTimeout(function() {
        window.location.href = "https://surveypro-ir3u.onrender.com";
      }, 3000);
    }
  </script>
</head>
<body>
  <div class="container">
    <h1>SurveyPro</h1>
    <div>
      <div class="loading"></div>
      <p>Redirection vers l'application principale...</p>
      <p>Si vous n'êtes pas redirigé automatiquement, cliquez sur le bouton ci-dessous :</p>
      <a href="https://surveypro-ir3u.onrender.com" class="button">Accéder à SurveyPro</a>
    </div>
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), htmlContent);
  
  // Créer un fichier server.js minimal
  console.log('📝 Création du serveur minimal...');
  const serverJsContent = `
// Serveur Next.js minimal
const { createServer } = require('http');
const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(indexHtml);
}).listen(process.env.PORT || 3000);
  `;
  
  fs.writeFileSync(path.join(SERVER_DIR, 'server.js'), serverJsContent);
  
  // Créer un fichier de configuration pour Vercel
  console.log('📝 Création du fichier de configuration...');
  const configContent = `{
  "version": 2,
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}`;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'config.json'), configContent);
  
  // Créer routes-manifest.json pour Vercel
  console.log('📝 Création du fichier routes-manifest.json pour Vercel...');
  const routesManifest = {
    version: 3,
    basePath: "",
    pages404: true,
    redirects: [],
    headers: [],
    dynamicRoutes: [],
    staticRoutes: [
      {
        page: "/",
        regex: "^/(?:/)?$",
        routeKeys: {},
        namedRegex: "^/(?:/)?$"
      }
    ],
    dataRoutes: [],
    rewrites: [
      {
        source: "/api/:path*",
        destination: "https://surveypro-ir3u.onrender.com/api/:path*"
      }
    ]
  };
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'routes-manifest.json'), JSON.stringify(routesManifest, null, 2));
  
  // Créer build-manifest.json pour Vercel
  console.log('📝 Création du fichier build-manifest.json pour Vercel...');
  const buildManifest = {
    polyfillFiles: [],
    devFiles: [],
    ampDevFiles: [],
    lowPriorityFiles: [],
    rootMainFiles: [],
    pages: {
      "/": ["static/chunks/pages/index.js"]
    },
    ampFirstPages: []
  };
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'build-manifest.json'), JSON.stringify(buildManifest, null, 2));
  
  // Générer des IDs aléatoires pour le mode d'aperçu
  const generateId = () => crypto.randomBytes(16).toString('hex');
  
  // Créer prerender-manifest.json pour Vercel
  console.log('📝 Création du fichier prerender-manifest.json pour Vercel...');
  const prerenderManifest = {
    version: 4,
    routes: {
      "/": {
        initialRevalidateSeconds: false,
        srcRoute: null,
        dataRoute: null
      }
    },
    dynamicRoutes: {},
    notFoundRoutes: [],
    preview: {
      previewModeId: generateId(),
      previewModeSigningKey: generateId(),
      previewModeEncryptionKey: generateId()
    }
  };
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'prerender-manifest.json'), JSON.stringify(prerenderManifest, null, 2));
  
  // Créer un fichier requis pour Next.js
  console.log('📝 Création des fichiers additionnels requis par Next.js...');
  
  // Créer react-loadable-manifest.json
  const reactLoadableManifest = {};
  fs.writeFileSync(path.join(OUTPUT_DIR, 'react-loadable-manifest.json'), JSON.stringify(reactLoadableManifest, null, 2));
  
  // Créer un fichier pages-manifest.json
  const pagesManifest = {
    "/": "pages/index.js",
    "/_app": "pages/_app.js",
    "/_error": "pages/_error.js",
    "/_document": "pages/_document.js"
  };
  
  fs.mkdirSync(path.join(SERVER_DIR, 'pages'), { recursive: true });
  
  // Créer des fichiers JS minimaux pour chaque page
  fs.writeFileSync(path.join(SERVER_DIR, 'pages/index.js'), 'module.exports = function(){return "Index Page"}');
  fs.writeFileSync(path.join(SERVER_DIR, 'pages/_app.js'), 'module.exports = function(){return "App Page"}');
  fs.writeFileSync(path.join(SERVER_DIR, 'pages/_error.js'), 'module.exports = function(){return "Error Page"}');
  fs.writeFileSync(path.join(SERVER_DIR, 'pages/_document.js'), 'module.exports = function(){return "Document Page"}');
  
  fs.writeFileSync(path.join(SERVER_DIR, 'pages-manifest.json'), JSON.stringify(pagesManifest, null, 2));
  
  // Créer des fichiers serverless (CRITIQUE pour Vercel)
  console.log('📝 Création des fichiers serverless requis par Vercel...');
  
  // Créer les dossiers pour les pages serverless
  fs.mkdirSync(path.join(SERVERLESS_DIR, 'pages'), { recursive: true });
  
  // Fichiers minimaux pour serverless
  const serverlessPageContent = `
module.exports = {
  render: (req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end(\`${htmlContent}\`);
  }
};
  `;
  
  // Créer les mêmes pages en version serverless
  fs.writeFileSync(path.join(SERVERLESS_DIR, 'pages/index.js'), serverlessPageContent);
  fs.writeFileSync(path.join(SERVERLESS_DIR, 'pages/_app.js'), 'module.exports = {render: (req, res) => {res.end("App Page")}}');
  fs.writeFileSync(path.join(SERVERLESS_DIR, 'pages/_error.js'), 'module.exports = {render: (req, res) => {res.end("Error Page")}}');
  fs.writeFileSync(path.join(SERVERLESS_DIR, 'pages/_document.js'), 'module.exports = {render: (req, res) => {res.end("Document Page")}}');
  
  // Créer le manifest des pages serverless
  fs.writeFileSync(path.join(SERVERLESS_DIR, 'pages-manifest.json'), JSON.stringify(pagesManifest, null, 2));
  
  // NOUVEAU: Ajouter des fichiers HTML et JSON pour les fonctions serverless
  console.log('📝 Création des fichiers HTML et JSON pour les fonctions serverless...');
  
  // Créer les dossiers pour les fichiers HTML et JSON
  fs.mkdirSync(path.join(SERVERLESS_DIR, 'pages/index'), { recursive: true });
  
  // Fichier HTML pour la page d'index
  fs.writeFileSync(path.join(SERVERLESS_DIR, 'pages/index/index.html'), htmlContent);
  
  // Fichier JSON pour la page d'index
  const indexJsonData = {
    pageProps: {},
    __N_SSG: true
  };
  fs.writeFileSync(path.join(SERVERLESS_DIR, 'pages/index/index.json'), JSON.stringify(indexJsonData, null, 2));
  
  // Faire la même chose pour les autres pages
  fs.mkdirSync(path.join(SERVERLESS_DIR, 'pages/_app'), { recursive: true });
  fs.mkdirSync(path.join(SERVERLESS_DIR, 'pages/_error'), { recursive: true });
  fs.mkdirSync(path.join(SERVERLESS_DIR, 'pages/_document'), { recursive: true });
  
  // Fichiers HTML minimalistes pour chaque page
  const minimalHtml = '<html><body>Page minimale</body></html>';
  fs.writeFileSync(path.join(SERVERLESS_DIR, 'pages/_app/index.html'), minimalHtml);
  fs.writeFileSync(path.join(SERVERLESS_DIR, 'pages/_error/index.html'), minimalHtml);
  fs.writeFileSync(path.join(SERVERLESS_DIR, 'pages/_document/index.html'), minimalHtml);
  
  // Fichiers JSON vides pour chaque page
  const emptyJsonData = { pageProps: {}, __N_SSG: true };
  fs.writeFileSync(path.join(SERVERLESS_DIR, 'pages/_app/index.json'), JSON.stringify(emptyJsonData, null, 2));
  fs.writeFileSync(path.join(SERVERLESS_DIR, 'pages/_error/index.json'), JSON.stringify(emptyJsonData, null, 2));
  fs.writeFileSync(path.join(SERVERLESS_DIR, 'pages/_document/index.json'), JSON.stringify(emptyJsonData, null, 2));

  // Créer un fichier pour indiquer que le build est terminé avec succès
  fs.writeFileSync(SUCCESS_FILE, 'Build terminé avec succès');
  
  // Créer le dossier static/chunks/pages pour les références
  fs.mkdirSync(path.join(STATIC_DIR, 'chunks/pages'), { recursive: true });
  
  // Créer un fichier JS vide pour la page d'index
  fs.writeFileSync(path.join(STATIC_DIR, 'chunks/pages/index.js'), '// Placeholder file');
  
  console.log('✅ Build statique terminé avec succès. Prêt pour le déploiement!');
  process.exit(0);
} catch (error) {
  console.error('❌ Erreur lors du build:', error);
  process.exit(1);
} 