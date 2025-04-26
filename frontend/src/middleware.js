import { NextResponse } from 'next/server';

// Middleware qui s'exécute avant le rendu de chaque page
export function middleware(request) {
  // Laisser passer toutes les requêtes sans modification,
  // mais s'assure que l'application est rendue côté client
  return NextResponse.next();
}

// Configurer le middleware pour s'exécuter sur toutes les routes
export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf:
     * 1. /api (routes API)
     * 2. /_next (fichiers statiques Next.js)
     * 3. /_vercel (fichiers internes Vercel)
     * 4. Les fichiers statiques (extensions de fichiers)
     */
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
}; 