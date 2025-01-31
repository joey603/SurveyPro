"use client";

import React, { useState } from 'react';
import { Box, Typography, Paper, Snackbar, Alert } from '@mui/material';
import { getSurveyAnswers } from '@/utils/surveyService';

interface Survey {
  _id: string;
  title: string;
  description?: string;
  questions: Question[];
  createdAt: string;
  demographicEnabled: boolean;
  userId: string;
}

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
}

interface SurveyAnswer {
  _id: string;
  surveyId: string;
  answers: Answer[];
  submittedAt: string;
  respondent: {
    userId: {
      _id: string;
      username: string;
      email: string;
    };
    demographic?: Demographic;
  };
}

interface Answer {
  questionId: string;
  answer: string;
}

interface Demographic {
  gender?: string;
  dateOfBirth?: string;
  educationLevel?: string;
  city?: string;
}

const AnalyticsPage: React.FC = () => {
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<{ [key: string]: SurveyAnswer[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'error' | 'success'>('success');

  const [analyticsData, setAnalyticsData] = useState<{
    conditionalStats: any;
    demographicCorrelations: any;
    trendAnalysis: any;
  }>({
    conditionalStats: null,
    demographicCorrelations: null,
    trendAnalysis: null
  });

  const handleViewAnalytics = (survey: Survey) => {
    setSelectedSurvey(survey);
    const token = localStorage.getItem('accessToken') || '';
    setLoading(true);

    getSurveyAnswers(survey._id, token)
      .then(answers => {
        setSurveyAnswers(prev => ({
          ...prev,
          [survey._id]: answers
        }));
        analyzeConditionalResponses(answers, survey);
      })
      .catch(error => {
        console.error('Erreur de chargement des réponses:', error);
        setSnackbarMessage('Échec du chargement des analyses');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const analyzeConditionalResponses = (answers: SurveyAnswer[], survey: Survey) => {
    // Logique d'analyse pour les sondages conditionnels
    // À implémenter selon vos besoins spécifiques
  };

  return (
    <Box
      component="section"
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: { xs: 2, sm: 4 },
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 2,
          backgroundColor: 'white',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{
            color: '#1a237e',
            fontWeight: 600,
            mb: 4
          }}
        >
          Analyses Avancées
        </Typography>
        
        {loading && (
          <Typography color="text.secondary">
            Chargement des données...
          </Typography>
        )}

        {error && (
          <Typography color="error">
            {error}
          </Typography>
        )}

        {/* Interface d'analyse à implémenter */}
      </Paper>

      <Snackbar 
        open={openSnackbar} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AnalyticsPage; 