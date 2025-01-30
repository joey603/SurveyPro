import React from 'react';
import { Box, Card, CircularProgress } from '@mui/material';
import { SurveyFilters } from './SurveyFilters';
import { SurveyCard } from './SurveyCard';
import { useSurveyFilters } from '../hooks/useSurveyFilters';
import type { Survey } from '../types';

interface SurveyListProps {
  surveys: Survey[];
  loading: boolean;
  onSurveySelect: (survey: Survey) => void;
  onDeleteSurvey: (id: string) => void;
  onShareResponse: (id: string, accept: boolean) => void;
}

export const SurveyList: React.FC<SurveyListProps> = ({
  surveys,
  loading,
  onSurveySelect,
  onDeleteSurvey,
  onShareResponse
}) => {
  const {
    filteredSurveys,
    filters,
    setFilters,
    clearFilters
  } = useSurveyFilters(surveys);

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box>
      <SurveyFilters 
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={clearFilters}
      />
      
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {filteredSurveys.map(survey => (
          <SurveyCard
            key={survey._id}
            survey={survey}
            onSelect={() => onSurveySelect(survey)}
            onDelete={() => onDeleteSurvey(survey._id)}
            onShare={onShareResponse}
          />
        ))}
      </Box>
    </Box>
  );
}; 