// src/app/survey-creation/SurveyForm.tsx
import React, { useState } from 'react';
import { TextField, Button, MenuItem, Box, Typography, IconButton } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';

type Question = {
  id: number;
  type: string;
  text: string;
  options?: string[];
  media?: File | null;
};

const SurveyForm = ({ initialData }: { initialData: any }) => {
  const [surveyTitle, setSurveyTitle] = useState(initialData?.title || "");
  const [questions, setQuestions] = useState<Question[]>(initialData?.questions || []);

  const handleAddQuestion = () => {
    setQuestions([...questions, { id: Date.now(), type: 'text', text: '', options: [], media: null }]);
  };

  const handleQuestionChange = (id: number, type: string, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, type, text } : q));
  };

  const handleDeleteQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handlePreview = () => {
    console.log("Previewing survey:", { title: surveyTitle, questions });
  };

  return (
    <Box sx={{ mt: 3 }}>
      <TextField
        label="Survey Title"
        value={surveyTitle}
        onChange={(e) => setSurveyTitle(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />

      {questions.map((question, index) => (
        <Box key={question.id} sx={{ borderBottom: "1px solid #ddd", padding: 2 }}>
          <TextField
            label={`Question ${index + 1}`}
            value={question.text}
            onChange={(e) => handleQuestionChange(question.id, question.type, e.target.value)}
            fullWidth
            sx={{ mb: 1 }}
          />
          <TextField
            select
            label="Question Type"
            value={question.type}
            onChange={(e) => handleQuestionChange(question.id, e.target.value, question.text)}
            fullWidth
          >
            <MenuItem value="text">Open-ended</MenuItem>
            <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
            <MenuItem value="scale">Satisfaction Scale</MenuItem>
          </TextField>

          {question.type === 'multiple-choice' && (
            <Box>
              {question.options!.map((option, i) => (
                <TextField
                  key={i}
                  label={`Option ${i + 1}`}
                  value={option}
                  onChange={(e) => {
                    const newOptions = question.options!.map((opt, index) => index === i ? e.target.value : opt);
                    setQuestions(questions.map(q => q.id === question.id ? { ...q, options: newOptions } : q));
                  }}
                  fullWidth
                  sx={{ mt: 1 }}
                />
              ))}
              <Button
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => {
                  const newOptions = [...(question.options || []), ''];
                  setQuestions(questions.map(q => q.id === question.id ? { ...q, options: newOptions } : q));
                }}
                sx={{ mt: 1 }}
              >
                Add Option
              </Button>
            </Box>
          )}

          <IconButton color="error" onClick={() => handleDeleteQuestion(question.id)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      ))}

      <Button variant="outlined" onClick={handleAddQuestion} sx={{ mt: 3 }}>
        Add New Question
      </Button>

      <Button variant="contained" color="primary" onClick={handlePreview} sx={{ mt: 3, ml: 2 }}>
        Preview Survey
      </Button>
    </Box>
  );
};

export default SurveyForm;
