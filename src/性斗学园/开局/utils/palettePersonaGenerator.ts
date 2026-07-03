import type { CharacterData } from '../types';
import { assertPersonaContentClean, isPersonaContentClean } from './personaContentGuard';

export type UserInfoGenerationMode = 'ai_plays_user' | 'ai_reads_user';

type GeneratePalettePersonaOptions = {
  mode?: UserInfoGenerationMode;
  onStream?: (previewText: string) => void;
};

export type PalettePersonaGenerationResult = {
  appearance: string;
  background: string;
  palette: string;
};

const userInfoWritingGuidePrompt = `用户信息成品生成规格

你是酒馆用户设定生成器。你的输入是一组 {{user}} 素材，输出必须是一份可直接保存到酒馆“用户设定”的成品正文。

核心任务：
- 把姓名、年龄、性别、外貌、背景、用户信息概述、开局情景，整理成 AI 后续可直接读取和执行的 {{user}} 设定。
- 用户信息概述权重最高；背景和外貌只作为辅助事实；开局情景只提供场景语境。
- 缺失的素材直接跳过，不输出“未填写”，不为了凑栏目硬编。
- 没有明确互动对象时，不虚构固定关系对象，只写“当前互动对象”或“具体关系随当前剧情决定”。

共同成品标准：
- 每一行都必须是最终设定内容，不能是教程、解释、模板、示例、写作步骤、检查清单。
- 文风像提示词说明书，短、干、可执行；不要写小说化描写。
- 尽量用肯定句说明真实含义；需要防误读时，用“禁止误读”绑定具体行为。
- 不要把用户信息写得比角色卡还长，只保留会影响 AI 理解或扮演 {{user}} 的信息。

AI 可扮演 {{user}} 时：
- 生成简化用户设定，让 AI 能续写 {{user}} 的动作、口吻、心理和选择。
- 必须写 {{user}}性格调色盘，并严格使用“性格调色盘:人的性格就像调色盘...”这一套最终输出格式。
- 调色盘必须有主色调、底色、性格点缀和衍生；衍生要落到具体表现：怎么说话、怎么接近、怎么回避、压力下怎么反应、危急时怎么突破。
- 外貌、声音、身高、气味等显眼特征必须带描写限制，避免后续每段反复强调。
- 必须写 {{user}}代演边界：危急或关键剧情中可以出现哪些合理突破，哪些核心设定不能推翻。
- 不输出多阶段人设、好感度阶段、EJS 或角色卡结构。

AI 只读懂 {{user}} 时：
- 生成行为翻译手册，让 AI 根据 {{user}} 的输入正确归因并让角色回应。
- 不写性格调色盘，不写底色、主色调、点缀、衍生。
- 每条都要说明“{{user}} 做这个动作、用这种语气、保持沉默或靠近时，真实含义是什么”。
- 必须明确 AI 不扮演 {{user}}，不替 {{user}} 续写台词、心理独白或重大行动。

最终正文只允许出现成品设定。`;

const userPersonaPaletteReferencePrompt = `{{user}}性格调色盘格式参考

抢话模式下，{{user}}性格调色盘必须逐行使用这个最终输出格式：
{{user}}性格调色盘
性格调色盘:人的性格就像调色盘，[底色]是底色，[主色调]是主色调，由多种性格衍生组合而成才是活生生的人
主色调：[主色调1]、[主色调2]
底色：[底色]
性格点缀：[点缀]

[主色调1]衍生一：[具体场景和行为]
[主色调1]衍生二：[具体场景和行为]
[主色调1]衍生三：[具体场景和行为]

[主色调2]衍生一：[具体场景和行为]
[底色]衍生一：[具体场景和行为]
[点缀]衍生一：[具体场景和行为]
[跨性格衍生（如果有）]：[具体场景和行为]

格式铁律：
- 标题使用“{{user}}性格调色盘”或当前用户姓名 + “性格调色盘”均可。
- 标题下一行必须是“性格调色盘:人的性格就像调色盘...”。
- 必须按顺序输出“主色调：”“底色：”“性格点缀：”三行。
- 必须至少写 4 条衍生，其中主色调衍生至少 2 条，底色衍生至少 1 条，点缀衍生至少 1 条。
- 衍生必须写成“[性格]衍生一：具体场景和行为”，不要写成项目符号解释。
- “主色调、底色、性格点缀”三行不要加项目符号，不要写成“- 底色：...”。
- 允许根据用户素材自动生成衍生，但只围绕 {{user}}，不要写成 NPC 或攻略对象。`;

function stripCodeFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:yaml|yml|xml|html|text|md)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function extractTag(value: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = value.match(new RegExp(`<${escaped}>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return stripCodeFence(match?.[1] ?? '');
}

function hasTag(value: string, tag: string): boolean {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<${escaped}>[\\s\\S]*?<\\/${escaped}>`, 'i').test(value);
}

function extractContent(value: string): string {
  const withoutThinking = value.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
  return stripCodeFence(extractTag(withoutThinking, 'content') || withoutThinking);
}

function extractGeneratedText(result: unknown): string {
  if (typeof result === 'string') return result;
  if (!result || typeof result !== 'object') return '';

  const source = result as Record<string, any>;
  return String(
    source.choices?.[0]?.message?.content ??
      source.results?.[0]?.text ??
      source.text ??
      source.content ??
      source.body?.text ??
      source.message ??
      '',
  );
}

function getModeLabel(mode: UserInfoGenerationMode): string {
  return mode === 'ai_plays_user' ? '抢话用户信息' : '不抢话用户信息';
}

function getModeInstruction(mode: UserInfoGenerationMode): string {
  if (mode === 'ai_plays_user') {
    return [
      '当前目标：生成供 AI 扮演并续写 {{user}} 的用户设定正文。',
      '正文必须使用这些成品栏目：{{user}}基础信息、{{user}}性格调色盘、{{user}}扮演要点、{{user}}描写限制、{{user}}代演边界。',
      '{{user}}性格调色盘必须按预设格式输出：性格调色盘:人的性格就像调色盘...、主色调、底色、性格点缀、若干衍生。',
      '调色盘要服务 AI 续写 user 的口吻、动作、亲近方式、回避方式、压力反应和危急突破。',
      '{{user}}扮演要点写具体行为：说话方式、亲近方式、回避方式、压力反应、日常选择。',
      '{{user}}描写限制根据外貌和特征生成，说明哪些可以偶尔提，哪些不要反复提。',
      '{{user}}代演边界说明 AI 可以续写哪些日常表达，但不得替 user 做重大关系决定、道德决定、攻击行为、离开行为、承诺行为或不可逆选择。',
      '禁止输出多阶段调色盘、好感度阶段、EJS、多阶段人设、角色速览或角色卡写卡结构。',
    ].join('\n');
  }

  return [
    '当前目标：生成供 AI 读取和理解 {{user}} 的行为翻译正文，禁止 AI 扮演 {{user}}。',
    '正文可使用的成品栏目：{{user}}基础信息、{{user}}行为理解、{{user}}说话方式、{{user}}情绪表达、{{user}}互动边界。',
    '{{user}}行为理解写具体动作的含义，例如触碰、靠近、沉默、拉住、命令句、简短回复分别代表什么。',
    '如果用户没有提供某类行为，不要编很多默认行为；只写能从素材保守推导的内容。',
    '可以写“禁止误读”，但必须绑定具体行为，不能泛泛写 AI 不要误读。',
    '必须明确：AI 不扮演 {{user}}，不替 {{user}} 继续说话或做重大决定，只根据这份设定理解 {{user}}。',
    '不要写性格调色盘、底色、主色调、点缀、衍生。',
  ].join('\n');
}

const finalUserInfoForbiddenArtifacts = [
  { label: '教程标题', pattern: /写法教程|实操检查清单|常见错误/u },
  { label: '教学分类词', pattern: /抢话党|不抢话党|抢话模式|不抢话模式|抢话用户信息|不抢话用户信息|生成类型/u },
  { label: '结构模板词', pattern: /输出结构|完整结构|核心原则|检查清单|建议栏目|当前目标/u },
  { label: '教程口吻', pattern: /怎么写|这部分|什么意思|看到了吗|回到开头|可使用的成品栏目/u },
  { label: '示例残留', pattern: /例如平时|例如：|如果你的用户信息里写了/u },
  { label: '未生成占位', pattern: /未填写|待补充|你的角色名|（填表）|\(填表\)/u },
  { label: '调色盘格式占位', pattern: /\[底色\]|\[主色调\d*\]|\[点缀\]|\[具体场景和行为\]/u },
  {
    label: '多阶段残留',
    pattern:
      /multistage_persona|stage_early|stage_middle|stage_close|stage_common|多阶段调色盘|EJS|好感度|初识期\s*0\s*[~～-]\s*30|熟悉期\s*31\s*[~～-]\s*70|亲近期\s*71\s*[~～-]\s*100/u,
  },
  {
    label: '角色卡任务残留',
    pattern: /role_result|quick_view|角色速览|角色基础信息\s*YAML|角色正式名|aliases|role_name/u,
  },
];

function findFinalUserInfoArtifact(content: string): { label: string; match: string } | null {
  const value = String(content || '');
  for (const artifact of finalUserInfoForbiddenArtifacts) {
    const match = value.match(artifact.pattern)?.[0];
    if (match) {
      return { label: artifact.label, match };
    }
  }
  return null;
}

function assertFinalUserInfoConcrete(content: string): void {
  const hit = findFinalUserInfoArtifact(content);
  if (hit) {
    throw new Error(`用户信息像教程或模板内容：${hit.label}（${hit.match}），需重新生成。`);
  }
}

function sectionHeadingPattern(heading: string): RegExp {
  return new RegExp(String.raw`^\s*(?:\{\{\s*user\s*\}\}|[^\s：:\n<>]{1,40})?${heading}\s*[:：]?\s*$`, 'mu');
}

function readColonLineValue(content: string, label: string): string {
  const pattern = new RegExp(String.raw`^\s*(?:[-*]\s*)?${label}[:：]\s*(\S[^\n]*)\s*$`, 'mu');
  return content.match(pattern)?.[1]?.trim() ?? '';
}

function buildPaletteOpeningLine(content: string): string {
  const mainTone = readColonLineValue(content, '主色调');
  const bottomTone = readColonLineValue(content, '底色');
  if (!mainTone || !bottomTone) return '';
  return `性格调色盘:人的性格就像调色盘，${bottomTone}是底色，${mainTone}是主色调，由多种性格衍生组合而成才是活生生的人`;
}

function normalizeUserInfoForMode(content: string, mode: UserInfoGenerationMode): string {
  if (mode !== 'ai_plays_user') return content;
  if (/^\s*性格调色盘[:：]\s*人的性格就像调色盘/mu.test(content)) return content;

  const openingLine = buildPaletteOpeningLine(content);
  if (!openingLine) return content;

  const titlePattern = sectionHeadingPattern('性格调色盘');
  const titleMatch = content.match(titlePattern);
  if (titleMatch?.index !== undefined) {
    const insertAt = titleMatch.index + titleMatch[0].length;
    return `${content.slice(0, insertAt)}\n${openingLine}${content.slice(insertAt)}`;
  }

  const mainToneMatch = content.match(/^\s*主色调[:：]\s*\S[^\n]*\s*$/mu);
  if (mainToneMatch?.index === undefined) return content;
  return `${content.slice(0, mainToneMatch.index)}性格调色盘\n${openingLine}\n${content.slice(mainToneMatch.index)}`;
}

function assertUserInfoMatchesMode(content: string, mode: UserInfoGenerationMode): void {
  const value = String(content || '');

  if (mode === 'ai_plays_user') {
    const derivativeLinePattern = /^\s*[^：:\n]{1,40}(?:的)?衍生[一二三四五六七八九十\d]*[:：]\s*\S/mu;
    const derivativeCountPattern = /^\s*[^：:\n]{1,40}(?:的)?衍生[一二三四五六七八九十\d]*[:：]\s*\S/gmu;
    const requiredPatterns = [
      { label: '基础信息标题', pattern: sectionHeadingPattern('基础信息') },
      { label: '性格调色盘标题', pattern: sectionHeadingPattern('性格调色盘') },
      { label: '主色调', pattern: /^\s*主色调[:：]\s*\S/mu },
      { label: '底色', pattern: /^\s*底色[:：]\s*\S/mu },
      { label: '性格点缀', pattern: /^\s*性格点缀[:：]\s*\S/mu },
      { label: '衍生条目', pattern: derivativeLinePattern },
      { label: '扮演要点标题', pattern: sectionHeadingPattern('扮演要点') },
      { label: '描写限制标题', pattern: sectionHeadingPattern('描写限制') },
      { label: '代演边界标题', pattern: sectionHeadingPattern('代演边界') },
    ];
    const missing = requiredPatterns.filter(item => !item.pattern.test(value)).map(item => item.label);

    const findIndex = (pattern: RegExp) => value.match(pattern)?.index ?? -1;
    const titleIndex = findIndex(sectionHeadingPattern('性格调色盘'));
    const paletteLineIndex = findIndex(/^\s*性格调色盘[:：]\s*人的性格就像调色盘/mu);
    const mainToneIndex = findIndex(/^\s*主色调[:：]\s*\S/mu);
    const bottomToneIndex = findIndex(/^\s*底色[:：]\s*\S/mu);
    const accentIndex = findIndex(/^\s*性格点缀[:：]\s*\S/mu);
    const hasColorOrder =
      titleIndex >= 0 &&
      mainToneIndex >= 0 &&
      bottomToneIndex >= 0 &&
      accentIndex >= 0 &&
      titleIndex < mainToneIndex &&
      mainToneIndex < bottomToneIndex &&
      bottomToneIndex < accentIndex;
    const hasOpeningLineOrder =
      paletteLineIndex < 0 || (titleIndex >= 0 && titleIndex < paletteLineIndex && paletteLineIndex < mainToneIndex);
    if (!hasColorOrder || !hasOpeningLineOrder) missing.push('性格调色盘行顺序');

    const derivativeCount = (value.match(derivativeCountPattern) ?? []).length;
    if (derivativeCount < 4) missing.push('至少 4 条衍生');
    if (missing.length > 0) {
      throw new Error(`抢话用户信息缺少调色盘必需格式：${missing.join('、')}，需重新生成。`);
    }

    const bulletPaletteStructure = value.match(/^\s*[-*]\s*(?:主色调|底色|性格点缀)[:：]/mu)?.[0];
    if (bulletPaletteStructure) {
      throw new Error(`抢话用户信息调色盘不能写成项目符号版（${bulletPaletteStructure.trim()}），需重新生成。`);
    }

    if (sectionHeadingPattern('关键边界').test(value)) {
      throw new Error('抢话用户信息必须使用 {{user}}代演边界，不能使用 {{user}}关键边界。');
    }
    return;
  }

  const forbidden = value.match(/性格调色盘|底色|主色调|性格点缀|点缀|衍生/u)?.[0];
  if (forbidden) {
    throw new Error(`不抢话用户信息不应包含调色盘结构（${forbidden}），需重新生成。`);
  }
}

function requiredTag(value: string, tag: string, label: string): string {
  if (!hasTag(value, tag)) throw new Error(`用户信息生成缺少 ${label}，需重新生成`);
  const content = extractTag(value, tag);
  if (!content.trim()) throw new Error(`用户信息生成缺少 ${label}，需重新生成`);
  return content;
}

function buildUserSeed(data: CharacterData): string {
  return [
    `姓名：${data.name.trim() || '未填写'}`,
    `年龄：${Number.isFinite(data.age) ? data.age : '未填写'}`,
    `性别：${data.gender}`,
    '',
    '【外貌】',
    data.appearance.trim() || '未填写',
    '',
    '【背景】',
    data.personality.trim() || '未填写',
    '',
    '【用户信息概述（最高权重）】',
    data.palettePersonaOverview.trim() || '未填写',
    '',
    '【开局情景大纲】',
    data.openingSceneOutline?.trim() || '未填写',
  ].join('\n');
}

function buildUserInput(data: CharacterData, mode: UserInfoGenerationMode): string {
  return [
    '【用户信息生成】',
    `生成类型：${getModeLabel(mode)}`,
    '',
    '【已生成世界观】',
    '性斗学园开局用户信息生成；世界观只作为校园语境，不要把 user 写成 NPC。',
    '',
    '【用户素材】',
    buildUserSeed(data),
  ].join('\n');
}

function buildTaskInstruction(mode: UserInfoGenerationMode): string {
  return [
    '生成一份可直接写入酒馆用户设定的用户信息。',
    '本轮不是写 NPC，也不是写攻略对象；创作对象是 user 本人。',
    '本轮创作对象是用户本人，也就是玩家在性斗学园中扮演的 {{user}} / user。',
    '目标是让 AI 在后续互动中正确处理 user：当前模式要么用于扮演并续写 user，要么用于只读取并理解 user。',
    '如果【用户信息概述（最高权重）】有内容，必须优先依据它；姓名、年龄、性别、外貌、背景和开局情景只作为辅助语境。',
    '外貌与背景只保留对 AI 理解或扮演 user 有用的事实，不写无关装饰。',
    getModeInstruction(mode),
    ...(mode === 'ai_plays_user' ? ['', userPersonaPaletteReferencePrompt] : []),
    '不要写成文学化小说人设；用短句、分组和说明书式表达。',
    '每一行都必须是最终设定内容，不允许是写作指导。',
    '不要输出“这部分应该写什么”的教程说明，直接给最终用户信息正文。',
    '禁止输出创作过程、教程说明、模板说明、字段解释、检查清单或“这里应该写什么”。',
    '禁止出现模式标签、教程标签、结构标签、示例标签、占位内容或未填写字段。',
    '不要和用户对话，不要询问下一步。',
    '输出必须放在 <content><user_info>...</user_info></content> 中。',
    '<user_info> 内只写最终用户信息正文，不要写 XML 标签、代码块、二次解释、角色速览或多阶段内容。',
  ].join('\n');
}

function buildModeOutputRules(mode: UserInfoGenerationMode): string {
  if (mode === 'ai_plays_user') {
    return [
      '抢话模式额外铁律：',
      '- <user_info> 内必须包含以下五个成品标题：{{user}}基础信息、{{user}}性格调色盘、{{user}}扮演要点、{{user}}描写限制、{{user}}代演边界。',
      '- {{user}}性格调色盘 内必须严格使用下面的逐行格式：',
      '{{user}}性格调色盘',
      '性格调色盘:人的性格就像调色盘，[底色]是底色，[主色调]是主色调，由多种性格衍生组合而成才是活生生的人',
      '主色调：[主色调1]、[主色调2]',
      '底色：[底色]',
      '性格点缀：[点缀]',
      '[主色调1]衍生一：[具体场景和行为]',
      '[主色调1]衍生二：[具体场景和行为]',
      '[底色]衍生一：[具体场景和行为]',
      '[点缀]衍生一：[具体场景和行为]',
      '- 衍生条目必须写成“[性格]衍生一：具体场景和行为”这种格式，至少 4 条。',
      '- 不得把“主色调、底色、性格点缀”写成项目符号解释。',
      '- 不得用 {{user}}关键边界 替代 {{user}}代演边界。',
      '- 不得输出多阶段、好感度、EJS、角色速览或角色卡字段。',
    ].join('\n');
  }

  return [
    '不抢话模式额外铁律：',
    '- <user_info> 内不得出现性格调色盘、底色、主色调、性格点缀、点缀或衍生。',
    '- 只写行为理解、说话方式、情绪表达和互动边界。',
    '- 必须明确 AI 不扮演 {{user}}，不替 {{user}} 续写台词、心理或重大行动。',
  ].join('\n');
}

function buildOrderedPrompts(userInput: string, mode: UserInfoGenerationMode): RolePrompt[] {
  return [
    { role: 'system', content: userInfoWritingGuidePrompt },
    {
      role: 'system',
      content: ['<task_scope>', buildTaskInstruction(mode), '</task_scope>'].join('\n'),
    },
    {
      role: 'system',
      content: [
        '输出格式要求（强制执行）',
        '',
        '每次回复必须严格遵守以下结构：',
        '<content>',
        '<user_info>',
        '[最终用户信息正文]',
        '</user_info>',
        '</content>',
        '',
        '铁律：',
        '- 不得在标签外输出任何内容。',
        '- <user_info> 内必须是可直接写入用户设定的成品正文。',
        '- <user_info> 内不得出现教程、写法说明、示例、占位符或未填写字段。',
        '- 所有开标签必须闭合。',
        '',
        buildModeOutputRules(mode),
      ].join('\n'),
    },
    {
      role: 'user',
      content: userInput,
    },
  ];
}

function extractOpenTagContent(value: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startMatch = value.match(new RegExp(`<${escaped}>`, 'i'));
  if (!startMatch || startMatch.index === undefined) return '';

  const afterStart = value.slice(startMatch.index + startMatch[0].length);
  const endMatch = afterStart.match(new RegExp(`</${escaped}>`, 'i'));
  return stripCodeFence((endMatch?.index === undefined ? afterStart : afterStart.slice(0, endMatch.index)).trim());
}

export function formatPalettePersonaStreamPreview(fullText: string, mode: UserInfoGenerationMode): string {
  const content = extractContent(String(fullText || ''));
  const userInfo = normalizeUserInfoForMode(extractOpenTagContent(content, 'user_info'), mode);
  if (!userInfo || !isPersonaContentClean(userInfo) || findFinalUserInfoArtifact(userInfo)) return '';
  try {
    assertUserInfoMatchesMode(userInfo, mode);
    return userInfo;
  } catch {
    return '';
  }
}

function formatUserInfoResult(raw: string, mode: UserInfoGenerationMode): PalettePersonaGenerationResult {
  const content = extractContent(raw);
  const userInfo = normalizeUserInfoForMode(stripCodeFence(requiredTag(content, 'user_info', '<user_info>')), mode);

  assertPersonaContentClean('用户信息', userInfo);
  assertFinalUserInfoConcrete(userInfo);
  assertUserInfoMatchesMode(userInfo, mode);
  return {
    appearance: '',
    background: '',
    palette: userInfo,
  };
}

export async function generatePalettePersona(
  data: CharacterData,
  options: GeneratePalettePersonaOptions = {},
): Promise<PalettePersonaGenerationResult> {
  if (typeof generateRaw !== 'function') {
    throw new Error('当前酒馆环境不支持 generateRaw，无法调用主 API 生成用户信息。');
  }

  const mode = options.mode ?? 'ai_reads_user';
  const userInput = buildUserInput(data, mode);
  const generationId = `xuedou-user-info-${mode}-${Date.now()}`;
  const streamListener =
    typeof eventOn === 'function' && typeof iframe_events !== 'undefined' && iframe_events.STREAM_TOKEN_RECEIVED_FULLY
      ? eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, (fullText: string, streamGenerationId?: string) => {
          if (streamGenerationId && streamGenerationId !== generationId) return;
          options.onStream?.(formatPalettePersonaStreamPreview(fullText, mode));
        })
      : null;

  try {
    const raw = await generateRaw({
      generation_id: generationId,
      user_input: userInput,
      ordered_prompts: buildOrderedPrompts(userInput, mode),
      overrides: {
        world_info_before: '',
        persona_description: '',
        char_description: '',
        char_personality: '',
        scenario: '',
        world_info_after: '',
        dialogue_examples: '',
        chat_history: {
          with_depth_entries: false,
          author_note: '',
          prompts: [],
        },
      },
      max_chat_history: 0,
      should_stream: true,
      should_silence: true,
    });

    const formatted = formatUserInfoResult(extractGeneratedText(raw), mode);
    if (!formatted.palette.trim()) throw new Error('主 API 返回为空，请稍后重试。');
    return formatted;
  } finally {
    streamListener?.stop();
  }
}
