//models/Survey.js

const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  text: { type: String, required: true },
  options: { type: [String], default: [] },
  media: { 
    url: { type: String, default: null },
    type: { type: String, enum: ["image", "video", null], default: null },
    public_id: { type: String, default: null }, // Ajout du public_id
  },
});

const surveySchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: { type: [questionSchema], required: true },
  demographicEnabled: { type: Boolean, default: false },
  demographicData: { type: Object, default: {} },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = mongoose.model("Survey", surveySchema);
