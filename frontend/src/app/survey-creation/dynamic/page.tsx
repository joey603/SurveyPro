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
  Rating,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
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
import { dynamicSurveyService } from '@/utils/dynamicSurveyService';
import { useRouter } from 'next/navigation';
import { SurveyFlowRef } from './types/SurveyFlowTypes';
import Lottie from "lottie-react";
import validationAnimation from "@/assets/animation-check.json";
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Zoom } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

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
  isPrivate: boolean;
}

interface PreviewAnswer {
  [key: string]: string | number;
}

const questionTypes = [
  { value: 'text', label: 'Free Text' },
  { value: 'yes-no', label: 'Yes/No' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'slider', label: 'Slider' },
  { value: 'rating', label: 'Rating (Stars)' },
  { value: 'date', label: 'Date Picker' },
];

interface NotificationState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  link?: string;
  action?: () => void;
}

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
      isPrivate: false,
    },
  });

  const [previewAnswers, setPreviewAnswers] = useState<PreviewAnswer>({});

  const [questionPath, setQuestionPath] = useState<string[]>(['1']);

  // Ajouter un state pour l'historique des questions
  const [questionHistory, setQuestionHistory] = useState<string[]>(['1']);

  const router = useRouter();

  // Ajouter l'état pour les notifications
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    message: '',
    type: 'info'
  });

  // Ajouter ce state pour gérer la visibilité du dialog
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Ajouter l'état de chargement
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const findNextQuestions = (currentQuestionId: string, answer: any) => {
    const edges = previewNodes.filter(node => 
      node.id.startsWith(`${currentQuestionId}-`) || 
      (node.data?.sourceHandle === currentQuestionId && node.data?.condition === answer)
    );

    return edges.map(edge => edge.id);
  };

  const handleResetSurvey = () => {
    setConfirmDialog({
      open: true,
      title: 'Reset Survey',
      message: 'Are you sure you want to reset the survey? All progress will be lost.',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('accessToken');
          if (!token) {
            setNotification({
              show: true,
              message: 'Authentication token not found',
              type: 'error'
            });
            return;
          }

          if (flowRef.current) {
            const nodes = flowRef.current.getNodes();
            
            for (const node of nodes) {
              if (node.data?.media) {
                try {
                  await dynamicSurveyService.deleteMedia(node.data.media, token);
                } catch (error) {
                  console.error('Error deleting media:', error);
                  setNotification({
                    show: true,
                    message: `Error deleting media for question ${node.data.questionNumber}`,
                    type: 'warning'
                  });
                }
              }
            }

            reset();
            flowRef.current.resetFlow();
            
            setNotification({
              show: true,
              message: 'Survey reset successfully',
              type: 'success'
            });
          }
        } catch (error) {
          console.error('Error during reset:', error);
          setNotification({ 
            show: true,
            message: 'Error resetting survey',
            type: 'error'
          });
        }
        setConfirmDialog(prev => ({ ...prev, open: false }));
      }
    });
  };

  const handleDeleteQuestion = async (index: number) => {
    if (!flowRef.current) return;
    
    const nodes = flowRef.current.getNodes();
    const node = nodes[index];
    
    // Vérifier si le nœud existe et a un média
    if (node?.data?.media) {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setNotification({
            show: true,
            message: 'Token d\'authentification non trouvé',
            type: 'error'
          });
          return;
        }

        // Supprimer le média de Cloudinary
        await dynamicSurveyService.deleteMedia(node.data.media, token);
      } catch (error) {
        console.error('Erreur lors de la suppression du média:', error);
        setNotification({
          show: true,
          message: 'Erreur lors de la suppression du média, mais la question sera supprimée',
          type: 'warning'
        });
      }
    }

    // Supprimer le nœud de la question
    const updatedNodes = nodes.filter((_, i) => i !== index);
    flowRef.current.setNodes(updatedNodes);

    // Afficher une notification de succès
    setNotification({
      show: true,
      message: 'Question supprimée avec succès',
      type: 'success'
    });
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Validation côté client
      if (!data.title?.trim()) {
        setNotification({
          show: true,
          message: 'Le titre du sondage est requis',
          type: 'error'
        });
        return;
      }

      const token = localStorage.getItem('accessToken');
      if (!token) {
        setNotification({
          show: true,
          message: 'Token d\'authentification non trouvé',
          type: 'error'
        });
        return;
      }

      if (!flowRef.current) {
        setNotification({
          show: true,
          message: 'Erreur de référence au flow',
          type: 'error'
        });
        return;
      }

      // Préparer les données du sondage
      flowRef.current.reorganizeFlow();
      await new Promise(resolve => setTimeout(resolve, 500));

      const allNodes = flowRef.current.getNodes();
      const cleanedNodes = allNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          mediaUrl: node.data.mediaUrl || '',
          media: node.data.media || '',
          onCreatePaths: undefined,
          onChange: undefined
        }
      }));

      const surveyData = {
        title: data.title.trim(),
        description: data.description?.trim() || '',
        demographicEnabled: data.demographicEnabled || false,
        isPrivate: data.isPrivate || false,
        nodes: cleanedNodes,
        edges
      };

      // Si le sondage est privé, montrer d'abord la boîte de dialogue
      if (data.isPrivate) {
        try {
          const response = await dynamicSurveyService.createDynamicSurvey(surveyData, token);
          const surveyLink = `${window.location.origin}/survey-answer?surveyId=${response._id}`;
          
          setNotification({
            show: true,
            message: 'Votre sondage privé a été créé avec succès !',
            type: 'success',
            link: surveyLink,
            action: () => {
              setShowSuccess(true);
              setTimeout(() => {
                router.push('/survey-answer');
              }, 2000);
            }
          });
        } catch (error: any) {
          setNotification({
            show: true,
            message: error.message || 'Erreur lors de la création du sondage',
            type: 'error'
          });
        }
      } else {
        // Pour les sondages publics, comportement inchangé
        const response = await dynamicSurveyService.createDynamicSurvey(surveyData, token);
        setShowSuccess(true);
        setTimeout(() => {
          router.push('/survey-answer');
        }, 2000);
      }

    } catch (error: any) {
      console.error('Erreur lors de la création du sondage:', error);
      setNotification({
        show: true,
        message: error.message || 'Erreur lors de la création du sondage',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPreview = () => {
    if (flowRef.current) {
      const nodes = flowRef.current.getNodes();
      const orderedNodes = getOrderedNodesFromFlow(nodes);
      setPreviewNodes(orderedNodes);
      // Réinitialiser tous les états liés au preview
      setCurrentPreviewIndex(watch('demographicEnabled') ? -1 : 0);
      setQuestionPath(['1']);
      setQuestionHistory(['1']);
      setPreviewAnswers({}); // Réinitialiser les réponses
      setShowPreview(true);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    // Réinitialiser tous les états
    setCurrentPreviewIndex(0);
    setPreviewNodes([]);
    setPreviewAnswers({});
    setQuestionPath(['1']);
    setQuestionHistory(['1']);
  };

  const renderPreviewQuestion = () => {
    const questionContainerStyle = {
      p: 3,
      backgroundColor: 'white',
      borderRadius: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      mb: 3
    };

    // Afficher les questions démographiques si on est à l'index -1
    if (currentPreviewIndex === -1) {
      return (
        <Box sx={questionContainerStyle}>
          <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
            Demographic Information
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <RadioGroup>
              <FormControlLabel value="male" control={<Radio />} label="Male" />
              <FormControlLabel value="female" control={<Radio />} label="Female" />
              <FormControlLabel value="other" control={<Radio />} label="Other" />
            </RadioGroup>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Date of Birth"
                value={null}
                onChange={() => {}}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>

            <Select fullWidth displayEmpty defaultValue="">
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
              displayEmpty
              defaultValue=""
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

          <Typography
            variant="body2"
            sx={{ mt: 2, textAlign: 'center', color: 'gray' }}
          >
            Demographic Questions
          </Typography>
        </Box>
      );
    }

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
          {currentQuestion.data?.text || 'Untitled Question'}
        </Typography>

        {currentQuestion.data?.mediaUrl && (
          <Box sx={{ mb: 2, textAlign: 'center' }}>
            {isImageFile(currentQuestion.data.mediaUrl) ? (
              <img 
                src={currentQuestion.data.mediaUrl}
                alt="Question media"
                style={{ 
                  maxWidth: '100%',
                  height: 'auto',
                  margin: '0 auto',
                  borderRadius: '8px',
                  objectFit: 'contain',
                  maxHeight: '400px'
                }}
                onError={(e) => {
                  console.error('Image loading error:', e);
                  setNotification({
                    show: true,
                    message: 'Error loading image in preview. Please check the URL.',
                    type: 'error'
                  });
                }}
              />
            ) : (
              <ReactPlayer
                url={currentQuestion.data.mediaUrl}
                controls
                width="100%"
                height="300px"
                style={{
                  margin: '0 auto',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
                onError={(e) => {
                  console.error('ReactPlayer error:', e);
                  setNotification({
                    show: true,
                    message: 'Error loading media in preview. Please check the URL.',
                    type: 'error'
                  });
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
              placeholder="Your answer"
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
                  <em>Select an option</em>
                </MenuItem>
                {currentQuestion.data.options?.map((option: string, index: number) => (
                  <MenuItem key={index} value={option.trim()}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="textSecondary">
                Selected value: {previewAnswers[currentQuestion.id] || 'None'}
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
              <FormControlLabel value="yes" control={<Radio />} label="Yes" />
              <FormControlLabel value="no" control={<Radio />} label="No" />
            </RadioGroup>
          )}

          {currentQuestion.data?.type === 'date' && (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Select a date"
                value={null}
                onChange={() => {}}
                renderInput={(params) => <TextField {...params} />}
              />
            </LocalizationProvider>
          )}
        </Box>

        
      </Box>
    );
  };

  const handleNext = () => {
    if (currentPreviewIndex === -1) {
      setCurrentPreviewIndex(0);
      // Initialiser l'historique avec la première question
      setQuestionHistory(['1']);
      return;
    }

    const currentNode = previewNodes[currentPreviewIndex];
    if (!currentNode) return;

    const answer = previewAnswers[currentNode.id];
    console.log('Navigating with answer:', answer);
    
    const matchingEdges = edges.filter((edge) => {
      const sourceMatch = edge.source === currentNode.id;
      const labelMatch = String(edge.label).toLowerCase() === String(answer).toLowerCase();
      return sourceMatch && labelMatch;
    });

    if (matchingEdges.length > 0) {
      const nextNodeId = matchingEdges[0].target;
      console.log('Next node found:', nextNodeId);
      
      // Mettre à jour l'historique avec le prochain nœud
      setQuestionHistory(prev => [...prev, nextNodeId]);
      
      if (flowRef.current) {
        const nodes = flowRef.current.getNodes();
        const updatedNodes = getOrderedNodesFromFlow(nodes, nextNodeId);
        setPreviewNodes(updatedNodes);
        setCurrentPreviewIndex(0);
      }
    } else if (!currentNode.data?.isCritical) {
      setCurrentPreviewIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    // Si nous sommes sur la première question et que les questions démographiques sont activées
    if (currentPreviewIndex === 0 && watch('demographicEnabled') && !questionHistory.length) {
      setCurrentPreviewIndex(-1);
      return;
    }

    // Si nous n'avons pas d'historique ou qu'un seul élément, ne rien faire
    if (questionHistory.length <= 1) return;

    // Retirer la question actuelle de l'historique
    const newHistory = [...questionHistory];
    newHistory.pop();
    setQuestionHistory(newHistory);

    // Obtenir l'ID de la question précédente
    const previousNodeId = newHistory[newHistory.length - 1];
    
    if (flowRef.current) {
      const nodes = flowRef.current.getNodes();
      const updatedNodes = getOrderedNodesFromFlow(nodes, previousNodeId);
      setPreviewNodes(updatedNodes);
      setCurrentPreviewIndex(0);
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

  // Pour récupérer tous les sondages
  const fetchSurveys = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    
    try {
      const surveys = await dynamicSurveyService.getDynamicSurveys(token);
      // Utiliser les données des sondages
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Pour récupérer un sondage spécifique
  const fetchSurvey = async (id: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    
    try {
      const survey = await dynamicSurveyService.getDynamicSurveyById(id, token);
      // Utiliser les données du sondage
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Pour mettre à jour un sondage
  const updateSurvey = async (id: string, data: any) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    
    try {
      const updatedSurvey = await dynamicSurveyService.updateDynamicSurvey(id, data, token);
      // Gérer la mise à jour réussie
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Pour supprimer un sondage
  const deleteSurvey = async (id: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    
    try {
      await dynamicSurveyService.deleteDynamicSurvey(id, token);
      // Gérer la suppression réussie
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
      {/* Notification */}
      {notification.show && (
        <Dialog
          open={notification.show}
          onClose={() => {
            setNotification(prev => ({ ...prev, show: false }));
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogContent>
            <Alert 
              severity={notification.type}
              sx={{ mb: notification.link ? 2 : 0 }}
            >
              {notification.message}
            </Alert>
            {notification.link && (
              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Voici le lien pour répondre à votre sondage privé :
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
                  <Tooltip title="Copier le lien">
                    <IconButton
                      onClick={() => {
                        navigator.clipboard.writeText(notification.link!);
                        setNotification(prev => ({
                          ...prev,
                          message: 'Lien copié dans le presse-papiers !',
                          type: 'success'
                        }));
                      }}
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
                  Partagez ce lien uniquement avec les personnes que vous souhaitez inviter à répondre à votre sondage.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setNotification(prev => ({ ...prev, show: false }));
                if (notification.action) {
                  notification.action();
                }
              }}
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                }
              }}
            >
              OK
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
          Basic Information
        </Typography>
        
        <Controller
          name="title"
          control={control}
          defaultValue=""
          rules={{ required: 'Title is required' }}
          render={({ field, fieldState: { error } }) => (
            <TextField
              {...field}
              fullWidth
              label="Survey Title"
              error={!!error}
              helperText={error?.message}
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

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
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
          disabled={isSubmitting}
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
          disabled={isSubmitting}
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
          disabled={isSubmitting}
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
            disabled={questionHistory.length <= 1}
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

      {/* Dialog de confirmation */}
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
    </Box>
  );
} 