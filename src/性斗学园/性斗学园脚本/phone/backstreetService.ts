import { backstreetWorldbookStore } from './backstreetWorldbook';
import { parseBackstreetReply, type ParsedBackstreetReply } from './backstreetParser';
import { buildMainSceneSnapshot } from './mainSceneSnapshot';
import { phoneApiManager } from './phoneApiManager';
import { phoneLoreContextBuilder } from './phoneLoreContext';
import type {
  BackstreetContact,
  BackstreetMessage,
  BackstreetThreadData,
  PhoneMemoryHit,
  PhoneMemoryQuery,
} from './types';
import { getLatestStatData } from '../../shared/mvuStore';
import { clipText, formatMessagesForPrompt, makeId, normalizeName, safeString, uniqueStrings } from './text';
import { extractXmlTag, normalizePhoneMemoryQuery, parseJsonBlock } from './xmlToolCall';

interface SendBackstreetResult {
  userMessage: BackstreetMessage;
  replies: BackstreetMessage[];
}

const PLAYER_NAME_MACRO = '<user>';

function getCurrentTime(characterData: any): string {
  const value = characterData?.时间系统?.时间;
  if (typeof value === 'string' && value.trim()) return value.trim();
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function getCurrentDate(characterData: any): string {
  return safeString(characterData?.时间系统?.日期);
}

function getThreadDisplayName(thread: Partial<BackstreetThreadData>): string {
  return thread.kind === 'group' ? safeString(thread.groupName) || '群聊' : safeString(thread.contact);
}

function getPrivatePromptName(contact: string): string {
  const name = safeString(contact);
  return /^bst_group_/i.test(name) ? '群聊' : name;
}

function getMessageSpeaker(message: Partial<BackstreetMessage>, thread: Partial<BackstreetThreadData>): string {
  if (message.sender === 'user') return PLAYER_NAME_MACRO;
  if (message.sender === 'system') return '系统';
  return safeString(message.speaker) || (thread.kind === 'group' ? '群成员' : getThreadDisplayName(thread) || '对方');
}

function formatThreadMessagesForPrompt(thread: Partial<BackstreetThreadData>, messages: BackstreetMessage[], maxItems = 30): string {
  return messages
    .slice(-maxItems)
    .map(message => {
      const timestamp = [message.date, message.time || '--:--'].filter(Boolean).join(' ');
      return `[${timestamp || '--:--'}] ${getMessageSpeaker(message, thread)}: ${message.text}`;
    })
    .join('\n');
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

function formatMessageTimestamp(message: Partial<BackstreetMessage>): string {
  return uniqueStrings([message.date, message.time || '--:--']).join(' ') || '--:--';
}

const PHONE_PREFS_STORAGE_KEY = 'fatria-status-phone-preferences-v1';
const MAIN_INJECTION_MARKER = '【本轮固定后街聊天记录】';

interface BackstreetMainInjectionSettings {
  presentPrivateLimit: number;
  presentGroupLimit: number;
  globalRecentLimit: number;
}

interface BackstreetMessageContext {
  thread: BackstreetThreadData;
  message: BackstreetMessage;
}

const DEFAULT_MAIN_INJECTION_SETTINGS: BackstreetMainInjectionSettings = {
  presentPrivateLimit: 20,
  presentGroupLimit: 20,
  globalRecentLimit: 20,
};

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numericValue)));
}

function readBackstreetMainInjectionSettings(): BackstreetMainInjectionSettings {
  try {
    const raw = window.localStorage?.getItem(PHONE_PREFS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    return {
      presentPrivateLimit: clampInteger(
        parsed.backstreetPresentPrivateMessageCount,
        0,
        30,
        DEFAULT_MAIN_INJECTION_SETTINGS.presentPrivateLimit,
      ),
      presentGroupLimit: clampInteger(
        parsed.backstreetPresentGroupMessageCount,
        0,
        30,
        DEFAULT_MAIN_INJECTION_SETTINGS.presentGroupLimit,
      ),
      globalRecentLimit: clampInteger(
        parsed.backstreetGlobalRecentMessageCount,
        0,
        50,
        DEFAULT_MAIN_INJECTION_SETTINGS.globalRecentLimit,
      ),
    };
  } catch {
    return { ...DEFAULT_MAIN_INJECTION_SETTINGS };
  }
}

function normalizeCharacterName(value: string): string {
  return safeString(value).replace(/[·・‧•\s\u3000._\-—]/g, '');
}

function isSameCharacter(left: string, right: string): boolean {
  const normalizedLeft = normalizeCharacterName(left);
  const normalizedRight = normalizeCharacterName(right);
  return Boolean(
    normalizedLeft &&
      normalizedRight &&
      (normalizedLeft === normalizedRight || normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)),
  );
}

