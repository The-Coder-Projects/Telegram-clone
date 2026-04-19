"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useSession } from "next-auth/react";
import { useChatStore } from "@/stores/chatStore";
import type { Message } from "@/types";

export function MessageInput({ chatId }: { chatId: string }) {
  const value = useChatStore((s) => s.composerTextByChatId[chatId] ?? "");
  const setComposerText = useChatStore((s) => s.setComposerText);
  const clearComposerText = useChatStore((s) => s.clearComposerText);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const { data: session } = useSession();
  const myId = (session?.user as { id?: string } | undefined)?.id;
  const { sendMessage, emitTyping, editMessage } = useSocket();
  const addOptimisticMessage = useChatStore((s) => s.addOptimisticMessage);
  const replyTo = useChatStore((s) => s.replyToByChatId[chatId] ?? null);
  const setReplyTo = useChatStore((s) => s.setReplyTo);
  const editing = useChatStore((s) => s.editingByChatId[chatId] ?? null);
  const stopEditing = useChatStore((s) => s.stopEditing);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 5 * 24)}px`;
  }, [value]);

  useEffect(() => {
    if (!editing) return;
    ref.current?.focus();
  }, [editing]);

  async function send() {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (editing) {
      clearComposerText(chatId);
      stopEditing(chatId);
      editMessage({ messageId: editing.id, content: trimmed });
      return;
    }

    clearComposerText(chatId);

    const clientMessageId = crypto.randomUUID();
    const optimistic: Message = {
      id: clientMessageId,
      clientMessageId,
      chatId,
      senderId: myId ?? "me",
      type: "text",
      content: trimmed,
      createdAt: new Date().toISOString(),
      status: "sending",
      replyTo: replyTo ? { id: replyTo.id, content: replyTo.content, senderId: replyTo.senderId } : undefined,
    };
    addOptimisticMessage(optimistic);

    sendMessage({
      chatId,
      content: trimmed,
      type: "text",
      replyToId: replyTo?.id,
      clientMessageId,
    });
    if (replyTo) setReplyTo(chatId, null);
  }

  return (
    <div className="border-t border-tg-border bg-tg-darker px-3 py-3">
      {replyTo ? (
        <div className="mb-2 rounded-xl border border-tg-border bg-tg-surface px-3 py-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] text-tg-text/70">Replying to</div>
            <div className="truncate text-sm text-white">{replyTo.content}</div>
          </div>
          <button
            type="button"
            className="text-tg-text/70 hover:text-white transition"
            onClick={() => setReplyTo(chatId, null)}
            aria-label="Cancel reply"
          >
            ✕
          </button>
        </div>
      ) : null}

      {editing ? (
        <div className="mb-2 rounded-xl border border-tg-border bg-tg-surface px-3 py-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] text-tg-text/70">Editing message</div>
            <div className="truncate text-sm text-white">{editing.content}</div>
          </div>
          <button
            type="button"
            className="text-tg-text/70 hover:text-white transition"
            onClick={() => {
              stopEditing(chatId);
              clearComposerText(chatId);
            }}
            aria-label="Cancel edit"
          >
            ✕
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          className="h-10 w-10 rounded-xl border border-tg-border bg-tg-surface text-tg-text hover:text-white transition"
          aria-label="Attach"
        >
          +
        </button>

        <div className="flex-1 rounded-2xl border border-tg-border bg-tg-surface px-3 py-2">
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => setComposerText(chatId, e.target.value)}
            placeholder={editing ? "Edit message" : "Message"}
            rows={1}
            className="w-full resize-none bg-transparent text-sm text-tg-text placeholder:text-tg-text/50 outline-none leading-6"
            onInput={() => emitTyping(chatId, true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            onBlur={() => emitTyping(chatId, false)}
            aria-label="Message input"
          />
        </div>

        <button
          type="button"
          onClick={() => void send()}
          className="h-10 px-4 rounded-xl bg-tg-blue text-white text-sm font-medium transition hover:brightness-110"
          aria-label="Send"
        >
          {editing ? "Save" : "Send"}
        </button>
      </div>
      <div className="mt-2 text-[11px] text-tg-text/50">
        Shift+Enter for new line
      </div>
    </div>
  );
}

