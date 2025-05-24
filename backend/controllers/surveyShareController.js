const SurveyShare = require('../models/SurveyShare');
const User = require('../models/User');
const Survey = require('../models/Survey');
const DynamicSurvey = require('../models/DynamicSurvey');

exports.shareSurvey = async (req, res) => {
  try {
    console.log('===== START shareSurvey FUNCTION =====');
    const { surveyId, recipientEmail } = req.body;
    console.log('Received data:', { surveyId, recipientEmail });
    
    if (!surveyId || !recipientEmail) {
      console.log('Données invalides:', { surveyId, recipientEmail });
      return res.status(400).json({ 
        message: "Survey ID and recipient email are required" 
      });
    }

    // Récupérer l'expéditeur
    const sender = await User.findById(req.user.id);
    console.log('Sender found:', sender ? sender.email : 'Not found');
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    // Vérifier si le sondage existe dans Survey
    let survey = await Survey.findById(surveyId);
    let surveyModel = 'Survey';
    
    // Si pas trouvé, vérifier dans DynamicSurvey
    if (!survey) {
      console.log('Survey not found in Survey, checking in DynamicSurvey');
      survey = await DynamicSurvey.findById(surveyId);
      surveyModel = 'DynamicSurvey';
      
      console.log('Result of search in DynamicSurvey:', {
        found: !!survey,
        id: surveyId,
        model: surveyModel
      });
    }
    
    if (!survey) {
      console.log('Survey not found in any model');
      return res.status(404).json({ message: "Survey not found" });
    }

    console.log('Survey found:', {
      title: survey.title,
      id: survey._id,
      model: surveyModel,
      userId: survey.userId
    });

    // Vérifier si le destinataire existe
    const recipient = await User.findOne({ email: recipientEmail });
    console.log('Recipient found:', recipient ? recipient.email : 'Not found');
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // Vérifier si le destinataire est déjà le propriétaire
    const surveyUserId = typeof survey.userId === 'object' ? 
                          survey.userId.toString() : 
                          survey.userId;
                          
    console.log('Owner verification:', { 
      surveyUserId: surveyUserId, 
      recipientId: recipient._id.toString(),
      surveyModel
    });
    
    if (surveyUserId === recipient._id.toString()) {
      return res.status(400).json({ 
        message: "User is already the owner of this survey" 
      });
    }

    // Vérifier si le partage existe déjà
    const existingShare = await SurveyShare.findOne({
      surveyId,
      sharedWith: recipient._id,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingShare) {
      const status = existingShare.status === 'pending' ? 'pending' : 'already accepted';
      return res.status(400).json({ 
        message: `This survey is ${status} by this user` 
      });
    }

    // Créer le nouveau partage
    const share = new SurveyShare({
      surveyId,
      surveyModel,
      sharedBy: sender.email,
      sharedWith: recipient._id
    });

    await share.save();
    console.log('New share created:', {
      id: share._id,
      surveyId: share.surveyId,
      surveyModel: share.surveyModel,
      sharedWith: share.sharedWith,
      status: share.status
    });

    res.status(201).json({
      message: "Share invitation sent successfully",
      share
    });
    console.log('===== FIN shareSurvey FUNCTION =====');
  } catch (error) {
    console.error('Detailed error in shareSurvey:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: "Error while sharing", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getSharedSurveys = async (req, res) => {
  try {
    console.log('===== START getSharedSurveys FUNCTION =====');
    console.log('Retrieving shared surveys for user:', req.user.id);
    
    // Récupérer tous les partages acceptés
    const acceptedShares = await SurveyShare.find({
      sharedWith: req.user.id,
      status: 'accepted'
    });
    
    console.log(`${acceptedShares.length} accepted shares found`);
    
    if (acceptedShares.length === 0) {
      return res.status(200).json([]);
    }
    
    // Détail des partages pour le débogage
    acceptedShares.forEach(share => {
      console.log(`Accepted share: ID=${share._id}, SurveyID=${share.surveyId}, Model=${share.surveyModel || 'Survey'}`);
    });

    // Traiter chaque partage pour obtenir les détails complets
    const formattedShares = [];
    
    for (const share of acceptedShares) {
      try {
        // Déterminer quel modèle utiliser
        const modelName = share.surveyModel || 'Survey';
        const model = modelName === 'DynamicSurvey' ? DynamicSurvey : Survey;
        
        console.log(`Searching for survey ${share.surveyId} in model ${modelName}`);
        const survey = await model.findById(share.surveyId);
        
        if (!survey) {
          console.log(`Survey shared not found: ${share.surveyId}`);
          continue;
        }
        
        console.log(`Survey shared found: ${survey.title || 'Untitled'}`);
        
        // Former les données du sondage en fonction de son type
        const formattedSurvey = {
          _id: survey._id.toString(),
          surveyId: survey._id.toString(),
          title: survey.title || "Untitled",
          description: survey.description || "",
          demographicEnabled: survey.demographicEnabled || false,
          createdAt: survey.createdAt,
          status: 'accepted',
          sharedBy: share.sharedBy,
          isDynamic: modelName === 'DynamicSurvey',
          isShared: true,
          shareId: share._id.toString(),
          userId: req.user.id // Ajouter l'ID de l'utilisateur pour les filtres
        };
        
        // Ajouter les données spécifiques au type
        if (modelName === 'DynamicSurvey') {
          formattedSurvey.nodes = survey.nodes || [];
          formattedSurvey.edges = survey.edges || [];
        } else {
          formattedSurvey.questions = survey.questions || [];
        }
        
        console.log('Survey formatted:', {
          id: formattedSurvey._id,
          title: formattedSurvey.title,
          isDynamic: formattedSurvey.isDynamic,
          shareId: formattedSurvey.shareId
        });
        
        formattedShares.push(formattedSurvey);
      } catch (error) {
        console.error(`Error processing share ${share._id}:`, error);
      }
    }

    console.log(`${formattedShares.length} surveys formatted successfully`);
    
    // Logs détaillés pour le débogage
    formattedShares.forEach(survey => {
      console.log(`Survey formatted: ID=${survey._id}, Title="${survey.title}", isDynamic=${survey.isDynamic}`);
    });

    res.status(200).json(formattedShares);
    console.log('===== FIN getSharedSurveys FUNCTION =====');
  } catch (error) {
    console.error('Error retrieving shared surveys:', error);
    res.status(500).json({ 
      message: "Error retrieving shared surveys", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getPendingShares = async (req, res) => {
  try {
    console.log('===== START getPendingShares FUNCTION =====');
    console.log('Connected user:', req.user.id);

    const pendingShares = await SurveyShare.find({
      sharedWith: req.user.id,
      status: 'pending'
    });
    
    console.log(`${pendingShares.length} pending shares found:`, 
      pendingShares.map(s => ({
        shareId: s._id.toString(),
        surveyId: s.surveyId.toString(),
        model: s.surveyModel || 'not specified'
      }))
    );

    const formattedShares = [];
    
    // Traiter chaque partage individuellement pour obtenir des logs détaillés
    for (const share of pendingShares) {
      try {
        console.log(`Processing share: ${share._id}`);
        const isSurveyDynamic = share.surveyModel === 'DynamicSurvey';
        const model = isSurveyDynamic ? DynamicSurvey : Survey;
        
        console.log(`Searching for survey ${share.surveyId} in model ${isSurveyDynamic ? 'DynamicSurvey' : 'Survey'}`);
        const survey = await model.findById(share.surveyId);
        
        if (!survey) {
          console.log(`Survey not found: ${share.surveyId}`);
          continue;
        }
        
        console.log(`Survey found: ${survey.title}`);
        console.log(`Type of survey: ${isSurveyDynamic ? 'Dynamic' : 'Static'}`);
        
        // Former les données du sondage
        const formattedSurvey = {
          _id: survey._id.toString(),
          surveyId: survey._id.toString(),
          title: survey.title || "Sans titre",
          description: survey.description || "",
          demographicEnabled: survey.demographicEnabled || false,
          createdAt: survey.createdAt,
          status: 'pending',
          sharedBy: share.sharedBy,
          isShared: true,
          shareId: share._id.toString()
        };
        
        // Ajouter les données spécifiques au type de sondage
        if (isSurveyDynamic) {
          formattedSurvey.isDynamic = true;
          formattedSurvey.nodes = survey.nodes || [];
          formattedSurvey.edges = survey.edges || [];
        } else {
          formattedSurvey.isDynamic = false;
          formattedSurvey.questions = survey.questions || [];
        }
        
        console.log('Survey formatted:', {
          id: formattedSurvey._id,
          title: formattedSurvey.title,
          isDynamic: formattedSurvey.isDynamic,
          shareId: formattedSurvey.shareId
        });
        
        formattedShares.push(formattedSurvey);
      } catch (error) {
        console.error(`Error processing share ${share._id}:`, error);
      }
    }

    console.log(`${formattedShares.length} surveys in pending format`);
    console.log('Detail of pending surveys:', formattedShares.map(s => ({ 
      id: s._id, 
      title: s.title, 
      isDynamic: s.isDynamic 
    })));

    res.status(200).json(formattedShares);
    console.log('===== FIN FONCTION getPendingShares =====');
  } catch (error) {
    console.error('Erreur dans getPendingShares:', error);
    res.status(500).json({ 
      message: "Error retrieving pending invitations", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.respondToShare = async (req, res) => {
  try {
    const { shareId, accept } = req.body;
    const userId = req.user.id;

    // Rechercher le partage par ID et utilisateur receveur, peu importe son statut (pending ou accepted)
    const share = await SurveyShare.findOne({
      _id: shareId,
      sharedWith: userId,
      status: { $in: ['pending', 'accepted'] }
    });

    if (!share) {
      return res.status(404).json({ 
        message: 'Share not found',
        details: 'No share found for this user'
      });
    }

    if (accept) {
      // Si accepté, mettre à jour le statut
      share.status = 'accepted';
      await share.save();
      
      res.status(200).json({
        message: 'Share accepted successfully',
        status: 'accepted',
        surveyId: share.surveyId
      });
    } else {
      // Si refusé, mettre à jour le statut au lieu de supprimer le partage
      share.status = 'rejected';
      await share.save();
      
      res.status(200).json({
        message: 'Share rejected successfully',
        status: 'rejected',
        surveyId: share.surveyId
      });
    }
  } catch (error) {
    console.error('Error updating share response:', error);
    res.status(500).json({ 
      message: 'Error updating share response',
      error: error.message
    });
  }
}; 