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
  isDynamic?: boolean;
  nodes?: any[];
  edges?: any[];
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
        
        // Charger les sondages classiques et dynamiques
        const allSurveys = await fetchSurveys(token);
        console.log('Tous les sondages chargés:', allSurveys.length);
        console.log('Sondages dynamiques chargés:', allSurveys.filter((s: any) => s.isDynamic).length);
        
        // Charger les partages en attente séparément
        const pendingSharesData = await fetchPendingShares(token);
        
        // Charger les réponses pour tous les sondages
        const responsesPromises = allSurveys.map((survey: any) => 
          getSurveyAnswers(survey._id, token, survey.isDynamic)
            .then(responses => ({ surveyId: survey._id, responses }))
            .catch(() => ({ surveyId: survey._id, responses: [] }))
        );

        const responsesData = await Promise.all(responsesPromises);
        const responsesMap = responsesData.reduce((acc, { surveyId, responses }) => {
          acc[surveyId] = responses;
          return acc;
        }, {} as { [key: string]: any[] });

        setSurveys(allSurveys);
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
    console.log('Tous les sondages avant filtrage:', surveys.length);
    console.log('Sondages dynamiques avant filtrage:', surveys.filter(s => s.isDynamic).length);
    console.log('ID utilisateur actuel:', user?.userId || user?.id);
    
    // Fonction pour vérifier si un sondage appartient à l'utilisateur actuel
    const belongsToCurrentUser = (survey: any) => {
      const currentUserId = String(user?.userId || user?.id || '');
      
      if (survey.isDynamic) {
        // Pour les sondages dynamiques, userId est un objet avec _id
        if (survey.userId && typeof survey.userId === 'object' && survey.userId._id) {
          return survey.userId._id === currentUserId;
        }
        
        // Pour les sondages dynamiques sans userId défini ou null
        return survey.createdBy === currentUserId;
      } else {
        // Pour les sondages classiques - ils semblent ne pas avoir de userId défini
        // Nous supposons donc qu'ils appartiennent tous à l'utilisateur actuel
        // comme c'était le cas avant notre modification
        return true;
      }
    };
    
    const filtered = surveys.filter((survey) => {
      // Filtrer par propriété du sondage
      if (!belongsToCurrentUser(survey)) {
        return false;
      }
      
      // Appliquer le filtre de recherche si présent
      if (searchQuery && !survey.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Appliquer les filtres de date si présents
      if (dateRange.start || dateRange.end) {
        const surveyDate = new Date(survey.createdAt);
        if (dateRange.start && surveyDate < dateRange.start) return false;
        if (dateRange.end && surveyDate > dateRange.end) return false;
      }

      // Appliquer le filtre de partages en attente si actif
      if (showPendingOnly && !pendingShares.some(s => s._id === survey._id)) {
        return false;
      }

      return true;
    });
    
    console.log('Sondages après filtrage:', filtered.length);
    console.log('Sondages classiques après filtrage:', filtered.filter(s => !s.isDynamic).length);
    console.log('Sondages dynamiques après filtrage:', filtered.filter(s => s.isDynamic).length);
    
    return filtered;
  }, [surveys, searchQuery, dateRange, showPendingOnly, pendingShares, user?.userId, user?.id]);

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
            <Box sx={{ width: 48 }} />

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