function getPresentNames(statData: Record<string, any> | null): string[] {
  const value = statData?.关系系统?.在场人物;
  const names = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[、,，|/\s]+/)
      : [];
  return uniqueStrings(names.map(name => safeString(name)).filter(name => name && !['无', '暂无', '未知'].includes(name)));
}

function getThreadParticipantMatches(thread: BackstreetThreadData, presentNames: string[]): string[] {
  const targets = thread.kind === 'group' ? thread.members || [] : [thread.contact];
  return presentNames.filter(name => targets.some(target => isSameCharacter(name, target)));
}

function getDisplayName(thread: BackstreetThreadData): string {
  return thread.kind === 'group' ? safeString(thread.groupName) || '群聊' : safeString(thread.contact);
}

function getRoleplayMessages(thread: BackstreetThreadData): BackstreetMessage[] {
  return thread.messages.filter(message => safeString(message.text));
}

function getMessageSortTime(message: BackstreetMessage): number {
  return Number(message.createdAt || 0);
}

function formatRawMessageLine(thread: BackstreetThreadData, message: BackstreetMessage, includeThreadName = false): string {
  const threadLabel = includeThreadName
    ? thread.kind === 'group'
      ? `群聊「${getDisplayName(thread)}」`
      : `私聊「${getDisplayName(thread)}」`
    : '';
  const label = threadLabel ? `${threadLabel} ` : '';
  return `[${formatMessageTimestamp(message)}] ${label}${getMessageSpeaker(message, thread)}：${safeString(message.text)}`;
}

function formatThreadBlock(thread: BackstreetThreadData, messages: BackstreetMessage[], extra = ''): string {
  const title =
    thread.kind === 'group'
      ? `【群聊：${getDisplayName(thread)}｜成员：${(thread.members || []).join('、') || '未知'}${thread.dissolved ? '｜已解散' : ''}${extra ? `｜${extra}` : ''}】`
      : `【私聊：${getDisplayName(thread)}${extra ? `｜${extra}` : ''}】`;
  return `${title}\n${messages.map(message => formatRawMessageLine(thread, message)).join('\n')}`;
}

function buildFixedMainInjection(
  threads: BackstreetThreadData[],
  presentNames: string[],
  settings: BackstreetMainInjectionSettings,
): string {
  const sections: string[] = [];
  const sortedThreads = [...threads].sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0));

  if (settings.presentPrivateLimit > 0 && presentNames.length > 0) {
    const privateBlocks = sortedThreads
      .filter(thread => thread.kind !== 'group')
      .map(thread => ({ thread, matches: getThreadParticipantMatches(thread, presentNames) }))
      .filter(item => item.matches.length > 0)
      .map(item => {
        const messages = getRoleplayMessages(item.thread).slice(-settings.presentPrivateLimit);
        return messages.length > 0 ? formatThreadBlock(item.thread, messages, `在场：${item.matches.join('、')}`) : '';
      })
      .filter(Boolean);
    if (privateBlocks.length > 0) {
      sections.push(`【在场人物相关私聊｜每人最近 ${settings.presentPrivateLimit} 条】\n${privateBlocks.join('\n\n')}`);
    }
  }

  if (settings.presentGroupLimit > 0 && presentNames.length > 0) {
    const groupBlocks = sortedThreads
      .filter(thread => thread.kind === 'group')
      .map(thread => ({ thread, matches: getThreadParticipantMatches(thread, presentNames) }))
      .filter(item => item.matches.length > 0)
      .map(item => {
        const messages = getRoleplayMessages(item.thread).slice(-settings.presentGroupLimit);
        return messages.length > 0 ? formatThreadBlock(item.thread, messages, `涉及在场：${item.matches.join('、')}`) : '';
      })
      .filter(Boolean);
    if (groupBlocks.length > 0) {
      sections.push(`【在场人物相关群聊｜每群最近 ${settings.presentGroupLimit} 条】\n${groupBlocks.join('\n\n')}`);
    }
  }

  if (settings.globalRecentLimit > 0) {
    const globalMessages = threads
      .flatMap(thread => getRoleplayMessages(thread).map(message => ({ thread, message } satisfies BackstreetMessageContext)))
      .sort((left, right) => getMessageSortTime(right.message) - getMessageSortTime(left.message))
      .slice(0, settings.globalRecentLimit)
      .reverse();
    if (globalMessages.length > 0) {
      sections.push(
        `【全局最近 ${settings.globalRecentLimit} 条后街记录｜不要求相关角色在场】\n${globalMessages
          .map(item => formatRawMessageLine(item.thread, item.message, true))
          .join('\n')}`,
      );
    }
  }

  if (sections.length === 0) return '';

  return `${MAIN_INJECTION_MARKER}
以下内容是后街手机中已经发生过的原始聊天记录，不是总结；请按日期时间判断新旧。
私聊默认只有<user>与该联系人知情；群聊默认只有群成员知情，除非正文明确传播。
这些记录用于帮助正文角色记住后街私下交流、承诺、暗号、秘密和未完成事项。

${sections.join('\n\n')}`;
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

