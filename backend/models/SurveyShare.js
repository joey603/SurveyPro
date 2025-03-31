const mongoose = require('mongoose');

const surveyShareSchema = new mongoose.Schema({
  surveyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  surveyModel: {
    type: String,
    enum: ['Survey', 'DynamicSurvey'],
    default: 'Survey'
  },
  sharedBy: {
    type: String,
    required: true
  },
  sharedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SurveyShare', surveyShareSchema); 