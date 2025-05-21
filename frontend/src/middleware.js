import { NextResponse } from 'next/server';

// Middleware qui s'exécute avant le rendu de chaque page
export function middleware(request) {
  // Laisser le backend gérer l'authentification
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