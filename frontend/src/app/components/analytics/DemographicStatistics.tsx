import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Zoom,
  Chip,
  Stack
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  ScatterController,
} from 'chart.js';
import { Bar, Pie, Line, Doughnut, Scatter } from 'react-chartjs-2';
import { calculateAge } from '../../../utils/dateUtils';
import { PathTreeVisualizer, PathSegment } from './PathTreeVisualizer';
import { SelectedPathsPanel } from './SelectedPathsPanel';
import { AnalysisGroup, GroupsListProps } from './GroupsList';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PieChartIcon from '@mui/icons-material/PieChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';

// Register necessary Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  ScatterController
);

// Types
interface SurveyResponse {
  _id: string;
  surveyId: string;
  answers: {
    questionId: string;
    answer: string;
  }[];
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

interface DemographicStats {
  gender: { [key: string]: number };
  education: { [key: string]: number };
  city: { [key: string]: number };
  ageDistribution: number[];
}

interface Survey {
  _id: string;
  title: string;
  questions: any[];
  nodes?: any[];
  edges?: any[];
  isDynamic?: boolean;
}

interface DemographicStatisticsProps {
  survey: Survey;
  responses: SurveyResponse[];
  filteredResponses: SurveyResponse[];
  handleTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  activeTab: number;
  handlePathSelection: (path: PathSegment[]) => void;
  selectedPaths: PathSegment[][];
  analysisGroups: AnalysisGroup[];
  onCreateGroup: (name: string, paths: PathSegment[][]) => void;
  onSelectGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
}

// Common options for charts
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
  },
  layout: {
    padding: {
      top: 10,
      bottom: 10,
      left: 10,
      right: 10
    }
  }
};

// Options for pie charts
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
      right: 20,
      top: 15,
      bottom: 15
    }
  },
  elements: {
    arc: {
      borderWidth: 1,
      borderColor: '#fff',
      borderAlign: 'center' as const
    }
  }
};

// Colors for charts
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

// Nombre d'éléments à afficher dans la vue tronquée
const MAX_DISPLAYED_ITEMS = 5;

