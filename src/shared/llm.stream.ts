import { config } from "./config";
import type { Tool } from "./llm";

function toOpenAITools(tools: Tool[]) {
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  }));
}

export type StreamEvent =
| { type: 'text'; delta: string }
| { type: 'tool_call_start'; id: string; name: string }
| { type: 'tool_call_args'; id: string, delta: string }
| { type: 'done', finishReason: string };

export async function* callLLMStream(
  messages: any[],
  tools: Tool[],
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      tools: tools.length ? toOpenAITools(tools) : undefined,
      stream: true,
    }),
    signal: signal ?? null,
  });

  if (!res.ok) throw new Error(`LLM call failed: ${res.status} ${res.statusText}`);
  if (!res.body) throw new Error('LLM response has no body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';
    
    for (const chunk of chunks) {
      const line = chunk.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;

      const json = JSON.parse(payload);
      const delta = json.choices[0]?.dalta;
      const finishReason = json.choices[0]?.finish_reason;

      if (delta?.content) {
        yield { type: 'text', delta: delta.content };
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.function?.name) {
            yield { type: 'tool_call_start', id: tc.id, name: tc.function.name };
          }
          if (tc.function?.arguments) {
            yield { type: 'tool_call_args', id: tc.id, delta: tc.function.arguments };
          }
        }
      }

      if (finishReason) {
        yield { type: 'done', finishReason };
      }
    }
  }
}