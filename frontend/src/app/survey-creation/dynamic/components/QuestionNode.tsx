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
  { value: 'yes-no', label: 'Yes/No' },
  { value: 'dropdown', label: 'Dropdown' },
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
            <Button
              size="small"
              onClick={() => {
                const newOptions = [...questionData.options, `Option ${questionData.options.length + 1}`];
                handleOptionsChange(newOptions);
              }}
              onTouchStart={(e) => {
                // Optimiser la réponse tactile sur iOS
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
                if (isIOS) {
                  // Empêcher tout délai tactile sur iOS
                  e.preventDefault();
                  const newOptions = [...questionData.options, `Option ${questionData.options.length + 1}`];
                  handleOptionsChange(newOptions);
                }
              }}
              sx={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'rgba(0,0,0,0)',
                cursor: 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                minHeight: { xs: '44px', sm: '36px' },
              }}
            >
              Add Option
            </Button>
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
  
  // Gestionnaire d'événements tactiles natif pour iOS - pour le bouton d'édition
  useEffect(() => {
    const button = editButtonRef.current;
    if (!button) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Prévient le comportement par défaut qui peut causer un délai
      e.preventDefault();
      // Force l'arrêt de la propagation de l'événement
      e.stopPropagation();
      // Bascule l'état d'édition immédiatement
      setIsEditing(!isEditing);
    };

    // Ajouter l'écouteur d'événement avec { passive: false } pour permettre preventDefault
    button.addEventListener('touchstart', handleTouchStart, { passive: false });

    // Nettoyage
    return () => {
      button.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isEditing]); // Dépendance à isEditing pour recréer le gestionnaire quand l'état change
  
  // Gestionnaire d'événements tactiles natif pour iOS - pour la case à cocher Critical Question
  useEffect(() => {
    const checkbox = criticalCheckboxRef.current;
    if (!checkbox) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Prévient le comportement par défaut qui peut causer un délai
      e.preventDefault();
      // Force l'arrêt de la propagation de l'événement
      e.stopPropagation();
      // Bascule l'état critique immédiatement
      toggleCritical();
    };

    // Ajouter l'écouteur d'événement avec { passive: false } pour permettre preventDefault
    checkbox.addEventListener('touchstart', handleTouchStart, { passive: false });

    // Nettoyage
    return () => {
      checkbox.removeEventListener('touchstart', handleTouchStart);
    };
  }, [toggleCritical]);

  // Fonction pour les navigateurs non tactiles
  const toggleEditMode = (e: React.MouseEvent<HTMLButtonElement>) => {
    // iOS simule des clics après les événements tactiles, donc nous devons éviter ce comportement
    if (e.nativeEvent.type === 'click' && window.TouchEvent && e.nativeEvent instanceof MouseEvent) {
      // Vérifie si c'est un clic simulé après un événement tactile
      if ((e.nativeEvent as any).isTrusted === false || (e.nativeEvent as any)._reactName === 'onClick') {
        return; // Ignore les clics simulés sur les appareils tactiles
      }
    }
    setIsEditing(!isEditing);
  };

  // Fonction directe pour la sélection de média (sans useCallback)
  const triggerMediaDialog = () => {
    const fileInput = document.getElementById(`media-upload-${id}`);
    if (fileInput) fileInput.click();
  };

  // Gestionnaire d'événements tactiles natif pour iOS - pour le bouton d'ajout de média
  useEffect(() => {
    // Exactement la même implémentation que pour le bouton d'édition
    const button = addMediaButtonRef.current;
    if (!button) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      triggerMediaDialog();
    };

    button.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      button.removeEventListener('touchstart', handleTouchStart);
    };
  }, []); // Aucune dépendance pour maximiser la stabilité

  // Gestionnaire d'événements tactiles natif pour iOS - pour le bouton de suppression de média
  useEffect(() => {
    const button = deleteMediaButtonRef.current;
    if (!button) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Prévient le comportement par défaut qui peut causer un délai
      e.preventDefault();
      // Force l'arrêt de la propagation de l'événement
      e.stopPropagation();
      // Appelle directement la fonction de suppression
      handleMediaDelete();
    };

    // Ajouter l'écouteur d'événement avec { passive: false } pour permettre preventDefault
    button.addEventListener('touchstart', handleTouchStart, { passive: false });

    // Nettoyage
    return () => {
      button.removeEventListener('touchstart', handleTouchStart);
    };
  }, [handleMediaDelete]);

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
              onClick={handleTypeClick}
              onTouchStart={(e) => {
                // Optimiser la réponse tactile sur iOS
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
                if (isIOS) {
                  // Empêcher tout délai tactile sur iOS
                  e.preventDefault();
                  handleTypeClick(e as any);
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
              sx={{ 
                mb: 2,
                '& .MuiInputBase-root': {
                  minHeight: '48px',
                }
              }}
              InputProps={{
                sx: { fontSize: { xs: '0.8rem', sm: '0.875rem' } }
              }}
              InputLabelProps={{
                sx: { fontSize: { xs: '0.8rem', sm: '0.875rem' } }
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
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  ref={addMediaButtonRef}
                  onClick={triggerMediaDialog}
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
                    touchAction: 'none',
                    outline: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    opacity: isUploading ? 0.7 : 1,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                  data-intro="add-media"
                >
                  <AddPhotoAlternateIcon style={{ fontSize: '18px' }} />
                  <span>{isUploading ? 'Uploading...' : 'Add Media'}</span>
                </button>
                
                {data.mediaUrl && (
                  <button 
                    type="button"
                    ref={deleteMediaButtonRef}
                    onClick={handleMediaDelete}
                    style={{
                      width: '48px',
                      height: '48px',
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
                    }}
                  >
                    <DeleteIcon style={{ fontSize: '20px' }} />
                  </button>
                )}
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
                <Box sx={{ mt: 2, maxWidth: { xs: '150px', sm: '200px' } }}>
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
            {questionData.mediaUrl && (
              <Box sx={{ mt: 1, maxWidth: '100%', maxHeight: '150px', overflow: 'hidden' }}>
                {questionData.media === 'image' ? (
                  <img
                    src={questionData.mediaUrl}
                    alt="Question media"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '150px',
                      objectFit: 'contain',
                      borderRadius: '4px'
                    }}
                  />
                ) : (
                  <ReactPlayer
                    url={questionData.mediaUrl}
                    controls
                    width="100%"
                    height="auto"
                    style={{ borderRadius: '4px' }}
                  />
                )}
              </Box>
            )}
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
      `}</style>
    </div>
  );
};

export default QuestionNode;