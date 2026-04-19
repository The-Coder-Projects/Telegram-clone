"use client";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";

export function ChatWindow({ chatId }: { chatId: string }) {
  return (
    <div className="h-dvh md:h-full w-full flex flex-col">
      <ChatHeader chatId={chatId} />
      <div className="flex-1 min-h-0">
        <MessageList chatId={chatId} />
      </div>
      <MessageInput chatId={chatId} />
    </div>
  );
}
