'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/utils/AuthContext';
import { handleOAuthCallback } from '@/services/authService';
import { Alert, Box, CircularProgress } from '@mui/material';

const OAuthCallback = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        console.log('URL Search Params:', Object.fromEntries(params.entries()));
        
        const tokensParam = params.get('tokens');
        const errorParam = params.get('error');
        const errorMessage = params.get('message');
        
        console.log('Error Param:', errorParam);
        console.log('Error Message:', errorMessage);
        
        if (errorParam === 'existing_user') {
          console.log('Existing user error detected');
          setError(errorMessage || 'Un compte existe déjà avec cet email. Veuillez utiliser votre méthode de connexion habituelle.');
          console.log('Error state set:', error);
          setTimeout(() => {
            console.log('Redirecting to login page...');
            window.location.href = '/login';
          }, 30000);
          return;
        }

        if (!tokensParam) {
          throw new Error('No tokens received');
        }

        const { accessToken, refreshToken, user } = await handleOAuthCallback(tokensParam);
        
        if (!user) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setError('Utilisateur non trouvé. Veuillez vous reconnecter.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 30000);
          return;
        }

        await login(accessToken, refreshToken);
        window.location.href = '/';
      } catch (error) {
        console.error('Detailed error:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setError('Une erreur est survenue lors de l\'authentification');
        setTimeout(() => {
          window.location.href = '/login';
        }, 10000);
      }
    };

    handleCallback();
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '2rem'
      }}
    >
      {error ? (
        <Alert severity="error" sx={{ maxWidth: '500px' }}>
          {error}
        </Alert>
      ) : (
        <>
          <CircularProgress />
          <div>Connexion en cours...</div>
          <div>Veuillez patienter pendant que nous finalisons votre authentification.</div>
        </>
      )}
    </Box>
  );
};

export default OAuthCallback; 