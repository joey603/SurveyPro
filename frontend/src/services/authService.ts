import axios from 'axios';

// Déterminer l'URL de l'API en fonction de l'environnement
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // En production, pour OAuth nous devons utiliser l'URL complète du backend
    return 'https://surveypro-ir3u.onrender.com/api/auth';
  }
  return 'http://localhost:5041/api/auth';
};

export const loginWithGoogle = () => {
  const API_URL = getApiUrl();
  // Stocker l'origine actuelle dans un cookie pour la redirection
  const currentOrigin = window.location.origin;
  document.cookie = `origin=${currentOrigin}; path=/; max-age=3600; SameSite=None; Secure`;
  console.log('Cookie origin set to:', currentOrigin);
  console.log('Redirection vers:', `${API_URL}/google`);
  
  window.location.href = `${API_URL}/google`;
};

export const loginWithGithub = () => {
  const API_URL = getApiUrl();
  // Stocker l'origine actuelle dans un cookie pour la redirection
  const currentOrigin = window.location.origin;
  document.cookie = `origin=${currentOrigin}; path=/; max-age=3600; SameSite=None; Secure`;
  console.log('Cookie origin set to:', currentOrigin);
  
  window.location.href = `${API_URL}/github`;
};

export const handleOAuthCallback = async (tokensParam: string) => {
  try {
    console.log('Handling OAuth callback');
    // Décoder les tokens reçus
    const tokensData = JSON.parse(decodeURIComponent(tokensParam));
    console.log('Tokens data received:', { ...tokensData, accessToken: '***', refreshToken: '***' });
    
    // Extraire les tokens et les données utilisateur
    const { accessToken, refreshToken, user } = tokensData;
    
    if (!accessToken || !refreshToken || !user) {
      throw new Error('Invalid authentication data received');
    }
    
    // Stocker les tokens dans le localStorage
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    
    return { accessToken, refreshToken, user };
  } catch (error) {
    console.error('Error in handleOAuthCallback:', error);
    throw error;
  }
};

export const refreshToken = async (refreshToken: string) => {
  try {
    const API_URL = getApiUrl();
    const response = await axios.post(`${API_URL}/refresh-token`, { refreshToken });
    return response.data;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}; 