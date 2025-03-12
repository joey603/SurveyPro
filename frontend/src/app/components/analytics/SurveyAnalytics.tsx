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
  TableView as TableViewIcon,
  Code as CodeIcon,
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
import { AdvancedFilterPanel } from './AdvancedFilterPanel';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { QuestionDetailsDialog } from './QuestionDetailsDialog';
import { DemographicStatistics } from './DemographicStatistics';

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

interface QuestionDetails {
  questionId: string;
  question: Question;
  answers: SurveyResponse[];
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
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionDetails | null>(null);
  const [showAllResponses, setShowAllResponses] = useState<{[key: string]: boolean}>({});

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

  // Fonction pour obtenir les types de graphiques disponibles pour un type de question
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

  // Fonction pour obtenir l'icône d'un type de graphique
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

  // Fonction pour rendre un graphique
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

  // Remplacer la fonction handleApplyFilters par une nouvelle qui prend directement les réponses filtrées
  const handleApplyFilters = (filteredResponses: SurveyResponse[]) => {
    setFilteredAnswers(filteredResponses);
  };

  // Fonction pour calculer les statistiques d'une question
  const calculateQuestionStats = useCallback((questionId: string) => {
    const { answerCounts, total } = analyzeResponses(questionId);
    
    // Trouver la réponse la plus fréquente
    let mostCommonAnswer = '';
    let maxCount = 0;
    
    Object.entries(answerCounts).forEach(([answer, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonAnswer = answer;
      }
    });
    
    const percentages = Object.entries(answerCounts).reduce((acc, [answer, count]) => {
      acc[answer] = Math.round((count / total) * 100);
      return acc;
    }, {} as { [key: string]: number });
    
    return {
      total,
      answerCounts,
      percentages,
      mostCommonAnswer,
      maxCount
    };
  }, [analyzeResponses]);

  // Fonction pour afficher un résumé de la question
  const renderQuestionSummary = (question: Question) => {
    const stats = calculateQuestionStats(question.id);
    
    if (stats.total === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Aucune réponse pour cette question.
        </Typography>
      );
    }
    
