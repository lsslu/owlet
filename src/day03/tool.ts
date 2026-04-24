import { promises as fs } from 'node:fs';
import { resolve, relative } from 'node:path';
import type { Tool } from '../shared/llm';
import { describe } from 'node:test';

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
  execute: async ({ path }) => fs.readFile(safePath(path), 'utf-8'),
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
    await fs.writeFile(safePath(path), content, 'utf-8');
    return '已写入 ${path}, ${content.length} 字符';
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
    const items = await fs.readdir(safePath(path));
    return items.join('\n') || '(空)';
  }
};