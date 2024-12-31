//models/Survey.js

const mongoose = require("mongoose");

const surveySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  questions: [{
    id: {
      type: String,
      required: true
    },
    text: {
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
        'slider',
        'rating',
        'yes-no',
        'date',
        'file-upload',
        'color-picker'
      ]
    },
    options: [String],
    media: {
      url: String,
      type: String,
      public_id: String
    }
  }],
  demographicEnabled: {
    type: Boolean,
    default: false
  },
  demographicData: {
    gender: String,
    dateOfBirth: Date,
    educationLevel: String,
    city: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Survey', surveySchema);
