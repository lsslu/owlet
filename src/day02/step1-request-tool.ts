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
];

async function main() {
  const res = await fetch(`${process.env.DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: '上海今天天气怎么样？'}],
      tools,
    }),
  });

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main();