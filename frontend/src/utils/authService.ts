import axios from 'axios';

const API_BASE = 'http://localhost:5041/api/auth';

export const registerUser = async (data: { username: string; email: string; password: string }) => {
  return axios.post(`${API_BASE}/register`, data);
};

export const verifyEmail = async (data: { email: string; verificationCode: string }) => {
  return axios.post(`${API_BASE}/verify-email`, data);
};

export const loginUser = async (data: { email: string; password: string }) => {
  return axios.post(`${API_BASE}/login`, data);
};

export const getUserProfile = async (accessToken: string) => {
  return axios.get(`${API_BASE}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
};

export const refreshAccessToken = async (refreshToken: string) => {
  return axios.post(`${API_BASE}/refresh-token`, { refreshToken });
};

export const logoutUser = async (refreshToken: string) => {
  return axios.post(`${API_BASE}/logout`, { refreshToken });
};

// utils/authService.ts

// Efface les tokens d'accès et de rafraîchissement du stockage local
export const clearTokens = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };
  
  
  // Récupère le token d'accès depuis le stockage local
  export const getAccessToken = () => {
    return localStorage.getItem("accessToken");
  };
  
 
  