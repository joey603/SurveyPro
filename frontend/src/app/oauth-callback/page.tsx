'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/utils/AuthContext';
import { Box, CircularProgress, Typography, Paper, Button, Alert } from '@mui/material';

const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
    <CircularProgress />
  </Box>
);

const OAuthCallbackPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [authMethod, setAuthMethod] = useState<string | null>(null);
  const [debug, setDebug] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        console.log('OAuth Callback - Processing authentication result');
        console.log('URL Search Params:', window.location.search);
        
        // Obtenir les paramètres de l'URL
        const tokensParam = searchParams.get('tokens');
        const errorParam = searchParams.get('error');
        const messageParam = searchParams.get('message');

        // Stocker des informations de débogage
        setDebug(`Tokens: ${!!tokensParam}, Error: ${errorParam}, Message: ${messageParam}`);
        
        // En cas d'erreur
        if (errorParam) {
          console.log('OAuth Callback - Error detected:', errorParam, messageParam);
          setStatus('error');
          setMessage(messageParam || 'Une erreur est survenue lors de l\'authentification');
          // Si l'erreur indique que l'utilisateur existe déjà avec une autre méthode
          if (errorParam === 'existing_user') {
            const authMethodParam = searchParams.get('authMethod');
            console.log('Existing user with auth method:', authMethodParam);
            setAuthMethod(authMethodParam || null);
          }
          return;
        }

        // Si on a des tokens, traiter l'authentification
        if (tokensParam) {
          console.log('OAuth Callback - Tokens received, processing...');
          try {
            const decodedTokens = decodeURIComponent(tokensParam);
            console.log('Decoded tokens JSON:', decodedTokens);
            const tokenData = JSON.parse(decodedTokens);
            console.log('Token data parsed successfully:', !!tokenData.accessToken, !!tokenData.refreshToken);
            
            // Vérifier si le token contient une info indiquant un compte existant
            if (tokenData.existingUser) {
              console.log('Existing user detected in token data');
              setStatus('success');
              setMessage(`Vous vous êtes connecté avec succès ! Un compte existant avec cet email a été utilisé pour la connexion.`);
            } else {
              console.log('New user authentication successful');
              setStatus('success');
              setMessage('Vous vous êtes connecté avec succès !');
            }
            
            // Stocker les tokens dans localStorage
            localStorage.setItem('accessToken', tokenData.accessToken);
            localStorage.setItem('refreshToken', tokenData.refreshToken);
            if (tokenData.user) {
              localStorage.setItem('user', JSON.stringify(tokenData.user));
            }
            
            // Mettre à jour le contexte d'authentification
            auth.login(tokenData.accessToken, tokenData.refreshToken);
            
            // Rediriger après un court délai pour que l'utilisateur puisse voir le message
            console.log('Redirecting to dashboard in 1.5 seconds...');
            setTimeout(() => {
              router.push('/dashboard');
            }, 1500);
            return;
          } catch (error: any) {
            console.error('Error parsing token data:', error);
            setStatus('error');
            setMessage('Erreur lors du traitement des données d\'authentification');
            setDebug(`Parse error: ${error.message}, Token data: ${tokensParam.substring(0, 50)}...`);
            return;
          }
        }

        // Aucun token ni erreur
        console.log('OAuth Callback - No tokens or error found');
        setStatus('error');
        setMessage('Aucune information d\'authentification n\'a été reçue');
      } catch (error: any) {
        console.error('Error processing OAuth callback:', error);
        setStatus('error');
        setMessage(`Une erreur est survenue lors du traitement de l'authentification: ${error.message}`);
      }
    };

    processCallback();
  }, [auth, router, searchParams]);

  // Fonction pour revenir à la page de connexion
  const goToLogin = () => {
    console.log('Redirecting to login page...');
    router.push('/login');
  };

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="#f5f5f5"
        px={2}
      >
        <Paper
          elevation={3}
          sx={{
            maxWidth: 500,
            width: '100%',
            p: 4,
            borderRadius: 2,
            textAlign: 'center'
          }}
        >
          {status === 'loading' && (
            <>
              <CircularProgress sx={{ mb: 2, color: '#667eea' }} />
              <Typography variant="h6">Traitement de l'authentification...</Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>Authentification réussie !</Alert>
              <Typography variant="body1" sx={{ mb: 2 }}>{message}</Typography>
              <Typography variant="body2" color="text.secondary">
                Vous allez être redirigé vers votre tableau de bord...
              </Typography>
              <Button
                variant="contained"
                onClick={() => router.push('/dashboard')}
                sx={{
                  mt: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  }
                }}
              >
                Aller au tableau de bord
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <Alert severity="error" sx={{ mb: 2 }}>Erreur d'authentification</Alert>
              <Typography variant="body1" sx={{ mb: 2 }}>{message}</Typography>
              
              {authMethod && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Veuillez vous connecter en utilisant la méthode: {authMethod}
                </Typography>
              )}
              
              {debug && (
                <Typography variant="caption" display="block" sx={{ mb: 2, color: 'text.secondary', fontSize: '0.7rem' }}>
                  Info de débogage: {debug}
                </Typography>
              )}
              
              <Button
                variant="contained"
                onClick={goToLogin}
                sx={{
                  mt: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  }
                }}
              >
                Retour à la page de connexion
              </Button>
            </>
          )}
        </Paper>
      </Box>
    </Suspense>
  );
};

export default OAuthCallbackPage; 