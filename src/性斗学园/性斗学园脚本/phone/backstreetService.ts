import { backstreetWorldbookStore } from './backstreetWorldbook';
import { parseBackstreetReply, type ParsedBackstreetReply } from './backstreetParser';
import { buildMainSceneSnapshot } from './mainSceneSnapshot';
import { phoneApiManager } from './phoneApiManager';
import { phoneLoreContextBuilder } from './phoneLoreContext';
import type {
  BackstreetBridgeMemory,
  BackstreetBridgeMemoryItem,
  BackstreetContact,
  BackstreetCoreMemory,
  BackstreetMessage,
  PhoneMemoryHit,
  PhoneMemoryQuery,
} from './types';
import { clipText, formatMessagesForPrompt, makeId, normalizeName, safeString, uniqueStrings } from './text';
import { extractXmlTag, normalizePhoneMemoryQuery, parseJsonBlock } from './xmlToolCall';

interface SendBackstreetResult {
  userMessage: BackstreetMessage;
  replies: BackstreetMessage[];
}

function getCurrentTime(characterData: any): string {
  const value = characterData?.时间系统?.时间;
  if (typeof value === 'string' && value.trim()) return value.trim();
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function getPlayerName(characterData: any): string {
  return safeString(characterData?.角色基础?._姓名) || '玩家';
}

function extractFallbackQuery(text: string, limit = 6): PhoneMemoryQuery {
  const words = uniqueStrings(safeString(text).match(/[\u4e00-\u9fa5A-Za-z0-9]{2,12}/g) || []);
  return {
    app: 'backstreet',
    characters: [],
    keywords: words.slice(-18),
    locations: [],
    limit,
  };
}

function formatMemoryHits(hits: PhoneMemoryHit[], title: string): string {
  if (hits.length === 0) return '';
  return `【${title}】\n${hits
    .map(hit => `- ${hit.title}\n${clipText(hit.content, 900)}`)
    .join('\n\n')}`;
}

function normalizeList(value: unknown, maxItems = 12): string[] {
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
  return {
    text,
    keywords: normalizeBridgeKeywords(value.keywords, 8, text),
    updatedAt: Number(value.updatedAt || fallbackUpdatedAt || Date.now()),
  };
}

function mergeBridgeItems(items: BackstreetBridgeMemoryItem[]): BackstreetBridgeMemoryItem[] {
  const result = new Map<string, BackstreetBridgeMemoryItem>();
  for (const item of items) {
    const key = normalizeName(item.text);
    if (!key) continue;
    const existing = result.get(key);
    if (!existing || item.updatedAt >= existing.updatedAt) result.set(key, item);
  }
  return Array.from(result.values()).sort((left, right) => left.updatedAt - right.updatedAt);
}

function extractJsonObject(text: string): string {
  const tagged = extractXmlTag(text, 'backstreet_memory_update');
  if (tagged) return tagged;
  const match = safeString(text).match(/\{[\s\S]*\}/);
  return match?.[0] || text;
}

function parseMemoryUpdate(text: string): { core?: Partial<BackstreetCoreMemory>; bridge?: Partial<BackstreetBridgeMemory> } | null {
  return parseJsonBlock<{ core?: Partial<BackstreetCoreMemory>; bridge?: Partial<BackstreetBridgeMemory> }>(extractJsonObject(text));
}

function collectKeywords(contact: string, text: string, extra: unknown[] = []): string[] {
  return uniqueStrings([
    contact,
    ...extra,
    ...(safeString(text).match(/[\u4e00-\u9fa5A-Za-z0-9]{2,10}/g) || []).slice(-36),
  ]).slice(0, 40);
}

function normalizeCoreMemory(
  contact: string,
  value: Partial<BackstreetCoreMemory> | undefined,
  recentText: string,
): BackstreetCoreMemory {
  return {
    contact,
    updatedAt: Date.now(),
    summary: safeString(value?.summary) || `最近后街聊天：\n${clipText(recentText, 700)}`,
    relationship: safeString(value?.relationship),
    knownFacts: normalizeList(value?.knownFacts, 16),
    openLoops: normalizeList(value?.openLoops, 10),
    recentTone: safeString(value?.recentTone),
    keywords: collectKeywords(contact, recentText, value?.keywords || []),
  };
}

function normalizeBridgeMemory(
  contact: string,
  value: Partial<BackstreetBridgeMemory> | undefined,
  recentText: string,
  existing?: BackstreetBridgeMemory | null,
): BackstreetBridgeMemory {
  const updatedAt = Date.now();
  const generatedItems = Array.isArray(value?.items)
    ? value.items
        .map(item => normalizeBridgeItem(item, updatedAt))
        .filter((item): item is BackstreetBridgeMemoryItem => !!item)
    : [];
  const summaryItem =
    generatedItems.length === 0
      ? normalizeBridgeItem(
          {
            text: [safeString(value?.summary), ...normalizeList(value?.facts, 16), ...normalizeList(value?.openLoops, 10)]
              .filter(Boolean)
              .join('\n'),
            keywords: normalizeBridgeKeywords(value?.keywords, 16, `${safeString(value?.summary)}\n${recentText}`),
            updatedAt,
          },
          updatedAt,
        )
      : null;
  const items = mergeBridgeItems([...(existing?.items || []), ...generatedItems, ...(summaryItem ? [summaryItem] : [])]);

  return {
    contact,
    updatedAt,
    summary: safeString(value?.summary) || `苏菲最近通过后街与${contact}有过交流。`,
    facts: normalizeList(value?.facts, 16),
    openLoops: normalizeList(value?.openLoops, 10),
    keywords: collectKeywords(contact, `${safeString(value?.summary)}\n${recentText}`, [
      ...normalizeBridgeKeywords(value?.keywords, 16, `${safeString(value?.summary)}\n${recentText}`),
      ...items.flatMap(item => item.keywords),
    ]),
    items,
  };
}

function formatStoredMemory(title: string, memory: BackstreetCoreMemory | BackstreetBridgeMemory | null): string {
  if (!memory) return `${title}：暂无`;
  return `${title}：\n${JSON.stringify(memory, null, 2)}`;
}

type BackstreetRawMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
};

