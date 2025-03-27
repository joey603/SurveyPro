import axios from 'axios';
import { BASE_URL } from './surveyService';

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
    console.error('Error in respondToSurveyShare:', error);
    throw error;
  }
};

export const shareSurvey = async (surveyId: string, recipientEmail: string, token: string) => {
  try {
    console.log('Service shareSurvey appelé avec:', {
      surveyId,
      recipientEmail,
      tokenPresent: !!token
    });
    
    const url = `${BASE_URL}/api/survey-shares/share`;
    console.log('URL appelée:', url);
    
    const response = await axios({
      method: 'POST',
      url: url,
      data: { surveyId, recipientEmail },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Réponse du service de partage:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Erreur détaillée dans shareSurvey:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
}; 