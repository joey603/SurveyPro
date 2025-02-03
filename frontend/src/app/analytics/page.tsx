"use client";

import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Snackbar, Alert, IconButton, TextField, InputAdornment, Stack, Chip, Grid } from '@mui/material';
import { getSurveyAnswers, fetchSurveys } from '@/utils/surveyService';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import SearchAndFilter from '../components/analytics/SearchAndFilter';
import { AnalyticsCard } from '../components/analytics/AnalyticsCard';
import { useAuth } from '@/utils/AuthContext';

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

  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);

  useEffect(() => {
    const loadSurveys = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken') || '';
        const surveysData = await fetchSurveys(token);
        setSurveys(surveysData);
      } catch (error) {
        console.error('Error loading surveys:', error);
        setError('Failed to load surveys');
        setSnackbarMessage('Failed to load surveys');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
      } finally {
        setLoading(false);
      }
    };

    loadSurveys();
  }, []);

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

  const handlePendingChange = (pending: boolean) => {
    // Gérer le changement d'état en attente
    console.log('Pending state:', pending);
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    try {
      const token = localStorage.getItem('accessToken') || '';
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/surveys/${surveyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSurveys(surveys.filter(s => s._id !== surveyId));
      setSnackbarMessage('Survey deleted successfully');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
    } catch (error) {
      console.error('Error deleting survey:', error);
      setSnackbarMessage('Failed to delete survey');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
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
            onPendingChange={handlePendingChange}
          />

          {loading && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Loading surveys...
            </Typography>
          )}

          {error && (
            <Typography color="error" sx={{ textAlign: 'center', py: 4 }}>
              {error}
            </Typography>
          )}

          {!loading && !error && (
            <Grid container spacing={3}>
              {surveys.map((survey) => (
                <Grid item xs={12} sm={6} md={6} key={survey._id}>
                  <AnalyticsCard
                    survey={survey}
                    onDelete={handleDeleteSurvey}
                    onViewAnalytics={handleViewAnalytics}
                    userId={user?.id}
                  />
                </Grid>
              ))}
            </Grid>
          )}
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