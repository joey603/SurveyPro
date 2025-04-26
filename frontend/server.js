// Serveur Node.js minimal pour Vercel
const http = require('http');
const fs = require('fs');
const path = require('path');

// HTML minimal pour la page de maintenance
const maintenanceHTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SurveyPro - Mode Maintenance</title>
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
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>SurveyPro</h1>
    <div>
      <div class="loading"></div>
      <p>Notre application est en cours de maintenance. Merci de votre patience, nous serons de retour très bientôt.</p>
    </div>
  </div>
</body>
</html>
`;

// Créer un serveur HTTP simple
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(maintenanceHTML);
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur de maintenance démarré sur le port ${PORT}`);
}); 