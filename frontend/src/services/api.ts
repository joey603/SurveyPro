import axios from 'axios';
import { getApiUrl } from './authService';

// Déterminer automatiquement l'URL de base en fonction de l'environnement
const getBaseUrl = () => {
  // En production (Vercel), utiliser l'URL du backend déployé
  if (process.env.NODE_ENV === 'production') {
    return `${getApiUrl()}/api`;
  }
  // En développement, utiliser localhost
  return 'http://localhost:5041/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set up an interceptor to include the token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api; 