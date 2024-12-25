"use client";

import "./globals.css";
import { AuthProvider } from "../utils/AuthContext";
import { usePathname } from 'next/navigation';
import NavBar from "./component/NavBar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showNavbar = !['/login', '/register'].includes(pathname);

  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {showNavbar && <NavBar />}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
