"use client";
import React, { useState, useCallback } from "react";
import { Button, Input, Tooltip } from "@heroui/react";

interface MessageInputProps {
  onSend: (value: string) => void;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null> | null;
  onTypingChange?: (typing: boolean) => void; // notification when user starts/stops typing
}

export function MessageInput({
  onSend,
  disabled,
  inputRef,
  onTypingChange,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const lastTypedRef = React.useRef<number>(0);
  // Debounce stop typing
  React.useEffect(() => {
    if (!isTyping) return;
    const id = setInterval(() => {
      if (Date.now() - lastTypedRef.current > 2500) {
        setIsTyping(false);
        onTypingChange?.(false);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isTyping, onTypingChange]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    // Reset typing state explicitly when message is sent
    if (isTyping) {
      setIsTyping(false);
      onTypingChange?.(false);
    }
  }, [value, onSend, isTyping, onTypingChange]);

  return (
    <div className="flex items-center gap-2 p-3 border-t border-divider bg-content1">
      <Input
        variant="bordered"
        size="sm"
        className="flex-1"
        placeholder="Votre message..."
        value={value}
        onValueChange={(v) => {
          setValue(v);
          const now = Date.now();
          lastTypedRef.current = now;
          if (!v.trim()) {
            if (isTyping) {
              setIsTyping(false);
              onTypingChange?.(false);
            }
            return;
          }
          if (!isTyping) {
            // (Re)start typing if previously stopped or expired
            setIsTyping(true);
            onTypingChange?.(true);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        isDisabled={disabled}
        // external ref to allow parent to control focus when conversation changes
        ref={inputRef}
        autoFocus
      />
      <Tooltip content="Envoyer">
        <Button
          color="primary"
          size="sm"
          isDisabled={!value.trim() || disabled}
          onPress={handleSend}
        >
          Envoyer
        </Button>
      </Tooltip>
    </div>
  );
}
