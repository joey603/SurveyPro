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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

const questionTypes = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'text', label: 'Open-ended' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'yes-no', label: 'Yes/No' },
  { value: 'slider', label: 'Slider' },
  { value: 'rating', label: 'Rating (Stars)' },
  { value: 'date', label: 'Date Picker' },
];

const QuestionNode = ({ data, isConnectable }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [questionData, setQuestionData] = useState({
    type: data.type || 'text',
    text: data.text || '',
    options: data.options || [],
    media: data.media || '',
  });

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        minWidth: 300,
        backgroundColor: 'white',
        borderRadius: 2,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />

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
          <Select
            fullWidth
            size="small"
            value={questionData.type}
            onChange={(e) => setQuestionData({ ...questionData, type: e.target.value })}
            sx={{ mb: 2 }}
          >
            {questionTypes.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>

          <TextField
            fullWidth
            size="small"
            label="Question"
            value={questionData.text}
            onChange={(e) => setQuestionData({ ...questionData, text: e.target.value })}
            sx={{ mb: 2 }}
          />

          {(questionData.type === 'multiple-choice' || questionData.type === 'dropdown') && (
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
                    setQuestionData({ ...questionData, options: newOptions });
                  }}
                  sx={{ mb: 1 }}
                />
              ))}
              <Button
                size="small"
                onClick={() => setQuestionData({
                  ...questionData,
                  options: [...questionData.options, '']
                })}
              >
                Add Option
              </Button>
            </Box>
          )}
        </Box>
      ) : (
        <Box>
          <Typography variant="body2" color="text.secondary">
            Type: {questionTypes.find(t => t.value === questionData.type)?.label}
          </Typography>
          <Typography variant="body2">
            {questionData.text || 'No question text'}
          </Typography>
          {(questionData.type === 'multiple-choice' || questionData.type === 'dropdown') && questionData.options.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Options:
              </Typography>
              {questionData.options.map((option, index) => (
                <Typography key={index} variant="body2" sx={{ pl: 1 }}>
                  • {option}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
      />
    </Paper>
  );
};

export default QuestionNode; 