'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
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

// Fonction pour tester l'existence des endpoints d'authentification
const testAuthEndpoints = async () => {
  try {
    console.log('Test des endpoints d\'authentification...');
    
    // URL de l'API backend
    const backendUrl = 'https://surveypro-ir3u.onrender.com';
    
    // Tester l'endpoint Google
    console.log('Test de l\'endpoint Google:', `${backendUrl}/api/auth/google`);
    
    // Tester l'endpoint GitHub
    console.log('Test de l\'endpoint GitHub:', `${backendUrl}/api/auth/github`);
    
    // Essayer d'atteindre les endpoints sans effectuer de redirection
    try {
      const googleResponse = await fetch(`${backendUrl}/api/auth/google`, { method: 'HEAD' });
      console.log('Réponse de l\'endpoint Google:', googleResponse.status, googleResponse.statusText);
    } catch (err) {
      console.error('Erreur lors du test de l\'endpoint Google:', err);
    }
    
    try {
      const githubResponse = await fetch(`${backendUrl}/api/auth/github`, { method: 'HEAD' });
      console.log('Réponse de l\'endpoint GitHub:', githubResponse.status, githubResponse.statusText);
    } catch (err) {
      console.error('Erreur lors du test de l\'endpoint GitHub:', err);
    }
  } catch (error) {
    console.error('Erreur lors du test des endpoints:', error);
  }
};

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle, loginWithGithub } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Fonction pour récupérer un cookie
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + '=')) {
        return cookie.substring(name.length + 1);
      }
    }
    return null;
  };

  // Fonction pour décoder une URL
  const decodeUrl = (url) => {
    try {
      return decodeURIComponent(url);
    } catch (e) {
      console.error('Erreur lors du décodage de l\'URL:', e);
      return url;
    }
  };

  // Fonction pour nettoyer l'URL de redirection
  const cleanRedirectUrl = (url) => {
    try {
      const decodedUrl = decodeUrl(url);
      // Retourner l'URL complète au lieu du chemin relatif
      return decodedUrl;
    } catch (e) {
      console.error('Erreur lors du nettoyage de l\'URL:', e);
      return url;
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Récupérer l'URL de redirection depuis les paramètres de l'URL
        const searchParams = new URLSearchParams(window.location.search);
        const callbackUrl = searchParams.get('callbackUrl');
        
        console.log('URL de callback reçue:', callbackUrl);
        console.log('URL complète:', window.location.href);
        console.log('Paramètres de recherche:', window.location.search);

        if (callbackUrl) {
          // Sauvegarder l'URL de redirection dans le localStorage sans encodage
          const decodedUrl = decodeURIComponent(callbackUrl);
          localStorage.setItem('redirectAfterLogin', decodedUrl);
          console.log('URL sauvegardée dans localStorage:', decodedUrl);
        }

        // Vérifier l'authentification via le backend
        const response = await fetch('https://surveypro-ir3u.onrender.com/api/auth/verify', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.valid) {
            // Récupérer l'URL de redirection
            const redirectPath = localStorage.getItem('redirectAfterLogin');
            if (redirectPath) {
              console.log('Redirection vers:', redirectPath);
              // Redirection directe vers l'URL sauvegardée
              window.location.href = redirectPath;
            } else {
              router.push('/dashboard');
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
      }
    };

    checkAuth();
  }, [router]);

  // Exécuter le test des endpoints au chargement de la page
  useEffect(() => {
    testAuthEndpoints();
  }, []);

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
      console.log('=== DÉBUT DE LA CONNEXION ===');
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
        console.log('Connexion réussie, stockage du token');
        setError('');
        
        // Stocker le token dans le localStorage et les cookies
        const { accessToken, refreshToken } = response.data;
        
        // Stocker dans le localStorage
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        // Stocker dans les cookies
        document.cookie = `accessToken=${accessToken}; path=/; max-age=3600; secure; samesite=lax`;
        document.cookie = `refreshToken=${refreshToken}; path=/; max-age=86400; secure; samesite=lax`;
        
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
      console.log('=== DÉBUT DE LA REDIRECTION APRÈS CONNEXION ===');
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      
      if (redirectPath) {
        console.log('Redirection vers:', redirectPath);
        // Nettoyer le localStorage
        localStorage.removeItem('redirectAfterLogin');
        
        // Redirection directe vers l'URL sauvegardée
        window.location.href = redirectPath;
      } else {
        console.log('Pas d\'URL de redirection, retour à l\'accueil');
        router.push('/');
      }
    } catch (error) {
      console.error('Erreur de redirection:', error);
      router.push('/');
    }
  };

  const handleGoogleLogin = () => {
    try {
      console.log('Début de la connexion Google');
      
      // Récupérer l'URL de redirection depuis les cookies
      const cookies = document.cookie.split(';');
      const redirectCookie = cookies.find(cookie => cookie.trim().startsWith('redirectAfterLogin='));
      const redirectPath = redirectCookie ? redirectCookie.split('=')[1] : null;
      
      if (redirectPath) {
        console.log('URL de redirection sauvegardée dans cookie:', redirectPath);
      }
      
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
        console.log('Origines sauvegardées dans les cookies:', currentOrigin);
        
        // Ajouter l'origine à l'URL de redirection
        const googleAuthUrl = `${backendUrl}/api/auth/google?redirect_uri=${encodeURIComponent(currentOrigin)}`;
        console.log('URL de redirection Google avec origine:', googleAuthUrl);
        
        // Redirection directe vers l'URL d'authentification Google
        window.location.href = googleAuthUrl;
      } catch (error) {
        console.error('Erreur lors de la sauvegarde de l\'origine:', error);
        // En cas d'erreur, essayer la redirection simple
        window.location.href = `${backendUrl}/api/auth/google`;
      }
    } catch (error) {
      console.error('Erreur lors de la connexion Google:', error);
    }
  };

  const handleGithubLogin = () => {
    try {
      console.log('Début de la connexion GitHub');
      
      // Récupérer l'URL de redirection depuis les cookies
      const cookies = document.cookie.split(';');
      const redirectCookie = cookies.find(cookie => cookie.trim().startsWith('redirectAfterLogin='));
      const redirectPath = redirectCookie ? redirectCookie.split('=')[1] : null;
      
      if (redirectPath) {
        console.log('URL de redirection sauvegardée dans cookie:', redirectPath);
      }
      
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
        console.log('Origines sauvegardées dans les cookies:', currentOrigin);
        
        // Ajouter l'origine à l'URL de redirection
        const githubAuthUrl = `${backendUrl}/api/auth/github?redirect_uri=${encodeURIComponent(currentOrigin)}`;
        console.log('URL de redirection GitHub avec origine:', githubAuthUrl);
        
        // Redirection directe vers l'URL d'authentification GitHub
        window.location.href = githubAuthUrl;
      } catch (error) {
        console.error('Erreur lors de la sauvegarde de l\'origine:', error);
        // En cas d'erreur, essayer la redirection simple
        window.location.href = `${backendUrl}/api/auth/github`;
      }
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