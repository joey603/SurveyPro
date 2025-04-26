import axios from 'axios';
import Cookies from 'js-cookie';

// Fonction pour obtenir l'URL de l'API en fonction de l'environnement
export const getApiUrl = () => {
  // En production, utiliser l'URL de l'API déployée
  if (process.env.NODE_ENV === 'production') {
    // Priorité à l'URL définie dans les variables d'environnement
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    
    // URLs alternatives pour les déploiements Vercel
    // L'API backend est déployée sur Render ou une autre plateforme
    return 'https://surveypro-ir3u.onrender.com';
  }

  // En développement, utiliser l'API locale
  return 'http://localhost:5000';
};

// Fonction pour sauvegarder l'origine actuelle dans les cookies
const saveOriginInCookies = () => {
  try {
    // Obtenir l'URL complète actuelle
    const currentOrigin = window.location.origin;
    // Sauvegarder l'origine principale
    Cookies.set('origin', currentOrigin, { expires: 1 });
    
    // Sauvegarder aussi dans un cookie alternatif au cas où
    Cookies.set('origin_alt', currentOrigin, { expires: 1 });
    
    // Sauvegarder l'URL complète actuelle comme redirect_uri
    Cookies.set('redirect_uri', currentOrigin, { expires: 1 });
    
    // Enregistrer aussi le pathname actuel si nécessaire pour une redirection plus précise
    if (window.location.pathname !== '/' && !window.location.pathname.includes('/auth/')) {
      Cookies.set('redirect_path', window.location.pathname, { expires: 1 });
    }
    
    console.log('Origine sauvegardée dans les cookies:', currentOrigin);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'origine:', error);
  }
};

// Fonction pour se connecter avec Google
export const loginWithGoogle = () => {
  try {
    // Sauvegarder l'origine avant la redirection
    saveOriginInCookies();
    
    // URL de l'API backend pour l'authentification Google
    // En production, utiliser l'URL explicite du backend
    const backendUrl = 'https://surveypro-ir3u.onrender.com';
    
    // Log pour le debugging
    console.log('Redirection vers Google OAuth:', `${backendUrl}/api/auth/google`);
    
    // Rediriger vers l'endpoint Google OAuth du backend
    window.location.href = `${backendUrl}/api/auth/google`;
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la connexion avec Google:', error);
    return false;
  }
};

// Fonction pour se connecter avec GitHub
export const loginWithGithub = () => {
  try {
    // Sauvegarder l'origine avant la redirection
    saveOriginInCookies();
    
    // URL de l'API backend pour l'authentification GitHub
    // En production, utiliser l'URL explicite du backend
    const backendUrl = 'https://surveypro-ir3u.onrender.com';
    
    // Log pour le debugging
    console.log('Redirection vers GitHub OAuth:', `${backendUrl}/api/auth/github`);
    
    // Rediriger vers l'endpoint GitHub OAuth du backend
    window.location.href = `${backendUrl}/api/auth/github`;
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la connexion avec GitHub:', error);
    return false;
  }
};

// Fonction pour traiter le callback OAuth et stocker les tokens
export const handleOAuthCallback = async (tokens: { accessToken: string; refreshToken: string }) => {
  try {
    if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
      throw new Error('Tokens d\'authentification manquants ou invalides');
    }
    
    // Sauvegarder les tokens en localStorage
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    
    // Obtenir l'URL de redirection depuis les cookies
    let redirectPath = Cookies.get('redirect_path') || '/dashboard';
    
    // Nettoyer les cookies après utilisation
    Cookies.remove('origin');
    Cookies.remove('origin_alt');
    Cookies.remove('redirect_uri');
    Cookies.remove('redirect_path');
    
    // Rediriger vers la bonne page
    window.location.href = redirectPath;
    
    return true;
  } catch (error) {
    console.error('Erreur lors du traitement du callback OAuth:', error);
    // En cas d'erreur, rediriger vers la page de connexion
    window.location.href = '/auth/login?error=callback_failed';
    return false;
  }
};

// Fonction pour rafraîchir le token d'accès
export const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('Refresh token manquant');
    }
    
    const apiUrl = getApiUrl();
    const response = await axios.post(`${apiUrl}/api/auth/refresh-token`, { refreshToken });
    
    if (response.data && response.data.accessToken) {
      // Mettre à jour le token d'accès
      localStorage.setItem('accessToken', response.data.accessToken);
      
      // Si un nouveau refresh token est fourni, le mettre à jour également
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      
      return response.data.accessToken;
    } else {
      throw new Error('Nouveau token d\'accès non reçu');
    }
  } catch (error) {
    console.error('Erreur lors du rafraîchissement du token:', error);
    
    // En cas d'échec, déconnecter l'utilisateur
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // Rediriger vers la page de connexion
    window.location.href = '/auth/login?error=session_expired';
    
    return null;
  }
};

// Fonction pour déconnecter l'utilisateur
export const logout = () => {
  // Supprimer les tokens du localStorage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  
  // Rediriger vers la page de connexion
  window.location.href = '/auth/login?status=logged_out';
  
  return true;
}; 