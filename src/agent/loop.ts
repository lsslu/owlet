import { ContextManager } from "./context";
import { callLLMStream } from "./llm";
import { runTool, type Tool } from "./tool";

export async function runAgentStream(
  messages: any[],
  tools: Tool[],
  signal?: AbortSignal
): Promise<string> {
  const toolMap = new Map(tools.map(t => [t.name, t]));

  const ctx = new ContextManager(messages);

  for (let turn = 0; turn < 50; turn++) {
    if (ctx.needsCompact()) {
      await ctx.compact();
    }
    let fullText = '';
    let fullReasoning = '';
    const toolCalls = new Map<string, { id: string, name: string, args: string }>();

    for await (const event of callLLMStream(ctx.getMessages(),tools, signal)) {
      if (event.type === 'text') {
        process.stdout.write(event.delta);
        fullText += event.delta;
      }
      else if (event.type === 'reasoning') {
        process.stdout.write(`\x1b[90m${event.delta}\x1b[0m`);
        fullReasoning += event.delta;
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

    // DeepSeek 思考模式要求把本轮的 reasoning_content 原样回传
    const assistantMsg: any = {
      role: 'assistant',
      content: toolCalls.size > 0 ? '' : fullText,
    };
    if (fullReasoning) assistantMsg.reasoning_content = fullReasoning;

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
    ctx.add(assistantMsg);

    if (toolCalls.size === 0) {
      process.stdout.write('\n');
      return fullText;
    }

    const toolPromises = Array.from(toolCalls.values()).map(async tc => {
      if (signal?.aborted) throw new Error('操作被用户取消');

      const tool = toolMap.get(tc.name);
      if (!tool) {
        const known = Array.from(toolMap.keys()).join(',');
        return { id: tc.id, content: `Error: 工具 ${tc.name} 不存在。可用工具有: ${known}` };
      }

      let args: any;
      try {
        args = JSON.parse(tc.args);
      } catch {
        return { id: tc.id, content: `Error: 参数不是合法 JSON` };
      }

      console.log(`\n[tool] ${tc.name}(${JSON.stringify(args).slice(0, 80)})`);
      const r = await runTool(tool, args, { signal : signal! });
      return { id: tc.id, content: r.ok ? r.value : `Error: ${r.error}` };
    });

    const results = await Promise.all(toolPromises);
    for (const { id, content } of results) {
      ctx.add({ role: 'tool', tool_call_id: id, content });
    }
  }

  throw new Error('达到最大轮数');
}