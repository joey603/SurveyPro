import axios from 'axios';

const API_URL = 'http://localhost:5041/api/auth';

export const loginWithGoogle = () => {
  // Stocker l'origine actuelle dans un cookie pour la redirection
  document.cookie = `origin=${window.location.origin}; path=/; max-age=3600`;
  console.log('Cookie origin set to:', window.location.origin);
  
  window.location.href = `${API_URL}/google`;
};

export const loginWithGithub = () => {
  // Stocker l'origine actuelle dans un cookie pour la redirection
  document.cookie = `origin=${window.location.origin}; path=/; max-age=3600`;
  console.log('Cookie origin set to:', window.location.origin);
  
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
    const response = await axios.post(`${API_URL}/refresh-token`, { refreshToken });
    return response.data;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}; 