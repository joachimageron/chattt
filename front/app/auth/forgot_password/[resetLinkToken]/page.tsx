"use client";

import React, { useState } from "react";
import { Button, Input, Link, Form, addToast } from "@heroui/react";
import { useRouter, useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { apiUrl } from "@/utils/apiBase";

async function resetPasswordRequest(token: string, password: string) {
  const response = await fetch(apiUrl(`/api/auth/reset-password/${token}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
    credentials: "include",
  });
  if (!response.ok) {
    let message = "Failed to reset password";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const router = useRouter();
  const params = useParams();
  const resetToken = params.resetLinkToken as string;

  const valid = pw.length >= 6 && pw === pw2;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!valid) {
      setError("Passwords must match and be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await resetPasswordRequest(resetToken, pw);
      addToast({
        title: "Password reset",
        description: "Your password has been reset.",
        color: "success",
      });
      setTimeout(() => router.push("/auth/signin"), 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reset password";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[90vh] w-full items-center justify-center">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-large bg-content1 px-8 py-6 shadow-small">
        <div className="flex flex-col gap-1">
          <h1 className="text-large font-medium">Reset your password</h1>
          <p className="text-small text-default-500">Enter your new password</p>
        </div>
        <Form
          className="flex flex-col gap-3"
          validationBehavior="native"
          onSubmit={handleSubmit}
        >
          <Input
            isRequired
            label="New Password"
            name="password"
            placeholder="Enter your new password"
            type={isPasswordVisible ? "text" : "password"}
            variant="bordered"
            value={pw}
            onValueChange={setPw}
            endContent={
              <button
                type="button"
                onClick={() => setIsPasswordVisible((v) => !v)}
              >
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
            autoComplete="new-password"
          />
          <Input
            isRequired
            label="Confirm New Password"
            name="confirmPassword"
            placeholder="Confirm your new password"
            type={isConfirmPasswordVisible ? "text" : "password"}
            variant="bordered"
            value={pw2}
            onValueChange={setPw2}
            endContent={
              <button
                type="button"
                onClick={() => setIsConfirmPasswordVisible((v) => !v)}
              >
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
            autoComplete="new-password"
          />
          {pw && pw.length < 6 && (
            <p className="text-tiny text-danger">Minimum 6 characters</p>
          )}
          {pw && pw2 && pw !== pw2 && (
            <p className="text-tiny text-danger">Passwords do not match</p>
          )}
          {error && <p className="text-tiny text-danger">{error}</p>}
          <Button
            isLoading={loading}
            className="w-full"
            color="primary"
            type="submit"
            isDisabled={!valid || loading}
          >
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
