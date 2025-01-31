"use client";

import "./globals.css";
import { AuthProvider } from "../utils/AuthContext";
import NavBar from "./components/NavBar";
import { CircularProgress, Backdrop } from '@mui/material';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { colors } from '../theme/colors';
import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

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
          <NavBar />
          {children}
        </AuthProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
