// src/app/settings/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import axios from 'axios';

const Settings = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    // Fetch profile information when the component mounts
    const fetchProfile = async () => {
      try {
        const response = await axios.get('http://localhost:5041/api/auth/profile', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        setUsername(response.data.user.username);
        setEmail(response.data.user.email);
      } catch (error) {
        console.error('Failed to load profile information:', error);
      }
    };

    fetchProfile();
  }, []);

  const handleShowCurrentPasswordToggle = () => setShowCurrentPassword(!showCurrentPassword);
  const handleShowNewPasswordToggle = () => setShowNewPassword(!showNewPassword);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      alert("New password and confirm password don't match.");
      return;
    }
    try {
      await axios.put(
        'http://localhost:5041/api/auth/change-password',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
      );
      alert('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Failed to update password:', error);
      alert('Failed to update password.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Card style={{ maxWidth: 500, width: '100%', padding: '20px' }}>
        <CardContent>
          <Typography variant="h5" component="div" align="center" gutterBottom>
            Profile Settings
          </Typography>
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            value={username}
            disabled
            style={{ marginTop: '1rem' }}
          />
          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            value={email}
            disabled
            style={{ marginTop: '1rem' }}
          />
          <Typography variant="h6" component="div" align="center" gutterBottom style={{ marginTop: '2rem' }}>
            Change Password
          </Typography>
          <TextField
            label="Current Password"
            variant="outlined"
            type={showCurrentPassword ? 'text' : 'password'}
            fullWidth
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={{ marginTop: '1rem' }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleShowCurrentPasswordToggle}>
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
            style={{ marginTop: '1rem' }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleShowNewPasswordToggle}>
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
            style={{ marginTop: '1rem' }}
          />
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handlePasswordChange}
            style={{ marginTop: '1.5rem' }}
          >
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
