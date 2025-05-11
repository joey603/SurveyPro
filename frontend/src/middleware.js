import { NextResponse } from 'next/server';

// Middleware qui s'exécute avant le rendu de chaque page
export default function middleware(req) {
  const { pathname } = req.nextUrl;
  
  // Vérifier si l'utilisateur est sur un sondage privé
  if (pathname.startsWith('/survey-answer/')) {
    // Vérifier si l'utilisateur est connecté via le header Authorization
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      // Si non connecté, rediriger vers la page de connexion avec l'URL de retour
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      
      // S'assurer que l'URL est correctement encodée
      const encodedPath = encodeURIComponent(pathname);
      url.searchParams.set('callbackUrl', encodedPath);
      
      // Créer la réponse de redirection
      const response = NextResponse.redirect(url);
      
      // Ajouter des headers pour le débogage
      response.headers.set('x-redirect-path', pathname);
      response.headers.set('x-redirect-url', url.toString());
      
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