const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true, match: /^[a-zA-Z0-9-_]+$/ }, // Regex for valid IDs
  type: {
    type: String,
    required: true,
    enum: ["multiple-choice", "text", "dropdown", "slider", "rating", "yes-no"],
  },
  text: { type: String, required: true },
  options: { type: [String], default: [] },
  media: { type: String, default: "" },
});

const demographicSchema = new mongoose.Schema({
  gender: { type: String, enum: ["male", "female", "other"] },
  dateOfBirth: { type: Date },
  educationLevel: { type: String },
  city: { type: String },
});

const surveySchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: { type: [questionSchema], required: true },
  demographicEnabled: { type: Boolean, default: false },
  demographicData: demographicSchema,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

module.exports = mongoose.model("Survey", surveySchema);
