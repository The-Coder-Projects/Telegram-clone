"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

type UserResult = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  lastSeen?: string | Date | null;
  isPrivate?: boolean;
};

function Avatar({ user, size = 48 }: { user: UserResult; size?: number }) {
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];
  const color = colors[user.name.charCodeAt(0) % colors.length];
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold ${color}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          className="w-full h-full rounded-full object-cover"
          alt={user.name}
        />
      ) : (
        initials
      )}
    </div>
  );
}

function isOnline(lastSeen: UserResult["lastSeen"]) {
  if (!lastSeen) return false;
  const t = new Date(lastSeen).getTime();
  return Date.now() - t < 3 * 60 * 1000;
}

export default function ContactsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [contacts, setContacts] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setUsers([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { users?: UserResult[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const refreshContacts = useCallback(async () => {
    const res = await fetch("/api/contacts", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as
      | { contacts?: UserResult[] }
      | null;
    setContacts(data?.contacts ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/contacts", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as
        | { contacts?: UserResult[] }
        | null;
      if (cancelled) return;
      setContacts(data?.contacts ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startChat(userId: string) {
    setStarting(userId);
    setError("");
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = (await res.json()) as
        | { chat?: { id: string }; error?: string }
        | { pending?: boolean; requestId?: string; status?: string; error?: string };
      if (!res.ok)
        throw new Error(
          "error" in data && typeof data.error === "string"
            ? data.error
            : "Could not start chat"
        );
      if ("pending" in data && data.pending) {
        setError("Request sent. Wait for approval.");
        return;
      }
      if (!("chat" in data) || !data.chat?.id) throw new Error("Could not start chat");
      router.push(`/chat/${data.chat.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start chat. Try again.");
    } finally {
      setStarting(null);
    }
  }

  async function startChatByIdentifier() {
    const value = identifier.trim();
    if (!value) return;
    setStarting("identifier");
    setError("");
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: value }),
      });
      const data = (await res.json()) as { chat?: { id: string }; error?: string };
      if (!res.ok || !data.chat?.id)
        throw new Error(data.error ?? "Could not start chat");
      router.push(`/chat/${data.chat.id}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not start chat. Try again."
      );
    } finally {
      setStarting(null);
    }
  }

  async function addContact(value: string) {
    const id = value.trim();
    if (!id) return;
    setStarting(`add:${id}`);
    setError("");
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: id }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not add contact");
      await refreshContacts();
      setIdentifier("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add contact");
    } finally {
      setStarting(null);
    }
  }

  return (
    <div className="flex flex-col h-dvh md:h-full bg-tg-darker">
      <div className="px-5 pt-6 pb-4 border-b border-tg-border bg-tg-dark">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-white">Find People</h1>
          <button
            onClick={() => router.push("/chat")}
            className="rounded-xl border border-tg-border bg-tg-surface px-3 py-1.5 text-xs text-tg-text hover:text-white transition"
            type="button"
          >
            Back
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-tg-border bg-tg-surface p-3">
          <div className="text-xs text-tg-text/70 mb-2">
            Add to contacts by phone / email / @handle
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="+1 555 123 4567 or name@example.com"
              className="flex-1 bg-tg-dark border border-tg-border focus:border-tg-blue rounded-xl px-3 py-2 text-sm text-white placeholder:text-tg-text/50 outline-none transition-colors"
              aria-label="Phone or email"
            />
            <button
              onClick={() => void addContact(identifier)}
              disabled={starting?.startsWith("add:") ?? false}
              className="rounded-xl bg-tg-blue px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60 transition"
              type="button"
            >
              {starting?.startsWith("add:") ? "…" : "Add"}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              onClick={() => void startChatByIdentifier()}
              disabled={starting === "identifier"}
              className="text-xs text-tg-text/70 hover:text-white transition"
              type="button"
            >
              Or start chat without adding
            </button>
            <div className="text-[11px] text-tg-text/50">
              Example: <span className="font-mono">@alice</span>
            </div>
          </div>
        </div>

        <div className="mt-4 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, @username, or email…"
            className="w-full bg-tg-surface border border-tg-border focus:border-tg-blue rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-tg-text/50 outline-none transition-colors"
            autoFocus
            aria-label="Search users"
          />
          {loading ? (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-tg-blue text-xs font-mono">
              …
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mx-5 mt-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 text-red-200 text-sm">
          {error}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        {contacts.length > 0 ? (
          <div className="border-b border-tg-border">
            <div className="px-5 pt-4 pb-2 text-xs uppercase tracking-wide text-tg-text/60">
              My contacts
            </div>
            {contacts.map((user) => {
              const online = isOnline(user.lastSeen);
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-tg-surface/60 transition-colors group"
                >
                  <div className="relative">
                    <Avatar user={user} size={46} />
                    {online ? (
                      <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-tg-darker" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-white font-semibold text-sm truncate">
                        {user.name}
                      </span>
                      <span className="text-tg-text/70 text-xs flex-shrink-0">
                        @{user.username}
                      </span>
                    </div>
                    <p className="text-tg-text/70 text-xs truncate mt-0.5">
                      {online
                        ? "Online"
                        : user.lastSeen
                          ? `Last seen ${formatDistanceToNow(new Date(user.lastSeen), {
                              addSuffix: true,
                            })}`
                          : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => void startChat(user.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-tg-blue hover:brightness-110 text-white text-xs font-semibold rounded-lg transition-colors"
                      type="button"
                    >
                      Message
                    </button>
                    <button
                      onClick={async () => {
                        await fetch(`/api/contacts/${user.id}`, { method: "DELETE" });
                        await refreshContacts();
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-tg-surface hover:bg-red-500/20 text-tg-text hover:text-red-200 transition-colors"
                      title="Remove"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {query.trim().length < 2 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6">
            <div className="w-16 h-16 bg-tg-surface rounded-full flex items-center justify-center mb-4">
              <div className="text-tg-blue text-2xl font-semibold">+</div>
            </div>
            <p className="text-white font-medium">Find People</p>
            <p className="text-tg-text/70 text-sm mt-1">
              Type at least 2 characters to search for users
            </p>
          </div>
        ) : !loading && users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6">
            <div className="w-16 h-16 bg-tg-surface rounded-full flex items-center justify-center mb-4">
              <div className="text-tg-text/60 text-2xl font-semibold">?</div>
            </div>
            <p className="text-white font-medium">No users found</p>
            <p className="text-tg-text/70 text-sm mt-1">
              Try searching with a different name or @username
            </p>
          </div>
        ) : (
          users.map((user) => {
            const online = isOnline(user.lastSeen);
            const already = contacts.some((c) => c.id === user.id);
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-tg-surface/60 transition-colors group"
              >
                <div className="relative">
                  <Avatar user={user} size={50} />
                  {online ? (
                    <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-tg-darker" />
                  ) : null}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-white font-semibold text-sm truncate">
                      {user.name}
                    </span>
                    <span className="text-tg-text/70 text-xs flex-shrink-0">
                      @{user.username}
                    </span>
                  </div>
                  <p className="text-tg-text/70 text-xs truncate mt-0.5">
                    {user.bio
                      ? user.bio
                      : online
                        ? "Online"
                        : user.lastSeen
                          ? `Last seen ${formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}`
                          : ""}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => void addContact(user.username)}
                    disabled={already}
                    title="Add contact"
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-tg-surface hover:bg-tg-blue/20 text-tg-text hover:text-tg-blue transition-colors disabled:opacity-40"
                    type="button"
                  >
                    +
                  </button>
                  <button
                    onClick={() => router.push(`/calls?userId=${user.id}&type=voice`)}
                    title="Voice call"
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-tg-surface hover:bg-tg-blue/20 text-tg-text hover:text-tg-blue transition-colors"
                    type="button"
                  >
                    📞
                  </button>
                  <button
                    onClick={() => router.push(`/calls?userId=${user.id}&type=video`)}
                    title="Video call"
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-tg-surface hover:bg-tg-blue/20 text-tg-text hover:text-tg-blue transition-colors"
                    type="button"
                  >
                    📹
                  </button>
                  <button
                    onClick={() => void startChat(user.id)}
                    disabled={starting === user.id}
                    title="Send message"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-tg-blue hover:brightness-110 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                    type="button"
                  >
                    {starting === user.id
                      ? "…"
                      : user.isPrivate
                        ? "Request"
                        : "Message"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

