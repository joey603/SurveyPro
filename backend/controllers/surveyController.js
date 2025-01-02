const Survey = require("../models/Survey");
const { uploadFileToCloudinary, deleteFileFromCloudinary } = require("../cloudinaryConfig");
const fs = require("fs");

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
      questions: processedQuestions,
      userId: req.user.id,
      createdAt: new Date()
    });

    const savedSurvey = await survey.save();
    console.log('Saved survey:', JSON.stringify(savedSurvey, null, 2));

    res.status(201).json(savedSurvey);
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
    console.log('Fetching surveys for user:', req.user.id);
    
    // Modifier la requête pour chercher par userId au lieu de createdBy
    const surveys = await Survey.find({ userId: req.user.id })
      .select('title description questions demographicEnabled createdAt')
      .lean();

    console.log('Found surveys:', surveys.length);

    // Ne pas retourner 404 si aucun sondage n'est trouvé
    if (!surveys.length) {
      return res.status(200).json([]); // Retourner un tableau vide au lieu d'une erreur
    }

    res.status(200).json(surveys);
  } catch (error) {
    console.error("Error fetching surveys:", error);
    res.status(500).json({ 
      message: "Erreur lors de la récupération des sondages", 
      error: error.message 
    });
  }
};

// Get a survey by ID
exports.getSurveyById = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id)
      .select('title description questions demographicEnabled createdAt')
      .lean();

    if (!survey) {
      return res.status(404).json({ message: "Survey not found." });
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

// Get all surveys available for answering
exports.getAllSurveysForAnswering = async (req, res) => {
  console.log('getAllSurveysForAnswering appelé');
  console.log('User dans la requête:', req.user);
  
  try {
    console.log('Début de la recherche des sondages');
    
    // Ajout de plus de logs pour le debugging
    const query = Survey.find({})
      .select('_id title description questions demographicEnabled createdAt')
      .sort({ createdAt: -1 });
    
    console.log('Query MongoDB:', query.getFilter());
    
    const surveys = await query;
    console.log('Résultat brut de MongoDB:', surveys);
    console.log('Nombre de sondages trouvés:', surveys ? surveys.length : 0);
    
    if (!surveys || !surveys.length) {
      console.log('Aucun sondage trouvé');
      return res.status(404).json({ 
        message: "Aucun sondage disponible.",
        debug: {
          query: query.getFilter(),
          modelName: Survey.modelName,
          collectionName: Survey.collection.name
        }
      });
    }

    console.log('Envoi des sondages au client');
    res.status(200).json(surveys);
  } catch (error) {
    console.error("Erreur détaillée:", error);
    console.error("Stack trace:", error.stack);
    console.error("Nom du modèle:", Survey.modelName);
    console.error("Nom de la collection:", Survey.collection.name);
    
    res.status(500).json({ 
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
