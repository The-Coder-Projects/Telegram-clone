"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      identifier,
      password,
      redirect: true,
      callbackUrl: "/chat",
    });
    if (res?.error) setError("Invalid credentials");
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-white">Sign in</h1>
        <p className="text-sm text-tg-text/80">
          Phase 1 uses Credentials auth for fast local dev. Phone OTP can be
          swapped in later.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm text-tg-text/80">Email or username</span>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full rounded-xl border border-tg-border bg-tg-dark px-3 py-2 text-sm text-tg-text outline-none focus:ring-2 focus:ring-tg-blue/50"
            placeholder="alice@example.com or @alice"
            autoComplete="username"
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
            autoComplete="current-password"
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
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="space-y-2 text-xs text-tg-text/60">
        <div>
          Tip: use <span className="font-mono">@alice</span> /{" "}
          <span className="font-mono">@bob</span> (or their emails) with password{" "}
          <span className="font-mono">password</span>.
        </div>
        <div>
          Don&apos;t have an account?{" "}
          <Link className="text-tg-blue hover:underline" href="/register">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}

