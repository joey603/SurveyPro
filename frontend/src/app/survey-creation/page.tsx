'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Switch,
  Select,
  Slider,
  Rating,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  InputAdornment,
  Fab,
} from '@mui/material';
import ReactPlayer from 'react-player';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ChromePicker } from 'react-color';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { createSurvey, uploadMedia } from '../../utils/surveyService';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility'; // Ajouté pour le bouton Preview
import InfoIcon from '@mui/icons-material/Info';
import Tooltip from '@mui/material/Tooltip';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Zoom from '@mui/material/Zoom';
import { colors } from '../../theme/colors';
import Lottie from "lottie-react";
import validationAnimation from "@/assets/animation-check.json";
import { useRouter } from 'next/navigation';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import 'intro.js/introjs.css';
import introJs from 'intro.js';
import SchoolIcon from '@mui/icons-material/School';

type Question = {
  id: string;
  type: string;
  text: string;
  options?: string[];
  media?: string;
  mediaUrl?: string;
  selectedDate?: Date | null;
};

type FormData = {
  title: string;
  description: string;
  demographicEnabled: boolean;
  isPrivate: boolean;
  questions: Question[];
};

const isValidMediaURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;  // Accepte toutes les URLs valides
  } catch {
    return false; // Retourne false uniquement si ce n'est pas une URL valide
  }
};

const questionTypes = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'text', label: 'Open-ended' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'yes-no', label: 'Yes/No' },
  { value: 'slider', label: 'Slider' },
  { value: 'rating', label: 'Rating (Stars)' },
  { value: 'date', label: 'Date Picker' },
];

const educationOptions = [
  'High School',
  "Bachelor's",
  "Master's",
  'Doctorate',
  'Other',
];

const validateFormData = (data: FormData) => {
  const errors: {
    title?: boolean;
    description?: boolean;
    questions: {
      [key: string]: boolean | {
        text?: boolean;
        options?: { [key: number]: boolean }
      }
    };
  } = {
    questions: {}
  };

  let hasErrors = false;

  // Valider le titre
  if (!data.title?.trim()) {
    errors.title = true;
    hasErrors = true;
  }

  // Valider les questions
  data.questions.forEach((question, index) => {
    // Valider le texte de la question
    if (!question.text?.trim()) {
      if (!errors.questions[index]) {
        errors.questions[index] = {};
      }
      if (typeof errors.questions[index] === 'object') {
        (errors.questions[index] as any).text = true;
      }
      hasErrors = true;
    }

    // Valider les options pour les questions à choix multiples ou dropdown
    if ((question.type === 'multiple-choice' || question.type === 'dropdown') && question.options) {
      const optionErrors: { [key: number]: boolean } = {};
      question.options.forEach((option, optionIndex) => {
        if (!option.trim()) {
          optionErrors[optionIndex] = true;
          hasErrors = true;
        }
      });

      if (Object.keys(optionErrors).length > 0) {
        if (typeof errors.questions[index] === 'object') {
          (errors.questions[index] as any).options = optionErrors;
        }
      }
    }
  });

  return hasErrors ? errors : null;
};

const SortableQuestionItem = ({ 
  children, 
  id 
}: { 
  children: React.ReactNode, 
  id: string 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as const,
    marginBottom: '16px',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children}
      <div
        {...listeners}
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          width: '100px',
          height: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'grab',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          zIndex: 5,
        }}
      >
        <svg width="40" height="8" viewBox="0 0 40 8">
          <g fill="#667eea">
            <circle cx="4" cy="4" r="2" />
            <circle cx="14" cy="4" r="2" />
            <circle cx="24" cy="4" r="2" />
            <circle cx="34" cy="4" r="2" />
          </g>
        </svg>
      </div>
    </div>
  );
};

