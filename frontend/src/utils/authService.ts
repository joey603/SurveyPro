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
  const token = getAccessToken(); // Get token from localStorage

  const response = await axios.post("http://localhost:5041/api/surveys", surveyData, {
    headers: {
      Authorization: `Bearer ${token}`, // Attach token
    },
  });

  return response.data; // Return the API response
};

// Example: Fetch surveys
export const fetchSurveys = async () => {
  const token = getAccessToken(); // Get token from localStorage

  const response = await axios.get("http://localhost:5041/api/surveys", {
    headers: {
      Authorization: `Bearer ${token}`, // Attach token
    },
  });

  return response.data; // Return the API response
};
