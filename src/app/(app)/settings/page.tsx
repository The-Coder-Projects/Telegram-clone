"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/users/me", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as
        | { me?: { isPrivate?: boolean } }
        | null;
      if (cancelled) return;
      setIsPrivate(!!data?.me?.isPrivate);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(next: boolean) {
    setSaving(true);
    setIsPrivate(next);
    await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrivate: next }),
    }).catch(() => null);
    setSaving(false);
  }

  return (
    <div className="h-dvh md:h-full bg-tg-darker">
      <div className="h-14 flex items-center px-4 border-b border-tg-border bg-tg-dark">
        <div className="text-sm font-semibold text-white">Settings</div>
      </div>

      <div className="p-4">
        <div className="max-w-xl rounded-2xl border border-tg-border bg-tg-surface p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-white font-semibold">Private account</div>
              <div className="text-sm text-tg-text/70 mt-1">
                If enabled, people must send a request before they can chat with
                you.
              </div>
            </div>

            <button
              type="button"
              disabled={loading || saving}
              onClick={() => void toggle(!isPrivate)}
              className={[
                "relative w-12 h-7 rounded-full transition",
                isPrivate ? "bg-tg-blue" : "bg-tg-border",
                (loading || saving) ? "opacity-60" : "opacity-100",
              ].join(" ")}
              aria-label="Toggle private account"
            >
              <span
                className={[
                  "absolute top-1 w-5 h-5 rounded-full bg-white transition",
                  isPrivate ? "left-6" : "left-1",
                ].join(" ")}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

