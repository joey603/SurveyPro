import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface DemographicsStatisticsProps {
  type?: string; // Si le composant attend une prop 'type'
}

const DemographicsStatistics: React.FC<DemographicsStatisticsProps> = (props) => {
  // Données d'exemple - à remplacer par vos données réelles
  const demographicData = [
    { name: 'Hommes', value: 120 },
    { name: 'Femmes', value: 150 },
    { name: 'Autre', value: 30 },
  ];

  const ageData = [
    { name: '18-24', value: 45 },
    { name: '25-34', value: 90 },
    { name: '35-44', value: 80 },
    { name: '45-54', value: 50 },
    { name: '55+', value: 35 },
  ];

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Statistiques Démographiques
      </Typography>
      
      <Grid container spacing={4}>
        {/* Graphique de Démographie */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
            Répartition démographique
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={demographicData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" name="Répondants" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
        
        {/* Graphique d'Âge */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
            Répartition par âge
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ageData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#82ca9d" name="Répondants" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default DemographicsStatistics; 