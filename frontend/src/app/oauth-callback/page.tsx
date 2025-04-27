'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/utils/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

// Page la plus minimaliste possible pour accélérer le chargement
const OAuthCallbackPage = () => {
  const searchParams = useSearchParams();
  const auth = useAuth();
  
  useEffect(() => {
    // Redirection automatique ultra-rapide après seulement 500ms
    const redirectTimer = setTimeout(() => {
      console.log('Timeout reached, forcing redirect to home page');
      window.location.href = '/';
    }, 500);
    
    const processCallback = async () => {
      try {
        console.log('OAuth Callback - Processing tokens');
        
        // Obtenir les tokens depuis l'URL
        const tokensParam = searchParams.get('tokens');
        
        if (tokensParam) {
          try {
            // Stocker les tokens d'abord, traiter ensuite
            const tokenData = JSON.parse(decodeURIComponent(tokensParam));
            
            // Stocker les tokens
            localStorage.setItem('accessToken', tokenData.accessToken);
            localStorage.setItem('refreshToken', tokenData.refreshToken);
            if (tokenData.user) {
              localStorage.setItem('user', JSON.stringify(tokenData.user));
            }
            
            // Mettre à jour l'authentification
            auth.login(tokenData.accessToken, tokenData.refreshToken);
            
            // Rediriger immédiatement
            console.log('Redirecting to home page');
            window.location.href = '/';
          } catch (error) {
            console.error('Error processing tokens:', error);
            window.location.href = '/';
          }
        } else {
          // Pas de tokens, rediriger vers l'accueil quand même
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Error:', error);
        window.location.href = '/';
      }
    };

    // Exécuter le traitement immédiatement
    processCallback();
    
    // Nettoyage
    return () => clearTimeout(redirectTimer);
  }, [auth, searchParams]);

  // UI minimale pour accélérer le chargement
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