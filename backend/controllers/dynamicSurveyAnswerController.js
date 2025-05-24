const DynamicSurveyAnswer = require("../models/DynamicSurveyAnswer");
const DynamicSurvey = require("../models/DynamicSurvey");

exports.submitDynamicSurveyAnswer = async (req, res) => {
  try {
    const { surveyId, answers, demographic, path } = req.body;
    
    // Vérifier si le sondage existe
    const survey = await DynamicSurvey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ message: "Survey not found" });
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
      message: "Survey answer saved successfully",
      surveyAnswer 
    });
  } catch (error) {
    console.error("Error when saving the answer:", error);
    res.status(500).json({ 
      message: "Error when saving the answer", 
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
    console.error("Error when retrieving the responses:", error);
    res.status(500).json({ 
      message: "Error when retrieving the responses", 
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
    console.error("Error when retrieving the responses:", error);
    res.status(500).json({ 
      message: "Error when retrieving the responses", 
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
      return res.status(404).json({ message: "Response not found" });
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error when retrieving the response:", error);
    res.status(500).json({ 
      message: "Error when retrieving the response", 
      error: error.message 
    });
  }
}; 