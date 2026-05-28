import type {
  BackstreetBridgeMemory,
  BackstreetBridgeMemoryItem,
  BackstreetContact,
  BackstreetCoreMemory,
  BackstreetMessage,
  BackstreetThreadData,
  PhoneMemoryHit,
  PhoneMemoryQuery,
  WorldbookEntry,
} from './types';
import { worldbookClient } from './worldbookClient';
import { clipText, normalizeName, safeString, uniqueStrings } from './text';
import { parseJsonBlock } from './xmlToolCall';

const META_ENTRY = '[PHONE_META]';
const MAX_HEAD_MESSAGES = 80;

interface PhoneMetaData {
  version: number;
  contacts: Record<string, { name: string; lastMessage: string; lastTime: string; updatedAt: number }>;
  archiveCounters: Record<string, number>;
}

function getThreadEntryName(contact: string): string {
  return `[BACKSTREET_THREAD::${contact}::HEAD]`;
}

function getArchiveEntryName(contact: string, index: number): string {
  return `[BACKSTREET_ARCHIVE::${contact}::${String(index).padStart(4, '0')}]`;
}

function getCoreMemoryEntryName(contact: string): string {
  return `[BACKSTREET_MEMORY::${contact}::CORE]`;
}

function getBridgeMemoryEntryName(contact: string): string {
  return `[BACKSTREET_BRIDGE::${contact}::MAIN]`;
}

function wrapJson(tag: string, value: unknown): string {
  return `<${tag}>\n${JSON.stringify(value, null, 2)}\n</${tag}>`;
}

function parseWrappedJson<T>(content: string, tag: string): T | null {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = safeString(content).match(pattern);
  return parseJsonBlock<T>(match?.[1] || content);
}

function createEmptyMeta(): PhoneMetaData {
  return { version: 1, contacts: {}, archiveCounters: {} };
}

function normalizeThread(contact: string, value: Partial<BackstreetThreadData> | null): BackstreetThreadData {
  return {
    contact,
    updatedAt: Number(value?.updatedAt || Date.now()),
    messages: Array.isArray(value?.messages) ? value.messages : [],
  };
}

function normalizeStringArray(value: unknown, maxItems = 12): string[] {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(value.map(item => safeString(item)).filter(Boolean)).slice(0, maxItems);
}

function collectShortBridgeKeywordCandidates(values: unknown[], fallbackText = ''): string[] {
  const candidates: string[] = [];
  const sources = [...values.map(value => safeString(value)), fallbackText].filter(Boolean);

  for (const source of sources) {
    const chineseRuns = source.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    for (const run of chineseRuns) {
      const segments = run.split(/[的了着过和与及或并也都就又再很更最在对把被将从到中里内]/).filter(Boolean);
      for (const segment of segments.length ? segments : [run]) {
        if (segment.length >= 2 && segment.length <= 3) {
          candidates.push(segment);
          continue;
        }
        for (let i = 0; i < segment.length - 1; i += 1) {
          candidates.push(segment.slice(i, i + 2));
        }
        for (let i = 0; i < segment.length - 2; i += 1) {
          candidates.push(segment.slice(i, i + 3));
        }
      }
    }

    const asciiRuns = source.match(/[A-Za-z0-9_-]{2,24}/g) || [];
    candidates.push(...asciiRuns);
  }

  return candidates;
}

function normalizeBridgeKeywords(value: unknown, maxItems = 8, fallbackText = ''): string[] {
  const blocked = new Set(['苏菲', '玩家', '后街', '私聊', '记忆', '总结', '对方', '这个', '那个', '什么']);
  const rawValues = Array.isArray(value) ? value : [];
  return uniqueStrings(collectShortBridgeKeywordCandidates(rawValues, fallbackText))
    .filter(keyword => keyword.length >= 2 && !blocked.has(keyword) && !/^\d+$/.test(keyword))
    .slice(0, maxItems);
}

