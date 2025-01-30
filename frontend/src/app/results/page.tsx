"use client";

import React, { useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { ResultsHeader } from './components/ResultsHeader';
import { SurveyList } from './components/SurveyList';
import { SurveyDetails } from './components/SurveyDetails';
import { useResults } from './hooks/useResults';
import { colors } from '@/theme/colors';

const ResultsPage: React.FC = () => {
  const {
    surveys,
    selectedSurvey,
    loading,
    error,
    handleSurveySelect,
    handleDeleteSurvey,
    handleShareResponse
  } = useResults();

  const [currentView, setCurrentView] = useState<'list' | 'details'>('list');

  if (error) {
    return (
      <Box
        component="section"
        sx={{
          textAlign: 'center',
          color: 'error.main',
          p: 4 
        }}
      >
        {error}
      </Box>
    );
  }

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: { xs: 2, sm: 4 },
      }}
    >
      <Paper
        elevation={3}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '1000px',
          mb: 4,
        }}
      >
        {/* Header avec gradient */}
        <Box sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 4,
          px: 4,
          color: 'white',
          textAlign: 'center',
          position: 'relative'
        }}>
          <Typography variant="h4" fontWeight="bold">
            Survey Results
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.9 }}>
            View and analyze your survey responses
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ p: 4, backgroundColor: 'white' }}>
          {currentView === 'list' ? (
            <SurveyList
              surveys={surveys}
              loading={loading}
              onSurveySelect={handleSurveySelect}
              onDeleteSurvey={handleDeleteSurvey}
              onShareResponse={handleShareResponse}
            />
          ) : (
            <SurveyDetails
              survey={selectedSurvey}
              onBack={() => setCurrentView('list')}
            />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default ResultsPage;