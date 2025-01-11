const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  shareSurvey,
  getSharedSurveys,
  getPendingShares,
  respondToShare
} = require('../controllers/surveyShareController');

// Debug middleware spécifique aux routes survey-shares
router.use((req, res, next) => {
  console.log('=== Survey Shares Route Debug ===');
  console.log(`Accessing survey-shares route: ${req.method} ${req.originalUrl}`);
  console.log('Available routes:', ['/share', '/shared-with-me', '/pending', '/respond']);
  console.log('Request body:', req.body);
  next();
});

// Routes existantes
router.post('/share', authMiddleware, shareSurvey);
router.get('/shared-with-me', authMiddleware, getSharedSurveys);
router.get('/pending', authMiddleware, getPendingShares);
router.post('/respond', authMiddleware, respondToShare);

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
    availableRoutes: ['/share', '/shared-with-me', '/pending', '/respond']
  });
});

module.exports = router; 