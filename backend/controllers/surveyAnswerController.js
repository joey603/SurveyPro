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
