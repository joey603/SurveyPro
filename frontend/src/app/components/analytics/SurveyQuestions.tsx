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
import { QuestionDetailsDialog } from './QuestionDetailsDialog';

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

interface PathSegment {
  questionId: string;
  questionText: string;
  answer: string;
}

interface SurveyQuestionsProps {
  survey: {
    _id: string;
    title: string;
    questions: Question[];
  };
  responses: SurveyResponse[];
  renderChart: (questionId: string, chartType: ChartType) => JSX.Element;
  getAvailableChartTypes: (questionType: string) => ChartType[];
  getChartIcon: (type: ChartType) => JSX.Element;
  selectedPaths: PathSegment[][];
  allPaths?: {name: string, path: PathSegment[], group: string}[];
}

export const SurveyQuestions: React.FC<SurveyQuestionsProps> = ({
  survey,
  responses,
  renderChart,
  getAvailableChartTypes,
  getChartIcon,
  selectedPaths,
  allPaths = []
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionDetails | null>(null);
  const [chartTypes, setChartTypes] = useState<{ [key: string]: ChartType }>({});

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

  // Fonction pour vérifier si une question fait partie d'un parcours
  const isQuestionInPath = (questionId: string): boolean => {
    if (!selectedPaths || selectedPaths.length === 0) return false;
    
    // Vérifier si la question apparaît dans l'un des parcours sélectionnés
    return selectedPaths.some(path => 
      path.some(segment => segment.questionId === questionId)
    );
  };

  // Fonction pour obtenir la position de la question dans le parcours
  const getPathPosition = (questionId: string): number => {
    if (!selectedPaths || selectedPaths.length === 0) return -1;
    
    // Chercher dans tous les parcours
    for (const path of selectedPaths) {
      for (let i = 0; i < path.length; i++) {
        if (path[i].questionId === questionId) {
          return i + 1; // Position de base 1
        }
      }
    }
    return -1;
  };

  // Fonction pour obtenir le nom du parcours contenant cette question
  const getPathName = (questionId: string): string | null => {
    if (!selectedPaths || selectedPaths.length === 0 || !allPaths || allPaths.length === 0) 
      return null;
    
    // Trouver l'index du parcours sélectionné qui contient cette question
    const selectedPathIndex = selectedPaths.findIndex(path => 
      path.some(segment => segment.questionId === questionId)
    );
    
    if (selectedPathIndex === -1) return null;
    
    // Trouver le parcours correspondant dans allPaths
    const selectedPath = selectedPaths[selectedPathIndex];
    const matchingPath = allPaths.find(p => 
      p.path.length === selectedPath.length && 
      p.path.every((segment, i) => 
        segment.questionId === selectedPath[i].questionId && 
        segment.answer === selectedPath[i].answer
      )
    );
    
    return matchingPath ? matchingPath.name : `Path ${String.fromCharCode(65 + selectedPathIndex)}`;
  };

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
                  },
                  // Ajouter un arrière-plan spécial si la question fait partie d'un parcours
                  ...(isQuestionInPath(question.id) ? {
                    backgroundColor: 'rgba(102, 126, 234, 0.08)',
                    borderLeft: '4px solid #667eea'
                  } : {})
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: isQuestionInPath(question.id) ? '#667eea' : 'rgba(102, 126, 234, 0.1)',
                    color: isQuestionInPath(question.id) ? 'white' : '#667eea',
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
                            fontSize: '0.75rem',
                            mr: 1
                          }}
                        />
                        
                        {/* Ajouter le badge de parcours si la question est dans un parcours */}
                        {isQuestionInPath(question.id) && (
                          <>
                            <Chip 
                              size="small"
                              label={`Step ${getPathPosition(question.id)}`}
                              sx={{ 
                                bgcolor: '#667eea',
                                color: 'white',
                                fontSize: '0.75rem',
                                mr: 1
                              }}
                            />
                            {getPathName(question.id) && (
                              <Chip 
                                size="small"
                                label={getPathName(question.id)}
                                sx={{ 
                                  bgcolor: 'rgba(102, 126, 234, 0.2)',
                                  color: '#667eea',
                                  fontSize: '0.75rem'
                                }}
                              />
                            )}
                          </>
                        )}
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
        open={selectedQuestion !== null}
        onClose={() => setSelectedQuestion(null)}
        question={selectedQuestion}
        chartTypes={chartTypes}
        setChartTypes={setChartTypes}
        renderChart={renderChart}
        getAvailableChartTypes={getAvailableChartTypes}
        getChartIcon={getChartIcon}
      />
    </Box>
  );
}; 