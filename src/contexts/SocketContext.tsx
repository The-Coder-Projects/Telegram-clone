"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import type { Message } from "@/types";
import { useChatStore } from "@/stores/chatStore";

// ─── Event type contracts ────────────────────────────────────────────────────

type ServerToClientEvents = {
  "message:received": (payload: { message: Message; clientMessageId?: string | null }) => void;
  "message:edited": (payload: { message: Message }) => void;
  "message:deleted": (payload: { chatId: string; messageId: string; deletedAt: string }) => void;
  "message:reacted": (payload: { chatId: string; messageId: string; reactions: Message["reactions"] }) => void;
  "chat:pinned": (payload: { chatId: string; messageId: string | null }) => void;
  "typing:start": (payload: { chatId: string; userId: string }) => void;
  "typing:stop": (payload: { chatId: string; userId: string }) => void;
  "chat:read": (payload: { chatId: string; userId: string; messageId: string }) => void;
  "user:online": (payload: { userId: string }) => void;
  "user:offline": (payload: { userId: string; lastSeen: string }) => void;
};

type ClientToServerEvents = {
  "message:send": (payload: {
    chatId: string;
    content: string;
    type?: "text";
    replyToId?: string;
    clientMessageId?: string;
  }) => void;
  "message:edit": (payload: { messageId: string; content: string }) => void;
  "message:delete": (payload: { messageId: string }) => void;
  "message:react": (payload: { messageId: string; emoji: string }) => void;
  "message:forward": (payload: { messageId: string; targetChatId: string }) => void;
  "chat:pin": (payload: { chatId: string; messageId: string | null }) => void;
  "typing:start": (payload: { chatId: string }) => void;
  "typing:stop": (payload: { chatId: string }) => void;
  "chat:read": (payload: { chatId: string; messageId: string }) => void;
};

// ─── Context value shape ─────────────────────────────────────────────────────

export type SocketContextValue = {
  sendMessage: (payload: Parameters<ClientToServerEvents["message:send"]>[0]) => void;
  editMessage: (payload: Parameters<ClientToServerEvents["message:edit"]>[0]) => void;
  deleteMessage: (payload: Parameters<ClientToServerEvents["message:delete"]>[0]) => void;
  reactToMessage: (payload: Parameters<ClientToServerEvents["message:react"]>[0]) => void;
  forwardMessage: (payload: Parameters<ClientToServerEvents["message:forward"]>[0]) => void;
  pinMessage: (payload: Parameters<ClientToServerEvents["chat:pin"]>[0]) => void;
  emitTyping: (chatId: string, isTyping: boolean) => void;
  markRead: (chatId: string, messageId: string) => void;
};

const SocketContext = createContext<SocketContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data } = useSession();
  const userId = (data?.user as { id?: string } | undefined)?.id;
  const queryClient = useQueryClient();

  // Single socket reference shared across all hook consumers.
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  // Use a ref for the store so event callbacks never go stale and we never
  // need store actions in the effect dependency array.
  const storeRef = useRef(useChatStore.getState());
  useEffect(() => useChatStore.subscribe((s) => { storeRef.current = s; }), []);

  useEffect(() => {
    if (!userId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) {
      console.warn("[Socket] NEXT_PUBLIC_SOCKET_URL is not set");
      return;
    }

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketUrl, {
      transports: ["websocket"],
      auth: { userId },
    });

    socketRef.current = socket;

    // ── Incoming message handlers ──────────────────────────────────────────

    socket.on("message:received", ({ message, clientMessageId }) => {
      if (clientMessageId) storeRef.current.clearOptimisticMessage(clientMessageId);

      queryClient.setQueryData(["messages", message.chatId], (old: unknown) =>
        upsertNewestMessage(old, message)
      );
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    });

    socket.on("message:edited", ({ message }) => {
      queryClient.setQueryData(["messages", message.chatId], (old: unknown) =>
        updateMessage(old, message.id, (m) => ({ ...m, ...message }))
      );
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    });

    socket.on("message:deleted", ({ chatId, messageId, deletedAt }) => {
      queryClient.setQueryData(["messages", chatId], (old: unknown) =>
        updateMessage(old, messageId, (m) => ({ ...m, deletedAt, content: "" }))
      );
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    });

    socket.on("message:reacted", ({ chatId, messageId, reactions }) => {
      queryClient.setQueryData(["messages", chatId], (old: unknown) =>
        updateMessage(old, messageId, (m) => ({ ...m, reactions: reactions ?? [] }))
      );
    });

    socket.on("chat:pinned", ({ chatId }) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
    });

    socket.on("typing:start", ({ chatId, userId: typingUserId }) => {
      storeRef.current.addTyping(chatId, typingUserId);
    });

    socket.on("typing:stop", ({ chatId, userId: typingUserId }) => {
      storeRef.current.removeTyping(chatId, typingUserId);
    });

    socket.on("user:online", ({ userId: onlineUserId }) => {
      storeRef.current.setOnlineStatus(onlineUserId, "online");
    });

    socket.on("user:offline", ({ userId: offlineUserId, lastSeen }) => {
      storeRef.current.setOnlineStatus(offlineUserId, lastSeen);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] connect_error", err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // Only re-create socket when the authenticated user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Stable emit helpers (read socketRef.current at call time) ─────────────

  const value: SocketContextValue = {
    sendMessage: (p) => socketRef.current?.emit("message:send", p),
    editMessage: (p) => socketRef.current?.emit("message:edit", p),
    deleteMessage: (p) => socketRef.current?.emit("message:delete", p),
    reactToMessage: (p) => socketRef.current?.emit("message:react", p),
    forwardMessage: (p) => socketRef.current?.emit("message:forward", p),
    pinMessage: (p) => socketRef.current?.emit("chat:pin", p),
    emitTyping: (chatId, isTyping) =>
      socketRef.current?.emit(isTyping ? "typing:start" : "typing:stop", { chatId }),
    markRead: (chatId, messageId) =>
      socketRef.current?.emit("chat:read", { chatId, messageId }),
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used inside <SocketProvider>");
  return ctx;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function upsertNewestMessage(old: unknown, message: Message) {
  if (!old || typeof old !== "object") return old;
  const data = old as {
    pages: Array<{ messages: Message[]; nextCursor: string | null }>;
    pageParams: unknown[];
  };
  if (!data.pages?.length) return old;

  const firstPage = data.pages[0];
  // Avoid duplicates (socket + HTTP race).
  if (firstPage.messages.some((m) => m.id === message.id)) return old;

  return {
    ...data,
    pages: [{ ...firstPage, messages: [message, ...firstPage.messages] }, ...data.pages.slice(1)],
  };
}

function updateMessage(
  old: unknown,
  messageId: string,
  updater: (m: Message) => Message
) {
  if (!old || typeof old !== "object") return old;
  const data = old as {
    pages: Array<{ messages: Message[]; nextCursor: string | null }>;
    pageParams: unknown[];
  };
  if (!data.pages?.length) return old;

  let changed = false;
  const nextPages = data.pages.map((p) => {
    const nextMessages = p.messages.map((m) => {
      if (m.id !== messageId) return m;
      changed = true;
      return updater(m);
    });
    return nextMessages === p.messages ? p : { ...p, messages: nextMessages };
  });

  return changed ? { ...data, pages: nextPages } : old;
}
