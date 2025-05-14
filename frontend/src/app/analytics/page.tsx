"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Box, Typography, Paper, Snackbar, Alert, IconButton, Grid, Fab, Tooltip, CircularProgress } from '@mui/material';
import { getSurveyAnswers, fetchSurveys, fetchPendingShares } from '@/utils/surveyService';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchAndFilter from '../components/analytics/SearchAndFilter';
import { AnalyticsCard } from '../components/analytics/AnalyticsCard';
import { useAuth } from '@/utils/AuthContext';
import { SurveyAnalytics } from '../components/analytics/SurveyAnalytics';
import ShareIcon from '@mui/icons-material/Share';
import ShareDialog from '../components/analytics/ShareDialog';
import { shareSurvey, respondToSurveyShare } from '@/utils/surveyShareService';
import SchoolIcon from '@mui/icons-material/School';
import 'intro.js/introjs.css';
import introJs from 'intro.js';
import Lottie from 'lottie-react';
import loadingCardAnimation from '@/assets/Animation loading card survey.json';

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
  isShared?: boolean;
  shareId?: string;
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
      
      // Trouver le sondage à supprimer
      const surveyToDelete = surveys.find(s => s._id === surveyId);
      
      if (!surveyToDelete) {
        throw new Error('Survey not found');
      }
      
      // Déterminer si c'est un sondage dynamique
      const isDynamic = Boolean(surveyToDelete.isDynamic);
      
      // Pour debug: afficher l'API_URL configurée
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041';
      
      console.log('Suppression du sondage:', { 
        id: surveyId, 
        isDynamic, 
        titre: surveyToDelete.title,
        apiBaseUrl
      });
      
      // Utiliser le service approprié selon le type de sondage
      if (isDynamic) {
        // Importer dynamiquement le service adéquat
        const { dynamicSurveyService } = await import('@/utils/dynamicSurveyService');
        await dynamicSurveyService.deleteDynamicSurvey(surveyId, token);
      } else {
        // Construction correcte de l'endpoint API
        // S'assurer que l'URL contient '/api' 
        let apiEndpoint = `${apiBaseUrl}/api/surveys/${surveyId}`;
        
        console.log('Utilisation de l\'API endpoint:', apiEndpoint);
        
        const response = await fetch(apiEndpoint, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        
        // Vérifier si la réponse est OK (statut 200-299)
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server error: ${response.status} ${response.statusText}. Details: ${errorText}`);
        }
      }
      
      // Mettre à jour l'interface utilisateur
      setSurveys(surveys.filter(s => s._id !== surveyId));
      setSnackbarMessage('Survey deleted successfully');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
    } catch (error) {
      console.error('Error deleting survey:', error);
      setSnackbarMessage(`Failed to delete survey: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const handleShareSurvey = async (email: string): Promise<void> => {
    try {
      setShowShareDialog(true);
      const token = localStorage.getItem('accessToken') || '';
      
      // Partage le sondage
      await shareSurvey(selectedSurvey?._id || '', email, token);
      
      // Ne pas afficher de message ici, le succès est déjà géré dans le dialogue
      // Supprimez ou commentez les lignes qui affichent un message de succès
      // comme setMessage ou enqueueSnackbar, etc.
      
      // Attendre un court délai avant de fermer le dialogue
      // setTimeout(() => {
      //   setIsShareDialogOpen(false);
      // }, 2000);
      
      // Ne fermez pas automatiquement la boîte de dialogue, laissez l'utilisateur le faire
    } catch (error: any) {
      console.error('Error sharing survey:', error);
      // Ne pas afficher d'erreur ici, les erreurs sont gérées dans le dialogue
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
      
      // Trouver le partage concerné pour déterminer son statut
      const concernedSurvey = surveys.find(s => s.shareId === shareId);
      const isPending = concernedSurvey?.status === 'pending';
      
      await respondToSurveyShare(shareId, false, token);
      
      // Message différent selon que c'était un partage en attente ou déjà accepté
      if (isPending) {
        setSnackbarMessage('Share invitation rejected');
      } else {
        setSnackbarMessage('Shared survey removed from your dashboard');
      }
      
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      
      // Déclencher un rechargement des données
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error rejecting/removing share:', error);
      setSnackbarMessage('Error processing your request');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const filteredSurveys = useMemo(() => {
    console.log('===== START filteredSurveys =====');
    console.log('All surveys before filtering:', surveys.length);
    
    // Filtrage des sondages invalides
    const validSurveys = surveys.filter(s => s && s._id);
    
    // Récupérer l'ID de l'utilisateur actuel
    const currentUserId = String(user?.id || '');
    console.log('Current user ID:', currentUserId);
    
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
    
    console.log('Surveys of the user or shared:', userSurveys.length);
    
    // Analyse des différents types de sondages
    const dynamicSurveys = userSurveys.filter(s => s.isDynamic);
    const sharedSurveys = userSurveys.filter(s => s.isShared);
    const pendingSurveys = userSurveys.filter(s => s.isShared && s.status === 'pending');
    
    console.log('Analysis of surveys:', {
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
    
      console.log('Results of filtering:', {
      total: filtered.length,
      dynamiques: filtered.filter(s => s.isDynamic).length,
      partagés: filtered.filter(s => s.isShared).length,
      enAttente: filtered.filter(s => s.isShared && s.status === 'pending').length
    });
    
    console.log('===== END filteredSurveys =====');
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

  // Fonction pour démarrer le tutoriel
  const startTutorial = () => {
    // Créer une nouvelle instance et la rendre accessible globalement
    const intro = introJs();
    (window as any).introInstance = intro;
    
    // Fonction pour forcer l'affichage des tooltips et faire défiler vers l'élément
    const forceTooltipDisplay = () => {
      setTimeout(() => {
        // Trouver l'élément actuellement ciblé
        const currentStep = intro._currentStep;
        const currentStepData = intro._options.steps[currentStep];
        
        if (currentStepData && currentStepData.element) {
          let targetElement: Element | null = null;
          
          // Obtenir l'élément ciblé
          if (typeof currentStepData.element === 'string') {
            if (currentStepData.element === 'body') {
              targetElement = document.body;
            } else {
              targetElement = document.querySelector(currentStepData.element);
            }
          } else {
            targetElement = currentStepData.element;
          }
          
          // Faire défiler vers l'élément si trouvé
          if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            
            // Vérifier si l'élément est dans la zone visible
            const isInViewport = (
              rect.top >= 0 &&
              rect.left >= 0 &&
              rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
              rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
            
            if (!isInViewport) {
              // Calculer la position de défilement optimale pour centrer l'élément
              const scrollTop = window.pageYOffset + rect.top - window.innerHeight / 2 + rect.height / 2;
              
              // Défilement en douceur
              window.scrollTo({
                top: scrollTop,
                behavior: 'smooth'
              });
            }
          }
          
          // Forcer l'affichage des tooltips et les rendre plus visibles
          const tooltips = document.querySelectorAll('.introjs-tooltip') as NodeListOf<HTMLElement>;
          tooltips.forEach(tooltip => {
            if (tooltip) {
              tooltip.style.opacity = '1';
              tooltip.style.visibility = 'visible';
              tooltip.style.display = 'block';
              tooltip.style.zIndex = '999999';
              
              // S'assurer que le tooltip est bien positionné
              const tooltipRect = tooltip.getBoundingClientRect();
              if (tooltipRect.left < 0) {
                tooltip.style.left = '10px';
              }
              if (tooltipRect.right > window.innerWidth) {
                tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
              }
              if (tooltipRect.top < 0) {
                tooltip.style.top = '10px';
              }
              if (tooltipRect.bottom > window.innerHeight) {
                tooltip.style.top = (window.innerHeight - tooltipRect.height - 10) + 'px';
              }
            }
          });
          
          // Forcer également l'affichage des messages
          const tooltipTexts = document.querySelectorAll('.introjs-tooltiptext') as NodeListOf<HTMLElement>;
          tooltipTexts.forEach(text => {
            if (text) {
              text.style.visibility = 'visible';
              text.style.opacity = '1';
              text.style.display = 'block';
            }
          });
          
          // S'assurer que les couches d'aide et d'overlay sont bien visibles
          const helperLayers = document.querySelectorAll('.introjs-helperLayer, .introjs-overlay') as NodeListOf<HTMLElement>;
          helperLayers.forEach(layer => {
            if (layer) {
              layer.style.opacity = layer.classList.contains('introjs-overlay') ? '0.7' : '1';
              layer.style.visibility = 'visible';
            }
          });
        }
      }, 100);
    };
    
    // Ajouter un contrôleur personnalisé pour le tutoriel
    const controllerDiv = document.createElement('div');
    controllerDiv.className = 'tutorial-controller';
    controllerDiv.style.position = 'fixed';
    controllerDiv.style.bottom = '60px';
    controllerDiv.style.left = '50%';
    controllerDiv.style.transform = 'translateX(-50%)';
    controllerDiv.style.backgroundColor = 'white';
    controllerDiv.style.padding = '10px 15px';
    controllerDiv.style.borderRadius = '50px';
    controllerDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)';
    controllerDiv.style.zIndex = '999999';
    controllerDiv.style.display = 'flex';
    controllerDiv.style.justifyContent = 'center';
    controllerDiv.style.gap = '10px';
    
    // Créer les boutons
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.style.padding = '8px 16px';
    prevButton.style.border = 'none';
    prevButton.style.borderRadius = '4px';
    prevButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    prevButton.style.color = 'white';
    prevButton.style.cursor = 'pointer';
    prevButton.style.fontWeight = 'bold';

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.style.padding = '8px 16px';
    nextButton.style.border = 'none';
    nextButton.style.borderRadius = '4px';
    nextButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    nextButton.style.color = 'white';
    nextButton.style.cursor = 'pointer';
    nextButton.style.fontWeight = 'bold';
    
    const exitButton = document.createElement('button');
    exitButton.textContent = 'Exit';
    exitButton.style.padding = '8px 16px';
    exitButton.style.border = 'none';
    exitButton.style.borderRadius = '4px';
    exitButton.style.background = '#f44336';
    exitButton.style.color = 'white';
    exitButton.style.cursor = 'pointer';
    exitButton.style.fontWeight = 'bold';
    
    // Ajout des écouteurs d'événements
    prevButton.addEventListener('click', () => {
      try {
        intro.previousStep();
      } catch (e) {
        console.error('Error previous:', e);
      }
    });
    
    nextButton.addEventListener('click', () => {
      try {
        const currentStep = intro._currentStep;
        if (currentStep < intro._options.steps.length - 1) {
          intro.nextStep();
        } else {
          intro.exit(true);
          document.body.removeChild(controllerDiv);
        }
      } catch (e) {
        console.error('Error next:', e);
      }
    });
    
    exitButton.addEventListener('click', () => {
      try {
        intro.exit(true);
        document.body.removeChild(controllerDiv);
      } catch (e) {
        console.error('Error exit:', e);
      }
    });
    
    // Ajouter les boutons au contrôleur
    controllerDiv.appendChild(prevButton);
    controllerDiv.appendChild(nextButton);
    controllerDiv.appendChild(exitButton);
    
    // Ajouter des styles pour le tutoriel
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .introjs-tooltip {
        opacity: 1 !important;
        visibility: visible !important;
        z-index: 99998 !important;
        display: block !important;
        animation: none !important;
        transition: none !important;
      }
      .introjs-helperLayer {
        z-index: 99997 !important;
      }
      .introjs-tooltip {
        min-width: 250px !important;
        max-width: 400px !important;
        background: white !important;
        color: #333 !important;
        box-shadow: 0 3px 15px rgba(0,0,0,0.2) !important;
        border-radius: 5px !important;
        font-family: sans-serif !important;
      }
      .introjs-tooltiptext {
        padding: 15px !important;
        text-align: center !important;
        font-size: 16px !important;
        line-height: 1.5 !important;
        visibility: visible !important;
        opacity: 1 !important;
        display: block !important;
      }
      .introjs-overlay {
        opacity: 0.7 !important;
      }
      /* Forces les tooltips à s'afficher */
      .introjs-showElement {
        z-index: 99999 !important;
      }
      .introjs-fixParent {
        z-index: auto !important;
      }
      /* Personnalisation des boutons */
      .introjs-tooltipbuttons {
        display: flex !important;
        justify-content: space-between !important;
        padding: 10px !important;
        border-top: 1px solid #eee !important;
      }
      .introjs-button {
        text-shadow: none !important;
        padding: 8px 16px !important;
        font-size: 14px !important;
        border-radius: 4px !important;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
        border: none !important;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
        margin: 5px !important;
        transition: all 0.2s !important;
      }
      .introjs-prevbutton, .introjs-nextbutton {
        flex: 1 !important;
        text-align: center !important;
      }
      .introjs-prevbutton:hover, .introjs-nextbutton:hover, .introjs-skipbutton:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
        opacity: 0.9 !important;
      }
      .introjs-skipbutton {
        background: #f44336 !important;
        color: white !important;
      }
      .introjs-disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
      }
      .intro-tuto-button {
        flex: 1;
        text-align: center;
        font-weight: bold;
        cursor: pointer;
      }
    `;
    document.head.appendChild(styleEl);
    
    // Créer les étapes du tutoriel
    const steps = [
      {
        element: 'body',
        intro: "Welcome to the Analytics Dashboard! This tutorial will guide you through the features available for analyzing your surveys.",
        position: 'top'
      },
      {
        element: 'input[placeholder*="Search"]',
        intro: "Use this search bar to quickly find surveys by their title.",
        position: 'bottom'
      },
      {
        element: '.MuiChip-root:nth-child(1)',
        intro: "Filter surveys by creation date by clicking on this filter.",
        position: 'bottom'
      },
      {
        element: '.MuiChip-root:nth-child(2)',
        intro: "Sort surveys by creation date or by popularity.",
        position: 'bottom'
      },
      {
        element: '.MuiChip-root:nth-child(3)',
        intro: "Filter by privacy: show all surveys, only private surveys, or only public surveys.",
        position: 'bottom'
      },
      {
        element: '.MuiChip-root:nth-child(4)',
        intro: "Show only pending survey share invitations.",
        position: 'bottom'
      },
      {
        element: '.analytics-survey-card:first-of-type',
        intro: "Each card represents one of your surveys. You can see basic information like the number of responses and when it was created.",
        position: 'right'
      },
      {
        element: '.delete-button:first-of-type',
        intro: "Use this button to delete a survey that you no longer need. This action cannot be undone.",
        position: 'top'
      },
      {
        element: '[data-tutorial="view-analytics-button"]',
        intro: "Click here to view detailed analytics for a survey, including response data, charts, and demographic information.",
        position: 'top'
      },
      {
        element: 'body',
        intro: "Now you know how to use the Analytics Dashboard! Click on 'View Analytics' for any survey to explore detailed response data and visualizations.",
        position: 'top'
      }
    ];
    
    // Ajouter l'étape de visualisation de parcours uniquement si le sondage est dynamique
    if (selectedSurvey && selectedSurvey.isDynamic && (surveyResponses[selectedSurvey._id]?.length > 0)) {
      // Insérer après l'étape des filtres
      steps.splice(3, 0, {
        element: '.react-flow',
        intro: "This interactive visualization shows all possible paths in your dynamic survey. Click on a node to see the complete path that respondents followed, and use the controls to zoom in and explore different paths.",
        position: 'top'
      });
      
      // Ajouter l'étape pour les chemins complets après la visualisation principale
      steps.splice(4, 0, {
        element: '.complete-paths-panel',
        intro: "The 'Complete Path' function allows you to see exactly how many respondents followed a specific path in its entirety. Select one or more nodes in the tree to display these complete paths, with precise statistics on each path taken.",
        position: 'left'
      });
    }
    
    // Ajouter l'étape pour les statistiques démographiques si le sondage a cette option
    if (selectedSurvey && selectedSurvey.demographicEnabled && (surveyResponses[selectedSurvey._id]?.length > 0)) {
      // Déterminer l'index d'insertion - après les autres étapes spécifiques
      const demographicInsertIndex = steps.length - 1; // Avant la dernière étape (conclusion)
      steps.splice(demographicInsertIndex, 0, {
        element: '.demographic-statistics-section',
        intro: "This section displays detailed demographic statistics on your respondents. You will find graphs on the distribution by gender, age, education level, and city. Click on each graph for detailed views and complete statistics.",
        position: 'top'
      });
    }
    
    // Configuration du tutoriel
    intro.setOptions({
      showBullets: true,
      showProgress: true,
      tooltipPosition: 'auto',
      scrollToElement: true,
      scrollPadding: 280,
      exitOnEsc: false,
      exitOnOverlayClick: false,
      showButtons: true,
      showStepNumbers: true,
      prevLabel: 'Previous',
      nextLabel: 'Next',
      skipLabel: '×',
      doneLabel: 'Done',
      steps: steps as any
    });
    
    // Fonction onafterchange modifiée pour gérer le positionnement
    intro.onafterchange(function() {
      forceTooltipDisplay();
    });
    
    // Nettoyer à la sortie
    intro.onexit(function() {
      if (document.head.contains(styleEl)) {
        document.head.removeChild(styleEl);
      }
    });
    
    // Démarrer le tutoriel
    intro.start();
    
    // Forcer l'affichage initial
    forceTooltipDisplay();
  };

  // Fonction pour démarrer le tutoriel des analyses détaillées
  const startAnalyticsTutorial = () => {
    // Créer une nouvelle instance et la rendre accessible globalement
    const intro = introJs();
    (window as any).introInstance = intro;
    
    // Fonction pour forcer l'affichage des tooltips et faire défiler vers l'élément
    const forceTooltipDisplay = () => {
      setTimeout(() => {
        // Trouver l'élément actuellement ciblé
        const currentStep = intro._currentStep;
        const currentStepData = intro._options.steps[currentStep];
        
        if (currentStepData && currentStepData.element) {
          let targetElement: Element | null = null;
          
          // Obtenir l'élément ciblé
          if (typeof currentStepData.element === 'string') {
            if (currentStepData.element === 'body') {
              targetElement = document.body;
            } else {
              targetElement = document.querySelector(currentStepData.element);
            }
          } else {
            targetElement = currentStepData.element;
          }
          
          // Faire défiler vers l'élément si trouvé
          if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            
            // Vérifier si l'élément est dans la zone visible
            const isInViewport = (
              rect.top >= 0 &&
              rect.left >= 0 &&
              rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
              rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
            
            if (!isInViewport) {
              // Calculer la position de défilement optimale pour centrer l'élément
              const scrollTop = window.pageYOffset + rect.top - window.innerHeight / 2 + rect.height / 2;
              
              // Défilement en douceur
              window.scrollTo({
                top: scrollTop,
                behavior: 'smooth'
              });
            }
          }
          
          // Forcer l'affichage des tooltips et les rendre plus visibles
          const tooltips = document.querySelectorAll('.introjs-tooltip') as NodeListOf<HTMLElement>;
          tooltips.forEach(tooltip => {
            if (tooltip) {
              tooltip.style.opacity = '1';
              tooltip.style.visibility = 'visible';
              tooltip.style.display = 'block';
              tooltip.style.zIndex = '999999';
              
              // S'assurer que le tooltip est bien positionné
              const tooltipRect = tooltip.getBoundingClientRect();
              if (tooltipRect.left < 0) {
                tooltip.style.left = '10px';
              }
              if (tooltipRect.right > window.innerWidth) {
                tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
              }
              if (tooltipRect.top < 0) {
                tooltip.style.top = '10px';
              }
              if (tooltipRect.bottom > window.innerHeight) {
                tooltip.style.top = (window.innerHeight - tooltipRect.height - 10) + 'px';
              }
            }
          });
          
          // Forcer également l'affichage des messages
          const tooltipTexts = document.querySelectorAll('.introjs-tooltiptext') as NodeListOf<HTMLElement>;
          tooltipTexts.forEach(text => {
            if (text) {
              text.style.visibility = 'visible';
              text.style.opacity = '1';
              text.style.display = 'block';
            }
          });
          
          // S'assurer que les couches d'aide et d'overlay sont bien visibles
          const helperLayers = document.querySelectorAll('.introjs-helperLayer, .introjs-overlay') as NodeListOf<HTMLElement>;
          helperLayers.forEach(layer => {
            if (layer) {
              layer.style.opacity = layer.classList.contains('introjs-overlay') ? '0.7' : '1';
              layer.style.visibility = 'visible';
            }
          });
        }
      }, 100);
    };
    
    // Ajouter un contrôleur personnalisé pour le tutoriel
    const controllerDiv = document.createElement('div');
    controllerDiv.className = 'tutorial-controller';
    controllerDiv.style.position = 'fixed';
    controllerDiv.style.bottom = '60px';
    controllerDiv.style.left = '50%';
    controllerDiv.style.transform = 'translateX(-50%)';
    controllerDiv.style.backgroundColor = 'white';
    controllerDiv.style.padding = '10px 15px';
    controllerDiv.style.borderRadius = '50px';
    controllerDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)';
    controllerDiv.style.zIndex = '999999';
    controllerDiv.style.display = 'flex';
    controllerDiv.style.justifyContent = 'center';
    controllerDiv.style.gap = '10px';
    
    // Créer les boutons
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.style.padding = '8px 16px';
    prevButton.style.border = 'none';
    prevButton.style.borderRadius = '4px';
    prevButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    prevButton.style.color = 'white';
    prevButton.style.cursor = 'pointer';
    prevButton.style.fontWeight = 'bold';

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.style.padding = '8px 16px';
    nextButton.style.border = 'none';
    nextButton.style.borderRadius = '4px';
    nextButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    nextButton.style.color = 'white';
    nextButton.style.cursor = 'pointer';
    nextButton.style.fontWeight = 'bold';
    
    const exitButton = document.createElement('button');
    exitButton.textContent = 'Exit';
    exitButton.style.padding = '8px 16px';
    exitButton.style.border = 'none';
    exitButton.style.borderRadius = '4px';
    exitButton.style.background = '#f44336';
    exitButton.style.color = 'white';
    exitButton.style.cursor = 'pointer';
    exitButton.style.fontWeight = 'bold';
    
    // Ajout des écouteurs d'événements
    prevButton.addEventListener('click', () => {
      try {
        intro.previousStep();
      } catch (e) {
        console.error('Error previous:', e);
      }
    });
    
    nextButton.addEventListener('click', () => {
      try {
        const currentStep = intro._currentStep;
        if (currentStep < intro._options.steps.length - 1) {
          intro.nextStep();
        } else {
          intro.exit(true);
          document.body.removeChild(controllerDiv);
        }
      } catch (e) {
        console.error('Error next:', e);
      }
    });
    
    exitButton.addEventListener('click', () => {
      try {
        intro.exit(true);
        document.body.removeChild(controllerDiv);
      } catch (e) {
        console.error('Error exit:', e);
      }
    });
    
    // Ajouter les boutons au contrôleur
    controllerDiv.appendChild(prevButton);
    controllerDiv.appendChild(nextButton);
    controllerDiv.appendChild(exitButton);
    
    // Ajouter des styles pour le tutoriel
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .introjs-tooltip {
        opacity: 1 !important;
        visibility: visible !important;
        z-index: 99998 !important;
        display: block !important;
        animation: none !important;
        transition: none !important;
      }
      .introjs-helperLayer {
        z-index: 99997 !important;
      }
      .introjs-tooltip {
        min-width: 250px !important;
        max-width: 400px !important;
        background: white !important;
        color: #333 !important;
        box-shadow: 0 3px 15px rgba(0,0,0,0.2) !important;
        border-radius: 5px !important;
        font-family: sans-serif !important;
      }
      .introjs-tooltiptext {
        padding: 15px !important;
        text-align: center !important;
        font-size: 16px !important;
        line-height: 1.5 !important;
        visibility: visible !important;
        opacity: 1 !important;
        display: block !important;
      }
      .introjs-overlay {
        opacity: 0.7 !important;
      }
      /* Forces les tooltips à s'afficher */
      .introjs-showElement {
        z-index: 99999 !important;
      }
      .introjs-fixParent {
        z-index: auto !important;
      }
      /* Personnalisation des boutons */
      .introjs-tooltipbuttons {
        display: flex !important;
        justify-content: space-between !important;
        padding: 10px !important;
        border-top: 1px solid #eee !important;
      }
      .introjs-button {
        text-shadow: none !important;
        padding: 8px 16px !important;
        font-size: 14px !important;
        border-radius: 4px !important;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
        border: none !important;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
        margin: 5px !important;
        transition: all 0.2s !important;
      }
      .introjs-prevbutton, .introjs-nextbutton {
        flex: 1 !important;
        text-align: center !important;
      }
      .introjs-prevbutton:hover, .introjs-nextbutton:hover, .introjs-skipbutton:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
        opacity: 0.9 !important;
      }
      .introjs-skipbutton {
        background: #f44336 !important;
        color: white !important;
      }
      .introjs-disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
      }
      .intro-tuto-button {
        flex: 1;
        text-align: center;
        font-weight: bold;
        cursor: pointer;
      }
    `;
    document.head.appendChild(styleEl);
    
    // Créer les étapes du tutoriel pour la vue détaillée
    const steps = [
      {
        element: 'body',
        intro: "Welcome to the detailed view of your survey analytics. This tutorial will guide you through the features available to analyze responses.",
        position: 'top'
      },
      {
        element: 'button[title="Partager"], svg[data-testid="ShareIcon"]',
        intro: "This button allows you to share your survey with other users via email. They'll be able to view results and analytics without modifying the survey.",
        position: 'bottom'
      },
      {
        element: 'button[aria-label="Filters"]',
        intro: "Use this button to display or hide advanced filtering options for your analysis.",
        position: 'bottom'
      },
      {
        element: '.question-card',
        intro: "This section presents all the questions in your survey. Each card contains the question text, question type, and a summary of received responses. You can see the total number of responses and the most frequent answer for each question.",
        position: 'top'
      },
      {
        element: 'button[aria-label="Show details"]',
        intro: "Click this button to see specific details for each survey question.",
        position: 'top'
      },
      {
        element: '.general-statistics-paper',
        intro: "This section presents general statistics about your survey. You can see the total number of responses, the dates of the first and last responses, and the average daily responses. This information gives you an overview of participant engagement over time.",
        position: 'top'
      },
      {
        element: 'body',
        intro: "You now have all the information you need to analyze your survey responses in detail!",
        position: 'top'
      }
    ];
    
    // Ajouter l'étape du lien privé uniquement si le sondage est privé
    if (selectedSurvey && selectedSurvey.isPrivate) {
      steps.splice(1, 0, {
        element: 'button[aria-label="Show Link"], button[aria-label="Hide Link"]',
        intro: "This button allows you to display or hide the private link of your survey that you can share.",
        position: 'bottom'
      });
    }
    
    // Ajouter l'étape de visualisation de parcours uniquement si le sondage est dynamique ET qu'il y a des réponses
    if (selectedSurvey && selectedSurvey.isDynamic && (surveyResponses[selectedSurvey._id]?.length > 0)) {
      // Insérer après l'étape des filtres
      steps.splice(3, 0, {
        element: '.react-flow',
        intro: "This interactive visualization shows you all possible paths in your dynamic survey. Click on a node to see the complete path that respondents followed, and use the controls to zoom and explore different paths.",
        position: 'top'
      });
      
      // Ajouter l'étape pour les chemins complets après la visualisation principale
      steps.splice(4, 0, {
        element: '.complete-paths-panel',
        intro: "The 'Complete Path' feature allows you to see exactly how many respondents followed a specific path in its entirety. Select one or more nodes in the tree to display these complete paths, with precise statistics on each route taken.",
        position: 'left'
      });
    }
    
    // Ajouter les étapes d'exportation uniquement s'il y a des réponses
    if (selectedSurvey && surveyResponses[selectedSurvey._id]?.length > 0) {
      // Insérer avant l'étape de conclusion (dernier élément)
      steps.splice(steps.length - 1, 0, 
        {
          element: 'button[aria-label="Export to CSV"]',
          intro: "This button allows you to export your analytics data in CSV format, ideal for analysis in spreadsheets like Excel or Google Sheets.",
          position: 'top'
        },
        {
          element: 'button[aria-label="Export to JSON"], .export-json-button',
          intro: "This button allows you to export your analytics data in JSON format, perfect for integration with other applications or for more advanced data processing.",
          position: 'top'
        }
      );
    }
    
    // Ajouter l'étape pour les statistiques démographiques si le sondage a cette option ET qu'il y a des réponses
    if (selectedSurvey && selectedSurvey.demographicEnabled && (surveyResponses[selectedSurvey._id]?.length > 0)) {
      // Déterminer l'index d'insertion - avant la dernière étape (conclusion)
      const demographicInsertIndex = steps.length - 1;
      steps.splice(demographicInsertIndex, 0, {
        element: '.demographic-statistics-section',
        intro: "This section displays detailed demographic statistics about your respondents. You'll find charts on the distribution by gender, age, education level, and city. Click on each chart for a detailed view and complete statistics.",
        position: 'top'
      });
    }
    
    // Configuration du tutoriel
    intro.setOptions({
      showBullets: true,
      showProgress: true,
      tooltipPosition: 'auto',
      scrollToElement: true,
      scrollPadding: 280,
      exitOnEsc: false,
      exitOnOverlayClick: false,
      showButtons: true,
      showStepNumbers: true,
      prevLabel: 'Previous',
      nextLabel: 'Next',
      skipLabel: '×',
      doneLabel: 'Done',
      steps: steps as any
    });
    
    // Fonction onafterchange modifiée pour gérer le positionnement
    intro.onafterchange(function() {
      forceTooltipDisplay();
    });
    
    // Nettoyer à la sortie
    intro.onexit(function() {
      if (document.head.contains(styleEl)) {
        document.head.removeChild(styleEl);
      }
    });
    
    // Démarrer le tutoriel
    intro.start();
    
    // Forcer l'affichage initial
    forceTooltipDisplay();
  };

  // Ajoutons une fonction de chargement pour Suspense
  const LoadingFallback = () => (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <CircularProgress />
    </Box>
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
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
            <Box 
              sx={{ 
                p: 3,
                bgcolor: 'primary.main', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white',
                textAlign: 'center',
                position: 'relative',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Box sx={{ width: 48 }} />

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Analytics Dashboard
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                  Analyze your survey responses and gain valuable insights
                </Typography>
              </Box>

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
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                  <Lottie
                    animationData={loadingCardAnimation}
                    style={{ width: 200, height: 200 }}
                    loop={true}
                  />
                </Box>
              )}

              {error && (
                <Typography color="error" sx={{ textAlign: 'center', py: 4 }}>
                  {error}
                </Typography>
              )}

              {!loading && !error && (
                <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                  {sortedSurveys.map((survey, index) => {
                    // Générer une clé unique en utilisant l'index comme fallback
                    const uniqueKey = survey._id 
                      ? `${survey._id}-${survey.shareId || 'own'}`
                      : `survey-${index}`;
                    
                    return (
                      <AnalyticsCard
                        key={uniqueKey}
                        survey={survey}
                        onDelete={handleDeleteSurvey}
                        onViewAnalytics={handleViewAnalytics}
                        userId={user?.id}
                        responses={surveyResponses[survey._id] || []}
                        onAcceptShare={'shareId' in survey ? handleAcceptShare : undefined}
                        onRejectShare={'shareId' in survey ? handleRejectShare : undefined}
                      />
                    );
                  })}
                </Box>
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
            <Box 
              sx={{ 
                p: 3,
                bgcolor: 'primary.main', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white',
                textAlign: 'center',
                position: 'relative',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <IconButton
                onClick={handleBack}
                sx={{ color: 'white' }}
              >
                <ArrowBackIcon />
              </IconButton>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {selectedSurvey.title}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                  Detailed analytics and response statistics
                </Typography>
              </Box>

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

        {/* Bouton tutorial flottant */}
        <Tooltip title="Start tutorial">
          <Fab
            size="small"
            onClick={selectedSurvey ? startAnalyticsTutorial : startTutorial}
            sx={{
              position: 'fixed',
              bottom: 20,
              left: 20,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              },
              zIndex: 1000
            }}
          >
            <SchoolIcon />
          </Fab>
        </Tooltip>
        
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
    </Suspense>
  );
};

export default AnalyticsPage; 