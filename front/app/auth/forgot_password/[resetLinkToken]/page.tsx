"use client";

import React, { useState } from "react";
import {Button, Input, Link, Form, addToast} from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/utils/config";
import { Icon } from "@iconify/react";

// Function to call the reset password API
const resetPassword = async ({ token, password }: { token: string; password: string }) => {
  const response = await fetch(`${API_URL}/api/auth/reset-password/${token}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to reset password");
  }

  return response.json();
};

export default function Page() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const params = useParams();
  const router = useRouter();
  const resetToken = params.resetLinkToken as string;

  const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);
  const toggleConfirmPasswordVisibility = () => setIsConfirmPasswordVisible(!isConfirmPasswordVisible);

  // Use React Query mutation for state management
  const resetPasswordMutation = useMutation({
    mutationFn: (password: string) => resetPassword({ token: resetToken, password }),
    onSuccess: () => {
      addToast({
        title: "Password reset",
        description: "Your password has been reset successfully.",
        color: "success",
      });
      
      // Redirect to login page after successful password reset
      setTimeout(() => {
        router.push("/auth/signin");
      }, 2000);
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to reset password. The link may be expired or invalid.");
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const password = data.get("password");
    const confirmPassword = data.get("confirmPassword");

    if (!password || !confirmPassword) {
      setError("Both fields are required.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    // Call the mutation to reset the password
    resetPasswordMutation.mutate(password as string);
  };

  return (
    <div className="flex h-[90vh] w-full items-center justify-center">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-large bg-content1 px-8 py-6 shadow-small">
        <div className="flex flex-col gap-1">
          <h1 className="text-large font-medium">Reset your password</h1>
          <p className="text-small text-default-500">Enter your new password</p>
        </div>

        <Form className="flex flex-col gap-3" validationBehavior="native" onSubmit={handleSubmit}>
          <Input
            isRequired
            label="New Password"
            name="password"
            placeholder="Enter your new password"
            type={isPasswordVisible ? "text" : "password"}
            variant="bordered"
            endContent={
              <button type="button" onClick={togglePasswordVisibility}>
                {isPasswordVisible ? (
                  <Icon
                    className="pointer-events-none text-xl text-default-400"
                    icon="solar:eye-closed-linear"
                  />
                ) : (
                  <Icon
                    className="pointer-events-none text-xl text-default-400"
                    icon="solar:eye-bold"
                  />
                )}
              </button>
            }
          />
          <Input
            isRequired
            label="Confirm New Password"
            name="confirmPassword"
            placeholder="Confirm your new password"
            type={isConfirmPasswordVisible ? "text" : "password"}
            variant="bordered"
            endContent={
              <button type="button" onClick={toggleConfirmPasswordVisibility}>
                {isConfirmPasswordVisible ? (
                  <Icon
                    className="pointer-events-none text-xl text-default-400"
                    icon="solar:eye-closed-linear"
                  />
                ) : (
                  <Icon
                    className="pointer-events-none text-xl text-default-400"
                    icon="solar:eye-bold"
                  />
                )}
              </button>
            }
          />
          {error && <p className="text-red-500">{error}</p>}
          <Button isLoading={loading || resetPasswordMutation.isPending} className="w-full" color="primary" type="submit">
            Reset Password
          </Button>
        </Form>

        <p className="text-center text-small">
          Changed your mind?&nbsp;
          <Link href="/auth/signin" size="sm">
            Go back to signin
          </Link>
        </p>
      </div>
    </div>
  );
}
