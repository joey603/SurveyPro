'use client';

import React, { useEffect, useRef, useState } from 'react';
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
import Lottie from 'lottie-react';
import pollAnimation from '../assets/animation-pollIcon.json';
import analyticsAnimation from '../assets/animation-analyticsIcon.json';
import timelineAnimation from '../assets/animation-timeline.json';

const Home = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // États pour chaque section
  const [isHeroVisible, setIsHeroVisible] = useState(false);
  const [isFeaturesVisible, setIsFeaturesVisible] = useState(false);
  const [isLeadershipVisible, setIsLeadershipVisible] = useState(false);
  const [isCtaVisible, setIsCtaVisible] = useState(false);

  // Refs pour chaque section
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const leadershipRef = useRef(null);
  const ctaRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const createObserver = (setVisibility: (visible: boolean) => void) => {
      return new IntersectionObserver(
        ([entry]) => {
          setVisibility(entry.isIntersecting);
        },
        { threshold: 0.1 }
      );
    };

    const observers = [
      { ref: heroRef, setVisibility: setIsHeroVisible },
      { ref: featuresRef, setVisibility: setIsFeaturesVisible },
      { ref: leadershipRef, setVisibility: setIsLeadershipVisible },
      { ref: ctaRef, setVisibility: setIsCtaVisible },
    ].map(({ ref, setVisibility }) => {
      const observer = createObserver(setVisibility);
      if (ref.current) {
        observer.observe(ref.current);
      }
      return observer;
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

  const features = [
    {
      icon: (
        <Lottie
          animationData={pollAnimation}
          style={{ width: 200, height: 200 }}
          loop={true}
        />
      ),
      title: 'Create Surveys',
      description:
        'Design professional surveys with our intuitive survey builder',
      delay: 500,
      link: '/survey-creation',
    },
    {
      icon: (
        <Lottie
          animationData={analyticsAnimation}
          style={{ width: 200, height: 200 }}
          loop={true}
        />
      ),
      title: 'Gather Insights',
      description: 'Collect and analyze responses in real-time',
      delay: 1000,
      link: '/survey-answer',
    },
    {
      icon: (
        <Lottie
          animationData={timelineAnimation}
          style={{ width: 200, height: 200 }}
          loop={true}
        />
      ),
      title: 'Track Progress',  
      description: 'Monitor survey performance with detailed analytics',
      delay: 1500,
      link: '/results',
    },
  ];

  const leaders = [
    {
      name: 'Rudy Haddad',
      role: 'Co-Founder & CEO',
      description:
        'Visionary leader with expertise in survey solutions and data analytics',
      delay: 500,
      image: '/images/rudy.jpeg',
      linkedin: 'https://www.linkedin.com/in/rudy-haddad/',
    },
    {
      name: 'Yoeli Barthel',
      role: 'Co-Founder & CTO',
      description:
        'Technical innovator specializing in software architecture and user experience',
      delay: 800,
      image: '/images/yoeli.jpeg',
      linkedin: 'https://www.linkedin.com/in/yoeli-barthel/',
    },
  ];

  const renderLeaderCard = (leader: any, index: number) => {
    const content = (
      <Paper
        elevation={0}
        onClick={() => window.open(leader.linkedin, '_blank')}
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Avatar
          src={leader.image}
          sx={{
            width: 120,
            height: 120,
            mb: 2,
            border: '4px solid #667eea',
            boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
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
    );

    return (
      <Grid item xs={12} md={6} key={index}>
        <Box sx={{ position: 'relative' }}>
          <Fade in={isLeadershipVisible} timeout={1000}>
            <Box>
              <Slide
                direction="up"
                in={isLeadershipVisible}
                timeout={1000}
                container={containerRef.current}
              >
                <Box>{content}</Box>
              </Slide>
            </Box>
          </Fade>
        </Box>
      </Grid>
    );
  };

  return (
    <Box ref={containerRef} sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Hero Section */}
      <Box
        ref={heroRef}
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
              <Fade in={isHeroVisible} timeout={1000}>
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
      <Container ref={featuresRef} maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Slide
                direction="up"
                in={isFeaturesVisible}
                timeout={feature.delay}
                style={{
                  transitionDelay: isFeaturesVisible
                    ? `${feature.delay}ms`
                    : '0ms',
                }}
              >
                <Paper
                  elevation={0}
                  onClick={() =>
                    isAuthenticated
                      ? router.push(feature.link)
                      : router.push('/login')
                  }
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
        ref={leadershipRef}
        sx={{
          py: 8,
          background: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
        }}
      >
        <Container maxWidth="lg">
          <Fade in={isLeadershipVisible} timeout={800}>
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
            {leaders.map((leader, index) => renderLeaderCard(leader, index))}
          </Grid>
        </Container>
      </Box>

      {/* Call to Action Section */}
      <Box
        ref={ctaRef}
        sx={{
          backgroundColor: 'white',
          py: 8,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Fade in={isCtaVisible} timeout={2000}>
            <Box>
              <Typography variant="h3" sx={{ mb: 3, color: '#1a237e' }}>
                Ready to Get Started?
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, color: 'text.secondary' }}>
                Join thousands of users who are already creating amazing surveys
              </Typography>
              {!isAuthenticated && (
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => router.push('/register')}
                  sx={{
                    background:
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background:
                        'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
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
