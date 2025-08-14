"use client";
import React from "react";
import { Tooltip } from "@heroui/react";

interface ReactionAggregate {
  emoji: string;
  count: number;
  mine: boolean;
  users: string[];
}

interface MessageReactionsProps {
  aggregates: ReactionAggregate[];
  onToggle: (emoji: string) => void;
  small?: boolean; // style variant (inside bubble vs external)
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  aggregates,
  onToggle,
  small,
}) => {
  if (!aggregates.length) return null;
  return (
    <div
      className={`mt-1 flex flex-row flex-wrap gap-1 ${small ? "min-h-6" : ""}`}
    >
      {aggregates.map((r) => (
        <Tooltip
          key={r.emoji}
          content={
            r.users.length > 3
              ? `${r.users.slice(0, 3).join(", ")} +${r.users.length - 3}`
              : r.users.join(", ")
          }
          delay={500}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(r.emoji);
            }}
            className={`px-1 rounded-full border text-[11px] leading-tight flex items-center gap-1 hover:bg-content3 transition-colors ${
              r.mine
                ? "bg-primary-500/20 border-primary-400"
                : "bg-content3/40 border-default-200"
            }`}
          >
            <span>{r.emoji}</span>
            <span className="text-[10px]">{r.count}</span>
          </button>
        </Tooltip>
      ))}
    </div>
  );
};
