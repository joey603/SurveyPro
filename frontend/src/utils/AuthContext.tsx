"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { loginWithGoogle as googleLogin, loginWithGithub as githubLogin } from "@/services/authService";

// Fonction pour traiter les tokens OAuth
const handleOAuthCallback = async (tokensParam: string) => {
  try {
    const tokenData = JSON.parse(decodeURIComponent(tokensParam));
    return {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      user: tokenData.user
    };
  } catch (error) {
    console.error('Erreur lors du traitement des tokens OAuth:', error);
    throw error;
  }
};

interface AuthContextType {
  accessToken: string | null;
  user: any;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  register: (accessToken: string, refreshToken: string) => void;
  loginWithGoogle: () => void;
  loginWithGithub: () => void;
  handleOAuthCallback: (tokensParam: string) => Promise<{ accessToken: string; refreshToken: string; user: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const publicRoutes = ['/login', '/register', '/verify', '/forgot-password', '/reset-password', '/oauth-callback'];

  const isTokenExpired = (token: string | null): boolean => {
    if (!token) return true;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token && !isTokenExpired(token)) {
      setAccessToken(token);
      setIsAuthenticated(true);
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    } else {
      setIsAuthenticated(false);
      setAccessToken(null);
      setUser(null);
      if (!publicRoutes.includes(pathname as string)) {
        // Sauvegarder l'URL actuelle avant la redirection
        const currentUrl = window.location.pathname + window.location.search;
        console.log('AuthContext: Sauvegarde de l\'URL avant redirection:', currentUrl);
        
        // NE PAS REDIRIGER AUTOMATIQUEMENT - Seulement stocker l'URL
        // Utiliser une approche synchrone pour le stockage
        try {
          // Méthode 1: localStorage
          localStorage.setItem('redirectAfterLogin', currentUrl);
          
          // Méthode 2: localStorage backup
          localStorage.setItem('redirectAfterLogin_backup', currentUrl);
          
          // Méthode 3: sessionStorage
          sessionStorage.setItem('redirectAfterLogin', currentUrl);
          
          // Méthode 4: Cookie
          document.cookie = `redirectAfterLogin_cookie=${encodeURIComponent(currentUrl)}; path=/; max-age=3600`;
          
          // Méthode 5: localStorage sous forme JSON
          const dataObj = { url: currentUrl, timestamp: Date.now() };
          localStorage.setItem('redirectAfterLogin_json', JSON.stringify(dataObj));
          
          // Méthode 6: URL complète
          localStorage.setItem('lastVisitedUrl', window.location.href);
          
          // Forcer la synchronisation en lisant immédiatement les valeurs
          const checkStandard = localStorage.getItem('redirectAfterLogin');
          const checkSession = sessionStorage.getItem('redirectAfterLogin');
          
          console.log('Vérification immédiate des storages:');
          console.log('- localStorage:', checkStandard);
          console.log('- sessionStorage:', checkSession);
          
          // Vérifier que le stockage a bien fonctionné
          if (checkStandard && checkSession) {
            console.log('Stockage réussi, redirection vers login possible');
          } else {
            console.warn('Stockage non vérifié, mais on continue quand même');
          }
          
          // Ajouter un délai suffisant pour garantir le stockage
          setTimeout(() => {
            // Vérification finale
            const finalCheck = localStorage.getItem('redirectAfterLogin');
            console.log('Vérification finale avant redirection:', finalCheck);
            
            // Maintenant, rediriger vers login avec un paramètre from pour être sûr
            window.location.href = `/login?from=${encodeURIComponent(currentUrl)}`;
          }, 300);
        } catch (error) {
          console.error('Erreur lors du stockage de l\'URL:', error);
          // En cas d'erreur, rediriger avec le paramètre directement
          window.location.href = `/login?from=${encodeURIComponent(currentUrl)}`;
        }
      }
    }
    setIsLoading(false);
  }, [pathname]);
  useEffect(() => {
    if (!publicRoutes.includes(pathname as string)) {
      const token = localStorage.getItem("accessToken");
      if (!token || isTokenExpired(token)) {
        logout();
      }
    }
  }, [pathname]);

  const login = async (accessToken: string, refreshToken: string) => {
    try {
      console.log('=== DÉBUT DE LA FONCTION LOGIN (AUTH CONTEXT) ===');
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      setAccessToken(accessToken);
      setIsAuthenticated(true);
      
      // Décoder et définir les informations utilisateur
      const decoded = jwtDecode(accessToken);
      setUser(decoded);
      
      // Vérifier toutes les méthodes possibles de stockage
      console.log('Vérification de toutes les méthodes de stockage:');
      console.log('MÉTHODE STANDARD:', localStorage.getItem('redirectAfterLogin'));
      console.log('MÉTHODE BACKUP:', localStorage.getItem('redirectAfterLogin_backup'));
      console.log('MÉTHODE SESSION:', sessionStorage.getItem('redirectAfterLogin'));
      
      // Vérifier la méthode JSON
      const jsonData = localStorage.getItem('redirectAfterLogin_json');
      let jsonUrl: string | null = null;
      if (jsonData) {
        try {
          const parsed = JSON.parse(jsonData);
          jsonUrl = parsed.url || null;
          console.log('MÉTHODE JSON:', parsed);
          console.log('MÉTHODE JSON URL:', jsonUrl);
        } catch (error) {
          console.error('Erreur de parsing JSON:', error);
        }
      } else {
        console.log('MÉTHODE JSON: Non trouvée');
      }
      
      // Vérifier les cookies
      console.log('TOUS LES COOKIES:', document.cookie);
      
      // Fonction pour récupérer un cookie spécifique
      const getCookieValue = (name: string): string | null => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
      };
      
      const cookieUrl = getCookieValue('redirectAfterLogin_cookie');
      console.log('MÉTHODE COOKIE:', cookieUrl);
      
      // Vérifier l'URL complète stockée
      const lastVisitedUrl = localStorage.getItem('lastVisitedUrl');
      console.log('URL complète stockée:', lastVisitedUrl);
      
      // Obtenir l'URL à partir du lastVisitedUrl si nécessaire
      let urlFromLastVisited: string | null = null;
      if (lastVisitedUrl) {
        try {
          const url = new URL(lastVisitedUrl);
          const surveyId = new URLSearchParams(url.search).get('surveyId');
          if (surveyId) {
            urlFromLastVisited = `/survey-answer?surveyId=${surveyId}`;
            console.log('URL extraite de lastVisitedUrl:', urlFromLastVisited);
          }
        } catch (error) {
          console.error('Erreur lors de l\'extraction de l\'URL:', error);
        }
      }
      
      // Récupérer l'URL de redirection depuis n'importe quelle méthode qui a fonctionné
      // Priorité donnée à la méthode sessionStorage si elle existe
      const sessionUrl = sessionStorage.getItem('redirectAfterLogin');
      const standardUrl = localStorage.getItem('redirectAfterLogin');
      const backupUrl = localStorage.getItem('redirectAfterLogin_backup');
      
      console.log('=== RÉSUMÉ DES MÉTHODES (AUTH CONTEXT) ===');
      console.log('Méthode standard a fonctionné:', !!standardUrl);
      console.log('Méthode backup a fonctionné:', !!backupUrl);
      console.log('Méthode session a fonctionné:', !!sessionUrl);
      console.log('Méthode JSON a fonctionné:', !!jsonUrl);
      console.log('Méthode cookie a fonctionné:', !!cookieUrl);
      console.log('URL extraite de lastVisitedUrl a fonctionné:', !!urlFromLastVisited);
      
      // Sélectionner la première méthode qui a fonctionné, avec priorité à sessionStorage
      const redirectUrl = sessionUrl || standardUrl || backupUrl || jsonUrl || cookieUrl || urlFromLastVisited;
      console.log('URL de redirection finale sélectionnée:', redirectUrl);
      
      // Nettoyer toutes les méthodes de stockage
      localStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('redirectAfterLogin_backup');
      localStorage.removeItem('redirectAfterLogin_json');
      localStorage.removeItem('lastVisitedUrl');
      sessionStorage.removeItem('redirectAfterLogin');
      document.cookie = 'redirectAfterLogin_cookie=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = "origin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "origin_alt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "redirect_uri=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      
      // Rediriger selon ce qui a été trouvé
      if (redirectUrl) {
        console.log('Redirection vers URL sauvegardée:', redirectUrl);
        window.location.href = redirectUrl;
      } else {
        // Redirection par défaut vers la racine
        console.log('Pas d\'URL trouvée, redirection vers /');
        router.push('/');
      }
    } catch (error) {
      console.error('Error in login:', error);
      throw error;
    }
  };

  const logout = () => {
    // Supprimer tous les éléments liés à l'authentification et à la redirection
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("redirectAfterLogin");
    localStorage.removeItem("redirectAfterLogin_backup");
    localStorage.removeItem("redirectAfterLogin_json");
    localStorage.removeItem("lastVisitedUrl");
    localStorage.removeItem("user");
    
    // Nettoyer sessionStorage
    sessionStorage.removeItem("redirectAfterLogin");
    
    // Supprimer également les cookies liés à la redirection
    document.cookie = "origin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "origin_alt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "redirect_uri=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "redirectAfterLogin_cookie=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "oauth_redirect_url=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    // Réinitialiser l'état d'authentification
    setIsAuthenticated(false);
    
    // Rediriger vers la page de connexion
    router.push("/login");
  };

  const register = (accessToken: string, refreshToken: string) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    setIsAuthenticated(true);
    router.push("/verify");
  };

  // Méthodes de connexion OAuth
  const loginWithGoogle = () => {
    const redirectUri = `${window.location.origin}/oauth-callback`;
    googleLogin(redirectUri);
  };

  const loginWithGithub = () => {
    const redirectUri = `${window.location.origin}/oauth-callback`;
    githubLogin(redirectUri);
  };

  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={{
      accessToken,
      user,
      isAuthenticated,
      login,
      logout,
      register,
      loginWithGoogle,
      loginWithGithub,
      handleOAuthCallback
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};