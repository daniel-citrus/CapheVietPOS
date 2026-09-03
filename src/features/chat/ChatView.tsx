import { useEffect, useRef, useState } from "react";
import { useAgent, type ChatEntry, type PendingConfirmation } from "../../agent/useAgent";
import { hasAnthropicKey } from "../../config/env";

const SUGGESTIONS = [
  "Show me the menu",
  "What's the price of cà phê sữa đá?",
  "Raise all cà phê sữa đá prices by 25 cents",
  "Archive chè ba màu",
];

function prettyArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .filter(([, v]) => v !== undefined && v !== "" && v !== null)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
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
        <code>{entry.call?.name}</code>
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
      <div style={{ fontSize: "0.82rem" }}>
        <code>{pending.call.name}</code>
      </div>
      <div className="args">{prettyArgs(pending.call.args) || "(no arguments)"}</div>
      <div className="row">
        <button className="btn btn--primary" onClick={pending.approve}>
          Apply
        </button>
        <button className="btn" onClick={pending.deny}>
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

  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [entries, pending]);

  const submit = () => {
    if (!draft.trim() || busy) return;
    send(draft);
    setDraft("");
  };

  return (
    <div className="chat">
      <div className="chat-log" ref={logRef}>
        {entries.length === 0 && (
          <div className="chat-intro">
            <h2>Ask me to run the menu</h2>
            <p>
              {agentKind === "claude"
                ? "Add items, change prices, move categories, archive — in plain language. You approve every change."
                : "No API key set — I understand a few direct commands. Add VITE_ANTHROPIC_API_KEY for full chat."}
            </p>
            {!canWrite && (
              <p style={{ marginTop: 10, color: "var(--danger)" }}>
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

        {busy && !pending && (
          <div className="activity activity--running">
            <span className="glyph" />
            <span>Working…</span>
          </div>
        )}
      </div>

      <div className="composer">
        <textarea
          value={draft}
          rows={1}
          placeholder={
            hasAnthropicKey ? "Message the menu assistant…" : "Try: show the menu"
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
          className="btn btn--ghost btn--sm"
          style={{ alignSelf: "center", margin: "0 0 6px" }}
          onClick={reset}
        >
          Clear conversation
        </button>
      )}
    </div>
  );
}
