const SurveyShare = require('../models/SurveyShare');
const User = require('../models/User');
const Survey = require('../models/Survey');

exports.shareSurvey = async (req, res) => {
  try {
    console.log('Début de la fonction shareSurvey');
    const { surveyId, recipientEmail } = req.body;
    console.log('Données reçues:', { surveyId, recipientEmail });
    
    if (!surveyId || !recipientEmail) {
      return res.status(400).json({ 
        message: "Le surveyId et l'email du destinataire sont requis" 
      });
    }

    // Vérifier si le sondage existe
    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ message: "Sondage non trouvé" });
    }

    // Vérifier si l'utilisateur destinataire existe
    const recipient = await User.findOne({ email: recipientEmail });
    if (!recipient) {
      return res.status(404).json({ message: "Destinataire non trouvé" });
    }

    // Vérifier si le partage existe déjà
    const existingShare = await SurveyShare.findOne({
      surveyId,
      sharedWith: recipient._id
    });

    if (existingShare) {
      return res.status(400).json({ 
        message: "Ce sondage est déjà partagé avec cet utilisateur" 
      });
    }

    // Créer le nouveau partage
    const share = new SurveyShare({
      surveyId,
      sharedBy: req.body.senderEmail || 'system@surveypro.com',
      sharedWith: recipient._id
    });

    await share.save();
    console.log('Nouveau partage créé:', share);

    res.status(201).json({
      message: "Invitation de partage envoyée avec succès",
      share
    });
  } catch (error) {
    console.error('Erreur lors du partage:', error);
    res.status(500).json({ 
      message: "Erreur lors du partage", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getSharedSurveys = async (req, res) => {
  try {
    const shares = await SurveyShare.find({
      sharedWith: req.user.id,
      status: 'accepted'
    })
    .populate('surveyId', 'title description')
    .populate('sharedBy', 'username email');

    res.status(200).json(shares);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des partages", error: error.message });
  }
};

exports.getPendingShares = async (req, res) => {
  try {
    const pendingShares = await SurveyShare.find({
      sharedWith: req.user.id,
      status: 'pending'
    })
    .populate('surveyId', 'title description')
    .populate('sharedBy', 'username email');

    res.status(200).json(pendingShares);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des invitations", error: error.message });
  }
};

exports.respondToShare = async (req, res) => {
  try {
    const { shareId, accept } = req.body;
    
    const share = await SurveyShare.findOne({
      _id: shareId,
      sharedWith: req.user.id,
      status: 'pending'
    });

    if (!share) {
      return res.status(404).json({ message: "Invitation non trouvée" });
    }

    share.status = accept ? 'accepted' : 'rejected';
    await share.save();

    res.status(200).json({
      message: accept ? "Partage accepté" : "Partage refusé",
      share
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la réponse", error: error.message });
  }
}; 