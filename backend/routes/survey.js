// routes/survey.js
const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController');
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../cloudinaryConfig'); // Import Cloudinary upload configuration

// Route to create a new survey with media upload
router.post('/create', authMiddleware, upload.array('media'), surveyController.createSurvey);

module.exports = router;
