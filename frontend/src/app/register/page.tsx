'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
} from '@mui/material';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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
        'Inscription réussie ! Vérifiez votre email pour le code de vérification.'
      );
      localStorage.setItem('email', email);
      setTimeout(() => {
        router.push('/verify');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Échec de l'inscription.");
    } finally {
      setLoading(false);
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
            backgroundColor: 'rgba(102, 126, 234, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 4,
            color: 'white',
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: 700, marginBottom: 2 }}>
            Join us !
          </Typography>
          <Typography
            variant="h6"
            sx={{ textAlign: 'center', maxWidth: '80%' }}
          >
            Create your account to access all our features
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
          backgroundColor: 'white',
          padding: 4,
          overflow: 'auto',
        }}
      >
        <Container maxWidth="sm">
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, mb: 4, color: '#1a237e' }}
          >
            Inscription
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
              label="Nom d'utilisateur"
              fullWidth
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#667eea',
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
                    borderColor: '#667eea',
                  },
                },
              }}
            />

            <TextField
              label="Mot de passe"
              type="password"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="8 caractères min. / 1 chiffre minimum"
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#667eea',
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
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background:
                    'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 600,
                mb: 2,
              }}
            >
              {loading ? <CircularProgress size={24} /> : "S'inscrire"}
            </Button>

            <Typography align="center" sx={{ mt: 2 }}>
              Déjà un compte ?{' '}
              <Button
                href="/login"
                sx={{
                  textTransform: 'none',
                  color: '#667eea',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    textDecoration: 'underline',
                  },
                }}
              >
                Se connecter
              </Button>
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default RegisterPage;
