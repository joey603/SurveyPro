const mongoose = require("mongoose");

const nodeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    required: true,
    mediaUrl: String,
    media: String,
  },
  position: {
    x: Number,
    y: Number
  }
});

const edgeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true
  },
  target: {
    type: String,
    required: true
  },
  label: String,
  type: String
});

const dynamicSurveySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  demographicEnabled: {
    type: Boolean,
    default: false
  },
  nodes: [nodeSchema],
  edges: [edgeSchema],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

module.exports = mongoose.model('DynamicSurvey', dynamicSurveySchema); 