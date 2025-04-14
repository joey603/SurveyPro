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
        
        if (!user) {
          router.push('/login');
          return;
        }

        await login(accessToken, refreshToken);
        router.push('/');
      } catch (error) {
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