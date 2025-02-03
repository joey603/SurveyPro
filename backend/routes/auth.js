const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();
const sgMail = require('@sendgrid/mail');
const authMiddleware = require('../middleware/auth');

// Configuration de Passport pour la sérialisation
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Configuration de Passport pour Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `http://localhost:5041/api/auth/google/callback`
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      console.log('Google Strategy - Starting user processing');
      let user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        console.log('User found:', user);
        if (user.authMethod && user.authMethod !== 'google') {
          console.log('User exists with different auth method:', user.authMethod);
          const errorMessage = `Un compte existe déjà avec cet email. Veuillez vous connecter avec ${user.authMethod}.`;
          console.log('Sending error message:', errorMessage);
          return done(null, false, { message: errorMessage });
        }
        return done(null, user);
      }

      // Créer un nouveau compte si l'utilisateur n'existe pas
      user = new User({
        username: profile.displayName,
        email: profile.emails[0].value,
        password: '',
        isVerified: true,
        authMethod: 'google'  // Ajouter une indication de la méthode d'auth
      });
      await user.save();
      
      return done(null, user);
    } catch (error) {
      console.error('Detailed Google Strategy Error:', error);
      return done(error, null);
    }
  }
));

// Configuration de Passport pour GitHub
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:5041/api/auth/github/callback",
    scope: ['user:email']
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      console.log('GitHub Strategy - Starting user processing');
      const emails = profile.emails;
      let primaryEmail;
      
      if (!emails || emails.length === 0) {
        console.error('No emails available from GitHub');
        return done(new Error('Aucun email disponible depuis GitHub'));
      }

      primaryEmail = emails[0].value;
      console.log('Primary email found:', primaryEmail);

      let user = await User.findOne({ email: primaryEmail });
      console.log('Existing user:', user);
      
      if (!user) {
        // Créer un nouvel utilisateur
        console.log('Creating new user');
        user = new User({
          username: profile.username || profile.displayName,
          email: primaryEmail,
          password: '', // Pas de mot de passe pour l'auth GitHub
          isVerified: true,
          authMethod: 'github'
        });
        await user.save();
        console.log('New user created:', user);
      } else if (user.authMethod !== 'github') {
        console.log('User exists with different auth method');
        return done(null, false, { 
          message: 'Un compte existe déjà avec cet email. Veuillez vous connecter avec votre méthode habituelle.' 
        });
      }
      
      console.log('Authentication successful, returning user');
      return done(null, user);
    } catch (error) {
      console.error('GitHub Strategy Error:', error);
      return done(error, null);
    }
  }
));

router.use(passport.initialize());

router.get('/google', (req, res, next) => {
  console.log('Google Auth Route - Starting authentication');
  // Forcer une nouvelle session
  req.logout((err) => {
    if (err) {
      console.error('Erreur lors de la déconnexion:', err);
    }
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      prompt: 'select_account' // Force Google à afficher la page de sélection de compte
    })(req, res, next);
  });
});

router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/oauth-callback?error=existing_user&message=Un compte existe déjà avec cet email. Veuillez utiliser votre méthode de connexion habituelle.`,
    failureMessage: true
  }),
  async (req, res) => {
    console.log('Google Callback - Starting response handling');
    try {
      console.log('Google Callback - User:', req.user);
      
      if (!req.user) {
        console.error('No user data in request');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_user_data`);
      }

      const accessToken = jwt.sign(
        { 
          id: req.user._id,
          email: req.user.email,
          username: req.user.username
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '4h' }
      );
      
      const refreshToken = jwt.sign(
        { id: req.user._id }, 
        process.env.JWT_REFRESH_SECRET, 
        { expiresIn: '7d' }
      );

      const tokenData = {
        accessToken,
        refreshToken,
        user: {
          id: req.user._id,
          email: req.user.email,
          username: req.user.username
        }
      };

      console.log('Redirecting with tokens:', tokenData);

      const redirectUrl = `${process.env.FRONTEND_URL}/oauth-callback?tokens=${encodeURIComponent(JSON.stringify(tokenData))}`;
      console.log('Redirect URL:', redirectUrl);
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Detailed Google Callback Error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
    }
  }
);

router.get('/github', (req, res, next) => {
  console.log('GitHub Auth Route - Starting authentication');
  passport.authenticate('github', { 
    scope: ['user:email']
  })(req, res, next);
});

