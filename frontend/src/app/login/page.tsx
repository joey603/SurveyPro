'use client';

import React, { useState } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { useRouter } from 'next/navigation';
import {
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Container,
} from '@mui/material';
import axios from 'axios';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        'http://localhost:5041/api/auth/login',
        {
          email,
          password,
        }
      );
      const { accessToken, refreshToken } = response.data;
      login(accessToken, refreshToken);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred');
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
            Welcome
          </Typography>
          <Typography
            variant="h6"
            sx={{ textAlign: 'center', maxWidth: '80%' }}
          >
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
            Connexion
          </Typography>

          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Box component="form" onSubmit={handleSubmit}>
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
              Se connecter
            </Button>

            <Typography align="center" sx={{ mt: 2 }}>
              Pas encore de compte ?{' '}
              <Button
                href="/register"
                sx={{
                  textTransform: 'none',
                  color: '#667eea',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    textDecoration: 'underline',
                  },
                }}
              >
                S'inscrire
              </Button>
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LoginPage;
