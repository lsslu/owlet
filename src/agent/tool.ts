import { z, type ZodType } from 'zod';

export interface Tool<I = any, O = string> {
  name: string;
  description: string;
  schema: ZodType<I>;
  execute: (input: I, ctx: ToolContext ) => Promise<Result<O>>;
}

export interface ToolContext {
  signal?: AbortSignal;
}

export function defineTool<I, O = string>(t: Tool<I, O>): Tool<I, O> {
  return t;
}

export function toOpenAIFormat(tools: Tool[]) {
  return tools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: z.toJSONSchema(t.schema, { target: 'draft-2020-12' }),
    }
  }));
}

export async function runTool<I, O>(
  tool: Tool<I, O>,
  rawArgs: unknown,
  ctx: ToolContext
) {
  const parsed = tool.schema.safeParse(rawArgs);
  if (!parsed.success) {
    return err(`参数校验失败: ${parsed.error}`);
  }
  return tool.execute(parsed.data, ctx);
}

export type Result<T> = 
| { ok: true, value: T }
| { ok: false, error: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = (error: string): Result<never> => ({ ok: false, error });