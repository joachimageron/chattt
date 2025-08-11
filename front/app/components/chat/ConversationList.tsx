"use client";
import React from "react";
import {
  Card,
  CardBody,
  ScrollShadow,
  Button,
  Avatar,
  Tooltip,
} from "@heroui/react";
import { useChat } from "./ChatContext";
import type { ConversationSummary } from "./types";

interface ConversationListProps {
  onSelect?: (id: string) => void;
}

export function ConversationList({ onSelect }: ConversationListProps) {
  const { conversations, activeConversationId, setActiveConversation } =
    useChat();
  const list = Object.values(conversations) as ConversationSummary[];

  return (
    <div className="w-72 border-r border-divider flex flex-col">
      <div className="p-3 flex items-center justify-between gap-2">
        <span className="font-semibold">Conversations</span>
        <Tooltip content="Nouveau (bientôt)">
          <Button size="sm" variant="light" isDisabled>
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
    </div>
  );
}
