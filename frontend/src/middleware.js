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
        // Construire l'URL de redirection
        const loginUrl = new URL('/login', request.url);
        
        // Utiliser l'URL complète de la requête comme URL de redirection
        const redirectUrl = request.url;
        console.log('Middleware - URL de redirection:', redirectUrl);
        
        // Ajouter l'URL de redirection comme paramètre
        loginUrl.searchParams.set('callbackUrl', redirectUrl);
        
        // Rediriger vers la page de connexion
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