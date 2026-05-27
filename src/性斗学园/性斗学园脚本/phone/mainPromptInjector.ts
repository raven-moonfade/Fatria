import { backstreetService } from './backstreetService';

const INJECTION_MESSAGE_NAME = 'SYSTEM (后街记忆)';
const MAIN_EXTENSION_PROMPT_KEY = 'fatria_backstreet_main_bridge';
const MAIN_EXTENSION_PROMPT_POSITION = 1;
const MAIN_EXTENSION_PROMPT_DEPTH = 1;
const MAIN_EXTENSION_PROMPT_ROLE = 0;
const INTERNAL_PROMPT_MARKERS = ['后街单聊生成协议', '后街手机记忆检索规划器', '<backstreet>', '<phone_memory_query>'];
const MAIN_INJECTION_MARKER = '【本轮相关后街桥接记忆】';
const BLOCKED_WORLD_INFO_PATTERNS = [
  /\[?mvu_(?:plot|update)\]?/i,
  /正文格式|变量输出格式|变量更新格式|输出格式要求/i,
  /Force_Structured_Output|<UpdateVariable>|<parallel_events>/i,
  /COT/i,
];

function getHostWindow(): any {
  const current = window as any;
  try {
    if (current.parent && current.parent !== current && current.parent.document) return current.parent;
  } catch {
    // Cross-frame access can fail in stricter contexts; stay in the current frame.
  }
  return current;
}

function isInternalGeneration(): boolean {
  const localAny = window as any;
  const hostAny = getHostWindow();
  return Boolean(localAny.__fatriaBackstreetInternalGeneration || hostAny.__fatriaBackstreetInternalGeneration);
}

function setInstalledFlag(value: boolean): void {
  const localAny = window as any;
  const hostAny = getHostWindow();
  localAny.__fatriaBackstreetPromptInjectorInstalled = value;
  hostAny.__fatriaBackstreetPromptInjectorInstalled = value;
}

function isInstalled(): boolean {
  const localAny = window as any;
  const hostAny = getHostWindow();
  return Boolean(localAny.__fatriaBackstreetPromptInjectorInstalled || hostAny.__fatriaBackstreetPromptInjectorInstalled);
}

function getSillyTavernContext(): any {
  return getHostWindow().SillyTavern?.getContext?.();
}

function safeText(value: unknown): string {
  return String(value ?? '').trim();
}

function readPromptContent(source: Record<string, unknown>): string {
  const value = source.content ?? source.mes ?? source.text ?? source.prompt;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return safeText((item as Record<string, unknown>).text);
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  try {
    return JSON.stringify(source);
  } catch {
    return '';
  }
}

function isBlockedWorldInfoLike(source: Record<string, unknown>): boolean {
  const title = safeText(source.comment || source.name || source.title || source.identifier);
  const content = safeText(readPromptContent(source));
  return BLOCKED_WORLD_INFO_PATTERNS.some(pattern => pattern.test(title) || pattern.test(content));
}

function removeOldInjection(messages: any[]): any[] {
  return messages.filter(message => message?.name !== INJECTION_MESSAGE_NAME);
}

function removeMainInjection(messages: any[]): any[] {
  return messages.filter(
    message => message?.name !== INJECTION_MESSAGE_NAME && !safeText(message?.content).includes(MAIN_INJECTION_MARKER),
  );
}

function hasMainInjection(messages: any[]): boolean {
  return messages.some(message => safeText(message?.content).includes(MAIN_INJECTION_MARKER));
}

function isNonMainGenerationPrompt(messages: any[]): boolean {
  const combined = messages.map(message => safeText(message?.content)).join('\n');
  return (
    INTERNAL_PROMPT_MARKERS.some(marker => combined.includes(marker)) ||
    /<UpdateVariable>|<tableEdit>|<JSONPatch>|当前表格数据|填表任务/i.test(combined)
  );
}

function filterBackstreetInternalPrompt(messages: any[]): any[] {
  return messages.filter(message => {
    if (!message || typeof message !== 'object') return true;
    return !isBlockedWorldInfoLike(message as Record<string, unknown>);
  });
}

function filterBackstreetWorldInfoEntries(entries: any[]): void {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry && typeof entry === 'object' && isBlockedWorldInfoLike(entry as Record<string, unknown>)) {
      entries.splice(index, 1);
    }
  }
}

function addInjection(messages: any[], content: string): any[] {
  const cleaned = removeOldInjection(messages);
  if (!content.trim()) return cleaned;
  return [
    {
      role: 'system',
      content,
      name: INJECTION_MESSAGE_NAME,
      isPhoneMessage: true,
    },
    ...cleaned,
  ];
}

function replaceArrayContents(target: any[], next: any[]): void {
  target.splice(0, target.length, ...next);
}

function isPromptMessagesArray(value: unknown): value is any[] {
  return (
    Array.isArray(value) &&
    value.some(item => {
      if (!item || typeof item !== 'object') return false;
      const source = item as Record<string, unknown>;
      return 'content' in source || 'mes' in source || 'text' in source;
    })
  );
}

function collectPromptMessageArrays(source: unknown, result: any[][] = [], seen = new Set<object>()): any[][] {
  if (!source || typeof source !== 'object') return result;
  if (seen.has(source)) return result;
  seen.add(source);

  if (isPromptMessagesArray(source)) {
    result.push(source);
    return result;
  }

  if (Array.isArray(source)) {
    for (const item of source) collectPromptMessageArrays(item, result, seen);
    return result;
  }

  const record = source as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (!/chat|message|prompt|request|body|data/i.test(key)) continue;
    collectPromptMessageArrays(value, result, seen);
  }
  return result;
}

