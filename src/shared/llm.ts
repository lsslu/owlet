import { config } from "./config";

export interface Tool {
  name: string;
  description: string;
  parameters: object;
  execute: (args: any) => Promise<string> | string;
}

function toOpenAITools(tools: Tool[]) {
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  }));
}

export async function callLLM(messages: any[], tools: Tool[]) {
  const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      tools: tools.length ? toOpenAITools(tools) : undefined,
    }),
  });

  if (!res.ok) throw new Error(`LLM call failed: ${res.status} ${res.statusText}`);

  return (await res.json()).choices[0].message;
}