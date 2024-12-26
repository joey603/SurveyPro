// src/app/settings/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import axios from 'axios';

const Settings = () => {
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('http://localhost:5041/api/auth/profile', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
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

  const handlePasswordChange = async () => {
    setError('');
    setSuccessMessage('');

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password don't match.");
      return;
    }

    try {
      await axios.put(
        'http://localhost:5041/api/auth/change-password',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
      );
      setSuccessMessage('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password.');
    }
  };

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
      <Container maxWidth="md">
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

          {/* Contenu */}
          <Box sx={{ p: 4, backgroundColor: 'white' }}>
            {(error || successMessage) && (
              <Box sx={{ mb: 3 }}>
                {error && <Alert severity="error">{error}</Alert>}
                {successMessage && <Alert severity="success">{successMessage}</Alert>}
              </Box>
            )}

            {/* Section Profile */}
            <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
              Profile Information
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
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

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
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

            <Divider sx={{ my: 4 }} />

            {/* Section Password */}
            <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
              Change Password
            </Typography>

            <Box sx={{ mb: 3 }}>
              <TextField
                label="Current Password"
                variant="outlined"
                type={showCurrentPassword ? 'text' : 'password'}
                fullWidth
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: '#667eea' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="New Password"
                variant="outlined"
                type={showNewPassword ? 'text' : 'password'}
                fullWidth
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: '#667eea' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Confirm New Password"
                variant="outlined"
                type="password"
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: '#667eea' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                variant="contained"
                fullWidth
                onClick={handlePasswordChange}
                sx={{
                  py: 1.5,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  },
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                Update Password
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Settings;