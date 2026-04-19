"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatSidebar } from "@/components/chat/ChatSidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const nav = [
    { href: "/chat", label: "Chats" },
    { href: "/contacts", label: "Contacts" },
    { href: "/settings", label: "Settings" },
    { href: "/calls", label: "Calls" },
  ];

  return (
    <div className="min-h-dvh w-full bg-tg-dark text-tg-text">
      <div className="h-dvh w-full grid grid-cols-1 md:grid-cols-[280px_340px_1fr]">
        <aside className="hidden md:flex flex-col border-r border-tg-border bg-tg-darker">
          <div className="px-4 py-4 text-sm font-semibold text-white">
            Telegram Clone
          </div>
          <nav className="px-2 pb-3 space-y-1">
            {nav.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "block rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-tg-surface text-white"
                      : "text-tg-text/80 hover:bg-tg-surface/70 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto px-4 py-3 text-xs text-tg-text/50">
            Phase 1 MVP
          </div>
        </aside>

        <section className="hidden md:block border-r border-tg-border bg-tg-dark">
          <ChatSidebar />
        </section>

        <main className="min-w-0 bg-tg-dark">{children}</main>
      </div>
    </div>
  );
}

