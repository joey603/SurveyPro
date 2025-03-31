const SurveyShare = require('../models/SurveyShare');
const User = require('../models/User');
const Survey = require('../models/Survey');
const DynamicSurvey = require('../models/DynamicSurvey');

exports.shareSurvey = async (req, res) => {
  try {
    console.log('===== DÉBUT FONCTION shareSurvey =====');
    const { surveyId, recipientEmail } = req.body;
    console.log('Données reçues:', { surveyId, recipientEmail });
    
    if (!surveyId || !recipientEmail) {
      console.log('Données invalides:', { surveyId, recipientEmail });
      return res.status(400).json({ 
        message: "Survey ID and recipient email are required" 
      });
    }

    // Récupérer l'expéditeur
    const sender = await User.findById(req.user.id);
    console.log('Expéditeur trouvé:', sender ? sender.email : 'Non trouvé');
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    // Vérifier si le sondage existe dans Survey
    let survey = await Survey.findById(surveyId);
    let surveyModel = 'Survey';
    
    // Si pas trouvé, vérifier dans DynamicSurvey
    if (!survey) {
      console.log('Sondage non trouvé dans Survey, vérification dans DynamicSurvey');
      survey = await DynamicSurvey.findById(surveyId);
      surveyModel = 'DynamicSurvey';
      
      console.log('Résultat de la recherche dans DynamicSurvey:', {
        trouvé: !!survey,
        id: surveyId,
        modèle: surveyModel
      });
    }
    
    if (!survey) {
      console.log('Sondage non trouvé dans aucun modèle');
      return res.status(404).json({ message: "Survey not found" });
    }

    console.log('Sondage trouvé:', {
      titre: survey.title,
      id: survey._id,
      modèle: surveyModel,
      userId: survey.userId
    });

    // Vérifier si le destinataire existe
    const recipient = await User.findOne({ email: recipientEmail });
    console.log('Destinataire trouvé:', recipient ? recipient.email : 'Non trouvé');
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // Vérifier si le destinataire est déjà le propriétaire
    const surveyUserId = typeof survey.userId === 'object' ? 
                          survey.userId.toString() : 
                          survey.userId;
                          
    console.log('Vérification propriétaire:', { 
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
    console.log('Nouveau partage créé:', {
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
    console.log('===== FIN FONCTION shareSurvey =====');
  } catch (error) {
    console.error('Erreur détaillée dans shareSurvey:', {
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
    console.log('===== DÉBUT FONCTION getSharedSurveys =====');
    console.log('Récupération des sondages partagés pour l\'utilisateur:', req.user.id);
    
    // Récupérer tous les partages acceptés
    const acceptedShares = await SurveyShare.find({
      sharedWith: req.user.id,
      status: 'accepted'
    });
    
    console.log(`${acceptedShares.length} partages acceptés trouvés`);
    
    if (acceptedShares.length === 0) {
      return res.status(200).json([]);
    }
    
    // Détail des partages pour le débogage
    acceptedShares.forEach(share => {
      console.log(`Partage accepté: ID=${share._id}, SurveyID=${share.surveyId}, Modèle=${share.surveyModel || 'Survey'}`);
    });

    // Traiter chaque partage pour obtenir les détails complets
    const formattedShares = [];
    
    for (const share of acceptedShares) {
      try {
        // Déterminer quel modèle utiliser
        const modelName = share.surveyModel || 'Survey';
        const model = modelName === 'DynamicSurvey' ? DynamicSurvey : Survey;
        
        console.log(`Recherche du sondage ${share.surveyId} dans le modèle ${modelName}`);
        const survey = await model.findById(share.surveyId);
        
        if (!survey) {
          console.log(`Sondage partagé non trouvé: ${share.surveyId}`);
          continue;
        }
        
        console.log(`Sondage partagé trouvé: ${survey.title || 'Sans titre'}`);
        
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
        
        console.log('Sondage formaté:', {
          id: formattedSurvey._id,
          title: formattedSurvey.title,
          isDynamic: formattedSurvey.isDynamic,
          shareId: formattedSurvey.shareId
        });
        
        formattedShares.push(formattedSurvey);
      } catch (error) {
        console.error(`Erreur lors du traitement du partage ${share._id}:`, error);
      }
    }

    console.log(`${formattedShares.length} sondages partagés formatés avec succès`);
    
    // Logs détaillés pour le débogage
    formattedShares.forEach(survey => {
      console.log(`Sondage partagé formaté: ID=${survey._id}, Titre="${survey.title}", isDynamic=${survey.isDynamic}`);
    });

    res.status(200).json(formattedShares);
    console.log('===== FIN FONCTION getSharedSurveys =====');
  } catch (error) {
    console.error('Erreur lors de la récupération des sondages partagés:', error);
    res.status(500).json({ 
      message: "Error retrieving shared surveys", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getPendingShares = async (req, res) => {
  try {
    console.log('===== DÉBUT FONCTION getPendingShares =====');
    console.log('Utilisateur connecté:', req.user.id);

    const pendingShares = await SurveyShare.find({
      sharedWith: req.user.id,
      status: 'pending'
    });
    
    console.log(`${pendingShares.length} partages en attente trouvés:`, 
      pendingShares.map(s => ({
        shareId: s._id.toString(),
        surveyId: s.surveyId.toString(),
        model: s.surveyModel || 'non spécifié'
      }))
    );

    const formattedShares = [];
    
    // Traiter chaque partage individuellement pour obtenir des logs détaillés
    for (const share of pendingShares) {
      try {
        console.log(`Traitement du partage: ${share._id}`);
        const isSurveyDynamic = share.surveyModel === 'DynamicSurvey';
        const model = isSurveyDynamic ? DynamicSurvey : Survey;
        
        console.log(`Recherche du sondage ${share.surveyId} dans le modèle ${isSurveyDynamic ? 'DynamicSurvey' : 'Survey'}`);
        const survey = await model.findById(share.surveyId);
        
        if (!survey) {
          console.log(`Sondage non trouvé: ${share.surveyId}`);
          continue;
        }
        
        console.log(`Sondage trouvé: ${survey.title}`);
        console.log(`Type de sondage: ${isSurveyDynamic ? 'Dynamique' : 'Statique'}`);
        
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
        
        console.log('Sondage formaté:', {
          id: formattedSurvey._id,
          title: formattedSurvey.title,
          isDynamic: formattedSurvey.isDynamic,
          shareId: formattedSurvey.shareId
        });
        
        formattedShares.push(formattedSurvey);
      } catch (error) {
        console.error(`Erreur lors du traitement du partage ${share._id}:`, error);
      }
    }

    console.log(`${formattedShares.length} sondages en attente formatés`);
    console.log('Détail des sondages en attente:', formattedShares.map(s => ({ 
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

    const share = await SurveyShare.findOne({
      _id: shareId,
      sharedWith: userId,
      status: 'pending'
    });

    if (!share) {
      return res.status(404).json({ 
        message: 'Share not found',
        details: 'No pending share found for this user'
      });
    }

    if (accept) {
      // Si accepté, mettre à jour le statut
      share.status = 'accepted';
      await share.save();
    } else {
      // Si refusé, supprimer le partage
      await SurveyShare.deleteOne({ _id: shareId });
    }

    res.status(200).json({
      message: accept ? 'Share accepted successfully' : 'Share rejected and removed',
      status: accept ? 'accepted' : 'rejected',
      surveyId: share.surveyId
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du partage:', error);
    res.status(500).json({ 
      message: 'Error updating share response',
      error: error.message
    });
  }
}; 