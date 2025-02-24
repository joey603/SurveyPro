import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Grid,
  Chip,
  Paper,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  BarChart as BarChartIcon,
  AutoGraph as AutoGraphIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { colors } from '@/theme/colors';

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
}

interface Answer {
  questionId: string;
  answer: string;
}

interface SurveyResponse {
  _id: string;
  surveyId: string;
  answers: Answer[];
  submittedAt: string;
}

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
}

interface SurveyAnalyticsProps {
  open: boolean;
  onClose: () => void;
  survey: Survey;
  responses: SurveyResponse[];
}

export const SurveyAnalytics: React.FC<SurveyAnalyticsProps> = ({
  open,
  onClose,
  survey,
  responses,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        },
      }}
    >
      <Box sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 2,
        px: 3,
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h5" fontWeight="bold">
          {survey.title}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Statistiques générales */}
          <Grid item xs={12}>
            <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  icon={<BarChartIcon sx={{ fontSize: 16 }} />}
                  label={`${responses.length} Responses`}
                  sx={{
                    backgroundColor: colors.primary.transparent,
                    color: colors.primary.main,
                  }}
                />
                <Chip
                  size="small"
                  icon={<AutoGraphIcon sx={{ fontSize: 16 }} />}
                  label={`${survey.questions.length} Questions`}
                  sx={{
                    backgroundColor: colors.primary.transparent,
                    color: colors.primary.main,
                  }}
                />
                {survey.demographicEnabled && (
                  <Chip
                    size="small"
                    label="Demographic"
                    sx={{
                      backgroundColor: colors.primary.transparent,
                      color: colors.primary.main,
                    }}
                  />
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Questions et réponses */}
          {survey.questions.map((question) => (
            <Grid item xs={12} key={question.id}>
              <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {question.text}
                </Typography>
                {/* Ici, vous pouvez ajouter des graphiques ou des statistiques pour chaque question */}
                <Typography color="text.secondary">
                  Analyse des réponses à venir...
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
    </Dialog>
  );
}; 