function normalizeBridgeItem(value: Partial<BackstreetBridgeMemoryItem>, fallbackUpdatedAt: number): BackstreetBridgeMemoryItem | null {
  const text = safeString(value.text);
  if (!text) return null;
  const keywords = normalizeBridgeKeywords(value.keywords, 8, text);
  return {
    text,
    keywords,
    updatedAt: Number(value.updatedAt || fallbackUpdatedAt || Date.now()),
  };
}

function mergeBridgeItems(items: BackstreetBridgeMemoryItem[]): BackstreetBridgeMemoryItem[] {
  const byText = new Map<string, BackstreetBridgeMemoryItem>();
  for (const item of items) {
    const normalizedText = normalizeName(item.text);
    if (!normalizedText) continue;
    const existing = byText.get(normalizedText);
    if (!existing || item.updatedAt >= existing.updatedAt) {
      byText.set(normalizedText, item);
    }
  }
  return Array.from(byText.values()).sort((left, right) => left.updatedAt - right.updatedAt);
}

function fallbackBridgeItemFromMemory(memory: Partial<BackstreetBridgeMemory>, updatedAt: number): BackstreetBridgeMemoryItem | null {
  const text = [safeString(memory.summary), ...normalizeStringArray(memory.facts, 16), ...normalizeStringArray(memory.openLoops, 10)]
    .filter(Boolean)
    .join('\n');
  return normalizeBridgeItem({ text, keywords: normalizeStringArray(memory.keywords, 30), updatedAt }, updatedAt);
}

function normalizeCoreMemory(contact: string, value: Partial<BackstreetCoreMemory> | null): BackstreetCoreMemory | null {
  if (!value) return null;
  return {
    contact,
    updatedAt: Number(value.updatedAt || Date.now()),
    summary: safeString(value.summary),
    relationship: safeString(value.relationship),
    knownFacts: normalizeStringArray(value.knownFacts, 16),
    openLoops: normalizeStringArray(value.openLoops, 10),
    recentTone: safeString(value.recentTone),
    keywords: uniqueStrings([contact, ...normalizeStringArray(value.keywords, 30)]),
  };
}

function normalizeBridgeMemory(contact: string, value: Partial<BackstreetBridgeMemory> | null): BackstreetBridgeMemory | null {
  if (!value) return null;
  const updatedAt = Number(value.updatedAt || Date.now());
  const explicitItems = Array.isArray(value.items)
    ? value.items
        .map(item => normalizeBridgeItem(item, updatedAt))
        .filter((item): item is BackstreetBridgeMemoryItem => !!item)
    : [];
  const fallbackItem = explicitItems.length === 0 ? fallbackBridgeItemFromMemory(value, updatedAt) : null;
  const items = mergeBridgeItems([...explicitItems, ...(fallbackItem ? [fallbackItem] : [])]);
  return {
    contact,
    updatedAt,
    summary: safeString(value.summary),
    facts: normalizeStringArray(value.facts, 16),
    openLoops: normalizeStringArray(value.openLoops, 10),
    keywords: uniqueStrings([contact, ...normalizeBridgeKeywords(value.keywords, 16, safeString(value.summary)), ...items.flatMap(item => item.keywords)]),
    items,
  };
}

function formatCoreMemory(memory: Partial<BackstreetCoreMemory>): string {
  const lines = [
    safeString(memory.summary) ? `长期摘要：${safeString(memory.summary)}` : '',
    safeString(memory.relationship) ? `关系状态：${safeString(memory.relationship)}` : '',
    safeString(memory.recentTone) ? `最近语气：${safeString(memory.recentTone)}` : '',
  ].filter(Boolean);
  const knownFacts = normalizeStringArray(memory.knownFacts, 12);
  const openLoops = normalizeStringArray(memory.openLoops, 8);
  if (knownFacts.length) lines.push(`已知事实：${knownFacts.join('；')}`);
  if (openLoops.length) lines.push(`未了事项：${openLoops.join('；')}`);
  return lines.join('\n');
}

