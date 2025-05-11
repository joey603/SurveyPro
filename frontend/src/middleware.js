import { NextResponse } from 'next/server';

// Middleware qui s'exécute avant le rendu de chaque page
export default function middleware(req) {
  const { pathname } = req.nextUrl;
  console.log('🔍 Middleware - URL actuelle:', pathname);
  
  // Vérifier si l'utilisateur est sur un sondage privé
  if (pathname.startsWith('/survey-answer/')) {
    console.log('📝 Middleware - Détection d\'un sondage privé');
    
    // Vérifier si l'utilisateur est connecté via le header Authorization
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      console.log('⚠️ Middleware - Utilisateur non connecté, redirection vers login');
      // Si non connecté, rediriger vers la page de connexion avec l'URL de retour
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', pathname);
      console.log('🔄 Middleware - URL de redirection:', url.toString());
      
      // Créer la réponse de redirection
      const response = NextResponse.redirect(url);
      
      // Ajouter un cookie pour indiquer la redirection
      response.cookies.set('redirectAfterLogin', `${req.nextUrl.origin}${pathname}`, {
        path: '/',
        maxAge: 3600, // 1 heure
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
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