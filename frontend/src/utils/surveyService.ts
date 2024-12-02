import axios from "axios";

const BASE_URL = "http://localhost:5041";

if (!BASE_URL) {
  throw new Error("Environment variable NEXT_PUBLIC_BASE_URL is not defined");
}

export const createSurvey = async (data: any, token: string): Promise<any> => {
  try {
    console.log("Creating survey with data:", data);
    console.log("Authorization token:", token);

    const response = await axios.post(`${BASE_URL}/api/surveys`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Response from backend:", response.data);
    return response.data;
  } catch (error: unknown) {
    console.error("Error from backend while creating survey:", (error as any).response?.data || error);
    throw error;
  }
};


export const uploadMedia = async (file: File, token: string) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      "http://localhost:5041/api/surveys/upload",
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
