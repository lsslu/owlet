import { defineTool, ok } from "../tool";
import z from "zod";

export const currentTime = defineTool({
  name: 'current_time',
  description: '获取当前时间，格式为 ISO 8601',
  schema: z.object({}),
  execute: async () => ok(new Date().toISOString()),
});