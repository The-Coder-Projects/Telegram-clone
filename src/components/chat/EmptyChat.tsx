"use client";

export function EmptyChat() {
  return (
    <div className="h-full grid place-items-center">
      <div className="max-w-sm text-center space-y-2">
        <div className="text-white text-lg font-semibold">Select a chat</div>
        <div className="text-sm text-tg-text/70">
          Your messages will appear here. Create or open a chat from the left.
        </div>
      </div>
    </div>
  );
}

