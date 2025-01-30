import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AutoGraph as AutoGraphIcon,
  ListAlt as ListAltIcon
} from '@mui/icons-material';
import type { Survey } from '../../types';

interface SurveyDetailsProps {
  survey: Survey | null;
  onBack: () => void;
}

export const SurveyDetails: React.FC<SurveyDetailsProps> = ({ survey, onBack }) => {
  if (!survey) return null;
  
  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: { xs: 2, sm: 4 },
    }}>
      <Paper 
        elevation={3} 
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '1000px',
          mb: 4,
        }}
      >
        {/* Header avec gradient */}
        <Box sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 4,
          px: 4,
          color: 'white',
          textAlign: 'center',
          position: 'relative'
        }}>
          <IconButton
            onClick={onBack}
            sx={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'white',
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            {survey.title}
          </Typography>
          {survey.description && (
            <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.9 }}>
              {survey.description}
            </Typography>
          )}
          {survey.isDynamic && (
            <Chip
              icon={<AutoGraphIcon />}
              label="Dynamic Survey"
              size="small"
              sx={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                '& .MuiChip-icon': {
                  color: 'white'
                },
                height: '24px',
                fontWeight: 500
              }}
            />
          )}
        </Box>

        {/* Content */}
        <Box sx={{ p: 4, backgroundColor: 'white' }}>
          {/* Ici, vous pouvez ajouter le contenu des résultats */}
        </Box>
      </Paper>
    </Box>
  );
}; 