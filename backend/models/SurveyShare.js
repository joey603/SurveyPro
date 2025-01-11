const mongoose = require('mongoose');

const surveyShareSchema = new mongoose.Schema({
  surveyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey',
    required: true
  },
  sharedBy: {
    type: String,
    required: false,
    default: 'system@surveypro.com'
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
  sharedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SurveyShare', surveyShareSchema); 