import axios from "axios";

// Helper function to get the access token
const getAccessToken = () => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    throw new Error("Authentication token not found. Please log in.");
  }
  return token;
};

// Create a survey with authentication
export const createSurvey = async (surveyData: any) => {
  const token = getAccessToken();
  try {
    const response = await axios.post("http://localhost:5041/api/surveys", surveyData, {
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
    const response = await axios.get("http://localhost:5041/api/surveys", {
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
