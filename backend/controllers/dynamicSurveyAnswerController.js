const DynamicSurveyAnswer = require("../models/DynamicSurveyAnswer");
const DynamicSurvey = require("../models/DynamicSurvey");

exports.submitDynamicSurveyAnswer = async (req, res) => {
  try {
    const { surveyId, answers, demographic, path } = req.body;
    
    // Vérifier si le sondage existe
    const survey = await DynamicSurvey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ message: "Sondage non trouvé" });
    }

    // Créer la réponse
    const surveyAnswer = new DynamicSurveyAnswer({
      surveyId,
      respondent: {
        userId: req.user?.id,
        demographic: survey.demographicEnabled ? demographic : undefined
      },
      answers: answers.map(answer => ({
        nodeId: answer.nodeId,
        answer: answer.value
      })),
      path: path.map(node => ({
        nodeId: node.id,
        timestamp: new Date()
      })),
      completionStatus: 'completed'
    });

    await surveyAnswer.save();
    res.status(201).json({ 
      message: "Réponse au sondage enregistrée avec succès",
      surveyAnswer 
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la réponse:", error);
    res.status(500).json({ 
      message: "Erreur lors de l'enregistrement de la réponse", 
      error: error.message 
    });
  }
};

exports.getDynamicSurveyAnswers = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const answers = await DynamicSurveyAnswer.find({ surveyId })
      .populate('respondent.userId', 'username email')
      .select('-__v')
      .sort({ submittedAt: -1 });
    
    res.status(200).json(answers);
  } catch (error) {
    console.error("Erreur lors de la récupération des réponses:", error);
    res.status(500).json({ 
      message: "Erreur lors de la récupération des réponses", 
      error: error.message 
    });
  }
};

exports.getUserDynamicSurveyResponses = async (req, res) => {
  try {
    const userId = req.user.id;
    const responses = await DynamicSurveyAnswer.find({
      'respondent.userId': userId
    })
    .populate({
      path: 'surveyId',
      select: 'title description'
    })
    .sort({ submittedAt: -1 });

    const formattedResponses = responses
      .filter(response => response.surveyId)
      .map(response => ({
        _id: response._id,
        surveyId: response.surveyId._id,
        surveyTitle: response.surveyId.title,
        completedAt: response.submittedAt,
        demographic: response.respondent.demographic,
        answers: response.answers,
        path: response.path,
        completionStatus: response.completionStatus
      }));

    res.status(200).json(formattedResponses);
  } catch (error) {
    console.error("Erreur lors de la récupération des réponses:", error);
    res.status(500).json({ 
      message: "Erreur lors de la récupération des réponses", 
      error: error.message 
    });
  }
};

exports.getDynamicSurveyResponseById = async (req, res) => {
  try {
    const { responseId } = req.params;
    const userId = req.user.id;

    const response = await DynamicSurveyAnswer.findOne({
      _id: responseId,
      'respondent.userId': userId
    })
    .populate({
      path: 'surveyId',
      select: 'title description nodes edges'
    });

    if (!response) {
      return res.status(404).json({ message: "Réponse non trouvée" });
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Erreur lors de la récupération de la réponse:", error);
    res.status(500).json({ 
      message: "Erreur lors de la récupération de la réponse", 
      error: error.message 
    });
  }
}; 