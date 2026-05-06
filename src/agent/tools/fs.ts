import { z } from 'zod';
import { promises as fs } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { ok, err, defineTool } from '../tool';
import type { Tool } from '../tool';

const SANDBOX = resolve(process.cwd(), 'sandbox');

function safePath(userPath: string): string | null {
  let normalized = userPath;

  // 绝对路径：若落在 sandbox 内，剥成相对形式；否则保留，让后面的越界检查拒绝
  if (isAbsolute(normalized)) {
    const rel = relative(SANDBOX, normalized);
    if (!rel.startsWith('..')) normalized = rel;
  }

  // 剥掉冗余的前导 sandbox/ 或 ./sandbox/（LLM 经常自作主张加）
  normalized = normalized.replace(/^(\.\/)?sandbox(\/|$)/, '');

  const full = resolve(SANDBOX, normalized);
  const rel = relative(SANDBOX, full);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    return null;
  }
  return full;
}

export const readFile = defineTool({
  name: 'read_file',
  description: '读取沙盒中文件的内容',
  schema: z.object({
    path: z.string().describe('相对 sandbox 的路径'),
  }),
  execute: async ({ path }) => {
    const safe = safePath(path);
    if (!safe) {
      return err(`拒绝访问沙盒外的路径: ${path}`);
    }
    try {
      const content = await fs.readFile(safe, 'utf-8');
      return ok(content);
    } catch (e: any) {
      if (e.code === 'ENOENT') return err('文件不存在: ${path}');
      if (e.code === 'EACCES') return err('没有权限访问文件: ${path}');
      return err(`读取文件失败: ${e.message}`);
    }
  },
});

export const writeFile = defineTool({
  name: 'write_file',
  description: '写入内容到沙盒中的文件（会覆盖）',
  schema: z.object({
    path: z.string().describe('相对 sandbox 的路径'),
    content: z.string().describe('要写入的文本内容'),
  }),
  execute: async ({ path, content }) => {
    const safe = safePath(path);
    if (!safe) {
      return err(`拒绝访问沙盒外的路径: ${path}`);
    }
    try {
      await fs.writeFile(safe, content, 'utf-8');
      return ok(`已写入 ${path}, ${content.length} 字符`);
    } catch (e: any) {
      return err(`写入文件失败: ${e.message}`);
    }
  },
});

export const listDir = defineTool({
  name: 'list_dir',
  description: '列出沙盒目录下的文件',
  schema: z.object({
    path: z.string().describe('相对 sandbox 的路径，默认为 "." 表示根目录').default('.'),
  }),
  execute: async ({ path = '.' }) => {
    const safe = safePath(path);
    if (!safe) {
      return err(`拒绝访问沙盒外的路径: ${path}`);
    }
    try {
      const items = await fs.readdir(safe);
      return ok(items.join('\n') || '(空)');
    } catch (e: any) {
      return err(`列出目录失败: ${e.message}`);
    }
  }
});