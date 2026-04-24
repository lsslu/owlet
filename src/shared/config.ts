import 'dotenv/config';
import { ProxyAgent, Agent, setGlobalDispatcher } from 'undici';

const provider = process.env.LLM_PROVIDER || 'deepseek';
const proxy = process.env.HTTP_PROXY;

if (proxy && provider !== 'deepseek') {
  setGlobalDispatcher(new ProxyAgent(proxy));
} else {
  setGlobalDispatcher(new Agent());
}

const upper = provider.toUpperCase();

export const config = {
  provider,
  baseUrl: process.env[`${upper}_BASE_URL`]!,
  apiKey: process.env[`${upper}_API_KEY`]!,
  model: {
    deepseek: 'deepseek-v4-flash',
    openai: 'gpt-3.5-turbo',
  }[provider]!,
};