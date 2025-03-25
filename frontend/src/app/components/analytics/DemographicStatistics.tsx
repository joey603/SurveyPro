import React, { useCallback, useEffect } from 'react';
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
  Tooltip
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
      right: 20
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

  // Function to render the age chart
  const renderAgeChart = () => {
    // Create data for scatter chart
    const ageDistribution: { [key: string]: number } = {};
    
    // Filter ages that have at least one response
    stats.ageDistribution.forEach((count, age) => {
      if (count > 0) {
        ageDistribution[age] = count;
      }
    });

    // Sort ages for consistent color assignment
    const sortedAges = Object.keys(ageDistribution).sort((a, b) => parseInt(a) - parseInt(b));
    
    const datasets = sortedAges.map((age, index) => ({
      label: `${age} years old`,
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

    const options = {
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
              return `${count} participant${count > 1 ? 's' : ''} of ${age} years old`;
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
              size: 14,
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
              size: 14,
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
      interaction: {
        intersect: false,
        mode: 'nearest' as const
      }
    };

    return <Scatter data={chartData} options={options} />;
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

      <Tabs
        value={activeTab > 1 ? 0 : activeTab}
        onChange={handleTabChange}
        centered
        variant="fullWidth"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 2
        }}
      >
        <Tab icon={<PieChartIcon />} label="Démographie" />
        <Tab icon={<ShowChartIcon />} label="Âge" />
      </Tabs>

      {/* Vérifier s'il y a des réponses à afficher */}
      {displayedResponses.length > 0 ? (
        <Grid container spacing={4} sx={{ 
          justifyContent: 'center',
          alignItems: 'stretch'
        }}>
          {/* Gender */}
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
                Gender Distribution
              </Typography>
              <Box sx={{ 
                height: 'calc(100% - 60px)',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Pie
                  data={{
                    labels: Object.keys(stats.gender),
                    datasets: [{
                      data: Object.values(stats.gender),
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

          {/* Education Level */}
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
                Education Level Distribution
              </Typography>
              <Box sx={{ 
                height: 'calc(100% - 60px)',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Bar
                  data={{
                    labels: Object.keys(stats.education),
                    datasets: [{
                      data: Object.values(stats.education),
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

          {/* Age Distribution */}
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
                City Distribution
              </Typography>
              <Box sx={{ 
                height: 'calc(100% - 60px)',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Doughnut
                  data={{
                    labels: Object.keys(stats.city),
                    datasets: [{
                      data: Object.values(stats.city),
                      backgroundColor: chartColors.backgrounds,
                      borderColor: chartColors.borders,
                      borderWidth: 1
                    }]
                  }}
                  options={pieOptions}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        // Afficher ce message quand aucune réponse ne correspond aux filtres
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <Typography variant="h6" color="text.secondary">
            Aucune réponse ne correspond aux critères de filtrage
          </Typography>
          <Button 
            variant="outlined" 
            onClick={onClearFilters || (() => {})}
            sx={{ mt: 2 }}
          >
            Réinitialiser les filtres
          </Button>
        </Box>
      )}
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
        Groupes d'analyse ({groups.length})
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
                secondary={`${group.respondentCount} répondants • ${group.paths.length} parcours`}
              />
              <ListItemSecondaryAction>
                <Tooltip title="Voir l'analyse de ce groupe">
                  <IconButton edge="end" onClick={() => onSelectGroup(group.id)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Renommer">
                  <IconButton edge="end" onClick={() => {
                    const newName = prompt('Nouveau nom pour ce groupe :', group.name);
                    if (newName) onRenameGroup(group.id, newName);
                  }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Supprimer">
                  <IconButton 
                    edge="end" 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) {
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
          Aucun groupe d'analyse créé. Sélectionnez des parcours et créez un groupe pour commencer.
        </Typography>
      )}
    </Paper>
  );
}; 