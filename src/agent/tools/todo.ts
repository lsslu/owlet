import { z } from "zod";
import { defineTool } from "../tool";
import { ok, err } from "../tool";
import { Planner } from "../planner";

const planner = new Planner();

export const createPlan = defineTool({
  name: 'create_plan',
  description: '面对多步骤复杂任务时，先创建一个计划。会清空旧计划。',
  schema: z.object({
    tasks: z.array(z.string()).min(1).describe('任务列表，每项一句话'),
  }),
  execute: async ({ tasks }) => {
    const created = planner.createPlan(tasks);
    return ok(`计划已创建，${created.length} 个任务: \n${planner.formatForLLM()}`);
  }
});

export const updateTask = defineTool({
  name: 'update_task',
  description: '更新某个任务状态，开始执行时改 in_progress, 完成后改 done。',
  schema: z.object({
    id: z.number().int(),
    status: z.enum(['pending', 'in_progress', 'done', 'cancelled']),
  }),
  execute: async ({ id, status}) => {
    const task = planner.updateTask(id, status);
    if (!task) {
      return err(`任务 ${id} 不存在`);
    }
    return ok(`任务 ${id} → ${status}\n当前计划：\n${planner.formatForLLM()}`);
  }
});

export const getPlan = defineTool({
  name: 'get_plan',
  description: '查看当前计划状态',
  schema: z.object({}),
  execute: async () => {
    return ok(planner.formatForLLM());
  }
});