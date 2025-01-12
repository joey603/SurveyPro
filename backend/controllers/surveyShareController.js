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
        message: "Survey ID and recipient email are required" 
      });
    }

    // Récupérer l'utilisateur qui partage
    const sender = await User.findById(req.user.id);
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    // Vérifier si le sondage existe
    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ message: "Survey not found" });
    }

    // Vérifier si l'utilisateur destinataire existe
    const recipient = await User.findOne({ email: recipientEmail });
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // Vérifier si le partage existe déjà
    const existingShare = await SurveyShare.findOne({
      surveyId,
      sharedWith: recipient._id
    });

    if (existingShare) {
      return res.status(400).json({ 
        message: "This survey is already shared with this user" 
      });
    }

    // Créer le nouveau partage avec l'email de l'expéditeur
    const share = new SurveyShare({
      surveyId,
      sharedBy: sender.email, // Utiliser l'email de l'expéditeur
      sharedWith: recipient._id
    });

    await share.save();
    console.log('Nouveau partage créé:', share);

    res.status(201).json({
      message: "Share invitation sent successfully",
      share
    });
  } catch (error) {
    console.error('Erreur lors du partage:', error);
    res.status(500).json({ 
      message: "Error while sharing", 
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
    res.status(500).json({ message: "Error retrieving shares", error: error.message });
  }
};

exports.getPendingShares = async (req, res) => {
  try {
    console.log('Getting pending shares for user:', req.user);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        message: "User not authenticated",
        debug: { user: req.user }
      });
    }

    const pendingShares = await SurveyShare.find({
      sharedWith: req.user.id,
      status: 'pending'
    })
    .populate('surveyId', 'title description questions demographicEnabled createdAt')
    .populate('sharedBy', 'username email');

    console.log('Found pending shares:', pendingShares);

    res.status(200).json(pendingShares);
  } catch (error) {
    console.error('Error in getPendingShares:', error);
    res.status(500).json({ 
      message: "Error retrieving invitations", 
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
      // Si accepté, mettre à jour le statut comme avant
      share.status = 'accepted';
      await share.save();
    } else {
      // Si refusé, supprimer le partage
      await SurveyShare.deleteOne({ _id: shareId });
    }

    // Mettre à jour le statut dans le sondage uniquement si accepté
    if (accept) {
      await Survey.findOneAndUpdate(
        {
          _id: share.surveyId,
          'sharedWith.userId': userId
        },
        {
          $set: {
            'sharedWith.$.status': 'accepted'
          }
        }
      );
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