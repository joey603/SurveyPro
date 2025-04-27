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
import BarChartIcon from '@mui/icons-material/BarChart';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';

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

// Désactiver le comportement des légendes au clic
// Nous utilisons une fonction plus sûre qui sera injectée dans les options de chaque graphique
const preventLegendClickBehavior = (e: any, legendItem: any, legend: any) => {
  e.stopPropagation();
  return false; // Empêche l'action par défaut
};

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
      },
      onClick: preventLegendClickBehavior
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
      position: 'bottom' as const,
      labels: {
        ...commonChartOptions.plugins.legend.labels,
        padding: 15,
        boxWidth: 15,
        usePointStyle: true,
        pointStyle: 'circle',
        font: {
          size: 12
        }
      },
      display: true,
      onClick: preventLegendClickBehavior
    }
  },
  layout: {
    padding: {
      left: 20,
      right: 20,
      top: 15,
      bottom: 40
    }
  },
  elements: {
    arc: {
      borderWidth: 1,
      borderColor: '#fff',
      borderAlign: 'center' as const
    }
  },
  maintainAspectRatio: false
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
interface ColorItem {
  backgroundColor: string;
  borderColor: string;
}

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

// Mettre à jour également le style CSS pour mieux gérer les légendes
const styles = `
  /* Styles CSS pour les légendes des graphiques avec barre de défilement */
  .chart-container {
    position: relative;
  }
  
  /* Assurer que le graphique a une hauteur minimale */
  .chart-container > div {
    min-height: 450px;
  }
  
  /* Styles pour les légendes des graphiques */
  .chart-container .chartjs-legend-container {
    max-height: 200px;
    overflow-y: auto;
    margin-top: 10px;
    padding: 5px;
    border-top: 1px solid rgba(0,0,0,0.1);
  }
  
  /* Ajuster les légendes de Chart.js */
  .chartjs-render-monitor {
    height: auto !important;
  }
  
  /* Styles supplémentaires pour les légendes de grande taille */
  .MuiDialog-paper .chartjs-render-monitor {
    min-height: 500px;
  }
`;

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
  
  // Nouvel état pour stocker les types de graphiques par catégorie
  const [chartTypes, setChartTypes] = useState<{ 
    [key: string]: 'bar' | 'pie' | 'line' | 'doughnut' | 'scatter' 
  }>({
    'gender': 'pie',
    'education': 'bar',
    'city': 'doughnut',
    'age': 'line'
  });
  
  // Ajouter les styles CSS
  useEffect(() => {
    // Ajouter les styles CSS
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    // Sélectionner les conteneurs de légendes après le rendu des graphiques
    const applyLegendStyles = () => {
      const legends = document.querySelectorAll('.chartjs-legend');
      legends.forEach(legend => {
        if (!legend.parentElement?.classList.contains('chartjs-legend-container')) {
          // Créer un conteneur avec défilement pour la légende
          const container = document.createElement('div');
          container.classList.add('chartjs-legend-container');
          // Déplacer la légende dans le conteneur
          legend.parentElement?.insertBefore(container, legend);
          container.appendChild(legend);
        }
      });
    };

    // Appliquer les styles après le rendu des graphiques
    setTimeout(applyLegendStyles, 500);

    // Nettoyer les styles lors du démontage du composant
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
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
  
  // Fonction pour obtenir les types de graphiques disponibles pour une catégorie
  const getAvailableChartTypes = (category: string): ('bar' | 'pie' | 'line' | 'doughnut' | 'scatter')[] => {
    switch (category) {
      case 'age':
        return ['scatter', 'bar', 'line'];
      case 'gender':
      case 'education':
      case 'city':
        return ['bar', 'pie', 'doughnut'];
      default:
        return ['bar', 'pie'];
    }
  };
  
  // Fonction pour obtenir l'icône correspondant au type de graphique
  const getChartIcon = (type: 'bar' | 'pie' | 'line' | 'doughnut' | 'scatter') => {
    switch (type) {
      case 'bar':
        return <BarChartIcon />;
      case 'pie':
        return <PieChartIcon />;
      case 'line':
        return <ShowChartIcon />;
      case 'doughnut':
        return <DonutLargeIcon />;
      case 'scatter':
        return <ScatterPlotIcon />;
      default:
        return <BarChartIcon />;
    }
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
    // Create data for age distribution
    const ageDistribution: { [key: string]: number } = {};
    
    // Filter ages that have at least one response
    stats.ageDistribution.forEach((count, age) => {
      if (count > 0) {
        ageDistribution[age] = count;
      }
    });
    
    // Si ce n'est pas la vue complète et qu'il y a beaucoup d'âges, tronquer
    const { data: truncatedAges, isTruncated, total } = 
      truncateData(ageDistribution, fullSize ? 999 : MAX_DISPLAYED_ITEMS);
    
    const labels = Object.keys(truncatedAges);
    const values = Object.values(truncatedAges);
    
    // Générer des couleurs distinctes
    const colors = generateDistinctColors(labels.length);
    const backgroundColors = colors.map(color => color.backgroundColor);
    const borderColors = colors.map(color => color.borderColor);
    
    // Données communes pour tous les types de graphiques standard
    const commonData = {
      labels,
      datasets: [{
        label: 'Participants',
        data: values,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
        hoverBackgroundColor: backgroundColors.map(color => color.replace('0.6', '0.8')),
        hoverBorderColor: borderColors.map(color => color.replace('1)', '1.3)')),
        hoverBorderWidth: 3
      }]
    };
    
    // Options communes pour les graphiques
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: fullSize ? false : true,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle',
            font: {
              size: fullSize ? 14 : 12
            },
            boxWidth: 15
          },
          display: true,
          onClick: preventLegendClickBehavior
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = values.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    };
    
    // Rendu du graphique selon le type sélectionné
    switch (chartTypes.age) {
      case 'scatter':
        // Préparation des données pour le scatter plot
        const scatterDatasets = labels.map((age, index) => ({
      label: `${age} years`,
      data: [{
        x: parseInt(age),
        y: truncatedAges[age]
      }],
          backgroundColor: backgroundColors[index],
          borderColor: borderColors[index],
      borderWidth: 2,
      pointRadius: fullSize ? 10 : 8,
      pointHoverRadius: fullSize ? 12 : 10,
          hoverBackgroundColor: backgroundColors[index].replace('0.6', '0.8'),
          hoverBorderColor: borderColors[index],
      hoverBorderWidth: 3,
      fill: false
    }));

    return (
        <Scatter 
            data={{ datasets: scatterDatasets }} 
          options={{
      responsive: true,
            maintainAspectRatio: fullSize ? false : true,
      plugins: {
        legend: {
          display: true,
                  position: 'bottom' as const,
          labels: {
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle',
            font: {
                    size: fullSize ? 14 : 12
                    },
                    boxWidth: 15
                  }
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const age = context.parsed.x;
              const count = context.parsed.y;
                    return `${count} participant${count > 1 ? 's' : ''} aged ${age}`;
                  }
                  }
                }
              },
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
                  min: 0,
                  max: Math.max(...labels.map(l => parseInt(l))) + 5,
          ticks: {
                    stepSize: 5
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
                    text: 'Participants',
            font: {
                    size: fullSize ? 16 : 14,
              weight: 'bold' as const
            }
          },
          beginAtZero: true,
          grid: {
            color: 'rgba(102, 126, 234, 0.1)'
          }
        }
              }
            }}
          />
        );
      case 'line':
        // Préparer les données pour un graphique en ligne avec légendes individuelles par âge
        const sortedAges = labels.sort((a, b) => parseInt(a) - parseInt(b));
        const lineDatasets = sortedAges.map((age, index) => ({
          label: `${age} ans`,
          data: sortedAges.map(a => a === age ? truncatedAges[age] : null),
          backgroundColor: backgroundColors[index % backgroundColors.length],
          borderColor: borderColors[index % borderColors.length],
          borderWidth: 2,
          pointRadius: fullSize ? 6 : 4,
          pointHoverRadius: fullSize ? 8 : 6,
          fill: false,
          tension: 0.1
        }));

        // Ajouter un dataset supplémentaire pour la ligne de tendance
        return (
          <Line
            data={{
              labels: sortedAges,
              datasets: [
                // Ligne principale qui relie tous les points
                {
                  label: 'Distribution by âge',
                  data: sortedAges.map(age => truncatedAges[age]),
                  backgroundColor: 'rgba(102, 126, 234, 0.2)',
                  borderColor: 'rgba(102, 126, 234, 1)',
                  borderWidth: 3,
                  pointRadius: 0, // Points invisibles sur la ligne principale
                  pointHoverRadius: 0,
                  fill: true,
                  tension: 0.4,
                  order: 1 // Dessiner en premier (en arrière-plan)
                },
                // Points individuels pour chaque âge avec légende
                ...lineDatasets
              ]
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                legend: {
                  ...commonOptions.plugins.legend,
                  position: 'bottom',
                  display: true,
                  labels: {
                    ...commonOptions.plugins.legend.labels,
                    boxWidth: 10,
                    usePointStyle: true,
                    filter: (item) => item.text !== 'Distribution par âge' // Cacher la légende de la ligne principale
                  }
                },
                tooltip: {
                  callbacks: {
                    label: (context: any) => {
                      const age = context.dataset.label.replace(' ans', '');
                      const value = truncatedAges[age] || 0;
                      const total = values.reduce((a, b) => a + b, 0);
                      const percentage = Math.round((value / total) * 100);
                      return `${value} participant${value > 1 ? 's' : ''} de ${age} ans (${percentage}%)`;
                    }
                  }
                }
              },
              scales: {
                x: {
                  title: {
                    display: true,
                    text: 'Years',
                    font: {
                      size: fullSize ? 16 : 14,
                      weight: 'bold' as const
                    }
                  },
                  grid: {
                    display: true,
                    color: 'rgba(102, 126, 234, 0.1)'
                  }
                },
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Participants',
                    font: {
                      size: fullSize ? 16 : 14,
                      weight: 'bold' as const
                    }
                  },
                  grid: {
                    display: true,
                    color: 'rgba(102, 126, 234, 0.1)'
                  },
                  ticks: {
                    precision: 0
                  }
                }
              }
            }}
          />
        );
      case 'bar':
      default:
        // Préparer les données pour le graphique en barres avec légendes individuelles
        const barDatasets = labels.map((age, index) => ({
          label: `${age} ans`,
          data: labels.map(a => a === age ? truncatedAges[age] : null),
          backgroundColor: backgroundColors[index],
          borderColor: borderColors[index],
          borderWidth: 1,
          borderRadius: 6,
          hoverBackgroundColor: backgroundColors[index].replace('0.6', '0.8')
        }));

        return (
          <Bar
            data={{ datasets: barDatasets, labels: labels }}
            options={{
              ...commonOptions,
              scales: {
                x: {
                  title: {
                    display: true,
                    text: 'Age',
                    font: {
                      size: fullSize ? 16 : 14,
                      weight: 'bold' as const
                    }
                  },
                  grid: {
                    display: false
                  },
                  stacked: true
                },
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Participants',
                    font: {
                      size: fullSize ? 16 : 14,
                      weight: 'bold' as const
                    }
                  },
                  grid: {
                    display: true,
                    color: 'rgba(102, 126, 234, 0.1)'
                  },
                  ticks: {
                    precision: 0
                  },
                  stacked: true
                }
            }
          }} 
        />
        );
    }
  };
  
  // Function to render the city chart
  const renderCityChart = (fullSize: boolean = false) => {
    const { data: cityData, isTruncated, total } = truncateData(stats.city, fullSize ? 10 : 5);
    const labels = Object.keys(cityData);
    const values = Object.values(cityData);
    
    // Générer des couleurs distinctes
    const colors = generateDistinctColors(labels.length);
    const backgroundColors = colors.map(color => color.backgroundColor);
    const borderColors = colors.map(color => color.borderColor);
    
    // Données communes pour tous les types de graphique
    const commonData = {
      labels,
      datasets: [{
        data: values,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
        hoverOffset: 8,
        hoverBorderWidth: 3,
        hoverBorderColor: borderColors.map(color => color.replace('1)', '1.3)')),
      }]
    };
    
    // Options communes pour les graphiques
    const commonOptions = {
      responsive: true,
            maintainAspectRatio: fullSize ? false : true,
            plugins: {
              legend: {
          position: 'bottom' as const,
                labels: {
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle',
                  font: {
                    size: fullSize ? 14 : 12
                  },
            boxWidth: 15
          },
          display: true,
          onClick: preventLegendClickBehavior
              },
              tooltip: {
                callbacks: {
            label: (context: any) => {
                    const label = context.label || '';
              const value = context.raw || 0;
              const total = values.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
                    return `${label}: ${value} (${percentage}%)`;
                  }
          }
        }
      }
    };
    
    // Rendu du graphique selon le type sélectionné
    switch (chartTypes.city) {
      case 'pie':
        return (
          <Pie
            data={commonData}
            options={{
              ...commonOptions,
              animation: {
                animateRotate: true,
                animateScale: true,
                duration: fullSize ? 800 : 500,
                delay: (ctx) => ctx.dataIndex * 50
              },
              plugins: {
                ...commonOptions.plugins,
                legend: {
                  ...commonOptions.plugins.legend,
                  position: 'bottom',
                  labels: {
                    ...commonOptions.plugins.legend.labels,
                usePointStyle: true,
                    boxWidth: 10
                  }
              }
            },
            layout: {
              padding: {
                  bottom: 20
                }
              }
            }}
          />
        );
      case 'doughnut':
        return (
          <Doughnut
            data={commonData}
            options={{
              ...commonOptions,
              cutout: '50%',
              animation: {
                animateRotate: true,
                animateScale: true,
                duration: fullSize ? 800 : 500,
                delay: (ctx) => ctx.dataIndex * 50
              },
              plugins: {
                ...commonOptions.plugins,
                legend: {
                  ...commonOptions.plugins.legend,
                  position: 'bottom',
                  labels: {
                    ...commonOptions.plugins.legend.labels,
                    usePointStyle: true,
                    boxWidth: 10
                  }
                }
              },
              layout: {
                padding: {
                  bottom: 20
                }
              }
            }}
          />
        );
      case 'bar':
      default:
        // Créer un dataset unique avec tous les noms de villes individuellement sur l'axe Y
        return (
          <Bar
            data={{
              labels: labels,
              datasets: [{
                label: 'Participants by city',
                data: values,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 6,
                hoverBackgroundColor: backgroundColors.map(color => color.replace('0.6', '0.8')),
                maxBarThickness: 80
              }]
            }}
            options={{
              ...commonOptions,
              indexAxis: 'y' as const,
              plugins: {
                ...commonOptions.plugins,
                legend: {
                  ...commonOptions.plugins.legend,
                  display: false
                },
                tooltip: {
                  callbacks: {
                    label: (context: any) => {
                      const city = context.label;
                      const value = context.raw || 0;
                      const total = values.reduce((a, b) => a + b, 0);
                      const percentage = Math.round((value / total) * 100);
                      return `${city}: ${value} participants (${percentage}%)`;
                    }
                  }
                }
              },
              scales: {
                x: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Participants',
                    font: {
                      size: fullSize ? 14 : 12,
                      weight: 'bold' as const
                    }
                  },
                  ticks: {
                    precision: 0
                  },
                  grid: {
                    display: true,
                    color: 'rgba(102, 126, 234, 0.1)'
                  }
                },
                y: {
                  grid: {
                    display: false
                }
              }
            }
          }} 
        />
        );
    }
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

  // Function to render the gender chart
  const renderGenderChart = (fullSize: boolean = false) => {
    const { data: genderData, isTruncated, total } = truncateData(stats.gender, fullSize ? 10 : 5);
    const labels = Object.keys(genderData);
    const values = Object.values(genderData);
    
    // Générer des couleurs distinctes
    const colors = generateDistinctColors(labels.length);
    const backgroundColors = colors.map(color => color.backgroundColor);
    const borderColors = colors.map(color => color.borderColor);
    
    // Données communes pour tous les types de graphique
    const commonData = {
      labels,
      datasets: [{
        data: values,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
        hoverOffset: 8,
        hoverBorderWidth: 3,
        hoverBorderColor: borderColors.map(color => color.replace('1)', '1.3)')),
      }]
    };
    
    // Options communes pour les graphiques
    const commonOptions = {
      responsive: true,
            maintainAspectRatio: fullSize ? false : true,
            plugins: {
              legend: {
          position: 'bottom' as const,
                labels: {
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle',
                  font: {
                    size: fullSize ? 14 : 12
                  },
            boxWidth: 15
          },
          display: true,
          onClick: preventLegendClickBehavior
              },
              tooltip: {
                callbacks: {
            label: (context: any) => {
                    const label = context.label || '';
              const value = context.raw || 0;
              const total = values.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
                    return `${label}: ${value} (${percentage}%)`;
                  }
          }
        }
      }
    };
    
    // Rendu du graphique selon le type sélectionné
    switch (chartTypes.gender) {
      case 'pie':
        return (
          <Pie
            data={commonData}
            options={{
              ...commonOptions,
              animation: {
                animateRotate: true,
                animateScale: true,
                duration: fullSize ? 800 : 500,
                delay: (ctx) => ctx.dataIndex * 50
              },
              plugins: {
                ...commonOptions.plugins,
                legend: {
                  ...commonOptions.plugins.legend,
                  position: 'bottom',
                  labels: {
                    ...commonOptions.plugins.legend.labels,
                usePointStyle: true,
                    boxWidth: 10
                  }
              }
            },
            layout: {
              padding: {
                  bottom: 20
                }
              }
            }}
          />
        );
      case 'doughnut':
        return (
          <Doughnut
            data={commonData}
            options={{
              ...commonOptions,
              cutout: '50%',
                animation: {
                animateRotate: true,
                animateScale: true,
                duration: fullSize ? 800 : 500,
                delay: (ctx) => ctx.dataIndex * 50
              },
              plugins: {
                ...commonOptions.plugins,
                legend: {
                  ...commonOptions.plugins.legend,
                  position: 'bottom',
                  labels: {
                    ...commonOptions.plugins.legend.labels,
                    usePointStyle: true,
                    boxWidth: 10
                  }
                }
              },
              layout: {
                padding: {
                  bottom: 20
                }
              }
            }}
          />
        );
      case 'bar':
      default:
        return (
          <Bar
            data={{
              labels,
              datasets: [{
                label: 'Participants',
                data: values,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                hoverBackgroundColor: backgroundColors.map(color => color.replace('0.6', '0.8')),
                borderRadius: 6,
                maxBarThickness: 80
              }]
            }}
            options={{
              ...commonOptions,
              indexAxis: 'y' as const,
              plugins: {
                ...commonOptions.plugins,
                legend: {
                  ...commonOptions.plugins.legend,
                display: false
                },
                tooltip: {
                  callbacks: {
                    label: (context: any) => {
                      const gender = context.label;
                      const value = context.raw || 0;
                      const total = values.reduce((a, b) => a + b, 0);
                      const percentage = Math.round((value / total) * 100);
                      return `${gender}: ${value} participants (${percentage}%)`;
                    }
                  }
              }
            },
            scales: {
                x: {
                beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Participants',
                  font: {
                      size: fullSize ? 14 : 12,
                      weight: 'bold' as const
                    }
                  },
                  ticks: {
                    precision: 0
                  },
                  grid: {
                    display: true,
                    color: 'rgba(102, 126, 234, 0.1)'
                  }
                },
                y: {
                grid: {
                  display: false
                }
              }
            }
          }} 
        />
        );
    }
  };
  
  // Function to render the education chart
  const renderEducationChart = (fullSize: boolean = false) => {
    const { data: educationData, isTruncated, total } = truncateData(stats.education, fullSize ? 10 : 5);
    const labels = Object.keys(educationData);
    const values = Object.values(educationData);
    
    // Générer des couleurs distinctes
    const colors = generateDistinctColors(labels.length);
    const backgroundColors = colors.map(color => color.backgroundColor);
    const borderColors = colors.map(color => color.borderColor);
    
    // Données communes pour tous les types de graphique
    const commonData = {
      labels,
      datasets: [{
        data: values,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
        hoverOffset: 8,
        hoverBorderWidth: 3,
        hoverBorderColor: borderColors.map(color => color.replace('1)', '1.3)')),
      }]
    };
    
    // Options communes pour les graphiques
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: fullSize ? false : true,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle',
            font: {
              size: fullSize ? 14 : 12
            },
            boxWidth: 15
          },
          display: true,
          onClick: preventLegendClickBehavior
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = values.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    };
    
    // Rendu du graphique selon le type sélectionné
    switch (chartTypes.education) {
      case 'pie':
    return (
          <Pie
            data={commonData}
          options={{
              ...commonOptions,
              animation: {
                animateRotate: true,
                animateScale: true,
                duration: fullSize ? 800 : 500,
                delay: (ctx) => ctx.dataIndex * 50
              },
            plugins: {
                ...commonOptions.plugins,
                legend: {
                  ...commonOptions.plugins.legend,
                  position: 'bottom',
                  labels: {
                    ...commonOptions.plugins.legend.labels,
                    usePointStyle: true,
                    boxWidth: 10
                  }
                }
              },
              layout: {
                padding: {
                  bottom: 20
                }
              }
            }}
          />
        );
      case 'doughnut':
        return (
          <Doughnut
            data={commonData}
            options={{
              ...commonOptions,
              cutout: '50%',
              animation: {
                animateRotate: true,
                animateScale: true,
                duration: fullSize ? 800 : 500,
                delay: (ctx) => ctx.dataIndex * 50
              },
              plugins: {
                ...commonOptions.plugins,
              legend: {
                  ...commonOptions.plugins.legend,
                  position: 'bottom',
                  labels: {
                    ...commonOptions.plugins.legend.labels,
                    usePointStyle: true,
                    boxWidth: 10
                  }
                }
              },
              layout: {
                padding: {
                  bottom: 20
                }
              }
            }}
          />
        );
      case 'bar':
      default:
        return (
          <Bar
            data={{
              labels,
              datasets: [{
                label: 'Niveau d\'éducation',
                data: values,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                hoverBackgroundColor: backgroundColors.map(color => color.replace('0.6', '0.8')),
                borderRadius: 6,
                maxBarThickness: 80
              }]
            }}
            options={{
              ...commonOptions,
              indexAxis: 'y' as const,
              plugins: {
                ...commonOptions.plugins,
                legend: {
                  ...commonOptions.plugins.legend,
                display: false
                },
                tooltip: {
                  callbacks: {
                    label: (context: any) => {
                      const education = context.label;
                      const value = context.raw || 0;
                      const total = values.reduce((a, b) => a + b, 0);
                      const percentage = Math.round((value / total) * 100);
                      return `${education}: ${value} participants (${percentage}%)`;
                    }
                  }
              }
            },
            scales: {
                x: {
                beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Participants',
                  font: {
                      size: fullSize ? 14 : 12,
                      weight: 'bold' as const
                    }
                  },
                  ticks: {
                    precision: 0
                  },
                  grid: {
                    display: true,
                    color: 'rgba(102, 126, 234, 0.1)'
                  }
                },
                y: {
                grid: {
                  display: false
                }
              }
            }
          }}
        />
        );
    }
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

  // Fonction pour rendre le contenu du dialogue
  const renderDialogContent = () => {
    // Obtenir le nombre d'éléments pour chaque catégorie
    const genderCount = Object.keys(stats.gender).length;
    const educationCount = Object.keys(stats.education).length;
    const cityCount = Object.keys(stats.city).length;
    const ageCount = Object.keys(stats.ageDistribution.reduce((acc, count, age) => {
      if (count > 0) acc[age] = count;
      return acc;
    }, {} as {[key: number]: number})).length;

    switch (currentChart) {
      case 'gender':
        return (
          <Box sx={{ height: '100%', width: '100%', p: 2 }}>
            <Box sx={{ 
              width: '100%', 
              maxWidth: '800px', 
              height: genderCount > 5 ? '600px' : '500px', 
              margin: '0 auto',
              mb: 4
            }}>
              {renderGenderChart(true)}
            </Box>
            
            <Stack 
              direction="row" 
              spacing={1} 
              sx={{ 
                my: 3,
                justifyContent: 'center',
                pt: 1
              }}
            >
              {getAvailableChartTypes('gender').map((type) => (
                <Button
                  key={type}
                  onClick={() => setChartTypes(prev => ({ ...prev, 'gender': type }))}
                  variant={chartTypes['gender'] === type ? 'contained' : 'outlined'}
                  startIcon={getChartIcon(type)}
                  sx={{
                    ...(chartTypes['gender'] === type ? {
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
            
            <Divider sx={{ my: 3 }} />
            
            {renderFullGenderList()}
          </Box>
        );
      case 'education':
        return (
          <Box sx={{ height: '100%', width: '100%', p: 2 }}>
            <Box sx={{ 
              width: '100%', 
              maxWidth: '800px', 
              height: educationCount > 5 ? '600px' : '500px', 
              margin: '0 auto',
              mb: 4
            }}>
              {renderEducationChart(true)}
            </Box>
            
            <Stack 
              direction="row" 
              spacing={1} 
              sx={{ 
                my: 3,
                justifyContent: 'center',
                pt: 1
              }}
            >
              {getAvailableChartTypes('education').map((type) => (
                <Button
                  key={type}
                  onClick={() => setChartTypes(prev => ({ ...prev, 'education': type }))}
                  variant={chartTypes['education'] === type ? 'contained' : 'outlined'}
                  startIcon={getChartIcon(type)}
                  sx={{
                    ...(chartTypes['education'] === type ? {
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
            
            <Divider sx={{ my: 3 }} />
            
            {renderFullEducationList()}
          </Box>
        );
      case 'city':
        return (
          <Box sx={{ height: '100%', width: '100%', p: 2 }}>
            <Box sx={{ 
              width: '100%', 
              maxWidth: '800px', 
              height: cityCount > 5 ? '600px' : '500px', 
              margin: '0 auto',
              mb: 4
            }}>
              {renderCityChart(true)}
            </Box>
            
            <Stack 
              direction="row" 
              spacing={1} 
              sx={{ 
                my: 3,
                justifyContent: 'center',
                pt: 1
              }}
            >
              {getAvailableChartTypes('city').map((type) => (
                <Button
                  key={type}
                  onClick={() => setChartTypes(prev => ({ ...prev, 'city': type }))}
                  variant={chartTypes['city'] === type ? 'contained' : 'outlined'}
                  startIcon={getChartIcon(type)}
                  sx={{
                    ...(chartTypes['city'] === type ? {
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
            
            <Divider sx={{ my: 3 }} />
            
            {renderFullCityList()}
          </Box>
        );
      case 'age':
        return (
          <Box sx={{ height: '100%', width: '100%', p: 2 }}>
            <Box sx={{ 
              width: '100%', 
              maxWidth: '800px', 
              height: ageCount > 5 ? '600px' : '500px', 
              margin: '0 auto',
              mb: 4
            }}>
              {renderAgeChart(true)}
            </Box>
            
            <Stack 
              direction="row" 
              spacing={1} 
              sx={{ 
                my: 3,
                justifyContent: 'center',
                pt: 1
              }}
            >
              {getAvailableChartTypes('age').map((type) => (
                <Button
                  key={type}
                  onClick={() => setChartTypes(prev => ({ ...prev, 'age': type }))}
                  variant={chartTypes['age'] === type ? 'contained' : 'outlined'}
                  startIcon={getChartIcon(type)}
                  sx={{
                    ...(chartTypes['age'] === type ? {
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
            
            <Divider sx={{ my: 3 }} />
            
            {renderFullAgeList()}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ mt: 4, p: 3, borderRadius: 2, bgcolor: '#fff', boxShadow: '0 2px 20px rgba(0,0,0,0.05)' }} className="demographic-statistics-section">
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
              elevation={3} 
              sx={{ 
                p: 2, 
                height: '100%', 
              borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              '&:hover': {
                  boxShadow: '0 8px 16px rgba(102, 126, 234, 0.15)',
                  transform: 'translateY(-2px)'
                }
              }}
              onClick={() => handleOpenDialog('gender', 'Gender Distribution')}
            >
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="h3">
                Gender Distribution
              </Typography>
                <Tooltip title="Voir les détails">
                  <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDialog('gender', 'Gender Distribution');
                  }}>
                    <FullscreenIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ height: 220, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {renderGenderChart()}
              </Box>
            </Paper>
          </Grid>

          {/* Education Level */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 2, 
                height: '100%', 
              borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              '&:hover': {
                  boxShadow: '0 8px 16px rgba(102, 126, 234, 0.15)',
                  transform: 'translateY(-2px)'
                }
              }}
              onClick={() => handleOpenDialog('education', 'Education Level')}
            >
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="h3">
                  Education Level
              </Typography>
                <Tooltip title="Voir les détails">
                  <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDialog('education', 'Education Level');
                  }}>
                    <FullscreenIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ height: 220, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {renderEducationChart()}
              </Box>
            </Paper>
          </Grid>

          {/* Age Distribution */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 2, 
                height: '100%', 
              borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              '&:hover': {
                  boxShadow: '0 8px 16px rgba(102, 126, 234, 0.15)',
                  transform: 'translateY(-2px)'
                }
              }}
              onClick={() => handleOpenDialog('age', 'Age Distribution')}
            >
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="h3">
                Age Distribution
              </Typography>
                <Tooltip title="Voir les détails">
                  <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDialog('age', 'Age Distribution');
                  }}>
                    <FullscreenIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ height: 220, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {renderAgeChart()}
              </Box>
            </Paper>
          </Grid>

          {/* Cities */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 2, 
                height: '100%', 
              borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              '&:hover': {
                  boxShadow: '0 8px 16px rgba(102, 126, 234, 0.15)',
                  transform: 'translateY(-2px)'
                }
              }}
              onClick={() => handleOpenDialog('city', 'City Distribution')}
            >
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="h3">
                City Distribution
              </Typography>
                  <Tooltip title="See details">
                  <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDialog('city', 'City Distribution');
                  }}>
                    <FullscreenIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ height: 220, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
            overflow: 'auto',
            maxHeight: '90vh'
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