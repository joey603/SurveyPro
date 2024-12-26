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
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClearIcon from '@mui/icons-material/Clear';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import FilterListIcon from '@mui/icons-material/FilterList';
import { fetchSurveys, submitSurveyAnswer } from "@/utils/surveyService";
import { useAuth } from '@/utils/AuthContext';
import Image from 'next/image';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { ChromePicker, ColorResult } from 'react-color';

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
  media?: { url: string; type: string };
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
  const { control, handleSubmit } = useForm<FormData>({
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
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('No authentication token found');
        }
        const data = await fetchSurveys(token);
        setSurveys(data);
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

  const onSubmit = async (data: any) => {
    if (!selectedSurvey) return;
    
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

      alert("Thank you for your answers!");
      setSelectedSurvey(null);
    } catch (error: any) {
      console.error('Error submitting survey:', error);
      setSubmitError(error.message || 'An error occurred while submitting your answers');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestionMedia = (media: { url: string; type: string }) => {
    if (!media) return null;

    if (media.type === "video") {
      return (
        <Box sx={{ mb: 2, maxWidth: '100%', height: 'auto' }}>
          <video
            controls
            style={{ maxWidth: '100%', height: 'auto' }}
            src={media.url}
          >
            Your browser does not support the video tag.
          </video>
        </Box>
      );
    } else if (media.type === "image") {
      return (
        <Box sx={{ mb: 2, position: 'relative', width: '100%', maxHeight: '400px', height: 'auto' }}>
          <img
            src={media.url}
            alt="Question media"
            style={{ 
              width: '100%',
              height: 'auto',
              maxHeight: '400px',
              objectFit: 'contain'
            }}
          />
        </Box>
      );
    }
    return null;
  };

  const renderQuestionInput = (question: Question) => (
    <Controller
      name={`answers.${question.id}` as FieldPath}
      control={control}
      defaultValue=""
      render={({ field }) => {
        switch (question.type) {
          case "text":
            return <TextField {...field} fullWidth />;
          case "multiple-choice":
            return (
              <RadioGroup {...field}>
                {question.options?.map((option, index) => (
                  <FormControlLabel
                    key={index}
                    value={option}
                    control={<Radio />}
                    label={option}
                  />
                ))}
              </RadioGroup>
            );
          case "slider":
            return (
              <Slider
                {...field}
                min={1}
                max={10}
                valueLabelDisplay="auto"
                onChange={(_, value) => field.onChange(value)}
                value={typeof field.value === 'number' ? field.value : 0}
              />
            );
          case "rating":
            return (
              <Rating
                {...field}
                precision={1}
                size="large"
                onChange={(_, value) => field.onChange(value)}
                value={typeof field.value === 'number' ? field.value : 0}
              />
            );
          case "dropdown":
            return (
              <TextField
                {...field}
                select
                fullWidth
              >
                {question.options?.map((option, index) => (
                  <MenuItem key={index} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            );
          case "date":
            return (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Box sx={{ width: '100%' }}>
                  <DatePicker
                    label="Select date"
                    value={field.value || null}
                    onChange={(newValue) => field.onChange(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        variant="outlined"
                      />
                    )}
                  />
                </Box>
              </LocalizationProvider>
            );
          case "color-picker":
            return (
              <Box sx={{ 
                width: '300px', 
                p: 2, 
                border: '1px solid #ddd', 
                borderRadius: 1,
                backgroundColor: '#fff'
              }}>
                <ChromePicker
                  color={field.value || '#000000'}
                  onChange={(color: ColorResult) => field.onChange(color.hex)}
                  styles={{
                    default: {
                      picker: {
                        width: '100%',
                        boxShadow: 'none'
                      }
                    }
                  }}
                />
                <Box sx={{ 
                  mt: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1 
                }}>
                  <Box 
                    sx={{ 
                      width: 24, 
                      height: 24, 
                      backgroundColor: field.value,
                      border: '1px solid #ddd',
                      borderRadius: 1
                    }} 
                  />
                  <Typography variant="body2">{field.value}</Typography>
                </Box>
              </Box>
            );
          default:
            return <TextField {...field} fullWidth />;
        }
      }}
    />
  );

  const renderDemographicFields = () => {
    console.log("Rendering demographic fields with cities:", cities);
    
    return (
      <Box sx={{ mb: 4, p: 3, border: "1px solid #ddd", borderRadius: "8px" }}>
        <Typography variant="h5" sx={{ mb: 3 }}>Demographic Information</Typography>
        
        <Controller
          name="demographic.gender"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Gender</Typography>
              <RadioGroup {...field} row>
                <FormControlLabel value="male" control={<Radio />} label="Male" />
                <FormControlLabel value="female" control={<Radio />} label="Female" />
                <FormControlLabel value="other" control={<Radio />} label="Other" />
              </RadioGroup>
            </Box>
          )}
        />

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Controller
            name="demographic.dateOfBirth"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Date of Birth"
                value={field.value}
                onChange={field.onChange}
                renderInput={(params) => 
                  <TextField {...params} fullWidth sx={{ mb: 3 }} />
                }
              />
            )}
          />
        </LocalizationProvider>

        <Controller
          name="demographic.educationLevel"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <TextField
              {...field}
              select
              fullWidth
              label="Education Level"
              sx={{ mb: 3 }}
            >
              {educationLevels.map((level) => (
                <MenuItem key={level} value={level}>
                  {level}
                </MenuItem>
              ))}
            </TextField>
          )}
        />

        <Controller
          name="demographic.city"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>City</InputLabel>
              <Select
                {...field}
                disabled={isLoadingCities}
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
            </FormControl>
          )}
        />
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
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                          }
                        }}
                      >
                        Answer Survey
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
                  Demographic Information
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
    </Box>
  );
};

export default SurveyAnswerPage;
