"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { Edge } from 'reactflow';

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

interface PreviewAnswer {
  [key: string]: string | number;
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
  const [edges, setEdges] = useState<Edge[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const flowRef = useRef<SurveyFlowRef | null>(null);
  
  const { control, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      title: '',
      description: '',
      demographicEnabled: false,
    },
  });

  const [previewAnswers, setPreviewAnswers] = useState<PreviewAnswer>({});

  const [questionPath, setQuestionPath] = useState<string[]>(['1']);

  const findNextQuestions = (currentQuestionId: string, answer: any) => {
    const edges = previewNodes.filter(node => 
      node.id.startsWith(`${currentQuestionId}-`) || 
      (node.data?.sourceHandle === currentQuestionId && node.data?.condition === answer)
    );

    return edges.map(edge => edge.id);
  };

  const handleResetSurvey = () => {
    if (window.confirm('Are you sure you want to reset the survey? All progress will be lost.')) {
      reset();
      
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
    if (flowRef.current) {
      const nodes = flowRef.current.getNodes();
      const orderedNodes = getOrderedNodesFromFlow(nodes);
      setPreviewNodes(orderedNodes);
      setCurrentPreviewIndex(0);
      setQuestionPath(['1']);
      setShowPreview(true);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setCurrentPreviewIndex(0);
    setPreviewNodes([]);
    setPreviewAnswers({});
    setQuestionPath(['1']);
  };

  const renderPreviewQuestion = () => {
    const questionContainerStyle = {
      p: 3,
      backgroundColor: 'white',
      borderRadius: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      mb: 3
    };

    const currentQuestion = previewNodes[currentPreviewIndex];
    if (!currentQuestion) return null;

    const handleAnswerChange = (value: string | number) => {
      console.log('Selected value:', value);
      console.log('Current question ID:', currentQuestion.id);
      
      const normalizedValue = String(value).trim();
      
      setPreviewAnswers(prev => {
        const newAnswers = {
          ...prev,
          [currentQuestion.id]: normalizedValue
        };
        console.log('Updated answers:', newAnswers);
        return newAnswers;
      });
    };

    const currentAnswer = previewAnswers[currentQuestion.id];
    console.log('Current answer for question:', currentQuestion.id, currentAnswer);

    const isCriticalQuestion = currentQuestion.data?.isCritical;

    return (
      <Box sx={questionContainerStyle}>
        {isCriticalQuestion && (
          <Typography 
            variant="subtitle2" 
            color="error" 
            sx={{ mb: 2 }}
          >
            * Cette question est critique - Une réponse est requise pour continuer
          </Typography>
        )}

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Type: {questionTypes.find(t => t.value === currentQuestion.data?.type)?.label || 'Non spécifié'}
        </Typography>

        <Typography
          variant="h6"
          sx={{
            mb: 2,
            textAlign: 'center',
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          {currentQuestion.data?.text || 'Question sans titre'}
        </Typography>

        {currentQuestion.data?.mediaUrl && (
          <Box sx={{ mb: 2, textAlign: 'center' }}>
            {currentQuestion.data.media === 'image' ? (
              <img 
                src={currentQuestion.data.mediaUrl}
                alt="Question media"
                style={{ 
                  maxWidth: '50%',
                  height: 'auto',
                  margin: '0 auto',
                  borderRadius: '8px',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <ReactPlayer
                url={currentQuestion.data.mediaUrl}
                controls
                width="50%"
                height="200px"
                style={{
                  margin: '0 auto',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              />
            )}
          </Box>
        )}

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            mt: 3
          }}
        >
          {currentQuestion.data?.type === 'multiple-choice' && (
            <RadioGroup
              value={currentAnswer || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
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

          {currentQuestion.data?.type === 'text' && (
            <TextField 
              fullWidth 
              variant="outlined" 
              placeholder="Votre réponse"
            />
          )}

          {currentQuestion.data?.type === 'dropdown' && (
            <>
              <Select
                fullWidth
                value={previewAnswers[currentQuestion.id] || ''}
                onChange={(e) => {
                  console.log('Select onChange value:', e.target.value);
                  handleAnswerChange(e.target.value);
                }}
                displayEmpty
              >
                <MenuItem value="" disabled>
                  <em>Sélectionnez une option</em>
                </MenuItem>
                {currentQuestion.data.options?.map((option: string, index: number) => (
                  <MenuItem key={index} value={option.trim()}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="textSecondary">
                Valeur sélectionnée: {previewAnswers[currentQuestion.id] || 'Aucune'}
              </Typography>
            </>
          )}

          {currentQuestion.data?.type === 'slider' && (
            <Slider 
              valueLabelDisplay="auto"
              sx={{ width: '100%', maxWidth: 400 }}
            />
          )}

          {currentQuestion.data?.type === 'rating' && (
            <Rating />
          )}

          {currentQuestion.data?.type === 'yes-no' && (
            <RadioGroup
              row
              value={currentAnswer || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
            >
              <FormControlLabel value="yes" control={<Radio />} label="Oui" />
              <FormControlLabel value="no" control={<Radio />} label="Non" />
            </RadioGroup>
          )}

          {currentQuestion.data?.type === 'date' && (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Sélectionnez une date"
                value={null}
                onChange={() => {}}
                renderInput={(params) => <TextField {...params} />}
              />
            </LocalizationProvider>
          )}
        </Box>

        <Typography
          variant="body2"
          sx={{ mt: 2, textAlign: 'center', color: 'gray' }}
        >
          Question {currentQuestion.data.questionNumber} sur {currentQuestion.data.totalQuestions}
        </Typography>
      </Box>
    );
  };

  const handleNext = () => {
    const currentNode = previewNodes[currentPreviewIndex];
    if (!currentNode) return;

    const answer = previewAnswers[currentNode.id];
    console.log('Navigating with answer:', answer);
    
    // Trouver le prochain nœud basé sur la réponse
    const matchingEdges = edges.filter((edge) => {
      const sourceMatch = edge.source === currentNode.id;
      const labelMatch = String(edge.label).toLowerCase() === String(answer).toLowerCase();
      console.log('Edge check:', edge.source, edge.label, 'vs', currentNode.id, answer);
      return sourceMatch && labelMatch;
    });

    if (matchingEdges.length > 0) {
      const nextNodeId = matchingEdges[0].target;
      console.log('Next node found:', nextNodeId);
      
      // Mettre à jour la liste des nœuds à afficher
      if (flowRef.current) {
        const nodes = flowRef.current.getNodes();
        const updatedNodes = getOrderedNodesFromFlow(nodes, nextNodeId);
        console.log('Updated preview nodes:', updatedNodes);
        setPreviewNodes(updatedNodes);
        setCurrentPreviewIndex(0);
      }
    } else if (!currentNode.data?.isCritical) {
      // Si pas d'edge correspondant et que ce n'est pas une question critique
      setCurrentPreviewIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (questionPath.length <= 1) return;

    const newPath = [...questionPath];
    newPath.pop();
    setQuestionPath(newPath);

    const previousNodeId = newPath[newPath.length - 1];
    
    if (flowRef.current) {
      const nodes = flowRef.current.getNodes();
      const previousNode = nodes.find(n => n.id === previousNodeId);
      if (previousNode?.data?.isCritical) {
        const answer = previewAnswers[previousNodeId];
        const updatedNodes = getOrderedNodesFromFlow(nodes, previousNodeId, answer ? String(answer) : null);
        setPreviewNodes(updatedNodes);
      }
    }

    const previousNodeIndex = previewNodes.findIndex(node => node.id === previousNodeId);
    if (previousNodeIndex !== -1) {
      setCurrentPreviewIndex(previousNodeIndex);
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

  const getOrderedNodesFromFlow = (nodes: any[], startNodeId: string = '1', answer: string | null = null) => {
    const orderedNodes: any[] = [];
    const visited = new Set();
    let questionCounter = startNodeId === '1' ? 1 : 0;
    let totalQuestions = 0;

    const calculateTotalQuestions = (nodeId: string, visited = new Set()): number => {
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (!node) return 0;

      if (node.data?.isCritical && nodeId !== startNodeId) {
        return 1;
      }

      let count = 1;
      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      
      if (node.data?.isCritical && answer) {
        const matchingEdge = edges.find(edge => 
          edge.source === nodeId && 
          String(edge.label).toLowerCase() === String(answer).toLowerCase()
        );
        if (matchingEdge) {
          count += calculateTotalQuestions(matchingEdge.target, visited);
        }
      } else {
        outgoingEdges.forEach(edge => {
          count += calculateTotalQuestions(edge.target, visited);
        });
      }

      return count;
    };

    totalQuestions = calculateTotalQuestions(startNodeId);

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        visited.add(nodeId);

        if (questionCounter === 0) {
          const startNode = nodes.find(n => n.id === startNodeId);
          if (startNode) {
            questionCounter = startNode.data.questionNumber;
          }
        }

        const updatedNode = {
          ...node,
          data: {
            ...node.data,
            questionNumber: questionCounter,
            totalQuestions: totalQuestions
          }
        };
        orderedNodes.push(updatedNode);
        questionCounter++;
        
        if (node.data?.isCritical && answer) {
          const matchingEdge = edges.find(edge => 
            edge.source === nodeId && 
            String(edge.label).toLowerCase() === String(answer).toLowerCase()
          );
          if (matchingEdge) {
            traverse(matchingEdge.target);
          }
        } else {
          const outgoingEdges = edges.filter(edge => edge.source === nodeId);
          outgoingEdges.forEach(edge => {
            traverse(edge.target);
          });
        }
      }
    };

    traverse(startNodeId);
    return orderedNodes;
  };

  useEffect(() => {
    if (showPreview && flowRef.current) {
      const nodes = flowRef.current.getNodes();
      const orderedNodes = getOrderedNodesFromFlow(nodes);
      setPreviewNodes(orderedNodes);
    }
  }, [showPreview, edges]);

  const handleEdgesChange = useCallback((newEdges: Edge[]) => {
    setEdges(newEdges);
    if (showPreview) {
      const orderedNodes = getOrderedNodesFromFlow(previewNodes);
      setPreviewNodes(orderedNodes);
    }
  }, [showPreview]);

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
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

      <Paper sx={{ p: 3, mb: 3, height: '600px', position: 'relative' }}>
        <SurveyFlow 
          ref={flowRef}
          onAddNode={() => {
            if (flowRef.current) {
              const nodes = flowRef.current.getNodes();
              setPreviewNodes(nodes);
            }
          }} 
          onEdgesChange={handleEdgesChange}
        />
        
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

      <Dialog
        data-testid="survey-preview-dialog"
        open={showPreview}
        onClose={handleClosePreview}
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
            onClick={handlePrevious}
            disabled={currentPreviewIndex === 0}
            variant="outlined"
          >
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={
              currentPreviewIndex === previewNodes.length - 1 ||
              (previewNodes[currentPreviewIndex]?.data?.isCritical && 
               !previewAnswers[previewNodes[currentPreviewIndex]?.id])
            }
            variant="outlined"
          >
            Next
          </Button>
          <Button onClick={handleClosePreview} variant="contained">
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 