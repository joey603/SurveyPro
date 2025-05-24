'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { colors } from '../../theme/colors';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Divider,
} from '@mui/material';
import { useAuth } from '@/utils/AuthContext';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { register } = useAuth();

  const validatePassword = (value: string) => {
    if (!value) {
      return 'Password is required';
    }
    if (!PASSWORD_REGEX.test(value)) {
      return 'Password must be at least 8 characters with 1 uppercase and 1 number';
    }
    return '';
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordError(validatePassword(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const apiUrl = 'https://surveypro-ir3u.onrender.com';
      console.log('URL of the API:', apiUrl);
      console.log('Form data:', { email, password, username });
      
      const response = await axios.post(`${apiUrl}/api/auth/register`, {
        email: email.toLowerCase(),
        password,
        username
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: true
      });

      console.log('Server response:', response.status, response.statusText);
      
      if (response.status === 201) {
        // Stocker l'email dans le localStorage pour la vérification
        localStorage.setItem('email', email.toLowerCase());
        
        // Rediriger vers la page de vérification
        router.push('/verify');
      }
    } catch (err: any) {
      console.error('Error during registration:', err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Error during registration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRegisterSuccess = async () => {
    try {
      // Rediriger vers la page de connexion après un court délai
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      
    } catch (error) {
      console.error('Error during redirection:', error);
      // En cas d'erreur, rediriger vers la racine
      router.push('/');
    }
  };

  const handleGoogleRegister = () => {
    try {
      console.log('Start of Google connection');
      
      // Nettoyer le localStorage
      localStorage.clear();
      console.log('localStorage cleaned');
      
      // URL de l'API backend pour l'authentification Google
      const backendUrl = 'https://surveypro-ir3u.onrender.com';
      
      // Récupérer l'URL d'origine actuelle pour le callback
      const currentOrigin = window.location.origin;
      console.log('Current application origin:', currentOrigin);
      
      // Sauvegarder l'origine dans les cookies
      try {
        document.cookie = `origin=${currentOrigin}; path=/; max-age=86400`;
        document.cookie = `origin_alt=${currentOrigin}; path=/; max-age=86400`;
        document.cookie = `redirect_uri=${currentOrigin}; path=/; max-age=86400`;
        console.log('Origins saved in cookies:', currentOrigin);
        
        // Ajouter l'origine à l'URL de redirection
        const googleAuthUrl = `${backendUrl}/api/auth/google?redirect_uri=${encodeURIComponent(currentOrigin)}`;
        console.log('URL of redirection Google with origin:', googleAuthUrl);
        
        // Redirection directe vers l'URL d'authentification Google
        window.location.href = googleAuthUrl;
      } catch (error) {
        console.error('Error during origin saving:', error);
        // En cas d'erreur, essayer la redirection simple
        window.location.href = `${backendUrl}/api/auth/google`;
      }
    } catch (error) {
      console.error('Error during Google connection:', error);
    }
  };

  const handleGithubRegister = () => {
    try {
      console.log('Start of GitHub connection');
      
      // Nettoyer le localStorage
      localStorage.clear();
      console.log('localStorage cleaned');
      
      // URL de l'API backend pour l'authentification GitHub
      const backendUrl = 'https://surveypro-ir3u.onrender.com';
      
      // Récupérer l'URL d'origine actuelle pour le callback
      const currentOrigin = window.location.origin;
      console.log('Current application origin:', currentOrigin);
      
      // Sauvegarder l'origine dans les cookies
      try {
        document.cookie = `origin=${currentOrigin}; path=/; max-age=86400`;
        document.cookie = `origin_alt=${currentOrigin}; path=/; max-age=86400`;
        document.cookie = `redirect_uri=${currentOrigin}; path=/; max-age=86400`;
        console.log('Origins saved in cookies:', currentOrigin);
        
        // Ajouter l'origine à l'URL de redirection
        const githubAuthUrl = `${backendUrl}/api/auth/github?redirect_uri=${encodeURIComponent(currentOrigin)}`;
        console.log('URL of redirection GitHub with origin:', githubAuthUrl);
        
        // Redirection directe vers l'URL d'authentification GitHub
        window.location.href = githubAuthUrl;
      } catch (error) {
        console.error('Error during origin saving:', error);
        // En cas d'erreur, essayer la redirection simple
        window.location.href = `${backendUrl}/api/auth/github`;
      }
    } catch (error) {
      console.error('Error during GitHub connection:', error);
    }
  };

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
            Join Us
          </Typography>
          <Typography variant="h6" sx={{ textAlign: 'center', maxWidth: '80%' }}>
            Create your account and start creating surveys
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
            variant="h2"
            sx={{ 
              fontWeight: 800, 
              mb: 1, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'inline-block'
            }}
          >
            Surveyflow
          </Typography>
          <Typography
            variant="body1"
            sx={{ mb: 4, color: colors.text.secondary }}
          >
            The ultimate platform to create professional surveys in just a few clicks
          </Typography>

          <Typography
            variant="h4"
            sx={{ fontWeight: 700, mb: 4, color: colors.text.primary }}
          >
            Sign up
          </Typography>

          {message && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {message}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Username"
              fullWidth
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              label="Email"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              helperText={passwordError || "8 characters, 1 number and 1 capital letter minimum"}
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
              onClick={handleGoogleRegister}
              sx={{ mb: 2 }}
            >
              Continue with Google
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<GitHubIcon />}
              onClick={handleGithubRegister}
              sx={{ mb: 2 }}
            >
              Continue with GitHub
            </Button>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
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
              {loading ? <CircularProgress size={24} sx={{ color: colors.text.light }} /> : "Sign up"}
            </Button>

            <Typography align="center" sx={{ mt: 2 }}>
              Already have an account ?{' '}
              <Button
                href="/login"
                sx={{
                  textTransform: 'none',
                  color: colors.primary.main,
                  '&:hover': {
                    backgroundColor: 'transparent',
                    textDecoration: 'underline',
                  },
                }}
              >
                Log in
              </Button>
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default RegisterPage;