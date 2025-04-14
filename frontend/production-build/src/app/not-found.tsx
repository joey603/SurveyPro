'use client';

import React, { Suspense } from 'react';
import { Box, Button, Typography, Container, Paper, CircularProgress } from '@mui/material';
import Link from 'next/link';

const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
    <CircularProgress />
  </Box>
);

export default function NotFound() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Container maxWidth="sm" sx={{ mt: 10, mb: 10 }}>
        <Paper
          elevation={3}
          sx={{
            py: 6,
            px: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 3,
            bgcolor: '#f9f9f9',
          }}
        >
          <Typography variant="h1" sx={{ fontSize: '8rem', fontWeight: 'bold', color: '#667eea' }}>
            404
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, color: '#444', textAlign: 'center' }}>
            Oops! Page introuvable
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: '#666', textAlign: 'center' }}>
            La page que vous recherchez n'existe pas ou a été déplacée.
          </Typography>
          <Link href="/" passHref>
            <Button
              variant="contained"
              sx={{
                mt: 2,
                px: 4,
                py: 1.5,
                borderRadius: 5,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
              }}
            >
              Retour à l'accueil
            </Button>
          </Link>
        </Paper>
      </Container>
    </Suspense>
  );
} 