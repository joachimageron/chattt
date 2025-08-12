"use client";

import React from "react";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
} from "@heroui/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import DarkModeSwitch from "@/app/components/DarkModeSwitch";
import { useAuth } from "@/app/components/providers/AuthProvider";

export default function AppNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  // Masquer la navbar sur toutes les routes auth
  if (pathname?.startsWith("/auth")) return null;

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/auth/signin");
    } catch {
      // déjà géré par toast dans logout
    }
  };

  return (
    <Navbar
      maxWidth="full"
      position="sticky"
      className="border-b border-default-200 dark:border-default-100"
    >
      <NavbarBrand as={Link} href="/" className="gap-2">
        <span className="font-bold text-xl">Chattt</span>
      </NavbarBrand>

      {/* <NavbarContent className="hidden sm:flex gap-6" justify="center">
        <NavbarItem isActive={pathname === "/"}>
          <HeroLink as={Link} href="/">
            Accueil
          </HeroLink>
        </NavbarItem>
        <NavbarItem isActive={pathname?.startsWith("/chat")}>
          <HeroLink as={Link} href="/chat">
            Chat
          </HeroLink>
        </NavbarItem>
      </NavbarContent> */}

      <NavbarContent justify="end" className="items-center gap-4">
        <NavbarItem>
          <DarkModeSwitch />
        </NavbarItem>
        {!isLoading && !user && (
          <NavbarItem className="hidden sm:flex">
            <Button
              as={Link}
              color="primary"
              href="/auth/signin"
              size="sm"
              variant="flat"
            >
              Se connecter
            </Button>
          </NavbarItem>
        )}
        {!isLoading && !user && (
          <NavbarItem>
            <Button as={Link} color="secondary" href="/auth/register" size="sm">
              S&apos;inscrire
            </Button>
          </NavbarItem>
        )}
        {user && (
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Avatar
                as="button"
                name={user.name || user.email}
                size="sm"
                color="secondary"
                className="transition-transform"
              />
            </DropdownTrigger>
            <DropdownMenu aria-label="Menu utilisateur" variant="flat">
              <DropdownItem key="profile" className="h-14 gap-2" href="/profile" >
                <p className="font-semibold">Connecté en tant que</p>
                <p className="text-small text-default-500">{user.email}</p>
              </DropdownItem>
              <DropdownItem key="conversations" href="/chat">
                Mes conversations
              </DropdownItem>
              <DropdownItem
                key="logout"
                color="danger"
                className="text-danger"
                onPress={handleLogout}
              >
                Déconnexion
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )}
      </NavbarContent>
    </Navbar>
  );
}
