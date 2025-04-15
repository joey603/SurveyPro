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
const authMiddleware = require('./middleware/authMiddleware');

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

// Configuration CORS avant les routes
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Route de health check pour vérifier que le serveur est en ligne
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is up and running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
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

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connecté à MongoDB'))
  .catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Gestion des erreurs globale
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something broke!',
    error: err.message
  });
});

// Configuration du port pour Render
// Render définit automatiquement PORT, donc cette configuration fonctionnera
// à la fois en local et sur Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
});