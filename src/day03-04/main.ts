import { runAgent } from "./agent";
import { readFile, writeFile, listDir } from "./tool";

// const task = '在 sandbox 下创建 hello.txt, 内容写"今天是 Day 3", 然后读取出来确认。';
const task = '读 sandbox/不存在.txt 的内容';

const answer = await runAgent(task, [readFile, writeFile, listDir]);

console.log('\n最终答案:\n', answer);