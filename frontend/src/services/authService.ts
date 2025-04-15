import axios from 'axios';

// Déterminer l'URL de l'API en fonction de l'environnement
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_API_URL ? 
      `${process.env.NEXT_PUBLIC_API_URL}/auth` : 
      'https://surveypro-ir3u.onrender.com/api/auth';
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

export const handleOAuthCallback = async (tokens: string) => {
  try {
    console.log('Raw tokens string:', tokens); // Debug log
    const parsedData = JSON.parse(decodeURIComponent(tokens));
    console.log('Parsed OAuth data:', parsedData); // Debug log
    
    if (!parsedData.accessToken || !parsedData.refreshToken) {
      throw new Error('Missing tokens in parsed data');
    }
    
    return {
      accessToken: parsedData.accessToken,
      refreshToken: parsedData.refreshToken,
      user: parsedData.user
    };
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
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