require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const authRoutes = require("./routes/auth");
const surveyRoutes = require("./routes/surveys");
const surveyAnswerRoutes = require("./routes/surveyAnswers");
const surveyShareRoutes = require("./routes/surveyShares");
const dynamicSurveyRoutes = require("./routes/dynamicSurveys");
const dynamicSurveyAnswerRoutes = require("./routes/dynamicSurveyAnswers");
const { shareSurvey } = require('./controllers/surveyShareController');
const authMiddleware = require('./middleware/auth');

const app = express();

// Configuration de la session (nécessaire pour Passport)
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // mettre à true en production avec HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  }
}));

// Initialisation de Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware de base
app.use(morgan("combined"));
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

// Configuration CORS améliorée avant les routes
const allowedOrigins = [
  ...process.env.FRONTEND_URL?.split(',') || [],
  'http://localhost:3000', 
  'http://localhost:3001', 
  'http://localhost:3002',
  'https://surveypro-frontend.vercel.app',
  'https://surveypro-frontend-git-main-joey603.vercel.app',
  'https://surveypro-frontend.vercel.app/',
  'https://surveypro-frontend-git-main-joey603.vercel.app/',
  'https://surveyflow.vercel.app',
  'https://surveyflow-git-main-joey603.vercel.app',
  'https://surveyflow.vercel.app/',
  'https://surveyflow-git-main-joey603.vercel.app/',
  'https://surveyflow-ixdz8kwne-joeys-projects-2b62a68a.vercel.app',
  'https://www.surveyflow.co',
  'https://surveyflow.co',
  'https://surveypro-ir3u.onrender.com'
];

// Middleware CORS configuré pour gérer correctement les requêtes preflight
const isOriginAllowed = (origin) => {
  if (allowedOrigins.indexOf(origin) !== -1) return true;
  // Autoriser les domaines de prévisualisation Vercel et le développement local
  if (origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.endsWith('.vercel.app')) {
    return true;
  }
  return false;
};

const corsOptions = {
  origin: function(origin, callback) {
    // Permettre les requêtes sans origine (ex: applications mobiles, curl, health checks)
    if (!origin) return callback(null, true);

    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn('Origine refusée par CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 heures en secondes
};

app.use(cors(corsOptions));

// Gérer les requêtes preflight OPTIONS avec la même configuration CORS
app.options('*', cors(corsOptions));

// Route racine pour les health checks de Render
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'SurveyPro API',
    message: 'Welcome to SurveyPro API'
  });
});

// Route de health check pour vérifier que le serveur est en ligne
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is up and running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      allowedOrigins: allowedOrigins
    }
  });
});

// Configuration de SendGrid
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Routes
app.use('/api/auth', authRoutes);
app.use("/api/surveys", surveyRoutes);
app.use("/api/survey-answers", surveyAnswerRoutes);
app.use("/api/survey-shares", surveyShareRoutes);
app.use("/api/dynamic-surveys", dynamicSurveyRoutes);
app.use("/api/dynamic-survey-answers", dynamicSurveyAnswerRoutes);

// Ajouter une route directe pour le partage de sondage
app.post('/api/share-survey', authMiddleware, shareSurvey);

// Gestion des erreurs globale
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something broke!',
    error: err.message
  });
});

const PORT = process.env.PORT || 10000;
const isMain = require.main === module;

function startHttpServer() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Ne pas accepter de requêtes HTTP tant que MongoDB n'est pas prêt (évite le buffering Mongoose)
mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => {
    console.log('Connecté à MongoDB');
    if (isMain) startHttpServer();
  })
  .catch((err) => {
    console.error('Erreur de connexion à MongoDB:', err);
    if (isMain) process.exit(1);
  });

module.exports = app;