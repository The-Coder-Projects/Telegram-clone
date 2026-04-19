"use client";

import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh grid place-items-center bg-tg-dark text-tg-text">
      <div className="max-w-xl rounded-3xl border border-tg-border bg-tg-darker p-10 text-center shadow-sm">
        <p className="text-sm text-tg-text/70">Something went wrong.</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Unexpected error</h1>
        <p className="mt-2 text-sm text-tg-text/80">
          {error?.message ?? "Please try again later."}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-tg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-tg-brand/90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-tg-border px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
