const DynamicSurvey = require("../models/DynamicSurvey");
const { uploadFileToCloudinary, deleteFileFromCloudinary } = require("../cloudinaryConfig");
const fs = require('fs');

exports.createDynamicSurvey = async (req, res) => {
  try {
    console.log('Received data:', JSON.stringify(req.body, null, 2));
    
    const { title, description, demographicEnabled, nodes, edges, isPrivate } = req.body;

    // Validation des données
    if (!title) {
      return res.status(400).json({ 
        message: 'The title is required',
        receivedData: req.body 
      });
    }

    if (!Array.isArray(nodes)) {
      return res.status(400).json({ 
        message: "The nodes must be an array",
        receivedData: req.body 
      });
    }

    if (!Array.isArray(edges)) {
      return res.status(400).json({ 
        message: "The edges must be an array",
        receivedData: req.body 
      });
    }

    // Validation des nœuds
    for (const node of nodes) {
      if (!node.id || !node.type || !node.data) {
        return res.status(400).json({
          message: "Invalid node format",
          invalidNode: node
        });
      }
    }

    // Validation des arêtes
    for (const edge of edges) {
      if (!edge.id || !edge.source || !edge.target) {
        return res.status(400).json({
          message: "Invalid edge format",
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

    console.log('Survey to save:', JSON.stringify(survey, null, 2));

    const savedSurvey = await survey.save();

    // Retourner le lien privé dans la réponse si le sondage est privé
    const response = {
      ...savedSurvey.toObject(),
      privateLink: savedSurvey.isPrivate ? savedSurvey.privateLink : undefined
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Detailed error:', error);
    res.status(500).json({
      message: 'Error when creating the survey',
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
    console.error("Error when retrieving surveys:", error);
    res.status(500).json({ 
      message: "Error when retrieving surveys", 
      error: error.message 
    });
  }
};

exports.getDynamicSurveyById = async (req, res) => {
  try {
    const survey = await DynamicSurvey.findById(req.params.id)
      .select('title description demographicEnabled nodes edges createdAt isPrivate');

    if (!survey) {
      return res.status(404).json({ message: "Survey not found" });
    }

    res.status(200).json(survey);
  } catch (error) {
    console.error("Error when retrieving the survey:", error);
    res.status(500).json({ 
      message: "Error when retrieving the survey", 
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
        message: "Survey not found or unauthorized" 
      });
    }

    res.status(200).json(survey);
  } catch (error) {
    console.error("Error when updating the survey:", error);
    res.status(500).json({ 
      message: "Error when updating the survey", 
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
        message: "Survey not found or unauthorized" 
      });
    }

    res.status(200).json({ message: "Survey deleted successfully" });
  } catch (error) {
    console.error("Error when deleting the survey:", error);
    res.status(500).json({ 
      message: "Error when deleting the survey", 
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
  console.log('=== Start getAllDynamicSurveysForAnswering ===');
  console.log('User in request:', req.user);
  
  try {
    console.log('Start searching for dynamic surveys');
    
    // Vérifier que req.user existe
    if (!req.user || !req.user.id) {
      console.error('User not authenticated');
      return res.status(401).json({ 
        message: "User not authenticated",
        error: "Authentication required"
      });
    }

    // Récupérer tous les sondages sans filtre sur isPrivate
    console.log('Searching for dynamic surveys in the database...');
    const surveys = await DynamicSurvey.find()
      .select('title description demographicEnabled nodes edges createdAt isPrivate userId')
      .sort({ createdAt: -1 })
      .lean(); // Utiliser lean() pour de meilleures performances
    
    console.log('Nombre de sondages dynamiques trouvés:', surveys.length);
    
    if (!surveys || surveys.length === 0) {
      console.log('No dynamic survey found');
      return res.status(404).json({ 
        message: "No dynamic survey available.",
        debug: {
          modelName: DynamicSurvey.modelName,
          collectionName: DynamicSurvey.collection.name
        }
      });
    }

    // Log des premiers sondages pour debug
    console.log('Example of dynamic surveys found:', surveys.slice(0, 3).map(s => ({
      id: s._id,
      title: s.title,
      isPrivate: s.isPrivate
    })));

    console.log('Sending dynamic surveys to client');
    return res.status(200).json(surveys);
  } catch (error) {
    console.error("=== Error in getAllDynamicSurveysForAnswering ===");
    console.error("Error message:", error.message);
    console.error("Stack trace:", error.stack);
    console.error("Model name:", DynamicSurvey.modelName);
    console.error("Collection name:", DynamicSurvey.collection.name);
    
    return res.status(500).json({ 
      message: "Error when retrieving dynamic surveys.",
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