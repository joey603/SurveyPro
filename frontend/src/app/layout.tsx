"use client";

import "./globals.css";
import { AuthProvider } from "@/utils/AuthContext";
import NavBar from "./components/NavBar";
import { CircularProgress, Backdrop } from '@mui/material';
import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { colors } from '../theme/colors';
import { useAuth } from '@/utils/AuthContext';

const AuthHandler = ({ children }: { children: React.ReactNode }) => {
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const auth = searchParams.get('auth');

    if (accessToken && refreshToken && auth === 'success') {
      try {
        login(accessToken, refreshToken);
        // Nettoyer l'URL
        window.history.replaceState({}, document.title, '/');
      } catch (error) {
        console.error('Error processing auth tokens:', error);
        window.location.href = '/login?error=auth_failed';
      }
    }
  }, [searchParams, login]);

  return <>{children}</>;
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <html lang="en">
      <body>
        {isLoading && (
          <Backdrop
            sx={{
              color: colors.primary.main,
              zIndex: 9999,
              backgroundColor: colors.background.overlay
            }}
            open={true}
          >
            <CircularProgress 
              sx={{
                color: colors.primary.main
              }}
            />
          </Backdrop>
        )}
        <AuthProvider>
          <AuthHandler>
            <NavBar />
            {children}
          </AuthHandler>
        </AuthProvider>
      </body>
    </html>
  );
}
