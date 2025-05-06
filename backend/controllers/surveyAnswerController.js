const SurveyAnswer = require("../models/SurveyAnswer");
const Survey = require("../models/Survey");

exports.submitSurveyAnswer = async (req, res) => {
  try {
    const { surveyId, answers, demographic } = req.body;
    
    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ message: "Survey not found" });
    }

    const surveyAnswer = new SurveyAnswer({
      surveyId,
      respondent: {
        userId: req.user?.id,
        demographic: survey.demographicEnabled ? {
          gender: demographic?.gender,
          dateOfBirth: demographic?.dateOfBirth,
          educationLevel: demographic?.educationLevel,
          city: demographic?.city
        } : undefined
      },
      answers: answers.map(answer => ({
        questionId: answer.questionId,
        answer: answer.value
      }))
    });

    await surveyAnswer.save();
    res.status(201).json({ 
      message: "Survey answer submitted successfully",
      surveyAnswer 
    });
  } catch (error) {
    console.error("Error submitting survey answer:", error);
    res.status(500).json({ 
      message: "Error submitting survey answer", 
      error: error.message 
    });
  }
};

exports.getSurveyAnswers = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const answers = await SurveyAnswer.find({ surveyId })
      .populate('respondent.userId', 'username email')
      .select('-__v');
    
    res.status(200).json(answers);
  } catch (error) {
    console.error("Error fetching survey answers:", error);
    res.status(500).json({ message: "Error fetching survey answers", error: error.message });
  }
};

exports.getUserSurveyResponses = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Recherche des réponses pour l'utilisateur:", userId);

    const responses = await SurveyAnswer.find({
      'respondent.userId': userId
    })
    .populate({
      path: 'surveyId',
      select: 'title'
    })
    .sort({ submittedAt: -1 });

    console.log("Réponses récupérées:", responses.length);

    const formattedResponses = responses
      .filter(response => response.surveyId)
      .map(response => ({
        _id: response._id,
        surveyId: response.surveyId._id,
        surveyTitle: response.surveyId.title || "Sondage supprimé",
        completedAt: response.submittedAt,
        demographic: response.respondent.demographic,
        answers: response.answers
    }));

    console.log("Réponses formatées:", formattedResponses.length);
    res.status(200).json(formattedResponses);
  } catch (error) {
    console.error("Erreur détaillée lors de la récupération des réponses:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ 
      message: "Erreur lors de la récupération des réponses aux sondages", 
      error: error.message 
    });
  }
};

exports.getUserSurveyResponseById = async (req, res) => {
  try {
    const { responseId } = req.params;
    const userId = req.user.id;
    console.log("Recherche de la réponse:", responseId, "pour l'utilisateur:", userId);

    const response = await SurveyAnswer.findOne({
      _id: responseId,
      'respondent.userId': userId
    })
    .populate({
      path: 'surveyId',
      select: 'title questions'
    });

    if (!response) {
      console.log("Aucune réponse trouvée pour ces critères");
      return res.status(404).json({ message: "Réponse non trouvée" });
    }

    if (!response.surveyId) {
      console.log("Le sondage associé n'existe plus");
      return res.status(404).json({ message: "Le sondage associé n'existe plus" });
    }

    const formattedResponse = {
      _id: response._id,
      surveyId: response.surveyId._id,
      surveyTitle: response.surveyId.title,
      completedAt: response.submittedAt,
      demographic: response.respondent.demographic,
      answers: response.answers,
      questions: response.surveyId.questions
    };

    console.log("Réponse formatée avec succès");
    res.status(200).json(formattedResponse);
  } catch (error) {
    console.error("Erreur détaillée lors de la récupération de la réponse:", {
      message: error.message,
      stack: error.stack,
      responseId: req.params.responseId,
      userId: req.user?.id
    });
    res.status(500).json({ 
      message: "Erreur lors de la récupération de la réponse au sondage", 
      error: error.message 
    });
  }
};

exports.getLastDemographicData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Rechercher la dernière réponse avec des données démographiques
    const lastAnswer = await SurveyAnswer.findOne({
      'respondent.userId': userId,
      'respondent.demographic': { $exists: true, $ne: null }
    })
    .sort({ submittedAt: -1 })
    .select('respondent.demographic');

    if (!lastAnswer || !lastAnswer.respondent.demographic) {
      return res.status(404).json({ message: "Aucune donnée démographique trouvée" });
    }

    res.status(200).json(lastAnswer.respondent.demographic);
  } catch (error) {
    console.error("Erreur lors de la récupération des données démographiques:", error);
    res.status(500).json({ 
      message: "Erreur lors de la récupération des données démographiques", 
      error: error.message 
    });
  }
};