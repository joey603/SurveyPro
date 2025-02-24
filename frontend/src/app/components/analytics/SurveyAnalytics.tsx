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
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  BarChart as BarChartIcon,
  AutoGraph as AutoGraphIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { colors } from '@/theme/colors';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import { TreeView, TreeItem } from '@mui/lab';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getSurveyAnswers } from '@/utils/surveyService';
import { toast } from 'react-toastify';
import { calculateAge } from '../../../utils/dateUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

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

interface PathNode {
  questionId: string;
  answer: string;
  next?: { [key: string]: PathNode };
  count: number;
}

// Ajout des constantes pour les options de graphiques
const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        padding: 20,
        font: {
          size: 12
        }
      }
    },
    title: {
      display: true,
      font: { 
        size: 16,
        weight: 'bold' as const
      },
      padding: 20
    }
  }
};

const pieOptions = {
  ...commonChartOptions,
  plugins: {
    ...commonChartOptions.plugins,
    legend: {
      ...commonChartOptions.plugins.legend,
      position: 'right' as const
    }
  }
};

const chartColors = {
  backgrounds: [
    'rgba(102, 126, 234, 0.6)',
    'rgba(118, 75, 162, 0.6)',
    'rgba(75, 192, 192, 0.6)',
    'rgba(255, 159, 64, 0.6)',
    'rgba(255, 99, 132, 0.6)',
  ],
  borders: [
    'rgba(102, 126, 234, 1)',
    'rgba(118, 75, 162, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(255, 159, 64, 1)',
    'rgba(255, 99, 132, 1)',
  ]
};

