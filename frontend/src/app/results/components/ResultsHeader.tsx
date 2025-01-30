import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { ViewList, BarChart } from '@mui/icons-material';

interface ResultsHeaderProps {
  currentView: 'list' | 'details';
  onViewChange: (view: 'list' | 'details') => void;
}

export const ResultsHeader: React.FC<ResultsHeaderProps> = ({
  currentView,
  onViewChange
}) => {
  return (
    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="h4">Résultats des sondages</Typography>
      
      <ToggleButtonGroup
        value={currentView}
        exclusive
        onChange={(_, value) => value && onViewChange(value)}
      >
        <ToggleButton value="list">
          <ViewList />
        </ToggleButton>
        <ToggleButton value="details">
          <BarChart />
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}; 