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

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      return "Email is required";
    }
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  const validatePassword = (value: string) => {
    if (!value) {
      return "Password is required";
    }
    if (value.length < 8) {
      return "Password must contain at least 8 characters";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041';
    const apiUrl = `${baseUrl}/api/auth/login`;
    
    console.log('Full API URL:', apiUrl);

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: true
      };

      console.log('Request config:', config);
      console.log('Request data:', { email, password });

      const response = await axios.post(apiUrl, {
        email,
        password
      }, config);

      console.log('Response:', response);
      
      const { accessToken, refreshToken } = response.data;
      login(accessToken, refreshToken);
      onLoginSuccess();
    } catch (err: any) {
      console.error('Detailed error:', {
        message: err.message,
        response: err.response,
        config: err.config
      });
      
      if (err.response?.data?.error === 'existing_user') {
        window.location.href = err.response.data.redirectUrl;
        return;
      }
      
      setError(err.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const onLoginSuccess = async () => {
    try {
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        // Nettoyer le localStorage
        localStorage.removeItem('redirectAfterLogin');
        // Utiliser le router.push au lieu de window.location
        router.push(redirectPath);
      } else {
        // Redirection par défaut vers la racine
        router.push('/');
      }
    } catch (error) {
      console.error('Erreur de redirection:', error);
      // En cas d'erreur, rediriger vers la racine
      router.push('/');
    }
  };

  const handleGoogleLogin = () => {
    try {
      console.log('Début de la connexion Google');
      
      // Nettoyer le localStorage
      localStorage.clear();
      console.log('localStorage nettoyé');
      
      // Stocker l'origine actuelle dans un cookie pour la redirection
      document.cookie = `origin=${window.location.origin}; path=/; max-age=3600`;
      console.log('Cookie origin set to:', window.location.origin);
      
      // Attendre un court instant avant la redirection
      setTimeout(() => {
        console.log('Redirection vers Google...');
        window.location.href = 'http://localhost:5041/api/auth/google';
      }, 100);
      
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
      
      // Stocker l'origine actuelle dans un cookie pour la redirection
      document.cookie = `origin=${window.location.origin}; path=/; max-age=3600`;
      console.log('Cookie origin set to:', window.location.origin);
      
      // Attendre un court instant avant la redirection
      setTimeout(() => {
        console.log('Redirection vers GitHub...');
        window.location.href = 'http://localhost:5041/api/auth/github';
      }, 100);
      
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