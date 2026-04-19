"use client";

import { useQuery } from "@tanstack/react-query";
import type { Chat } from "@/types";

async function fetchChats(): Promise<{ chats: Chat[] }> {
  const res = await fetch("/api/chats", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load chats");
  return res.json();
}

export function useChats() {
  return useQuery({
    queryKey: ["chats"],
    queryFn: fetchChats,
  });
}

