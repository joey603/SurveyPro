import axios from 'axios';
import type { Survey } from '../types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041/api';

// Fonction pour récupérer le token d'authentification
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
};

// Configuration axios avec intercepteur pour ajouter le token
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Fonctions d'API
export const fetchSurveys = async (): Promise<Survey[]> => {
  try {
    const response = await api.get('/surveys');
    return response.data;
  } catch (error) {
    console.error('Error fetching surveys:', error);
    throw error;
  }
};

export const deleteSurvey = async (id: string): Promise<void> => {
  try {
    await api.delete(`/surveys/${id}`);
  } catch (error) {
    console.error('Error deleting survey:', error);
    throw error;
  }
};

export const shareSurvey = async (surveyId: string, email: string): Promise<void> => {
  try {
    await api.post('/survey-shares/share', {
      surveyId,
      recipientEmail: email
    });
  } catch (error) {
    console.error('Error sharing survey:', error);
    throw error;
  }
};

export const fetchSurveyResponses = async (surveyId: string) => {
  try {
    const response = await api.get(`/surveys/${surveyId}/responses`);
    return response.data;
  } catch (error) {
    console.error('Error fetching survey responses:', error);
    throw error;
  }
};

export const respondToShare = async (shareId: string, accept: boolean): Promise<void> => {
  try {
    await api.post(`/survey-shares/${shareId}/respond`, {
      accept
    });
  } catch (error) {
    console.error('Error responding to share:', error);
    throw error;
  }
};

// Pour les sondages dynamiques
export const fetchDynamicSurveyResults = async (surveyId: string) => {
  try {
    const response = await api.get(`/surveys/${surveyId}/dynamic-results`);
    return response.data;
  } catch (error) {
    console.error('Error fetching dynamic survey results:', error);
    throw error;
  }
};

// Pour les analyses avancées
export const fetchSurveyAnalytics = async (surveyId: string, params?: {
  startDate?: string;
  endDate?: string;
  filters?: Record<string, any>;
}) => {
  try {
    const response = await api.get(`/surveys/${surveyId}/analytics`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching survey analytics:', error);
    throw error;
  }
}; 