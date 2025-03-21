"use client";

import React from "react";
import { Button, Input, Link, Form, addToast } from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import { API_URL } from "@/utils/config";

// Function to call the forgot password API
const forgotPassword = async (email: string) => {
  const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to send reset link");
  }

  return response.json();
};

export default function Page() {
  // Use React Query mutation for state management
  const forgotPasswordMutation = useMutation({
    mutationFn: (email: string) => forgotPassword(email),
    onSuccess: () => {
      addToast({
        title: "Password reset",
        description: "If your email exists in our system, a reset link has been sent.",
        color: "success",
      });
    },
    onError: (error: Error) => {
      addToast({
        title: "Error",
        description: error.message || "Failed to send reset link",
        color: "danger",
      });
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const email = data.get("email") as string;

    if (!email) {
      addToast({
        title: "Error",
        description: "Please enter your email address",
        color: "danger",
      });
      return;
    }

    // Trigger the mutation
    forgotPasswordMutation.mutate(email);
  };

  return (
    <div className="flex h-[90vh] w-full items-center justify-center">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-large bg-content1 px-8 py-6 shadow-small">
        <div className="flex flex-col gap-1">
          <h1 className="text-large font-medium">Forgot your password?</h1>
          <p className="text-small text-default-500">Enter your email to reset it</p>
        </div>

        <Form className="flex flex-col gap-3" validationBehavior="native" onSubmit={handleSubmit}>
          <Input
            isRequired
            label="Email Address"
            name="email"
            placeholder="Enter your email"
            type="email"
            variant="bordered"
            disabled={forgotPasswordMutation.isPending}
          />
          <Button 
            isLoading={forgotPasswordMutation.isPending} 
            className="w-full" 
            color="primary" 
            type="submit"
          >
            Send Reset Link
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
