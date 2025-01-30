import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Button
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  TableChart as TableChartIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { Survey } from '../types';
import { ResultsChart } from './ResultsChart';
import { ResultsTable } from './ResultsTable';
import { useSurveyDetails } from '../hooks/useSurveyDetails';

interface SurveyDetailsProps {
  survey: Survey | null;
  onBack: () => void;
}

export const SurveyDetails: React.FC<SurveyDetailsProps> = ({ survey, onBack }) => {
  const {
    currentView,
    setCurrentView,
    chartType,
    setChartType,
    responses,
    loading,
    error,
    exportData
  } = useSurveyDetails(survey?._id);

  if (!survey) return null;

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
        {error}
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 0, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ 
        p: 3, 
        bgcolor: 'primary.main', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <IconButton onClick={onBack} sx={{ color: 'white' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h2">
          {survey.title}
        </Typography>
      </Box>

      {/* Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={currentView} 
          onChange={(_, newValue) => setCurrentView(newValue)}
          sx={{ px: 2 }}
        >
          <Tab 
            icon={<BarChartIcon />} 
            label="Graphiques" 
            value="charts"
          />
          <Tab 
            icon={<TableChartIcon />} 
            label="Tableau" 
            value="table"
          />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            Chargement...
          </Box>
        ) : (
          <>
            {currentView === 'charts' ? (
              <Box>
                <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                  <Button
                    variant={chartType === 'bar' ? 'contained' : 'outlined'}
                    onClick={() => setChartType('bar')}
                    startIcon={<BarChartIcon />}
                  >
                    Barres
                  </Button>
                  <Button
                    variant={chartType === 'pie' ? 'contained' : 'outlined'}
                    onClick={() => setChartType('pie')}
                    startIcon={<PieChartIcon />}
                  >
                    Secteurs
                  </Button>
                </Box>
                
                {survey.questions.map((question) => (
                  <Box key={question.id} sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                      {question.text}
                    </Typography>
                    <ResultsChart
                      type={chartType}
                      question={question}
                      responses={responses}
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <ResultsTable
                survey={survey}
                responses={responses}
              />
            )}

            {/* Export Button */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={exportData}
              >
                Exporter les données
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Paper>
  );
}; 