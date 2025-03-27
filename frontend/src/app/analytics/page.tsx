"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Paper, Snackbar, Alert, IconButton, Grid } from '@mui/material';
import { getSurveyAnswers, fetchSurveys, fetchPendingShares } from '@/utils/surveyService';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchAndFilter from '../components/analytics/SearchAndFilter';
import { AnalyticsCard } from '../components/analytics/AnalyticsCard';
import { useAuth } from '@/utils/AuthContext';
import { SurveyAnalytics } from '../components/analytics/SurveyAnalytics';
import ShareIcon from '@mui/icons-material/Share';
import ShareDialog from '../components/analytics/ShareDialog';
import ExportIcon from '@mui/icons-material/IosShare';
import { shareSurvey, respondToSurveyShare } from '@/utils/surveyShareService';

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
  isPrivate?: boolean;
  privateLink?: string;
}

// Interface spécifique pour les sondages partagés
interface SharedSurvey extends Survey {
  isShared: boolean;
  shareId: string;
}

// Type union qui peut être soit un Survey normal soit un SharedSurvey
type SurveyWithShareInfo = Survey | SharedSurvey;

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<SurveyWithShareInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'error' | 'success'>('success');
  const [surveyResponses, setSurveyResponses] = useState<{ [key: string]: SurveyResponse[] }>({});
  const [pendingShares, setPendingShares] = useState<SharedSurvey[]>([]);

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

  // Nouvel état pour le filtre de confidentialité
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'private' | 'public'>('all');

  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Ajouter un state pour le raffraîchissement de la page
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken') || '';
        
        // Charger les sondages classiques et dynamiques
        const allSurveys = await fetchSurveys(token);
        console.log('Tous les sondages chargés:', allSurveys.length);
        
        // Charger les partages en attente séparément
        const pendingSharesData = await fetchPendingShares(token);
        console.log('Partages en attente chargés:', pendingSharesData.length, 
          pendingSharesData.map((s: any) => ({ 
            id: s.surveyId, 
            title: s.title, 
            isDynamic: s.isDynamic 
          }))
        );
        
        // Convertir les partages en attente en format compatible pour l'affichage
        const pendingSharesFormatted = pendingSharesData.map((share: any) => ({
          ...share,
          _id: share.surveyId, // Utiliser l'ID du sondage comme clé principale
          status: 'pending',
          isShared: true,
          // S'assurer que les données sont compatibles avec ce qu'attend AnalyticsCard
          nodes: share.questions && Array.isArray(share.questions) && share.isDynamic 
            ? share.questions 
            : undefined,
          questions: !share.isDynamic && share.questions 
            ? share.questions 
            : undefined
        }));
        
        // Ajouter les partages en attente aux sondages
        const allSurveysWithPending = [...allSurveys, ...pendingSharesFormatted];
        
        console.log('Tous les sondages avec partages en attente:', allSurveysWithPending.length);
        console.log('Sondages dynamiques avec partages en attente:', 
          allSurveysWithPending.filter((s: any) => s.isDynamic).length
        );
        
        // Charger les réponses pour tous les sondages
        const responsesPromises = allSurveysWithPending.map((survey: any) => 
          getSurveyAnswers(survey._id, token, survey.isDynamic)
            .then(responses => ({ surveyId: survey._id, responses }))
            .catch(() => ({ surveyId: survey._id, responses: [] }))
        );

        const responsesData = await Promise.all(responsesPromises);
        const responsesMap = responsesData.reduce((acc, { surveyId, responses }) => {
          acc[surveyId] = responses;
          return acc;
        }, {} as { [key: string]: any[] });

        setSurveys(allSurveysWithPending);
        setPendingShares(pendingSharesFormatted);
        setSurveyResponses(responsesMap);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load surveys');
        setSnackbarMessage('Erreur lors du chargement des sondages');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [refreshTrigger]);

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

  // Nouveau gestionnaire pour le filtre de confidentialité
  const handlePrivacyFilterChange = (filter: 'all' | 'private' | 'public') => {
    setPrivacyFilter(filter);
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

  const handleShareSurvey = async (email: string): Promise<void> => {
    try {
      const token = localStorage.getItem('accessToken') || '';
      console.log('Attempting to share survey:', {
        surveyId: selectedSurvey?._id,
        recipientEmail: email,
        tokenLength: token.length
      });
      
      await shareSurvey(selectedSurvey?._id || '', email, token);
      
      console.log('Survey shared successfully:', {
        surveyId: selectedSurvey?._id,
        recipientEmail: email
      });

      setSnackbarMessage('Survey shared successfully');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
    } catch (error) {
      console.error('Error sharing survey:', error);
      throw error;
    }
  };

  // Nouveaux gestionnaires pour les partages
  const handleAcceptShare = async (shareId: string) => {
    try {
      const token = localStorage.getItem('accessToken') || '';
      console.log('Accepting share:', shareId);
      
      await respondToSurveyShare(shareId, true, token);
      
      setSnackbarMessage('Survey accepted successfully');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      
      // Déclencher un rechargement des données
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error accepting share:', error);
      setSnackbarMessage('Error accepting survey');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };
  
  const handleRejectShare = async (shareId: string) => {
    try {
      const token = localStorage.getItem('accessToken') || '';
      console.log('Rejecting share:', shareId);
      
      await respondToSurveyShare(shareId, false, token);
      
      setSnackbarMessage('Share invitation rejected');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      
      // Déclencher un rechargement des données
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error rejecting share:', error);
      setSnackbarMessage('Error rejecting invitation');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const filteredSurveys = useMemo(() => {
    console.log('===== DÉBUT filteredSurveys =====');
    console.log('Tous les sondages avant filtrage:', surveys.length);
    console.log('Sondages dynamiques avant filtrage:', surveys.filter(s => s.isDynamic).length);
    
    // Filtrer les sondages dynamiques pour les inspecter
    const dynamicSurveys = surveys.filter(s => s.isDynamic);
    if (dynamicSurveys.length > 0) {
      console.log('Détails des sondages dynamiques:', dynamicSurveys.map(s => ({
        id: s._id,
        title: s.title,
        isShared: s.isShared,
        status: s.status,
        nodes: s.nodes?.length || 0
      })));
    }
    
    // Filtrer les sondages partagés pour les inspecter
    const sharedSurveys = surveys.filter(s => s.isShared);
    if (sharedSurveys.length > 0) {
      console.log('Détails des sondages partagés:', sharedSurveys.map(s => ({
        id: s._id,
        title: s.title,
        isDynamic: s.isDynamic,
        status: s.status,
        shareId: s.shareId
      })));
    }
    
    // Fonction pour vérifier si un sondage appartient à l'utilisateur actuel ou est partagé
    const belongsToCurrentUserOrShared = (survey: any) => {
      // Si c'est un sondage partagé, l'inclure toujours
      if (survey.isShared) {
        return true;
      }
      
      const currentUserId = String(user?.userId || user?.id || '');
      
      if (survey.isDynamic) {
        // Pour les sondages dynamiques
        if (survey.userId && typeof survey.userId === 'object' && survey.userId._id) {
          return survey.userId._id === currentUserId;
        }
        return survey.createdBy === currentUserId;
      } else {
        // Pour les sondages statiques
        return true;
      }
    };
    
    // Fonction pour déterminer si un sondage est privé
    const isPrivateSurvey = (survey: any) => {
      return Boolean(
        survey.isPrivate || 
        survey.privateLink || 
        (survey.title && survey.title.toLowerCase().includes('private'))
      );
    };
    
    const filtered = surveys.filter((survey) => {
      // Inclure les sondages qui appartiennent à l'utilisateur ou sont partagés
      if (!belongsToCurrentUserOrShared(survey)) {
        return false;
      }
      
      // Appliquer le filtre de confidentialité
      if (privacyFilter === 'private' && !isPrivateSurvey(survey)) {
        return false;
      }
      
      if (privacyFilter === 'public' && isPrivateSurvey(survey)) {
        return false;
      }
      
      // Appliquer le filtre de recherche
      if (searchQuery && !survey.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Appliquer les filtres de date
      if (dateRange.start || dateRange.end) {
        const surveyDate = new Date(survey.createdAt);
        if (dateRange.start && surveyDate < dateRange.start) return false;
        if (dateRange.end && surveyDate > dateRange.end) return false;
      }

      // Appliquer le filtre de partages en attente
      if (showPendingOnly && !(survey.isShared && survey.status === 'pending')) {
        return false;
      }

      return true;
    });
    
    console.log('Sondages après filtrage:', filtered.length);
    console.log('Sondages dynamiques après filtrage:', filtered.filter(s => s.isDynamic).length);
    console.log('Sondages partagés après filtrage:', filtered.filter(s => s.isShared).length);
    console.log('===== FIN filteredSurveys =====');
    
    return filtered;
  }, [surveys, searchQuery, dateRange, showPendingOnly, user?.userId, user?.id, privacyFilter]);

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
              onPrivacyFilterChange={handlePrivacyFilterChange}
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
                  <Grid item xs={12} sm={6} md={6} key={survey._id + ('shareId' in survey ? survey.shareId : '')}>
                    <AnalyticsCard
                      survey={survey}
                      onDelete={handleDeleteSurvey}
                      onViewAnalytics={handleViewAnalytics}
                      userId={user?.id}
                      responses={surveyResponses[survey._id] || []}
                      onAcceptShare={'shareId' in survey ? handleAcceptShare : undefined}
                      onRejectShare={'shareId' in survey ? handleRejectShare : undefined}
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

            <IconButton
              sx={{ color: 'white' }}
              onClick={() => setShowShareDialog(true)}
              title="Partager"
            >
              <ShareIcon />
            </IconButton>
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
      
      <ShareDialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        onShare={handleShareSurvey}
        survey={selectedSurvey}
      />
    </Box>
  );
};

export default AnalyticsPage; 