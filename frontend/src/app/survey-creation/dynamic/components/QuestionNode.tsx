"use client";

import React, { useState, useCallback } from 'react';
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
  onChange?: (data: Partial<QuestionNodeData>) => void;
  onCreatePaths?: (nodeId: string, options: string[]) => void;
}

interface QuestionNodeProps {
  data: QuestionNodeData;
  isConnectable: boolean;
  id: string;
}

const questionTypes = [
  { value: 'text', label: 'Open-ended' },
  { value: 'yes-no', label: 'Yes/No' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'multiple-choice', label: 'Multiple Choice' },
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
    
    const newData = { 
      ...questionData, 
      isCritical,
      type: isCritical ? 'yes-no' : 'text'
    };
    
    updateNodeData(newData);
    
    // Créer les chemins après la mise à jour des données
    if (data.onCreatePaths) {
      if (isCritical) {
        console.log("Creating Yes/No paths");
        data.onCreatePaths(data.id, ['Yes', 'No']);
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

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleMediaDelete = async () => {
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
  };

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
                />
                {questionData.isCritical && (
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
                )}
              </Box>
            ))}
            <Button
              size="small"
              onClick={() => {
                const newOptions = [...questionData.options, `Option ${questionData.options.length + 1}`];
                handleOptionsChange(newOptions);
              }}
            >
              Add Option
            </Button>
          </Box>
        );

      case 'yes-no':
        return (
          <RadioGroup row>
            <FormControlLabel value="yes" control={<Radio />} label="Yes" />
            <FormControlLabel value="no" control={<Radio />} label="No" />
          </RadioGroup>
        );

      case 'slider':
        return (
          <Slider
            defaultValue={50}
            valueLabelDisplay="auto"
            step={1}
            marks
            min={0}
            max={100}
          />
        );

      case 'rating':
        return (
          <Rating />
        );

      case 'date':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Select Date"
              value={questionData.selectedDate}
              onChange={(newValue) => {
                if (data.onChange) {
                  data.onChange({
                    ...data,
                    selectedDate: newValue
                  });
                }
              }}
              renderInput={(params) => <TextField {...params} />}
            />
          </LocalizationProvider>
        );

      default:
        return null;
    }
  };

  const updateNodeData = (newData: typeof questionData) => {
    setQuestionData(newData);
    // Propager les changements au nœud parent
    if (data.onChange) {
      data.onChange({
        ...data,
        ...newData
      });
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <Paper elevation={3} sx={{ p: 2, minWidth: 400, backgroundColor: 'white', borderRadius: 2 }}>
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
        
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Question {data.questionNumber}
          </Typography>
          <IconButton size="small" onClick={() => setIsEditing(!isEditing)}>
            <EditIcon />
          </IconButton>
        </Box>

        {isEditing ? (
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={questionData.isCritical}
                  onChange={handleCriticalChange}
                />
              }
              label="Critical Question (creates different paths)"
              sx={{ mb: 2 }}
            />

            <Box
              onClick={handleTypeClick}
              sx={{
                p: 1,
                border: '1px solid rgba(0, 0, 0, 0.23)',
                borderRadius: 1,
                cursor: 'pointer',
                mb: 2,
                '&:hover': {
                  borderColor: 'primary.main',
                },
              }}
            >
              <Typography>
                {(questionData.isCritical ? criticalQuestionTypes : questionTypes)
                  .find(t => t.value === questionData.type)?.label || 'Select type'}
              </Typography>
            </Box>

            <Popover
              open={Boolean(anchorEl)}
              anchorEl={anchorEl}
              onClose={handleTypeClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              slotProps={{
                paper: {
                  sx: {
                    width: 'auto',
                    mt: 1,
                  },
                },
              }}
            >
              <Box sx={{ p: 1 }}>
                {(questionData.isCritical ? criticalQuestionTypes : questionTypes).map((type) => (
                  <MenuItem
                    key={type.value}
                    onClick={() => handleTypeSelect(type.value)}
                    selected={type.value === questionData.type}
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
              sx={{ mb: 2 }}
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
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  component="label"
                  htmlFor={`media-upload-${id}`}
                  startIcon={<AddPhotoAlternateIcon />}
                  variant="outlined"
                  size="small"
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Add Media'}
                </Button>
                
                {data.mediaUrl && (
                  <IconButton 
                    onClick={handleMediaDelete}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>

              {isUploading && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="caption" sx={{ ml: 1 }}>
                    Uploading media...
                  </Typography>
                </Box>
              )}

              {uploadError && (
                <Typography color="error" variant="caption">
                  {uploadError}
                </Typography>
              )}

              {data.mediaUrl && (
                <Box sx={{ mt: 2, maxWidth: '200px' }}>
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
            <Typography variant="body2" color="text.secondary">
              Type: {questionTypes.find(t => t.value === questionData.type)?.label}
            </Typography>
            <Typography variant="body2">
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
          z-index: 9999 !important;
        }
      `}</style>
    </div>
  );
};

export default QuestionNode; 