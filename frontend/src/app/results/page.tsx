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
  // Supprimer Tooltip de cet import
} from '@mui/material';
import { Tooltip as MuiTooltip } from '@mui/material'; // Renommer l'import de Tooltip
import VisibilityIcon from '@mui/icons-material/Visibility';
import BarChartIcon from '@mui/icons-material/BarChart';
import { fetchSurveys, getSurveyAnswers } from '@/utils/surveyService';
import { Bar, Line, Pie, Doughnut, Radar, Scatter, Bubble } from 'react-chartjs-2';
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
  RadialLinearScale,
  Filler,
  ScatterController,
  BubbleController
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

// Enregistrer tous les composants ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale
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
    return <Typography>Aucune donnée disponible</Typography>;
  }

  const chartData = {
    labels: Object.keys(data),
    datasets: [{
      label: question.text,
      data: Object.values(data),
      backgroundColor: [
        'rgba(255, 99, 132, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(153, 102, 255, 0.5)',
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
      ],
      borderWidth: 1
    }]
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return <Bar data={chartData} options={commonChartOptions} />;
      case 'line':
        return <Line data={chartData} options={commonChartOptions} />;
      case 'pie':
        return <Pie data={chartData} options={pieOptions} />;
      case 'doughnut':
        return <Doughnut data={chartData} options={pieOptions} />;
      case 'radar':
        return <Radar data={chartData} options={commonChartOptions} />;
      case 'scatter':
        return <Scatter data={chartData} options={commonChartOptions} />;
      default:
        return <Bar data={chartData} options={commonChartOptions} />;
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
      
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
        {availableChartTypes.length > 0 ? (
          availableChartTypes.map((type) => (
            <Button
              key={type}
              startIcon={getChartIcon(type)}
              onClick={() => setChartType(type)}
              variant={chartType === type ? 'contained' : 'outlined'}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))
        ) : (
          <Typography>Aucun graphique disponible pour ce type de question</Typography>
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
    backgroundColor: [
      'rgba(54, 162, 235, 0.5)',
      'rgba(255, 99, 132, 0.5)',
      'rgba(75, 192, 192, 0.5)',
      'rgba(255, 206, 86, 0.5)',
      'rgba(153, 102, 255, 0.5)',
    ],
    borderColor: [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(153, 102, 255, 1)',
    ]
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  // Refs
  const chartRef = useRef<ChartRefType | null>(null);

  // Nouveaux états
  const [filters, setFilters] = useState<{
    demographic: {
      educationLevel?: string;
      city?: string;
      age?: [number, number];
    };
    answers: {
      [questionId: string]: string | number | boolean;
    };
  }>({
    demographic: {},
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
        backgroundColor: chartColors.backgroundColor,
        borderColor: chartColors.borderColor,
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
    return answers.filter(answer => {
      const demographic = answer.respondent?.demographic;
      if (!demographic) return true;

      // Filtre par niveau d'éducation
      if (filters.demographic.educationLevel && 
          demographic.educationLevel !== filters.demographic.educationLevel) {
        return false;
      }

      // Filtre par ville
      if (filters.demographic.city && 
          demographic.city !== filters.demographic.city) {
        return false;
      }

      // Filtre par tranche d'âge
      if (filters.demographic.age && demographic.dateOfBirth) {
        const age = calculateAge(new Date(demographic.dateOfBirth));
        if (age < filters.demographic.age[0] || age > filters.demographic.age[1]) {
          return false;
        }
      }

      return true;
    });
  }, [filters]);

  // Modifier la fonction calculateQuestionStats pour utiliser le filtrage
  const calculateQuestionStats = useCallback((surveyId: string, questionId: string): QuestionStats => {
    const allAnswers = surveyAnswers[surveyId] || [];
    
    // Appliquer les filtres démographiques
    const filteredAnswers = allAnswers.filter((answer: SurveyAnswer) => {
      const demographic = answer.respondent?.demographic;
      if (!demographic) return true;

      // Filtre par niveau d'éducation
      if (filters.demographic.educationLevel && 
          demographic.educationLevel !== filters.demographic.educationLevel) {
        return false;
      }

      // Filtre par ville
      if (filters.demographic.city && 
          demographic.city !== filters.demographic.city) {
        return false;
      }

      // Filtre par tranche d'âge
      if (filters.demographic.age && demographic.dateOfBirth) {
        const age = calculateAge(new Date(demographic.dateOfBirth));
        if (age < filters.demographic.age[0] || age > filters.demographic.age[1]) {
          return false;
        }
      }

      return true;
    });

    const stats: QuestionStats = {
      total: 0,
      answers: {}
    };

    filteredAnswers.forEach((answer: SurveyAnswer) => {
      const questionAnswer = answer.answers.find((a: Answer) => a.questionId === questionId);
      if (questionAnswer && questionAnswer.answer != null) {
        const value = questionAnswer.answer.toString();
        stats.answers[value] = (stats.answers[value] || 0) + 1;
        stats.total++;
      }
    });

    return stats;
  }, [surveyAnswers, filters]);

  // Modifier la fonction handleViewQuestionDetails
  const handleQuestionClick = useCallback((questionId: string) => {
    if (!selectedSurvey) return;

    // Filtrer les réponses avant de les stocker
    const allAnswers = surveyAnswers[selectedSurvey._id] || [];
    const filteredAnswers = allAnswers.filter((answer: SurveyAnswer) => {
      const demographic = answer.respondent?.demographic;
      if (!demographic) return false;

      // Appliquer les filtres démographiques
      if (filters.demographic.educationLevel && 
          demographic.educationLevel !== filters.demographic.educationLevel) {
        return false;
      }

      if (filters.demographic.city && 
          demographic.city !== filters.demographic.city) {
        return false;
      }

      if (filters.demographic.age && demographic.dateOfBirth) {
        const age = calculateAge(new Date(demographic.dateOfBirth));
        if (age < filters.demographic.age[0] || age > filters.demographic.age[1]) {
          return false;
        }
      }

      return true;
    });

    setSelectedQuestion({
      questionId,
      answers: filteredAnswers // Stocker uniquement les réponses filtrées
    });
    setDialogOpen(true);
  }, [selectedSurvey, surveyAnswers, filters]);

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
            {answer}: {count} réponses ({Math.round((count / stats.total) * 100)}%)
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
        <Typography variant="h6" gutterBottom>
          Demographic Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Education Level</InputLabel>
              <Select
                value={filters.demographic.educationLevel || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  demographic: {
                    ...prev.demographic,
                    educationLevel: e.target.value
                  }
                }))}
              >
                <MenuItem value="">All</MenuItem>
                {educationLevels.map((level) => (
                  <MenuItem key={level} value={level}>{level}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>City</InputLabel>
              <Select
                value={filters.demographic.city || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  demographic: {
                    ...prev.demographic,
                    city: e.target.value
                  }
                }))}
              >
                <MenuItem value="">All Cities</MenuItem>
                {cities.map((city) => (
                  <MenuItem key={city} value={city}>{city}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Box sx={{ width: '100%', px: 2 }}>
              <Typography gutterBottom>
                Age Range: {ageRange[0]} - {ageRange[1]} years
              </Typography>
              <Slider
                value={ageRange}
                onChange={handleAgeChange}
                valueLabelDisplay="auto"
                min={0}
                max={100}
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

  const [showDemographic, setShowDemographic] = useState(false);

  const renderDemographicStats = useCallback(() => {
    if (!selectedSurvey) return null;

    return (
      <DemographicStatsContent 
        selectedSurvey={selectedSurvey}
        surveyAnswers={surveyAnswers}
        filters={filters}
        calculateDemographicStats={calculateDemographicStats}
      />
    );
  }, [selectedSurvey, surveyAnswers, filters]);

  // Créer un sous-composant pour gérer les états
  const DemographicStatsContent: React.FC<{
    selectedSurvey: Survey;
    surveyAnswers: Record<string, SurveyAnswer[]>;
    filters: any;
    calculateDemographicStats: (surveyId: string) => DemographicStats;
  }> = ({ selectedSurvey, surveyAnswers, filters, calculateDemographicStats }) => {
    const [filteredStats, setFilteredStats] = useState<DemographicStats | null>(null);

    const applyDemographicFilters = useCallback(() => {
      const answers = surveyAnswers[selectedSurvey._id] || [];
      
      const filteredAnswers = answers.filter((answer: SurveyAnswer) => {
        const demographic = answer.respondent?.demographic;
        if (!demographic) return false;

        if (filters.demographic.educationLevel && 
            demographic.educationLevel !== filters.demographic.educationLevel) {
          return false;
        }

        if (filters.demographic.city && 
            demographic.city !== filters.demographic.city) {
          return false;
        }

        if (filters.demographic.age && demographic.dateOfBirth) {
          const age = calculateAge(new Date(demographic.dateOfBirth));
          if (age < filters.demographic.age[0] || age > filters.demographic.age[1]) {
            return false;
          }
        }

        return true;
      });

      const newStats = {
        gender: {},
        education: {},
        city: {},
        ageDistribution: Array(121).fill(0)
      } as DemographicStats;

      filteredAnswers.forEach((answer: SurveyAnswer) => {
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

      setFilteredStats(newStats);
    }, [selectedSurvey, surveyAnswers, filters]);

    const stats = filteredStats || calculateDemographicStats(selectedSurvey._id);

    return (
      <Box sx={{ mt: 4, p: 3, border: '1px solid #ddd', borderRadius: 2, bgcolor: '#fff' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Statistiques Démographiques
          </Typography>
          <Box>
            <Button
              variant="contained"
              onClick={applyDemographicFilters}
              sx={{ mr: 2 }}
            >
              Appliquer les filtres
            </Button>
            {filteredStats && (
              <Button
                variant="text"
                onClick={() => setFilteredStats(null)}
              >
                Réinitialiser
              </Button>
            )}
          </Box>
        </Box>

        {filteredStats && (
          <Typography variant="subtitle1" sx={{ mb: 2, color: 'primary.main' }}>
            Résultats filtrés : {Object.values(filteredStats.gender).reduce((a, b) => a + b, 0)} réponses
          </Typography>
        )}

        <Grid container spacing={4}>
          {/* Genre */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: '400px' }}>
              <Typography variant="subtitle1" gutterBottom align="center" sx={{ fontWeight: 'medium' }}>
                Distribution par Genre
              </Typography>
              <Box sx={{ height: 'calc(100% - 40px)' }}>
                <Pie
                  data={{
                    labels: Object.keys(stats.gender),
                    datasets: [{
                      data: Object.values(stats.gender),
                      backgroundColor: [
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(75, 192, 192, 0.8)'
                      ],
                      borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(75, 192, 192, 1)'
                      ],
                      borderWidth: 2
                    }]
                  }}
                  options={commonChartOptions}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Niveau d'éducation */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: '400px' }}>
              <Typography variant="subtitle1" gutterBottom align="center" sx={{ fontWeight: 'medium' }}>
                Distribution par Niveau d'Éducation
              </Typography>
              <Box sx={{ height: 'calc(100% - 40px)' }}>
                <Bar
                  data={{
                    labels: Object.keys(stats.education),
                    datasets: [{
                      label: 'Participants',
                      data: Object.values(stats.education),
                      backgroundColor: 'rgba(75, 192, 192, 0.8)',
                      borderColor: 'rgba(75, 192, 192, 1)',
                      borderWidth: 2,
                      borderRadius: 5
                    }]
                  }}
                  options={commonChartOptions}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Distribution des âges */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: '400px' }}>
              <Typography variant="subtitle1" gutterBottom align="center" sx={{ fontWeight: 'medium' }}>
                Distribution des Âges
              </Typography>
              <Box sx={{ height: 'calc(100% - 40px)' }}>
                <Line
                  data={{
                    labels: Array.from({ length: 121 }, (_, i) => i.toString()),
                    datasets: [{
                      label: 'Participants',
                      data: stats.ageDistribution,
                      backgroundColor: 'rgba(54, 162, 235, 0.2)',
                      borderColor: 'rgba(54, 162, 235, 1)',
                      borderWidth: 2,
                      pointRadius: 3,
                      pointHoverRadius: 5,
                      pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                      fill: true,
                      tension: 0.3
                    }]
                  }}
                  options={commonChartOptions}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Villes */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: '400px' }}>
              <Typography variant="subtitle1" gutterBottom align="center" sx={{ fontWeight: 'medium' }}>
                Distribution par Ville
              </Typography>
              <Box sx={{ height: 'calc(100% - 40px)' }}>
                <Doughnut
                  data={{
                    labels: Object.keys(stats.city),
                    datasets: [{
                      data: Object.values(stats.city),
                      backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 159, 64, 0.8)'
                      ],
                      borderWidth: 2
                    }]
                  }}
                  options={commonChartOptions}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

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
                  Demographic Information:
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

    const filterAnswers = (answers: SurveyAnswer[]): SurveyAnswer[] => {
      return answers.filter(answer => {
        const demographic = answer.respondent?.demographic;
        if (!demographic) return true;

        if (filters.demographic.educationLevel && 
            demographic.educationLevel !== filters.demographic.educationLevel) {
          return false;
        }

        if (filters.demographic.city && 
            demographic.city !== filters.demographic.city) {
          return false;
        }

        if (filters.demographic.age && demographic.dateOfBirth) {
          const age = calculateAge(new Date(demographic.dateOfBirth));
          if (age < filters.demographic.age[0] || age > filters.demographic.age[1]) {
            return false;
          }
        }

        return true;
      });
    };

    const getFilteredAnswerCounts = () => {
      const filteredAnswers = filterAnswers(selectedQuestion.answers);
      const answerCounts: { [key: string]: number } = {};
      
      filteredAnswers.forEach(answer => {
        const questionAnswer = answer.answers.find(a => a.questionId === questionId);
        if (questionAnswer) {
          const value = String(questionAnswer.answer || 'Sans réponse');
          answerCounts[value] = (answerCounts[value] || 0) + 1;
        }
      });
      
      return answerCounts;
    };

    return (
      <>
        <DialogTitle>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">{question.text}</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" color="textSecondary">
                {selectedQuestion.answers.length} réponse(s)
              </Typography>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={currentView} 
                  onChange={(_, newValue) => handleViewChange(newValue as 'list' | 'chart')}
                >
                  <Tab 
                    icon={<VisibilityIcon />} 
                    label="Liste" 
                    value="list"
                  />
                  <Tab 
                    icon={<BarChartIcon />} 
                    label="Graphique" 
                    value="chart"
                  />
                </Tabs>
              </Box>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {currentView === 'list' ? (
            <List>
              {selectedQuestion.answers.map((answer, index) => {
                const questionAnswer = answer.answers.find(
                  a => a.questionId === selectedQuestion.questionId
                );
                const answerValue = questionAnswer?.answer?.toString() || 'Sans réponse';
                
                // Préparer le contenu du tooltip
                const tooltipContent = (
                  <Paper sx={{ p: 1.5, maxWidth: 300 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      <strong>Email:</strong> {answer.respondent.userId.email}
                    </Typography>
                    {answer.respondent.demographic && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          <strong>Genre:</strong> {answer.respondent.demographic.gender || 'Non spécifié'}
                        </Typography>
                        <Typography variant="subtitle2" gutterBottom>
                          <strong>Date de naissance:</strong> {
                            answer.respondent.demographic.dateOfBirth 
                              ? new Date(answer.respondent.demographic.dateOfBirth).toLocaleDateString()
                              : 'Non spécifié'
                          }
                        </Typography>
                        <Typography variant="subtitle2" gutterBottom>
                          <strong>Niveau d'éducation:</strong> {
                            answer.respondent.demographic.educationLevel || 'Non spécifié'
                          }
                        </Typography>
                        <Typography variant="subtitle2">
                          <strong>Ville:</strong> {answer.respondent.demographic.city || 'Non spécifié'}
                        </Typography>
                      </>
                    )}
                  </Paper>
                );

                return (
                  <MuiTooltip 
                    key={index}
                    title={tooltipContent}
                    placement="right-start"
                    arrow
                    followCursor
                    PopperProps={{
                      sx: {
                        '& .MuiTooltip-tooltip': {
                          bgcolor: 'background.paper',
                          color: 'text.primary',
                          boxShadow: 1,
                          '& .MuiTooltip-arrow': {
                            color: 'background.paper',
                          },
                        },
                      },
                    }}
                  >
                    <ListItem divider>
                      <ListItemText
                        primary={answerValue}
                        secondary={`Répondant: ${answer.respondent.userId.username}`}
                      />
                    </ListItem>
                  </MuiTooltip>
                );
              })}
            </List>
          ) : (
            <Box sx={{ height: '500px', width: '100%', p: 2 }}>
              <ChartView 
                data={(() => {
                  const answerCounts: { [key: string]: number } = {};
                  const filteredAnswers = filterAnswers(selectedQuestion.answers);
                  filteredAnswers.forEach(answer => {
                    const questionAnswer = answer.answers.find(
                      a => a.questionId === selectedQuestion.questionId
                    );
                    if (questionAnswer?.answer) {
                      const value = questionAnswer.answer.toString();
                      answerCounts[value] = (answerCounts[value] || 0) + 1;
                    }
                  });
                  return answerCounts;
                })()}
                question={selectedSurvey.questions.find(
                  q => q.id === selectedQuestion.questionId
                ) ?? { 
                  id: 'default',
                  text: 'Question non trouvée',
                  type: 'text'
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          px: 3 
        }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<TableViewIcon />}
              onClick={exportCSV}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<CodeIcon />}
              onClick={exportJSON}
            >
              Export JSON
            </Button>
          </Box>
          <Button onClick={handleClose}>
            Fermer
          </Button>
        </DialogActions>
      </>
    );
  }, [selectedSurvey, selectedQuestion, currentView, filters]);

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (selectedSurvey) {
    return (
      <Box sx={{ p: 4 }}>
        <Button 
          onClick={handleBack}
          variant="outlined"
          sx={{ mb: 3 }}
        >
          Back to Surveys List
        </Button>

        <Typography variant="h4" sx={{ mb: 3 }}>{selectedSurvey.title}</Typography>
        <Typography variant="subtitle1" sx={{ mb: 4 }}>
          Total Responses: {surveyAnswers[selectedSurvey._id]?.length || 0}
        </Typography>

        {selectedSurvey?.demographicEnabled && (
          <FilterPanel />
        )}

        {selectedSurvey.questions.map((question, index) => {
          const stats = calculateQuestionStats(selectedSurvey._id, question.id);
          
          return (
            <Paper key={question.id} sx={{ mb: 3, p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6">
                    Question {index + 1}: {question.text}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                    Type: {question.type}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<BarChartIcon />}
                  onClick={() => handleQuestionClick(question.id)}
                  disabled={stats.total === 0}
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

        <Dialog 
          open={dialogOpen}
          onClose={handleClose}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              minHeight: '600px',
              maxHeight: '90vh',
              width: '90%',
              margin: '10px'
            }
          }}
        >
          {selectedQuestion && selectedSurvey && (
            <>
              <DialogTitle>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="h6">
                    {selectedSurvey.questions.find(q => q.id === selectedQuestion.questionId)?.text}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      {selectedQuestion.answers.length} réponse(s)
                    </Typography>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                      <Tabs 
                        value={currentView} 
                        onChange={(_, newValue) => handleViewChange(newValue as 'list' | 'chart')}
                      >
                        <Tab 
                          icon={<VisibilityIcon />} 
                          label="Liste" 
                          value="list"
                        />
                        <Tab 
                          icon={<BarChartIcon />} 
                          label="Graphique" 
                          value="chart"
                        />
                      </Tabs>
                    </Box>
                  </Box>
                </Box>
              </DialogTitle>
              <DialogContent dividers>
                {currentView === 'list' ? (
                  <List>
                    {selectedQuestion.answers.map((answer, index) => {
                      const questionAnswer = answer.answers.find(
                        a => a.questionId === selectedQuestion.questionId
                      );
                      const answerValue = questionAnswer?.answer?.toString() || 'Sans réponse';
                      
                      const tooltipContent = (
                        <Paper sx={{ p: 1.5, maxWidth: 300 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            <strong>Email:</strong> {answer.respondent.userId.email}
                          </Typography>
                          {answer.respondent.demographic && (
                            <>
                              <Typography variant="subtitle2" gutterBottom>
                                <strong>Genre:</strong> {answer.respondent.demographic.gender || 'Non spécifié'}
                              </Typography>
                              <Typography variant="subtitle2" gutterBottom>
                                <strong>Date de naissance:</strong> {
                                  answer.respondent.demographic.dateOfBirth 
                                    ? new Date(answer.respondent.demographic.dateOfBirth).toLocaleDateString()
                                    : 'Non spécifié'
                                }
                              </Typography>
                              <Typography variant="subtitle2" gutterBottom>
                                <strong>Niveau d'éducation:</strong> {
                                  answer.respondent.demographic.educationLevel || 'Non spécifié'
                                }
                              </Typography>
                              <Typography variant="subtitle2">
                                <strong>Ville:</strong> {answer.respondent.demographic.city || 'Non spécifié'}
                              </Typography>
                            </>
                          )}
                        </Paper>
                      );

                      return (
                        <MuiTooltip 
                          key={index}
                          title={tooltipContent}
                          placement="right-start"
                          arrow
                          followCursor
                          PopperProps={{
                            sx: {
                              '& .MuiTooltip-tooltip': {
                                bgcolor: 'background.paper',
                                color: 'text.primary',
                                boxShadow: 1,
                                '& .MuiTooltip-arrow': {
                                  color: 'background.paper',
                                },
                              },
                            },
                          }}
                        >
                          <ListItem divider>
                            <ListItemText
                              primary={answerValue}
                              secondary={`Répondant: ${answer.respondent.userId.username}`}
                            />
                          </ListItem>
                        </MuiTooltip>
                      );
                    })}
                  </List>
                ) : (
                  <Box sx={{ height: '500px', width: '100%', p: 2 }}>
                    <ChartView 
                      data={(() => {
                        const answerCounts: { [key: string]: number } = {};
                        const filteredAnswers = filterAnswers(selectedQuestion.answers);
                        filteredAnswers.forEach(answer => {
                          const questionAnswer = answer.answers.find(
                            a => a.questionId === selectedQuestion.questionId
                          );
                          if (questionAnswer?.answer) {
                            const value = questionAnswer.answer.toString();
                            answerCounts[value] = (answerCounts[value] || 0) + 1;
                          }
                        });
                        return answerCounts;
                      })()}
                      question={selectedSurvey.questions.find(
                        q => q.id === selectedQuestion.questionId
                      ) ?? { 
                        id: 'default',
                        text: 'Question non trouvée',
                        type: 'text'
                      }}
                    />
                  </Box>
                )}
              </DialogContent>
              <DialogActions sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                px: 3 
              }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<TableViewIcon />}
                    onClick={exportCSV}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CodeIcon />}
                    onClick={exportJSON}
                  >
                    Export JSON
                  </Button>
                </Box>
                <Button onClick={handleClose}>
                  Fermer
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {selectedSurvey?.demographicEnabled && (
          <>
            {/* Première Box pour les boutons */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mt: 2, 
              mb: 2 
            }}>
              <Button
                variant="outlined"
                onClick={() => setShowDemographic(!showDemographic)}
                startIcon={showDemographic ? <VisibilityOffIcon /> : <VisibilityIcon />}
              >
                {showDemographic ? 'Masquer les statistiques démographiques' : 'Afficher les statistiques démographiques'}
              </Button>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<TableViewIcon />}
                  onClick={() => {
                    // Préparer toutes les réponses avec les données démographiques
                    const allData = surveyAnswers[selectedSurvey._id]?.map(answer => ({
                      respondent: {
                        username: answer.respondent.userId.username,
                        email: answer.respondent.userId.email,
                        demographic: answer.respondent.demographic || {},
                      },
                      answers: selectedSurvey.questions.map(question => {
                        const questionAnswer = answer.answers.find(a => a.questionId === question.id);
                        return {
                          question: question.text,
                          answer: questionAnswer?.answer || 'Non répondu'
                        };
                      }),
                      submittedAt: answer.submittedAt
                    }));

                    // Export CSV
                    const blob = new Blob([JSON.stringify(allData)], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `survey_responses_complete_${selectedSurvey._id}.csv`;
                    link.click();
                  }}
                >
                  Export CSV Complet
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CodeIcon />}
                  onClick={() => {
                    // Même données mais en JSON
                    const allData = surveyAnswers[selectedSurvey._id]?.map(answer => ({
                      respondent: {
                        username: answer.respondent.userId.username,
                        email: answer.respondent.userId.email,
                        demographic: answer.respondent.demographic || {},
                      },
                      answers: selectedSurvey.questions.map(question => {
                        const questionAnswer = answer.answers.find(a => a.questionId === question.id);
                        return {
                          question: question.text,
                          answer: questionAnswer?.answer || 'Non répondu'
                        };
                      }),
                      submittedAt: answer.submittedAt
                    }));

                    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `survey_responses_complete_${selectedSurvey._id}.json`;
                    link.click();
                  }}
                >
                  Export JSON Complet
                </Button>
              </Box>
            </Box>

            {/* Deuxième Box pour les graphiques statistiques */}
            {showDemographic && (
              <Box sx={{ mt: 3, mb: 4 }}>
                {renderDemographicStats()}
              </Box>
            )}
          </>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>My Surveys</Typography>

      <Grid container spacing={3}>
        {surveys.map((survey) => (
          <Grid item xs={12} sm={6} md={4} key={survey._id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {survey.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Created: {new Date(survey.createdAt).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Responses: {surveyAnswers[survey._id]?.length || 0}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  startIcon={<VisibilityIcon />}
                  onClick={() => handleViewResults(survey)}
                  variant="contained"
                  fullWidth
                >
                  View Results
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {surveys.length === 0 && (
        <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
          No surveys created yet.
        </Typography>
      )}
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
