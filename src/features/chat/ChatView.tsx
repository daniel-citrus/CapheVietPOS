import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  useAgent,
  type ChatEntry,
  type PendingConfirmation,
} from "../../agent/useAgent";

const SUGGESTIONS = [
  "Show me the menu",
  "What's the price of cà phê sữa đá?",
  "Raise cà phê sữa đá by 25¢",
  "Archive chè ba màu",
];

function prettyArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args).filter(
    ([, v]) => v !== undefined && v !== "" && v !== null,
  );
  if (entries.length === 0) return "(no details)";
  return entries
    .map(
      ([k, v]) =>
        `${k.replace(/_/g, " ")}: ${
          typeof v === "object" ? JSON.stringify(v) : v
        }`,
    )
    .join("\n");
}

function Activity({ entry }: { entry: ChatEntry }) {
  const status = entry.status ?? "running";
  const glyph =
    status === "done"
      ? "✓"
      : status === "error"
        ? "!"
        : status === "declined"
          ? "–"
          : "";
  return (
    <div className={`activity activity--${status}`}>
      <span className="glyph">{glyph}</span>
      <span>
        <code>{entry.call?.name.replace(/_/g, " ")}</code>
        {entry.result?.summary && (
          <span className="detail">{entry.result.summary}</span>
        )}
      </span>
    </div>
  );
}

function ConfirmCard({ pending }: { pending: PendingConfirmation }) {
  return (
    <div className="confirm-card">
      <h4>Apply this change?</h4>
      <div className="tool-name">
        <code>{pending.call.name.replace(/_/g, " ")}</code>
      </div>
      <div className="args">{prettyArgs(pending.call.args)}</div>
      <div className="row">
        <button className="btn-jade" onClick={pending.approve}>
          Apply
        </button>
        <button className="btn-secondary" onClick={pending.deny}>
          Skip
        </button>
      </div>
    </div>
  );
}

export function ChatView() {
  const { entries, busy, pending, send, stop, reset, agentKind, canWrite } =
    useAgent();
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [entries, pending, busy]);

  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [draft]);

  const submit = () => {
    if (!draft.trim() || busy) return;
    send(draft);
    setDraft("");
  };

  const lastEntry = entries[entries.length - 1];
  const showThinking =
    busy && !pending && (!lastEntry || lastEntry.kind !== "assistant");

  return (
    <div className="chat">
      <div className="chat-log" ref={logRef}>
        {entries.length === 0 && (
          <div className="chat-intro">
            <h2>Ask me to run the menu</h2>
            <p>
              {agentKind === "claude"
                ? "Add items, change prices, move categories, archive — in plain language. You approve every change."
                : "No API key configured — I understand a few direct commands. Add ANTHROPIC_API_KEY to .env.local (server-side) for the full assistant."}
            </p>
            {!canWrite && (
              <p style={{ marginTop: "0.6rem", color: "var(--color-error)" }}>
                You're viewing as staff — changes are disabled.
              </p>
            )}
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {entries.map((entry) => {
          if (entry.kind === "activity") {
            return <Activity key={entry.id} entry={entry} />;
          }
          if (entry.kind === "notice") {
            return (
              <div key={entry.id} className="notice">
                {entry.text}
              </div>
            );
          }
          return (
            <div key={entry.id} className={`msg msg--${entry.kind}`}>
              <div className="bubble">{entry.text}</div>
            </div>
          );
        })}

        {pending && <ConfirmCard pending={pending} />}

        {showThinking && (
          <div className="thinking" aria-label="Assistant is working">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <div className="composer">
        <textarea
          ref={taRef}
          value={draft}
          rows={1}
          placeholder={
            agentKind === "claude" ? "Message the assistant…" : "Try: show the menu"
          }
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        {busy ? (
          <button className="send" onClick={stop} aria-label="Stop">
            ■
          </button>
        ) : (
          <button
            className="send"
            onClick={submit}
            disabled={!draft.trim()}
            aria-label="Send"
          >
            ↑
          </button>
        )}
      </div>

      {entries.length > 0 && (
        <button
          className="btn-ghost btn-sm"
          style={{ alignSelf: "center", margin: "0 0 0.4rem" }}
          onClick={reset}
        >
          Clear conversation
        </button>
      )}
    </div>
  );
}
