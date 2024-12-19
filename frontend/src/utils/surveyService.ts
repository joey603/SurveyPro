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

// Helper function to get the access token
const getAccessToken = () => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    throw new Error("Authentication token not found. Please log in.");
  }
  return token;
};

export const createSurvey = async (data: any, token: string): Promise<any> => {
  try {
    const response = await axios.post(`${BASE_URL}/api/surveys`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating survey:", error);
    throw error;
  }
};

export const uploadMedia = async (file: File, token: string) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      `${BASE_URL}/api/surveys/upload`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
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
