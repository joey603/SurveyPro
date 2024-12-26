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
} from '@mui/material';
import ReactPlayer from 'react-player';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ChromePicker } from 'react-color';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { createSurvey } from '../../utils/surveyService';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility'; // Ajouté pour le bouton Preview

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
  questions: Question[];
};

const isValidMediaURL = (url: string): boolean => {
  try {
    new URL(url); // Vérifie simplement si c'est une URL valide
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
  { value: 'file-upload', label: 'File Upload' },
  { value: 'color-picker', label: 'Color Picker' },
];

const educationOptions = [
  'High School',
  "Bachelor's",
  "Master's",
  'Doctorate',
  'Other',
];

const SurveyCreationPage: React.FC = () => {
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

  const [selectedColors, setSelectedColors] = useState<{
    [key: string]: { color: string; alpha: number };
  }>({});

  const questions = watch('questions'); // Surveille toutes les questions

  const [cities, setCities] = useState<string[]>([]); // Liste des villes
  const [selectedCity, setSelectedCity] = useState(''); // Ville sélectionnée

  const [isUploading, setIsUploading] = useState<{ [key: string]: boolean }>({});

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

  // useEffect to initialize color-picker questions
  useEffect(() => {
    // Initialize missing color-picker entries
    questions.forEach((question) => {
      if (question.type === 'color-picker' && !selectedColors[question.id]) {
        setSelectedColors((prev) => ({
          ...prev,
          [question.id]: { color: '#000000', alpha: 1 },
        }));
      }
    });
  }, [questions]); // Trigger this effect when questions change

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
    setSelectedColors((prev) => ({
      ...prev,
      [id]: { color: '#000000', alpha: 1 },
    }));
  };

  const handleDeleteQuestion = (index: number) => {
    const questionId = fields[index].id;
    remove(index);
    setLocalOptions((prev) => {
      const updated = { ...prev };
      delete updated[questionId];
      return updated;
    });
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

  const handleResetSurvey = () => {
    reset({
      title: '',
      description: '',
      demographicEnabled: false,
      questions: [],
    });
    setLocalOptions({});
  };

  const handleFileUpload = async (
    file: File,
    questionId: string
  ): Promise<void> => {
    try {
      setIsUploading((prev) => ({ ...prev, [questionId]: true }));
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        'http://localhost:5041/api/surveys/upload-media',
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();

      if (response.ok && result.url) {
        fields.forEach((field, index) => {
          if (field.id === questionId) {
            update(index, { 
              ...field, 
              media: result.url,
            });
          }
        });
      } else {
        console.error('Failed to upload media:', result);
        alert('Failed to upload media. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      alert('An error occurred while uploading the media.');
    } finally {
      setIsUploading((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const [localQuestions, setLocalQuestions] = useState<Question[]>([]);

  useEffect(() => {
    setLocalQuestions(getValues('questions'));
  }, [watch('questions')]);

  const onSubmit = async (data: FormData) => {
    const questionsWithUpdatedOptions = data.questions.map((question) => ({
      ...question,
      options: localOptions[question.id] || [],
    }));

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found.');
      }
      await createSurvey(
        { ...data, questions: questionsWithUpdatedOptions },
        token
      );
      alert('Survey submitted successfully!');
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('Failed to submit survey. Check the console for details.');
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
    const totalQuestions = questions.length;
    const adjustedIndex = demographicEnabled
      ? currentPreviewIndex - 1
      : currentPreviewIndex;
    const question = adjustedIndex >= 0 ? questions[adjustedIndex] : null;

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
            <Box>
              {(() => {
                console.log('Rendering media:', question.media);
                return null; // Renvoyez un élément valide, ici `null` pour ne rien afficher
              })()}
            </Box>

            {/* Vérifiez si le média est une vidéo ou une image */}
            {question.media.startsWith('blob:') ||
            question.media.endsWith('.mp4') ||
            question.media.endsWith('.mov') ? (
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
                onError={(e) => console.error('ReactPlayer error:', e)}
              />
            ) : question.media.match(/\.(jpg|jpeg|png)$/) ? (
              <img
                src={question.media}
                alt="Uploaded Media"
                style={{
                  maxWidth: '50%',
                  maxHeight: '200px',
                  display: 'block',
                  margin: '0 auto',
                }}
                onError={(e) => console.error('Image rendering error:', e)}
              />
            ) : (
              <Typography color="error">Invalid media format</Typography>
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
                    questions.map((q) =>
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
          {question.type === 'color-picker' && (
            <Box>
              <ChromePicker
                color={{
                  r: selectedColors[question.id]?.color
                    ? parseInt(
                        selectedColors[question.id].color.slice(1, 3),
                        16
                      )
                    : 0,
                  g: selectedColors[question.id]?.color
                    ? parseInt(
                        selectedColors[question.id].color.slice(3, 5),
                        16
                      )
                    : 0,
                  b: selectedColors[question.id]?.color
                    ? parseInt(
                        selectedColors[question.id].color.slice(5, 7),
                        16
                      )
                    : 0,
                  a: selectedColors[question.id]?.alpha || 1,
                }}
                onChangeComplete={(color) => {
                  setSelectedColors((prev) => ({
                    ...prev,
                    [question.id]: {
                      color: color.hex,
                      alpha: color.rgb.a || 1,
                    },
                  }));
                }}
                styles={{
                  default: {
                    picker: {
                      width: '300px',
                      height: 'auto',
                      boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                      borderRadius: '10px',
                    },
                  },
                }}
              />
              <Box
                sx={{
                  width: 120,
                  height: 60,
                  mt: 2,
                  backgroundColor: `rgba(${parseInt(
                    selectedColors[question.id]?.color?.slice(1, 3) || '00',
                    16
                  )}, 
                                ${parseInt(
                                  selectedColors[question.id]?.color?.slice(
                                    3,
                                    5
                                  ) || '00',
                                  16
                                )}, 
                                ${parseInt(
                                  selectedColors[question.id]?.color?.slice(
                                    5,
                                    7
                                  ) || '00',
                                  16
                                )}, 
                                ${selectedColors[question.id]?.alpha || 1})`,
                  border: '1px solid #ddd',
                }}
              />
            </Box>
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

    update(index, {
      ...currentQuestion,
      options: [...currentOptions, ''],
    });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'flex-start', // Changé à flex-start pour un meilleur scroll
        justifyContent: 'center',
        padding: { xs: 2, sm: 4 },
      }}
    >
      <Paper
        elevation={3}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '800px', // Augmenté pour plus d'espace
          mb: 4,
        }}
      >
        {/* Header avec gradient */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            py: 4,
            px: 4,
            color: 'white',
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" fontWeight="bold">
            Create New Survey
          </Typography>
        </Box>

        {/* Contenu du formulaire */}
        <Box sx={{ p: 4, backgroundColor: 'white' }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Section des informations de base */}
            <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
              Basic Information
            </Typography>

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

            <Controller
              name="demographicEnabled"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                      color="primary"
                    />
                  }
                  label="Enable Demographic Questions"
                  sx={{ mb: 3 }}
                />
              )}
            />

            <Divider sx={{ my: 4 }} />

            {/* Section des questions */}
            <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
              Survey Questions
            </Typography>

            {/* Liste des questions */}
            {fields.map((field, index) => (
              <Paper
                key={field.id}
                elevation={1}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 2,
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                }}
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
                        onChange={(e) => handleQuestionTypeChange(index, e.target.value)}
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
                            />
                          )}
                        />
                        <IconButton
                          onClick={() => {
                            const newOptions = field.options ?? [];
                            update(index, {
                              ...field,
                              options: newOptions.filter((_, i) => i !== optionIndex),
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
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Button
                        component="label"
                        variant="outlined"
                        startIcon={<PhotoCameraIcon />}
                        sx={{
                          color: '#667eea',
                          borderColor: '#667eea',
                          '&:hover': {
                            borderColor: '#764ba2',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                          },
                        }}
                      >
                        Upload Media
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
                        value={field.mediaUrl || ''}
                        onChange={(e) => {
                          const url = e.target.value;
                          update(index, { 
                            ...field, 
                            mediaUrl: url,
                            media: url
                          });
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
                        InputProps={{
                          endAdornment: field.mediaUrl && (
                            <IconButton
                              size="small"
                              onClick={() => {
                                update(index, { 
                                  ...field, 
                                  mediaUrl: '',
                                  media: ''
                                });
                              }}
                              sx={{ color: '#ef4444' }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          ),
                        }}
                      />
                    </Box>
                    {field.media && (
                      <Box sx={{ mt: 2, maxWidth: '200px' }}>
                        {isUploading[field.id] ? (
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              height: '100px',
                              width: '100%',
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              borderRadius: '8px',
                            }}
                          >
                            <CircularProgress size={40} sx={{ color: '#667eea' }} />
                          </Box>
                        ) : (
                          <img
                            src={field.media}
                            alt="Question media"
                            style={{
                              maxWidth: '100%',
                              height: 'auto',
                              borderRadius: '8px',
                            }}
                            onError={(e) => {
                              console.error('Error loading image:', e);
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </Box>
                )}

                {/* Delete Question Button */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
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

            <Divider sx={{ my: 4 }} />

            {/* Actions finales */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                justifyContent: 'flex-end',
              }}
            >
              <Button
                onClick={handleResetSurvey}
                variant="outlined"
                startIcon={<DeleteIcon />}
                sx={{
                  color: '#ef4444',
                  borderColor: '#ef4444',
                  '&:hover': {
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: '#ef4444',
                  },
                }}
              >
                Reset
              </Button>

              <Button
                onClick={() => setShowPreview(true)}
                variant="outlined"
                startIcon={<VisibilityIcon />}
                sx={{
                  color: '#667eea',
                  borderColor: '#667eea',
                  '&:hover': {
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderColor: '#667eea',
                  },
                }}
              >
                Preview
              </Button>

              <Button
                type="submit"
                variant="contained"
                startIcon={<CheckCircleIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  },
                }}
              >
                Create Survey
              </Button>
            </Box>
          </form>
        </Box>
      </Paper>

      {/* La modal de prévisualisation reste la même */}
      {showPreview && (
        <Dialog
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
                    questions.length + (demographicEnabled ? 1 : 0) - 1
                  )
                )
              }
              disabled={
                currentPreviewIndex ===
                questions.length + (demographicEnabled ? 1 : 0) - 1
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
      )}
    </Box>
  );
};

export default SurveyCreationPage;
