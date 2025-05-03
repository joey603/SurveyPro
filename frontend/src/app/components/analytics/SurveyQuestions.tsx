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
  filteredPaths?: PathSegment[][];
  allPaths?: {name: string, path: PathSegment[], group: string}[];
  isFiltered?: boolean;
}

export const SurveyQuestions: React.FC<SurveyQuestionsProps> = ({
  survey,
  responses,
  renderChart,
  getAvailableChartTypes,
  getChartIcon,
  selectedPaths,
  filteredPaths = [],
  allPaths = []
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
    return pathsToUse.findIndex(path => 
      path.some(segment => segment.questionId === questionId)
    );
  };

  const getPathName = (questionId: string): string | null => {
    const pathsToUse = filteredPaths.length > 0 ? filteredPaths : selectedPaths;
    const path = pathsToUse.find(path => 
      path.some(segment => segment.questionId === questionId)
    );
    
    if (!path) return null;
    
    const matchingPath = allPaths.find(p => 
      p.path.length === path.length && 
      p.path.every((segment, i) => 
        segment.questionId === path[i].questionId && 
        segment.answer === path[i].answer
      )
    );
    
    return matchingPath?.name || null;
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

    const questionAnswers = responses
      .filter(response => response.answers.some(answer => answer.questionId === questionId))
      .map(response => {
        const answer = response.answers.find(a => a.questionId === questionId);
        return answer ? answer.answer : '';
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
                  bgcolor: '#667eea',
                  color: 'white'
                }}
              />
              {pathName && (
                <Chip 
                  size="small"
                  label={pathName}
                  sx={{ 
                    bgcolor: '#764ba2',
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