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
        localStorage.setItem('redirectAfterLogin', currentUrl);
        router.push("/login");
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
      console.log('MÉTHODE 1 (localStorage standard):', localStorage.getItem('redirectAfterLogin'));
      console.log('MÉTHODE 2 (localStorage avec délai):', localStorage.getItem('redirectAfterLogin_method2'));
      console.log('MÉTHODE 3 (window.localStorage):', window.localStorage.getItem('redirectAfterLogin_method3'));
      
      // Vérifier la méthode 4 (JSON)
      const method4Data = localStorage.getItem('redirectAfterLogin_method4');
      let method4Url = null;
      if (method4Data) {
        try {
          const parsed = JSON.parse(method4Data);
          method4Url = parsed.url;
          console.log('MÉTHODE 4 (JSON):', parsed);
          console.log('MÉTHODE 4 URL:', method4Url);
        } catch (error) {
          console.error('Erreur de parsing JSON pour la méthode 4:', error);
        }
      } else {
        console.log('MÉTHODE 4 (JSON): Non trouvée');
      }
      
      // Vérifier les cookies
      console.log('TOUS LES COOKIES:', document.cookie);
      
      // Fonction pour récupérer un cookie spécifique
      const getCookieValue = (name) => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
      };
      
      const method5 = getCookieValue('redirectAfterLogin_cookie');
      console.log('MÉTHODE 5 (Cookie):', method5);
      
      // Récupérer l'URL de redirection depuis n'importe quelle méthode qui a fonctionné
      const method1 = localStorage.getItem('redirectAfterLogin');
      const method2 = localStorage.getItem('redirectAfterLogin_method2');
      const method3 = localStorage.getItem('redirectAfterLogin_method3');
      
      console.log('=== RÉSUMÉ DES MÉTHODES (AUTH CONTEXT) ===');
      console.log('Méthode 1 a fonctionné:', !!method1);
      console.log('Méthode 2 a fonctionné:', !!method2);
      console.log('Méthode 3 a fonctionné:', !!method3);
      console.log('Méthode 4 a fonctionné:', !!method4Url);
      console.log('Méthode 5 a fonctionné:', !!method5);
      
      // Sélectionner la première méthode qui a fonctionné
      const redirectUrl = method1 || method2 || method3 || method4Url || method5;
      console.log('URL de redirection finale sélectionnée:', redirectUrl);
      
      // Nettoyer toutes les méthodes de stockage
      localStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('redirectAfterLogin_method2');
      localStorage.removeItem('redirectAfterLogin_method3');
      localStorage.removeItem('redirectAfterLogin_method4');
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
    localStorage.removeItem("user");
    // Supprimer également les cookies liés à la redirection
    document.cookie = "origin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "origin_alt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "redirect_uri=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setIsAuthenticated(false);
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