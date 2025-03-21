// app/providers.jsx
"use client";

import {HeroUIProvider, ToastProvider} from "@heroui/react";
  
// import {useRouter} from 'next/navigation'

export default function Providers({children}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <HeroUIProvider>
        <ToastProvider 
        placement="top-center" 
        toastOffset={15}
        toastProps={{variant:"flat"}}
        />
              {children}
      </HeroUIProvider>
    </>
  );
}
