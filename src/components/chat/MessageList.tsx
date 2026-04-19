"use client";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { useMessages } from "@/hooks/useMessages";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChatStore } from "@/stores/chatStore";
import type { Message } from "@/types";
import { useSocket } from "@/hooks/useSocket";
import { useChats } from "@/hooks/useChats";
import { useShallow } from "zustand/react/shallow";

export function MessageList({ chatId }: { chatId: string }) {
  const { data: session } = useSession();
  const myId = (session?.user as { id?: string } | undefined)?.id;
  const { deleteMessage, reactToMessage, pinMessage, forwardMessage } = useSocket();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useMessages(chatId);
  const optimisticByClientId = useChatStore((s) => s.optimisticByClientId);
  const selectionMode = useChatStore((s) => !!s.selectionModeByChatId[chatId]);
  const setSelectionMode = useChatStore((s) => s.setSelectionMode);
  const selected = useChatStore(useShallow((s) => s.selectedByChatId[chatId] ?? {}));
  const clearSelection = useChatStore((s) => s.clearSelection);
  const toggleSelected = useChatStore((s) => s.toggleSelected);
  const setReplyTo = useChatStore((s) => s.setReplyTo);
  const startEditing = useChatStore((s) => s.startEditing);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const { data: chatsData } = useChats();

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const messages = useMemo(() => {
    const pages = data?.pages ?? [];
    const flat = pages.flatMap((p) => p.messages);
    // Server returns newest-first per page; reverse to show oldest-first in UI.
    const ordered = [...flat].reverse();

    const optimistic = Object.values(optimisticByClientId)
      .filter((m) => m.chatId === chatId)
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

    // Merge optimistic at end (they’re newest).
    const merged = [...ordered, ...optimistic];
    // De-dupe by id (or clientMessageId when present)
    const seen = new Set<string>();
    const deduped: Message[] = [];
    for (const m of merged) {
      const key = m.id ?? m.clientMessageId ?? "";
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(m);
    }
    return deduped;
  }, [chatId, data?.pages, optimisticByClientId]);

  useEffect(() => {
    // Best-effort autoscroll on initial load.
    const el = scrollerRef.current;
    if (!el) return;
    if (isLoading) return;
    el.scrollTop = el.scrollHeight;
  }, [isLoading]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  return (
    <div className="h-full flex flex-col">
      {selectionMode ? (
        <div className="border-b border-tg-border bg-tg-dark px-3 py-2 flex items-center justify-between">
          <div className="text-sm text-white">{selectedIds.length} selected</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-9 px-3 rounded-xl border border-tg-border bg-tg-surface text-tg-text hover:text-white transition"
              onClick={() => {
                for (const id of selectedIds) deleteMessage({ messageId: id });
                clearSelection(chatId);
                setSelectionMode(chatId, false);
              }}
              disabled={!selectedIds.length}
            >
              Delete
            </button>
            <button
              type="button"
              className="h-9 px-3 rounded-xl border border-tg-border bg-tg-surface text-tg-text hover:text-white transition"
              onClick={() => {
                clearSelection(chatId);
                setSelectionMode(chatId, false);
              }}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop < 120 && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        }}
      >
      {hasNextPage ? (
        <div className="text-center text-xs text-tg-text/50 py-2">
          {isFetchingNextPage ? "Loading…" : "Scroll up to load more"}
        </div>
      ) : null}

      {messages.map((m) => (
        <MessageBubble
          key={m.clientMessageId ?? m.id}
          message={m}
          mine={!!myId && m.senderId === myId}
          time={new Date(m.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          selectionMode={selectionMode}
          selected={!!selected[m.id]}
          onToggleSelect={() => {
            setSelectionMode(chatId, true);
            toggleSelected(chatId, m.id);
          }}
          onReply={() => setReplyTo(chatId, m)}
          onEdit={() => startEditing(chatId, m)}
          onDelete={() => deleteMessage({ messageId: m.id })}
          // If user wants "delete for me", we use the REST endpoint; keep socket delete as "for everyone" default.
          onForward={() => setForwardingMessage(m)}
          onReact={(emoji) => reactToMessage({ messageId: m.id, emoji })}
          onPin={() => pinMessage({ chatId, messageId: m.id })}
        />
      ))}
      </div>

      {forwardingMessage ? (
        <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-tg-border bg-tg-surface shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-tg-border flex items-center justify-between">
              <div className="text-sm font-medium text-white">Forward message</div>
              <button
                type="button"
                className="text-tg-text/70 hover:text-white transition"
                onClick={() => setForwardingMessage(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {(chatsData?.chats ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-tg-darker transition border-b border-tg-border"
                  onClick={() => {
                    forwardMessage({ messageId: forwardingMessage.id, targetChatId: c.id });
                    setForwardingMessage(null);
                  }}
                >
                  <div className="text-sm text-white">{c.name ?? c.id}</div>
                </button>
              ))}
              {(!chatsData?.chats || chatsData.chats.length === 0) ? (
                <div className="px-4 py-4 text-sm text-tg-text/70">No chats available.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

