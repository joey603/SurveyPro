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
    console.log('Testing authentication endpoints...');
    
    // URL de l'API backend
    const backendUrl = 'https://surveypro-ir3u.onrender.com';
    
    // Tester l'endpoint Google
    console.log('Testing Google endpoint:', `${backendUrl}/api/auth/google`);
    
    // Tester l'endpoint GitHub
    console.log('Testing GitHub endpoint:', `${backendUrl}/api/auth/github`);
    
    // Essayer d'atteindre les endpoints sans effectuer de redirection
    try {
      const googleResponse = await fetch(`${backendUrl}/api/auth/google`, { method: 'HEAD' });
      console.log('Google endpoint response:', googleResponse.status, googleResponse.statusText);
    } catch (err) {
      console.error('Error testing Google endpoint:', err);
    }
    
    try {
      const githubResponse = await fetch(`${backendUrl}/api/auth/github`, { method: 'HEAD' });
      console.log('GitHub endpoint response:', githubResponse.status, githubResponse.statusText);
    } catch (err) {
      console.error('Error testing GitHub endpoint:', err);
    }
  } catch (error) {
    console.error('Error testing endpoints:', error);
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
      console.error('Error decoding URL:', e);
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
      console.error('Error cleaning URL:', e);
      return url;
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('=== CHECKING STORAGE METHODS ON LOGIN PAGE ===');
        console.log('Full URL:', window.location.href);
        
        // Récupérer l'URL de redirection depuis les paramètres de l'URL
        const searchParams = new URLSearchParams(window.location.search);
        const fromParam = searchParams.get('from');
        const clearParam = searchParams.get('clear');
        
        // Si le paramètre clear=true est présent, supprimer toutes les redirections
        if (clearParam === 'true') {
          console.log('"clear" parameter detected - Deleting all stored redirections');
          localStorage.removeItem('redirectAfterLogin');
          localStorage.removeItem('redirectAfterLogin_backup');
          localStorage.removeItem('redirectAfterLogin_json');
          localStorage.removeItem('lastVisitedUrl');
          localStorage.removeItem('mobile_redirect');
          sessionStorage.removeItem('redirectAfterLogin');
          document.cookie = 'redirectAfterLogin_cookie=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'redirectAfterLogin_mobile=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          
          // Enlever le paramètre clear de l'URL
          searchParams.delete('clear');
          const newUrl = window.location.pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');
          window.history.replaceState({}, '', newUrl);
          
          // Ne pas continuer avec la vérification des redirections
          return;
        }
        
        // Si le paramètre "from" est présent, il a la plus haute priorité
        if (fromParam) {
          console.log('"from" parameter detected in URL:', fromParam);
          // Sauvegarder dans tous les storages pour être sûr
          localStorage.setItem('redirectAfterLogin', fromParam);
          sessionStorage.setItem('redirectAfterLogin', fromParam);
          document.cookie = `redirectAfterLogin_cookie=${encodeURIComponent(fromParam)}; path=/; max-age=3600`;
          // Sauvegarder également dans les méthodes mobiles
          document.cookie = `redirectAfterLogin_mobile=${encodeURIComponent(fromParam)}; path=/; max-age=3600; SameSite=None; Secure`;
          localStorage.setItem('mobile_redirect', fromParam);
          console.log('"from" parameter saved in all storages');
        }
        
        // Vérifier toutes les méthodes possibles de stockage
        console.log('STANDARD METHOD:', localStorage.getItem('redirectAfterLogin'));
        console.log('BACKUP METHOD:', localStorage.getItem('redirectAfterLogin_backup'));
        console.log('SESSION METHOD:', sessionStorage.getItem('redirectAfterLogin'));
        console.log('MOBILE METHOD:', localStorage.getItem('mobile_redirect'));
        
        // Vérifier la méthode JSON
        const jsonData = localStorage.getItem('redirectAfterLogin_json');
        let jsonUrl: string | null = null;
        if (jsonData) {
          try {
            const parsed = JSON.parse(jsonData);
            if (parsed && typeof parsed.url === 'string') {
              jsonUrl = parsed.url;
            }
            console.log('MÉTHODE JSON:', parsed);
            console.log('MÉTHODE JSON URL:', jsonUrl);
            console.log('MÉTHODE JSON Timestamp:', parsed.timestamp ? new Date(parsed.timestamp).toISOString() : 'N/A');
          } catch (error) {
            console.error('Error parsing JSON:', error);
          }
        } else {
          console.log('MÉTHODE JSON: Not found');
        }
        
        // Vérifier les cookies
        console.log('ALL COOKIES:', document.cookie);
        
        // Fonction pour récupérer un cookie spécifique
        const getCookieValue = (name) => {
          const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
          return match ? decodeURIComponent(match[2]) : null;
        };
        
        const cookieUrl = getCookieValue('redirectAfterLogin_cookie');
        console.log('COOKIE METHOD:', cookieUrl);
        
        const mobileCookieUrl = getCookieValue('redirectAfterLogin_mobile');
        console.log('MOBILE COOKIE METHOD:', mobileCookieUrl);
        
        // Vérifier l'URL complète stockée
        const lastVisitedUrl = localStorage.getItem('lastVisitedUrl');
        console.log('STORED FULL URL:', lastVisitedUrl);
        
        // Obtenir l'URL à partir du lastVisitedUrl si nécessaire
        let urlFromLastVisited: string | null = null;
        if (lastVisitedUrl) {
          try {
            const url = new URL(lastVisitedUrl);
            const surveyId = new URLSearchParams(url.search).get('surveyId');
            if (surveyId) {
              urlFromLastVisited = `/survey-answer?surveyId=${surveyId}`;
              console.log('EXTRACTED URL FROM lastVisitedUrl:', urlFromLastVisited);
            }
          } catch (error) {
            console.error('Error extracting URL:', error);
          }
        }
        
        // Détecter quelle méthode a fonctionné
        const standardUrl = localStorage.getItem('redirectAfterLogin');
        const backupUrl = localStorage.getItem('redirectAfterLogin_backup');
        const sessionUrl = sessionStorage.getItem('redirectAfterLogin');
        const mobileRedirectUrl = localStorage.getItem('mobile_redirect');
        
        console.log('=== SUMMARY OF METHODS ===');
        console.log('Standard method worked:', !!standardUrl);
        console.log('Backup method worked:', !!backupUrl);
        console.log('Session method worked:', !!sessionUrl);
        console.log('JSON method worked:', !!jsonUrl);
        console.log('Cookie method worked:', !!cookieUrl);
        console.log('Mobile cookie method worked:', !!mobileCookieUrl);
        console.log('Mobile redirect method worked:', !!mobileRedirectUrl);
        console.log('URL extracted from lastVisitedUrl worked:', !!urlFromLastVisited);
        console.log('URL parameter "from" worked:', !!fromParam);
        
        // Sélectionner la première méthode qui a fonctionné (priorité au paramètre URL, puis méthodes mobiles)
        let redirectUrl: string | null = fromParam || mobileCookieUrl || mobileRedirectUrl || sessionUrl || standardUrl || backupUrl || jsonUrl || cookieUrl || urlFromLastVisited;
        console.log('SELECTED REDIRECTION URL:', redirectUrl);
        
        if (redirectUrl) {
          // Sauvegarder dans localStorage principal pour être utilisé par le mécanisme de login
          localStorage.setItem('redirectAfterLogin', redirectUrl);
          // Sauvegarder également dans les méthodes mobiles
          localStorage.setItem('mobile_redirect', redirectUrl);
          document.cookie = `redirectAfterLogin_mobile=${encodeURIComponent(redirectUrl)}; path=/; max-age=3600; SameSite=None; Secure`;
          console.log('URL saved in redirectAfterLogin standard for login:', redirectUrl);
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
          console.log('AUTH CHECK RESPONSE:', data);
          if (data.valid) {
            // Récupérer l'URL de redirection
            console.log('User authenticated, checking redirection URL');
            if (redirectUrl) {
              console.log('Redirecting to:', redirectUrl);
              // Nettoyer toutes les méthodes de stockage
              localStorage.removeItem('redirectAfterLogin');
              localStorage.removeItem('redirectAfterLogin_backup');
              localStorage.removeItem('redirectAfterLogin_json');
              localStorage.removeItem('lastVisitedUrl');
              localStorage.removeItem('mobile_redirect');
              sessionStorage.removeItem('redirectAfterLogin');
              document.cookie = 'redirectAfterLogin_cookie=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              document.cookie = 'redirectAfterLogin_mobile=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              // Redirection directe vers l'URL sauvegardée
              window.location.href = redirectUrl;
            } else {
              console.log('No redirection URL found, redirecting to dashboard');
              router.push('/dashboard');
            }
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
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
      return "The email is required";
    }
    if (!emailRegex.test(value)) {
      return "Invalid email format";
    }
    return "";
  };

  const validatePassword = (value: string) => {
    if (!value) {
      return "The password is required";
    }
    if (value.length < 4) {
      return "The password must contain at least 4 characters";
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
      console.log('=== STARTING CONNECTION ===');
      // Utiliser un chemin relatif en production pour bénéficier des rewrites Vercel
      const apiPath = process.env.NODE_ENV === 'production' 
        ? '/api/auth/login' 
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041'}/api/auth/login`;
      
      console.log('API Path for login:', apiPath);
      
      const response = await axios.post(apiPath, {
        email: email.toLowerCase(),
        password,
      });

      if (response.status === 200 && response.data) {
        console.log('Connection successful, storing token');
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
      console.error('Connection error:', err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Error during connection. Please try again.');
      }
      
      setIsLoading(false);
    }
  };

  const onLoginSuccess = async () => {
    try {
      console.log('=== STARTING REDIRECTION AFTER CONNECTION ===');
      
      // Vérifier d'abord sessionStorage (priorité)
      const sessionRedirectPath = sessionStorage.getItem('redirectAfterLogin');
      console.log('URL de redirection dans sessionStorage:', sessionRedirectPath);
      
      // Puis vérifier localStorage
      const localRedirectPath = localStorage.getItem('redirectAfterLogin');
      console.log('URL de redirection dans localStorage:', localRedirectPath);
      
      // Vérifier en priorité sessionStorage
      if (sessionRedirectPath) {
        console.log('Redirection vers sessionStorage path:', sessionRedirectPath);
        // Nettoyer les storages
        localStorage.removeItem('redirectAfterLogin');
        sessionStorage.removeItem('redirectAfterLogin');
        
        // Redirection directe vers l'URL sauvegardée de sessionStorage
        window.location.href = sessionRedirectPath;
      } else if (localRedirectPath) {
        console.log('Redirecting to localStorage path:', localRedirectPath);
        // Nettoyer les storages
        localStorage.removeItem('redirectAfterLogin');
        sessionStorage.removeItem('redirectAfterLogin');
        
        // Redirection directe vers l'URL sauvegardée de localStorage
        window.location.href = localRedirectPath;
      } else {
        console.log('No redirection URL found, redirecting to home');
        router.push('/');
      }
    } catch (error) {
      console.error('Redirection error:', error);
      router.push('/');
    }
  };

  const handleGoogleLogin = () => {
    try {
      console.log('Starting Google connection');
      
      // Sauvegarder l'URL de redirection depuis sessionStorage si disponible
      const sessionUrl = sessionStorage.getItem('redirectAfterLogin');
      console.log('Redirection URL from sessionStorage for Google:', sessionUrl);
      
      if (sessionUrl) {
        // Sauvegarder dans un cookie persistant qui survivra à la redirection OAuth
        document.cookie = `oauth_redirect_url=${encodeURIComponent(sessionUrl)}; path=/; max-age=3600; secure; samesite=lax`;
        console.log('URL saved in cookie oauth_redirect_url:', sessionUrl);
      }
      
      // Récupérer l'URL de redirection depuis les cookies
      const cookies = document.cookie.split(';');
      const redirectCookie = cookies.find(cookie => cookie.trim().startsWith('redirectAfterLogin='));
      const redirectPath = redirectCookie ? redirectCookie.split('=')[1] : null;
      
      if (redirectPath) {
        console.log('URL saved in cookie:', redirectPath);
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
        console.log('Origins saved in cookies:', currentOrigin);
        
        // Ajouter l'origine à l'URL de redirection
        const googleAuthUrl = `${backendUrl}/api/auth/google?redirect_uri=${encodeURIComponent(currentOrigin)}`;
        console.log('URL of redirection Google with origin:', googleAuthUrl);
        
        // Redirection directe vers l'URL d'authentification Google
        window.location.href = googleAuthUrl;
      } catch (error) {
        console.error('Error saving origin:', error);
        // En cas d'erreur, essayer la redirection simple
        window.location.href = `${backendUrl}/api/auth/google`;
      }
    } catch (error) {
      console.error('Error during Google connection:', error);
    }
  };

  const handleGithubLogin = () => {
    try {
      console.log('Starting GitHub connection');
      
      // Sauvegarder l'URL de redirection depuis sessionStorage si disponible
      const sessionUrl = sessionStorage.getItem('redirectAfterLogin');
      console.log('Redirection URL from sessionStorage for GitHub:', sessionUrl);
      
      if (sessionUrl) {
        // Sauvegarder dans un cookie persistant qui survivra à la redirection OAuth
        document.cookie = `oauth_redirect_url=${encodeURIComponent(sessionUrl)}; path=/; max-age=3600; secure; samesite=lax`;
        console.log('URL saved in cookie oauth_redirect_url:', sessionUrl);
      }
      
      // Récupérer l'URL de redirection depuis les cookies
      const cookies = document.cookie.split(';');
      const redirectCookie = cookies.find(cookie => cookie.trim().startsWith('redirectAfterLogin='));
      const redirectPath = redirectCookie ? redirectCookie.split('=')[1] : null;
      
      if (redirectPath) {
        console.log('URL saved in cookie:', redirectPath);
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
        console.log('Origins saved in cookies:', currentOrigin);
        
        // Ajouter l'origine à l'URL de redirection
        const githubAuthUrl = `${backendUrl}/api/auth/github?redirect_uri=${encodeURIComponent(currentOrigin)}`;
        console.log('URL of redirection GitHub with origin:', githubAuthUrl);
        
        // Redirection directe vers l'URL d'authentification GitHub
        window.location.href = githubAuthUrl;
      } catch (error) {
        console.error('Error saving origin:', error);
        // En cas d'erreur, essayer la redirection simple
        window.location.href = `${backendUrl}/api/auth/github`;
      }
    } catch (error) {
      console.error('Error during GitHub connection:', error);
    }
  };

  useEffect(() => {
    // Récupérer le paramètre d'erreur de l'URL
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    
    if (errorParam === 'existing_user') {
      setError('An account already exists with this email. Please use your usual connection method.');
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