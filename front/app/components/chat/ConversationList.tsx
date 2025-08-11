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
  const [participantIds, setParticipantIds] = useState<string>("");
  const [title, setTitle] = useState("");
  const [isGroup, setIsGroup] = useState(false);

  const handleCreate = () => {
    const ids = participantIds
      .split(/[\n,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => s && s !== user?.id);
    if (!ids.length) return;
    createConversation(ids, title || undefined, isGroup ? "GROUP" : "DIRECT");
    setParticipantIds("");
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
            >
              <CardBody className="py-2 flex items-center gap-3">
                <Avatar size="sm" name={c.title || c.id.slice(0, 4)} />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {c.title || "Sans titre"}
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
                  label="Participants"
                  placeholder="IDs des utilisateurs (séparés par espace, virgule...)"
                  description="N'incluez pas votre propre ID"
                  value={participantIds}
                  onChange={(e) => setParticipantIds(e.target.value)}
                />
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
