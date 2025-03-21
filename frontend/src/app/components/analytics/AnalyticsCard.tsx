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
  Email as EmailIcon,
  ListAlt as ListAltIcon,
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
  sharedBy?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  isDynamic?: boolean;
  nodes?: any[];
  edges?: any[];
  responses?: SurveyResponse[];
}

interface Question {
  id: string;
  text: string;
  type: string;
}

interface SurveyResponse {
  _id: string;
  surveyId: string;
  answers: Answer[];
  submittedAt: string;
}

interface Answer {
  questionId: string;
  answer: string;
}

interface AnalyticsCardProps {
  survey: Survey;
  onDelete?: (id: string) => void;
  onViewAnalytics: (survey: Survey) => void;
  userId?: string;
  responses?: SurveyResponse[];
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  survey,
  onDelete,
  onViewAnalytics,
  userId,
  responses = [],
}) => {
  const responseCount = responses?.length || 0;

  return (
    <Paper
      elevation={1}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease-in-out',
        position: 'relative',
        '&:hover': {
          boxShadow: 3,
          zIndex: 1,
          transform: 'translateY(-4px)',
        }
      }}
    >
      <Box sx={{ 
        p: 3, 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative'
      }}>
        <Typography
          variant="h6"
          sx={{
            color: 'primary.main',
            fontWeight: 500,
            mb: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.3,
            height: '2.6em',
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
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '8px',
            mt: 2,
            mb: 2,
            '& .MuiChip-root': {
              margin: '0 !important'
            }
          }}
        >
          <Chip
            size="small"
            icon={<BarChartIcon sx={{ fontSize: 16 }} />}
            label={`${responseCount} Responses`}
            sx={{
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              color: '#667eea',
              height: '24px',
              '& .MuiChip-icon': {
                color: '#667eea'
              },
            }}
          />
          <Chip
            size="small"
            icon={<AutoGraphIcon sx={{ fontSize: 16 }} />}
            label={`${survey.questions?.length || survey.nodes?.length || 0} Questions`}
            sx={{
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              color: '#667eea',
              height: '24px',
              '& .MuiChip-icon': {
                color: '#667eea'
              },
            }}
          />
          {survey.isDynamic ? (
            <Chip
              size="small"
              icon={<AutoGraphIcon sx={{ fontSize: 16 }} />}
              label="Dynamic"
              sx={{
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                color: '#667eea',
                height: '24px',
                '& .MuiChip-icon': {
                  color: '#667eea'
                },
              }}
            />
          ) : (
            <Chip
              size="small"
              icon={<ListAltIcon sx={{ fontSize: 16 }} />}
              label="Static"
              sx={{
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                color: '#667eea',
                height: '24px',
                '& .MuiChip-icon': {
                  color: '#667eea'
                },
              }}
            />
          )}
          {survey.demographicEnabled && (
            <Chip
              size="small"
              label="Demographic"
              sx={{
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                color: '#667eea',
                height: '24px',
              }}
            />
          )}
          {survey.sharedBy && (
            <Chip
              size="small"
              icon={<EmailIcon sx={{ fontSize: 16 }} />}
              label={`Shared by ${survey.sharedBy}`}
              sx={{
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                color: '#667eea',
                height: '24px',
                '& .MuiChip-icon': {
                  color: '#667eea'
                },
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
          position: 'relative',
          zIndex: 1
        }}
      >
        {userId === survey.userId && onDelete && (
          <Button
            variant="outlined"
            size="small"
            color="error"
            onClick={() => onDelete(survey._id)}
            startIcon={<DeleteIcon />}
            sx={{
              borderColor: '#f44336',
              color: '#f44336',
              '&:hover': {
                borderColor: '#d32f2f',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
              },
            }}
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
            },
          }}
        >
          View Analytics
        </Button>
      </Box>
    </Paper>
  );
}; 