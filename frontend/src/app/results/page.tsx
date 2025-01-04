"use client";

import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Button,
  CircularProgress,
  Paper,
  Card,
  CardContent,
  CardActions,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Stack,
  Alert,
  InputAdornment,
  IconButton,
  Chip,
  TextField, // Ajout de TextField ici
} from '@mui/material';
import { Tooltip as MuiTooltip } from '@mui/material'; // Renommer l'import de Tooltip
import VisibilityIcon from '@mui/icons-material/Visibility';
import BarChartIcon from '@mui/icons-material/BarChart';
import { fetchSurveys, getSurveyAnswers } from '@/utils/surveyService';
import { Bar, Line, Pie, Doughnut, Radar, Scatter, Bubble } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,  // Ajout de BarElement
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { ResponsiveRadar } from '@nivo/radar';
import PieChartIcon from '@mui/icons-material/PieChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import TimelineIcon from '@mui/icons-material/Timeline';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import RadarIcon from '@mui/icons-material/Radar';
import { CSVLink } from 'react-csv';
import DownloadIcon from '@mui/icons-material/Download';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { ChromePicker } from 'react-color';
import { Chart, ChartTypeRegistry } from 'chart.js';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import TableViewIcon from '@mui/icons-material/TableView';
import CodeIcon from '@mui/icons-material/Code';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TextFieldProps } from '@mui/material';

// Enregistrer les éléments nécessaires
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,  // Ajout de BarElement
  Title,
  Tooltip,
  Legend
);

type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'scatter';

interface Answer {
  questionId: string;
  answer: any;
}

interface SurveyAnswer {
  _id: string;
  surveyId: string;
  respondent: {
    userId: {
      _id: string;
      username: string;
      email: string;
    };
    demographic?: {
      gender?: string;
      dateOfBirth?: string;
      educationLevel?: string;
      city?: string;
    };
  };
  answers: Answer[];
  submittedAt: string;
}

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
}

interface DemographicStats {
  gender: { [key: string]: number };
  education: { [key: string]: number };
  city: { [key: string]: number };
  ageDistribution: number[];
}

interface Survey {
  _id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
  demographicEnabled: boolean;
}

interface QuestionStats {
  total: number;
  answers: { [key: string]: number };
}

// Modifier les options communes pour les graphiques
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

// Modifier les options spécifiques pour les graphiques circulaires
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

// Ajouter ces interfaces au début du fichier
interface QuestionDetails {
  questionId: string;
  answers: SurveyAnswer[];
}

interface ChartContainerProps {
  children: React.ReactNode;
}

// Modifier le type ChartRefType pour utiliser les types valides de Chart.js
type ChartRefType = Chart<keyof ChartTypeRegistry>;