function formatBridgeMemory(memory: Partial<BackstreetBridgeMemory>): string {
  const lines = [safeString(memory.summary) ? `正文可消化摘要：${safeString(memory.summary)}` : ''].filter(Boolean);
  const items = Array.isArray(memory.items)
    ? memory.items
        .map(item => normalizeBridgeItem(item, Number(memory.updatedAt || Date.now())))
        .filter((item): item is BackstreetBridgeMemoryItem => !!item)
    : [];
  const facts = normalizeStringArray(memory.facts, 12);
  const openLoops = normalizeStringArray(memory.openLoops, 8);
  if (items.length) {
    lines.push(
      `桥接总结：\n${items
        .map(item => `- 关键词：${item.keywords.join('、') || '无'}\n  ${item.text}`)
        .join('\n')}`,
    );
  }
  if (facts.length) lines.push(`可回灌事实：${facts.join('；')}`);
  if (openLoops.length) lines.push(`正文可承接事项：${openLoops.join('；')}`);
  return lines.join('\n');
}

function parseBridgeTemplateMemory(contact: string, content: string): BackstreetBridgeMemory | null {
  const text = safeString(content);
  if (!text.includes('【后街私聊记忆：')) return null;

  const hitDefinitions = new Map<string, string[]>();
  const hitPattern = /var\s+(bstBridgeHit\d+)\s*=\s*matchChatMessages\((\[[\s\S]*?\])\);/g;
  let hitMatch: RegExpExecArray | null;
  while ((hitMatch = hitPattern.exec(text))) {
    const keywords = parseJsonBlock<string[]>(hitMatch[2]) || [];
    hitDefinitions.set(hitMatch[1], normalizeStringArray(keywords, 24));
  }

  const items: BackstreetBridgeMemoryItem[] = [];
  for (const [hitName, keywords] of hitDefinitions.entries()) {
    const hitIndex = safeString(hitName.match(/\d+$/)?.[0]);
    const itemPattern = new RegExp(
      `<%_\\s*if\\s*\\(\\s*(?:${hitName}|bstBridgeShouldShow\\(\\s*${hitIndex}\\s*\\))\\s*\\)\\s*\\{\\s*_%>\\s*([\\s\\S]*?)\\s*<%_\\s*\\}\\s*_%>`,
      'm',
    );
    const itemMatch = text.match(itemPattern);
    const item = normalizeBridgeItem({ text: itemMatch?.[1] || '', keywords }, Date.now());
    if (item) items.push(item);
  }

  if (items.length === 0) return null;
  return {
    contact,
    updatedAt: Math.max(...items.map(item => item.updatedAt)),
    summary: items.map(item => item.text).join('\n'),
    facts: [],
    openLoops: [],
    keywords: uniqueStrings([contact, ...items.flatMap(item => item.keywords)]),
    items: mergeBridgeItems(items),
  };
}

function escapeEjsLiteralText(text: string): string {
  return safeString(text).replace(/<%/g, '&lt;%').replace(/%>/g, '%&gt;');
}

