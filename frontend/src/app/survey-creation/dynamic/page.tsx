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

const questionTypes = [
  { value: 'text', label: 'Texte libre' },
  { value: 'yes-no', label: 'Oui/Non' },
  { value: 'dropdown', label: 'Liste déroulante' },
  { value: 'multiple-choice', label: 'Choix multiple' },
  { value: 'slider', label: 'Curseur' },
  { value: 'rating', label: 'Évaluation (Étoiles)' },
  { value: 'date', label: 'Sélecteur de date' },
];

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

  // Ajouter l'état pour les réponses de prévisualisation
  const [previewAnswers, setPreviewAnswers] = useState<{
    [questionId: string]: any;
  }>({});

  // Ajout d'un état pour suivre le chemin des questions
  const [questionPath, setQuestionPath] = useState<string[]>(['1']); // Commence avec la question 1

  const findNextQuestions = (currentQuestionId: string, answer: any) => {
    const edges = previewNodes.filter(node => 
      node.id.startsWith(`${currentQuestionId}-`) || 
      (node.data?.sourceHandle === currentQuestionId && node.data?.condition === answer)
    );

    return edges.map(edge => edge.id);
  };

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
    setPreviewAnswers({});
    setQuestionPath(['1']); // Réinitialiser le chemin
  };

  const renderPreviewQuestion = () => {
    const questionContainerStyle = {
      p: 3,
      backgroundColor: 'white',
      borderRadius: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      mb: 3
    };

    const questionTitleStyle = {
      color: '#1a237e',
      fontWeight: 500,
      mb: 2
    };

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

    const allQuestions = [];
    
    // Vérifier si les questions démographiques sont activées et si nous sommes au début
    if (watch('demographicEnabled') && currentPreviewIndex === 0) {
      const demographicQuestion = {
        id: 'demographic',
        type: 'demographic',
        text: 'Demographic Information',
        data: {
          type: 'demographic',
          options: [
            { label: 'Age', type: 'text' },
            { label: 'Gender', type: 'dropdown', options: ['Male', 'Female', 'Other', 'Prefer not to say'] },
            { label: 'Education Level', type: 'dropdown', options: educationOptions },
            { label: 'City', type: 'dropdown', options: cities || [] }
          ]
        }
      };
      allQuestions.push(demographicQuestion);
    } else {
      // Obtenir les questions du flux
      const currentNodes = flowRef.current?.getNodes() || [];
      const currentQuestionId = questionPath[questionPath.length - 1];
      const currentQuestion = currentNodes.find(node => node.id === currentQuestionId);
      
      if (currentQuestion) {
        allQuestions.push(currentQuestion);
      }
    }

    if (allQuestions.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            No questions available in this survey yet.
          </Typography>
        </Box>
      );
    }

    const currentQuestion = allQuestions[0];
    if (!currentQuestion) return null;

    // Si c'est une question démographique
    if (currentQuestion.type === 'demographic') {
      return (
        <Box sx={questionContainerStyle}>
          <Typography variant="h6" gutterBottom sx={questionTitleStyle}>
            Demographic Information
          </Typography>
          
          {currentQuestion.data.options.map((option: DemographicOption, index: number) => (
            <Box key={index} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                {option.label}
              </Typography>
              
              {option.type === 'text' ? (
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder={`Enter your ${option.label.toLowerCase()}`}
                  value={previewAnswers[`demographic_${option.label}`] || ''}
                  onChange={(e) => setPreviewAnswers(prev => ({
                    ...prev,
                    [`demographic_${option.label}`]: e.target.value
                  }))}
                  sx={{ 
                    maxWidth: 400,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white'
                    }
                  }}
                />
              ) : option.type === 'dropdown' && (
                <Select
                  fullWidth
                  value={previewAnswers[`demographic_${option.label}`] || ''}
                  onChange={(e) => setPreviewAnswers(prev => ({
                    ...prev,
                    [`demographic_${option.label}`]: e.target.value
                  }))}
                  sx={{ 
                    maxWidth: 400,
                    backgroundColor: 'white'
                  }}
                >
                  <MenuItem value="" disabled>
                    Select {option.label.toLowerCase()}
                  </MenuItem>
                  {option.options?.map((opt: string, i: number) => (
                    <MenuItem key={i} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              )}
            </Box>
          ))}
        </Box>
      );
    }

    const handleAnswerChange = (questionId: string, answer: any) => {
      setPreviewAnswers(prev => ({
        ...prev,
        [questionId]: answer
      }));

      // Si c'est une question critique, mettre à jour le chemin
      const currentNode = previewNodes.find(node => node.id === questionId);
      if (currentNode?.data?.isCritical) {
        const nextQuestions = findNextQuestions(questionId, answer);
        if (nextQuestions.length > 0) {
          setQuestionPath(prev => [...prev, nextQuestions[0]]);
        }
      } else {
        // Pour les questions non critiques, passer simplement à la suivante dans l'ordre
        const currentIndex = previewNodes.findIndex(node => node.id === questionId);
        if (currentIndex < previewNodes.length - 1) {
          setQuestionPath(prev => [...prev, previewNodes[currentIndex + 1].id]);
        }
      }
    };

    // Rendu des questions standard
    return (
      <Box sx={questionContainerStyle}>
        <Typography variant="h6" gutterBottom sx={questionTitleStyle}>
          Question {currentPreviewIndex + 1}
        </Typography>
        
        {/* Affichage du type de question */}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Type: {currentQuestion.data?.type ? 
            questionTypes.find((t: { value: string; label: string }) => t.value === currentQuestion.data.type)?.label || currentQuestion.data.type 
            : 'Non spécifié'}
        </Typography>

        {/* Affichage du texte de la question */}
        <Typography variant="body1" gutterBottom sx={{ 
          fontSize: '1.1rem',
          ...questionTitleStyle
        }}>
          {currentQuestion.data?.text || 'Aucun texte de question fourni'}
        </Typography>
        
        {/* Affichage du média */}
        {currentQuestion.data?.mediaUrl && (
          <Box sx={{ 
            mt: 2, 
            mb: 3, 
            maxWidth: '100%', 
            maxHeight: '300px', 
            overflow: 'hidden',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {isImageFile(currentQuestion.data.mediaUrl) ? (
              <img
                src={currentQuestion.data.mediaUrl}
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
                url={currentQuestion.data.mediaUrl}
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
          {currentQuestion.data?.type === 'multiple-choice' && (
            <RadioGroup
              value={previewAnswers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            >
              {currentQuestion.data.options?.map((option: string, index: number) => (
                <FormControlLabel
                  key={index}
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
          )}

          {currentQuestion.data?.type === 'dropdown' && (
            <Select
              fullWidth
              value={previewAnswers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
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

          {currentQuestion.data?.type === 'yes-no' && (
            <RadioGroup
              row
              value={previewAnswers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              sx={{ mt: 2 }}
            >
              <FormControlLabel value="yes" control={<Radio />} label="Yes" />
              <FormControlLabel value="no" control={<Radio />} label="No" />
            </RadioGroup>
          )}

          {currentQuestion.data?.type === 'text' && (
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Enter your answer"
              value={previewAnswers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              sx={{ mt: 2 }}
            />
          )}

          {currentQuestion.data?.type === 'slider' && (
            <Box sx={{ mt: 4, mx: 2 }}>
              <Slider
                value={previewAnswers[currentQuestion.id] || 50}
                onChange={(_, value) => handleAnswerChange(currentQuestion.id, value)}
                valueLabelDisplay="auto"
                step={1}
                marks
                min={0}
                max={100}
              />
            </Box>
          )}

          {currentQuestion.data?.type === 'rating' && (
            <Box sx={{ mt: 2 }}>
              <Rating
                value={previewAnswers[currentQuestion.id] || null}
                onChange={(_, value) => handleAnswerChange(currentQuestion.id, value)}
              />
            </Box>
          )}

          {currentQuestion.data?.type === 'date' && (
            <Box sx={{ mt: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  value={previewAnswers[currentQuestion.id] || null}
                  onChange={(newDate) => setPreviewAnswers(prev => ({
                    ...prev,
                    [currentQuestion.id]: newDate
                  }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      sx={{ 
                        width: '100%',
                        maxWidth: 400,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white'
                        }
                      }}
                    />
                  )}
                />
              </LocalizationProvider>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  const handleNext = () => {
    const currentQuestionId = questionPath[questionPath.length - 1];
    const answer = previewAnswers[currentQuestionId];
    
    if (answer) {
      const nextQuestions = findNextQuestions(currentQuestionId, answer);
      if (nextQuestions.length > 0) {
        setQuestionPath(prev => [...prev, nextQuestions[0]]);
        setCurrentPreviewIndex(prev => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (questionPath.length > 1) {
      setQuestionPath(prev => prev.slice(0, -1));
      setCurrentPreviewIndex(prev => prev - 1);
    }
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