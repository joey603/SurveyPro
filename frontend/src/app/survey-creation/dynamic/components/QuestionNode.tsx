"use client";

import React, { useState } from 'react';
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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ReactPlayer from 'react-player';

interface QuestionData {
  id: string;
  questionNumber: number;
  type: string;
  text: string;
  options: string[];
  media: string;
  mediaUrl: string;
  selectedDate?: Date | null;
  isCritical: boolean;
  onCreatePaths?: (sourceId: string, options: string[]) => void;
}

interface QuestionNodeProps {
  data: QuestionData;
  isConnectable: boolean;
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

const QuestionNode: React.FC<QuestionNodeProps> = ({ data, isConnectable }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [questionData, setQuestionData] = useState({
    ...data,
    isCritical: data.isCritical || false,
  });
  const [loadingMedia, setLoadingMedia] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // TODO: Implémenter la logique d'upload
      console.log('File to upload:', file);
    }
  };

  const handleTypeClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleTypeClose = () => {
    setAnchorEl(null);
  };

  const handleCriticalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isCritical = event.target.checked;
    const newData = { ...questionData, isCritical };
    
    // Si la question devient critique, réinitialiser le type et créer les chemins
    if (isCritical) {
      newData.type = 'yes-no';
      newData.options = [];
      if (data.onCreatePaths) {
        data.onCreatePaths(data.id, ['Yes', 'No']);
      }
    } else {
      // Si la question n'est plus critique, supprimer les chemins
      if (data.onCreatePaths) {
        data.onCreatePaths(data.id, []);
      }
    }
    
    updateNodeData(newData);
  };

  const handleTypeSelect = (type: string) => {
    const newData = { ...questionData, type };
    updateNodeData(newData);
    handleTypeClose();

    // Créer les chemins selon le type pour les questions critiques
    if (questionData.isCritical && data.onCreatePaths) {
      if (type === 'yes-no') {
        data.onCreatePaths(data.id, ['Yes', 'No']);
      } else if (type === 'dropdown') {
        // Pour dropdown, on attend que les options soient ajoutées
        if (questionData.options.length > 0) {
          data.onCreatePaths(data.id, questionData.options);
        }
      }
    }
  };

  const handleOptionsChange = (newOptions: string[]) => {
    const updatedData = { ...questionData, options: newOptions };
    updateNodeData(updatedData);

    // Mettre à jour les chemins pour les questions critiques de type dropdown
    if (questionData.isCritical && questionData.type === 'dropdown' && data.onCreatePaths) {
      data.onCreatePaths(data.id, newOptions);
    }
  };

  const renderQuestionFields = () => {
    switch (questionData.type) {
      case 'multiple-choice':
      case 'dropdown':
        return (
          <Box>
            {questionData.options.map((option, index) => (
              <TextField
                key={index}
                fullWidth
                size="small"
                label={`Option ${index + 1}`}
                value={option}
                onChange={(e) => {
                  const newOptions = [...questionData.options];
                  newOptions[index] = e.target.value;
                  updateNodeData({ ...questionData, options: newOptions });
                }}
                sx={{ mb: 1 }}
              />
            ))}
            <Button
              size="small"
              onClick={() => updateNodeData({
                ...questionData,
                options: [...questionData.options, '']
              })}
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
              value={questionData.selectedDate}
              onChange={(newValue) => {
                updateNodeData({ ...questionData, selectedDate: newValue });
              }}
            />
          </LocalizationProvider>
        );

      default:
        return null;
    }
  };

  const updateNodeData = (newData: typeof questionData) => {
    setQuestionData(newData);
    // TODO: Ajouter ici la logique pour sauvegarder les changements dans le nœud parent
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
                accept="image/*,video/*"
                style={{ display: 'none' }}
                id={`media-upload-${data.questionNumber}`}
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor={`media-upload-${data.questionNumber}`}>
                <Button
                  component="span"
                  startIcon={<PhotoCameraIcon />}
                  variant="outlined"
                  size="small"
                >
                  Upload Media
                </Button>
              </label>

              <TextField
                fullWidth
                size="small"
                label="Media URL"
                value={questionData.mediaUrl}
                onChange={(e) => updateNodeData({ ...questionData, mediaUrl: e.target.value })}
                sx={{ mt: 1 }}
              />
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