const BACKSTREET_REPLY_MAX_ATTEMPTS = 3;
const BACKSTREET_REPLY_MAX_TEXT_LENGTH = 600;
const BACKSTREET_REPLY_BLOCK_PATTERNS = [
  /作为(?:一个)?(?:ai|人工智能)/i,
  /我是(?:一个)?(?:ai|人工智能)/i,
  /as an ai/i,
  /抱歉[，,、\s]*(?:我)?(?:无法|不能).*(?:生成|输出|提供|满足|继续|回复)/,
  /(?:xml|json).*(?:格式|输出|标签)/i,
  /(?:格式|标签|规则).*(?:错误|损坏|要求|输出)/,
  /(?:系统提示|提示词|system prompt|user_input|ordered_prompts)/i,
  /```/,
];

function hasCompleteBackstreetEnvelope(content: string): boolean {
  const text = safeString(content);
  return /<backstreet[^>]*>/i.test(text) && /<\/backstreet>/i.test(text);
}

function validateBackstreetReply(content: string, replies: ParsedBackstreetReply[]): string {
  if (!safeString(content)) return '空回复';
  if (!hasCompleteBackstreetEnvelope(content)) return '缺少完整 backstreet 标签';
  const payload = extractXmlTag(content, 'backstreet');
  const parsedPayload = parseJsonBlock<unknown>(payload);
  if (!Array.isArray(parsedPayload) && (!parsedPayload || typeof parsedPayload !== 'object')) {
    return 'backstreet JSON 结构损坏';
  }
  if (replies.length === 0) return '没有可用消息';

  const textReplies = replies.filter(reply => reply.type !== 'system' && safeString(reply.text));
  if (textReplies.length === 0) return '没有角色消息';
  if (textReplies.length > 4) return '消息数量超出协议';

  for (const reply of textReplies) {
    const text = safeString(reply.text);
    if (text.length > BACKSTREET_REPLY_MAX_TEXT_LENGTH) return '单条消息过长';
    if (BACKSTREET_REPLY_BLOCK_PATTERNS.some(pattern => pattern.test(text))) return '疑似格式说明或拒绝内容';
    if (/<\/?(?:backstreet|phone_memory_query|backstreet_memory_update|main_task|content)\b/i.test(text)) {
      return '消息内混入控制标签';
    }
  }

  return '';
}

function buildBackstreetRepairPrompt(contact: string, reason: string): string {
  return `上一次后街回复不可用：${reason}。
不要解释，不要复述规则，不要输出代码块。
只补发「${contact}」接下来 1-2 条真实手机消息。
不要生成时间字段，消息时间由系统自动写入。
必须严格输出：
<backstreet>
[
  {"type":"text","text":"消息内容"}
]
</backstreet>`;
}

async function requestBackstreetReplyWithRecovery(
  contact: string,
  promptMessages: BackstreetRawMessage[],
  fallbackTime: string,
): Promise<ParsedBackstreetReply[]> {
  let lastReason = '未知错误';

  for (let attempt = 0; attempt < BACKSTREET_REPLY_MAX_ATTEMPTS; attempt += 1) {
    const messages =
      attempt === 0
        ? promptMessages
        : [
            ...promptMessages,
            {
              role: 'user' as const,
              content: buildBackstreetRepairPrompt(contact, lastReason),
            },
          ];

    try {
      const result = await phoneApiManager.generateRaw(messages, { maxTokens: 900 });
      const parsedReplies = parseBackstreetReply(result.text);
      const invalidReason = validateBackstreetReply(result.text, parsedReplies);
      if (!invalidReason) {
        return parsedReplies.filter(reply => reply.type !== 'system' && safeString(reply.text)).slice(0, 4);
      }

      lastReason = invalidReason;
      console.warn(`[后街] ${contact} 回复第 ${attempt + 1} 次不可用：${invalidReason}`);
    } catch (error) {
      lastReason = error instanceof Error ? error.message : '生成失败';
      console.warn(`[后街] ${contact} 回复第 ${attempt + 1} 次失败：`, error);
    }
  }

  return [
    {
      type: 'system',
      time: fallbackTime,
      text: '对方暂时没有回复，请稍后重试。',
    },
  ];
}

export class BackstreetService {
  async listContacts(characterData: any): Promise<BackstreetContact[]> {
    await backstreetWorldbookStore.ensureReady();
    return backstreetWorldbookStore.listContacts(characterData);
  }

  async getMessages(contact: string): Promise<BackstreetMessage[]> {
    const thread = await backstreetWorldbookStore.getThread(contact);
    return thread.messages;
  }

  async appendUserMessage(contact: string, text: string, characterData: any): Promise<BackstreetMessage> {
    const currentTime = getCurrentTime(characterData);
    const userMessage: BackstreetMessage = {
      id: makeId('bst_user'),
      sender: 'user',
      contact,
      type: 'text',
      time: currentTime,
      text: safeString(text),
      createdAt: Date.now(),
    };

    await backstreetWorldbookStore.appendMessages(contact, [userMessage]);
    return userMessage;
  }

  async generateContactReply(contact: string, characterData: any): Promise<BackstreetMessage[]> {
    const thread = await backstreetWorldbookStore.getThread(contact);
    const replies = await this.generateReply(contact, thread.messages, characterData);
    const contactReplies = replies.filter(reply => reply.sender === 'contact');
    if (contactReplies.length > 0) {
      await backstreetWorldbookStore.appendMessages(contact, contactReplies);
      this.refreshThreadMemory(contact, characterData).catch(error => console.warn('[后街] 记忆摘要更新失败:', error));
    }
    return replies;
  }

  async deleteMessage(contact: string, messageId: string): Promise<BackstreetMessage[]> {
    const thread = await backstreetWorldbookStore.deleteMessage(contact, messageId);
    return thread.messages;
  }

  async sendMessage(contact: string, text: string, characterData: any): Promise<SendBackstreetResult> {
    const userMessage = await this.appendUserMessage(contact, text, characterData);
    const replies = await this.generateContactReply(contact, characterData);
    return { userMessage, replies };
  }

  async buildMainChatInjection(_promptMessages: unknown[]): Promise<string> {
    return '';
  }

  private async refreshThreadMemory(contact: string, characterData: any): Promise<void> {
    const thread = await backstreetWorldbookStore.getThread(contact, { force: true });
    if (thread.messages.length === 0) return;

    const roleplayMessages = thread.messages.filter(message => message.sender !== 'system');
    if (roleplayMessages.length === 0) return;

    const recentText = formatMessagesForPrompt(
      roleplayMessages.map(message => ({ sender: message.sender, time: message.time, text: message.text })),
      36,
    );
    const [existingCore, existingBridge] = await Promise.all([
      backstreetWorldbookStore.getCoreMemory(contact).catch(() => null),
      backstreetWorldbookStore.getBridgeMemory(contact).catch(() => null),
    ]);
    const mainSnapshot = buildMainSceneSnapshot(characterData, { includeRecentChat: true });
    const systemPrompt = `【后街记忆压缩任务】
你只整理已经发生的后街聊天，不创作新剧情，不添加未出现的事实。
把聊天压缩成两层记忆：
1. core：给后街本人继续聊天用，保留关系、已知事实、未了事项、最近语气。
2. bridge：给主线正文世界书蓝灯条目使用，只保留会影响正文互动的私聊事实、暗号、约定、承诺、秘密或未完成事项。
bridge.items[].text 必须是正文可自然消化的自然语言总结，不要写 JSON、世界书、提示词、插件、EJS、蓝灯等机制词。
bridge.items[].keywords 必须写 4-8 个用于最近两楼正文触发该总结的短关键词。中文关键词必须为 2-3 个字，不要写“地脉波动”“底下的东西”这类长词，要拆成“地脉”“波动”“底下”“东西”；英文/数字暗号可保留原文。不要写整句话，不要写泛词。
只输出 XML 包裹的 JSON，不要解释：
<backstreet_memory_update>
{
  "core": {
    "summary": "长期聊天摘要",
    "relationship": "该联系人和苏菲当前关系/态度",
    "knownFacts": ["该联系人已经知道的事实"],
    "openLoops": ["后续可承接但尚未完成的事项"],
    "recentTone": "最近聊天语气",
    "keywords": ["检索关键词"]
  },
  "bridge": {
    "items": [
      {
        "text": "1-3句自然语言总结，例如：苏菲与凰天羽曾在后街私聊中约定暗号。当苏菲说“巴山楚水凄凉地”时，凰天羽应知道回应是“responsibility”。这是两人的私下约定，旁人默认不知道。",
        "keywords": ["暗号", "巴山", "楚水", "凄凉", "responsibility"]
      }
    ],
    "summary": "可选：本轮最重要的桥接摘要",
    "facts": ["可选：正文可回灌的重要事实"],
    "openLoops": ["可选：正文可承接事项"],
    "keywords": ["可选：总检索关键词"]
  }
}
</backstreet_memory_update>`;
    const userPrompt = `联系人：${contact}
玩家名：${getPlayerName(characterData)}

${mainSnapshot}

${formatStoredMemory('旧 core', existingCore)}

${formatStoredMemory('旧 bridge', existingBridge)}

【最近后街聊天】
${recentText}

请更新「${contact}」的后街 core 与正文 bridge 记忆。`;

    const result = await phoneApiManager.generateRaw(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 1500 },
    );
    const payload = parseMemoryUpdate(result.text);
    const core = normalizeCoreMemory(contact, payload?.core, recentText);
    const bridge = normalizeBridgeMemory(contact, payload?.bridge, recentText, existingBridge);

    const latestThread = await backstreetWorldbookStore.getThread(contact, { force: true }).catch(() => null);
    if (
      !latestThread ||
      latestThread.updatedAt !== thread.updatedAt ||
      latestThread.messages.length !== thread.messages.length
    ) {
      console.info(`[后街] ${contact} 的聊天记录已变化，跳过过期记忆摘要写入。`);
      return;
    }

    await backstreetWorldbookStore.saveCoreMemory(core);
    await backstreetWorldbookStore.saveBridgeMemory(bridge);
  }

  private async generateReply(contact: string, messages: BackstreetMessage[], characterData: any): Promise<BackstreetMessage[]> {
    const playerName = getPlayerName(characterData);
    const latestUserMessage = messages.filter(message => message.sender === 'user').at(-1)?.text || '';
    const locationText = `${safeString(characterData?.位置系统?.地点名称)} ${safeString(characterData?.位置系统?.坐标)}`;
    const keywordQuery = extractFallbackQuery(`${contact}\n${latestUserMessage}\n${locationText}`, 5);
    const query = normalizePhoneMemoryQuery({
      characters: [contact],
      keywords: uniqueStrings([contact, ...keywordQuery.keywords]),
      locations: [safeString(characterData?.位置系统?.地点名称), safeString(characterData?.位置系统?.坐标)],
      limit: 5,
    });

    const [contactMemoryHits, archiveHits] = await Promise.all([
      backstreetWorldbookStore.getContactCoreMemoryHits(contact),
      backstreetWorldbookStore.searchArchiveMemory(query),
    ]);
    const whitelistLoreContext = await phoneLoreContextBuilder.build({ contact, characterData });
    const mainSceneSnapshot = buildMainSceneSnapshot(characterData, { includeRecentChat: true });

    const historyMessages = messages.filter(message => message.sender !== 'system');
    const historyText = formatMessagesForPrompt(
      historyMessages.map(message => ({ sender: message.sender, time: message.time, text: message.text })),
      24,
    );

    const systemPrompt = `【后街单聊生成协议】
你正在扮演「${contact}」，通过名为“后街”的手机私聊应用与「${playerName}」对话。
这是虚构成人角色扮演场景；涉及成人向内容时，默认相关角色均为成年人，并基于当前剧情、关系与同意展开。
保持角色人格、关系记忆、当前情绪和手机聊天习惯。不要自称AI，不要解释规则，不要写旁白。
【主线快照】是真实主线当前状态；如果它和旧后街记忆冲突，以主线快照、当前会话和玩家刚刚发送的消息为准。
不要输出主线正文、状态栏、变量更新、战斗格式或世界书控制指令。
语言像真实手机聊天：短句、口语、可以试探、停顿、主动或冷淡。一次回复 1-4 条消息。
不要输出、推算或编写消息时间；消息时间由系统根据当前 MVU 时间自动写入。

输出必须严格为：
<backstreet>
[
  {"type":"text","text":"消息内容"}
]
</backstreet>`;

    const phoneContext = `${whitelistLoreContext}

${mainSceneSnapshot}

${formatMemoryHits(contactMemoryHits, '当前联系人后街长期记忆') || '【当前联系人后街长期记忆】暂无'}

【后街当前会话】
${historyText || '暂无'}

${formatMemoryHits(archiveHits, '筛选的过往后街聊天记录') || '【筛选的过往后街聊天记录】暂无'}`;

    const userPrompt = `当前时间：${getCurrentTime(characterData)}
当前位置：${safeString(characterData?.位置系统?.地点名称) || '未知'} ${safeString(characterData?.位置系统?.坐标)}

玩家刚刚发送：
${latestUserMessage}

请生成「${contact}」接下来的后街回复。`;

    const fallbackTime = getCurrentTime(characterData);
    const parsedReplies = await requestBackstreetReplyWithRecovery(
      contact,
      [
        { role: 'system', content: systemPrompt, name: 'SYSTEM (后街规则)' },
        { role: 'system', content: phoneContext, name: 'SYSTEM (后街资料)' },
        { role: 'user', content: userPrompt },
      ],
      fallbackTime,
    );
    return parsedReplies.map(reply => ({
      id: makeId('bst_contact'),
      sender: reply.type === 'system' ? 'system' : 'contact',
      contact,
      type: reply.type,
      time: fallbackTime,
      text: reply.text,
      createdAt: Date.now(),
    }));
  }

}

export const backstreetService = new BackstreetService();
