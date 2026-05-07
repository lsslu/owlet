export type PermissionDecision = 'allow' | 'deny' | 'ask';

export interface PermissionPolicy {
  bash: (cmd: string) => PermissionDecision;
}

const DENY_PATTERNS = [
  /\brm\s+-rf?\s+\//,
  /\bsudo\b/,
  /\bchmod\s+777\b/,
  /\bdd\s+if=/,
  /:\(\)\s*\{/,           // fork bomb
  /\bcurl\b.*\|\s*sh/,
  /\bwget\b.*\|\s*sh/,
];

const ALLOW_PATTERNS = [
  /^ls\b/,
  /^pwd$/,
  /^echo\b/,
  /^cat\s+/,
  /^git\s+(status|log|diff|branch)/,
];

export const defaultPolicy: PermissionPolicy = {
  bash: (cmd) => {
    if (DENY_PATTERNS.some(p => p.test(cmd))) return 'deny';
    if (ALLOW_PATTERNS.some(p => p.test(cmd))) return 'allow';
    return 'ask';
  }
}

export async function askUserConfirm(prompt: string): Promise<boolean> {
  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${prompt}\n (y/N): `);
  rl.close();
  return answer.trim().toLowerCase() === 'y';
}