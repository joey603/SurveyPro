'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/utils/AuthContext';
import { Box, CircularProgress } from '@mui/material';

// Page ultra-minimaliste pour redirection immédiate
const OAuthCallbackPage = () => {
  const searchParams = useSearchParams();
  const auth = useAuth();
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
            auth.login(tokenData.accessToken, tokenData.refreshToken);
          } catch (error) {
            console.error('Erreur lors du traitement des tokens:', error);
          }
        }
        
        // Redirection immédiate dans tous les cas
        console.log('Redirection forcée vers la page d\'accueil');
        window.location.replace('/');
      } catch (error) {
        console.error('Erreur:', error);
        window.location.replace('/');
      }
    };

    // Exécuter immédiatement
    processTokensOnce();
    
    // Redirection de secours après 200ms
    const redirectTimer = setTimeout(() => {
      if (!redirected) {
        console.log('Redirection de secours activée');
        window.location.replace('/');
      }
    }, 200);
    
    return () => clearTimeout(redirectTimer);
  }, [auth, searchParams, redirected]);

  // UI minimale
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height="100vh"
      bgcolor="#f5f5f5"
    >
      <CircularProgress size={40} />
    </Box>
  );
};

export default OAuthCallbackPage; 