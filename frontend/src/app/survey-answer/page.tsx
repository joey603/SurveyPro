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
  MenuItem,
  IconButton,
  Chip,
  Stack,
  CircularProgress,
  Rating,
  Paper,
  Alert,
  FormHelperText,
  TextFieldProps,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClearIcon from '@mui/icons-material/Clear';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import FilterListIcon from '@mui/icons-material/FilterList';
import { fetchAvailableSurveys, submitSurveyAnswer } from "@/utils/surveyService";
import { useAuth } from '@/utils/AuthContext';
import Image from 'next/image';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { ChromePicker, ColorResult } from 'react-color';
import ReactPlayer from 'react-player';

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
  description: string;
  questions: Question[];
  demographicEnabled: boolean;
  createdAt: Date;
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
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, watch } = useForm<FormData>({
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
  const { isAuthenticated } = useAuth();
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
      console.log('Début du chargement des sondages');
      
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('accessToken');
        console.log('Token récupéré:', token ? 'Token présent' : 'Pas de token');
        
        if (!token) {
          throw new Error('Aucun token d\'authentification trouvé');
        }

        console.log('Appel de fetchAvailableSurveys');
        const data = await fetchAvailableSurveys(token);
        console.log('Données reçues:', data);
        
        if (!Array.isArray(data)) {
          console.error('Format de données invalide:', data);
          throw new Error('Format de données invalide reçu du serveur');
        }

        console.log('Mise à jour des sondages:', data.length, 'sondages trouvés');
        setSurveys(data);
      } catch (error: any) {
        console.error('Erreur complète:', error);
        console.error('Type d\'erreur:', typeof error);
        console.error('Message d\'erreur:', error.message);
        console.error('Stack trace:', error.stack);
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
      loadCities();
    }
  }, [selectedSurvey]);

  const filteredSurveys = surveys.filter(survey => {
    const matchesSearch = (survey.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (survey.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    if (dateRange.start && dateRange.end) {
      const surveyDate = new Date(survey.createdAt);
      const isInDateRange = surveyDate >= dateRange.start && 
                           surveyDate <= new Date(dateRange.end.setHours(23, 59, 59));
      return matchesSearch && isInDateRange;
    }

    return matchesSearch;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setDateRange({ start: null, end: null });
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

    selectedSurvey?.questions.forEach(question => {
      const answer = data.answers[question.id];
      if (answer === undefined || answer === '' || answer === null) {
        errors[`answers.${question.id}`] = 'This question requires an answer';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedSurvey) return;
    
    if (!validateForm(data)) {
      setNotification({
        message: "Please fill in all required fields",
        severity: 'error',
        open: true
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formattedAnswers = Object.entries(data.answers).map(([questionId, value]) => ({
        questionId,
        value
      }));

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const submissionData = {
        surveyId: selectedSurvey._id,
        answers: formattedAnswers,
        demographic: selectedSurvey.demographicEnabled ? {
          gender: data.demographic.gender,
          dateOfBirth: data.demographic.dateOfBirth,
          educationLevel: data.demographic.educationLevel,
          city: data.demographic.city
        } : undefined
      };

      await submitSurveyAnswer(selectedSurvey._id, submissionData, token);

      setAnsweredSurveys(prev => [...prev, selectedSurvey._id]);

      setNotification({
        message: "Thank you for your responses!",
        severity: 'success',
        open: true
      });
      
      setTimeout(() => {
        setSelectedSurvey(null);
      }, 2000);

    } catch (error: any) {
      console.error('Error submitting survey:', error);
      setNotification({
        message: error.message || 'An error occurred while submitting your responses',
        severity: 'error',
        open: true
      });
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
                <FormControl 
                  fullWidth 
                  error={!!formErrors[`answers.${question.id}`]}
                >
                  <InputLabel>{question.text}</InputLabel>
                  <Select
                    {...field}
                    label={question.text}
                    onChange={(e) => {
                      field.onChange(e);
                      validateField(`answers.${question.id}`, e.target.value);
                    }}
                  >
                    {question.options?.map((option, index) => (
                      <MenuItem key={index} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors[`answers.${question.id}`] && (
                    <FormHelperText error>
                      {formErrors[`answers.${question.id}`]}
                    </FormHelperText>
                  )}
                </FormControl>
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

      const response = await fetch('http://localhost:5041/api/survey-answers/responses/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Erreur lors de la récupération des réponses');

      const data = await response.json();
      console.log("Réponses reçues:", data);
      const answeredIds = data.map((response: any) => response.surveyId);
      console.log("IDs des sondages répondus:", answeredIds);
      setAnsweredSurveys(answeredIds);
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
          maxWidth: '800px',
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

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress sx={{ color: '#667eea' }} />
              </Box>
            ) : error ? (
              <Typography color="error" sx={{ textAlign: 'center', my: 4 }}>
                {error}
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {filteredSurveys.map((survey) => (
                  <Paper
                    key={survey._id}
                    elevation={1}
                    sx={{
                      borderRadius: 2,
                      overflow: 'hidden',
                      transition: 'box-shadow 0.3s ease-in-out',
                      '&:hover': {
                        boxShadow: 3,
                      }
                    }}
                  >
                    <Box sx={{ p: 3 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          mb: 2,
                          color: 'primary.main',
                          fontWeight: 500
                        }}
                      >
                        {survey.title}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        {survey.description}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ display: 'block', mb: 2 }}
                      >
                        Created on {new Date(survey.createdAt).toLocaleDateString('en-US')}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      p: 2, 
                      borderTop: 1, 
                      borderColor: 'divider',
                      backgroundColor: 'action.hover',
                      display: 'flex',
                      justifyContent: 'flex-end'
                    }}>
                      <Button
                        onClick={() => setSelectedSurvey(survey)}
                        variant="contained"
                        size="small"
                        disabled={answeredSurveys.includes(survey._id)}
                        sx={{
                          background: answeredSurveys.includes(survey._id)
                            ? 'rgba(0, 0, 0, 0.12)'
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': {
                            background: answeredSurveys.includes(survey._id)
                              ? 'rgba(0, 0, 0, 0.12)'
                              : 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                          },
                          color: answeredSurveys.includes(survey._id) ? 'rgba(0, 0, 0, 0.26)' : 'white',
                          pointerEvents: answeredSurveys.includes(survey._id) ? 'none' : 'auto',
                          opacity: answeredSurveys.includes(survey._id) ? 0.6 : 1,
                        }}
                      >
                        {answeredSurveys.includes(survey._id) ? 'Already Answered' : 'Answer Survey'}
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        </Paper>
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
        maxWidth: '800px',
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

        <Box sx={{ p: 4, backgroundColor: 'white' }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            {selectedSurvey.demographicEnabled && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
                  Informations Démographiques
                </Typography>
                {renderDemographicFields()}
              </Box>
            )}

            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
                Survey Questions
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
    </Box>
  );
};

export default SurveyAnswerPage;

