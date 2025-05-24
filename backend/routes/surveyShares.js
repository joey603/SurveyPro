const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  shareSurvey,
  getSharedSurveys,
  getPendingShares,
  respondToShare
} = require('../controllers/surveyShareController');
const SurveyShare = require('../models/SurveyShare');
const DynamicSurvey = require('../models/DynamicSurvey');
const Survey = require('../models/Survey');

// Debug middleware pour mieux comprendre le problème
router.use((req, res, next) => {
  console.log('=== Survey Shares Route Debug ===');
  console.log(`Access to the survey-shares route: ${req.method} ${req.originalUrl}`);
  console.log('Available routes:', ['/share', '/shared-with-me', '/pending', '/respond', '/debug', '/:shareId', '/cleanup-orphans']);
  console.log('Request body:', req.body);
  console.log('User:', req.user?.id);
  next();
});

// Routes existantes
router.post('/share', authMiddleware, shareSurvey);
router.get('/shared-with-me', authMiddleware, getSharedSurveys);
router.get('/pending', authMiddleware, getPendingShares);
router.post('/respond', authMiddleware, respondToShare);

// Ajouter une route pour supprimer explicitement un partage
router.delete('/:shareId', authMiddleware, async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.user.id;
    
    console.log(`=======================================`);
    console.log(`SHARE DELETION - START`);
    console.log(`ID of the share to delete: ${shareId}`);
    console.log(`ID of the user who is making the request: ${userId}`);
    
    // Vérifier d'abord si le partage existe
    console.log(`Recherche du partage dans la base de données...`);
    const share = await SurveyShare.findById(shareId);
    
    if (!share) {
      console.log(`Share with ID ${shareId} not found in the database`);
      console.log(`Here are the first 5 shares in the database:`);
      const sampleShares = await SurveyShare.find().limit(5);
      console.log(sampleShares.map(s => ({
        id: s._id.toString(),
        surveyId: s.surveyId.toString(),
        sharedWith: s.sharedWith.toString(),
        status: s.status
      })));
      
      return res.status(200).json({ 
        message: "Share already deleted or does not exist",
        success: true
      });
    }
    
    console.log(`Share found:`, {
      id: share._id.toString(),
      surveyId: share.surveyId.toString(),
      sharedBy: share.sharedBy,
      sharedWith: share.sharedWith.toString(),
      status: share.status,
      date: share.createdAt
    });
    
    // Vérifier que l'utilisateur est autorisé à supprimer ce partage
    if (share.sharedWith.toString() !== userId) {
      console.log(`ACCESS DENIED: User ${userId} is not authorized to delete share ${shareId}`);
      console.log(`The share belongs to: ${share.sharedWith.toString()}`);
      return res.status(403).json({ 
        message: "Not authorized to delete this share"
      });
    }
    
    // Supprimer le partage
    console.log(`Suppression du partage ${shareId}...`);
    const deleteResult = await SurveyShare.deleteOne({ _id: shareId });
    console.log(`Résultat de la suppression:`, deleteResult);
    
    if (deleteResult.deletedCount === 0) {
      console.log(`No share was deleted, despite the previous share being found`);
      return res.status(400).json({
        message: "Failed to delete share",
        success: false
      });
    }
    
    console.log(`Share ${shareId} deleted successfully`);
    console.log(`SUPPRESSION DE PARTAGE - FIN`);
    console.log(`=======================================`);
    
    res.status(200).json({
      message: "Share deleted successfully",
      success: true
    });
  } catch (error) {
    console.error('Detailed error during share deletion:', {
      message: error.message,
      stack: error.stack,
      shareId: req.params.shareId,
      userId: req.user?.id
    });
    res.status(500).json({
      message: "Error during share deletion",
      error: error.message
    });
  }
});

