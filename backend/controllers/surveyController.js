const Survey = require("../models/Survey");
const { uploadFileToCloudinary, deleteFileFromCloudinary } = require("../cloudinaryConfig");
const fs = require("fs");
const SurveyShare = require('../models/SurveyShare');
const SurveyAnswer = require('../models/SurveyAnswer');

exports.createSurvey = async (req, res) => {
  try {
    console.log('Received survey data:', JSON.stringify(req.body, null, 2));
    
    if (!req.body.title) {
      return res.status(400).json({ message: 'Survey title is required' });
    }

    if (!Array.isArray(req.body.questions)) {
      return res.status(400).json({ message: 'Questions must be an array' });
    }

    // Valider chaque question
    const processedQuestions = req.body.questions.map(question => {
      console.log('Processing question:', question); // Debug log
      
      if (!question.id || !question.type || !question.text) {
        throw new Error('Each question must have id, type, and text');
      }

      return {
        ...question,
        media: question.media || '' // S'assurer que media est une chaîne
      };
    });

    const survey = new Survey({
      title: req.body.title,
      description: req.body.description,
      demographicEnabled: req.body.demographicEnabled,
      isPrivate: req.body.isPrivate || false,
      questions: processedQuestions,
      userId: req.user.id,
      createdAt: new Date()
    });

    // Si le sondage est privé, générer et sauvegarder le lien
    if (req.body.isPrivate) {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      survey.privateLink = `${baseUrl}/survey-answer?surveyId=${survey._id}`;
    }

    const savedSurvey = await survey.save();
    console.log('Saved survey:', JSON.stringify(savedSurvey, null, 2));

    // Retourner le lien privé dans la réponse si le sondage est privé
    const response = {
      ...savedSurvey.toObject(),
      privateLink: savedSurvey.isPrivate ? savedSurvey.privateLink : undefined
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error in createSurvey:', error);
    res.status(500).json({
      message: 'Error creating survey',
      error: error.message
    });
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
    // Ne récupérer que les sondages de l'utilisateur actuel
    const surveys = await Survey.find({ userId: req.user.id });
    res.status(200).json(surveys);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a survey by ID
exports.getSurveyById = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id)
      .select('title description questions demographicEnabled createdAt isPrivate userId')
      .lean();

    if (!survey) {
      return res.status(404).json({ message: "Survey not found." });
    }

    // Vérifier si le sondage est privé
    if (survey.isPrivate) {
      // Si l'utilisateur n'est pas le propriétaire, vérifier si l'accès est via le lien privé
      if (survey.userId.toString() !== req.user.id) {
        // Vérifier si l'accès est via le lien privé
        const isPrivateLinkAccess = req.query.privateLink === 'true';
        if (!isPrivateLinkAccess) {
          return res.status(403).json({ message: "Access denied. This is a private survey." });
        }
      }
    }

    // Log pour déboguer
    console.log('Retrieved survey:', JSON.stringify(survey, null, 2));
    
    // Vérifier les médias
    survey.questions.forEach(question => {
      console.log('Question media:', question.media);
    });

    res.status(200).json(survey);
  } catch (error) {
    console.error("Error fetching survey:", error);
    res.status(500).json({ message: "Error fetching survey.", error: error.message });
  }
};

// Delete unused media by public ID
exports.deleteMedia = async (req, res) => {
  try {
    const { publicId } = req.body;
    console.log('Received delete request for public_id:', publicId);
    
    if (!publicId) {
      console.log('No public_id provided');
      return res.status(400).json({ message: "Public ID is required." });
    }

    // Nettoyer le public_id
    const cleanPublicId = publicId.replace(/^uploads\//, '');
    const fullPublicId = `uploads/${cleanPublicId}`;
    
    console.log('Attempting to delete with full public_id:', fullPublicId);

    const result = await deleteFileFromCloudinary(fullPublicId);
    console.log('Cloudinary deletion result:', result);

    if (result.result === 'ok') {
      res.status(200).json({ 
        message: "File deleted successfully.",
        result: result 
      });
    } else {
      res.status(400).json({ 
        message: "Failed to delete file",
        result: result 
      });
    }
  } catch (error) {
    console.error("Error deleting media:", error);
    res.status(500).json({ 
      message: "Failed to delete media.", 
      error: error.message,
      stack: error.stack
    });
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

// Get all surveys available for answering
exports.getAllSurveysForAnswering = async (req, res) => {
  console.log('=== Début getAllSurveysForAnswering ===');
  console.log('User dans la requête:', req.user);
  
  try {
    console.log('Début de la recherche des sondages');
    
    // Vérifier que req.user existe
    if (!req.user || !req.user.id) {
      console.error('Utilisateur non authentifié');
      return res.status(401).json({ 
        message: "Utilisateur non authentifié",
        error: "Authentication required"
      });
    }

    // Récupérer tous les sondages sans filtre sur isPrivate
    console.log('Recherche des sondages dans la base de données...');
    const surveys = await Survey.find()
      .select('_id title description questions demographicEnabled createdAt isPrivate userId')
      .sort({ createdAt: -1 })
      .lean(); // Utiliser lean() pour de meilleures performances
    
    console.log('Nombre de sondages trouvés:', surveys.length);
    
    if (!surveys || surveys.length === 0) {
      console.log('Aucun sondage trouvé');
      return res.status(404).json({ 
        message: "Aucun sondage disponible.",
        debug: {
          modelName: Survey.modelName,
          collectionName: Survey.collection.name
        }
      });
    }

    // Log des premiers sondages pour debug
    console.log('Exemple de sondages trouvés:', surveys.slice(0, 3).map(s => ({
      id: s._id,
      title: s.title,
      isPrivate: s.isPrivate
    })));

    console.log('Envoi des sondages au client');
    return res.status(200).json(surveys);
  } catch (error) {
    console.error("=== Erreur dans getAllSurveysForAnswering ===");
    console.error("Message d'erreur:", error.message);
    console.error("Stack trace:", error.stack);
    console.error("Nom du modèle:", Survey.modelName);
    console.error("Nom de la collection:", Survey.collection.name);
    
    return res.status(500).json({ 
      message: "Erreur lors de la récupération des sondages.",
      error: error.message,
      debug: {
        modelName: Survey.modelName,
        collectionName: Survey.collection.name,
        errorName: error.name,
        errorStack: error.stack
      }
    });
  }
};

exports.deleteSurvey = async (req, res) => {
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
};
