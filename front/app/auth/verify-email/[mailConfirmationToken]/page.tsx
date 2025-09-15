"use client";

import React, { use, Usable, useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Spinner, Button } from "@heroui/react";
// API base URL fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/providers/AuthProvider";
// Simple fetch state (avoid bringing react-query if not installed)

export default function EmailVerificationPage({
  params,
}: {
  params: Usable<{ mailConfirmationToken: string }>;
}) {
  // Unwrap the params object using React.use()
  const unwrappedParams: { mailConfirmationToken: string } = use(params);
  const mailConfirmationToken = unwrappedParams.mailConfirmationToken;

  const router = useRouter();
  const { refresh } = useAuth();

  // Local state based verification instead of react-query
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ message?: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${API_URL}/api/auth/verify-email/${mailConfirmationToken}`,
          {
            method: "GET",
            credentials: "include",
          }
        );
        const json = await response.json();
        if (!response.ok)
          throw new Error(json.message || "Email verification failed");
        if (!active) return;
        setData(json);
        await refresh();
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Email verification failed");
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [mailConfirmationToken, refresh]);

  const navigateToLogin = () => {
    router.push("/auth/signin");
  };

  const navigateToHome = () => {
    router.push("/");
  };

  // Determine verification status
  const verificationStatus = isLoading
    ? "loading"
    : error
    ? "error"
    : "success";

  // Determine message to display
  const message = isLoading
    ? "Verifying your email..."
    : error
    ? error
    : data?.message || "Your email has been successfully verified!";

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="flex gap-3 justify-center pb-0">
          <h1 className="text-xl font-bold">Email Verification</h1>
        </CardHeader>
        <CardBody className="flex flex-col items-center gap-4 pt-6">
          {verificationStatus === "loading" && (
            <Spinner size="lg" color="primary" />
          )}

          {verificationStatus === "success" && (
            <div className="text-success text-6xl mb-2">✓</div>
          )}

          {verificationStatus === "error" && (
            <div className="text-danger text-6xl mb-2">✗</div>
          )}

          <p className="text-center mb-6">{message}</p>

          {verificationStatus === "success" && (
            <Button
              color="primary"
              onPress={navigateToLogin}
              className="w-full"
            >
              Sign In
            </Button>
          )}

          {verificationStatus === "error" && (
            <Button color="primary" onPress={navigateToHome} className="w-full">
              Return to Home
            </Button>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
