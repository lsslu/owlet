import { callLLM, type Tool } from '../shared/llm';

export async function runAgent(userMessage: string, tools: Tool[]) {
  const toolMap = new Map(tools.map(t => [t.name, t]));
  const messages: any[] = [
    { role: 'system', content: '你是一个能操作文件系统的助手。沙盒目录在 sandbox 下。' },
    { role: 'user', content: userMessage },
  ];

  const MAX_TURNS = 10;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const reply = await callLLM(messages, tools);
    messages.push(reply);

    // 模型决定结束
    if (!reply.tool_calls || reply.tool_calls.length === 0) {
      return reply.content as string;
    }

    for (const call of reply.tool_calls) {
      const tool = toolMap.get(call.function.name);
      let result: string;

      if (!tool) {
        result = `错误：未知工具 ${call.function.name}`;
      } else {
        let args: any;
        try {
          args = JSON.parse(call.function.arguments);
        } catch (e: any) {
          result = `错误：工具参数解析失败 - ${e.message}`;
          messages.push({ role: 'tool', tool_call_id: call.id, content: result });
          continue;
        }
        const r = await tool.execute(args);
        result = r.ok ? r.value : `错误：${r.error}`;
      }

      console.log(`[agent] 结果: ${result.slice(0, 100)}${result.length > 100 ? '...' : ''}`);

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: result,
      });
    }
  }

  throw new Error('达到最大对话轮数，未能得到结果');
}