export function safeString(value: unknown): string {
  return String(value ?? '').trim();
}

export function normalizeName(value: string): string {
  return safeString(value).replace(/[·・‧\s]/g, '');
}

export function uniqueStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = safeString(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

export function clipText(text: string, maxLength: number): string {
  const value = safeString(text);
  const limit = Math.max(0, Math.floor(Number(maxLength) || 0));
  if (!limit || value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 1))}…`;
}

export function stripHtmlTags(text: string): string {
  return safeString(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function safeStorageSegment(value: string): string {
  return safeString(value)
    .replace(/[^\w\u4e00-\u9fa5.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

export function getMessageText(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const source = message as Record<string, unknown>;
  const content = source.content ?? source.mes ?? source.text;
  if (typeof content === 'string') return stripHtmlTags(content);
  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return safeString((item as Record<string, unknown>).text);
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

export function formatMessagesForPrompt(
  messages: { sender: string; date?: string; time: string; text: string }[],
  maxItems = 30,
): string {
  return messages
    .slice(-maxItems)
    .map(message => {
      const speaker = message.sender === 'user' ? '<user>' : message.sender === 'contact' ? '对方' : '系统';
      const timestamp = [message.date, message.time || '--:--'].filter(Boolean).join(' ');
      return `[${timestamp || '--:--'}] ${speaker}: ${message.text}`;
    })
    .join('\n');
}
