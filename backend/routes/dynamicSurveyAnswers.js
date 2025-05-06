const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  submitDynamicSurveyAnswer,
  getDynamicSurveyAnswers,
  getUserDynamicSurveyResponses,
  getDynamicSurveyResponseById
} = require("../controllers/dynamicSurveyAnswerController");

// Routes pour les réponses aux sondages dynamiques
router.post("/submit", authMiddleware, submitDynamicSurveyAnswer);
router.get("/survey/:surveyId", authMiddleware, getDynamicSurveyAnswers);
router.get("/user", authMiddleware, getUserDynamicSurveyResponses);
router.get("/response/:responseId", authMiddleware, getDynamicSurveyResponseById);

module.exports = router; 