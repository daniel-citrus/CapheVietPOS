import Anthropic from "@anthropic-ai/sdk";
import { agentModel, anthropicApiKey } from "../config/env";
import type { CatalogRepository } from "../repositories/CatalogRepository";
import { CatalogToolbox, toolByName, toolSpecs } from "./catalogTools";
import type { Agent, AgentTurn, ToolCall } from "./types";

const SYSTEM_PROMPT = `You are the assistant for "Cà phê Việt", a Vietnamese-branded coffee shop in the US. Square is the system of record for the menu.

You help the owner manage the menu by conversation: viewing items, creating items, renaming, re-pricing, moving categories, and archiving. Use the provided tools for every read and every change — never guess the menu from memory.

Guidelines:
- Keep replies short and mobile-friendly. A sentence or two, then the result.
- Prices are US dollars. "$4.50" means price_usd 4.5.
- Before changing an item the user named loosely, use find_item to confirm which one.
- The app shows the user a confirmation card for every change; you do not need to ask "are you sure" yourself, but do briefly say what you're about to do.
- If a tool fails, explain the error plainly and suggest a fix.
- You cannot process orders, run reports, or manage staff — only the menu catalog.`;

type MessageParam = Anthropic.MessageParam;

export class ClaudeAgent implements Agent {
  readonly kind = "claude" as const;
  private client: Anthropic;
  private toolbox: CatalogToolbox;
  private history: MessageParam[] = [];

  constructor(repo: CatalogRepository) {
    this.client = new Anthropic({
      apiKey: anthropicApiKey,
      dangerouslyAllowBrowser: true,
    });
    this.toolbox = new CatalogToolbox(repo);
  }

  reset() {
    this.history = [];
  }

  async send(userText: string, turn: AgentTurn): Promise<void> {
    this.history.push({ role: "user", content: userText });

    for (let guard = 0; guard < 12; guard += 1) {
      if (turn.signal.aborted) return;

      const stream = this.client.messages.stream(
        {
          model: agentModel,
          max_tokens: 8000,
          system: SYSTEM_PROMPT,
          output_config: { effort: "low" },
          tools: toolSpecs.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.input_schema as Anthropic.Tool.InputSchema,
          })),
          messages: this.history,
        },
        { signal: turn.signal },
      );

      stream.on("text", (chunk) => turn.emit({ type: "text", text: chunk }));

      const message = await stream.finalMessage();
      this.history.push({ role: "assistant", content: message.content });

      if (message.stop_reason !== "tool_use") return;

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of message.content) {
        if (block.type !== "tool_use") continue;
        const spec = toolByName.get(block.name);
        const call: ToolCall = {
          id: block.id,
          name: block.name,
          args: (block.input ?? {}) as Record<string, unknown>,
          mutates: spec?.mutates ?? false,
        };
        turn.emit({ type: "tool_call", call });

        if (call.mutates) {
          const approved = await turn.confirm(call);
          if (!approved) {
            const result = { ok: false, summary: "You declined this change." };
            turn.emit({ type: "tool_result", call, result });
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: "The user declined this change. Do not retry it.",
              is_error: true,
            });
            continue;
          }
        }

        const result = await this.toolbox.run(call.name, call.args);
        turn.emit({ type: "tool_result", call, result });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify({ summary: result.summary, data: result.data }),
          is_error: !result.ok,
        });
      }

      this.history.push({ role: "user", content: toolResults });
    }

    turn.emit({
      type: "error",
      message: "Stopped after too many steps. Try a smaller request.",
    });
  }
}
