# SurveyPro

SurveyPro is a modern web application for creating, managing, and analyzing online surveys.


## 🚀 Features

- Custom survey creation
- Multiple question types (multiple choice, free text, scale, etc.)
- Easy survey sharing via unique links
- Real-time response collection and analysis
- Result visualization with charts
- Intuitive and responsive user interface
## 🛠️ Tech Stack

### Frontend
- React.js
- Next.js
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- Express.js
- MongoDB

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## 🔧 Installation

1. Clone the repository

```bash
git clone https://github.com/joey603/SurveyPro.git
cd SurveyPro
```
2. Install Frontend dependencies

```bash
cd frontend
npm install
```

3. Install Backend dependencies

```bash
cd frontend
npm install
```




## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

In the backend folder, create a .env local file

```bash
// Database MongoDB
MONGO_URI=your_mongo_uri_here

// Token/Jeton
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

// Send mail to register
SENDGRID_API_KEY=your_sendgrid_api_key_here
EMAIL_FROM=your_email_here

// Database media (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name_here
CLOUDINARY_API_KEY=your_cloudinary_api_key_here
CLOUDINARY_API_SECRET=your_cloudinary_api_secret_here

PORT=your_port_here

``` 
## 🚀 Getting Started

1. Start the Backend server

```bash
cd backend
npm start
```

2. Start the Frontend server

```bash
cd frontend
npm run dev
```

The application will be available at: `http://localhost:3000`


```bash

```
## Support

For support, email yoelibarthel603@gmail.com.

## Guide de déploiement

### Déploiement du Backend (Render)

1. Créez un compte sur [Render](https://render.com/) si ce n'est pas déjà fait
2. Depuis le tableau de bord, cliquez sur "New" et sélectionnez "Web Service"
3. Connectez votre dépôt GitHub ou GitLab
4. Configurez votre service :
   - **Nom** : surveypro-backend
   - **Environnement** : Node
   - **Branch** : main (ou votre branche de production)
   - **Root Directory** : backend
   - **Build Command** : npm install
   - **Start Command** : node server.js
   - **Plan** : Free

5. Dans la section "Advanced", ajoutez les variables d'environnement suivantes :
   - `NODE_ENV` : production
   - `PORT` : 5041 (ou le port de votre choix)
   - `MONGO_URI` : votre chaîne de connexion MongoDB
   - `JWT_SECRET` : votre clé secrète JWT
   - `JWT_REFRESH_SECRET` : votre clé secrète de refresh token
   - `FRONTEND_URL` : https://surveyflow.vercel.app,http://localhost:3000
   - `API_URL` : l'URL de votre backend (à remplir après déploiement)
   - `SENDGRID_API_KEY` : votre clé API SendGrid
   - `EMAIL_FROM` : votre email d'envoi
   - Ajoutez toutes les autres variables d'environnement nécessaires de votre fichier .env

6. Cliquez sur "Create Web Service"

### Déploiement du Frontend (Vercel)

1. Créez un compte sur [Vercel](https://vercel.com/) si ce n'est pas déjà fait
2. Depuis le tableau de bord, cliquez sur "Add New..." et sélectionnez "Project"
3. Importez votre dépôt GitHub
4. Configurez votre projet :
   - **Framework Preset** : Next.js
   - **Root Directory** : frontend
   - **Build Command** : chmod +x build-vercel.sh && ./build-vercel.sh
   - **Output Directory** : .next

5. Dans l'onglet "Environment Variables", ajoutez :
   - `NEXT_PUBLIC_API_URL` : l'URL de votre backend Render (ex: https://surveypro-ir3u.onrender.com)
   - `NEXT_TELEMETRY_DISABLED` : 1
   - `SKIP_TYPE_CHECK` : true
   - `NODE_ENV` : production

6. Cliquez sur "Deploy"

### Après le déploiement

1. Une fois le frontend déployé, copiez l'URL générée par Vercel
2. Retournez dans les paramètres de votre backend sur Render
3. Mettez à jour la variable `FRONTEND_URL` pour inclure cette URL
4. Vérifiez que votre application fonctionne en testant les fonctionnalités (création de compte, connexion, création de sondage, etc.)

### Dépannage

Si vous rencontrez des problèmes de CORS :
1. Vérifiez les origines autorisées dans `server.js`
2. Assurez-vous que la variable d'environnement `FRONTEND_URL` est correctement configurée
3. Consultez les logs du backend et du frontend pour identifier les erreurs

Si le frontend ne se connecte pas au backend :
1. Vérifiez que `NEXT_PUBLIC_API_URL` pointe vers la bonne URL du backend
2. Assurez-vous que les rewrites dans `next.config.js` et `vercel.json` sont correctement configurés