router.get('/github/callback',
  passport.authenticate('github', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/oauth-callback?error=existing_user&message=Un compte existe déjà avec cet email. Veuillez utiliser votre méthode de connexion habituelle.`,
    failureMessage: true
  }),
  async (req, res) => {
    try {
      console.log('GitHub Callback - User:', req.user);
      
      if (!req.user) {
        console.error('No user data in request');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_user_data`);
      }

      const accessToken = jwt.sign(
        { 
          id: req.user._id,
          email: req.user.email,
          username: req.user.username
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '4h' }
      );
      
      const refreshToken = jwt.sign(
        { id: req.user._id }, 
        process.env.JWT_REFRESH_SECRET, 
        { expiresIn: '7d' }
      );

      const tokenData = {
        accessToken,
        refreshToken,
        user: {
          id: req.user._id,
          email: req.user.email,
          username: req.user.username
        }
      };

      console.log('Redirecting with tokens:', tokenData);

      const redirectUrl = `${process.env.FRONTEND_URL}/oauth-callback?tokens=${encodeURIComponent(JSON.stringify(tokenData))}`;
      console.log('Redirect URL:', redirectUrl);
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('GitHub Callback Error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
    }
  }
);

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? 'Email déjà utilisé' : 'Nom d\'utilisateur déjà utilisé'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      verificationCode,
      isVerified: false
    });
    await newUser.save();

    await sendVerificationEmail(email, verificationCode);

    res.status(201).json({ message: 'Inscription réussie ! Vérifiez votre e-mail pour activer votre compte.' });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

router.post('/verify-email', async (req, res) => {
  const { email, verificationCode } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Utilisateur non trouvé.' });

    if (user.verificationCode === parseInt(verificationCode)) {
      user.isVerified = true;
      user.verificationCode = null;
      await user.save();
      res.status(200).json({ message: 'Email vérifié avec succès.' });
    } else {
      res.status(400).json({ message: 'Code de vérification incorrect.' });
    }
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    res.status(500).json({ message: 'Erreur du serveur.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) return res.status(400).json({ message: "Compte non trouvé" });

    // Vérifier si c'est un compte GitHub ou Google
    if (user.authMethod === 'github' || user.authMethod === 'google') {
      return res.status(400).json({ 
        message: `Ce compte utilise l'authentification ${user.authMethod}. Veuillez vous connecter avec ${user.authMethod}.`,
        authMethod: user.authMethod 
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Compte non vérifié. Veuillez vérifier votre email.",
        isVerified: false
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect" });

    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "4h" });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

    user.accessToken = accessToken;
    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({ accessToken, refreshToken, isVerified: true });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    res.status(500).json({ message: "Erreur du serveur" });
  }
});

router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: "Token de rafraîchissement manquant" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Token de rafraîchissement invalide" });
    }

    const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    user.accessToken = newAccessToken;
    await user.save();

    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Erreur lors du rafraîchissement du token:", error);
    res.status(403).json({ message: "Token de rafraîchissement invalide" });
  }
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const user = await User.findOne({ refreshToken });
    if (!user) return res.status(400).json({ message: 'Utilisateur non trouvé' });

    user.accessToken = null;
    user.refreshToken = null;
    await user.save();

    res.status(200).json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Erreur dans /profile:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Cet email est déjà vérifié' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    user.verificationCode = verificationCode;
    await user.save();

    await sendVerificationEmail(email, verificationCode);

    res.status(200).json({ message: 'Un nouveau code de vérification a été envoyé' });
  } catch (error) {
    console.error('Erreur lors du renvoi du code:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi du nouveau code' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({ 
        message: "Si un compte existe avec cet email, vous recevrez les instructions de réinitialisation."
      });
    }

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const msg = {
      to: email,
      from: process.env.EMAIL_FROM,
      subject: "Réinitialisation de mot de passe",
      html: `
        <div style="text-align: center; font-family: Arial, sans-serif;">
          <h2>Demande de réinitialisation de mot de passe</h2>
          <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
          <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
          <a href="${resetUrl}" style="
            background-color: #4a90e2;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin: 20px 0;
          ">Réinitialiser le mot de passe</a>
          <p>Ce lien expirera dans 1 heure.</p>
          <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        </div>
      `
    };

    await sgMail.send(msg);

    res.status(200).json({ 
      message: "Les instructions de réinitialisation ont été envoyées à votre email."
    });

  } catch (error) {
    console.error("Erreur lors de la demande de réinitialisation:", error);
    res.status(500).json({ message: "Une erreur est survenue lors de l'envoi des instructions." });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: "Le lien de réinitialisation est invalide ou a expiré."
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      message: "Le mot de passe a été réinitialisé avec succès."
    });

  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    res.status(500).json({
      message: "Une erreur est survenue lors de la réinitialisation du mot de passe."
    });
  }
});

module.exports = router;