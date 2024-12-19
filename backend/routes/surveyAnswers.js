const express = require("express");
const { 
  submitSurveyAnswer, 
  getSurveyAnswers,
  getUserSurveyResponses,
  getUserSurveyResponseById
} = require("../controllers/surveyAnswerController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Soumettre une réponse à un sondage
router.post("/submit", authMiddleware, submitSurveyAnswer);

// Obtenir toutes les réponses pour un sondage spécifique
router.get("/:surveyId", authMiddleware, getSurveyAnswers);

// Nouvelles routes pour l'historique
router.get("/responses/user", authMiddleware, getUserSurveyResponses);
router.get("/responses/:responseId", authMiddleware, getUserSurveyResponseById);

module.exports = router;
