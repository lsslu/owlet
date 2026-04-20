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
      messages: [{ role: 'user', content: '写一首关于程序员的四行打油诗' }],
      stream: true,
    }),
  });

  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';  
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || ''; // 最后一个可能不完整，保留在 buffer 中

    for (const chunk of chunks) {
      const line = chunk.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload == '[DONE]') {
        return;
      }
      const json = JSON.parse(payload);
      const delta = json.choices[0]?.delta?.content;
      if (delta) {
        process.stdout.write(delta);
      }
    }
    
  }
  process.stdout.write('\n');
}

main();