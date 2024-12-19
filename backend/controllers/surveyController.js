const Survey = require("../models/Survey");
const { uploadFileToCloudinary, deleteFileFromCloudinary } = require("../cloudinaryConfig");
const fs = require("fs");

exports.createSurvey = async (req, res) => {
  try {
    const { title, questions, demographicEnabled, demographicData } = req.body;

    // Vérification des entrées
    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ message: "Title and questions are required." });
    }

    const processedQuestions = [];
    const newMediaIds = []; // Liste des médias à conserver

    // Traitement des questions et des médias associés
    for (const question of questions) {
      // Validation des IDs de question
      if (!question.id || !question.id.match(/^[a-zA-Z0-9-_]+$/)) {
        return res.status(400).json({ message: `Invalid question ID: ${question.id}` });
      }

      // Validation du type de question
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
        return res.status(400).json({ message: `Invalid question type: ${question.type}` });
      }

      // Validation du texte de la question
      if (!question.text) {
        return res.status(400).json({ message: "Question text is required." });
      }

      // Traitement du média (si présent)
      if (question.media?.startsWith("http")) {
        // Média externe
        question.media = {
          url: question.media,
          type: question.media.match(/\.(mp4|mov)$/i) ? "video" : "image",
        };
      } else if (req.files?.[question.id]) {
        // Média uploadé
        const file = req.files[question.id].tempFilePath;
        const uploadResult = await uploadFileToCloudinary(file);
        question.media = {
          url: uploadResult.secure_url,
          type: uploadResult.resource_type,
          public_id: uploadResult.public_id,
        };
        newMediaIds.push(uploadResult.public_id); // Ajouter l'ID public aux médias à conserver
        fs.unlinkSync(file); // Supprimer le fichier temporaire
      }

      processedQuestions.push(question);
    }

    // Nettoyage des médias inutilisés (pour les mises à jour)
    if (req.body.id) {
      const previousSurvey = await Survey.findById(req.body.id);
      if (previousSurvey) {
        const oldMediaIds = previousSurvey.questions
          .map((q) => q.media?.public_id)
          .filter(Boolean);
        const unusedMediaIds = oldMediaIds.filter((id) => !newMediaIds.includes(id));

        console.log("Unused media to delete:", unusedMediaIds);

        // Suppression des médias inutilisés sur Cloudinary
        for (const id of unusedMediaIds) {
          await deleteFileFromCloudinary(id);
        }
      }
    }

    // Création ou mise à jour du sondage
    const survey = new Survey({
      title,
      questions: processedQuestions,
      demographicEnabled,
      demographicData,
      createdBy: req.user?.id,
    });

    await survey.save();
    res.status(201).json({ message: "Survey created successfully!", survey });
  } catch (error) {
    console.error("Error creating survey:", error.message);
    res.status(500).json({ message: "Error creating survey.", error: error.message });
  }
};


// Upload media file
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const uploadResult = await uploadFileToCloudinary(req.file.path, "uploads");
    fs.unlinkSync(req.file.path); // Remove temp file

    res.status(200).json({
      message: "File uploaded successfully!",
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    });
  } catch (error) {
    console.error("Error uploading media:", error.message);
    res.status(500).json({ message: "Media upload failed.", error: error.message });
  }
};

// Get all surveys created by the user
exports.getSurveys = async (req, res) => {
  try {
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

// Delete unused media by public ID
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

// Clean up unused media (optional endpoint for periodic cleanup)
exports.cleanupUnusedMedia = async (req, res) => {
  try {
    const surveys = await Survey.find();
    const usedPublicIds = surveys.flatMap(s => s.questions.map(q => q.media?.public_id).filter(Boolean));

    const allMedia = await cloudinary.api.resources({ type: "upload", prefix: "uploads/" });
    const unusedMedia = allMedia.resources.filter(media => !usedPublicIds.includes(media.public_id));

    for (const media of unusedMedia) {
      await deleteFileFromCloudinary(media.public_id);
    }

    res.status(200).json({ message: "Unused media cleaned up successfully." });
  } catch (error) {
    console.error("Error cleaning up unused media:", error.message);
    res.status(500).json({ message: "Failed to clean up unused media.", error: error.message });
  }
};
