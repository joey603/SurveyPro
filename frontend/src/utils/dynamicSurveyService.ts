import axios from 'axios';

const BASE_URL = 'http://localhost:5041/api';

interface DynamicSurvey {
  title: string;
  description?: string;
  demographicEnabled: boolean;
  nodes: any[];
  edges: any[];
}

export const dynamicSurveyService = {
  // Créer un nouveau sondage dynamique
  createDynamicSurvey: async (surveyData: DynamicSurvey, token: string) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/dynamic-surveys`,
        surveyData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de la création du sondage dynamique:', error);
      throw error.response?.data || error;
    }
  },

  // Récupérer tous les sondages dynamiques
  getDynamicSurveys: async (token: string) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/dynamic-surveys`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de la récupération des sondages:', error);
      throw error.response?.data || error;
    }
  },

  // Récupérer un sondage dynamique par ID
  getDynamicSurveyById: async (id: string, token: string) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/dynamic-surveys/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de la récupération du sondage:', error);
      throw error.response?.data || error;
    }
  },

  // Mettre à jour un sondage dynamique
  updateDynamicSurvey: async (id: string, surveyData: Partial<DynamicSurvey>, token: string) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/dynamic-surveys/${id}`,
        surveyData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du sondage:', error);
      throw error.response?.data || error;
    }
  },

  // Supprimer un sondage dynamique
  deleteDynamicSurvey: async (id: string, token: string) => {
    try {
      const response = await axios.delete(
        `${BASE_URL}/dynamic-surveys/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de la suppression du sondage:', error);
      throw error.response?.data || error;
    }
  }
}; 