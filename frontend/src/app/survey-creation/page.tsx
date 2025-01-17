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
  Chip,
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

type Question = {
  id: string;
  type: string;
  text: string;
  options?: string[];
  media?: string;
  mediaUrl?: string;
  selectedDate?: Date | null;
  isCritical?: boolean;
  nextQuestions?: {
    [key: string]: string[];
  };
};

type FormData = {
  title: string;
  description: string;
  demographicEnabled: boolean;
  questions: Question[];
};

const isValidMediaURL = (url: string): boolean => {
  try {
    new URL(url);
    return true; // Accepte toutes les URLs valides
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

const SurveyCreationPage = () => {
  const { control, handleSubmit, setValue, getValues, reset, watch } =
    useForm<FormData>({
      defaultValues: {
        title: '',
        description: '',
        demographicEnabled: false,
        questions: [],
      },
    });

  const { fields, append, remove, update } = useFieldArray({
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

  const [isUploading, setIsUploading] = useState<{ [key: string]: boolean }>(
    {}
  );

  const [notification, setNotification] = useState<{
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
    open: boolean;
  }>({
    message: '',
    severity: 'info',
    open: false,
  });

  const [validationErrors, setValidationErrors] = useState<{
    title?: boolean;
    description?: boolean;
    questions: {
      [key: string]:
        | boolean
        | {
            text?: boolean;
            options?: { [key: number]: boolean };
          };
    };
  }>({
    questions: {},
  });

  // Ajout d'un état pour suivre si le formulaire a été soumis
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Mettre à jour les erreurs en temps réel pour le titre
  useEffect(() => {
    setValidationErrors((prev) => ({
      ...prev,
      title: !watchedTitle?.trim(),
    }));
  }, [watchedTitle]);

  // Mettre à jour les erreurs en temps réel pour les questions
  useEffect(() => {
    setValidationErrors((prev) => {
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
      isCritical: false,
      nextQuestions: {},
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
          [question.media]: 'to_delete',
        };

        setMediaTracker(newTracker);

        await new Promise((resolve) => setTimeout(resolve, 100));

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

        const response = await fetch(
          'http://localhost:5041/api/surveys/delete-media',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ publicId }),
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            // Si le token est invalide, on peut rediriger vers la page de connexion
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
            throw new Error('Session expired. Please login again.');
          }
          const errorData = await response.json();
          throw new Error(
            errorData.message || `Failed to delete media: ${publicId}`
          );
        }

        // Réinitialiser le tracker pour ce média
        setMediaTracker((prev) => {
          const newState = { ...prev };
          delete newState[question.media as string];
          return newState;
        });

        setNotification({
          message: 'Media deleted successfully',
          severity: 'success',
          open: true,
        });
      } catch (error) {
        console.error('Error deleting media:', error);
        setNotification({
          message:
            error instanceof Error
              ? error.message
              : 'Error deleting media file',
          severity: 'error',
          open: true,
        });
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
      options:
        newType === 'multiple-choice' || newType === 'dropdown' ? [''] : [],
      media: fields[index].media || '',
      selectedDate: fields[index].selectedDate || null,
    });
  };

  const handleResetSurvey = async (
    event: React.MouseEvent<HTMLButtonElement> | null
  ) => {
    if (event) {
      event.preventDefault();
    }

    // Récupérer tous les médias des questions
    const currentMedia = fields
      .map((field) => field.media)
      .filter((media) => media && media.trim() !== '');

    if (currentMedia.length > 0) {
      console.log('Current media to mark for deletion:', currentMedia);

      // Marquer tous les médias pour suppression et attendre la mise à jour du state
      const newTracker = {
        ...mediaTracker,
        ...Object.fromEntries(
          currentMedia.map((media) => [media, 'to_delete'])
        ),
      };

      // Mettre à jour le state et attendre que ce soit fait
      setMediaTracker(newTracker);

      // Attendre que le state soit mis à jour
      await new Promise((resolve) => setTimeout(resolve, 100));

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

          const response = await fetch(
            'http://localhost:5041/api/surveys/delete-media',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({ publicId }),
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to delete media: ${publicId}`);
          }
        }
      } catch (error) {
        console.error('Error deleting media:', error);
        setNotification({
          message: 'Error deleting media files',
          severity: 'error',
          open: true,
        });
      }
    }

    // Réinitialiser le formulaire
    reset({
      title: '',
      description: '',
      demographicEnabled: false,
      questions: [],
    });

    // Réinitialiser le tracker de médias
    setMediaTracker({});
  };

  const handleFileUpload = async (
    file: File,
    questionId: string
  ): Promise<void> => {
    try {
      setIsUploading((prev) => ({ ...prev, [questionId]: true }));

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Correction du chemin de l'API
      const mediaUrl = await uploadMedia(file);

      // Mise à jour du tracker de médias
      setMediaTracker((prev) => ({
        ...prev,
        [mediaUrl]: 'active',
      }));

      // Mise à jour de la question avec la nouvelle URL
      fields.forEach((field, index) => {
        if (field.id === questionId) {
          update(index, {
            ...field,
            media: mediaUrl,
            mediaUrl: mediaUrl, // Synchroniser les deux champs
          });
        }
      });

      setNotification({
        message: 'Media uploaded successfully',
        severity: 'success',
        open: true,
      });
    } catch (error) {
      console.error('Error uploading media:', error);
      setNotification({
        message: 'Error uploading media',
        severity: 'error',
        open: true,
      });
    } finally {
      setIsUploading((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const [localQuestions, setLocalQuestions] = useState<Question[]>([]);

  useEffect(() => {
    setLocalQuestions(getValues('questions'));
  }, [watch('questions')]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mediaTracker, setMediaTracker] = useState<{ [key: string]: string }>(
    {}
  );

  // Fonction pour gérer le changement de média
  const handleMediaChange = async (
    index: number,
    newMediaUrl: string,
    field: any
  ) => {
    // Marquer l'ancien média pour suppression si nécessaire
    if (field.media && field.media !== newMediaUrl) {
      setMediaTracker((prev) => ({
        ...prev,
        [field.media]: 'to_delete',
        [newMediaUrl]: 'active', // Marquer le nouveau média comme actif
      }));
    }

    // Mise à jour de la question
    update(index, {
      ...field,
      mediaUrl: newMediaUrl,
      media: newMediaUrl, // Synchroniser les deux champs
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
            const response = await fetch(
              'http://localhost:5041/api/surveys/delete-media',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                  Accept: 'application/json',
                },
                credentials: 'include', // Ajouter cette ligne pour les cookies
                body: JSON.stringify({ publicId }),
              }
            );

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`Server error: ${errorData.message}`);
            }

            const result = await response.json();
            console.log('Delete success:', result);
          } catch (error) {
            console.error(`Failed to delete media ${publicId}:`, error);
            setNotification({
              message: `Failed to delete media: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
              severity: 'error',
              open: true,
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
        open: true,
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitted(true);
    setIsSubmitting(true);
    try {
      const errors: {
        title?: boolean;
        description?: boolean;
        questions: {
          [key: string]:
            | boolean
            | {
                text?: boolean;
                options?: { [key: number]: boolean };
              };
        };
      } = {
        questions: {},
      };
      let hasErrors = false;

      // Vérifier le titre
      if (!data.title?.trim()) {
        errors.title = true;
        hasErrors = true;
      }

      // Vérification qu'il y a au moins une question
      if (data.questions.length === 0) {
        setNotification({
          message: 'Please add at least one question to your survey',
          severity: 'error',
          open: true,
        });
        return;
      }

      // Vérification des questions et de leurs options
      data.questions.forEach((question, index) => {
        const questionErrors: {
          text?: boolean;
          options?: { [key: number]: boolean };
        } = {};

        // Vérifier le texte de la question
        if (!question.text?.trim()) {
          questionErrors.text = true;
          hasErrors = true;
        }

        // Vérifier les options pour les questions à choix multiples et dropdown
        if (
          (question.type === 'multiple-choice' ||
            question.type === 'dropdown') &&
          question.options
        ) {
          const optionErrors: { [key: number]: boolean } = {};

          question.options.forEach((option, optionIndex) => {
            if (!option.trim()) {
              optionErrors[optionIndex] = true;
              hasErrors = true;
            }
          });

          if (Object.keys(optionErrors).length > 0) {
            questionErrors.options = optionErrors;
          }
        }

        if (Object.keys(questionErrors).length > 0) {
          errors.questions[index] = questionErrors;
        }
      });

      if (hasErrors) {
        setValidationErrors(errors);
        setNotification({
          message: 'Please fill in all required fields and options',
          severity: 'error',
          open: true,
        });
        return;
      }

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const surveyData = {
        title: data.title,
        description: data.description,
        demographicEnabled: data.demographicEnabled,
        questions: data.questions,
      };

      const result = await createSurvey(surveyData, token);
      console.log('Survey created successfully:', result);

      setNotification({
        message: 'Survey created successfully!',
        severity: 'success',
        open: true,
      });

      setTimeout(() => {
        handleResetSurvey(null);
      }, 2000);

      await cleanupUnusedMedia();
    } catch (error: any) {
      console.error('Error submitting survey:', error);
      setNotification({
        message: error.message || 'Error creating survey',
        severity: 'error',
        open: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (notification.open) {
      const timer = setTimeout(() => {
        setNotification((prev) => ({ ...prev, open: false }));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification.open]);

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
    const question =
      adjustedIndex >= 0 ? watchedQuestions[adjustedIndex] : null;

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
                  objectFit: 'contain',
                }}
                onError={() => {
                  setNotification({
                    message:
                      'Error loading image in preview. Please check the URL.',
                    severity: 'error',
                    open: true,
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
                    message:
                      'Error loading media in preview. Please check the URL.',
                    severity: 'error',
                    open: true,
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
        return Object.values(error.options).some((optionError) => optionError);
      }
    }

    return Boolean(error);
  };

  // Fonction utilitaire pour vérifier les erreurs d'options
  const hasOptionsErrors = (questionIndex: number) => {
    const error = validationErrors.questions[questionIndex];
    if (typeof error === 'object' && error.options) {
      return Object.values(error.options).some((optionError) => optionError);
    }
    return false;
  };

  // Ajoutez cette fonction utilitaire pour détecter le type de média
  const isImageFile = (url: string): boolean => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  // Ajoutez cet état pour gérer le chargement des médias
  const [loadingMedia, setLoadingMedia] = useState<{ [key: string]: boolean }>(
    {}
  );

  // Nouvelle fonction pour gérer les questions critiques
  const handleCriticalQuestion = (index: number, isCritical: boolean) => {
    const currentQuestion = fields[index];
    const values = getValues();
    const currentQuestionValues = values.questions[index];

    // Initialiser nextQuestions avec un objet vide pour chaque option
    let initialNextQuestions = {};
    if (isCritical) {
      if (currentQuestionValues.type === 'yes-no') {
        initialNextQuestions = { 'Yes': [], 'No': [] };
      } else if (currentQuestionValues.options) {
        initialNextQuestions = currentQuestionValues.options.reduce((acc, option) => ({
          ...acc,
          [option]: []
        }), {});
      }
    }

    update(index, {
      ...currentQuestionValues,
      isCritical,
      nextQuestions: isCritical ? initialNextQuestions : undefined,
    });
  };

  // Nouvelle fonction pour gérer les chemins de questions
  const handleQuestionPath = (questionIndex: number, option: string, selectedQuestions: string[]) => {
    const values = getValues();
    const currentQuestionValues = values.questions[questionIndex];

    const updatedNextQuestions = {
      ...currentQuestionValues.nextQuestions,
      [option]: selectedQuestions
    };

    update(questionIndex, {
      ...currentQuestionValues,
      nextQuestions: updatedNextQuestions
    });
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
      <Paper
        component="article"
        data-testid="survey-creation-container"
        elevation={3}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '1000px',
          mb: 4,
        }}
      >
        {/* Header avec gradient */}
        <Box
          component="header"
          data-testid="survey-creation-header"
          sx={{
            background: colors.primary.gradient,
            py: 4,
            px: 4,
            color: 'white',
            textAlign: 'center',
          }}
        >
          <Typography
            component="h1"
            data-testid="survey-creation-title"
            variant="h4"
            fontWeight="bold"
          >
            Create New Survey
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
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ color: '#1a237e' }}>
                  Basic Information
                </Typography>
                <Tooltip
                  title="Cette section contient les informations générales de votre sondage"
                  placement="right"
                  TransitionComponent={Zoom}
                  arrow
                >
                  <InfoIcon
                    sx={{
                      ml: 1,
                      color: '#667eea',
                      fontSize: 20,
                      cursor: 'help',
                    }}
                  />
                </Tooltip>
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
                    helperText={
                      isSubmitted && validationErrors.title
                        ? 'Title is required'
                        : ''
                    }
                    onChange={(e) => {
                      field.onChange(e);
                      if (e.target.value.trim()) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          title: false,
                        }));
                      }
                    }}
                    InputProps={{
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor:
                              isSubmitted && validationErrors.title
                                ? '#ef4444'
                                : 'rgba(0, 0, 0, 0.23)',
                          },
                          '&:hover fieldset': {
                            borderColor:
                              isSubmitted && validationErrors.title
                                ? '#ef4444'
                                : '#667eea',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor:
                              isSubmitted && validationErrors.title
                                ? '#ef4444'
                                : '#667eea',
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

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
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
                  title="Activez cette option pour collecter des informations démographiques (âge, genre, éducation, ville)"
                  placement="right"
                  TransitionComponent={Zoom}
                  arrow
                >
                  <HelpOutlineIcon
                    sx={{
                      ml: 1,
                      color: '#667eea',
                      fontSize: 20,
                      cursor: 'help',
                    }}
                  />
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
                    title="Ajoutez autant de questions que nécessaire. Chaque question peut avoir un type différent et inclure des médias"
                    placement="right"
                    TransitionComponent={Zoom}
                    arrow
                  >
                    <InfoIcon
                      sx={{
                        ml: 1,
                        color: '#667eea',
                        fontSize: 20,
                        cursor: 'help',
                      }}
                    />
                  </Tooltip>
                </Box>

                {/* Liste des questions */}
                {fields.map((field, index) => (
                  <Paper
                    key={field.id}
                    component="article"
                    data-testid={`question-card-${index}`}
                    elevation={1}
                    sx={{ p: 3, mb: 3, borderRadius: 2 }}
                  >
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                      <Controller
                        name={`questions.${index}.type`}
                        control={control}
                        render={({ field: typeField }) => (
                          <TextField
                            select
                            label="Question Type"
                            {...typeField}
                            onChange={(e) =>
                              handleQuestionTypeChange(index, e.target.value)
                            }
                            sx={{ minWidth: 200 }}
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
                            helperText={
                              getQuestionError(index)
                                ? 'Question text is required'
                                : ''
                            }
                            onChange={(e) => {
                              textField.onChange(e);
                              const newValue = e.target.value.trim();
                              const currentQuestion =
                                validationErrors.questions[index];

                              setValidationErrors((prev) => ({
                                ...prev,
                                questions: {
                                  ...prev.questions,
                                  [index]: {
                                    ...(typeof prev.questions[index] ===
                                    'object'
                                      ? (prev.questions[index] as object)
                                      : {}),
                                    text: !newValue,
                                  },
                                },
                              }));
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                  borderColor: getQuestionError(index)
                                    ? '#ef4444'
                                    : 'rgba(0, 0, 0, 0.23)',
                                },
                                '&:hover fieldset': {
                                  borderColor: getQuestionError(index)
                                    ? '#ef4444'
                                    : '#667eea',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: getQuestionError(index)
                                    ? '#ef4444'
                                    : '#667eea',
                                },
                              },
                            }}
                          />
                        )}
                      />
                    </Box>

                    {/* Options pour les questions à choix multiples */}
                    {(field.type === 'multiple-choice' ||
                      field.type === 'dropdown') && (
                      <Box sx={{ ml: 2, mb: 2 }}>
                        {field.options?.map((option, optionIndex) => (
                          <Box
                            key={optionIndex}
                            sx={{ display: 'flex', gap: 1, mb: 1 }}
                          >
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
                                  helperText={
                                    getOptionError(index, optionIndex)
                                      ? 'Option cannot be empty'
                                      : ''
                                  }
                                  onChange={(e) => {
                                    optionField.onChange(e);
                                    const newValue = e.target.value.trim();

                                    setValidationErrors((prev) => ({
                                      ...prev,
                                      questions: {
                                        ...prev.questions,
                                        [index]: {
                                          ...(typeof prev.questions[index] ===
                                          'object'
                                            ? (prev.questions[index] as object)
                                            : {}),
                                          options: {
                                            ...((typeof prev.questions[
                                              index
                                            ] === 'object' &&
                                              (prev.questions[index] as any)
                                                .options) ||
                                              {}),
                                            [optionIndex]: !newValue,
                                          },
                                        },
                                      },
                                    }));
                                  }}
                                  sx={{
                                    '& .MuiOutlinedInput-root': {
                                      '& fieldset': {
                                        borderColor: getOptionError(
                                          index,
                                          optionIndex
                                        )
                                          ? '#ef4444'
                                          : 'rgba(0, 0, 0, 0.23)',
                                      },
                                      '&:hover fieldset': {
                                        borderColor: getOptionError(
                                          index,
                                          optionIndex
                                        )
                                          ? '#ef4444'
                                          : '#667eea',
                                      },
                                      '&.Mui-focused fieldset': {
                                        borderColor: getOptionError(
                                          index,
                                          optionIndex
                                        )
                                          ? '#ef4444'
                                          : '#667eea',
                                      },
                                    },
                                  }}
                                />
                              )}
                            />
                            <IconButton
                              onClick={() => {
                                const values = getValues();
                                const currentQuestionValues =
                                  values.questions[index];
                                const newOptions = [
                                  ...(currentQuestionValues.options ?? []),
                                ];
                                newOptions.splice(optionIndex, 1);

                                // Préserver l'état de validation actuel
                                const currentValidationState =
                                  validationErrors.questions[index];
                                const currentOptions =
                                  typeof currentValidationState === 'object' &&
                                  currentValidationState.options
                                    ? { ...currentValidationState.options }
                                    : {};

                                // Supprimer l'erreur de l'option supprimée et réindexer
                                const newValidationOptions: {
                                  [key: number]: boolean;
                                } = {};
                                Object.entries(currentOptions).forEach(
                                  ([key, value]) => {
                                    const keyNum = parseInt(key);
                                    if (keyNum < optionIndex) {
                                      newValidationOptions[keyNum] = value;
                                    } else if (keyNum > optionIndex) {
                                      newValidationOptions[keyNum - 1] = value;
                                    }
                                  }
                                );

                                // Mettre à jour l'état de validation
                                setValidationErrors((prev) => ({
                                  ...prev,
                                  questions: {
                                    ...prev.questions,
                                    [index]: {
                                      ...(typeof prev.questions[index] ===
                                      'object'
                                        ? (prev.questions[index] as object)
                                        : {}),
                                      options:
                                        Object.keys(newValidationOptions)
                                          .length > 0
                                          ? newValidationOptions
                                          : undefined,
                                    },
                                  },
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

                    {/* Ajout du switch pour les questions critiques */}
                    <Box
                      sx={{
                        mt: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={field.isCritical || false}
                            onChange={(e) => handleCriticalQuestion(index, e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Critical Question"
                      />
                      <Tooltip 
                        title="Une question critique déterminera quelles questions suivantes seront posées en fonction de la réponse"
                        placement="right"
                      >
                        <InfoIcon sx={{ color: 'primary.main', cursor: 'help' }} />
                      </Tooltip>
                    </Box>

                    {/* Configuration des chemins pour les questions critiques */}
                    {field.isCritical && (field.type === 'multiple-choice' || field.type === 'yes-no' || field.type === 'dropdown') && (
                      <Box sx={{ mt: 2, ml: 4 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Configure question paths for each option:
                        </Typography>
                        {(field.type === 'yes-no' 
                          ? ['Yes', 'No'] 
                          : (field.options || [])
                        ).map((option) => (
                          <Box key={option} sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              If answer is "{option}":
                            </Typography>
                            <Select
                              multiple
                              value={field.nextQuestions?.[option] || []}
                              onChange={(e) => {
                                const value = e.target.value;
                                handleQuestionPath(
                                  index,
                                  option,
                                  typeof value === 'string' ? [value] : value
                                );
                              }}
                              renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {(selected as string[]).map((value) => {
                                    const questionIndex = fields.findIndex(q => q.id === value);
                                    return (
                                      <Chip
                                        key={value}
                                        label={`Q${questionIndex + 1}: ${fields[questionIndex]?.text || 'Untitled'}`}
                                        size="small"
                                      />
                                    );
                                  })}
                                </Box>
                              )}
                              sx={{ width: '100%' }}
                            >
                              {fields.map((q, qIndex) => (
                                qIndex > index && (
                                  <MenuItem key={q.id} value={q.id}>
                                    Question {qIndex + 1}: {q.text || 'Untitled'}
                                  </MenuItem>
                                )
                              ))}
                            </Select>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* Media Upload Section */}
                    {field.type !== 'color-picker' && (
                      <Box sx={{ mt: 2 }}>
                        <Box
                          sx={{ display: 'flex', gap: 2, alignItems: 'center' }}
                        >
                          <Button
                            component="label"
                            variant="outlined"
                            disabled={isUploading[field.id]}
                            startIcon={
                              isUploading[field.id] ? (
                                <CircularProgress
                                  size={20}
                                  sx={{ color: '#667eea' }}
                                />
                              ) : (
                                <PhotoCameraIcon />
                              )
                            }
                            sx={{
                              color: '#667eea',
                              borderColor: '#667eea',
                              '&:hover': {
                                borderColor: '#764ba2',
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                              },
                              minWidth: '150px',
                            }}
                          >
                            {isUploading[field.id]
                              ? 'Uploading...'
                              : 'Upload Media'}
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
                          <Typography variant="body2" color="text.secondary">
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
                              maxWidth: '400px',
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
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  height: '100px',
                                }}
                              >
                                <CircularProgress
                                  size={40}
                                  sx={{ color: '#667eea' }}
                                />
                              </Box>
                            ) : isImageFile(field.media || '') ? (
                              <img
                                src={field.media || ''}
                                alt="Question media"
                                style={{
                                  width: '100%',
                                  height: 'auto',
                                  borderRadius: '8px',
                                  objectFit: 'contain',
                                }}
                                onLoadStart={() =>
                                  setLoadingMedia((prev) => ({
                                    ...prev,
                                    [field.id]: true,
                                  }))
                                }
                                onLoad={() =>
                                  setLoadingMedia((prev) => ({
                                    ...prev,
                                    [field.id]: false,
                                  }))
                                }
                                onError={() => {
                                  setLoadingMedia((prev) => ({
                                    ...prev,
                                    [field.id]: false,
                                  }));
                                  setNotification({
                                    message:
                                      'Error loading image. Please check the URL.',
                                    severity: 'error',
                                    open: true,
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
                                onBuffer={() =>
                                  setLoadingMedia((prev) => ({
                                    ...prev,
                                    [field.id]: true,
                                  }))
                                }
                                onBufferEnd={() =>
                                  setLoadingMedia((prev) => ({
                                    ...prev,
                                    [field.id]: false,
                                  }))
                                }
                                onError={(e) => {
                                  setLoadingMedia((prev) => ({
                                    ...prev,
                                    [field.id]: false,
                                  }));
                                  console.error('Error loading media:', e);
                                  setNotification({
                                    message:
                                      'Error loading media. Please check the URL.',
                                    severity: 'error',
                                    open: true,
                                  });
                                }}
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    )}

                    {/* Delete Question Button */}
                    <Box
                      sx={{
                        mt: 2,
                        display: 'flex',
                        justifyContent: 'flex-end',
                      }}
                    >
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
                ))}

                {/* Bouton Add Question */}
                <Button
                  onClick={handleAddQuestion}
                  variant="outlined"
                  startIcon={<AddIcon />}
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
                  sx={{
                    background: colors.action.error.gradient,
                    color: 'white',
                    boxShadow: 'none',
                    '&:hover': {
                      background:
                        'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
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
                  sx={{
                    background: colors.action.info.gradient,
                    color: 'white',
                    boxShadow: 'none',
                    '&:hover': {
                      background:
                        'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                      boxShadow: 'none',
                    },
                  }}
                >
                  Preview
                </Button>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <CheckCircleIcon />
                    )
                  }
                  sx={{
                    background: colors.primary.gradient,
                    color: 'white',
                    boxShadow: 'none',
                    '&:hover': {
                      background: colors.primary.hover,
                      boxShadow: 'none',
                    },
                    '&.Mui-disabled': {
                      background: colors.primary.gradient,
                      opacity: 0.7,
                      color: 'white',
                    },
                  }}
                >
                  {isSubmitting ? 'Creating...' : 'Create Survey'}
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
        <Box
          component="div"
          data-testid="notification-container"
          sx={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            minWidth: 300,
          }}
        >
          <Alert
            severity={notification.severity}
            onClose={() =>
              setNotification((prev) => ({ ...prev, open: false }))
            }
            sx={{
              backgroundColor: colors.background.paper,
              boxShadow: 3,
              borderRadius: 2,
            }}
          >
            {notification.message}
          </Alert>
        </Box>
      )}

      <Box
        sx={{
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
        }}
      >
        <Typography variant="body2">Questions: {fields.length}</Typography>
      </Box>
    </Box>
  );
};

export default SurveyCreationPage;
