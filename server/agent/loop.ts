import Anthropic from "@anthropic-ai/sdk";
import type { ToolCall } from "shared/api";
import { config } from "../config";
import { toolByName, toolSpecs } from "./menuTools";
import { getHistory } from "./conversations";
import { handleToolCall, type AgentRun } from "./run";

const SYSTEM_PROMPT = `You are the assistant for "Cà phê Việt", a Vietnamese-branded coffee shop in the US. Square is the system of record for the menu.

You help the owner manage the menu by conversation: viewing items, creating items, renaming, re-pricing, moving categories, and archiving. Use the provided tools for every read and every change — never guess the menu from memory.

Guidelines:
- Keep replies short and mobile-friendly. A sentence or two, then the result.
- Prices are US dollars. "$4.50" means price_usd 4.5.
- Before changing an item the user named loosely, use find_item to confirm which one.
- The app shows the user a confirmation card for every change; you do not need to ask "are you sure" yourself, but do briefly say what you're about to do.
- If a tool fails, explain the error plainly and suggest a fix.
- You cannot process orders, run reports, or manage staff — only the menu.`;

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

const tools: Anthropic.Tool[] = toolSpecs.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.input_schema as Anthropic.Tool.InputSchema,
}));

/** The Claude tool-use loop, server-side. Streams events through `run`. */
export async function runClaude(
  userText: string,
  conversationId: string,
  run: AgentRun,
): Promise<void> {
  const history = getHistory(conversationId);
  history.push({ role: "user", content: userText });

  for (let step = 0; step < 12; step += 1) {
    if (run.signal.aborted) return;

    const stream = client.messages.stream(
      {
        model: config.anthropic.model,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        output_config: { effort: "low" },
        tools,
        messages: history,
      },
      { signal: run.signal },
    );

    stream.on("text", (chunk) => run.emit({ type: "text", text: chunk }));

    const message = await stream.finalMessage();
    history.push({ role: "assistant", content: message.content });

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
      const outcome = await handleToolCall(run, call);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: outcome.content,
        is_error: outcome.isError,
      });
    }

    history.push({ role: "user", content: toolResults });
  }

  run.emit({
    type: "error",
    message: "Stopped after too many steps. Try a smaller request.",
  });
}
