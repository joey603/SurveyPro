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