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
      if (!publicRoutes.includes(pathname)) {
        // Sauvegarder l'URL actuelle avant la redirection
        const currentUrl = window.location.pathname + window.location.search;
        localStorage.setItem('redirectAfterLogin', currentUrl);
        router.push("/login");
      }
    }
    setIsLoading(false);
  }, [pathname]);

  useEffect(() => {
    if (!publicRoutes.includes(pathname)) {
      const token = localStorage.getItem("accessToken");
      if (!token || isTokenExpired(token)) {
        logout();
      }
    }
  }, [pathname]);

  const login = async (accessToken: string, refreshToken: string) => {
    try {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      setAccessToken(accessToken);
      setIsAuthenticated(true);
      
      // Décoder et définir les informations utilisateur
      const decoded = jwtDecode(accessToken);
      setUser(decoded);
      
      // Récupérer l'URL de redirection sauvegardée
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        // Nettoyer le localStorage immédiatement
        localStorage.removeItem('redirectAfterLogin');
        // Supprimer tous les cookies liés à la redirection
        document.cookie = "origin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "origin_alt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "redirect_uri=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        // Rediriger vers l'URL sauvegardée
        router.push(redirectPath);
      } else {
        // Redirection par défaut vers la racine
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