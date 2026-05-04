import readline from 'node:readline';
import { runAgentStream } from './agent/loop';
import { readFile, writeFile, listDir } from './agent/tools/fs';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>(r => rl.question(q, r));

const messages: any[] = [
  {
    role: 'system',
    content: '你是一个能操作文件系统的助手，沙盒在 ./sandbox。工具返回 "Error:" 开头表示失败。',
  },
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
    await runAgentStream(messages, [readFile, writeFile, listDir], controller.signal);
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

rl.close();