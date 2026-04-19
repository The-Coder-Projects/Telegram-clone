"use client";

import { create } from "zustand";
import type { Message } from "@/types";

type TypingState = Record<
  string,
  {
    userIds: string[];
  }
>;

type ChatState = {
  typing: TypingState;
  addTyping: (chatId: string, userId: string) => void;
  removeTyping: (chatId: string, userId: string) => void;

  optimisticByClientId: Record<string, Message>;
  addOptimisticMessage: (msg: Message) => void;
  clearOptimisticMessage: (clientMessageId: string) => void;

  replyToByChatId: Record<string, Message | null | undefined>;
  setReplyTo: (chatId: string, msg: Message | null) => void;

  editingByChatId: Record<string, Message | null | undefined>;
  startEditing: (chatId: string, msg: Message) => void;
  stopEditing: (chatId: string) => void;

  composerTextByChatId: Record<string, string | undefined>;
  setComposerText: (chatId: string, text: string) => void;
  clearComposerText: (chatId: string) => void;

  selectionModeByChatId: Record<string, boolean | undefined>;
  setSelectionMode: (chatId: string, enabled: boolean) => void;
  selectedByChatId: Record<string, Record<string, true> | undefined>;
  toggleSelected: (chatId: string, messageId: string) => void;
  clearSelection: (chatId: string) => void;

  onlineUsers: Record<string, string>;
  setOnlineStatus: (userId: string, status: string) => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  typing: {},
  addTyping: (chatId, userId) =>
    set((s) => {
      const current = s.typing[chatId]?.userIds ?? [];
      if (current.includes(userId)) return s;
      return { typing: { ...s.typing, [chatId]: { userIds: [...current, userId] } } };
    }),
  removeTyping: (chatId, userId) =>
    set((s) => {
      const current = s.typing[chatId]?.userIds ?? [];
      const next = current.filter((id) => id !== userId);
      return { typing: { ...s.typing, [chatId]: { userIds: next } } };
    }),

  optimisticByClientId: {},
  addOptimisticMessage: (msg) =>
    set((s) => ({
      optimisticByClientId: msg.clientMessageId
        ? { ...s.optimisticByClientId, [msg.clientMessageId]: msg }
        : s.optimisticByClientId,
    })),
  clearOptimisticMessage: (clientMessageId) => {
    const { optimisticByClientId } = get();
    if (!optimisticByClientId[clientMessageId]) return;
    const next = { ...optimisticByClientId };
    delete next[clientMessageId];
    set({ optimisticByClientId: next });
  },

  replyToByChatId: {},
  setReplyTo: (chatId, msg) =>
    set((s) => ({ replyToByChatId: { ...s.replyToByChatId, [chatId]: msg } })),

  editingByChatId: {},
  startEditing: (chatId, msg) =>
    set((s) => ({
      editingByChatId: { ...s.editingByChatId, [chatId]: msg },
      replyToByChatId: { ...s.replyToByChatId, [chatId]: null },
      composerTextByChatId: { ...s.composerTextByChatId, [chatId]: msg.content },
    })),
  stopEditing: (chatId) =>
    set((s) => ({
      editingByChatId: { ...s.editingByChatId, [chatId]: null },
      composerTextByChatId: { ...s.composerTextByChatId, [chatId]: "" },
    })),

  composerTextByChatId: {},
  setComposerText: (chatId, text) =>
    set((s) => ({ composerTextByChatId: { ...s.composerTextByChatId, [chatId]: text } })),
  clearComposerText: (chatId) =>
    set((s) => ({ composerTextByChatId: { ...s.composerTextByChatId, [chatId]: "" } })),

  selectionModeByChatId: {},
  setSelectionMode: (chatId, enabled) =>
    set((s) => ({
      selectionModeByChatId: { ...s.selectionModeByChatId, [chatId]: enabled },
      selectedByChatId: enabled ? s.selectedByChatId : { ...s.selectedByChatId, [chatId]: {} },
    })),
  selectedByChatId: {},
  toggleSelected: (chatId, messageId) =>
    set((s) => {
      const current = s.selectedByChatId[chatId] ?? {};
      const next = { ...current };
      if (next[messageId]) delete next[messageId];
      else next[messageId] = true;
      return { selectedByChatId: { ...s.selectedByChatId, [chatId]: next } };
    }),
  clearSelection: (chatId) =>
    set((s) => ({ selectedByChatId: { ...s.selectedByChatId, [chatId]: {} } })),

  onlineUsers: {},
  setOnlineStatus: (userId, status) =>
    set((s) => ({ onlineUsers: { ...s.onlineUsers, [userId]: status } })),
}));

