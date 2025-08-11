"use client";

import React from "react";
import { Button, Input, Link, Form, addToast } from "@heroui/react";
import { apiUrl } from "@/utils/apiBase";

// Call the forgot password REST endpoint
async function forgotPasswordRequest(email: string) {
  const response = await fetch(apiUrl("/api/auth/forgot-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    credentials: "include",
  });
  // Always return success shape (backend hides existence) unless real transport error
  if (!response.ok) {
    let message = "Failed to send reset link";
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return response.json();
}

export default function Page() {
  const [email, setEmail] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasSubmitted, setHasSubmitted] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) {
      addToast({
        title: "Error",
        description: "Please enter your email address",
        color: "danger",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await forgotPasswordRequest(email.trim());
      setHasSubmitted(true);
      addToast({
        title: "Password reset",
        description: "If your email exists, a reset link has been sent.",
        color: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send reset link";
      addToast({ title: "Error", description: message, color: "danger" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-[90vh] w-full items-center justify-center">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-large bg-content1 px-8 py-6 shadow-small">
        <div className="flex flex-col gap-1">
          <h1 className="text-large font-medium">Forgot your password?</h1>
          <p className="text-small text-default-500">
            Enter your email to reset it
          </p>
        </div>

        {!hasSubmitted && (
          <Form
            className="flex flex-col gap-3"
            validationBehavior="native"
            onSubmit={handleSubmit}
          >
            <Input
              isRequired
              label="Email Address"
              name="email"
              placeholder="Enter your email"
              type="email"
              variant="bordered"
              value={email}
              onValueChange={setEmail}
              disabled={isSubmitting}
              autoComplete="email"
            />
            <Button
              isLoading={isSubmitting}
              className="w-full"
              color="primary"
              type="submit"
              isDisabled={!email}
            >
              Send Reset Link
            </Button>
          </Form>
        )}

        {hasSubmitted && (
          <div className="flex flex-col gap-3 text-small text-default-600">
            <p>
              If the address <span className="font-medium">{email}</span> is
              registered, you will receive a reset email shortly.
            </p>
            <p className="text-tiny text-default-400">
              Didn’t get the email? Check your spam folder.
            </p>
            <Button
              size="sm"
              variant="flat"
              onPress={() => {
                setHasSubmitted(false);
                setTimeout(
                  () =>
                    document
                      .querySelector<HTMLInputElement>('input[name="email"]')
                      ?.focus(),
                  0
                );
              }}
            >
              Use another email
            </Button>
          </div>
        )}

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
