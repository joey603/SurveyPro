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
    const matchesSearch = survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         survey.description.toLowerCase().includes(searchQuery.toLowerCase());

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
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>Available Surveys</Typography>
        
        <Box sx={{ mb: 3 }}>
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
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (searchQuery || dateRange.start || dateRange.end) && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={clearFilters}
                    edge="end"
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Chip
              icon={<FilterListIcon />}
              label="Date Filter"
              onClick={() => setShowDateFilter(!showDateFilter)}
              color={showDateFilter ? "primary" : "default"}
              variant={showDateFilter ? "filled" : "outlined"}
            />
            {(dateRange.start || dateRange.end) && (
              <Typography variant="body2" color="text.secondary">
                Active date filter
              </Typography>
            )}
          </Stack>

          {showDateFilter && (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <DatePicker
                  label="Start Date"
                  value={dateRange.start}
                  onChange={(newValue) => setDateRange(prev => ({ ...prev, start: newValue }))}
                  renderInput={(params) => (
                    <TextField {...params} sx={{ width: '200px' }} />
                  )}
                />
                <DatePicker
                  label="End Date"
                  value={dateRange.end}
                  onChange={(newValue) => setDateRange(prev => ({ ...prev, end: newValue }))}
                  renderInput={(params) => (
                    <TextField {...params} sx={{ width: '200px' }} />
                  )}
                  minDate={dateRange.start || undefined}
                />
              </Stack>
            </LocalizationProvider>
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ textAlign: 'center', my: 4 }}>
            {error}
          </Typography>
        ) : (
          <>
            <List>
              {filteredSurveys.map((survey) => (
                <ListItem
                  key={survey._id}
                  disablePadding
                  sx={{
                    mb: 2,
                    backgroundColor: 'white',
                    borderRadius: 1,
                    boxShadow: 1,
                  }}
                >
                  <ListItemButton onClick={() => setSelectedSurvey(survey)}>
                    <Box sx={{ flex: 1 }}>
                      <ListItemText
                        primary={survey.title}
                        secondary={
                          <React.Fragment>
                            <Typography component="span" variant="body2" color="text.primary">
                              {survey.description}
                            </Typography>
                            <br />
                            <Typography component="span" variant="caption" color="text.secondary">
                              Created on {new Date(survey.createdAt).toLocaleDateString('en-US')}
                            </Typography>
                          </React.Fragment>
                        }
                      />
                    </Box>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      sx={{ ml: 2 }}
                    >
                      Answer
                    </Button>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            {filteredSurveys.length === 0 && (
              <Typography
                variant="body1"
                sx={{
                  textAlign: 'center',
                  mt: 4,
                  color: 'text.secondary',
                }}
              >
                No surveys available
              </Typography>
            )}
          </>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Button 
        onClick={() => setSelectedSurvey(null)} 
        sx={{ mb: 2 }}
        variant="outlined"
        startIcon={<ArrowBackIcon />}
      >
        Back to list
      </Button>
      
      <Typography variant="h4" sx={{ mb: 3 }}>{selectedSurvey.title}</Typography>
      <Typography variant="subtitle1" sx={{ mb: 4 }}>{selectedSurvey.description}</Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        {selectedSurvey.demographicEnabled && renderDemographicFields()}

        {selectedSurvey.questions.map((question: Question) => (
          <Box key={question.id} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>{question.text}</Typography>
            
            {question.media && renderQuestionMedia(question.media)}

            {renderQuestionInput(question)}
          </Box>
        ))}

        {submitError && (
          <Typography color="error" sx={{ mt: 2, mb: 2 }}>
            {submitError}
          </Typography>
        )}

        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </form>
    </Box>
  );
};

export default SurveyAnswerPage;
