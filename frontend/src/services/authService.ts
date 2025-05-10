// Fonction pour obtenir l'URL de l'API en fonction de l'environnement
export const getApiUrl = () => {
  // En production, utiliser l'URL de l'API déployée
  if (process.env.NODE_ENV === 'production') {
    // Priorité à l'URL définie dans les variables d'environnement
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    
    // URL de l'API en production
    return 'https://surveypro-ir3u.onrender.com';
  }

  // En développement, utiliser l'API locale
  return 'http://localhost:5041';
};

export const loginWithGoogle = (redirectUri: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041';
  const googleAuthUrl = `${baseUrl}/api/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
  window.location.href = googleAuthUrl;
};

export const loginWithGithub = (redirectUri: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041';
  const githubAuthUrl = `${baseUrl}/api/auth/github?redirect_uri=${encodeURIComponent(redirectUri)}`;
  window.location.href = githubAuthUrl;
}; 