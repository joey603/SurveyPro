const DynamicSurvey = require("../models/DynamicSurvey");
const { uploadFileToCloudinary, deleteFileFromCloudinary } = require("../cloudinaryConfig");

exports.createDynamicSurvey = async (req, res) => {
  try {
    console.log('Données reçues:', JSON.stringify(req.body, null, 2));
    
    const { title, description, demographicEnabled, nodes, edges } = req.body;

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

    const survey = new DynamicSurvey({
      title,
      description,
      demographicEnabled: demographicEnabled || false,
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        data: node.data,
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

    console.log('Survey à sauvegarder:', JSON.stringify(survey, null, 2));

    const savedSurvey = await survey.save();
    res.status(201).json(savedSurvey);
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
    const surveys = await DynamicSurvey.find({ userId: req.user.id })
      .select('title description demographicEnabled nodes edges createdAt')
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
      .select('title description demographicEnabled nodes edges createdAt');

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