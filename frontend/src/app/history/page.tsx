"use client";

import React, { useEffect, useState, Suspense } from "react";
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  CircularProgress,
  Paper,
  Collapse,
  IconButton,
  Divider,
  Grid,
  Button,
  Rating,
  TextField,
  InputAdornment,
  Stack,
  Chip,
  Slider
} from "@mui/material";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Image from 'next/image';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReactPlayer from 'react-player';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TextFieldProps } from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CreateIcon from '@mui/icons-material/Create';
import SchoolIcon from '@mui/icons-material/School';
import Tooltip from '@mui/material/Tooltip';
import Fab from '@mui/material/Fab';
import 'intro.js/introjs.css';
import introJs from 'intro.js';

const DEFAULT_IMAGE = '/placeholder-image.jpg';

interface Survey {
  _id: string;
  title: string;
  description?: string;
  questions: {
    id: string;
    type: string;
    text: string;
    options?: string[];
    media?: {
      url: string;
      type: string;
    };
  }[];
  demographicEnabled: boolean;
  createdAt: string;
  userId: string;
  isDynamic?: boolean;
  isPrivate?: boolean;
}

interface Demographic {
  gender?: string;
  dateOfBirth?: string;
  educationLevel?: string;
  city?: string;
}

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
  media?: {
    url: string;
    type: string;
  };
}

interface SurveyResponse {
  _id: string;
  surveyId: string;
  surveyTitle: string;
  completedAt: string;
  demographic?: Demographic;
  answers: Array<{
    questionId: string;
    answer: any;
  }>;
  questions?: Question[];
  description?: string;
  isDynamic?: boolean;
  isPrivate?: boolean;
}

const SurveyHistoryPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'popular'>('date');
  const [openDetails, setOpenDetails] = useState<boolean>(false);
  const [viewType, setViewType] = useState<'responses' | 'created'>('responses');
  const [createdSurveys, setCreatedSurveys] = useState<Survey[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [datePickerKey, setDatePickerKey] = useState(0);

  useEffect(() => {
    const fetchSurveyResponses = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('Non authentifié');

        // Utiliser la constante API_URL qui est déjà configurée pour gérer correctement les environnements
        const apiUrl = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5041/api';
        console.log('Fetching survey responses from', apiUrl);

        // Récupérer les réponses aux sondages classiques
        const response = await fetch(`${apiUrl}/survey-answers/responses/user`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Erreur lors de la récupération des réponses classiques');

        const classicData = await response.json();
        
        // Récupérer les réponses aux sondages dynamiques
        const dynamicResponse = await fetch(`${apiUrl}/dynamic-survey-answers/user`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!dynamicResponse.ok) {
          console.error('Erreur lors de la récupération des réponses dynamiques:', dynamicResponse.status, dynamicResponse.statusText);
          // Ne pas interrompre le processus si cette partie échoue
          console.warn('Impossible de récupérer les réponses aux sondages dynamiques, continuons avec seulement les sondages classiques');
          // Continuer avec seulement les réponses classiques
          const allResponses = classicData;
          console.log('Toutes les réponses récupérées (seulement classiques):', allResponses.length);
          
          // Continuer le traitement avec ces réponses
          const enhancedResponses = await Promise.all(allResponses.map(async (response: SurveyResponse) => {
            try {
              const endpoint = `${apiUrl}/surveys/${response.surveyId}`;
                
              const surveyResponse = await fetch(endpoint, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (surveyResponse.ok) {
                const surveyData = await surveyResponse.json();
                return {
                  ...response,
                  description: surveyData.description,
                  isPrivate: surveyData.isPrivate
                };
              }
              return response;
            } catch (error) {
              console.warn(`Could not fetch survey details for ${response.surveyId}:`, error);
              return response;
            }
          }));

          setResponses(enhancedResponses);
          return; // Sortir de la fonction
        }
        
        const dynamicData = await dynamicResponse.json();
        console.log('Réponses dynamiques récupérées:', dynamicData);
        console.log('Nombre de réponses dynamiques:', dynamicData.length);
        
        // Combiner les réponses statiques et dynamiques
        const allResponses = [
          ...classicData,
          ...dynamicData.map((item: any) => ({
            _id: item._id,
            surveyId: item.surveyId,
            surveyTitle: item.surveyTitle,
            completedAt: item.completedAt,
            demographic: item.demographic,
            answers: item.answers,
            isDynamic: true
          }))
        ];
        
        console.log('Détail des réponses combinées:', JSON.stringify(allResponses, null, 2));
        
        // Pour chaque réponse, récupérer les détails du sondage
        const enhancedResponses = await Promise.all(allResponses.map(async (response: SurveyResponse) => {
          try {
            const endpoint = response.isDynamic 
              ? `${apiUrl}/dynamic-surveys/${response.surveyId}`
              : `${apiUrl}/surveys/${response.surveyId}`;
              
            const surveyResponse = await fetch(endpoint, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (surveyResponse.ok) {
              const surveyData = await surveyResponse.json();
              return {
                ...response,
                description: surveyData.description,
                isPrivate: surveyData.isPrivate
              };
            }
            return response;
          } catch (error) {
            console.warn(`Could not fetch survey details for ${response.surveyId}:`, error);
            return response;
          }
        }));

        setResponses(enhancedResponses);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching survey responses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyResponses();
  }, []);

  const fetchCreatedSurveys = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Not authenticated');

      // Utiliser la constante API_URL qui est déjà configurée pour gérer correctement les environnements
      const apiUrl = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5041/api';
      console.log('Fetching created surveys from', apiUrl);
      
      // Récupérer les sondages statiques
      const classicResponse = await fetch(`${apiUrl}/surveys`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!classicResponse.ok) {
        const errorData = await classicResponse.json().catch(() => ({}));
        console.error('Server response (classic):', errorData);
        throw new Error(errorData.message || `Error: ${classicResponse.status}`);
      }

      const classicData = await classicResponse.json();
      console.log('Created classic surveys data:', classicData.length);
      
      // Récupérer les sondages dynamiques
      const dynamicResponse = await fetch(`${apiUrl}/dynamic-surveys`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!dynamicResponse.ok) {
        const errorData = await dynamicResponse.json().catch(() => ({}));
        console.error('Server response (dynamic):', errorData);
        console.warn('Impossible de récupérer les sondages dynamiques, continuons avec seulement les sondages classiques');
        
        // Continuer avec uniquement les sondages classiques
        console.log('Total created surveys (classic only):', classicData.length);
        setCreatedSurveys(classicData);
        setLoading(false);
        return; // Sortir de la fonction
      }

      const dynamicData = await dynamicResponse.json();
      console.log('Created dynamic surveys data:', dynamicData);
      console.log('Created dynamic surveys count:', dynamicData.length);
      
      // Adapter le format des sondages dynamiques pour correspondre à l'interface Survey
      const formattedDynamicSurveys = dynamicData.map((survey: any) => ({
        ...survey,
        isDynamic: true,
        questions: survey.nodes ? survey.nodes.map((node: any) => ({
          id: node.id,
          type: node.data.type || 'text',
          text: node.data.text || node.data.label || '',
          options: node.data.options || []
        })) : []
      }));
      
      // Combiner les deux types de sondages
      const allSurveys = [...classicData, ...formattedDynamicSurveys];
      console.log('Total created surveys:', allSurveys.length);
      
      setCreatedSurveys(allSurveys);
    } catch (err: any) {
      console.error('Error fetching created surveys:', err);
      setError(err.message || 'Failed to fetch created surveys');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTypeChange = async (newViewType: 'responses' | 'created') => {
    setIsTransitioning(true);
    setViewType(newViewType);
    
    if (newViewType === 'created' && createdSurveys.length === 0) {
      await fetchCreatedSurveys();
    }
    
    setIsTransitioning(false);
  };

  const handleExpandClick = async (responseId: string) => {
    if (viewType === 'created') {
      const survey = createdSurveys.find(s => s._id === responseId);
      if (!survey) return;

      setOpenDetails(true);
      setLoadingDetails(responseId);

      try {
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('Non authentifié');

        const API_URL = process.env.NEXT_PUBLIC_API_URL ? 
          `${process.env.NEXT_PUBLIC_API_URL}/api` : 
          'http://localhost:5041/api';
        
        // Choisir le bon endpoint en fonction du type de sondage
        const endpoint = survey.isDynamic
          ? `${API_URL}/dynamic-surveys/${responseId}`
          : `${API_URL}/surveys/${responseId}`;
        
        const surveyResponse = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!surveyResponse.ok) throw new Error('Erreur lors de la récupération des détails');

        const surveyData = await surveyResponse.json();
        
        // Adapter le format avec les informations démographiques
        const adaptedSurvey: SurveyResponse = {
          _id: surveyData._id,
          surveyId: surveyData._id,
          surveyTitle: surveyData.title,
          completedAt: surveyData.createdAt,
          description: surveyData.description,
          isDynamic: survey.isDynamic,
          // Ajouter les informations démographiques si elles sont activées
          demographic: surveyData.demographicEnabled ? {
            gender: 'Enabled',
            dateOfBirth: 'Enabled',
            educationLevel: 'Enabled',
            city: 'Enabled'
          } : undefined,
          questions: survey.isDynamic 
            ? surveyData.nodes.map((node: any) => ({
                id: node.id,
                text: node.data.text || node.data.label || 'Question sans texte',
                type: node.data.type || 'text',
                options: node.data.options || [],
                media: node.data.mediaUrl ? {
                  url: node.data.mediaUrl,
                  type: node.data.mediaUrl.toLowerCase().includes('.mp4') ? 'video' : 'image'
                } : undefined
              }))
            : surveyData.questions.map((q: any) => ({
                ...q,
                media: typeof q.media === 'string' ? {
                  url: q.media,
                  type: q.media.toLowerCase().includes('.mp4') ? 'video' : 'image'
                } : null
              })),
          answers: [] // Pas de réponses car c'est un sondage créé
        };

        setSelectedSurvey(adaptedSurvey);
      } catch (err: any) {
        console.error('Error fetching survey details:', err);
        setError(err.message);
      } finally {
        setLoadingDetails(null);
      }
      return;
    }

    const survey = responses.find(r => r._id === responseId);
    if (!survey) return;

    setLoadingDetails(responseId);
    setOpenDetails(true);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Non authentifié');

      const API_URL = process.env.NEXT_PUBLIC_API_URL ? 
        `${process.env.NEXT_PUBLIC_API_URL}/api` : 
        'http://localhost:5041/api';

      // Gérer différemment selon le type de sondage (dynamique ou statique)
      if (survey.isDynamic) {
        console.log('Récupération des détails pour un sondage dynamique:', survey.surveyId);
        
        // Récupérer les détails du sondage dynamique
        const dynamicSurveyResponse = await fetch(`${API_URL}/dynamic-surveys/${survey.surveyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!dynamicSurveyResponse.ok) {
          console.error('Erreur lors de la récupération des détails du sondage dynamique:', 
            dynamicSurveyResponse.status, 
            dynamicSurveyResponse.statusText
          );
          throw new Error('Erreur lors de la récupération des détails du sondage dynamique');
        }
        
        const dynamicSurveyData = await dynamicSurveyResponse.json();
        console.log('Données du sondage dynamique:', dynamicSurveyData);
        
        // Récupérer les détails de la réponse dynamique
        const dynamicResponseDetails = await fetch(`${API_URL}/dynamic-survey-answers/response/${responseId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!dynamicResponseDetails.ok) {
          console.error('Erreur lors de la récupération des détails de la réponse dynamique:', 
            dynamicResponseDetails.status, 
            dynamicResponseDetails.statusText
          );
          throw new Error('Erreur lors de la récupération des détails de la réponse');
        }
        
        const dynamicDetailData = await dynamicResponseDetails.json();
        console.log('Détails de la réponse dynamique:', dynamicDetailData);
        
        // Formater les questions et réponses pour qu'elles correspondent au format attendu
        const enhancedQuestions = dynamicSurveyData.nodes.map((node: any) => {
          return {
            id: node.id,
            text: node.data.text || node.data.label || 'Question sans texte',
            type: node.data.type || 'text',
            options: node.data.options || [],
            media: node.data.mediaUrl ? {
              url: node.data.mediaUrl,
              type: node.data.mediaUrl.toLowerCase().includes('.mp4') ? 'video' : 'image'
            } : undefined
          };
        });

        const updatedSurvey = {
          ...survey,
          description: dynamicSurveyData.description,
          questions: enhancedQuestions,
          answers: dynamicDetailData.answers.map((answer: any) => ({
            questionId: answer.nodeId,
            answer: answer.answer
          }))
        };

        console.log('Final updated dynamic survey response:', updatedSurvey);
        setSelectedSurvey(updatedSurvey);
      } else {
        // Récupérer les détails du sondage original statique
        const surveyDetailsResponse = await fetch(`${API_URL}/surveys/${survey.surveyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!surveyDetailsResponse.ok) throw new Error('Erreur lors de la récupération des détails du sondage');
        const surveyData = await surveyDetailsResponse.json();
        console.log('Original survey data:', surveyData);

        // Récupérer les détails de la réponse statique
        const responseDetails = await fetch(`${API_URL}/survey-answers/responses/${responseId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!responseDetails.ok) throw new Error('Erreur lors de la récupération des détails');
        const detailData = await responseDetails.json();
        console.log('Response details:', detailData);

        // Après avoir récupéré surveyData
        console.log('Original survey questions with options:', surveyData.questions);

        // Après avoir récupéré detailData
        console.log('Response questions:', detailData.questions);

        // Modifions la fusion des questions
        const enhancedQuestions = surveyData.questions.map((originalQuestion: any) => {
          console.log('Original question:', originalQuestion);
          console.log('Original question options:', originalQuestion.options);
          
          const responseQuestion = detailData.questions.find((q: any) => q.id === originalQuestion.id);
          console.log('Matched response question:', responseQuestion);

          const enhancedQuestion = {
            id: originalQuestion.id,
            text: originalQuestion.text,
            type: originalQuestion.type,
            options: originalQuestion.options || [],
            media: typeof originalQuestion.media === 'string' ? {
              url: originalQuestion.media,
              type: originalQuestion.media.toLowerCase().includes('.mp4') ? 'video' : 'image'
            } : null
          };
          
          console.log('Enhanced question:', enhancedQuestion);
          return enhancedQuestion;
        });

        const updatedSurvey = {
          ...survey,
          description: surveyData.description,
          questions: enhancedQuestions,
          answers: detailData.answers // Assurez-vous que les réponses sont incluses
        };

        console.log('Final updated static survey response:', updatedSurvey);
        setSelectedSurvey(updatedSurvey);
      }
    } catch (err: any) {
      console.error('Error fetching survey details:', err);
      setError(err.message);
    } finally {
      setLoadingDetails(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filteredResponses = responses
    .filter(response => {
      const matchesSearch = (response.surveyTitle?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      if (dateRange.start && dateRange.end) {
        const responseDate = new Date(response.completedAt);
        const isInDateRange = responseDate >= dateRange.start && 
                           responseDate <= new Date(dateRange.end.setHours(23, 59, 59));
        return matchesSearch && isInDateRange;
      }

      return matchesSearch;
    })
    .sort((a, b) => {
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    });

  const clearFilters = () => {
    setSearchQuery('');
    setDateRange({ start: null, end: null });
  };

  // Ajoutons une fonction de chargement pour Suspense
  const LoadingFallback = () => (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <CircularProgress />
    </Box>
  );

  if (error) {
    return (
      <Box sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (selectedSurvey && openDetails) {
    return (
      <Box sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: { xs: 2, sm: 4 },
      }}>
        <Paper elevation={3} sx={{
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '1000px',
          mb: 4,
        }}>
          <Box 
            sx={{ 
              p: 3,
              bgcolor: 'primary.main', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              color: 'white',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <IconButton
              onClick={() => {
                setSelectedSurvey(null);
                setOpenDetails(false);
              }}
              sx={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'white',
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {selectedSurvey.surveyTitle}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              {selectedSurvey.description || 'Detailed view of your survey response'}
            </Typography>
          </Box>

          <Box sx={{ p: 4, backgroundColor: 'white' }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
                Demographic Information
              </Typography>
              <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid rgba(0, 0, 0, 0.1)' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Gender</Typography>
                    <Typography variant="body1">{selectedSurvey.demographic?.gender || 'Not specified'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Date of Birth</Typography>
                    <Typography variant="body1">
                      {selectedSurvey.demographic?.dateOfBirth ? formatDate(selectedSurvey.demographic.dateOfBirth) : 'Not specified'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Education Level</Typography>
                    <Typography variant="body1">{selectedSurvey.demographic?.educationLevel || 'Not specified'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">City</Typography>
                    <Typography variant="body1">{selectedSurvey.demographic?.city || 'Not specified'}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
                Questions and Answers
              </Typography>
              {selectedSurvey.questions?.map((question, index) => (
                <Paper
                  key={question.id}
                  elevation={1}
                  sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: 2,
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Question {index + 1}: {question.text}
                  </Typography>

                  {question.media?.url && (
                    <Box sx={{ 
                      mb: 2,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: '100%'
                    }}>
                      {question.media.type === 'video' ? (
                        <Box sx={{ width: '100%', maxWidth: '600px' }}>
                          <ReactPlayer
                            url={question.media.url}
                            controls
                            width="100%"
                            height="auto"
                            onError={(e) => console.warn('Video loading error:', e)}
                            fallback={<CircularProgress />}
                          />
                        </Box>
                      ) : (
                        <Box sx={{ 
                          maxWidth: '400px',
                          width: '100%',
                          height: 'auto',
                          position: 'relative'
                        }}>
                          <Image
                            src={question.media?.url || DEFAULT_IMAGE}
                            alt="Question media"
                            width={400}
                            height={300}
                            onError={(e) => {
                              console.warn('Image loading error:', e);
                              const imgElement = e.currentTarget as HTMLImageElement;
                              if (imgElement.src !== DEFAULT_IMAGE) {
                                imgElement.src = DEFAULT_IMAGE;
                              }
                            }}
                            style={{ 
                              objectFit: 'contain',
                              width: '100%',
                              height: 'auto',
                              borderRadius: '8px'
                            }}
                            unoptimized
                          />
                        </Box>
                      )}
                    </Box>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" color="primary" sx={{ mb: 1 }}>
                      Available options and your answer:
                    </Typography>
                    {(() => {
                      const userAnswer = selectedSurvey.answers.find(a => a.questionId === question.id)?.answer;

                      switch (question.type) {
                        case 'rating':
                          return (
                            <Rating
                              value={Number(userAnswer)}
                              readOnly
                              size="large"
                              sx={{ 
                                '& .MuiRating-icon': { 
                                  fontSize: '2rem' 
                                }
                              }}
                            />
                          );

                        case 'multiple-choice':
                          console.log('Rendering multiple choice question:', question);
                          console.log('Question options:', question.options);
                          console.log('User answer:', userAnswer);
                          return (
                            <Stack spacing={1}>
                              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                Available options:
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {question.options && question.options.length > 0 ? (
                                  question.options.map((option) => (
                                    <Chip
                                      key={option}
                                      label={option}
                                      color={option === userAnswer ? "primary" : "default"}
                                      variant={option === userAnswer ? "filled" : "outlined"}
                                      sx={{
                                        width: 'fit-content',
                                        '&.MuiChip-filled': {
                                          background: option === userAnswer ? 
                                            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                                            'inherit'
                                        }
                                      }}
                                    />
                                  ))
                                ) : (
                                  <Typography color="error">No options available</Typography>
                                )}
                              </Box>
                              <Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>
                                Your answer: {userAnswer}
                              </Typography>
                            </Stack>
                          );

                        case 'dropdown':
                          return (
                            <Stack spacing={1}>
                              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                Votre réponse : {userAnswer}
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {question.options?.map((option) => (
                                  <Chip
                                    key={option}
                                    label={option}
                                    color={option === userAnswer ? "primary" : "default"}
                                    variant={option === userAnswer ? "filled" : "outlined"}
                                    sx={{
                                      width: 'fit-content',
                                      '&.MuiChip-filled': {
                                        background: option === userAnswer ? 
                                          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                                          'inherit'
                                      }
                                    }}
                                  />
                                ))}
                              </Box>
                            </Stack>
                          );

                        case 'yes-no':
                          return (
                            <Stack direction="row" spacing={2}>
                              <Chip
                                label="Yes"
                                color={userAnswer === 'yes' ? "primary" : "default"}
                                variant={userAnswer === 'yes' ? "filled" : "outlined"}
                                sx={{
                                  '&.MuiChip-filled': {
                                    background: userAnswer === 'yes' ? 
                                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                                      'inherit'
                                  }
                                }}
                              />
                              <Chip
                                label="No"
                                color={userAnswer === 'no' ? "primary" : "default"}
                                variant={userAnswer === 'no' ? "filled" : "outlined"}
                                sx={{
                                  '&.MuiChip-filled': {
                                    background: userAnswer === 'no' ? 
                                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                                      'inherit'
                                  }
                                }}
                              />
                            </Stack>
                          );

                        case 'slider':
                          return (
                            <Box sx={{ px: 2 }}>
                              <Slider
                                value={Number(userAnswer)}
                                min={1}
                                max={10}
                                marks
                                disabled
                                valueLabelDisplay="on"
                                sx={{
                                  '& .MuiSlider-markLabel': {
                                    color: 'text.secondary'
                                  },
                                  '& .MuiSlider-track': {
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                  }
                                }}
                              />
                            </Box>
                          );

                        case 'date':
                          return (
                            <Paper 
                              elevation={0} 
                              sx={{ 
                                p: 2, 
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                borderRadius: 2,
                                border: '1px solid rgba(102, 126, 234, 0.2)'
                              }}
                            >
                              <Typography variant="body1">
                                {userAnswer ? formatDate(userAnswer) : 'No answer'}
                              </Typography>
                            </Paper>
                          );

                        default:
                          return (
                            <Paper 
                              elevation={0} 
                              sx={{ 
                                p: 2, 
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                borderRadius: 2,
                                border: '1px solid rgba(102, 126, 234, 0.2)'
                              }}
                            >
                              <Typography variant="body1">
                                {userAnswer || 'No answer'}
                              </Typography>
                            </Paper>
                          );
                      }
                    })()}
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Box
        sx={{
          pt: 2,
          pb: 8,
          minHeight: 'calc(100vh - 64px)',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '1000px',
          mb: 4,
        }}>
          <Box 
            sx={{ 
              p: 3,
              bgcolor: 'primary.main', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              color: 'white',
              textAlign: 'center'
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Activity Log
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              View your survey responses and created surveys
            </Typography>
          </Box>

          <Box sx={{ p: 4, backgroundColor: 'white' }}>
            <Box sx={{ mb: 4, backgroundColor: 'background.paper', p: 2, borderRadius: 2, boxShadow: 1 }}>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={2} 
                sx={{ 
                  mb: 2,
                  width: '100%'
                }}
              >
                <Button
                  fullWidth
                  onClick={() => handleViewTypeChange('responses')}
                  disabled={isTransitioning}
                  variant={viewType === 'responses' ? "contained" : "outlined"}
                  data-tutorial="responses-button"
                  sx={{
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 500,
                    borderRadius: 2,
                    ...(viewType === 'responses' ? {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                      }
                    } : {
                      borderColor: '#667eea',
                      color: '#667eea',
                      '&:hover': {
                        borderColor: '#764ba2',
                        color: '#764ba2',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)'
                      }
                    })
                  }}
                >
                  {isTransitioning ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <>
                      <AssignmentTurnedInIcon />
                      My Responses
                    </>
                  )}
                </Button>
                <Button
                  fullWidth
                  onClick={() => handleViewTypeChange('created')}
                  disabled={isTransitioning}
                  variant={viewType === 'created' ? "contained" : "outlined"}
                  data-tutorial="created-button"
                  sx={{
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 500,
                    borderRadius: 2,
                    ...(viewType === 'created' ? {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                      }
                    } : {
                      borderColor: '#667eea',
                      color: '#667eea',
                      '&:hover': {
                        borderColor: '#764ba2',
                        color: '#764ba2',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)'
                      }
                    })
                  }}
                >
                  {isTransitioning ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <>
                      <CreateIcon />
                      My Surveys
                    </>
                  )}
                </Button>
              </Stack>

              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search surveys by title..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (searchQuery || dateRange.start || dateRange.end) && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={clearFilters}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Stack direction="row" spacing={2} alignItems="center">
                <Chip
                  icon={<FilterListIcon />}
                  label="Date Filter"
                  onClick={() => setShowDateFilter(!showDateFilter)}
                  color={showDateFilter ? "primary" : "default"}
                  variant={showDateFilter ? "filled" : "outlined"}
                  sx={{
                    '&.MuiChip-filled': {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }
                  }}
                />
              </Stack>

              {showDateFilter && (
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <DatePicker
                      key={`start-${datePickerKey}`}
                      label="Start Date"
                      value={dateRange.start}
                      onChange={(newValue: Date | null) => {
                        setDateRange(prev => ({
                          ...prev,
                          start: newValue
                        }));
                      }}
                      renderInput={(params: TextFieldProps) => <TextField {...params} />}
                    />
                    <DatePicker
                      key={`end-${datePickerKey}`}
                      label="End Date"
                      value={dateRange.end}
                      onChange={(newValue: Date | null) => {
                        setDateRange(prev => ({
                          ...prev,
                          end: newValue
                        }));
                      }}
                      minDate={dateRange.start || undefined}
                      renderInput={(params: TextFieldProps) => <TextField {...params} />}
                    />
                  </Stack>
                </LocalizationProvider>
              )}
            </Box>

            {isTransitioning ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress sx={{ color: '#667eea' }} />
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {viewType === 'responses' ? (
                  loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress sx={{ color: '#667eea' }} />
                    </Box>
                  ) : responses.length === 0 ? (
                    <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'background.paper' }}>
                      <Typography>You have not responded to any surveys yet.</Typography>
                    </Paper>
                  ) : (
                    filteredResponses.map((response) => (
                      <Paper
                        key={response._id}
                        elevation={1}
                        className="history-survey-card"
                        sx={{
                          borderRadius: 2,
                          overflow: 'hidden',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'all 0.3s ease-in-out',
                          position: 'relative',
                          '&:hover': {
                            boxShadow: 3,
                            zIndex: 1,
                            '& .hover-content': {
                              opacity: 1,
                              visibility: 'visible',
                              transform: 'translateY(0)',
                            }
                          }
                        }}
                      >
                        <Box sx={{ 
                          p: 3,
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative'
                        }}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              mb: 2,
                              color: 'primary.main',
                              fontWeight: 500,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.3,
                              height: '2.6em'
                            }}
                          >
                            {response.surveyTitle}
                          </Typography>

                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ 
                              mb: 2,
                              flex: 1,
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.5,
                              height: '4.5em'
                            }}
                          >
                            {response.description || 'No description available'}
                          </Typography>

                          <Box
                            className="hover-content"
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: 'white',
                              p: 3,
                              opacity: 0,
                              visibility: 'hidden',
                              transform: 'translateY(-10px)',
                              transition: 'all 0.3s ease-in-out',
                              boxShadow: 3,
                              borderRadius: 2,
                              zIndex: 2,
                              overflowY: 'auto',
                              '&::-webkit-scrollbar': {
                                width: '8px',
                              },
                              '&::-webkit-scrollbar-track': {
                                background: '#f1f1f1',
                                borderRadius: '4px',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                background: '#888',
                                borderRadius: '4px',
                                '&:hover': {
                                  background: '#666',
                                },
                              },
                            }}
                          >
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                color: 'primary.main',
                                fontWeight: 500,
                                mb: 2 
                              }}
                            >
                              {response.surveyTitle}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: 'text.secondary',
                                mb: 2,
                                lineHeight: 1.6 
                              }}
                            >
                              {response.description || 'No description available'}
                            </Typography>
                          </Box>

                          <Stack 
                            direction="column" 
                            spacing={1} 
                            sx={{ 
                              mt: 'auto',
                              position: 'relative',
                              zIndex: 1,
                              minHeight: '60px'
                            }}
                          >
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                mb: 1,
                                fontSize: '0.75rem'
                              }}
                            >
                              Completed on {formatDate(response.completedAt)}
                            </Typography>
                            
                            <Stack 
                              direction="row" 
                              spacing={1} 
                              sx={{
                                flexWrap: 'wrap',
                                gap: 1
                              }}
                            >
                              <Chip
                                size="small"
                                label={`${response.answers?.length || 0} questions`}
                                sx={{
                                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                  color: '#667eea',
                                  height: '24px'
                                }}
                              />
                              <Chip
                                size="small"
                                label={response.demographic && Object.keys(response.demographic).some(key => 
                                  response.demographic && response.demographic[key as keyof Demographic]) 
                                  ? ' Demographics' 
                                  : 'No Demographics'
                                }
                                sx={{
                                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                  color: '#667eea',
                                  height: '24px'
                                }}
                              />
                              {response.isDynamic && (
                                <Chip
                                  size="small"
                                  label="Dynamic"
                                  sx={{
                                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                    color: '#667eea',
                                    height: '24px'
                                  }}
                                />
                              )}
                              {!response.isDynamic && (
                                <Chip
                                  size="small"
                                  label="Static"
                                  sx={{
                                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                    color: '#667eea',
                                    height: '24px'
                                  }}
                                />
                              )}
                              {/* @ts-ignore */}
                              {response.isPrivate && (
                                <Chip
                                  size="small"
                                  label="Private"
                                  sx={{
                                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                    color: '#667eea',
                                    height: '24px'
                                  }}
                                />
                              )}
                              {/* @ts-ignore */}
                              {response.isPrivate === false && (
                                <Chip
                                  size="small"
                                  label="Public"
                                  sx={{
                                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                    color: '#667eea',
                                    height: '24px'
                                  }}
                                />
                              )}
                            </Stack>
                          </Stack>
                        </Box>
                        
                        <Box sx={{ 
                          p: 2, 
                          borderTop: 1, 
                          borderColor: 'divider',
                          backgroundColor: 'rgba(102, 126, 234, 0.1)',
                          display: 'flex',
                          justifyContent: 'flex-end',
                          position: 'relative',
                          zIndex: 1
                        }}>
                          <Button
                            onClick={() => handleExpandClick(response._id)}
                            variant="contained"
                            size="small"
                            className="view-details-button"
                            data-tutorial="view-details-button"
                            sx={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                              }
                            }}
                          >
                            View Details
                          </Button>
                        </Box>
                      </Paper>
                    ))
                  )
                ) : (
                  createdSurveys
                    .filter(survey => 
                      survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (survey.description || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .sort((a, b) => {
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    })
                    .map((survey) => (
                      <Paper
                        key={survey._id}
                        elevation={1}
                        className="history-survey-card"
                        sx={{
                          borderRadius: 2,
                          overflow: 'hidden',
                          height: '100%',
                          minHeight: '250px',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'all 0.3s ease-in-out',
                          position: 'relative',
                          '&:hover': {
                            boxShadow: 3,
                            zIndex: 1,
                            '& .hover-content': {
                              opacity: 1,
                              visibility: 'visible',
                              transform: 'translateY(0)',
                            }
                          }
                        }}
                      >
                        <Box sx={{ 
                          p: 3,
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative',
                          minHeight: '180px'
                        }}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              mb: 2,
                              color: 'primary.main',
                              fontWeight: 500,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.3,
                              height: '2.6em'
                            }}
                          >
                            {survey.title}
                          </Typography>

                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ 
                              mb: 2,
                              flex: 1,
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.5,
                              height: '4.5em'
                            }}
                          >
                            {survey.description || 'No description available'}
                          </Typography>

                          <Box
                            className="hover-content"
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: 'white',
                              p: 3,
                              opacity: 0,
                              visibility: 'hidden',
                              transform: 'translateY(-10px)',
                              transition: 'all 0.3s ease-in-out',
                              boxShadow: 3,
                              borderRadius: 2,
                              zIndex: 2,
                              overflowY: 'auto',
                              '&::-webkit-scrollbar': {
                                width: '8px',
                              },
                              '&::-webkit-scrollbar-track': {
                                background: '#f1f1f1',
                                borderRadius: '4px',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                background: '#888',
                                borderRadius: '4px',
                                '&:hover': {
                                  background: '#666',
                                },
                              },
                            }}
                          >
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                color: 'primary.main',
                                fontWeight: 500,
                                mb: 2 
                              }}
                            >
                              {survey.title}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: 'text.secondary',
                                mb: 2,
                                lineHeight: 1.6 
                              }}
                            >
                              {survey.description || 'No description available'}
                            </Typography>
                          </Box>

                          <Stack 
                            direction="column" 
                            spacing={1} 
                            sx={{ 
                              mt: 'auto',
                              position: 'relative',
                              zIndex: 1,
                              minHeight: '60px'
                            }}
                          >
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                mb: 1,
                                fontSize: '0.75rem'
                              }}
                            >
                              Created on {formatDate(survey.createdAt)}
                            </Typography>
                            
                            <Stack 
                              direction="row" 
                              spacing={1} 
                              sx={{
                                flexWrap: 'wrap',
                                gap: 1
                              }}
                            >
                              <Chip
                                size="small"
                                label={`${survey.questions?.length || 0} questions`}
                                sx={{
                                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                  color: '#667eea',
                                  height: '24px'
                                }}
                              />
                              <Chip
                                size="small"
                                label={survey.demographicEnabled ? 'Demographics' : 'No Demographics'}
                                sx={{
                                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                  color: '#667eea',
                                  height: '24px'
                                }}
                              />
                              {survey.isDynamic && (
                                <Chip
                                  size="small"
                                  label="Dynamic"
                                  sx={{
                                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                    color: '#667eea',
                                    height: '24px'
                                  }}
                                />
                              )}
                              {!survey.isDynamic && (
                                <Chip
                                  size="small"
                                  label="Static"
                                  sx={{
                                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                    color: '#667eea',
                                    height: '24px'
                                  }}
                                />
                              )}
                              {/* @ts-ignore */}
                              {survey.isPrivate && (
                                <Chip
                                  size="small"
                                  label="Private"
                                  sx={{
                                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                    color: '#667eea',
                                    height: '24px'
                                  }}
                                />
                              )}
                              {/* @ts-ignore */}
                              {survey.isPrivate === false && (
                                <Chip
                                  size="small"
                                  label="Public"
                                  sx={{
                                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                    color: '#667eea',
                                    height: '24px'
                                  }}
                                />
                              )}
                            </Stack>
                          </Stack>
                        </Box>
                        
                        <Box sx={{ 
                          p: 2, 
                          borderTop: 1, 
                          borderColor: 'divider',
                          backgroundColor: 'action.hover',
                          display: 'flex',
                          justifyContent: 'flex-end',
                          position: 'relative',
                          zIndex: 1
                        }}>
                          <Button
                            onClick={() => handleExpandClick(survey._id)}
                            variant="contained"
                            size="small"
                            className="view-details-button"
                            data-tutorial="view-details-button"
                            sx={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                              }
                            }}
                          >
                            View Details
                          </Button>
                        </Box>
                      </Paper>
                    ))
                )}
              </Box>
            )}
          </Box>
        </Paper>

        {/* Bouton tutorial flottant */}
        <Tooltip title="Start tutorial">
          <Fab
            size="small"
            onClick={openDetails ? startDetailsTutorial : startTutorial}
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
      </Box>
    </Suspense>
  );
};

