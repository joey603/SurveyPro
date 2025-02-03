import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  Stack,
  Chip,
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  AutoGraph as AutoGraphIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { colors } from '@/theme/colors';

interface Survey {
  _id: string;
  title: string;
  description?: string;
  questions: Question[];
  createdAt: string;
  demographicEnabled: boolean;
  userId: string;
  responses?: number;
}

interface Question {
  id: string;
  text: string;
  type: string;
}

interface AnalyticsCardProps {
  survey: Survey;
  onDelete?: (id: string) => void;
  onViewAnalytics: (survey: Survey) => void;
  userId?: string;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  survey,
  onDelete,
  onViewAnalytics,
  userId,
}) => {
  return (
    <Paper
      elevation={1}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 3,
        },
      }}
    >
      <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {survey.title}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.5,
            height: '4.5em',
          }}
        >
          {survey.description || 'No description available'}
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            flexWrap: 'wrap',
            gap: '8px',
            mt: 2,
            mb: 2,
          }}
        >
          <Chip
            size="small"
            icon={<BarChartIcon sx={{ fontSize: 16 }} />}
            label={`${survey.responses || 0} Responses`}
            sx={{
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              color: colors.primary.main,
              height: '24px',
            }}
          />
          <Chip
            size="small"
            icon={<AutoGraphIcon sx={{ fontSize: 16 }} />}
            label={`${survey.questions.length} Questions`}
            sx={{
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              color: colors.primary.main,
              height: '24px',
            }}
          />
          {survey.demographicEnabled && (
            <Chip
              size="small"
              label="Demographic"
              sx={{
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                color: colors.primary.main,
                height: '24px',
              }}
            />
          )}
        </Stack>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          Created on {new Date(survey.createdAt).toLocaleDateString()}
        </Typography>
      </Box>

      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        {userId === survey.userId && onDelete && (
          <Button
            variant="outlined"
            size="small"
            color="error"
            onClick={() => onDelete(survey._id)}
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        )}
        <Button
          variant="contained"
          size="small"
          onClick={() => onViewAnalytics(survey)}
          sx={{
            ml: 'auto',
            background: colors.primary.gradient,
            '&:hover': {
              background: colors.primary.hover,
            },
          }}
        >
          View Analytics
        </Button>
      </Box>
    </Paper>
  );
}; 