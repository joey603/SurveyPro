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

  useEffect(() => {
    // Fonction pour éviter les appels répétés
    if (redirected) return;
    
    // Redirection forcée immédiate
    const processTokensOnce = async () => {
      try {
        setRedirected(true);
        console.log('OAuth Callback - Traitement des tokens (une seule fois)');
        
        // Obtenir les tokens depuis l'URL
        const tokensParam = searchParams.get('tokens');
        
        if (tokensParam) {
          try {
            // Stocker les tokens d'abord
            const tokenData = JSON.parse(decodeURIComponent(tokensParam));
            
            localStorage.setItem('accessToken', tokenData.accessToken);
            localStorage.setItem('refreshToken', tokenData.refreshToken);
            if (tokenData.user) {
              localStorage.setItem('user', JSON.stringify(tokenData.user));
            }
            
            // Mettre à jour l'authentification
            await login(tokenData.accessToken, tokenData.refreshToken);

            // Récupérer l'URL de redirection sauvegardée
            const redirectUrl = localStorage.getItem('redirectAfterLogin');
            if (redirectUrl) {
              // Nettoyer le localStorage
              localStorage.removeItem('redirectAfterLogin');
              // Rediriger vers l'URL sauvegardée
              window.location.replace(redirectUrl);
              return;
            }
          } catch (error) {
            console.error('Erreur lors du traitement des tokens:', error);
          }
        }
        
        // Redirection par défaut si pas d'URL de redirection sauvegardée
        console.log('Redirection vers la page d\'accueil');
        window.location.replace('/');
      } catch (error) {
        console.error('Erreur:', error);
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