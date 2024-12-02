const express = require("express");
const { createSurvey, getSurveys, getSurveyById } = require("../controllers/surveyController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Create a new survey
router.post("/", authMiddleware, createSurvey);

// Get all surveys created by the user
router.get("/", authMiddleware, getSurveys);

// Get survey details by ID
router.get("/:id", authMiddleware, getSurveyById);

module.exports = router;
