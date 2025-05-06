"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Custom404() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger vers la page d'accueil après un court délai
    setTimeout(() => {
      router.push('/');
    }, 500);
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      flexDirection: 'column' 
    }}>
      <h1>404 - Page non trouvée</h1>
      <p>Redirection vers la page d'accueil...</p>
    </div>
  );
} 