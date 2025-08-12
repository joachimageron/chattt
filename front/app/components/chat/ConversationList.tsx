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
  Checkbox,
  useDisclosure,
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
  const [isGroup, setIsGroup] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [userResults, setUserResults] = useState<
    { id: string; email: string; name?: string | null }[]
  >([]);
  const [selectedUsers, setSelectedUsers] = useState<
    { id: string; email: string }[]
  >([]);

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

  const handleSelectUser = (u: { id: string; email: string }) => {
    if (selectedUsers.find((s) => s.id === u.id)) return;
    setSelectedUsers((prev) => [...prev, u]);
    setSearchEmail("");
    setUserResults([]);
  };
  const removeSelected = (id: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleCreate = () => {
    const ids = selectedUsers
      .map((u) => u.id)
      .filter((s) => s && s !== user?.id);
    if (!ids.length) return;
    createConversation(ids, title || undefined, isGroup ? "GROUP" : "DIRECT");
    setSelectedUsers([]);
    setTitle("");
    setIsGroup(false);
    onClose();
  };

  return (
    <div className="w-72 border-r border-divider flex flex-col">
      <div className="p-3 flex items-center justify-between gap-2">
        <span className="font-semibold">Conversations</span>
        <Tooltip content="Nouvelle conversation">
          <Button size="sm" variant="light" onPress={onOpen}>
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
                <Input
                  label="Titre (groupe)"
                  placeholder="Nom du groupe"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  isDisabled={!isGroup}
                />
                <Checkbox
                  isSelected={isGroup}
                  onValueChange={(v) => setIsGroup(v)}
                >
                  Groupe
                </Checkbox>
                <Input
                  label="Rechercher un participant par email"
                  placeholder="Tapez un email"
                  value={searchEmail}
                  onChange={async (e) => {
                    const v = e.target.value;
                    setSearchEmail(v);
                    runSearch(v);
                  }}
                />
                {userResults.length > 0 && (
                  <div className="max-h-40 overflow-auto border rounded p-2 space-y-1">
                    {userResults.map((u) => (
                      <div
                        key={u.id}
                        className="flex justify-between items-center text-sm"
                      >
                        <span>{u.email}</span>
                        <Button
                          size="sm"
                          variant="light"
                          onPress={() => handleSelectUser(u)}
                        >
                          Ajouter
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedUsers.map((u) => (
                      <span
                        key={u.id}
                        className="px-2 py-1 bg-default-100 rounded text-xs flex items-center gap-1"
                      >
                        {u.email}
                        <button
                          onClick={() => removeSelected(u.id)}
                          className="text-danger hover:underline"
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
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
