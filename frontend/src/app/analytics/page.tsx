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
        
        // Charger tous les sondages (statiques, dynamiques et partagés acceptés)
        const allSurveys = await fetchSurveys(token);
        console.log('Tous les sondages chargés:', allSurveys.length);
        
        // Charger séparément les partages en attente
        const pendingSharesData = await fetchPendingShares(token);
        console.log('Partages en attente chargés:', pendingSharesData.length);
        
        // Aucun besoin de combiner à nouveau les sondages partagés acceptés
        // car ils sont déjà inclus dans allSurveys
        
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

        // Définir les états avec les données chargées
        setSurveys([...allSurveys, ...pendingSharesData]); 
        setPendingShares(pendingSharesData);
        setSurveyResponses(responsesMap);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load surveys');
        setSnackbarMessage('Error loading surveys');
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
      
      // Forcer un rechargement complet des données
      setRefreshTrigger(prev => prev + 1);
      
      // Attendre un peu avant de recharger pour s'assurer que les données sont à jour
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 1000);
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
    
    // Filtrage des sondages invalides
    const validSurveys = surveys.filter(s => s && s._id);
    
    // Récupérer l'ID de l'utilisateur actuel
    const currentUserId = String(user?.id || '');
    console.log('ID utilisateur actuel:', currentUserId);
    
    // Première étape: filtrer les sondages qui appartiennent à l'utilisateur ou qui sont partagés avec lui
    const userSurveys = validSurveys.filter(survey => {
      // Cas 1: C'est un sondage partagé (accepté ou en attente)
      if (survey.isShared === true) {
        return true;
      }
      
      // Cas 2: C'est un sondage créé par l'utilisateur
      const surveyOwner = String(survey.userId || '');
      const isOwner = surveyOwner === currentUserId;
      
      return isOwner;
    });
    
    console.log('Sondages de l\'utilisateur ou partagés:', userSurveys.length);
    
    // Analyse des différents types de sondages
    const dynamicSurveys = userSurveys.filter(s => s.isDynamic);
    const sharedSurveys = userSurveys.filter(s => s.isShared);
    const pendingSurveys = userSurveys.filter(s => s.isShared && s.status === 'pending');
    
    console.log('Analyse des sondages:', {
      total: userSurveys.length,
      dynamiques: dynamicSurveys.length,
      partagés: sharedSurveys.length,
      enAttente: pendingSurveys.length
    });
    
    // Deuxième étape: appliquer les filtres sélectionnés par l'utilisateur
    const filtered = userSurveys.filter((survey) => {
      // Filtre des sondages en attente
      if (showPendingOnly && !(survey.isShared && survey.status === 'pending')) {
        return false;
      }
      
      // Filtre de recherche textuelle
      if (searchQuery && !survey.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Filtre de confidentialité
      if (privacyFilter === 'private' && !survey.isPrivate) {
        return false;
      }
      
      if (privacyFilter === 'public' && survey.isPrivate) {
        return false;
      }
      
      // Filtre de date
      if (dateRange.start || dateRange.end) {
        const surveyDate = new Date(survey.createdAt);
        if (dateRange.start && surveyDate < dateRange.start) return false;
        if (dateRange.end && surveyDate > dateRange.end) return false;
      }
      
      return true;
    });
    
    console.log('Résultats du filtrage:', {
      total: filtered.length,
      dynamiques: filtered.filter(s => s.isDynamic).length,
      partagés: filtered.filter(s => s.isShared).length,
      enAttente: filtered.filter(s => s.isShared && s.status === 'pending').length
    });
    
    console.log('===== FIN filteredSurveys =====');
    return filtered;
  }, [surveys, searchQuery, dateRange, showPendingOnly, user?.id, privacyFilter]);

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
                {sortedSurveys.map((survey, index) => {
                  // Générer une clé unique en utilisant l'index comme fallback
                  const uniqueKey = survey._id 
                    ? `${survey._id}-${survey.shareId || 'own'}`
                    : `survey-${index}`;
                  
                  return (
                    <Grid 
                      item 
                      xs={12} 
                      sm={6} 
                      md={6} 
                      key={uniqueKey}
                    >
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
                  );
                })}
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