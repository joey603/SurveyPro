"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  Typography, 
  Switch, 
  FormControlLabel, 
  Button,
  Divider,
  Fab,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  Select,
  MenuItem,
  RadioGroup,
  Slider,
  Rating
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import DeleteIcon from '@mui/icons-material/Delete';
import PreviewIcon from '@mui/icons-material/Preview';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import SurveyFlow from './components/SurveyFlow';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ReactPlayer from 'react-player';

const educationOptions = [
  'High School',
  "Bachelor's Degree",
  "Master's Degree",
  'Doctorate',
  'Other'
];

const isImageFile = (url: string): boolean => {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
};

interface DemographicOption {
  label: string;
  type: 'text' | 'dropdown';
  options?: string[];
}

interface FormData {
  title: string;
  description: string;
  demographicEnabled: boolean;
}

interface SurveyFlowRef {
  resetFlow: () => void;
  getNodes: () => any[];
  addNewQuestion: () => void;
}

export default function DynamicSurveyCreation() {
  const [showPreview, setShowPreview] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [previewNodes, setPreviewNodes] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const flowRef = useRef<SurveyFlowRef | null>(null);
  
  const { control, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      title: '',
      description: '',
      demographicEnabled: false,
    },
  });

  const handleResetSurvey = () => {
    if (window.confirm('Are you sure you want to reset the survey? All progress will be lost.')) {
      // Reset les champs du formulaire
      reset();
      
      // Reset le flow via la référence
      if (flowRef.current) {
        flowRef.current.resetFlow();
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    console.log('Form submitted:', data);
    // Backend integration will be added later
  };

  const handleOpenPreview = () => {
    // Capture les nodes existants au moment d'ouvrir la prévisualisation
    const currentNodes = flowRef.current?.getNodes() || [];
    setPreviewNodes(currentNodes);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setCurrentPreviewIndex(0);
    setPreviewNodes([]);
  };

  const renderPreviewQuestion = () => {
    const allQuestions = [];
    
    // Ajouter les questions démographiques si activées
    if (watch('demographicEnabled')) {
      allQuestions.push({
        type: 'demographic',
        text: 'Demographic Information',
        options: [
          { label: 'Age', type: 'text' },
          { label: 'Gender', type: 'dropdown', options: ['Male', 'Female', 'Other', 'Prefer not to say'] },
          { label: 'Education Level', type: 'dropdown', options: educationOptions },
          { label: 'City', type: 'dropdown', options: cities || [] }
        ] as DemographicOption[]
      });
    }
    
    // Ajouter les questions standard
    const currentNodes = flowRef.current?.getNodes() || [];
    allQuestions.push(...currentNodes);

    if (allQuestions.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            No questions available in this survey yet.
          </Typography>
        </Box>
      );
    }

    const currentQuestion = allQuestions[currentPreviewIndex];
    if (!currentQuestion) return null;

    // Style commun pour les conteneurs de questions
    const questionContainerStyle = {
      p: 3,
      backgroundColor: 'white',
      borderRadius: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      mb: 3
    };

    // Style commun pour les titres de questions
    const questionTitleStyle = {
      color: '#1a237e',
      fontWeight: 500,
      mb: 2
    };

    // Style commun pour les conteneurs de réponses
    const answerContainerStyle = {
      mt: 3,
      p: 3,
      backgroundColor: '#f8f9fa',
      borderRadius: 1,
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: '#f0f2f5'
      }
    };

    // Rendu des questions démographiques
    if (currentQuestion.type === 'demographic') {
      return (
        <Box sx={questionContainerStyle}>
          <Typography variant="h6" gutterBottom sx={questionTitleStyle}>
            Section {currentPreviewIndex + 1} of {allQuestions.length}
          </Typography>
          <Typography variant="h5" gutterBottom sx={questionTitleStyle}>
            {currentQuestion.text}
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            {currentQuestion.options.map((option: DemographicOption, idx: number) => (
              <Box key={idx} sx={answerContainerStyle}>
                <Typography variant="subtitle1" gutterBottom sx={questionTitleStyle}>
                  {option.label}
                </Typography>
                
                {option.type === 'text' ? (
                  <TextField
                    fullWidth
                    placeholder={`Enter your ${option.label.toLowerCase()}`}
                    variant="outlined"
                    sx={{ 
                      maxWidth: 400,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white'
                      }
                    }}
                  />
                ) : option.type === 'dropdown' ? (
                  <Select
                    fullWidth
                    displayEmpty
                    sx={{ 
                      maxWidth: 400,
                      backgroundColor: 'white'
                    }}
                  >
                    <MenuItem disabled value="">
                      Select {option.label.toLowerCase()}
                    </MenuItem>
                    {option.options?.map((opt: string, i: number) => (
                      <MenuItem key={i} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                ) : null}
              </Box>
            ))}
          </Box>
        </Box>
      );
    }

    // Rendu des questions standard
    return (
      <Box sx={questionContainerStyle}>
        <Typography variant="h6" gutterBottom sx={questionTitleStyle}>
          Question {currentPreviewIndex + 1} of {allQuestions.length}
        </Typography>
        <Typography variant="body1" gutterBottom sx={{ 
          fontSize: '1.1rem',
          ...questionTitleStyle
        }}>
          {currentQuestion.data.text || 'No question text provided'}
        </Typography>
        
        {/* Affichage du média s'il existe */}
        {currentQuestion.data.media && (
          <Box sx={{ 
            mt: 2, 
            mb: 3, 
            maxWidth: '100%', 
            maxHeight: '300px', 
            overflow: 'hidden',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {isImageFile(currentQuestion.data.media) ? (
              <img
                src={currentQuestion.data.media}
                alt="Question media"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
            ) : (
              <ReactPlayer
                url={currentQuestion.data.media}
                controls
                width="100%"
                height="auto"
                style={{ borderRadius: '8px' }}
              />
            )}
          </Box>
        )}

        {/* Rendu des options selon le type de question */}
        <Box sx={answerContainerStyle}>
          {currentQuestion.data.type === 'multiple-choice' && (
            <RadioGroup sx={{ gap: 1 }}>
              {currentQuestion.data.options?.map((option: string, index: number) => (
                <FormControlLabel
                  key={index}
                  control={<Radio disabled />}
                  label={option}
                />
              ))}
            </RadioGroup>
          )}

          {currentQuestion.data.type === 'dropdown' && (
            <Select
              disabled
              displayEmpty
              fullWidth
              sx={{ mt: 2, maxWidth: 400 }}
            >
              <MenuItem disabled value="">
                Select an option
              </MenuItem>
              {currentQuestion.data.options?.map((option: string, index: number) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          )}

          {currentQuestion.data.type === 'yes-no' && (
            <RadioGroup row sx={{ mt: 2 }}>
              <FormControlLabel value="yes" control={<Radio disabled />} label="Yes" />
              <FormControlLabel value="no" control={<Radio disabled />} label="No" />
            </RadioGroup>
          )}

          {currentQuestion.data.type === 'text' && (
            <TextField
              fullWidth
              disabled
              placeholder="Enter your answer"
              multiline
              rows={3}
              sx={{ mt: 2 }}
            />
          )}

          {currentQuestion.data.type === 'slider' && (
            <Box sx={{ mt: 4, mx: 2 }}>
              <Slider
                disabled
                defaultValue={50}
                valueLabelDisplay="auto"
                step={1}
                marks
                min={0}
                max={100}
              />
            </Box>
          )}

          {currentQuestion.data.type === 'rating' && (
            <Box sx={{ mt: 2 }}>
              <Rating disabled />
            </Box>
          )}

          {currentQuestion.data.type === 'date' && (
            <Box sx={{ mt: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  disabled
                  value={null}
                  onChange={() => {}}
                  renderInput={(params) => <TextField {...params} />}
                />
              </LocalizationProvider>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  const handlePrevious = () => {
    setCurrentPreviewIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setCurrentPreviewIndex((prev) => 
      prev < previewNodes.length - 1 ? prev + 1 : prev
    );
  };

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
        setCities(data.data);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
      {/* Basic Information Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
          Basic Information
        </Typography>
        
        <Controller
          name="title"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Survey Title"
              variant="outlined"
              sx={{ mb: 2 }}
            />
          )}
        />
        
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Description"
              variant="outlined"
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
          )}
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={watch('demographicEnabled')}
              onChange={(e) => setValue('demographicEnabled', e.target.checked)}
            />
          }
          label="Enable Demographic Questions"
        />
      </Paper>

      {/* Flow Editor */}
      <Paper sx={{ p: 3, mb: 3, height: '600px', position: 'relative' }}>
        <SurveyFlow 
          ref={flowRef}
          onAddNode={() => {}} 
        />
        
        {/* Floating Add Question Button */}
        <Tooltip title="Add Question" placement="left">
          <Fab 
            color="primary" 
            aria-label="add question"
            sx={{
              position: 'absolute',
              bottom: 24,
              right: 24,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              },
            }}
            onClick={() => {
              if (flowRef.current) {
                flowRef.current.addNewQuestion();
              }
            }}
          >
            <AddIcon />
          </Fab>
        </Tooltip>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          onClick={handleResetSurvey}
          variant="contained"
          startIcon={<DeleteIcon />}
          sx={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            },
          }}
        >
          Reset
        </Button>

        <Button
          onClick={handleOpenPreview}
          variant="contained"
          startIcon={<PreviewIcon />}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
            },
          }}
        >
          Preview
        </Button>

        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          startIcon={<SendIcon />}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
            },
          }}
        >
          Submit
        </Button>
      </Box>

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
          sx={{ 
            justifyContent: 'space-between', 
            padding: '16px 24px',
            backgroundColor: '#f7f9fc',
            borderTop: '1px solid #ddd'
          }}
        >
          <Button
            onClick={() => setCurrentPreviewIndex((prev) => Math.max(prev - 1, 0))}
            disabled={currentPreviewIndex === 0}
            variant="outlined"
            sx={{
              color: '#1a237e',
              borderColor: '#1a237e',
              '&:hover': {
                borderColor: '#1a237e',
                backgroundColor: 'rgba(26, 35, 126, 0.04)',
              },
            }}
          >
            Previous
          </Button>
          <Button
            onClick={() => setCurrentPreviewIndex((prev) =>
              Math.min(prev + 1, previewNodes.length + (watch('demographicEnabled') ? 1 : 0) - 1)
            )}
            disabled={currentPreviewIndex === previewNodes.length + (watch('demographicEnabled') ? 1 : 0) - 1}
            variant="outlined"
            sx={{
              color: '#1a237e',
              borderColor: '#1a237e',
              '&:hover': {
                borderColor: '#1a237e',
                backgroundColor: 'rgba(26, 35, 126, 0.04)',
              },
            }}
          >
            Next
          </Button>
          <Button
            onClick={() => setShowPreview(false)}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              },
            }}
          >
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 