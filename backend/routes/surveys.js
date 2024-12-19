//routes/survey.js
const express = require("express");
const { createSurvey, getSurveys, getSurveyById, uploadMedia, } = require("../controllers/surveyController");

const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer"); // For handling file uploads
const { uploadFileToCloudinary } = require("../cloudinaryConfig");
const { deleteFileFromCloudinary } = require("../cloudinaryConfig");

const router = express.Router();

// Configure Multer pour gérer les fichiers uploadés
const storage = multer.diskStorage({});
const upload = multer({ dest: "uploads/" }); // Destination temporaire des fichiers

// Route pour créer un nouveau sondage avec média
router.post("/", authMiddleware, upload.any(), createSurvey);

// Route pour récupérer tous les sondages créés par l'utilisateur
router.get("/", authMiddleware, getSurveys);

// Route pour récupérer un sondage par ID
router.get("/:id", authMiddleware, getSurveyById);

const { deleteMedia } = require("../controllers/surveyController");

router.post("/delete-media", authMiddleware, deleteMedia);


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
    
module.exports = router;
