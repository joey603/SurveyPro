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
  Tooltip,
  Fab,
  Popover,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClearIcon from '@mui/icons-material/Clear';
import AutorenewIcon from '@mui/icons-material/Autorenew';
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
import SchoolIcon from '@mui/icons-material/School';
import 'intro.js/introjs.css';
import introJs from 'intro.js';
import Lottie from 'lottie-react';
import loadingCardAnimation from '@/assets/Animation loading card survey.json';

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
  console.log(`[SurveyAnswerPage] Page chargée - ${new Date().toISOString()}`);
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
      console.log('=== DÉBUT DES TESTS DE STOCKAGE LOCALSTORAGE ===');
      console.log('ID du sondage détecté:', sharedSurveyId);
      
      // Sauvegarder uniquement le chemin relatif
      const redirectPath = `${window.location.pathname}?surveyId=${sharedSurveyId}`;
      console.log('Chemin de redirection à sauvegarder:', redirectPath);
      
      // Créer une fonction asynchrone pour traiter la redirection
      const saveAndRedirect = async () => {
        try {
          // Stocker dans le localStorage de manière fiable avec une promesse
          return new Promise<void>((resolve) => {
            // Stocker l'URL dans plusieurs endroits pour être sûr
            console.log('Début du stockage');
            
            // Méthode 1: localStorage
            localStorage.setItem('redirectAfterLogin', redirectPath);
            console.log('localStorage standard mis à jour');
            
            // Méthode 2: localStorage avec nom alternatif
            localStorage.setItem('redirectAfterLogin_backup', redirectPath);
            console.log('localStorage backup mis à jour');
            
            // Méthode 3: sessionStorage
            sessionStorage.setItem('redirectAfterLogin', redirectPath);
            console.log('sessionStorage mis à jour');
            
            // Méthode 4: Cookie
            document.cookie = `redirectAfterLogin_cookie=${encodeURIComponent(redirectPath)}; path=/; max-age=3600`;
            console.log('Cookie mis à jour');
            
            // Méthode 5: localStorage sous forme JSON
            const dataObj = { url: redirectPath, timestamp: Date.now() };
            localStorage.setItem('redirectAfterLogin_json', JSON.stringify(dataObj));
            console.log('localStorage JSON mis à jour');
            
            // Attendre un peu pour s'assurer que tout est bien enregistré
            setTimeout(() => {
              // Vérifier que le stockage a bien fonctionné
              const storedValue = localStorage.getItem('redirectAfterLogin');
              console.log('Vérification du stockage:', storedValue);
              
              if (storedValue === redirectPath) {
                console.log('Stockage vérifié avec succès, redirection possible');
              } else {
                console.warn('Stockage non vérifié, tentative de stockage à nouveau');
                localStorage.setItem('redirectAfterLogin', redirectPath);
              }
              
              resolve();
            }, 300);
          });
        } catch (error) {
          console.error('Erreur lors du stockage:', error);
        }
      };
      
      // Utiliser une IIFE async pour pouvoir utiliser await
      (async () => {
        console.log('Démarrage du processus de stockage et redirection');
        await saveAndRedirect();
        console.log('Stockage terminé, redirection vers la page de connexion');
        
        // Stocker d'autres informations qui pourraient être utiles
        const fullURL = window.location.href;
        localStorage.setItem('lastVisitedUrl', fullURL);
        
        // Une dernière vérification avant la redirection
        const finalCheck = localStorage.getItem('redirectAfterLogin');
        console.log('Vérification finale avant redirection:', finalCheck);
        
        // Redirection vers la page de connexion après stockage garanti
        if (finalCheck) {
          console.log('Redirection confirmée vers /login');
          // Utiliser window.location.href pour une redirection plus fiable
          window.location.href = '/login';
        } else {
          console.warn('Échec de la vérification finale, tentative de forcer la redirection');
          window.location.href = `/login?from=${encodeURIComponent(redirectPath)}`;
        }
      })();
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    // Vérifier si l'utilisateur vient de se connecter et a une URL de redirection
    if (isAuthenticated) {
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        // Nettoyer le localStorage
        localStorage.removeItem('redirectAfterLogin');
        
        // Construire l'URL complète
        const fullUrl = `${window.location.origin}${redirectPath}`;
        console.log('Redirection vers:', fullUrl);
        
        // Rediriger vers l'URL sauvegardée
        window.location.href = fullUrl;
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
      console.error("Error fetching cities:", error);
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
        console.log('Surveys loaded:', allSurveys);
        
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
            setError('Survey not found');
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
          console.log('Answered surveys:', answeredIds);
        }

      } catch (error: any) {
        console.error('Error loading surveys:', error);
        setError(error.message || 'Failed to load surveys');
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
        return String(sourceAnswer) === String(edge.label);
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
        setSubmitError('No survey selected');
        return;
      }

      // Valider le formulaire avant la soumission
      if (!validateForm(data)) {
        setSubmitError('Please answer all required questions');
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Token non trouvé');

      // Sauvegarder les données démographiques dans le localStorage si elles existent
      if (selectedSurvey.demographicEnabled && data.demographic) {
        localStorage.setItem('lastDemographicData', JSON.stringify(data.demographic));
      }

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
        message: 'Survey response submitted successfully',
        severity: 'success',
        open: true
      });

      setAnsweredSurveys(prev => [...prev, selectedSurvey._id]);
      clearSavedAnswers();
      reset();
      setSelectedSurvey(null);
    } catch (error: any) {
      console.error('Error submitting survey response:', error);
      setSubmitError(
        error.response?.data?.message || 
        error.message || 
        'Error submitting survey response'
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
            onError={(e) => console.error('Error loading video:', e)}
            onReady={() => console.log('Video ready to be played')}
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
              console.error('Error loading image:', e);
              console.log('URL that failed:', fullUrl);
              (e.target as HTMLImageElement).style.display = 'none';
            }}
            onLoad={() => console.log('Image loaded successfully')}
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

  // Fonction pour vérifier si c'est une question critique
  const isCriticalQuestion = (nodeId: string): boolean => {
    if (!selectedSurvey?.edges) return false;
    
    // Une question est critique si elle a des edges sortants avec des labels différents
    const outgoingEdges = selectedSurvey.edges.filter(e => e.source === nodeId);
    return outgoingEdges.length > 0 && outgoingEdges.some(e => e.label);
  };

  // Modifier la fonction renderQuestionInput pour gérer les réponses aux questions dynamiques
  const renderQuestionInput = (question: Question) => (
    <Controller
      name={`answers.${question.id}` as FieldPath}
      control={control}
      defaultValue=""
      render={({ field }) => {
        // Handler pour les changements de valeur aux questions dynamiques
        const handleChange = (value: any) => {
          field.onChange(value);
          validateField(`answers.${question.id}`, value);
          
          // Si c'est un sondage dynamique, mettre à jour les réponses actuelles
          if (selectedSurvey?.isDynamic) {
            handleDynamicAnswerChange(question.id, value);
          }
        };

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
                    handleChange(e.target.value);
                  }}
                />
              );

            case "multiple-choice":
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <RadioGroup 
                    {...field}
                    onChange={(e) => {
                      handleChange(e.target.value);
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
                <FormControl fullWidth>
                  <InputLabel>{question.text || 'Select an option'}</InputLabel>
                  <Select
                    {...field}
                    label={question.text || 'Select an option'}
                    onChange={(e) => {
                      handleChange(e.target.value);
                    }}
                  >
                    {(question.options || []).map((option: string) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );

            case "yes-no":
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <RadioGroup 
                    {...field} 
                    row
                    onChange={(e) => {
                      handleChange(e.target.value);
                    }}
                  >
                    <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
                    <FormControlLabel value="No" control={<Radio />} label="No" />
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
                      handleChange(value);
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
                      handleChange(value);
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
                        handleChange(newValue);
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

            case "color-picker":
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <input
                    type="color"
                    {...field}
                    style={{ width: '100%', height: '40px' }}
                    onChange={(e) => {
                      handleChange(e.target.value);
                    }}
                  />
                  {formErrors[`answers.${question.id}`] && (
                    <Typography color="error" variant="caption">
                      {formErrors[`answers.${question.id}`]}
                    </Typography>
                  )}
                </Box>
              );

            case "file-upload":
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      handleChange(file);
                    }}
                    style={{ width: '100%' }}
                  />
                  {formErrors[`answers.${question.id}`] && (
                    <Typography color="error" variant="caption">
                      {formErrors[`answers.${question.id}`]}
                    </Typography>
                  )}
                </Box>
              );

            default:
              return (
                <TextField 
                  {...field} 
                  fullWidth 
                  error={!!formErrors[`answers.${question.id}`]}
                  helperText={formErrors[`answers.${question.id}`]}
                  onChange={(e) => {
                    handleChange(e.target.value);
                  }}
                />
              );
          }
        })();

        return (
          <Box sx={{ width: '100%' }}>
            {question.media && renderQuestionMedia(question.media)}
            {component}
            {isCriticalQuestion(question.id) && (
              <Chip 
                label="This answer impacts following questions" 
                color="primary" 
                size="small" 
                sx={{ mt: 2 }} 
              />
            )}
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
              className="gender-options"
            >
              <FormControlLabel value="male" control={<Radio id="gender-male" />} label="Male" />
              <FormControlLabel value="female" control={<Radio id="gender-female" />} label="Female" />
              <FormControlLabel value="other" control={<Radio id="gender-other" />} label="Other" />
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
          <Box 
            sx={{ 
              mb: 3, 
              width: '100%', 
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '4px',
              padding: '8px',
              backgroundColor: 'rgba(102, 126, 234, 0.03)'
            }} 
            id="dob-field-container"
          >
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
                    id="date-of-birth-field"
                    className="dob-field"
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
          <Box 
            sx={{ 
              mb: 3,
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '4px',
              padding: '8px',
              backgroundColor: 'rgba(102, 126, 234, 0.03)'
            }} 
            id="education-field-container"
          >
            <FormControl 
              fullWidth
              error={!!formErrors['demographic.educationLevel']}
            >
              <InputLabel id="education-level-label">Education Level</InputLabel>
              <Select
                {...field}
                labelId="education-level-label"
                id="education-level-field"
                className="education-field"
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
          <Box 
            sx={{ 
              mb: 3,
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '4px',
              padding: '8px',
              backgroundColor: 'rgba(102, 126, 234, 0.03)'
            }} 
            id="city-field-container"
          >
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
          </Box>
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
      console.log('All answered surveys:', allAnsweredSurveys);
      setAnsweredSurveys(allAnsweredSurveys);
    } catch (error) {
      console.error('Error retrieving answered surveys:', error);
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
    console.log("Current answered surveys:", answeredSurveys);
  }, [answeredSurveys]);

  // Charger les données démographiques sauvegardées lors du premier rendu
  useEffect(() => {
    // D'abord essayer de charger depuis le backend
    fetchLastDemographicData();
    
    // Ensuite, vérifier si des données sont présentes dans le localStorage
    const savedDemographicData = localStorage.getItem('lastDemographicData');
    if (savedDemographicData) {
      try {
        const data = JSON.parse(savedDemographicData);
        setValue('demographic.gender', data.gender || '');
        setValue('demographic.dateOfBirth', data.dateOfBirth ? new Date(data.dateOfBirth) : null);
        setValue('demographic.educationLevel', data.educationLevel || '');
        setValue('demographic.city', data.city || '');
      } catch (error) {
        console.error('Error loading demographic data from local storage:', error);
      }
    }
  }, [setValue]);

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
              message: "Link copied to clipboard!",
              severity: 'success',
              open: true
            });
          })
          .catch(() => {
            setNotification({
              message: "Error copying link",
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

      const response = await fetch(`${BASE_URL}/survey-answers/last-demographic`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Demographic data retrieved from backend:', data);
        
        // Mettre à jour les valeurs du formulaire avec les données récupérées
        if (data) {
          // Sauvegarder également dans le localStorage pour une utilisation future
          localStorage.setItem('lastDemographicData', JSON.stringify(data));
          
          // Mettre à jour l'état local
          setLastDemographicData(data);
          
          // Mettre à jour le formulaire
          setValue('demographic.gender', data.gender || '');
          setValue('demographic.dateOfBirth', data.dateOfBirth ? new Date(data.dateOfBirth) : null);
          setValue('demographic.educationLevel', data.educationLevel || '');
          setValue('demographic.city', data.city || '');
          
          return true;
        }
      } else if (response.status === 404) {
        console.log('No demographic data found in the backend');
        return false;
      } else {
        console.error('Error retrieving demographic data:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('Error retrieving demographic data:', error);
      return false;
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
            <Box id="demographic-section" sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
                Demographic informations
                {lastDemographicData && (
                  <Tooltip title="Demographic data automatically loaded">
                    <Chip 
                      icon={<AutorenewIcon />} 
                      label="Auto" 
                      size="small" 
                      color="primary" 
                      sx={{ ml: 2 }} 
                    />
                  </Tooltip>
                )}
              </Typography>
              {renderDemographicFields()}
            </Box>
          )}

          <Box sx={{ mb: 4 }} id="survey-questions-section">
            <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
              Survey questions
            </Typography>
            {selectedSurvey.questions.map((question: Question, index: number) => (
              <Paper
                key={question.id}
                elevation={1}
                className="survey-question-paper"
                data-testid={`question-${question.id}`}
                id={`survey-question-${index}`}
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
        
        // Pour les questions critiques, suivre uniquement le chemin correspondant à la réponse actuelle
        if (isCriticalQuestion(nodeId) && currentAnswers[nodeId]) {
          const matchingEdge = outgoingEdges.find(edge => 
            String(edge.label) === String(currentAnswers[nodeId])
          );
          
          if (matchingEdge) {
            calculateDepth(matchingEdge.target, depth + 1);
          }
        } else {
          // Pour les questions non critiques, explorer tous les chemins
          outgoingEdges.forEach(edge => {
            calculateDepth(edge.target, depth + 1);
          });
        }
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

    return (
      <Box sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {selectedSurvey.demographicEnabled && (
            <Box id="demographic-section" sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
                Demographic informations
                {lastDemographicData && (
                  <Tooltip title="Demographic data automatically loaded">
                    <Chip 
                      icon={<AutorenewIcon />} 
                      label="Auto" 
                      size="small" 
                      color="primary" 
                      sx={{ ml: 2 }} 
                    />
                  </Tooltip>
                )}
              </Typography>
              {renderDemographicFields()}
            </Box>
          )}

          <Box id="survey-questions-section" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
              Survey questions
            </Typography>
            
            {getOrderedNodes().map((node, index) => {
              const isVisible = shouldShowQuestion(node.id);
              const isCritical = isCriticalQuestion(node.id);

              if (!isVisible) return null;

              return (
                <Paper
                  key={node.id}
                  elevation={1}
                  className="survey-question-paper"
                  data-testid={`question-${node.id}`}
                  id={`survey-question-${index}`}
                  sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: 2,
                    border: isCritical ? '2px solid #3f51b5' : '1px solid rgba(0, 0, 0, 0.1)',
                    backgroundColor: 'white'
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    {node.data.text || node.data.label || 'Question without text'}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    {renderQuestionInput({
                      id: node.id,
                      text: node.data.text || node.data.label || '',
                      type: node.data.type || 'text',
                      options: node.data.options || [],
                      media: node.data.mediaUrl || node.data.media
                    })}
                  </Box>
                </Paper>
              );
            })}
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

  // Ajouter la fonction startTutorial
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
      .intro-tuto-button {
        flex: 1;
        text-align: center;
        font-weight: bold;
        cursor: pointer;
      }
    `;
    document.head.appendChild(styleEl);
    
    // Ajouter un contrôleur personnalisé pour le tutoriel
    const controllerDiv = document.createElement('div');
    controllerDiv.className = 'tutorial-controller';
    controllerDiv.style.position = 'fixed';
    controllerDiv.style.bottom = '20px';
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
        console.error('Erreur previous:', e);
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
        console.error('Erreur next:', e);
      }
    });
    
    exitButton.addEventListener('click', () => {
      try {
        intro.exit(true);
        document.body.removeChild(controllerDiv);
      } catch (e) {
        console.error('Erreur exit:', e);
      }
    });
    
    // Ajouter les boutons au contrôleur
    controllerDiv.appendChild(prevButton);
    controllerDiv.appendChild(nextButton);
    controllerDiv.appendChild(exitButton);
    
    // Déterminer les étapes du tutoriel en fonction de la page actuelle
    const steps = selectedSurvey 
      ? getSurveyAnswerTutorialSteps() 
      : getSurveyListTutorialSteps();
    
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
    
    // Nettoyer à la sortie
    intro.onexit(function() {
      if (document.head.contains(styleEl)) {
        document.head.removeChild(styleEl);
      }
    });
    
    // Mise à jour de la barre de progression après chaque changement
    intro.onafterchange(function(targetElement) {
      // Récupérer l'étape actuelle
      const currentStep = intro._currentStep;
      const totalSteps = intro._options.steps.length;
      
      // Mettre à jour la barre de progression
      const progressBar = document.querySelector('.introjs-progress');
      if (progressBar) {
        const progressWidth = (currentStep / (totalSteps - 1)) * 100;
        (progressBar as HTMLElement).style.width = `${progressWidth}%`;
      }
    });
    
    // Démarrer le tutoriel
    intro.start();
  };

  // Fonction pour obtenir les étapes du tutoriel de la liste des sondages
  const getSurveyListTutorialSteps = () => {
    return [
      {
        element: 'body',
        intro: "Welcome to the survey answering section! This tutorial will guide you through the available features.",
        position: 'top'
      },
      {
        element: '#survey-search-input',
        intro: "Use this search bar to quickly find surveys by title or description.",
        position: 'bottom'
      },
      {
        element: '#date-filter-chip',
        intro: "Filter surveys by creation date by clicking on this filter.",
        position: 'bottom'
      },
      {
        element: '#sort-filter-chip',
        intro: "Sort surveys by creation date or by popularity.",
        position: 'bottom'
      },
      {
        element: '#type-filter-chip',
        intro: "Filter by survey type: all, dynamic (with conditional paths) or static (linear).",
        position: 'bottom'
      },
      {
        element: '[data-testid^="survey-card-"]:first-of-type',
        intro: "This is a survey card. Each card shows the title, a description, and information such as the number of questions.",
        position: 'right'
      },
      {
        element: '[data-testid^="survey-title-"]:first-of-type',
        intro: "The survey title is displayed here, with badges indicating if it is private or dynamic.",
        position: 'bottom'
      },
      {
        element: 'button[id^="share-button-"]',
        intro: "Share a survey with others via various social networks or by copying the link.",
        position: 'top'
      },
      {
        element: 'button[id^="answer-button-"]',
        intro: "Click here to answer the survey. If you have already answered it, the button will be disabled.",
        position: 'top'
      },
      {
        element: 'body',
        intro: "Once you click on 'Answer Survey', you can answer the questions and submit your responses. Congratulations, you now know how to use the survey answering page!",
        position: 'top'
      }
    ];
  };

  // Fonction pour obtenir les étapes du tutoriel de réponse à un sondage
  const getSurveyAnswerTutorialSteps = () => {
    const steps = [
      {
        element: 'body',
        intro: "Welcome to the survey answering page! This tutorial will guide you through completing a survey.",
        position: 'top'
      },
      {
        element: '#back-button',
        intro: "Click this button to return to the list of surveys at any time.",
        position: 'right'
      }
    ];

    // Ajouter des étapes pour les informations démographiques si activées
    if (selectedSurvey?.demographicEnabled) {
      // Introduction générale à la section démographique
      steps.push({
        element: '#demographic-section',
        intro: "The demographic section collects basic information about you. This helps the survey creator analyze responses based on demographics.",
        position: 'bottom'
      });
      
      // Explications détaillées pour chaque champ démographique
      steps.push({
        element: '.gender-options',
        intro: "Gender field: Select your gender from the options (Male, Female, or Other). This information is used to analyze trends across different gender groups.",
        position: 'bottom'
      });
      
      steps.push({
        element: '#dob-field-container',
        intro: "Date of Birth field: Select your birth date. Age demographics help researchers understand how responses vary between different age groups.",
        position: 'bottom'
      });
      
      steps.push({
        element: '#education-field-container',
        intro: "Education Level: Select your highest level of education from options like High School, Bachelor's, Master's, or Ph.D. This helps identify response patterns based on educational background.",
        position: 'bottom'
      });
      
      steps.push({
        element: '#city-field-container',
        intro: "City field: Select your city from the dropdown. Location data enables geographic analysis and helps identify regional trends in survey responses.",
        position: 'bottom'
      });
    }

    // Vérifier s'il s'agit d'un sondage dynamique
    if (selectedSurvey?.isDynamic) {
      const hasCriticalQuestion = selectedSurvey.edges?.some(edge => edge.label);
      
      steps.push({
        element: '#survey-questions-section',
        intro: "This is a dynamic survey that adapts based on your answers. Different questions may appear depending on how you respond.",
        position: 'top'
      });

      if (hasCriticalQuestion) {
        // Trouver la première question critique en parcourant les noeuds du sondage
        const criticalNodeId = selectedSurvey.nodes?.find(node => 
          isCriticalQuestion(node.id)
        )?.id;
        
        // Sélectionner l'élément correspondant à la première question critique
        // ou utiliser le sélecteur par défaut si nous ne la trouvons pas
        const criticalQuestionSelector = criticalNodeId 
          ? `[data-testid="question-${criticalNodeId}"]` 
          : '.survey-question-paper[style*="border: 2px solid"]';
        
        steps.push({
          element: criticalQuestionSelector,
          intro: "Critical questions (like Yes/No or dropdown questions) will determine which subsequent questions you'll see. Your experience will be personalized based on your answers.",
          position: 'left'
        });
      }

      steps.push({
        element: 'form',
        intro: "Answer each question fully before moving to the next. You can't return to previous questions in a dynamic survey after submission.",
        position: 'bottom'
      });
    } else {
      // Pour les sondages statiques
      steps.push({
        element: '#survey-questions-section',
        intro: "This is a standard survey with a fixed set of questions. Answer each question to the best of your ability.",
        position: 'bottom'
      });

    }

    // Finir avec le bouton de soumission
    steps.push({
      element: 'button[type="submit"]',
      intro: "When you've answered all questions, click the Submit button to record your responses.",
      position: 'top'
    });

    return steps;
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
              Explore
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              Browse and answer surveys created by users
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

              <Stack 
                direction="row" 
                spacing={2} 
                alignItems="center"
                sx={{
                  flexWrap: 'wrap',
                  gap: 1,
                  '& .MuiChip-root': {
                    margin: '0 !important',
                    '@media (max-width: 600px)': {
                      width: '100%',
                      justifyContent: 'center',
                      marginBottom: '8px !important'
                    }
                  }
                }}
              >
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
            ) : loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                <Lottie
                  animationData={loadingCardAnimation}
                  style={{ width: 200, height: 200 }}
                  loop={true}
                />
              </Box>
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

        {/* Bouton tutorial flottant */}
        <Tooltip title="Start tutorial">
          <Fab
            size="small"
            onClick={startTutorial}
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
            id="back-button"
            data-testid="back-to-surveys-button"
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
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {selectedSurvey.title}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
            {selectedSurvey.description || 'Please answer all questions to submit this survey'}
          </Typography>
        </Box>

        {selectedSurvey?.isDynamic ? (
          renderDynamicSurveyQuestions()
        ) : (
          renderSurveyForm()
        )}
      </Paper>

      {/* Bouton tutorial flottant */}
      <Tooltip title="Lancer le tutoriel">
        <Fab
          size="small"
          onClick={startTutorial}
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
  );
};

export default SurveyAnswerPage;