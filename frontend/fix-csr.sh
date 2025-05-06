#!/bin/bash

# Ce script prépare une version de production simplifiée sans les erreurs de CSR bailout
# et crée un serveur HTTP simple pour servir les fichiers statiques

echo "🔧 Préparation du build de production sans erreurs de CSR bailout"

# 1. Créer un dossier de production
mkdir -p production-build

# 2. Copier les fichiers sources
cp -r src production-build/
cp package.json package-lock.json next.config.js production-build/

# 3. Ajouter un script de démarrage simple avec serveur HTTP
cat > production-build/server.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  let pathname = url.parse(req.url).pathname;
  
  // Handle root requests with index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  const filePath = path.join(PUBLIC_DIR, pathname);
  const extname = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // If file not found, try serving index.html for client-side routing
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, content) => {
          if (err) {
            res.writeHead(404);
            res.end('404 Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
      return;
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content, 'utf-8');
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Serving files from ${PUBLIC_DIR}`);
});
EOF

# 4. Créer un script de déploiement simplifié
cat > production-build/deploy.sh << 'EOF'
#!/bin/bash

# Build the app
echo "📦 Building the app..."
npm run build

# Copy the static files to public
echo "📋 Copying files to public directory..."
mkdir -p public
cp -r out/* public/

# Start the server
echo "🚀 Starting server..."
node server.js
EOF

# 5. Ajouter des permissions d'exécution
chmod +x production-build/deploy.sh

# 6. Créer un package.json simplifié pour la production
cat > production-build/package.json << 'EOF'
{
  "name": "surveypro",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "node server.js"
  },
  "dependencies": {
    "next": "15.0.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
EOF

# 7. Créer un README explicatif
cat > production-build/README.md << 'EOF'
# SurveyPro - Version de Production

Cette version simplifiée est conçue pour être déployée sur des hébergeurs qui ne supportent pas nativement Next.js.

## Déploiement

1. Transférez tous les fichiers sur votre serveur
2. Installez les dépendances : `npm install`
3. Lancez le script de déploiement : `./deploy.sh`

Le serveur démarrera sur le port 3000 par défaut. Vous pouvez modifier ce port en définissant la variable d'environnement PORT.

## Pour Vercel

Si vous utilisez Vercel, vous pouvez simplement déployer le projet original sans utiliser cette version simplifiée.
EOF

echo "✅ La version de production a été créée dans le dossier 'production-build'"
echo "📋 Instructions :"
echo "1. Copiez le dossier 'production-build' sur votre serveur"
echo "2. Exécutez 'npm install' dans ce dossier"
echo "3. Exécutez './deploy.sh' pour construire et démarrer l'application" 