function renderBridgeMemory(memory: BackstreetBridgeMemory): string {
  const contact = safeString(memory.contact);
  const items = mergeBridgeItems(memory.items || []).filter(item => item.keywords.length > 0);
  if (items.length === 0) return '';

  const hitDefinitions = items
    .map((item, index) => `  var bstBridgeHit${index} = matchChatMessages(${JSON.stringify(item.keywords)});`)
    .join('\n');
  const hitArray = `[${items.map((_, index) => `bstBridgeHit${index}`).join(', ')}]`;
  const itemBlocks = items
    .map(
      (item, index) => `<%_ if (bstBridgeShouldShow(${index})) { _%>
${escapeEjsLiteralText(item.text)}
<%_ } _%>`,
    )
    .join('\n\n');

  return `<%_
var bstPresent = getvar('stat_data.关系系统.在场人物') || [];
var bstNorm = function(value) {
  return String(value || '').replace(/[·・‧•\\s\\u3000._\\-—]/g, '');
};
var bstPresentText = Array.isArray(bstPresent) ? bstPresent.join('|') : String(bstPresent || '');
var bstIsHere = bstNorm(bstPresentText).includes(bstNorm(${JSON.stringify(contact)}));
if (bstIsHere) {
${hitDefinitions}
  var bstBridgeHits = ${hitArray};
  var bstBridgeShouldShow = function(index) {
    var start = Math.max(0, index - 2);
    var end = Math.min(bstBridgeHits.length - 1, index + 2);
    for (var i = start; i <= end; i += 1) {
      if (bstBridgeHits[i]) return true;
    }
    return false;
  };
  var bstBridgeAnyHit = false;
  for (var j = 0; j < bstBridgeHits.length; j += 1) {
    if (bstBridgeHits[j]) {
      bstBridgeAnyHit = true;
      break;
    }
  }
  if (bstBridgeAnyHit) {
_%>
【后街私聊记忆：${contact}】

${itemBlocks}
<%_
  }
}
_%>`;
}

function scorePhoneEntry(entry: WorldbookEntry, query: PhoneMemoryQuery): number {
  const title = safeString(entry.comment);
  const content = safeString(entry.content);
  const joined = `${title}\n${content}`;
  if (!joined) return 0;

  let score = 0;
  for (const character of query.characters) {
    const normalizedCharacter = normalizeName(character);
    if (normalizeName(title).includes(normalizedCharacter)) score += 60;
    if (normalizeName(content).includes(normalizedCharacter)) score += 20;
  }
  for (const keyword of query.keywords) {
    if (keyword && normalizeName(joined).includes(normalizeName(keyword))) score += 10;
  }
  for (const location of query.locations) {
    if (location && normalizeName(joined).includes(normalizeName(location))) score += 8;
  }
  if (/BACKSTREET_MEMORY/.test(title)) score += 8;
  if (/BACKSTREET_BRIDGE/.test(title)) score += 14;
  if (/BACKSTREET_THREAD/.test(title)) score += 4;
  return score;
}

function entryToMemoryHit(entry: WorldbookEntry, score: number): PhoneMemoryHit {
  const title = safeString(entry.comment) || '后街记忆';
  const rawContent = safeString(entry.content);
  const contact = title.match(/BACKSTREET_(?:THREAD|ARCHIVE|MEMORY|BRIDGE)::(.+?)::/)?.[1];
  const memory = parseWrappedJson<BackstreetCoreMemory>(rawContent, 'backstreet_memory');
  const bridge =
    parseWrappedJson<BackstreetBridgeMemory>(rawContent, 'backstreet_bridge') ||
    parseBridgeTemplateMemory(contact || '', rawContent);
  const thread =
    parseWrappedJson<{ messages?: BackstreetMessage[] }>(rawContent, 'backstreet_thread') ||
    parseWrappedJson<{ messages?: BackstreetMessage[] }>(rawContent, 'backstreet_archive');
  const messageLines = Array.isArray(thread?.messages)
    ? thread.messages
        .slice(-12)
        .map(message => `${message.time || '--:--'} ${message.sender === 'user' ? '玩家' : contact || '对方'}: ${message.text}`)
        .join('\n')
    : '';
  const readableContent = formatBridgeMemory(bridge || {}) || formatCoreMemory(memory || {}) || messageLines || rawContent;

  return {
    title,
    contact,
    source: '后街手机世界书',
    score,
    content: clipText(readableContent, 900),
  };
}

export class BackstreetWorldbookStore {
  private get worldName(): string {
    return worldbookClient.getPhoneWorldbookName();
  }

  async ensureReady(): Promise<void> {
    await worldbookClient.ensureWorldbook(this.worldName);
  }

