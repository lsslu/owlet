import { runAgentStream } from './agent/loop';
import { readFile, writeFile, listDir } from './agent/tools/fs';
import { currentTime } from './agent/tools/current-time';
import { bash } from './agent/tools/bash';
import { memorySearch, memorySave } from './agent/tools/memory';
import { createPlan, updateTask, getPlan } from './agent/tools/todo';
import { ask, closePrompt } from './agent/prompt';

const tools = [
  readFile, writeFile, listDir, 
  currentTime, bash, 
  memorySearch, memorySave,
  createPlan, updateTask, getPlan
];

const SYSTEM_PROMPT = `你是一个能操作文件系统的助手，沙盒在 ./sandbox。工具返回 "Error:" 开头表示失败。

面对多步骤复杂任务（3 步以上）：
1. 先用 create_plan 拆解
2. 每开始执行一步前，update_task 改为 in_progress
3. 完成后立即 update_task 改为 done

简单单步任务不需要 todo 工具。`;

const messages: any[] = [
  { role: 'system', content: SYSTEM_PROMPT },
];

console.log('Agent CLI v1. 输入 "exit" 退出。 Ctrl+C 中断当前响应。\n');

while (true) {
  const input = await ask('You> ');
  if (!input || input === 'exit') break;

  messages.push({ role: 'user', content: input });

  const controller = new AbortController();
  const sigint = () => controller.abort();
  process.once('SIGINT', sigint);

  process.stdout.write('Agent> ');
  try {
    await runAgentStream(messages, tools, controller.signal);
  } catch (err: any) {
    if (err.name !== 'AbortError' && err.message !== 'aborted') {
      console.error('\n[错误]', err.message);
    } else {
      console.log('\n[已中断]');
    }
  } finally {
    process.removeListener('SIGINT', sigint);
  }
}

closePrompt();