import { countMessagesTokens } from "./token";
import { config } from "../shared/config";

interface CompactOptions {
  threshold: number;
  keepRecent: number;
}

const DEFAULT_OPTS: CompactOptions = {
  threshold: 5000,
  keepRecent: 6,
}

export class ContextManager {
  constructor(
    private messages: any[],
    private opts: CompactOptions = DEFAULT_OPTS,
  ) {}

  add(msg: any) {
    this.messages.push(msg);
  }

  getMessages(): any[] {
    return this.messages;
  }

  needsCompact(): boolean {
    return countMessagesTokens(this.messages) > this.opts.threshold;
  }

  async compact(): Promise<void> {
    const before = countMessagesTokens(this.messages);
    console.log(`\n[context] 触发 compact， 当前 ${before} tokens`);

    const systemMsgs = this.messages.filter(m => m.role === 'system');
    const nonSystem = this.messages.filter(m => m.role !== 'system');

    if (nonSystem.length <= this.opts.keepRecent) {
      return;
    }

    let cutIndex = nonSystem.length - this.opts.keepRecent;
    while (cutIndex > 0 && nonSystem[cutIndex].role === 'tool') {
      cutIndex--;
    }

    const toCompact = nonSystem.slice(0, cutIndex);
    const toKeep = nonSystem.slice(cutIndex);
    if (toCompact.length === 0) {
      return;
    }

    const summary = await summarize(this.messages);

    this.messages = [
      ...systemMsgs,
      { role: 'user', content: `[以前对话摘要]\n${summary}` },
      ...toKeep,
    ];
    
    const after = countMessagesTokens(this.messages);
    console.log(`[context] compact 完成，${before} → ${after} tokens (-${Math.round(1 - after / before) * 100}%)`);
  }

  
}

async function summarize(messages: any[]): Promise<string> {
  const text = messages.map(m => {
    if (m.role === 'tool') {
      return `[tool result] ${m.content}`;
    }
    if (m.tool_calls) {
      return `[assistant 调用] ${m.tool_calls.map((tc: any) => `${tc.function.name}(${tc.function.arguments})`).join(', ')}`;
    }
  }).join('\n\n');
  const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: '你是对话摘要助手，把一下对话压缩成简洁摘要，保留关键事实、决策、工具调用结果。不要遗漏文件名、命令、错误等具体信息。' },
        { role: 'user', content: text },
      ]
    }),
  });
  
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '摘要生成失败';
}