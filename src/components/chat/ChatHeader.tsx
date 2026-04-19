"use client";

import { useChatStore } from "@/stores/chatStore";
import { useSession } from "next-auth/react";
import { useShallow } from "zustand/react/shallow";
import { useChats } from "@/hooks/useChats";
import { formatDistanceToNow } from "date-fns";

export function ChatHeader({ chatId }: { chatId: string }) {
  const { data: session } = useSession();
  const myId = (session?.user as { id?: string } | undefined)?.id;
  const typingUserIds = useChatStore(useShallow((s) => s.typing[chatId]?.userIds ?? []));
  const othersTyping = typingUserIds.filter((id) => id !== myId);
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  const { data: chatsData } = useChats();
  const chat = chatsData?.chats?.find((c) => c.id === chatId);

  const isDirect = chat?.type === "direct";
  const otherMember = isDirect ? chat?.members?.find((m) => m.user.id !== myId)?.user : null;
  const chatName = isDirect ? (otherMember?.name ?? "Unknown User") : (chat?.name ?? "Chat");

  let statusText = "Offline";
  if (othersTyping.length > 0) {
    statusText = "Typing…";
  } else if (isDirect && otherMember) {
    const status = onlineUsers[otherMember.id] || otherMember.lastSeen;
    if (status === "online") {
      statusText = "Online";
    } else if (status) {
      try {
        statusText = `Last seen ${formatDistanceToNow(new Date(status), { addSuffix: true })}`;
      } catch {
        statusText = "Offline";
      }
    }
  } else if (!isDirect && chat) {
    const memberCount = chat.members?.length ?? 0;
    statusText = `${memberCount} member${memberCount !== 1 ? "s" : ""}`;
  }

  return (
    <div className="h-14 flex items-center justify-between gap-3 px-4 border-b border-tg-border bg-tg-darker">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">
          {chatName}
        </div>
        <div className="text-xs text-tg-text/60">
          {statusText}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="rounded-xl border border-tg-border bg-tg-surface px-3 py-1.5 text-xs text-tg-text hover:text-white transition"
          type="button"
          aria-label="Search in chat"
        >
          Search
        </button>
        <button
          className="rounded-xl border border-tg-border bg-tg-surface px-3 py-1.5 text-xs text-tg-text hover:text-white transition"
          type="button"
          aria-label="Chat info"
        >
          Info
        </button>
      </div>
    </div>
  );
}

