import readline from 'node:readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

export const ask = (q: string) => rl.question(q);

export async function confirm(prompt: string): Promise<boolean> {
  const answer = await rl.question(`${prompt}\n (y/N): `);
  return answer.trim().toLowerCase() === 'y';
}

export const closePrompt = () => rl.close();
