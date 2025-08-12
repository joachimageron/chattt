"use client";
import React, { useState, useCallback } from "react";
import { Button, Input, Tooltip } from "@heroui/react";

interface MessageInputProps {
  onSend: (value: string) => void;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export function MessageInput({
  onSend,
  disabled,
  inputRef,
}: MessageInputProps) {
  const [value, setValue] = useState("");

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  }, [value, onSend]);

  return (
    <div className="flex items-center gap-2 p-3 border-t border-divider bg-content1">
      <Input
        variant="bordered"
        size="sm"
        className="flex-1"
        placeholder="Votre message..."
        value={value}
        onValueChange={setValue}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        isDisabled={disabled}
        // external ref to allow parent to control focus when conversation changes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={inputRef as React.RefObject<any>}
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
