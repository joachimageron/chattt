// app/providers.jsx
"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { AuthProvider } from "@/app/components/providers/AuthProvider";
import { ChatProvider } from "@/app/components/chat/ChatContext";

// import {useRouter}from 'next/navigation'

export default function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <HeroUIProvider>
        <ToastProvider
          placement="top-center"
          toastOffset={15}
          toastProps={{ variant: "flat" }}
        />
        <AuthProvider>
          <ChatProvider>{children}</ChatProvider>
        </AuthProvider>
      </HeroUIProvider>
    </>
  );
}
