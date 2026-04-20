import 'dotenv/config';

async function main() {
  const res = await fetch(`${process.env.DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: '用一句话自我介绍' }],
    }),
  });
  if (!res.ok) {
    console.error('HTTP', res.status, await res.text());
    return;
  }
  
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));   // 先打印完整 JSON
  console.log('---');
  console.log(data.choices[0].message.content); // 再提取文本
}

main();