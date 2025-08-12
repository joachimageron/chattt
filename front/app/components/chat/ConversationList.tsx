"use client";
import React from "react";
import {
  Card,
  CardBody,
  ScrollShadow,
  Button,
  Avatar,
  Tooltip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  useDisclosure,
  Autocomplete,
  AutocompleteItem,
  Listbox,
  ListboxItem,
} from "@heroui/react";
import { useChat } from "./ChatContext";
import type { ConversationSummary } from "./types";
import { useState } from "react";
import { useChatSocket } from "./useChatSocket";
import { useAuth } from "../providers/AuthProvider";
import { gqlFetch, USER_QUERIES } from "@/utils/graphqlClient";

interface ConversationListProps {
  onSelect?: (id: string) => void;
}

export function ConversationList({ onSelect }: ConversationListProps) {
  const { conversations, activeConversationId, setActiveConversation } =
    useChat();
  const list = Object.values(conversations) as ConversationSummary[];
  const { createConversation } = useChatSocket();
  const { user } = useAuth();
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [title, setTitle] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [userResults, setUserResults] = useState<
    { id: string; email: string; name?: string | null }[]
  >([]);
  const [selectedUsers, setSelectedUsers] = useState<
    { id: string; email: string }[]
  >([]);
  const searchDebounceRef = React.useRef<number | null>(null);

  const runSearch = async (term: string) => {
    try {
      if (!term.trim()) {
        setUserResults([]);
        return;
      }
      const data = await gqlFetch<{
        searchUsersByEmail: {
          id: string;
          email: string;
          name?: string | null;
        }[];
      }>(USER_QUERIES.SEARCH_BY_EMAIL, { q: term });
      setUserResults(data.searchUsersByEmail.filter((u) => u.id !== user?.id));
    } catch (e) {
      console.error(e);
    }
  };

  const addSelectedUser = (userToAdd: { id: string; email: string }) => {
    if (!userToAdd.id) return;
    if (selectedUsers.find((u) => u.id === userToAdd.id)) return;
    // On accepte plusieurs ajouts; si plus d'un participant => groupe
    setSelectedUsers((prev) => [...prev, userToAdd]);
  };

  const removeSelectedUser = (id: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleCreate = () => {
    const isGroup = selectedUsers.length > 1;
    const ids = selectedUsers
      .map((u) => u.id)
      .filter((s) => s && s !== user?.id);
    if (!ids.length) return;
    createConversation(
      ids,
      isGroup ? title || undefined : undefined,
      isGroup ? "GROUP" : "DIRECT"
    );
    setSelectedUsers([]);
    setTitle("");
    onClose();
  };

  // Edition du titre déplacée dans la page principale de chat; pas d'édition ici.

  return (
    <div className="w-72 border-r border-divider flex flex-col">
      <div className="p-3 flex items-center justify-between gap-2">
        <span className="font-semibold">Conversations</span>
        <Tooltip content="Nouvelle conversation">
          <Button size="sm" variant="light" onPress={onOpen} className="">
            +
          </Button>
        </Tooltip>
      </div>
      <ScrollShadow className="flex-1 pr-2">
        {list.length === 0 && (
          <div className="text-sm text-default-500 px-3 py-4">
            Aucune conversation
          </div>
        )}
        {list.map((c) => {
          const active = c.id === activeConversationId;
          // Fallback title logic for direct conversations without explicit title
          let displayTitle = c.title;
          if (!displayTitle && c.type === "DIRECT" && user) {
            const other = c.participants.find((p) => p.userId !== user.id);
            if (other?.user) {
              displayTitle = other.user.name || other.user.email;
            }
          }
          return (
            <Card
              key={c.id}
              isPressable
              onPress={() => {
                setActiveConversation(c.id);
                onSelect?.(c.id);
              }}
              className={`mb-2 shadow-none ${
                active ? "border-primary border-2" : ""
              }`}
              fullWidth
            >
              <CardBody className="py-2 flex flex-row items-center gap-3">
                <Avatar size="sm" name={displayTitle || c.id.slice(0, 4)} />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {displayTitle || "Sans titre"}
                  </span>
                  <span className="text-xs text-default-400">
                    {c.type === "DIRECT" ? "Direct" : "Groupe"}
                  </span>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </ScrollShadow>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center">
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Nouvelle conversation
              </ModalHeader>
              <ModalBody>
                {selectedUsers.length > 1 && (
                  <Input
                    label="Titre (groupe)"
                    placeholder="Nom du groupe"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    aria-label="Titre du groupe"
                  />
                )}
                <Autocomplete
                  label="Participants"
                  placeholder={
                    selectedUsers.length > 1
                      ? "Rechercher un participant puis Entrée"
                      : selectedUsers.length === 1
                      ? "Ajouter un autre participant (optionnel)"
                      : "Sélectionner un participant"
                  }
                  allowsCustomValue={false}
                  items={userResults}
                  inputValue={searchEmail}
                  onInputChange={(value) => {
                    setSearchEmail(value);
                    if (searchDebounceRef.current) {
                      window.clearTimeout(searchDebounceRef.current);
                    }
                    searchDebounceRef.current = window.setTimeout(() => {
                      runSearch(value);
                    }, 300);
                  }}
                  onSelectionChange={(key) => {
                    if (!key || key === "all") return;
                    const found = userResults.find((u) => u.id === key);
                    if (found) {
                      addSelectedUser(found);
                    }
                    // reset champ
                    setSearchEmail("");
                    setUserResults([]);
                  }}
                  aria-label="Sélection de participants"
                >
                  {(u) => (
                    <AutocompleteItem key={u.id} textValue={u.email}>
                      <div className="flex flex-col">
                        <span className="text-sm">{u.name || u.email}</span>
                        {u.name && (
                          <span className="text-xs text-default-400">
                            {u.email}
                          </span>
                        )}
                      </div>
                    </AutocompleteItem>
                  )}
                </Autocomplete>
                {selectedUsers.length > 0 && (
                  <Listbox
                    aria-label="Participants sélectionnés"
                    selectionMode="none"
                    variant="flat"
                  >
                    {selectedUsers.map((u) => (
                      <ListboxItem
                        key={u.id}
                        textValue={u.email}
                        endContent={
                          <span className="text-danger text-sm">×</span>
                        }
                        className="cursor-pointer"
                        onPress={() => removeSelectedUser(u.id)}
                      >
                        {u.email}
                      </ListboxItem>
                    ))}
                  </Listbox>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Annuler
                </Button>
                <Button color="primary" onPress={handleCreate}>
                  Créer
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
