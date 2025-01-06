const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();
const sgMail = require('@sendgrid/mail');
console.log('SendGrid API Key being used:', process.env.SENDGRID_API_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const authMiddleware = require('../middleware/authMiddleware'); // Import du middleware
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Fonction pour convertir l'image en base64
const getLogoAsBase64 = () => {
  try {
    const logoPath = path.join(__dirname, '..', 'images', 'logo-wide.png');
    console.log('Logo path:', logoPath); // Pour déboguer le chemin
    const logoBuffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error reading logo file:', error);
    return ''; // Retourne une chaîne vide si l'image n'est pas trouvée
  }
};

// Fonction pour envoyer un e-mail de vérification
const sendVerificationEmail = async (email, verificationCode) => {
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM,
    subject: 'Your Verification Code',
    text: `Your verification code is: ${verificationCode}`,
    html: `
      <div style="text-align: center; font-family: Arial, sans-serif;">
        <div style="margin-bottom: 30px;">
          <h1 style="color: #4a90e2; font-size: 32px; font-weight: bold;">SurveyPro</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 5px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #333;">Your Verification Code</h2>
          <p style="font-size: 32px; font-weight: bold; color: #4a90e2; margin: 20px 0; letter-spacing: 3px;">
            ${verificationCode}
          </p>
          <p style="color: #666; margin-top: 20px;">
            This code will expire in 1 hour. If you didn't request this code, please ignore this email.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Email sending error:', error.response?.body || error.message);
    throw new Error('Failed to send verification email');
  }
};

// Route d'inscription
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Vérifier si l'utilisateur ou l'email existe déjà
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email
          ? 'Email déjà utilisé.'
          : 'Nom d’utilisateur déjà utilisé.',
      });
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Générer un code de vérification
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    // Créer et enregistrer l'utilisateur
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      verificationCode,
      isVerified: false,
    });
    await newUser.save();

    // Envoyer le code de vérification par e-mail
    await sendVerificationEmail(email, verificationCode);

    res.status(201).json({ message: 'Inscription réussie ! Vérifiez votre e-mail pour activer votre compte.' });
  } catch (error) {
    console.error('Erreur lors de l’inscription :', error);
    res.status(500).json({ message: 'Erreur du serveur.' });
  }
});

// Route de vérification d'e-mail
router.post('/verify-email', async (req, res) => {
  const { email, verificationCode } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Utilisateur non trouvé.' });

    if (user.verificationCode === parseInt(verificationCode)) {
      user.isVerified = true;
      user.verificationCode = null; // Clear the code
      await user.save();
      res.status(200).json({ message: 'Email vérifié avec succès.' });
    } else {
      res.status(400).json({ message: 'Code de vérification incorrect.' });
    }
  } catch (error) {
    console.error('Erreur lors de la vérification de l’e-mail :', error.message);
    res.status(500).json({ message: 'Erreur du serveur.' });
  }
});

// Route de connexion
router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
  
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: 'Account not found' });
  
      // Ajouter le statut de vérification dans la réponse
      const isVerified = user.isVerified;
      if (!isVerified) {
        return res.status(403).json({
          message: 'Account not verified. Please verify your email.',
          isVerified,
        });
      }
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Wrong password' });
  
      const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '4h' });
      const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  
      // Mettre à jour les tokens dans la base de données
      user.accessToken = accessToken;
      user.refreshToken = refreshToken;
      await user.save();
  
      // Inclure le statut `isVerified` dans la réponse
      res.status(200).json({ accessToken, refreshToken, isVerified });
    } catch (error) {
      console.error('Erreur lors de la connexion :', error);
      res.status(500).json({ message: 'Erreur du serveur.' });
    }
  });
  

// Route de rafraîchissement du token
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(401).json({ message: 'Token de rafraîchissement manquant.' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Token de rafraîchissement invalide.' });
    }

    const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.accessToken = newAccessToken;
    await user.save();

    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Erreur lors du rafraîchissement du token :', error.message);
    res.status(403).json({ message: 'Token de rafraîchissement invalide.' });
  }
});

// Route de déconnexion
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const user = await User.findOne({ refreshToken });
    if (!user) return res.status(400).json({ message: 'Utilisateur non trouvé.' });

    user.accessToken = null;
    user.refreshToken = null;
    await user.save();

    res.status(200).json({ message: 'Déconnexion réussie.' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion :', error.message);
    res.status(500).json({ message: 'Erreur du serveur.' });
  }
});

// Route pour le profil utilisateur
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Erreur dans /profile :', error);
    res.status(500).json({ message: 'Erreur du serveur.' });
  }
});

// Route pour changer le mot de passe
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Vérifier l'ancien mot de passe
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect.' });
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Mot de passe mis à jour avec succès.' });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ message: 'Erreur du serveur.' });
  }
});

// Nouvelle route pour renvoyer le code de vérification
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Vérifier si l'utilisateur n'est pas déjà vérifié
    if (user.isVerified) {
      return res.status(400).json({ message: 'Cet email est déjà vérifié.' });
    }

    // Générer un nouveau code de vérification
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    
    // Mettre à jour le code de vérification dans la base de données
    user.verificationCode = verificationCode;
    await user.save();

    // Envoyer le nouveau code par email
    await sendVerificationEmail(email, verificationCode);

    res.status(200).json({ message: 'Un nouveau code de vérification a été envoyé.' });
  } catch (error) {
    console.error('Erreur lors du renvoi du code :', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi du nouveau code.' });
  }
});

module.exports = router;