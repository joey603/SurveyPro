'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { useRouter } from 'next/navigation';
import { colors } from '../../theme/colors';
import {
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Container,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import axios from 'axios';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import Link from 'next/link';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle, loginWithGithub } = useAuth();
  const router = useRouter();

  const validateEmail = (value: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!value) {
      return "L'email est requis";
    }
    if (!emailRegex.test(value)) {
      return "Format d'email invalide";
    }
    return "";
  };

  const validatePassword = (value: string) => {
    if (!value) {
      return "Le mot de passe est requis";
    }
    if (value.length < 4) {
      return "Le mot de passe doit contenir au moins 4 caractères";
    }
    return "";
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setEmailError(validateEmail(newEmail));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordError(validatePassword(newPassword));
  };

  useEffect(() => {
    console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
  }, []);

  const handleFormValidation = () => {
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    setEmailError(emailValidation);
    setPasswordError(passwordValidation);

    return !emailValidation && !passwordValidation;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation du formulaire
    if (!handleFormValidation()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Utiliser un chemin relatif en production pour bénéficier des rewrites Vercel
      const apiPath = process.env.NODE_ENV === 'production' 
        ? '/api/auth/login' 
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041'}/api/auth/login`;
      
      console.log('API Path for login:', apiPath);
      
      const response = await axios.post(apiPath, {
        email,
        password,
      });

      if (response.status === 200 && response.data) {
        setError('');
        
        // Stocker le token dans le localStorage et rediriger
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        await onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Erreur de connexion:', err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Erreur lors de la connexion. Veuillez réessayer.');
      }
      
      setIsLoading(false);
    }
  };

  const onLoginSuccess = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (token) {
        login(token, localStorage.getItem('refreshToken') || '');
      }
      
      console.log('Redirection vers la page d\'accueil...');
      router.push('/');
    } catch (error) {
      console.error('Erreur lors de la redirection:', error);
      setError('Erreur lors de la redirection.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    try {
      console.log('Début de la connexion Google');
      
      // Nettoyer le localStorage
      localStorage.clear();
      console.log('localStorage nettoyé');
      
      // Utiliser la fonction de service pour la connexion Google
      loginWithGoogle();
    } catch (error) {
      console.error('Erreur lors de la connexion Google:', error);
    }
  };

  const handleGithubLogin = () => {
    try {
      console.log('Début de la connexion GitHub');
      
      // Nettoyer le localStorage
      localStorage.clear();
      console.log('localStorage nettoyé');
      
      // Utiliser la fonction de service pour la connexion GitHub
      loginWithGithub();
    } catch (error) {
      console.error('Erreur lors de la connexion GitHub:', error);
    }
  };

  useEffect(() => {
    // Récupérer le paramètre d'erreur de l'URL
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    
    if (errorParam === 'existing_user') {
      setError('Un compte existe déjà avec cet email. Veuillez utiliser votre méthode de connexion habituelle.');
    }
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Partie gauche avec l'image */}
      <Box
        sx={{
          width: '50%',
          background: `url('/images/login.avif')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: { xs: 'none', md: 'block' },
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.background.overlay,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 4,
            color: colors.text.light,
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: 700, marginBottom: 2 }}>
            Welcome
          </Typography>
          <Typography variant="h6" sx={{ textAlign: 'center', maxWidth: '80%' }}>
            Log in to access your personal space
          </Typography>
        </Box>
      </Box>

      {/* Partie droite avec le formulaire */}
      <Box
        sx={{
          width: { xs: '100%', md: '50%' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: colors.background.paper,
          padding: 4,
          overflow: 'auto',
        }}
      >
        <Container maxWidth="sm">
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, mb: 4, color: colors.text.primary }}
          >
            Log in
          </Typography>

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2,
                width: '100%',
                '& .MuiAlert-message': {
                  width: '100%'
                }
              }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={email}
              onChange={handleEmailChange}
              error={!!emailError}
              helperText={emailError}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: colors.border.hover,
                  },
                },
              }}
            />

            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              value={password}
              onChange={handlePasswordChange}
              error={!!passwordError}
              helperText={passwordError}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: colors.border.hover,
                  },
                },
              }}
            />

            <Divider sx={{ my: 3 }}>OR</Divider>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              sx={{ mb: 2 }}
            >
              Continue with Google
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<GitHubIcon />}
              onClick={handleGithubLogin}
              sx={{ mb: 2 }}
            >
              Continue with GitHub
            </Button>

            <Button
              type="submit"
              fullWidth
              disabled={isLoading}
              variant="contained"
              sx={{
                padding: '12px',
                background: colors.primary.gradient,
                '&:hover': {
                  background: colors.primary.hover,
                },
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 600,
                mb: 2,
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} sx={{ color: colors.text.light }} />
              ) : (
                'Log in'
              )}
            </Button>

            <Typography align="center" sx={{ mb: 2 }}>
              <Button
                href="/forgot-password"
                sx={{
                  textTransform: 'none',
                  color: colors.primary.main,
                  '&:hover': {
                    backgroundColor: 'transparent',
                    textDecoration: 'underline',
                  },
                }}
              >
                Forgot password ?
              </Button>
            </Typography>

            <Typography align="center" sx={{ mt: 2 }}>
              Don't have an account ?{' '}
              <Button
                href="/register"
                sx={{
                  textTransform: 'none',
                  color: colors.primary.main,
                  '&:hover': {
                    backgroundColor: 'transparent',
                    textDecoration: 'underline',
                  },
                }}
              >
                Sign up
              </Button>
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LoginPage;