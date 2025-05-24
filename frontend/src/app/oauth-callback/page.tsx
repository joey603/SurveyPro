'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/utils/AuthContext';
import { Box, CircularProgress } from '@mui/material';

const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
    <CircularProgress />
  </Box>
);

const OAuthCallbackContent = () => {
  const router = useRouter();
  const { login, handleOAuthCallback } = useAuth();
  const searchParams = useSearchParams();
  const [redirected, setRedirected] = useState(false);

  // Fonction pour récupérer un cookie
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift();
      return cookieValue ? decodeURIComponent(cookieValue) : null;
    }
    return null;
  };

  useEffect(() => {
    // Fonction pour éviter les appels répétés
    if (redirected) return;
    
    // Redirection forcée immédiate
    const processTokensOnce = async () => {
      try {
        setRedirected(true);
        console.log('OAuth Callback - Processing tokens (once)');
        
        // Obtenir les tokens depuis l'URL
        const tokensParam = searchParams?.get('tokens');
        
        if (tokensParam) {
          try {
            console.log('Tokens found in URL parameters');
            
            // Stocker les tokens d'abord
            const tokenData = JSON.parse(decodeURIComponent(tokensParam));
            
            localStorage.setItem('accessToken', tokenData.accessToken);
            localStorage.setItem('refreshToken', tokenData.refreshToken);
            if (tokenData.user) {
              localStorage.setItem('user', JSON.stringify(tokenData.user));
            }
            
            // Vérifier toutes les sources possibles pour l'URL de redirection
            console.log('Checking all possible sources for redirection URL after OAuth');
            
            // Vérifier d'abord le cookie spécial créé pour OAuth
            const oauthRedirectUrl = getCookie('oauth_redirect_url');
            console.log('URL of redirection from cookie oauth_redirect_url:', oauthRedirectUrl);
            
            // Vérifier ensuite sessionStorage
            const sessionRedirectUrl = sessionStorage.getItem('redirectAfterLogin');
            console.log('URL of redirection from sessionStorage:', sessionRedirectUrl);
            
            // Vérifier enfin localStorage
            const localRedirectUrl = localStorage.getItem('redirectAfterLogin');
            console.log('URL of redirection from localStorage:', localRedirectUrl);
            
            // Utiliser la première URL disponible selon la priorité
            const redirectUrl = oauthRedirectUrl || sessionRedirectUrl || localRedirectUrl;
            console.log('Final chosen redirection URL:', redirectUrl);
            
            if (redirectUrl) {
              // Nettoyer tous les storages et cookies
              localStorage.removeItem('redirectAfterLogin');
              sessionStorage.removeItem('redirectAfterLogin');
              document.cookie = 'oauth_redirect_url=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              document.cookie = 'redirectAfterLogin_cookie=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              
              console.log('Redirecting to saved URL:', redirectUrl);
              
              // Mettre à jour l'authentification (mais sans redirection auto)
              await login(tokenData.accessToken, tokenData.refreshToken);
              
              // Rediriger manuellement vers l'URL sauvegardée
              window.location.replace(redirectUrl);
              return;
            }
            
            // Si pas d'URL de redirection, simplement mettre à jour l'authentification
            await login(tokenData.accessToken, tokenData.refreshToken);
          } catch (error) {
            console.error('Error processing tokens:', error);
          }
        }
        
        // Redirection par défaut si pas d'URL de redirection sauvegardée
        console.log('Redirecting to home page');
        window.location.replace('/');
      } catch (error) {
        console.error('Error:', error);
        window.location.replace('/');
      }
    };

    // Exécuter immédiatement
    processTokensOnce();
  }, [searchParams, login, redirected]);

  return null;
};

const OAuthCallback = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OAuthCallbackContent />
    </Suspense>
  );
};

export default OAuthCallback; 