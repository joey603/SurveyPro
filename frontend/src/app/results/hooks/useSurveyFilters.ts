import { useState, useMemo } from 'react';
import type { Survey, SurveyFilters } from '../types';

export const useSurveyFilters = (surveys: Survey[]) => {
  const [filters, setFilters] = useState<SurveyFilters>({
    search: '',
    date: null,
    responses: null
  });

  const filteredSurveys = useMemo(() => {
    return surveys.filter(survey => {
      // Filtre par recherche
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          survey.title.toLowerCase().includes(searchLower) ||
          (survey.description?.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Autres filtres à implémenter...
      
      return true;
    });
  }, [surveys, filters]);

  const clearFilters = () => {
    setFilters({
      search: '',
      date: null,
      responses: null
    });
  };

  return {
    filters,
    setFilters,
    clearFilters,
    filteredSurveys
  };
}; 