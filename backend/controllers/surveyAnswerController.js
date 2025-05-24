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
    console.log("Searching for responses for user:", userId);

    const responses = await SurveyAnswer.find({
      'respondent.userId': userId
    })
    .populate({
      path: 'surveyId',
      select: 'title'
    })
    .sort({ submittedAt: -1 });

    console.log("Responses retrieved:", responses.length);

    const formattedResponses = responses
      .filter(response => response.surveyId)
      .map(response => ({
        _id: response._id,
        surveyId: response.surveyId._id,
        surveyTitle: response.surveyId.title || "Survey deleted",
        completedAt: response.submittedAt,
        demographic: response.respondent.demographic,
        answers: response.answers
    }));

    console.log("Formatted responses:", formattedResponses.length);
    res.status(200).json(formattedResponses);
  } catch (error) {
    console.error("Error when retrieving survey responses:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ 
      message: "Error when retrieving survey responses", 
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
      console.log("No response found for these criteria");
      return res.status(404).json({ message: "Response not found" });
    }

    if (!response.surveyId) {
      console.log("The associated survey does not exist");
      return res.status(404).json({ message: "The associated survey does not exist" });
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

    console.log("Response formatted successfully");
    res.status(200).json(formattedResponse);
  } catch (error) {
    console.error("Error when retrieving the survey response:", {
      message: error.message,
      stack: error.stack,
      responseId: req.params.responseId,
      userId: req.user?.id
    });
    res.status(500).json({ 
      message: "Error when retrieving the survey response", 
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
      return res.status(404).json({ message: "No demographic data found" });
    }

    res.status(200).json(lastAnswer.respondent.demographic);
  } catch (error) {
    console.error("Error when retrieving demographic data:", error);
    res.status(500).json({ 
      message: "Error when retrieving demographic data", 
      error: error.message 
    });
  }
};