"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Chip,
  Stack,
  CircularProgress,
  Rating,
  Paper,
  Alert,
  FormHelperText,
  Menu,
  MenuItem,
  TextFieldProps,
  Grid,
  Card,
  CardContent,
  CardActions,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClearIcon from '@mui/icons-material/Clear';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import FilterListIcon from '@mui/icons-material/FilterList';
import { fetchAvailableSurveys, submitSurveyAnswer, fetchAnsweredSurveys } from "@/utils/surveyService";
import { useAuth } from '@/utils/AuthContext';
import Image from 'next/image';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { ChromePicker, ColorResult } from 'react-color';
import ReactPlayer from 'react-player';
import ShareIcon from '@mui/icons-material/Share';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import EmailIcon from '@mui/icons-material/Email';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useRouter } from 'next/navigation';
import { dynamicSurveyService } from '@/utils/dynamicSurveyService';
import axios from 'axios';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import ListAltIcon from '@mui/icons-material/ListAlt';
import LockIcon from '@mui/icons-material/Lock';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041/api';

const DEFAULT_CITIES = [
  "Tel Aviv",
  "Jerusalem",
  "Haifa",
  "Rishon LeZion",
  "Petah Tikva",
  "Ashdod",
  "Netanya",
  "Beer Sheva",
  "Holon",
  "Bnei Brak"
];

interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'text' | 'slider' | 'rating' | 'dropdown' | 'yes-no' | 'date' | 'file-upload' | 'color-picker';
  options?: string[];
  media?: string;
  selectedDate?: Date | null;
}

interface Survey {
  _id: string;
  title: string;
  description?: string;
  questions: Question[];
  createdAt: string;
  status?: 'pending' | 'accepted' | 'rejected';
  demographicEnabled?: boolean;
  sharedBy?: string;
  isDynamic?: boolean;
  nodes?: any[];
  edges?: any[];
  userId?: { username: string };
  isPrivate?: boolean;
}

interface DemographicData {
  gender: string;
  dateOfBirth: Date | null;
  educationLevel: string;
  city: string;
}

const educationLevels = [
  "High School",
  "Bachelor's Degree",
  "Master's Degree",
  "Ph.D.",
  "Other"
];

interface FormData {
  demographic: {
    gender: string;
    dateOfBirth: Date | null;
    educationLevel: string;
    city: string;
  };
  answers: {
    [key: string]: any;
  };
}

type FieldPath = `answers.${string}` | keyof FormData | `demographic.${keyof FormData['demographic']}`;

