const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true }, // Identifiant unique
  type: { type: String, required: true }, // Type de question
  text: { type: String, required: true }, // Texte de la question
  options: { type: [String], default: [] }, // Options pour les questions multiples
  media: { 
    url: { type: String, default: null }, // URL du fichier média
    type: { type: String, enum: ["image", "video", null], default: null } // Type de média
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
