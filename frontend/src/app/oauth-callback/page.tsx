'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/utils/AuthContext';
import { handleOAuthCallback } from '@/services/authService';
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

  useEffect(() => {
    const processCallback = async () => {
      try {
        const tokensParam = searchParams.get('tokens');
        const errorParam = searchParams.get('error');
        const messageParam = searchParams.get('message');
        
        // En cas d'erreur
        if (errorParam) {
          setStatus('error');
          setMessage(messageParam || 'Une erreur est survenue lors de l\'authentification');
          // Si l'erreur indique que l'utilisateur existe déjà avec une autre méthode
          if (errorParam === 'existing_user') {
            setAuthMethod(searchParams.get('authMethod') || null);
          }
          return;
        }

        // Si on a des tokens, traiter l'authentification
        if (tokensParam) {
          const tokenData = JSON.parse(decodeURIComponent(tokensParam));
          
          // Vérifier si le token contient une info indiquant un compte existant
          if (tokenData.existingUser) {
            setStatus('success');
            setMessage(`Vous vous êtes connecté avec succès ! Un compte existant avec cet email a été utilisé pour la connexion.`);
          } else {
            setStatus('success');
            setMessage('Vous vous êtes connecté avec succès !');
          }
          
          auth.login(tokenData.accessToken, tokenData.refreshToken);
          
          // Rediriger après un court délai pour que l'utilisateur puisse voir le message
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
          return;
        }

        setStatus('error');
        setMessage('Aucune information d\'authentification n\'a été reçue');
      } catch (error) {
        console.error('Error processing OAuth callback:', error);
        setStatus('error');
        setMessage('Une erreur est survenue lors du traitement de l\'authentification');
      }
    };

    processCallback();
  }, [auth, router, searchParams]);

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
              
              <Button
                variant="contained"
                onClick={() => router.push('/login')}
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