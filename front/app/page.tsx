"use client";
import { useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";

let socket: Socket | null = null;

export default function ChatPage() {
  const [connected, setConnected] = useState(false);
  const [pongMessage, setPongMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) {
      socket = io(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/chat`,
        {
          withCredentials: true,
        }
      );

      socket.on("connect", () => {
        setConnected(true);
        console.log("Socket connected", socket?.id);
      });

      socket.on("disconnect", () => {
        setConnected(false);
        console.log("Socket disconnected");
      });

      socket.on("pong", (data: { message: string }) => {
        console.log("Received pong:", data);
        setPongMessage(data.message);
      });
    }

    return () => {
      socket?.off("connect");
      socket?.off("disconnect");
      socket?.off("pong");
    };
  }, []);

  const handlePing = () => {
    socket?.emit("ping");
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Chat (WebSocket demo)</h1>
      <p>
        Status:{" "}
        {connected ? (
          <span className="text-green-600">Connecté</span>
        ) : (
          <span className="text-red-600">Déconnecté</span>
        )}
      </p>
      <button
        onClick={handlePing}
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        disabled={!connected}
      >
        Envoyer ping
      </button>
      {pongMessage && (
        <div className="mt-2 text-sm text-gray-700">Réponse: {pongMessage}</div>
      )}
    </div>
  );
}
