'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/utils/AuthContext';
import { handleOAuthCallback } from '@/services/authService';
import { Box, CircularProgress, Typography, Paper, Button } from '@mui/material';

const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
    <CircularProgress />
  </Box>
);

const OAuthCallbackContent = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('OAuth callback initiated');
        setLoading(true);
        
        const params = new URLSearchParams(window.location.search);
        const tokensParam = params.get('tokens');
        const errorParam = params.get('error');
        const errorMessage = params.get('message');
        
        console.log('OAuth callback params:', { tokensParam: !!tokensParam, errorParam, errorMessage });
        
        if (errorParam === 'existing_user' || !tokensParam) {
          console.log('OAuth error:', errorParam, errorMessage);
          setError(errorMessage || 'Authentication failed');
          setLoading(false);
          return;
        }

        const { accessToken, refreshToken, user } = await handleOAuthCallback(tokensParam);
        
        if (!user) {
          console.log('No user returned from OAuth');
          setError('No user data returned from authentication');
          setLoading(false);
          return;
        }

        console.log('OAuth successful, logging in user:', user.email);
        await login(accessToken, refreshToken);
        router.push('/');
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        setError(error.message || 'Authentication failed');
        setLoading(false);
      }
    };

    handleCallback();
  }, [router, login]);

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          p: 3
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            maxWidth: 500,
            width: '100%',
            textAlign: 'center'
          }}
        >
          <Typography variant="h5" sx={{ mb: 2, color: 'error.main' }}>
            Authentication Error
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {error}
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push('/login')}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              }
            }}
          >
            Return to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <CircularProgress />
    </Box>
  );
};

const OAuthCallback = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OAuthCallbackContent />
    </Suspense>
  );
};

export default OAuthCallback; 