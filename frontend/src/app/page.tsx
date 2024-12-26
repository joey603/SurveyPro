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
import Avatar from '@mui/material/Avatar';

const Home = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: <PollIcon sx={{ fontSize: 40, color: '#667eea' }} />,
      title: 'Create Surveys',
      description: 'Design professional surveys with our intuitive survey builder',
      delay: 500,
      link: '/survey-creation'
    },
    {
      icon: <AnalyticsIcon sx={{ fontSize: 40, color: '#667eea' }} />,
      title: 'Gather Insights',
      description: 'Collect and analyze responses in real-time',
      delay: 1000,
      link: '/survey-answer'
    },
    {
      icon: <TimelineIcon sx={{ fontSize: 40, color: '#667eea' }} />,
      title: 'Track Progress',
      description: 'Monitor survey performance with detailed analytics',
      delay: 1500,
      link: '/results'
    },
  ];

  const leaders = [
    {
      name: 'Rudy Haddad',
      role: 'Co-Founder & CEO',
      description: 'Visionary leader with expertise in survey solutions and data analytics',
      delay: 500,
    },
    {
      name: 'Yoeli Barthel',
      role: 'Co-Founder & CTO',
      description: 'Technical innovator specializing in software architecture and user experience',
      delay: 1000,
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
                  onClick={() => isAuthenticated ? router.push(feature.link) : router.push('/login')}
                  sx={{
                    p: 4,
                    height: '100%',
                    backgroundColor: 'white',
                    borderRadius: 2,
                    transition: 'all 0.3s ease-in-out',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
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

      {/* Leadership Section */}
      <Box
        sx={{
          py: 8,
          background: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
        }}
      >
        <Container maxWidth="lg">
          <Fade in timeout={1000}>
            <Typography
              variant="h3"
              sx={{
                textAlign: 'center',
                mb: 6,
                color: '#1a237e',
                fontWeight: 600,
              }}
            >
              Our Leadership
            </Typography>
          </Fade>
          <Grid container spacing={4} justifyContent="center">
            {leaders.map((leader, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Slide
                  direction="up"
                  in
                  timeout={leader.delay}
                  style={{ transitionDelay: `${leader.delay}ms` }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      height: '100%',
                      backgroundColor: 'white',
                      borderRadius: 2,
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      },
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 120,
                        height: 120,
                        mb: 2,
                        bgcolor: '#667eea',
                        fontSize: '2.5rem',
                      }}
                    >
                      {leader.name.charAt(0)}
                    </Avatar>
                    <Typography
                      variant="h5"
                      sx={{
                        mb: 1,
                        color: '#1a237e',
                        fontWeight: 600,
                      }}
                    >
                      {leader.name}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        mb: 2,
                        color: '#667eea',
                        fontWeight: 500,
                      }}
                    >
                      {leader.role}
                    </Typography>
                    <Typography
                      color="text.secondary"
                      sx={{
                        lineHeight: 1.6,
                      }}
                    >
                      {leader.description}
                    </Typography>
                  </Paper>
                </Slide>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

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
