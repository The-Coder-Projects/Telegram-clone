"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function CallsPage() {
  const router = useRouter();
  const params = useSearchParams();

  const call = useMemo(() => {
    const userId = params.get("userId");
    const type = params.get("type");
    if (!userId || (type !== "voice" && type !== "video")) return null;
    return { userId, type };
  }, [params]);

  return (
    <div className="h-dvh md:h-full bg-tg-darker">
      <div className="h-14 flex items-center justify-between px-4 border-b border-tg-border bg-tg-dark">
        <div className="text-sm font-semibold text-white">Calls</div>
        <button
          onClick={() => router.push("/contacts")}
          className="rounded-xl border border-tg-border bg-tg-surface px-3 py-1.5 text-xs text-tg-text hover:text-white transition"
          type="button"
        >
          New call
        </button>
      </div>

      {call ? (
        <div className="h-[calc(100%-3.5rem)] grid place-items-center px-6">
          <div className="w-full max-w-sm rounded-2xl border border-tg-border bg-tg-surface p-5 space-y-3">
            <div className="text-white font-semibold">
              {call.type === "voice" ? "Voice call" : "Video call"}
            </div>
            <div className="text-sm text-tg-text/70 font-mono break-all">
              userId: {call.userId}
            </div>
            <div className="text-xs text-tg-text/60">
              Phase 1 includes call navigation + UI stub only (no WebRTC yet).
            </div>
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => router.push("/chat")}
                className="flex-1 rounded-xl border border-tg-border bg-tg-dark px-4 py-2 text-sm text-tg-text hover:text-white transition"
                type="button"
              >
                Back to chats
              </button>
              <button
                onClick={() => router.replace("/calls")}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:brightness-110 transition"
                type="button"
              >
                End
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[calc(100%-3.5rem)] grid place-items-center text-sm text-tg-text/70">
          Call history UI lands next. Start a call from Contacts.
        </div>
      )}
    </div>
  );
}

