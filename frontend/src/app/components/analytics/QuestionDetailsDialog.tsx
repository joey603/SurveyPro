import React, { useMemo } from 'react';
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
  path?: string[];
  pathCount?: number;
}

export interface QuestionDetails {
  questionId: string;
  question: string;
  answers: string[];
  type: string;
}

type ChartType = 'bar' | 'line' | 'pie' | 'doughnut';

// Interface pour les couleurs
interface ColorItem {
  backgroundColor: string;
  borderColor: string;
}

// Fonction utilitaire pour générer des couleurs distinctes
const generateDistinctColors = (count: number): ColorItem[] => {
  const colors: ColorItem[] = [];
  
  // Palette de couleurs de base
  const baseColors = [
    { h: 234, s: 60, l: 60 }, // Bleu (#667eea)
    { h: 271, s: 60, l: 60 }, // Violet (#764ba2)
    { h: 142, s: 60, l: 60 }, // Vert (#4caf50)
    { h: 24, s: 60, l: 60 },  // Orange (#ff9800)
    { h: 340, s: 60, l: 60 }, // Rose (#e91e63)
    { h: 187, s: 60, l: 60 }, // Cyan (#00bcd4)
    { h: 45, s: 60, l: 60 },  // Jaune (#ffc107)
    { h: 326, s: 60, l: 60 }, // Magenta (#e91e63)
    { h: 162, s: 60, l: 60 }, // Turquoise (#009688)
    { h: 355, s: 60, l: 60 }, // Rouge (#f44336)
  ];
  
  // Si nous avons besoin de plus de couleurs que la palette de base
  if (count > baseColors.length) {
    // Générer des couleurs supplémentaires en variant la teinte
    for (let i = 0; i < count; i++) {
      const hue = (i * 360 / count) % 360;
      const saturation = 60 + (i % 10); // Légère variation de saturation
      const lightness = 60 + (i % 10);  // Légère variation de luminosité
      
      colors.push({
        backgroundColor: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.6)`,
        borderColor: `hsla(${hue}, ${saturation}%, ${lightness}%, 1)`
      });
    }
  } else {
    // Utiliser la palette de base
    baseColors.slice(0, count).forEach(color => {
      colors.push({
        backgroundColor: `hsla(${color.h}, ${color.s}%, ${color.l}%, 0.6)`,
        borderColor: `hsla(${color.h}, ${color.s}%, ${color.l}%, 1)`
      });
    });
  }
  
  return colors;
};

// Désactiver le comportement des légendes au clic
const preventLegendClickBehavior = (e: any, legendItem: any, legend: any) => {
  e.stopPropagation();
  return false; // Empêche l'action par défaut
};

// Component props
interface QuestionDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  question: QuestionDetails | null;
  chartTypes: { [key: string]: ChartType };
  setChartTypes: React.Dispatch<React.SetStateAction<{ [key: string]: ChartType }>>;
  renderChart: (questionId: string, chartType: ChartType, colors?: ColorItem[]) => JSX.Element;
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
  // Générer des couleurs distinctes pour les réponses
  const colors = useMemo(() => {
    if (!question || !question.answers) return [];
    
    // Obtenir les réponses uniques
    const uniqueAnswers = Array.from(new Set(question.answers)).filter(answer => answer);
    return generateDistinctColors(uniqueAnswers.length);
  }, [question]);

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
        {question?.question}
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {question && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Question type: {question.type}
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
                {renderChart(
                  question.questionId, 
                  chartTypes[question.questionId] || getAvailableChartTypes(question.type)[0],
                  colors
                )}
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
              {getAvailableChartTypes(question.type).map((type) => (
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
              {question.answers.map((answer, index) => {
                // Trouver l'index de cette réponse dans le tableau des réponses uniques
                const uniqueAnswers = Array.from(new Set(question.answers)).filter(a => a);
                const answerIndex = uniqueAnswers.indexOf(answer);
                const color = answerIndex >= 0 && colors[answerIndex] 
                  ? colors[answerIndex].borderColor 
                  : undefined;
                
                return (
                  <Paper 
                    key={index} 
                    sx={{ 
                      p: 2, 
                      mb: 2, 
                      borderRadius: 1,
                      borderLeft: color ? `4px solid ${color}` : undefined
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight="medium">
                        Response #{index + 1}
                      </Typography>
                    </Box>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        mt: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {answer || 'No response'}
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