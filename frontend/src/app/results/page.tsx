"use client";

import React, { useEffect, useState, useCallback, useRef, memo, useMemo } from 'react';
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
  Grow,
  LinearProgress,
  Tooltip as MuiTooltip,
  TooltipProps,
  DialogContentText
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BarChartIcon from '@mui/icons-material/BarChart';
import { fetchSurveys, getSurveyAnswers, fetchPendingShares, BASE_URL } from '@/utils/surveyService';
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
  ChartOptions,
  RadialLinearScale
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
import CloseIcon from '@mui/icons-material/Close';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers';
import type { DatePickerProps } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TextFieldProps } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { ReactElement } from 'react';
import ShareIcon from '@mui/icons-material/Share';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { respondToSurveyShare } from '@/utils/surveyShareService';
import EmailIcon from '@mui/icons-material/Email';
import { colors } from '../../theme/colors';
import { useAuth } from '@/utils/AuthContext';
import { forwardRef } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  ArcElement,
  BarElement
);

type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'scatter';

interface Answer {
  questionId: string;
  answer: string;
}

interface SurveyAnswer {
  _id: string;
  surveyId: string;  // Ajout de surveyId
  answers: Answer[];
  submittedAt: string;
  respondent: {
    userId: {
      _id: string;
      username: string;
      email: string;
    };
    demographic?: Demographic;
  };
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
  description?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  questions: Question[];
  createdAt: string;
  demographicEnabled: boolean;
  sharedBy?: string;
  isRemoving?: boolean;  // Ajout de cette propriété
  userId: string; // Ajout de cette propriété
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

// Ajouter cette fonction avant le composant ChartView
const getQuestionData = (questionId: string, answers: SurveyAnswer[]): { [key: string]: number } => {
  const data: { [key: string]: number } = {};
  
  answers.forEach(answer => {
    const questionAnswer = answer.answers.find(a => a.questionId === questionId);
    if (questionAnswer && questionAnswer.answer != null) {
      const value = questionAnswer.answer.toString();
      data[value] = (data[value] || 0) + 1;
    }
  });

  return data;
};

// Ajoutez ces interfaces au début du fichier
interface QuestionAnswer {
  questionId: string;
  answer: string;
}

interface Demographic {
  gender?: string;
  dateOfBirth?: string;
  educationLevel?: string;
  city?: string;
}

interface SurveyAnswer {
  _id: string;
  surveyId: string;  // Ajout de surveyId
  answers: QuestionAnswer[];
  submittedAt: string;
  respondent: {
    userId: {
      _id: string;
      username: string;
      email: string;
    };
    demographic?: Demographic;
  };
}

// Définir toutes les interfaces au début du fichier
interface DemographicFilterPanelProps {
  open: boolean;
  onClose: () => void;
  id?: string;
  'data-testid'?: string;
}

interface AnswerTooltipProps {
  answer: SurveyAnswer;
  questionAnswer: Answer | undefined;
  id?: string;
  'data-testid'?: string;
}

interface ChartViewProps {
  data: any;
  question: Partial<Question> & { text: string; type: string; };
  id?: string;
  'data-testid'?: string;
}

interface CustomDatePickerProps {
  id?: string;
  'data-testid'?: string;
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
}

// Modifier l'interface CustomDatePickerProps
interface CustomDatePickerProps {
  id?: string;
  'data-testid'?: string;
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
}

// Modifier le composant CustomDatePicker
const CustomDatePicker = forwardRef<HTMLDivElement, CustomDatePickerProps>(
  ({ id, 'data-testid': dataTestId, label, value, onChange, minDate, ...props }, ref) => {
    return (
      <DatePicker<Date>
        {...props}
        ref={ref}
        label={label}
        value={value}
        onChange={onChange}
        minDate={minDate}
        renderInput={(params) => (
          <TextField
            {...params}
            id={id}
            data-testid={dataTestId}
            size="small"
          />
        )}
      />
    );
  }
);

CustomDatePicker.displayName = 'CustomDatePicker';

const AnswerTooltip = memo<AnswerTooltipProps>(({ 
  answer, 
  questionAnswer, 
  id, 
  'data-testid': dataTestId 
}) => {
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const handleMouseMove = (event: React.MouseEvent) => {
    setTooltipPosition({
      x: event.clientX + 10,
      y: event.clientY + 10
    });
  };

  // Fonction sécurisée pour calculer l'âge
  const getAge = (dateOfBirth: string | undefined): string => {
    if (!dateOfBirth) return 'N/A';
    try {
      return calculateAge(new Date(dateOfBirth)).toString();
    } catch (error) {
      console.error('Error calculating age:', error);
      return 'N/A';
    }
  };

  return (
    <ListItem
      id={id}
      data-testid={dataTestId}
      onMouseEnter={() => setIsTooltipOpen(true)}
      onMouseLeave={() => setIsTooltipOpen(false)}
      onMouseMove={handleMouseMove}
      sx={{
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'rgba(102, 126, 234, 0.05)',
        },
        position: 'relative',
        borderRadius: 1,
        mb: 1
      }}
    >
      <ListItemText
        id={`answer-text-${answer._id}`}
        data-testid={`answer-text-${answer._id}`}
        primary={questionAnswer?.answer || 'No answer'}
        secondary={new Date(answer.submittedAt).toLocaleString()}
      />
      {isTooltipOpen && (
        <Box
          id={`tooltip-content-${answer._id}`}
          data-testid={`tooltip-content-${answer._id}`}
          sx={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 9999,
            backgroundColor: 'white',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            borderRadius: 2,
            p: 2,
            maxWidth: 300,
            border: '1px solid rgba(102, 126, 234, 0.2)',
            animation: 'fadeIn 0.2s ease-in-out',
            '@keyframes fadeIn': {
              from: {
                opacity: 0,
                transform: 'translateY(5px)'
              },
              to: {
                opacity: 1,
                transform: 'translateY(0)'
              }
            }
          }}
        >
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Respondent Details
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Username:</strong> {answer.respondent.userId.username}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Email:</strong> {answer.respondent.userId.email}
          </Typography>
          {answer.respondent.demographic && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Demographics
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Gender:</strong> {answer.respondent.demographic.gender || 'N/A'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Age:</strong> {getAge(answer.respondent.demographic.dateOfBirth)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Education:</strong> {answer.respondent.demographic.educationLevel || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>City:</strong> {answer.respondent.demographic.city || 'N/A'}
              </Typography>
            </>
          )}
        </Box>
      )}
    </ListItem>
  );
});

// Créer un nouveau composant pour le graphique
const ChartView = memo<ChartViewProps>(({ 
  data, 
  question, 
  id, 
  'data-testid': dataTestId 
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
    <Box
      id={id}
      data-testid={dataTestId}
      sx={{ 
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
              id={`chart-type-button-${type}`}
              data-testid={`chart-type-button-${type}`}
              key={type}
              onClick={() => setChartType(type)}
              variant={chartType === type ? 'contained' : 'outlined'}
              sx={{
                ...(chartType === type ? {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderColor: 'transparent',
                  px: 3
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

// Ajouter l'interface pour le paramètre de la fonction de comparaison
interface ComparisonValue {
  value: string | number;
  operator: string;
}

// Ajouter l'interface pour le type de réponse
interface AnswerValue {
  questionId: string;
  answer: string | number | null;
}

const ResultsPage: React.FC = () => {
  // Déplacer la déclaration de showPendingOnly au début avec les autres états
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionDetails | null>(null);
  const [filteredResults, setFilteredResults] = useState<Survey[]>([]);
  const [dialogView, setDialogView] = useState<'list' | 'chart'>('list');
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line' | 'doughnut'>('bar');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
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

  // Ajouter après les interfaces existantes
  interface AnswerFilter {
    questionId: string;
    rules: FilterRule[];
  }

  // Modifiez l'interface FilterRule pour inclure les types corrects
  interface FilterRule {
    operator: string;
    value: string | number | null;
    secondValue?: string | number | null;
  }

  interface FilterValue {
    single: string | number | null;
    range?: [number, number]; // Utiliser un type séparé pour les plages de valeurs
  }

  interface QuestionFilter {
    questionId: string;
    rules: FilterRule[];
  }

  interface AnswerFilters {
    [questionId: string]: AnswerFilter;
  }

  // Ajouter dans le composant principal
  const [showAnswerFilters, setShowAnswerFilters] = useState(false);
  const [answerFilters, setAnswerFilters] = useState<AnswerFilters>({});
  const [filteredByAnswers, setFilteredByAnswers] = useState<boolean>(false);

  // Dans le composant ResultsPage, ajouter l'état configOpen
  const [configOpen, setConfigOpen] = useState<boolean>(false);

  // Ajouter un état pour stocker les réponses filtrées
  const [filteredAnswers, setFilteredAnswers] = useState<Record<string, SurveyAnswer[]>>({});
  // Ajouter la fonction pour obtenir les opérateurs selon le type de question
  const getOperatorsByType = (questionType: string): string[] => {
    const commonOperators = ['equals', 'not'];
    
    switch (questionType) {
      case 'rating':
      case 'slider':
        return [...commonOperators, 'greater', 'less', 'between'];
      case 'text':
        return [...commonOperators, 'contains', 'not_contains'];
      case 'multiple-choice':
      case 'dropdown':
      case 'yes-no':
        return commonOperators;
      case 'date':
        return [...commonOperators, 'before', 'after', 'between'];
      default:
        return commonOperators;
    }
  };

  // Modifiez la fonction evaluateRule pour gérer explicitement les types
  const evaluateRule = (value: any, rule: FilterRule): boolean => {
    // Si la valeur est undefined, on la convertit en null pour la comparaison
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

  // Modifier l'interface AnswerFilterPanel pour inclure les props nécessaires
  interface AnswerFilterPanelProps {
    open: boolean;
    onClose: () => void;
    selectedSurvey: Survey;
    answerFilters: AnswerFilters;
    setAnswerFilters: React.Dispatch<React.SetStateAction<AnswerFilters>>;
    id?: string;
    'data-testid'?: string;
  }

  // Modifier la déclaration du composant pour inclure les props
  const AnswerFilterPanel: React.FC<AnswerFilterPanelProps> = ({
    open,
    onClose,
    selectedSurvey,
    answerFilters,
    setAnswerFilters,
    id,
    'data-testid': dataTestId
  }) => {
    const [tempFilters, setTempFilters] = useState<AnswerFilters>(answerFilters);

    // Définir removeRule à l'intérieur du composant
    const removeRule = useCallback((questionId: string, ruleIndex: number) => {
      setTempFilters(prev => {
        const newFilters = { ...prev };
        if (newFilters[questionId]) {
          const updatedRules = newFilters[questionId].rules.filter((_, index) => index !== ruleIndex);
          if (updatedRules.length === 0) {
            delete newFilters[questionId];
          } else {
            newFilters[questionId] = {
              ...newFilters[questionId],
              rules: updatedRules
            };
          }
        }
        return newFilters;
      });
    }, []);

    const addRuleToQuestion = (questionId: string) => {
      const question = selectedSurvey?.questions.find(q => q.id === questionId);
      const defaultOperator = question ? getOperatorsByType(question.type)[0] : 'equals';
      
      setTempFilters((prev: AnswerFilters) => ({
        ...prev,
        [questionId]: {
          questionId,
          rules: [...(prev[questionId]?.rules || []), { 
            operator: defaultOperator, // Utilisation de l'opérateur par défaut
            value: null 
          }]
        }
      }));
    };

    const applyAnswerFilters = useCallback(() => {
      if (!selectedSurvey || Object.keys(tempFilters).length === 0) {
        setFilteredByAnswers(false);
        return;
      }

      const answers = surveyAnswers[selectedSurvey._id] || [];
      const filteredAnswers = answers.filter(answer => {
        return Object.values(tempFilters).every((filter: QuestionFilter) => {
          const answerValue = answer.answers.find(a => a.questionId === filter.questionId)?.answer;
          
          return filter.rules.every((rule: FilterRule) => {
            switch (rule.operator) {
              case 'equals':
                return answerValue === rule.value;
              case 'not':
                return answerValue !== rule.value;
              case 'greater':
                return evaluateRule(answerValue, rule);
              case 'less':
                return evaluateRule(answerValue, rule);
              case 'between':
                return evaluateRule(answerValue, rule);
              case 'contains':
                return evaluateRule(answerValue, rule);
              case 'not_contains':
                return evaluateRule(answerValue, rule);
              default:
                return true;
            }
          });
        });
      });

      setFilteredByAnswers(true);
      const newStats = calculateDemographicStats(selectedSurvey._id, filteredAnswers);
      setFilteredStats(newStats);
    }, [selectedSurvey, tempFilters, surveyAnswers]);

    return (
      <Dialog
        id={`answer-filter-dialog-${id}`}
        data-testid={`answer-filter-dialog-${id}`}
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2.5
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Configure Answer Filters
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <ClearIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {selectedSurvey?.questions.map(question => (
              <Grid item xs={12} key={question.id}>
                <Box sx={{ 
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: 'rgba(102, 126, 234, 0.02)',
                  border: '1px solid rgba(102, 126, 234, 0.08)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(102, 126, 234, 0.04)',
                    borderColor: 'rgba(102, 126, 234, 0.15)'
                  }
                }}>
                  <Typography variant="subtitle1" sx={{ 
                    color: '#4a5568', 
                    fontWeight: 600,
                    mb: 2 
                  }}>
                    {question.text}
                  </Typography>
                  
                  {/* Règles existantes */}
                  {tempFilters[question.id]?.rules.map((rule, ruleIndex) => (
                    <Box key={ruleIndex} sx={{ 
                      mb: 2,
                      p: 2,
                      backgroundColor: 'rgba(102, 126, 234, 0.04)',
                      borderRadius: 2,
                      border: '1px solid rgba(102, 126, 234, 0.1)'
                    }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={3}>
                          <FormControl
                            id={`answer-filter-operator-${question.id}-${ruleIndex}`}
                            data-testid={`answer-filter-operator-${question.id}-${ruleIndex}`}
                            fullWidth
                            size="small"
                          >
                            <InputLabel>Operator</InputLabel>
                            <Select
                              value={rule.operator}
                              onChange={(e) => {
                                setTempFilters(prev => ({
                                  ...prev,
                                  [question.id]: {
                                    ...prev[question.id],
                                    rules: prev[question.id].rules.map((r, idx) =>
                                      idx === ruleIndex ? { ...r, operator: e.target.value } : r
                                    )
                                  }
                                }));
                              }}
                            >
                              {getOperatorsByType(question.type).map(op => (
                                <MenuItem key={op} value={op}>
                                  {op.split('_').map(word => 
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                  ).join(' ')}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid item xs={8}>
                          {/* Champs de valeur selon le type de question et l'opérateur */}
                          {rule.operator === 'between' ? (
                            <Stack direction="row" spacing={2} alignItems="center">
                              {question.type === 'rating' && (
                                <>
                                  <Rating
                                    value={Number(rule.value || 0)}
                                    onChange={(_, newValue) => {
                                      setTempFilters(prev => ({
                                        ...prev,
                                        [question.id]: {
                                          questionId: question.id,
                                          rules: prev[question.id].rules.map((r, idx) =>
                                            idx === ruleIndex ? { ...r, value: newValue } : r
                                          )
                                        }
                                      }));
                                    }}
                                  />
                                  <Typography>et</Typography>
                                  <Rating
                                    value={Number(rule.secondValue || 0)}
                                    onChange={(_, newValue) => {
                                      setTempFilters(prev => ({
                                        ...prev,
                                        [question.id]: {
                                          questionId: question.id,
                                          rules: prev[question.id].rules.map((r, idx) =>
                                            idx === ruleIndex ? { ...r, secondValue: newValue } : r
                                          )
                                        }
                                      }));
                                    }}
                                  />
                                </>
                              )}

                              {question.type === 'slider' && (
                                <>
                                  <TextField
                                    id={`answer-filter-value-${question.id}-${ruleIndex}`}
                                    data-testid={`answer-filter-value-${question.id}-${ruleIndex}`}
                                    type="number"
                                    size="small"
                                    value={rule.value || ''}
                                    onChange={(e) => {
                                      setTempFilters(prev => ({
                                        ...prev,
                                        [question.id]: {
                                          questionId: question.id,
                                          rules: prev[question.id].rules.map((r, idx) =>
                                            idx === ruleIndex ? { ...r, value: Number(e.target.value) || null } : r
                                          )
                                        }
                                      }));
                                    }}
                                    InputProps={{ inputProps: { min: 0, max: 100 } }}
                                  />
                                  <Typography>et</Typography>
                                  <TextField
                                    id={`answer-filter-value-${question.id}-${ruleIndex}`}
                                    data-testid={`answer-filter-value-${question.id}-${ruleIndex}`}
                                    type="number"
                                    size="small"
                                    value={rule.secondValue || ''}
                                    onChange={(e) => {
                                      setTempFilters(prev => ({
                                        ...prev,
                                        [question.id]: {
                                          questionId: question.id,
                                          rules: prev[question.id].rules.map((r, idx) =>
                                            idx === ruleIndex ? { ...r, secondValue: Number(e.target.value) || null } : r
                                          )
                                        }
                                      }));
                                    }}
                                    InputProps={{ inputProps: { min: 0, max: 100 } }}
                                  />
                                </>
                              )}

                              {question.type === 'date' && (
                                <>
                                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                                    <DatePicker
                                      value={rule.value ? new Date(rule.value.toString()) : null}
                                      onChange={(newValue) => {
                                        setTempFilters(prev => ({
                                          ...prev,
                                          [question.id]: {
                                            questionId: question.id,
                                            rules: prev[question.id].rules.map((r, idx) =>
                                              idx === ruleIndex ? { ...r, value: newValue?.toISOString() || null } : r
                                            )
                                          }
                                        }));
                                      }}
                                      renderInput={(params) => (
                                        <TextField {...params} size="small" />
                                      )}
                                    />
                                    <Typography sx={{ mx: 1 }}>et</Typography>
                                    <DatePicker
                                      value={rule.secondValue ? new Date(rule.secondValue.toString()) : null}
                                      onChange={(newValue) => {
                                        setTempFilters(prev => ({
                                          ...prev,
                                          [question.id]: {
                                            questionId: question.id,
                                            rules: prev[question.id].rules.map((r, idx) =>
                                              idx === ruleIndex ? { ...r, secondValue: newValue?.toISOString() || null } : r
                                            )
                                          }
                                        }));
                                      }}
                                      renderInput={(params) => (
                                        <TextField {...params} size="small" />
                                      )}
                                    />
                                  </LocalizationProvider>
                                </>
                              )}
                            </Stack>
                          ) : (
                            // Code existant pour les autres opérateurs
                            <>
                              {question.type === 'rating' && (
                                <Rating
                                  value={Number(rule.value || 0)}
                                  onChange={(_, newValue) => {
                                    setTempFilters(prev => ({
                                      ...prev,
                                      [question.id]: {
                                        questionId: question.id,
                                        rules: prev[question.id].rules.map((r, idx) =>
                                          idx === ruleIndex ? { ...r, value: newValue } : r
                                        )
                                      }
                                    }));
                                  }}
                                />
                              )}

                              {question.type === 'slider' && (
                                <Slider
                                  value={typeof rule.value === 'number' ? rule.value : 0}
                                  min={0}
                                  max={100}
                                  valueLabelDisplay="auto"
                                  onChange={(event: Event, newValue: number | number[]) => {
                                    setTempFilters(prev => ({
                                      ...prev,
                                      [question.id]: {
                                        questionId: question.id,
                                        rules: prev[question.id].rules.map((r, idx) =>
                                          idx === ruleIndex ? { 
                                            ...r, 
                                            value: typeof newValue === 'number' ? newValue : null 
                                          } : r
                                        )
                                      }
                                    }));
                                  }}
                                />
                              )}

                              {(question.type === 'text' || question.type === 'open-ended') && (
                                <TextField
                                  id={`answer-filter-value-${question.id}-${ruleIndex}`}
                                  data-testid={`answer-filter-value-${question.id}-${ruleIndex}`}
                                  fullWidth
                                  size="small"
                                  value={rule.value?.toString() || ''}
                                  onChange={(e) => {
                                    setTempFilters(prev => ({
                                      ...prev,
                                      [question.id]: {
                                        questionId: question.id,
                                        rules: prev[question.id].rules.map((r, idx) =>
                                          idx === ruleIndex ? { 
                                            ...r, 
                                            value: e.target.value || null 
                                          } : r
                                        )
                                      }
                                    }));
                                  }}
                                />
                              )}

                              {(question.type === 'multiple-choice' || question.type === 'dropdown') && (
                                <FormControl
                                  id={`answer-filter-value-${question.id}-${ruleIndex}`}
                                  data-testid={`answer-filter-value-${question.id}-${ruleIndex}`}
                                  fullWidth
                                  size="small"
                                >
                                  <Select
                                    value={rule.value || ''}
                                    onChange={(e) => {
                                      setTempFilters(prev => ({
                                        ...prev,
                                        [question.id]: {
                                          ...prev[question.id],
                                          rules: prev[question.id].rules.map((r, idx) =>
                                            idx === ruleIndex ? { ...r, value: e.target.value } : r
                                          )
                                        }
                                      }));
                                    }}
                                  >
                                    {question.options?.map((option: string) => (
                                      <MenuItem key={option} value={option}>
                                        {option}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              )}

                              {question.type === 'yes-no' && (
                                <FormControl
                                  id={`answer-filter-value-${question.id}-${ruleIndex}`}
                                  data-testid={`answer-filter-value-${question.id}-${ruleIndex}`}
                                  fullWidth
                                  size="small"
                                >
                                  <Select
                                    value={rule.value || ''}
                                    onChange={(e) => {
                                      setTempFilters(prev => ({
                                        ...prev,
                                        [question.id]: {
                                          ...prev[question.id],
                                          rules: prev[question.id].rules.map((r, idx) =>
                                            idx === ruleIndex ? { ...r, value: e.target.value } : r
                                          )
                                        }
                                      }));
                                    }}
                                  >
                                    <MenuItem value="yes">Yes</MenuItem>
                                    <MenuItem value="no">No</MenuItem>
                                  </Select>
                                </FormControl>
                              )}

                              {question.type === 'date' && (
                                <LocalizationProvider dateAdapter={AdapterDateFns}>
                                  <DatePicker
                                    value={rule.value ? new Date(rule.value.toString()) : null}
                                    onChange={(newValue) => {
                                      setTempFilters(prev => ({
                                        ...prev,
                                        [question.id]: {
                                          questionId: question.id,
                                          rules: prev[question.id].rules.map((r, idx) =>
                                            idx === ruleIndex ? { 
                                              ...r, 
                                              value: newValue ? newValue.toISOString() : null 
                                            } : r
                                          )
                                        }
                                      }));
                                    }}
                                    renderInput={(params) => (
                                      <TextField {...params} size="small" fullWidth />
                                    )}
                                  />
                                </LocalizationProvider>
                              )}

                              {question.type === 'color-picker' && (
                                <TextField
                                  id={`answer-filter-value-${question.id}-${ruleIndex}`}
                                  data-testid={`answer-filter-value-${question.id}-${ruleIndex}`}
                                  type="color"
                                  fullWidth
                                  size="small"
                                  value={rule.value || '#000000'}
                                  onChange={(e) => {
                                    setTempFilters(prev => ({
                                      ...prev,
                                      [question.id]: {
                                        ...prev[question.id],
                                        rules: prev[question.id].rules.map((r, idx) =>
                                          idx === ruleIndex ? { ...r, value: e.target.value } : r
                                        )
                                      }
                                    }));
                                  }}
                                />
                              )}
                            </>
                          )}
                        </Grid>

                        <Grid item xs={1}>
                          <IconButton 
                            onClick={() => removeRule(question.id, ruleIndex)}
                            size="small"
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}

                  {/* Bouton d'ajout de règle */}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => addRuleToQuestion(question.id)}
                    variant="outlined"
                    size="small"
                    sx={{
                      mt: 2,
                      color: '#667eea',
                      borderColor: 'rgba(102, 126, 234, 0.3)',
                      textTransform: 'none',
                      fontWeight: 500,
                      '&:hover': {
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.04)'
                      }
                    }}
                  >
                    Add Rule
                  </Button>
                </Box>
              </Grid>
            ))}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <Button 
            onClick={onClose}
            sx={{
              color: '#64748b',
              '&:hover': {
                backgroundColor: 'rgba(102, 126, 234, 0.04)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              setAnswerFilters(tempFilters);
              onClose();
              applyAnswerFilters();
            }} 
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              px: 4,
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Ajouter cette fonction de filtrage
  const filteredSurveys = useMemo(() => {
    let filtered = [...surveys];

    // Filtre de recherche
    if (searchQuery) {
      filtered = filtered.filter(survey =>
        survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (survey.description && survey.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filtre de date
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(survey => {
        const surveyDate = new Date(survey.createdAt);
        const isAfterStart = !dateRange.start || surveyDate >= dateRange.start;
        const isBeforeEnd = !dateRange.end || surveyDate <= dateRange.end;
        return isAfterStart && isBeforeEnd;
      });
    }

    // Filtre des sondages en attente
    if (showPendingOnly) {
      filtered = filtered.filter(survey => survey.status === 'pending');
    }

    // Tri
    if (sortBy === 'popular') {
      filtered.sort((a, b) => {
        const aResponses = surveyAnswers[a._id]?.length || 0;
        const bResponses = surveyAnswers[b._id]?.length || 0;
        return bResponses - aResponses;
      });
    } else {
      filtered.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return filtered;
  }, [surveys, searchQuery, dateRange, sortBy, surveyAnswers, showPendingOnly]);

  // Ajouter cette fonction pour réinitialiser les filtres
  const clearFilters = () => {
    setSearchQuery('');
    setDateRange({ start: null, end: null });
    setShowDateFilter(false);
    setShowPendingOnly(false);
    setSortBy('date');
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
    <Box
      id="chart-container"
      data-testid="chart-container"
      sx={{ 
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

  // Ajout d'un intervalle de rafraîchissement (en millisecondes)
  const REFRESH_INTERVAL = 3000; // 10 secondes

  // Modifier l'useEffect pour le rafraîchissement périodique
  useEffect(() => {
    const loadSurveysAndAnswers = async () => {
      try {
        const token = localStorage.getItem('accessToken') || '';
        
        // Charger les sondages
        const surveysData = await fetchSurveys(token);
        const pendingShares = await fetchPendingShares(token);
        const pendingSurveys = pendingShares.map((share: any) => ({
          ...share.surveyId,
          isOwner: false,
          sharedBy: share.sharedBy,
          status: 'pending'
        }));

        const allSurveys = [...surveysData, ...pendingSurveys];
        setSurveys(allSurveys);

        // Charger les réponses pour tous les sondages
        const answersPromises = allSurveys.map((survey: Survey) => 
          getSurveyAnswers(survey._id, token)
            .then(answers => ({ [survey._id]: answers }))
        );

        const allAnswers = await Promise.all(answersPromises);
        const answersMap = allAnswers.reduce((acc, curr) => ({
          ...acc,
          ...curr
        }), {});

        setSurveyAnswers(answersMap);
      } catch (error: unknown) {
        console.error('Error loading surveys:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    // Chargement initial
    loadSurveysAndAnswers();

    // Mettre en place l'intervalle de rafraîchissement uniquement pour la vue liste
    let intervalId: NodeJS.Timeout | null = null;
    if (!selectedSurvey && !loading) {
      intervalId = setInterval(() => {
        // Rafraîchir la liste des sondages et leurs réponses
        const refreshSurveyListAndAnswers = async () => {
          try {
            const token = localStorage.getItem('accessToken') || '';
            
            // Récupérer les sondages mis à jour
            const surveysData = await fetchSurveys(token);
            const pendingShares = await fetchPendingShares(token);
            const pendingSurveys = pendingShares.map((share: any) => ({
              ...share.surveyId,
              isOwner: false,
              sharedBy: share.sharedBy,
              status: 'pending'
            }));
            const allSurveys = [...surveysData, ...pendingSurveys];
            setSurveys(allSurveys);

            // Mettre à jour uniquement les réponses des sondages affichés
            const answersPromises = allSurveys.map((survey: Survey) => 
              getSurveyAnswers(survey._id, token)
                .then(answers => ({ [survey._id]: answers }))
            );

            const allAnswers = await Promise.all(answersPromises);
            const answersMap = allAnswers.reduce((acc, curr) => ({
              ...acc,
              ...curr
            }), {});

            setSurveyAnswers(prev => ({
              ...prev,
              ...answersMap
            }));
          } catch (error) {
            console.error('Error refreshing survey list and answers:', error);
          }
        };
        refreshSurveyListAndAnswers();
      }, REFRESH_INTERVAL);
    }

    // Nettoyer l'intervalle lors du démontage du composant
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedSurvey, loading]); // Ajouter loading comme dépendance

  console.log('Current state - Surveys:', surveys);
  console.log('Current state - Answers:', surveyAnswers);

  const handleViewResults = (survey: Survey) => {
    setSelectedSurvey(survey);
    const token = localStorage.getItem('accessToken') || '';
    
    // Ajouter un indicateur de chargement
    setLoading(true);
    
    getSurveyAnswers(survey._id, token)
      .then(answers => {
        console.log('Loaded answers:', answers); // Debug log
        setSurveyAnswers(prev => ({
          ...prev,
          [survey._id]: answers
        }));
      })
      .catch(error => {
        console.error('Error loading survey answers:', error);
        toast.error('Échec du chargement des réponses');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleBack = () => {
    setSelectedSurvey(null);
  };

  // Modifiez la fonction filterAnswers pour gérer explicitement les types
  const filterAnswers = useCallback((answers: SurveyAnswer[]): SurveyAnswer[] => {
    if (!answers.length) return answers;

    const hasActiveFilters = Object.values(filters.demographic).some(value => 
      value !== undefined && value !== "" && 
      !(Array.isArray(value) && value[0] === 0 && value[1] === 100)
    );
    const hasActiveAnswerFilters = Object.keys(answerFilters).length > 0;

    if (!hasActiveFilters && !hasActiveAnswerFilters) return answers;

    return answers.filter(answer => {
      // Filtres démographiques
      if (hasActiveFilters) {
        const demographic = answer.respondent?.demographic;
        if (!demographic) return false;

        if (filters.demographic.gender && filters.demographic.gender !== "") {
          const genderValue = demographic.gender ?? null;
          const filterValue = filters.demographic.gender.toLowerCase();
          if (genderValue?.toLowerCase() !== filterValue) {
            return false;
          }
        }

        if (filters.demographic.educationLevel && filters.demographic.educationLevel !== "") {
          const educationValue = demographic.educationLevel ?? null;
          const filterValue = filters.demographic.educationLevel;
          if (educationValue !== filterValue) {
            return false;
          }
        }

        if (filters.demographic.city && filters.demographic.city !== "") {
          const cityValue = demographic.city ?? null;
          const filterValue = filters.demographic.city;
          if (cityValue !== filterValue) {
            return false;
          }
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
      }

      // Filtres de réponses
      if (hasActiveAnswerFilters) {
        return Object.entries(answerFilters).every(([questionId, filter]) => {
          const questionAnswer = answer.answers.find(a => a.questionId === questionId);
          if (!questionAnswer) return false;

          return filter.rules.every(rule => evaluateRule(questionAnswer.answer, rule));
        });
      }

      return true;
    });
  }, [filters.demographic, answerFilters]);

  // Modifier la fonction calculateQuestionStats pour accepter les réponses filtrées
  const calculateQuestionStats = useCallback((surveyId: string, questionId: string, filteredAnswers?: SurveyAnswer[]) => {
    const allAnswers = surveyAnswers[surveyId] || [];
    const answers = filteredAnswers || filterAnswers(allAnswers);
    
    const stats: QuestionStats = {
      total: 0,
      answers: {}
    };

    answers.forEach(answer => {
      const questionAnswer = answer.answers.find(a => a.questionId === questionId);
      if (questionAnswer?.answer) {
        const value = questionAnswer.answer.toString();
        stats.answers[value] = (stats.answers[value] || 0) + 1;
        stats.total++;
      }
    });

    return stats;
  }, [surveyAnswers, filterAnswers]);

  // Modifier la fonction renderQuestionSummary pour utiliser les réponses filtrées
  const renderQuestionSummary = useCallback((question: Question) => {
    if (!selectedSurvey) return null;

    const allAnswers = surveyAnswers[selectedSurvey._id] || [];
    
    // Vérifier si nous avons des réponses
    if (allAnswers.length === 0) {
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No responses available
          </Typography>
        </Box>
      );
    }

    const filteredAnswers = filterAnswers(allAnswers);
    const stats = calculateQuestionStats(selectedSurvey._id, question.id, filteredAnswers);

    // Ajouter un indicateur visuel pour montrer si des filtres sont actifs
    const hasActiveFilters = Object.keys(answerFilters).length > 0 || 
      Object.values(filters.demographic).some(value => 
        value !== undefined && value !== "" && 
        !(Array.isArray(value) && value[0] === 0 && value[1] === 100)
      );

    return (
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Responses: {stats.total} 
            {hasActiveFilters && filteredAnswers.length !== allAnswers.length && 
              ` (filtered from ${allAnswers.length})`
            }
          </Typography>
          {hasActiveFilters && (
            <Chip
              size="small"
              label="Filtered"
              color="primary"
              sx={{
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                color: '#667eea',
              }}
            />
          )}
        </Box>
        
        <Box sx={{ mt: 2 }}>
          {Object.entries(stats.answers).map(([answer, count]) => (
            <Box key={answer} sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">
                  {answer}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {count} ({Math.round((count / stats.total) * 100)}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.round((count / stats.total) * 100)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 4,
                  }
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    );
  }, [selectedSurvey, surveyAnswers, filterAnswers, filters.demographic, answerFilters]);

  const handleQuestionClick = useCallback((questionId: string) => {
    if (!selectedSurvey) return;

    const allAnswers = surveyAnswers[selectedSurvey._id] || [];
    const questionAnswers = allAnswers.filter(answer => 
      answer.answers.some(a => a.questionId === questionId)
    );

    setSelectedQuestion({
      questionId,
      answers: questionAnswers
    });
    setDialogOpen(true);
  }, [selectedSurvey, surveyAnswers]);

  const handleClose = useCallback(() => {
    setDialogOpen(false);
    // Attendre que l'animation de fermeture soit terminée avant de réinitialiser les données
    setTimeout(() => {
      setSelectedQuestion(null);
    }, 300);
  }, []);

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

  // Ajouter ces constantes avec les autres constantes
  const genderOptions = [
    "male",
    "female",
    "other"
  ];

  // Ajouter l'état pour la boîte de dialogue des filtres de réponses
  const [answerFilterDialogOpen, setAnswerFilterDialogOpen] = useState(false);

  // Ajouter l'état pour le dialogue des filtres démographiques
  const [demographicFilterDialogOpen, setDemographicFilterDialogOpen] = useState(false);

  // Créer le composant DemographicFilterPanel
  const DemographicFilterPanel: React.FC<DemographicFilterPanelProps> = ({ open, onClose, id, 'data-testid': dataTestId }) => {
    const [cities, setCities] = useState<string[]>([]);
    const [isLoadingCities, setIsLoadingCities] = useState(false);

    const fetchCities = async () => {
      try {
        setIsLoadingCities(true);
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
          setCities(data.data);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des villes :", error);
        setCities(cities); // Garde les villes par défaut en cas d'erreur
      } finally {
        setIsLoadingCities(false);
      }
    };

    useEffect(() => {
      if (open) {
        fetchCities();
      }
    }, [open]);

    // Ajouter un état temporaire pour stocker les filtres avant de les appliquer
    const [tempFilters, setTempFilters] = useState(() => ({
      gender: filters.demographic.gender,
      educationLevel: filters.demographic.educationLevel,
      city: filters.demographic.city,
      age: filters.demographic.age
    }));

    // Réinitialiser les filtres temporaires à l'ouverture du dialogue
    useEffect(() => {
      if (open) {
        setTempFilters({
          gender: filters.demographic.gender,
          educationLevel: filters.demographic.educationLevel,
          city: filters.demographic.city,
          age: filters.demographic.age
        });
      }
    }, [open, filters.demographic]);

    const handleApplyFilters = () => {
      setFilters(prev => ({
        ...prev,
        demographic: {
          gender: tempFilters.gender,
          educationLevel: tempFilters.educationLevel,
          city: tempFilters.city,
          age: tempFilters.age
        }
      }));
      
      if (selectedSurvey) {
        const answers = surveyAnswers[selectedSurvey._id] || [];
        const filtered = filterAnswers(answers);
        const newStats = calculateDemographicStats(selectedSurvey._id, filtered);
        setFilteredStats(newStats);
      }
      onClose();
    };

    return (
      <Dialog
        id={id}
        data-testid={dataTestId}
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Configure Demographic Filters</Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl
                id="demographic-gender-filter"
                data-testid="demographic-gender-filter"
                fullWidth
                size="small"
              >
                <InputLabel>Gender</InputLabel>
                <Select
                  value={tempFilters.gender || ''}
                  onChange={(e) => {
                    setTempFilters(prev => ({
                      ...prev,
                      gender: e.target.value
                    }));
                  }}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(102, 126, 234, 0.2)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(102, 126, 234, 0.4)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    }
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

            <Grid item xs={12} sm={6}>
              <FormControl
                id="demographic-education-filter"
                data-testid="demographic-education-filter"
                fullWidth
                size="small"
              >
                <InputLabel>Education Level</InputLabel>
                <Select
                  value={tempFilters.educationLevel || ''}
                  onChange={(e) => {
                    setTempFilters(prev => ({
                      ...prev,
                      educationLevel: e.target.value
                    }));
                  }}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(102, 126, 234, 0.2)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(102, 126, 234, 0.4)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    }
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  {educationLevels.map((level) => (
                    <MenuItem key={level} value={level}>{level}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl
                id="demographic-city-filter"
                data-testid="demographic-city-filter"
                fullWidth
              >
                <InputLabel>City</InputLabel>
                <Select
                  value={tempFilters.city}
                  onChange={(e) => setTempFilters(prev => ({
                    ...prev,
                    city: e.target.value
                  }))}
                  label="City"
                  disabled={isLoadingCities}
                >
                  <MenuItem value="">
                    <em>{isLoadingCities ? 'Loading cities...' : 'None'}</em>
                  </MenuItem>
                  {cities.map((city) => (
                    <MenuItem key={city} value={city}>
                      {city}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box sx={{ px: 2 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  Age Range: {tempFilters.age?.[0] || 0} - {tempFilters.age?.[1] || 100} years
                </Typography>
                <Slider
                  id="demographic-age-filter"
                  data-testid="demographic-age-filter"
                  value={tempFilters.age || [0, 100]}
                  onChange={(_, newValue) => {
                    setTempFilters(prev => ({
                      ...prev,
                      age: newValue as [number, number]
                    }));
                  }}
                  sx={{
                    color: '#667eea',
                    '& .MuiSlider-rail': {
                      backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    },
                    '& .MuiSlider-track': {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    },
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#fff',
                      border: '2px solid #667eea',
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: '0 0 0 8px rgba(102, 126, 234, 0.16)',
                      },
                    },
                    '& .MuiSlider-valueLabel': {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    },
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleApplyFilters}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              }
            }}
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Modifier le FilterPanel pour inclure le nouveau bouton
  const FilterPanel = () => {
    // Fonction pour obtenir le nombre total de filtres actifs
    const getActiveDemographicFiltersCount = () => {
      let count = 0;
      if (filters.demographic.gender) count++;
      if (filters.demographic.educationLevel) count++;
      if (filters.demographic.city) count++;
      if (filters.demographic.age && 
          (filters.demographic.age[0] !== 0 || filters.demographic.age[1] !== 100)) count++;
      return count;
    };

    // Fonction pour formater la valeur du filtre
    const formatFilterValue = (value: any): string => {
      if (value === null || value === undefined) {
        return 'N/A';
      }

      if (Array.isArray(value)) {
        return `${value[0]}-${value[1]}`;
      }

      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      }

      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      if (typeof value === 'number') {
        return value.toString();
      }

      // Pour les chaînes de caractères
      return value.toString().charAt(0).toUpperCase() + value.toString().slice(1);
    };

    return (
      <Box
        id="filter-panel-container"
        data-testid="filter-panel-container"
        sx={{ 
          mb: 4,
          p: 3,
          borderRadius: 2,
          backgroundColor: 'white',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.08)',
          border: '1px solid rgba(102, 126, 234, 0.15)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 6px 24px rgba(102, 126, 234, 0.12)',
            transform: 'translateY(-2px)'
          }
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          pb: 2,
          borderBottom: '1px solid rgba(102, 126, 234, 0.1)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FilterListIcon sx={{ 
              color: '#667eea',
              fontSize: '1.8rem'
            }} />
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Filter Responses
            </Typography>
          </Box>
          <Button
            startIcon={<ClearIcon />}
            onClick={() => {
              setFilteredStats(null);
              setFilters({
                demographic: {},
                answers: {}
              });
              setAnswerFilters({});
              setAgeRange([0, 100]);
              if (selectedSurvey) {
                const newStats = calculateDemographicStats(selectedSurvey._id);
                setFilteredStats(newStats);
              }
            }}
            variant="outlined"
            size="small"
            sx={{
              color: '#667eea',
              borderColor: 'rgba(102, 126, 234, 0.3)',
              textTransform: 'none',
              fontWeight: 500,
              px: 2,
              py: 0.75,
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(102, 126, 234, 0.04)',
                borderColor: '#667eea',
                transform: 'translateY(-1px)',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)'
              }
            }}
          >
            Reset Filters
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Demographic Filters Section */}
          <Grid item xs={12}>
            <Box sx={{ 
              p: 2.5,
              borderRadius: 2,
              backgroundColor: 'rgba(102, 126, 234, 0.02)',
              border: '1px solid rgba(102, 126, 234, 0.08)',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(102, 126, 234, 0.04)',
                borderColor: 'rgba(102, 126, 234, 0.15)'
              }
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 2
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ 
                    color: '#4a5568', 
                    fontWeight: 600,
                    letterSpacing: '0.3px'
                  }}>
                    Demographic Filters
                  </Typography>
                  {getActiveDemographicFiltersCount() > 0 && (
                    <Chip
                      label={`${getActiveDemographicFiltersCount()} active`}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        color: '#667eea',
                        fontWeight: 500,
                        height: '24px'
                      }}
                    />
                  )}
                </Box>
                <Button
                  startIcon={<FilterListIcon />}
                  onClick={() => setDemographicFilterDialogOpen(true)}
                  variant="contained"
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 3,
                    py: 1,
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)'
                    }
                  }}
                >
                  Configure Filters
                </Button>
              </Box>

              {/* Active Demographic Filters Display */}
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1
              }}>
                {filters.demographic.gender && (
                  <Chip
                    id={`demographic-filter-chip-gender`}
                    data-testid={`demographic-filter-chip-gender`}
                    label={`Gender: ${formatFilterValue(filters.demographic.gender)}`}
                    onDelete={() => {
                      setFilters(prev => ({
                        ...prev,
                        demographic: { ...prev.demographic, gender: undefined }
                      }));
                    }}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      color: '#667eea',
                      borderRadius: '6px',
                      '& .MuiChip-deleteIcon': {
                        color: '#667eea',
                        '&:hover': { color: '#764ba2' }
                      }
                    }}
                  />
                )}
                {filters.demographic.educationLevel && (
                  <Chip
                    id={`demographic-filter-chip-educationLevel`}
                    data-testid={`demographic-filter-chip-educationLevel`}
                    label={`Education: ${formatFilterValue(filters.demographic.educationLevel)}`}
                    onDelete={() => {
                      setFilters(prev => ({
                        ...prev,
                        demographic: { ...prev.demographic, educationLevel: undefined }
                      }));
                    }}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      color: '#667eea',
                      borderRadius: '6px',
                      '& .MuiChip-deleteIcon': {
                        color: '#667eea',
                        '&:hover': { color: '#764ba2' }
                      }
                    }}
                  />
                )}
                {filters.demographic.city && (
                  <Chip
                    id={`demographic-filter-chip-city`}
                    data-testid={`demographic-filter-chip-city`}
                    label={`City: ${formatFilterValue(filters.demographic.city)}`}
                    onDelete={() => {
                      setFilters(prev => ({
                        ...prev,
                        demographic: { ...prev.demographic, city: undefined }
                      }));
                    }}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      color: '#667eea',
                      borderRadius: '6px',
                      '& .MuiChip-deleteIcon': {
                        color: '#667eea',
                        '&:hover': { color: '#764ba2' }
                      }
                    }}
                  />
                )}
                {filters.demographic.age && 
                 (filters.demographic.age[0] !== 0 || filters.demographic.age[1] !== 100) && (
                  <Chip
                    id={`demographic-filter-chip-age`}
                    data-testid={`demographic-filter-chip-age`}
                    label={`Age: ${filters.demographic.age[0]}-${filters.demographic.age[1]} years`}
                    onDelete={() => {
                      setFilters(prev => ({
                        ...prev,
                        demographic: { ...prev.demographic, age: undefined }
                      }));
                      setAgeRange([0, 100]);
                    }}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      color: '#667eea',
                      borderRadius: '6px',
                      '& .MuiChip-deleteIcon': {
                        color: '#667eea',
                        '&:hover': { color: '#764ba2' }
                      }
                    }}
                  />
                )}
              </Box>
            </Box>
          </Grid>

          {/* Answer Filters Section */}
          <Grid item xs={12}>
            <Box sx={{ 
              p: 2.5,
              borderRadius: 2,
              backgroundColor: 'rgba(102, 126, 234, 0.02)',
              border: '1px solid rgba(102, 126, 234, 0.08)',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(102, 126, 234, 0.04)',
                borderColor: 'rgba(102, 126, 234, 0.15)'
              }
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 2
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ 
                    color: '#4a5568', 
                    fontWeight: 600,
                    letterSpacing: '0.3px'
                  }}>
                    Answer Filters
                  </Typography>
                  {Object.keys(answerFilters).length > 0 && (
                    <Chip
                      label={`${Object.keys(answerFilters).length} active`}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        color: '#667eea',
                        fontWeight: 500,
                        height: '24px'
                      }}
                    />
                  )}
                </Box>
                <Button
                  startIcon={<FilterListIcon />}
                  onClick={() => setAnswerFilterDialogOpen(true)}
                  variant="contained"
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 3,
                    py: 1,
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)'
                    }
                  }}
                >
                  Configure Filters
                </Button>
              </Box>

              {/* Active Answer Filters Display */}
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1
              }}>
                {Object.entries(answerFilters).map(([questionId, filter]) => {
                  const question = selectedSurvey?.questions.find(q => q.id === questionId);
                  return filter.rules.map((rule, ruleIndex) => (
                    <Chip
                      key={`${questionId}-${ruleIndex}`}
                      label={`${question?.text || 'Question'}: ${rule.operator} ${formatFilterValue(rule.value)}${
                        rule.secondValue ? ` - ${formatFilterValue(rule.secondValue)}` : ''
                      }`}
                      onDelete={() => {
                        const newFilters = { ...answerFilters };
                        newFilters[questionId].rules = newFilters[questionId].rules.filter((_, idx) => idx !== ruleIndex);
                        if (newFilters[questionId].rules.length === 0) {
                          delete newFilters[questionId];
                        }
                        setAnswerFilters(newFilters);
                      }}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(102, 126, 234, 0.08)',
                        color: '#667eea',
                        borderRadius: '6px',
                        maxWidth: '300px',
                        '& .MuiChip-label': {
                          whiteSpace: 'normal',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        },
                        '& .MuiChip-deleteIcon': {
                          color: '#667eea',
                          '&:hover': { color: '#764ba2' }
                        }
                      }}
                    />
                  ));
                })}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // Modifier la fonction calculateDemographicStats pour accepter un paramètre optionnel
  const calculateDemographicStats = useCallback((surveyId: string, filteredAnswers?: SurveyAnswer[]): DemographicStats => {
    const answers = filteredAnswers || surveyAnswers[surveyId] || [];
    
    const stats: DemographicStats = {
      gender: {},
      education: {},
      city: {},
      ageDistribution: Array(10).fill(0)
    };

    answers.forEach(answer => {
      if (answer.respondent?.demographic) {
        const { gender, educationLevel, city, dateOfBirth } = answer.respondent.demographic;
        
        if (gender) {
          stats.gender[gender] = (stats.gender[gender] || 0) + 1;
        }
        
        if (educationLevel) {
          stats.education[educationLevel] = (stats.education[educationLevel] || 0) + 1;
        }
        
        if (city) {
          stats.city[city] = (stats.city[city] || 0) + 1;
        }
        
        if (dateOfBirth) {
          const age = calculateAge(new Date(dateOfBirth));
          const ageGroup = Math.floor(age / 10);
          if (ageGroup >= 0 && ageGroup < 10) {
            stats.ageDistribution[ageGroup]++;
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
                Distribution by City
              </Typography>
              <Box sx={{ 
                height: 'calc(100% - 60px)',
                width: '100%',           // Utiliser toute la largeur disponible
                display: 'flex',         // Ajout de flexbox
                justifyContent: 'center',// Centrage horizontal
                alignItems: 'center'     // Centrage vertical
              }}>
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
      <Box
        id="individual-responses-container"
        data-testid="individual-responses-container"
        sx={{ mt: 4 }}
      >
        <Typography variant="h6" gutterBottom>
          Individual Responses
        </Typography>
        {answers.map((answer: SurveyAnswer, index: number) => (
          <Box
            id={`individual-response-${answer._id}`}
            data-testid={`individual-response-${answer._id}`}
            key={answer._id}
            sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}
          >
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
                        id={`individual-response-gender-${answer._id}`}
                        data-testid={`individual-response-gender-${answer._id}`}
                        primary="Gender"
                        secondary={answer.respondent.demographic.gender}
                      />
                    </ListItem>
                  )}
                  {answer.respondent.demographic.dateOfBirth && (
                    <ListItem>
                      <ListItemText 
                        id={`individual-response-age-${answer._id}`}
                        data-testid={`individual-response-age-${answer._id}`}
                        primary="Age"
                        secondary={calculateAge(new Date(answer.respondent.demographic.dateOfBirth))}
                      />
                    </ListItem>
                  )}
                  {answer.respondent.demographic.educationLevel && (
                    <ListItem>
                      <ListItemText 
                        id={`individual-response-education-${answer._id}`}
                        data-testid={`individual-response-education-${answer._id}`}
                        primary="Education"
                        secondary={answer.respondent.demographic.educationLevel}
                      />
                    </ListItem>
                  )}
                  {answer.respondent.demographic.city && (
                    <ListItem>
                      <ListItemText 
                        id={`individual-response-city-${answer._id}`}
                        data-testid={`individual-response-city-${answer._id}`}
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

  // Supprimez la déclaration existante de renderQuestionDetails et remplacez-la par celle-ci
  const renderQuestionDetails = useCallback(() => {
    if (!selectedQuestion || !selectedSurvey) return null;

    // Modification de la récupération des réponses
    const allAnswers = surveyAnswers[selectedSurvey._id] || [];
    let filteredAnswers = [...allAnswers]; // Créer une copie pour éviter les mutations

    // Vérifier si les réponses existent pour la question sélectionnée
    const questionAnswers = filteredAnswers
      .map(answer => {
        // Trouver la réponse spécifique pour la question sélectionnée
        const questionAnswer = answer.answers.find(
          a => a.questionId === selectedQuestion.questionId
        );
        
        // Si pas de réponse pour cette question, ignorer cette entrée
        if (!questionAnswer) return null;
        
        // Retourner un nouvel objet avec la réponse spécifique
        return {
          ...answer,
          answers: [questionAnswer] // Remplacer le tableau de réponses par uniquement celle qui nous intéresse
        };
      })
      .filter((answer): answer is SurveyAnswer => answer !== null); // Type guard pour TypeScript

    // Mettre à jour selectedQuestion avec les réponses filtrées
    const updatedSelectedQuestion = {
      ...selectedQuestion,
      answers: questionAnswers
    };

    // Log pour debug
    console.log('Question answers:', questionAnswers);
    console.log('Updated selected question:', updatedSelectedQuestion);

    // Obtenir le nombre total de réponses
    const totalAnswers = allAnswers.length;
    const filteredAnswersCount = questionAnswers.length;

    const question = selectedSurvey.questions.find(q => q.id === selectedQuestion.questionId);
    if (!question) return null;

    const mostCommonAnswer = getMostCommonAnswer(questionAnswers, selectedQuestion.questionId);
    const availableChartTypes = getAvailableChartTypes(question.type);

    return (
      <Dialog 
        id="question-details-dialog"
        data-testid="question-details-dialog"
        open={dialogOpen} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          id="question-details-dialog-title"
          data-testid="question-details-dialog-title"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
          <Box>
            <Typography
              id="question-text"
              data-testid="question-text"
              variant="h6"
              component="div"
            >
              {question.text}
            </Typography>
            <Typography
              id="filtered-responses-count"
              data-testid="filtered-responses-count"
              variant="subtitle2"
              sx={{ mt: 1, opacity: 0.9 }}
            >
              {filteredAnswersCount} filtered responses out of {totalAnswers} total responses
            </Typography>
          </Box>
          <IconButton
            id="close-dialog-button"
            data-testid="close-dialog-button"
            onClick={handleClose}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          id="question-details-dialog-content"
          data-testid="question-details-dialog-content"
          sx={{ p: 3 }}
        >
          <Box
            id="stats-container"
            data-testid="stats-container"
            sx={{ 
              mb: 3, 
              display: 'flex', 
              gap: 2,
              '&:hover > .MuiPaper-root:not(:hover)': {
                opacity: 0.7,
                transform: 'translateY(0)',
                filter: 'blur(0.5px)'
              }
            }}>
            {/* Premier carré - Most Common Answer */}
            <Paper
              id="most-common-answer-card"
              data-testid="most-common-answer-card"
              sx={{ 
                p: 2,
                flex: 1,
                bgcolor: 'rgba(102, 126, 234, 0.05)',
                border: '1px solid rgba(102, 126, 234, 0.1)',
                borderRadius: 2,
                transition: 'all 0.3s ease',
                zIndex: 1,
                '&:hover': {
                  bgcolor: 'rgba(102, 126, 234, 0.08)',
                  transform: 'translateY(-4px) scale(1.02)',
                  boxShadow: '0 8px 16px rgba(102, 126, 234, 0.15)',
                  zIndex: 2
                }
              }}>
              <Typography
                id="most-common-answer-label"
                data-testid="most-common-answer-label"
                variant="subtitle2"
                color="primary"
                gutterBottom
              >
                Most Common Answer
              </Typography>
              <Typography
                id="most-common-answer-value"
                data-testid="most-common-answer-value"
                variant="h6"
              >
                {mostCommonAnswer || 'No responses yet'}
              </Typography>
            </Paper>

            {/* Deuxième carré - Responses Count */}
            <Paper
              id="responses-count-card"
              data-testid="responses-count-card"
              sx={{ 
                p: 2,
                flex: 1,
                bgcolor: 'rgba(102, 126, 234, 0.05)',
                border: '1px solid rgba(102, 126, 234, 0.1)',
                borderRadius: 2,
                transition: 'all 0.3s ease',
                zIndex: 1,
                '&:hover': {
                  bgcolor: 'rgba(102, 126, 234, 0.08)',
                  transform: 'translateY(-4px) scale(1.02)',
                  boxShadow: '0 8px 16px rgba(102, 126, 234, 0.15)',
                  zIndex: 2
                }
              }}>
              <Typography
                id="responses-count-label"
                data-testid="responses-count-label"
                variant="subtitle2"
                color="primary"
                gutterBottom
              >
                Responses
              </Typography>
              <Typography
                id="responses-count-value"
                data-testid="responses-count-value"
                variant="h6"
              >
                {selectedQuestion.answers.length} / {totalAnswers}
              </Typography>
            </Paper>
          </Box>

          <Tabs 
            id="question-details-tabs"
            data-testid="question-details-tabs"
            value={currentView} 
            onChange={(_, newValue) => setCurrentView(newValue)}
            sx={{
              mb: 3,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                minWidth: 100
              }
            }}
          >
            <Tab 
              id="responses-tab"
              data-testid="responses-tab"
              label="Responses" 
              value="list"
              icon={<VisibilityIcon />}
              iconPosition="start"
            />
            {availableChartTypes.length > 0 && (
              <Tab 
                id="charts-tab"
                data-testid="charts-tab"
                label="Charts" 
                value="chart"
                icon={<BarChartIcon />}
                iconPosition="start"
              />
            )}
          </Tabs>

          {currentView === 'list' ? (
            <List
              id="responses-list"
              data-testid="responses-list"
              sx={{ maxHeight: 400, overflow: 'auto' }}
            >
              {questionAnswers.map((answer, index) => {
                const questionAnswer = answer.answers[0]; // La réponse est déjà filtrée
                return (
                  <AnswerTooltip 
                    id={`answer-tooltip-${answer._id}`}
                    data-testid={`answer-tooltip-${answer._id}`}
                    key={index}
                    answer={answer}
                    questionAnswer={questionAnswer}
                  />
                );
              })}
            </List>
          ) : (
            <ChartView 
              id={`chart-view-${question.id}`}
              data-testid={`chart-view-${question.id}`}
              data={getQuestionData(selectedQuestion.questionId, questionAnswers)}
              question={question}
            />
          )}
        </DialogContent>

        <DialogActions
          id="question-details-dialog-actions"
          data-testid="question-details-dialog-actions"
          sx={{ 
            p: 3, 
            borderTop: '1px solid rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
          <Box>
            <Button
              id="export-csv-button"
              data-testid="export-csv-button"
              startIcon={<FileDownloadIcon />}
              onClick={exportCSV}
              variant="outlined"
              sx={{ mr: 1 }}
            >
              Export CSV
            </Button>
            <Button
              id="export-json-button"
              data-testid="export-json-button"
              startIcon={<CodeIcon />}
              onClick={exportJSON}
              variant="outlined"
            >
              Export JSON
            </Button>
          </Box>
          <Button
            id="close-dialog-button"
            data-testid="close-dialog-button"
            onClick={handleClose}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }, [selectedQuestion, selectedSurvey, dialogOpen, currentView, handleClose, surveyAnswers]);

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
                demographic.gender === filters.demographic.gender.toLowerCase()
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
    const ageDistribution: { [key: string]: number } = {};
    
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
    
    if (selectedSurvey) {
      let answers = surveyAnswers[selectedSurvey._id] || [];
      
      if (Object.keys(filters.demographic).length > 0) {
        answers = answers.filter(answer => {
          const demographic = answer.respondent?.demographic;
          if (!demographic) return false;

          if (filters.demographic.gender && 
              demographic.gender !== filters.demographic.gender.toLowerCase()) {
            return false;
          }

          if (filters.demographic.educationLevel && 
              demographic.educationLevel !== filters.demographic.educationLevel) {
            return false;
          }

          if (filters.demographic.city && 
              demographic.city !== filters.demographic.city) {
            return false;
          }

          return true;
        });
      }

      if (Object.keys(answerFilters).length > 0) {
        answers = answers.filter(answer => {
          return Object.entries(answerFilters).every(([questionId, filter]) => {
            const answerValue = answer.answers.find(a => a.questionId === questionId)?.answer;
            return filter.rules.every(rule => evaluateRule(answerValue, rule));
          });
        });
      }
      
      answers.forEach(answer => {
        if (answer.respondent?.demographic?.dateOfBirth) {
          const age = calculateAge(new Date(answer.respondent.demographic.dateOfBirth));
          if (age >= 0 && age <= 100) {
            ageDistribution[age] = (ageDistribution[age] || 0) + 1;
          }
        }
      });
    }

    // Trier les âges pour une attribution cohérente des couleurs
    const sortedAges = Object.keys(ageDistribution).sort((a, b) => parseInt(a) - parseInt(b));
    
    const datasets = sortedAges.map((age, index) => ({
      label: `${age} ans`,
      data: [{
        x: parseInt(age),
        y: ageDistribution[age]
      }],
      backgroundColor: chartColors.backgrounds[index % chartColors.backgrounds.length],
      borderColor: chartColors.borders[index % chartColors.borders.length],
      borderWidth: 2,
      pointRadius: 8,
      pointHoverRadius: 10,
      fill: false
    }));

    const chartData = {
      datasets
    };

    const options: ChartOptions<'scatter'> = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'right' as const,
          labels: {
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle',
            font: {
              size: 12
            }
          },
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const age = context.parsed.x;
              const count = context.parsed.y;
              return `${count} participant${count > 1 ? 's' : ''} ${age} years old`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Years old',
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          min: 1,
          max: 100,
          ticks: {
            stepSize: 5,
            callback: function(tickValue: number | string): string | number {
              return Math.floor(Number(tickValue));
            }
          },
          grid: {
            color: 'rgba(102, 126, 234, 0.1)'
          }
        },
        y: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            precision: 0
          },
          grid: {
            color: 'rgba(102, 126, 234, 0.1)'
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'nearest'
      }
    };

    return (
      <Box
        id="age-chart-container"
        data-testid="age-chart-container"
        sx={{ 
          height: '400px', 
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
        <Scatter data={chartData} options={options} />
      </Box>
    );
  };

  // Déplacer removeRule au niveau du composant principal et avant son utilisation
  const removeRule = useCallback((questionId: string, ruleIndex: number) => {
    setAnswerFilters(prev => {
      const newFilters = { ...prev };
      if (newFilters[questionId]) {
        const updatedRules = newFilters[questionId].rules.filter((_, index) => index !== ruleIndex);
        if (updatedRules.length === 0) {
          delete newFilters[questionId];
        } else {
          newFilters[questionId] = {
            ...newFilters[questionId],
            rules: updatedRules
          };
        }
      }
      return newFilters;
    });
  }, []);

  // Modifier l'effet qui gère les filtres avec des logs
  useEffect(() => {
    if (!selectedSurvey || !surveyAnswers[selectedSurvey._id]) {
      console.log('🔍 Impossible to filter:', {
        selectedSurvey: !!selectedSurvey,
        hasAnswers: selectedSurvey ? !!surveyAnswers[selectedSurvey._id] : false
      });
      return;
    }

    console.log('🔄 Starting filtering process:', {
      totalAnswers: surveyAnswers[selectedSurvey._id].length,
      activeFilters: filters.demographic,
      answerFilters
    });

    const hasActiveFilters = Object.values(filters.demographic).some(value => 
      value !== undefined && value !== "" && 
      !(Array.isArray(value) && value[0] === 0 && value[1] === 100)
    );

    const hasActiveAnswerFilters = Object.keys(answerFilters).length > 0;

    console.log('📊 Filters state:', {
      hasActiveFilters,
      hasActiveAnswerFilters
    });

    // Éviter les calculs inutiles si aucun filtre n'est actif
    if (!hasActiveFilters && !hasActiveAnswerFilters) {
      console.log('🔄 Resetting filters');
      if (filteredStats !== null || filteredByAnswers) {
        setFilteredStats(null);
        setFilteredByAnswers(false);
      }
      return;
    }

    const originalAnswers = surveyAnswers[selectedSurvey._id];
    console.log('📝 Original answers:', originalAnswers.length);

    const filteredAnswers = originalAnswers.filter(answer => {
      const demographic = answer.respondent?.demographic;
      
      // Log pour chaque réponse filtrée
      console.log('🔍 Checking response:', {
        answerId: answer._id,
        hasDemographic: !!demographic,
        demographicData: demographic
      });

      if (hasActiveFilters && !demographic) {
        console.log('❌ Response rejected: no demographic data');
        return false;
      }

      // Vérification des filtres démographiques
      if (hasActiveFilters && demographic) {
        if (filters.demographic.gender && 
            demographic.gender !== filters.demographic.gender.toLowerCase()) {
          console.log('❌ Response rejected: gender does not match', {
            expected: filters.demographic.gender,
            received: demographic.gender
          });
          return false;
        }

        if (filters.demographic.educationLevel && 
            demographic.educationLevel !== filters.demographic.educationLevel) {
          console.log('❌ Response rejected: education level does not match', {
            expected: filters.demographic.educationLevel,
            received: demographic.educationLevel
          });
          return false;
        }

        if (filters.demographic.city && 
            demographic.city !== filters.demographic.city) {
          console.log('❌ Response rejected: city does not match', {
            expected: filters.demographic.city,
            received: demographic.city
          });
          return false;
        }

        if (filters.demographic.age && demographic.dateOfBirth) {
          const age = calculateAge(new Date(demographic.dateOfBirth));
          if (age < filters.demographic.age[0] || age > filters.demographic.age[1]) {
            console.log('❌ Response rejected: age out of limits', {
              age,
              limits: filters.demographic.age
            });
            return false;
          }
        }
      }

      // Vérification des filtres de réponses
      if (hasActiveAnswerFilters) {
        const passesAnswerFilters = Object.entries(answerFilters).every(([questionId, filter]) => {
          const answerValue = answer.answers.find(a => a.questionId === questionId)?.answer;
          console.log('🔍 Checking response to question:', {
            questionId,
            answerValue,
            filter
          });

          return filter.rules.every(rule => {
            const result = evaluateRule(answerValue, rule);
            console.log('📋 Evaluation rule:', {
              rule,
              answerValue,
              result
            });
            return result;
          });
        });

        if (!passesAnswerFilters) {
          console.log('❌ Response rejected: does not match answer filters');
          return false;
        }
      }

      console.log('✅ Response accepted');
      return true;
    });

    console.log('📊 Filtered results:', {
      totalInitial: originalAnswers.length,
      totalFiltered: filteredAnswers.length,
      filteredResponses: filteredAnswers
    });

    const newStats = calculateDemographicStats(selectedSurvey._id, filteredAnswers);
    console.log('📈 New calculated statistics:', newStats);

    setFilteredStats(newStats);
    setFilteredByAnswers(hasActiveAnswerFilters);

  }, [selectedSurvey, surveyAnswers, filters.demographic, answerFilters, calculateDemographicStats]);

  // Ajouter cet état au début du composant
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Ajouter un état pour contrôler le montage du Dialog
  const [isDialogMounted, setIsDialogMounted] = useState(false);

  // Modifier useEffect pour gérer le montage du Dialog
  useEffect(() => {
    if (selectedQuestion && dialogOpen) {
      setIsDialogMounted(true);
    } else {
      // Délai pour permettre l'animation de fermeture
      const timer = setTimeout(() => {
        setIsDialogMounted(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedQuestion, dialogOpen]);

  // Ajouter l'état pour la plage d'âge
  const [ageRange, setAgeRange] = useState<[number, number]>([0, 100]);

  // Ajouter la fonction pour gérer le changement d'âge
  const handleAgeChange = (_event: Event, newValue: number | number[]) => {
    if (Array.isArray(newValue)) {
      setAgeRange(newValue as [number, number]);
      setFilters(prev => ({
        ...prev,
        demographic: {
          ...prev.demographic,
          age: newValue as [number, number]
        }
      }));
      applyDemographicFilters();
    }
  };

  // Dans le composant ResultsPage, ajoutez cette fonction
  const getMostCommonAnswer = (answers: SurveyAnswer[], questionId: string): string => {
    const answerCounts: { [key: string]: number } = {};
    
    answers.forEach(answer => {
      const questionAnswer = answer.answers.find(a => a.questionId === questionId);
      if (questionAnswer?.answer) {
        const value = questionAnswer.answer.toString();
        answerCounts[value] = (answerCounts[value] || 0) + 1;
      }
    });

    let mostCommon = '';
    let maxCount = 0;
    
    Object.entries(answerCounts).forEach(([answer, count]) => {
      if (count > maxCount) {
        mostCommon = answer;
        maxCount = count;
      }
    });

    return mostCommon;
  };

  // Ajouter cette interface
  interface ShareDialogProps {
    open: boolean;
    onClose: () => void;
    surveyId: string;
    id?: string;
    'data-testid'?: string;
  }

  // Ajouter ce composant
  const ShareDialog: React.FC<ShareDialogProps> = ({ open, onClose, surveyId, id, 'data-testid': dataTestId }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleShare = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Utiliser la variable d'environnement pour l'URL de l'API
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041';
        const response = await fetch(`${apiUrl}/api/survey-shares/share`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}` // Ajouté l'en-tête d'autorisation
          },
          body: JSON.stringify({
            surveyId,
            recipientEmail: email.trim()
          })
        });

        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
          throw new Error(data.message || 'Error during share');
        }

        setSuccess(true);
        setEmail('');
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
      } catch (err) {
        console.error('Detailed error:', err);
        setError(err instanceof Error ? err.message : 'Error during share');
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dialog
        id={id}
        data-testid={dataTestId}
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          id={`share-dialog-title-${id}`}
          data-testid={`share-dialog-title-${id}`}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
          <PersonAddIcon />
          Collaborate with others
        </DialogTitle>
        
        <DialogContent
          id={`share-dialog-content-${id}`}
          data-testid={`share-dialog-content-${id}`}
          sx={{ mt: 2 }}
        >
          <TextField
            id={`email-input-${id}`}
            data-testid={`email-input-${id}`}
            fullWidth
            label="Destinatory Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!error}
            helperText={error}
            disabled={loading || success}
            sx={{ mt: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <ShareIcon sx={{ color: 'action.active' }} />
                </InputAdornment>
              ),
            }}
          />
          
          {success && (
            <Alert
              id={`success-alert-${id}`}
              data-testid={`success-alert-${id}`}
              severity="success"
              sx={{ mt: 2 }}
            >
              Invitation sends successfuly!
            </Alert>
          )}
        </DialogContent>
        
        <DialogActions
          id={`share-dialog-actions-${id}`}
          data-testid={`share-dialog-actions-${id}`}
          sx={{ p: 2, pt: 0 }}
        >
          <Button
            id={`cancel-button-${id}`}
            data-testid={`cancel-button-${id}`}
            onClick={onClose}
            disabled={loading}
            sx={{ color: '#64748b' }}
          >
            Cancel
          </Button>
          <Button
            id={`send-button-${id}`}
            data-testid={`send-button-${id}`}
            onClick={handleShare}
            disabled={!email || loading || success}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              }
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'send'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Dans le composant ResultsPage, ajouter cet état
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Ajoutez la fonction handleShareResponse avant le return du composant
  const handleShareResponse = async (shareId: string, accept: boolean) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      const pendingShares = await fetchPendingShares(token);
      const targetShare = pendingShares.find((share: { surveyId: { _id: string } }) => share.surveyId._id === shareId);
      
      if (!targetShare) {
        toast.error('Share not found');
        return;
      }

      if (!accept) {
        // Mettre à jour uniquement le sondage spécifique
        setSurveys(prevSurveys => 
          prevSurveys.map((survey: Survey) => 
            survey._id === shareId 
              ? { ...survey, isRemoving: true }
              : survey
          )
        );
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const response = await respondToSurveyShare(targetShare._id, accept, token);

      if (response) {
        if (accept) {
          setSurveys(prevSurveys => 
            prevSurveys.map((survey: Survey) => 
              survey._id === shareId 
                ? { ...survey, status: 'accepted' }
                : survey
            )
          );
        } else {
          // Supprimer uniquement le sondage spécifique
          setSurveys(prevSurveys => 
            prevSurveys.filter((survey: Survey) => survey._id !== shareId)
          );
        }
        
        toast.success(accept ? 'Survey accepted successfully' : 'Survey rejected successfully');
      }
    } catch (error: any) {
      console.error('Detailed error:', error);
      toast.error(error.response?.data?.message || 'Error during share response');
    }
  };

  // Ajoutez cet état pour gérer les animations de suppression
  const [removingSurveyId, setRemovingSurveyId] = useState<string | null>(null);

  // États pour la gestion du dialog de suppression
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState<string | null>(null);

  // Fonction pour ouvrir le dialog
  const openDeleteDialog = (surveyId: string) => {
    console.log('Opening delete dialog for survey:', surveyId);
    setSurveyToDelete(surveyId);
    setIsDeleteDialogOpen(true);
  };

  // Fonction pour fermer le dialog
  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSurveyToDelete(null);
  };

  // Modifier la fonction confirmDelete
  const confirmDelete = async () => {
    if (surveyToDelete) {
      try {
        console.log('Starting delete process for survey:', surveyToDelete);
        
        await handleDeleteSurvey(surveyToDelete);
        
        // Mettre à jour la liste des sondages localement
        setSurveys(prevSurveys => 
          prevSurveys.filter(survey => survey._id !== surveyToDelete)
        );
        
        // Fermer le dialog
        closeDeleteDialog();
        
        // Afficher un message de succès
        toast.success('Survey deleted successfully');
      } catch (error) {
        console.error('Delete process failed:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to delete survey');
      }
    }
  };

  // Ajouter l'utilisation de useAuth
  const { user } = useAuth();

  // Ajouter la fonction handleDeleteSurvey
  const handleDeleteSurvey = async (surveyId: string) => {
    try {
      console.log('Sending delete request for survey:', surveyId);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Utiliser la même configuration que les autres appels API
      const response = await fetch(`${BASE_URL}/api/surveys/${surveyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors'
      });

      console.log('Delete response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `Failed to delete survey (Status: ${response.status})`);
      }

      // Retourner la réponse pour confirmation
      const data = await response.json();
      console.log('Delete successful:', data);
      return data;
    } catch (error) {
      console.error('Detailed error:', error);
      throw error;
    }
  };

  if (error) {
    return (
      <Typography
        id="error-message"
        data-testid="error-message"
        color="error"
        sx={{ textAlign: 'center', my: 4 }}
      >
        {error}
      </Typography>
    );
  }

  if (selectedSurvey) {
    return (
      <Box
        id="results-page-container"
        data-testid="results-page-container"
        component="section"  // Définit le type d'élément HTML
        sx={{
          minHeight: '100vh',
          backgroundColor: colors.background.default,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: { xs: 2, sm: 4 },
          maxWidth: '1000px',
          margin: '0 auto',
        }}
      >
        <Paper 
          component="article"  // Définit le type d'élément HTML
          data-testid="results-content"  // Ajoute un identifiant pour les tests et l'inspection
          elevation={3} 
          sx={{
            borderRadius: '16px',
            backgroundColor: colors.background.paper,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: '1000px',  // Ajout de cette ligne pour correspondre à survey-answer
            mb: 4,
          }}
        >
          <Box sx={{
            background: colors.primary.gradient,
            py: 4,
            px: 4,
            color: colors.text.light,
            textAlign: 'center',
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <IconButton
              id="back-button"
              data-testid="back-button"
              onClick={handleBack}
              sx={{
                color: 'white',
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            
            <Typography
              id="survey-title"
              data-testid="survey-title"
              variant="h4"
              fontWeight="bold"
            >
              {selectedSurvey.title}
            </Typography>

            <Button
              id="share-button"
              data-testid="share-button"
              onClick={() => setShareDialogOpen(true)}
              startIcon={<ShareIcon />}
              variant="contained"
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.3)',
                }
              }}
            >
              Collaborate 
            </Button>
          </Box>

          <Box sx={{ p: 3 }}>
            {/* Demographic Filter section */}
            {selectedSurvey?.demographicEnabled && (
              <FilterPanel />
            )}

            {/* Answer Filter section */}
            {!selectedSurvey?.demographicEnabled && (
              <Box
                id="answer-filter-container"
                data-testid="answer-filter-container"
                sx={{ 
                  mb: 4,
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: 'white',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 3 
                }}>
                  <Typography 
                    id="filter-responses-title"
                    data-testid="filter-responses-title"
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    Filter Responses
                  </Typography>
                  <Button
                    id="reset-filters-button"
                    data-testid="reset-filters-button"
                    variant="outlined"
                    onClick={() => setAnswerFilters({})}
                    startIcon={<ClearIcon />}
                    disabled={Object.keys(answerFilters).length === 0}
                    sx={{
                      borderColor: 'rgba(102, 126, 234, 0.3)',
                      color: '#667eea',
                      '&:hover': {
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.04)'
                      },
                      '&.Mui-disabled': {
                        borderColor: 'rgba(0, 0, 0, 0.12)',
                        color: 'rgba(0, 0, 0, 0.26)'
                      }
                    }}
                  >
                    Reset Filters
                  </Button>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button
                    id="configure-filters-button"
                    data-testid="configure-filters-button"
                    startIcon={<FilterListIcon />}
                    onClick={() => setAnswerFilterDialogOpen(true)}
                    variant="contained"
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      textTransform: 'none',
                      fontWeight: 500,
                      px: 3,
                      py: 1,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                      }
                    }}
                  >
                    Configure Filters
                  </Button>
                  {Object.keys(answerFilters).length > 0 && (
                    <Chip
                      id="active-filters-chip"
                      data-testid="active-filters-chip"
                      label={`${Object.keys(answerFilters).length} active filter(s)`}
                      onDelete={() => setAnswerFilters({})}
                      color="primary"
                      sx={{
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        color: '#667eea',
                        '& .MuiChip-deleteIcon': {
                          color: '#667eea'
                        }
                      }}
                    />
                  )}
                </Stack>
              </Box>
            )}

            {/* Questions section */}
            <Box sx={{ mb: 4 }}>
              <Typography 
                id="questions-title"
                data-testid="questions-title"
                variant="h6" 
                sx={{ 
                  mb: 3, 
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  display: 'inline-block',
                }}
              >
                Survey Questions
              </Typography>
              {selectedSurvey.questions.map((question, index) => {
                const stats = calculateQuestionStats(selectedSurvey._id, question.id);
                
                return (
                  <Paper 
                    id={`question-container-${question.id}`}
                    data-testid={`question-container-${question.id}`}
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
                        <Typography
                          id={`question-text-${question.id}`}
                          data-testid={`question-text-${question.id}`}
                          variant="h6"
                          sx={{ color: '#1a237e' }}
                        >
                          Question {index + 1}: {question.text}
                        </Typography>
                        <Typography
                          id={`question-type-${question.id}`}
                          data-testid={`question-type-${question.id}`}
                          variant="subtitle2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          Type: {question.type}
                        </Typography>
                      </Box>
                      <Button
                        id={`view-details-button-${question.id}`}
                        data-testid={`view-details-button-${question.id}`}
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
                      {renderQuestionSummary(question)}
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
                  id="export-all-csv-button"
                  data-testid="export-all-csv-button"
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
                  id="export-all-json-button"
                  data-testid="export-all-json-button"
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
              <Box sx={{ 
                mt: 6, 
                pt: 4, 
                borderTop: '1px solid rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <Box
                  id="demographic-stats-container"
                  data-testid="demographic-stats-container"
                  sx={{
                    width: '100%',
                    animation: 'fadeIn 0.3s ease-in-out',
                    '@keyframes fadeIn': {
                      '0%': {
                        opacity: 0,
                        transform: 'translateY(10px)'
                      },
                      '100%': {
                        opacity: 1,
                        transform: 'translateY(0)'
                      }
                    }
                  }}
                >
                  {renderDemographicStats()}
                </Box>
              </Box>
            )}
          </Box>
        </Paper>

        {isDialogMounted && (
          <Dialog
            id="question-details-dialog"
            data-testid="question-details-dialog"
            open={dialogOpen}
            onClose={() => {
              setDialogOpen(false);
            }}
            maxWidth="lg"
            fullWidth
            sx={{
              '& .MuiDialog-paper': {
                backgroundColor: colors.background.paper,
                borderRadius: '16px',
              },
            }}
          >
            {selectedQuestion && renderQuestionDetails()}
          </Dialog>
        )}
        
        {/* Ajouter le dialogue des filtres démographiques */}
        <DemographicFilterPanel 
          id="demographic-filter-panel"
          data-testid="demographic-filter-panel"
          open={demographicFilterDialogOpen}
          onClose={() => setDemographicFilterDialogOpen(false)}
        />

        {/* Ajouter le dialogue des filtres de réponses */}
        <AnswerFilterPanel
          id="answer-filter-panel"
          data-testid="answer-filter-panel"
          open={answerFilterDialogOpen}
          onClose={() => setAnswerFilterDialogOpen(false)}
          selectedSurvey={selectedSurvey}
          answerFilters={answerFilters}
          setAnswerFilters={setAnswerFilters}
        />

        <ShareDialog
          id="share-dialog"
          data-testid="share-dialog"
          open={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
          surveyId={selectedSurvey._id}
        />

        {/* Ajouter la boîte de dialogue de confirmation */}
        <Dialog
          id="delete-dialog"
          data-testid="delete-dialog"
          open={isDeleteDialogOpen}
          onClose={closeDeleteDialog}
          aria-labelledby="delete-dialog-title"
          sx={{ zIndex: 9999 }}
        >
          <DialogTitle id="delete-dialog-title">
            Confirm Deletion
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this survey? This action will also remove it for all users who received it and delete all associated answers. This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button 
              id="cancel-delete-button"
              data-testid="cancel-delete-button"
              onClick={closeDeleteDialog} 
              sx={{ color: '#64748b' }}
            >
              Cancel
            </Button>
            <Button
              id="confirm-delete-button"
              data-testid="confirm-delete-button"
              onClick={() => confirmDelete()} // Modification ici
              variant="contained"
              color="error"
              autoFocus
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Liste des sondages
  return (
    <Box 
      id="results-page-container"
      data-testid="results-page-container"
      component="section"  // Définit le type d'élément HTML
      sx={{
        minHeight: '100vh',
        backgroundColor: colors.background.default,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: { xs: 2, sm: 4 },
        maxWidth: '1000px',
        margin: '0 auto',
      }}
    >
      <Paper 
        id="results-content-paper"
        data-testid="results-content-paper"
        component="article"  // Définit le type d'élément HTML
        elevation={3} 
        sx={{
          borderRadius: '16px',
          backgroundColor: colors.background.paper,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '1000px',  // Ajout de cette ligne pour correspondre à survey-answer
          mb: 4,
        }}
      >
        <Box
          id="results-header"
          data-testid="results-header"
          sx={{
            background: colors.primary.gradient,
            py: 4,
            px: 4,
            color: colors.text.light,
            textAlign: 'center',
          }}>
          <Typography
            id="results-title"
            data-testid="results-title"
            variant="h4"
            fontWeight="bold"
          >
            My Surveys
          </Typography>
        </Box>

        <Box
          id="results-content"
          data-testid="results-content"
          sx={{ p: 4, backgroundColor: 'white' }}
        >
          {/* Nouvelle section de filtres */}
          <Box
            id="filter-panel"
            data-testid="filter-panel"
            sx={{ mb: 4, backgroundColor: 'background.paper', p: 3, borderRadius: 2, boxShadow: 1 }}
          >
            <TextField
              id="survey-search-field"
              data-testid="survey-search-field"
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
                    <IconButton
                      id="clear-filters-button"
                      data-testid="clear-filters-button"
                      size="small"
                      onClick={clearFilters}
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Stack
              id="filter-chips"
              data-testid="filter-chips"
              direction="row"
              spacing={2}
              alignItems="center"
            >
              <Chip
                id="date-filter-chip"
                data-testid="date-filter-chip"
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
                id="popularity-filter-chip"
                data-testid="popularity-filter-chip"
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
              <Chip
                id="pending-filter-chip"
                data-testid="pending-filter-chip"
                icon={<FilterListIcon />}
                label="Pending"
                onClick={() => setShowPendingOnly(!showPendingOnly)}
                color={showPendingOnly ? "primary" : "default"}
                variant={showPendingOnly ? "filled" : "outlined"}
                sx={{
                  '&.MuiChip-filled': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }
                }}
              />
            </Stack>

            {showDateFilter && (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Stack
                  id="date-filter-inputs"
                  data-testid="date-filter-inputs"
                  direction="row"
                  spacing={2}
                  sx={{ mt: 2 }}
                >
                  <CustomDatePicker
                    id="start-date-picker"
                    data-testid="start-date-picker"
                    label="Start Date"
                    value={dateRange.start}
                    onChange={(newValue: Date | null) => {
                      setDateRange(prev => ({
                        ...prev,
                        start: newValue
                      }));
                    }}
                  />
                  <CustomDatePicker
                    id="end-date-picker"
                    data-testid="end-date-picker"
                    label="End Date"
                    value={dateRange.end}
                    onChange={(newValue: Date | null) => {
                      setDateRange(prev => ({
                        ...prev,
                        end: newValue
                      }));
                    }}
                    minDate={dateRange.start || undefined}
                  />
                </Stack>
              </LocalizationProvider>
            )}
          </Box>

          {error ? (
            <Typography
              id="error-message"
              data-testid="error-message"
              color="error"
              sx={{ textAlign: 'center', my: 4 }}
            >
              {error}
            </Typography>
          ) : (
            <Box
              id="survey-cards"
              data-testid="survey-cards"
              sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
            >
              {filteredSurveys.map((survey) => {
                const responses = surveyAnswers[survey._id] || [];
                const isPending = survey.status === 'pending';
                
                return (
                  <Paper
                    id={`survey-card-${survey._id}`}
                    data-testid={`survey-card-${survey._id}`}
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
                      opacity: removingSurveyId === survey._id ? 0 : (isPending ? 0.85 : 1),
                      transform: removingSurveyId === survey._id ? 'scale(0.9)' : 'scale(1)',
                      border: isPending ? '2px solid rgba(102, 126, 234, 0.3)' : 'none',
                      backgroundColor: isPending ? 'rgba(102, 126, 234, 0.02)' : 'white',
                      '&:hover': {
                        boxShadow: 3,
                        opacity: removingSurveyId === survey._id ? 0 : 1,
                        transform: removingSurveyId === survey._id ? 
                          'scale(0.9)' : 
                          (isPending ? 'scale(1.02)' : 'none'),
                        zIndex: 1,
                        '& .hover-content': {
                          opacity: 1,
                          visibility: 'visible',
                          transform: 'translateY(0)',
                        }
                      }
                    }}
                  >
                    {/* Badge "Pending" amélioré */}
                    {isPending && (
                      <Chip
                        id={`pending-chip-${survey._id}`}
                        data-testid={`pending-chip-${survey._id}`}
                        label="Pending"
                        sx={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          zIndex: 2,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          height: '24px',
                          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                          '& .MuiChip-label': {
                            px: 1.5,
                            letterSpacing: '0.5px'
                          },
                          animation: 'pulse 2s infinite',
                          '@keyframes pulse': {
                            '0%': {
                              boxShadow: '0 0 0 0 rgba(102, 126, 234, 0.4)'
                            },
                            '70%': {
                              boxShadow: '0 0 0 6px rgba(102, 126, 234, 0)'
                            },
                            '100%': {
                              boxShadow: '0 0 0 0 rgba(102, 126, 234, 0)'
                            }
                          }
                        }}
                      />
                    )}

                    {/* Reste du contenu de la carte */}
                    <Box
                      id={`survey-card-content-${survey._id}`}
                      data-testid={`survey-card-content-${survey._id}`}
                      sx={{ 
                        p: 3,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative'
                      }}>
                      <Typography 
                        id={`survey-title-${survey._id}`}
                        data-testid={`survey-title-${survey._id}`}
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
                        id={`survey-description-${survey._id}`}
                        data-testid={`survey-description-${survey._id}`}
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
                        
                      {/* Badges section */}
                      <Stack 
                        id={`survey-badges-${survey._id}`}
                        data-testid={`survey-badges-${survey._id}`}
                        direction="row" 
                        spacing={1} 
                        sx={{
                          display: 'flex',
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: '8px',
                          mt: 2,
                          mb: 2,
                          '& .MuiChip-root': {
                            margin: '0 !important',
                            opacity: 1  // Assure que tous les badges sont opaques
                          }
                        }}
                      >
                        <Chip
                          id={`responses-chip-${survey._id}`}
                          data-testid={`responses-chip-${survey._id}`}
                          size="small"
                          label={`${responses.length} Responses`}
                          sx={{
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            color: '#667eea',
                            height: '24px',
                            flex: '1 1 auto'  // Permet au badge de s'étendre
                          }}
                        />
                        <Chip
                          id={`questions-chip-${survey._id}`}
                          data-testid={`questions-chip-${survey._id}`}
                          size="small"
                          label={`${survey.questions.length} Questions`}
                          sx={{
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            color: '#667eea',
                            height: '24px',
                            flex: '1 1 auto'  // Permet au badge de s'étendre
                          }}
                        />
                        <Chip
                          id={`demographic-chip-${survey._id}`}
                          data-testid={`demographic-chip-${survey._id}`}
                          size="small"
                          label={survey.demographicEnabled ? "Demographic" : "No Demographic"}
                          sx={{
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            color: '#667eea',
                            height: '24px',
                            flex: '1 1 auto'  // Permet au badge de s'étendre
                          }}
                        />
                      </Stack>

                      <Box
                        id={`hover-content-${survey._id}`}
                        data-testid={`hover-content-${survey._id}`}
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
                          id={`hover-title-${survey._id}`}
                          data-testid={`hover-title-${survey._id}`}
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
                          id={`hover-description-${survey._id}`}
                          data-testid={`hover-description-${survey._id}`}
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
                        id={`survey-footer-${survey._id}`}
                        data-testid={`survey-footer-${survey._id}`}
                        direction="column"
                        spacing={1}
                        sx={{ 
                          mt: 'auto',
                          position: 'relative',
                          zIndex: 1,
                          minHeight: '40px',  // Hauteur minimale fixe pour la zone de date
                          display: 'flex',
                          justifyContent: 'flex-end'  // Aligne le contenu en bas
                        }}
                      >
                        <Typography 
                          id={`created-date-${survey._id}`}
                          data-testid={`created-date-${survey._id}`}
                          variant="caption" 
                          color="text.secondary"
                          sx={{
                            display: 'block',  // Assure que le texte occupe toute la largeur
                            whiteSpace: 'nowrap',  // Empêche le retour à la ligne
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          Created on {new Date(survey.createdAt).toLocaleDateString()}
                        </Typography>
                        
                        {/* Ajout du "Shared by" ici */}
                        {survey.sharedBy && (
                          <Typography 
                            id={`shared-by-${survey._id}`}
                            data-testid={`shared-by-${survey._id}`}
                            variant="caption" 
                            sx={{ 
                              color: 'text.secondary',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            <EmailIcon sx={{ fontSize: 16 }} />
                            Shared by: {survey.sharedBy}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                    
                    <Box
                      id={`survey-actions-${survey._id}`}
                      data-testid={`survey-actions-${survey._id}`}
                      sx={{ 
                        p: 2, 
                        borderTop: 1, 
                        borderColor: 'divider',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',  // Changé de 'center' à 'space-between'
                        position: 'relative',
                        zIndex: 1
                      }}>
                      {isPending ? (
                        <Box
                          id={`pending-actions-${survey._id}`}
                          data-testid={`pending-actions-${survey._id}`}
                          sx={{ 
                            display: 'flex', 
                            gap: 1,
                            opacity: 1
                          }}>
                          <Button
                            id={`accept-button-${survey._id}`}
                            data-testid={`accept-button-${survey._id}`}
                            variant="contained"
                            size="small"
                            onClick={() => handleShareResponse(survey._id, true)}
                            sx={{
                              backgroundColor: '#4caf50',
                              opacity: 1,
                              '&:hover': { 
                                backgroundColor: '#388e3c',
                                opacity: 1
                              }
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            id={`reject-button-${survey._id}`}
                            data-testid={`reject-button-${survey._id}`}
                            variant="contained"
                            size="small"
                            onClick={() => handleShareResponse(survey._id, false)}
                            sx={{
                              backgroundColor: '#f44336',
                              opacity: 1,
                              '&:hover': { 
                                backgroundColor: '#d32f2f',
                                opacity: 1
                              }
                            }}
                          >
                            Reject
                          </Button>
                        </Box>
                      ) : (
                        // Réorganisation des boutons Delete et View Results
                        <Box
                          id={`actions-${survey._id}`}
                          data-testid={`actions-${survey._id}`}
                          sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}
                        >
                          {survey.userId === user?.id && !survey.sharedBy && (
                            <Button
                              id={`delete-button-${survey._id}`}
                              data-testid={`delete-button-${survey._id}`}
                              variant="outlined"
                              size="small"
                              color="error"
                              onClick={() => openDeleteDialog(survey._id)}
                              startIcon={<DeleteIcon />} // Ajout de l'icône
                              sx={{ mr: 'auto' }}
                            >
                              Delete
                            </Button>
                          )}
                          <Button
                            id={`view-results-button-${survey._id}`}
                            data-testid={`view-results-button-${survey._id}`}
                            variant="contained"
                            size="small"
                            onClick={() => handleViewResults(survey)}
                            sx={{ 
                              ml: 'auto',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
                              }
                            }}
                          >
                            View Results
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Dialog de confirmation de suppression */}
      <Dialog
        id="delete-dialog"
        data-testid="delete-dialog"
        open={isDeleteDialogOpen}
        onClose={closeDeleteDialog}
        aria-labelledby="delete-dialog-title"
        sx={{ zIndex: 9999 }}
      >
        <DialogTitle
          id="delete-dialog-title"
          data-testid="delete-dialog-title"
        >
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            id="delete-dialog-text"
            data-testid="delete-dialog-text"
          >
            Are you sure you want to delete this survey? This action will also remove it for all users who received it and delete all associated answers. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            id="cancel-delete-button"
            data-testid="cancel-delete-button"
            onClick={closeDeleteDialog} 
            sx={{ color: '#64748b' }}
          >
            Cancel
          </Button>
          <Button
            id="confirm-delete-button"
            data-testid="confirm-delete-button"
            onClick={() => confirmDelete()} // Modification ici
            variant="contained"
            color="error"
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Ajouter ces constantes après les imports
const educationLevels = [
  "High School",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD",
  "Other"
];

const cities = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  // Add other cities as needed
];

// Ajouter la fonction pour calculer l'âge
const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  const birthDateObj = new Date(birthDate); // Assure que birthDate est un objet Date
  
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const monthDiff = today.getMonth() - birthDateObj.getMonth();
  
  // Ajustement plus précis pour le jour du mois
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }
  
  // Validation supplémentaire
  if (age < 0 || age > 120) {
    console.warn('Age calculation resulted in invalid age:', age, 'for birthDate:', birthDate);
    return 0; // ou une autre valeur par défaut appropriée
  }
  
  return age;
};

// Ajouter cette fonction avant le composant ResultsPage
const formatFilterValue = (value: any): string => {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  if (Array.isArray(value)) {
    return `${value[0]}-${value[1]}`;
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  // Pour les chaînes de caractères
  return value.toString().charAt(0).toUpperCase() + value.toString().slice(1);
};

export default ResultsPage;