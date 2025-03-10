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

// Modifier les options communes pour centrer les graphiques
const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'top' as const,
      align: 'center' as const,
      labels: {
        padding: 20,
        font: {
          size: 12
        },
        boxWidth: 12,
        usePointStyle: true
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

// Modifier les options pour les graphiques circulaires
const pieOptions = {
  ...commonChartOptions,
  plugins: {
    ...commonChartOptions.plugins,
    legend: {
      ...commonChartOptions.plugins.legend,
      position: 'right' as const
    }
  },
  layout: {
    padding: {
      left: 20,
      right: 20
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

  // Modifier le retour pour inclure datasets comme requis par Chart.js
  return {
    labels: Object.keys(trends),
    datasets: [{
      label: 'Réponses',
      data: Object.values(trends),
      borderColor: 'rgba(102, 126, 234, 0.8)',
      backgroundColor: 'rgba(102, 126, 234, 0.2)',
      fill: true,
      tension: 0.3
    }]
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

// Modifier les options spécifiques pour le graphique des tendances
const trendChartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: false
    },
    title: {
      display: true,
      text: 'Daily Response Distribution',
      font: { 
        size: 18,
        weight: 'bold' as const
      },
      padding: {
        bottom: 30
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      titleColor: '#1a237e',
      bodyColor: '#1a237e',
      borderColor: 'rgba(102, 126, 234, 0.2)',
      borderWidth: 1,
      padding: 12,
      boxPadding: 6,
      usePointStyle: true,
      callbacks: {
        label: (context: any) => `${context.parsed.y} responses`
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        maxRotation: 45,
        minRotation: 45,
        color: '#64748b',
        font: {
          size: 11
        }
      },
      border: {
        display: false
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(102, 126, 234, 0.1)',
        drawBorder: false,
        lineWidth: 1
      },
      ticks: {
        stepSize: 1,
        color: '#64748b',
        font: {
          size: 11
        },
        padding: 10,
        callback: (value: number) => Math.floor(value)
      },
      border: {
        display: false
      }
    }
  },
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 3,
      borderColor: 'rgba(102, 126, 234, 0.8)',
      fill: true,
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
        gradient.addColorStop(1, 'rgba(102, 126, 234, 0)');
        return gradient;
      }
    },
    point: {
      radius: 0,
      hoverRadius: 6,
      backgroundColor: '#ffffff',
      borderColor: 'rgba(102, 126, 234, 0.8)',
      borderWidth: 3,
      hoverBorderWidth: 3,
      hitRadius: 8
    }
  },
  interaction: {
    intersect: false,
    mode: 'index'
  }
} as const;

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
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3
      }}>
        <Typography variant="h5" sx={{ fontWeight: 'medium', color: '#1a237e' }}>
          Analyse détaillée
        </Typography>
        
        <Box>
          <Button
            variant={showFilters ? "contained" : "outlined"}
            startIcon={showFilters ? <ClearIcon /> : <FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
            sx={{
              mr: 1,
              ...(showFilters ? {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              } : {})
            }}
          >
            {showFilters ? "Masquer les filtres" : "Filtres"}
          </Button>
        </Box>
      </Box>

      <Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {showFilters && (
              <>
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
                  </Paper>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#1a237e' }}>
                  Statistiques générales
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total des réponses: <strong>{filteredAnswers.length}</strong>
                  </Typography>
                  {filteredAnswers.length !== responses.length && (
                    <Typography variant="body2" color="text.secondary">
                      (Filtré de {responses.length} réponses totales)
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(102, 126, 234, 0.1)',
                      borderRadius: 1,
                      textAlign: 'center'
                    }}>
                      <Typography variant="caption" color="text.secondary">
                        Première réponse
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#1a237e', fontWeight: 'medium' }}>
                        {filteredAnswers.length > 0 ? 
                          new Date(Math.min(...filteredAnswers.map(r => new Date(r.submittedAt).getTime()))).toLocaleDateString() :
                          'Aucune réponse'
                        }
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(102, 126, 234, 0.1)',
                      borderRadius: 1,
                      textAlign: 'center'
                    }}>
                      <Typography variant="caption" color="text.secondary">
                        Réponses quotidiennes moyennes
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#1a237e', fontWeight: 'medium' }}>
                        {filteredAnswers.length > 0 ? 
                          (filteredAnswers.length / Math.max(1, getDaysBetweenDates(
                            new Date(Math.min(...filteredAnswers.map(r => new Date(r.submittedAt).getTime()))),
                            new Date()
                          ))).toFixed(1) :
                          '0'
                        }
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(102, 126, 234, 0.1)',
                      borderRadius: 1,
                      textAlign: 'center'
                    }}>
                      <Typography variant="caption" color="text.secondary">
                        Dernière réponse
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#1a237e', fontWeight: 'medium' }}>
                        {filteredAnswers.length > 0 ? 
                          new Date(Math.max(...filteredAnswers.map(r => new Date(r.submittedAt).getTime()))).toLocaleDateString() :
                          'Aucune réponse'
                        }
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {filteredAnswers.length > 0 && (
                  <Box sx={{ 
                    height: 300, 
                    mt: 4,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    position: 'relative'
                  }}>
                    <Typography variant="subtitle1" sx={{ mb: 2, color: '#1a237e' }}>
                      Tendance des réponses
                    </Typography>
                    <Box sx={{ 
                      width: '100%',
                      maxWidth: '800px',
                      margin: '0 auto'
                    }}>
                      <Line
                        data={getResponseTrends(filteredAnswers)}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false
                            },
                            title: {
                              display: false
                            },
                            tooltip: {
                              mode: 'index',
                              intersect: false,
                              backgroundColor: '#ffffff',
                              titleColor: '#1a237e',
                              bodyColor: '#475569',
                              borderColor: 'rgba(102, 126, 234, 0.2)',
                              borderWidth: 1,
                              padding: 12,
                              bodyFont: {
                                size: 13
                              },
                              titleFont: {
                                size: 13,
                                weight: 'bold'
                              },
                              callbacks: {
                                label: (context) => `${context.parsed.y} réponses`
                              }
                            }
                          },
                          scales: {
                            x: {
                              grid: {
                                color: 'rgba(102, 126, 234, 0.1)',
                                lineWidth: 1,
                                drawTicks: false
                              },
                              ticks: {
                                font: {
                                  size: 11
                                },
                                color: '#64748b'
                              }
                            },
                            y: {
                              beginAtZero: true,
                              grid: {
                                color: 'rgba(102, 126, 234, 0.1)',
                                lineWidth: 1,
                                drawTicks: false
                              },
                              ticks: {
                                font: {
                                  size: 11
                                },
                                color: '#64748b',
                                precision: 0
                              }
                            }
                          }
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>

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
                              secondary={`${count} réponses (${Math.round((count / total) * 100)}%)`}
                            />
                          </ListItem>
                        ))}
                      </List>

                      <Box sx={{ 
                        height: 300, 
                        mt: 3,
                        mb: 4,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        position: 'relative'
                      }}>
                        <Box sx={{ 
                          width: '100%',
                          maxWidth: '800px',
                          margin: '0 auto'
                        }}>
                          {renderChart(question.id, currentChartType)}
                        </Box>
                      </Box>

                      <Divider sx={{ my: 3 }} />

                      <Stack 
                        direction="row" 
                        spacing={1} 
                        sx={{ 
                          mt: 3,
                          justifyContent: 'center',
                          pt: 1
                        }}
                      >
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
      </Box>
    </Box>
  );
};

// Fonction utilitaire pour calculer le nombre de jours entre deux dates
const getDaysBetweenDates = (start: Date, end: Date) => {
  return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}; 