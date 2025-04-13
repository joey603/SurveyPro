const DynamicSurvey = require("../models/DynamicSurvey");
const { uploadFileToCloudinary, deleteFileFromCloudinary } = require("../cloudinaryConfig");
const fs = require('fs');

exports.createDynamicSurvey = async (req, res) => {
  try {
    console.log('Données reçues:', JSON.stringify(req.body, null, 2));
    
    const { title, description, demographicEnabled, nodes, edges, isPrivate } = req.body;

    // Validation des données
    if (!title) {
      return res.status(400).json({ 
        message: 'Le titre est requis',
        receivedData: req.body 
      });
    }

    if (!Array.isArray(nodes)) {
      return res.status(400).json({ 
        message: 'Les nœuds doivent être un tableau',
        receivedData: req.body 
      });
    }

    if (!Array.isArray(edges)) {
      return res.status(400).json({ 
        message: 'Les arêtes doivent être un tableau',
        receivedData: req.body 
      });
    }

    // Validation des nœuds
    for (const node of nodes) {
      if (!node.id || !node.type || !node.data) {
        return res.status(400).json({
          message: 'Format de nœud invalide',
          invalidNode: node
        });
      }
    }

    // Validation des arêtes
    for (const edge of edges) {
      if (!edge.id || !edge.source || !edge.target) {
        return res.status(400).json({
          message: 'Format d\'arête invalide',
          invalidEdge: edge
        });
      }
    }

    // Créer le sondage avec les médias
    const survey = new DynamicSurvey({
      title,
      description,
      demographicEnabled: demographicEnabled || false,
      isPrivate: isPrivate || false,
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        data: {
          ...node.data,
          mediaUrl: node.data.mediaUrl || '',
          media: node.data.media || ''
        },
        position: node.position
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: edge.type
      })),
      userId: req.user.id
    });

    // Si le sondage est privé, générer et sauvegarder le lien
    if (isPrivate) {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      survey.privateLink = `${baseUrl}/survey-answer?surveyId=${survey._id}`;
    }

    console.log('Survey à sauvegarder:', JSON.stringify(survey, null, 2));

    const savedSurvey = await survey.save();

    // Retourner le lien privé dans la réponse si le sondage est privé
    const response = {
      ...savedSurvey.toObject(),
      privateLink: savedSurvey.isPrivate ? savedSurvey.privateLink : undefined
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Erreur détaillée:', error);
    res.status(500).json({
      message: 'Erreur lors de la création du sondage',
      error: error.message,
      stack: error.stack
    });
  }
};

exports.getDynamicSurveys = async (req, res) => {
  try {
    // Ne récupérer que les sondages de l'utilisateur actuel
    const surveys = await DynamicSurvey.find({ userId: req.user.id })
      .select('title description demographicEnabled nodes edges createdAt userId isPrivate')
      .sort({ createdAt: -1 });

    res.status(200).json(surveys);
  } catch (error) {
    console.error("Erreur lors de la récupération des sondages:", error);
    res.status(500).json({ 
      message: "Erreur lors de la récupération des sondages", 
      error: error.message 
    });
  }
};

exports.getDynamicSurveyById = async (req, res) => {
  try {
    const survey = await DynamicSurvey.findById(req.params.id)
      .select('title description demographicEnabled nodes edges createdAt isPrivate');

    if (!survey) {
      return res.status(404).json({ message: "Sondage non trouvé" });
    }

    res.status(200).json(survey);
  } catch (error) {
    console.error("Erreur lors de la récupération du sondage:", error);
    res.status(500).json({ 
      message: "Erreur lors de la récupération du sondage", 
      error: error.message 
    });
  }
};

exports.updateDynamicSurvey = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, demographicEnabled, nodes, edges } = req.body;

    const survey = await DynamicSurvey.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      {
        title,
        description,
        demographicEnabled,
        nodes,
        edges,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!survey) {
      return res.status(404).json({ 
        message: "Sondage non trouvé ou non autorisé" 
      });
    }

    res.status(200).json(survey);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du sondage:", error);
    res.status(500).json({ 
      message: "Erreur lors de la mise à jour du sondage", 
      error: error.message 
    });
  }
};

exports.deleteDynamicSurvey = async (req, res) => {
  try {
    const { id } = req.params;
    const survey = await DynamicSurvey.findOneAndDelete({ 
      _id: id, 
      userId: req.user.id 
    });

    if (!survey) {
      return res.status(404).json({ 
        message: "Sondage non trouvé ou non autorisé" 
      });
    }

    res.status(200).json({ message: "Sondage supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du sondage:", error);
    res.status(500).json({ 
      message: "Erreur lors de la suppression du sondage", 
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

// Delete unused media by public ID
exports.deleteMedia = async (req, res) => {
  try {
    const { publicId } = req.body;
    console.log('Received delete request for public_id:', publicId);
    
    if (!publicId) {
      console.log('No public_id provided');
      return res.status(400).json({ message: "Public ID is required." });
    }

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

// Get all dynamic surveys available for answering
exports.getAllDynamicSurveysForAnswering = async (req, res) => {
  console.log('getAllDynamicSurveysForAnswering appelé');
  console.log('User dans la requête:', req.user);
  
  try {
    console.log('Début de la recherche des sondages dynamiques');
    
    // Création du filtre pour la requête
    const filter = {
      $or: [
        { isPrivate: false },
        { userId: req.user.id }
      ]
    };
    
    console.log('Filtre de recherche:', filter);
    
    const surveys = await DynamicSurvey.find(filter)
      .select('title description demographicEnabled nodes edges createdAt isPrivate userId')
      .sort({ createdAt: -1 });
    
    console.log('Nombre de sondages dynamiques trouvés:', surveys.length);
    
    if (!surveys || surveys.length === 0) {
      console.log('Aucun sondage dynamique trouvé');
      return res.status(404).json({ 
        message: "Aucun sondage dynamique disponible.",
        debug: {
          filter,
          modelName: DynamicSurvey.modelName,
          collectionName: DynamicSurvey.collection.name
        }
      });
    }

    console.log('Envoi des sondages dynamiques au client');
    res.status(200).json(surveys);
  } catch (error) {
    console.error("Erreur détaillée:", error);
    console.error("Stack trace:", error.stack);
    console.error("Nom du modèle:", DynamicSurvey.modelName);
    console.error("Nom de la collection:", DynamicSurvey.collection.name);
    
    res.status(500).json({ 
      message: "Erreur lors de la récupération des sondages dynamiques.",
      error: error.message,
      debug: {
        modelName: DynamicSurvey.modelName,
        collectionName: DynamicSurvey.collection.name,
        errorName: error.name,
        errorStack: error.stack
      }
    });
  }
}; 