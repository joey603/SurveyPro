"use client";

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SurveyFlow from './components/SurveyFlow';

const DynamicSurveyCreation = () => {
  const [nodeCount, setNodeCount] = useState(1);

  const handleAddQuestion = () => {
    setNodeCount(prev => prev + 1);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, height: '100vh' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2
          }}>
            Create Dynamic Survey
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Design your survey flow by connecting questions and adding conditional logic
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddQuestion}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            textTransform: 'none',
            px: 3,
            py: 1,
          }}
        >
          Add Question
        </Button>
      </Box>

      <Paper elevation={0} sx={{
        height: 'calc(100vh - 200px)',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
      }}>
        <SurveyFlow onAddNode={handleAddQuestion} />
      </Paper>
    </Container>
  );
};

export default DynamicSurveyCreation; 