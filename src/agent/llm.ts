import { config } from "../shared/config";
import type { Tool } from "./tool";
import z from "zod";

function toOpenAITools(tools: Tool[]) {
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.schema ? z.toJSONSchema(t.schema, { target: 'openapi-3.0' }) : { type: 'object', properties: {} },
    }
  }));
}

export type StreamEvent =
| { type: 'text'; delta: string }
| { type: 'reasoning'; delta: string }
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

  if (!res.ok) {
    const body = await res.text();
    console.log('LLM 响应状态:', res.status, res.statusText);
    console.log('LLM 错误响应体:', body);
    console.log('LLM 请求 messages:', JSON.stringify(messages, null, 2));
    throw new Error(`LLM call failed: ${res.status} ${body}`);
  }
  if (!res.body) throw new Error('LLM response has no body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  const idByIndex = new Map<number, string>();

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
      const delta = json.choices[0]?.delta;
      const finishReason = json.choices[0]?.finish_reason;

      if (delta?.reasoning_content) {
        yield { type: 'reasoning', delta: delta.reasoning_content };
      }

      if (delta?.content) {
        yield { type: 'text', delta: delta.content };
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.id) idByIndex.set(tc.index, tc.id);
          const id = idByIndex.get(tc.index);
          if (!id) continue;

          if (tc.function?.name) {
            yield { type: 'tool_call_start', id, name: tc.function.name };
          }
          if (tc.function?.arguments) {
            yield { type: 'tool_call_args', id, delta: tc.function.arguments };
          }
        }
      }

      if (finishReason) {
        yield { type: 'done', finishReason };
      }
    }
  }
}