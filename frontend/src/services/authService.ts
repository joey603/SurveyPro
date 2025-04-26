import axios from 'axios';

// Déterminer l'URL de l'API en fonction de l'environnement
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // En production sur Vercel, nous utilisons des rewrites donc nous pouvons utiliser des chemins relatifs
    // ce qui évite les problèmes CORS
    return '/api/auth';
  }
  return 'http://localhost:5041/api/auth';
};

export const loginWithGoogle = () => {
  const API_URL = getApiUrl();
  // Stocker l'origine actuelle dans un cookie pour la redirection
  const currentOrigin = window.location.origin;
  
  // Double sécurité : stocker aussi l'origine dans le localStorage
  try {
    localStorage.setItem('auth_origin', currentOrigin);
    console.log('Origin saved in localStorage:', currentOrigin);
  } catch (error) {
    console.error('Could not save origin in localStorage:', error);
  }
  
  // Configurer le cookie avec les bonnes options pour qu'il soit accessible au backend
  // En production sur un domaine avec HTTPS, ça utilisera SameSite=None, Secure
  // En développement ou sans HTTPS, ça utilisera SameSite=Lax
  try {
    if (currentOrigin.includes('https://')) {
      document.cookie = `origin=${currentOrigin}; path=/; max-age=3600; SameSite=None; Secure`;
      // Essayons aussi un cookie avec d'autres paramètres pour plus de compatibilité
      document.cookie = `origin_alt=${currentOrigin}; path=/; max-age=3600; SameSite=Lax`;
    } else {
      document.cookie = `origin=${currentOrigin}; path=/; max-age=3600; SameSite=Lax`;
    }
    console.log('Cookie origin set to:', currentOrigin);
  } catch (error) {
    console.error('Could not set cookie:', error);
  }
  
  // Ajouter le paramètre de redirection à l'URL d'authentification
  const redirectUri = encodeURIComponent(currentOrigin);
  const authUrl = `${API_URL}/google?redirect_uri=${redirectUri}`;
  console.log('Redirection vers:', authUrl);
  
  // Rediriger vers l'API d'authentification Google
  window.location.href = authUrl;
};

export const loginWithGithub = () => {
  const API_URL = getApiUrl();
  // Stocker l'origine actuelle dans un cookie pour la redirection
  const currentOrigin = window.location.origin;
  
  // Double sécurité : stocker aussi l'origine dans le localStorage
  try {
    localStorage.setItem('auth_origin', currentOrigin);
    console.log('Origin saved in localStorage:', currentOrigin);
  } catch (error) {
    console.error('Could not save origin in localStorage:', error);
  }
  
  // Configurer le cookie avec les bonnes options pour qu'il soit accessible au backend
  // En production sur un domaine avec HTTPS, ça utilisera SameSite=None, Secure
  // En développement ou sans HTTPS, ça utilisera SameSite=Lax
  try {
    if (currentOrigin.includes('https://')) {
      document.cookie = `origin=${currentOrigin}; path=/; max-age=3600; SameSite=None; Secure`;
      // Essayons aussi un cookie avec d'autres paramètres pour plus de compatibilité
      document.cookie = `origin_alt=${currentOrigin}; path=/; max-age=3600; SameSite=Lax`;
    } else {
      document.cookie = `origin=${currentOrigin}; path=/; max-age=3600; SameSite=Lax`;
    }
    console.log('Cookie origin set to:', currentOrigin);
  } catch (error) {
    console.error('Could not set cookie:', error);
  }
  
  // Ajouter le paramètre de redirection à l'URL d'authentification
  const redirectUri = encodeURIComponent(currentOrigin);
  const authUrl = `${API_URL}/github?redirect_uri=${redirectUri}`;
  console.log('Redirection vers:', authUrl);
  
  // Rediriger vers l'API d'authentification GitHub
  window.location.href = authUrl;
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