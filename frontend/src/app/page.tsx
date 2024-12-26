'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Paper,
  Fade,
  Slide,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import PollIcon from '@mui/icons-material/Poll';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TimelineIcon from '@mui/icons-material/Timeline';
import { useAuth } from '../utils/AuthContext';

const Home = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: <PollIcon sx={{ fontSize: 40, color: '#667eea' }} />,
      title: 'Create Surveys',
      description: 'Design professional surveys with our intuitive survey builder',
      delay: 500,
    },
    {
      icon: <AnalyticsIcon sx={{ fontSize: 40, color: '#667eea' }} />,
      title: 'Gather Insights',
      description: 'Collect and analyze responses in real-time',
      delay: 1000,
    },
    {
      icon: <TimelineIcon sx={{ fontSize: 40, color: '#667eea' }} />,
      title: 'Track Progress',
      description: 'Monitor survey performance with detailed analytics',
      delay: 1500,
    },
  ];

  return (
    <Box sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Fade in timeout={1000}>
                <Box>
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      fontSize: { xs: '2.5rem', md: '3.5rem' },
                    }}
                  >
                    SurveyPro
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ mb: 4, opacity: 0.9, lineHeight: 1.5 }}
                  >
                    Create, Share, and Analyze Surveys with Ease
                  </Typography>
                  {!isAuthenticated && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={() => router.push('/register')}
                        sx={{
                          backgroundColor: 'white',
                          color: '#667eea',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          },
                        }}
                      >
                        Get Started
                      </Button>
                      <Button
                        variant="outlined"
                        size="large"
                        onClick={() => router.push('/login')}
                        sx={{
                          borderColor: 'white',
                          color: 'white',
                          '&:hover': {
                            borderColor: 'rgba(255, 255, 255, 0.9)',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          },
                        }}
                      >
                        Login
                      </Button>
                    </Box>
                  )}
                </Box>
              </Fade>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Slide
                direction="up"
                in
                timeout={feature.delay}
                style={{ transitionDelay: `${feature.delay}ms` }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    height: '100%',
                    backgroundColor: 'white',
                    borderRadius: 2,
                    transition: 'transform 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                    }}
                  >
                    {feature.icon}
                    <Typography
                      variant="h5"
                      sx={{ mt: 2, mb: 1, color: '#1a237e' }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {feature.description}
                    </Typography>
                  </Box>
                </Paper>
              </Slide>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Call to Action Section */}
      <Box
        sx={{
          backgroundColor: 'white',
          py: 8,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Fade in timeout={2000}>
            <Box>
              <Typography variant="h3" sx={{ mb: 3, color: '#1a237e' }}>
                Ready to Get Started?
              </Typography>
              <Typography
                variant="h6"
                sx={{ mb: 4, color: 'text.secondary' }}
              >
                Join thousands of users who are already creating amazing surveys
              </Typography>
              {!isAuthenticated && (
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => router.push('/register')}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    },
                    px: 4,
                    py: 1.5,
                  }}
                >
                  Create Your First Survey
                </Button>
              )}
            </Box>
          </Fade>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
