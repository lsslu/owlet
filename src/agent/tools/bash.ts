import { z } from "zod"; 
import { execa } from "execa";
import { defineTool, ok, err } from "../tool";
import { defaultPolicy } from "../permission";
import { confirm } from "../prompt";

export const bash = defineTool({
  name: 'bash',
  description: '执行 bash 命令并返回 stdout/stderr。危险命令会被拒绝或要求用户确认',
  schema: z.object({
    command: z.string().describe('要执行的 bash 命令'),
    timeout_ms: z.number().int().positive().default(30000),
  }),
  execute: async ({ command, timeout_ms }, ctx) => {
    const decision = defaultPolicy.bash(command);
    if (decision === 'deny') {
      return err(`命令被策略拒绝: ${command}`);
    }
    if (decision === 'ask') {
      const allowed = await confirm(`Agent 想执行: ${command}`);
      if (!allowed) {
        return err(`用户拒绝执行 ${command}`);
      }
    }
    try {
      const { stdout, stderr, exitCode, timedOut } = await execa('bash', ['-c', command], {
        timeout: timeout_ms,
        reject: false,
        ...(ctx.signal ? { cancelSignal: ctx.signal } : {}),
      });
      if (exitCode !== 0) {
        return err(`exit ${exitCode}\n${stderr || stdout}`);
      }

      const out = [
        stdout && `[stdout]\n${stdout}`,
        stderr && `[stderr]\n${stderr}`,
      ].filter(Boolean).join('\n');

      if (timedOut) {
        return err(`命令执行超时 (${timeout_ms}ms)`);
      }

      return ok(out);
    } catch (e: any) {
      return err(`执行失败: ${e?.shortMessage ?? e?.message ?? String(e)}`);
    }
  }
});