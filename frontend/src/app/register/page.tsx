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
} from '@mui/material';
import { useAuth } from '@/utils/AuthContext';

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
    if (value.length < 8) {
      return "Password must contain at least 8 characters";
    }
    if (!/\d/.test(value)) {
      return "Password must contain at least one number";
    }
    if (!/[A-Z]/.test(value)) {
      return "Password must contain at least one capital letter";
    }
    return "";
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordError(validatePassword(newPassword));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordValidation = validatePassword(password);
    if (passwordValidation) {
      setError(passwordValidation);
      return;
    }
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await axios.post('http://localhost:5041/api/auth/register', {
        username,
        email,
        password,
      });

      setMessage(
        'Registration successful! Check your email for verification code.'
      );
      localStorage.setItem('email', email);
      setTimeout(() => {
        router.push('/verify');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const onRegisterSuccess = async () => {
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