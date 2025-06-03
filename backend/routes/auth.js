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
        console.log('Existing user found with Google authentication:', user);
        
        // Si l'utilisateur existe mais utilise une méthode d'authentification différente
        if (user.authMethod !== 'google') {
          console.log('User exists but with different auth method:', user.authMethod);
          // Mettre à jour l'utilisateur pour indiquer qu'il utilise aussi Google
          // On ne change pas la méthode d'authentification principale pour éviter de perturber les connexions existantes
          
          // Mettre à jour les tokens
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
        
        // Mettre à jour les tokens si l'utilisateur existe déjà avec Google
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
        return done(new Error('No email available from GitHub'));
      }

      primaryEmail = emails[0].value;
      console.log('Primary email found:', primaryEmail);

      let user = await User.findOne({ email: primaryEmail });
      console.log('Existing user:', user);
      
      if (user) {
        console.log('Existing user found with GitHub authentication:', user);
        
        // Si l'utilisateur existe mais utilise une méthode d'authentification différente
        if (user.authMethod !== 'github') {
          console.log('User exists but with different auth method:', user.authMethod);
          // Mettre à jour l'utilisateur pour indiquer qu'il utilise aussi GitHub
          // On ne change pas la méthode d'authentification principale pour éviter de perturber les connexions existantes
          
          // Mettre à jour les tokens
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
  console.log('Redirect URI from query:', req.query.redirect_uri);
  
  // Stocker l'URI de redirection dans la session
  if (req.query.redirect_uri) {
    // Stocker dans un cookie qui sera accessible au callback
    res.cookie('redirect_uri', req.query.redirect_uri, {
      maxAge: 3600000, // 1 heure
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    console.log('Stored redirect_uri in cookie:', req.query.redirect_uri);
  }
  
  // Forcer une nouvelle session
  req.logout((err) => {
    if (err) {
      console.error('Error during logout:', err);
    }
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      prompt: 'select_account', // Force Google à afficher la page de sélection de compte
      state: req.query.redirect_uri // Passer l'URI de redirection dans l'état
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
      
      // Récupérer l'URL d'origine avec la nouvelle fonction
      const originUrl = getRedirectUrl(req);
      console.log('Origin URL for redirection:', originUrl);
      
      if (!req.user) {
        console.error('No user data in request');
        return res.redirect(`${originUrl}/oauth-callback?error=existing_user&message=Un compte existe déjà avec cet email. Veuillez utiliser votre méthode de connexion habituelle.`);
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

      // Vérifier si c'est un compte existant avec une autre méthode d'authentification
      const existingUser = req.user.authMethod !== 'google';

      const tokenData = {
        accessToken,
        refreshToken,
        existingUser,
        user: {
          id: req.user._id,
          email: req.user.email,
          username: req.user.username,
          authMethod: req.user.authMethod
        }
      };

      console.log('Redirecting with tokens:', tokenData);

      const redirectUrl = `${originUrl}/oauth-callback?tokens=${encodeURIComponent(JSON.stringify(tokenData))}`;
      console.log('Redirect URL:', redirectUrl);
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google Callback Error:', error);
      const originUrl = getRedirectUrl(req);
      res.redirect(`${originUrl}/oauth-callback?error=existing_user&message=Une erreur est survenue lors de l'authentification`);
    }
  }
);

router.get('/github', (req, res, next) => {
  console.log('GitHub Auth Route - Starting authentication');
  console.log('Redirect URI from query:', req.query.redirect_uri);
  
  // Stocker l'URI de redirection dans la session
  if (req.query.redirect_uri) {
    // Stocker dans un cookie qui sera accessible au callback
    res.cookie('redirect_uri', req.query.redirect_uri, {
      maxAge: 3600000, // 1 heure
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    console.log('Stored redirect_uri in cookie:', req.query.redirect_uri);
  }
  
  passport.authenticate('github', { 
    scope: ['user:email'],
    state: req.query.redirect_uri // Passer l'URI de redirection dans l'état
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
      
      // Récupérer l'URL d'origine avec la nouvelle fonction
      const originUrl = getRedirectUrl(req);
      console.log('Origin URL for redirection:', originUrl);
      
      if (!req.user) {
        console.error('No user data in request');
        return res.redirect(`${originUrl}/oauth-callback?error=existing_user&message=Un compte existe déjà avec cet email. Veuillez utiliser votre méthode de connexion habituelle.`);
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

      // Vérifier si c'est un compte existant avec une autre méthode d'authentification
      const existingUser = req.user.authMethod !== 'github';
      
      const tokenData = {
        accessToken,
        refreshToken,
        existingUser,
        user: {
          id: req.user._id,
          email: req.user.email,
          username: req.user.username,
          authMethod: req.user.authMethod
        }
      };

      console.log('Redirecting with tokens:', tokenData);

      const redirectUrl = `${originUrl}/oauth-callback?tokens=${encodeURIComponent(JSON.stringify(tokenData))}`;
      console.log('Redirect URL:', redirectUrl);
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('GitHub Callback Error:', error);
      const originUrl = getRedirectUrl(req);
      res.redirect(`${originUrl}/oauth-callback?error=existing_user&message=Une erreur est survenue lors de l'authentification`);
    }
  }
);

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? 'Email already used' : 'Username already used'
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

    res.status(201).json({ message: 'Registration successful! Check your email to activate your account.' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/verify-email', async (req, res) => {
  const { email, verificationCode } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found.' });

    if (user.verificationCode === parseInt(verificationCode)) {
      user.isVerified = true;
      user.verificationCode = null;
      await user.save();
      res.status(200).json({ message: 'Email verified successfully.' });
    } else {
      res.status(400).json({ message: 'Incorrect verification code.' });
    }
  } catch (error) {
    console.error('Error during verification:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/login', async (req, res) => {
  console.log('Login route hit:', req.body);
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) return res.status(400).json({ message: "Account not found" });

    // Vérifier si c'est un compte GitHub ou Google
    if (user.authMethod === 'github' || user.authMethod === 'google') {
      return res.status(400).json({ 
        error: 'existing_user',
        message: `An account already exists with this email. Please login with ${user.authMethod}.`,
        authMethod: user.authMethod,
        redirectUrl: `/oauth-callback?error=existing_user&message=An account already exists with this email. Please login with ${user.authMethod}.`
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Unverified account. Please verify your email.",
        isVerified: false
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password" });

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

    res.status(200).json({ message: 'Password updated successfully' });
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
      from: {
        email: process.env.EMAIL_FROM,
        name: 'SurveyFlow'
      },
      subject: "SurveyFlow - Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="background: linear-gradient(90deg, #6C3BFE 0%, #A259FF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: transparent; font-size: 32px; font-weight: bold;">SurveyFlow</h1>
          </div>
          <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
          <p style="color: #666; line-height: 1.5;">Hello,</p>
          <p style="color: #666; line-height: 1.5;">We received a request to reset your password for your SurveyFlow account. If you didn't make this request, you can safely ignore this email.</p>
          <p style="color: #666; line-height: 1.5;">To reset your password, click the button below:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(90deg, #6C3BFE 0%, #A259FF 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Your Password</a>
          </div>
          <p style="color: #666; line-height: 1.5;">This link will expire in 1 hour for security reasons.</p>
          <p style="color: #666; line-height: 1.5;">If the button above doesn't work, copy and paste the following link into your browser:</p>
          <p style="background-color: #f5f5f5; padding: 10px; border-radius: 3px; word-break: break-all; font-size: 14px;">${resetUrl}</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px; text-align: center;">
            <p>© ${new Date().getFullYear()} SurveyFlow. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      `,
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
        subscriptionTracking: { enable: false }
      },
      headers: {
        'X-SurveyFlow-Authentication': 'true',
        'List-Unsubscribe': `<mailto:unsubscribe@surveyflow.co?subject=unsubscribe>, <https://surveyflow.co/unsubscribe?email=${email}>`,
        'Precedence': 'Bulk'
      },
      mailSettings: {
        sandboxMode: {
          enable: false
        },
        bypassListManagement: {
          enable: true
        }
      }
    };

    await sgMail.send(msg);

    res.status(200).json({ 
      message: "The reset instructions have been sent to your email."
    });

  } catch (error) {
    console.error("Error during password reset request:", error);
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
    console.error("Error during password reset:", error);
    res.status(500).json({
      message: "An error occurred while resetting the password."
    });
  }
});

// Mise à jour de la fonction d'envoi d'email de vérification
const sendVerificationEmail = async (email, verificationCode) => {
  console.log('Attempting to send verification email to:', email);
  console.log('Verification code:', verificationCode);
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
  
  const msg = {
    to: email,
    from: {
      email: process.env.EMAIL_FROM,
      name: 'SurveyFlow'
    },
    subject: 'SurveyFlow - Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="background: linear-gradient(90deg, #6C3BFE 0%, #A259FF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: transparent; font-size: 32px; font-weight: bold;">SurveyFlow</h1>
        </div>
        <h2 style="color: #333; text-align: center;">Verify Your Email Address </h2>
        <p style="color: #666; line-height: 1.5;">Hello,</p>
        <p style="color: #666; line-height: 1.5;">Welcome to SurveyFlow! To complete your registration, please use the verification code below:</p>
        <div style="text-align: center; margin: 25px 0;">
          <h1 style="color: #6C3BFE; font-size: 36px; letter-spacing: 5px; background-color: #f5f5f5; padding: 15px; border-radius: 5px; display: inline-block;">${verificationCode}</h1>
        </div>
        <p style="color: #666; line-height: 1.5;">This code will expire in 24 hours.</p>
        <p style="color: #666; line-height: 1.5;">If you did not create an account on SurveyFlow, you can safely ignore this email.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px; text-align: center;">
          <p>© ${new Date().getFullYear()} SurveyFlow. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    `,
    trackingSettings: {
      clickTracking: { enable: false },
      openTracking: { enable: false },
      subscriptionTracking: { enable: false }
    },
    headers: {
      'X-SurveyFlow-Verification': 'true',
      'List-Unsubscribe': `<mailto:unsubscribe@surveyflow.co?subject=unsubscribe>, <https://surveyflow.co/unsubscribe?email=${email}>`,
      'Precedence': 'Bulk',
      'X-Auto-Response-Suppress': 'OOF, AutoReply'
    },
    mailSettings: {
      sandboxMode: {
        enable: false
      },
      bypassListManagement: {
        enable: true
      }
    },
    categories: ['verification']
  };

  try {
    console.log('Configuring SendGrid with API key...');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    console.log('Sending email...');
    const response = await sgMail.send(msg);
    console.log('Email sent successfully:', response);
  } catch (error) {
    console.error('Detailed error sending email:', {
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
    throw new Error('Error sending verification email');
  }
};

// Fonction utilitaire pour obtenir l'URL de redirection
const getRedirectUrl = (req) => {
  // Liste des URL candidates
  const candidateUrls = [];
  
  // 1. Essayer de récupérer l'origine depuis le cookie spécifique de redirection
  if (req.cookies?.redirect_uri) {
    candidateUrls.push(req.cookies.redirect_uri);
    console.log('Origin from redirect_uri cookie:', req.cookies.redirect_uri);
  }
  
  // 2. Récupérer depuis le paramètre state (utilisé par OAuth)
  if (req.query?.state) {
    candidateUrls.push(req.query.state);
    console.log('Origin from state parameter:', req.query.state);
  }
  
  // 3. Essayer de récupérer l'origine depuis les cookies d'origine
  if (req.cookies?.origin) {
    candidateUrls.push(req.cookies.origin);
    console.log('Origin from main cookie:', req.cookies.origin);
  }
  
  if (req.cookies?.origin_alt) {
    candidateUrls.push(req.cookies.origin_alt);
    console.log('Origin from alt cookie:', req.cookies.origin_alt);
  }
  
  // 4. Essayer de récupérer depuis d'autres sources qui pourraient provenir du frontend
  if (req.query?.redirect_uri) {
    candidateUrls.push(req.query.redirect_uri);
    console.log('Origin from query param:', req.query.redirect_uri);
  }
  
  // 5. Utiliser le referer seulement s'il n'est pas un domaine OAuth
  if (req.headers.referer) {
    try {
      const refererUrl = new URL(req.headers.referer);
      // Ne pas utiliser le referer s'il provient des domaines OAuth
      if (!refererUrl.host.includes('accounts.google.com') && 
          !refererUrl.host.includes('github.com')) {
        candidateUrls.push(`${refererUrl.protocol}//${refererUrl.host}`);
        console.log('Origin from referer:', `${refererUrl.protocol}//${refererUrl.host}`);
      } else {
        console.log('Referer is an OAuth provider domain, not using it:', refererUrl.host);
      }
    } catch (error) {
      console.error('Error parsing referer URL:', error);
    }
  }
  
  // 6. Extraire du Referer initial si disponible dans le journal de session
  if (req.headers?.referrer_log) {
    try {
      const referrerLogUrl = new URL(req.headers.referrer_log);
      candidateUrls.push(`${referrerLogUrl.protocol}//${referrerLogUrl.host}`);
      console.log('Origin from referrer log:', `${referrerLogUrl.protocol}//${referrerLogUrl.host}`);
    } catch (error) {
      console.error('Error parsing referrer log URL:', error);
    }
  }

  // 7. Extraire l'origine depuis la session si disponible
  if (req.session?.referrerOrigin) {
    candidateUrls.push(req.session.referrerOrigin);
    console.log('Origin from session referrer:', req.session.referrerOrigin);
  }
  
  // 8. Ajouter tous les URLs de Vercel Preview possibles
  // Cette partie est critique pour les déploiements de prévisualisation
  if (req.headers?.referer) {
    try {
      const refererUrl = new URL(req.headers.referer);
      
      // Capturer les URL de type surveyflow-[hash]-joeys-projects.vercel.app
      if (refererUrl.host.includes('-joeys-projects') || 
          refererUrl.host.includes('surveyflow-') ||
          refererUrl.host.includes('vercel.app')) {
        candidateUrls.push(`${refererUrl.protocol}//${refererUrl.host}`);
        console.log('Origin from Vercel preview URL:', `${refererUrl.protocol}//${refererUrl.host}`);
      }
    } catch (error) {
      console.error('Error parsing Vercel preview URL:', error);
    }
  }

  // 9. Extraire l'origine depuis User-Agent ou autres en-têtes qui pourraient contenir des indices
  if (req.headers?.['user-agent'] && req.headers['user-agent'].includes('vercel')) {
    // Essayer d'extraire un domaine vercel.app du User-Agent si présent
    const vercelMatch = req.headers['user-agent'].match(/https?:\/\/([a-zA-Z0-9-]+\.vercel\.app)/);
    if (vercelMatch && vercelMatch[0]) {
      candidateUrls.push(vercelMatch[0]);
      console.log('Origin from User-Agent:', vercelMatch[0]);
    }
  }
  
  // 10. Utiliser les URLs configurées comme fallback
  const frontendUrls = process.env.FRONTEND_URL?.split(',') || [];
  frontendUrls.forEach(url => {
    if (url && url.trim()) {
      candidateUrls.push(url.trim());
    }
  });
  
  // Ajouter les URL par défaut en dernier recours - priorité aux URL récentes de surveyflow
  candidateUrls.push('https://www.surveyflow.co'); // Nouveau domaine principal
  candidateUrls.push('https://surveyflow.co'); // Version sans www
  candidateUrls.push('https://surveyflow-iota.vercel.app'); // Ancien domaine principal
  candidateUrls.push('https://surveyflow-git-main-joeys-projects-2b62a68a.vercel.app');
  candidateUrls.push('https://surveyflow-h48jq3s6z-joeys-projects-2b62a68a.vercel.app');
  candidateUrls.push('https://surveyflow.vercel.app');
  candidateUrls.push('https://surveypro-frontend.vercel.app');
  candidateUrls.push('https://surveyflow-git-dev-joeys-projects.vercel.app');
  
  console.log('All candidate redirect URLs:', candidateUrls);
  
  // Fonction pour vérifier si une URL est valide et non issue d'un fournisseur OAuth
  const isValidRedirectUrl = (url) => {
    try {
      const parsedUrl = new URL(url);
      // Vérifier que ce n'est pas un fournisseur OAuth
      if (parsedUrl.host.includes('accounts.google.com') ||
          parsedUrl.host.includes('github.com') ||
          parsedUrl.host.includes('oauth')) {
        return false;
      }
      
      // Vérifier que c'est un domaine autorisé
      // Liste blanche de domaines: vercel.app, localhost, surveypro-ir3u.onrender.com, et les domaines personnalisés
      if (parsedUrl.host.includes('vercel.app') || 
          parsedUrl.host.includes('localhost') ||
          parsedUrl.host.includes('surveypro-ir3u.onrender.com') ||
          parsedUrl.host.includes('surveyflow.io') ||
          parsedUrl.host === 'surveyflow-iota.vercel.app' ||
          parsedUrl.host === 'surveyflow.vercel.app' ||
          parsedUrl.host === 'surveypro-frontend.vercel.app' ||
          parsedUrl.host === 'www.surveyflow.co' ||
          parsedUrl.host === 'surveyflow.co') {
        return true;
      }
      
      // Vérifier en dernier les URL de preview Vercel
      return (parsedUrl.host.includes('-joeys-projects') && parsedUrl.host.includes('vercel.app')) ||
             (parsedUrl.host.includes('surveyflow-') && parsedUrl.host.includes('vercel.app'));
    } catch (error) {
      console.error('Error validating URL:', url, error);
      return false;
    }
  };
  
  // Choisir la première URL valide qui n'est pas un fournisseur OAuth
  for (const url of candidateUrls) {
    if (url && isValidRedirectUrl(url)) {
      console.log('Selected redirect URL:', url);
      return url.trim();
    }
  }
  
  // Si aucune URL valide n'est trouvée, utiliser l'URL par défaut
  console.log('No valid URL found, using default');
  return 'https://surveyflow-iota.vercel.app'; // URL par défaut mise à jour
};

module.exports = router;