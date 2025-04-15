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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation du mot de passe
    const passwordValidation = validatePassword(password);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Récupération de l'URL de l'API à partir des variables d'environnement
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041';
      
      const response = await axios.post(`${apiUrl}/api/auth/register`, {
        username,
        email,
        password,
      });
      
      if (response.status === 201) {
        setMessage('Compte créé avec succès. Vous pouvez maintenant vous connecter.');
        await onRegisterSuccess();
      }
    } catch (err: any) {
      console.error('Erreur d\'inscription:', err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Erreur lors de l\'inscription. Veuillez réessayer.');
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
      console.error('Erreur de redirection:', error);
      // En cas d'erreur, rediriger vers la racine
      router.push('/');
    }
  };

  const handleGoogleRegister = () => {
    try {
      // Nettoyer le localStorage
      localStorage.clear();
      
      // Stocker l'origine actuelle dans un cookie pour la redirection
      document.cookie = `origin=${window.location.origin}; path=/; max-age=3600`;
      
      // Récupération de l'URL de l'API à partir des variables d'environnement
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041';
      
      window.location.href = `${apiUrl}/api/auth/google`;
    } catch (error) {
      console.error('Erreur lors de la connexion Google:', error);
    }
  };

  const handleGithubRegister = () => {
    try {
      // Nettoyer le localStorage
      localStorage.clear();
      
      // Stocker l'origine actuelle dans un cookie pour la redirection
      document.cookie = `origin=${window.location.origin}; path=/; max-age=3600`;
      
      // Récupération de l'URL de l'API à partir des variables d'environnement
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041';
      
      window.location.href = `${apiUrl}/api/auth/github`;
    } catch (error) {
      console.error('Erreur lors de la connexion GitHub:', error);
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

          <Box component="form" onSubmit={handleRegister}>
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