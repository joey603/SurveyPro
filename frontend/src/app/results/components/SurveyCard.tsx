import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Share as ShareIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import type { Survey } from '../types';

interface SurveyCardProps {
  survey: Survey;
  onSelect: () => void;
  onDelete: () => void;
  onShare: (id: string, accept: boolean) => void;
}

export const SurveyCard: React.FC<SurveyCardProps> = ({
  survey,
  onSelect,
  onDelete,
  onShare
}) => {
  return (
    <Card 
      elevation={1}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 3
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>
          {survey.title}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {survey.description || 'Aucune description'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            size="small" 
            label={`${survey.responses?.length || 0} réponses`}
          />
          <Chip 
            size="small" 
            label={`${survey.questions?.length || 0} questions`}
          />
          {survey.isDynamic && (
            <Chip 
              size="small" 
              label="Dynamique"
              color="primary"
            />
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
        <Button
          size="small"
          startIcon={<DeleteIcon />}
          onClick={onDelete}
          color="error"
        >
          Supprimer
        </Button>
        <Button
          size="small"
          startIcon={<ShareIcon />}
          onClick={() => onShare(survey._id, true)}
        >
          Partager
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={<VisibilityIcon />}
          onClick={onSelect}
        >
          Voir
        </Button>
      </CardActions>
    </Card>
  );
}; 