function getCurrentChatMessages(context: any): any[] {
  return Array.isArray(context?.chat) ? context.chat : [];
}

function setMainExtensionPrompt(content: string, context = getSillyTavernContext()): void {
  if (typeof context?.setExtensionPrompt !== 'function') return;
  context.setExtensionPrompt(
    MAIN_EXTENSION_PROMPT_KEY,
    content,
    MAIN_EXTENSION_PROMPT_POSITION,
    MAIN_EXTENSION_PROMPT_DEPTH,
    false,
    MAIN_EXTENSION_PROMPT_ROLE,
  );
}

async function refreshMainExtensionPrompt(messages?: any[]): Promise<string> {
  const context = getSillyTavernContext();
  if (isInternalGeneration()) {
    setMainExtensionPrompt('', context);
    return '';
  }

  try {
    const sourceMessages = messages?.length ? messages : getCurrentChatMessages(context);
    const injection = await backstreetService.buildMainChatInjection(sourceMessages);
    setMainExtensionPrompt(injection, context);
    return injection;
  } catch (error) {
    console.warn('[后街] 主线扩展提示词刷新失败:', error);
    setMainExtensionPrompt('', context);
    return '';
  }
}

async function injectIntoPrompt(messages: any[]): Promise<any[]> {
  if (isInternalGeneration()) return filterBackstreetInternalPrompt(messages);
  if (isNonMainGenerationPrompt(messages)) {
    setMainExtensionPrompt('');
    return removeMainInjection(messages);
  }

  try {
    if (hasMainInjection(messages)) return removeOldInjection(messages);
    const injection = await refreshMainExtensionPrompt(messages);
    return addInjection(messages, injection);
  } catch (error) {
    console.warn('[后街] 主线提示词注入失败:', error);
    return removeOldInjection(messages);
  }
}

function handlePromptReady(messages: any[]): any[] | Promise<any[]> {
  if (isInternalGeneration()) return filterBackstreetInternalPrompt(messages);
  return injectIntoPrompt(messages);
}

async function injectIntoPromptEventData(eventData: any): Promise<boolean> {
  if (isPromptMessagesArray(eventData)) {
    replaceArrayContents(eventData, await injectIntoPrompt(eventData));
    return true;
  }

  const promptArrays = collectPromptMessageArrays(eventData);
  for (const promptArray of promptArrays) {
    replaceArrayContents(promptArray, await injectIntoPrompt(promptArray));
  }
  return promptArrays.length > 0;
}

async function refreshExtensionPromptFromEventData(eventData: any): Promise<void> {
  const promptArrays = collectPromptMessageArrays(eventData);
  await refreshMainExtensionPrompt(promptArrays[0]);
}

export function installBackstreetMainPromptInjector(): void {
  const globalAny = getHostWindow();
  if (isInstalled()) return;
  setInstalledFlag(true);
  let registeredPromptHook = false;

  if (globalAny.hooks && typeof globalAny.hooks.addFilter === 'function') {
    globalAny.hooks.addFilter('chat_completion_prompt_ready', (chat: any[]) => {
      if (!Array.isArray(chat)) return chat;
      return handlePromptReady(chat);
    });
    registeredPromptHook = true;
    console.info('[后街] 已通过 hooks 注册主线记忆动态注入');
  }

  const context = getSillyTavernContext();
  if (context?.eventSource && context?.event_types?.GENERATE_BEFORE_COMBINE_PROMPTS) {
    context.eventSource.on(context.event_types.GENERATE_BEFORE_COMBINE_PROMPTS, refreshExtensionPromptFromEventData);
    registeredPromptHook = true;
    console.info('[后街] 已通过 setExtensionPrompt 注册主线桥接记忆注入');
  }

  if (context?.eventSource && context?.event_types?.CHAT_COMPLETION_PROMPT_READY) {
    context.eventSource.on(context.event_types.CHAT_COMPLETION_PROMPT_READY, async (eventData: any) => {
      await injectIntoPromptEventData(eventData);
    });
    registeredPromptHook = true;
    console.info('[后街] 已通过 eventSource 注册主线记忆动态注入');
  }

  if (typeof globalAny.eventOn === 'function' && globalAny.tavern_events?.WORLD_INFO_ACTIVATED) {
    globalAny.eventOn(globalAny.tavern_events.WORLD_INFO_ACTIVATED, (entries: any[]) => {
      if (isInternalGeneration() && Array.isArray(entries)) {
        filterBackstreetWorldInfoEntries(entries);
      }
    });
    console.info('[后街] 已注册后街内部生成世界书格式条目过滤');
  } else if (context?.eventSource && context?.event_types?.WORLD_INFO_ACTIVATED) {
    context.eventSource.on(context.event_types.WORLD_INFO_ACTIVATED, (entries: any[]) => {
      if (isInternalGeneration() && Array.isArray(entries)) {
        filterBackstreetWorldInfoEntries(entries);
      }
    });
    console.info('[后街] 已通过 eventSource 注册后街内部生成世界书格式条目过滤');
  }

  if (!registeredPromptHook) {
    setInstalledFlag(false);
    console.warn('[后街] 暂未找到可用的主线生成前 hook');
  }
}
