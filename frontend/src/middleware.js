import { NextResponse } from 'next/server';

// Middleware qui s'exécute avant le rendu de chaque page
export default function middleware(req) {
  const { pathname } = req.nextUrl;
  
  // Vérifier si l'utilisateur est sur un sondage privé
  if (pathname.startsWith('/survey-answer/')) {
    // Vérifier si l'utilisateur est connecté via le cookie accessToken
    const accessToken = req.cookies.get('accessToken')?.value;
    
    if (!accessToken) {
      // Si non connecté, rediriger vers la page de connexion avec l'URL de retour
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', pathname);
      
      // Créer la réponse de redirection
      const response = NextResponse.redirect(url);
      
      // Stocker l'URL de redirection dans un cookie
      response.cookies.set('redirectAfterLogin', pathname, {
        path: '/',
        maxAge: 3600, // 1 heure
        sameSite: 'lax'
      });
      
      return response;
    }
  }
  
  return NextResponse.next();
}

// Configurer le middleware pour s'exécuter sur toutes les routes
export const config = {
  matcher: [
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