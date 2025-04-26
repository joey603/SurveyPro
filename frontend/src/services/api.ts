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
    
    // Débogage: afficher les informations de token dans un format masqué
    try {
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      const userIdField = decodedToken.id ? 'id' : (decodedToken.userId ? 'userId' : 'aucun');
      console.log(`API Request: Using token format with ${userIdField} field`);
    } catch (e) {
      console.error('Failed to debug token:', e);
    }
  }
  return config;
});

// Ajouter un intercepteur pour les réponses pour gérer les erreurs communes
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Vérifier si l'erreur est liée à l'authentification (401 Unauthorized, 403 Forbidden)
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.error('Erreur d\'authentification détectée:', error.response.data);
      
      // Si le backend demande de nettoyer les tokens, le faire
      if (error.response.data?.clearTokens) {
        console.log('Suppression des tokens demandée par le serveur');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Rediriger vers la page de connexion
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    } else {
      console.error('API Error:', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
