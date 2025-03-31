const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  shareSurvey,
  getSharedSurveys,
  getPendingShares,
  respondToShare
} = require('../controllers/surveyShareController');
const SurveyShare = require('../models/SurveyShare');
const DynamicSurvey = require('../models/DynamicSurvey');

// Debug middleware pour mieux comprendre le problème
router.use((req, res, next) => {
  console.log('=== Survey Shares Route Debug ===');
  console.log(`Accès à la route survey-shares: ${req.method} ${req.originalUrl}`);
  console.log('Routes disponibles:', ['/share', '/shared-with-me', '/pending', '/respond', '/debug']);
  console.log('Corps de la requête:', req.body);
  console.log('User:', req.user?.id);
  next();
});

// Routes existantes
router.post('/share', authMiddleware, shareSurvey);
router.get('/shared-with-me', authMiddleware, getSharedSurveys);
router.get('/pending', authMiddleware, getPendingShares);
router.post('/respond', authMiddleware, respondToShare);

// Ajouter une route de diagnostique
router.get('/debug', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('=== DIAGNOSTIC DES PARTAGES ===');
    
    // 1. Vérifier tous les partages
    const allShares = await SurveyShare.find({});
    console.log(`Nombre total de partages: ${allShares.length}`);
    
    // 2. Vérifier les partages en attente pour l'utilisateur
    const pendingForUser = await SurveyShare.find({
      sharedWith: userId,
      status: 'pending'
    });
    console.log(`Partages en attente pour l'utilisateur: ${pendingForUser.length}`);
    
    // 3. Vérifier les partages dynamiques
    const dynamicShares = allShares.filter(share => share.surveyModel === 'DynamicSurvey');
    console.log(`Partages de sondages dynamiques: ${dynamicShares.length}`);
    
    // 4. Vérifier pour chaque partage dynamique si le sondage existe
    const dynamicSharesValidation = await Promise.all(
      dynamicShares.map(async share => {
        const survey = await DynamicSurvey.findById(share.surveyId);
        return {
          shareId: share._id,
          surveyId: share.surveyId,
          exists: !!survey,
          title: survey ? survey.title : 'N/A',
          sharedWith: share.sharedWith,
          status: share.status
        };
      })
    );
    
    // 5. Vérifier les partages dynamiques pour l'utilisateur
    const userDynamicShares = dynamicSharesValidation.filter(
      share => share.sharedWith.toString() === userId && share.status === 'pending'
    );
    
    console.log(`Partages dynamiques en attente pour l'utilisateur: ${userDynamicShares.length}`);
    console.log('Détails:', userDynamicShares);
    
    // Répondre avec les données de diagnostic
    res.status(200).json({
      totalShares: allShares.length,
      pendingForUser: pendingForUser.length,
      dynamicShares: dynamicShares.length,
      dynamicSharesValidation,
      userDynamicShares
    });
  } catch (error) {
    console.error('Erreur lors du diagnostic:', error);
    res.status(500).json({
      message: 'Erreur lors du diagnostic',
      error: error.message
    });
  }
});

// Catch-all route pour déboguer les routes non trouvées dans ce routeur
router.use('*', (req, res) => {
  console.log('Route non trouvée dans survey-shares:', {
    method: req.method,
    url: req.originalUrl,
    body: req.body
  });
  res.status(404).json({
    message: 'Route not found in survey-shares',
    requestedUrl: req.originalUrl,
    availableRoutes: ['/share', '/shared-with-me', '/pending', '/respond', '/debug']
  });
});

module.exports = router; 