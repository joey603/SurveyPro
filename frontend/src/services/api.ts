// src/services/api.ts
import axios from 'axios';

// Déterminer automatiquement l'URL de base en fonction de l'environnement
const getBaseUrl = () => {
  // En production (Vercel), utiliser l'URL du backend déployé ou les rewrites API
  if (process.env.NODE_ENV === 'production') {
    // Si on utilise les rewrites Vercel, on peut utiliser un chemin relatif
    return '/api';
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

// Ajouter un intercepteur pour les réponses pour gérer les erreurs communes
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
