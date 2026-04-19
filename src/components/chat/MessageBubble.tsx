"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import type { Message } from "@/types";

export function MessageBubble({
  message,
  mine,
  time,
  selectionMode,
  selected,
  onToggleSelect,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onReact,
  onPin,
}: {
  message: Message;
  mine: boolean;
  time: string;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onForward: () => void;
  onReact: (emoji: string) => void;
  onPin: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const groupedReactions = useMemo(() => {
    const reactions = message.reactions ?? [];
    const byEmoji = new Map<string, { emoji: string; count: number; mine: boolean }>();
    for (const r of reactions) {
      const entry = byEmoji.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
      entry.count += 1;
      // Can't know "mine" without myId here; treat toggling as stateless in UI for now.
      byEmoji.set(r.emoji, entry);
    }
    return [...byEmoji.values()].sort((a, b) => b.count - a.count);
  }, [message.reactions]);

  return (
    <div className={clsx("flex items-start gap-2 group", mine ? "justify-end" : "justify-start")}>
      {selectionMode ? (
        <button
          type="button"
          onClick={onToggleSelect}
          className={clsx(
            "mt-2 h-5 w-5 rounded border",
            selected ? "bg-tg-blue border-tg-blue" : "border-tg-border bg-tg-surface"
          )}
          aria-label={selected ? "Unselect message" : "Select message"}
        />
      ) : null}

      <div className="relative max-w-[75%] md:max-w-[60%]">
        <div
          className={clsx(
            "px-3 py-2 text-sm leading-6 shadow-sm",
            mine
              ? "bg-tg-blue text-white rounded-tl-2xl rounded-tr-sm rounded-b-2xl"
              : "bg-tg-surface text-tg-text rounded-tr-2xl rounded-tl-sm rounded-b-2xl"
          )}
        >
          {message.replyTo ? (
            <div
              className={clsx(
                "mb-2 rounded-lg px-2 py-1 text-[12px] leading-4 border-l-2",
                mine ? "border-white/60 bg-white/10" : "border-tg-blue/70 bg-tg-darker"
              )}
            >
              <div className={clsx("font-medium", mine ? "text-white/90" : "text-tg-text")}>
                Reply
              </div>
              <div className={clsx("line-clamp-2", mine ? "text-white/80" : "text-tg-text/70")}>
                {message.replyTo.content}
              </div>
            </div>
          ) : null}

          <div className="whitespace-pre-wrap break-words">
            {message.deletedAt ? (
              <span className={mine ? "text-white/70 italic" : "text-tg-text/60 italic"}>
                Message deleted
              </span>
            ) : (
              message.content
            )}
          </div>

          <div className="mt-1 flex items-center justify-end gap-2 text-[11px] leading-4 font-mono">
            {message.editedAt ? (
              <span className={mine ? "text-white/80" : "text-tg-text/60"}>edited</span>
            ) : null}
            <span className={mine ? "text-white/80" : "text-tg-text/60"}>{time}</span>
          </div>
        </div>

        {groupedReactions.length ? (
          <div className={clsx("mt-1 flex flex-wrap gap-1", mine ? "justify-end" : "justify-start")}>
            {groupedReactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReact(r.emoji)}
                className={clsx(
                  "px-2 py-0.5 rounded-full text-[12px] border",
                  mine ? "border-white/20 text-white/90" : "border-tg-border text-tg-text"
                )}
                aria-label={`React ${r.emoji}`}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        ) : null}

        <div className={clsx("absolute -top-2", mine ? "-left-9" : "-right-9")}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={clsx(
              "h-8 w-8 rounded-lg border border-tg-border bg-tg-surface text-tg-text/70 opacity-0 group-hover:opacity-100 transition",
              menuOpen ? "opacity-100" : ""
            )}
            aria-label="Message actions"
          >
            ⋯
          </button>

          {menuOpen ? (
            <div
              className={clsx(
                "absolute z-20 mt-2 w-44 rounded-xl border border-tg-border bg-tg-surface shadow-lg overflow-hidden",
                mine ? "left-0" : "right-0"
              )}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <MenuItem
                label="Reply"
                onClick={() => {
                  setMenuOpen(false);
                  onReply();
                }}
              />
              <MenuItem
                label="Forward"
                onClick={() => {
                  setMenuOpen(false);
                  onForward();
                }}
              />
              <MenuItem
                label="React 👍"
                onClick={() => {
                  setMenuOpen(false);
                  onReact("👍");
                }}
              />
              <MenuItem
                label="React ❤️"
                onClick={() => {
                  setMenuOpen(false);
                  onReact("❤️");
                }}
              />
              <MenuItem
                label="Pin"
                onClick={() => {
                  setMenuOpen(false);
                  onPin();
                }}
              />
              {mine ? (
                <>
                  <div className="h-px bg-tg-border" />
                  <MenuItem
                    label="Edit"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit();
                    }}
                  />
                  <MenuItem
                    label="Delete"
                    danger
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                  />
                </>
              ) : null}
              <div className="h-px bg-tg-border" />
              <MenuItem
                label="Select"
                onClick={() => {
                  setMenuOpen(false);
                  onToggleSelect();
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full text-left px-3 py-2 text-sm hover:bg-tg-darker transition",
        danger ? "text-red-400 hover:text-red-300" : "text-tg-text"
      )}
    >
      {label}
    </button>
  );
}