// Fonction pour démarrer le tutoriel principal (liste)
const startTutorial = () => {
  // Créer une nouvelle instance et la rendre accessible globalement
  const intro = introJs();
  (window as any).introInstance = intro;
  
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
  `;
  document.head.appendChild(styleEl);
  
  // Créer les étapes du tutoriel
  const steps = [
    {
      element: 'body',
      intro: "Welcome to your survey history! This tutorial will guide you through the available features.",
      position: 'top'
    },
    {
      element: '.MuiTypography-h6',
      intro: "This page allows you to view your survey responses history and the surveys you've created.",
      position: 'bottom'
    },
    {
      element: '[data-tutorial="responses-button"]', 
      intro: "Use this button to see the surveys you've responded to.",
      position: 'bottom'
    },
    {
      element: '[data-tutorial="created-button"]',
      intro: "Use this button to see the surveys you've created.",
      position: 'bottom'
    },
    {
      element: 'input[placeholder*="Search"]',
      intro: "Quickly search for surveys by their title.",
      position: 'bottom'
    },
    {
      element: '.MuiChip-root',
      intro: "Filter surveys by creation date by clicking on this filter.",
      position: 'bottom'
    },
    {
      element: '.history-survey-card:first-of-type',
      intro: "Each card represents a survey with its basic information.",
      position: 'right'
    },
    {
      element: '[data-tutorial="view-details-button"]',
      intro: "Click here to see the complete details of the survey or your response.",
      position: 'top'
    },
    {
      element: 'body',
      intro: "You now know how to use the survey history page!",
      position: 'top'
    }
  ];
  
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
    doneLabel: 'Finish',
    steps: steps as any
  });
  
  // Nettoyer à la sortie
  intro.onexit(function() {
    if (document.head.contains(styleEl)) {
      document.head.removeChild(styleEl);
    }
  });
  
  // Démarrer le tutoriel
  intro.start();
};

// Fonction pour démarrer le tutoriel de détails (vue d'une réponse)
const startDetailsTutorial = () => {
  // Créer une nouvelle instance et la rendre accessible globalement
  const intro = introJs();
  (window as any).introInstance = intro;
  
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
  `;
  document.head.appendChild(styleEl);
  
  // Créer les étapes du tutoriel
  const steps = [
    {
      element: 'body',
      intro: "Welcome to your response detailed view! This tutorial will guide you through the available information.",
      position: 'top'
    },
    {
      element: 'button svg[data-testid="ArrowBackIcon"]',
      intro: "Click this button to return to the history list.",
      position: 'right'
    },
    {
      element: 'h6.MuiTypography-h6:nth-of-type(1)',
      intro: "This is the title of the survey you responded to.",
      position: 'bottom'
    },
    {
      element: 'h6.MuiTypography-h6:nth-of-type(2)',
      intro: "This section displays the demographic information you provided.",
      position: 'bottom'
    },
    {
      element: 'h6.MuiTypography-h6:nth-of-type(3)',
      intro: "This section presents the survey questions and your answers.",
      position: 'bottom'
    },
    {
      element: '.MuiPaper-root:nth-child(4)',
      intro: "Each card shows a question and the answer you provided.",
      position: 'right'
    },
    {
      element: 'body',
      intro: "You can now explore your responses in detail!",
      position: 'top'
    }
  ];
  
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
    doneLabel: 'Finish',
    steps: steps as any
  });
  
  // Nettoyer à la sortie
  intro.onexit(function() {
    if (document.head.contains(styleEl)) {
      document.head.removeChild(styleEl);
    }
  });
  
  // Démarrer le tutoriel
  intro.start();
};

export default SurveyHistoryPage;