const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  shareSurvey,
  getSharedSurveys,
  getPendingShares,
  respondToShare
} = require('../controllers/surveyShareController');

// Ajouter des logs pour le débogage
router.use((req, res, next) => {
  console.log('[Survey Shares Route]', {
    method: req.method,
    path: req.path,
    body: req.body
  });
  next();
});

// Ajouter authMiddleware à toutes les routes qui en ont besoin
router.post('/', shareSurvey);
router.get('/shared-with-me', authMiddleware, getSharedSurveys);
router.get('/pending', authMiddleware, getPendingShares);
router.post('/respond', authMiddleware, respondToShare);

module.exports = router; 