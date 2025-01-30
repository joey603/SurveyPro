import { useState, useEffect } from 'react';
import { fetchSurveys, deleteSurvey } from '../api';
import type { Survey } from '../types';

export const useResults = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const data = await fetchSurveys();
      setSurveys(data);
    } catch (err) {
      setError('Erreur lors du chargement des sondages');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSurveySelect = (survey: Survey) => {
    setSelectedSurvey(survey);
  };

  const handleDeleteSurvey = async (id: string) => {
    try {
      await deleteSurvey(id);
      setSurveys(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      console.error(err);
      // Gérer l'erreur
    }
  };

  const handleShareResponse = async (id: string, accept: boolean) => {
    // Implémenter la logique de partage
  };

  return {
    surveys,
    selectedSurvey,
    loading,
    error,
    handleSurveySelect,
    handleDeleteSurvey,
    handleShareResponse
  };
}; 