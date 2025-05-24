"use client";

import "./globals.css";
import { AuthProvider } from "@/utils/AuthContext";
import NavBar from "./components/NavBar";
import { CircularProgress, Backdrop } from '@mui/material';
import { useState, useEffect, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { colors } from '@/theme/colors';
import { useAuth } from '@/utils/AuthContext';

const AuthHandler = ({ children }: { children: React.ReactNode }) => {
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    if (searchParams) {
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
    }
  }, [searchParams, login]);

  return <>{children}</>;
};

// Composant qui utilise les params et la navigation
const NavigationManager = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
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
      {children}
    </>
  );
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <AuthHandler>
            <NavBar />
            <Suspense fallback={
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
            }>
              <NavigationManager>
                {children}
              </NavigationManager>
            </Suspense>
          </AuthHandler>
        </AuthProvider>
      </body>
    </html>
  );
}