'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, Typography, Button, Container } from '@mui/material';
import { useRouter } from 'next/navigation';

const NotFoundContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          padding: 3,
        }}
      >
        <Typography 
          variant="h1" 
          component="h1" 
          sx={{ 
            fontSize: { xs: '5rem', md: '8rem' },
            fontWeight: 800,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2
          }}
        >
          404
        </Typography>
        
        <Typography 
          variant="h4" 
          component="h2" 
          sx={{ 
            mb: 3,
            fontWeight: 600
          }}
        >
          Page non trouvée
        </Typography>
        
        <Typography 
          variant="body1" 
          sx={{ 
            mb: 5,
            maxWidth: '600px',
            color: 'text.secondary'
          }}
        >
          La page que vous recherchez n'existe pas ou a été déplacée.
        </Typography>
        
        <Button 
          variant="contained" 
          onClick={() => router.push('/')}
          sx={{
            py: 1.5,
            px: 4,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
            },
            borderRadius: '8px',
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          Retour à l'accueil
        </Button>
      </Box>
    </Container>
  );
};

export default function NotFound() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography variant="h4">Chargement...</Typography>
      </Box>
    }>
      <NotFoundContent />
    </Suspense>
  );
} 