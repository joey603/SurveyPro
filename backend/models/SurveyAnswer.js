const mongoose = require("mongoose");

const surveyAnswerSchema = new mongoose.Schema({
  surveyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Survey", 
    required: true 
  },
  respondent: {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    demographic: {
      gender: String,
      dateOfBirth: Date,
      educationLevel: String,
      city: String
    }
  },
  answers: [{
    questionId: String,
    answer: mongoose.Schema.Types.Mixed
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("SurveyAnswer", surveyAnswerSchema);
