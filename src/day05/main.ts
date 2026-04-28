import { runAgentStream } from "./agent";
import { readFile, writeFile, listDir } from '../day03-04/tool';

const controller = new AbortController();

process.on('SIGINT', () => {
  console.log('\n[用户中断]');
  controller.abort();
});

const messages: any[] = [
  { role: 'system', content: '你是一个能操作文件系统的助手。沙盒在 sandbox 目录下。' },
  { role: 'user', content: '写一首四行诗, 输出到在 ./sandbox 目录下， 文件名为poem.txt， 然后读出来给我看。' },
];

try {
  await runAgentStream(messages, [readFile, writeFile, listDir], controller.signal);
  console.log('\n操作完成');
} catch(e: any) {
  if (e.name === 'AbortError' || e.message === 'aborted') {
    console.log('\n已中断');
  } else {
    throw e;
  }
}