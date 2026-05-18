import { stdin, stdout } from 'node:process';

stdin.setEncoding('utf8');

export function ask(q: string): Promise<string> {
  stdout.write('\x1b[?2004h');
  stdout.write(q);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise(resolve => {
    let buf = '';
    let inPaste = false;
    let pending = '';

    const finish = (out: string) => {
      stdout.write('\n');
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      resolve(out);
    };

    const consume = (s: string): string => {
      let i = 0;
      while (i < s.length) {
        const ch = s[i]!;

        if (ch === '\x1b') {
          if (i + 1 >= s.length) return s.slice(i);
          const next = s[i + 1]!;

          // CSI: \x1b[ ... <final byte 0x40-0x7e>
          if (next === '[') {
            let j = i + 2;
            while (j < s.length) {
              const c = s.charCodeAt(j);
              if (c >= 0x40 && c <= 0x7e) break;
              j++;
            }
            if (j >= s.length) return s.slice(i);
            const seq = s.slice(i, j + 1);
            if (seq === '\x1b[200~') inPaste = true;
            else if (seq === '\x1b[201~') inPaste = false;
            // 其他 CSI（方向键、F 键等）静默吞掉
            i = j + 1;
            continue;
          }

          // Alt+Enter: ESC + CR/LF → 插入换行
          if (next === '\r' || next === '\n') {
            buf += '\n';
            stdout.write('\n');
            i += 2;
            continue;
          }

          // 其他 ESC 序列：吞两字节
          i += 2;
          continue;
        }

        i++;

        if (ch === '\x03') process.exit(0);              // Ctrl+C
        if (ch === '\x7f') {                              // 退格
          if (!inPaste && buf.length > 0 && buf[buf.length - 1] !== '\n') {
            buf = buf.slice(0, -1);
            stdout.write('\b \b');
          }
          continue;
        }
        if (ch === '\r' || ch === '\n') {
          if (inPaste) {
            buf += '\n';
            stdout.write('\n');
            continue;
          }
          finish(buf);
          return '';
        }

        buf += ch;
        stdout.write(ch);
      }
      return '';
    };

    const onData = (chunk: string) => {
      pending += chunk;
      pending = consume(pending);
    };

    stdin.on('data', onData);
  });
}

export async function confirm(prompt: string): Promise<boolean> {
  const answer = await ask(`${prompt}\n (y/N): `);
  return answer.trim().toLowerCase() === 'y';
}

export const closePrompt = () => {
  stdout.write('\x1b[?2004l');
};