    switch (question.type) {
      case 'multiple-choice':
      case 'dropdown':
      case 'yes-no':
        return (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Réponse la plus fréquente: <strong>{stats.mostCommonAnswer}</strong> ({stats.percentages[stats.mostCommonAnswer]}% des réponses)
            </Typography>
            <Box sx={{ mt: 2 }}>
              {Object.entries(stats.answerCounts).map(([answer, count]) => (
                <Box key={answer} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{answer}</Typography>
                    <Typography variant="body2">{count} ({stats.percentages[answer]}%)</Typography>
                  </Box>
                  <Box sx={{ width: '100%', bgcolor: 'rgba(102, 126, 234, 0.1)', borderRadius: 1, height: 8 }}>
                    <Box
                      sx={{
                        width: `${stats.percentages[answer]}%`,
                        bgcolor: 'rgba(102, 126, 234, 0.8)',
                        borderRadius: 1,
                        height: 8
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        );
      case 'text':
        const entries = Object.entries(stats.answerCounts);
        const initialDisplayCount = 3;
        const hasMoreResponses = entries.length > initialDisplayCount;
        const displayedEntries = showAllResponses[question.id] 
          ? entries 
          : entries.slice(0, initialDisplayCount);
        
        return (
          <Box>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Réponses: <strong>{stats.total}</strong>
            </Typography>
            <Box sx={{ mt: 2 }}>
              {displayedEntries.map(([answer, count]) => (
                <Box key={answer} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{answer}</Typography>
                    <Typography variant="body2">{count} ({stats.percentages[answer]}%)</Typography>
                  </Box>
                  <Box sx={{ width: '100%', bgcolor: 'rgba(102, 126, 234, 0.1)', borderRadius: 1, height: 8 }}>
                    <Box
                      sx={{
                        width: `${stats.percentages[answer]}%`,
                        bgcolor: 'rgba(102, 126, 234, 0.8)',
                        borderRadius: 1,
                        height: 8
                      }}
                    />
                  </Box>
                </Box>
              ))}
              
              {hasMoreResponses && (
                <Button 
                  onClick={() => setShowAllResponses(prev => ({
                    ...prev,
                    [question.id]: !prev[question.id]
                  }))}
                  startIcon={showAllResponses[question.id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                  sx={{ 
                    mt: 1, 
                    color: '#667eea',
                    '&:hover': {
                      backgroundColor: 'rgba(102, 126, 234, 0.04)'
                    }
                  }}
                >
                  {showAllResponses[question.id] 
                    ? "Voir moins" 
                    : `Voir ${entries.length - initialDisplayCount} réponses supplémentaires`}
                </Button>
              )}
            </Box>
          </Box>
        );
      case 'rating':
      case 'slider':
        const values = Object.keys(stats.answerCounts).map(Number).sort((a, b) => a - b);
        const min = values[0];
        const max = values[values.length - 1];
        const sum = values.reduce((acc, val) => acc + (val * stats.answerCounts[val]), 0);
        const avg = (sum / stats.total).toFixed(1);
        
        return (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Note moyenne: <strong>{avg}</strong> (plage: {min} - {max})
            </Typography>
            <Box sx={{ mt: 2 }}>
              {values.map(value => (
                <Box key={value} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Note {value}</Typography>
                    <Typography variant="body2">{stats.answerCounts[value]} ({stats.percentages[value]}%)</Typography>
                  </Box>
                  <Box sx={{ width: '100%', bgcolor: 'rgba(102, 126, 234, 0.1)', borderRadius: 1, height: 8 }}>
                    <Box
                      sx={{
                        width: `${stats.percentages[value]}%`,
                        bgcolor: 'rgba(102, 126, 234, 0.8)',
                        borderRadius: 1,
                        height: 8
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        );
      default:
        return (
          <Typography variant="body2" color="text.secondary">
            {stats.total} réponses reçues pour cette question.
          </Typography>
        );
    }
  };

  // Fonction pour gérer le clic sur une question
  const handleQuestionClick = (questionId: string) => {
    const question = survey.questions.find(q => q.id === questionId);
    if (!question) return;
    
    // Filtrer les réponses pour cette question
    const questionAnswers = filteredAnswers.filter(response => 
      response.answers.some(a => a.questionId === questionId)
    );
    
    // Définir la question sélectionnée avec ses réponses
    setSelectedQuestion({
      questionId,
      question,
      answers: questionAnswers
    });
    
    // Ouvrir la boîte de dialogue ou changer la vue
    setShowResponseDetails(true);
  };

  // Fonction pour préparer les données pour l'exportation
  const prepareExportData = useCallback(() => {
    if (!survey || filteredAnswers.length === 0) return [];

    return filteredAnswers.map(response => {
      const questionAnswers = survey.questions.reduce((acc: any, question) => {
        const questionAnswer = response.answers.find(a => a.questionId === question.id);
        acc[question.text] = questionAnswer?.answer || 'Pas de réponse';
        return acc;
      }, {});

      return {
        respondentId: response._id,
        submittedAt: response.submittedAt,
        demographic: response.respondent?.demographic ? {
          gender: response.respondent.demographic.gender,
          dateOfBirth: response.respondent.demographic.dateOfBirth,
          educationLevel: response.respondent.demographic.educationLevel,
          city: response.respondent.demographic.city
        } : null,
        ...questionAnswers
      };
    });
  }, [survey, filteredAnswers]);

  // Fonction pour exporter en CSV
  const exportToCSV = useCallback(() => {
    if (!survey) return;

    const data = prepareExportData();
    if (data.length === 0) return;

    // Créer les en-têtes
    const headers = [
      'ID Répondant',
      'Date de soumission',
      'Genre',
      'Date de naissance',
      'Niveau d\'éducation',
      'Ville',
      ...survey.questions.map(q => q.text)
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(item => [
        item.respondentId,
        item.submittedAt,
        item.demographic?.gender || '',
        item.demographic?.dateOfBirth || '',
        item.demographic?.educationLevel || '',
        item.demographic?.city || '',
        ...survey.questions.map(q => `"${item[q.text]}"`)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resultats_sondage_${survey._id}.csv`;
    link.click();
  }, [survey, prepareExportData]);

  // Fonction pour exporter en JSON
  const exportToJSON = useCallback(() => {
    if (!survey) return;

    const data = prepareExportData();
    if (data.length === 0) return;

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resultats_sondage_${survey._id}.json`;
    link.click();
  }, [survey, prepareExportData]);

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
            <Grid item xs={12}>
                <AdvancedFilterPanel
                  survey={survey}
                  responses={surveyAnswers}
                  onApplyFilters={handleApplyFilters}
                />
                  </Grid>
            )}

            {/* Section Survey Questions - déplacée au-dessus des statistiques générales */}
            <Grid item xs={12}>
              <Typography variant="h5" sx={{ fontWeight: 'medium', color: '#1a237e', mb: 3 }}>
                Questions du sondage
                      </Typography>
              
              {survey.questions.map((question, index) => {
                const stats = calculateQuestionStats(question.id);
                
                return (
                  <Paper
                    key={question.id}
                    elevation={1}
                    sx={{
                      p: 3,
                      mb: 3,
                      borderRadius: 2,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(102, 126, 234, 0.1)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" sx={{ color: '#1a237e' }}>
                        Question {index + 1}: {question.text}
                      </Typography>
                      <Typography variant="subtitle2" color="text.secondary">
                        Type: {question.type}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2">
                          Total des réponses: <strong>{stats.total}</strong>
                      </Typography>
                        {stats.total > 0 && stats.mostCommonAnswer && (
                          <Typography variant="body2">
                            Réponse la plus fréquente: <strong>{stats.mostCommonAnswer}</strong>
                      </Typography>
                        )}
                    </Box>
                      
                      <Button
                        variant="contained"
                        startIcon={<BarChartIcon />}
                        onClick={() => handleQuestionClick(question.id)}
                        disabled={stats.total === 0}
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                          },
                          '&.Mui-disabled': {
                            background: 'rgba(0, 0, 0, 0.12)',
                            color: 'rgba(0, 0, 0, 0.26)'
                          }
                        }}
                      >
                        Voir détails ({stats.total} réponses)
                      </Button>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                  <Box sx={{ mt: 2 }}>
                      {renderQuestionSummary(question)}
                  </Box>
              </Paper>
                );
              })}
            </Grid>

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

                {/* Boutons d'exportation */}
                {filteredAnswers.length > 0 && (
                    <Box sx={{ 
                    mt: 4, 
                    pt: 3, 
                    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                    justifyContent: 'center'
                  }}>
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        startIcon={<TableViewIcon />}
                        onClick={exportToCSV}
                        sx={{ 
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                          }
                        }}
                      >
                        Exporter en CSV
                      </Button>
                          <Button
                        variant="contained"
                        startIcon={<CodeIcon />}
                        onClick={exportToJSON}
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                          }
                        }}
                      >
                        Exporter en JSON
                          </Button>
                      </Stack>
                    </Box>
                )}
                  </Paper>
                </Grid>

            {/* Ajouter la section des statistiques démographiques si des données démographiques sont disponibles */}
            {survey.demographicEnabled && filteredAnswers.some(response => response.respondent?.demographic) && (
              <Grid item xs={12}>
                <DemographicStatistics 
                  responses={responses}
                  filteredResponses={filteredAnswers}
                />
          </Grid>
        )}
          </Grid>
        )}
      </Box>

      {/* Remplacer la boîte de dialogue existante par le nouveau composant */}
      <QuestionDetailsDialog
        open={showResponseDetails}
        onClose={() => setShowResponseDetails(false)}
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

// Fonction utilitaire pour calculer le nombre de jours entre deux dates
const getDaysBetweenDates = (start: Date, end: Date) => {
  return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}; 