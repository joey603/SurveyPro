import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Tabs,
  Tab,
  AlertTitle,
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
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
  Link as LinkIcon,
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
import { AdvancedFilterPanel } from './AdvancedFilterPanel';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { QuestionDetailsDialog, QuestionDetails as DialogQuestionDetails } from './QuestionDetailsDialog';
import { DemographicStatistics } from './DemographicStatistics';
import { PathSegment } from './PathTreeVisualizer';
import { AnalysisGroup } from './GroupsList';
import { PathTreeVisualizer } from './PathTreeVisualizer';
import { SelectedPathsPanel } from './SelectedPathsPanel';
import { usePathFilter } from './PathFilterManager';
import { SurveyQuestions } from './SurveyQuestions';

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
  isPrivate?: boolean;
  privateLink?: string;
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

interface QuestionDetailsDialog {
  questionId: string;
  question: string;
  answers: string[];
  type: string;
}

interface QuestionDetailsSurvey {
  questionId: string;
  question: Question;
  answers: SurveyResponse[];
}

interface QuestionDetailsDialogFormat {
  questionId: string;
  question: string;
  answers: string[];
  type: string;
}

interface QuestionDetailsSurveyFormat {
  questionId: string;
  question: Question;
  answers: SurveyResponse[];
}

// Fonction de conversion
const convertToDialogFormat = (details: QuestionDetailsSurveyFormat | null): DialogQuestionDetails | null => {
  if (!details) return null;
  
  const answers = details.answers.map(response => {
    const answer = response.answers.find(a => a.questionId === details.questionId);
    return answer ? answer.answer : '';
  }).filter(answer => answer !== '');

  return {
    questionId: details.questionId,
    question: details.question.text,
    type: details.question.type,
    answers
  };
};

// Remplacer la constante HIGHLIGHT_COLORS par une constante PATH_COLORS plus claire
const PATH_COLORS: { [key: string]: string } = {
  'A': '#8A2BE2', // Violet
  'B': '#1E90FF', // Bleu dodger
  'C': '#FF6347', // Tomate
  'D': '#32CD32', // Vert lime
  'E': '#FF8C00', // Orange foncé
  'F': '#9932CC', // Orchidée foncée
  'G': '#20B2AA', // Turquoise
  'H': '#FF1493', // Rose profond
  'I': '#4682B4', // Bleu acier
  'J': '#00CED1', // Turquoise moyen
  'K': '#FF69B4', // Rose chaud
  'L': '#4169E1', // Bleu royal
  'M': '#2E8B57', // Vert mer
  'N': '#DAA520', // Or
  'O': '#4B0082', // Indigo
  'P': '#FF4500', // Orange rouge
  'Q': '#008080', // Teal
  'R': '#800080', // Pourpre
  'S': '#FFD700', // Or
  'T': '#00FF00', // Vert lime
  'U': '#FF00FF', // Magenta
  'V': '#00FFFF', // Cyan
  'W': '#FFA500', // Orange
  'X': '#800000', // Marron
  'Y': '#000080', // Bleu marine
  'Z': '#008000', // Vert
};

// Fonction utilitaire pour obtenir la couleur à partir du nom du chemin
const getPathColorByName = (pathName: string): string => {
  if (pathName.startsWith('Path ') && pathName.length > 5) {
    const letter = pathName.charAt(5);
    return PATH_COLORS[letter] || '#667eea';
  }
  return '#667eea';
};

// Fonction utilitaire pour obtenir la couleur à partir de l'index
const getPathColor = (pathIndex: number): string => {
  const pathLetter = String.fromCharCode(65 + pathIndex);
  return PATH_COLORS[pathLetter] || '#667eea';
};

// Interface pour les couleurs
interface ColorItem {
  backgroundColor: string;
  borderColor: string;
}

// Fonction pour formater les dates
const formatDate = (dateString: string): string => {
  // Vérifier si la chaîne est au format ISO 8601 (comme 2025-06-09T21:00:00.000Z)
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}T/;
  
  if (isoDatePattern.test(dateString)) {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      // Les mois sont indexés à partir de 0, donc on ajoute 1
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    } catch (error) {
      // En cas d'erreur de parsing, retourner la date originale
      return dateString;
    }
  }
  
  return dateString;
};

// Désactiver le comportement des légendes au clic
const preventLegendClickBehavior = (e: any, legendItem: any, legend: any) => {
  e.stopPropagation();
  return false; // Empêche l'action par défaut
};

