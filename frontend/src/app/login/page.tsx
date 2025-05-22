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
        console.log('=== VÉRIFICATION DES MÉTHODES DE STOCKAGE SUR LA PAGE LOGIN ===');
        console.log('URL complète:', window.location.href);
        
        // Récupérer l'URL de redirection depuis les paramètres de l'URL
        const searchParams = new URLSearchParams(window.location.search);
        const fromParam = searchParams.get('from');
        const clearParam = searchParams.get('clear');
        
        // Si le paramètre clear=true est présent, supprimer toutes les redirections
        if (clearParam === 'true') {
          console.log('Paramètre "clear" détecté - Suppression de toutes les redirections stockées');
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
          console.log('Paramètre "from" détecté dans l\'URL:', fromParam);
          // Sauvegarder dans tous les storages pour être sûr
          localStorage.setItem('redirectAfterLogin', fromParam);
          sessionStorage.setItem('redirectAfterLogin', fromParam);
          document.cookie = `redirectAfterLogin_cookie=${encodeURIComponent(fromParam)}; path=/; max-age=3600`;
          // Sauvegarder également dans les méthodes mobiles
          document.cookie = `redirectAfterLogin_mobile=${encodeURIComponent(fromParam)}; path=/; max-age=3600; SameSite=None; Secure`;
          localStorage.setItem('mobile_redirect', fromParam);
          console.log('Paramètre "from" sauvegardé dans tous les storages');
        }
        
        // Vérifier toutes les méthodes possibles de stockage
        console.log('MÉTHODE STANDARD:', localStorage.getItem('redirectAfterLogin'));
        console.log('MÉTHODE BACKUP:', localStorage.getItem('redirectAfterLogin_backup'));
        console.log('MÉTHODE SESSION:', sessionStorage.getItem('redirectAfterLogin'));
        console.log('MÉTHODE MOBILE:', localStorage.getItem('mobile_redirect'));
        
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
            console.error('Erreur de parsing JSON:', error);
          }
        } else {
          console.log('MÉTHODE JSON: Non trouvée');
        }
        
        // Vérifier les cookies
        console.log('TOUS LES COOKIES:', document.cookie);
        
        // Fonction pour récupérer un cookie spécifique
        const getCookieValue = (name) => {
          const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
          return match ? decodeURIComponent(match[2]) : null;
        };
        
        const cookieUrl = getCookieValue('redirectAfterLogin_cookie');
        console.log('MÉTHODE COOKIE:', cookieUrl);
        
        const mobileCookieUrl = getCookieValue('redirectAfterLogin_mobile');
        console.log('MÉTHODE COOKIE MOBILE:', mobileCookieUrl);
        
        // Vérifier l'URL complète stockée
        const lastVisitedUrl = localStorage.getItem('lastVisitedUrl');
        console.log('URL complète stockée:', lastVisitedUrl);
        
        // Obtenir l'URL à partir du lastVisitedUrl si nécessaire
        let urlFromLastVisited = null;
        if (lastVisitedUrl) {
          try {
            const url = new URL(lastVisitedUrl);
            const surveyId = new URLSearchParams(url.search).get('surveyId');
            if (surveyId) {
              urlFromLastVisited = `/survey-answer?surveyId=${surveyId}`;
              console.log('URL extraite de lastVisitedUrl:', urlFromLastVisited);
            }
          } catch (error) {
            console.error('Erreur lors de l\'extraction de l\'URL:', error);
          }
        }
        
        // Détecter quelle méthode a fonctionné
        const standardUrl = localStorage.getItem('redirectAfterLogin');
        const backupUrl = localStorage.getItem('redirectAfterLogin_backup');
        const sessionUrl = sessionStorage.getItem('redirectAfterLogin');
        const mobileRedirectUrl = localStorage.getItem('mobile_redirect');
        
        console.log('=== RÉSUMÉ DES MÉTHODES ===');
        console.log('Méthode standard a fonctionné:', !!standardUrl);
        console.log('Méthode backup a fonctionné:', !!backupUrl);
        console.log('Méthode session a fonctionné:', !!sessionUrl);
        console.log('Méthode JSON a fonctionné:', !!jsonUrl);
        console.log('Méthode cookie a fonctionné:', !!cookieUrl);
        console.log('Méthode cookie mobile a fonctionné:', !!mobileCookieUrl);
        console.log('Méthode mobile redirect a fonctionné:', !!mobileRedirectUrl);
        console.log('URL extraite de lastVisitedUrl a fonctionné:', !!urlFromLastVisited);
        console.log('Paramètre URL "from" a fonctionné:', !!fromParam);
        
        // Sélectionner la première méthode qui a fonctionné (priorité au paramètre URL, puis méthodes mobiles)
        let redirectUrl: string | null = fromParam || mobileCookieUrl || mobileRedirectUrl || sessionUrl || standardUrl || backupUrl || jsonUrl || cookieUrl || urlFromLastVisited;
        console.log('URL de redirection sélectionnée:', redirectUrl);
        
        if (redirectUrl) {
          // Sauvegarder dans localStorage principal pour être utilisé par le mécanisme de login
          localStorage.setItem('redirectAfterLogin', redirectUrl);
          // Sauvegarder également dans les méthodes mobiles
          localStorage.setItem('mobile_redirect', redirectUrl);
          document.cookie = `redirectAfterLogin_mobile=${encodeURIComponent(redirectUrl)}; path=/; max-age=3600; SameSite=None; Secure`;
          console.log('URL sauvegardée dans redirectAfterLogin standard pour le login:', redirectUrl);
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
          console.log('Réponse de vérification auth:', data);
          if (data.valid) {
            // Récupérer l'URL de redirection
            console.log('Utilisateur authentifié, vérification de l\'URL de redirection');
            if (redirectUrl) {
              console.log('Redirection vers:', redirectUrl);
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
              console.log('Pas d\'URL de redirection trouvée, redirection vers dashboard');
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
        console.log('Redirection vers localStorage path:', localRedirectPath);
        // Nettoyer les storages
        localStorage.removeItem('redirectAfterLogin');
        sessionStorage.removeItem('redirectAfterLogin');
        
        // Redirection directe vers l'URL sauvegardée de localStorage
        window.location.href = localRedirectPath;
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
      
      // Sauvegarder l'URL de redirection depuis sessionStorage si disponible
      const sessionUrl = sessionStorage.getItem('redirectAfterLogin');
      console.log('URL de redirection depuis sessionStorage pour Google:', sessionUrl);
      
      if (sessionUrl) {
        // Sauvegarder dans un cookie persistant qui survivra à la redirection OAuth
        document.cookie = `oauth_redirect_url=${encodeURIComponent(sessionUrl)}; path=/; max-age=3600; secure; samesite=lax`;
        console.log('URL de redirection sauvegardée dans cookie oauth_redirect_url:', sessionUrl);
      }
      
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
      
      // Sauvegarder l'URL de redirection depuis sessionStorage si disponible
      const sessionUrl = sessionStorage.getItem('redirectAfterLogin');
      console.log('URL de redirection depuis sessionStorage pour GitHub:', sessionUrl);
      
      if (sessionUrl) {
        // Sauvegarder dans un cookie persistant qui survivra à la redirection OAuth
        document.cookie = `oauth_redirect_url=${encodeURIComponent(sessionUrl)}; path=/; max-age=3600; secure; samesite=lax`;
        console.log('URL de redirection sauvegardée dans cookie oauth_redirect_url:', sessionUrl);
      }
      
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

  return (
    // ... existing code ...
  );
};

export default LoginPage;