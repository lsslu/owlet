import { encoding_for_model } from "tiktoken";

const enc = encoding_for_model("gpt-4");

export function countTokens(text: string): number {
  return enc.encode(text).length;
}

export function countMessagesTokens(messages: any[]): number {
  let total = 0;
  for (const m of messages) {
    total += 4;
    if (typeof m.content === 'string') {
      total += countTokens(m.content);
    }
    if (m.tool_calls) {
      for (const tc of m.tool_calls) {
        total += countTokens(tc.function.name);
        total += countTokens(tc.function.arguments);
      }
    }
  }

  return total;
}