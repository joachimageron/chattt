"use client";

import { useAuth } from "../components/providers/AuthProvider";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Spinner } from "@heroui/react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // Récupération du pathname actuel
  
  console.log("Current pathname:", pathname);
  
  useEffect(() => {
    // Si on n'est pas sur la page de vérification d'email et que l'utilisateur est connecté
    if (user && !isLoading && !pathname.includes('/auth/verify-email/')) {
      router.push("/");
    }
  }, [user, isLoading, router, pathname]);

  // Show loading spinner while checking authentication status
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // Only render children (login/register forms) if user is not authenticated
  return <>{children}</>;
}