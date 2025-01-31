"use client";

import "./globals.css";
import { AuthProvider } from "../utils/AuthContext";
import NavBar from "./components/NavBar";
import { CircularProgress, Backdrop, Snackbar, Alert } from '@mui/material';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { colors } from '../theme/colors';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });
  const pathname = usePathname();

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

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
        <Snackbar 
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </body>
    </html>
  );
}
