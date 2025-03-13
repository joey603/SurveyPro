"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Paper, Snackbar, Alert, IconButton, Grid } from '@mui/material';
import { getSurveyAnswers, fetchSurveys, fetchPendingShares } from '@/utils/surveyService';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchAndFilter from '../components/analytics/SearchAndFilter';
import { AnalyticsCard } from '../components/analytics/AnalyticsCard';
import { useAuth } from '@/utils/AuthContext';
import { SurveyAnalytics } from '../components/analytics/SurveyAnalytics';

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
}

interface Answer {
  questionId: string;
  answer: string;
}

interface SurveyResponse {
  _id: string;
  surveyId: string;
  answers: Answer[];
  submittedAt: string;
}

interface Survey {
  _id: string;
  title: string;
  description?: string;
  questions: Question[];
  createdAt: string;
  demographicEnabled: boolean;
  userId: string;
  sharedBy?: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'error' | 'success'>('success');
  const [surveyResponses, setSurveyResponses] = useState<{ [key: string]: SurveyResponse[] }>({});
  const [pendingShares, setPendingShares] = useState<Survey[]>([]);

  // États pour les filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null
  });
  const [sortBy, setSortBy] = useState<'date' | 'popular'>('date');
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken') || '';
        const [surveysData, pendingSharesData] = await Promise.all([
          fetchSurveys(token),
          fetchPendingShares(token)
        ]);

        const responsesPromises = surveysData.map((survey: Survey) => 
          getSurveyAnswers(survey._id, token)
            .then(responses => ({ surveyId: survey._id, responses }))
            .catch(() => ({ surveyId: survey._id, responses: [] }))
        );

        const responsesData = await Promise.all(responsesPromises);
        const responsesMap = responsesData.reduce((acc, { surveyId, responses }) => {
          acc[surveyId] = responses;
          return acc;
        }, {} as { [key: string]: SurveyResponse[] });

        setSurveys(surveysData);
        setPendingShares(pendingSharesData);
        setSurveyResponses(responsesMap);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load surveys');
        setSnackbarMessage('Failed to load surveys');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleViewAnalytics = (survey: Survey) => {
    setSelectedSurvey(survey);
  };

  const handleBack = () => {
    setSelectedSurvey(null);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
  };

  const handleSortChange = (sort: 'date' | 'popular') => {
    setSortBy(sort);
  };

  const handlePendingChange = (pending: boolean) => {
    setShowPendingOnly(pending);
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

  const filteredSurveys = useMemo(() => {
    return surveys.filter(survey => {
      if (searchQuery && !survey.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      if (dateRange.start || dateRange.end) {
        const surveyDate = new Date(survey.createdAt);
        if (dateRange.start && surveyDate < dateRange.start) return false;
        if (dateRange.end && surveyDate > dateRange.end) return false;
      }

      if (showPendingOnly && !pendingShares.some(s => s._id === survey._id)) {
        return false;
      }

      return true;
    });
  }, [surveys, searchQuery, dateRange, showPendingOnly, pendingShares]);

  const sortedSurveys = useMemo(() => {
    return [...filteredSurveys].sort((a, b) => {
      if (sortBy === 'popular') {
        const aResponses = surveyResponses[a._id]?.length || 0;
        const bResponses = surveyResponses[b._id]?.length || 0;
        return bResponses - aResponses;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredSurveys, sortBy, surveyResponses]);

  return (
    <Box 
      component="section"
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: { xs: 2, sm: 4 },
        maxWidth: '1000px',
        margin: '0 auto',
      }}
    >
      {!selectedSurvey ? (
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
              Advanced Analytics
            </Typography>

            <Box sx={{ width: 48 }} />
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
                {sortedSurveys.map((survey) => (
                  <Grid item xs={12} sm={6} md={6} key={survey._id}>
                    <AnalyticsCard
                      survey={survey}
                      onDelete={handleDeleteSurvey}
                      onViewAnalytics={handleViewAnalytics}
                      userId={user?.id}
                      responses={surveyResponses[survey._id] || []}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Paper>
      ) : (
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
              onClick={handleBack}
              sx={{ color: 'white' }}
            >
              <ArrowBackIcon />
            </IconButton>

            <Typography
              variant="h4"
              fontWeight="bold"
            >
              {selectedSurvey.title}
            </Typography>

            <Box sx={{ width: 48 }} />
          </Box>

          <Box sx={{ p: 3 }}>
            <SurveyAnalytics
              open={true}
              onClose={handleBack}
              survey={selectedSurvey}
              responses={surveyResponses[selectedSurvey._id] || []}
            />
          </Box>
        </Paper>
      )}

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