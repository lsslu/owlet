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
    let fullReasoning = '';
    const toolCalls = new Map<string, { id: string, name: string, args: string }>();

    for await (const event of callLLMStream(messages,tools, signal)) {
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
    messages.push(assistantMsg);

    if (toolCalls.size === 0) {
      process.stdout.write('\n');
      return fullText;
    }

    for (const tc of toolCalls.values()) {
      if (signal?.aborted) throw new Error('操作被用户取消');

      const tool = toolMap.get(tc.name);
      console.log(`\n[tool] ${tc.name}(${tc.args}), 查找工具: ${tool ? '找到' : '未找到'}`);
      if (!tool) {
        const known = Array.from(toolMap.keys()).join(',');
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: `Error: 工具 ${tc.name} 不存在。可用工具有: ${known}`,
        });
        continue;
      }

      console.log(`\n[tool] 执行工具 ${tc.name}，参数: ${tc.args}`);

      let args: any;
      try {
        args = JSON.parse(tc.args);
      } catch {
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: `Error: 工具 ${tc.name} 的参数不是有效的 JSON 字符串: ${tc.args}`,
        });
        continue;
      }
      
      console.log(`\n[tool] ${tc.name}(${tc.args})`);
      const r = await tool.execute(args);
      const content = r.ok ? r.value : `Error: ${r.error}`;
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content,
      });
    }

    
  }

  throw new Error('达到最大轮数');
}