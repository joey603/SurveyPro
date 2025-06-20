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
      
      // Vérifier les méthodes spécifiques aux appareils mobiles
      const mobileCookieUrl = getCookieValue('redirectAfterLogin_mobile');
      console.log('MÉTHODE COOKIE MOBILE:', mobileCookieUrl);
      
      const mobileRedirectUrl = localStorage.getItem('mobile_redirect');
      console.log('MÉTHODE MOBILE REDIRECT:', mobileRedirectUrl);
      
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
      console.log('Méthode cookie mobile a fonctionné:', !!mobileCookieUrl);
      console.log('Méthode mobile redirect a fonctionné:', !!mobileRedirectUrl);
      console.log('URL extraite de lastVisitedUrl a fonctionné:', !!urlFromLastVisited);
      
      // Sélectionner la première méthode qui a fonctionné, avec priorité aux méthodes mobiles
      const redirectUrl = mobileCookieUrl || mobileRedirectUrl || sessionUrl || standardUrl || backupUrl || jsonUrl || cookieUrl || urlFromLastVisited;
      console.log('URL de redirection finale sélectionnée:', redirectUrl);
      
      // Nettoyer toutes les méthodes de stockage
      localStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('redirectAfterLogin_backup');
      localStorage.removeItem('redirectAfterLogin_json');
      localStorage.removeItem('lastVisitedUrl');
      localStorage.removeItem('mobile_redirect');
      sessionStorage.removeItem('redirectAfterLogin');
      document.cookie = 'redirectAfterLogin_cookie=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'redirectAfterLogin_mobile=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
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
    console.log('=== DÉBUT DE LA FONCTION LOGOUT (AUTH CONTEXT) ===');
    
    // Log des valeurs avant suppression
    console.log('Avant suppression - localStorage:');
    console.log('- accessToken:', !!localStorage.getItem("accessToken"));
    console.log('- redirectAfterLogin:', localStorage.getItem("redirectAfterLogin"));
    console.log('- redirectAfterLogin_backup:', localStorage.getItem("redirectAfterLogin_backup"));
    console.log('- redirectAfterLogin_json:', localStorage.getItem("redirectAfterLogin_json"));
    console.log('- lastVisitedUrl:', localStorage.getItem("lastVisitedUrl"));
    console.log('- mobile_redirect:', localStorage.getItem("mobile_redirect"));
    
    console.log('Avant suppression - sessionStorage:');
    console.log('- redirectAfterLogin:', sessionStorage.getItem("redirectAfterLogin"));
    console.log('- surveyId:', sessionStorage.getItem("surveyId"));
    console.log('- lastSurvey:', sessionStorage.getItem("lastSurvey"));
    
    console.log('Avant suppression - cookies:');
    console.log('- Tous les cookies:', document.cookie);
    
    // Supprimer tous les éléments liés à l'authentification et à la redirection
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("redirectAfterLogin");
    localStorage.removeItem("redirectAfterLogin_backup");
    localStorage.removeItem("redirectAfterLogin_json");
    localStorage.removeItem("lastVisitedUrl");
    localStorage.removeItem("user");
    localStorage.removeItem("mobile_redirect");
    
    // Nettoyer tout autre élément potentiel dans localStorage
    localStorage.removeItem("redirectUrl");
    localStorage.removeItem("surveyId");
    localStorage.removeItem("lastSurveyId");
    localStorage.removeItem("currentUrl");
    localStorage.removeItem("redirectPath");
    
    // Nettoyer sessionStorage - suppression de tous les éléments liés à la redirection
    sessionStorage.removeItem("redirectAfterLogin");
    sessionStorage.removeItem("surveyId");
    sessionStorage.removeItem("lastSurvey");
    sessionStorage.removeItem("lastPath");
    sessionStorage.removeItem("redirectUrl");
    sessionStorage.removeItem("currentUrl");
    sessionStorage.removeItem("redirectPath");
    
    // Fonction pour supprimer tous les cookies
    const deleteCookie = (name) => {
      console.log('Tentative de suppression du cookie:', name);
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      // Essayer aussi avec le domaine
      document.cookie = `${name}=; domain=.surveyflow.co; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      // Et avec secure et SameSite=None pour les cookies potentiellement sécurisés
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; SameSite=None`;
    };
    
    // Supprimer également les cookies liés à la redirection
    deleteCookie("origin");
    deleteCookie("origin_alt");
    deleteCookie("redirect_uri");
    deleteCookie("redirectAfterLogin_cookie");
    deleteCookie("redirectAfterLogin_mobile");
    deleteCookie("oauth_redirect_url");
    deleteCookie("surveyId");
    deleteCookie("from");
    deleteCookie("redirectUrl");
    deleteCookie("accessToken");
    deleteCookie("refreshToken");
    
    // Nettoyer tout autre cookie potentiel
    const allCookies = document.cookie.split(';');
    for (let cookie of allCookies) {
      if (cookie.trim()) {
        const cookieName = cookie.split('=')[0].trim();
        deleteCookie(cookieName);
      }
    }
    
    // Log des valeurs après suppression
    console.log('Après suppression - localStorage:');
    console.log('- accessToken:', !!localStorage.getItem("accessToken"));
    console.log('- redirectAfterLogin:', localStorage.getItem("redirectAfterLogin"));
    console.log('- redirectAfterLogin_backup:', localStorage.getItem("redirectAfterLogin_backup"));
    console.log('- redirectAfterLogin_json:', localStorage.getItem("redirectAfterLogin_json"));
    console.log('- lastVisitedUrl:', localStorage.getItem("lastVisitedUrl"));
    console.log('- mobile_redirect:', localStorage.getItem("mobile_redirect"));
    
    console.log('Après suppression - sessionStorage:');
    console.log('- redirectAfterLogin:', sessionStorage.getItem("redirectAfterLogin"));
    console.log('- surveyId:', sessionStorage.getItem("surveyId"));
    console.log('- lastSurvey:', sessionStorage.getItem("lastSurvey"));
    
    console.log('Après suppression - cookies:');
    console.log('- Tous les cookies:', document.cookie);
    
    // Réinitialiser l'état d'authentification
    setIsAuthenticated(false);
    setAccessToken(null);
    setUser(null);
    
    console.log('=== FIN DE LA FONCTION LOGOUT (AUTH CONTEXT) ===');
    
    // Rediriger vers la page de connexion avec un paramètre pour éviter le stockage de l'URL
    window.location.href = "/login?clear=true";
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