// Ajouter une route de diagnostique
router.get('/debug', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('=== DIAGNOSTIC OF SHARES ===');
    
    // 1. Vérifier tous les partages
    const allShares = await SurveyShare.find({});
    console.log(`Total number of shares: ${allShares.length}`);
    
    // 2. Vérifier les partages en attente pour l'utilisateur
    const pendingForUser = await SurveyShare.find({
      sharedWith: userId,
      status: 'pending'
    });
    console.log(`Shares pending for user: ${pendingForUser.length}`);
    
    // 3. Vérifier les partages acceptés pour l'utilisateur
    const acceptedForUser = await SurveyShare.find({
      sharedWith: userId,
      status: 'accepted'
    });
    console.log(`Accepted shares for user: ${acceptedForUser.length}`);
    
    // 4. Vérifier les partages dynamiques
    const dynamicShares = allShares.filter(share => share.surveyModel === 'DynamicSurvey');
    console.log(`Dynamic survey shares: ${dynamicShares.length}`);
    
    // 5. Vérifier pour chaque partage si le sondage existe
    // Partages statiques
    const staticShares = allShares.filter(share => share.surveyModel !== 'DynamicSurvey');
    const staticSharesValidation = await Promise.all(
      staticShares.map(async share => {
        const survey = await Survey.findById(share.surveyId);
        return {
          shareId: share._id,
          surveyId: share.surveyId,
          exists: !!survey,
          title: survey ? survey.title : 'N/A',
          sharedWith: share.sharedWith,
          status: share.status
        };
      })
    );
    
    // Partages dynamiques
    const dynamicSharesValidation = await Promise.all(
      dynamicShares.map(async share => {
        const survey = await DynamicSurvey.findById(share.surveyId);
        return {
          shareId: share._id,
          surveyId: share.surveyId,
          exists: !!survey,
          title: survey ? survey.title : 'N/A',
          sharedWith: share.sharedWith,
          status: share.status
        };
      })
    );
    
    // 6. Vérifier les partages où le sondage n'existe plus (orphelins)
    const orphanedShares = [
      ...staticSharesValidation.filter(s => !s.exists),
      ...dynamicSharesValidation.filter(s => !s.exists)
    ];
    
    // 7. Vérifier les orphelins pour l'utilisateur
    const userOrphanedShares = orphanedShares.filter(
      share => share.sharedWith.toString() === userId
    );
    
    console.log(`Orphaned shares for user: ${userOrphanedShares.length}`);
    console.log('Details of orphans:', userOrphanedShares);
    
    // 8. Vérifier les partages dynamiques pour l'utilisateur
    const userDynamicShares = dynamicSharesValidation.filter(
      share => share.sharedWith.toString() === userId && share.status === 'pending'
    );
    
    console.log(`Dynamic shares pending for user: ${userDynamicShares.length}`);
    console.log('Details:', userDynamicShares);
    
    // Répondre avec les données de diagnostic
    res.status(200).json({
      totalShares: allShares.length,
      pendingForUser: pendingForUser.length,
      acceptedForUser: acceptedForUser.length,
      dynamicShares: dynamicShares.length,
      staticSharesValidation,
      dynamicSharesValidation,
      orphanedShares,
      userOrphanedShares,
      userDynamicShares
    });
  } catch (error) {
    console.error('Error during diagnostic:', error);
    res.status(500).json({
      message: 'Error during diagnostic',
      error: error.message
    });
  }
});

// Ajouter une route pour nettoyer les partages orphelins
router.delete('/cleanup-orphans', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Nettoyage des partages orphelins pour l'utilisateur ${userId}`);
    
    // Récupérer tous les partages de l'utilisateur
    const userShares = await SurveyShare.find({
      sharedWith: userId
    });
    
    console.log(`${userShares.length} shares found for user`);
    
    // Vérifier l'existence de chaque sondage
    const orphanedShareIds = [];
    
    for (const share of userShares) {
      let surveyExists = false;
      
      if (share.surveyModel === 'DynamicSurvey') {
        const survey = await DynamicSurvey.findById(share.surveyId);
        surveyExists = !!survey;
      } else {
        const survey = await Survey.findById(share.surveyId);
        surveyExists = !!survey;
      }
      
      if (!surveyExists) {
        orphanedShareIds.push(share._id);
        console.log(`Orphaned share found: ${share._id} (survey ${share.surveyId} not found)`);
      }
    }
    
    // Supprimer les partages orphelins
    if (orphanedShareIds.length > 0) {
      const deleteResult = await SurveyShare.deleteMany({
        _id: { $in: orphanedShareIds }
      });
      
      console.log(`${deleteResult.deletedCount} orphaned shares deleted`);
      
      res.status(200).json({
        message: `${deleteResult.deletedCount} orphaned shares deleted successfully`,
        deletedCount: deleteResult.deletedCount,
        orphanedIds: orphanedShareIds
      });
    } else {
      console.log('No orphaned shares found');
      res.status(200).json({
        message: 'No orphaned shares found',
        deletedCount: 0
      });
    }
  } catch (error) {
    console.error('Error cleaning up orphaned shares:', error);
    res.status(500).json({
      message: 'Error cleaning up orphaned shares',
      error: error.message
    });
  }
});

// Catch-all route pour déboguer les routes non trouvées dans ce routeur
router.use('*', (req, res) => {
  console.log('Route not found in survey-shares:', {
    method: req.method,
    url: req.originalUrl,
    body: req.body
  });
  res.status(404).json({
    message: 'Route not found in survey-shares',
    requestedUrl: req.originalUrl,
    availableRoutes: ['/share', '/shared-with-me', '/pending', '/respond', '/debug', '/:shareId', '/cleanup-orphans']
  });
});

module.exports = router; 