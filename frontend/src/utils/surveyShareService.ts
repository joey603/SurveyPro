import axios from 'axios';
import { BASE_URL } from './surveyService';

export const respondToSurveyShare = async (shareId: string, accept: boolean, token: string) => {
  try {
    console.log('Service respondToSurveyShare appelé avec:', {
      shareId,
      accept,
      tokenPresent: !!token
    });
    
    const url = `${BASE_URL}/api/survey-shares/respond`;
    console.log('URL appelée:', url);
    
    const response = await axios({
      method: 'POST',
      url: url,
      data: { shareId, accept },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Réponse du service de réponse au partage:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Erreur détaillée dans respondToSurveyShare:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const shareSurvey = async (surveyId: string, recipientEmail: string, token: string) => {
  try {
    console.log('Service shareSurvey called with:', {
      surveyId,
      recipientEmail
    });
    
    const response = await axios.post(
      `${BASE_URL}/api/survey-shares/share`,
      { surveyId, recipientEmail },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    console.error('Detailed error in shareSurvey:', {
      status: error.response?.status,
      message: error.message,
      responseData: error.response?.data
    });
    
    // Specific case: user not found
    if (error.response?.status === 404) {
      throw new Error(`The user with email "${recipientEmail}" does not exist in the system.`);
    }
    
    // Specific case: share already pending or accepted
    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.message || '';
      
      if (errorMessage.includes('pending')) {
        throw new Error(`The user with email "${recipientEmail}" already has a pending invitation for this survey.`);
      }
      
      if (errorMessage.includes('already accepted')) {
        throw new Error(`The user with email "${recipientEmail}" has already accepted this survey.`);
      }
      
      if (errorMessage.includes('owner')) {
        throw new Error(`The user with email "${recipientEmail}" is already the owner of this survey.`);
      }
    }
    
    // For other types of errors
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'An error occurred while sharing the survey'
    );
  }
}; 