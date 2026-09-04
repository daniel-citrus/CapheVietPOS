import type { CatalogRepository } from "../repositories/CatalogRepository";
import { CatalogToolbox, toolByName } from "./catalogTools";
import type { Agent, AgentTurn, ToolCall } from "./types";

/**
 * Fallback agent when no Anthropic API key is configured. It recognises a
 * handful of common phrasings and drives the same toolbox the Claude agent
 * uses. Not conversational — deliberately narrow and predictable.
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
    // "set price of Cà phê sữa đá L to $5" / "change Bạc xỉu price to 4.75"
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
      return {
        name: "set_price",
        args: { item, variation, price_usd: Number(m[2]) },
      };
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

Add ANTHROPIC_API_KEY to .env.local (server-side only) for full conversational control.`;

export class OfflineAgent implements Agent {
  readonly kind = "offline" as const;
  private toolbox: CatalogToolbox;

  constructor(repo: CatalogRepository) {
    this.toolbox = new CatalogToolbox(repo);
  }

  reset() {}

  async send(userText: string, turn: AgentTurn): Promise<void> {
    const matched = rules
      .map((r) => {
        const m = userText.match(r.test);
        return m ? r.build(m) : null;
      })
      .find(Boolean);

    if (!matched || matched.name === "__help") {
      turn.emit({ type: "text", text: HELP });
      return;
    }

    const spec = toolByName.get(matched.name);
    const call: ToolCall = {
      id: crypto.randomUUID(),
      name: matched.name,
      args: matched.args,
      mutates: spec?.mutates ?? false,
    };
    turn.emit({ type: "tool_call", call });

    if (call.mutates) {
      const approved = await turn.confirm(call);
      if (!approved) {
        turn.emit({
          type: "tool_result",
          call,
          result: { ok: false, summary: "You declined this change." },
        });
        return;
      }
    }

    const result = await this.toolbox.run(call.name, call.args);
    turn.emit({ type: "tool_result", call, result });
    turn.emit({
      type: "text",
      text: result.ok ? "Done." : `That didn't work. ${result.summary}`,
    });
  }
}
