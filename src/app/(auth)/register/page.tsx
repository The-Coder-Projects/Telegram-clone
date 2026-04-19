"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, email, password }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Registration failed");
      setLoading(false);
      return;
    }

    const identifier = email || username;
    await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    router.push("/chat");
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-white">Create account</h1>
        <p className="text-sm text-tg-text/80">
          Register with email + username. You’ll be signed in automatically.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm text-tg-text/80">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-tg-border bg-tg-dark px-3 py-2 text-sm text-tg-text outline-none focus:ring-2 focus:ring-tg-blue/50"
            placeholder="Your name"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-tg-text/80">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-tg-border bg-tg-dark px-3 py-2 text-sm text-tg-text outline-none focus:ring-2 focus:ring-tg-blue/50"
            placeholder="@your_handle (letters, numbers, _ or -)"
            autoComplete="username"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-tg-text/80">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-tg-border bg-tg-dark px-3 py-2 text-sm text-tg-text outline-none focus:ring-2 focus:ring-tg-blue/50"
            placeholder="you@example.com"
            autoComplete="email"
            type="email"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-tg-text/80">Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-tg-border bg-tg-dark px-3 py-2 text-sm text-tg-text outline-none focus:ring-2 focus:ring-tg-blue/50"
            placeholder="••••••••"
            type="password"
            autoComplete="new-password"
            required
          />
        </label>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-tg-blue px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
          type="submit"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <div className="text-xs text-tg-text/60">
        Already have an account?{" "}
        <Link className="text-tg-blue hover:underline" href="/login">
          Sign in
        </Link>
      </div>
    </div>
  );
}

