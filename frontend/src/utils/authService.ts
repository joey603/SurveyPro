import axios from "axios";
import { API_URL, BASE_URL } from "./surveyService";

// Récupérer le token d'accès du localStorage
export const getAccessToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
};

// Create a survey with authentication
export const createSurvey = async (surveyData: any) => {
  const token = getAccessToken();
  try {
    const response = await axios.post(`${API_URL}/surveys`, surveyData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating survey:', error);
    throw error;
  }
};

// Fetch surveys
export const fetchSurveys = async () => {
  const token = getAccessToken();
  try {
    const response = await axios.get(`${API_URL}/surveys`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching surveys:', error);
    throw error;
  }
};

// Fetch cities
export const fetchCities = async () => {
  try {
    const response = await axios.get("http://localhost:5041/api/cities", {
      headers: {
        'Content-Type': 'application/json'
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching cities:', error);
    // Retourner une liste de villes par défaut en cas d'erreur
    return [
      "Tel Aviv", "Jerusalem", "Haifa", "Rishon LeZion",
      "Petah Tikva", "Ashdod", "Netanya", "Beer Sheva",
      "Holon", "Bnei Brak"
    ];
  }
};
