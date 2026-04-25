import { promises as fs } from 'node:fs';
import { resolve, relative } from 'node:path';
import { ok, err } from '../shared/result';
import type { Tool } from '../shared/llm';

const SANDBOX = resolve(process.cwd(), 'sandbox');

function safePath(userPath: string): string {
  const full = resolve(SANDBOX, userPath);
  const rel = relative(SANDBOX, full);
  if (rel.startsWith('..') || rel.startsWith('/')) {
    throw new Error('拒绝访问沙盒外的路径: ${userPath}');
  }
  return full;
}

export const readFile: Tool = {
  name: 'read_file',
  description: '读取沙盒中文件的内容',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        describeion: '相对 sandbox 的路径',
      }
    },
    required: ['path'],
  },
  execute: async ({ path }) => {
    const safe = safePath(path);
    if (!safe) {
      return err('拒绝访问沙盒外的路径: ${path}');
    }
    try {
      const content = await fs.readFile(safe, 'utf-8');
      return ok(content);
    } catch (e: any) {
      if (e.code === 'ENOENT') return err('文件不存在: ${path}');
      if (e.code === 'EACCES') return err('没有权限访问文件: ${path}');
      return err('读取文件失败: ${e.message}');
    }
  },
};

export const writeFile: Tool = {
  name: 'write_file',
  description: '写入内容到沙盒中的文件（会覆盖）',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      content: { type: 'string' },
    },
    required: ['path', 'content'],
  },
  execute: async ({ path, content }) => {
    const safe = safePath(path);
    if (!safe) {
      return err('拒绝访问沙盒外的路径: ${path}');
    }
    try {
      await fs.writeFile(safePath(path), content, 'utf-8');
      return ok('已写入 ${path}, ${content.length} 字符');
    } catch (e: any) {
      return err('写入文件失败: ${e.message}');
    }
  },
};

export const listDir: Tool = {
  name: 'list_dir',
  description: '列出沙盒目录下的文件',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', default: '.' },
    },
  },
  execute: async ({ path = '.' }) => {
    const safe = safePath(path);
    if (!safe) {
      return err('拒绝访问沙盒外的路径: ${path}');
    }
    try {
      const items = await fs.readdir(safePath(path));
      return ok(items.join('\n') || '(空)');
    } catch (e: any) {
      return err('列出目录失败: ${e.message}');
    }
  }
};