// Fonction utilitaire pour générer des couleurs distinctes
const generateDistinctColors = (count: number) => {
  const colors = [];
  
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

export const DemographicStatistics: React.FC<DemographicStatisticsProps> = ({
  survey,
  responses,
  filteredResponses,
  handleTabChange,
  activeTab,
  handlePathSelection,
  selectedPaths,
  analysisGroups,
  onCreateGroup,
  onSelectGroup,
  onDeleteGroup,
  onRenameGroup,
}) => {
  // Utiliser toujours les réponses filtrées si disponibles
  const displayedResponses = filteredResponses || responses;
  
  // États pour gérer la boîte de dialogue
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentChart, setCurrentChart] = useState<string>('');
  const [currentTitle, setCurrentTitle] = useState<string>('');
  
  // Effet pour recalculer les statistiques lorsque les réponses filtrées changent
  useEffect(() => {
    // Recalculer les statistiques ici
    // ...
  }, [displayedResponses]);

  // Function to calculate demographic statistics
  const calculateDemographicStats = useCallback((): DemographicStats => {
    const stats: DemographicStats = {
      gender: {},
      education: {},
      city: {},
      ageDistribution: Array(121).fill(0) // To store ages from 0 to 120 years
    };

    displayedResponses.forEach(response => {
      if (response.respondent?.demographic) {
        const { gender, educationLevel, city, dateOfBirth } = response.respondent.demographic;
        
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
          if (age >= 0 && age <= 120) {
            stats.ageDistribution[age]++;
          }
        }
      }
    });

    return stats;
  }, [displayedResponses]);

  // Calculate statistics
  const stats = calculateDemographicStats();
  
  // Fonction pour tronquer les données tout en conservant les plus importantes
  const truncateData = (data: { [key: string]: number }, maxItems: number = MAX_DISPLAYED_ITEMS) => {
    const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    
    if (sortedEntries.length <= maxItems) {
      return { data, isTruncated: false, total: sortedEntries.length };
    }
    
    // Prendre les maxItems éléments les plus importants
    const truncatedData: { [key: string]: number } = {};
    sortedEntries.slice(0, maxItems).forEach(([key, value]) => {
      truncatedData[key] = value;
    });
    
    return { 
      data: truncatedData, 
      isTruncated: true, 
      total: sortedEntries.length,
      allData: data
    };
  };
  
  // Fonction pour ouvrir la boîte de dialogue avec le graphique spécifié
  const handleOpenDialog = (chartType: string, title: string) => {
    setCurrentChart(chartType);
    setCurrentTitle(title);
    setDialogOpen(true);
  };
  
  // Fonction pour fermer la boîte de dialogue
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Function to render the age chart
  const renderAgeChart = (fullSize: boolean = false) => {
    // Create data for scatter chart
    const ageDistribution: { [key: string]: number } = {};
    
    // Filter ages that have at least one response
    stats.ageDistribution.forEach((count, age) => {
      if (count > 0) {
        ageDistribution[age] = count;
      }
    });
    
    // Si ce n'est pas la vue complète et qu'il y a beaucoup d'âges, tronquer
    let truncatedAges = ageDistribution;
    let isTruncated = false;
    let totalAges = Object.keys(ageDistribution).length;
    
    if (!fullSize && Object.keys(ageDistribution).length > MAX_DISPLAYED_ITEMS) {
      const result = truncateData(ageDistribution);
      truncatedAges = result.data;
      isTruncated = result.isTruncated;
    }

    // Sort ages for consistent color assignment
    const sortedAges = Object.keys(truncatedAges).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Générer des couleurs distinctes pour chaque âge
    const colors = generateDistinctColors(sortedAges.length);
    
    const datasets = sortedAges.map((age, index) => ({
      label: `${age} years`,
      data: [{
        x: parseInt(age),
        y: truncatedAges[age]
      }],
      backgroundColor: colors[index].backgroundColor,
      borderColor: colors[index].borderColor,
      borderWidth: 2,
      pointRadius: fullSize ? 10 : 8,
      pointHoverRadius: fullSize ? 12 : 10,
      hoverBackgroundColor: colors[index].backgroundColor.replace('0.6', '0.8'),
      hoverBorderColor: colors[index].borderColor.replace('1)', '1.5)'),
      hoverBorderWidth: 3,
      fill: false
    }));

    const chartData = {
      datasets
    };

    return (
      <Box sx={{ 
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
      }}>
        <Scatter 
          data={chartData} 
          options={{
      responsive: true,
            maintainAspectRatio: fullSize ? false : true,
            animation: {
              duration: fullSize ? 800 : 500,
              easing: 'easeOutQuart' as const,
              delay: (context) => {
                let delay = 0;
                if (context.type === 'data' && context.mode === 'default') {
                  delay = context.dataIndex * 50 + context.datasetIndex * 100;
                }
                return delay;
              }
            },
      plugins: {
        legend: {
          display: true,
          position: 'right' as const,
          labels: {
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle',
            font: {
              size: fullSize ? 14 : 12
            }
          },
          onClick: () => {}
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const age = context.parsed.x;
              const count = context.parsed.y;
              return `${count} participant${count > 1 ? 's' : ''} aged ${age}`;
            }
          },
          titleFont: {
            size: fullSize ? 16 : 14,
            weight: 'bold' as const
          },
          bodyFont: {
            size: fullSize ? 14 : 12
          },
          padding: fullSize ? 12 : 8,
          boxPadding: 5,
          backgroundColor: 'rgba(50, 50, 50, 0.9)',
          borderColor: 'rgba(102, 126, 234, 0.6)',
          borderWidth: 1,
          caretSize: 8,
          cornerRadius: 6,
        }
      },
      interaction: {
        mode: 'nearest' as const,
        intersect: false
      },
      onClick: () => {},
      scales: {
        x: {
          type: 'linear' as const,
          position: 'bottom' as const,
          title: {
            display: true,
            text: 'Age',
            font: {
                    size: fullSize ? 16 : 14,
              weight: 'bold' as const
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
          type: 'linear' as const,
          position: 'left' as const,
          title: {
            display: true,
            text: 'Number of participants',
            font: {
                    size: fullSize ? 16 : 14,
              weight: 'bold' as const
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
      transitions: {
        active: {
          animation: {
            duration: 400,
            easing: 'easeOutQuart' as const
          }
        },
        resize: {
          animation: {
            duration: 500,
            easing: 'easeOutQuart' as const
          }
        },
        show: {
          animations: {
            x: { from: 0 },
            y: { from: 0 }
          }
        },
        hide: {
          animations: {
            x: { to: 0 },
            y: { to: 0 }
          }
        }
      },
      layout: {
        padding: {
          top: fullSize ? 30 : 20,
          bottom: fullSize ? 30 : 20,
          left: fullSize ? 20 : 10,
          right: fullSize ? 20 : 10
        },
        autoPadding: true
      }
    }} 
        />
        {isTruncated && !fullSize && (
          <Box sx={{ 
            position: 'absolute', 
            bottom: 10, 
            left: 0, 
            width: '100%', 
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            <Typography variant="caption" color="text.secondary">
              {totalAges - Object.keys(truncatedAges).length} more ages hidden. Click to view all.
            </Typography>
          </Box>
        )}
      </Box>
    );
  };
  
  // Fonction pour rendre le graphique des villes
  const renderCityChart = (fullSize: boolean = false) => {
    // Appliquer la troncature si nécessaire
    const { data: truncatedCities, isTruncated, total, allData } = truncateData(stats.city);
    
    // Générer des couleurs distinctes pour chaque ville
    const colors = generateDistinctColors(Object.keys(fullSize ? stats.city : truncatedCities).length);
    
    const chartData = {
      labels: Object.keys(fullSize ? stats.city : truncatedCities),
      datasets: [{
        data: Object.values(fullSize ? stats.city : truncatedCities),
        backgroundColor: colors.map(c => c.backgroundColor),
        borderColor: colors.map(c => c.borderColor),
        borderWidth: fullSize ? 2 : 1,
        hoverBackgroundColor: colors.map(c => c.backgroundColor.replace('0.6', '0.8')),
        hoverBorderColor: colors.map(c => c.borderColor.replace('1)', '1.5)')),
        hoverBorderWidth: 3,
        hoverOffset: fullSize ? 15 : 10
      }]
    };
    
    return (
      <Box sx={{ 
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
      }}>
        <Doughnut 
          data={chartData} 
          options={{
            ...pieOptions,
            maintainAspectRatio: fullSize ? false : true,
            animation: {
              duration: fullSize ? 800 : 500,
              easing: 'easeOutQuart' as const
            },
            plugins: {
              ...pieOptions.plugins,
              legend: {
                ...pieOptions.plugins.legend,
                position: 'right' as const,
                align: 'center' as const,
                labels: {
                  font: {
                    size: fullSize ? 14 : 12
                  },
                  padding: fullSize ? 25 : 15,
                  usePointStyle: true,
                  pointStyle: 'circle',
                  boxWidth: fullSize ? 15 : 12,
                  boxHeight: fullSize ? 15 : 12,
                },
                onClick: () => {}
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const label = context.label || '';
                    const value = context.formattedValue;
                    const percentage = (context.parsed / displayedResponses.length * 100).toFixed(1);
                    return `${label}: ${value} (${percentage}%)`;
                  }
                },
                titleFont: {
                  size: fullSize ? 16 : 14,
                  weight: 'bold' as const
                },
                bodyFont: {
                  size: fullSize ? 14 : 12
                },
                padding: fullSize ? 12 : 8,
                boxPadding: 5,
                usePointStyle: true,
                backgroundColor: 'rgba(50, 50, 50, 0.9)',
                borderColor: 'rgba(102, 126, 234, 0.6)',
                borderWidth: 1,
                caretSize: 8,
                cornerRadius: 6,
              }
            },
            layout: {
              padding: {
                top: fullSize ? 30 : 20,
                bottom: fullSize ? 30 : 20,
                left: fullSize ? 20 : 10,
                right: fullSize ? 20 : 10
              },
              autoPadding: true
            },
            elements: {
              arc: {
                borderWidth: fullSize ? 2 : 1,
                borderColor: '#fff',
                hoverBorderWidth: 3,
                hoverBorderColor: '#fff',
                hoverOffset: fullSize ? 15 : 10,
                borderAlign: 'center' as const,
                borderRadius: 1
              }
            },
            transitions: {
              active: {
                animation: {
                  duration: 400,
                  easing: 'easeOutQuart' as const
                }
              },
              resize: {
                animation: {
                  duration: 500,
                  easing: 'easeOutQuart' as const
                }
              },
              show: {
                animations: {
                  x: { from: 0 },
                  y: { from: 0 }
                }
              },
              hide: {
                animations: {
                  x: { to: 0 },
                  y: { to: 0 }
                }
              }
            }
          }} 
        />
        {isTruncated && !fullSize && (
          <Box sx={{ 
            position: 'absolute', 
            bottom: 10, 
            left: 0, 
            width: '100%', 
            textAlign: 'center',
            pointerEvents: 'none',
            opacity: 0.8,
            transition: 'opacity 0.3s ease',
            '&:hover': {
              opacity: 1
            }
          }}>
            <Typography variant="caption" color="text.secondary">
              {total - Object.keys(truncatedCities).length} more cities hidden. Click to view all.
            </Typography>
          </Box>
        )}
      </Box>
    );
  };
  
  // Fonction pour rendre la liste complète des villes
  const renderFullCityList = () => {
    const sortedCities = Object.entries(stats.city)
      .sort((a, b) => b[1] - a[1]);
    
    return (
      <Box sx={{ maxHeight: '300px', overflow: 'auto', mt: 2 }}>
        <List dense>
          {sortedCities.map(([city, count], index) => (
            <ListItem key={index} divider>
              <ListItemText 
                primary={city} 
                secondary={`${count} participant${count > 1 ? 's' : ''}`} 
                primaryTypographyProps={{ fontWeight: index < 3 ? 'bold' : 'normal' }}
              />
              <Chip 
                label={`${((count / displayedResponses.length) * 100).toFixed(1)}%`}
                size="small"
                color={index < 3 ? "primary" : "default"}
                sx={{ ml: 1 }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };
  
  // Fonction pour rendre la liste complète des âges
  const renderFullAgeList = () => {
    // Créer un objet avec les âges ayant des réponses
    const ageDistribution: { [key: string]: number } = {};
    stats.ageDistribution.forEach((count, age) => {
      if (count > 0) {
        ageDistribution[age] = count;
      }
    });
    
    const sortedAges = Object.entries(ageDistribution)
      .sort((a, b) => b[1] - a[1]); // Trier par nombre décroissant de participants
    
    return (
      <Box sx={{ maxHeight: '300px', overflow: 'auto', mt: 2 }}>
        <List dense>
          {sortedAges.map(([age, count], index) => (
            <ListItem key={index} divider>
              <ListItemText 
                primary={`${age} years`} 
                secondary={`${count} participant${count > 1 ? 's' : ''}`} 
                primaryTypographyProps={{ fontWeight: index < 3 ? 'bold' : 'normal' }}
              />
              <Chip 
                label={`${((count / displayedResponses.length) * 100).toFixed(1)}%`}
                size="small"
                color={index < 3 ? "primary" : "default"}
                sx={{ ml: 1 }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };

  const onClearFilters = () => {
    // Implémentation de la fonction
  };
  
  const handleClearSelection = () => {
    // Vider la sélection actuelle
    handlePathSelection([]);
  };
  
  const selectedPathsRespondents = selectedPaths.length > 0 
    ? Math.floor(filteredResponses.length * 0.3) 
    : 0;

  // Fonction pour rendre le graphique des genres avec troncature si nécessaire
  const renderGenderChart = (fullSize: boolean = false) => {
    // Appliquer la troncature si nécessaire
    const { data: truncatedGenders, isTruncated, total, allData } = truncateData(stats.gender);
    
    const chartData = {
      labels: Object.keys(fullSize ? stats.gender : truncatedGenders),
      datasets: [{
        data: Object.values(fullSize ? stats.gender : truncatedGenders),
        backgroundColor: chartColors.backgrounds,
        borderColor: chartColors.borders,
        borderWidth: fullSize ? 2 : 1,
        hoverBackgroundColor: chartColors.backgrounds.map(color => color.replace('0.6', '0.8')),
        hoverBorderColor: chartColors.borders.map(color => color.replace('1)', '1.5)')),
        hoverBorderWidth: 3,
        hoverOffset: 10,
      }]
    };
    
    return (
      <Box sx={{ 
        width: '100%',
        height: '100%',
        position: 'relative',
        transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}>
        <Pie 
          data={chartData} 
          options={{
            ...pieOptions,
            maintainAspectRatio: fullSize ? false : true,
            animation: {
              duration: fullSize ? 800 : 500,
              easing: 'easeOutQuart' as const
            },
            plugins: {
              ...pieOptions.plugins,
              legend: {
                ...pieOptions.plugins.legend,
                position: 'right' as const,
                align: 'center' as const,
                labels: {
                  font: {
                    size: fullSize ? 14 : 12
                  },
                  padding: fullSize ? 25 : 15,
                  usePointStyle: true,
                  pointStyle: 'circle',
                  boxWidth: fullSize ? 15 : 12,
                  boxHeight: fullSize ? 15 : 12,
                },
                onClick: () => {}
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const label = context.label || '';
                    const value = context.formattedValue;
                    const percentage = (context.parsed / displayedResponses.length * 100).toFixed(1);
                    return `${label}: ${value} (${percentage}%)`;
                  }
                },
                titleFont: {
                  size: fullSize ? 16 : 14,
                  weight: 'bold' as const
                },
                bodyFont: {
                  size: fullSize ? 14 : 12
                },
                padding: fullSize ? 12 : 8,
                boxPadding: 5,
                usePointStyle: true,
                backgroundColor: 'rgba(50, 50, 50, 0.9)',
                borderColor: 'rgba(102, 126, 234, 0.6)',
                borderWidth: 1,
                caretSize: 8,
                cornerRadius: 6,
              }
            },
            layout: {
              padding: {
                top: fullSize ? 30 : 20,
                bottom: fullSize ? 30 : 20,
                left: fullSize ? 20 : 10,
                right: fullSize ? 20 : 10
              },
              autoPadding: true
            },
            elements: {
              arc: {
                borderWidth: fullSize ? 2 : 1,
                borderColor: '#fff',
                hoverBorderWidth: 3,
                hoverBorderColor: '#fff',
                hoverOffset: fullSize ? 15 : 10,
                borderAlign: 'center' as const,
                borderRadius: 1
              }
            },
            transitions: {
              active: {
                animation: {
                  duration: 400,
                  easing: 'easeOutQuart' as const
                }
              },
              resize: {
                animation: {
                  duration: 500,
                  easing: 'easeOutQuart' as const
                }
              },
              show: {
                animations: {
                  x: {
                    from: 0
                  },
                  y: {
                    from: 0
                  }
                }
              },
              hide: {
                animations: {
                  x: {
                    to: 0
                  },
                  y: {
                    to: 0
                  }
                }
              }
            }
          }} 
        />
        {isTruncated && !fullSize && (
          <Box sx={{ 
            position: 'absolute', 
            bottom: 10, 
            left: 0, 
            width: '100%', 
            textAlign: 'center',
            pointerEvents: 'none',
            opacity: 0.8,
            transition: 'opacity 0.3s ease',
            '&:hover': {
              opacity: 1
            }
          }}>
            <Typography variant="caption" color="text.secondary">
              {total - Object.keys(truncatedGenders).length} more genders hidden. Click to view all.
            </Typography>
          </Box>
        )}
      </Box>
    );
  };
  
  // Fonction pour rendre le graphique des niveaux d'éducation avec troncature
  const renderEducationChart = (fullSize: boolean = false) => {
    // Appliquer la troncature si nécessaire
    const { data: truncatedEducation, isTruncated, total, allData } = truncateData(stats.education);
    
    const chartData = {
      labels: Object.keys(fullSize ? stats.education : truncatedEducation),
      datasets: [{
        data: Object.values(fullSize ? stats.education : truncatedEducation),
        backgroundColor: chartColors.backgrounds,
        borderColor: chartColors.borders,
        borderWidth: 1,
        hoverBackgroundColor: chartColors.backgrounds.map(color => color.replace('0.6', '0.8')),
        hoverBorderColor: chartColors.borders,
        hoverBorderWidth: 2,
      }]
    };
    
    return (
      <Box sx={{ 
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}>
        <Bar
          data={chartData}
          options={{
            ...commonChartOptions,
            maintainAspectRatio: fullSize ? false : true,
            plugins: {
              ...commonChartOptions.plugins,
              title: {
                ...commonChartOptions.plugins.title,
                display: false,
              },
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1,
                  font: {
                    size: fullSize ? 14 : 12
                  }
                },
                grid: {
                  color: 'rgba(102, 126, 234, 0.1)',
                  display: true
                },
                title: {
                  display: fullSize,
                  text: 'Number of participants',
                  font: {
                    size: fullSize ? 16 : 14,
                    weight: 'bold' as const
                  }
                }
              },
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  font: {
                    size: fullSize ? 14 : 12
                  }
                }
              }
            }
          }}
        />
        {isTruncated && !fullSize && (
          <Box sx={{ 
            position: 'absolute', 
            bottom: 10, 
            left: 0, 
            width: '100%', 
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            <Typography variant="caption" color="text.secondary">
              {total - Object.keys(truncatedEducation).length} more education levels hidden. Click to view all.
            </Typography>
          </Box>
        )}
      </Box>
    );
  };
  
  // Fonction pour rendre la liste complète des genres
  const renderFullGenderList = () => {
    const sortedGenders = Object.entries(stats.gender)
      .sort((a, b) => b[1] - a[1]);
    
    return (
      <Box sx={{ maxHeight: '300px', overflow: 'auto', mt: 2 }}>
        <List dense>
          {sortedGenders.map(([gender, count], index) => (
            <ListItem key={index} divider>
              <ListItemText 
                primary={gender} 
                secondary={`${count} participant${count > 1 ? 's' : ''}`} 
                primaryTypographyProps={{ fontWeight: index < 3 ? 'bold' : 'normal' }}
              />
              <Chip 
                label={`${((count / displayedResponses.length) * 100).toFixed(1)}%`}
                size="small"
                color={index < 3 ? "primary" : "default"}
                sx={{ ml: 1 }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };
  
  // Fonction pour rendre la liste complète des niveaux d'éducation
  const renderFullEducationList = () => {
    const sortedEducation = Object.entries(stats.education)
      .sort((a, b) => b[1] - a[1]);
    
    return (
      <Box sx={{ maxHeight: '300px', overflow: 'auto', mt: 2 }}>
        <List dense>
          {sortedEducation.map(([education, count], index) => (
            <ListItem key={index} divider>
              <ListItemText 
                primary={education} 
                secondary={`${count} participant${count > 1 ? 's' : ''}`} 
                primaryTypographyProps={{ fontWeight: index < 3 ? 'bold' : 'normal' }}
              />
              <Chip 
                label={`${((count / displayedResponses.length) * 100).toFixed(1)}%`}
                size="small"
                color={index < 3 ? "primary" : "default"}
                sx={{ ml: 1 }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };

  // Fonction pour rendre le contenu de la boîte de dialogue selon le type de graphique
  const renderDialogContent = () => {
    switch (currentChart) {
      case 'age':
        return (
          <>
            <Box sx={{ 
              height: "500px", transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)", 
              width: '100%', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              overflow: 'hidden'
            }}>
              {renderAgeChart(true)}
            </Box>
            {renderFullAgeList()}
          </>
        );
      case 'city':
        return (
          <>
            <Box sx={{ 
              height: "500px", transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)", 
              width: '100%', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              overflow: 'hidden'
            }}>
              {renderCityChart(true)}
            </Box>
            {renderFullCityList()}
          </>
        );
      case 'gender':
        return (
          <>
            <Box sx={{ 
              height: "500px", transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)", 
              width: '100%', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              overflow: 'hidden'
            }}>
              {renderGenderChart(true)}
            </Box>
            {renderFullGenderList()}
          </>
        );
      case 'education':
        return (
          <>
            <Box sx={{ 
              height: "500px", transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)", 
              width: '100%', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              overflow: 'hidden'
            }}>
              {renderEducationChart(true)}
            </Box>
            {renderFullEducationList()}
          </>
        );
      default:
        return null;
    }
  };

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

      {/* Vérifier s'il y a des réponses à afficher */}
      {displayedResponses.length > 0 ? (
        <Grid container spacing={4} sx={{ 
          justifyContent: 'center',
          alignItems: 'stretch'
        }}>
          {/* Gender */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0} 
              onClick={() => handleOpenDialog('gender', 'Gender Distribution')}
              sx={{ 
              p: 3, 
              height: '400px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 2,
                transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                boxSizing: 'border-box',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)',
                  borderColor: 'rgba(102, 126, 234, 0.5)'
                },
                '&:focus': {
                  outline: 'none',
                  boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.3)'
                }
              }}
            >
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
                Gender Distribution
              </Typography>
              <Box sx={{ 
                height: 'calc(100% - 60px)',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {renderGenderChart()}
              </Box>
            </Paper>
          </Grid>

          {/* Education Level */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0} 
              onClick={() => handleOpenDialog('education', "Education Level Distribution")}
              sx={{ 
              p: 3, 
              height: '400px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 2,
                transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                boxSizing: 'border-box',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)',
                  borderColor: 'rgba(102, 126, 234, 0.5)'
                },
                '&:focus': {
                  outline: 'none',
                  boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.3)'
                }
              }}
            >
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
                Education Level Distribution
              </Typography>
              <Box sx={{ 
                height: 'calc(100% - 60px)',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {renderEducationChart()}
              </Box>
            </Paper>
          </Grid>

          {/* Age Distribution */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0} 
              onClick={() => handleOpenDialog('age', 'Age Distribution')}
              sx={{ 
              p: 3, 
              height: '400px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 2,
                transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                boxSizing: 'border-box',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)',
                  borderColor: 'rgba(102, 126, 234, 0.5)'
                },
                '&:focus': {
                  outline: 'none',
                  boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.3)'
                }
              }}
            >
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
              <Box sx={{ 
                height: 'calc(100% - 60px)',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {renderAgeChart()}
              </Box>
            </Paper>
          </Grid>

          {/* Cities */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0} 
              onClick={() => handleOpenDialog('city', 'City Distribution')}
              sx={{ 
              p: 3, 
              height: '400px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 2,
                transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                boxSizing: 'border-box',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)',
                  borderColor: 'rgba(102, 126, 234, 0.5)'
                },
                '&:focus': {
                  outline: 'none',
                  boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.3)'
                }
              }}
            >
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
                City Distribution
              </Typography>
              <Box sx={{ 
                height: 'calc(100% - 60px)',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {renderCityChart()}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        // Afficher ce message quand aucune réponse ne correspond aux filtres
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <Typography variant="h6" color="text.secondary">
            No responses match the filtering criteria
          </Typography>
          <Button 
            variant="outlined" 
            onClick={onClearFilters || (() => {})}
            sx={{ mt: 2 }}
          >
            Reset filters
          </Button>
        </Box>
      )}
      
      {/* Boîte de dialogue pour afficher le graphique en grand */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        TransitionComponent={Zoom}
        keepMounted
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '12px',
            boxShadow: '0 24px 38px rgba(0,0,0,0.14), 0 9px 46px rgba(0,0,0,0.12)',
            overflow: 'visible'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          pb: 2,
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box component="span" sx={{ 
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {currentTitle}
          </Box>
          <IconButton edge="end" color="inherit" onClick={handleCloseDialog} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 4 }}>
          {renderDialogContent()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog} variant="outlined" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const GroupsList: React.FC<GroupsListProps> = ({
  groups,
  onSelectGroup,
  onDeleteGroup,
  onRenameGroup
}) => {
  return (
    <Paper sx={{ p: 2, height: '50%', overflow: 'auto' }}>
      <Typography variant="subtitle1" gutterBottom>
        Analysis Groups ({groups.length})
      </Typography>
      
      {groups.length > 0 ? (
        <List dense>
          {groups.map((group) => (
            <ListItem 
              key={group.id}
              button
              onClick={() => onSelectGroup(group.id)}
            >
              <ListItemText
                primary={group.name}
                secondary={`${group.respondentCount} respondents • ${group.paths.length} paths`}
              />
              <ListItemSecondaryAction>
                <Tooltip title="View group analysis">
                  <IconButton edge="end" onClick={() => onSelectGroup(group.id)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Rename">
                  <IconButton edge="end" onClick={() => {
                    const newName = prompt('New group name:', group.name);
                    if (newName) onRenameGroup(group.id, newName);
                  }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton 
                    edge="end" 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this group?')) {
                        onDeleteGroup(group.id);
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No analysis groups created. Select paths and create a group to start.
        </Typography>
      )}
    </Paper>
  );
}; 