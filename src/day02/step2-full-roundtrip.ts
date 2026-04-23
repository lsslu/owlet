import 'dotenv/config';

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '获取指定城市的天气',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名',
          },
        },
        requeired: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_address',
      description: '获取指定人的地址',
      parameters: {
        required: ['name'],
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: '人名',
          },
        },
      }
    },
  }
];

function getWeather(city: string) {
  console.log('[tool] getWeather called with city:', city);
  return `现在${city}的天气是：晴，25度。`;
}

function getAddress(name: string) {
  console.log('[tool] getAddress called with name:', name);
  return `现在${name}的地址是：北京市朝阳区。`;
}

async function chat(messages: any[]) {
  const res = await fetch(`${process.env.DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      tools,
    }),
  });

  console.log(res);

  return (await res.json()).choices[0].message;
}

async function main() {
  const messages: any[] = [
    { role: 'user', content: '老陈住哪里？' },
  ];

  const reply1 = await chat(messages);
  console.log('=====round 1=====');
  console.log(JSON.stringify(reply1, null, 2));

  messages.push(reply1);

  for (const toolCall of reply1.tool_calls ?? []) {
    const args = JSON.parse(toolCall.function.arguments);
    let result;

    if (toolCall.function.name == 'get_weather') {
      console.log('Calling getWeather with args:', args);
      result = getWeather(args.city);
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      });
    }
    else if (toolCall.function.name == 'get_address') {
      console.log('Calling getAddress with args:', args);
      result = getAddress(args.name);
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  console.log('Messages after tool call:', JSON.stringify(messages, null, 2));

  const reply2 = await chat(messages);
  console.log('=====round 2=====');
  console.log(JSON.stringify(reply2, null, 2));
  console.log('=====final answer=====');
  console.log(reply2.content);
}

main();