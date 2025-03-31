const mongoose = require('mongoose');
const User = require('../models/User');
const Survey = require('../models/Survey');
const DynamicSurvey = require('../models/DynamicSurvey');
const SurveyAnswer = require('../models/SurveyAnswer');
const DynamicSurveyAnswer = require('../models/DynamicSurveyAnswer');
require('dotenv').config();

const cleanTestData = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connecté à MongoDB');

    // Supprimer les utilisateurs de test
    console.log('Suppression des utilisateurs de test...');
    const deleteResult = await User.deleteMany({
      email: /^test\d+@example\.com$/
    });
    console.log(`${deleteResult.deletedCount} utilisateurs supprimés`);

    // Supprimer les sondages de test
    console.log('Suppression des sondages de test...');
    const surveyDeleteResult = await Survey.deleteMany({
      title: /Sondage (Public|Privé) (Statique|Dynamique) - Test/
    });
    console.log(`${surveyDeleteResult.deletedCount} sondages statiques supprimés`);

    const dynamicSurveyDeleteResult = await DynamicSurvey.deleteMany({
      title: /Sondage (Public|Privé) (Statique|Dynamique) - Test/
    });
    console.log(`${dynamicSurveyDeleteResult.deletedCount} sondages dynamiques supprimés`);

    // Supprimer les réponses associées
    console.log('Suppression des réponses de test...');
    const answerDeleteResult = await SurveyAnswer.deleteMany({
      'respondent.userId': { $in: deleteResult.deletedIds }
    });
    console.log(`${answerDeleteResult.deletedCount} réponses statiques supprimées`);

    const dynamicAnswerDeleteResult = await DynamicSurveyAnswer.deleteMany({
      'respondent.userId': { $in: deleteResult.deletedIds }
    });
    console.log(`${dynamicAnswerDeleteResult.deletedCount} réponses dynamiques supprimées`);

    console.log('Nettoyage des données de test terminé avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors du nettoyage des données:', error);
    process.exit(1);
  }
};

// Exécuter le script
cleanTestData(); 