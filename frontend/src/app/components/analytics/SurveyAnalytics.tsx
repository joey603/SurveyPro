import React, { useState, useEffect, useCallback } from 'react';
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
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  BarChart as BarChartIcon,
  AutoGraph as AutoGraphIcon,
  Email as EmailIcon,
  PieChart as PieChartIcon,
  ShowChart as ShowChartIcon,
  DonutLarge as DonutLargeIcon,
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
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { FilterPanel } from './FilterPanel';

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

type ChartType = 'bar' | 'line' | 'pie' | 'doughnut';

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

// Ajouter cette fonction utilitaire
const getResponseTrends = (responses: SurveyResponse[]) => {
  const trends = responses.reduce((acc: { [key: string]: number }, response) => {
    const date = new Date(response.submittedAt).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  return {
    labels: Object.keys(trends),
    data: Object.values(trends)
  };
};

// Modifier les interfaces de filtrage
interface FilterRule {
  operator: string;
  value: string | number | null;
  secondValue?: string | number | null;
}

interface AnswerFilters {
  [questionId: string]: FilterRule[];
}

interface DemographicFilters {
  gender?: string;
  educationLevel?: string;
  city?: string;
  age?: [number, number];
}

interface Filters {
  demographic: DemographicFilters;
  answers: AnswerFilters;
}

export const SurveyAnalytics: React.FC<SurveyAnalyticsProps> = ({
  open,
  onClose,
  survey,
  responses,
}) => {
  const [loading, setLoading] = useState(false);
  const [surveyAnswers, setSurveyAnswers] = useState<SurveyResponse[]>(responses);
  const [error, setError] = useState<string | null>(null);
  const [chartTypes, setChartTypes] = useState<{ [key: string]: ChartType }>({});
  const [showResponseDetails, setShowResponseDetails] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);
  const [filters, setFilters] = useState<Filters>({
    demographic: {},
    answers: {}
  });
  const [filteredAnswers, setFilteredAnswers] = useState<SurveyResponse[]>(responses);
  const [showFilters, setShowFilters] = useState(false);

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

  // Mettre à jour les réponses filtrées quand les réponses changent
  useEffect(() => {
    setSurveyAnswers(responses);
    setFilteredAnswers(responses);
  }, [responses]);

  const analyzeResponses = useCallback((questionId: string) => {
    const answerCounts: { [key: string]: number } = {};
    let total = 0;
    
    filteredAnswers.forEach(response => {
      const answer = response.answers.find(a => a.questionId === questionId);
      if (answer) {
        answerCounts[answer.answer] = (answerCounts[answer.answer] || 0) + 1;
        total++;
      }
    });
    
    return { answerCounts, total };
  }, [filteredAnswers]);

  const getChartData = useCallback((questionId: string) => {
    const { answerCounts } = analyzeResponses(questionId);
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
  }, [analyzeResponses]);

  const getAvailableChartTypes = (questionType: string): ChartType[] => {
    switch (questionType) {
      case "multiple-choice":
        return ['bar', 'pie', 'doughnut'];
      case "text":
        return ['bar'];
      case "dropdown":
        return ['bar', 'pie', 'doughnut'];
      case "yes-no":
        return ['pie', 'doughnut', 'bar'];
      case "slider":
        return ['bar', 'line'];
      case "rating":
        return ['bar', 'line'];
      default:
        return ['bar'];
    }
  };

  const getChartIcon = (type: ChartType) => {
    switch (type) {
      case 'bar':
        return <BarChartIcon />;
      case 'line':
        return <ShowChartIcon />;
      case 'pie':
        return <PieChartIcon />;
      case 'doughnut':
        return <DonutLargeIcon />;
      default:
        return <BarChartIcon />;
    }
  };

  const renderChart = (questionId: string, chartType: ChartType) => {
    const data = getChartData(questionId);
    const options = ['pie', 'doughnut'].includes(chartType) ? pieOptions : commonChartOptions;

    switch (chartType) {
      case 'bar':
        return <Bar data={data} options={options} />;
      case 'line':
        return <Line data={data} options={options} />;
      case 'pie':
        return <Pie data={data} options={options} />;
      case 'doughnut':
        return <Doughnut data={data} options={options} />;
      default:
        return <Bar data={data} options={options} />;
    }
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

  // Fonction pour analyser les données démographiques
  const analyzeDemographicData = useCallback(() => {
    const stats = {
      gender: {} as { [key: string]: number },
      education: {} as { [key: string]: number },
      city: {} as { [key: string]: number },
      ageDistribution: [] as number[],
    };

    filteredAnswers.forEach(response => {
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
  }, [filteredAnswers]);

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

  // Ajouter cette fonction pour calculer les statistiques générales
  const getGeneralStats = useCallback(() => {
    const totalResponses = filteredAnswers.length;
    const responsesPerDay = totalResponses / (Math.max(1, getDaysBetweenDates(
      new Date(Math.min(...filteredAnswers.map(r => new Date(r.submittedAt).getTime()))),
      new Date()
    )));
    
    const completionRates = survey.questions.map(question => {
      const answeredCount = filteredAnswers.filter(response => 
        response.answers.some(a => a.questionId === question.id && a.answer)
      ).length;
      return {
        questionId: question.id,
        rate: (answeredCount / totalResponses) * 100
      };
    });

    return {
      totalResponses,
      responsesPerDay: responsesPerDay.toFixed(1),
      averageCompletionRate: (completionRates.reduce((acc, curr) => acc + curr.rate, 0) / survey.questions.length).toFixed(1),
      completionRates
    };
  }, [filteredAnswers, survey.questions]);

  // Ajouter cette fonction pour évaluer les règles de filtrage
  const evaluateRule = (value: any, rule: { operator: string; value: any; secondValue?: any }) => {
    const safeValue = value ?? null;
    const safeRuleValue = rule.value ?? null;

    switch (rule.operator) {
      case 'equals':
        return safeValue === safeRuleValue;
      case 'not':
        return safeValue !== safeRuleValue;
      case 'greater':
        return Number(safeValue) > Number(safeRuleValue);
      case 'less':
        return Number(safeValue) < Number(safeRuleValue);
      case 'between':
        if (rule.secondValue === undefined) return false;
        const numValue = Number(safeValue);
        const min = Number(safeRuleValue);
        const max = Number(rule.secondValue);
        return numValue >= min && numValue <= max;
      case 'contains':
        return String(safeValue).toLowerCase().includes(String(safeRuleValue).toLowerCase());
      case 'not_contains':
        return !String(safeValue).toLowerCase().includes(String(safeRuleValue).toLowerCase());
      default:
        return true;
    }
  };

  // Modifier la fonction applyFilters
  const applyFilters = useCallback(() => {
    console.log('Applying filters:', filters);
    
    const filtered = surveyAnswers.filter(response => {
      // Vérifier les filtres démographiques
      if (filters.demographic.gender && 
          response.respondent?.demographic?.gender !== filters.demographic.gender) {
        return false;
      }
      if (filters.demographic.educationLevel && 
          response.respondent?.demographic?.educationLevel !== filters.demographic.educationLevel) {
        return false;
      }

      // Vérifier les filtres de réponses
      for (const [questionId, rules] of Object.entries(filters.answers)) {
        if (!rules?.length) continue;
        
        const answer = response.answers.find(a => a.questionId === questionId);
        if (!answer) return false;

        const rule = rules[0];
        if (!rule?.value) continue;

        if (!evaluateRule(answer.answer, rule)) {
          return false;
        }
      }

      return true;
    });

    console.log('Filtered responses:', filtered.length);
    setFilteredAnswers(filtered);
  }, [filters, surveyAnswers]);

  // Modifier la fonction handleApplyFilters
  const handleApplyFilters = (newFilters: Filters) => {
    console.log('New filters:', newFilters);
    setFilters(newFilters);
    setTimeout(() => {
      const filtered = surveyAnswers.filter(response => {
        // Vérifier les filtres démographiques
        if (newFilters.demographic.gender && 
            response.respondent?.demographic?.gender !== newFilters.demographic.gender) {
          return false;
        }
        if (newFilters.demographic.educationLevel && 
            response.respondent?.demographic?.educationLevel !== newFilters.demographic.educationLevel) {
          return false;
        }

        // Vérifier les filtres de réponses
        for (const [questionId, rules] of Object.entries(newFilters.answers)) {
          if (!rules?.length) continue;
          
          const answer = response.answers.find(a => a.questionId === questionId);
          if (!answer) return false;

          const rule = rules[0];
          if (!rule?.value) continue;

          if (!evaluateRule(answer.answer, rule)) {
            return false;
          }
        }

        return true;
      });

      setFilteredAnswers(filtered);
    }, 0);
  };

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
              <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Survey Overview
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="primary">
                        {filteredAnswers.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Responses
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="primary">
                        {getGeneralStats().responsesPerDay}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Responses/Day
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="primary">
                        {getGeneralStats().averageCompletionRate}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Completion Rate
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="primary">
                        {survey.questions.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Questions
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Section des filtres */}
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                <FilterPanel
                  survey={survey}
                  onApplyFilters={handleApplyFilters}
                  onClearFilters={() => {
                    setFilters({ demographic: {}, answers: {} });
                    setFilteredAnswers(surveyAnswers);
                  }}
                />

                {filteredAnswers.length !== surveyAnswers.length && (
                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={`Showing ${filteredAnswers.length} of ${surveyAnswers.length} responses`}
                      onDelete={() => {
                        setFilters({ demographic: {}, answers: {} });
                        setFilteredAnswers(surveyAnswers);
                      }}
                      color="primary"
                    />
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Tendances des réponses */}
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Response Trends
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line
                    data={{
                      labels: getResponseTrends(filteredAnswers).labels,
                      datasets: [{
                        label: 'Responses per Day',
                        data: getResponseTrends(filteredAnswers).data,
                        borderColor: colors.primary.main,
                        backgroundColor: colors.primary.transparent,
                        tension: 0.4
                      }]
                    }}
                    options={commonChartOptions}
                  />
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
                    {renderPathTree(createPathTree(filteredAnswers))}
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
            {survey.questions.map((question: any, index: number) => {
              const { answerCounts, total } = analyzeResponses(question.id);
              const availableChartTypes = getAvailableChartTypes(question.type);
              const currentChartType = chartTypes[question.id] || availableChartTypes[0];

              return (
                <Grid item xs={12} key={question.id}>
                  <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start', 
                      mb: 2 
                    }}>
                      <Box>
                        <Typography variant="h6" sx={{ color: '#1a237e' }}>
                          Question {index + 1}: {question.text}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                          Type: {question.type}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ mt: 2 }}>
                      <List>
                        {Object.entries(answerCounts).map(([answer, count]) => (
                          <ListItem key={answer}>
                            <ListItemText
                              primary={answer}
                              secondary={`${count} responses (${Math.round((count / total) * 100)}%)`}
                            />
                          </ListItem>
                        ))}
                      </List>

                      <Box sx={{ height: 300, mt: 3 }}>
                        {renderChart(question.id, currentChartType)}
                      </Box>

                      <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'center' }}>
                        {availableChartTypes.map((type) => (
                          <Button
                            key={type}
                            onClick={() => setChartTypes(prev => ({ ...prev, [question.id]: type }))}
                            variant={currentChartType === type ? 'contained' : 'outlined'}
                            startIcon={getChartIcon(type)}
                            sx={{
                              ...(currentChartType === type ? {
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

// Fonction utilitaire pour calculer le nombre de jours entre deux dates
const getDaysBetweenDates = (start: Date, end: Date) => {
  return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}; 