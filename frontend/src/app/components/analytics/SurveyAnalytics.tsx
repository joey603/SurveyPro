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
  isDynamic?: boolean;
  nodes?: any[];
  edges?: any[];
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
        padding: 10,
        font: {
          size: 11
        },
        boxWidth: 10,
        usePointStyle: true
      }
    },
    title: {
      display: true,
      font: { 
        size: 14,
        weight: 'bold' as const
      },
      padding: 10
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
      position: 'bottom' as const,
      align: 'center' as const
    }
  },
  layout: {
    padding: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20
    }
  },
  aspectRatio: 1.2
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
  // Regrouper les réponses par date
  const trendsByDate = responses.reduce((acc: { [key: string]: number }, response) => {
    const date = new Date(response.submittedAt).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  // Trier les dates chronologiquement
  const dates = Object.keys(trendsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const counts = dates.map(date => trendsByDate[date]);
  
  // Calculer des statistiques
  const maxResponsesDay = dates.reduce((max, date) => 
    trendsByDate[date] > trendsByDate[max] ? date : max, dates[0] || '');
  
  const totalResponses = counts.reduce((sum, count) => sum + count, 0);
  
  // Calculer la tendance
  let trend = 'stable';
  let trendPercentage = 0;
  if (dates.length > 1) {
    const firstHalf = counts.slice(0, Math.floor(counts.length / 2));
    const secondHalf = counts.slice(Math.floor(counts.length / 2));
    const firstHalfAvg = firstHalf.reduce((sum, count) => sum + count, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, count) => sum + count, 0) / secondHalf.length;
    
    if (firstHalfAvg > 0) {
      trendPercentage = Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100);
    }
    
    if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'increasing';
    else if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'decreasing';
  }
  
  // Calculer la répartition par jour de la semaine
  const dayOfWeekDistribution = [0, 0, 0, 0, 0, 0, 0]; // dim, lun, mar, mer, jeu, ven, sam
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  dates.forEach(dateStr => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0 = dimanche, 6 = samedi
    dayOfWeekDistribution[dayOfWeek] += trendsByDate[dateStr];
  });
  
  // Trouver le jour de la semaine le plus actif
  let mostActiveDay = 0;
  dayOfWeekDistribution.forEach((count, index) => {
    if (count > dayOfWeekDistribution[mostActiveDay]) {
      mostActiveDay = index;
    }
  });
  
  return {
    byDate: trendsByDate,
    dates,
    counts,
    maxResponsesDay,
    maxResponsesCount: maxResponsesDay ? trendsByDate[maxResponsesDay] : 0,
    trend,
    trendPercentage,
    total: totalResponses,
    dayOfWeekDistribution,
    dayNames,
    mostActiveDay,
    // Pour Chart.js
    chartData: {
      labels: dates,
      datasets: [{
        label: 'Responses',
        data: counts,
        borderColor: 'rgba(102, 126, 234, 0.8)',
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        fill: true,
        tension: 0.3
      }]
    }
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
    
    // Utiliser les réponses filtrées si elles existent, sinon utiliser toutes les réponses
    const responsesToAnalyze = filteredAnswers.length > 0 ? filteredAnswers : surveyAnswers;
    
    responsesToAnalyze.forEach(response => {
      const answer = response.answers.find(a => a.questionId === questionId);
      if (answer) {
        answerCounts[answer.answer] = (answerCounts[answer.answer] || 0) + 1;
        total++;
      }
    });
    
    return { answerCounts, total };
  }, [filteredAnswers, surveyAnswers]);

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

    // Ajuster les options pour maintenir une taille cohérente
    const chartOptions = {
      ...options,
      maintainAspectRatio: true,
      responsive: true,
    };

    // Pour les graphiques circulaires, centrer les données
    if (chartType === 'pie' || chartType === 'doughnut') {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          width: '100%',
          height: '100%'
        }}>
          {chartType === 'pie' 
            ? <Pie data={data} options={chartOptions} /> 
            : <Doughnut data={data} options={chartOptions} />
          }
        </Box>
      );
    }

    switch (chartType) {
      case 'bar':
        return <Bar data={data} options={chartOptions} />;
      case 'line':
        return <Line data={data} options={chartOptions} />;
      default:
        return <Bar data={data} options={chartOptions} />;
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
      ? `${question.text}: ${node.answer} (${node.count} responses)`
      : `Root (${node.count} responses)`;

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
    console.log("handleApplyFilters called in SurveyAnalytics with", filteredResponses.length, "responses");
    
    // Si aucune réponse ne correspond aux filtres, ne pas mettre à jour filteredAnswers
    // pour éviter que les questions disparaissent
    if (filteredResponses.length === 0 && surveyAnswers.length > 0) {
      toast.info("No responses match the selected filters. Showing all responses.");
      // Ne pas mettre à jour filteredAnswers pour conserver l'affichage des questions
      return;
    }
    
    console.log("Setting filteredAnswers to", filteredResponses);
    setFilteredAnswers(filteredResponses);
    
    if (filteredResponses.length < surveyAnswers.length) {
      toast.info(`${filteredResponses.length} responses match the filters out of ${surveyAnswers.length} total.`);
    }
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
          {filteredAnswers.length === 0 && surveyAnswers.length > 0 
            ? "No responses match the current filters. Try adjusting your filters to see data."
            : "No responses for this question."}
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
              Most frequent answer: <strong>{stats.mostCommonAnswer}</strong> ({stats.percentages[stats.mostCommonAnswer]}% of responses)
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
              Total responses: <strong>{stats.total}</strong>
            </Typography>
            <Box sx={{ mt: 2 }}>
              {filteredAnswers.length < surveyAnswers.length && (
                <Typography variant="caption" color="text.secondary">
                  (Filtered from {surveyAnswers.length} total responses)
                </Typography>
              )}
              {stats.total > 0 && stats.mostCommonAnswer && (
                <Typography variant="body2">
                  Most frequent answer: <strong>{stats.mostCommonAnswer}</strong>
                </Typography>
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
              Average note: <strong>{avg}</strong> (range: {min} - {max})
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
            {stats.total} responses received for this question.
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

  // Fonction pour obtenir les questions à afficher (questions standard ou nœuds pour les sondages dynamiques)
  const getQuestionsToDisplay = () => {
    if (survey.isDynamic && survey.nodes) {
      // Pour les sondages dynamiques, extraire les questions des nœuds
      return survey.nodes.map(node => ({
        id: node.id,
        text: node.data?.text || node.data?.label || 'Question sans texte',
        type: node.data?.questionType || node.data?.type || 'text',
        options: node.data?.options || []
      }));
    }
    // Pour les sondages standard, utiliser les questions normales
    return survey.questions;
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
          Detailed Analysis
          {survey.isDynamic && (
            <Chip 
              size="small" 
              icon={<AutoGraphIcon />} 
              label="Dynamic Survey" 
              sx={{ ml: 1, backgroundColor: colors.primary.transparent, color: colors.primary.main }}
            />
          )}
          {filteredAnswers.length < surveyAnswers.length && filteredAnswers.length > 0 && (
            <Chip 
              size="small" 
              icon={<FilterListIcon />} 
              label={`Filtered: ${filteredAnswers.length}/${surveyAnswers.length}`}
              sx={{ ml: 1, backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#ff9800' }}
            />
          )}
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
            {showFilters ? "Hide Filters" : "Filters"}
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
                Survey Questions
              </Typography>
              
              {getQuestionsToDisplay().map((question, index) => {
                const stats = calculateQuestionStats(question.id);
                
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
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '8px',
                        height: '100%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      }}
                    />

                    <Box sx={{ pl: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {question.text}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Question type: {question.type}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2">
                          Total responses: <strong>{stats.total}</strong>
                        </Typography>
                        {filteredAnswers.length < surveyAnswers.length && (
                          <Typography variant="caption" color="text.secondary">
                            (Filtered from {surveyAnswers.length} total responses)
                          </Typography>
                        )}
                        {stats.total > 0 && stats.mostCommonAnswer && (
                          <Typography variant="body2">
                            Most frequent answer: <strong>{stats.mostCommonAnswer}</strong>
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
                        Show details ({stats.total} responses)
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
                  General Statistics
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total responses: <strong>{filteredAnswers.length}</strong>
                  </Typography>
                  {filteredAnswers.length !== responses.length && (
                    <Typography variant="body2" color="text.secondary">
                      (Filtered from {responses.length} total responses)
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
                        First response
                    </Typography>
                      <Typography variant="body1" sx={{ color: '#1a237e', fontWeight: 'medium' }}>
                        {filteredAnswers.length > 0 ? 
                          new Date(Math.min(...filteredAnswers.map(r => new Date(r.submittedAt).getTime()))).toLocaleDateString() :
                          'No response'
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
                        Average Daily Responses
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
                        Last response
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#1a237e', fontWeight: 'medium' }}>
                        {filteredAnswers.length > 0 ? 
                          new Date(Math.max(...filteredAnswers.map(r => new Date(r.submittedAt).getTime()))).toLocaleDateString() :
                          'No response'
                        }
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {filteredAnswers.length > 0 && (
                  <Box sx={{ 
                    mt: 4,
                    width: '100%',
                  }}>
                    <Typography variant="h6" sx={{ mb: 3, color: '#1a237e', fontWeight: 'medium', textAlign: 'center' }}>
                      Participation Trend Analysis
                    </Typography>
                    
                    {(() => {
                      const trends = getResponseTrends(filteredAnswers);
                      
                      // Calculer le pourcentage pour chaque jour de la semaine
                      const totalWeekResponses = trends.dayOfWeekDistribution.reduce((sum, count) => sum + count, 0);
                      const dayPercentages = trends.dayOfWeekDistribution.map(count => 
                        totalWeekResponses > 0 ? Math.round((count / totalWeekResponses) * 100) : 0
                      );
                      
                      return (
                        <Box>
                          {/* Visualisation principale - Tendance et total */}
                          <Paper 
                            elevation={2} 
                            sx={{ 
                              p: 3, 
                              mb: 3, 
                              borderRadius: 3,
                              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                              border: '1px solid rgba(102, 126, 234, 0.2)',
                              overflow: 'hidden'
                            }}
                          >
                            <Box sx={{ position: 'relative', height: '180px', display: 'flex', alignItems: 'center' }}>
                              {/* Cercle central avec le nombre total de réponses */}
                              <Box sx={{ 
                                width: '180px',
                                height: '180px',
                                borderRadius: '50%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                                zIndex: 2
                              }}>
                                <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                                  {trends.total}
                                </Typography>
                                <Typography variant="body2">
                                  total responses
                                </Typography>
                              </Box>
                              
                              {/* Indicateur de tendance */}
                              <Box sx={{ 
                                flex: 1,
                                ml: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                justifyContent: 'center'
                              }}>
                                <Typography variant="h6" sx={{ color: '#1a237e', mb: 1 }}>
                                  Participation Trend
                                </Typography>
                                
                                <Box sx={{ 
                                  display: 'flex',
                                  alignItems: 'center',
                                  mb: 2
                                }}>
                                  <Typography 
                                    variant="h4" 
                                    sx={{ 
                                      fontWeight: 'bold',
                                      color: trends.trend === 'increasing' 
                                        ? '#4caf50' 
                                        : trends.trend === 'decreasing' 
                                          ? '#f44336' 
                                          : '#ff9800',
                                      mr: 2
                                    }}
                                  >
                                    {trends.trend === 'increasing' 
                                      ? '↗️' 
                                      : trends.trend === 'decreasing' 
                                        ? '↘️' 
                                        : '→'}
                                  </Typography>
                                  
                                  <Typography 
                                    variant="h5" 
                                    sx={{ 
                                      fontWeight: 'medium',
                                      color: trends.trend === 'increasing' 
                                        ? '#4caf50' 
                                        : trends.trend === 'decreasing' 
                                          ? '#f44336' 
                                          : '#ff9800'
                                    }}
                                  >
                                    {trends.trend === 'stable' 
                                      ? 'Stable' 
                                      : `${trends.trendPercentage > 0 ? '+' : ''}${trends.trendPercentage}%`}
                                  </Typography>
                                </Box>
                                
                                <Typography variant="body2" sx={{ color: '#475569' }}>
                                  {trends.trend === 'increasing' 
                                    ? 'Participation is increasing! Your survey is gaining popularity.' 
                                    : trends.trend === 'decreasing' 
                                      ? 'Participation is decreasing. Consider promoting your survey more.' 
                                      : 'Participation is stable.'}
                                </Typography>
                              </Box>
                            </Box>
                          </Paper>
                          
                          {/* Visualisation des jours de la semaine */}
                          <Paper 
                            elevation={2} 
                            sx={{ 
                              p: 3, 
                              borderRadius: 3,
                              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                              border: '1px solid rgba(102, 126, 234, 0.2)'
                            }}
                          >
                            <Typography variant="subtitle1" sx={{ color: '#1a237e', mb: 2, textAlign: 'center' }}>
                              Distribution by Day of Week
                            </Typography>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                              {trends.dayNames.map((day, index) => {
                                const isActive = index === trends.mostActiveDay;
                                const percentage = dayPercentages[index];
                                
                                return (
                                  <Box 
                                    key={day} 
                                    sx={{ 
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      width: `${100 / 7}%`
                                    }}
                                  >
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        fontWeight: isActive ? 'bold' : 'regular',
                                        color: isActive ? '#1a237e' : '#64748b',
                                        mb: 3
                                      }}
                                    >
                                      {day}
                                    </Typography>
                                    
                                    <Box sx={{ 
                                      width: '100%',
                                      display: 'flex',
                                      justifyContent: 'center',
                                      alignItems: 'flex-end',
                                      height: '120px',
                                      position: 'relative',
                                      mt: 3
                                    }}>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          position: 'absolute',
                                          top: '-24px',
                                          left: '50%',
                                          transform: 'translateX(-50%)',
                                          color: isActive ? '#1a237e' : '#64748b',
                                          fontWeight: isActive ? 'bold' : 'regular',
                                          fontSize: '0.7rem'
                                        }}
                                      >
                                        {percentage}%
                                      </Typography>
                                      <Box 
                                        sx={{ 
                                          width: '70%',
                                          height: `${Math.max(5, percentage)}%`,
                                          bgcolor: isActive 
                                            ? 'linear-gradient(to top, #667eea, #764ba2)' 
                                            : 'rgba(102, 126, 234, 0.3)',
                                          borderRadius: '4px 4px 0 0',
                                          position: 'relative',
                                          transition: 'height 0.3s ease',
                                          background: isActive 
                                            ? 'linear-gradient(to top, #667eea, #764ba2)' 
                                            : undefined,
                                          '&:hover': {
                                            filter: 'brightness(1.1)',
                                          }
                                        }}
                                      />
                                    </Box>
                                    
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        mt: 1,
                                        color: isActive ? '#1a237e' : '#64748b',
                                        fontWeight: isActive ? 'bold' : 'regular'
                                      }}
                                    >
                                      {trends.dayOfWeekDistribution[index]}
                                    </Typography>
                                  </Box>
                                );
                              })}
                            </Box>
                            
                            <Box sx={{ mt: 3, textAlign: 'center' }}>
                              <Typography variant="body2" sx={{ color: '#475569' }}>
                                <strong>{trends.dayNames[trends.mostActiveDay]}</strong> is the most active day with <strong>{trends.dayOfWeekDistribution[trends.mostActiveDay]}</strong> responses ({dayPercentages[trends.mostActiveDay]}% of total)
                              </Typography>
                            </Box>
                          </Paper>
                          
                          {/* Mini-timeline des réponses */}
                          {trends.dates.length > 1 && (
                            <Paper 
                              elevation={2} 
                              sx={{ 
                                p: 3, 
                                mt: 3,
                                borderRadius: 3,
                                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                                border: '1px solid rgba(102, 126, 234, 0.2)'
                              }}
                            >
                              <Typography variant="subtitle1" sx={{ color: '#1a237e', mb: 2, textAlign: 'center' }}>
                                Response Timeline
                              </Typography>
                              
                              <Box sx={{ position: 'relative', mt: 4, mb: 2 }}>
                                {/* Ligne de temps */}
                                <Box sx={{ 
                                  position: 'absolute',
                                  top: '50%',
                                  left: 0,
                                  right: 0,
                                  height: '4px',
                                  bgcolor: 'rgba(102, 126, 234, 0.2)',
                                  zIndex: 1
                                }} />
                                
                                {/* Points sur la timeline */}
                                <Box sx={{ 
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  position: 'relative',
                                  zIndex: 2
                                }}>
                                  {trends.dates.map((date, index) => {
                                    const count = trends.counts[index];
                                    const isMax = date === trends.maxResponsesDay;
                                    const size = isMax ? 16 : 12;
                                    
                                    return (
                                      <Box 
                                        key={date}
                                        sx={{ 
                                          width: size,
                                          height: size,
                                          borderRadius: '50%',
                                          bgcolor: isMax ? '#764ba2' : '#667eea',
                                          display: 'flex',
                                          justifyContent: 'center',
                                          alignItems: 'center',
                                          boxShadow: isMax ? '0 0 0 4px rgba(118, 75, 162, 0.2)' : 'none',
                                          position: 'relative',
                                          '&:hover': {
                                            zIndex: 3,
                                            '& .tooltip': {
                                              opacity: 1,
                                              visibility: 'visible'
                                            }
                                          }
                                        }}
                                      >
                                        {/* Tooltip */}
                                        <Box 
                                          className="tooltip"
                                          sx={{ 
                                            position: 'absolute',
                                            bottom: '100%',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            mb: 1,
                                            bgcolor: 'rgba(0, 0, 0, 0.8)',
                                            color: 'white',
                                            padding: '4px 8px',
                                            borderRadius: 1,
                                            fontSize: '0.75rem',
                                            whiteSpace: 'nowrap',
                                            opacity: 0,
                                            visibility: 'hidden',
                                            transition: 'opacity 0.2s',
                                            zIndex: 10
                                          }}
                                        >
                                          {date}: {count} responses
                                        </Box>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              </Box>
                              
                              {/* Dates de début et de fin */}
                              <Box sx={{ 
                                display: 'flex',
                                justifyContent: 'space-between',
                                mt: 1
                              }}>
                                <Typography variant="caption" sx={{ color: '#64748b' }}>
                                  {trends.dates[0]}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b' }}>
                                  {trends.dates[trends.dates.length - 1]}
                                </Typography>
                              </Box>
                              
                              <Box sx={{ mt: 3, textAlign: 'center' }}>
                                <Typography variant="body2" sx={{ color: '#475569' }}>
                                  Peak participation on <strong>{trends.maxResponsesDay}</strong> with <strong>{trends.maxResponsesCount}</strong> responses
                                </Typography>
                              </Box>
                            </Paper>
                          )}
                        </Box>
                      );
                    })()}
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
                        Export to CSV
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
                        Export to JSON
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