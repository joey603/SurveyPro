import { NextResponse } from 'next/server';

// Middleware qui s'exécute avant le rendu de chaque page
export function middleware(request) {
  // Vérifier si l'utilisateur est sur une enquête privée
  if (request.nextUrl.pathname.startsWith('/survey-answer')) {
    const surveyId = request.nextUrl.searchParams.get('surveyId');
    if (surveyId) {
      // Vérifier si l'utilisateur est authentifié via le cookie
      const accessToken = request.cookies.get('accessToken');
      
      if (!accessToken) {
        // Construire l'URL complète à sauvegarder
        const fullUrl = request.url;
        console.log('Middleware - URL complète à sauvegarder:', fullUrl);
        
        // Rediriger vers la page de connexion avec l'URL originale comme paramètre callbackUrl
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', fullUrl);
        
        // Créer la réponse de redirection
        const response = NextResponse.redirect(loginUrl);
        
        // Stocker l'URL complète dans un cookie avec les bons paramètres
        // Utiliser un encodage pour éviter les problèmes avec les caractères spéciaux
        const encodedUrl = encodeURIComponent(fullUrl);
        response.cookies.set('redirectAfterLogin', encodedUrl, {
          path: '/',
          maxAge: 3600, // 1 heure
          httpOnly: false, // Permettre l'accès depuis JavaScript
          secure: process.env.NODE_ENV === 'production', // Secure en production seulement
          sameSite: 'lax'
        });
        
        console.log('Middleware - Cookie redirectAfterLogin défini avec:', encodedUrl);
        
        return response;
      }
    }
  }

  return NextResponse.next();
}

// Configurer le middleware pour s'exécuter sur toutes les routes
export const config = {
  matcher: [
    '/survey-answer/:path*',
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 