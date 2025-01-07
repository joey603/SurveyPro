const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verificationCode: { type: Number }, // Code de vérification par e-mail
  isVerified: { type: Boolean, default: false }, // Indique si l'utilisateur a vérifié son e-mail
  accessToken: { type: String }, // Token d'accès
  refreshToken: { type: String }, // Token de rafraîchissement
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

module.exports = mongoose.model('User', userSchema);
