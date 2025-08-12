"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/components/providers/AuthProvider";
import { gqlFetch, USER_QUERIES } from "@/utils/graphqlClient";
import { Button, Input, Card, CardBody, CardHeader, Divider, addToast } from "@heroui/react";

interface UpdateUserInput {
  email?: string;
  name?: string | null;
  password?: string;
}

export default function ProfilePage() {
  const { user, refresh, isLoading } = useAuth();
  const [form, setForm] = useState<UpdateUserInput>({ email: "", name: "" });
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ email: user.email, name: user.name ?? "" });
    }
  }, [user]);

  if (isLoading) {
    return <div className="p-6">Chargement...</div>;
  }
  if (!user) {
    return <div className="p-6">Non connecté.</div>;
  }

  const handleChange = (field: keyof UpdateUserInput, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload: UpdateUserInput = {};
    if (form.email && form.email !== user.email) payload.email = form.email;
    if (form.name !== user.name) payload.name = form.name;
    if (password.trim()) payload.password = password.trim();
    if (Object.keys(payload).length === 0) {
      addToast({ title: "Aucune modification", description: "Rien à enregistrer", color: "warning" });
      return;
    }
    try {
      setSaving(true);
      await gqlFetch<{ updateUser: { id: string } }>(USER_QUERIES.UPDATE_USER, {
        id: user.id,
        updateUserInput: payload,
      });
      addToast({ title: "Profil mis à jour", description: "Vos changements sont sauvegardés", color: "success" });
      setPassword("");
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur de mise à jour";
      addToast({ title: "Erreur", description: message, color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Mon profil</h1>
      <Card>
        <CardHeader className="flex flex-col items-start gap-1">
          <h2 className="text-lg font-medium">Informations</h2>
          <p className="text-small text-default-500">Mettre à jour votre email, nom et mot de passe.</p>
        </CardHeader>
        <Divider />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              isRequired
            />
            <Input
              label="Nom"
              value={form.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Votre nom"
            />
            <Input
              label="Nouveau mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              description="Laissez vide pour ne pas changer"
              minLength={6}
            />
            <div className="flex gap-3 justify-end">
              <Button type="submit" color="primary" isLoading={saving} isDisabled={saving}>
                Enregistrer
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
