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

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      done(err, null);
    });
});

// Récupérer l'URL du backend depuis les variables d'environnement ou utiliser une URL par défaut
const API_URL = process.env.API_URL || 'https://surveypro-ir3u.onrender.com';

// Configuration de Passport pour Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${API_URL}/api/auth/google/callback`
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      console.log('Google Strategy - Starting user processing');
      let user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // Mettre à jour les tokens si l'utilisateur existe
        const newAccessToken = jwt.sign(
          { id: user._id },
          process.env.JWT_SECRET,
          { expiresIn: '4h' }
        );
        const newRefreshToken = jwt.sign(
          { id: user._id },
          process.env.JWT_REFRESH_SECRET,
          { expiresIn: '7d' }
        );
        
        user.accessToken = newAccessToken;
        user.refreshToken = newRefreshToken;
        await user.save();
        
        return done(null, user);
      }

      // Pour un nouvel utilisateur
      // Créer d'abord l'utilisateur
      user = new User({
        username: profile.displayName,
        email: profile.emails[0].value,
        password: '',
        isVerified: true,
        authMethod: 'google'
      });
      
      // Sauvegarder pour obtenir l'ID
      await user.save();
      
      // Maintenant on peut générer les tokens avec l'ID
      const newAccessToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '4h' }
      );
      const newRefreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Mettre à jour l'utilisateur avec les tokens
      user.accessToken = newAccessToken;
      user.refreshToken = newRefreshToken;
      await user.save();
      
      return done(null, user);
    } catch (error) {
      console.error('Google Strategy Error:', error);
      return done(error, null);
    }
  }
));

// Configuration de Passport pour GitHub
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${API_URL}/api/auth/github/callback`,
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
      
      if (user) {
        // Mettre à jour les tokens si l'utilisateur existe
        const newAccessToken = jwt.sign(
          { id: user._id },
          process.env.JWT_SECRET,
          { expiresIn: '4h' }
        );
        const newRefreshToken = jwt.sign(
          { id: user._id },
          process.env.JWT_REFRESH_SECRET,
          { expiresIn: '7d' }
        );
        
        user.accessToken = newAccessToken;
        user.refreshToken = newRefreshToken;
        await user.save();
        
        return done(null, user);
      }

      // Pour un nouvel utilisateur
      // Créer d'abord l'utilisateur
      user = new User({
        username: profile.username || profile.displayName,
        email: primaryEmail,
        password: '',
        isVerified: true,
        authMethod: 'github'
      });
      
      // Sauvegarder pour obtenir l'ID
      await user.save();
      
      // Maintenant on peut générer les tokens avec l'ID
      const newAccessToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '4h' }
      );
      const newRefreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Mettre à jour l'utilisateur avec les tokens
      user.accessToken = newAccessToken;
      user.refreshToken = newRefreshToken;
      await user.save();
      
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
    try {
      console.log('Google Callback - Starting response handling');
      console.log('Google Callback - User:', req.user);
      
      if (!req.user) {
        console.error('No user data in request');
        return res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?error=existing_user&message=Un compte existe déjà avec cet email. Veuillez utiliser votre méthode de connexion habituelle.`);
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

      console.log('Generated tokens for user:', tokenData);
      
      // Utiliser la fonction de redirection commune
      handleOAuthCallback(req, res, tokenData);
    } catch (error) {
      console.error('Google Callback Error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?error=server_error&message=Une erreur est survenue lors de l'authentification`);
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
      console.log('GitHub Callback - Starting response handling');
      console.log('GitHub Callback - User:', req.user);
      
      if (!req.user) {
        console.error('No user data in request');
        return res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?error=existing_user&message=Un compte existe déjà avec cet email. Veuillez utiliser votre méthode de connexion habituelle.`);
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

      console.log('Generated tokens for user:', tokenData);
      
      // Utiliser la fonction de redirection commune
      handleOAuthCallback(req, res, tokenData);
    } catch (error) {
      console.error('GitHub Callback Error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?error=server_error&message=Une erreur est survenue lors de l'authentification`);
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
  console.log('Login route hit:', req.body);
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) return res.status(400).json({ message: "Compte non trouvé" });

    // Vérifier si c'est un compte GitHub ou Google
    if (user.authMethod === 'github' || user.authMethod === 'google') {
      return res.status(400).json({ 
        error: 'existing_user',
        message: `Un compte existe déjà avec cet email. Veuillez vous connecter avec ${user.authMethod}.`,
        authMethod: user.authMethod,
        redirectUrl: `/oauth-callback?error=existing_user&message=Un compte existe déjà avec cet email. Veuillez vous connecter avec ${user.authMethod}.`
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
    console.error("Error during login:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    user.accessToken = newAccessToken;
    await user.save();

    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(403).json({ message: "Invalid refresh token" });
  }
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const user = await User.findOne({ refreshToken });
    if (!user) return res.status(400).json({ message: 'User not found' });

    user.accessToken = null;
    user.refreshToken = null;
    await user.save();

    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Error in /profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'This email is already verified' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    user.verificationCode = verificationCode;
    await user.save();

    await sendVerificationEmail(email, verificationCode);

    res.status(200).json({ message: 'A new verification code has been sent' });
  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ message: 'Error sending new verification code' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({ 
        message: "If an account exists with this email, you will receive the reset instructions."
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
          ">Reset password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request this reset, ignore this email.</p>
        </div>
      `
    };

    await sgMail.send(msg);

    res.status(200).json({ 
      message: "The reset instructions have been sent to your email."
    });

  } catch (error) {
    console.error("Erreur lors de la demande de réinitialisation:", error);
    res.status(500).json({ message: "An error occurred while sending the reset instructions." });
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
        message: "The reset link is invalid or has expired."
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      message: "The password has been reset successfully."
    });

  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    res.status(500).json({
      message: "An error occurred while resetting the password."
    });
  }
});

