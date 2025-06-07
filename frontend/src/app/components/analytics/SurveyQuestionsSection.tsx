import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Chip,
  Tooltip
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ArrowDropDownCircleIcon from '@mui/icons-material/ArrowDropDownCircle';
import StarIcon from '@mui/icons-material/Star';
import DateRangeIcon from '@mui/icons-material/DateRange';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import { QuestionDetailsDialog, QuestionDetails as DialogQuestionDetails } from './QuestionDetailsDialog';

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

// Interface locale pour la question sélectionnée
interface QuestionDetailsSurvey {
  questionId: string;
  question: Question;
  answers: SurveyResponse[];
}

// Interface pour les couleurs
interface ColorItem {
  backgroundColor: string;
  borderColor: string;
}

// Fonction pour formater les dates
const formatDate = (value: string): string => {
  // Vérifier si la valeur est une date au format ISO
  const isISODate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(value);
  
  if (isISODate) {
    try {
      const date = new Date(value);
      // Vérifier si la date est valide
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
      }
    } catch (e) {
      // En cas d'erreur, retourner la valeur originale
      console.warn("Erreur lors du formatage de la date:", e);
    }
  }
  
  // Si ce n'est pas une date ou si une erreur se produit, retourner la valeur originale
  return value;
};

type ChartType = 'bar' | 'line' | 'pie' | 'doughnut';

interface SurveyQuestionsProps {
  survey: {
    _id: string;
    title: string;
    questions: Question[];
  };
  responses: SurveyResponse[];
  renderChart: (questionId: string, chartType: ChartType, colors?: ColorItem[]) => JSX.Element;
  getAvailableChartTypes: (questionType: string) => ChartType[];
  getChartIcon: (type: ChartType) => JSX.Element;
}

export const SurveyQuestions: React.FC<SurveyQuestionsProps> = ({
  survey,
  responses,
  renderChart,
  getAvailableChartTypes,
  getChartIcon
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionDetailsSurvey | null>(null);
  const [chartTypes, setChartTypes] = useState<{ [key: string]: ChartType }>({});

  // Fonction pour convertir QuestionDetailsSurvey en DialogQuestionDetails
  const convertToDialogFormat = (question: QuestionDetailsSurvey | null): DialogQuestionDetails | null => {
    if (!question) return null;
    
    const isDateQuestion = question.question.type === 'date';
    
    return {
      questionId: question.questionId,
      question: question.question.text,
      answers: question.answers.map(response => {
        const answer = response.answers.find(a => a.questionId === question.questionId);
        if (!answer) return '';
        
        // Formater la date si c'est une question de type date
        return isDateQuestion ? formatDate(answer.answer) : answer.answer;
      }).filter(answer => answer !== ''),
      type: question.question.type
    };
  };

  const handleQuestionClick = (questionId: string) => {
    const question = survey.questions.find(q => q.id === questionId);
    if (!question) return;

    const questionAnswers = responses.filter(response => 
      response.answers.some(answer => answer.questionId === questionId)
    );

    setSelectedQuestion({
      questionId,
      question,
      answers: questionAnswers
    });
  };

  const getQuestionTypeIcon = (type: string) => {
    switch(type) {
      case 'multiple-choice': return <CheckBoxIcon />;
      case 'text': return <TextFieldsIcon />;
      case 'dropdown': return <ArrowDropDownCircleIcon />;
      case 'yes-no': return <RadioButtonCheckedIcon />;
      case 'rating': return <StarIcon />;
      case 'date': return <DateRangeIcon />;
      case 'slider': return <LinearScaleIcon />;
      default: return <FormatListBulletedIcon />;
    }
  };

  const getQuestionTypeLabel = (type: string): string => {
    switch(type) {
      case 'multiple-choice': return 'Choix multiple';
      case 'text': return 'Texte';
      case 'dropdown': return 'Liste déroulante';
      case 'yes-no': return 'Oui/Non';
      case 'rating': return 'Évaluation';
      case 'date': return 'Date';
      case 'slider': return 'Curseur';
      case 'file-upload': return 'Téléchargement';
      case 'color-picker': return 'Couleur';
      default: return type;
    }
  };

  const getResponseCount = (questionId: string): number => {
    return responses.filter(response => 
      response.answers.some(answer => answer.questionId === questionId)
    ).length;
  };

  // Convertir la question sélectionnée au format du dialogue
  const dialogQuestion = convertToDialogFormat(selectedQuestion);

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Questions du sondage ({survey.questions.length})
      </Typography>
      
      <Paper elevation={2} sx={{ 
        borderRadius: 2,
        overflow: 'hidden',
        mb: 4
      }}>
        <List>
          {survey.questions.map((question, index) => (
            <React.Fragment key={question.id}>
              {index > 0 && <Divider />}
              <ListItem 
                sx={{ 
                  py: 2,
                  transition: 'background-color 0.2s',
                  '&:hover': {
                    backgroundColor: 'rgba(102, 126, 234, 0.04)',
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: 'rgba(102, 126, 234, 0.1)',
                    color: '#667eea',
                    width: 40,
                    height: 40,
                    mr: 2,
                    flexShrink: 0
                  }}>
                    {index + 1}
                  </Box>
                  
                  <ListItemText
                    primary={question.text}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, color: 'text.secondary' }}>
                          {getQuestionTypeIcon(question.type)}
                          <Typography variant="body2" sx={{ ml: 0.5 }}>
                            {getQuestionTypeLabel(question.type)}
                          </Typography>
                        </Box>
                        
                        <Chip 
                          size="small"
                          label={`${getResponseCount(question.id)} réponses`}
                          sx={{ 
                            bgcolor: 'rgba(102, 126, 234, 0.1)',
                            color: '#667eea',
                            fontSize: '0.75rem'
                          }}
                        />
                      </Box>
                    }
                  />
                  
                  <Tooltip title="Voir les détails">
                    <IconButton 
                      onClick={() => handleQuestionClick(question.id)}
                      sx={{ 
                        color: '#667eea',
                        '&:hover': {
                          bgcolor: 'rgba(102, 126, 234, 0.1)'
                        }
                      }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </Paper>

      <QuestionDetailsDialog 
        open={dialogQuestion !== null}
        onClose={() => setSelectedQuestion(null)}
        question={dialogQuestion}
        chartTypes={chartTypes}
        setChartTypes={setChartTypes}
        renderChart={renderChart}
        getAvailableChartTypes={getAvailableChartTypes}
        getChartIcon={getChartIcon}
      />
    </Box>
  );
}; 