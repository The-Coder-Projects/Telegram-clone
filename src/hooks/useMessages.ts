"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { Message } from "@/types";

type MessagesResponse = {
  messages: Message[];
  nextCursor: string | null;
};

async function fetchMessages(chatId: string, cursor?: string): Promise<MessagesResponse> {
  const url = new URL("/api/messages", window.location.origin);
  url.searchParams.set("chatId", chatId);
  if (cursor) url.searchParams.set("cursor", cursor);
  url.searchParams.set("limit", "30");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load messages");
  return res.json();
}

export function useMessages(chatId: string) {
  return useInfiniteQuery({
    queryKey: ["messages", chatId],
    queryFn: ({ pageParam }) => fetchMessages(chatId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

