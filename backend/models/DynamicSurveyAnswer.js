const mongoose = require("mongoose");

const dynamicSurveyAnswerSchema = new mongoose.Schema({
  surveyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "DynamicSurvey", 
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
    nodeId: String,
    answer: mongoose.Schema.Types.Mixed,
    answeredAt: {
      type: Date,
      default: Date.now
    }
  }],
  path: [{
    nodeId: String,
    timestamp: Date
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  completionStatus: {
    type: String,
    enum: ['completed', 'partial', 'abandoned'],
    default: 'partial'
  }
});

module.exports = mongoose.model("DynamicSurveyAnswer", dynamicSurveyAnswerSchema); 