// src/services/surveyService.ts
import api from './../services/api';

// Fonction pour créer un sondage
export const createSurvey = async (surveyData: any, token: string) => {
  try {
    const response = await api.post('/surveys/create', surveyData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating survey:", error);
    throw error;
  }
};

// Fonction pour obtenir la liste des sondages
export const getSurveys = async (token: string) => {
  try {
    const response = await api.get('/surveys', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching surveys:", error);
    throw error;
  }
};

// Fonction pour obtenir un sondage spécifique par ID
export const getSurveyById = async (surveyId: string, token: string) => {
  try {
    const response = await api.get(`/surveys/${surveyId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching survey:", error);
    throw error;
  }
};
