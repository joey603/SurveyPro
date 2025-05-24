// src/app/settings/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from 'react';
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
  Snackbar,
  Slide,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import axios from 'axios';
import { colors } from '@mui/material';
import { useSearchParams } from 'next/navigation';

const SettingsContent = () => {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ username: string; email: string; authMethod?: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          window.location.href = '/login';
          return;
        }
        
        // Utiliser une URL relative en production pour profiter des rewrites
        const apiUrl = process.env.NODE_ENV === 'production' ? '/api' : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041'}/api`;
        
        const response = await axios.get(`${apiUrl}/auth/profile`, {
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

  const validateForm = () => {
    const errors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};
    let isValid = true;

    if (!currentPassword) {
      errors.currentPassword = 'Current password is required';
      isValid = false;
    }

    if (!newPassword) {
      errors.newPassword = 'New password is required';
      isValid = false;
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handlePasswordChange = async () => {
    // Réinitialiser les messages d'erreur et de succès
    setError('');
    setSuccessMessage('');
    
    // Validation du formulaire
    if (!validateForm()) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      // Utiliser une URL relative en production pour profiter des rewrites
      const apiUrl = process.env.NODE_ENV === 'production' ? '/api' : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041'}/api`;
      
      const payload = {
        currentPassword,
        newPassword
      };
      
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      const response = await axios.put(
        `${apiUrl}/auth/password`,
        payload,
        config
      );
      
      if (response.data) {
        setSuccessMessage('Password updated successfully!');
        setIsLoggingOut(true);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    } catch (err: any) {
      console.log('[DEBUG] Full error:', err);
      setError(err.response?.data?.message || 'Failed to update password.');
    }
  };

  const handleCloseMessage = () => {
    setError('');
    setSuccessMessage('');
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
      component="main"
      data-testid="settings-page"
      sx={{ 
        backgroundColor: '#f5f5f5', 
        minHeight: '100vh',
        padding: { xs: 2, sm: 4 },
        position: 'relative',
      }}
    >
      {/* Message d'alerte fixe en dessous de la navbar */}
      <Box 
        sx={{ 
          position: 'fixed',
          top: '64px', // Hauteur approximative de la navbar
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '600px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0 16px',
        }}
      >
        {error && (
          <Alert 
            severity="error" 
            variant="filled"
            onClose={handleCloseMessage}
            sx={{ 
              width: '100%',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              mb: 2,
              fontWeight: 500
            }}
          >
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert 
            severity="success" 
            variant="filled"
            sx={{ 
              width: '100%',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              mb: 2,
              fontWeight: 500
            }}
          >
            {successMessage}
          </Alert>
        )}
      </Box>

      <Box 
        component="section"
        data-testid="settings-container"
        sx={{
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          maxWidth: '1000px',
          margin: '0 auto',
          paddingTop: 4,
        }}
      >
        <Paper 
          component="article"
          data-testid="settings-content"
          elevation={3} 
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            width: '100%',
            minHeight: '600px',
          }}
        >
          <Box
            component="header"
            data-testid="settings-header"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              py: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              color: 'white',
            }}
          >
            <Avatar
              sx={{
                width: 120,
                height: 120,
                bgcolor: 'white',
                color: '#667eea',
                mb: 3,
                fontSize: '3rem',
              }}
            >
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            <Typography variant="h4" fontWeight="bold">
              {user?.username}
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.9 }}>
              {user?.authMethod ? `Connected via ${user.authMethod}` : 'Compte local'}
            </Typography>
          </Box>

          <Box
            component="section"
            data-testid="settings-forms"
            sx={{ 
              p: 6,
              backgroundColor: 'white',
              minHeight: '400px',
            }}
          >
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

            {user?.authMethod !== 'google' && user?.authMethod !== 'github' && (
              <>
                <Divider sx={{ my: 4 }} />

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
                    error={!!formErrors.currentPassword}
                    helperText={formErrors.currentPassword}
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
                    error={!!formErrors.newPassword}
                    helperText={formErrors.newPassword}
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
                    error={!!formErrors.confirmPassword}
                    helperText={formErrors.confirmPassword}
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
              </>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

// Composant principal avec Suspense pour résoudre l'erreur de useSearchParams
const Settings = () => {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    }>
      <SettingsContent />
    </Suspense>
  );
};

export default Settings;