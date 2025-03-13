import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Paper,
  Button,
  Divider,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ShowChart as ShowChartIcon,
  DonutLarge as DonutLargeIcon,
} from '@mui/icons-material';

// Types
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
  respondent?: {
    demographic?: {
      gender?: string;
      educationLevel?: string;
      city?: string;
      dateOfBirth?: string;
    };
  };
}

interface QuestionDetails {
  questionId: string;
  question: Question;
  answers: SurveyResponse[];
}

type ChartType = 'bar' | 'line' | 'pie' | 'doughnut';

// Component props
interface QuestionDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  question: QuestionDetails | null;
  chartTypes: { [key: string]: ChartType };
  setChartTypes: React.Dispatch<React.SetStateAction<{ [key: string]: ChartType }>>;
  renderChart: (questionId: string, chartType: ChartType) => JSX.Element;
  getAvailableChartTypes: (questionType: string) => ChartType[];
  getChartIcon: (type: ChartType) => JSX.Element;
}

export const QuestionDetailsDialog: React.FC<QuestionDetailsDialogProps> = ({
  open,
  onClose,
  question,
  chartTypes,
  setChartTypes,
  renderChart,
  getAvailableChartTypes,
  getChartIcon
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        {question?.question?.text}
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {question && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Question type: {question.question.type}
            </Typography>
            
            <Box sx={{ 
              mt: 3, 
              mb: 4,
              height: '350px',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Box sx={{ 
                width: '90%', 
                height: '100%', 
                maxWidth: '550px',
                margin: '0 auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {renderChart(question.questionId, chartTypes[question.questionId] || getAvailableChartTypes(question.question.type)[0])}
              </Box>
            </Box>
            
            <Stack 
              direction="row" 
              spacing={1} 
              sx={{ 
                mt: 3,
                mb: 4,
                justifyContent: 'center',
                pt: 1
              }}
            >
              {getAvailableChartTypes(question.question.type).map((type) => (
                <Button
                  key={type}
                  onClick={() => setChartTypes(prev => ({ ...prev, [question.questionId]: type }))}
                  variant={chartTypes[question.questionId] === type ? 'contained' : 'outlined'}
                  startIcon={getChartIcon(type)}
                  sx={{
                    ...(chartTypes[question.questionId] === type ? {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                    } : {
                      color: '#667eea',
                      borderColor: 'rgba(102, 126, 234, 0.5)',
                    })
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </Stack>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Individual Responses ({question.answers.length})
            </Typography>
            
            <Box sx={{ maxHeight: 300, overflowY: 'auto', mt: 2 }}>
              {question.answers.map((response, index) => {
                const answer = response.answers.find(a => a.questionId === question.questionId);
                return (
                  <Paper key={index} sx={{ p: 2, mb: 2, borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight="medium">
                        Response #{index + 1}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(response.submittedAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      {answer?.answer || 'No response'}
                    </Typography>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}; 