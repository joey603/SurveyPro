'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Avatar,
  Divider,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';

type User = {
  username: string;
  email: string;
};

const ProfilePage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('No token found. Please login.');
          setLoading(false);
          return;
        }

        const response = await axios.get('http://localhost:5041/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(response.data.user);
        setLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load profile information.');
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
        }}
      >
        <CircularProgress sx={{ color: '#667eea' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: { xs: 2, sm: 4 },
      }}
    >
      <Container maxWidth="sm">
        {error ? (
          <Alert 
            severity="error" 
            sx={{ 
              backgroundColor: 'white',
              borderRadius: 2,
            }}
          >
            {error}
          </Alert>
        ) : (
          <Paper
            elevation={3}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Header avec Avatar */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                py: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: 'white',
              }}
            >
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: 'white',
                  color: '#667eea',
                  mb: 2,
                }}
              >
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Typography variant="h4" fontWeight="bold">
                {user?.username}
              </Typography>
            </Box>

            {/* Contenu du profil */}
            <Box sx={{ p: 4, backgroundColor: 'white' }}>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  sx={{ mb: 1 }}
                >
                  USERNAME
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    bgcolor: 'rgba(102, 126, 234, 0.1)',
                    borderRadius: 1,
                  }}
                >
                  <PersonIcon sx={{ color: '#667eea' }} />
                  <Typography variant="body1">{user?.username}</Typography>
                </Box>
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  sx={{ mb: 1 }}
                >
                  EMAIL ADDRESS
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    bgcolor: 'rgba(102, 126, 234, 0.1)',
                    borderRadius: 1,
                  }}
                >
                  <EmailIcon sx={{ color: '#667eea' }} />
                  <Typography variant="body1">{user?.email}</Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default ProfilePage;