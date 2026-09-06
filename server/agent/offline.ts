import type { ToolCall } from "shared/api";
import { toolByName } from "./menuTools";
import { handleToolCall, type AgentRun } from "./run";

/**
 * Fallback when no ANTHROPIC_API_KEY: recognise ~9 common phrasings, run one
 * tool through the same path as the Claude loop. Not conversational.
 */

interface Rule {
  test: RegExp;
  build: (m: RegExpMatchArray) => { name: string; args: Record<string, unknown> };
}

const pricePattern = String.raw`\$?\s*(\d+(?:\.\d{1,2})?)`;

const rules: Rule[] = [
  {
    test: /^\s*(?:help|what can you do|\?)\s*$/i,
    build: () => ({ name: "__help", args: {} }),
  },
  {
    test: /\b(?:list|show|view|what'?s on|see)\b.*\b(categor)/i,
    build: () => ({ name: "list_categories", args: {} }),
  },
  {
    test: /\b(?:list|show|view|see|what'?s on)\b.*\b(menu|items?|drinks?|products?)\b/i,
    build: () => ({ name: "list_menu", args: {} }),
  },
  {
    test: /\b(?:archived|hidden)\b.*\b(items?|menu|drinks?)\b|\b(?:list|show)\b.*\barchived\b/i,
    build: () => ({ name: "list_menu", args: { include_archived: true } }),
  },
  {
    test: /\b(?:archive|hide|remove|disable)\b\s+(?:the\s+)?(.+?)\s*$/i,
    build: (m) => ({ name: "archive_item", args: { item: m[1] } }),
  },
  {
    test: /\b(?:unarchive|restore|bring back|re-?add|show)\b\s+(?:the\s+)?(.+?)\s*$/i,
    build: (m) => ({ name: "unarchive_item", args: { item: m[1] } }),
  },
  {
    test: new RegExp(
      String.raw`(?:set|change|update|make)\s+(?:the\s+)?(?:price\s+(?:of|for)\s+)?(.+?)\s+(?:price\s+)?(?:to|=|at)\s+${pricePattern}`,
      "i",
    ),
    build: (m) => {
      let item = m[1].replace(/\bprice\b/gi, "").trim();
      let variation: string | undefined;
      const sizeMatch = item.match(/\s+(S|M|L|XL|small|medium|large)$/i);
      if (sizeMatch) {
        variation = sizeMatch[1];
        item = item.slice(0, sizeMatch.index).trim();
      }
      return { name: "set_price", args: { item, variation, price_usd: Number(m[2]) } };
    },
  },
  {
    test: /\bfind\b\s+(.+?)\s*$/i,
    build: (m) => ({ name: "find_item", args: { query: m[1] } }),
  },
  {
    test: /\b(?:new|create|add)\b\s+categor(?:y|ies)\s+(?:called\s+)?(.+?)\s*$/i,
    build: (m) => ({ name: "create_category", args: { name: m[1] } }),
  },
];

const HELP = `I can, without an API key:
• "show the menu" / "show archived items"
• "list categories"
• "find <name>"
• "set price of <item> <size> to $<amount>"
• "archive <item>" / "restore <item>"
• "create category <name>"

Set ANTHROPIC_API_KEY in the backend's .env.local for the full assistant.`;

export async function runOffline(userText: string, run: AgentRun): Promise<void> {
  const matched = rules
    .map((r) => {
      const m = userText.match(r.test);
      return m ? r.build(m) : null;
    })
    .find(Boolean);

  if (!matched || matched.name === "__help") {
    run.emit({ type: "text", text: HELP });
    return;
  }

  const spec = toolByName.get(matched.name);
  const call: ToolCall = {
    id: crypto.randomUUID(),
    name: matched.name,
    args: matched.args,
    mutates: spec?.mutates ?? false,
  };

  const outcome = await handleToolCall(run, call);
  // On success add a closing line; on failure the tool_result already explains.
  if (!outcome.isError) run.emit({ type: "text", text: "Done." });
}
