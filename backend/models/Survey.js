// models/Survey.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  text: { type: String, required: true },
  options: [String],
  mediaUrl: String, // For media stored in Cloudinary
});

const demographicSchema = new mongoose.Schema({
  gender: { type: String },
  dateOfBirth: { type: Date },
  educationLevel: { type: String },
  city: { type: String },
});

const surveySchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: [questionSchema],
  demographicEnabled: { type: Boolean, default: false },
  demographicData: demographicSchema,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Survey', surveySchema);