export const SurveyAnalytics: React.FC<SurveyAnalyticsProps> = ({
  open,
  onClose,
  survey,
  responses,
}) => {
  const [loading, setLoading] = useState(false);
  const [surveyAnswers, setSurveyAnswers] = useState<SurveyResponse[]>(responses);
  const [error, setError] = useState<string | null>(null);

  // Charger les réponses au montage du composant
  useEffect(() => {
    const loadAnswers = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken') || '';
        const answers = await getSurveyAnswers(survey._id, token);
        setSurveyAnswers(answers);
      } catch (error) {
        console.error('Error loading survey answers:', error);
        setError('Failed to load survey answers');
        toast.error('Failed to load survey answers');
      } finally {
        setLoading(false);
      }
    };

    loadAnswers();
  }, [survey._id]);

  // Fonction pour analyser les réponses d'une question
  const analyzeQuestionResponses = (question: Question) => {
    const answerCounts: { [key: string]: number } = {};
    
    surveyAnswers.forEach(response => {
      const answer = response.answers.find(a => a.questionId === question.id);
      if (answer) {
        answerCounts[answer.answer] = (answerCounts[answer.answer] || 0) + 1;
      }
    });

    return answerCounts;
  };

  // Fonction pour créer l'arbre des chemins pour les sondages dynamiques
  const createPathTree = (responses: SurveyResponse[]): PathNode => {
    const root: PathNode = { questionId: 'root', answer: '', count: responses.length };
    
    responses.forEach(response => {
      let currentNode = root;
      response.answers.forEach(answer => {
        if (!currentNode.next) currentNode.next = {};
        if (!currentNode.next[answer.questionId]) {
          currentNode.next[answer.questionId] = {
            questionId: answer.questionId,
            answer: answer.answer,
            count: 1
          };
        } else {
          currentNode.next[answer.questionId].count++;
        }
        currentNode = currentNode.next[answer.questionId];
      });
    });

    return root;
  };

  // Fonction pour générer les données du graphique
  const getChartData = (question: Question, answerCounts: { [key: string]: number }) => {
    return {
      labels: Object.keys(answerCounts),
      datasets: [{
        label: 'Réponses',
        data: Object.values(answerCounts),
        backgroundColor: [
          'rgba(102, 126, 234, 0.6)',
          'rgba(118, 75, 162, 0.6)',
          'rgba(79, 99, 196, 0.6)',
          'rgba(142, 94, 189, 0.6)',
        ],
        borderColor: [
          'rgba(102, 126, 234, 1)',
          'rgba(118, 75, 162, 1)',
          'rgba(79, 99, 196, 1)',
          'rgba(142, 94, 189, 1)',
        ],
        borderWidth: 1,
      }],
    };
  };

  // Fonction pour rendre l'arbre des chemins
  const renderPathTree = (node: PathNode, level: number = 0): JSX.Element => {
    const question = survey.questions.find(q => q.id === node.questionId);
    const label = question 
      ? `${question.text}: ${node.answer} (${node.count} réponses)`
      : `Root (${node.count} réponses)`;

    return (
      <TreeItem
        key={`${node.questionId}-${node.answer}`}
        nodeId={`${node.questionId}-${node.answer}`}
        label={label}
      >
        {node.next && Object.values(node.next).map(childNode =>
          renderPathTree(childNode, level + 1)
        )}
      </TreeItem>
    );
  };

  // Fonction pour choisir le type de graphique approprié
  const renderChart = (question: Question, answerCounts: { [key: string]: number }) => {
    const chartData = getChartData(question, answerCounts);
    const chartOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: question.text,
        },
      },
    };

    switch (question.type) {
      case 'multiple-choice':
      case 'dropdown':
        return <Pie data={chartData} options={chartOptions} />;
      case 'slider':
      case 'rating':
        return <Line data={chartData} options={chartOptions} />;
      default:
        return <Bar data={chartData} options={chartOptions} />;
    }
  };

  // Fonction pour analyser les données démographiques
  const analyzeDemographicData = () => {
    const stats = {
      gender: {} as { [key: string]: number },
      education: {} as { [key: string]: number },
      city: {} as { [key: string]: number },
      ageDistribution: [] as number[],
    };

    surveyAnswers.forEach(response => {
      const demographic = response.respondent?.demographic;
      if (demographic) {
        // Genre
        if (demographic.gender) {
          stats.gender[demographic.gender] = (stats.gender[demographic.gender] || 0) + 1;
        }

        // Éducation
        if (demographic.educationLevel) {
          stats.education[demographic.educationLevel] = (stats.education[demographic.educationLevel] || 0) + 1;
        }

        // Ville
        if (demographic.city) {
          stats.city[demographic.city] = (stats.city[demographic.city] || 0) + 1;
        }

        // Âge
        if (demographic.dateOfBirth) {
          const age = calculateAge(new Date(demographic.dateOfBirth));
          if (age >= 0 && age <= 100) {
            stats.ageDistribution[age] = (stats.ageDistribution[age] || 0) + 1;
          }
        }
      }
    });

    return stats;
  };

  // Fonction pour rendre le graphique d'âge
  const renderAgeChart = (data: number[]) => {
    const labels = Object.keys(data).filter(age => data[parseInt(age)] > 0);
    const values = labels.map(age => data[parseInt(age)]);

    return (
      <Line
        data={{
          labels,
          datasets: [{
            label: 'Number of Respondents',
            data: values,
            backgroundColor: chartColors.backgrounds[0],
            borderColor: chartColors.borders[0],
            borderWidth: 2,
            tension: 0.4,
          }]
        }}
        options={{
          ...commonChartOptions,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 },
              grid: {
                color: 'rgba(102, 126, 234, 0.1)',
                display: true
              }
            },
            x: {
              grid: { display: false }
            }
          }
        }}
      />
    );
  };

  const demographicStats = survey.demographicEnabled ? analyzeDemographicData() : null;

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
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {/* Statistiques générales */}
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    icon={<BarChartIcon sx={{ fontSize: 16 }} />}
                    label={`${surveyAnswers.length} Responses`}
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

            {/* Arbre des chemins pour les sondages dynamiques */}
            {survey.questions.some(q => q.type === 'dynamic') && (
              <Grid item xs={12}>
                <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Path Analysis
                  </Typography>
                  <TreeView
                    defaultCollapseIcon={<ExpandMoreIcon />}
                    defaultExpandIcon={<ChevronRightIcon />}
                  >
                    {renderPathTree(createPathTree(surveyAnswers))}
                  </TreeView>
                </Paper>
              </Grid>
            )}

            {/* Données démographiques */}
            {survey.demographicEnabled && demographicStats && (
              <>
                {/* Genre */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2, borderRadius: 2, height: '400px' }}>
                    <Typography variant="h6" gutterBottom align="center">
                      Distribution by Gender
                    </Typography>
                    <Box sx={{ height: 'calc(100% - 60px)' }}>
                      <Pie
                        data={{
                          labels: Object.keys(demographicStats.gender),
                          datasets: [{
                            data: Object.values(demographicStats.gender),
                            backgroundColor: chartColors.backgrounds,
                            borderColor: chartColors.borders,
                            borderWidth: 1
                          }]
                        }}
                        options={pieOptions}
                      />
                    </Box>
                  </Paper>
                </Grid>

                {/* Éducation */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2, borderRadius: 2, height: '400px' }}>
                    <Typography variant="h6" gutterBottom align="center">
                      Distribution by Education Level
                    </Typography>
                    <Box sx={{ height: 'calc(100% - 60px)' }}>
                      <Bar
                        data={{
                          labels: Object.keys(demographicStats.education),
                          datasets: [{
                            data: Object.values(demographicStats.education),
                            backgroundColor: chartColors.backgrounds,
                            borderColor: chartColors.borders,
                            borderWidth: 1
                          }]
                        }}
                        options={commonChartOptions}
                      />
                    </Box>
                  </Paper>
                </Grid>

                {/* Âge */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2, borderRadius: 2, height: '400px' }}>
                    <Typography variant="h6" gutterBottom align="center">
                      Age Distribution
                    </Typography>
                    <Box sx={{ height: 'calc(100% - 60px)' }}>
                      {renderAgeChart(demographicStats.ageDistribution)}
                    </Box>
                  </Paper>
                </Grid>

                {/* Ville */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2, borderRadius: 2, height: '400px' }}>
                    <Typography variant="h6" gutterBottom align="center">
                      Distribution by City
                    </Typography>
                    <Box sx={{ height: 'calc(100% - 60px)' }}>
                      <Doughnut
                        data={{
                          labels: Object.keys(demographicStats.city),
                          datasets: [{
                            data: Object.values(demographicStats.city),
                            backgroundColor: chartColors.backgrounds,
                            borderColor: chartColors.borders,
                            borderWidth: 1
                          }]
                        }}
                        options={pieOptions}
                      />
                    </Box>
                  </Paper>
                </Grid>
              </>
            )}

            {/* Questions et réponses avec graphiques */}
            {survey.questions.map((question) => {
              const answerCounts = analyzeQuestionResponses(question);
              const totalResponses = Object.values(answerCounts).reduce((a, b) => a + b, 0);
              const mostFrequentAnswer = Object.entries(answerCounts).length > 0 
                ? Object.entries(answerCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]
                : 'No answer';

              return (
                <Grid item xs={12} key={question.id}>
                  <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      {question.text}
                    </Typography>
                    <Box sx={{ height: 300, mt: 2 }}>
                      {renderChart(question, answerCounts)}
                    </Box>
                    
                    {/* Statistiques détaillées */}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Statistics:
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2">
                            Total responses: {totalResponses}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2">
                            Most frequent answer: {mostFrequentAnswer}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
}; 