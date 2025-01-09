const express = require('express');
const router = express.Router();
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

// Enlever authMiddleware de la route de partage
router.post('/', shareSurvey);
router.get('/shared-with-me', getSharedSurveys);
router.get('/pending', getPendingShares);
router.post('/respond', respondToShare);

module.exports = router; 