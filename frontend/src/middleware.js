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
        // Construire l'URL de redirection avec l'URL complète
        const fullUrl = request.url;
        console.log('Middleware - URL complète à sauvegarder:', fullUrl);
        
        // Rediriger vers la page de connexion avec l'URL complète
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', fullUrl);
        
        // Stocker l'URL complète dans un cookie
        const response = NextResponse.redirect(loginUrl);
        response.cookies.set('redirectAfterLogin', fullUrl, {
          path: '/',
          maxAge: 3600, // 1 heure
          secure: true,
          sameSite: 'lax'
        });
        
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