const SurveyAnswerPage: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [urlToRedirect, setUrlToRedirect] = useState<string | null>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, watch, reset, setValue } = useForm<FormData>({
    defaultValues: {
      demographic: {
        gender: '',
        dateOfBirth: null,
        educationLevel: '',
        city: ''
      },
      answers: {}
    }
  });
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
    open: boolean;
  }>({
    message: '',
    severity: 'info',
    open: false
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [answeredSurveys, setAnsweredSurveys] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'popular'>('date');
  const [surveyResponses, setSurveyResponses] = useState<{ [key: string]: number }>({});
  const [shareAnchorEl, setShareAnchorEl] = useState<null | HTMLElement>(null);
  const [currentSurveyToShare, setCurrentSurveyToShare] = useState<Survey | null>(null);
  const [lastDemographicData, setLastDemographicData] = useState<DemographicData | null>(null);
  const [dynamicSurveys, setDynamicSurveys] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionHistory, setQuestionHistory] = useState<string[]>(['1']);
  const [currentAnswers, setCurrentAnswers] = useState<{ [key: string]: any }>({});
  const [orderedNodes, setOrderedNodes] = useState<any[]>([]);
  const [surveyTypeFilter, setSurveyTypeFilter] = useState<'all' | 'dynamic' | 'static'>('all');

  useEffect(() => {
    // Sauvegarder l'URL actuelle si elle contient un surveyId
    const urlParams = new URLSearchParams(window.location.search);
    const sharedSurveyId = urlParams.get('surveyId');
    
    if (sharedSurveyId && !isAuthenticated) {
      // Sauvegarder uniquement le surveyId et le pathname
      const redirectPath = `${window.location.pathname}?surveyId=${sharedSurveyId}`;
      localStorage.setItem('redirectAfterLogin', redirectPath);
      // Rediriger vers la page de connexion
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    // Vérifier si l'utilisateur vient de se connecter et a une URL de redirection
    if (isAuthenticated) {
      const redirectUrl = localStorage.getItem('redirectAfterLogin');
      if (redirectUrl) {
        // Nettoyer le localStorage
        localStorage.removeItem('redirectAfterLogin');
        // Rediriger vers l'URL sauvegardée
        window.location.href = redirectUrl;
      }
    }
  }, [isAuthenticated]);

  const fetchCities = async () => {
    try {
      const response = await fetch(
        "https://countriesnow.space/api/v0.1/countries/cities",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ country: "Israel" }),
        }
      );
      const data = await response.json();

      if (data && data.data) {
        return data.data;
      }
      return DEFAULT_CITIES;
    } catch (error) {
      console.error("Erreur lors de la récupération des villes :", error);
      return DEFAULT_CITIES;
    }
  };

  useEffect(() => {
    const loadSurveys = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('Aucun token d\'authentification trouvé');
        }

        // Vérifier d'abord s'il y a un ID de survey dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const sharedSurveyId = urlParams.get('surveyId');

        // Charger tous les sondages
        const allSurveys = await fetchAvailableSurveys(token);
        console.log('Sondages chargés:', allSurveys);
        
        if (sharedSurveyId) {
          // Si on a un ID dans l'URL, chercher ce sondage spécifique
          const sharedSurvey = allSurveys.find(
            (survey: { _id: string }) => survey._id === sharedSurveyId
          );
          
          if (sharedSurvey) {
            // Si c'est un sondage privé ou public, l'afficher directement
            setSelectedSurvey(sharedSurvey);
            setSurveys([sharedSurvey]); // Afficher uniquement ce sondage dans la liste
          } else {
            setError('Sondage non trouvé');
          }
        } else {
          // Si pas d'ID dans l'URL, afficher uniquement les sondages publics
          const publicSurveys = allSurveys.filter(survey => !survey.isPrivate);
          setSurveys(publicSurveys);
        }

        // Charger les IDs des sondages déjà répondus
        const answeredIds = await fetchAnsweredSurveys();
        if (Array.isArray(answeredIds)) {
          setAnsweredSurveys(answeredIds);
          console.log('Sondages répondus:', answeredIds);
        }

      } catch (error: any) {
        console.error('Erreur lors du chargement des sondages:', error);
        setError(error.message || 'Échec du chargement des sondages');
      } finally {
        setLoading(false);
      }
    };

    loadSurveys();
  }, []);

  useEffect(() => {
    const loadCities = async () => {
      setIsLoadingCities(true);
      try {
        const citiesData = await fetchCities();
        setCities(citiesData);
      } catch (error) {
        console.error('Error loading cities:', error);
        setCities(DEFAULT_CITIES);
      } finally {
        setIsLoadingCities(false);
      }
    };

    if (selectedSurvey?.demographicEnabled) {
      fetchLastDemographicData();
      loadCities();
    }
  }, [selectedSurvey]);

  const filteredSurveys = surveys
    .filter(survey => {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedSurveyId = urlParams.get('surveyId');

      // Si on accède via un lien, ne montrer que ce sondage spécifique
      if (sharedSurveyId) {
        return survey._id === sharedSurveyId;
      }

      // Sinon, appliquer les filtres normaux pour les sondages publics
      const matchesSearch = (survey.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (survey.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesType = surveyTypeFilter === 'all' || 
                         (surveyTypeFilter === 'dynamic' && survey.isDynamic) ||
                         (surveyTypeFilter === 'static' && !survey.isDynamic);

      if (dateRange.start && dateRange.end) {
        const surveyDate = new Date(survey.createdAt);
        const isInDateRange = surveyDate >= dateRange.start && 
                           surveyDate <= new Date(dateRange.end.setHours(23, 59, 59));
        return matchesSearch && isInDateRange && matchesType;
      }

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') {
        const aResponses = answeredSurveys.filter(id => id === a._id).length;
        const bResponses = answeredSurveys.filter(id => id === b._id).length;
        return bResponses - aResponses;
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const clearFilters = () => {
    setSearchQuery('');
    setDateRange({ start: null, end: null });
    setSurveyTypeFilter('all');
  };

  const validateForm = (data: FormData): boolean => {
    const errors: { [key: string]: string } = {};
    
    if (selectedSurvey?.demographicEnabled) {
      if (!data.demographic.gender) {
        errors['demographic.gender'] = 'Please select your gender';
      }
      if (!data.demographic.dateOfBirth) {
        errors['demographic.dateOfBirth'] = 'Please select your date of birth';
      }
      if (!data.demographic.educationLevel) {
        errors['demographic.educationLevel'] = 'Please select your education level';
      }
      if (!data.demographic.city) {
        errors['demographic.city'] = 'Please select your city';
      }
    }

    if (selectedSurvey?.isDynamic && selectedSurvey.nodes) {
      // Pour les sondages dynamiques, vérifier uniquement les questions visibles
      const shouldShowQuestion = (nodeId: string): boolean => {
        if (nodeId === '1') return true;
        const incomingEdges = selectedSurvey.edges?.filter(e => e.target === nodeId) || [];
        if (incomingEdges.length === 0) return false;
        return incomingEdges.some(edge => {
          if (edge.label) {
            return currentAnswers[edge.source] === edge.label;
          }
          return shouldShowQuestion(edge.source);
        });
      };

      // Vérifier uniquement les questions actuellement visibles
      const visibleNodes = selectedSurvey.nodes.filter(node => shouldShowQuestion(node.id));
      visibleNodes.forEach(node => {
        const answer = data.answers[node.id];
        if (answer === undefined || answer === '' || answer === null) {
          errors[`answers.${node.id}`] = 'This question requires an answer';
        }
      });
    } else {
      // Pour les sondages non dynamiques, vérifier toutes les questions
      selectedSurvey?.questions.forEach(question => {
        const answer = data.answers[question.id];
        if (answer === undefined || answer === '' || answer === null) {
          errors[`answers.${question.id}`] = 'This question requires an answer';
        }
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Ajouter une clé unique pour chaque sondage dans le localStorage
  const getStorageKey = (surveyId: string) => `survey_answers_${surveyId}`;

  // Modifier useEffect pour charger les réponses sauvegardées
  useEffect(() => {
    if (selectedSurvey?.isDynamic && selectedSurvey.nodes) {
      const storageKey = getStorageKey(selectedSurvey._id);
      const savedAnswers = localStorage.getItem(storageKey);
      
      if (savedAnswers) {
        const parsedAnswers = JSON.parse(savedAnswers);
        setCurrentAnswers(parsedAnswers);
        
        // Mettre à jour les valeurs du formulaire avec les réponses sauvegardées
        Object.entries(parsedAnswers).forEach(([questionId, value]) => {
          setValue(`answers.${questionId}`, value);
        });
      } else {
        setCurrentAnswers({});
      }
    }
  }, [selectedSurvey, setValue]);

  // Modifier handleDynamicAnswerChange pour sauvegarder les réponses
  const handleDynamicAnswerChange = (questionId: string, value: any) => {
    console.log(`Setting answer for ${questionId}:`, value);
    setCurrentAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: value
      };
      
      // Sauvegarder dans le localStorage
      if (selectedSurvey) {
        const storageKey = getStorageKey(selectedSurvey._id);
        localStorage.setItem(storageKey, JSON.stringify(newAnswers));
      }
      
      console.log('Updated answers:', newAnswers);
      return newAnswers;
    });
  };

  // Modifier la fonction shouldShowQuestion pour utiliser currentAnswers
  const shouldShowQuestion = (nodeId: string): boolean => {
    if (nodeId === '1') return true;
    
    const incomingEdges = selectedSurvey?.edges?.filter(e => e.target === nodeId) || [];
    if (incomingEdges.length === 0) return false;

    return incomingEdges.some(edge => {
      if (edge.label) {
        const sourceAnswer = currentAnswers[edge.source];
        return sourceAnswer === edge.label;
      }
      return shouldShowQuestion(edge.source);
    });
  };

  // Ajouter une fonction pour nettoyer les réponses sauvegardées après soumission
  const clearSavedAnswers = () => {
    if (selectedSurvey) {
      const storageKey = getStorageKey(selectedSurvey._id);
      localStorage.removeItem(storageKey);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (!selectedSurvey) {
        setSubmitError('Aucun sondage sélectionné');
        return;
      }

      // Valider le formulaire avant la soumission
      if (!validateForm(data)) {
        setSubmitError('Veuillez répondre à toutes les questions requises');
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Token non trouvé');

      // Pour les sondages dynamiques, filtrer uniquement les réponses visibles
      if (selectedSurvey.isDynamic && selectedSurvey.nodes) {
        const shouldShowQuestion = (nodeId: string): boolean => {
          if (nodeId === '1') return true;
          const incomingEdges = selectedSurvey.edges?.filter(e => e.target === nodeId) || [];
          if (incomingEdges.length === 0) return false;
          return incomingEdges.some(edge => {
            if (edge.label) {
              return currentAnswers[edge.source] === edge.label;
            }
            return shouldShowQuestion(edge.source);
          });
        };

        // Filtrer uniquement les réponses aux questions visibles
        const visibleNodes = selectedSurvey.nodes.filter(node => shouldShowQuestion(node.id));
        const visibleAnswers = visibleNodes.map(node => ({
          nodeId: node.id,
          value: data.answers[node.id]
        }));

        const submissionData = {
          isDynamic: true,
          answers: visibleAnswers,
          demographic: selectedSurvey.demographicEnabled ? {
            gender: data.demographic?.gender,
            dateOfBirth: data.demographic?.dateOfBirth,
            educationLevel: data.demographic?.educationLevel,
            city: data.demographic?.city
          } : undefined,
          path: visibleNodes.map(node => node.id)
        };

        await submitSurveyAnswer(
          selectedSurvey._id,
          submissionData,
          token
        );
      } else {
        // Pour les sondages non dynamiques, garder la logique existante
        const submissionData = {
          isDynamic: false,
          answers: Object.entries(data.answers).map(([questionId, value]) => ({
            questionId,
            value
          })),
          demographic: selectedSurvey.demographicEnabled ? {
            gender: data.demographic?.gender,
            dateOfBirth: data.demographic?.dateOfBirth,
            educationLevel: data.demographic?.educationLevel,
            city: data.demographic?.city
          } : undefined
        };

        await submitSurveyAnswer(
          selectedSurvey._id,
          submissionData,
          token
        );
      }

      setNotification({
        message: 'Réponse soumise avec succès',
        severity: 'success',
        open: true
      });

      setAnsweredSurveys(prev => [...prev, selectedSurvey._id]);
      clearSavedAnswers();
      reset();
      setSelectedSurvey(null);
    } catch (error: any) {
      console.error('Erreur lors de la soumission:', error);
      setSubmitError(
        error.response?.data?.message || 
        error.message || 
        'Erreur lors de la soumission du sondage'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestionMedia = (media: string) => {
    console.log('Rendering media:', media);

    if (!media) return null;

    // Utiliser directement l'URL Cloudinary
    const fullUrl = media;
    console.log('Full media URL:', fullUrl);

    // Déterminer le type de média basé sur l'extension du fichier
    const isVideo = fullUrl.match(/\.(mp4|mov|webm)$/i);
    const isImage = fullUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);

    if (isVideo) {
      return (
        <Box sx={{ width: '100%', maxWidth: '500px', margin: '0 auto', mb: 2 }}>
          <ReactPlayer
            url={fullUrl}
            controls
            width="100%"
            height="auto"
            style={{ borderRadius: '8px' }}
            config={{
              file: {
                attributes: {
                  controlsList: 'nodownload',
                  onContextMenu: (e: React.MouseEvent) => e.preventDefault()
                }
              }
            }}
            onError={(e) => console.error('Erreur de chargement vidéo:', e)}
            onReady={() => console.log('Vidéo prête à être lue')}
          />
        </Box>
      );
    } 
    
    if (isImage) {
      return (
        <Box sx={{ width: '100%', maxWidth: '500px', margin: '0 auto', mb: 2 }}>
          <Box
            component="img"
            src={fullUrl}
            alt="Question media"
            sx={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px',
              objectFit: 'contain',
              maxHeight: '400px',
              backgroundColor: 'background.paper',
              boxShadow: 1
            }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              console.error('Erreur de chargement image:', e);
              console.log('URL qui a échoué:', fullUrl);
              (e.target as HTMLImageElement).style.display = 'none';
            }}
            onLoad={() => console.log('Image chargée avec succès')}
          />
        </Box>
      );
    }

    return null;
  };

  const clearError = (fieldPath: string) => {
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldPath];
      return newErrors;
    });
  };

  const validateField = (fieldPath: string, value: any) => {
    if (fieldPath.startsWith('demographic.')) {
      if (value) {
        clearError(fieldPath);
      }
    } else if (fieldPath.startsWith('answers.')) {
      if (value !== undefined && value !== '' && value !== null) {
        clearError(fieldPath);
      }
    }
  };

  const renderQuestionInput = (question: Question) => (
    <Controller
      name={`answers.${question.id}` as FieldPath}
      control={control}
      defaultValue=""
      render={({ field }) => {
        const component = (() => {
          switch (question.type) {
            case "text":
              return (
                <TextField 
                  {...field}
                  fullWidth 
                  error={!!formErrors[`answers.${question.id}`]}
                  helperText={formErrors[`answers.${question.id}`]}
                  onChange={(e) => {
                    field.onChange(e);
                    validateField(`answers.${question.id}`, e.target.value);
                  }}
                />
              );

            case "multiple-choice":
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <RadioGroup 
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      validateField(`answers.${question.id}`, e.target.value);
                    }}
                  >
                    {question.options?.map((option, index) => (
                      <FormControlLabel
                        key={index}
                        value={option}
                        control={<Radio />}
                        label={option}
                      />
                    ))}
                  </RadioGroup>
                  {formErrors[`answers.${question.id}`] && (
                    <Typography color="error" variant="caption">
                      {formErrors[`answers.${question.id}`]}
                    </Typography>
                  )}
                </Box>
              );

            case "dropdown":
              return (
                <Controller
                  name={`answers.${question.id}`}
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>{question.text || 'Sélectionnez une option'}</InputLabel>
                      <Select
                        {...field}
                        label={question.text || 'Sélectionnez une option'}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value);
                          validateField(`answers.${question.id}`, value);
                        }}
                      >
                        {(question.options || []).map((option: string) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              );

            case "yes-no":
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <RadioGroup 
                    {...field} 
                    row
                    onChange={(e) => {
                      field.onChange(e);
                      validateField(`answers.${question.id}`, e.target.value);
                    }}
                  >
                    <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                    <FormControlLabel value="no" control={<Radio />} label="No" />
                  </RadioGroup>
                  {formErrors[`answers.${question.id}`] && (
                    <Typography color="error" variant="caption">
                      {formErrors[`answers.${question.id}`]}
                    </Typography>
                  )}
                </Box>
              );

            case "rating":
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Rating
                    {...field}
                    precision={1}
                    size="large"
                    onChange={(_, value) => {
                      field.onChange(value);
                      validateField(`answers.${question.id}`, value);
                    }}
                    value={typeof field.value === 'number' ? field.value : 0}
                    sx={{ 
                      '& .MuiRating-icon': { 
                        fontSize: '2rem' 
                      }
                    }}
                  />
                  {formErrors[`answers.${question.id}`] && (
                    <Typography 
                      color="error" 
                      variant="caption" 
                      sx={{ mt: 0.5, display: 'block' }}
                    >
                      {formErrors[`answers.${question.id}`]}
                    </Typography>
                  )}
                </Box>
              );

            case "slider":
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Slider
                    {...field}
                    min={1}
                    max={10}
                    valueLabelDisplay="auto"
                    onChange={(_, value) => {
                      field.onChange(value);
                      validateField(`answers.${question.id}`, value);
                    }}
                    value={typeof field.value === 'number' ? field.value : 0}
                  />
                  {formErrors[`answers.${question.id}`] && (
                    <Typography color="error" variant="caption">
                      {formErrors[`answers.${question.id}`]}
                    </Typography>
                  )}
                </Box>
              );

            case "date":
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Select date"
                      value={field.value || null}
                      onChange={(newValue) => {
                        field.onChange(newValue);
                        validateField(`answers.${question.id}`, newValue);
                      }}
                      renderInput={(params: TextFieldProps) => (
                        <TextField
                          {...params}
                          fullWidth
                          error={!!formErrors[`answers.${question.id}`]}
                          helperText={formErrors[`answers.${question.id}`]}
                        />
                      )}
                    />
                  </LocalizationProvider>
                </Box>
              );

            default:
              return (
                <TextField 
                  {...field} 
                  fullWidth 
                  error={!!formErrors[`answers.${question.id}`]}
                  helperText={formErrors[`answers.${question.id}`]}
                />
              );
          }
        })();

        return (
          <Box sx={{ width: '100%' }}>
            {component}
          </Box>
        );
      }}
    />
  );

  const renderDemographicFields = () => (
    <Box sx={{ mb: 4, p: 3, border: "1px solid #ddd", borderRadius: "8px" }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Demographic Information</Typography>
      
      <Controller
        name="demographic.gender"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Gender</Typography>
            <RadioGroup 
              {...field}
              onChange={(e) => {
                field.onChange(e);
                validateField('demographic.gender', e.target.value);
              }}
              row
            >
              <FormControlLabel value="male" control={<Radio />} label="Male" />
              <FormControlLabel value="female" control={<Radio />} label="Female" />
              <FormControlLabel value="other" control={<Radio />} label="Other" />
            </RadioGroup>
            {formErrors['demographic.gender'] && (
              <Typography color="error" variant="caption">
                {formErrors['demographic.gender']}
              </Typography>
            )}
          </Box>
        )}
      />

      <Controller
        name="demographic.dateOfBirth"
        control={control}
        render={({ field }) => (
          <Box sx={{ mb: 3, width: '100%' }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Date of Birth"
                value={field.value || null}
                onChange={(newValue) => {
                  field.onChange(newValue);
                  validateField('demographic.dateOfBirth', newValue);
                }}
                renderInput={(params: TextFieldProps) => (
                  <TextField
                    {...params}
                    fullWidth
                    error={!!formErrors['demographic.dateOfBirth']}
                    helperText={formErrors['demographic.dateOfBirth']}
                  />
                )}
              />
            </LocalizationProvider>
          </Box>
        )}
      />

      <Controller
        name="demographic.educationLevel"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <Box sx={{ mb: 3 }}>
            <FormControl 
              fullWidth
              error={!!formErrors['demographic.educationLevel']}
            >
              <InputLabel>Education Level</InputLabel>
              <Select
                {...field}
                label="Education Level"
                onChange={(e) => {
                  field.onChange(e);
                  validateField('demographic.educationLevel', e.target.value);
                }}
              >
                {educationLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </Select>
              {formErrors['demographic.educationLevel'] && (
                <FormHelperText error>
                  {formErrors['demographic.educationLevel']}
                </FormHelperText>
              )}
            </FormControl>
          </Box>
        )}
      />

      <Controller
        name="demographic.city"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <FormControl 
            fullWidth
            error={!!formErrors['demographic.city']}
          >
            <InputLabel>City</InputLabel>
            <Select
              {...field}
              label="City"
              disabled={isLoadingCities}
              onChange={(e) => {
                field.onChange(e);
                validateField('demographic.city', e.target.value);
              }}
            >
              <MenuItem value="" disabled>
                {isLoadingCities ? 'Loading cities...' : 'Select your city'}
              </MenuItem>
              {cities.map((city) => (
                <MenuItem key={city} value={city}>
                  {city}
                </MenuItem>
              ))}
            </Select>
            {formErrors['demographic.city'] && (
              <FormHelperText error>
                {formErrors['demographic.city']}
              </FormHelperText>
            )}
          </FormControl>
        )}
      />
    </Box>
  );

  const fetchAnsweredSurveys = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Récupérer les réponses aux sondages classiques
      const classicResponse = await axios.get(`${BASE_URL}/survey-answers/responses/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const classicAnswers = classicResponse.data.map((response: any) => response.surveyId);

      // Récupérer les réponses aux sondages dynamiques
      const dynamicResponse = await axios.get(`${BASE_URL}/dynamic-survey-answers/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dynamicAnswers = dynamicResponse.data.map((response: any) => response.surveyId);

      // Combiner les deux types de réponses
      const allAnsweredSurveys = [...classicAnswers, ...dynamicAnswers];
      console.log('Tous les sondages répondus:', allAnsweredSurveys);
      setAnsweredSurveys(allAnsweredSurveys);
    } catch (error) {
      console.error('Erreur lors de la récupération des sondages répondus:', error);
    }
  };

  useEffect(() => {
    fetchAnsweredSurveys();
  }, []);

  useEffect(() => {
    if (notification.open) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, open: false }));
      }, 5000); // Disparaît après 5 secondes

      return () => clearTimeout(timer);
    }
  }, [notification.open]);

  useEffect(() => {
    console.log("État actuel des sondages répondus:", answeredSurveys);
  }, [answeredSurveys]);

  const fetchSurveyResponses = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('http://localhost:5041/api/survey-answers/count', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSurveyResponses(data);
      }
    } catch (error) {
      console.error('Error fetching survey responses:', error);
    }
  };

  useEffect(() => {
    fetchSurveyResponses();
  }, []);

  const handleShareClick = (event: React.MouseEvent<HTMLButtonElement>, survey: Survey) => {
    console.log('Share button clicked', event.currentTarget); // Debug log
    console.log('Survey to share:', survey); // Debug log
    event.preventDefault();
    event.stopPropagation();
    setShareAnchorEl(event.currentTarget);
    setCurrentSurveyToShare(survey);
  };

  const handleShareClose = () => {
    setShareAnchorEl(null);
    setCurrentSurveyToShare(null);
  };

  const getShareUrl = (survey: Survey) => {
    return `${window.location.origin}${window.location.pathname}?surveyId=${survey._id}`;
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: <WhatsAppIcon />,
      action: (survey: Survey) => {
        const url = encodeURIComponent(getShareUrl(survey));
        const text = encodeURIComponent(`📋 ${survey.title}\n\n🔍 Take part in this interesting survey!\n\n👉 Your opinion matters and will only take a few minutes.\n\n📊 Survey link: `);
        window.open(`https://wa.me/?text=${text}${url}`);
      }
    },
    {
      name: 'Facebook',
      icon: <FacebookIcon />,
      action: (survey: Survey) => {
        const url = encodeURIComponent(getShareUrl(survey));
        window.open(`https://www.facebook.com/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
      }
    },
    {
      name: 'Twitter',
      icon: <TwitterIcon />,
      action: (survey: Survey) => {
        const url = encodeURIComponent(getShareUrl(survey));
        const text = encodeURIComponent(`${survey.title}`);
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'width=600,height=400');
      }
    },
    {
      name: 'LinkedIn',
      icon: <LinkedInIcon />,
      action: (survey: Survey) => {
        const url = encodeURIComponent(getShareUrl(survey));
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=600,height=400');
      }
    },
    {
      name: 'Copy Link',
      icon: <ContentCopyIcon />,
      action: (survey: Survey) => {
        navigator.clipboard.writeText(getShareUrl(survey))
          .then(() => {
            setNotification({
              message: "Lien copié dans le presse-papiers !",
              severity: 'success',
              open: true
            });
          })
          .catch(() => {
            setNotification({
              message: "Erreur lors de la copie du lien",
              severity: 'error',
              open: true
            });
          });
      }
    }
  ];

  const fetchLastDemographicData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('http://localhost:5041/api/survey-answers/last-demographic', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLastDemographicData(data);
        // Mettre à jour les valeurs du formulaire avec les données récupérées
        if (data) {
          setValue('demographic.gender', data.gender || '');
          setValue('demographic.dateOfBirth', data.dateOfBirth ? new Date(data.dateOfBirth) : null);
          setValue('demographic.educationLevel', data.educationLevel || '');
          setValue('demographic.city', data.city || '');
        }
      }
    } catch (error) {
      console.error('Error fetching last demographic data:', error);
    }
  };

  const renderSurveyForm = () => {
    if (!selectedSurvey) {
      return null;
    }

    return (
      <Box sx={{ p: 4, backgroundColor: 'white' }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {selectedSurvey.demographicEnabled && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
                Demographic informations
              </Typography>
              {renderDemographicFields()}
            </Box>
          )}

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
              Survey questions
            </Typography>
            {selectedSurvey.questions.map((question: Question) => (
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
                  {question.text}
                </Typography>
                
                {question.media && renderQuestionMedia(question.media)}

                <Box sx={{ mt: 2 }}>
                  {renderQuestionInput(question)}
                </Box>
              </Paper>
            ))}
          </Box>

          {submitError && (
            <Typography color="error" sx={{ mt: 2, mb: 2 }}>
              {submitError}
            </Typography>
          )}

          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            mt: 4,
            pt: 4,
            borderTop: '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            <Button
              id="submit-survey-button"
              data-testid="submit-survey-button"
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
                minWidth: 200
              }}
            >
              {isSubmitting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                  <span>Submitting...</span>
                </Box>
              ) : (
                'Submit Survey'
              )}
            </Button>
          </Box>
        </form>
      </Box>
    );
  };

  // Modifier la fonction hasAnswered pour gérer les deux types de sondages
  const hasAnswered = (surveyId: string) => {
    return answeredSurveys.includes(surveyId);
  };

  // Fonction pour ordonner les nœuds selon le flux
  const getOrderedNodesFromFlow = (nodes: any[], startNodeId = '1') => {
    const orderedNodes: any[] = [];
    const visited = new Set<string>();

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        orderedNodes.push(node);
        // Trouver les nœuds connectés
        const connectedNodes = selectedSurvey?.edges?.filter(e => e.source === nodeId)
          .map(e => e.target) || [];
        connectedNodes.forEach(traverse);
      }
    };

    traverse(startNodeId);
    return orderedNodes;
  };

  // Ajouter cette variable dans le composant
  const isLastQuestion = currentQuestionIndex === orderedNodes.length - 1;

  // Modifier la fonction de rendu des questions pour les sondages dynamiques
  const renderDynamicSurveyQuestions = () => {
    if (!selectedSurvey?.isDynamic || !selectedSurvey.nodes) return null;

    // Fonction pour obtenir l'ordre des nœuds selon le flux
    const getOrderedNodes = () => {
      const orderedNodes: any[] = [];
      const visited = new Set<string>();
      const nodesByLevel: { [key: string]: number } = {};

      // Fonction pour calculer le niveau de profondeur de chaque nœud
      const calculateDepth = (nodeId: string, depth: number = 0) => {
        if (nodesByLevel[nodeId] === undefined || depth > nodesByLevel[nodeId]) {
          nodesByLevel[nodeId] = depth;
        }

        const outgoingEdges = selectedSurvey?.edges?.filter(e => e.source === nodeId) || [];
        outgoingEdges.forEach(edge => {
          calculateDepth(edge.target, depth + 1);
        });
      };

      // Calculer la profondeur en commençant par le nœud racine
      calculateDepth('1');

      // Fonction de parcours modifiée pour respecter la profondeur
      const traverse = () => {
        const nodes = selectedSurvey?.nodes || [];
        
        // Trier les nœuds par niveau de profondeur
        const sortedNodeIds = Object.entries(nodesByLevel)
          .sort(([, depthA], [, depthB]) => depthA - depthB)
          .map(([nodeId]) => nodeId);

        // Ajouter les nœuds dans l'ordre de profondeur
        sortedNodeIds.forEach(nodeId => {
          if (!visited.has(nodeId)) {
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
              visited.add(nodeId);
              orderedNodes.push(node);
            }
          }
        });
      };

      traverse();
      return orderedNodes;
    };

    // Fonction pour vérifier si c'est une question critique
    const isCriticalQuestion = (nodeId: string): boolean => {
      return selectedSurvey.edges?.some(e => (e.source === nodeId || e.target === nodeId) && e.label) || false;
    };

    // Obtenir les nœuds ordonnés
    const orderedNodes = getOrderedNodes();

    // Modifier la fonction de rendu des questions pour les sondages dynamiques
    const renderQuestionInput = (node: any) => {
      // Ajouter le rendu du média avant le rendu de l'input
      const renderNodeMedia = () => {
        const mediaUrl = node.data?.mediaUrl || node.data?.media;
        if (!mediaUrl) return null;

        // Déterminer le type de média basé sur l'extension du fichier
        const isVideo = mediaUrl.match(/\.(mp4|mov|webm)$/i);
        const isImage = mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);

        if (isVideo) {
          return (
            <Box sx={{ width: '100%', maxWidth: '500px', margin: '0 auto', mb: 2 }}>
              <ReactPlayer
                url={mediaUrl}
                controls
                width="100%"
                height="auto"
                style={{ borderRadius: '8px' }}
                config={{
                  file: {
                    attributes: {
                      controlsList: 'nodownload',
                      onContextMenu: (e: React.MouseEvent) => e.preventDefault()
                    }
                  }
                }}
                onError={(e) => console.error('Erreur de chargement vidéo:', e)}
                onReady={() => console.log('Vidéo prête à être lue')}
              />
            </Box>
          );
        }

        if (isImage) {
          return (
            <Box sx={{ width: '100%', maxWidth: '500px', margin: '0 auto', mb: 2 }}>
              <Box
                component="img"
                src={mediaUrl}
                alt="Question media"
                sx={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  objectFit: 'contain',
                  maxHeight: '400px',
                  backgroundColor: 'background.paper',
                  boxShadow: 1
                }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  console.error('Erreur de chargement image:', e);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
                onLoad={() => console.log('Image chargée avec succès')}
              />
            </Box>
          );
        }

        return null;
      };

      return (
        <Box sx={{ width: '100%' }}>
          {renderNodeMedia()}
          {/* Reste du code existant pour le rendu des inputs */}
          {(() => {
            const effectiveType = node.data?.questionType || node.data?.type;
            switch (effectiveType?.toLowerCase()) {
              case 'yes-no':
              case 'yesno':
              case 'boolean':
                return (
                  <Controller
                    name={`answers.${node.id}`}
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <RadioGroup
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value);
                          handleDynamicAnswerChange(node.id, value);
                        }}
                      >
                        <FormControlLabel value="Yes" control={<Radio />} label="Oui" />
                        <FormControlLabel value="No" control={<Radio />} label="Non" />
                      </RadioGroup>
                    )}
                  />
                );

              case 'multiple-choice':
              case 'multiplechoice':
              case 'choice':
              case 'radio':
                return (
                  <Controller
                    name={`answers.${node.id}`}
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <RadioGroup
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value);
                          handleDynamicAnswerChange(node.id, value);
                        }}
                      >
                        {(node.data?.options || []).map((option: string) => (
                          <FormControlLabel
                            key={option}
                            value={option}
                            control={<Radio />}
                            label={option}
                          />
                        ))}
                      </RadioGroup>
                    )}
                  />
                );

              case 'text':
              case 'textarea':
              case 'string':
                return (
                  <Controller
                    name={`answers.${node.id}`}
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        multiline
                        rows={3}
                        onChange={(e) => {
                          field.onChange(e);
                          handleDynamicAnswerChange(node.id, e.target.value);
                        }}
                      />
                    )}
                  />
                );

              case 'rating':
              case 'stars':
                return (
                  <Controller
                    name={`answers.${node.id}`}
                    control={control}
                    defaultValue={0}
                    render={({ field }) => (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Rating
                          {...field}
                          onChange={(_, value) => {
                            field.onChange(value);
                            handleDynamicAnswerChange(node.id, value);
                          }}
                        />
                        <Typography>
                          {field.value ? `${field.value} étoiles` : 'Aucune note'}
                        </Typography>
                      </Box>
                    )}
                  />
                );

              case 'slider':
              case 'range':
              case 'number':
                return (
                  <Controller
                    name={`answers.${node.id}`}
                    control={control}
                    defaultValue={0}
                    render={({ field }) => (
                      <Box sx={{ width: '100%', px: 2 }}>
                        <Slider
                          {...field}
                          min={0}
                          max={10}
                          marks
                          valueLabelDisplay="auto"
                          onChange={(_, value) => {
                            field.onChange(value);
                            handleDynamicAnswerChange(node.id, value);
                          }}
                        />
                      </Box>
                    )}
                  />
                );

              case 'date':
              case 'datetime':
                return (
                  <Controller
                    name={`answers.${node.id}`}
                    control={control}
                    defaultValue={null}
                    render={({ field }) => (
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                          {...field}
                          renderInput={(params) => <TextField {...params} fullWidth />}
                          onChange={(value) => {
                            field.onChange(value);
                            handleDynamicAnswerChange(node.id, value);
                          }}
                        />
                      </LocalizationProvider>
                    )}
                  />
                );

              case 'dropdown':
                return (
                  <Controller
                    name={`answers.${node.id}`}
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>{node.data.text || 'Sélectionnez une option'}</InputLabel>
                        <Select
                          {...field}
                          label={node.data.text || 'Sélectionnez une option'}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value);
                            handleDynamicAnswerChange(node.id, value);
                          }}
                        >
                          {(node.data?.options || []).map((option: string) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                );

              default:
                console.warn(`Type de question non supporté: ${effectiveType}`, node);
                // Si aucun type n'est spécifié, on utilise un champ texte par défaut
                return (
                  <Controller
                    name={`answers.${node.id}`}
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        multiline
                        rows={3}
                        onChange={(e) => {
                          field.onChange(e);
                          handleDynamicAnswerChange(node.id, e.target.value);
                        }}
                        placeholder="Votre réponse..."
                      />
                    )}
                  />
                );
            }
          })()}
        </Box>
      );
    };

    return (
      <Box sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {orderedNodes.map((node) => {
            const isVisible = shouldShowQuestion(node.id);
            const isCritical = isCriticalQuestion(node.id);

            if (!isVisible) return null;

            return (
              <Paper
                key={node.id}
                elevation={1}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 2,
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  backgroundColor: 'white'
                }}
              >
                <Typography variant="h6" gutterBottom>
                  {node.data.text || node.data.label || 'Question without text'}
                </Typography>

                <Box sx={{ mt: 2 }}>
                  {renderQuestionInput(node)}
                </Box>
              </Paper>
            );
          })}

          {submitError && (
            <Typography color="error" sx={{ mt: 2, mb: 2 }}>
              {submitError}
            </Typography>
          )}

          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            mt: 4,
            pt: 4,
            borderTop: '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            <Button
              id="submit-dynamic-survey-button"
              data-testid="submit-dynamic-survey-button"
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
                minWidth: 200
              }}
            >
              {isSubmitting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                  <span>Submitting...</span>
                </Box>
              ) : (
                'Submit Survey'
              )}
            </Button>
          </Box>
        </form>
      </Box>
    );
  };

  if (!selectedSurvey) {
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
          <Box sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            py: 4,
            px: 4,
            color: 'white',
            textAlign: 'center',
          }}>
            <Typography variant="h4" fontWeight="bold">
              Available Surveys
            </Typography>
          </Box>

          <Box sx={{ p: 4, backgroundColor: 'white' }}>
            <Box sx={{ mb: 4, backgroundColor: 'background.paper', p: 3, borderRadius: 2, boxShadow: 1 }}>
              <TextField
                id="survey-search-input"
                data-testid="survey-search-input"
                fullWidth
                variant="outlined"
                placeholder="Search surveys by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                  id="date-filter-chip"
                  data-testid="date-filter-chip"
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
                <Chip
                  id="sort-filter-chip"
                  data-testid="sort-filter-chip"
                  icon={<FilterListIcon />}
                  label={`Sort by ${sortBy === 'date' ? 'Date' : 'Popular'}`}
                  onClick={() => setSortBy(sortBy === 'date' ? 'popular' : 'date')}
                  color={sortBy === 'popular' ? "primary" : "default"}
                  variant={sortBy === 'popular' ? "filled" : "outlined"}
                  sx={{
                    '&.MuiChip-filled': {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }
                  }}
                />
                <Chip
                  id="type-filter-chip"
                  data-testid="type-filter-chip"
                  icon={surveyTypeFilter === 'dynamic' ? <AutoGraphIcon /> : <ListAltIcon />}
                  label={`${surveyTypeFilter === 'all' ? 'All Types' : 
                          surveyTypeFilter === 'dynamic' ? 'Dynamic' : 'Static'}`}
                  onClick={() => {
                    setSurveyTypeFilter(current => {
                      switch (current) {
                        case 'all': return 'dynamic';
                        case 'dynamic': return 'static';
                        case 'static': return 'all';
                      }
                    });
                  }}
                  color={surveyTypeFilter !== 'all' ? "primary" : "default"}
                  variant={surveyTypeFilter !== 'all' ? "filled" : "outlined"}
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
                      label="Start Date"
                      value={dateRange.start}
                      onChange={(newValue) => setDateRange(prev => ({ ...prev, start: newValue }))}
                      renderInput={(params) => <TextField {...params} size="small" />}
                    />
                    <DatePicker
                      label="End Date"
                      value={dateRange.end}
                      onChange={(newValue) => setDateRange(prev => ({ ...prev, end: newValue }))}
                      renderInput={(params) => <TextField {...params} size="small" />}
                      minDate={dateRange.start || undefined}
                    />
                  </Stack>
                </LocalizationProvider>
              )}
            </Box>

            {error ? (
              <Typography color="error" sx={{ textAlign: 'center', my: 4 }}>
                {error}
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {filteredSurveys.map((survey) => (
                  <Paper
                    id={`survey-card-${survey._id}`}
                    data-testid={`survey-card-${survey._id}`}
                    key={survey._id}
                    elevation={1}
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
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography 
                          id={`survey-title-${survey._id}`}
                          data-testid={`survey-title-${survey._id}`}
                          variant="h6" 
                          sx={{ 
                            color: 'primary.main',
                            fontWeight: 500,
                            flexGrow: 1,
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
                        {survey.isPrivate && (
                          <Chip
                            icon={<LockIcon sx={{ fontSize: '0.5rem' }} />}
                            label="Private"
                            size="small"
                            sx={{
                              ml: 1,
                              backgroundColor: 'rgba(0, 198, 212, 0.1)',
                              color: '#00C6D4',
                              '& .MuiChip-icon': {
                                color: '#00C6D4'
                              },
                              height: '24px',
                              fontWeight: 500
                            }}
                          />
                        )}
                        {survey.isDynamic && (
                          <Chip
                            icon={<AutoGraphIcon />}
                            label="Dynamic"
                            size="small"
                            sx={{
                              ml: 1,
                              backgroundColor: 'rgba(102, 126, 234, 0.1)',
                              color: '#667eea',
                              '& .MuiChip-icon': {
                                color: '#667eea'
                              },
                              height: '24px',
                              fontWeight: 500
                            }}
                          />
                        )}
                        {!survey.isDynamic && (
                          <Chip
                            icon={<ListAltIcon />}
                            label="Static"
                            size="small"
                            sx={{
                              ml: 1,
                              backgroundColor: 'rgba(102, 126, 234, 0.1)',
                              color: '#667eea',
                              '& .MuiChip-icon': {
                                color: '#667eea'
                              },
                              height: '24px',
                              fontWeight: 500
                            }}
                          />
                        )}
                      </Box>
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
                        direction="row" 
                        spacing={1} 
                        sx={{
                          display: 'flex',
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: '8px',
                          '& .MuiChip-root': {
                            margin: '0 !important'
                          }
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
                      </Stack>
                    </Box>
                    
                    <Box sx={{ 
                      p: 2, 
                      borderTop: 1, 
                      borderColor: 'divider',
                      backgroundColor: 'rgba(102, 126, 234, 0.1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      position: 'relative',
                      zIndex: 1
                    }}>
                      <Button
                        id={`share-button-${survey._id}`}
                        data-testid={`share-button-${survey._id}`}
                        onClick={(e) => handleShareClick(e, survey)}
                        variant="outlined"
                        size="small"
                        startIcon={<ShareIcon />}
                        sx={{
                          borderColor: '#667eea',
                          color: '#667eea',
                          '&:hover': {
                            borderColor: '#764ba2',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                          },
                        }}
                      >
                        Share 
                      </Button>
                      <Button
                        id={`answer-button-${survey._id}`}
                        data-testid={`answer-button-${survey._id}`}
                        onClick={() => setSelectedSurvey(survey)}
                        variant="contained"
                        size="small"
                        disabled={hasAnswered(survey._id)}
                        sx={{
                          background: hasAnswered(survey._id)
                            ? 'rgba(0, 0, 0, 0.12)'
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': {
                            background: hasAnswered(survey._id)
                              ? 'rgba(0, 0, 0, 0.12)'
                              : 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                          },
                          color: hasAnswered(survey._id) ? 'rgba(100, 0, 0, 0.26)' : 'white',
                          pointerEvents: hasAnswered(survey._id) ? 'none' : 'auto',
                          opacity: hasAnswered(survey._id) ? 0.6 : 1,
                        }}
                      >
                        {hasAnswered(survey._id) ? 'Already Answered' : 'Answer Survey'}
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        </Paper>

        {notification.open && (
          <Box sx={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            minWidth: 300
          }}>
            <Alert 
              severity={notification.severity}
              onClose={() => setNotification(prev => ({ ...prev, open: false }))}
              sx={{ 
                backgroundColor: 'white',
                boxShadow: 3,
                borderRadius: 2
              }}
            >
              {notification.message}
            </Alert>
          </Box>
        )}

        <Menu
          id="share-menu"
          data-testid="share-menu"
          anchorEl={shareAnchorEl}
          open={Boolean(shareAnchorEl)}
          onClose={handleShareClose}
          PaperProps={{
            elevation: 3,
            sx: {
              borderRadius: 2,
              minWidth: 200,
            }
          }}
        >
          {shareOptions.map((option) => (
            <MenuItem
              key={option.name}
              onClick={() => {
                if (currentSurveyToShare) {
                  option.action(currentSurveyToShare);
                }
                handleShareClose();
              }}
              sx={{
                py: 1.5,
                gap: 2,
                '&:hover': {
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                }
              }}
            >
              {React.cloneElement(option.icon, {
                sx: { color: '#667eea' }
              })}
              <Typography variant="body2">
                {option.name}
              </Typography>
            </MenuItem>
          ))}
        </Menu>
      </Box>
    );
  }

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
        <Box sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 4,
          px: 4,
          color: 'white',
          textAlign: 'center',
          position: 'relative'
        }}>
          <IconButton
            onClick={() => setSelectedSurvey(null)}
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
          <Typography variant="h4" fontWeight="bold">
            {selectedSurvey.title}
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.9 }}>
            {selectedSurvey.description}
          </Typography>
        </Box>

        {selectedSurvey?.isDynamic ? (
          renderDynamicSurveyQuestions()
        ) : (
          renderSurveyForm()
        )}
      </Paper>
    </Box>
  );
};

export default SurveyAnswerPage;