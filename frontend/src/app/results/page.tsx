"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Slider
} from '@mui/material';
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
  LineElement
);

type ChartType = 
  | 'bar' 
  | 'line' 
  | 'scatter' 
  | 'bubble' 
  | 'pie' 
  | 'doughnut' 
  | 'radar';

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

  const exportResponses = (format: 'csv' | 'json', questionId: string) => {
    if (!selectedSurvey) return;

    const question = selectedSurvey.questions.find(q => q.id === questionId);
    if (!question) return;

    const answers = surveyAnswers[selectedSurvey._id] || [];
    const data = answers.map(answer => {
      const questionAnswer = answer.answers.find(a => a.questionId === questionId);
      return {
        respondent: answer.respondent?.userId?.username || 'Anonymous',
        answer: questionAnswer?.answer || '',
        submittedAt: answer.submittedAt
      };
    });

    if (format === 'csv') {
      const csvContent = [
        ['Respondent', 'Answer', 'Submitted At'],
        ...data.map(item => [
          item.respondent,
          item.answer.toString(),
          new Date(item.submittedAt).toLocaleString()
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `question_${questionId}_responses.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `question_${questionId}_responses.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const renderQuestionDetails = useCallback((questionId: string) => {
    if (!selectedSurvey || !selectedQuestion) return null;

    const question = selectedSurvey.questions.find(q => q.id === questionId);
    if (!question) return null;

    // Préparer les données pour les graphiques
    const answerCounts: { [key: string]: number } = {};
    selectedQuestion.answers.forEach(answer => {
      const questionAnswer = answer.answers.find(a => a.questionId === questionId);
      if (questionAnswer) {
        const value = String(questionAnswer.answer || 'Sans réponse');
        answerCounts[value] = (answerCounts[value] || 0) + 1;
      }
    });

    // Définir les données du graphique
    const chartData = {
      labels: Object.keys(answerCounts),
      datasets: [{
        label: 'Réponses',
        data: Object.values(answerCounts),
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

    // Définir les options du graphique
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: question.text
        }
      }
    };

    console.log('chartType:', chartType);
    console.log('currentView:', dialogViews[selectedQuestion.questionId]);
    console.log('chartData:', chartData);

    const currentView = dialogViews[selectedQuestion.questionId] || 'list';

    return (
      <>
        <DialogTitle>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">
              {question.text}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" color="textSecondary">
                {selectedQuestion.answers.length} réponse(s)
              </Typography>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={currentView} 
                  onChange={(_, newValue) => setDialogViews(prev => ({
                    ...prev,
                    [selectedQuestion.questionId]: newValue
                  }))}
                >
                  <Tab 
                    icon={<VisibilityIcon />} 
                    label="Liste" 
                    value="list"
                  />
                  {question.type !== 'text' && (
                    <Tab 
                      icon={<BarChartIcon />} 
                      label="Graphique" 
                      value="chart"
                    />
                  )}
                </Tabs>
              </Box>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            {currentView === 'list' ? (
              <List>
                {selectedQuestion.answers.map((answer, index) => {
                  const questionAnswer = answer.answers.find(a => a.questionId === questionId);
                  return (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={questionAnswer?.answer || 'Sans réponse'}
                        secondary={`Répondant: ${answer.respondent.userId.username}`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <Box sx={{ 
                height: '400px', 
                width: '100%', 
                position: 'relative', 
                p: 2,
                border: '1px solid #ddd',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Box sx={{ 
                  flex: 1,
                  minHeight: '300px',
                  width: '100%',
                  position: 'relative'
                }}>
                  {chartType === 'bar' && (
                    <Bar 
                      data={chartData} 
                      options={chartOptions}
                    />
                  )}
                  {chartType === 'pie' && (
                    <Pie 
                      data={chartData} 
                      options={chartOptions}
                    />
                  )}
                  {chartType === 'line' && (
                    <Line 
                      data={chartData} 
                      options={chartOptions}
                    />
                  )}
                  {chartType === 'doughnut' && (
                    <Doughnut 
                      data={chartData} 
                      options={chartOptions}
                    />
                  )}
                </Box>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Button
                    startIcon={<BarChartIcon />}
                    onClick={() => setChartType('bar')}
                    variant={chartType === 'bar' ? 'contained' : 'outlined'}
                  >
                    Barres
                  </Button>
                  <Button
                    startIcon={<PieChartIcon />}
                    onClick={() => setChartType('pie')}
                    variant={chartType === 'pie' ? 'contained' : 'outlined'}
                  >
                    Camembert
                  </Button>
                  <Button
                    startIcon={<ShowChartIcon />}
                    onClick={() => setChartType('line')}
                    variant={chartType === 'line' ? 'contained' : 'outlined'}
                  >
                    Ligne
                  </Button>
                  <Button
                    startIcon={<DonutLargeIcon />}
                    onClick={() => setChartType('doughnut')}
                    variant={chartType === 'doughnut' ? 'contained' : 'outlined'}
                  >
                    Anneau
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
      </>
    );
  }, [selectedSurvey, selectedQuestion, dialogViews, chartType]);

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
          TransitionProps={{
            onExited: () => setSelectedQuestion(null)
          }}
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
                Question Details
                <>
                  {selectedQuestion.questionId && (
                    <Box sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}>
                      <Tabs
                        value={dialogViews[selectedQuestion.questionId] || 'list'}
                        onChange={(_, newValue) => handleDialogViewChange(selectedQuestion.questionId, newValue)}
                      >
                        <Tab label="List View" value="list" />
                        <Tab label="Chart View" value="chart" />
                      </Tabs>
                    </Box>
                  )}
                </>
              </DialogTitle>
              <DialogContent dividers>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={() => exportResponses('csv', selectedQuestion.questionId)}
                        size="small"
                      >
                        Export CSV
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={() => exportResponses('json', selectedQuestion.questionId)}
                        size="small"
                      >
                        Export JSON
                      </Button>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 3, mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {selectedQuestion.questionId && selectedSurvey.questions.find(
                        q => q.id === selectedQuestion.questionId
                      )?.text}
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total des réponses: {selectedQuestion.answers?.length || 0}
                    </Typography>
                  </Box>

                  <List>
                    {selectedQuestion.answers?.map((answer, index) => (
                      <ListItem 
                        key={index}
                        sx={{ 
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          backgroundColor: index % 2 === 0 ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                          borderRadius: 1,
                          mb: 1,
                          p: 2
                        }}
                      >
                        <Box sx={{ 
                          display: 'flex',
                          width: '100%',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1
                        }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                            {answer?.respondent?.userId?.username || 'Anonymous'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {answer?.submittedAt ? new Date(answer.submittedAt).toLocaleString() : ''}
                          </Typography>
                        </Box>
                        <Typography variant="body1">
                          {answer?.answers?.find(a => a.questionId === selectedQuestion.questionId)?.answer?.toString() || ''}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleClose}
                    size="small"
                  >
                    Close
                  </Button>
                </Box>
              </DialogContent>
            </>
          )}
        </Dialog>

        {selectedSurvey?.demographicEnabled && (
          <>
            <Button
              variant="outlined"
              onClick={() => setShowDemographic(!showDemographic)}
              sx={{ mt: 2, mb: 2 }}
              startIcon={showDemographic ? <VisibilityOffIcon /> : <VisibilityIcon />}
            >
              {showDemographic ? 'Hide Demographic Stats' : 'Show Demographic Stats'}
            </Button>
            
            {showDemographic && (
              <>
                {renderDemographicStats()}
                {renderIndividualResponses()}
              </>
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
