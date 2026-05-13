import { z } from "zod";
import { defineTool } from "../tool";
import { ok, err } from "../tool";
import { Memory } from "../memory";

const memory = new Memory();

export const memorySave = defineTool({
  name: 'memory_save',
  description: '把重要信息存入长期记忆（跨 session 持久）。适用于：用户偏好、关键事实、决策结论。',
  schema: z.object({
    content: z.string().describe('要记住的内容，写成完整的一句话，越具体越好'),
  }),
  execute: async ({ content }) => {
    try {
      const id = await memory.save(content);
      return ok(`已记住（id=${id}）: ${content}`);
    } catch(e: any) {
      return err(`保存失败：${e.message}`);
    }
  }
});

export const memorySearch = defineTool({
  name: 'memory_search',
  description: '从长期记忆中搜索相关信息',
  schema: z.object({
    query: z.string().describe('搜索关键词或问题'),
    k: z.number().int().min(1).max(10).default(3),
  }),
  execute: async ({ query, k }) => {
    try {
      const results = await memory.search(query, k);
      if (results.length === 0) {
        return ok('（无相关记忆）');
      }
      return ok(results.map(r => `[id=${r.id}, 距离=${r.distance.toFixed(3)}]${r.content}`).join('\n'));
    } catch(e: any) {
      return err(`搜索失败：${e.message}`);
    }
  }
});