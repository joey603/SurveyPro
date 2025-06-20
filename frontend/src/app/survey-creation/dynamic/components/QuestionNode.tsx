"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Paper,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
  Rating,
  Popover,
  Checkbox,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ReactPlayer from 'react-player';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { dynamicSurveyService } from '@/utils/dynamicSurveyService';

interface QuestionNodeData {
  id: string;
  type: string;
  text: string;
  options: string[];
  media?: string;
  mediaUrl?: string;
  isCritical: boolean;
  questionNumber: number;
  selectedDate?: Date | null;
  isEditing?: boolean;
  onChange?: (data: Partial<QuestionNodeData>) => void;
  onCreatePaths?: (nodeId: string, options: string[]) => void;
}

interface QuestionNodeProps {
  data: QuestionNodeData;
  isConnectable: boolean;
  id: string;
}

const questionTypes = [
  { value: 'text', label: 'Text' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'yes-no', label: 'Yes/No' },
  { value: 'slider', label: 'Slider' },
  { value: 'rating', label: 'Rating (Stars)' },
  { value: 'date', label: 'Date Picker' },
];

const criticalQuestionTypes = [
  { value: 'yes-no', label: 'Yes/No' },
  { value: 'dropdown', label: 'Dropdown' },
];

const QuestionNode = ({ data, isConnectable, id }: QuestionNodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [questionData, setQuestionData] = useState({
    ...data,
    isCritical: data.isCritical || false,
  });
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mediaTracker, setMediaTracker] = useState<Record<string, string>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIOSTooltip, setShowIOSTooltip] = useState(false);
  
  // Use a ref to track previous editing state
  const prevEditingRef = useRef(false);
  // Référence pour le bouton d'édition
  const editButtonRef = useRef<HTMLButtonElement>(null);
  // Référence pour la case à cocher Critical Question
  const criticalCheckboxRef = useRef<HTMLButtonElement>(null);
  // Référence pour le bouton d'ajout de média
  const addMediaButtonRef = useRef<HTMLButtonElement>(null);
  // Référence pour le bouton de suppression de média
  const deleteMediaButtonRef = useRef<HTMLButtonElement>(null);
  // Référence pour le bouton d'ajout d'option
  const addOptionButtonRef = useRef<HTMLButtonElement>(null);

  // Détection iOS une seule fois au chargement du composant
  const isIOS = typeof navigator !== 'undefined' ? /iPad|iPhone|iPod/.test(navigator.userAgent) : false;

  // Vérifier si on est en mode fullscreen
  useEffect(() => {
    const checkFullscreen = () => {
      const isFullscreenMode = document.fullscreenElement || 
                              (document as any).webkitFullscreenElement ||
                              (document as any).mozFullScreenElement ||
                              (document as any).msFullscreenElement;
      setIsFullscreen(!!isFullscreenMode);
    };
    
    checkFullscreen();
    
    // Écouter les changements de mode fullscreen
    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    document.addEventListener('mozfullscreenchange', checkFullscreen);
    document.addEventListener('MSFullscreenChange', checkFullscreen);
    
    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
      document.removeEventListener('mozfullscreenchange', checkFullscreen);
      document.removeEventListener('MSFullscreenChange', checkFullscreen);
    };
  }, []);
  
  // Fonction pour obtenir le conteneur pour le portail
  const getPopoverContainer = () => {
    if (isFullscreen) {
      return document.getElementById('fullscreen-popover-container') || undefined;
    }
    return undefined;
  };

  // Synchroniser l'état local avec les props
  useEffect(() => {
    // Mettre à jour l'état local lorsque les props changent
    setQuestionData({
      ...data,
      isCritical: data.isCritical || false,
    });
    
    console.log("QuestionNode received new props:", data);
  }, [data]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLoadingMedia(true);
      try {
        // Simuler un upload vers un serveur
        const fakeUploadUrl = URL.createObjectURL(file);
        const newData = {
          ...questionData,
          mediaUrl: fakeUploadUrl,
          media: file.type.startsWith('image/') ? 'image' : 'video'
        };
        updateNodeData(newData);
      } catch (error) {
        console.error('Error uploading file:', error);
      } finally {
        setLoadingMedia(false);
      }
    }
  };

  const handleMediaUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    const mediaType = url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'video';
    updateNodeData({
      ...questionData,
      mediaUrl: url,
      media: mediaType
    });
  };

  const handleTypeClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleTypeClose = () => {
    setAnchorEl(null);
  };

  const handleCriticalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isCritical = event.target.checked;
    console.log("Critical change:", isCritical);
    
    let newType = isCritical ? 'yes-no' : 'text';
    let newOptions: string[] = [];
    
    // Définir les options par défaut selon le type de question
    if (isCritical) {
      if (newType === 'yes-no') {
        newOptions = ['Yes', 'No'];
      } else if (newType === 'dropdown') {
        newOptions = ['Option 1', 'Option 2', 'Option 3'];
      }
    }
    
    const newData = { 
      ...questionData, 
      isCritical,
      type: newType,
      options: newOptions
    };
    
    updateNodeData(newData);
    
    // Créer les chemins après la mise à jour des données
    if (data.onCreatePaths) {
      if (isCritical) {
        console.log("Creating paths for critical question");
        data.onCreatePaths(data.id, newOptions.length > 0 ? newOptions : ['Yes', 'No']);
      } else {
        console.log("Removing paths");
        data.onCreatePaths(data.id, []);
      }
    }
  };

  const handleTypeSelect = (type: string) => {
    console.log("Type selected:", type);
    
    const newData = { ...questionData, type };
    
    if (questionData.isCritical && data.onCreatePaths) {
      if (type === 'yes-no') {
        console.log("Creating Yes/No paths");
        data.onCreatePaths(data.id, ['Yes', 'No']);
      } else if (type === 'dropdown') {
        const defaultOptions = ['Option 1', 'Option 2', 'Option 3'];
        newData.options = defaultOptions;
        console.log("Creating dropdown paths:", defaultOptions);
        data.onCreatePaths(data.id, defaultOptions);
      }
    }
    
    updateNodeData(newData);
    handleTypeClose();
  };

  const handleOptionsChange = (newOptions: string[]) => {
    const updatedData = { ...questionData, options: newOptions };
    
    // Mettre à jour les chemins pour les questions de type dropdown
    if (questionData.isCritical && questionData.type === 'dropdown' && data.onCreatePaths) {
      data.onCreatePaths(data.id, newOptions);
    }
    
    updateNodeData(updatedData);
  };

  const handleMediaUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Token not found');

      const result = await dynamicSurveyService.uploadMedia(file, token);

      // Mark old media for deletion if it exists
      if (data.media) {
        setMediaTracker((prev) => ({
          ...prev,
          [data.media as string]: 'to_delete'
        }));
      }

      if (data.onChange) {
        data.onChange({
          ...data,
          mediaUrl: result.url,
          media: result.public_id
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Error uploading media');
    } finally {
      setIsUploading(false);
    }
  }, [data]);

  const handleMediaDelete = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Token not found');

      if (data.media) {
        await dynamicSurveyService.deleteMedia(data.media, token);
      }

      if (data.onChange) {
        data.onChange({
          ...data,
          mediaUrl: '',
          media: ''
        });
      }

    } catch (error) {
      console.error('Deletion error:', error);
      setUploadError('Error deleting media');
    }
  }, [data]);

  const renderQuestionFields = () => {
    switch (questionData.type) {
      case 'multiple-choice':
      case 'dropdown':
        return (
          <Box>
            {questionData.options.map((option, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...questionData.options];
                    newOptions[index] = e.target.value;
                    handleOptionsChange(newOptions);
                  }}
                  sx={{ 
                    '& .MuiInputBase-root': {
                      minHeight: '48px', // Taille minimale recommandée pour les zones tactiles
                    }
                  }}
                  InputProps={{
                    sx: { fontSize: { xs: '0.8rem', sm: '0.875rem' } }
                  }}
                  InputLabelProps={{
                    sx: { fontSize: { xs: '0.8rem', sm: '0.875rem' } }
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => {
                    const newOptions = questionData.options.filter((_, i) => i !== index);
                    handleOptionsChange(newOptions);
                  }}
                  sx={{ color: '#ff4444' }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <button
              ref={addOptionButtonRef}
              onClick={() => {
                // S'exécute uniquement pour les vrais clics (non simulés)
                if (!(window as any).touchDetected) {
                  // Sélectionner la carte
                  selectCard();
                  // Ajouter une nouvelle option
                  const newOptions = [...questionData.options, `Option ${questionData.options.length + 1}`];
                  handleOptionsChange(newOptions);
                }
              }}
              data-intro="add-option-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '48px',
                height: 'auto',
                width: 'auto',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                background: 'white',
                color: '#1976d2',
                fontSize: window.innerWidth < 600 ? '0.7rem' : '0.875rem',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                outline: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                position: 'relative',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Add Option</span>
            </button>
          </Box>
        );

      case 'yes-no':
      case 'slider':
      case 'rating':
      case 'date':
      default:
        return null;
    }
  };

  const updateNodeData = useCallback((newData: typeof questionData) => {
    setQuestionData(newData);
    // Propagate changes to parent node
    if (data.onChange) {
      data.onChange({
        ...data,
        ...newData
      });
    }
  }, [data]);

  // Notify parent when editing state changes - only when it actually changes
  useEffect(() => {
    // Only notify parent when the editing state actually changes
    if (isEditing !== prevEditingRef.current && data.onChange) {
      prevEditingRef.current = isEditing;
      
      // Create an object with all the data properties that are expected by the interface
      const nodeUpdate: Partial<QuestionNodeData> = {};
      
      // Set a custom property on the node that SurveyFlow can check
      const customData = {
        _editingState: isEditing
      };
      
      // Use type assertion to add our custom property
      data.onChange(Object.assign(nodeUpdate, customData) as Partial<QuestionNodeData>);
    }
  }, [isEditing, data]);

  // Fonction pour changer l'état critique avec un événement direct
  const toggleCritical = useCallback(() => {
    const newCriticalState = !questionData.isCritical;
    console.log("Toggling critical state to:", newCriticalState);
    
    let newType = newCriticalState ? 'yes-no' : 'text';
    let newOptions: string[] = [];
    
    // Définir les options par défaut selon le type de question
    if (newCriticalState) {
      if (newType === 'yes-no') {
        newOptions = ['Yes', 'No'];
      } else if (newType === 'dropdown') {
        newOptions = ['Option 1', 'Option 2', 'Option 3'];
      }
    }
    
    const newData = { 
      ...questionData, 
      isCritical: newCriticalState,
      type: newType,
      options: newOptions
    };
    
    updateNodeData(newData);
    
    // Créer les chemins après la mise à jour des données
    if (data.onCreatePaths) {
      if (newCriticalState) {
        console.log("Creating paths for critical question");
        data.onCreatePaths(data.id, newOptions.length > 0 ? newOptions : ['Yes', 'No']);
      } else {
        console.log("Removing paths");
        data.onCreatePaths(data.id, []);
      }
    }
  }, [questionData, data, updateNodeData]);
  
  // Fonction pour sélectionner la carte
  const selectCard = useCallback(() => {
    // Utiliser un événement personnalisé pour communiquer avec le composant SurveyFlow
    const event = new CustomEvent('select-node', { 
      detail: { nodeId: id },
      bubbles: true 
    });
    // Déclencher l'événement sur l'élément DOM de la carte
    const nodeElement = document.querySelector(`[data-id="${id}"]`);
    if (nodeElement) {
      nodeElement.dispatchEvent(event);
    }
  }, [id]);
  
  // Gestionnaire d'événements tactiles natif pour iOS - pour le bouton d'édition
  useEffect(() => {
    const button = editButtonRef.current;
    if (!button) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Prévient le comportement par défaut qui peut causer un délai
      e.preventDefault();
      // Force l'arrêt de la propagation de l'événement
      e.stopPropagation();
      // Sélectionner la carte
      selectCard();
      // Bascule l'état d'édition immédiatement
      setIsEditing(!isEditing);
    };

    // Ajouter l'écouteur d'événement avec { passive: false } pour permettre preventDefault
    button.addEventListener('touchstart', handleTouchStart, { passive: false });

    // Nettoyage
    return () => {
      button.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isEditing, selectCard]); // Dépendance à isEditing pour recréer le gestionnaire quand l'état change
  
  // Gestionnaire d'événements tactiles natif pour iOS - pour la case à cocher Critical Question
  useEffect(() => {
    const checkbox = criticalCheckboxRef.current;
    if (!checkbox) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Prévient le comportement par défaut qui peut causer un délai
      e.preventDefault();
      // Force l'arrêt de la propagation de l'événement
      e.stopPropagation();
      // Sélectionner la carte
      selectCard();
      // Bascule l'état critique immédiatement
      toggleCritical();
    };

    // Ajouter l'écouteur d'événement avec { passive: false } pour permettre preventDefault
    checkbox.addEventListener('touchstart', handleTouchStart, { passive: false });

    // Nettoyage
    return () => {
      checkbox.removeEventListener('touchstart', handleTouchStart);
    };
  }, [toggleCritical, selectCard]);

  // Gestionnaire d'événements tactiles natif pour iOS - pour le bouton d'ajout d'option
  useEffect(() => {
    const button = addOptionButtonRef.current;
    if (!button) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Prévient le comportement par défaut qui peut causer un délai
      e.preventDefault();
      // Force l'arrêt de la propagation de l'événement
      e.stopPropagation();
      // Sélectionner la carte
      selectCard();
      // Ajouter un retour visuel immédiat
      button.style.backgroundColor = 'rgba(25, 118, 210, 0.04)';
      // Ajouter une nouvelle option
      const newOptions = [...questionData.options, `Option ${questionData.options.length + 1}`];
      handleOptionsChange(newOptions);
      // Restaurer l'apparence
      setTimeout(() => {
        button.style.backgroundColor = '';
      }, 300);
    };

    // Ajouter l'écouteur d'événement avec { passive: false } pour permettre preventDefault
    button.addEventListener('touchstart', handleTouchStart, { passive: false });

    // Nettoyage
    return () => {
      button.removeEventListener('touchstart', handleTouchStart);
    };
  }, [questionData.options, handleOptionsChange, selectCard]);

  // Fonction pour les navigateurs non tactiles
  const toggleEditMode = (e: React.MouseEvent<HTMLButtonElement>) => {
    // iOS simule des clics après les événements tactiles, donc nous devons éviter ce comportement
    if (e.nativeEvent.type === 'click' && window.TouchEvent && e.nativeEvent instanceof MouseEvent) {
      // Vérifie si c'est un clic simulé après un événement tactile
      if ((e.nativeEvent as any).isTrusted === false || (e.nativeEvent as any)._reactName === 'onClick') {
        return; // Ignore les clics simulés sur les appareils tactiles
      }
    }
    // Sélectionner la carte
    selectCard();
    setIsEditing(!isEditing);
  };

  // Fonction directe pour la sélection de média (sans useCallback)
  const triggerMediaDialog = () => {
    const fileInput = document.getElementById(`media-upload-${id}`);
    if (fileInput) fileInput.click();
  };

  // Simplification extrême du bouton Add Media pour iOS
  useEffect(() => {
    const button = addMediaButtonRef.current;
    if (!button) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Prévient le comportement par défaut qui peut causer un délai
      e.preventDefault();
      // Force l'arrêt de la propagation de l'événement
      e.stopPropagation();
      // Sélectionner la carte
      selectCard();
      // Appelle directement la fonction de suppression
      handleMediaDelete();
    };

    // Ajouter l'écouteur d'événement avec { passive: false } pour permettre preventDefault
    button.addEventListener('touchstart', handleTouchStart, { passive: false });

    // Nettoyage
    return () => {
      button.removeEventListener('touchstart', handleTouchStart);
    };
  }, [handleMediaDelete, selectCard]);

  // Détecter les événements tactiles pour optimiser l'expérience
  useEffect(() => {
    // Fonction pour marquer que le dispositif utilise les événements tactiles
    const markTouchDevice = () => {
      (window as any).touchDetected = true;
      document.documentElement.classList.add('touch-device');
      
      // Détecter si c'est un appareil iOS
      if (isIOS) {
        document.documentElement.classList.add('ios-device');
      }
    };

    // Écouter le premier événement tactile
    document.addEventListener('touchstart', markTouchDevice, { once: true });

    return () => {
      document.removeEventListener('touchstart', markTouchDevice);
    };
  }, [isIOS]);

  return (
    <div style={{ position: 'relative' }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          minWidth: { xs: '280px', sm: '400px' },
          backgroundColor: 'white', 
          borderRadius: 2,
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          position: 'relative', // Assurez-vous que la position est relative
        }}
      >
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
        
        <Box sx={{ 
          mb: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1
        }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Question {data.questionNumber} 
          </Typography>
          <button
            type="button"
            ref={editButtonRef}
            onClick={toggleEditMode}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'white',
              borderRadius: '50%',
              cursor: 'pointer',
              padding: 0,
              WebkitAppearance: 'none',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'none', // "none" pour éviter tout comportement tactile du navigateur
              outline: 'none', // Supprime le contour de focus
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
            }}
            data-intro="edit-question"
          >
            <EditIcon />
          </button>
        </Box>

        {isEditing ? (
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <button 
                  type="button"
                  ref={criticalCheckboxRef}
                  onClick={toggleCritical}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'white',
                    cursor: 'pointer',
                    padding: 0,
                    WebkitAppearance: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'none',
                    outline: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                  }}
                  data-intro="critical-checkbox"
                >
                  <Checkbox
                    checked={questionData.isCritical}
                    sx={{
                      padding: '8px',
                      pointerEvents: 'none', // Désactive les événements directement sur le Checkbox
                    }}
                  />
                </button>
              }
              label={
                <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  Critical Question (creates different paths)
                </Typography>
              }
              sx={{ mb: 2 }}
              data-intro="critical-question"
            />

            <Box
              ref={(el) => {
                if (el) {
                  // Attacher un listener natif directement sur l'élément HTML
                  const htmlEl = el as unknown as HTMLDivElement;
                  const attachedListener = (htmlEl as any)._touchListenerAttached;
                  if (!attachedListener) {
                    const handleDirectTouch = (event: TouchEvent) => {
                      event.preventDefault();
                      event.stopPropagation();
                      // Sélectionner la carte
                      selectCard();
                      // Détecter iOS spécifiquement
                      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                      // Ajouter un retour visuel immédiat
                      htmlEl.style.backgroundColor = 'rgba(25, 118, 210, 0.04)';
                      // Forcer l'ouverture du popover immédiatement
                      setTimeout(() => {
                        setAnchorEl(htmlEl);
                        // Restaurer l'apparence
                        setTimeout(() => {
                          htmlEl.style.backgroundColor = '';
                        }, 300);
                      }, isIOS ? 10 : 0);
                    };
                    // Ajouter l'écouteur d'événement
                    htmlEl.addEventListener('touchstart', handleDirectTouch, { passive: false });
                    // Marquer comme attaché
                    (htmlEl as any)._touchListenerAttached = true;
                  }
                }
              }}
              onClick={(e) => {
                // S'exécute uniquement pour les vrais clics (non simulés)
                if (!(window as any).touchDetected) {
                  // Sélectionner la carte
                  selectCard();
                  handleTypeClick(e);
                }
              }}
              data-intro="question-type-selector"
              sx={{
                p: 2,
                border: '1px solid rgba(0, 0, 0, 0.23)',
                borderRadius: 1,
                cursor: 'pointer',
                mb: 2,
                '&:hover': {
                  borderColor: 'primary.main',
                },
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'rgba(0,0,0,0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: '48px',
                minWidth: '44px',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
              }}
            >
              <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                {(questionData.isCritical ? criticalQuestionTypes : questionTypes)
                  .find(t => t.value === questionData.type)?.label || 'Select type'}
              </Typography>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </Box>

            <Popover
              open={Boolean(anchorEl)}
              anchorEl={anchorEl}
              onClose={handleTypeClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'center',
              }}
              slotProps={{
                paper: {
                  sx: {
                    width: 'auto',
                    minWidth: '200px',
                    mt: 1,
                    zIndex: 10001,
                    position: 'absolute',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    borderRadius: '8px',
                  },
                },
                root: {
                  sx: {
                    zIndex: 30000,
                    position: 'fixed',
                  }
                }
              }}
              className="question-node-popover"
              container={getPopoverContainer()}
              keepMounted
              disablePortal={false}
              style={{ zIndex: 30000 }}
            >
              <Box sx={{ p: 1 }}>
                {(questionData.isCritical ? criticalQuestionTypes : questionTypes).map((type) => (
                  <MenuItem
                    key={type.value}
                    onClick={() => handleTypeSelect(type.value)}
                    selected={type.value === questionData.type}
                    sx={{ 
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      minHeight: '48px',
                      padding: '12px 16px',
                    }}
                    TouchRippleProps={{
                      classes: {
                        child: 'touch-ripple-child',
                      },
                    }}
                  >
                    {type.label}
                  </MenuItem>
                ))}
              </Box>
            </Popover>

            <TextField
              fullWidth
              size="small"
              label="Question"
              value={questionData.text}
              onChange={(e) => updateNodeData({ ...questionData, text: e.target.value })}
              id={`question-field-${id}`}
              className="ios-optimized-input"
              inputRef={(inputEl) => {
                // Capturer la référence de l'élément input directement
                if (inputEl) {
                  // Stocker la référence pour pouvoir l'utiliser dans les gestionnaires d'événements
                  (window as any).questionInputRef = inputEl;
                  
                  // Ajouter un gestionnaire direct sur l'élément input lui-même
                  const attachedListener = (inputEl as any)._touchListenerAttached;
                  if (!attachedListener) {
                    const handleDirectInputTouch = (event: Event) => {
                      // Ne pas empêcher le comportement par défaut pour permettre au focus de fonctionner
                      // Mais arrêter la propagation
                      event.stopPropagation();
                      
                      // Focus explicite
                      setTimeout(() => {
                        inputEl.focus();
                        inputEl.click();
                      }, 0);
                    };
                    
                    // Ajouter plusieurs écouteurs pour s'assurer que l'événement est capturé
                    inputEl.addEventListener('touchstart', handleDirectInputTouch, { passive: true });
                    inputEl.addEventListener('mousedown', handleDirectInputTouch, { passive: true });
                    
                    // Marquer comme attaché
                    (inputEl as any)._touchListenerAttached = true;
                  }
                }
              }}
              InputProps={{
                ref: (wrapperEl) => {
                  // Type correct pour éviter les erreurs TypeScript
                  const el = wrapperEl as unknown as HTMLDivElement;
                  if (el) {
                    // Obtenir le conteneur racine du TextField
                    const rootEl = el.querySelector('.MuiInputBase-root') as HTMLDivElement;
                    if (rootEl) {
                      const attachedListener = (rootEl as any)._touchListenerAttached;
                      if (!attachedListener) {
                        // Créer un gestionnaire d'événements tactiles
                        const handleDirectTouch = (event: TouchEvent) => {
                          // Empêcher la propagation mais pas le comportement par défaut
                          event.stopPropagation();
                          
                          // Ajouter un retour visuel immédiat
                          rootEl.style.borderColor = 'rgba(25, 118, 210, 0.6)';
                          
                          // Trouver l'élément input
                          const input = document.getElementById(`question-field-${id}`)?.querySelector('input');
                          if (input) {
                            // Créer et déclencher un faux événement de clic
                            const clickEvent = new MouseEvent('click', {
                              view: window,
                              bubbles: true,
                              cancelable: true
                            });
                            
                            // Forcer le focus et activer le clavier
                            input.dispatchEvent(clickEvent);
                            input.focus();
                            
                            // Double tentative de focus après un court délai
                            setTimeout(() => {
                              input.click();
                              input.focus();
                              
                              // Restaurer l'apparence
                              setTimeout(() => {
                                rootEl.style.borderColor = '';
                              }, 300);
                            }, 50);
                          }
                        };
                        
                        // Ajouter les écouteurs d'événements sur le conteneur root et sur le label
                        rootEl.addEventListener('touchstart', handleDirectTouch, { passive: true });
                        
                        // Également ajouter l'écouteur sur le label pour s'assurer qu'il est capturé
                        const label = el.querySelector('.MuiInputLabel-root');
                        if (label) {
                          label.addEventListener('touchstart', (event: Event) => {
                            event.stopPropagation();
                            handleDirectTouch(event as unknown as TouchEvent);
                          }, { passive: true });
                        }
                        
                        // Marquer comme attaché
                        (rootEl as any)._touchListenerAttached = true;
                      }
                    }
                  }
                },
                sx: { 
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  minHeight: '48px', 
                  padding: '0 14px', 
                  cursor: 'text', 
                  touchAction: 'manipulation'
                }
              }}
              InputLabelProps={{
                sx: { fontSize: { xs: '0.8rem', sm: '0.875rem' } }
              }}
              sx={{ 
                mb: 2,
                '& .MuiInputBase-root': {
                  minHeight: '48px',
                },
                '& .MuiOutlinedInput-root': {
                  borderRadius: '4px',
                  cursor: 'text',
                  touchAction: 'manipulation',
                  WebkitAppearance: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  '&:focus-within': {
                    boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)'
                  }
                },
                // Suppression des délais tactiles pour iOS
                '& input': {
                  cursor: 'text !important',
                  touchAction: 'manipulation !important',
                  WebkitTapHighlightColor: 'transparent !important',
                  WebkitAppearance: 'none !important',
                  WebkitTouchCallout: 'none !important'
                }
              }}
            />

            {renderQuestionFields()}

            <Box sx={{ mt: 2 }}>
              <input
                type="file"
                id={`media-upload-${id}`}
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={handleMediaUpload}
              />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', position: 'relative' }}>
                <button
                  type="button"
                  id="add-media-button"
                  data-intro="add-media"
                  className="add-media-button-class"
                  onClick={() => {
                    // Sélectionner la carte
                    selectCard();
                    // Solution simple et directe - utiliser un input natif
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*,video/*';
                    
                    input.onchange = (e: Event) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files && target.files.length > 0) {
                        // Créer un faux événement React
                        const fakeEvent = {
                          target: target,
                          currentTarget: target,
                          preventDefault: () => {},
                          stopPropagation: () => {}
                        } as unknown as React.ChangeEvent<HTMLInputElement>;
                        
                        // Appeler notre gestionnaire
                        handleMediaUpload(fakeEvent);
                      }
                    };
                    
                    // Déclencher le sélecteur de fichiers
                    input.click();
                  }}
                  disabled={isUploading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minHeight: '48px',
                    height: 'auto',
                    width: 'auto',
                    padding: '12px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    background: 'white',
                    color: '#1976d2',
                    fontSize: window.innerWidth < 600 ? '0.7rem' : '0.875rem',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    WebkitAppearance: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation',
                    outline: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    opacity: isUploading ? 0.7 : 1,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    position: 'relative',
                  }}
                >
                  <AddPhotoAlternateIcon style={{ fontSize: '18px' }} />
                  <span>{isUploading ? 'Uploading...' : 'Add Media'}</span>
                  
                  {/* Infobulle à côté du bouton avec flèche */}
                  {isIOS && isEditing && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: 'calc(100% + 10px)',
                        transform: 'translateY(-50%)',
                        backgroundColor: '#667eea',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        zIndex: 10,
                        pointerEvents: 'none',
                      }}
                    >
                      Need Double Click
                      <div
                        style={{
                          position: 'absolute',
                          width: '10px',
                          height: '10px',
                          backgroundColor: '#667eea',
                          left: '-5px',
                          top: '50%',
                          transform: 'translateY(-50%) rotate(45deg)',
                        }}
                      />
                    </div>
                  )}
                </button>
              </Box>

              {isUploading && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="caption" sx={{ ml: 1, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    Uploading media...
                  </Typography>
                </Box>
              )}

              {uploadError && (
                <Typography color="error" variant="caption" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                  {uploadError}
                </Typography>
              )}

              {data.mediaUrl && (
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ maxWidth: { xs: '150px', sm: '200px' } }}>
                    {data.mediaUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <img 
                        src={data.mediaUrl} 
                        alt="Question media" 
                        style={{ width: '100%', borderRadius: '4px' }}
                      />
                    ) : (
                      <video 
                        src={data.mediaUrl}
                        controls
                        style={{ width: '100%', borderRadius: '4px' }}
                      />
                    )}
                  </Box>
                  
                  <button 
                    type="button"
                    ref={deleteMediaButtonRef}
                    onClick={() => {
                      // Sélectionner la carte
                      selectCard();
                      handleMediaDelete();
                    }}
                    style={{
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #f44336',
                      borderRadius: '50%',
                      background: 'white',
                      color: '#f44336',
                      cursor: 'pointer',
                      padding: 0,
                      WebkitAppearance: 'none',
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'none',
                      outline: 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      alignSelf: 'center',
                      flexShrink: 0
                    }}
                  >
                    <DeleteIcon style={{ fontSize: '20px' }} />
                  </button>
                </Box>
              )}
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
              Type: {questionTypes.find(t => t.value === questionData.type)?.label}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              {questionData.text || 'No question text'}
            </Typography>
            {/* Médias cachés en mode édition fermé pour une interface plus épurée */}
          </Box>
        )}

        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
      </Paper>

      <style jsx global>{`
        .question-node-popover {
          z-index: 30000 !important;
          position: fixed !important;
        }
        .MuiPopover-root {
          z-index: 30000 !important;
          position: fixed !important;
        }
        
        /* Style pour le bouton Add Media lorsqu'il est appuyé sur iOS */
        .ios-touch-active {
          opacity: 0.7 !important;
          background-color: #f0f7ff !important;
          transform: scale(0.97) !important;
        }
        
        /* Amélioration du positionnement de la liste déroulante */
        .MuiPopover-paper {
          margin-top: 8px !important;
          min-width: 150px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
          border-radius: 8px !important;
          overflow: visible !important;
        }
        
        /* Style pour les options de la liste */
        .MuiMenuItem-root {
          padding: 12px 16px !important;
          min-height: 48px !important;
        }
        
        /* Force les popover à être toujours au-dessus des autres éléments */
        .MuiPopover-root .MuiPopover-paper,
        .question-node-popover .MuiPopover-paper {
          z-index: 30001 !important;
        }
        
        /* Pour empêcher les bugs de scrolling sur iOS */
        #fullscreen-popover-container .MuiPopover-root {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }
        
        /* S'assurer que le popover est visible par dessus tout */
        .react-flow__node-questionNode {
          isolation: isolate;
        }
        
        /* Optimisation tactile pour appareils iOS */
        @supports (-webkit-touch-callout: none) {
          .MuiIconButton-root, 
          .MuiButton-root {
            -webkit-tap-highlight-color: transparent !important;
            -webkit-touch-callout: none !important;
            touch-action: manipulation !important;
          }
          
          .MuiIconButton-root:active,
          .MuiButton-root:active {
            opacity: 0.9;
            transform: scale(0.97);
            transition: transform 0.05s linear !important;
          }
          
          /* Style spécifique pour le bouton d'édition */
          button[data-intro="edit-question"] {
            -webkit-tap-highlight-color: transparent !important;
            -webkit-touch-callout: none !important;
            touch-action: manipulation !important;
          }
          
          button[data-intro="edit-question"]:active {
            opacity: 0.8;
            transform: scale(0.95);
          }
        }
        
        /* Amélioration des zones tactiles sur mobile */
        @media (max-width: 768px) {
          .MuiIconButton-root {
            min-width: 44px !important;
            min-height: 44px !important;
          }
          
          .MuiButton-root {
            min-height: 44px !important;
          }
        }
        
        /* Optimisations tactiles pour les champs de saisie */
        .MuiInputBase-root, 
        .MuiOutlinedInput-root {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none !important;
          touch-action: manipulation !important;
        }
        
        .MuiInputBase-input {
          touch-action: manipulation !important;
          cursor: text !important;
        }
        
        /* Optimisations pour le sélecteur de type */
        [data-intro="question-type-selector"] {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none !important;
          touch-action: manipulation !important;
        }
        
        [data-intro="question-type-selector"]:active {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        /* Optimisations pour les popover */
        .MuiPopover-root,
        .question-node-popover {
          -webkit-tap-highlight-color: transparent !important;
          touch-action: manipulation !important;
        }
        
        /* Styles pour les appareils tactiles */
        html.touch-device .MuiInputBase-root {
          cursor: pointer !important;
        }
        
        html.touch-device [data-intro="question-type-selector"] {
          -webkit-user-select: none;
          user-select: none;
        }
        
        /* Styles pour améliorer l'accessibilité tactile */
        @media (pointer: coarse) {
          .MuiInputBase-root, 
          .MuiOutlinedInput-root,
          .MuiSelect-select,
          [data-intro="question-type-selector"],
          button,
          input {
            min-height: 44px !important;
          }
        }
        
        /* Optimisations spécifiques pour les inputs iOS */
        .ios-optimized-input {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none !important;
          touch-action: manipulation !important;
        }
        
        /* Suppression du délai tactile de 300ms sur iOS */
        .ios-optimized-input input, 
        .ios-optimized-input .MuiInputBase-root {
          touch-action: manipulation !important;
          cursor: text !important;
        }
        
        /* Augmenter la zone tactile pour les inputs sur iOS */
        @supports (-webkit-touch-callout: none) {
          .ios-optimized-input .MuiInputBase-root {
            padding: 8px !important;
          }
          
          .ios-optimized-input input {
            min-height: 44px !important;
            font-size: 16px !important; /* iOS n'active pas le zoom sur les inputs ≥ 16px */
          }
        }
        
        /* Optimisations pour le bouton Add Media */
        .ios-optimized-button {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none !important;
          touch-action: manipulation !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -webkit-appearance: none !important;
        }
        
        /* Animation rapide pour le retour visuel */
        .ios-optimized-button:active {
          opacity: 0.7 !important;
          background-color: #f0f7ff !important;
          transform: scale(0.97) !important;
          transition: all 0.05s ease-out !important;
        }
        
        /* Support spécifique pour iOS */
        @supports (-webkit-touch-callout: none) {
          .ios-optimized-button {
            cursor: pointer !important;
            min-height: 44px !important;
            min-width: 44px !important;
          }
        }
        
        /* Style pour le premier clic */
        .ios-optimized-button.first-click {
          background-color: #f0f7ff !important;
          transform: scale(0.98) !important;
          transition: all 0.1s ease-out !important;
        }
        
        /* Optimisations pour le bouton Add Option */
        button[data-intro="add-option-button"] {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none !important;
          touch-action: manipulation !important;
        }
        
        button[data-intro="add-option-button"]:active {
          opacity: 0.8;
          background-color: rgba(25, 118, 210, 0.04);
          transform: scale(0.97);
          transition: all 0.05s linear !important;
        }
        
        @supports (-webkit-touch-callout: none) {
          button[data-intro="add-option-button"] {
            min-height: 44px !important;
            min-width: 100px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default QuestionNode;