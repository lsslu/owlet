import { callLLMStream } from "../shared/llm.stream";
import type { Tool } from "../shared/llm";

export async function runAgentStream(
  messages: any[],
  tools: Tool[],
  signal?: AbortSignal
): Promise<string> {
  const toolMap = new Map(tools.map(t => [t.name, t]));

  for (let turn = 0; turn < 10; turn++) {
    let fullText = '';
    const toolCalls = new Map<string, { id: string, name: string, args: string }>();

    for await (const event of callLLMStream(messages,tools, signal)) {
      if (event.type === 'text') {
        process.stdout.write(event.delta);
        fullText += event.delta;
      }
      else if (event.type === 'tool_call_start') {
        toolCalls.set(event.id, { id: event.id, name: event.name, args: ''});
      }
      else if (event.type === 'tool_call_args') {
        const tc = toolCalls.get(event.id);
        if (tc) {
          tc.args += event.delta;
        }
      }
    }

    const assistantMsg: any = { role: 'assistant', content: fullText || null };

    if (toolCalls.size > 0) {
      assistantMsg.tool_calls = Array.from(toolCalls.values()).map(tc => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.name,
          arguments: tc.args,
        }
      }));
    }
    messages.push(assistantMsg);

    if (toolCalls.size === 0) {
      process.stdout.write('\n');
      return fullText;
    }
  }

  return '';
}