function validateBackstreetReply(content: string, replies: ParsedBackstreetReply[], allowedSpeakers: string[] = []): string {
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
  const normalizedAllowedSpeakers = allowedSpeakers.map(normalizeName).filter(Boolean);

  for (const reply of textReplies) {
    const text = safeString(reply.text);
    if (text.length > BACKSTREET_REPLY_MAX_TEXT_LENGTH) return '单条消息过长';
    if (BACKSTREET_REPLY_BLOCK_PATTERNS.some(pattern => pattern.test(text))) return '疑似格式说明或拒绝内容';
    if (/<\/?(?:backstreet|phone_memory_query|backstreet_memory_update|main_task|content)\b/i.test(text)) {
      return '消息内混入控制标签';
    }
    if (normalizedAllowedSpeakers.length > 0 && !normalizedAllowedSpeakers.includes(normalizeName(safeString(reply.speaker)))) {
      return '群聊消息缺少有效发言人';
    }
  }

  return '';
}

function buildBackstreetRepairPrompt(contact: string, reason: string, allowedSpeakers: string[] = []): string {
  const speakerRule =
    allowedSpeakers.length > 0
      ? `每条消息必须包含 "speaker"，且 speaker 只能从这些群成员中选择：${allowedSpeakers.join('、')}。`
      : '';
  const sample = allowedSpeakers.length > 0 ? `{"speaker":"${allowedSpeakers[0]}","type":"text","text":"消息内容"}` : '{"type":"text","text":"消息内容"}';
  return `上一次后街回复不可用：${reason}。
不要解释，不要复述规则，不要输出代码块。
只补发「${contact}」接下来 1-2 条真实手机消息。
不要生成时间字段，消息时间由系统自动写入。
${speakerRule}
必须严格输出：
<backstreet>
[
  ${sample}
]
</backstreet>`;
}

