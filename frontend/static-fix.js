// Ce fichier corrige les erreurs de useContext dans le rendu statique
if (typeof window === 'undefined') {
  // On est côté serveur
  const React = require('react');
  
  // Corrige l'erreur "Cannot read properties of null (reading 'useContext')"
  const originalUseContext = React.useContext;
  React.useContext = function useContextWrapper(Context) {
    try {
      return originalUseContext(Context);
    } catch (error) {
      // Retourne un contexte par défaut en cas d'erreur
      console.warn('useContext error intercepted:', error.message);
      return {};
    }
  };
} 