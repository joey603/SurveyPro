import axios from "axios";

const API_BASE_URL = 'http://localhost:5041/api/surveys';

export const BASE_URL = "http://localhost:5041";

if (!BASE_URL) {
  throw new Error("Environment variable NEXT_PUBLIC_BASE_URL is not defined");
}

const DEFAULT_CITIES = [
  "Tel Aviv",
  "Jerusalem",
  "Haifa",
  "Rishon LeZion",
  "Petah Tikva",
  "Ashdod",
  "Netanya",
  "Beer Sheva",
  "Holon",
  "Bnei Brak"
];

export const uploadMedia = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('Uploading media to:', `${API_BASE_URL}/upload-media`);

    const response = await fetch(`${API_BASE_URL}/upload-media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: formData,
      mode: 'cors'
    });

    console.log('Upload response status:', response.status);

    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message;
      } catch (e) {
        errorMessage = 'Failed to upload media';
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Upload success, received URL:', data.url);
    return data.url;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
};

export const deleteMedia = async (publicId: string): Promise<void> => {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('Attempting to delete media with publicId:', publicId);
    console.log('Using API URL:', `${API_BASE_URL}/delete-media`);

    const response = await fetch(`${API_BASE_URL}/delete-media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({ publicId }),
      mode: 'cors'
    });

    console.log('Delete response status:', response.status);

    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message;
      } catch (e) {
        errorMessage = 'Failed to delete media';
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Delete result:', result);
  } catch (error) {
    console.error('Error deleting media:', error);
    throw error;
  }
};

export const createSurvey = async (data: any, token: string): Promise<any> => {
  try {
    console.log('Sending survey data:', data);

    const response = await axios.post(`${BASE_URL}/api/surveys`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error: any) {
    console.error("Error creating survey:", error.response?.data || error);
    throw error.response?.data || error;
  }
};

export const submitSurveyAnswer = async (surveyId: string, data: any, token: string): Promise<any> => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/survey-answers/submit`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error submitting survey answers:', error);
    throw error.response?.data || error;
  }
};

export const getSurveyAnswers = async (surveyId: string, token: string): Promise<any> => {
  try {
    const response = await axios.get(
      `${BASE_URL}/api/survey-answers/${surveyId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error fetching survey answers:', error);
    throw error.response?.data || error;
  }
};

export const fetchSurveys = async (token: string): Promise<any> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/surveys`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching surveys:", error);
    throw error.response?.data || error;
  }
};

export const fetchCities = async (token: string): Promise<string[]> => {
  try {
    if (!token) {
      return DEFAULT_CITIES;
    }

    const response = await axios.get(`${BASE_URL}/api/surveys/cities`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (Array.isArray(response.data)) {
      return response.data;
    }
    return DEFAULT_CITIES;
  } catch (error: any) {
    console.error('Error fetching cities:', error);
    return DEFAULT_CITIES;
  }
};

export const fetchAvailableSurveys = async (token: string): Promise<any> => {
  console.log('Début fetchAvailableSurveys avec token:', token ? 'Token présent' : 'Pas de token');
  
  try {
    if (!token) {
      throw new Error('Token d\'authentification requis');
    }

    console.log('Envoi de la requête à:', `${BASE_URL}/api/surveys/available`);
    
    const response = await axios.get(`${BASE_URL}/api/surveys/available`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Réponse reçue:', response);
    console.log('Données reçues:', response.data);

    if (!response.data) {
      throw new Error('Aucune donnée reçue du serveur');
    }

    return response.data;
  } catch (error: any) {
    console.error("Erreur complète:", error);
    console.error("Message d'erreur:", error.message);
    console.error("Réponse d'erreur:", error.response);
    console.error("Données d'erreur:", error.response?.data);
    
    if (error.response?.data) {
      throw error.response.data;
    }
    throw new Error(error.message || 'Erreur lors de la récupération des sondages');
  }
};

export const getSurveyById = async (id: string, token: string): Promise<any> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/surveys/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    // Log pour déboguer
    console.log('Retrieved survey data:', response.data);
    
    // Vérifier que les médias sont présents
    response.data.questions.forEach((question: any) => {
      console.log('Question media:', question.media);
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching survey:", error);
    throw error;
  }
};

export const fetchPendingShares = async (token: string): Promise<any> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/survey-shares/pending`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching pending shares:', error);
    throw error.response?.data || error;
  }
};

export const respondToSurveyShare = async (shareId: string, accept: boolean, token: string): Promise<any> => {
  try {
    console.log('Envoi de la réponse au partage:', { shareId, accept });
    
    const response = await axios.post(
      `${BASE_URL}/api/survey-shares/respond`,
      { 
        shareId: shareId,
        accept 
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Réponse reçue:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Erreur lors de la réponse au partage:', error);
    console.error('Détails de l\'erreur:', error.response?.data);
    throw error.response?.data || error;
  }
};
