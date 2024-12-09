//controllers/surveyControllers.js
const Survey = require("../models/Survey");
const { uploadFileToCloudinary } = require("../cloudinaryConfig");

// Create a new survey
exports.createSurvey = async (req, res) => {
  try {
    console.log("Incoming request body:", req.body);

    const { title, questions, demographicEnabled, demographicData } = req.body;

    // Validate the request body
    if (!title || !questions || questions.length === 0) {
      console.error("Validation failed: Title or questions are missing.");
      return res.status(400).json({ message: "Title and questions are required." });
    }

    const processedQuestions = [];
    for (const question of questions) {
      console.log("Validating question:", question);

      // Validate question ID
      if (!question.id.match(/^[a-zA-Z0-9-_]+$/)) {
        console.error(`Invalid question ID: ${question.id}`);
        return res.status(400).json({
          message: `Invalid question ID: ${question.id}. Must match /^[a-zA-Z0-9-_]+$/.`,
        });
      }

      // Validate question type
      if (
        ![
          "multiple-choice",
          "text",
          "dropdown",
          "slider",
          "rating",
          "yes-no",
          "date",
          "file-upload",
          "color-picker",
        ].includes(question.type)
      ) {
        console.error(`Invalid question type: ${question.type}`);
        return res.status(400).json({
          message: `Invalid question type: ${question.type}. Allowed types: multiple-choice, text, dropdown, slider, rating, yes-no, date, file-upload, color-picker.`,
        });
      }

      // Validate question text
      if (!question.text) {
        console.error(`Missing text in question: ${JSON.stringify(question)}`);
        return res.status(400).json({
          message: `Question text is required. Invalid question: ${JSON.stringify(question)}`,
        });
      }

      if (question.media.startsWith("http")) {
        console.log(`Using external URL for media: ${question.media}`);
        question.media = {
          url: question.media,
          type: question.media.match(/\.(mp4|mov)$/i) ? "video" : "image",
        };
      } else if (question.media.startsWith("data:") || req.files?.[question.id]) {
        // Traitement des fichiers uploadés
        const file = req.files?.[question.id]?.tempFilePath || question.media;
        const uploadResult = await uploadFileToCloudinary(file);
        question.media = {
          url: uploadResult.secure_url,
          type: uploadResult.resource_type,
        };
      } else {
        console.error("Invalid media format or no media provided.");
      }

      processedQuestions.push(question);
    }

        console.log("Processed questions:", processedQuestions);
    const survey = new Survey({
      title,
      questions: processedQuestions,
      demographicEnabled,
      demographicData,
      createdBy: req.user?.id,
    });
    console.log("Survey to save:", survey);
    await survey.save();

    console.log("Survey saved successfully:", survey);

    res.status(201).json({ message: "Survey created successfully!", survey });
  } catch (error) {
    console.error("Error creating survey:", error.message);
    res.status(500).json({ message: "Error creating survey.", error: error.message });
  }
};

// Upload media file to Cloudinary
const fs = require("fs"); // Nécessaire pour supprimer les fichiers temporaires

exports.uploadMedia = async (req, res) => {
  try {
    const file = req.file; // Assurez-vous qu'un fichier est attaché
    if (!file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    // Téléchargez le fichier sur Cloudinary
    const result = await uploadFileToCloudinary(file.path, "uploads");

    // Supprimez le fichier temporaire après son upload
    fs.unlink(file.path, (err) => {
      if (err) {
        console.error("Error deleting temp file:", err);
      }
    });

    // Répondez avec l'URL du fichier
    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    console.error("Error uploading media:", error.message);
    res.status(500).json({ message: "Media upload failed.", error: error.message });
  }
};

// Get all surveys created by the user
exports.getSurveys = async (req, res) => {
  try {
    console.log("Fetching surveys for user:", req.user.id);

    const surveys = await Survey.find({ createdBy: req.user.id });

    if (!surveys.length) {
      return res.status(404).json({ message: "No surveys found." });
    }

    res.status(200).json(surveys);
  } catch (error) {
    console.error("Error fetching surveys:", error.message);
    res.status(500).json({ message: "Error fetching surveys.", error: error.message });
  }
};

// Get a survey by ID
exports.getSurveyById = async (req, res) => {
  try {
    console.log("Fetching survey with ID:", req.params.id);

    const survey = await Survey.findById(req.params.id);

    if (!survey) {
      return res.status(404).json({ message: "Survey not found." });
    }

    res.status(200).json(survey);
  } catch (error) {
    console.error("Error fetching survey details:", error.message);
    res.status(500).json({ message: "Error fetching survey details.", error: error.message });
  }
};


const { deleteFileFromCloudinary } = require("../cloudinaryConfig");

// Fonction pour supprimer un fichier de Cloudinary
exports.deleteMedia = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ message: "Public ID is required." });
    }

    await deleteFileFromCloudinary(publicId);
    res.status(200).json({ message: "File deleted successfully." });
  } catch (error) {
    console.error("Error deleting media:", error.message);
    res.status(500).json({ message: "Failed to delete media.", error: error.message });
  }
};