// Fonction utilitaire pour générer des couleurs distinctes
const generateDistinctColors = (count: number): ColorItem[] => {
  const colors: ColorItem[] = [];
  
  // Palette de couleurs de base
  const baseColors = [
    { h: 234, s: 60, l: 60 }, // Bleu (#667eea)
    { h: 271, s: 60, l: 60 }, // Violet (#764ba2)
    { h: 142, s: 60, l: 60 }, // Vert (#4caf50)
    { h: 24, s: 60, l: 60 },  // Orange (#ff9800)
    { h: 340, s: 60, l: 60 }, // Rose (#e91e63)
    { h: 187, s: 60, l: 60 }, // Cyan (#00bcd4)
    { h: 45, s: 60, l: 60 },  // Jaune (#ffc107)
    { h: 326, s: 60, l: 60 }, // Magenta (#e91e63)
    { h: 162, s: 60, l: 60 }, // Turquoise (#009688)
    { h: 355, s: 60, l: 60 }, // Rouge (#f44336)
  ];
  
  // Si nous avons besoin de plus de couleurs que la palette de base
  if (count > baseColors.length) {
    // Générer des couleurs supplémentaires en variant la teinte
    for (let i = 0; i < count; i++) {
      const hue = (i * 360 / count) % 360;
      const saturation = 60 + (i % 10); // Légère variation de saturation
      const lightness = 60 + (i % 10);  // Légère variation de luminosité
      
      colors.push({
        backgroundColor: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.6)`,
        borderColor: `hsla(${hue}, ${saturation}%, ${lightness}%, 1)`
      });
    }
  } else {
    // Utiliser la palette de base
    baseColors.slice(0, count).forEach(color => {
      colors.push({
        backgroundColor: `hsla(${color.h}, ${color.s}%, ${color.l}%, 0.6)`,
        borderColor: `hsla(${color.h}, ${color.s}%, ${color.l}%, 1)`
      });
    });
  }
  
  return colors;
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
  const [chartTypes, setChartTypes] = useState<{ [key: string]: ChartType }>({});
  const [showResponseDetails, setShowResponseDetails] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);
  const [filters, setFilters] = useState<Filters>({
    demographic: {},
    answers: {}
  });
  const [filteredResponses, setFilteredResponses] = useState<SurveyResponse[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionDetailsSurveyFormat | null>(null);
  const [showAllResponses, setShowAllResponses] = useState<{[key: string]: boolean}>({});
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPaths, setSelectedPaths] = useState<PathSegment[][]>([]);
  const [analysisGroups, setAnalysisGroups] = useState<AnalysisGroup[]>([]);
  const [filteredResponsesByPath, setFilteredResponsesByPath] = useState<SurveyResponse[]>([]);
  const [pathFilterActive, setPathFilterActive] = useState(false);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [allPaths, setAllPaths] = useState<{name: string, path: PathSegment[]}[]>([]);
  const [showPrivateLink, setShowPrivateLink] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [filteredPathResponses, setFilteredPathResponses] = useState<SurveyResponse[]>([]);
  const [currentFilters, setCurrentFilters] = useState<Filters>({
    demographic: {},
    answers: {}
  });
  const [persistentFilters, setPersistentFilters] = useState<Filters>({
    demographic: {},
    answers: {}
  });
  const [isPathFiltered, setIsPathFiltered] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<Filters | undefined>(undefined);
  const pathNamesRef = useRef<{[key: string]: string}>({});
  const pathColorsRef = useRef<{[key: string]: string}>({});

  // Ajouter en début de composant
  console.log("COMPONENT RENDER - Initial state:", {
    responsesLength: responses.length,
    filteredResponsesLength: filteredResponses.length,
    filterState: filters
  });

  // Ajouter un useEffect pour suivre les changements d'état
  useEffect(() => {
    console.log("FILTER STATE CHANGE:", filters);
  }, [filters]);

  // Ajouter un useEffect pour suivre les changements de filteredResponses
  useEffect(() => {
    console.log("FILTERED RESPONSES CHANGE:", filteredResponses.length);
  }, [filteredResponses]);

  // Charger les réponses au montage du composant
  useEffect(() => {
    console.log('SurveyAnalytics mounted with survey:', {
      id: survey._id,
      title: survey.title,
      isDynamic: survey.isDynamic,
      hasQuestions: !!survey.questions,
      questionsLength: survey.questions?.length,
      hasNodes: !!survey.nodes,
      nodesLength: survey.nodes?.length,
      responsesCount: responses.length
    });
    
    // Normaliser les données du sondage si nécessaire
    if (survey.isDynamic && survey.nodes && !survey.questions) {
      // Si c'est un sondage dynamique sans propriété questions, la créer
      console.log('Normalizing dynamic survey data for compatibility');
      
      // Ceci peut être fait sans modifier le state original
      const questionNodes = survey.nodes.filter(node => 
        node.type === 'question' || 
        node.type === 'multipleChoice' || 
        node.type === 'textInput' ||
        node.type === 'ratingScale'
      );
      
      console.log(`Found ${questionNodes.length} question nodes to normalize`);
    }
    
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
  }, [survey, responses]);

  // Mettre à jour les réponses filtrées quand les réponses changent
  useEffect(() => {
    setFilteredResponses(responses);
  }, [responses]);

  // Modifier cette ligne pour définir l'onglet des statistiques démographiques par défaut
  // si le sondage est dynamique
  useEffect(() => {
    if (survey.isDynamic) {
      setActiveTab(1); // Utiliser l'index 1 pour les sondages dynamiques (Answer Filters)
    }
  }, [survey]);

  // Mettre à jour les noms et couleurs des chemins quand selectedPaths change
  useEffect(() => {
    selectedPaths.forEach((path, index) => {
      const pathKey = path.map(segment => `${segment.questionId}-${segment.answer}`).join('|');
      if (!pathNamesRef.current[pathKey]) {
        const pathName = allPaths.find(p => 
          p.path.length === path.length && 
          p.path.every((segment, i) => 
            segment.questionId === path[i].questionId && 
            segment.answer === path[i].answer
          )
        )?.name || `Path ${String.fromCharCode(65 + index)}`;
        pathNamesRef.current[pathKey] = pathName;
      }
      if (!pathColorsRef.current[pathKey]) {
        // Utiliser la fonction getPathColorByName pour assigner une couleur statique
        pathColorsRef.current[pathKey] = getPathColorByName(pathNamesRef.current[pathKey]);
      }
    });
  }, [selectedPaths, allPaths]);

  const analyzeResponses = useCallback((questionId: string) => {
    const answerCounts: { [key: string]: number } = {};
    let total = 0;
    
    // Utiliser les réponses filtrées si elles existent, sinon utiliser toutes les réponses
    const responsesToAnalyze = filteredResponses.length > 0 ? filteredResponses : surveyAnswers;
    
    responsesToAnalyze.forEach(response => {
      const answer = response.answers.find(a => a.questionId === questionId);
      if (answer) {
        answerCounts[answer.answer] = (answerCounts[answer.answer] || 0) + 1;
        total++;
      }
    });
    
    return { answerCounts, total };
  }, [filteredResponses, surveyAnswers]);

  const getChartData = useCallback((questionId: string, customColors?: ColorItem[]) => {
    const { answerCounts } = analyzeResponses(questionId);
    
    // Vérifier le type de question pour déterminer si c'est une date
    const question = survey.questions.find(q => q.id === questionId);
    const isDateType = question?.type === 'date';
    
    // Formatter les labels de date si nécessaire
    const formattedLabels = Object.keys(answerCounts).map(label => 
      isDateType || /^\d{4}-\d{2}-\d{2}T/.test(label) ? formatDate(label) : label
    );
    
    // Créer un tableau de valeurs correspondant aux labels formatés
    const dataValues = Object.values(answerCounts);
    
    // Utiliser des couleurs personnalisées si fournies, sinon utiliser les couleurs par défaut
    let backgroundColorsArray, borderColorsArray;
    
    if (customColors && customColors.length > 0) {
      // Utiliser les couleurs personnalisées
      backgroundColorsArray = formattedLabels.map((_, i) => 
        customColors[i % customColors.length].backgroundColor
      );
      borderColorsArray = formattedLabels.map((_, i) => 
        customColors[i % customColors.length].borderColor
      );
    } else {
      // Utiliser les couleurs par défaut ou générer des couleurs distinctes
      const colors = generateDistinctColors(formattedLabels.length);
      backgroundColorsArray = colors.map(color => color.backgroundColor);
      borderColorsArray = colors.map(color => color.borderColor);
    }
    
    return {
      labels: formattedLabels,
      datasets: [{
        label: 'Responses',
        data: dataValues,
        backgroundColor: backgroundColorsArray,
        borderColor: borderColorsArray,
        borderWidth: 1,
      }],
    };
  }, [analyzeResponses, survey.questions]);

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
  const renderChart = (questionId: string, chartType: ChartType, colors?: ColorItem[]) => {
    const data = getChartData(questionId, colors);
    const options = ['pie', 'doughnut'].includes(chartType) ? pieOptions : commonChartOptions;

    // Ajuster les options pour maintenir une taille cohérente
    const chartOptions = {
      ...options,
      maintainAspectRatio: true,
      responsive: true,
      plugins: {
        ...options.plugins,
        legend: {
          ...options.plugins.legend,
          onClick: preventLegendClickBehavior
        }
      }
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

    filteredResponses.forEach(response => {
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
  }, [filteredResponses]);

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
    const totalResponses = filteredResponses.length;
    const responsesPerDay = totalResponses / (Math.max(1, getDaysBetweenDates(
      new Date(Math.min(...filteredResponses.map(r => new Date(r.submittedAt).getTime()))),
      new Date()
    )));
    
    const completionRates = survey.questions.map(question => {
      const answeredCount = filteredResponses.filter(response => 
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
  }, [filteredResponses, survey.questions]);

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
  const handleApplyFilters = useCallback((filters: Filters) => {
    const filtered = responses.filter(response => {
      // Filtrage démographique
      if (filters.demographic) {
        const demographic = response.respondent?.demographic;
        
        // Vérification du genre
        if (filters.demographic.gender && demographic?.gender !== filters.demographic.gender) {
          return false;
        }
        
        // Vérification du niveau d'éducation
        if (filters.demographic.educationLevel && 
            demographic?.educationLevel !== filters.demographic.educationLevel) {
          return false;
        }
        
        // Vérification de la ville
        if (filters.demographic.city && demographic?.city !== filters.demographic.city) {
          return false;
        }
        
        // Vérification de l'âge
        if (filters.demographic.age && demographic?.dateOfBirth) {
          const age = calculateAge(new Date(demographic.dateOfBirth));
          if (age < filters.demographic.age[0] || age > filters.demographic.age[1]) {
            return false;
          }
        }
      }
      
      // Filtrage des réponses
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
    
    setFilteredResponses(filtered);
  }, [responses]);

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
    // Pour les questions extraites des sondages dynamiques, assurez-vous que questionId est défini
    const questionId = question.id;
    if (!questionId) return null;
    
    const stats = calculateQuestionStats(questionId);
    
    if (stats.total === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {filteredResponses.length === 0 && surveyAnswers.length > 0 
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
              {Object.entries(stats.answerCounts || {}).map(([answer, count]) => (
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
        const entries = Object.entries(stats.answerCounts || {});
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
              {filteredResponses.length < surveyAnswers.length && (
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
        const values = Object.keys(stats.answerCounts || {}).map(Number).sort((a, b) => a - b);
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
    // Utiliser getQuestionsToDisplay() pour obtenir les questions, qu'elles soient standard ou dynamiques
    const allQuestions = getQuestionsToDisplay();
    const question = allQuestions.find(q => q.id === questionId);
    
    if (!question) {
      console.error(`Question avec ID ${questionId} non trouvée`);
      return;
    }
    
    // Filtrer les réponses pour cette question
    const questionAnswers = filteredResponses.filter(response => 
      response.answers.some(a => a.questionId === questionId)
    );
    
    // Définir la question sélectionnée avec ses réponses
    setSelectedQuestion({
      questionId,
      question,
      answers: questionAnswers
    });
    
    // Ouvrir la boîte de dialogue
    setShowResponseDetails(true);
  };

  // Fonction pour préparer les données pour l'exportation
  const prepareExportData = useCallback(() => {
    if (!survey || filteredResponses.length === 0) return [];

    return filteredResponses.map(response => {
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
  }, [survey, filteredResponses]);

  // Fonction pour exporter en CSV
  const exportToCSV = useCallback(() => {
    if (!survey) return;

    const data = prepareExportData();
    if (data.length === 0) return;

    // Créer les en-têtes
    const headers = [
      'Respondent ID',
      'Submission date',
      'Gender',
      'Date of birth',
      'Education level',
      'City',
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
    link.download = `survey_results_${survey._id}.csv`;
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
    link.download = `survey_results_${survey._id}.json`;
    link.click();
  }, [survey, prepareExportData]);

  // Fonction pour obtenir les questions à afficher (questions standard ou nœuds pour les sondages dynamiques)
  const getQuestionsToDisplay = () => {
    if (!survey) return [];
    
    // Si c'est un sondage dynamique, extraire les questions des nodes
    if (survey.isDynamic && survey.nodes) {
      return survey.nodes
        .filter(node => 
          node.type === 'questionNode' || 
          node.type === 'question' || 
          (node.data && (node.data.questionType || node.data.type || node.data.text || node.data.label))
        )
        .map(node => {
          // Extraire les données de question du nœud
          const nodeData = node.data || {};
          return {
            id: node.id,
            text: nodeData.text || nodeData.label || 'Question without title',
            type: mapNodeTypeToQuestionType(nodeData.questionType || nodeData.type || 'text'),
            options: nodeData.options || [],
            isCritical: nodeData.isCritical || false,
            questionNumber: nodeData.questionNumber || 0
          };
        })
        .sort((a, b) => a.questionNumber - b.questionNumber); // Trier par numéro de question
    }
    
    // Sinon, retourner les questions standards
    return survey.questions || [];
  };

  // Fonction d'aide pour mapper les types de nœuds aux types de questions
  const mapNodeTypeToQuestionType = (nodeType: string): string => {
    switch (nodeType) {
      case 'multipleChoice':
        return 'multiple-choice';
      case 'textInput':
        return 'text';
      case 'ratingScale':
        return 'rating';
      case 'question':
        return 'multiple-choice'; // Par défaut, considérer comme choix multiple
      default:
        return nodeType;
    }
  };

  // Fonction pour déterminer le filtre de genre à partir des réponses
  const determineGenderFilter = (responses: SurveyResponse[]): string | undefined => {
    // Si toutes les réponses ont le même genre, c'est probablement le filtre appliqué
    const genders = responses
      .map(r => r.respondent?.demographic?.gender)
      .filter(g => g !== undefined && g !== null) as string[];
    
    // Si tous les genres sont identiques et il y a au moins une réponse
    if (genders.length > 0 && new Set(genders).size === 1) {
      return genders[0];
    }
    
    return undefined; // Aucun filtre spécifique identifié
  };

  // Fonction pour déterminer le filtre de niveau d'éducation
  const determineEducationFilter = (responses: SurveyResponse[]): string | undefined => {
    const educationLevels = responses
      .map(r => r.respondent?.demographic?.educationLevel)
      .filter(e => e !== undefined && e !== null) as string[];
    
    if (educationLevels.length > 0 && new Set(educationLevels).size === 1) {
      return educationLevels[0];
    }
    
    return undefined;
  };

  // Modifier la fonction handleAdvancedFilterApply pour qu'elle accepte un paramètre optionnel
  const handleAdvancedFilterApply = (filteredResps: SurveyResponse[], appliedFilters?: Filters) => {
    setFilteredResponses(filteredResps);
    
    // Sauvegarder les filtres appliqués s'ils sont fournis
    if (appliedFilters) {
      setPersistentFilters(appliedFilters);
      setAppliedFilters(appliedFilters); // Mettre à jour également appliedFilters
    }
    
    // IMPORTANT: Ne pas masquer le panneau de filtres ici
    // setShowFilters(false); - Supprimer cette ligne ou la mettre en commentaire
  };

  // Ajouter ces nouvelles fonctions de gestionnaire
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handlePathSelection = (path: PathSegment[]) => {
    // Vérifier si le chemin est déjà sélectionné
    const pathIndex = selectedPaths.findIndex(
      p => JSON.stringify(p) === JSON.stringify(path)
    );
    
    // Log détaillé du chemin sélectionné
    console.log("=== Détails du chemin sélectionné ===");
    console.log("Chemin:", path.map(segment => ({
      questionId: segment.questionId,
      questionText: segment.questionText,
      answer: segment.answer
    })));
    console.log("Action:", pathIndex >= 0 ? "Suppression du chemin" : "Ajout du chemin");
    console.log("=================================");
    
    if (pathIndex >= 0) {
      // Si déjà sélectionné, le supprimer
      const newSelectedPaths = selectedPaths.filter((_, i) => i !== pathIndex);
      setSelectedPaths(newSelectedPaths);
      console.log("Chemins restants après suppression:", newSelectedPaths.length);
    } else {
      // Sinon, l'ajouter
      const newSelectedPaths = [...selectedPaths, path];
      setSelectedPaths(newSelectedPaths);
      console.log("Nombre total de chemins sélectionnés:", newSelectedPaths.length);
    }
  };

  const handleCreateGroup = (name: string, paths: PathSegment[][]) => {
    const newGroup: AnalysisGroup = {
      id: `group-${Date.now()}`,
      name,
      paths,
      respondentCount: getRespondentCountForPaths(paths, filteredResponses),
      createdAt: new Date()
    };
    
    setAnalysisGroups([...analysisGroups, newGroup]);
    setSelectedPaths([]); // Réinitialiser la sélection
  };

  const handleSelectGroup = (groupId: string) => {
    const group = analysisGroups.find(g => g.id === groupId);
    if (group) {
      setSelectedPaths(group.paths);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    setAnalysisGroups(analysisGroups.filter(g => g.id !== groupId));
  };

  const handleRenameGroup = (groupId: string, newName: string) => {
    setAnalysisGroups(analysisGroups.map(g => 
      g.id === groupId ? { ...g, name: newName } : g
    ));
  };

  // Ajouter cette fonction utilitaire
  const getRespondentCountForPaths = (paths: PathSegment[][], responses: SurveyResponse[]): number => {
    // Cette implémentation est simplifiée
    // Dans une vraie application, vous devriez filtrer les réponses
    // qui correspondent exactement à l'un des chemins
    return Math.min(
      responses.length,
      Math.max(1, Math.floor(responses.length * 0.3)) // Exemple : 30% des réponses
    );
  };

  console.log('État actuel:', {
    activeTab,
    isDynamicSurvey: survey?.isDynamic,
    tabsVisibles: true,
    responsesCount: filteredResponses?.length
  });

  // Ajoutez cette condition pour vérifier si le sondage est dynamique
  if (!survey.isDynamic) {
    console.log("This survey is not dynamic - the path analysis tab will not be relevant");
  }

  // Mettre à jour handlePathFilterChange pour utiliser les réponses filtrées
  const handlePathFilterChange = (isFiltered: boolean, filteredResps: SurveyResponse[]) => {
    console.log("=== Path filter change ===");
    console.log("Filter active:", isFiltered);
    console.log("Number of filtered responses:", filteredResps.length);
    console.log("Number of selected paths:", selectedPaths.length);
    
    // Log détaillé des chemins sélectionnés
    if (selectedPaths.length > 0) {
      console.log("Selected paths:");
      selectedPaths.forEach((path, index) => {
        console.log(`  Path ${index + 1}:`, path.map(segment => ({
          question: segment.questionText,
          réponse: segment.answer
        })));
      });
    }
    
    // Log des réponses filtrées (limité pour éviter de surcharger la console)
    if (filteredResps.length > 0) {
      console.log("Example of filtered responses (max 3):");
      filteredResps.slice(0, 3).forEach((resp, index) => {
        console.log(`  Response ${index + 1} (ID: ${resp._id}):`, resp.answers.map(a => ({
          questionId: a.questionId,
          answer: a.answer
        })));
      });
      
      if (filteredResps.length > 3) {
        console.log(`  ... and ${filteredResps.length - 3} other responses`);
      }
    }
    console.log("==================================");
    
    // Mettre à jour l'état des réponses filtrées
    setFilteredResponsesByPath(filteredResps);
    
    // S'assurer que l'état de filtrage est correctement mis à jour
    setPathFilterActive(isFiltered);
    setIsPathFiltered(isFiltered);
    
    // Si le filtre est activé, nous devons mettre à jour les réponses affichées
    if (isFiltered) {
      // Réinitialiser les filtres avancés si nécessaire
      setAppliedFilters(undefined);
      
      // Assurons-nous que les filtres par chemin prennent priorité
      setFilteredResponses(filteredResps);
    } else {
      // Si le filtre est désactivé, revenir aux réponses d'origine ou aux réponses avec filtres avancés
      if (appliedFilters && Object.keys(appliedFilters.demographic).length > 0 || 
          appliedFilters && Object.keys(appliedFilters.answers).length > 0) {
        // Réappliquer les filtres avancés si nécessaire
        handleAdvancedFilterApply(filteredResponses, appliedFilters);
      } else {
        // Sinon, revenir aux réponses d'origine
        setFilteredResponses(responses);
      }
    }
  };
  
  // Déterminez quelles réponses afficher en fonction des filtres actifs
  const displayResponses = pathFilterActive 
    ? filteredResponsesByPath 
    : (filteredResponses.length > 0 ? filteredResponses : responses);

  // Cette fonction va afficher les résultats de filtrage dans la console pour le débogage
  useEffect(() => {
    if (pathFilterActive) {
      console.log("Path filter mode active:", filteredPathResponses.length, "responses");
    } else if (filteredResponses.length > 0) {
      console.log("Standard filters applied:", filteredResponses.length, "responses");
    } else {
      console.log("No active filters:", responses.length, "responses");
    }
  }, [pathFilterActive, filteredPathResponses, filteredResponses, responses]);

  // Définissez cette fonction de callback
  const handlePathsLoad = (paths: {name: string, path: PathSegment[], group: string}[]) => {
    setAllPaths(paths);
  };

  // Vérifier si le sondage est privé
  const isPrivateSurvey = Boolean(
    survey?.isPrivate || 
    survey?.privateLink || 
    (survey?.title && survey.title.toLowerCase().includes('private'))
  );
  
  // Construire le lien privé
  const privateLink = survey?.privateLink || `${window.location.origin}/survey-answer?surveyId=${survey?._id}`;
  
  // Fonction pour copier le lien privé
  const copyToClipboard = () => {
    navigator.clipboard.writeText(privateLink).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Fonction pour réinitialiser les filtres
  const handleResetFilters = () => {
    setFilteredResponses(responses);
    setPersistentFilters({
      demographic: {},
      answers: {}
    });
    setAppliedFilters(undefined); // Réinitialiser également appliedFilters
  };

  // Remplacer l'utilisation directe de selectedQuestion par la version convertie
  const dialogQuestion = convertToDialogFormat(selectedQuestion);

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
          {filteredResponses.length !== responses.length && (
            <Chip 
              size="small" 
              icon={<FilterListIcon />} 
              label={`Filtered: ${filteredResponses.length}/${responses.length}`}
              sx={{ ml: 1, backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#ff9800' }}
            />
          )}
        </Typography>
        
        <Box>
          {isPrivateSurvey && (
            <Button
              variant={showPrivateLink ? "contained" : "outlined"}
              startIcon={showPrivateLink ? <LinkIcon /> : <LinkIcon />}
              onClick={() => setShowPrivateLink(!showPrivateLink)}
              aria-label={showPrivateLink ? "Hide Link" : "Show Link"}
              sx={{
                mr: 1,
                ...(showPrivateLink ? {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                } : {})
              }}
            >
              {showPrivateLink ? "Hide Link" : "Show Link"}
            </Button>
          )}
          
          <Button
            variant={showFilters ? "contained" : "outlined"}
            startIcon={showFilters ? <ClearIcon /> : <FilterListIcon />}
            onClick={() => {
              
              setShowFilters(!showFilters);
            }}
            aria-label="Filters"
            sx={{
              ...(showFilters ? {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              } : {})
            }}
          >
            {showFilters ? "Hide Filters" : "Filters"}
          </Button>
        </Box>
      </Box>

      {/* NOUVEAU: Section du lien privé - apparaît seulement pour les sondages privés */}
      {isPrivateSurvey && showPrivateLink && (
        <Alert 
          severity="info"
          action={
            <>
              <Button 
                color="inherit" 
                size="small" 
                onClick={copyToClipboard}
                startIcon={copySuccess ? <CheckIcon /> : <ContentCopyIcon />}
                sx={{ mr: 1 }}
              >
                {copySuccess ? 'Copied!' : 'Copy'}
              </Button>
              <IconButton 
                color="inherit" 
                size="small" 
                onClick={() => setShowPrivateLink(false)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          }
          sx={{ mb: 3 }}
        >
          <AlertTitle>Private Survey Link</AlertTitle>
          <Box 
            component="span" 
            sx={{ 
              display: 'block',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              bgcolor: 'rgba(0, 0, 0, 0.05)',
              p: 1,
              borderRadius: 1
            }}
          >
            {privateLink}
          </Box>
        </Alert>
      )}

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
                  key={`filter-panel-${pathFilterActive ? "path" : "standard"}-${displayResponses.length}`}
                  survey={{
                    ...survey,
                    questions: getQuestionsToDisplay(),
                    isDynamic: survey.isDynamic || false
                  }}
                  responses={displayResponses}
                  onApplyFilters={(filteredResps, appliedFilters) => {
                    handleAdvancedFilterApply(filteredResps, appliedFilters || persistentFilters);
                  }}
                  pathFilterActive={isPathFiltered}
                  onResetFilters={handleResetFilters}
                  initialFilters={appliedFilters}
                  selectedPaths={selectedPaths}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
              </Grid>
            )}

            {survey.isDynamic && (
              <Grid item xs={12}>
                <Box sx={{ height: '600px' }}>
                  <PathTreeVisualizer 
                    survey={survey} 
                    responses={displayResponses}
                    onPathSelect={handlePathSelection}
                    selectedPaths={selectedPaths}
                    onFilterChange={handlePathFilterChange}
                    onPathsLoad={handlePathsLoad}
                    pathColors={pathColorsRef.current}
                  />
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#1a237e' }}>
                  Survey Questions
                </Typography>
              
                {getQuestionsToDisplay().map((question, index) => {
                  const stats = calculateQuestionStats(question.id);
                  
                  // Nouvelles lignes: trouver les parcours associés à cette question
                  const associatedPaths = selectedPaths.filter(path => 
                    path.some(segment => segment.questionId === question.id)
                  );
                  
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
                      className="question-card"
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
                        
                        {/* Badges pour les chemins sélectionnés */}
                        {selectedPaths.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                            {selectedPaths.map((path, pathIndex) => {
                              const isInPath = path.some(segment => segment.questionId === question.id);
                              if (!isInPath) return null;

                              const pathKey = path.map(segment => `${segment.questionId}-${segment.answer}`).join('|');
                              const pathName = pathNamesRef.current[pathKey] || `Path ${String.fromCharCode(65 + pathIndex)}`;
                              // Utiliser la fonction getPathColorByName pour obtenir la couleur statique
                              const pathColor = getPathColorByName(pathName);
                              
                              const isInFilteredPaths = filteredResponsesByPath.length > 0 
                                ? filteredResponsesByPath.some(response => 
                                    response.answers.some(answer => 
                                      path.some(segment => 
                                        segment.questionId === answer.questionId && 
                                        segment.answer === answer.answer
                                      )
                                    )
                                  )
                                : true;
                              
                              return (
                                <Chip
                                  key={pathKey}
                                  label={pathName}
                                  size="small"
                                  sx={{
                                    backgroundColor: isInFilteredPaths ? `${pathColor}20` : 'rgba(0, 0, 0, 0.1)',
                                    color: isInFilteredPaths ? pathColor : 'rgba(0, 0, 0, 0.3)',
                                    border: `1px solid ${isInFilteredPaths ? pathColor : 'rgba(0, 0, 0, 0.1)'}`,
                                    '& .MuiChip-label': {
                                      fontWeight: 'medium'
                                    }
                                  }}
                                />
                              );
                            })}
                          </Box>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2">
                            Total responses: <strong>{stats.total}</strong>
                          </Typography>
                          {filteredResponses.length !== responses.length && (
                            <Typography variant="caption" color="text.secondary">
                              (Filtered from {responses.length} total responses)
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
                            aria-label="Show details"
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
                </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }} className="general-statistics-paper">
                    <Typography variant="h6" sx={{ mb: 2, color: '#1a237e' }}>
                      General Statistics
                    </Typography>
                    
                    <Box sx={{ mb: 3 }} className="general-statistics-section">
                      <Typography variant="body2" color="text.secondary">
                        Total responses: <strong>{filteredResponses.length}</strong>
                      </Typography>
                      {filteredResponses.length !== responses.length && (
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
                            {filteredResponses.length > 0 ? 
                              new Date(Math.min(...filteredResponses.map(r => new Date(r.submittedAt).getTime()))).toLocaleDateString() :
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
                            {filteredResponses.length > 0 ? 
                              (filteredResponses.length / Math.max(1, getDaysBetweenDates(
                                new Date(Math.min(...filteredResponses.map(r => new Date(r.submittedAt).getTime()))),
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
                            {filteredResponses.length > 0 ? 
                              new Date(Math.max(...filteredResponses.map(r => new Date(r.submittedAt).getTime()))).toLocaleDateString() :
                              'No response'
                            }
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {filteredResponses.length > 0 && (
                      <Box sx={{ 
                        mt: 4,
                        width: '100%',
                      }}>
                        <Typography variant="h6" sx={{ mb: 3, color: '#1a237e', fontWeight: 'medium', textAlign: 'center' }}>
                          Participation Trend Analysis
                        </Typography>
                        
                        {(() => {
                          const trends = getResponseTrends(filteredResponses);
                          
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
                    {filteredResponses.length > 0 && (
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
                            aria-label="Export to CSV"
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
                            aria-label="Export to JSON"
                                sx={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                          }
                        }}
                        className="export-json-button"
                      >
                        Export to JSON
                          </Button>
                        </Stack>
                      </Box>
                  )}
                    </Paper>
                  </Grid>

              {/* Ajouter la section des statistiques démographiques si des données démographiques sont disponibles */}
              {survey.demographicEnabled && filteredResponses.some(response => response.respondent?.demographic) && (
                <Grid item xs={12}>
                  <DemographicStatistics 
                    survey={survey}
                    responses={responses}
                    filteredResponses={filteredResponses} // Utiliser uniquement filteredResponses
                    handleTabChange={handleTabChange}
                    activeTab={activeTab}
                    handlePathSelection={handlePathSelection}
                    selectedPaths={selectedPaths}
                    analysisGroups={analysisGroups}
                    onCreateGroup={handleCreateGroup}
                    onSelectGroup={handleSelectGroup}
                    onDeleteGroup={handleDeleteGroup}
                    onRenameGroup={handleRenameGroup}
                  />
            </Grid>
          )}
            </Grid>
          )}
        </Box>

        {/* Remplacer la boîte de dialogue existante par le nouveau composant */}
        <QuestionDetailsDialog
          open={!!selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          question={dialogQuestion}
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