import { EmptyChat } from "@/components/chat/EmptyChat";
import { ChatSidebar } from "@/components/chat/ChatSidebar";

export default function ChatIndexPage() {
  return (
    <div className="h-dvh md:h-full w-full">
      {/* Mobile: show chat list (since AppShell hides the sidebar under md) */}
      <div className="md:hidden h-full">
        <ChatSidebar />
      </div>

      {/* Desktop: 3-panel layout shows sidebar already */}
      <div className="hidden md:block h-full">
        <EmptyChat />
      </div>
    </div>
  );
}

