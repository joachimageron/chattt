"use client";

import { Button } from "@heroui/react";
import { useAuth } from "./components/providers/AuthProvider";


export default function Home() {
  const { logout } = useAuth();
  
  
  return (
    <main className={"m-auto max-w-xl mb-20"}>
      <Button onPress={()=>logout()}>Click me</Button>
    </main>
  )
    ;
}
