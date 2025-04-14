const express = require("express");
const { 
  submitSurveyAnswer, 
  getSurveyAnswers,
  getUserSurveyResponses,
  getUserSurveyResponseById,
  getLastDemographicData
} = require("../controllers/surveyAnswerController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Soumettre une réponse à un sondage
router.post("/submit", authMiddleware, submitSurveyAnswer);

// Nouvelles routes pour l'historique
router.get("/responses/user", authMiddleware, getUserSurveyResponses);
router.get("/responses/:responseId", authMiddleware, getUserSurveyResponseById);

// Nouvelle route pour récupérer les dernières données démographiques
// IMPORTANT: Placer cette route AVANT la route générique avec :surveyId
router.get("/last-demographic", authMiddleware, getLastDemographicData);

// Obtenir toutes les réponses pour un sondage spécifique
router.get("/:surveyId", authMiddleware, getSurveyAnswers);

module.exports = router;
