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
  Rating,
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
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { debounce } from 'lodash';

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
  answers: Array<{
    questionId: string;
    answer: any;
  }>;
  submittedAt: string;
}

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
}

interface DemographicStats extends QuestionStats {
  genderDistribution: { [key: string]: number };
  ageDistribution: number[];
  educationDistribution: { [key: string]: number };
  cityDistribution: { [key: string]: number };
  totalRespondents: number;
  answers: { [key: string]: number };
  total: number;
  totalPoints: number;
  averagePoints: number;
  filteredAnswers: SurveyAnswer[];
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
  totalPoints: number; // Ajout de totalPoints
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
            weight: 400
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

// Ajouter l'interface au début du fichier, avec les autres interfaces
interface QuestionPoints {
  [questionId: string]: number;
}

// Ajoutez cette interface pour les règles de points
interface PointRule {
  response: string;
  points: number;
  condition?: string;
  value?: string | number;
}

// Définir d'abord l'interface pour les filtres
interface DemographicFilter {
  gender: string;
  age: [number, number];
  educationLevel: string;
  city: string;
}

interface Filters {
  demographic: DemographicFilter;
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
  points: {
    min: number;
    max: number;
  };
}

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
  const [filters, setFilters] = useState<Filters>({
    demographic: {
      gender: '',           // Vide par défaut
      age: [0, 100],       // Plage complète par défaut
      educationLevel: '',   // Vide par défaut
      city: ''             // Vide par défaut
    },
    points: {
      min: 0,              // Minimum par défaut
      max: 100            // Maximum par défaut
    }
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
    genderDistribution: {},
    ageDistribution: [],
    educationDistribution: {},
    cityDistribution: {},
    totalRespondents: 0,
    answers: {},
    total: 0,
    totalPoints: 0,
    averagePoints: 0,
    filteredAnswers: []
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

  // Ajouter ce nouvel état
  const [questionPoints, setQuestionPoints] = useState<QuestionPoints>({});
  
  // Ajouter ces états pour la gestion des points
  const [pointsFilter, setPointsFilter] = useState<[number, number]>([0, 100]);
  const [showPointsFilter, setShowPointsFilter] = useState(false);
  const [showPointsConfig, setShowPointsConfig] = useState(false);

  // Ajouter un état pour les villes
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Ajouter la constante DEFAULT_CITIES au début du fichier
  const DEFAULT_CITIES = [
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

  // Modifier la fonction fetchCities
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
      return DEFAULT_CITIES;
    } catch (error) {
      console.error("Error fetching cities:", error);
      return DEFAULT_CITIES;
    }
  };

  // Modifier l'useEffect pour charger les villes
  useEffect(() => {
    const loadCities = async () => {
      try {
        setLoadingCities(true);
        const citiesData = await fetchCities();
        setCities(citiesData);
      } catch (error) {
        console.error('Error loading cities:', error);
        setCities(DEFAULT_CITIES);
      } finally {
        setLoadingCities(false);
      }
    };

    loadCities();
  }, []);

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

  // Déplacer calculatePoints avant filterAnswers
  const calculatePoints = useCallback((answer: Answer, questionId: string): number => {
    const question = selectedSurvey?.questions.find(q => q.id === questionId);
    if (!question) return 0;

    // Récupérer les règles de points pour cette question
    const savedRules = localStorage.getItem(`pointRules_${selectedSurvey?._id}`);
    if (!savedRules) return 0;

    const pointRules = JSON.parse(savedRules);
    const rules = pointRules[questionId] || [];

    let totalPoints = 0;
    const answerValue = answer.answer?.toString().toLowerCase();

    rules.forEach((rule: PointRule) => {
      const ruleResponse = rule.response?.toString().toLowerCase();
      
      switch (rule.condition) {
        case 'equals':
          if (answerValue === ruleResponse) totalPoints += rule.points;
          break;
        case 'contains':
          if (answerValue?.includes(ruleResponse)) totalPoints += rule.points;
          break;
        case 'startsWith':
          if (answerValue?.startsWith(ruleResponse)) totalPoints += rule.points;
          break;
        case 'endsWith':
          if (answerValue?.endsWith(ruleResponse)) totalPoints += rule.points;
          break;
        case 'greaterThan':
          if (Number(answerValue) > Number(ruleResponse)) totalPoints += rule.points;
          break;
        case 'lessThan':
          if (Number(answerValue) < Number(ruleResponse)) totalPoints += rule.points;
          break;
        case 'between':
          const value = Number(answerValue);
          const [min, max] = ruleResponse.split(',').map(Number);
          if (value >= min && value <= max) totalPoints += rule.points;
          break;
      }
    });

    return totalPoints;
  }, [selectedSurvey]);

  const filterAnswers = useCallback((answers: SurveyAnswer[]): SurveyAnswer[] => {
    // Vérifier si des filtres sont réellement actifs
    const hasActiveFilters = 
      filters.demographic.gender !== '' || 
      filters.demographic.educationLevel !== '' || 
      filters.demographic.city !== '' || 
      filters.demographic.age[0] !== 0 || 
      filters.demographic.age[1] !== 100 ||
      filters.points.min > 0 ||
      filters.points.max < 100; // Ajout des conditions pour les points

    // Si aucun filtre n'est actif, retourner toutes les réponses
    if (!hasActiveFilters) {
      return answers;
    }

    return answers.filter(answer => {
      let passesFilters = true;

      // Vérification des filtres démographiques
      if (answer.respondent?.demographic) {
        const demographic = answer.respondent.demographic;

        if (filters.demographic.gender && demographic.gender !== filters.demographic.gender) {
          passesFilters = false;
        }

        if (filters.demographic.educationLevel && demographic.educationLevel !== filters.demographic.educationLevel) {
          passesFilters = false;
        }

        if (filters.demographic.city && demographic.city !== filters.demographic.city) {
          passesFilters = false;
        }

        if (filters.demographic.age[0] !== 0 || filters.demographic.age[1] !== 100) {
          if (demographic.dateOfBirth) {
            const age = calculateAge(new Date(demographic.dateOfBirth));
            if (age < filters.demographic.age[0] || age > filters.demographic.age[1]) {
              passesFilters = false;
            }
          }
        }
      } else if (hasActiveFilters && 
                (filters.demographic.gender || 
                 filters.demographic.educationLevel || 
                 filters.demographic.city || 
                 filters.demographic.age[0] !== 0 || 
                 filters.demographic.age[1] !== 100)) {
        passesFilters = false;
      }

      // Vérification du filtre de points
      if (passesFilters && (filters.points.min > 0 || filters.points.max < 100)) {
        let totalPoints = 0;
        
        // Calculer les points totaux pour toutes les réponses
        answer.answers.forEach(ans => {
          totalPoints += calculatePoints(ans, ans.questionId);
        });

        if (totalPoints < filters.points.min || totalPoints > filters.points.max) {
          passesFilters = false;
        }
      }

      return passesFilters;
    });
  }, [filters, calculatePoints]);

  // Modifier la fonction calculateQuestionStats
  const calculateQuestionStats = useCallback((surveyId: string, questionId: string): QuestionStats & { averagePoints: number } => {
    // Utiliser directement les réponses du sondage, sans passer par filteredStats
    const allAnswers = surveyAnswers[surveyId] || [];
    
    // Appliquer les filtres uniquement si nécessaire
    const filteredAnswers = filterAnswers(allAnswers);
    
    const questionStats: QuestionStats & { averagePoints: number } = {
      total: 0,
      answers: {},
      totalPoints: 0,
      averagePoints: 0
    };

    // Utiliser un Set pour garder une trace des réponses uniques
    const processedAnswers = new Set();

    filteredAnswers.forEach((surveyAnswer: SurveyAnswer) => {
      const questionAnswer = surveyAnswer.answers.find(
        (a: Answer) => a.questionId === questionId
      );

      const answerKey = `${surveyAnswer._id}-${questionId}`;
      if (questionAnswer && questionAnswer.answer != null && !processedAnswers.has(answerKey)) {
        processedAnswers.add(answerKey);
        
        const value = questionAnswer.answer.toString();
        questionStats.answers[value] = (questionStats.answers[value] || 0) + 1;
        questionStats.total++;
        
        const points = calculatePoints(questionAnswer, questionId);
        questionStats.totalPoints += points;
      }
    });

    questionStats.averagePoints = questionStats.total > 0 
      ? questionStats.totalPoints / questionStats.total 
      : 0;

    return questionStats;
  }, [surveyAnswers, filterAnswers, calculatePoints]);

  // Modifier la fonction handleViewQuestionDetails
  const handleQuestionClick = useCallback((questionId: string) => {
    if (!selectedSurvey) return;

    const question = selectedSurvey.questions.find(q => q.id === questionId);
    if (!question) return;

    // Utiliser directement les réponses du sondage et appliquer les filtres
    const answers = surveyAnswers[selectedSurvey._id] || [];
    const filteredAnswers = filterAnswers(answers);
    
    const uniqueAnswers = filteredAnswers.filter((answer: SurveyAnswer, index: number, self: SurveyAnswer[]) => 
      index === self.findIndex((a: SurveyAnswer) => a._id === answer._id)
    );

    setSelectedQuestion({
      questionId,
      answers: uniqueAnswers
    });
    setDialogOpen(true);
    setCurrentView('list');
  }, [selectedSurvey, surveyAnswers, filterAnswers]);

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
        if (!selectedSurvey?._id) return;
        
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('No token found');
        
        // Vérifier si nous avons déjà les réponses pour ce sondage
        if (surveyAnswers[selectedSurvey._id]) return;
        
        const answers = await getSurveyAnswers(selectedSurvey._id, token);
        setSurveyAnswers(prev => ({
          ...prev,
          [selectedSurvey._id]: answers
        }));
      } catch (error) {
        console.error('Error loading survey answers:', error);
        setError('Failed to load survey answers');
      }
    };

    loadAnswers();
  }, [selectedSurvey]);

  // Ajouter cette constante avec les autres constantes
  const genderOptions = [
    "male",
    "female",
    "other"
  ];

  // Ajouter cette fonction pour gérer les changements de filtres
  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => {
      if (field === 'age' || field === 'gender' || field === 'educationLevel' || field === 'city') {
        return {
          ...prev,
          demographic: {
            ...prev.demographic,
            [field]: value
          }
        };
      }
      return prev;
    });
  };

  

  const FilterPanel = () => {
    return (
      <Box sx={{ mb: 3 }}>
        {/* Demographic Filters Section */}
        <Paper sx={{ 
          p: 3, 
          mb: 2, 
          borderRadius: 2,
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2 
          }}>
            <Typography variant="h6" sx={{ color: '#2d3748', fontWeight: 600 }}>
              Demographic Filters
            </Typography>
            <Button
              size="small"
              onClick={() => setFilters(prev => ({
                ...prev,
                demographic: {
                  gender: '',
                  age: [0, 100],
                  educationLevel: '',
                  city: ''
                }
              }))}
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
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Gender</InputLabel>
                <Select
                  value={filters.demographic.gender}
                  onChange={(e) => handleFilterChange('gender', e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Education Level</InputLabel>
                <Select
                  value={filters.demographic.educationLevel}
                  onChange={(e) => handleFilterChange('educationLevel', e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {educationLevels.map((level) => (
                    <MenuItem key={level} value={level}>{level}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>City</InputLabel>
                <Select
                  value={filters.demographic.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  disabled={loadingCities}
                >
                  <MenuItem value="">All</MenuItem>
                  {loadingCities ? (
                    <MenuItem disabled>Loading cities...</MenuItem>
                  ) : (
                    cities.map((city) => (
                      <MenuItem key={city} value={city}>{city}</MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography gutterBottom variant="body2" color="text.secondary">
                Age Range
              </Typography>
              <Slider
                value={filters.demographic.age}
                onChange={(_, newValue) => handleFilterChange('age', newValue)}
                valueLabelDisplay="auto"
                min={0}
                max={100}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Points Filter Section */}
        <Paper sx={{ 
          p: 3, 
          borderRadius: 2,
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2 
          }}>
            <Typography variant="h6" sx={{ color: '#2d3748', fontWeight: 600 }}>
              Points Filter
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                onClick={() => setFilters(prev => ({
                  ...prev,
                  points: {
                    min: 0,
                    max: 100
                  }
                }))}
                sx={{
                  color: '#667eea',
                  '&:hover': {
                    backgroundColor: 'rgba(102, 126, 234, 0.05)'
                  }
                }}
              >
                Reset Filters
              </Button>
              <Button
                startIcon={<SettingsIcon />}
                onClick={() => setShowPointsConfig(true)}
                size="small"
                sx={{
                  color: '#667eea',
                  '&:hover': {
                    backgroundColor: 'rgba(102, 126, 234, 0.05)'
                  }
                }}
              >
                Configure Points
              </Button>
            </Box>
          </Box>

          <Box sx={{ px: 2 }}>
            <Slider
              value={[filters.points.min, filters.points.max]}
              onChange={(_, newValue) => handlePointsFilterChange(newValue as [number, number])}
              valueLabelDisplay="auto"
              min={0}
              max={100}
              sx={{
                color: '#667eea',
                '& .MuiSlider-thumb': {
                  backgroundColor: '#667eea',
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#667eea',
                }
              }}
              marks={[
                { value: 0, label: '0' },
                { value: 25, label: '25' },
                { value: 50, label: '50' },
                { value: 75, label: '75' },
                { value: 100, label: '100' }
              ]}
            />
          </Box>
        </Paper>
      </Box>
    );
  };

  const calculateDemographicStats = useCallback((surveyId: string): DemographicStats => {
    const answers = surveyAnswers[surveyId] || [];
    const stats: DemographicStats = {
      genderDistribution: {},
      ageDistribution: Array(121).fill(0),
      educationDistribution: {},
      cityDistribution: {},
      totalRespondents: 0,
      answers: {},
      total: 0,
      totalPoints: 0,
      averagePoints: 0,
      filteredAnswers: []
    };

    answers.forEach((answer: SurveyAnswer) => {
      const demographic = answer.respondent?.demographic;
      if (demographic) {
        // Traitement du genre
        if (demographic.gender) {
          stats.genderDistribution[demographic.gender] = (stats.genderDistribution[demographic.gender] || 0) + 1;
        }

        // Traitement du niveau d'éducation
        if (demographic.educationLevel) {
          stats.educationDistribution[demographic.educationLevel] = 
            (stats.educationDistribution[demographic.educationLevel] || 0) + 1;
        }

        // Traitement de la ville
        if (demographic.city) {
          stats.cityDistribution[demographic.city] = (stats.cityDistribution[demographic.city] || 0) + 1;
        }

        // Traitement de l'âge
        if (demographic.dateOfBirth) {
          const age = calculateAge(new Date(demographic.dateOfBirth));
          if (age >= 0 && age <= 120) {
            stats.ageDistribution[age]++;
          }
        }

        stats.totalRespondents++;
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
          justifyContent: 'center',
          alignItems: 'stretch'     
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
                    labels: Object.keys(filteredStats?.genderDistribution || stats.genderDistribution),
                    datasets: [{
                      data: Object.values(filteredStats?.genderDistribution || stats.genderDistribution),
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
                    labels: Object.keys(filteredStats?.educationDistribution || stats.educationDistribution),
                    datasets: [{
                      data: Object.values(filteredStats?.educationDistribution || stats.educationDistribution),
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
                    labels: Object.keys(filteredStats?.cityDistribution || stats.cityDistribution),
                    datasets: [{
                      data: Object.values(filteredStats?.cityDistribution || stats.cityDistribution),
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

  // Modifiez la fonction d'application des filtres
  const applyDemographicFilters = useCallback((surveyId: string) => {
    if (!surveyId) return;
    
    const surveyResponses = surveyAnswers[surveyId] || [];
    
    // Filtrer les réponses en fonction de tous les critères (démographiques ET points)
    const filteredAnswers = surveyResponses.filter(answer => {
      // Vérification démographique
      const demographic = answer.respondent?.demographic;
      const demoFilters = filters.demographic;
      
      // Appliquer les filtres démographiques
      if (demoFilters.gender && demographic?.gender !== demoFilters.gender) {
        return false;
      }
      
      if (demographic?.dateOfBirth && demoFilters.age) {
        const age = calculateAge(new Date(demographic.dateOfBirth));
        if (age < demoFilters.age[0] || age > demoFilters.age[1]) {
          return false;
        }
      }
      
      if (demoFilters.educationLevel && demographic?.educationLevel !== demoFilters.educationLevel) {
        return false;
      }
      
      if (demoFilters.city && demographic?.city !== demoFilters.city) {
        return false;
      }

      // Vérification des points
      if (filters.points) {
        // Calculer le total des points pour toutes les réponses de cet utilisateur
        const totalPoints = answer.answers.reduce((sum, ans) => {
          return sum + calculatePoints(ans, ans.questionId);
        }, 0);

        // Appliquer le filtre des points
        if (totalPoints < filters.points.min || totalPoints > filters.points.max) {
          return false;
        }
      }

      return true;
    });

    // Calculer les nouvelles statistiques avec les réponses filtrées
    const newStats: DemographicStats = {
      ...calculateDemographicStats(surveyId),
      filteredAnswers: filteredAnswers,
      totalPoints: filteredAnswers.reduce((sum, answer) => {
        return sum + answer.answers.reduce((answerSum, ans) => {
          return answerSum + calculatePoints(ans, ans.questionId);
        }, 0);
      }, 0),
      averagePoints: filteredAnswers.length > 0 
        ? filteredAnswers.reduce((sum, answer) => {
            return sum + answer.answers.reduce((answerSum, ans) => {
              return answerSum + calculatePoints(ans, ans.questionId);
            }, 0);
          }, 0) / filteredAnswers.length
        : 0
    };

    setFilteredStats(newStats);
  }, [surveyAnswers, filters, calculateDemographicStats, calculatePoints]);

  // Ajouter cette fonction pour mettre à jour le filtre de points
  const handlePointsFilterChange = useCallback((newRange: [number, number]) => {
    setFilters(prev => ({
      ...prev,
      points: {
        min: newRange[0],
        max: newRange[1]
      }
    }));
    
    if (selectedSurvey?._id) {
      applyDemographicFilters(selectedSurvey._id);
    }
  }, [selectedSurvey, applyDemographicFilters]);

  // Fonction utilitaire pour calculer l'âge
  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Mettre à jour useEffect pour initialiser les stats avec le bon sondage
  useEffect(() => {
    if (selectedSurvey?._id) {
      const initialStats = calculateDemographicStats(selectedSurvey._id);
      setStats(initialStats);
      setFilteredStats(initialStats);
    }
  }, [selectedSurvey, calculateDemographicStats]);

  // Ajoutez cette fonction pour calculer les points d'une réponse
  const calculateAnswerPoints = useCallback((answer: SurveyAnswer) => {
    if (!selectedSurvey) return 0;

    let totalPoints = 0;
    const savedRules = localStorage.getItem(`pointRules_${selectedSurvey._id}`);
    if (!savedRules) return 0;

    const pointRules: { [key: string]: PointRule[] } = JSON.parse(savedRules);

    answer.answers.forEach(ans => {
      const rules = pointRules[ans.questionId];
      if (!rules) return;

      rules.forEach((rule: PointRule) => {
        let points = 0;
        const answerValue = ans.answer?.toString().toLowerCase();
        const ruleResponse = rule.response?.toString().toLowerCase();

        switch (rule.condition) {
          case 'equals':
            if (answerValue === ruleResponse) points = rule.points;
            break;
          case 'contains':
            if (answerValue?.includes(ruleResponse)) points = rule.points;
            break;
          case 'startsWith':
            if (answerValue?.startsWith(ruleResponse)) points = rule.points;
            break;
          case 'endsWith':
            if (answerValue?.endsWith(ruleResponse)) points = rule.points;
            break;
          case 'greaterThan':
            if (Number(answerValue) > Number(ruleResponse)) points = rule.points;
            break;
          case 'lessThan':
            if (Number(answerValue) < Number(ruleResponse)) points = rule.points;
            break;
          case 'between':
            const value = Number(answerValue);
            const min = Number(ruleResponse);
            const max = Number(rule.value);
            if (value >= min && value <= max) points = rule.points;
            break;
        }
        totalPoints += points;
      });
    });

    return totalPoints;
  }, [selectedSurvey]);

  // Ajoutez un useEffect pour appliquer les filtres quand ils changent
  useEffect(() => {
    if (selectedSurvey) {
      applyDemographicFilters(selectedSurvey._id);
    }
  }, [selectedSurvey, applyDemographicFilters]);

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

  // Ajouter cette fonction pour mettre à jour les points d'une question
  const handlePointsChange = (questionId: string, points: number) => {
    setQuestionPoints(prev => ({
      ...prev,
      [questionId]: points
    }));
  };

  // Ajouter ce composant pour la configuration des points
  const PointsConfigDialog = memo(({ open, onClose }: { open: boolean; onClose: () => void }) => {
    // Modifier l'initialisation des règles de points pour utiliser le localStorage
    const [pointRules, setPointRules] = useState<{
      [questionId: string]: Array<{
        response: string;
        points: number;
        condition?: string;
        value?: string | number;
      }>
    }>({});

    // Charger les règles sauvegardées au montage du composant
    useEffect(() => {
      if (selectedSurvey) {
        const savedRules = localStorage.getItem(`pointRules_${selectedSurvey._id}`);
        if (savedRules) {
          setPointRules(JSON.parse(savedRules));
        } else {
          // Initialisation par défaut si pas de règles sauvegardées
          const initialRules: typeof pointRules = {};
          selectedSurvey.questions.forEach(question => {
            initialRules[question.id] = [{
              response: '',
              points: 0,
              condition: 'equals'
            }];
          });
          setPointRules(initialRules);
        }
      }
    }, [selectedSurvey]);

    // Sauvegarder les règles quand elles sont modifiées
    const saveRules = useCallback(() => {
      if (selectedSurvey) {
        localStorage.setItem(`pointRules_${selectedSurvey._id}`, JSON.stringify(pointRules));
        
        // Mettre à jour les points des questions
        setQuestionPoints(prev => {
          const newPoints = { ...prev };
          Object.entries(pointRules).forEach(([questionId, rules]) => {
            newPoints[questionId] = Math.max(...rules.map(r => r.points));
          });
          return newPoints;
        });
      }
    }, [pointRules, selectedSurvey]);

    // Modifier les fonctions de gestion des règles pour sauvegarder automatiquement
    const addRule = (questionId: string) => {
      setPointRules(prev => {
        const newRules = {
          ...prev,
          [questionId]: [
            ...(prev[questionId] || []),
            {
              response: '',
              points: 0,
              condition: 'equals'
            }
          ]
        };
        if (selectedSurvey) {
          localStorage.setItem(`pointRules_${selectedSurvey._id}`, JSON.stringify(newRules));
        }
        return newRules;
      });
    };

    const removeRule = (questionId: string, index: number) => {
      setPointRules(prev => {
        const newRules = {
          ...prev,
          [questionId]: prev[questionId].filter((_, i) => i !== index)
        };
        if (selectedSurvey) {
          localStorage.setItem(`pointRules_${selectedSurvey._id}`, JSON.stringify(newRules));
        }
        return newRules;
      });
    };

    const updateRule = (questionId: string, index: number, updates: Partial<typeof pointRules[string][number]>) => {
      setPointRules(prev => {
        const newRules = {
          ...prev,
          [questionId]: prev[questionId].map((rule, i) => 
            i === index ? { ...rule, ...updates } : rule
          )
        };
        if (selectedSurvey) {
          localStorage.setItem(`pointRules_${selectedSurvey._id}`, JSON.stringify(newRules));
        }
        return newRules;
      });
    };

    // Composant pour les règles de type texte
    const TextRuleFields = ({ rule, questionId, ruleIndex }: {
      rule: typeof pointRules[string][number];
      questionId: string;
      ruleIndex: number;
    }) => {
      const [localText, setLocalText] = useState(rule.response || '');

      useEffect(() => {
        setLocalText(rule.response || '');
      }, [rule.response]);

      const debouncedUpdate = useCallback(
        debounce((value: string) => {
          updateRule(questionId, ruleIndex, { response: value });
        }, 300),
        [questionId, ruleIndex]
      );

      const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalText(newValue);
        debouncedUpdate(newValue);
      };

      return (
        <>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Condition</InputLabel>
            <Select
              value={rule.condition}
              onChange={(e) => updateRule(questionId, ruleIndex, { condition: e.target.value })}
              size="small"
            >
              <MenuItem value="equals">Égal à</MenuItem>
              <MenuItem value="contains">Contient</MenuItem>
              <MenuItem value="startsWith">Commence par</MenuItem>
              <MenuItem value="endsWith">Termine par</MenuItem>
            </Select>
          </FormControl>

            <TextField
            label="Texte attendu"
            value={localText}
            onChange={handleTextChange}
            size="small"
            multiline
            rows={3}
            sx={{ 
              width: 300, // Taille fixe au lieu de minWidth
              '& .MuiInputBase-root': {
                padding: '8px',
                height: '100px', // Hauteur fixe
                overflow: 'auto' // Ajout de scroll si nécessaire
              },
              '& .MuiInputBase-input': {
                height: '100% !important', // Forcer la hauteur
                resize: 'none' // Désactiver le redimensionnement
              }
            }}
            InputProps={{
              sx: {
                fontSize: '0.875rem',
                lineHeight: '1.5'
              }
            }}
          />
        </>
      );
    };

    // Composant pour les règles de type rating
    const RatingRuleFields = ({ rule, questionId, ruleIndex }: {
      rule: typeof pointRules[string][number];
      questionId: string;
      ruleIndex: number;
    }) => (
      <>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Condition</InputLabel>
          <Select
            value={rule.condition}
            onChange={(e) => updateRule(questionId, ruleIndex, { condition: e.target.value })}
            size="small"
          >
            <MenuItem value="equals">Égal à</MenuItem>
            <MenuItem value="greaterThan">Supérieur à</MenuItem>
            <MenuItem value="lessThan">Inférieur à</MenuItem>
            <MenuItem value="between">Entre</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Rating
            value={Number(rule.response)}
            onChange={(_, newValue) => {
              updateRule(questionId, ruleIndex, { response: newValue?.toString() || '0' });
            }}
          />
          {rule.condition === 'between' && (
            <>
              <Typography>et</Typography>
              <Rating
                value={Number(rule.value)}
                onChange={(_, newValue) => {
                  updateRule(questionId, ruleIndex, { value: newValue?.toString() || '0' });
                }}
              />
            </>
          )}
        </Box>
      </>
    );

    // Composant pour les règles de type slider
    const SliderRuleFields = ({ rule, questionId, ruleIndex }: {
      rule: typeof pointRules[string][number];
      questionId: string;
      ruleIndex: number;
    }) => {
      const [sliderValue, setSliderValue] = useState<number[]>([
        Number(rule.response) || 0,
        rule.condition === 'between' ? Number(rule.value) || 0 : 0
      ]);

      const handleSliderChange = (event: Event, newValue: number | number[]) => {
        const values = Array.isArray(newValue) ? newValue : [newValue];
        setSliderValue(values);
        
        if (rule.condition === 'between') {
          updateRule(questionId, ruleIndex, { 
            response: values[0].toString(),
            value: values[1].toString()
          });
        } else {
          updateRule(questionId, ruleIndex, { 
            response: values[0].toString()
          });
        }
      };

      return (
        <Box sx={{ 
          width: '100%', 
          maxWidth: 500,
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }}>
          {/* Condition Select */}
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Condition</InputLabel>
            <Select
              value={rule.condition}
              onChange={(e) => {
                const newCondition = e.target.value;
                updateRule(questionId, ruleIndex, { 
                  condition: newCondition,
                  value: newCondition === 'between' ? sliderValue[1].toString() : undefined
                });
              }}
              size="small"
            >
              <MenuItem value="equals">Égal à</MenuItem>
              <MenuItem value="greaterThan">Supérieur à</MenuItem>
              <MenuItem value="lessThan">Inférieur à</MenuItem>
              <MenuItem value="between">Entre</MenuItem>
            </Select>
          </FormControl>

          {/* Slider Component */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4,
              bgcolor: 'rgba(102, 126, 234, 0.05)',
              borderRadius: 2,
              border: '1px solid rgba(102, 126, 234, 0.1)'
            }}
          >
            <Box sx={{ px: 2, width: '100%' }}>
              <Slider
                value={rule.condition === 'between' ? sliderValue : sliderValue[0]}
                onChange={handleSliderChange}
                valueLabelDisplay="auto"
                min={0}
                max={100}
                marks={[
                  { value: 0, label: '0' },
                  { value: 25, label: '25' },
                  { value: 50, label: '50' },
                  { value: 75, label: '75' },
                  { value: 100, label: '100' }
                ]}
                sx={{
                  '& .MuiSlider-rail': {
                    background: 'rgba(102, 126, 234, 0.2)',
                    height: 6
                  },
                  '& .MuiSlider-track': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    height: 6
                  },
                  '& .MuiSlider-thumb': {
                    width: 16,
                    height: 16,
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
                    width: 2,
                    height: 2,
                    '&.MuiSlider-markActive': {
                      backgroundColor: '#fff',
                    }
                  },
                  '& .MuiSlider-markLabel': {
                    fontSize: '0.875rem',
                    color: 'text.secondary'
                  }
                }}
              />

              {/* Value Display */}
              <Box sx={{ 
                mt: 3,
                display: 'flex', 
                justifyContent: 'center',
                alignItems: 'center',
                gap: 2
              }}>
                <TextField
                  size="small"
                  type="number"
                  value={sliderValue[0]}
                  onChange={(e) => {
                    const newValue = Math.min(100, Math.max(0, Number(e.target.value)));
                    handleSliderChange(e as any, rule.condition === 'between' ? [newValue, sliderValue[1]] : newValue);
                  }}
                  InputProps={{
                    inputProps: { min: 0, max: 100 },
                    sx: {
                      width: 80,
                      textAlign: 'center',
                      '& input': {
                        textAlign: 'center'
                      }
                    }
                  }}
                />
                {rule.condition === 'between' && (
                  <>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'text.secondary',
                        px: 1,
                        userSelect: 'none'
                      }}
                    >
                      jusqu'à
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={sliderValue[1]}
                      onChange={(e) => {
                        const newValue = Math.min(100, Math.max(0, Number(e.target.value)));
                        handleSliderChange(e as any, [sliderValue[0], newValue]);
                      }}
                      InputProps={{
                        inputProps: { min: 0, max: 100 },
                        sx: {
                          width: 80,
                          textAlign: 'center',
                          '& input': {
                            textAlign: 'center'
                          }
                        }
                      }}
                    />
                  </>
                )}
            </Box>
            </Box>
          </Paper>
        </Box>
      );
    };

    // Composant pour les règles de type date
    const DateRuleFields = ({ rule, questionId, ruleIndex }: {
      rule: typeof pointRules[string][number];
      questionId: string;
      ruleIndex: number;
    }) => (
      <>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Condition</InputLabel>
          <Select
            value={rule.condition}
            onChange={(e) => updateRule(questionId, ruleIndex, { condition: e.target.value })}
            size="small"
          >
            <MenuItem value="equals">Égal à</MenuItem>
            <MenuItem value="before">Avant</MenuItem>
            <MenuItem value="after">Après</MenuItem>
            <MenuItem value="between">Entre</MenuItem>
          </Select>
        </FormControl>

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Stack direction="row" spacing={2} alignItems="center">
            <DatePicker
              label="Date"
              value={rule.response ? new Date(rule.response) : null}
              onChange={(newValue) => {
                updateRule(questionId, ruleIndex, { 
                  response: newValue ? newValue.toISOString() : '' 
                });
              }}
              renderInput={(params) => (
                <TextField {...params} size="small" sx={{ width: 200 }} />
              )}
            />
            {rule.condition === 'between' && (
              <>
                <Typography>et</Typography>
                <DatePicker
                  label="Date fin"
                  value={rule.value ? new Date(rule.value) : null}
                  onChange={(newValue) => {
                    updateRule(questionId, ruleIndex, { 
                      value: newValue ? newValue.toISOString() : '' 
                    });
                  }}
                  renderInput={(params) => (
                    <TextField {...params} size="small" sx={{ width: 200 }} />
                  )}
                />
              </>
            )}
          </Stack>
        </LocalizationProvider>
      </>
    );

    // Composant pour les règles de type yes/no
    const YesNoRuleFields = ({ rule, questionId, ruleIndex }: {
      rule: typeof pointRules[string][number];
      questionId: string;
      ruleIndex: number;
    }) => (
      <>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Réponse attendue</InputLabel>
          <Select
            value={rule.response}
            onChange={(e) => updateRule(questionId, ruleIndex, { response: e.target.value })}
            size="small"
          >
            <MenuItem value="yes">Oui</MenuItem>
            <MenuItem value="no">Non</MenuItem>
          </Select>
        </FormControl>
      </>
    );

    return (
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
            overflowY: 'auto'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6">Configuration des Règles de Points</Typography>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <ClearIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          {selectedSurvey?.questions.map((question, qIndex) => (
            <Card 
              key={question.id} 
              sx={{ 
                mb: 3,
                border: '1px solid rgba(102, 126, 234, 0.2)',
                '&:hover': {
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  borderColor: 'rgba(102, 126, 234, 0.5)'
                }
              }}
            >
                  <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#2d3748' }}>
                  Question {qIndex + 1}: {question.text}
                    </Typography>
                
                <Typography variant="subtitle2" sx={{ color: '#4a5568', mb: 2 }}>
                  Type: {question.type}
                    </Typography>

                <Box sx={{ pl: 2 }}>
                  {pointRules[question.id]?.map((rule, ruleIndex) => (
                    <Box 
                      key={ruleIndex}
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 2,
                        p: 2,
                        borderRadius: 1,
                        bgcolor: 'rgba(102, 126, 234, 0.05)'
                      }}
                    >
                      {/* Champs spécifiques selon le type de question */}
                      {question.type === 'text' && (
                        <TextRuleFields 
                          rule={rule} 
                          questionId={question.id} 
                          ruleIndex={ruleIndex} 
                        />
                      )}

                      {question.type === 'rating' && (
                        <RatingRuleFields 
                          rule={rule} 
                          questionId={question.id} 
                          ruleIndex={ruleIndex} 
                        />
                      )}

                      {question.type === 'slider' && (
                        <SliderRuleFields 
                          rule={rule} 
                          questionId={question.id} 
                          ruleIndex={ruleIndex} 
                        />
                      )}

                      {question.type === 'date' && (
                        <DateRuleFields 
                          rule={rule} 
                          questionId={question.id} 
                          ruleIndex={ruleIndex} 
                        />
                      )}

                      {question.type === 'yes-no' && (
                        <YesNoRuleFields 
                          rule={rule} 
                          questionId={question.id} 
                          ruleIndex={ruleIndex} 
                        />
                      )}

                      {(question.type === 'multiple-choice' || question.type === 'dropdown') && (
                        <>
                          <FormControl sx={{ minWidth: 200 }}>
                            <InputLabel>Réponse</InputLabel>
                            <Select
                              value={rule.response}
                              onChange={(e) => updateRule(question.id, ruleIndex, { response: e.target.value })}
                      size="small"
                            >
                              {question.options?.map((option, index) => (
                                <MenuItem key={index} value={option}>{option}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </>
                      )}

                      {/* Points à attribuer */}
                      <TextField
                        type="number"
                        label="Points"
                        value={rule.points}
                        onChange={(e) => updateRule(question.id, ruleIndex, { 
                          points: Math.max(0, parseInt(e.target.value) || 0)
                        })}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Chip 
                                label="pts"
                                size="small"
                                sx={{ bgcolor: 'primary.main', color: 'white' }}
                              />
                            </InputAdornment>
                          ),
                          inputProps: { min: 0 }
                        }}
                        size="small"
                        sx={{ width: 150 }}
                      />

                      <IconButton 
                        onClick={() => removeRule(question.id, ruleIndex)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}

                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => addRule(question.id)}
                    sx={{
                      mt: 1,
                      color: '#667eea',
                      '&:hover': {
                        bgcolor: 'rgba(102, 126, 234, 0.05)'
                      }
                    }}
                  >
                    Ajouter une règle
                    </Button>
                </Box>
              </CardContent>
                </Card>
            ))}
        </DialogContent>

        <DialogActions sx={{ p: 3, bgcolor: 'rgba(102, 126, 234, 0.05)' }}>
          <Button
            onClick={onClose}
            variant="outlined"
            startIcon={<ClearIcon />}
            sx={{
              borderColor: 'rgba(102, 126, 234, 0.5)',
              color: '#667eea',
              '&:hover': {
                borderColor: '#667eea',
                bgcolor: 'rgba(102, 126, 234, 0.05)'
              }
            }}
          >
            Annuler
          </Button>
          <Button 
            onClick={() => {
              saveRules();
              onClose();
            }}
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              }
            }}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
    );
  });

  // Supprimer ou remplacer la fonction renderToolbar par une version plus simple
  const renderToolbar = () => (
    <Box sx={{ 
      mb: 3, 
      display: 'flex', 
      gap: 2, 
      flexWrap: 'wrap',
      alignItems: 'center',
      p: 2,
      bgcolor: 'white',
      borderRadius: 1,
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Vous pouvez ajouter d'autres éléments de la barre d'outils ici si nécessaire */}
    </Box>
  );

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
          width: '100%',  // Ajout de cette ligne pour limiter la largeur
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

            {renderToolbar()}
            
            {showPointsFilter && (
              <PointsFilterPanel 
                pointsFilter={pointsFilter}
                setPointsFilter={setPointsFilter}
                setShowPointsFilter={setShowPointsFilter}
              />
            )}
            
            <PointsConfigDialog 
              open={showPointsConfig} 
              onClose={() => setShowPointsConfig(false)} 
            />
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
                    onChange={(date: Date | null) => setDateRange(prev => ({ ...prev, start: date }))}
                    renderInput={(params) => <TextField {...params} />}
                  />
                  <DatePicker
                    label="End Date"
                    value={dateRange.end}
                    onChange={(date: Date | null) => setDateRange(prev => ({ ...prev, end: date }))}
                    renderInput={(params) => <TextField {...params} />}
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
                      direction="column" 
                      spacing={1} 
                      sx={{ 
                        mt: 'auto',
                        position: 'relative',
                        zIndex: 1,
                        minHeight: '60px'
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          mb: 1,
                          fontSize: '0.75rem'
                        }}
                      >
                        Created on {formatDate(survey.createdAt)}
                      </Typography>
                      
                      <Stack 
                        direction="row" 
                        spacing={1} 
                        sx={{
                          display: 'flex',
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: '8px',
                          '& .MuiChip-root': {
                            margin: '0 !important'  // Supprime les marges automatiques
                          }
                        }}
                      >
                        <Chip
                          size="small"
                          label={`${survey.questions?.length || 0} questions`}
                          sx={{
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            color: '#667eea',
                            height: '24px'
                          }}
                        />
                        <Chip
                          size="small"
                          label={survey.demographicEnabled ? 'Demographics' : 'No Demographics'}
                          sx={{
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            color: '#667eea',
                            height: '24px'
                          }}
                        />
                        <Chip
                          size="small"
                          label={`${surveyAnswers[survey._id]?.length || 0} responses`}
                          sx={{
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            color: '#667eea',
                            height: '24px'
                          }}
                        />
                      </Stack>
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

// Ajouter cette fonction après les imports
const formatDate = (date: string | Date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Ajouter ce composant pour le filtrage par points
const PointsFilterPanel = memo(({ 
  pointsFilter, 
  setPointsFilter, 
  setShowPointsFilter 
}: { 
  pointsFilter: [number, number];
  setPointsFilter: (value: [number, number]) => void;
  setShowPointsFilter: (value: boolean) => void;
}) => {
  return (
    <Box sx={{ 
      mb: 3, 
      p: 3, 
      border: '1px solid rgba(102, 126, 234, 0.2)',
      borderRadius: 2,
      bgcolor: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <Typography variant="h6" gutterBottom sx={{ 
        color: '#2d3748',
        fontWeight: 600,
        mb: 3
      }}>
        Filtrer par Points
      </Typography>

      <Box sx={{ px: 2 }}>
        <Typography gutterBottom sx={{
          color: '#4a5568',
          fontSize: '0.875rem',
          marginBottom: 1
        }}>
          Points minimum
        </Typography>
        <Slider
          value={pointsFilter}
          onChange={(_, newValue) => setPointsFilter(newValue as [number, number])}
          valueLabelDisplay="auto"
          min={0}
          max={100}
          sx={{
            width: '100%',
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
        <Typography gutterBottom sx={{
          color: '#4a5568',
          fontSize: '0.875rem',
          marginBottom: 1
        }}>
          Points maximum
        </Typography>
      </Box>
    </Box>
  );
});

export default ResultsPage;