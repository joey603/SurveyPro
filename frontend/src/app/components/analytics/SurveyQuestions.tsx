import React, { useState, useEffect, useRef } from 'react';
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
  question: string;
  answers: string[];
  type: string;
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
  renderChart: (questionId: string, chartType: ChartType, colors?: ColorItem[]) => JSX.Element;
  getAvailableChartTypes: (questionType: string) => ChartType[];
  getChartIcon: (type: ChartType) => JSX.Element;
  selectedPaths: PathSegment[][];
  filteredPaths?: PathSegment[][];
  allPaths?: {name: string, path: PathSegment[], group: string}[];
  isFiltered?: boolean;
  pathMetadata?: { [key: string]: { name: string, color: string } };
}

export const SurveyQuestions: React.FC<SurveyQuestionsProps> = ({
  survey,
  responses,
  renderChart,
  getAvailableChartTypes,
  getChartIcon,
  selectedPaths,
  filteredPaths = [],
  allPaths = [],
  isFiltered = false,
  pathMetadata = {}
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionDetails | null>(null);
  const [chartTypes, setChartTypes] = useState<{ [key: string]: ChartType }>({});

  const isQuestionInPath = (questionId: string): boolean => {
    const pathsToUse = filteredPaths.length > 0 ? filteredPaths : selectedPaths;
    return pathsToUse.some(path => 
      path.some(segment => segment.questionId === questionId)
    );
  };

  const getPathPosition = (questionId: string): number => {
    const pathsToUse = filteredPaths.length > 0 ? filteredPaths : selectedPaths;
    const path = pathsToUse.find(path => 
      path.some(segment => segment.questionId === questionId)
    );
    
    if (!path) return -1;
    
    return path.findIndex(segment => segment.questionId === questionId);
  };

  const getPathName = (questionId: string): string | null => {
    const pathsToUse = filteredPaths.length > 0 ? filteredPaths : selectedPaths;
    const path = pathsToUse.find(path => 
      path.some(segment => segment.questionId === questionId)
    );
    
    console.log('=== SurveyQuestions Path Name Debug ===');
    console.log('Question ID:', questionId);
    console.log('Paths to use:', pathsToUse);
    console.log('Found path:', path);
    
    if (!path) return null;
    
    const pathKey = JSON.stringify(path);
    console.log('Path key:', pathKey);
    console.log('Path metadata:', pathMetadata);
    console.log('Metadata for this path:', pathMetadata[pathKey]);
    console.log('Name for this path:', pathMetadata[pathKey]?.name);
    console.log('================================');
    
    return pathMetadata[pathKey]?.name || null;
  };

  const getPathColor = (questionId: string) => {
    console.log("%c=== SurveyQuestions Color Debug ===", "color: #667eea; font-weight: bold; font-size: 14px;");
    console.log("%cQuestion ID:", "color: #667eea; font-weight: bold;", questionId);
    console.log("%cFiltered paths:", "color: #667eea; font-weight: bold;", filteredPaths);
    console.log("%cSelected paths:", "color: #667eea; font-weight: bold;", selectedPaths);
    console.log("%cPath metadata:", "color: #667eea; font-weight: bold;", pathMetadata);
    
    const path = filteredPaths.find(path => 
      path.some(segment => segment.questionId === questionId)
    ) || selectedPaths.find(path => 
      path.some(segment => segment.questionId === questionId)
    );
    
    if (path) {
      const pathKey = JSON.stringify(path);
      console.log("%cFound path:", "color: #667eea; font-weight: bold;", path);
      console.log("%cPath key:", "color: #667eea; font-weight: bold;", pathKey);
      console.log("%cPath metadata:", "color: #667eea; font-weight: bold;", pathMetadata[pathKey]);
      console.log("%cColor for this path:", "color: #667eea; font-weight: bold;", pathMetadata[pathKey]?.color);
      return pathMetadata[pathKey]?.color || '#667eea';
    }
    
    console.log("%cNo path found for this question", "color: #667eea; font-weight: bold;");
    return '#667eea';
  };

  const getResponseCount = (questionId: string): number => {
    const pathsToUse = filteredPaths.length > 0 ? filteredPaths : selectedPaths;
    return responses.filter(response => 
      pathsToUse.some(path => 
        path.some(segment => 
          segment.questionId === questionId && 
          response.answers.some(answer => 
            answer.questionId === segment.questionId && 
            answer.answer === segment.answer
          )
        )
      )
    ).length;
  };

  const handleQuestionClick = (questionId: string) => {
    const question = survey.questions.find(q => q.id === questionId);
    if (!question) return;

    const isDateQuestion = question.type === 'date';

    const questionAnswers = responses
      .filter(response => response.answers.some(answer => answer.questionId === questionId))
      .map(response => {
        const answer = response.answers.find(a => a.questionId === questionId);
        if (!answer) return '';
        
        // Formater la date si c'est une question de type date
        return isDateQuestion ? formatDate(answer.answer) : answer.answer;
      })
      .filter(answer => answer !== '');

    setSelectedQuestion({
      questionId,
      question: question.text,
      answers: questionAnswers,
      type: question.type
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

  const renderQuestionCard = (question: Question) => {
    const responseCount = getResponseCount(question.id);
    const isInPath = isQuestionInPath(question.id);
    const pathName = getPathName(question.id);
    const pathPosition = getPathPosition(question.id);
    const pathColor = getPathColor(question.id);

    console.log("%c=== SurveyQuestions Question Card Debug ===", "color: #667eea; font-weight: bold; font-size: 14px;");
    console.log("%cQuestion:", "color: #667eea; font-weight: bold;", question);
    console.log("%cIs in path:", "color: #667eea; font-weight: bold;", isInPath);
    console.log("%cPath name:", "color: #667eea; font-weight: bold;", pathName);
    console.log("%cPath position:", "color: #667eea; font-weight: bold;", pathPosition);
    console.log("%cPath color:", "color: #667eea; font-weight: bold;", pathColor);
    console.log("%c==================================", "color: #667eea; font-weight: bold; font-size: 14px;");
    
    return (
      <Paper
        key={question.id}
        elevation={1}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {question.text}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {responseCount} responses
            </Typography>
          </Box>
          {isInPath && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip 
                size="small"
                label={`Step ${pathPosition + 1}`}
                sx={{ 
                  bgcolor: pathColor || '#667eea',
                  color: 'white'
                }}
              />
              {pathName && (
                <Chip 
                  size="small"
                  label={pathName}
                  sx={{ 
                    bgcolor: pathColor || '#764ba2',
                    color: 'white'
                  }}
                />
              )}
            </Box>
          )}
        </Box>
        {/* ... reste du code de rendu ... */}
      </Paper>
    );
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
                        
                        {isQuestionInPath(question.id) && (
                          <>
                            <Chip 
                              size="small"
                              label={`Step ${getPathPosition(question.id) + 1}`}
                              sx={{ 
                                bgcolor: getPathColor(question.id) || '#667eea',
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
                                  bgcolor: getPathColor(question.id) || '#764ba2',
                                  color: 'white',
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