// Ajouter cette fonction avant les routes
const sendVerificationEmail = async (email, verificationCode) => {
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM,
    subject: 'Vérification de votre compte SurveyPro',
    html: `
      <div style="text-align: center; font-family: Arial, sans-serif;">
        <h2>Welcome to SurveyPro !</h2>
        <p>Your verification code is :</p>
        <h1 style="
          color: #4a90e2;
          font-size: 36px;
          margin: 20px 0;
          letter-spacing: 5px;
        ">${verificationCode}</h1>
        <p>This code will expire in 24 hours.</p>
        <p>If you did not create an account on SurveyFlow, you can ignore this email.</p>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Error sending verification email');
  }
};

// Import la fonction de gestion de callback OAuth en haut du fichier
const handleOAuthCallback = (req, res, tokens) => {
  console.log('OAuth successful. Tokens:', tokens);
  
  // Récupérer le domaine d'origine de la requête depuis le cookie
  const originUrl = req.cookies?.origin;
  console.log('Origin from cookie:', originUrl);
  
  // Déterminer l'URL de redirection frontale en fonction de l'environnement
  let clientRedirectUrl;
  
  if (originUrl) {
    // Si l'origine est définie dans un cookie, l'utiliser
    clientRedirectUrl = `${originUrl}/oauth-callback`;
    console.log('Using origin from cookie for redirect:', clientRedirectUrl);
  } else if (process.env.NODE_ENV === 'production') {
    // En production, utiliser les URLs de Vercel configurées
    const possibleFrontendUrls = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',') 
      : ['https://surveyflow.vercel.app'];
    
    // Utiliser la première URL configurée
    clientRedirectUrl = `${possibleFrontendUrls[0]}/oauth-callback`;
    console.log('Using configured FRONTEND_URL for redirect:', clientRedirectUrl);
  } else {
    // En développement, utiliser localhost
    clientRedirectUrl = 'http://localhost:3000/oauth-callback';
    console.log('Using localhost for redirect:', clientRedirectUrl);
  }
  
  // Créer la chaîne URL encodée des tokens
  const encodedTokens = encodeURIComponent(JSON.stringify(tokens));
  
  // Construire l'URL de redirection complète
  const redirectUrl = `${clientRedirectUrl}?tokens=${encodedTokens}`;
  console.log('Final redirect URL:', redirectUrl);
  
  // Rediriger l'utilisateur vers l'application frontale
  res.redirect(redirectUrl);
};

module.exports = router;