  async hasAnyMemory(): Promise<boolean> {
    const entries = await worldbookClient.listEntries(this.worldName, { includeDisabled: true }).catch(() => []);
    return entries.some(entry => /^(\[BACKSTREET_|BACKSTREET_|\[PHONE_META\])/.test(safeString(entry.comment)));
  }

  async getMeta(): Promise<PhoneMetaData> {
    const entry = await worldbookClient.getEntry(this.worldName, META_ENTRY);
    return parseWrappedJson<PhoneMetaData>(safeString(entry?.content), 'phone_meta') || createEmptyMeta();
  }

  async saveMeta(meta: PhoneMetaData): Promise<void> {
    await worldbookClient.upsertEntry(this.worldName, META_ENTRY, wrapJson('phone_meta', meta), false);
  }

  async getThread(contact: string, options: { force?: boolean } = {}): Promise<BackstreetThreadData> {
    const entry = await worldbookClient.getEntry(this.worldName, getThreadEntryName(contact), options);
    return normalizeThread(contact, parseWrappedJson<BackstreetThreadData>(safeString(entry?.content), 'backstreet_thread'));
  }

  async getCoreMemory(contact: string, options: { force?: boolean } = {}): Promise<BackstreetCoreMemory | null> {
    const entry = await worldbookClient.getEntry(this.worldName, getCoreMemoryEntryName(contact), options);
    return normalizeCoreMemory(contact, parseWrappedJson<BackstreetCoreMemory>(safeString(entry?.content), 'backstreet_memory'));
  }

  async getBridgeMemory(contact: string, options: { force?: boolean } = {}): Promise<BackstreetBridgeMemory | null> {
    const entry = await worldbookClient.getEntry(this.worldName, getBridgeMemoryEntryName(contact), options);
    const content = safeString(entry?.content);
    return normalizeBridgeMemory(
      contact,
      parseWrappedJson<BackstreetBridgeMemory>(content, 'backstreet_bridge') || parseBridgeTemplateMemory(contact, content),
    );
  }

  async saveThread(thread: BackstreetThreadData): Promise<void> {
    await worldbookClient.upsertEntry(
      this.worldName,
      getThreadEntryName(thread.contact),
      wrapJson('backstreet_thread', thread),
      false,
    );
  }

  async saveCoreMemory(memory: BackstreetCoreMemory): Promise<void> {
    const normalized = normalizeCoreMemory(memory.contact, memory);
    if (!normalized) return;
    await worldbookClient.upsertEntry(
      this.worldName,
      getCoreMemoryEntryName(memory.contact),
      wrapJson('backstreet_memory', normalized),
      false,
    );
    await worldbookClient.refreshWorldbookEditor(this.worldName);
  }

  async saveBridgeMemory(memory: BackstreetBridgeMemory): Promise<void> {
    const normalized = normalizeBridgeMemory(memory.contact, memory);
    if (!normalized || normalized.items.length === 0) return;
    const content = renderBridgeMemory(normalized);
    if (!content) return;
    await worldbookClient.upsertEntry(
      this.worldName,
      getBridgeMemoryEntryName(memory.contact),
      content,
      {
        enabled: true,
        constant: true,
        selective: false,
        key: [],
        position: 4,
        role: 0,
        depth: 0,
        order: 1000,
      },
    );
    await worldbookClient.refreshWorldbookEditor(this.worldName);
  }

  async deleteBridgeMemory(contact: string): Promise<void> {
    await worldbookClient.deleteEntry(this.worldName, getBridgeMemoryEntryName(contact));
    await worldbookClient.refreshWorldbookEditor(this.worldName);
  }

  async appendMessages(contact: string, messages: BackstreetMessage[]): Promise<BackstreetThreadData> {
    const thread = await this.getThread(contact);
    thread.messages.push(...messages);
    thread.updatedAt = Date.now();
    await this.archiveIfNeeded(thread);
    await this.saveThread(thread);
    await this.updateMetaFromThread(thread);
    await this.updateCoreMemory(thread);
    await this.updateBridgeMemory(thread);
    await worldbookClient.refreshWorldbookEditor(this.worldName);
    return this.getThread(contact, { force: true });
  }

  async deleteMessage(contact: string, messageId: string): Promise<BackstreetThreadData> {
    const thread = await this.getThread(contact);
    const messageIndex = thread.messages.findIndex(message => message.id === messageId);
    if (messageIndex < 0) return thread;

    thread.messages = thread.messages.slice(0, messageIndex);
    thread.updatedAt = Date.now();
    await this.saveThread(thread);
    await this.updateMetaFromThread(thread);
    await this.updateCoreMemory(thread);
    await this.deleteBridgeMemory(contact);
    await worldbookClient.refreshWorldbookEditor(this.worldName);
    return thread;
  }

  async listContacts(characterData: any): Promise<BackstreetContact[]> {
    const meta = await this.getMeta().catch(() => createEmptyMeta());
    const relationSystem = characterData?.关系系统 || {};
    const presentNames = Array.isArray(relationSystem?.在场人物) ? relationSystem.在场人物 : [];
    const relationNames = Object.entries(relationSystem)
      .filter(([name, value]) => {
        if (name === '在场人物' || !value || typeof value !== 'object') return false;
        const relation = value as { 好感度?: unknown; 关系类型?: unknown };
        const affection = Number(relation.好感度 || 0);
        const type = safeString(relation.关系类型);
        return affection > 0 || (!!type && type !== '陌生人');
      })
      .map(([name]) => name);
    const names = uniqueStrings([...Object.values(meta.contacts).map(contact => contact.name), ...presentNames, ...relationNames]);

    return names.map(name => {
      const metaContact = meta.contacts[name];
      return {
        id: name,
        name,
        lastMessage: safeString(metaContact?.lastMessage),
        lastTime: safeString(metaContact?.lastTime),
      };
    });
  }

  async searchMemory(query: PhoneMemoryQuery): Promise<PhoneMemoryHit[]> {
    const entries = await worldbookClient.listEntries(this.worldName, { includeDisabled: true }).catch(() => []);
    return entries
      .filter(entry => safeString(entry.comment).includes('BACKSTREET_'))
      .map(entry => ({ entry, score: scorePhoneEntry(entry, query) }))
      .filter(item => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, query.limit)
      .map(item => entryToMemoryHit(item.entry, item.score));
  }

  async searchBridgeMemory(query: PhoneMemoryQuery): Promise<PhoneMemoryHit[]> {
    const entries = await worldbookClient.listEntries(this.worldName, { includeDisabled: true }).catch(() => []);
    return entries
      .filter(entry => /\[?BACKSTREET_BRIDGE::/.test(safeString(entry.comment)))
      .map(entry => ({ entry, score: scorePhoneEntry(entry, query) }))
      .filter(item => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, query.limit)
      .map(item => entryToMemoryHit(item.entry, item.score));
  }

  async getRecentBridgeMemoryHits(limit = 3): Promise<PhoneMemoryHit[]> {
    const entries = await worldbookClient.listEntries(this.worldName, { includeDisabled: true }).catch(() => []);
    return entries
      .filter(entry => /\[?BACKSTREET_BRIDGE::/.test(safeString(entry.comment)))
      .sort((left, right) => {
        const leftContact = safeString(left.comment).match(/BACKSTREET_BRIDGE::(.+?)::/)?.[1] || '';
        const rightContact = safeString(right.comment).match(/BACKSTREET_BRIDGE::(.+?)::/)?.[1] || '';
        const leftMemory =
          parseWrappedJson<BackstreetBridgeMemory>(safeString(left.content), 'backstreet_bridge') ||
          parseBridgeTemplateMemory(leftContact, safeString(left.content));
        const rightMemory =
          parseWrappedJson<BackstreetBridgeMemory>(safeString(right.content), 'backstreet_bridge') ||
          parseBridgeTemplateMemory(rightContact, safeString(right.content));
        return Number(rightMemory?.updatedAt || 0) - Number(leftMemory?.updatedAt || 0);
      })
      .slice(0, Math.max(1, limit))
      .map((entry, index) => entryToMemoryHit(entry, 90 - index));
  }

  async searchArchiveMemory(query: PhoneMemoryQuery): Promise<PhoneMemoryHit[]> {
    const entries = await worldbookClient.listEntries(this.worldName, { includeDisabled: true }).catch(() => []);
    return entries
      .filter(entry => /\[?BACKSTREET_ARCHIVE::/.test(safeString(entry.comment)))
      .map(entry => ({ entry, score: scorePhoneEntry(entry, query) }))
      .filter(item => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, query.limit)
      .map(item => entryToMemoryHit(item.entry, item.score));
  }

  async getContactCoreMemoryHits(contact: string): Promise<PhoneMemoryHit[]> {
    const coreEntry = await worldbookClient.getEntry(this.worldName, getCoreMemoryEntryName(contact)).catch(() => null);
    return [coreEntry]
      .filter((entry): entry is WorldbookEntry => !!entry)
      .map((entry, index) => entryToMemoryHit(entry, 100 - index));
  }

  private async archiveIfNeeded(thread: BackstreetThreadData): Promise<void> {
    if (thread.messages.length <= MAX_HEAD_MESSAGES) return;

    const meta = await this.getMeta().catch(() => createEmptyMeta());
    const overflowCount = thread.messages.length - MAX_HEAD_MESSAGES;
    const archivedMessages = thread.messages.splice(0, overflowCount);
    const nextIndex = (meta.archiveCounters[thread.contact] || 0) + 1;
    meta.archiveCounters[thread.contact] = nextIndex;

    await worldbookClient.upsertEntry(
      this.worldName,
      getArchiveEntryName(thread.contact, nextIndex),
      wrapJson('backstreet_archive', {
        contact: thread.contact,
        archivedAt: Date.now(),
        messages: archivedMessages,
      }),
      false,
    );
    await this.saveMeta(meta);
  }

  private async updateMetaFromThread(thread: BackstreetThreadData): Promise<void> {
    const meta = await this.getMeta().catch(() => createEmptyMeta());
    const last = thread.messages.at(-1);
    meta.contacts[thread.contact] = {
      name: thread.contact,
      lastMessage: safeString(last?.text),
      lastTime: safeString(last?.time),
      updatedAt: thread.updatedAt,
    };
    await this.saveMeta(meta);
  }

  private async updateCoreMemory(thread: BackstreetThreadData): Promise<void> {
    const recentLines = thread.messages
      .slice(-20)
      .map(message => `${message.time || '--:--'} ${message.sender === 'user' ? '玩家' : thread.contact}: ${message.text}`);
    const content = wrapJson('backstreet_memory', {
      contact: thread.contact,
      updatedAt: thread.updatedAt,
      summary: `最近后街聊天快照：\n${recentLines.join('\n')}`,
      relationship: '',
      knownFacts: [],
      openLoops: [],
      recentTone: '',
      keywords: uniqueStrings([thread.contact, ...(recentLines.join('\n').match(/[\u4e00-\u9fa5A-Za-z0-9]{2,8}/g)?.slice(-30) || [])]),
    });
    await worldbookClient.upsertEntry(this.worldName, getCoreMemoryEntryName(thread.contact), content, false);
  }

  private async updateBridgeMemory(thread: BackstreetThreadData): Promise<void> {
    const existing = await this.getBridgeMemory(thread.contact, { force: true }).catch(() => null);
    if (!existing) return;

    existing.updatedAt = thread.updatedAt;
    await this.saveBridgeMemory(existing);
  }
}

export const backstreetWorldbookStore = new BackstreetWorldbookStore();
