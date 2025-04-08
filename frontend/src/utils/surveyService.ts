import axios from "axios";
import { dynamicSurveyService } from "./dynamicSurveyService";

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041';
export const API_URL = `${BASE_URL}/api`;

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

    console.log('Uploading media to:', `${API_URL}/surveys/upload-media`);

    const response = await fetch(`${API_URL}/surveys/upload-media`, {
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
    console.log('Using API URL:', `${API_URL}/surveys/delete-media`);

    const response = await fetch(`${API_URL}/surveys/delete-media`, {
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

    const response = await axios.post(`${API_URL}/surveys`, data, {
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

export const submitSurveyAnswer = async (surveyId: string, data: any, token: string) => {
  try {
    console.log('Données à soumettre:', {
      surveyId,
      isDynamic: data.isDynamic,
      data
    });

    if (data.isDynamic) {
      // Format pour les sondages dynamiques
      const formattedData = {
        surveyId,
        answers: data.answers.map((answer: any) => ({
          nodeId: answer.questionId || answer.nodeId,
          value: answer.value || answer.answer
        })),
        demographic: data.demographic,
        path: data.path || []
      };

      console.log('Données formatées (dynamique):', formattedData);

      return await axios.post(
        `${API_URL}/dynamic-survey-answers/submit`,
        formattedData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    } else {
      // Format pour les sondages classiques
      const formattedData = {
        surveyId,
        answers: Array.isArray(data.answers) 
          ? data.answers.map((answer: any) => ({
              questionId: answer.questionId,
              value: answer.value
            }))
          : Object.entries(data.answers).map(([questionId, value]) => ({
              questionId,
              value
            })),
        demographic: data.demographic
      };

      console.log('Données formatées (classique):', formattedData);

      return await axios.post(
        `${API_URL}/survey-answers/submit`,
        formattedData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    }
  } catch (error: any) {
    console.error('Erreur détaillée lors de la soumission:', error.response?.data || error);
    throw error;
  }
};

interface DynamicSurveyNode {
  id: string;
  type: string;
  data: {
    text?: string;
    label?: string;
    questionType?: string;
    type?: string;
    options?: string[];
    [key: string]: any;
  };
  position?: {
    x: number;
    y: number;
  };
}

interface DynamicSurvey {
  _id: string;
  title: string;
  description?: string;
  nodes?: DynamicSurveyNode[];
  edges?: any[];
  userId: string;
  createdAt: string;
  demographicEnabled?: boolean;
  [key: string]: any;
}

export const fetchSurveys = async (token: string) => {
  try {
    console.log('===== DÉBUT fetchSurveys =====');
    
    // Récupérer les sondages statiques de l'utilisateur
    const response = await axios.get(`${BASE_URL}/api/surveys`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    // Récupérer les sondages dynamiques de l'utilisateur
    const dynamicResponse = await axios.get(`${BASE_URL}/api/dynamic-surveys`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    // Récupérer les sondages partagés et acceptés
    const sharedResponse = await axios.get(`${BASE_URL}/api/survey-shares/shared-with-me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    const surveys = response.data.map((survey: any) => ({
      ...survey,
      isDynamic: false,
      isOwner: true // Marquer comme appartenant à l'utilisateur
    }));
    
    const dynamicSurveys = dynamicResponse.data.map((survey: any) => ({
      ...survey,
      isDynamic: true,
      isOwner: true // Marquer comme appartenant à l'utilisateur
    }));
    
    const sharedSurveys = sharedResponse.data;
    
    console.log(`Sondages récupérés: ${surveys.length} statiques, ${dynamicSurveys.length} dynamiques, ${sharedSurveys.length} partagés`);
    
    // Valider chaque sondage partagé pour le débogage
    if (sharedSurveys.length > 0) {
      console.log('Détails des sondages partagés:');
      sharedSurveys.forEach((survey: any, index: number) => {
        console.log(`Sondage partagé #${index+1}:`, {
          id: survey._id,
          title: survey.title || 'Sans titre',
          isDynamic: survey.isDynamic,
          shareId: survey.shareId,
          isShared: survey.isShared,
          status: survey.status
        });
      });
    }
    
    // Combiner tous les types de sondages
    const allSurveys = [...surveys, ...dynamicSurveys, ...sharedSurveys];
    console.log(`Total de ${allSurveys.length} sondages récupérés`);
    
    console.log('===== FIN fetchSurveys =====');
    return allSurveys;
  } catch (error) {
    console.error('Erreur lors de la récupération des sondages:', error);
    return [];
  }
};

export const fetchCities = async (token: string): Promise<string[]> => {
  try {
    if (!token) {
      return DEFAULT_CITIES;
    }

    const response = await axios.get(`${API_URL}/surveys/cities`, {
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

export const fetchAvailableSurveys = async (token: string) => {
  try {
    console.log('Fetching surveys from:', API_URL); // Mise à jour du log

    // Mise à jour des URLs pour utiliser API_URL
    const classicResponse = await axios.get(`${API_URL}/surveys/available`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Classic surveys:', classicResponse.data);

    const dynamicResponse = await axios.get(`${API_URL}/dynamic-surveys`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Dynamic surveys:', dynamicResponse.data);

    const dynamicSurveys = dynamicResponse.data.map((survey: any) => ({
      ...survey,
      isDynamic: true,
      questions: survey.nodes.map((node: any) => ({
        id: node.id,
        text: node.data.text || node.data.label || 'Question sans texte',
        type: node.type,
        options: node.data.options || []
      }))
    }));

    return [...classicResponse.data, ...dynamicSurveys];
  } catch (error) {
    console.error('Erreur lors de la récupération des sondages:', error);
    throw error;
  }
};

export const getSurveyById = async (id: string, token: string): Promise<any> => {
  try {
    const response = await axios.get(`${API_URL}/surveys/${id}`, {
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

export const fetchPendingShares = async (token: string) => {
  try {
    console.log('===== DÉBUT fetchPendingShares =====');
    
    const response = await axios.get(`${BASE_URL}/api/survey-shares/pending`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    const pendingShares = response.data;
    console.log(`${pendingShares.length} partages en attente récupérés`);
    
    // Analyser les résultats pour les problèmes potentiels
    if (pendingShares.length > 0) {
      const dynamicShares = pendingShares.filter((s: any) => s.isDynamic);
      const staticShares = pendingShares.filter((s: any) => !s.isDynamic);
      
      console.log(`- ${dynamicShares.length} sondages dynamiques en attente`);
      console.log(`- ${staticShares.length} sondages statiques en attente`);
      
      if (dynamicShares.length > 0) {
        console.log('Détails des sondages dynamiques en attente:', 
          dynamicShares.map((s: any) => ({
            id: s._id,
            title: s.title,
            nodes: s.nodes?.length || 0,
            edges: s.edges?.length || 0
          }))
        );
      }
    }
    
    console.log('===== FIN fetchPendingShares =====');
    return pendingShares;
  } catch (error) {
    console.error('Erreur lors de la récupération des partages en attente:', error);
    return [];
  }
};

export const respondToSurveyShare = async (shareId: string, accept: boolean, token: string) => {
  try {
    const response = await axios({
      method: 'POST',
      url: `${BASE_URL}/api/survey-shares/respond`,
      data: { shareId, accept },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error responding to survey share:', error);
    throw error;
  }
};

// Nouvelle fonction pour supprimer explicitement un partage de sondage
export const deleteSurveyShare = async (shareId: string, token: string) => {
  try {
    console.log('Attempting to explicitly delete survey share:', shareId);
    
    const response = await axios({
      method: 'DELETE',
      url: `${BASE_URL}/api/survey-shares/${shareId}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Share deletion response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error deleting survey share:', error);
    throw error;
  }
};

export const fetchAnsweredSurveys = async (token: string) => {
  try {
    // Récupérer les réponses aux sondages classiques
    const classicResponse = await axios.get(`${BASE_URL}/survey-answers/responses/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const classicAnswers = classicResponse.data.map((response: any) => response.surveyId);

    // Récupérer les réponses aux sondages dynamiques
    const dynamicAnswers = await dynamicSurveyService.getUserAnsweredSurveys(token);

    // Combiner les deux types de réponses
    const allAnsweredSurveys = [...classicAnswers, ...dynamicAnswers];
    console.log('Tous les sondages répondus:', allAnsweredSurveys);

    return allAnsweredSurveys;
  } catch (error) {
    console.error('Erreur lors de la récupération des sondages répondus:', error);
    return [];
  }
};

export const getSurveyAnswers = async (surveyId: string, token: string, isDynamic = false) => {
  try {
    console.log(`Fetching ${isDynamic ? 'dynamic' : 'static'} survey answers for ${surveyId}`);
    
    const endpoint = isDynamic
      ? `${BASE_URL}/api/dynamic-survey-answers/survey/${surveyId}`
      : `${BASE_URL}/api/survey-answers/${surveyId}`;
    
    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    const answers = response.data;
    console.log(`Found ${answers.length} answers for survey ${surveyId}`);
    
    // Formater les réponses pour assurer la compatibilité
    if (isDynamic) {
      return answers.map((answer: any) => ({
        _id: answer._id,
        surveyId: answer.surveyId,
        answers: (answer.answers || []).map((a: any) => ({
          questionId: a.nodeId || a.questionId,
          answer: a.answer || a.value
        })),
        submittedAt: answer.submittedAt,
        respondent: answer.respondent
      }));
    }
    
    return answers;
  } catch (error) {
    console.error('Error fetching survey answers:', error);
    return [];
  }
};

// Nouvelle fonction pour vérifier si un sondage existe
export const checkSurveyExists = async (surveyId: string, token: string) => {
  try {
    const response = await axios({
      method: 'GET',
      url: `${BASE_URL}/api/surveys/${surveyId}/exists`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.exists;
  } catch (error) {
    console.error('Error checking if survey exists:', error);
    return false;
  }
};

// Fonction de partage mise à jour
export const shareSurvey = async (surveyId: string, recipientEmail: string, token: string) => {
  try {
    console.log('Tentative de partage avec:', { 
      surveyId, 
      recipientEmail 
    });
    
    const response = await axios({
      method: 'POST',
      url: `${BASE_URL}/api/survey-shares/share`,
      data: { surveyId, recipientEmail },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error: any) {
    console.error('Error sharing survey:', error);
    
    // Gérer spécifiquement l'erreur de destinataire non trouvé
    if (error.response?.status === 404) {
      if (error.response.data?.message === "Destinataire non trouvé" || 
          error.response.data?.message === "Recipient not found") {
        throw new Error(`L'utilisateur avec l'email ${recipientEmail} n'est pas inscrit sur la plateforme`);
      } else if (error.response.data?.message === "Sondage non trouvé" || 
                error.response.data?.message === "Survey not found") {
        throw new Error("Ce sondage ne peut pas être partagé");
      }
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw error;
  }
};
