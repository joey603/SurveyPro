"use client";

import "./globals.css";
import { AuthProvider } from "../utils/AuthContext";
import NavBar from "./components/NavBar";
import { CircularProgress, Backdrop } from '@mui/material';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

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
              color: '#667eea',
              zIndex: 9999,
              backgroundColor: 'rgba(255, 255, 255, 0.7)'
            }}
            open={true}
          >
            <CircularProgress 
              sx={{
                color: '#667eea'
              }}
            />
          </Backdrop>
        )}
        <AuthProvider>
          <NavBar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