// Créer un nouveau composant pour le graphique
const ChartView = memo(({ data, question }: { 
  data: any; 
  question: Partial<Question> & { text: string; type: string; }
}) => {
  // Obtenir les types de graphiques disponibles avant de définir l'état
  const getAvailableChartTypes = (questionType: string): ChartType[] => {
    switch (questionType) {
      case "multiple-choice":
        return ['bar', 'pie', 'doughnut', 'radar'];
      case "text":
        return ['bar']; // Toujours inclure au moins 'bar'
      case "dropdown":
        return ['bar', 'pie', 'doughnut'];
      case "yes-no":
        return ['pie', 'doughnut', 'bar'];
      case "slider":
        return ['bar', 'line', 'scatter'];
      case "rating":
        return ['bar', 'line', 'radar'];
      case "date":
        return ['line', 'scatter', 'bar'];
      case "file-upload":
        return ['bar']; // Toujours inclure au moins 'bar'
      case "color-picker":
        return ['pie', 'doughnut', 'bar'];
      default:
        return ['bar'];
    }
  };

  const availableChartTypes = getAvailableChartTypes(question.type);
  
  // Définir le type de graphique initial en fonction des types disponibles
  const [chartType, setChartType] = useState<ChartType>(() => {
    // Si 'bar' est disponible, l'utiliser par défaut
    if (availableChartTypes.includes('bar')) {
      return 'bar';
    }
    // Sinon, utiliser le premier type disponible
    return availableChartTypes[0] || 'bar';
  });

  // S'assurer que le type de graphique actuel est valide
  useEffect(() => {
    if (!availableChartTypes.includes(chartType)) {
      setChartType(availableChartTypes[0] || 'bar');
    }
  }, [question.type, availableChartTypes, chartType]);

  if (!data || Object.keys(data).length === 0) {
    return <Typography>No data available</Typography>;
  }

  const chartData = {
    labels: Object.keys(data),
    datasets: [{
      label: question.text,
      data: Object.values(data),
      backgroundColor: [
        'rgba(102, 126, 234, 0.6)',  // Bleu principal
        'rgba(118, 75, 162, 0.6)',   // Violet
        'rgba(79, 99, 196, 0.6)',    // Bleu foncé
        'rgba(142, 94, 189, 0.6)',   // Violet clair
        'rgba(133, 152, 236, 0.6)',  // Bleu clair
        'rgba(155, 120, 190, 0.6)',  // Violet moyen
        'rgba(90, 112, 208, 0.6)',   // Bleu moyen
        'rgba(129, 83, 175, 0.6)',   // Violet foncé
      ],
      borderColor: [
        'rgba(102, 126, 234, 1)',    // Bleu principal
        'rgba(118, 75, 162, 1)',     // Violet
        'rgba(79, 99, 196, 1)',      // Bleu foncé
        'rgba(142, 94, 189, 1)',     // Violet clair
        'rgba(133, 152, 236, 1)',    // Bleu clair
        'rgba(155, 120, 190, 1)',    // Violet moyen
        'rgba(90, 112, 208, 1)',     // Bleu moyen
        'rgba(129, 83, 175, 1)',     // Violet foncé
      ],
      borderWidth: 2,
      hoverBackgroundColor: [
        'rgba(102, 126, 234, 0.8)',
        'rgba(118, 75, 162, 0.8)',
        'rgba(79, 99, 196, 0.8)',
        'rgba(142, 94, 189, 0.8)',
        'rgba(133, 152, 236, 0.8)',
        'rgba(155, 120, 190, 0.8)',
        'rgba(90, 112, 208, 0.8)',
        'rgba(129, 83, 175, 0.8)',
      ],
      hoverBorderColor: [
        'rgba(102, 126, 234, 1)',
        'rgba(118, 75, 162, 1)',
        'rgba(79, 99, 196, 1)',
        'rgba(142, 94, 189, 1)',
        'rgba(133, 152, 236, 1)',
        'rgba(155, 120, 190, 1)',
        'rgba(90, 112, 208, 1)',
        'rgba(129, 83, 175, 1)',
      ],
    }]
  };

  // Modifier les options communes pour les graphiques
  const chartOptions = {
    ...commonChartOptions,
    plugins: {
      ...commonChartOptions.plugins,
      legend: {
        ...commonChartOptions.plugins.legend,
        labels: {
          ...commonChartOptions.plugins.legend.labels,
          color: '#4a5568',
          font: {
            size: 12,
            weight: 500
          },
          padding: 15,
        }
      },
      title: {
        ...commonChartOptions.plugins.title,
        color: '#2d3748',
        font: {
          size: 16,
          weight: 'bold' as const,
          family: "'Inter', sans-serif"
        },
        padding: {
          top: 20,
          bottom: 20
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(102, 126, 234, 0.1)',
          display: false
        },
        ticks: {
          color: '#4a5568',
          font: {
            size: 11,
            weight: 400
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(102, 126, 234, 0.1)',
          display: false
        },
        ticks: {
          color: '#4a5568',
          font: {
            size: 11,
            weight: 400
          }
        }
      }
    }
  } as const;

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return <Bar data={chartData} options={chartOptions} />;
      case 'line':
        return <Line data={chartData} options={chartOptions} />;
      case 'pie':
        return <Pie data={chartData} options={{
          ...chartOptions,
          plugins: {
            ...chartOptions.plugins,
            legend: {
              ...chartOptions.plugins.legend,
              position: 'right' as const
            }
          }
        }} />;
      case 'doughnut':
        return <Doughnut data={chartData} options={{
          ...chartOptions,
          plugins: {
            ...chartOptions.plugins,
            legend: {
              ...chartOptions.plugins.legend,
              position: 'right' as const
            }
          }
        }} />;
      case 'radar':
        return <Radar data={chartData} options={chartOptions} />;
      case 'scatter':
        return <Scatter data={chartData} options={chartOptions} />;
      default:
        return <Bar data={chartData} options={chartOptions} />;
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
      case 'radar':
        return <RadarIcon />;
      case 'scatter':
        return <ScatterPlotIcon />;
      default:
        return <BarChartIcon />;
    }
  };

  return (
    <Box sx={{ 
      height: '500px',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #ddd',
      p: 2,
      bgcolor: 'white',
    }}>
      <Box sx={{ 
        flex: 1,
        width: '100%',
        height: '400px',
        position: 'relative',
      }}>
        {renderChart()}
      </Box>
      
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
        {availableChartTypes.length > 0 ? (
          availableChartTypes.map((type) => (
            <Button
              key={type}
              onClick={() => setChartType(type)}
              variant={chartType === type ? 'contained' : 'outlined'}
              sx={{
                ...(chartType === type ? {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderColor: 'transparent',
                  px: 3,
                  py: 1,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                  },
                } : {
                  color: '#667eea',
                  borderColor: 'rgba(102, 126, 234, 0.5)',
                  px: 3,
                  py: 1,
                  '&:hover': {
                    borderColor: '#667eea',
                    bgcolor: 'rgba(102, 126, 234, 0.05)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(102, 126, 234, 0.15)'
                  },
                }),
                transition: 'all 0.2s ease',
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: '8px',
                minWidth: '120px',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                {getChartIcon(type)}
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Typography>
              </Stack>
            </Button>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            No chart available for this question type
          </Typography>
        )}
      </Box>
    </Box>
  );
});

const ResultsPage: React.FC = () => {
  // États existants
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionDetails | null>(null);
  const [dialogView, setDialogView] = useState<'list' | 'chart'>('list');
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line' | 'doughnut'>('bar');
  const [surveyAnswers, setSurveyAnswers] = useState<{
    [key: string]: SurveyAnswer[];
  }>({});

  // Nouveaux états
  const [chartColors, setChartColors] = useState({
    backgrounds: [
      'rgba(102, 126, 234, 0.6)', // Bleu principal
      'rgba(118, 75, 162, 0.6)',  // Violet
      'rgba(75, 192, 192, 0.6)',  // Turquoise
      'rgba(255, 159, 64, 0.6)',  // Orange
      'rgba(255, 99, 132, 0.6)',  // Rose
    ],
    borders: [
      'rgba(102, 126, 234, 1)',
      'rgba(118, 75, 162, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(255, 159, 64, 1)',
      'rgba(255, 99, 132, 1)',
    ]
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  // Refs
  const chartRef = useRef<ChartRefType | null>(null);

  // Nouveaux états
  const [filters, setFilters] = useState<{
    demographic: {
      gender?: string;
      educationLevel?: string;
      city?: string;
      age?: [number, number];
    };
    answers: {
      [questionId: string]: string | number | boolean;
    };
  }>({
    demographic: {
      gender: undefined,
      educationLevel: undefined,
      city: undefined,
      age: undefined
    },
    answers: {}
  });

  // Nouveaux états
  const [dialogViews, setDialogViews] = useState<{ [key: string]: 'list' | 'chart' }>({});
  const [chartTypes, setChartTypes] = useState<{ [key: string]: ChartType }>({});

  // Déplacer l'état du dialogue vers le haut du composant
  const [dialogOpen, setDialogOpen] = useState(false);

  // Nouveaux états
  const [currentView, setCurrentView] = useState<'list' | 'chart'>('list');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // Ajouter ces nouveaux états
  const [filteredStats, setFilteredStats] = useState<DemographicStats | null>(null);
  const [stats, setStats] = useState<DemographicStats>({
    gender: {},
    education: {},
    city: {},
    ageDistribution: []
  });

  // Au début du composant, assurez-vous d'avoir cet état
  const [showDemographic, setShowDemographic] = useState(true);

  // Ajouter ces états au début du composant ResultsPage
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'popular'>('date');

  // Ajouter cette fonction de filtrage
  const filteredSurveys = surveys
    .filter(survey => {
      const matchesSearch = (survey.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (survey.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      if (dateRange.start && dateRange.end) {
        const surveyDate = new Date(survey.createdAt);
        const isInDateRange = surveyDate >= dateRange.start && 
                           surveyDate <= new Date(dateRange.end.setHours(23, 59, 59));
        return matchesSearch && isInDateRange;
      }

      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') {
        const aResponses = surveyAnswers[a._id]?.length || 0;
        const bResponses = surveyAnswers[b._id]?.length || 0;
        return bResponses - aResponses;
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Ajouter cette fonction pour réinitialiser les filtres
  const clearFilters = () => {
    setSearchQuery('');
    setDateRange({ start: null, end: null });
  };

  // Fonctions
  const downloadChart = useCallback((fileName: string) => {
    if (chartRef && chartRef.current) {
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = chartRef.current.toBase64Image();
      link.click();
    }
  }, []);

  const prepareCSVData = useCallback((questionId: string) => {
    if (!selectedSurvey) return [];
    
    const question = selectedSurvey.questions.find(q => q.id === questionId);
    const stats = calculateQuestionStats(selectedSurvey._id, questionId);
    
    return [
      ['Question', question?.text || ''],
      ['Option', 'Count', 'Percentage'],
      ...Object.entries(stats.answers).map(([answer, count]) => [
        answer,
        count,
        `${Math.round((count / stats.total) * 100)}%`
      ])
    ];
  }, [selectedSurvey]);

  // Définir le composant ChartContainer
  const ChartContainer: React.FC<ChartContainerProps> = ({ children }) => (
    <Box sx={{ 
      height: '400px',
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      position: 'relative',
      p: 2
    }}>
      {children}
    </Box>
  );

  // Préparer les données de base pour les graphiques
  const prepareChartData = useCallback((questionId: string) => {
    if (!selectedSurvey) return null;
    const stats = calculateQuestionStats(selectedSurvey._id, questionId);
    
    return {
      labels: Object.keys(stats.answers),
      datasets: [{
        data: Object.values(stats.answers),
        backgroundColor: chartColors.backgrounds,
        borderColor: chartColors.borders,
        borderWidth: 1
      }]
    };
  }, [selectedSurvey, chartColors]);

  // Modifier le rendu du graphique
  const renderChart = useCallback((questionId: string) => {
    if (!selectedSurvey) return null;

    const baseData = prepareChartData(questionId);
    if (!baseData) return null;

    const currentChartType = chartTypes[questionId] || 'bar';
    
    const ChartComponent = (() => {
      switch (currentChartType) {
        case 'bar':
          return Bar;
        case 'line':
          return Line;
        case 'pie':
          return Pie;
        case 'doughnut':
          return Doughnut;
        default:
          return Bar;
      }
    })();

    const options = ['pie', 'doughnut'].includes(currentChartType) ? pieOptions : commonChartOptions;

    return (
      <Box sx={{ height: '100%', width: '100%' }}>
        <ChartComponent 
          ref={chartRef as any}
          data={baseData}
          options={options}
        />
      </Box>
    );
  }, [selectedSurvey, chartTypes, prepareChartData, chartRef]);

  useEffect(() => {
    const loadSurveys = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('No authentication token found');

        console.log('Fetching surveys...');
        const surveysData = await fetchSurveys(token);
        console.log('Surveys received:', surveysData);
        setSurveys(surveysData);

        const answersData: { [key: string]: SurveyAnswer[] } = {};
        for (const survey of surveysData) {
          console.log(`Fetching answers for survey: ${survey._id}`);
          const answers = await getSurveyAnswers(survey._id, token);
          console.log(`Answers received for survey ${survey._id}:`, answers);
          answersData[survey._id] = answers;
        }
        setSurveyAnswers(answersData);
        console.log('All answers loaded:', answersData);
      } catch (error: any) {
        console.error('Error loading results:', error);
        setError(error.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    loadSurveys();
  }, []);

  console.log('Current state - Surveys:', surveys);
  console.log('Current state - Answers:', surveyAnswers);

  const handleViewResults = (survey: Survey) => {
    setSelectedSurvey(survey);
  };

  const handleBack = () => {
    setSelectedSurvey(null);
  };

  // Ajouter la fonction de filtrage
  const filterAnswers = useCallback((answers: SurveyAnswer[]): SurveyAnswer[] => {
    // Si tous les filtres sont vides, retourner toutes les réponses
    const hasActiveFilters = Object.values(filters.demographic).some(value => 
      value !== undefined && value !== "" && 
      !(Array.isArray(value) && value[0] === 0 && value[1] === 100)
    );

    if (!hasActiveFilters) {
      return answers;
    }

    return answers.filter(answer => {
      // Si pas de données démographiques, inclure la réponse
      if (!answer.respondent?.demographic) {
        return true;
      }

      const demographic = answer.respondent.demographic;

      // Appliquer les filtres seulement si les données démographiques existent
      if (filters.demographic.educationLevel && 
          filters.demographic.educationLevel !== "" && 
          demographic.educationLevel !== filters.demographic.educationLevel) {
        return false;
      }

      if (filters.demographic.city && 
          filters.demographic.city !== "" && 
          demographic.city !== filters.demographic.city) {
        return false;
      }

      if (filters.demographic.age && 
          (filters.demographic.age[0] !== 0 || filters.demographic.age[1] !== 100)) {
        if (demographic.dateOfBirth) {
          const age = calculateAge(new Date(demographic.dateOfBirth));
          if (age < filters.demographic.age[0] || age > filters.demographic.age[1]) {
            return false;
          }
        }
      }

      return true;
    });
  }, [filters]);

  // Modifier la fonction calculateQuestionStats pour inclure toutes les réponses
  const calculateQuestionStats = useCallback((surveyId: string, questionId: string): QuestionStats => {
    const allAnswers = surveyAnswers[surveyId] || [];
    
    // Ne pas filtrer les réponses basées sur les données démographiques
    const stats: QuestionStats = {
      total: 0,
      answers: {}
    };

    allAnswers.forEach((answer: SurveyAnswer) => {
      const questionAnswer = answer.answers.find((a: Answer) => a.questionId === questionId);
      if (questionAnswer && questionAnswer.answer != null) {
        const value = questionAnswer.answer.toString();
        stats.answers[value] = (stats.answers[value] || 0) + 1;
        stats.total++;
      }
    });

    return stats;
  }, [surveyAnswers]);

  // Modifier la fonction handleViewQuestionDetails
  const handleQuestionClick = useCallback((questionId: string) => {
    if (!selectedSurvey) return;

    const question = selectedSurvey.questions.find(q => q.id === questionId);
    if (!question) return;

    const answers = surveyAnswers[selectedSurvey._id] || [];
    
    // Supprimer le filtrage des réponses ici
    setSelectedQuestion({
      questionId,
      answers: answers // Utiliser toutes les réponses sans filtrage
    });
    setDialogOpen(true);
    setCurrentView('list');
  }, [selectedSurvey, surveyAnswers]);

  const handleClose = useCallback(() => {
    setDialogOpen(false);
    // Attendre que l'animation de fermeture soit terminée avant de réinitialiser les données
    setTimeout(() => {
      setSelectedQuestion(null);
    }, 300);
  }, []);

  const renderQuestionSummary = (question: Question, stats: QuestionStats) => {
    return (
      <Box>
        {Object.entries(stats.answers).map(([answer, count], index) => (
          <Typography key={index}>
            {answer}: {count} responses ({Math.round((count / stats.total) * 100)}%)
          </Typography>
        ))}
      </Box>
    );
  };

  const getChartColors = (count: number) => {
    const baseColors = [
      'rgba(54, 162, 235, 0.5)',
      'rgba(255, 99, 132, 0.5)',
      'rgba(75, 192, 192, 0.5)',
      'rgba(255, 206, 86, 0.5)',
      'rgba(153, 102, 255, 0.5)',
      'rgba(255, 159, 64, 0.5)',
    ];

    const borderColors = [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(153, 102, 255, 1)',
      'rgba(255, 159, 64, 1)',
    ];

    const backgroundColor = Array(count).fill('').map((_, i) => 
      baseColors[i % baseColors.length]
    );
    
    const borderColor = Array(count).fill('').map((_, i) => 
      borderColors[i % borderColors.length]
    );

    return { backgroundColor, borderColor };
  };

  // Fonction pour déterminer les types de graphiques disponibles selon le type de question
  const getAvailableChartTypes = (questionType: string): ChartType[] => {
    switch (questionType) {
      case "multiple-choice":
        return ['bar', 'pie', 'doughnut', 'radar'];
      case "text":
        return [];
      case "dropdown":
        return ['bar', 'pie', 'doughnut'];
      case "yes-no":
        return ['pie', 'doughnut', 'bar'];
      case "slider":
        return ['bar', 'line', 'scatter'];
      case "rating":
        return ['bar', 'line', 'radar'];
      case "date":
        return ['line', 'scatter', 'bar'];
      case "file-upload":
        return [];
      case "color-picker":
        return ['pie', 'doughnut'];
      default:
        return ['bar'];
    }
  };

  useEffect(() => {
    const loadAnswers = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('No token found');
        
        if (!selectedSurvey) return;
        
        const answers = await getSurveyAnswers(selectedSurvey._id, token);
        const groupedAnswers = answers.reduce((acc: { [key: string]: SurveyAnswer[] }, answer: SurveyAnswer) => {
          if (!acc[answer.surveyId]) {
            acc[answer.surveyId] = [];
          }
          acc[answer.surveyId].push(answer);
          return acc;
        }, {});
        
        setSurveyAnswers(groupedAnswers);
      } catch (error) {
        console.error('Error loading survey answers:', error);
        setError('Failed to load survey answers');
      }
    };

    if (selectedSurvey) {
      loadAnswers();
    }
  }, [selectedSurvey]);

  // Ajouter cette constante avec les autres constantes
  const genderOptions = [
    "male",
    "female",
    "other"
  ];

  const FilterPanel = () => {
    const [cities, setCities] = useState<string[]>([]);
    const [ageRange, setAgeRange] = useState<[number, number]>(
      filters.demographic.age || [0, 100]
    );

    const handleAgeChange = (_: Event | React.SyntheticEvent, newValue: number | number[]) => {
      const newRange = newValue as [number, number];
      setAgeRange(newRange);
      
      setFilters(prev => ({
        ...prev,
        demographic: {
          ...prev.demographic,
          age: newRange
        }
      }));
      
      // Appliquer les filtres automatiquement
      applyDemographicFilters();
    };

    const fetchCities = async () => {
      try {
        const response = await fetch(
          "https://countriesnow.space/api/v0.1/countries/cities",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ country: "Israel" }),
          }
        );
        const data = await response.json();

        if (data && data.data) {
          return data.data;
        }
        return [];
      } catch (error) {
        console.error("Error fetching cities:", error);
        // Liste de secours en cas d'erreur
        return [
          "Tel Aviv", "Jerusalem", "Haifa", "Rishon LeZion",
          "Petah Tikva", "Ashdod", "Netanya", "Beer Sheva",
          "Holon", "Bnei Brak"
        ];
      }
    };

    useEffect(() => {
      const loadCities = async () => {
        const citiesList = await fetchCities();
        setCities(citiesList);
      };
      loadCities();
    }, []);

    return (
      <Box sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Demographic Filters
          </Typography>
          <Button
            color="primary"
            size="small"
            onClick={() => {
              setFilteredStats(null);
              setFilters({
                demographic: {},
                answers: {}
              });
            }}
            sx={{
              color: '#667eea',
              '&:hover': {
                backgroundColor: 'rgba(102, 126, 234, 0.05)'
              }
            }}
          >
            Reset Filters
          </Button>
        </Box>
        <Grid container spacing={2}>
          {/* Ajouter le filtre de genre */}
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Gender</InputLabel>
              <Select
                value={filters.demographic.gender || ''}
                onChange={(e) => {
                  setFilters(prev => ({
                    ...prev,
                    demographic: {
                      ...prev.demographic,
                      gender: e.target.value.toLowerCase() // Stocker en minuscules
                    }
                  }));
                  // Appliquer les filtres automatiquement
                  applyDemographicFilters();
                }}
              >
                <MenuItem value="">All</MenuItem>
                {genderOptions.map((gender) => (
                  <MenuItem key={gender} value={gender}>
                    {gender.charAt(0).toUpperCase() + gender.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Ajuster la taille des autres éléments */}
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Education Level</InputLabel>
              <Select
                value={filters.demographic.educationLevel || ''}
                onChange={(e) => {
                  setFilters(prev => ({
                    ...prev,
                    demographic: {
                      ...prev.demographic,
                      educationLevel: e.target.value
                    }
                  }));
                  applyDemographicFilters();
                }}
              >
                <MenuItem value="">All</MenuItem>
                {educationLevels.map((level) => (
                  <MenuItem key={level} value={level}>{level}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>City</InputLabel>
              <Select
                value={filters.demographic.city || ''}
                onChange={(e) => {
                  setFilters(prev => ({
                    ...prev,
                    demographic: {
                      ...prev.demographic,
                      city: e.target.value
                    }
                  }));
                  applyDemographicFilters();
                }}
              >
                <MenuItem value="">All Cities</MenuItem>
                {cities.map((city) => (
                  <MenuItem key={city} value={city}>{city}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Box sx={{ width: '100%', px: 1 }}> {/* Réduit le padding horizontal */}
              <Typography gutterBottom sx={{ color: '#1a237e' }}>
                Age Range: {ageRange[0]} - {ageRange[1]} years
              </Typography>
              <Slider
                value={ageRange}
                onChange={handleAgeChange}
                valueLabelDisplay="auto"
                min={0}
                max={100}
                sx={{
                  width: '90%', // Réduit légèrement la largeur
                  ml: 1, // Ajoute une marge à gauche
                  '& .MuiSlider-rail': {
                    background: 'rgba(118, 75, 162, 0.2)',
                  },
                  '& .MuiSlider-track': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  },
                  '& .MuiSlider-thumb': {
                    backgroundColor: '#764ba2',
                    '&:hover, &.Mui-focusVisible': {
                      boxShadow: '0 0 0 8px rgba(118, 75, 162, 0.16)',
                    },
                  },
                  '& .MuiSlider-valueLabel': {
                    backgroundColor: '#764ba2',
                  },
                  '& .MuiSlider-mark': {
                    backgroundColor: '#667eea',
                  },
                }}
                marks={[
                  { value: 0, label: '0' },
                  { value: 20, label: '20' },
                  { value: 40, label: '40' },
                  { value: 60, label: '60' },
                  { value: 80, label: '80' },
                  { value: 100, label: '100' }
                ]}
              />
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const calculateDemographicStats = useCallback((surveyId: string): DemographicStats => {
    const answers = surveyAnswers[surveyId] || [];
    const stats = {
      gender: {},
      education: {},
      city: {},
      ageDistribution: Array(121).fill(0) // Tableau pour les âges de 0 à 120
    } as DemographicStats;

    answers.forEach((answer: SurveyAnswer) => {
      const demographic = answer.respondent?.demographic;
      if (demographic) {
        // Traitement du genre
        if (demographic.gender) {
          stats.gender[demographic.gender] = (stats.gender[demographic.gender] || 0) + 1;
        }

        // Traitement du niveau d'éducation
        if (demographic.educationLevel) {
          stats.education[demographic.educationLevel] = 
            (stats.education[demographic.educationLevel] || 0) + 1;
        }

        // Traitement de la ville
        if (demographic.city) {
          stats.city[demographic.city] = (stats.city[demographic.city] || 0) + 1;
        }

        // Traitement de l'âge
        if (demographic.dateOfBirth) {
          const age = calculateAge(new Date(demographic.dateOfBirth));
          if (age >= 0 && age <= 120) {
            stats.ageDistribution[age]++;
          }
        }
      }
    });

    return stats;
  }, [surveyAnswers]);

  const renderDemographicStats = useCallback(() => {
    if (!selectedSurvey) return null;

    return (
      <Box sx={{ mt: 4, p: 3, borderRadius: 2, bgcolor: '#fff', boxShadow: '0 2px 20px rgba(0,0,0,0.05)' }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          pb: 2,
          borderBottom: '1px solid rgba(0,0,0,0.1)'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Demographic Statistics
          </Typography>
        </Box>

        <Grid container spacing={4} sx={{ 
          justifyContent: 'center', // Centrer les éléments de la grille
          alignItems: 'stretch'     // Étirer les éléments à la même hauteur
        }}>
          {/* Genre */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ 
              p: 3, 
              height: '400px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 2,
              transition: 'all 0.3s ease',
              display: 'flex',           // Ajout de flexbox
              flexDirection: 'column',   // Organisation verticale
              alignItems: 'center',      // Centrage horizontal
              justifyContent: 'center',  // Centrage vertical
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                transform: 'translateY(-2px)'
              }
            }}>
              <Typography 
                variant="subtitle1" 
                gutterBottom 
                align="center" 
                sx={{ 
                  fontWeight: 600,
                  color: '#2d3748',
                  mb: 3
                }}
              >
                Distribution by Gender
              </Typography>
              <Box sx={{ 
                height: 'calc(100% - 60px)',
                width: '100%',           // Utiliser toute la largeur disponible
                display: 'flex',         // Ajout de flexbox
                justifyContent: 'center',// Centrage horizontal
                alignItems: 'center'     // Centrage vertical
              }}>
                <Pie
                  data={{
                    labels: Object.keys(filteredStats?.gender || stats.gender),
                    datasets: [{
                      data: Object.values(filteredStats?.gender || stats.gender),
                      backgroundColor: chartColors.backgrounds,
                      borderColor: chartColors.borders,
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    ...pieOptions,
                    responsive: true,
                    maintainAspectRatio: true
                  }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Niveau d'éducation */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ 
              p: 3, 
              height: '400px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 2,
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                transform: 'translateY(-2px)'
              }
            }}>
              <Typography 
                variant="subtitle1" 
                gutterBottom 
                align="center" 
                sx={{ 
                  fontWeight: 600,
                  color: '#2d3748',
                  mb: 3
                }}
              >
                Distribution by Education Level
              </Typography>
              <Box sx={{ 
                height: 'calc(100% - 60px)',
                width: '100%',           // Utiliser toute la largeur disponible
                display: 'flex',         // Ajout de flexbox
                justifyContent: 'center',// Centrage horizontal
                alignItems: 'center'     // Centrage vertical
              }}>
                <Bar
                  data={{
                    labels: Object.keys(filteredStats?.education || stats.education),
                    datasets: [{
                      data: Object.values(filteredStats?.education || stats.education),
                      backgroundColor: chartColors.backgrounds,
                      borderColor: chartColors.borders,
                      borderWidth: 1,
                      hoverBackgroundColor: chartColors.backgrounds.map(color => color.replace('0.6', '0.8')),
                      hoverBorderColor: chartColors.borders,
                      hoverBorderWidth: 2,
                    }]
                  }}
                  options={{
                    ...commonChartOptions,
                    plugins: {
                      ...commonChartOptions.plugins,
                      title: {
                        ...commonChartOptions.plugins.title,
                        display: false, // Changé de true à false pour supprimer le titre redondant
                        text: 'Distribution by Education Level'
                      },
                      legend: {
                        display: true,
                        position: 'top' as const,
                        onClick: (e: any, legendItem: any, legend: any) => {
                          const index = legendItem.index;
                          const ci = legend.chart;
                          
                          // Toggle la visibilité du dataset
                          const meta = ci.getDatasetMeta(0);
                          const alreadyHidden = meta.data[index].hidden;
                          meta.data[index].hidden = !alreadyHidden;

                          // Met à jour le graphique
                          ci.update();
                        },
                        labels: {
                          generateLabels: function(chart: any) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                              return data.labels.map((label: string, index: number) => {
                                const meta = chart.getDatasetMeta(0);
                                const hidden = meta.data[index]?.hidden || false;
                                
                                return {
                                  text: label,
                                  fillStyle: chartColors.backgrounds[index % chartColors.backgrounds.length],
                                  strokeStyle: chartColors.borders[index % chartColors.borders.length],
                                  lineWidth: 1,
                                  hidden: hidden,
                                  index: index
                                };
                              });
                            }
                            return [];
                          }
                        }
                      }
                    },
                    animation: {
                      duration: 750,
                      easing: 'easeInOutQuart',
                    },
                    transitions: {
                      active: {
                        animation: {
                          duration: 400
                        }
                      }
                    },
                    hover: {
                      mode: 'index',
                      intersect: false
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1
                        },
                        grid: {
                          color: 'rgba(102, 126, 234, 0.1)',
                          display: true
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        }
                      }
                    }
                  }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Distribution des âges */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ 
              p: 3, 
              height: '400px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                transform: 'translateY(-2px)'
              }
            }}>
              <Typography 
                variant="subtitle1" 
                gutterBottom 
                align="center" 
                sx={{ 
                  fontWeight: 600,
                  color: '#2d3748',
                  mb: 3
                }}
              >
                Age Distribution
              </Typography>
              <Box sx={{ height: 'calc(100% - 60px)' }}>
                {renderAgeChart(filteredStats?.ageDistribution || stats.ageDistribution)}
              </Box>
            </Paper>
          </Grid>

          {/* Villes */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ 
              p: 3, 
              height: '400px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                transform: 'translateY(-2px)'
              }
            }}>
              <Typography 
                variant="subtitle1" 
                gutterBottom 
                align="center" 
                sx={{ 
                  fontWeight: 600,
                  color: '#2d3748',
                  mb: 3
                }}
              >
                Distribution by City
              </Typography>
              <Box sx={{ height: 'calc(100% - 60px)' }}>
                <Doughnut
                  data={{
                    labels: Object.keys(filteredStats?.city || stats.city),
                    datasets: [{
                      data: Object.values(filteredStats?.city || stats.city),
                      backgroundColor: [
                        'rgba(102, 126, 234, 0.6)',
                        'rgba(118, 75, 162, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(255, 99, 132, 0.6)',
                      ],
                      borderColor: [
                        'rgba(102, 126, 234, 1)',
                        'rgba(118, 75, 162, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(255, 99, 132, 1)',
                      ],
                      borderWidth: 1
                    }]
                  }}
                  options={pieOptions}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  }, [selectedSurvey, surveyAnswers, filters.demographic, chartColors, filteredStats, stats]);

  const renderIndividualResponses = useCallback(() => {
    if (!selectedSurvey) return null;

    const answers = surveyAnswers[selectedSurvey._id] || [];

    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Individual Responses
        </Typography>
        {answers.map((answer: SurveyAnswer, index: number) => (
          <Box key={answer._id} sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Response #{index + 1} - {new Date(answer.submittedAt).toLocaleDateString()}
            </Typography>
            
            {answer.respondent?.demographic && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="primary">
                  User Information:
                </Typography>
                <List dense>
                  {answer.respondent.demographic.gender && (
                    <ListItem>
                      <ListItemText 
                        primary="Gender"
                        secondary={answer.respondent.demographic.gender}
                      />
                    </ListItem>
                  )}
                  {answer.respondent.demographic.dateOfBirth && (
                    <ListItem>
                      <ListItemText 
                        primary="Age"
                        secondary={calculateAge(new Date(answer.respondent.demographic.dateOfBirth))}
                      />
                    </ListItem>
                  )}
                  {answer.respondent.demographic.educationLevel && (
                    <ListItem>
                      <ListItemText 
                        primary="Education"
                        secondary={answer.respondent.demographic.educationLevel}
                      />
                    </ListItem>
                  )}
                  {answer.respondent.demographic.city && (
                    <ListItem>
                      <ListItemText 
                        primary="City"
                        secondary={answer.respondent.demographic.city}
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    );
  }, [selectedSurvey, surveyAnswers]);

  const handleDialogViewChange = (questionId: string, newView: 'list' | 'chart') => {
    setDialogViews(prev => ({
      ...prev,
      [questionId]: newView
    }));
  };

  const handleChartTypeChange = (questionId: string, type: ChartType) => {
    setChartTypes(prev => ({
      ...prev,
      [questionId]: type
    }));
  };

  // Fonction pour préparer les données d'export
  const prepareExportData = useCallback((answers: SurveyAnswer[]) => {
    if (!selectedQuestion || !selectedSurvey) return [];
    
    return answers.map(answer => {
      const questionAnswer = answer.answers.find(
        a => a.questionId === selectedQuestion.questionId
      );

      return {
        question: selectedSurvey.questions.find(q => q.id === selectedQuestion.questionId)?.text,
        answer: questionAnswer?.answer,
        username: answer.respondent.userId.username,
        email: answer.respondent.userId.email,
        demographic: answer.respondent.demographic ? {
          gender: answer.respondent.demographic.gender,
          dateOfBirth: answer.respondent.demographic.dateOfBirth,
          educationLevel: answer.respondent.demographic.educationLevel,
          city: answer.respondent.demographic.city
        } : null,
        submittedAt: answer.submittedAt
      };
    });
  }, [selectedQuestion, selectedSurvey]);

  // Fonction pour exporter en CSV
  const exportCSV = useCallback(() => {
    if (!selectedQuestion || !selectedSurvey) return;

    const data = prepareExportData(selectedQuestion.answers);
    const headers = [
      'Question',
      'Answer',
      'Username',
      'Email',
      'Gender',
      'Date of Birth',
      'Education Level',
      'City',
      'Submitted At'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(item => [
        `"${item.question}"`,
        `"${item.answer}"`,
        `"${item.username}"`,
        `"${item.email}"`,
        `"${item.demographic?.gender || ''}"`,
        `"${item.demographic?.dateOfBirth || ''}"`,
        `"${item.demographic?.educationLevel || ''}"`,
        `"${item.demographic?.city || ''}"`,
        `"${item.submittedAt}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `question_responses_${selectedQuestion.questionId}.csv`;
    link.click();
  }, [selectedQuestion, selectedSurvey, prepareExportData]);

  // Fonction pour exporter en JSON
  const exportJSON = useCallback(() => {
    if (!selectedQuestion || !selectedSurvey) return;

    const data = prepareExportData(selectedQuestion.answers);
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `question_responses_${selectedQuestion.questionId}.json`;
    link.click();
  }, [selectedQuestion, selectedSurvey, prepareExportData]);

  const handleViewChange = (newView: 'list' | 'chart') => {
    console.log('Changing view to:', newView);
    setCurrentView(newView);
  };

  const renderQuestionDetails = useCallback((questionId: string) => {
    if (!selectedSurvey || !selectedQuestion) {
      return null;
    }

    const question = selectedSurvey.questions.find(q => q.id === questionId);
    if (!question) {
      return null;
    }

    // Modifier cette partie pour utiliser calculateQuestionStats directement
    const getQuestionData = () => {
      const stats = calculateQuestionStats(selectedSurvey._id, questionId);
      return stats.answers;
    };

    return (
      <>
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          pb: 3
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              {question.text}
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              gap: 2,
              mt: 2 
            }}>
              <Stack direction="row" spacing={2}>
                <Box sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  minWidth: '150px'
                }}>
                  <Typography variant="overline" sx={{ opacity: 0.9, display: 'block' }}>
                    Total Responses
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {selectedQuestion.answers.length}
                  </Typography>
                </Box>

                <Box sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  minWidth: '200px'
                }}>
                  <Typography variant="overline" sx={{ opacity: 0.9, display: 'block' }}>
                    Most Common Answer
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {(() => {
                      const answerCounts: { [key: string]: number } = {};
                      selectedQuestion.answers.forEach(answer => {
                        const questionAnswer = answer.answers.find(
                          a => a.questionId === selectedQuestion.questionId
                        );
                        if (questionAnswer?.answer) {
                          const value = questionAnswer.answer.toString();
                          answerCounts[value] = (answerCounts[value] || 0) + 1;
                        }
                      });
                      
                      const mostCommon = Object.entries(answerCounts)
                        .sort(([,a], [,b]) => b - a)[0];
                      
                      return mostCommon 
                        ? `${mostCommon[0]} (${mostCommon[1]} times)`
                        : 'No response';
                    })()}
                  </Typography>
                </Box>
              </Stack>

              <Box sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 3,
                p: 0.5
              }}>
                <Tabs 
                  value={currentView} 
                  onChange={(_, newValue) => handleViewChange(newValue as 'list' | 'chart')}
                  sx={{
                    '& .MuiTab-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-selected': {
                        color: 'white',
                      }
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: 'white',
                    }
                  }}
                >
                  <Tab 
                    icon={<VisibilityIcon />} 
                    label="List" 
                    value="list"
                    sx={{ minHeight: 'auto', py: 1 }}
                  />
                  <Tab 
                    icon={<BarChartIcon />} 
                    label="Graph" 
                    value="chart"
                    sx={{ minHeight: 'auto', py: 1 }}
                  />
                </Tabs>
              </Box>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent 
          dividers 
          sx={{ 
            bgcolor: '#f5f7ff',
            p: 0
          }}
        >
          {currentView === 'list' ? (
            <List sx={{ p: 0 }}>
              {selectedQuestion.answers.map((answer, index) => {
                const questionAnswer = answer.answers.find(
                  a => a.questionId === selectedQuestion.questionId
                );
                const answerValue = questionAnswer?.answer?.toString() || 'No response';
                
                const tooltipContent = (
                  <Paper sx={{ 
                    p: 2.5,
                    maxWidth: 300,
                    borderRadius: 2,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                  }}>
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography variant="subtitle2" color="primary.main" gutterBottom>
                          User Information
                        </Typography>
                        <Typography variant="body2">
                          <strong>Email:</strong> {answer.respondent.userId.email}
                        </Typography>
                      </Box>
                      
                      {answer.respondent.demographic && (
                        <Box>
                          <Typography variant="subtitle2" color="primary.main" gutterBottom>
                            Demographic Data
                          </Typography>
                          <Stack spacing={0.5}>
                            <Typography variant="body2">
                              <strong>Gender:</strong> {answer.respondent.demographic.gender || 'Not specified'}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Date of Birth:</strong> {
                                answer.respondent.demographic.dateOfBirth 
                                  ? new Date(answer.respondent.demographic.dateOfBirth).toLocaleDateString()
                                  : 'Not specified'
                              }
                            </Typography>
                            <Typography variant="body2">
                              <strong>Education Level:</strong> {
                                answer.respondent.demographic.educationLevel || 'Not specified'
                              }
                            </Typography>
                            <Typography variant="body2">
                              <strong>City:</strong> {answer.respondent.demographic.city || 'Not specified'}
                            </Typography>
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                );

                return (
                  <MuiTooltip 
                    key={index}
                    title={tooltipContent}
                    placement="right"
                    arrow
                    followCursor
                    PopperProps={{
                      sx: {
                        '& .MuiTooltip-tooltip': {
                          bgcolor: 'background.paper',
                          color: 'text.primary',
                          boxShadow: 3,
                          '& .MuiTooltip-arrow': {
                            color: 'background.paper',
                          },
                        },
                      },
                    }}
                  >
                    <ListItem 
                      divider
                      sx={{
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'rgba(102, 126, 234, 0.05)',
                          transform: 'translateX(5px)'
                        },
                        p: 2
                      }}
                    >
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 0.5
                        }}>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 500,
                              color: '#2d3748'
                            }}
                          >
                            {answerValue}
                          </Typography>
                          <Typography 
                            variant="caption"
                            sx={{ 
                              color: 'text.secondary',
                              bgcolor: 'rgba(102, 126, 234, 0.1)',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1
                            }}
                          >
                            Response #{index + 1}
                          </Typography>
                        </Box>
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <span>By</span>
                          <Typography 
                            component="span"
                            sx={{ 
                              color: 'primary.main',
                              fontWeight: 500
                            }}
                          >
                            {answer.respondent.userId.username}
                          </Typography>
                        </Typography>
                      </Box>
                    </ListItem>
                  </MuiTooltip>
                );
              })}
            </List>
          ) : (
            <Box sx={{ height: '500px', width: '100%', p: 3 }}>
              <ChartView 
                data={getQuestionData()} // Utiliser la nouvelle fonction
                question={question}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          px: 3,
          py: 2,
          bgcolor: 'white',
          borderTop: '1px solid rgba(0, 0, 0, 0.1)'
        }}>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<TableViewIcon />}
              onClick={exportCSV}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                px: 3,
                py: 1,
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                },
                transition: 'all 0.2s ease',
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<CodeIcon />}
              onClick={exportJSON}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                px: 3,
                py: 1,
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                },
                transition: 'all 0.2s ease',
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Export JSON
            </Button>
          </Stack>
          <Button 
            onClick={handleClose}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              px: 3,
              py: 1,
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              },
              transition: 'all 0.2s ease',
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Close
          </Button>
        </DialogActions>
      </>
    );
  }, [selectedSurvey, selectedQuestion, currentView, calculateQuestionStats]); // Ajouter calculateQuestionStats aux dépendances

  // Ajout d'un useEffect pour surveiller les changements de vue
  useEffect(() => {
    console.log('View changed to:', currentView);
  }, [currentView]);

  // Ajoutez un useEffect au niveau du composant principal pour surveiller les changements
  useEffect(() => {
    console.log('Component mounted');
    return () => {
      console.log('Component will unmount');
    };
  }, []);

  useEffect(() => {
    console.log('Selected question changed:', selectedQuestion);
  }, [selectedQuestion]);

  useEffect(() => {
    console.log('Current view changed:', currentView);
  }, [currentView]);

  // Ajoutez ces nouvelles fonctions pour l'export global
  const prepareAllQuestionsData = useCallback(() => {
    if (!selectedSurvey || !surveyAnswers[selectedSurvey._id]) return [];

    const answers = surveyAnswers[selectedSurvey._id];
    return answers.map(answer => {
      const questionAnswers = selectedSurvey.questions.reduce((acc: any, question) => {
        const questionAnswer = answer.answers.find(a => a.questionId === question.id);
        acc[question.text] = questionAnswer?.answer || 'No answer';
        return acc;
      }, {});

      return {
        respondentId: answer.respondent.userId._id,
        username: answer.respondent.userId.username,
        email: answer.respondent.userId.email,
        submittedAt: answer.submittedAt,
        demographic: answer.respondent.demographic ? {
          gender: answer.respondent.demographic.gender,
          dateOfBirth: answer.respondent.demographic.dateOfBirth,
          educationLevel: answer.respondent.demographic.educationLevel,
          city: answer.respondent.demographic.city
        } : null,
        ...questionAnswers
      };
    });
  }, [selectedSurvey, surveyAnswers]);

  const exportAllToCSV = useCallback(() => {
    if (!selectedSurvey) return;

    const data = prepareAllQuestionsData();
    if (data.length === 0) return;

    // Créer les en-têtes
    const headers = [
      'Respondent ID',
      'Username',
      'Email',
      'Submitted At',
      'Gender',
      'Date of Birth',
      'Education Level',
      'City',
      ...selectedSurvey.questions.map(q => q.text)
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(item => [
        item.respondentId,
        item.username,
        item.email,
        item.submittedAt,
        item.demographic?.gender || '',
        item.demographic?.dateOfBirth || '',
        item.demographic?.educationLevel || '',
        item.demographic?.city || '',
        ...selectedSurvey.questions.map(q => `"${item[q.text]}"`)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `survey_results_${selectedSurvey._id}.csv`;
    link.click();
  }, [selectedSurvey, prepareAllQuestionsData]);

  const exportAllToJSON = useCallback(() => {
    if (!selectedSurvey) return;

    const data = prepareAllQuestionsData();
    if (data.length === 0) return;

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `survey_results_${selectedSurvey._id}.json`;
    link.click();
  }, [selectedSurvey, prepareAllQuestionsData]);

  // Ajoutez ces interfaces au début du fichier
  interface DemographicFilters {
    gender?: string;
    educationLevel?: string;
    city?: string;
    age?: [number, number];
  }

  // Modifiez la fonction d'application des filtres
  const applyDemographicFilters = useCallback(() => {
    if (!selectedSurvey) return;

    const answers = surveyAnswers[selectedSurvey._id] || [];
    
    console.log('Current filters:', filters.demographic);
    
    const filteredAnswers = answers.filter(answer => {
      const demographic = answer.respondent?.demographic;
      if (!demographic) return false;

      // Debug logs
      console.log('Checking answer:', {
        answerGender: demographic.gender,
        filterGender: filters.demographic.gender?.toLowerCase(), // Convertir en minuscules
        matches: !filters.demographic.gender || 
                demographic.gender === filters.demographic.gender?.toLowerCase()
      });

      // Filtre par genre - Comparaison insensible à la casse
      if (filters.demographic.gender && filters.demographic.gender !== '') {
        if (!demographic.gender || 
            demographic.gender !== filters.demographic.gender.toLowerCase()) {
          return false;
        }
      }

      // Reste des filtres inchangé...
      if (filters.demographic.educationLevel && 
          filters.demographic.educationLevel !== "" && 
          demographic.educationLevel !== filters.demographic.educationLevel) {
        return false;
      }

      if (filters.demographic.city && 
          filters.demographic.city !== "" && 
          demographic.city !== filters.demographic.city) {
        return false;
      }

      if (filters.demographic.age && 
          (filters.demographic.age[0] !== 0 || filters.demographic.age[1] !== 100)) {
        if (demographic.dateOfBirth) {
          const age = calculateAge(new Date(demographic.dateOfBirth));
          if (age < filters.demographic.age[0] || age > filters.demographic.age[1]) {
            return false;
          }
        }
      }

      return true;
    });

    console.log('Filtered answers:', filteredAnswers);

    const newStats: DemographicStats = {
      gender: {},
      education: {},
      city: {},
      ageDistribution: Array(121).fill(0)
    };

    filteredAnswers.forEach(answer => {
      const demographic = answer.respondent?.demographic;
      if (demographic) {
        if (demographic.gender) {
          newStats.gender[demographic.gender] = (newStats.gender[demographic.gender] || 0) + 1;
        }

        if (demographic.educationLevel) {
          newStats.education[demographic.educationLevel] = 
            (newStats.education[demographic.educationLevel] || 0) + 1;
        }

        if (demographic.city) {
          newStats.city[demographic.city] = (newStats.city[demographic.city] || 0) + 1;
        }

        if (demographic.dateOfBirth) {
          const age = calculateAge(new Date(demographic.dateOfBirth));
          if (age >= 0 && age <= 120) {
            newStats.ageDistribution[age]++;
          }
        }
      }
    });

    console.log('New stats:', newStats);
    setFilteredStats(newStats);
  }, [selectedSurvey, surveyAnswers, filters.demographic, calculateDemographicStats]);

  // Ajouter un useEffect pour appliquer les filtres lorsqu'ils changent
  useEffect(() => {
    if (selectedSurvey) {
      applyDemographicFilters();
    }
  }, [filters.demographic, selectedSurvey, applyDemographicFilters]);

  useEffect(() => {
    if (selectedSurvey && surveyAnswers[selectedSurvey._id]) {
      // Calculer les stats initiales avec toutes les réponses
      const initialStats = calculateDemographicStats(selectedSurvey._id);
      setStats(initialStats);
      // Important : initialiser aussi filteredStats avec les mêmes données
      setFilteredStats(initialStats);
    }
  }, [selectedSurvey, surveyAnswers]);

  // Ajouter cette fonction pour préparer les données JSON
  const prepareAllQuestionsJSON = useCallback(() => {
    if (!selectedSurvey) return null;
    
    const allData = selectedSurvey.questions.reduce((acc: any, question) => {
      const stats = calculateQuestionStats(selectedSurvey._id, question.id);
      acc[question.text] = stats.answers;
      return acc;
    }, {});

    return JSON.stringify(allData, null, 2);
  }, [selectedSurvey, calculateQuestionStats]);

  // Ajouter cette fonction pour préparer les données CSV
  const prepareAllQuestionsCSV = useCallback(() => {
    if (!selectedSurvey) return [];
    
    const csvData: any[] = [];
    
    // En-tête
    csvData.push(['Question', 'Option', 'Count', 'Percentage']);
    
    // Données pour chaque question
    selectedSurvey.questions.forEach(question => {
      const stats = calculateQuestionStats(selectedSurvey._id, question.id);
      Object.entries(stats.answers).forEach(([answer, count]) => {
        csvData.push([
          question.text,
          answer,
          count,
          `${Math.round((count / stats.total) * 100)}%`
        ]);
      });
    });
    
    return csvData;
  }, [selectedSurvey, calculateQuestionStats]);

  // Modifier la fonction renderAgeChart
  const renderAgeChart = (data: number[]) => {
    // Filtrer les points pour exclure les 0 participants et les 0 ans
    const points = data
      .map((value, age) => ({
        x: age,
        y: value,
        hidden: false // État de visibilité initial
      }))
      .filter(point => point.x > 0 && point.y > 0);

    // Créer un tableau de couleurs différentes pour chaque point
    const generateColors = (index: number) => {
      const colors = [
        { bg: 'rgba(102, 126, 234, 0.6)', border: 'rgba(102, 126, 234, 1)' },
        { bg: 'rgba(118, 75, 162, 0.6)', border: 'rgba(118, 75, 162, 1)' },
        { bg: 'rgba(237, 100, 166, 0.6)', border: 'rgba(237, 100, 166, 1)' },
        { bg: 'rgba(39, 187, 245, 0.6)', border: 'rgba(39, 187, 245, 1)' },
        { bg: 'rgba(146, 100, 237, 0.6)', border: 'rgba(146, 100, 237, 1)' },
        { bg: 'rgba(245, 101, 101, 0.6)', border: 'rgba(245, 101, 101, 1)' },
        { bg: 'rgba(72, 187, 120, 0.6)', border: 'rgba(72, 187, 120, 1)' },
        { bg: 'rgba(246, 173, 85, 0.6)', border: 'rgba(246, 173, 85, 1)' },
      ];
      return colors[index % colors.length];
    };

    const chartData = {
      datasets: [{
        label: 'Nombre de participants',
        data: points,
        backgroundColor: points.map((_, index) => generateColors(index).bg),
        borderColor: points.map((_, index) => generateColors(index).border),
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: points.map((_, index) => generateColors(index).bg),
        pointBorderColor: points.map((_, index) => generateColors(index).border),
        pointHoverBackgroundColor: points.map((_, index) => generateColors(index).bg.replace('0.6', '0.8')),
        pointHoverBorderColor: points.map((_, index) => generateColors(index).border),
        showLine: true,
        tension: 0.3,
        parsing: {
          xAxisKey: 'x',
          yAxisKey: 'y'
        }
      }]
    };

    // Ajouter cette interface pour les éléments du graphique
    interface ChartDataElement {
      hidden?: boolean;
      _datasetIndex?: number;
      _index?: number;
    }

    // Dans la fonction renderAgeChart, modifier le cast des éléments
    const options: ChartOptions<'scatter'> = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'right' as const,
          align: 'start' as const,
          onClick: function(e, legendItem, legend) {
            if (!legend || !legend.chart) return;
            
            const index = legendItem.index;
            if (index !== undefined) {
              const chart = legend.chart;
              const meta = chart.getDatasetMeta(0);
              
              // Utiliser le nouveau type pour le cast
              const element = meta.data[index] as unknown as ChartDataElement;
              if (element) {
                element.hidden = !element.hidden;
                
                // Mettre à jour l'état dans notre tableau de points
                points[index].hidden = element.hidden || false;
                
                // Forcer la mise à jour du graphique
                chart.update();
              }
            }
          },
          labels: {
            generateLabels: function(chart) {
              const dataset = chart.data.datasets[0];
              return points.map((point, index) => {
                // Utiliser le nouveau type pour le cast
                const element = chart.getDatasetMeta(0).data[index] as unknown as ChartDataElement;
                return {
                  text: `${point.x}`, // Suppression de " ans"
                  fillStyle: generateColors(index).bg,
                  strokeStyle: generateColors(index).border,
                  lineWidth: 1,
                  hidden: element?.hidden || false,
                  datasetIndex: 0,
                  index: index
                };
              });
            }
          }
        },
        title: {
          display: false, // Changé de true à false pour supprimer le titre redondant
          text: 'Distribution des âges',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: 20
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              return `${context.parsed.y} participant${context.parsed.y > 1 ? 's' : ''} de ${context.parsed.x} ans`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: 1,
          max: 100,
          ticks: {
            stepSize: 5,
            callback: function(value) {
              return value.toString();
            }
          },
          grid: {
            color: 'rgba(102, 126, 234, 0.1)',
            display: true
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          },
          grid: {
            color: 'rgba(102, 126, 234, 0.1)',
            display: true
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'nearest'
      }
    };

    return (
      <Box sx={{ 
        height: '400px', 
        width: '100%',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'scale(1.01)',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.15)'
        },
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center'
      }}>
        <Scatter data={chartData} options={options} />
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CircularProgress sx={{ color: '#667eea' }} />
      </Box>
    );
  }

  if (selectedSurvey) {
    return (
      <Box sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: { xs: 2, sm: 4 },
      }}>
        <Paper elevation={3} sx={{
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '800px',  // Ajout de cette ligne pour limiter la largeur
          mb: 4,
        }}>
          <Box sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            py: 4,
            px: 4,
            color: 'white',
            textAlign: 'center',
            position: 'relative'
          }}>
            <IconButton
              onClick={handleBack}
              sx={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'white',
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" fontWeight="bold">
              {selectedSurvey.title}
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.9 }}>
              Total Responses: {surveyAnswers[selectedSurvey._id]?.length || 0}
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>
            {selectedSurvey?.demographicEnabled && (
              <FilterPanel />
            )}

            {/* Questions section */}
            <Box sx={{ mb: 4 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 3, 
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  display: 'inline-block', // Ajout de cette ligne
                  '&::before': {          // Ajout de cette ligne
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    background: 'inherit',
                    zIndex: -1
                  }
                }}
              >
                Survey Questions
              </Typography>
              {selectedSurvey.questions.map((question, index) => {
                const stats = calculateQuestionStats(selectedSurvey._id, question.id);
                
                return (
                  <Paper 
                    key={question.id} 
                    elevation={1}
                    sx={{
                      mb: 3,
                      p: 3,
                      borderRadius: 2,
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                    }}
                  >
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
                      <Button
                        variant="contained"
                        startIcon={<BarChartIcon />}
                        onClick={() => handleQuestionClick(question.id)}
                        disabled={stats.total === 0} // Désactivé uniquement s'il n'y a pas de réponses
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
                        View Details ({stats.total} responses)
                      </Button>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ mt: 2 }}>
                      {renderQuestionSummary(question, stats)}
                    </Box>
                  </Paper>
                );
              })}
            </Box>

            {/* Export Buttons */}
            <Box sx={{ 
              mt: 6, 
              pt: 4, 
              borderTop: '1px solid rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<TableViewIcon />}
                  onClick={exportAllToCSV}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    }
                  }}
                >
                  Export All to CSV
                </Button>
                <Button
                  variant="contained"
                  startIcon={<CodeIcon />}
                  onClick={exportAllToJSON}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    }
                  }}
                >
                  Export All to JSON
                </Button>
              </Stack>
            </Box>

            {/* Demographic Stats Button and Content */}
            {selectedSurvey?.demographicEnabled && (
              <>
                <Box sx={{ 
                  mt: 6, 
                  pt: 4, 
                  borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  {renderDemographicStats()}
                </Box>
              </>
            )}
          </Box>
        </Paper>

        <Dialog
          open={dialogOpen}
          onClose={handleClose}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              maxHeight: '90vh'
            }
          }}
        >
          {selectedQuestion && renderQuestionDetails(selectedQuestion.questionId)}
        </Dialog>
      </Box>
    );
  }

  // Liste des sondages
  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: { xs: 2, sm: 4 },
    }}>
      <Paper elevation={3} sx={{
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '800px',  // Ajout de cette ligne pour limiter la largeur
        mb: 4,
      }}>
        <Box sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 4,
          px: 4,
          color: 'white',
          textAlign: 'center',
        }}>
          <Typography variant="h4" fontWeight="bold">
            My Surveys
          </Typography>
        </Box>

        <Box sx={{ p: 4, backgroundColor: 'white' }}>
          {/* Nouvelle section de filtres */}
          <Box sx={{ mb: 4, backgroundColor: 'background.paper', p: 3, borderRadius: 2, boxShadow: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search surveys by title or description..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (searchQuery || dateRange.start || dateRange.end) && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={clearFilters}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                icon={<FilterListIcon />}
                label="Date Filter"
                onClick={() => setShowDateFilter(!showDateFilter)}
                color={showDateFilter ? "primary" : "default"}
                variant={showDateFilter ? "filled" : "outlined"}
                sx={{
                  '&.MuiChip-filled': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }
                }}
              />
              <Chip
                icon={<FilterListIcon />}
                label={`${sortBy === 'date' ? 'Popularity' : 'Popularity'}`}
                onClick={() => setSortBy(sortBy === 'date' ? 'popular' : 'date')}
                color={sortBy === 'popular' ? "primary" : "default"}
                variant={sortBy === 'popular' ? "filled" : "outlined"}
                sx={{
                  '&.MuiChip-filled': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }
                }}
              />
            </Stack>

            {showDateFilter && (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <DatePicker
                    label="Start Date"
                    value={dateRange.start}
                    onChange={(newValue: Date | null) => {
                      setDateRange(prev => ({
                        ...prev,
                        start: newValue
                      }));
                    }}
                    renderInput={(params: TextFieldProps) => (
                      <TextField {...params} size="small" />
                    )}
                  />
                  <DatePicker
                    label="End Date"
                    value={dateRange.end}
                    onChange={(newValue: Date | null) => {
                      setDateRange(prev => ({
                        ...prev,
                        end: newValue
                      }));
                    }}
                    renderInput={(params: TextFieldProps) => (
                      <TextField {...params} size="small" />
                    )}
                    minDate={dateRange.start || undefined}
                  />
                </Stack>
              </LocalizationProvider>
            )}
          </Box>

          {error ? (
            <Typography color="error" sx={{ textAlign: 'center', my: 4 }}>
              {error}
            </Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {filteredSurveys.map((survey) => (
                <Paper
                  key={survey._id}
                  elevation={1}
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease-in-out',
                    position: 'relative',
                    '&:hover': {
                      boxShadow: 3,
                      zIndex: 1,
                      '& .hover-content': {
                        opacity: 1,
                        visibility: 'visible',
                        transform: 'translateY(0)',
                      }
                    }
                  }}
                >
                  <Box sx={{ 
                    p: 3,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                  }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        mb: 2,
                        color: 'primary.main',
                        fontWeight: 500,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.3,
                        height: '2.6em'
                      }}
                    >
                      {survey.title}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        mb: 2,
                        flex: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.5,
                        height: '4.5em'
                      }}
                    >
                      {survey.description || 'No description available'}
                    </Typography>

                    <Box
                      className="hover-content"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'white',
                        p: 3,
                        opacity: 0,
                        visibility: 'hidden',
                        transform: 'translateY(-10px)',
                        transition: 'all 0.3s ease-in-out',
                        boxShadow: 3,
                        borderRadius: 2,
                        zIndex: 2,
                        overflowY: 'auto',
                        '&::-webkit-scrollbar': {
                          width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: '#f1f1f1',
                          borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: '#888',
                          borderRadius: '4px',
                          '&:hover': {
                            background: '#666',
                          },
                        },
                      }}
                    >
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: 'primary.main',
                          fontWeight: 500,
                          mb: 2 
                        }}
                      >
                        {survey.title}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'text.secondary',
                          mb: 2,
                          lineHeight: 1.6 
                        }}
                      >
                        {survey.description || 'No description available'}
                      </Typography>
                    </Box>

                    <Stack 
                      direction="row" 
                      spacing={2} 
                      alignItems="center"
                      sx={{ 
                        mt: 'auto',
                        position: 'relative',
                        zIndex: 1
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        noWrap
                      >
                        Created on {new Date(survey.createdAt).toLocaleDateString()}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${(surveyAnswers[survey._id] || []).length} responses`}
                        sx={{
                          backgroundColor: 'rgba(102, 126, 234, 0.1)',
                          color: '#667eea',
                          fontSize: '0.75rem',
                          flexShrink: 0
                        }}
                      />
                    </Stack>
                  </Box>
                  
                  <Box sx={{ 
                    p: 2, 
                    borderTop: 1, 
                    borderColor: 'divider',
                    backgroundColor: 'action.hover',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <Button
                      onClick={() => handleViewResults(survey)}
                      variant="contained"
                      size="small"
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                        }
                      }}
                    >
                      View Results
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

// Ajouter ces constantes après les imports
const educationLevels = [
  "High School",
  "Bachelor's Degree",
  "Master's Degree",
  "Ph.D.",
  "Other"
];

const cities = [
  "Tel Aviv",
  "Jerusalem",
  "Haifa",
  "Rishon LeZion",
  "Petah Tikva",
  "Ashdod",
  "Netanya",
  "Beer Sheva",
  "Holon",
  "Bnei Brak"
];

// Ajouter la fonction pour calculer l'âge
const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

export default ResultsPage;