async function requestBackstreetReplyWithRecovery(
  contact: string,
  promptMessages: BackstreetRawMessage[],
  fallbackTime: string,
  options: { allowedSpeakers?: string[] } = {},
): Promise<ParsedBackstreetReply[]> {
  let lastReason = '未知错误';
  const allowedSpeakers = options.allowedSpeakers || [];

  for (let attempt = 0; attempt < BACKSTREET_REPLY_MAX_ATTEMPTS; attempt += 1) {
    const messages =
      attempt === 0
        ? promptMessages
        : [
            ...promptMessages,
            {
              role: 'user' as const,
              content: buildBackstreetRepairPrompt(contact, lastReason, allowedSpeakers),
            },
          ];

    try {
      const result = await phoneApiManager.generateRaw(messages, { maxTokens: 900 });
      const parsedReplies = parseBackstreetReply(result.text);
      const invalidReason = validateBackstreetReply(result.text, parsedReplies, allowedSpeakers);
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
  async ensureReady(): Promise<void> {
    await backstreetWorldbookStore.ensureReady();
  }

  async listContacts(characterData: any): Promise<BackstreetContact[]> {
    await backstreetWorldbookStore.ensureReady();
    return backstreetWorldbookStore.listContacts(characterData);
  }

  async createGroup(name: string, members: string[]): Promise<BackstreetContact> {
    await backstreetWorldbookStore.ensureReady();
    return backstreetWorldbookStore.createGroup(name, members);
  }

  async addGroupMembers(contact: string, members: string[], characterData: any): Promise<BackstreetMessage[]> {
    const thread = await backstreetWorldbookStore.addGroupMembers(
      contact,
      members,
      getCurrentDate(characterData),
      getCurrentTime(characterData),
    );
    return thread.messages;
  }

  async removeGroupMember(contact: string, member: string, characterData: any): Promise<BackstreetMessage[]> {
    const thread = await backstreetWorldbookStore.removeGroupMember(
      contact,
      member,
      getCurrentDate(characterData),
      getCurrentTime(characterData),
    );
    return thread.messages;
  }

  async dissolveGroup(contact: string, characterData: any): Promise<BackstreetMessage[]> {
    const thread = await backstreetWorldbookStore.dissolveGroup(contact, getCurrentDate(characterData), getCurrentTime(characterData));
    return thread.messages;
  }

  async getMessages(contact: string): Promise<BackstreetMessage[]> {
    const thread = await backstreetWorldbookStore.getThread(contact);
    return thread.messages;
  }

  async appendUserMessage(contact: string, text: string, characterData: any): Promise<BackstreetMessage> {
    const thread = await backstreetWorldbookStore.getThread(contact);
    if (thread.kind === 'group' && thread.dissolved) throw new Error('群聊已解散，不能继续发送消息');
    const currentDate = getCurrentDate(characterData);
    const currentTime = getCurrentTime(characterData);
    const userMessage: BackstreetMessage = {
      id: makeId('bst_user'),
      sender: 'user',
      date: currentDate,
      time: currentTime,
      text: safeString(text),
      createdAt: Date.now(),
    };

    await backstreetWorldbookStore.appendMessages(contact, [userMessage]);
    return userMessage;
  }

  async generateContactReply(contact: string, characterData: any): Promise<BackstreetMessage[]> {
    const thread = await backstreetWorldbookStore.getThread(contact);
    if (thread.kind === 'group' && thread.dissolved) throw new Error('群聊已解散，不能继续生成回复');
    const replies =
      thread.kind === 'group'
        ? await this.generateGroupReply(thread, characterData)
        : await this.generateReply(contact, thread.messages, characterData);
    const contactReplies = replies.filter(reply => reply.sender === 'contact');
    if (contactReplies.length > 0) {
      await backstreetWorldbookStore.appendMessages(contact, contactReplies);
    }
    return replies;
  }

  async deleteMessage(contact: string, messageId: string): Promise<BackstreetMessage[]> {
    const thread = await backstreetWorldbookStore.deleteMessage(contact, messageId);
    return thread.messages;
  }

  async deleteMessagesAfter(contact: string, messageId: string): Promise<BackstreetMessage[]> {
    const thread = await backstreetWorldbookStore.deleteMessagesAfter(contact, messageId);
    return thread.messages;
  }

  async sendMessage(contact: string, text: string, characterData: any): Promise<SendBackstreetResult> {
    const userMessage = await this.appendUserMessage(contact, text, characterData);
    const replies = await this.generateContactReply(contact, characterData);
    return { userMessage, replies };
  }

  async buildMainChatInjection(_promptMessages: unknown[]): Promise<string> {
    const settings = readBackstreetMainInjectionSettings();
    if (settings.presentPrivateLimit <= 0 && settings.presentGroupLimit <= 0 && settings.globalRecentLimit <= 0) {
      return '';
    }

    const statData = await getLatestStatData().catch(() => null);
    const presentNames = getPresentNames(statData);
    const threads = await backstreetWorldbookStore.listRawThreads({ force: true });
    return buildFixedMainInjection(threads, presentNames, settings);
  }

  private normalizeGroupSpeaker(speaker: string, members: string[]): string {
    const normalizedSpeaker = normalizeName(speaker);
    return members.find(member => normalizeName(member) === normalizedSpeaker) || members[0] || '群成员';
  }

  private async generateGroupReply(thread: BackstreetThreadData, characterData: any): Promise<BackstreetMessage[]> {
    const groupName = getThreadDisplayName(thread);
    const members = normalizeList(thread.members, 24);
    if (thread.dissolved) throw new Error('群聊已解散，不能继续生成回复');
    if (members.length === 0) throw new Error('群聊没有可回复的成员');
    const latestUserMessage = thread.messages.filter(message => message.sender === 'user').at(-1)?.text || '';
    const locationText = `${safeString(characterData?.位置系统?.地点名称)} ${safeString(characterData?.位置系统?.坐标)}`;
    const keywordQuery = extractFallbackQuery(`${groupName}\n${members.join('\n')}\n${latestUserMessage}\n${locationText}`, 6);
    const query = normalizePhoneMemoryQuery({
      characters: members,
      keywords: uniqueStrings([groupName, ...members, ...keywordQuery.keywords]),
      locations: [safeString(characterData?.位置系统?.地点名称), safeString(characterData?.位置系统?.坐标)],
      limit: 6,
    });

    const [archiveHits, loreContexts] = await Promise.all([
      backstreetWorldbookStore.searchArchiveMemory(query),
      Promise.all(members.slice(0, 8).map(member => phoneLoreContextBuilder.build({ contact: member, characterData }).catch(() => ''))),
    ]);
    const whitelistLoreContext = uniqueStrings(loreContexts.filter(Boolean)).join('\n\n');
    const mainSceneSnapshot = buildMainSceneSnapshot(characterData, { includeRecentChat: true });
    const historyMessages = thread.messages.filter(message => safeString(message.text));
    const historyText = formatThreadMessagesForPrompt(thread, historyMessages, 30);

    const systemPrompt = `【后街群聊生成协议】
你正在模拟名为“后街”的手机群聊「${groupName}」。
${PLAYER_NAME_MACRO}是正在使用后街手机的人；群成员只有：${members.join('、')}。
这是虚构成人角色扮演场景；涉及成人向内容时，默认相关角色均为成年人，并基于当前剧情、关系与同意展开。
保持每个群成员的人格、关系记忆、当前情绪和手机聊天习惯。不要自称AI，不要解释规则，不要写旁白。
【主线快照】是真实主线当前状态；如果它和旧后街记忆冲突，以主线快照、当前群聊和${PLAYER_NAME_MACRO}刚刚发送的消息为准。
不要输出主线正文、状态栏、变量更新、战斗格式或世界书控制指令。
根据当前情境选择 1-3 名合适的群成员发言，一次回复 1-4 条消息。
语言像真实群聊：短句、口语、可以互相接话、吐槽、试探或沉默。
可以自然使用少量 emoji 和颜文字（如🙂、😳、www、(。・ω・。)），但必须符合发言者性格、情绪和聊天语境，不要每条都堆叠。
不要输出、推算或编写消息时间；消息时间由系统根据当前 MVU 时间自动写入。
每条消息必须包含 speaker，speaker 必须完全等于一个群成员名字。

输出必须严格为：
<backstreet>
[
  {"speaker":"${members[0] || '群成员'}","type":"text","text":"消息内容"}
]
</backstreet>`;

    const phoneContext = `${whitelistLoreContext || '【后街白名单世界书】暂无可用条目'}

${mainSceneSnapshot}

【后街当前群聊】
${historyText || '暂无'}

${formatMemoryHits(archiveHits, '筛选的过往后街群聊记录') || '【筛选的过往后街群聊记录】暂无'}`;

    const userPrompt = `当前时间：${getCurrentTime(characterData)}
当前位置：${safeString(characterData?.位置系统?.地点名称) || '未知'} ${safeString(characterData?.位置系统?.坐标)}

${PLAYER_NAME_MACRO}刚刚在群里发送：
${latestUserMessage}

请生成群聊「${groupName}」接下来的回复。`;

    const fallbackTime = getCurrentTime(characterData);
    const fallbackDate = getCurrentDate(characterData);
    const parsedReplies = await requestBackstreetReplyWithRecovery(
      groupName,
      [
        { role: 'system', content: systemPrompt, name: 'SYSTEM (后街群聊规则)' },
        { role: 'system', content: phoneContext, name: 'SYSTEM (后街群聊资料)' },
        { role: 'user', content: userPrompt },
      ],
      fallbackTime,
      { allowedSpeakers: members },
    );
    return parsedReplies.map(reply => ({
      id: makeId('bst_group_contact'),
      sender: reply.type === 'system' ? 'system' : 'contact',
      speaker: this.normalizeGroupSpeaker(reply.speaker || '', members),
      date: fallbackDate,
      time: fallbackTime,
      text: reply.text,
      createdAt: Date.now(),
    }));
  }

  private async generateReply(contact: string, messages: BackstreetMessage[], characterData: any): Promise<BackstreetMessage[]> {
    const contactName = getPrivatePromptName(contact);
    const latestUserMessage = messages.filter(message => message.sender === 'user').at(-1)?.text || '';
    const locationText = `${safeString(characterData?.位置系统?.地点名称)} ${safeString(characterData?.位置系统?.坐标)}`;
    const keywordQuery = extractFallbackQuery(`${contactName}\n${latestUserMessage}\n${locationText}`, 5);
    const query = normalizePhoneMemoryQuery({
      characters: contactName === '群聊' ? [] : [contactName],
      keywords: uniqueStrings([contactName, ...keywordQuery.keywords]),
      locations: [safeString(characterData?.位置系统?.地点名称), safeString(characterData?.位置系统?.坐标)],
      limit: 5,
    });

    const archiveHits = await backstreetWorldbookStore.searchArchiveMemory(query);
    const whitelistLoreContext = await phoneLoreContextBuilder.build({ contact: contactName, characterData });
    const mainSceneSnapshot = buildMainSceneSnapshot(characterData, { includeRecentChat: true });

    const historyMessages = messages.filter(message => message.sender !== 'system');
    const historyText = formatMessagesForPrompt(
      historyMessages.map(message => ({ sender: message.sender, date: message.date, time: message.time, text: message.text })),
      24,
    );

    const systemPrompt = `【后街单聊生成协议】
你正在扮演「${contactName}」，通过名为“后街”的手机私聊应用与${PLAYER_NAME_MACRO}对话。
这是虚构成人角色扮演场景；涉及成人向内容时，默认相关角色均为成年人，并基于当前剧情、关系与同意展开。
保持角色人格、关系记忆、当前情绪和手机聊天习惯。不要自称AI，不要解释规则，不要写旁白。
【主线快照】是真实主线当前状态；如果它和旧后街记忆冲突，以主线快照、当前会话和${PLAYER_NAME_MACRO}刚刚发送的消息为准。
不要输出主线正文、状态栏、变量更新、战斗格式或世界书控制指令。
语言像真实手机聊天：短句、口语、可以试探、停顿、主动或冷淡。一次回复 1-4 条消息。
可以自然使用少量 emoji 和颜文字（如🙂、😳、www、(。・ω・。)），但必须符合角色性格、情绪和聊天语境，不要每条都堆叠。
不要输出、推算或编写消息时间；消息时间由系统根据当前 MVU 时间自动写入。

输出必须严格为：
<backstreet>
[
  {"type":"text","text":"消息内容"}
]
</backstreet>`;

    const phoneContext = `${whitelistLoreContext}

${mainSceneSnapshot}

【后街当前会话】
${historyText || '暂无'}

${formatMemoryHits(archiveHits, '筛选的过往后街聊天记录') || '【筛选的过往后街聊天记录】暂无'}`;

    const userPrompt = `当前时间：${getCurrentTime(characterData)}
当前位置：${safeString(characterData?.位置系统?.地点名称) || '未知'} ${safeString(characterData?.位置系统?.坐标)}

${PLAYER_NAME_MACRO}刚刚发送：
${latestUserMessage}

请生成「${contactName}」接下来的后街回复。`;

    const fallbackTime = getCurrentTime(characterData);
    const fallbackDate = getCurrentDate(characterData);
    const parsedReplies = await requestBackstreetReplyWithRecovery(
      contactName,
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
      date: fallbackDate,
      time: fallbackTime,
      text: reply.text,
      createdAt: Date.now(),
    }));
  }

}

export const backstreetService = new BackstreetService();
