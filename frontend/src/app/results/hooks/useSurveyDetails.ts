import { useState, useEffect } from 'react';
import { fetchSurveyResponses, fetchDynamicSurveyResults } from '../api';
import type { SurveyResponse } from '../types';

export const useSurveyDetails = (surveyId: string | undefined) => {
  const [currentView, setCurrentView] = useState<'charts' | 'table'>('charts');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) return;

    const loadResponses = async () => {
      try {
        setLoading(true);
        const data = await fetchSurveyResponses(surveyId);
        setResponses(data);
      } catch (err) {
        setError('Erreur lors du chargement des réponses');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadResponses();
  }, [surveyId]);

  const exportData = () => {
    // Implémenter l'export des données
    console.log('Export data');
  };

  return {
    currentView,
    setCurrentView,
    chartType,
    setChartType,
    responses,
    loading,
    error,
    exportData
  };
}; 