//routes/survey.js
const express = require("express");
const { createSurvey, getSurveys, getSurveyById, uploadMedia, getAllSurveysForAnswering, deleteMedia, deleteSurvey } = require("../controllers/surveyController");

const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer"); // For handling file uploads
const { uploadFileToCloudinary } = require("../cloudinaryConfig");
const { deleteFileFromCloudinary } = require("../cloudinaryConfig");

const Survey = require("../models/Survey");
const SurveyAnswer = require("../models/SurveyAnswer");
const SurveyShare = require("../models/SurveyShare");

const router = express.Router();

// Configure Multer pour gérer les fichiers uploadés
const storage = multer.diskStorage({});
const upload = multer({ dest: "uploads/" }); // Destination temporaire des fichiers

// IMPORTANT: Placer la route /available AVANT toutes les autres routes
router.get("/available", authMiddleware, getAllSurveysForAnswering);

// Autres routes
router.post("/", authMiddleware, upload.any(), createSurvey);
router.get("/", authMiddleware, getSurveys);
router.get("/:id", authMiddleware, getSurveyById);

router.post("/delete-media", authMiddleware, async (req, res) => {
  try {
    const { publicId } = req.body;
    console.log('Received delete request for:', publicId);

    if (!publicId) {
      return res.status(400).json({ message: "Public ID is required" });
    }

    const result = await deleteFileFromCloudinary(publicId);
    console.log('Cloudinary deletion result:', result);

    if (result.result === 'ok') {
      res.status(200).json({
        success: true,
        message: "File deleted successfully",
        result
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Failed to delete file",
        result
      });
    }
  } catch (error) {
    console.error('Error in delete-media route:', error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting media",
      error: error.message
    });
  }
});


// Route pour tester le téléchargement de fichiers vers Cloudinary
router.post("/test-cloudinary", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    // Télécharge le fichier sur Cloudinary
    const result = await uploadFileToCloudinary(req.file.path);
    res.status(200).json({
      message: "File uploaded successfully to Cloudinary!",
      cloudinaryResult: result,
    });
  } catch (error) {
    console.error("Cloudinary test error:", error.message);
    res.status(500).json({
      message: "Cloudinary test failed. Please check your configuration.",
      error: error.message,
    });
  }
});


//Route pour uploader un média
router.post("/upload-media", upload.single("file"), async (req, res) => {
    try {
      // Log le fichier reçu
      console.log("File received from client:", req.file);
  
      if (!req.file) {
        console.error("No file provided by the client.");
        return res.status(400).json({ message: "No file provided" });
      }
  
      // Upload le fichier vers Cloudinary
      const result = await uploadFileToCloudinary(req.file.path);
      console.log("Cloudinary upload result:", result);
  
      // Vérifie que Cloudinary retourne un URL
      if (!result.secure_url) {
        console.error("Cloudinary did not return a secure_url.");
        return res.status(500).json({ message: "Failed to upload to Cloudinary" });
      }
  
      // Retourne l'URL au frontend
      res.status(200).json({
        message: "File uploaded successfully!",
        url: result.secure_url,
      });
    } catch (error) {
      console.error("Error during media upload:", error.message);
      res.status(500).json({
        message: "Media upload failed.",
        error: error.message,
      });
    }
  });

  router.post("/cleanup-test", async (req, res) => {
    try {
      const { publicIds } = req.body; // Passe les `public_id` à supprimer dans la requête
      if (!publicIds || !Array.isArray(publicIds)) {
        return res.status(400).json({ message: "Invalid publicIds array" });
      }
  
      for (const publicId of publicIds) {
        await deleteFileFromCloudinary(publicId);
      }
  
      res.status(200).json({ message: "Cleanup test successful" });
    } catch (error) {
      console.error("Cleanup test error:", error.message);
      res.status(500).json({ message: "Cleanup test failed", error: error.message });
    }
  });

  router.delete("/:surveyId", authMiddleware, async (req, res) => {
    try {
      const { surveyId } = req.params;
      const userId = req.user.id;

      // Vérifier si l'utilisateur est le propriétaire
      const survey = await Survey.findOne({ _id: surveyId, userId });
      if (!survey) {
        return res.status(404).json({ message: "Survey not found or unauthorized" });
      }

      // Supprimer les réponses associées
      await SurveyAnswer.deleteMany({ surveyId });
      
      // Supprimer les partages associés
      await SurveyShare.deleteMany({ surveyId });
      
      // Supprimer le sondage
      await Survey.deleteOne({ _id: surveyId });

      res.status(200).json({ message: "Survey and related data deleted successfully" });
    } catch (error) {
      console.error("Error deleting survey:", error);
      res.status(500).json({ message: "Error deleting survey", error: error.message });
    }
  });

// Route pour accéder aux sondages privés sans authentification
router.get("/private/:id", async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    if (!survey.isPrivate) {
      return res.status(400).json({ message: 'This is not a private survey' });
    }

    // Vérifier le lien privé
    const privateLink = `${process.env.FRONTEND_URL}/survey-answer?surveyId=${survey._id}`;
    if (req.query.privateLink === privateLink) {
      return res.json(survey);
    }

    return res.status(403).json({ message: 'Invalid private link' });
  } catch (error) {
    console.error('Error accessing private survey:', error);
    res.status(500).json({ message: 'Error accessing survey' });
  }
});

module.exports = router;
