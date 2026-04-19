"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useChats } from "@/hooks/useChats";
import { useSession } from "next-auth/react";

export function ChatSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const myId = (session?.user as { id?: string } | undefined)?.id;
  const { data, isLoading } = useChats();

  const chats = data?.chats ?? [];

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-tg-border bg-tg-dark">
        <input
          placeholder="Search"
          className="w-full rounded-xl border border-tg-border bg-tg-darker px-3 py-2 text-sm text-tg-text outline-none focus:ring-2 focus:ring-tg-blue/50"
          aria-label="Search chats"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-sm text-tg-text/60">Loading chats…</div>
        ) : chats.length === 0 ? (
          <div className="p-4 text-sm text-tg-text/60">
            No chats yet.
          </div>
        ) : (
          <ul className="p-2 space-y-1">
            {chats.map((chat) => {
              const active = pathname?.includes(`/chat/${chat.id}`);
              const last = chat.messages?.[0];

              const title =
                chat.type === "direct"
                  ? chat.members
                      ?.map((m) => m.user)
                      ?.find((u) => u.id !== myId)?.name ??
                    chat.members?.[0]?.user?.name ??
                    "Direct chat"
                  : chat.name ?? "Chat";

              return (
                <li key={chat.id}>
                  <Link
                    href={`/chat/${chat.id}`}
                    className={clsx(
                      "block rounded-xl px-3 py-2 transition",
                      active
                        ? "bg-tg-surface"
                        : "hover:bg-tg-surface/70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">
                          {title}
                        </div>
                        <div className="truncate text-xs text-tg-text/70">
                          {last?.deletedAt ? "Message deleted" : last?.content ?? ""}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-[11px] text-tg-text/50 font-mono">
                          {last
                            ? new Date(last.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </div>
                        {/* unread counts land once we persist reads + compute */}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

