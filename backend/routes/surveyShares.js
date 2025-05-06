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
  console.log(`Accès à la route survey-shares: ${req.method} ${req.originalUrl}`);
  console.log('Routes disponibles:', ['/share', '/shared-with-me', '/pending', '/respond', '/debug', '/:shareId', '/cleanup-orphans']);
  console.log('Corps de la requête:', req.body);
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
    console.log(`SUPPRESSION DE PARTAGE - DÉBUT`);
    console.log(`ID du partage à supprimer: ${shareId}`);
    console.log(`ID de l'utilisateur qui fait la demande: ${userId}`);
    
    // Vérifier d'abord si le partage existe
    console.log(`Recherche du partage dans la base de données...`);
    const share = await SurveyShare.findById(shareId);
    
    if (!share) {
      console.log(`Partage avec ID ${shareId} non trouvé dans la base de données`);
      console.log(`Voici les 5 premiers partages dans la base:`);
      const sampleShares = await SurveyShare.find().limit(5);
      console.log(sampleShares.map(s => ({
        id: s._id.toString(),
        surveyId: s.surveyId.toString(),
        sharedWith: s.sharedWith.toString(),
        status: s.status
      })));
      
      return res.status(200).json({ 
        message: "Partage déjà supprimé ou inexistant",
        success: true
      });
    }
    
    console.log(`Partage trouvé:`, {
      id: share._id.toString(),
      surveyId: share.surveyId.toString(),
      sharedBy: share.sharedBy,
      sharedWith: share.sharedWith.toString(),
      status: share.status,
      date: share.createdAt
    });
    
    // Vérifier que l'utilisateur est autorisé à supprimer ce partage
    if (share.sharedWith.toString() !== userId) {
      console.log(`ACCÈS REFUSÉ: L'utilisateur ${userId} n'est pas autorisé à supprimer le partage ${shareId}`);
      console.log(`Le partage appartient à: ${share.sharedWith.toString()}`);
      return res.status(403).json({ 
        message: "Non autorisé à supprimer ce partage"
      });
    }
    
    // Supprimer le partage
    console.log(`Suppression du partage ${shareId}...`);
    const deleteResult = await SurveyShare.deleteOne({ _id: shareId });
    console.log(`Résultat de la suppression:`, deleteResult);
    
    if (deleteResult.deletedCount === 0) {
      console.log(`Aucun partage n'a été supprimé, malgré le partage trouvé précédemment`);
      return res.status(400).json({
        message: "Échec de la suppression du partage",
        success: false
      });
    }
    
    console.log(`Partage ${shareId} supprimé avec succès`);
    console.log(`SUPPRESSION DE PARTAGE - FIN`);
    console.log(`=======================================`);
    
    res.status(200).json({
      message: "Partage supprimé avec succès",
      success: true
    });
  } catch (error) {
    console.error('Erreur détaillée lors de la suppression du partage:', {
      message: error.message,
      stack: error.stack,
      shareId: req.params.shareId,
      userId: req.user?.id
    });
    res.status(500).json({
      message: "Erreur lors de la suppression du partage",
      error: error.message
    });
  }
});

// Ajouter une route de diagnostique
router.get('/debug', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('=== DIAGNOSTIC DES PARTAGES ===');
    
    // 1. Vérifier tous les partages
    const allShares = await SurveyShare.find({});
    console.log(`Nombre total de partages: ${allShares.length}`);
    
    // 2. Vérifier les partages en attente pour l'utilisateur
    const pendingForUser = await SurveyShare.find({
      sharedWith: userId,
      status: 'pending'
    });
    console.log(`Partages en attente pour l'utilisateur: ${pendingForUser.length}`);
    
    // 3. Vérifier les partages acceptés pour l'utilisateur
    const acceptedForUser = await SurveyShare.find({
      sharedWith: userId,
      status: 'accepted'
    });
    console.log(`Partages acceptés pour l'utilisateur: ${acceptedForUser.length}`);
    
    // 4. Vérifier les partages dynamiques
    const dynamicShares = allShares.filter(share => share.surveyModel === 'DynamicSurvey');
    console.log(`Partages de sondages dynamiques: ${dynamicShares.length}`);
    
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
    
    console.log(`Partages orphelins pour l'utilisateur: ${userOrphanedShares.length}`);
    console.log('Détails des orphelins:', userOrphanedShares);
    
    // 8. Vérifier les partages dynamiques pour l'utilisateur
    const userDynamicShares = dynamicSharesValidation.filter(
      share => share.sharedWith.toString() === userId && share.status === 'pending'
    );
    
    console.log(`Partages dynamiques en attente pour l'utilisateur: ${userDynamicShares.length}`);
    console.log('Détails:', userDynamicShares);
    
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
    console.error('Erreur lors du diagnostic:', error);
    res.status(500).json({
      message: 'Erreur lors du diagnostic',
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
    
    console.log(`${userShares.length} partages trouvés pour l'utilisateur`);
    
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
        console.log(`Partage orphelin trouvé: ${share._id} (sondage ${share.surveyId} non trouvé)`);
      }
    }
    
    // Supprimer les partages orphelins
    if (orphanedShareIds.length > 0) {
      const deleteResult = await SurveyShare.deleteMany({
        _id: { $in: orphanedShareIds }
      });
      
      console.log(`${deleteResult.deletedCount} partages orphelins supprimés`);
      
      res.status(200).json({
        message: `${deleteResult.deletedCount} partages orphelins supprimés avec succès`,
        deletedCount: deleteResult.deletedCount,
        orphanedIds: orphanedShareIds
      });
    } else {
      console.log('Aucun partage orphelin trouvé');
      res.status(200).json({
        message: 'Aucun partage orphelin trouvé',
        deletedCount: 0
      });
    }
  } catch (error) {
    console.error('Erreur lors du nettoyage des partages orphelins:', error);
    res.status(500).json({
      message: 'Erreur lors du nettoyage des partages orphelins',
      error: error.message
    });
  }
});

// Catch-all route pour déboguer les routes non trouvées dans ce routeur
router.use('*', (req, res) => {
  console.log('Route non trouvée dans survey-shares:', {
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