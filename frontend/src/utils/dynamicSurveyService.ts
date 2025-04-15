import axios from 'axios';

// Utiliser la variable d'environnement si disponible, sinon localhost
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ? 
  `${process.env.NEXT_PUBLIC_API_URL}/api` : 
  'http://localhost:5041/api';

interface DynamicSurvey {
  title: string;
  description?: string;
  demographicEnabled: boolean;
  nodes: any[];
  edges: any[];
  isPrivate: boolean;
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
  },

  // Ajouter cette nouvelle méthode
  getUserAnsweredSurveys: async (token: string) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/dynamic-survey-answers/user`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      // Retourner uniquement les IDs des sondages répondus
      return response.data.map((answer: any) => answer.surveyId);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des réponses:', error);
      return [];
    }
  },

  // Upload media file
  uploadMedia: async (file: File, token: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${BASE_URL}/dynamic-surveys/upload-media`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de l\'upload du média:', error);
      throw error.response?.data || error;
    }
  },

  // Delete media file
  deleteMedia: async (publicId: string, token: string) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/dynamic-surveys/delete-media`,
        { publicId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de la suppression du média:', error);
      throw error.response?.data || error;
    }
  },

  // Ajouter une nouvelle méthode pour récupérer les sondages de l'utilisateur connecté
  getUserDynamicSurveys: async (token: string) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/dynamic-surveys/user`,
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
  }
}; 