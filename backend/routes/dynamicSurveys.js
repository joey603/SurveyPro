const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createDynamicSurvey,
  getDynamicSurveys,
  getDynamicSurveyById,
  updateDynamicSurvey,
  deleteDynamicSurvey
} = require("../controllers/dynamicSurveyController");

// Routes pour les sondages dynamiques
router.post("/", authMiddleware, createDynamicSurvey);
router.get("/", authMiddleware, getDynamicSurveys);
router.get("/:id", authMiddleware, getDynamicSurveyById);
router.put("/:id", authMiddleware, updateDynamicSurvey);
router.delete("/:id", authMiddleware, deleteDynamicSurvey);

module.exports = router; 