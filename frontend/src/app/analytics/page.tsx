"use client";

import React, { useState } from 'react';
import { Box, Typography, Paper, Snackbar, Alert, IconButton, TextField, InputAdornment, Stack, Chip } from '@mui/material';
import { getSurveyAnswers } from '@/utils/surveyService';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import SearchAndFilter from '../components/analytics/SearchAndFilter';

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

  const [filteredData, setFilteredData] = useState(analyticsData);

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

  const handleSearchChange = (value: string) => {
    // Implémentez la logique de filtrage par recherche
    console.log('Search value:', value);
  };

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    // Implémentez la logique de filtrage par date
    console.log('Date range:', start, end);
  };

  const handleSortChange = (sort: 'date' | 'popular') => {
    // Implémentez la logique de tri
    console.log('Sort by:', sort);
  };

  return (
    <Box 
      component="section"
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: { xs: 2, sm: 4 },
        maxWidth: '1000px',
        margin: '0 auto',
      }}
    >
      <Paper
        component="article"
        elevation={3}
        sx={{
          borderRadius: '16px',
          backgroundColor: 'white',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '1000px',
          mb: 4,
        }}
      >
        <Box sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 4,
          px: 4,
          color: 'white',
          textAlign: 'center',
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <IconButton
            onClick={() => window.history.back()}
            sx={{ color: 'white' }}
          >
            <ArrowBackIcon />
          </IconButton>

          <Typography
            variant="h4"
            fontWeight="bold"
          >
            Analyses Avancées
          </Typography>

          <Box sx={{ width: 48 }} /> {/* Spacer pour équilibrer le layout */}
        </Box>

        <Box sx={{ p: 3 }}>
          <SearchAndFilter
            onSearchChange={handleSearchChange}
            onDateRangeChange={handleDateRangeChange}
            onSortChange={handleSortChange}
          />

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
        </Box>
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