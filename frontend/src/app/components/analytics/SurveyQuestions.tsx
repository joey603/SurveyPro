import React, { useState, useEffect } from 'react';
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
  Alert,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  useTheme,
  alpha
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
import PollIcon from '@mui/icons-material/Poll';
import { QuestionDetailsDialog } from './QuestionDetailsDialog';
import { Doughnut, Bar } from 'react-chartjs-2';

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
  const theme = useTheme();
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionDetails | null>(null);
  const [chartTypes, setChartTypes] = useState<{ [key: string]: ChartType }>({});
  const [questionStats, setQuestionStats] = useState<{[key: string]: {
    responseCount: number,
    responseRate: number,
    answerDistribution: {[key: string]: number},
    mostCommonAnswer?: string,
    avgRating?: number
  }}>({});

  // Function to convert a node to a question
  const nodeToQuestion = (node: Node): Question => {
    return {
      id: node.id,
      text: node.data.text || node.data.label || 'Question without text',
      type: node.data.questionType || node.type || 'unknown',
      options: node.data.options
    };
  };

  // Get questions to display (either standard survey questions or converted nodes for dynamic surveys)
  const getQuestionsToDisplay = (): Question[] => {
    if (survey.isDynamic && survey.nodes) {
      return survey.nodes
        .filter(node => {
          // Filter only nodes that represent questions
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

  // Calculate statistics for each question
  useEffect(() => {
    const stats: {[key: string]: any} = {};
    
    questions.forEach(question => {
      const questionResponses = responses.filter(response => 
        response.answers.some(answer => answer.questionId === question.id)
      );
      
      const responseCount = questionResponses.length;
      const responseRate = responses.length > 0 ? responseCount / responses.length * 100 : 0;
      
      // Answer distribution
      const answerDistribution: {[key: string]: number} = {};
      
      questionResponses.forEach(response => {
        const answer = response.answers.find(a => a.questionId === question.id);
        if (answer) {
          const value = answer.answer;
          answerDistribution[value] = (answerDistribution[value] || 0) + 1;
        }
      });
      
      // Find most common answer
      let mostCommonAnswer = '';
      let maxCount = 0;
      
      Object.entries(answerDistribution).forEach(([answer, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonAnswer = answer;
        }
      });
      
      // Calculate average rating for rating-type questions
      let avgRating;
      if (question.type === 'rating' || question.type === 'slider') {
        const ratings = questionResponses
          .map(response => {
            const answer = response.answers.find(a => a.questionId === question.id);
            return answer ? parseFloat(answer.answer) : null;
          })
          .filter(rating => rating !== null) as number[];
        
        avgRating = ratings.length > 0 
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
          : undefined;
      }
      
      stats[question.id] = {
        responseCount,
        responseRate,
        answerDistribution,
        mostCommonAnswer: mostCommonAnswer || undefined,
        avgRating
      };
    });
    
    setQuestionStats(stats);
  }, [questions, responses]);

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
      case 'multiple-choice': return 'Multiple Choice';
      case 'text': return 'Text';
      case 'dropdown': return 'Dropdown';
      case 'yes-no': return 'Yes/No';
      case 'rating': return 'Rating';
      case 'date': return 'Date';
      case 'slider': return 'Slider';
      case 'file-upload': return 'File Upload';
      case 'color-picker': return 'Color Picker';
      case 'questionNode': return 'Question';
      default: return type;
    }
  };

  // Generate mini-chart for a question
  const renderMiniChart = (question: Question) => {
    const stats = questionStats[question.id];
    if (!stats || stats.responseCount === 0) {
      return (
        <Box sx={{ 
          height: 80, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'text.secondary'
        }}>
          <Typography variant="caption">Not enough data</Typography>
        </Box>
      );
    }

    // Get options and values for charts
    const generateChartData = () => {
      const distribution = stats.answerDistribution;
      const labels = Object.keys(distribution);
      const data = Object.values(distribution);
      
      const backgroundColor = [
        'rgba(102, 126, 234, 0.6)',
        'rgba(118, 75, 162, 0.6)',
        'rgba(224, 107, 173, 0.6)',
        'rgba(246, 153, 63, 0.6)',
        'rgba(82, 196, 26, 0.6)',
        'rgba(28, 151, 234, 0.6)',
      ];
      
      const borderColor = [
        'rgba(102, 126, 234, 1)',
        'rgba(118, 75, 162, 1)',
        'rgba(224, 107, 173, 1)',
        'rgba(246, 153, 63, 1)',
        'rgba(82, 196, 26, 1)',
        'rgba(28, 151, 234, 1)',
      ];
      
      return {
        labels,
        datasets: [{
          data,
          backgroundColor: backgroundColor.slice(0, data.length),
          borderColor: borderColor.slice(0, data.length),
          borderWidth: 1
        }]
      };
    };

    // Base options for charts
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: false
        }
      }
    };

    // Choose chart type based on question type
    if (question.type === 'multiple-choice' || question.type === 'dropdown' || question.type === 'yes-no') {
      // Limit data to 5 max for mini-chart
      const chartData = generateChartData();
      if (chartData.labels.length > 5) {
        chartData.labels = chartData.labels.slice(0, 4).concat(['Others']);
        const otherSum = (chartData.datasets[0].data as number[]).slice(4).reduce((a, b) => a + b, 0);
        chartData.datasets[0].data = (chartData.datasets[0].data as number[]).slice(0, 4).concat([otherSum]);
      }
      
      return (
        <Box sx={{ height: 80 }}>
          <Doughnut 
            data={chartData} 
            options={baseOptions}
          />
        </Box>
      );
    } else if (question.type === 'rating' || question.type === 'slider') {
      const chartData = {
        labels: ['1', '2', '3', '4', '5'],
        datasets: [{
          data: [
            stats.answerDistribution['1'] || 0,
            stats.answerDistribution['2'] || 0,
            stats.answerDistribution['3'] || 0,
            stats.answerDistribution['4'] || 0,
            stats.answerDistribution['5'] || 0,
          ],
          backgroundColor: 'rgba(102, 126, 234, 0.6)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 1
        }]
      };
      
      return (
        <Box sx={{ height: 80 }}>
          <Bar 
            data={chartData} 
            options={{
              ...baseOptions,
              scales: {
                x: {
                  display: false
                },
                y: {
                  display: false
                }
              }
            }}
          />
        </Box>
      );
    } else {
      // For text, date, etc.
      return (
        <Box sx={{ 
          height: 80, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Typography variant="h6" sx={{ color: '#667eea' }}>
            {stats.responseCount}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            responses
          </Typography>
        </Box>
      );
    }
  };

  if (questions.length === 0) {
    return (
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          borderRadius: 2, 
          mb: 4, 
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
        }}
      >
        <Typography variant="h6" gutterBottom>
          Survey Questions
        </Typography>
        <Alert severity="info">
          No questions found for this survey.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        borderRadius: 2, 
        mb: 4, 
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
      }}
    >
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 'medium', 
          display: 'flex', 
          alignItems: 'center',
          color: theme.palette.text.primary
        }}>
          <PollIcon sx={{ mr: 1, color: '#667eea' }} />
          Survey Questions ({questions.length})
        </Typography>
        
        <Box>
          <Chip 
            label={`${responses.length} total responses`}
            sx={{ 
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              color: '#667eea',
              fontWeight: 'medium'
            }}
          />
        </Box>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={2}>
        {questions.map((question, index) => {
          const stats = questionStats[question.id] || {
            responseCount: 0,
            responseRate: 0,
            answerDistribution: {}
          };
          
          return (
            <Grid item xs={12} md={6} key={question.id}>
              <Card 
                elevation={0}
                sx={{ 
                  borderRadius: 2,
                  height: '100%',
                  border: '1px solid',
                  borderColor: alpha(theme.palette.divider, 0.1),
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    borderColor: alpha('#667eea', 0.3),
                  }
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      borderRadius: '50%',
                      bgcolor: 'rgba(102, 126, 234, 0.1)',
                      color: '#667eea',
                      width: 36,
                      height: 36,
                      mr: 2,
                      flexShrink: 0,
                      fontWeight: 'bold'
                    }}>
                      {index + 1}
                    </Box>
                    
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 0.5, lineHeight: 1.3 }}>
                        {question.text}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                          size="small"
                          icon={getQuestionTypeIcon(question.type)}
                          label={getQuestionTypeLabel(question.type)}
                          sx={{ 
                            bgcolor: 'rgba(102, 126, 234, 0.05)',
                            color: '#667eea',
                          }}
                        />
                        
                        <Chip 
                          size="small"
                          label={`${stats.responseCount} responses`}
                          sx={{ 
                            bgcolor: alpha(theme.palette.success.main, 0.1),
                            color: theme.palette.success.main,
                          }}
                        />
                      </Box>
                    </Box>
                    
                    <Tooltip title="View Details">
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
                  
                  <Divider sx={{ my: 1.5 }} />
                  
                  <Box sx={{ display: 'flex', mb: 1.5 }}>
                    <Box sx={{ width: '50%', pr: 1 }}>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Response rate
                          </Typography>
                          <Typography variant="caption" fontWeight="medium">
                            {stats.responseRate.toFixed(0)}%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={stats.responseRate} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 1,
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: '#667eea',
                              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                            }
                          }} 
                        />
                      </Box>
                      
                      {stats.mostCommonAnswer && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Most common answer
                          </Typography>
                          <Typography variant="body2" fontWeight="medium" noWrap>
                            {stats.mostCommonAnswer.length > 20 
                              ? `${stats.mostCommonAnswer.substring(0, 20)}...` 
                              : stats.mostCommonAnswer}
                          </Typography>
                        </Box>
                      )}
                      
                      {stats.avgRating && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Average rating
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" fontWeight="medium">
                              {stats.avgRating.toFixed(1)}
                            </Typography>
                            <StarIcon sx={{ ml: 0.5, color: '#FFC107', fontSize: 16 }} />
                          </Box>
                        </Box>
                      )}
                    </Box>
                    
                    <Box sx={{ width: '50%', pl: 1 }}>
                      {renderMiniChart(question)}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

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
    </Paper>
  );
}; 