const SurveyCreationPage = () => {
  const { control, handleSubmit, setValue, getValues, reset, watch } =
    useForm<FormData>({
      defaultValues: {
        title: '',
        description: '',
        demographicEnabled: false,
        isPrivate: false,
        questions: [],
      },
    });

  const { fields, append, remove, update, move } = useFieldArray({
    control,
    name: 'questions',
  });

  const [localOptions, setLocalOptions] = useState<{ [key: string]: string[] }>(
    {}
  );
  const [showPreview, setShowPreview] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const watchedQuestions = watch('questions');
  const watchedTitle = watch('title');

  const [cities, setCities] = useState<string[]>([]); // Liste des villes
  const [selectedCity, setSelectedCity] = useState(''); // Ville sélectionnée

  const [isUploading, setIsUploading] = useState<{ [key: string]: boolean }>({});

  // Ajout d'un state pour la boîte de dialogue de confirmation
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [notification, setNotification] = useState<{
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
    open: boolean;
    link?: string;
    action?: () => void;
  }>({
    message: '',
    severity: 'info',
    open: false
  });

  const [validationErrors, setValidationErrors] = useState<{
    title?: boolean;
    description?: boolean;
    questions: { 
      [key: string]: boolean | { 
        text?: boolean;
        options?: { [key: number]: boolean } 
      }
    };
  }>({
    questions: {}
  });

  // Ajout d'un état pour suivre si le formulaire a été soumis
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Mettre à jour les erreurs en temps réel pour le titre
  useEffect(() => {
    setValidationErrors(prev => ({
      ...prev,
      title: !watchedTitle?.trim(),
    }));
  }, [watchedTitle]);

  // Mettre à jour les erreurs en temps réel pour les questions
  useEffect(() => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      watchedQuestions.forEach((question: any, index: number) => {
        if (question.text?.trim()) {
          if (newErrors.questions) {
            delete newErrors.questions[index];
          }
        } else {
          if (!newErrors.questions) {
            newErrors.questions = {};
          }
          newErrors.questions[index] = true;
        }
      });
      return newErrors;
    });
  }, [watchedQuestions]);

  const fetchCities = async () => {
    try {
      const response = await fetch(
        'https://countriesnow.space/api/v0.1/countries/cities',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ country: 'Israel' }),
        }
      );
      const data = await response.json();

      if (data && data.data) {
        return data.data; // Liste des villes
      } else {
        console.error('Erreur : aucune donnée trouvée.');
        return [];
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des villes :', error);
      return [];
    }
  };

  // Appeler `fetchCities` dans `useEffect`
  useEffect(() => {
    const loadCities = async () => {
      const citiesList = await fetchCities();
      setCities(citiesList); // Met à jour les villes
    };

    loadCities();
  }, []);

  /* const questions: Question[] = [
    {
      id: "1",
      type: "video",
      text: "Test Video",
      media: "https://www.w3schools.com/html/mov_bbb.mp4", // URL de la vidéo
    },
  ];*/

  const demographicEnabled = watch('demographicEnabled');

  useEffect(() => {
    return () => {
      // Nettoyez toutes les URLs Blob lorsqu'elles ne sont plus nécessaires
      fields.forEach((field) => {
        if (field.media?.startsWith('blob:')) {
          URL.revokeObjectURL(field.media);
        }
      });
    };
  }, [fields]);

  const handleAddQuestion = () => {
    const id = Date.now().toString();
    append({
      id,
      type: 'text',
      text: '',
      options: [],
      media: '',
      selectedDate: null,
    });
    setLocalOptions((prev) => ({ ...prev, [id]: [] }));
  };

  const handleDeleteQuestion = async (index: number) => {
    const question = fields[index];
    
    if (question.media) {
      try {
        // Marquer le média pour suppression
        const newTracker = {
          ...mediaTracker,
          [question.media]: 'to_delete'
        };
        
        setMediaTracker(newTracker);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Récupérer le token et vérifier sa validité
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        // Vérifier si le token est expiré
        try {
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          if (tokenData.exp * 1000 < Date.now()) {
            throw new Error('Token expired');
          }
        } catch (e) {
          throw new Error('Invalid token');
        }

        const parts = question.media.split('/');
        const filename = parts[parts.length - 1];
        const publicId = `uploads/${filename.split('.')[0]}`;
        
        const response = await fetch('http://localhost:5041/api/surveys/delete-media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ publicId }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Si le token est invalide, on peut rediriger vers la page de connexion
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
            throw new Error('Session expired. Please login again.');
          }
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to delete media: ${publicId}`);
        }

        // Réinitialiser le tracker pour ce média
        setMediaTracker(prev => {
          const newState = { ...prev };
          delete newState[question.media as string];
          return newState;
        });

      } catch (error) {
        console.error('Error deleting media:', error);
      }
    }
    
    remove(index);
  };

  const handleQuestionTypeChange = (index: number, newType: string) => {
    const currentText = getValues(`questions.${index}.text`);
    const questionId = fields[index].id;

    update(index, {
      id: questionId,
      type: newType,
      text: currentText,
      options: newType === 'multiple-choice' || newType === 'dropdown' ? [''] : [],
      media: fields[index].media || '',
      selectedDate: fields[index].selectedDate || null,
    });
  };

  const handleResetSurvey = async (event: React.MouseEvent<HTMLButtonElement> | null) => {
    if (event) {
      event.preventDefault();
    }
    
    // Utiliser la boîte de dialogue de confirmation
    setConfirmDialog({
      open: true,
      title: 'Reset Survey',
      message: 'Are you sure you want to reset the survey? All progress will be lost.',
      onConfirm: async () => {
        try {
          // Récupérer tous les médias des questions
          const currentMedia = fields
            .map(field => field.media)
            .filter(media => media && media.trim() !== '');
            
          if (currentMedia.length > 0) {
            console.log('Current media to mark for deletion:', currentMedia);
            
            // Marquer tous les médias pour suppression et attendre la mise à jour du state
            const newTracker = {
              ...mediaTracker,
              ...Object.fromEntries(currentMedia.map(media => [media, 'to_delete']))
            };
            
            // Mettre à jour le state et attendre que ce soit fait
            setMediaTracker(newTracker);
            
            // Attendre que le state soit mis à jour
            await new Promise(resolve => setTimeout(resolve, 100));
            
            try {
              // Nettoyer les médias avec le nouveau tracker
              for (const media of currentMedia) {
                if (!media) continue;
                const parts = media.split('/');
                const filename = parts[parts.length - 1];
                const publicId = `uploads/${filename.split('.')[0]}`;
                
                const token = localStorage.getItem('accessToken');
                if (!token) {
                  throw new Error('No authentication token found');
                }

                const response = await fetch('http://localhost:5041/api/surveys/delete-media', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                  },
                  credentials: 'include',
                  body: JSON.stringify({ publicId }),
                });

                if (!response.ok) {
                  throw new Error(`Failed to delete media: ${publicId}`);
                }
              }
            } catch (error) {
              console.error('Error deleting media:', error);
            }
          }

          // Réinitialiser le formulaire
          reset({
            title: '',
            description: '',
            demographicEnabled: false,
            isPrivate: false,
            questions: []
          });
          
          // Réinitialiser le tracker de médias
          setMediaTracker({});
        } catch (error) {
          console.error('Error during reset:', error);
        }
        // Fermer la boîte de dialogue de confirmation
        setConfirmDialog(prev => ({ ...prev, open: false }));
      }
    });
  };

  const handleFileUpload = async (file: File, questionId: string): Promise<void> => {
    try {
      setIsUploading(prev => ({ ...prev, [questionId]: true }));
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Correction du chemin de l'API
      const mediaUrl = await uploadMedia(file);
      
      // Mise à jour du tracker de médias
      setMediaTracker(prev => ({
        ...prev,
        [mediaUrl]: 'active'
      }));

      // Mise à jour de la question avec la nouvelle URL
      fields.forEach((field, index) => {
        if (field.id === questionId) {
          update(index, {
            ...field,
            media: mediaUrl,
            mediaUrl: mediaUrl // Synchroniser les deux champs
          });
        }
      });

    } catch (error) {
      console.error('Error uploading media:', error);
      setNotification({
        message: 'Error uploading media',
        severity: 'error',
        open: true
      });
    } finally {
      setIsUploading(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const [localQuestions, setLocalQuestions] = useState<Question[]>([]);

  useEffect(() => {
    setLocalQuestions(getValues('questions'));
  }, [watch('questions')]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mediaTracker, setMediaTracker] = useState<{ [key: string]: string }>({});

  // Fonction pour gérer le changement de média
  const handleMediaChange = async (index: number, newMediaUrl: string, field: any) => {
    // Marquer l'ancien média pour suppression si nécessaire
    if (field.media && field.media !== newMediaUrl) {
      setMediaTracker(prev => ({
        ...prev,
        [field.media]: 'to_delete',
        [newMediaUrl]: 'active' // Marquer le nouveau média comme actif
      }));
    }

    // Mise à jour de la question
    update(index, { 
      ...field, 
      mediaUrl: newMediaUrl,
      media: newMediaUrl // Synchroniser les deux champs
    });
  };

  // Fonction pour nettoyer les médias non utilisés
  const cleanupUnusedMedia = async () => {
    try {
      // Ajouter un log pour voir l'état du mediaTracker
      console.log('Current mediaTracker state:', mediaTracker);

      const mediaToDelete = Object.entries(mediaTracker)
        .filter(([_, status]) => status === 'to_delete')
        .map(([url, _]) => {
          try {
            console.log('Processing URL:', url);
            const parts = url.split('/');
            const filename = parts[parts.length - 1];
            const publicId = `uploads/${filename.split('.')[0]}`;
            console.log('Extracted public_id:', publicId);
            return publicId;
          } catch (error) {
            console.error('Error processing URL:', url, error);
            return null;
          }
        })
        .filter(Boolean);

      console.log('Media to delete:', mediaToDelete);

      if (mediaToDelete.length > 0) {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('No authentication token found');
        }

        for (const publicId of mediaToDelete) {
          try {
            console.log('Sending delete request for:', publicId);
            // Correction du chemin de l'API et ajout des headers CORS
            const response = await fetch('http://localhost:5041/api/surveys/delete-media', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              },
              credentials: 'include', // Ajouter cette ligne pour les cookies
              body: JSON.stringify({ publicId }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`Server error: ${errorData.message}`);
            }

            const result = await response.json();
            console.log('Delete success:', result);
          } catch (error) {
            console.error(`Failed to delete media ${publicId}:`, error);
            setNotification({
              message: `Failed to delete media: ${error instanceof Error ? error.message : 'Unknown error'}`,
              severity: 'error',
              open: true
            });
          }
        }
      }

      // Réinitialiser le tracker après la suppression
      setMediaTracker({});
    } catch (error) {
      console.error('Error in cleanup:', error);
      setNotification({
        message: 'Error cleaning up media files',
        severity: 'error',
        open: true
      });
    }
  };

  const router = useRouter();

  const onSubmit = async (data: FormData) => {
    setIsSubmitted(true);
    
    // Validation des données
    const errors = validateFormData(data);
    if (errors) {
      setValidationErrors(errors);
      setNotification({
        message: 'Please fill in all required fields',
        severity: 'error',
        open: true
      });
      return; // Arrête l'exécution ici si il y a des erreurs
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const surveyData = {
        title: data.title,
        description: data.description,
        demographicEnabled: data.demographicEnabled,
        isPrivate: data.isPrivate,
        questions: data.questions
      };

      setIsSubmitting(true);
      try {
        const result = await createSurvey(surveyData, token);
        await cleanupUnusedMedia();
        
        if (data.isPrivate) {
          const surveyLink = `${window.location.origin}/survey-answer?surveyId=${result._id}`;
          
          setNotification({
            message: '',
            severity: 'info',
            open: true,
            link: surveyLink,
            action: () => {
              navigator.clipboard.writeText(surveyLink);
              setNotification(prev => ({
                ...prev,
                message: 'Link copied to clipboard!',
              }));
            }
          });
        } else {
          // Pour les sondages publics, rediriger directement sans afficher de boîte de dialogue
          setShowSuccess(true);
          setTimeout(() => {
            router.push('/survey-answer');
          }, 2000);
        }

      } catch (error: any) {
        setNotification({
          message: error.message || 'Error creating survey',
          severity: 'error',
          open: true
        });
      } finally {
        setIsSubmitting(false);
      }

    } catch (error: any) {
      console.error('Error submitting survey:', error);
      setNotification({
        message: error.message || 'Error creating survey',
        severity: 'error',
        open: true
      });
    }
  };

  const renderDemographicPreview = () => {
    return (
      <Box
        sx={{
          mt: 2,
          p: 3,
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#fff',
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Demographic Information
        </Typography>
        <RadioGroup sx={{ mb: 2 }}>
          <FormControlLabel value="male" control={<Radio />} label="Male" />
          <FormControlLabel value="female" control={<Radio />} label="Female" />
          <FormControlLabel value="other" control={<Radio />} label="Other" />
        </RadioGroup>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Date of Birth"
            value={dateOfBirth}
            onChange={(newDate) => setDateOfBirth(newDate)}
            renderInput={(params) => (
              <TextField {...params} fullWidth sx={{ mt: 2 }} />
            )}
          />
        </LocalizationProvider>
        <Select fullWidth sx={{ mt: 2 }} displayEmpty defaultValue="">
          <MenuItem value="" disabled>
            Select education level
          </MenuItem>
          {educationOptions.map((level, index) => (
            <MenuItem key={index} value={level}>
              {level}
            </MenuItem>
          ))}
        </Select>
        <Select
          fullWidth
          sx={{ mt: 2 }}
          displayEmpty
          defaultValue=""
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)} // Mettez à jour l'état de la ville sélectionnée
        >
          <MenuItem value="" disabled>
            Select your city
          </MenuItem>
          {cities.map((city, index) => (
            <MenuItem key={index} value={city}>
              {city}
            </MenuItem>
          ))}
        </Select>
      </Box>
    );
  };

  const renderPreviewQuestion = () => {
    const totalQuestions = watchedQuestions.length;
    const adjustedIndex = demographicEnabled
      ? currentPreviewIndex - 1
      : currentPreviewIndex;
    const question = adjustedIndex >= 0 ? watchedQuestions[adjustedIndex] : null;

    if (currentPreviewIndex === 0 && demographicEnabled) {
      return renderDemographicPreview();
    }

    if (!question) return null;

    return (
      <Box
        sx={{
          mt: 2,
          p: 3,
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          position: 'relative',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            textAlign: 'center',
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          {question.text || 'Untitled Question'}
        </Typography>

        {question.media && (
          <Box sx={{ mb: 2, textAlign: 'center' }}>
            {isImageFile(question.media) ? (
              <img 
                src={question.media}
                alt="Question media"
                style={{ 
                  maxWidth: '50%',
                  height: 'auto',
                  margin: '0 auto',
                  borderRadius: '8px',
                  objectFit: 'contain'
                }}
                onError={() => {
                  setNotification({
                    message: 'Error loading image in preview. Please check the URL.',
                    severity: 'error',
                    open: true
                  });
                }}
              />
            ) : (
              <ReactPlayer
                url={question.media}
                controls
                width="50%"
                height="200px"
                style={{
                  margin: '0 auto',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
                onError={(e) => {
                  console.error('ReactPlayer error:', e);
                  setNotification({
                    message: 'Error loading media in preview. Please check the URL.',
                    severity: 'error',
                    open: true
                  });
                }}
              />
            )}
          </Box>
        )}

        {/* Display the rest of the question */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center', // Centre tous les composants
            gap: 2, // Espacement entre les composants
          }}
        >
          {question.type === 'multiple-choice' && (
            <RadioGroup>
              {question.options?.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
          )}
          {question.type === 'text' && (
            <TextField fullWidth variant="outlined" placeholder="Your answer" />
          )}
          {question.type === 'dropdown' && (
            <Select fullWidth>
              {question.options?.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          )}
          {question.type === 'slider' && <Slider valueLabelDisplay="auto" />}
          {question.type === 'rating' && <Rating />}
          {question.type === 'yes-no' && (
            <RadioGroup>
              <FormControlLabel value="yes" control={<Radio />} label="Yes" />
              <FormControlLabel value="no" control={<Radio />} label="No" />
            </RadioGroup>
          )}
          {question.type === 'date' && (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Select a date"
                value={question.selectedDate || null}
                onChange={(newDate) =>
                  setValue(
                    `questions`,
                    watchedQuestions.map((q) =>
                      q.id === question.id ? { ...q, selectedDate: newDate } : q
                    )
                  )
                }
                renderInput={(params) => <TextField {...params} />}
              />
            </LocalizationProvider>
          )}
          {question.type === 'file-upload' && (
            <Button variant="outlined" component="label">
              Upload File
              <input
                type="file"
                hidden
                onChange={(e) =>
                  e.target.files && setUploadedFile(e.target.files[0])
                }
              />
            </Button>
          )}
          {uploadedFile && (
            <Typography sx={{ mt: 2 }} variant="body2">
              Uploaded file: {uploadedFile.name}
            </Typography>
          )}
        </Box>

        {/* Affichage du numéro de question */}
        <Typography
          variant="body2"
          sx={{ mt: 2, textAlign: 'center', color: 'gray' }}
        >
          Question {adjustedIndex + 1} of {totalQuestions}
        </Typography>
      </Box>
    );
  };

  const handleAddOption = (index: number) => {
    const currentQuestion = fields[index];
    const currentOptions = currentQuestion.options ?? [];
    const values = getValues();
    const currentQuestionValues = values.questions[index];

    // Mettre à jour les options en préservant toutes les valeurs existantes
    update(index, {
      ...currentQuestionValues, // Utiliser les valeurs actuelles du formulaire
      options: [...currentOptions, ''],
    });
  };

  // Fonction utilitaire pour vérifier l'état d'erreur
  const getQuestionError = (questionIndex: number) => {
    if (!isSubmitted) return false; // Ne pas montrer d'erreur si pas encore soumis
    const error = validationErrors.questions[questionIndex];
    if (typeof error === 'object') {
      return Boolean(error.text);
    }
    return Boolean(error);
  };

  const getOptionError = (questionIndex: number, optionIndex: number) => {
    if (!isSubmitted) return false; // Ne pas montrer d'erreur si pas encore soumis
    const error = validationErrors.questions[questionIndex];
    if (typeof error === 'object' && error.options) {
      return Boolean(error.options[optionIndex]);
    }
    return false;
  };

  // Fonction utilitaire pour vérifier si une question a des erreurs
  const hasQuestionErrors = (questionIndex: number) => {
    const error = validationErrors.questions[questionIndex];
    if (!error) return false;
    
    if (typeof error === 'object') {
      // Vérifier le texte de la question
      if (error.text) return true;
      
      // Vérifier les options
      if (error.options) {
        return Object.values(error.options).some(optionError => optionError);
      }
    }
    
    return Boolean(error);
  };

  // Fonction utilitaire pour vérifier les erreurs d'options
  const hasOptionsErrors = (questionIndex: number) => {
    const error = validationErrors.questions[questionIndex];
    if (typeof error === 'object' && error.options) {
      return Object.values(error.options).some(optionError => optionError);
    }
    return false;
  };

  // Ajoutez cette fonction utilitaire pour détecter le type de média
  const isImageFile = (url: string): boolean => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  // Ajoutez cet état pour gérer le chargement des médias
  const [loadingMedia, setLoadingMedia] = useState<{ [key: string]: boolean }>({});

  const [showSuccess, setShowSuccess] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 0,
        tolerance: 5
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex(item => item.id === active.id);
      const newIndex = fields.findIndex(item => item.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        move(oldIndex, newIndex);
      }
    }
  };

  const startTutorial = () => {
    // S'assurer qu'au moins une question existe pour le tutoriel
    if (fields.length === 0) {
      handleAddQuestion();
      setTimeout(() => {
        runSimpleTutorial();
      }, 500);
    } else {
      runSimpleTutorial();
    }
  };

  const runSimpleTutorial = () => {
    // Créer une nouvelle instance et la rendre accessible globalement
    const intro = introJs();
    (window as any).introInstance = intro;
    (window as any).surveyCreationFunctions = {
      showPreview: () => setShowPreview(true),
      hidePreview: () => setShowPreview(false)
    };
    
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
            const isInViewport = (
              rect.top >= 0 &&
              rect.left >= 0 &&
              rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
              rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
            
            if (!isInViewport) {
              // Calculer la position de défilement optimale
              const scrollTop = window.pageYOffset + rect.top - window.innerHeight / 2 + rect.height / 2;
              
              // Défilement en douceur
              window.scrollTo({
                top: scrollTop,
                behavior: 'smooth'
              });
            }
          }
        }
        
        // Forcer l'affichage des tooltips
        const tooltips = document.querySelectorAll('.introjs-tooltip') as NodeListOf<HTMLElement>;
        tooltips.forEach(tooltip => {
          if (tooltip) {
            tooltip.style.opacity = '1';
            tooltip.style.visibility = 'visible';
            tooltip.style.display = 'block';
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
      }, 100);
    };
    
    // Ajouter des styles plus simples pour le tutoriel
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
    
    // Configuration du tutoriel avec construction dynamique des étapes
    const buildSteps = () => {
      // Définir les types de position valides pour introJs
      type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';
      
      // Créer les étapes avec les positions typées
      const steps = [
        {
          element: '[data-intro="title"]',
          intro: "Welcome to the survey creator! This tutorial will guide you through the essential features.",
          position: 'bottom'
        },
        {
          element: '[data-intro="basic-info"]',
          intro: "Start by filling in the basic information of your survey, such as the title and description.",
          position: 'bottom'
        },
        {
          element: '[data-intro="demographic"]',
          intro: "Enable this option to collect demographic information such as age, gender, and city from your participants.",
          position: 'right'
        },
        {
          element: '[data-intro="privacy"]',
          intro: "Choose whether your survey is public (visible to everyone) or private (accessible only via a link).",
          position: 'right'
        },
        {
          element: '[data-intro="add-question"]',
          intro: "Click here to add new questions to your survey.",
          position: 'top'
        },
        {
          element: '[data-intro="question-type"]',
          intro: "Select the question type from many options: multiple choice, free text, stars, etc.",
          position: 'right'
        },
        {
          element: '[data-intro="media-upload"]',
          intro: "Add images or videos to your questions to make them more engaging.",
          position: 'right'
        },
        {
          element: '[data-intro="reset"]',
          intro: "The Reset button allows you to completely reset your survey. Warning: this action deletes all your questions and entered information!",
          position: 'top'
        },
        {
          element: '[data-intro="preview"]',
          intro: "The Preview function is essential for visualizing your survey. Click this button after the tutorial to see how your survey will appear to participants. You can navigate between questions and check the formatting.",
          position: 'top'
        },
        {
          element: '[data-intro="submit"]',
          intro: "Once you're satisfied with your survey, click here to submit it and share it with participants.",
          position: 'top'
        },
        {
          element: 'body',
          intro: "Congratulations! You now know how to create a custom survey. Don't hesitate to try the Preview function to see how your survey will appear before submitting it!",
          position: 'bottom'
        }
      ];
      
      // Vérifier si les éléments existent avant d'ajouter les étapes correspondantes
      if (document.querySelector('.SortableQuestionItem')) {
        steps.splice(7, 0, {
          element: '.SortableQuestionItem',
          intro: "You can reorder your questions by dragging them using the handle located at the bottom right of each question.",
          position: 'bottom'
        });
      }
      
      if (document.querySelector('.SortableQuestionItem button[color="error"]')) {
        steps.splice(8, 0, {
          element: '.SortableQuestionItem button[color="error"]',
          intro: "Delete a question by clicking this button. Associated media will also be deleted.",
          position: 'bottom'
        });
      }
      
      // Conversion explicite pour contourner l'erreur de type
      return steps as any;
    };
    
    // Personnaliser les boutons de navigation
    intro.setOptions({
      prevLabel: 'Previous',
      nextLabel: 'Next',
      skipLabel: '×',
      doneLabel: 'Done'
    });
    
    // Configuration du tutoriel
    intro.setOptions({
      showBullets: true,
      showProgress: true,
      tooltipPosition: 'auto',
      scrollToElement: true,
      scrollPadding: 100,
      exitOnEsc: false,
      exitOnOverlayClick: false,
      showButtons: true,
      showStepNumbers: true,
      prevLabel: 'Previous',
      nextLabel: 'Next',
      skipLabel: '×',
      doneLabel: 'Done',
      steps: buildSteps()
    });
    
    // Nettoyer à la sortie
    intro.onexit(function() {
      if (document.head.contains(styleEl)) {
        document.head.removeChild(styleEl);
      }
      
      // S'assurer que la prévisualisation est fermée si le tutoriel est quitté
      setShowPreview(false);
    });
    
    // Forcer l'affichage des tooltips après chaque changement
    intro.onafterchange(function(targetElement) {
      forceTooltipDisplay();
      
      // Personnaliser dynamiquement les boutons
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
    
    // Forcer l'affichage initial
    forceTooltipDisplay();
  };

  return (
    <Box
      component="main"
      data-testid="survey-creation-page"
      sx={{
        minHeight: '100vh',
        backgroundColor: colors.background.default,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: { xs: 2, sm: 4 },
      }}
    >
      <style jsx global>{`
        .customTooltip {
          max-width: 400px !important;
          min-width: 250px !important;
          z-index: 10000 !important;
        }
        .customHighlight {
          z-index: 9999 !important;
          position: relative !important;
        }
        .introjs-tooltip {
          opacity: 1 !important;
          visibility: visible !important;
        }
        .introjs-helperLayer {
          background-color: rgba(255, 255, 255, 0.5) !important;
        }
        .introjs-tooltip-title {
          font-weight: bold;
          font-size: 16px;
        }
        .introjs-button {
          text-shadow: none !important;
          padding: 6px 15px !important;
          font-size: 14px !important;
          border-radius: 4px !important;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          border: none !important;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
          margin: 5px !important;
        }
        .introjs-prevbutton, .introjs-nextbutton {
          transition: all 0.2s !important;
        }
        .introjs-prevbutton:hover, .introjs-nextbutton:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
        }
      `}</style>

      <Paper
        component="article"
        data-testid="survey-creation-container"
        elevation={3}
        sx={{
          borderRadius: 3,
          overflow: 'visible', // Changer de 'hidden' à 'visible' pour permettre aux tooltips de déborder
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '1000px',
          mb: 4,
          position: 'relative', // Ajouter une position relative pour le contexte de z-index
        }}
      >
        {/* Header avec gradient */}
        <Box
          component="header"
          data-testid="survey-creation-header"
          data-intro="title"
          sx={{ 
            p: 3,
            bgcolor: 'primary.main', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white',
            textAlign: 'center'
          }}
        >
          <Typography 
            variant="h6" 
            sx={{ fontWeight: 'bold' }}
          >
            Standard Survey Creation
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
            Create linear surveys with customized questions 
          </Typography>
        </Box>

        {/* Contenu du formulaire */}
        <Box 
          component="section"
          data-testid="survey-creation-content"
          sx={{ p: 4, backgroundColor: 'white' }}
        >
          <form 
            onSubmit={handleSubmit(onSubmit)}
            data-testid="survey-creation-form"
          >
            {/* Section des informations de base */}
            <Box 
              component="section"
              data-testid="survey-basic-info"
              sx={{ mb: 4 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ color: '#1a237e' }}>
                    Basic Information
                  </Typography>
                  <Tooltip 
                    title="This section contains the general information of your survey"
                    placement="right"
                    TransitionComponent={Zoom}
                    arrow
                  >
                    <InfoIcon sx={{ ml: 1, color: '#667eea', fontSize: 20, cursor: 'help' }} />
                  </Tooltip>
                </Box>
              </Box>

              <Controller
                name="title"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Survey Title"
                    fullWidth
                    sx={{ mb: 3 }}
                    variant="outlined"
                    error={isSubmitted && validationErrors.title}
                    helperText={isSubmitted && validationErrors.title ? "Title is required" : ""}
                    onChange={(e) => {
                      field.onChange(e);
                      if (e.target.value.trim()) {
                        setValidationErrors(prev => ({
                          ...prev,
                          title: false
                        }));
                      }
                    }}
                    data-intro="basic-info"
                    InputProps={{
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: isSubmitted && validationErrors.title ? '#ef4444' : 'rgba(0, 0, 0, 0.23)',
                          },
                          '&:hover fieldset': {
                            borderColor: isSubmitted && validationErrors.title ? '#ef4444' : '#667eea',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: isSubmitted && validationErrors.title ? '#ef4444' : '#667eea',
                          },
                        },
                      },
                    }}
                  />
                )}
              />

              <Controller
                name="description"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Survey Description"
                    fullWidth
                    multiline
                    rows={3}
                    sx={{ mb: 3 }}
                    variant="outlined"
                  />
                )}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }} data-intro="demographic">
                <FormControlLabel
                  control={
                    <Switch
                      checked={watch('demographicEnabled')}
                      onChange={(e) => {
                        setValue('demographicEnabled', e.target.checked);
                      }}
                      color="primary"
                    />
                  }
                  label="Enable Demographic Questions"
                />
                <Tooltip 
                  title="Enable this option to collect demographic information (age, gender, education, city)"
                  placement="right"
                  TransitionComponent={Zoom}
                  arrow
                >
                  <HelpOutlineIcon sx={{ ml: 1, color: '#667eea', fontSize: 20, cursor: 'help' }} />
                </Tooltip>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }} data-intro="privacy">
                <FormControlLabel
                  control={
                    <Switch
                      checked={watch('isPrivate')}
                      onChange={(e) => {
                        setValue('isPrivate', e.target.checked);
                      }}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {watch('isPrivate') ? (
                        <LockIcon sx={{ color: '#667eea' }} />
                      ) : (
                        <PublicIcon sx={{ color: '#667eea' }} />
                      )}
                      <Typography>
                        {watch('isPrivate') ? 'Private Survey' : 'Public Survey'}
                      </Typography>
                    </Box>
                  }
                />
                <Tooltip 
                  title="Private surveys are only visible to you, while public surveys can be accessed by all users"
                  placement="right"
                  TransitionComponent={Zoom}
                  arrow
                >
                  <HelpOutlineIcon sx={{ color: '#667eea', fontSize: 20, cursor: 'help' }} />
                </Tooltip>
              </Box>

              <Divider sx={{ my: 4 }} />

              {/* Section des questions */}
              <Box 
                component="section"
                data-testid="survey-questions-section"
                sx={{ mb: 4 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ color: '#1a237e' }}>
                    Survey Questions
                  </Typography>
                  <Tooltip 
                    title="Add as many questions as needed. Each question can have a different type and include media"
                    placement="right"
                    TransitionComponent={Zoom}
                    arrow
                  >
                    <InfoIcon sx={{ ml: 1, color: '#667eea', fontSize: 20, cursor: 'help' }} />
                  </Tooltip>
                </Box>

                {/* Liste des questions */}
                <Box sx={{ mb: 4 }}>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={fields.map(field => field.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {fields.map((field, index) => (
                        <SortableQuestionItem key={field.id} id={field.id}>
                          <Paper
                            component="article"
                            data-testid={`question-card-${index}`}
                            elevation={1}
                            sx={{ 
                              p: 3, 
                              borderRadius: 2,
                              position: 'relative',
                              pb: 5, // Espace supplémentaire pour la poignée de glissement
                            }}
                          >
                            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                              <Controller
                                name={`questions.${index}.type`}
                                control={control}
                                render={({ field: typeField }) => (
                                  <TextField
                                    select
                                    label="Question Type"
                                    {...typeField}
                                    onChange={(e) => handleQuestionTypeChange(index, e.target.value)}
                                    sx={{ minWidth: { xs: '100%', sm: 200 } }}
                                    data-intro={index === 0 ? "question-type" : null}
                                  >
                                    {questionTypes.map((type) => (
                                      <MenuItem key={type.value} value={type.value}>
                                        {type.label}
                                      </MenuItem>
                                    ))}
                                  </TextField>
                                )}
                              />

                              <Controller
                                name={`questions.${index}.text`}
                                control={control}
                                render={({ field: textField }) => (
                                  <TextField
                                    {...textField}
                                    label="Question Text"
                                    fullWidth
                                    variant="outlined"
                                    error={getQuestionError(index)}
                                    helperText={getQuestionError(index) ? "Question text is required" : ""}
                                    onChange={(e) => {
                                      textField.onChange(e);
                                      const newValue = e.target.value.trim();
                                      const currentQuestion = validationErrors.questions[index];
                                      
                                      setValidationErrors(prev => ({
                                        ...prev,
                                        questions: {
                                          ...prev.questions,
                                          [index]: {
                                            ...(typeof prev.questions[index] === 'object' ? prev.questions[index] as object : {}),
                                            text: !newValue
                                          }
                                        }
                                      }));
                                    }}
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        '& fieldset': {
                                          borderColor: getQuestionError(index) ? '#ef4444' : 'rgba(0, 0, 0, 0.23)',
                                        },
                                        '&:hover fieldset': {
                                          borderColor: getQuestionError(index) ? '#ef4444' : '#667eea',
                                        },
                                        '&.Mui-focused fieldset': {
                                          borderColor: getQuestionError(index) ? '#ef4444' : '#667eea',
                                        },
                                      },
                                    }}
                                  />
                                )}
                              />
                            </Box>

                            {/* Options pour les questions à choix multiples */}
                            {(field.type === 'multiple-choice' || field.type === 'dropdown') && (
                              <Box sx={{ ml: 2, mb: 2 }}>
                                {field.options?.map((option, optionIndex) => (
                                  <Box key={optionIndex} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                    <Controller
                                      name={`questions.${index}.options.${optionIndex}`}
                                      control={control}
                                      defaultValue={option}
                                      render={({ field: optionField }) => (
                                        <TextField
                                          {...optionField}
                                          label={`Option ${optionIndex + 1}`}
                                          fullWidth
                                          variant="outlined"
                                          size="small"
                                          error={getOptionError(index, optionIndex)}
                                          helperText={getOptionError(index, optionIndex) ? "Option cannot be empty" : ""}
                                          onChange={(e) => {
                                            optionField.onChange(e);
                                            const newValue = e.target.value.trim();
                                            
                                            setValidationErrors(prev => ({
                                              ...prev,
                                              questions: {
                                                ...prev.questions,
                                                [index]: {
                                                  ...(typeof prev.questions[index] === 'object' ? prev.questions[index] as object : {}),
                                                  options: {
                                                    ...(typeof prev.questions[index] === 'object' && (prev.questions[index] as any).options || {}),
                                                    [optionIndex]: !newValue
                                                  }
                                                }
                                              }
                                            }));
                                          }}
                                          sx={{
                                            '& .MuiOutlinedInput-root': {
                                              '& fieldset': {
                                                borderColor: getOptionError(index, optionIndex) ? '#ef4444' : 'rgba(0, 0, 0, 0.23)',
                                              },
                                              '&:hover fieldset': {
                                                borderColor: getOptionError(index, optionIndex) ? '#ef4444' : '#667eea',
                                              },
                                              '&.Mui-focused fieldset': {
                                                borderColor: getOptionError(index, optionIndex) ? '#ef4444' : '#667eea',
                                              },
                                            },
                                          }}
                                        />
                                      )}
                                    />
                                    <IconButton
                                      onClick={() => {
                                        const values = getValues();
                                        const currentQuestionValues = values.questions[index];
                                        const newOptions = [...(currentQuestionValues.options ?? [])];
                                        newOptions.splice(optionIndex, 1);
                                        
                                        // Préserver l'état de validation actuel
                                        const currentValidationState = validationErrors.questions[index];
                                        const currentOptions = typeof currentValidationState === 'object' && 
                                          currentValidationState.options ? { ...currentValidationState.options } : {};
                                        
                                        // Supprimer l'erreur de l'option supprimée et réindexer
                                        const newValidationOptions: { [key: number]: boolean } = {};
                                        Object.entries(currentOptions).forEach(([key, value]) => {
                                          const keyNum = parseInt(key);
                                          if (keyNum < optionIndex) {
                                            newValidationOptions[keyNum] = value;
                                          } else if (keyNum > optionIndex) {
                                            newValidationOptions[keyNum - 1] = value;
                                          }
                                        });

                                        // Mettre à jour l'état de validation
                                        setValidationErrors(prev => ({
                                          ...prev,
                                          questions: {
                                            ...prev.questions,
                                            [index]: {
                                              ...(typeof prev.questions[index] === 'object' ? prev.questions[index] as object : {}),
                                              options: Object.keys(newValidationOptions).length > 0 ? newValidationOptions : undefined
                                            }
                                          }
                                        }));

                                        // Mettre à jour la question en préservant toutes les valeurs
                                        update(index, {
                                          ...currentQuestionValues, // Utiliser les valeurs actuelles du formulaire
                                          options: newOptions,
                                        });
                                      }}
                                      color="error"
                                      size="small"
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </Box>
                                ))}
                                <Button
                                  onClick={() => handleAddOption(index)}
                                  startIcon={<AddIcon />}
                                  size="small"
                                  sx={{ mt: 1 }}
                                >
                                  Add Option
                                </Button>
                              </Box>
                            )}

                            {/* Media Upload Section */}
                            {field.type !== 'color-picker' && (
                              <Box sx={{ mt: 2 }} data-intro={index === 0 ? "media-upload" : null}>
                                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' } }}>
                                  <Button
                                    component="label"
                                    variant="outlined"
                                    disabled={isUploading[field.id]}
                                    startIcon={isUploading[field.id] ? (
                                      <CircularProgress size={20} sx={{ color: '#667eea' }} />
                                    ) : (
                                      <PhotoCameraIcon />
                                    )}
                                    sx={{
                                      color: '#667eea',
                                      borderColor: '#667eea',
                                      '&:hover': {
                                        borderColor: '#764ba2',
                                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                      },
                                      minWidth: { xs: '100%', sm: '150px' },
                                    }}
                                  >
                                    {isUploading[field.id] ? 'Uploading...' : 'Upload Media'}
                                    <input
                                      type="file"
                                      hidden
                                      accept="image/*,video/*"
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                          const file = e.target.files[0];
                                          handleFileUpload(file, field.id);
                                        }
                                      }}
                                    />
                                  </Button>
                                  <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                                    or
                                  </Typography>
                                  <TextField
                                    value={field.media ? '' : field.mediaUrl || ''}
                                    onChange={(e) => {
                                      const url = e.target.value;
                                      if (url === '' || isValidMediaURL(url)) {
                                        handleMediaChange(index, url, field);
                                      }
                                    }}
                                    placeholder="Enter media URL"
                                    size="small"
                                    fullWidth
                                    sx={{
                                      maxWidth: { xs: '100%', sm: '400px' },
                                      '& .MuiOutlinedInput-root': {
                                        '&:hover fieldset': {
                                          borderColor: '#667eea',
                                        },
                                        '&.Mui-focused fieldset': {
                                          borderColor: '#667eea',
                                        },
                                      },
                                    }}
                                  />
                                </Box>
                                {(field.media || field.mediaUrl) && (
                                  <Box sx={{ mt: 2, maxWidth: '200px' }}>
                                    {isUploading[field.id] || loadingMedia[field.id] ? (
                                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
                                        <CircularProgress size={40} sx={{ color: '#667eea' }} />
                                      </Box>
                                    ) : isImageFile(field.media || '') ? (
                                      <img 
                                        src={field.media || ''}
                                        alt="Question media"
                                        style={{ 
                                          width: '100%', 
                                          height: 'auto',
                                          borderRadius: '8px',
                                          objectFit: 'contain'
                                        }}
                                        onLoadStart={() => setLoadingMedia(prev => ({ ...prev, [field.id]: true }))}
                                        onLoad={() => setLoadingMedia(prev => ({ ...prev, [field.id]: false }))}
                                        onError={() => {
                                          setLoadingMedia(prev => ({ ...prev, [field.id]: false }));
                                          setNotification({
                                            message: 'Error loading image. Please check the URL.',
                                            severity: 'error',
                                            open: true
                                          });
                                        }}
                                      />
                                    ) : (
                                      <ReactPlayer
                                        url={field.media}
                                        controls
                                        width="100%"
                                        height="auto"
                                        style={{ borderRadius: '8px' }}
                                        onBuffer={() => setLoadingMedia(prev => ({ ...prev, [field.id]: true }))}
                                        onBufferEnd={() => setLoadingMedia(prev => ({ ...prev, [field.id]: false }))}
                                        onError={(e) => {
                                          setLoadingMedia(prev => ({ ...prev, [field.id]: false }));
                                          console.error('Error loading media:', e);
                                          setNotification({
                                            message: 'Error loading media. Please check the URL.',
                                            severity: 'error',
                                            open: true
                                          });
                                        }}
                                      />
                                    )}
                                  </Box>
                                )}
                              </Box>
                            )}

                            {/* Actions en bas de la question */}
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                              {/* Delete Question Button */}
                              <Button
                                onClick={() => handleDeleteQuestion(index)}
                                startIcon={<DeleteIcon />}
                                color="error"
                                variant="outlined"
                                size="small"
                              >
                                Delete Question
                              </Button>
                            </Box>
                          </Paper>
                        </SortableQuestionItem>
                      ))}
                    </SortableContext>
                  </DndContext>

                  {/* Bouton Add Question */}
                  <Button
                    onClick={handleAddQuestion}
                    variant="outlined"
                    startIcon={<AddIcon />}
                    data-intro="add-question"
                    sx={{
                      mb: 4,
                      color: '#667eea',
                      borderColor: '#667eea',
                      '&:hover': {
                        borderColor: '#764ba2',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                      },
                    }}
                  >
                    Add Question
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ my: 4 }} />

              {/* Actions finales */}
              <Box
                component="footer"
                data-testid="survey-creation-actions"
                sx={{
                  display: 'flex',
                  gap: 2,
                  justifyContent: 'flex-end',
                }}
              >
                <Button
                  onClick={() => handleResetSurvey(null)}
                  variant="contained"
                  startIcon={<DeleteIcon />}
                  data-intro="reset"
                  sx={{
                    background: colors.action.error.gradient,
                    color: 'white',
                    boxShadow: 'none',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                      boxShadow: 'none',
                    },
                  }}
                >
                  Reset
                </Button>

                <Button
                  onClick={() => setShowPreview(true)}
                  variant="contained"
                  startIcon={<VisibilityIcon />}
                  data-intro="preview"
                  sx={{
                    background: colors.action.info.gradient,
                    color: 'white',
                    boxShadow: 'none',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                      boxShadow: 'none',
                    },
                  }}
                >
                  Preview
                </Button>

                <Button
                  onClick={handleSubmit(onSubmit)}
                  variant="contained"
                  disabled={isSubmitting}
                  data-intro="submit"
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <SendIcon />
                    )
                  }
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    },
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </Box>
            </Box>
          </form>
        </Box>
      </Paper>

      {/* Preview Dialog */}
      <Dialog
        data-testid="survey-preview-dialog"
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '1.5rem',
            color: '#444',
          }}
        >
          Survey Preview
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: '#f7f9fc', padding: '24px' }}>
          <Typography
            variant="h5"
            sx={{ mb: 2, textAlign: 'center', color: '#555' }}
          >
            {watch('title') || 'Untitled Survey'}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              mb: 4,
              textAlign: 'center',
              fontStyle: 'italic',
              color: '#777',
              borderBottom: '1px solid #ddd',
              paddingBottom: '12px',
            }}
          >
            {watch('description') || 'No description provided.'}
          </Typography>
          {renderPreviewQuestion()}
        </DialogContent>
        <DialogActions
          sx={{ justifyContent: 'space-between', padding: '16px 24px' }}
        >
          <Button
            onClick={() =>
              setCurrentPreviewIndex((prev) => Math.max(prev - 1, 0))
            }
            disabled={currentPreviewIndex === 0}
            variant="outlined"
            color="primary"
          >
            Previous
          </Button>
          <Button
            onClick={() =>
              setCurrentPreviewIndex((prev) =>
                Math.min(
                  prev + 1,
                  watchedQuestions.length + (demographicEnabled ? 1 : 0) - 1
                )
              )
            }
            disabled={
              currentPreviewIndex ===
              watchedQuestions.length + (demographicEnabled ? 1 : 0) - 1
            }
            variant="outlined"
            color="primary"
          >
            Next
          </Button>
          <Button
            onClick={() => setShowPreview(false)}
            variant="contained"
            color="secondary"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      {notification.open && (
        <Dialog
          open={notification.open}
          onClose={() => {
            setNotification(prev => ({ ...prev, open: false }));
            // Démarrer l'animation et la redirection après la fermeture de la boîte de dialogue
            setShowSuccess(true);
            setTimeout(() => {
              router.push('/survey-answer');
            }, 2000);
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            }
          }}
        >
          <DialogContent sx={{ mt: 2 }}>
            {notification.link ? (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Here is the link to answer your private survey:
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <TextField
                    fullWidth
                    value={notification.link}
                    variant="outlined"
                    size="small"
                    InputProps={{
                      readOnly: true,
                      sx: { backgroundColor: 'white' }
                    }}
                  />
                  <Tooltip title="Copy link">
                    <IconButton
                      onClick={notification.action}
                      sx={{
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        }
                      }}
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                </Paper>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Share this link only with people you want to invite to answer your survey.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  This link will also be displayed in your analytics dashboard.
                </Typography>
              </Box>
            ) : (
              <Alert 
                severity={notification.severity}
              >
                {notification.message}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'center' }}>
            <Button 
              onClick={() => {
                // Si c'est un message d'erreur, fermer simplement la notification
                if (notification.severity === 'error') {
                  setNotification(prev => ({ ...prev, open: false }));
                  return;
                }
                
                // Si c'est un succès, procéder à la redirection
                setNotification(prev => ({ ...prev, open: false }));
                setShowSuccess(true);
                setTimeout(() => {
                  router.push('/survey-answer');
                }, 2000);
              }}
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
                minWidth: '120px'
              }}
            >
              OK
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {showSuccess && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            zIndex: 9999
          }}
        >
          <Lottie
            animationData={validationAnimation}
            loop={false}
            style={{ width: 400, height: 400 }}
          />
        </Box>
      )}

      {/* Dialog de confirmation pour le reset */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" sx={{ 
          bgcolor: 'primary.main', 
          color: 'white',
          py: 2
        }}>
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography>
            {confirmDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
            color="primary"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDialog.onConfirm}
            color="error"
            variant="contained"
            autoFocus
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ 
        position: 'fixed', 
        bottom: 20, 
        right: 20, 
        backgroundColor: colors.primary.main,
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        zIndex: 9999
      }}>
        <Typography variant="body2">
          Questions: {fields.length}
        </Typography>
      </Box>
      
      {/* Floating Tutorial Button */}
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
          }}
        >
          <SchoolIcon />
        </Fab>
      </Tooltip>
    </Box>
  );
};

export default SurveyCreationPage;