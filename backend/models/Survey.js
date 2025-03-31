//models/Survey.js

const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'multiple-choice',
      'text',
      'dropdown',
      'yes-no',
      'slider',
      'rating',
      'date',
      'file-upload',
      'color-picker'
    ]
  },
  text: {
    type: String,
    required: true
  },
  options: [String],
  media: String,
  selectedDate: Date
});

const surveySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  isPrivate: {
    type: Boolean,
    default: false
  },
  privateLink: {
    type: String,
    sparse: true
  },
  demographicEnabled: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'active'],
    default: 'active'
  },
  questions: [questionSchema],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  }]
});

module.exports = mongoose.model('Survey', surveySchema);
