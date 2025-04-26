'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/utils/AuthContext';
import { handleOAuthCallback } from '@/services/authService';
import { Box, CircularProgress } from '@mui/material';

const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
    <CircularProgress />
  </Box>
);

const OAuthCallbackContent = () => {
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tokensParam = params.get('tokens');
        const errorParam = params.get('error');
        
        if (errorParam === 'existing_user' || !tokensParam) {
          router.push('/login');
          return;
        }

        const { accessToken, refreshToken, user } = await handleOAuthCallback(tokensParam);
        
        console.log('Received user data:', user);
        
        if (!user) {
          console.error('No user data found in token response');
          router.push('/login');
          return;
        }

        // Stockage explicite des informations utilisateur pour les utiliser plus tard si nécessaire
        localStorage.setItem('user', JSON.stringify(user));
        
        // Log de débogage pour voir si authMethod est correctement défini
        console.log('User authentication method:', user.authMethod);
        
        await login(accessToken, refreshToken);
        router.push('/');
      } catch (error) {
        console.error('Error in OAuth callback:', error);
        router.push('/login');
      }
    };

    handleCallback();
  }, []);

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