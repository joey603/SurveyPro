import axios from "axios";

const BASE_URL = "http://localhost:5041";

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

export const uploadMedia = async (file: File, token: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${BASE_URL}/api/surveys/upload-media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error uploading media:', error);
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
