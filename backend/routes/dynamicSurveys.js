const express = require("express");
const router = express.Router();
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createDynamicSurvey,
  getDynamicSurveys,
  getDynamicSurveyById,
  updateDynamicSurvey,
  deleteDynamicSurvey,
  uploadMedia,
  deleteMedia,
  getAllDynamicSurveysForAnswering
} = require("../controllers/dynamicSurveyController");

// Configure Multer
const storage = multer.diskStorage({});
const upload = multer({ dest: "uploads/" });

// IMPORTANT: Placer la route /available AVANT toutes les autres routes
router.get("/available", authMiddleware, getAllDynamicSurveysForAnswering);

// Routes pour les sondages dynamiques
router.post("/", authMiddleware, createDynamicSurvey);
router.get("/", authMiddleware, getDynamicSurveys);
router.get("/:id", authMiddleware, getDynamicSurveyById);
router.put("/:id", authMiddleware, updateDynamicSurvey);
router.delete("/:id", authMiddleware, deleteDynamicSurvey);

// Nouvelles routes pour la gestion des médias
router.post("/upload-media", authMiddleware, upload.single("file"), uploadMedia);
router.post("/delete-media", authMiddleware, deleteMedia);

module.exports = router; 