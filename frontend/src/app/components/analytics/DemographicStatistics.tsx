import React, { useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
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
  ScatterController,
} from 'chart.js';
import { Bar, Pie, Line, Doughnut, Scatter } from 'react-chartjs-2';
import { calculateAge } from '../../../utils/dateUtils';

// Enregistrer les composants Chart.js nécessaires
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

interface DemographicStatisticsProps {
  responses: SurveyResponse[];
  filteredResponses?: SurveyResponse[];
}

// Options communes pour les graphiques
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

// Options pour les graphiques circulaires
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

// Couleurs pour les graphiques
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
  responses,
  filteredResponses
}) => {
  // Utiliser les réponses filtrées si disponibles, sinon utiliser toutes les réponses
  const displayedResponses = filteredResponses || responses;

  // Fonction pour calculer les statistiques démographiques
  const calculateDemographicStats = useCallback((): DemographicStats => {
    const stats: DemographicStats = {
      gender: {},
      education: {},
      city: {},
      ageDistribution: Array(121).fill(0) // Pour stocker les âges de 0 à 120 ans
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

  // Calculer les statistiques
  const stats = calculateDemographicStats();

  // Fonction pour rendre le graphique d'âge
  const renderAgeChart = () => {
    // Créer des données pour le graphique de dispersion
    const ageDistribution: { [key: string]: number } = {};
    
    // Filtrer les âges qui ont au moins une réponse
    stats.ageDistribution.forEach((count, age) => {
      if (count > 0) {
        ageDistribution[age] = count;
      }
    });

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
              return `${count} participant${count > 1 ? 's' : ''} de ${age} ans`;
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
            text: 'Âge',
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
            text: 'Nombre de participants',
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

    return <Scatter data={chartData} options={options} />;
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
          Statistiques Démographiques
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
              Distribution par Genre
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
              Distribution par Niveau d'Éducation
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

        {/* Distribution des âges */}
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
              Distribution par Âge
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

        {/* Villes */}
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
              Distribution par Ville
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
    </Box>
  );
}; 