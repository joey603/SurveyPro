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
  Tooltip,
  Alert
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

interface Node {
  id: string;
  type: string;
  data: {
    text?: string;
    questionType?: string;
    label?: string;
    options?: string[];
    [key: string]: any;
  };
  position?: {
    x: number;
    y: number;
  };
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

interface SurveyQuestionsProps {
  survey: {
    _id: string;
    title: string;
    isDynamic?: boolean;
    questions?: Question[];
    nodes?: Node[];
  };
  responses: SurveyResponse[];
  renderChart: (questionId: string, chartType: ChartType) => JSX.Element;
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
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionDetails | null>(null);
  const [chartTypes, setChartTypes] = useState<{ [key: string]: ChartType }>({});

  // Fonction pour convertir un node en question
  const nodeToQuestion = (node: Node): Question => {
    return {
      id: node.id,
      text: node.data.text || node.data.label || 'Question sans texte',
      type: node.data.questionType || node.type || 'unknown',
      options: node.data.options
    };
  };

  // Obtenir les questions à afficher (soit questions pour les sondages standard, soit nodes convertis pour les dynamiques)
  const getQuestionsToDisplay = (): Question[] => {
    if (survey.isDynamic && survey.nodes) {
      return survey.nodes
        .filter(node => {
          // Filtrer uniquement les nœuds qui représentent des questions
          // typiquement ceux avec des types comme 'questionNode' ou qui ont questionType défini
          return (
            node.type === 'questionNode' || 
            node.data.questionType || 
            (node.data.text && node.type !== 'startNode' && node.type !== 'endNode')
          );
        })
        .map(nodeToQuestion);
    } else if (survey.questions) {
      return survey.questions;
    }
    return [];
  };

  const questions = getQuestionsToDisplay();

  const handleQuestionClick = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
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
      case 'questionNode': return 'Question';
      default: return type;
    }
  };

  const getResponseCount = (questionId: string): number => {
    return responses.filter(response => 
      response.answers.some(answer => answer.questionId === questionId)
    ).length;
  };

  if (questions.length === 0) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Questions du sondage
        </Typography>
        <Alert severity="info">
          Aucune question n'a été trouvée pour ce sondage.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Questions du sondage ({questions.length})
      </Typography>
      
      <Paper elevation={2} sx={{ 
        borderRadius: 2,
        overflow: 'hidden',
        mb: 4
      }}>
        <List>
          {questions.map((question, index) => (
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