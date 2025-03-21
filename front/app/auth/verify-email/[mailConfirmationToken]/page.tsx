'use client';

import { useState, use, Usable } from 'react';
import { Card, CardBody, CardHeader, Spinner, Button, addToast } from '@heroui/react';
import { API_URL } from '@/utils/config';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';

export default function EmailVerificationPage({
  params
}: {
  params: Usable<{ mailConfirmationToken: string }>;
}) {
  // Unwrap the params object using React.use()
  const unwrappedParams: { mailConfirmationToken: string } = use(params);
  const mailConfirmationToken = unwrappedParams.mailConfirmationToken;
  
  const router = useRouter();
  const { refetchUser } = useAuth();
  
  // Use React Query for email verification
  const { isLoading, error, data } = useQuery({
    queryKey: ['verifyEmail', mailConfirmationToken],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/auth/verify-email/${mailConfirmationToken}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Email verification failed');
      }
      
      // Refresh user data on successful verification
      await refetchUser();
      
      return data;
    },
    retry: false, // Don't retry on failure
    staleTime: Infinity, // This is a one-time verification, no need to refetch
  });

  const navigateToLogin = () => {
    router.push('/auth/signin');
  };

  const navigateToHome = () => {
    router.push('/');
  };

  // Determine verification status
  const verificationStatus = isLoading ? 'loading' : error ? 'error' : 'success';
  
  // Determine message to display
  const message = isLoading 
    ? 'Verifying your email...' 
    : error 
      ? (error instanceof Error ? error.message : 'An error occurred while verifying your email.') 
      : (data?.message || 'Your email has been successfully verified!');

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="flex gap-3 justify-center pb-0">
          <h1 className="text-xl font-bold">Email Verification</h1>
        </CardHeader>
        <CardBody className="flex flex-col items-center gap-4 pt-6">
          {verificationStatus === 'loading' && (
            <Spinner size="lg" color="primary" />
          )}

          {verificationStatus === 'success' && (
            <div className="text-success text-6xl mb-2">✓</div>
          )}

          {verificationStatus === 'error' && (
            <div className="text-danger text-6xl mb-2">✗</div>
          )}

          <p className="text-center mb-6">{message}</p>

          {verificationStatus === 'success' && (
            <Button color="primary" onClick={navigateToLogin} className="w-full">
              Sign In
            </Button>
          )}

          {verificationStatus === 'error' && (
            <Button color="primary" onClick={navigateToHome} className="w-full">
              Return to Home
            </Button>
          )}
        </CardBody>
      </Card>
    </div>
  );
}