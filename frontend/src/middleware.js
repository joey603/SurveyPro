import { NextResponse } from 'next/server';

// Middleware qui s'exécute avant le rendu de chaque page
export function middleware(request) {
  // Vérifier si l'utilisateur est sur une enquête privée
  if (request.nextUrl.pathname.startsWith('/survey-answer')) {
    const surveyId = request.nextUrl.searchParams.get('surveyId');
    if (surveyId) {
      // Vérifier si l'utilisateur est authentifié via le cookie
      const accessToken = request.cookies.get('accessToken');
      
      // Si pas de token, rediriger vers la page de connexion
      if (!accessToken) {
        console.log('Middleware - Utilisateur non authentifié, redirection vers login');
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', request.url);
        return NextResponse.redirect(loginUrl);
      }

      // Si le token existe, vérifier sa validité
      try {
        // Vérifier le token avec l'API
        const response = fetch('https://surveypro-ir3u.onrender.com/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${accessToken.value}`
          }
        });

        if (!response.ok) {
          console.log('Middleware - Token invalide, redirection vers login');
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('callbackUrl', request.url);
          return NextResponse.redirect(loginUrl);
        }

        // Token valide, continuer vers la page demandée
        console.log('Middleware - Utilisateur authentifié, accès autorisé');
        return NextResponse.next();
      } catch (error) {
        console.error('Middleware - Erreur lors de la vérification du token:', error);
        // En cas d'erreur, rediriger vers la page de connexion
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', request.url);
        return NextResponse.redirect(loginUrl);
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