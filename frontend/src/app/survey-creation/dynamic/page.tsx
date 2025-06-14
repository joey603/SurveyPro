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
  IconButton,
  Container
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
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
import SchoolIcon from '@mui/icons-material/School';
import 'intro.js/introjs.css';
import introJs from 'intro.js';
import InfoIcon from '@mui/icons-material/Info';

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
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [completionStats, setCompletionStats] = useState({ 
    completed: 0, 
    total: 0, 
    percentage: 0 
  });
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
            console.error('Authentication token not found');
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
                }
              }
            }

            reset();
            flowRef.current.resetFlow();
          }
        } catch (error) {
          console.error('Error during reset:', error);
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
          console.error('Token d\'authentification non trouvé');
          return;
        }

        // Supprimer le média de Cloudinary
        await dynamicSurveyService.deleteMedia(node.data.media, token);
      } catch (error) {
        console.error('Erreur lors de la suppression du média:', error);
      }
    }

    // Supprimer le nœud de la question
    const updatedNodes = nodes.filter((_, i) => i !== index);
    flowRef.current.setNodes(updatedNodes);
  };

  const onSubmit = async (data: FormData) => {
    setHasAttemptedSubmit(true);
    setIsSubmitting(true);
    try {
      // Validation côté client
      if (!data.title?.trim()) {
        setNotification({
          show: true,
          message: 'Le titre du sondage est requis',
          type: 'error'
        });
        setIsSubmitting(false);
        return;
      }

      const token = localStorage.getItem('accessToken');
      if (!token) {
        setNotification({
          show: true,
          message: 'Token d\'authentification non trouvé',
          type: 'error'
        });
        setIsSubmitting(false);
        return;
      }

      if (!flowRef.current) {
        setNotification({
          show: true,
          message: 'Error referencing flow',
          type: 'error'
        });
        setIsSubmitting(false);
        return;
      }

      // Vérifier que toutes les questions ont un texte
      const allNodes = flowRef.current.getNodes();
      const emptyQuestions = allNodes.filter(node => !node.data.text?.trim());
      
      if (emptyQuestions.length > 0) {
        setNotification({
          show: true,
          message: `Please fill the text of all questions. ${emptyQuestions.length} question(s) empty.`,
          type: 'error'
        });
        setIsSubmitting(false);
        return;
      }

      // Préparer les données du sondage
      flowRef.current.reorganizeFlow();
      await new Promise(resolve => setTimeout(resolve, 500));

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
            message: '',
            type: 'info',
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
            message: error.message || 'Error creating survey',
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
      console.error('Error creating survey:', error);
      setNotification({
        show: true,
        message: error.message || 'Error creating survey',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPreview = () => {
    if (flowRef.current) {
      const nodes = flowRef.current.getNodes();
      
      // Vérification des champs vides supprimée pour le preview
      
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
      borderRadius: 3,
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
          borderRadius: '16px',
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
              min={0}
              max={10}
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

  // Start tutorial function
  const startTutorial = () => {
    // S'assurer qu'au moins une question existe pour le tutoriel
    if (flowRef.current && flowRef.current.getNodes().length === 0) {
      flowRef.current.addNewQuestion();
      
      // Attendre que les nœuds soient rendus avec un délai plus long
      setTimeout(() => {
        // Vérifier que les éléments sont bien présents dans le DOM
        const reactFlowNode = document.querySelector('.react-flow__node');
        if (reactFlowNode) {
          // Appliquer un focus/zoom sur le premier nœud avant de démarrer le tutoriel
          if (flowRef.current) {
            flowRef.current.reorganizeFlow();
            setTimeout(() => runSimpleTutorial(), 500);
          } else {
            runSimpleTutorial();
          }
        } else {
          // Si les nœuds ne sont pas encore rendus, attendre encore
          setTimeout(() => startTutorial(), 200);
        }
      }, 800); // Délai augmenté pour s'assurer que les nœuds sont rendus
    } else {
      // S'il y a déjà des nœuds, réorganiser avant de démarrer le tutoriel
      if (flowRef.current) {
        flowRef.current.reorganizeFlow();
        setTimeout(() => runSimpleTutorial(), 500);
      } else {
        runSimpleTutorial();
      }
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
    
    // S'assurer que le mode édition est fermé au début
    const isEditing = !!document.querySelector('.react-flow__node:first-child [data-intro="critical-question"]');
    if (isEditing) {
      const editButton = document.querySelector('.react-flow__node:first-child [data-intro="edit-question"]');
      if (editButton) {
        (editButton as HTMLElement).click();
        // Donner le temps à React de mettre à jour le DOM après la fermeture du mode édition
        setTimeout(() => {
          setupAndStartTutorial();
        }, 300);
        return;
      }
    }
    
    // Si nous ne sommes pas en mode édition, démarrer directement le tutoriel
    setupAndStartTutorial();
  };

  // Fonction pour configurer et démarrer le tutoriel
  const setupAndStartTutorial = () => {
    const intro = (window as any).introInstance;
    if (!intro) return;
    
    // Ajouter des styles pour le tutoriel
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
    
    // Définition des étapes du tutoriel
    const steps = [
      {
        element: '[data-intro="header"]',
        intro: "Welcome to dynamic survey creation! This tool allows you to create surveys with conditional paths based on user responses.",
        position: 'bottom'
      },
      {
        element: '[data-intro="basic-info"]',
        intro: "Start by filling in the basic information for your survey: title and description.",
        position: 'bottom'
      },
      {
        element: '[data-intro="demographic"]',
        intro: "Enable this option to collect demographic information from participants, such as age, gender, and location.",
        position: 'right'
      },
      {
        element: '[data-intro="privacy"]',
        intro: "Choose whether your survey is public or private. Private surveys are accessible only via direct link.",
        position: 'right'
      },
      {
        element: '[data-intro="flow-canvas"]',
        intro: "This is your flow creation canvas. Here, you can create and connect questions in a flowchart style.",
        position: 'top'
      },
      {
        element: '.react-flow__node:first-child',
        intro: "Each box represents a question in your survey. Click on a question to select it.",
        position: 'right'
      },
      {
        element: '.react-flow__node:first-child [data-intro="edit-question"]',
        intro: "Click on the edit icon to modify the content, type, and options of a question.",
        position: 'right'
      },
      {
        // Nous utiliserons un sélecteur spécial pour cette étape, qui sera remplacé dynamiquement
        element: '#critical-question-placeholder',
        intro: "Mark a question as 'Critical' to create different paths based on the answer. This is useful for conditional branching.",
        position: 'bottom'
      },
      {
        // New step to explain question type selection
        element: '#question-type-selector-placeholder',
        intro: "Select the type of question you want to use. Each type (text, multiple choice, etc.) provides different answer options for your survey participants.",
        position: 'bottom'
      },
      {
        // New step to explain media addition
        element: '#add-media-placeholder',
        intro: "Enhance your questions by adding images or videos. Click this button to upload media files that will be displayed with your question.",
        position: 'bottom'
      },
      {
        // New step to explain connection points and links
        element: '.react-flow__node:first-child',
        intro: "Notice the small dots at the top and bottom of each question card. These are connection points. The top point receives incoming connections, while the bottom point creates outgoing connections. Drag from one point to another to create links between questions. You can also click and drag questions to reposition them on the canvas.",
        position: 'top',
      },
      {
        element: '[data-intro="add-question"]',
        intro: "Click this button to add a new question to your survey.",
        position: 'left'
      },
      {
        element: '#reorganize-flow-placeholder',
        intro: "Use the 'Reorganize Flow' button in the top left of the canvas to automatically organize your survey flow. This helps to better visualize connections between your questions.",
        position: 'right'
      },
      {
        element: '#fullscreen-button-placeholder',
        intro: "The Fullscreen button allows you to expand the survey editor to take up the entire screen, giving you more space to work. Click it again to exit fullscreen mode.",
        position: 'left'
      },
      {
        element: '[data-intro="reset"]',
        intro: "The Reset button allows you to start over by removing all questions. Warning: this action cannot be undone!",
        position: 'top'
      },
      {
        element: '[data-intro="preview"]',
        intro: "Preview your survey to see how it will appear to participants, including conditional paths.",
        position: 'top'
      },
      {
        element: '[data-intro="submit"]',
        intro: "When you've finished designing your survey, click Submit to publish it.",
        position: 'top'
      }
    ];
    
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
      steps: steps as any // Cast to any to avoid TypeScript errors
    });
    
    // Mise à jour de la barre de progression après chaque changement
    intro.onafterchange(function(targetElement) {
      // Récupérer l'étape actuelle
      const currentStep = intro._currentStep;
      const totalSteps = intro._options.steps.length;
      
      // Mettre à jour la barre de progression
      const progressBar = document.querySelector('.introjs-progress');
      if (progressBar) {
        const progressWidth = (currentStep / (totalSteps - 1)) * 100;
        (progressBar as HTMLElement).style.width = `${progressWidth}%`;
      }
      
      // Vérifier si nous sommes à l'étape concernant la question critique
      const currentStepData = intro._options.steps[currentStep];
      if (currentStepData && typeof currentStepData.element === 'string') {
        // Gestion initiale du mode édition - l'ouvrir si ce n'est pas déjà fait
        const shouldOpenEditor = 
          currentStepData.element.includes('critical-question-placeholder') ||
          currentStepData.element.includes('question-type-selector-placeholder') ||
          currentStepData.element.includes('add-media-placeholder');
          
        if (shouldOpenEditor) {
          const editButton = document.querySelector('.react-flow__node:first-child [data-intro="edit-question"]');
          const isAlreadyEditing = !!document.querySelector('.react-flow__node:first-child [data-intro="critical-question"]');
          
          // N'ouvrir l'éditeur que s'il n'est pas déjà ouvert
          if (!isAlreadyEditing && editButton) {
              (editButton as HTMLElement).click();
            
            // Attendre que le formulaire s'ouvre pour les prochaines étapes
            setTimeout(() => {
              intro.refresh();
            }, 300);
          }
        }
        
        // Gestion de l'étape pour la question critique
        if (currentStepData.element.includes('critical-question-placeholder')) {
            setTimeout(() => {
              // Trouver la case à cocher Critical Question
              const criticalCheckbox = document.querySelector('.react-flow__node:first-child [data-intro="critical-question"]');
              
              if (criticalCheckbox) {
                // Positionner le placeholder juste au-dessus de la case à cocher pour un meilleur ciblage
                const rect = criticalCheckbox.getBoundingClientRect();
                criticalPlaceholder.style.position = 'absolute';
                criticalPlaceholder.style.top = (rect.top + window.pageYOffset) + 'px';
                criticalPlaceholder.style.left = (rect.left + window.pageXOffset) + 'px';
                criticalPlaceholder.style.width = rect.width + 'px';
                criticalPlaceholder.style.height = rect.height + 'px';
                criticalPlaceholder.style.zIndex = '9999';
                
                // Forcer intro.js à rafraîchir sa position
                intro.refresh();
                
                // Mettre en évidence visuellement la case à cocher
                (criticalCheckbox as HTMLElement).style.transition = 'all 0.3s';
                (criticalCheckbox as HTMLElement).style.boxShadow = '0 0 10px 3px rgba(102, 126, 234, 0.8)';
                
                // Réinitialiser après quelques secondes
                setTimeout(() => {
                  (criticalCheckbox as HTMLElement).style.boxShadow = '';
                }, 2000);
              }
          }, 100);
        }
        
        // Gestion de l'étape pour le sélecteur de type de question
        if (currentStepData.element.includes('question-type-selector-placeholder')) {
          setTimeout(() => {
            const typeSelector = document.querySelector('.react-flow__node:first-child [data-intro="question-type-selector"]');
            
            if (typeSelector) {
              // Positionner le placeholder juste au-dessus du sélecteur pour un meilleur ciblage
              const rect = typeSelector.getBoundingClientRect();
              questionTypePlaceholder.style.position = 'absolute';
              questionTypePlaceholder.style.top = (rect.top + window.pageYOffset) + 'px';
              questionTypePlaceholder.style.left = (rect.left + window.pageXOffset) + 'px';
              questionTypePlaceholder.style.width = rect.width + 'px';
              questionTypePlaceholder.style.height = rect.height + 'px';
              questionTypePlaceholder.style.zIndex = '9999';
              
              // Forcer intro.js à rafraîchir sa position
              intro.refresh();
              
              // Mettre en évidence visuellement le sélecteur de type
              (typeSelector as HTMLElement).style.transition = 'all 0.3s';
              (typeSelector as HTMLElement).style.boxShadow = '0 0 10px 3px rgba(102, 126, 234, 0.8)';
              
              // Réinitialiser après quelques secondes
              setTimeout(() => {
                (typeSelector as HTMLElement).style.boxShadow = '';
              }, 2000);
            }
          }, 100);
        }
        
        // Gestion de l'étape pour l'ajout de média
        if (currentStepData.element.includes('add-media-placeholder')) {
          // Utiliser un délai plus long pour assurer que le mode édition est complètement chargé
          setTimeout(() => {
            console.log("Recherche du bouton Add Media...");
            const allButtons = document.querySelectorAll('[data-intro]');
            console.log("Tous les éléments avec data-intro:", Array.from(allButtons).map(el => ({ attr: el.getAttribute('data-intro'), id: el.id })));
            
            // Fonction pour rechercher le bouton avec plusieurs tentatives
            const findAddMediaButton = (attempts = 0, maxAttempts = 5) => {
              if (attempts >= maxAttempts) {
                console.error("Bouton Add Media non trouvé après plusieurs tentatives");
                return null;
              }
              
              console.log(`Tentative ${attempts + 1} de trouver le bouton Add Media...`);
              
              // Essayer toutes les méthodes de sélection possibles
              let addMediaButton = document.querySelector('[data-intro="add-media"]');
              
              // Essayer avec une sélection plus spécifique
              if (!addMediaButton) {
                console.log("Essai avec sélecteur plus spécifique...");
                addMediaButton = document.querySelector('.react-flow__node [data-intro="add-media"]');
              }
              
              // Essayer avec la classe
              if (!addMediaButton) {
                console.log("Essai avec la classe...");
                addMediaButton = document.querySelector('.add-media-button-class');
              }
              
              // Essayer avec l'ID
              if (!addMediaButton) {
                console.log("Essai avec l'ID...");
                addMediaButton = document.getElementById('add-media-button');
              }

              // Essayer de trouver n'importe quel bouton contenant "Add Media" comme texte
              if (!addMediaButton) {
                console.log("Recherche de texte 'Add Media'...");
                const buttons = Array.from(document.querySelectorAll('button'));
                const buttonWithText = buttons.find(btn => 
                  btn.textContent && btn.textContent.includes('Add Media')
                );
                addMediaButton = buttonWithText || null;
              }
              
              if (addMediaButton) {
                console.log("Bouton Add Media trouvé:", addMediaButton);
                return addMediaButton;
              } else {
                // Attendre et réessayer si le bouton n'est pas trouvé
                console.log(`Bouton non trouvé, nouvelle tentative dans 300ms...`);
                setTimeout(() => {
                  const result = findAddMediaButton(attempts + 1, maxAttempts);
                  if (result) {
                    positionAndHighlightButton(result);
                  }
                }, 300);
                return null;
              }
            };
            
            // Fonction pour positionner et mettre en évidence le bouton
            const positionAndHighlightButton = (button: Element) => {
              // Positionner le placeholder juste au-dessus du bouton pour un meilleur ciblage
              const rect = button.getBoundingClientRect();
              console.log("Rectangle du bouton:", rect);
              addMediaPlaceholder.style.position = 'absolute';
              addMediaPlaceholder.style.top = (rect.top + window.pageYOffset) + 'px';
              addMediaPlaceholder.style.left = (rect.left + window.pageXOffset) + 'px';
              addMediaPlaceholder.style.width = rect.width + 'px';
              addMediaPlaceholder.style.height = rect.height + 'px';
              addMediaPlaceholder.style.zIndex = '9999';
              
              // Forcer intro.js à rafraîchir sa position
              intro.refresh();
              
              // Mettre en évidence visuellement le bouton d'ajout de média
              (button as HTMLElement).style.transition = 'all 0.3s';
              (button as HTMLElement).style.boxShadow = '0 0 10px 3px rgba(102, 126, 234, 0.8)';
              
              // Attribuer temporairement un ID et une classe au bouton s'il n'en a pas
              if (!button.id) button.id = 'add-media-button-temp';
              button.classList.add('add-media-button-temp-class');
              
              // Réinitialiser après quelques secondes
              setTimeout(() => {
                (button as HTMLElement).style.boxShadow = '';
              }, 2000);
            };
            
            // Lancer la recherche
            const addMediaButton = findAddMediaButton();
            if (addMediaButton) {
              positionAndHighlightButton(addMediaButton);
            }
          }, 500); // Délai augmenté pour s'assurer que le DOM est complètement chargé
        }
        
        // Gestion de l'étape pour les points de connexion
        if (currentStepData.element === '.react-flow__node:first-child' && 
            currentStepData.intro && 
            currentStepData.intro.includes('connection points')) {
          setTimeout(() => {
            // Sélectionner spécifiquement les points de connexion en haut et en bas
            const topHandle = document.querySelector('.react-flow__node:first-child .react-flow__handle-top');
            const bottomHandle = document.querySelector('.react-flow__node:first-child .react-flow__handle-bottom');
            
            // Mettre en évidence les points de connexion
            if (topHandle) {
              (topHandle as HTMLElement).style.transition = 'all 0.3s';
              (topHandle as HTMLElement).style.boxShadow = '0 0 10px 3px rgba(102, 126, 234, 0.8)';
              (topHandle as HTMLElement).style.transform = 'scale(1.5)';
            }
            
            if (bottomHandle) {
              (bottomHandle as HTMLElement).style.transition = 'all 0.3s';
              (bottomHandle as HTMLElement).style.boxShadow = '0 0 10px 3px rgba(102, 126, 234, 0.8)';
              (bottomHandle as HTMLElement).style.transform = 'scale(1.5)';
            }
            
            // Réinitialiser après quelques secondes
            setTimeout(() => {
              if (topHandle) {
                (topHandle as HTMLElement).style.boxShadow = '';
                (topHandle as HTMLElement).style.transform = '';
              }
              
              if (bottomHandle) {
                (bottomHandle as HTMLElement).style.boxShadow = '';
                (bottomHandle as HTMLElement).style.transform = '';
              }
            }, 3000);
          }, 100);
        }
        
        // Pour l'étape du bouton Reorganize Flow
        if (currentStepData.element === '#reorganize-flow-placeholder') {
          // Trouver le bouton directement par son attribut data-intro
          console.log("Recherche du bouton Reorganize Flow...");
          const allButtons = document.querySelectorAll('[data-intro]');
          console.log("Tous les éléments avec data-intro:", Array.from(allButtons).map(el => ({ attr: el.getAttribute('data-intro'), id: el.id })));
          
          // Essayer plusieurs méthodes de sélection
          let reorganizeButton = document.querySelector('[data-intro="reorganize-flow-button"]');
          
          // Si la première méthode échoue, essayer avec la classe
          if (!reorganizeButton) {
            console.log("Première méthode échouée, essai avec la classe...");
            reorganizeButton = document.querySelector('.reorganize-flow-button');
          }
          
          // Si les deux méthodes échouent, essayer avec l'ID
          if (!reorganizeButton) {
            console.log("Deuxième méthode échouée, essai avec l'ID...");
            reorganizeButton = document.getElementById('reorganize-flow-button');
          }
          
          console.log("Bouton Reorganize Flow trouvé:", reorganizeButton);
          
          if (reorganizeButton) {
            // Positionner le placeholder juste au-dessus du bouton pour un meilleur ciblage
            const rect = reorganizeButton.getBoundingClientRect();
            reorganizePlaceholder.style.position = 'absolute';
            reorganizePlaceholder.style.top = (rect.top + window.pageYOffset) + 'px';
            reorganizePlaceholder.style.left = (rect.left + window.pageXOffset) + 'px';
            reorganizePlaceholder.style.width = rect.width + 'px';
            reorganizePlaceholder.style.height = rect.height + 'px';
            reorganizePlaceholder.style.zIndex = '9999';
            
            // Forcer intro.js à rafraîchir sa position
            intro.refresh();
            
            // Mettre en évidence visuellement le bouton
            (reorganizeButton as HTMLElement).style.transition = 'all 0.3s';
            (reorganizeButton as HTMLElement).style.boxShadow = '0 0 10px 3px rgba(102, 126, 234, 0.8)';
            
            // Réinitialiser après quelques secondes
            setTimeout(() => {
              (reorganizeButton as HTMLElement).style.boxShadow = '';
            }, 2000);
          }
        }
        
        // Pour l'étape du bouton Fullscreen
        if (currentStepData.element === '#fullscreen-button-placeholder') {
          // Trouver le bouton directement par son attribut data-intro
          console.log("Recherche du bouton Fullscreen...");
          const allButtons = document.querySelectorAll('[data-intro]');
          console.log("Tous les éléments avec data-intro:", Array.from(allButtons).map(el => ({ attr: el.getAttribute('data-intro'), id: el.id })));
          
          // Essayer plusieurs méthodes de sélection
          let fullscreenButton = document.querySelector('[data-intro="fullscreen-button"]');
          
          // Si la première méthode échoue, essayer avec la classe
          if (!fullscreenButton) {
            console.log("Première méthode échouée, essai avec la classe...");
            fullscreenButton = document.querySelector('.fullscreen-button');
          }
          
          // Si les deux méthodes échouent, essayer avec l'ID
          if (!fullscreenButton) {
            console.log("Deuxième méthode échouée, essai avec l'ID...");
            fullscreenButton = document.getElementById('fullscreen-button');
          }
          
          console.log("Bouton Fullscreen trouvé:", fullscreenButton);
          
          if (fullscreenButton) {
            // Positionner le placeholder juste au-dessus du bouton pour un meilleur ciblage
            const rect = fullscreenButton.getBoundingClientRect();
            fullscreenPlaceholder.style.position = 'absolute';
            fullscreenPlaceholder.style.top = (rect.top + window.pageYOffset) + 'px';
            fullscreenPlaceholder.style.left = (rect.left + window.pageXOffset) + 'px';
            fullscreenPlaceholder.style.width = rect.width + 'px';
            fullscreenPlaceholder.style.height = rect.height + 'px';
            fullscreenPlaceholder.style.zIndex = '9999';
            
            // Forcer intro.js à rafraîchir sa position
            intro.refresh();
            
            // Mettre en évidence visuellement le bouton
            (fullscreenButton as HTMLElement).style.transition = 'all 0.3s';
            (fullscreenButton as HTMLElement).style.boxShadow = '0 0 10px 3px rgba(102, 126, 234, 0.8)';
            
            // Réinitialiser après quelques secondes
            setTimeout(() => {
              (fullscreenButton as HTMLElement).style.boxShadow = '';
            }, 2000);
          }
        }
      }
    });
    
    // Créer les placeholders pour les éléments spéciaux
    const criticalPlaceholder = document.createElement('div');
    criticalPlaceholder.id = 'critical-question-placeholder';
    criticalPlaceholder.style.position = 'absolute';
    criticalPlaceholder.style.width = '1px';
    criticalPlaceholder.style.height = '1px';
    criticalPlaceholder.style.opacity = '0';
    document.body.appendChild(criticalPlaceholder);
    
    const questionTypePlaceholder = document.createElement('div');
    questionTypePlaceholder.id = 'question-type-selector-placeholder';
    questionTypePlaceholder.style.position = 'absolute';
    questionTypePlaceholder.style.width = '1px';
    questionTypePlaceholder.style.height = '1px';
    questionTypePlaceholder.style.opacity = '0';
    document.body.appendChild(questionTypePlaceholder);
    
    const addMediaPlaceholder = document.createElement('div');
    addMediaPlaceholder.id = 'add-media-placeholder';
    addMediaPlaceholder.style.position = 'absolute';
    addMediaPlaceholder.style.width = '1px';
    addMediaPlaceholder.style.height = '1px';
    addMediaPlaceholder.style.opacity = '0';
    document.body.appendChild(addMediaPlaceholder);
    
    const reorganizePlaceholder = document.createElement('div');
    reorganizePlaceholder.id = 'reorganize-flow-placeholder';
    reorganizePlaceholder.style.position = 'absolute';
    reorganizePlaceholder.style.width = '1px';
    reorganizePlaceholder.style.height = '1px';
    reorganizePlaceholder.style.opacity = '0';
    document.body.appendChild(reorganizePlaceholder);
    
    const fullscreenPlaceholder = document.createElement('div');
    fullscreenPlaceholder.id = 'fullscreen-button-placeholder';
    fullscreenPlaceholder.style.position = 'absolute';
    fullscreenPlaceholder.style.width = '1px';
    fullscreenPlaceholder.style.height = '1px';
    fullscreenPlaceholder.style.opacity = '0';
    document.body.appendChild(fullscreenPlaceholder);
    
    // Nettoyer à la sortie
    intro.onexit(function() {
      if (document.head.contains(styleEl)) {
        document.head.removeChild(styleEl);
      }
      // Supprimer les placeholders
      if (document.body.contains(criticalPlaceholder)) {
        document.body.removeChild(criticalPlaceholder);
      }
      if (document.body.contains(reorganizePlaceholder)) {
        document.body.removeChild(reorganizePlaceholder);
      }
      if (document.body.contains(questionTypePlaceholder)) {
        document.body.removeChild(questionTypePlaceholder);
      }
      if (document.body.contains(addMediaPlaceholder)) {
        document.body.removeChild(addMediaPlaceholder);
      }
      if (document.body.contains(fullscreenPlaceholder)) {
        document.body.removeChild(fullscreenPlaceholder);
      }
    });
    
    // Démarrer le tutoriel
    intro.start();
  };

  // Fonction pour mettre à jour les statistiques de complétion
  const updateCompletionStats = useCallback(() => {
    if (flowRef.current) {
      const nodes = flowRef.current.getNodes();
      const total = nodes.length;
      const completed = nodes.filter(node => node.data.text?.trim()).length;
      const percentage = Math.round((completed / total) * 100);
      
      setCompletionStats({
        completed,
        total,
        percentage
      });
    }
  }, []);

  // Mettre à jour les statistiques chaque fois que les nœuds changent
  useEffect(() => {
    updateCompletionStats();
    
    // Créer un intervalle pour vérifier périodiquement les changements
    const interval = setInterval(updateCompletionStats, 1000);
    
    return () => clearInterval(interval);
  }, [updateCompletionStats]);

  // Écouter les changements aux nœuds via SurveyFlow
  const handleNodesChange = useCallback(() => {
    updateCompletionStats();
  }, [updateCompletionStats]);

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
          PaperProps={{
            sx: {
              borderRadius: 3
            }
          }}
        >
          <DialogContent>
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
                    gap: 1,
                    borderRadius: 2
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
                      onClick={() => {
                        navigator.clipboard.writeText(notification.link!);
                        setNotification(prev => ({
                          ...prev,
                          message: 'Link copied to clipboard!',
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
                  Share this link only with people you want to invite to answer your survey.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  This link will also be displayed in your analytics dashboard.
                </Typography>
              </Box>
            ) : (
              <Alert 
                severity={notification.type}
              >
                {notification.message}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'center' }}>
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
                },
                minWidth: '120px'
              }}
            >
              OK
            </Button>
          </DialogActions>
        </Dialog>
      )}
      
      {/* Styles globaux pour le tutoriel */}
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
      
      {/* Paper principal contenant tous les éléments */}
      <Paper elevation={3} sx={{ mb: 3, overflow: 'hidden', borderRadius: 4 }}>
        {/* Entête en anglais avec titre et sous-titre centrés */}
        <Box 
          data-intro="header"
          sx={{ 
            p: 3,
            bgcolor: 'primary.main', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white',
            textAlign: 'center'
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Dynamic Survey Creation
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
            Create surveys with conditional paths and customized questions
          </Typography>
        </Box>
        
        {/* Section des informations de base */}
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
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
            rules={{ required: 'Title is required' }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                label="Survey Title"
                error={!!error}
                helperText={error?.message}
                sx={{ mb: 2 }}
                data-intro="basic-info"
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
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography>Enable Demographic Questions</Typography>
                <Tooltip 
                  title="Enable this option to collect demographic information (age, gender, education, city)"
                  placement="right"
                  TransitionComponent={Zoom}
                  arrow
                >
                  <InfoIcon sx={{ ml: 1, color: '#667eea', fontSize: 20, cursor: 'help' }} />
                </Tooltip>
              </Box>
            }
            data-intro="demographic"
          />

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
        </Box>

        {/* Flow section */}
        <Box 
          sx={{ p: 3, height: '620px', position: 'relative' }}
          data-intro="flow-canvas"
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ color: '#1a237e' }}>
              Survey Flow
            </Typography>
            <Tooltip 
              title="Create conditional branching by connecting questions based on answers"
              placement="right"
              TransitionComponent={Zoom}
              arrow
            >
              <InfoIcon sx={{ ml: 1, color: '#667eea', fontSize: 20, cursor: 'help' }} />
            </Tooltip>
          </Box>
          
          <Box sx={{ height: 'calc(100% - 40px)', position: 'relative' }}>
          <SurveyFlow 
            ref={flowRef}
            onAddNode={() => {
              if (flowRef.current) {
                const nodes = flowRef.current.getNodes();
                setPreviewNodes(nodes);
                updateCompletionStats();
              }
            }} 
            onEdgesChange={handleEdgesChange}
            hasAttemptedSubmit={hasAttemptedSubmit}
            onNodesChange={handleNodesChange}
          />
          
          <Tooltip title="Add Question" placement="left">
            <Fab 
              color="primary" 
              aria-label="add question"
              data-intro="add-question"
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
          </Box>
        </Box>
      </Paper>

      {/* Indicateur de complétion des questions */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          mt: 2, 
          mb: 2, 
          gap: 2 
        }}
      >
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasAttemptedSubmit && completionStats.completed < completionStats.total 
              ? 'rgba(211, 47, 47, 0.7)' 
              : completionStats.completed === completionStats.total 
                ? 'success.main' 
                : 'text.secondary'
          }}
        >
          Questions completed: {completionStats.completed}/{completionStats.total} ({completionStats.percentage}%)
        </Typography>
        <Box 
          sx={{ 
            width: '200px', 
            height: '8px', 
            bgcolor: 'grey.200', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}
        >
          <Box 
            sx={{ 
              width: `${completionStats.percentage}%`, 
              height: '100%', 
              bgcolor: hasAttemptedSubmit && completionStats.completed < completionStats.total 
                ? 'rgba(211, 47, 47, 0.6)' 
                : completionStats.completed === completionStats.total 
                  ? 'success.main' 
                  : 'primary.main',
              transition: 'width 0.3s ease, background-color 0.3s ease'
            }} 
          />
        </Box>
      </Box>

      {/* Boutons d'action en dehors du Paper principal */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mb: 3 }}>
        <Button
          onClick={handleResetSurvey}
          variant="contained"
          startIcon={<DeleteIcon />}
          disabled={isSubmitting}
          data-intro="reset"
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
          startIcon={<VisibilityIcon />}
          disabled={isSubmitting}
          data-intro="preview"
          sx={{
            background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
            color: 'white',
            boxShadow: 'none',
            '&:hover': {
              background: 'linear-gradient(135deg, #1976d2 0%, #2196f3 100%)',
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

      <Dialog
        data-testid="survey-preview-dialog"
        open={showPreview}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3
          }
        }}
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
            color="primary"
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
            color="primary"
          >
            Next
          </Button>
          <Button 
            onClick={handleClosePreview} 
            variant="contained"
            color="secondary"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          sx: {
            borderRadius: 3
          }
        }}
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

      {/* Bouton tutorial flottant */}
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
            zIndex: 1000
          }}
        >
          <SchoolIcon />
        </Fab>
      </Tooltip>
    </Box>
  );
} 