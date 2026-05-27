import { safeString } from './text';
import { generateWithSecondaryPhoneApi, getSecondaryPhoneApiStatus } from './phoneApiSettings';

interface RawMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

interface GenerateRawResult {
  text: string;
}

interface GenerateRawOptions {
  maxTokens?: number;
}

function getHostWindow(): any {
  const current = window as any;
  try {
    if (current.parent && current.parent !== current && current.parent.document) return current.parent;
  } catch {
    // Cross-frame access can fail in stricter contexts; stay in the current frame.
  }
  return current;
}

function getSillyTavernContext(): any {
  const globalAny = getHostWindow();
  if (typeof globalAny.SillyTavern?.getContext === 'function') {
    return globalAny.SillyTavern.getContext();
  }
  if (typeof (globalThis as any).SillyTavern?.getContext === 'function') {
    return (globalThis as any).SillyTavern.getContext();
  }
  return null;
}

function getGenerateRawFunction(context: any): ((config: Record<string, unknown>) => Promise<unknown>) | null {
  const globalAny = getHostWindow();
  if (typeof globalAny.generateRaw === 'function') return globalAny.generateRaw.bind(globalAny);
  if (typeof (globalThis as any).generateRaw === 'function') return (globalThis as any).generateRaw.bind(globalThis);
  if (typeof context?.generateRaw === 'function') return context.generateRaw.bind(context);
  return null;
}

function extractGeneratedText(result: unknown): string {
  if (typeof result === 'string') return result;
  if (!result || typeof result !== 'object') return '';
  const source = result as Record<string, any>;
  return safeString(
    source.choices?.[0]?.message?.content ||
      source.results?.[0]?.text ||
      source.text ||
      source.content ||
      source.body?.text ||
      source.message,
  );
}

export class PhoneApiManager {
  async generateRaw(messages: RawMessage[], options: GenerateRawOptions = {}): Promise<GenerateRawResult> {
    const secondaryApiStatus = getSecondaryPhoneApiStatus();
    if (secondaryApiStatus.ready) {
      console.info(`[后街] 使用第二 API 生成：${secondaryApiStatus.settings.model}`);
      const text = (await generateWithSecondaryPhoneApi(messages, options, secondaryApiStatus.settings))
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/^[\s\S]*?<\/think>/i, '')
        .trim();
      if (!text) throw new Error('第二 API 返回为空');
      return { text };
    }
    console.info(`[后街] 使用酒馆原 API 生成：${secondaryApiStatus.reason}`, {
      enabled: secondaryApiStatus.settings.enabled,
      hasBaseUrl: Boolean(secondaryApiStatus.settings.baseUrl),
      model: secondaryApiStatus.settings.model || '',
    });

    const context = getSillyTavernContext();
    const generateRaw = getGenerateRawFunction(context);
    if (!generateRaw) {
      throw new Error('当前酒馆环境不支持 generateRaw');
    }

    const localAny = window as any;
    const hostAny = getHostWindow();
    const previousLocalFlag = localAny.__fatriaBackstreetInternalGeneration;
    const previousHostFlag = hostAny.__fatriaBackstreetInternalGeneration;
    localAny.__fatriaBackstreetInternalGeneration = true;
    hostAny.__fatriaBackstreetInternalGeneration = true;

    try {
      const userInput = messages.findLast(message => message.role === 'user')?.content || '';
      const rolePrompts = messages.filter(message => message.role !== 'user');
      const maxTokens = Math.max(200000, Number(options.maxTokens || 0));
      const result = await generateRaw({
        user_input: userInput,
        should_stream: false,
        should_silence: true,
        max_chat_history: 0,
        ordered_prompts: [...rolePrompts, 'user_input'],
        custom_api: {
          max_tokens: maxTokens,
        },
      });

      const text = extractGeneratedText(result)
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/^[\s\S]*?<\/think>/i, '')
        .trim();
      if (!text) throw new Error('generateRaw 返回为空');
      return { text };
    } finally {
      localAny.__fatriaBackstreetInternalGeneration = previousLocalFlag;
      hostAny.__fatriaBackstreetInternalGeneration = previousHostFlag;
    }
  }
}

export const phoneApiManager = new PhoneApiManager();
