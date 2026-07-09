/**
 * 性斗学园持久变量维护脚本
 *
 * 监听 MVU 变量变化，只维护需要持久化的事实：
 * - 快感达到上限时触发高潮与贤者时间
 * - 经验升级、满级经验转金币
 * - 段位随等级更新
 * - 好感度满时解锁对应角色全部 CG
 *
 * 实时战斗属性由界面/shared selector 计算，不再写回 MVU。
 */

import { get, isEqual, set } from '@/util/common';
import { createScriptIdDiv, deteleportStyle, teleportStyle } from '@/util/script';
import {
  migrateLegacyCGUnlocksToCharacterVariables,
  unlockMaxFavorCharacterCGsFromMvuData,
} from '../shared/cgUnlockStore';
import { unlockAvatarVariationsFromMvuData } from '../shared/avatarVariationStore';
import { getLatestMvuData, replaceLatestMvuData, waitForMvu } from '../shared/mvuStore';
import { syncCurrentChatUserInfoToPersona } from '../shared/userWorldbookSync';
import { shouldTriggerOrgasm } from '../开局/utils/combat-calculator';
import StatusBarWrapper from './components/StatusBarWrapper.vue';
import { getDailyTalentEffect } from './data/talentDatabase';
import { installBackstreetMainPromptInjector } from './phone/mainPromptInjector';
import { registerScriptUpdateGlobals, scheduleScriptUpdateCheck } from './scriptUpdater';

/**
 * 规范化名字：去除中间点、空白等不影响身份的字符
 * 例如："雪莉·克里姆希尔德" -> "雪莉克里姆希尔德"
 * @param name 原始名称
 * @returns 去除特殊字符后的名称
 */
function normalizeName(name: string): string {
  return String(name || '')
    .trim()
    .replace(/[·・‧•\s\u3000._\-\u2014]/g, '');
}

type CharacterAliasTarget = string | string[];

const CANONICAL_CHARACTER_NAMES = [
  '伊甸阿斯莫德',
  '白石响子',
  '弗洛拉梅斯梅尔',
  '布伦希尔德',
  '维多利亚戈德温',
  '艾丽卡施耐德',
  '雪莉克里姆希尔德',
  '白川千夏',
  '艾米丽威廉姆斯',
  '安娜科兹洛娃',
  '克劳迪娅威斯特',
  '中岛诗织',
  '黑塔小姐',
  '露娜拉克缇丝',
  '伊丽莎白夜羽',
  '樱岛麻衣',
  '潘多拉小姐',
  '阿米莉亚安斯华斯',
  '森莉花',
  '如月诗乃',
  '樱井结衣',
  '角楯花凛',
  '月城遥',
  '上杉亚衣',
  '天宫院抚子',
  '索亚伊万诺娃',
  '九条凛音',
  '赤城朱音',
  '蓝原结衣',
  '橘美玲',
  '克里奥佩特拉七世',
  '星野光',
  '望月静',
  '早坂蕾娜',
  '伊尼亚德瓦卢瓦',
  '小鸟游雏子',
  '猫宫宁宁',
  '犬饲真子',
  '娜塔莎斯迈尔',
  '铃木惠美',
  '山田花子',
  '佐藤幸子',
  '沐芯兰',
  '伊甸芙宁',
  '艾格妮丝',
  '绫濑川',
  '维纳斯',
  '索菲亚',
  '莉莉安',
  '加藤鹰',
  '佐藤健',
  '艾琳海德',
  '神崎凛',
  '爱丽丝温特',
  '莎拉斯通',
  '明日香',
  '赵婷婷',
  '李小云',
  '月下香',
  '蝶',
  '雪',
  '风',
  '田中勇',
  '李强',
  '安琪',
  '美咲绫',
  '零',
  '桃乃爱',
  '风音',
  '铃音',
  '凰天羽',
  '娜拉',
  '芙莲',
  '克莉丝汀',
  '伽拉娜',
  '露美',
  '墨柒',
  '缪斯',
  '响木天音',
  '维斯伊尔',
  '米莉',
  '梅朵',
  '玄霜',
  '青鸢',
  '云溪',
  '梅菲丝',
  '贝阿切丝特',
  '特蕾莎',
  '玛利亚',
  '赛莲',
  '夏洛特',
  '柳烟霞',
  '菲奥娜',
  '贝尔芬格',
  '淫蛇女妖',
  '淫虎娘',
  '女吊',
  '夜叉娘',
  '霜凝',
  '无常',
  '堕落人偶',
  '狼娘',
  '恶灵娘',
  '南瓜头娘',
  '希思',
  '阿曼达',
  '薇尔',
  '僵尸天羽',
  '阿娜温',
  '黑暗史莱姆',
  '石像鬼娘',
  '暗精灵娘',
  '八尺夫人',
  '克洛伊',
  '万魔之母',
  '鬼巫女椿',
  '鬼樱',
  '玉藻前',
  '灵樱',
  '猫又',
  '天狗',
  '络新妇',
  '雪女',
] as const;

const CHARACTER_NAME_ALIASES: Record<string, CharacterAliasTarget> = {
  阿斯莫德: '伊甸阿斯莫德',
  白石: '白石响子',
  响子: '白石响子',
  弗洛拉: '弗洛拉梅斯梅尔',
  梅斯梅尔: '弗洛拉梅斯梅尔',
  布伦: '布伦希尔德',
  女武神: '布伦希尔德',
  维多利亚: '维多利亚戈德温',
  戈德温: '维多利亚戈德温',
  艾丽卡: '艾丽卡施耐德',
  施耐德: '艾丽卡施耐德',
  雪莉: '雪莉克里姆希尔德',
  克里姆: '雪莉克里姆希尔德',
  克里姆希尔德: '雪莉克里姆希尔德',
  白川: '白川千夏',
  千夏: '白川千夏',
  艾米丽: '艾米丽威廉姆斯',
  威廉姆斯: '艾米丽威廉姆斯',
  安娜: '安娜科兹洛娃',
  科兹洛娃: '安娜科兹洛娃',
  克劳迪娅: '克劳迪娅威斯特',
  威斯特: '克劳迪娅威斯特',
  中岛: '中岛诗织',
  诗织: '中岛诗织',
  黑塔: '黑塔小姐',
  露娜: '露娜拉克缇丝',
  拉克缇丝: '露娜拉克缇丝',
  伊丽莎白: '伊丽莎白夜羽',
  夜羽: '伊丽莎白夜羽',
  樱岛: '樱岛麻衣',
  麻衣: '樱岛麻衣',
  潘多拉: '潘多拉小姐',
  阿米莉亚: '阿米莉亚安斯华斯',
  安斯华斯: '阿米莉亚安斯华斯',
  森: '森莉花',
  莉花: '森莉花',
  如月: '如月诗乃',
  诗乃: '如月诗乃',
  樱井: '樱井结衣',
  结衣: '樱井结衣',
  角楯: '角楯花凛',
  花凛: '角楯花凛',
  月城: '月城遥',
  遥: '月城遥',
  上杉: '上杉亚衣',
  亚衣: '上杉亚衣',
  天宫院: '天宫院抚子',
  抚子: '天宫院抚子',
  索亚: '索亚伊万诺娃',
  伊万诺娃: '索亚伊万诺娃',
  九条: '九条凛音',
  凛音: '九条凛音',
  赤城: '赤城朱音',
  朱音: '赤城朱音',
  蓝原: '蓝原结衣',
  橘: '橘美玲',
  美玲: '橘美玲',
  克里奥: '克里奥佩特拉七世',
  克里奥佩特拉: '克里奥佩特拉七世',
  佩特拉: '克里奥佩特拉七世',
  七世: '克里奥佩特拉七世',
  星野: '星野光',
  光: '星野光',
  望月: '望月静',
  静: '望月静',
  早坂: '早坂蕾娜',
  蕾娜: '早坂蕾娜',
  伊尼亚: '伊尼亚德瓦卢瓦',
  德瓦卢瓦: '伊尼亚德瓦卢瓦',
  小鸟游: '小鸟游雏子',
  雏子: '小鸟游雏子',
  猫宫: '猫宫宁宁',
  宁宁: '猫宫宁宁',
  犬饲: '犬饲真子',
  真子: '犬饲真子',
  娜塔莎: '娜塔莎斯迈尔',
  斯迈尔: '娜塔莎斯迈尔',
  铃木: '铃木惠美',
  惠美: '铃木惠美',
  山田: '山田花子',
  花子: '山田花子',
  茉莉: '沐芯兰',
  芙宁: '伊甸芙宁',
  蔷薇: '艾格妮丝',
  神崎: '神崎凛',
  莎拉: '莎拉斯通',
  斯通: '莎拉斯通',
  桃乃: '桃乃爱',
  天羽: '凰天羽',
  风音和铃音: ['风音', '铃音'],
  风音与铃音: ['风音', '铃音'],
  双子巫女: ['风音', '铃音'],
  无常姐妹: '无常',
  黑白无常: '无常',
  黑无常: '无常',
  白无常: '无常',
  无常_小黑: '无常',
  无常_小白: '无常',
  无常_双人: '无常',
  鬼童子: '夜叉娘',
  蛛娘: '络新妇',
};

const COMBAT_ENEMY_NAME_ALIASES: Record<string, string> = {
  无常: '无常',
  无常姐妹: '无常',
  黑白无常: '无常',
  黑无常: '无常',
  白无常: '无常',
  无常_小黑: '无常',
  无常_小白: '无常',
  无常_双人: '无常',
};

const CANONICAL_CHARACTER_NAME_MAP = new Map(CANONICAL_CHARACTER_NAMES.map(name => [normalizeName(name), name]));
const CHARACTER_ALIAS_MAP = new Map(
  Object.entries(CHARACTER_NAME_ALIASES).map(([alias, target]) => [normalizeName(alias), target] as const),
);
const COMBAT_ENEMY_ALIAS_MAP = new Map(
  Object.entries(COMBAT_ENEMY_NAME_ALIASES).map(([alias, target]) => [normalizeName(alias), target] as const),
);

function splitCharacterNameList(value: unknown): string[] {
  const rawItems = Array.isArray(value) ? value : [value];
  return rawItems
    .flatMap(item => String(item || '').split(/[，,、|/；;]+/))
    .map(item => item.trim())
    .filter(Boolean);
}

function resolveCanonicalCharacterTargets(name: unknown): string[] {
  const normalizedName = normalizeName(String(name || ''));
  if (!normalizedName) return [];

  const canonicalName = CANONICAL_CHARACTER_NAME_MAP.get(normalizedName);
  if (canonicalName) return [canonicalName];

  const aliasTarget = CHARACTER_ALIAS_MAP.get(normalizedName);
  if (!aliasTarget) return [String(name || '').trim()].filter(Boolean);

  return Array.isArray(aliasTarget) ? aliasTarget : [aliasTarget];
}

function resolveCanonicalCharacterName(name: unknown): string {
  return resolveCanonicalCharacterTargets(name)[0] || String(name || '').trim();
}

function resolveCanonicalCombatEnemyName(name: unknown): string {
  const normalizedName = normalizeName(String(name || ''));
  if (!normalizedName) return '';

  return COMBAT_ENEMY_ALIAS_MAP.get(normalizedName) || resolveCanonicalCharacterName(name);
}

function uniqueCharacterNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const name of names) {
    if (!name || seen.has(name)) continue;
    seen.add(name);
    result.push(name);
  }

  return result;
}

function areStringArraysEqual(lhs: string[], rhs: string[]): boolean {
  return lhs.length === rhs.length && lhs.every((value, index) => value === rhs[index]);
}

function pickStrongerDominance(existingValue: unknown, incomingValue: unknown): number {
  const existingDominance = Number(existingValue || 0);
  const incomingDominance = Number(incomingValue || 0);
  if (!Number.isFinite(existingDominance)) return Number.isFinite(incomingDominance) ? incomingDominance : 0;
  if (!Number.isFinite(incomingDominance)) return existingDominance;
  return Math.abs(incomingDominance) > Math.abs(existingDominance) ? incomingDominance : existingDominance;
}

function mergeOathValue(existingValue: unknown, incomingValue: unknown): string {
  const existingOath = String(existingValue || '无');
  const incomingOath = String(incomingValue || '无');
  if (existingOath && existingOath !== '无') return existingOath;
  if (incomingOath && incomingOath !== '无') return incomingOath;
  return '无';
}

function mergeRelationshipData(existingData: any, incomingData: any): any {
  if (!existingData || typeof existingData !== 'object') return incomingData;
  if (!incomingData || typeof incomingData !== 'object') return existingData;

  const merged = { ...existingData, ...incomingData };
  merged.好感度 = Math.max(Number(existingData.好感度 || 0), Number(incomingData.好感度 || 0));
  merged.支配度 = pickStrongerDominance(existingData.支配度, incomingData.支配度);
  merged.誓约 = mergeOathValue(existingData.誓约, incomingData.誓约);
  return merged;
}

function normalizeCharacterNamesInMvuData(mvuData: Mvu.MvuData): { changed: boolean; logs: string[] } {
  const statData = mvuData?.stat_data as Record<string, any> | undefined;
  if (!statData) return { changed: false, logs: [] };

  let changed = false;
  const logs: string[] = [];
  const relationships = get(statData, '关系系统', {}) as Record<string, any>;

  if (relationships && typeof relationships === 'object') {
    for (const key of Object.keys(relationships)) {
      if (key === '在场人物') continue;

      const canonicalKey = resolveCanonicalCharacterName(key);
      if (canonicalKey && canonicalKey !== key) {
        relationships[canonicalKey] = mergeRelationshipData(relationships[canonicalKey], relationships[key]);
        delete relationships[key];
        changed = true;
        logs.push(`关系系统 "${key}" -> "${canonicalKey}"`);
      }
    }

    const presentCharacters = relationships['在场人物'];
    const normalizedCharacters = uniqueCharacterNames(
      splitCharacterNameList(presentCharacters).flatMap(name => resolveCanonicalCharacterTargets(name)),
    );

    if (!Array.isArray(presentCharacters) || !areStringArraysEqual(presentCharacters, normalizedCharacters)) {
      relationships['在场人物'] = normalizedCharacters;
      changed = true;
      logs.push(`在场人物 -> ${normalizedCharacters.join(', ') || '空'}`);
    }

    set(statData, '关系系统', relationships);
  }

  const enemyName = get(statData, '性斗系统.对手名称', '');
  if (typeof enemyName === 'string' && enemyName.trim()) {
    const canonicalEnemyName = resolveCanonicalCombatEnemyName(enemyName);
    if (canonicalEnemyName && canonicalEnemyName !== enemyName) {
      set(statData, '性斗系统.对手名称', canonicalEnemyName);
      changed = true;
      logs.push(`对手名称 "${enemyName}" -> "${canonicalEnemyName}"`);
    }
  }

  return { changed, logs };
}

function clonePlainData<T>(value: T): T {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function isBackpackEquipmentItem(item: any): boolean {
  return !!item && typeof item === 'object' && item.类型 === '装备';
}

function collectEquippedEquipmentNames(statData: Record<string, any>): Set<string> {
  const equippedNames = new Set<string>();
  const slots = get(statData, '物品系统._装备栏', {}) as Record<string, any>;

  if (!slots || typeof slots !== 'object') {
    return equippedNames;
  }

  for (const slot of Object.values(slots)) {
    const equipmentName = String((slot as any)?.名称 || '').trim();
    if (equipmentName) {
      equippedNames.add(equipmentName);
    }
  }

  return equippedNames;
}

function normalizeBackpackEquipmentsInMvuData(
  mvuData: Mvu.MvuData,
  previousMvuData?: Mvu.MvuData | null,
): { changed: boolean; logs: string[] } {
  const statData = mvuData?.stat_data as Record<string, any> | undefined;
  if (!statData) return { changed: false, logs: [] };

  const backpack = get(statData, '物品系统.背包', {}) as Record<string, any>;
  if (!backpack || typeof backpack !== 'object') {
    return { changed: false, logs: [] };
  }

  const previousBackpack = get(previousMvuData?.stat_data, '物品系统.背包', {}) as Record<string, any>;
  const equippedNames = collectEquippedEquipmentNames(statData);
  let changed = false;
  const logs: string[] = [];

  for (const [itemName, item] of Object.entries(backpack)) {
    if (!isBackpackEquipmentItem(item)) continue;

    const previousItem = previousBackpack?.[itemName];
    if (isBackpackEquipmentItem(previousItem)) {
      if (!isEqual(item, previousItem)) {
        backpack[itemName] = clonePlainData(previousItem);
        changed = true;
        logs.push(`重复装备 "${itemName}" 已还原`);
      }
      continue;
    }

    if (equippedNames.has(itemName)) {
      delete backpack[itemName];
      changed = true;
      logs.push(`已装备的重复装备 "${itemName}" 已忽略`);
      continue;
    }

    if ((item as any).数量 !== 1) {
      (item as any).数量 = 1;
      changed = true;
      logs.push(`装备 "${itemName}" 数量已固定为 1`);
    }
  }

  if (changed) {
    set(statData, '物品系统.背包', backpack);
  }

  return { changed, logs };
}

// 等待 MVU 初始化（带安全检查和超时）
const globalAny = window as any;
installBackstreetMainPromptInjector();

if (typeof globalAny.waitGlobalInitialized === 'function') {
  try {
    // 添加超时保护：最多等待10秒
    const waitPromise = globalAny.waitGlobalInitialized('Mvu');
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('等待MVU初始化超时')), 10000));
    await Promise.race([waitPromise, timeoutPromise]);
  } catch (error) {
    console.warn('[性斗学园脚本] 等待MVU初始化失败，继续执行:', error);
  }
} else {
  console.warn('[性斗学园脚本] waitGlobalInitialized 函数不存在，跳过等待');
  // 等待一小段时间让全局变量初始化
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * 启动校验：数值上限保护
 * - 潜力 > 10 → 警告并修正为 10
 * - 属性点/技能点 > 500 → 警告并清零
 */
async function enforcePotentialCapOnStartup() {
  try {
    const mvuData = await getLatestMvuData();
    if (!mvuData || !mvuData.stat_data) {
      console.warn('[性斗学园脚本] 无法获取 MVU 数据，跳过启动校验');
      return;
    }

    let hasChanges = false;
    let hasNegative = false;
    const warnings: string[] = [];

    // 1. 检测潜力上限
    const rawPotential = get(mvuData.stat_data, '核心状态._潜力', 0);
    const potential = Number(rawPotential);

    if (Number.isFinite(potential) && potential > 10) {
      console.warn(`[性斗学园脚本] 检测到潜力异常：${potential} (> 10)。是否偷偷改数值了？将自动修正为 10。`);
      warnings.push(`潜力异常：${potential}（>10）`);
      set(mvuData.stat_data, '核心状态._潜力', 10);
      hasChanges = true;
    }

    // 2. 检测属性点上限
    const rawAttrPoints = get(mvuData.stat_data, '核心状态.$属性点', 0);
    const attrPoints = Number(rawAttrPoints);

    if (Number.isFinite(attrPoints) && attrPoints < 0) {
      console.warn(`[性斗学园脚本] 不要点那么快！检测到属性点为负数：${attrPoints}。已重置为 0。`);
      warnings.push(`属性点为负数：${attrPoints}`);
      set(mvuData.stat_data, '核心状态.$属性点', 0);
      hasChanges = true;
      hasNegative = true;
    }

    if (Number.isFinite(attrPoints) && attrPoints > 500) {
      console.warn(`[性斗学园脚本] 检测到属性点异常：${attrPoints} (> 500)。自动清零。`);
      warnings.push(`属性点异常：${attrPoints}（>500）`);
      set(mvuData.stat_data, '核心状态.$属性点', 0);
      hasChanges = true;
    }

    // 3. 检测技能点上限
    const rawSkillPoints = get(mvuData.stat_data, '核心状态.$技能点', 0);
    const skillPoints = Number(rawSkillPoints);

    if (Number.isFinite(skillPoints) && skillPoints < 0) {
      console.warn(`[性斗学园脚本] 不要点那么快！检测到技能点为负数：${skillPoints}。已重置为 0。`);
      warnings.push(`技能点为负数：${skillPoints}`);
      set(mvuData.stat_data, '核心状态.$技能点', 0);
      hasChanges = true;
      hasNegative = true;
    }

    if (Number.isFinite(skillPoints) && skillPoints > 500) {
      console.warn(`[性斗学园脚本] 检测到技能点异常：${skillPoints} (> 500)。自动清零。`);
      warnings.push(`技能点异常：${skillPoints}（>500）`);
      set(mvuData.stat_data, '核心状态.$技能点', 0);
      hasChanges = true;
    }

    // 统一提示并写回
    if (hasChanges) {
      if (warnings.length > 0 && typeof toastr !== 'undefined') {
        const message = hasNegative
          ? `不要点那么快！\n${warnings.join('\n')}\n已重置为 0。`
          : `你小子，是不是偷偷改我变量了？\n${warnings.join('\n')}\n给你改回去了。`;
        toastr.warning(message, hasNegative ? '😤' : '😈', { timeOut: 8000 });
      }
      await replaceLatestMvuData(mvuData);
      console.info('[性斗学园脚本] 启动校验完成，异常数值已修正');
    }
  } catch (error) {
    console.error('[性斗学园脚本] 启动校验时出错:', error);
  }
}

// 脚本启动即执行一次校验（防止历史存档/手改导致潜力越界）
await enforcePotentialCapOnStartup();

// 防止重复更新的标志
let isUpdating = false;
let isNormalizingCharacterNames = false;
let isNormalizingBackpackEquipments = false;

// 状态栏相关
let statusBarApp: any = null;
let statusBarContainer: JQuery<HTMLDivElement> | null = null;
let statusBarVisible = false;

async function normalizeLatestCharacterNames(reason: string) {
  if (isNormalizingCharacterNames) {
    return false;
  }

  try {
    isNormalizingCharacterNames = true;
    const mvuData = await getLatestMvuData();
    if (!mvuData || !mvuData.stat_data) {
      console.warn(`[性斗学园脚本] 无法获取 MVU 数据，跳过角色名规范化（${reason}）`);
      return false;
    }

    const result = normalizeCharacterNamesInMvuData(mvuData);
    if (!result.changed) {
      return false;
    }

    await replaceLatestMvuData(mvuData);
    console.info(`[性斗学园脚本] 角色名规范化完成（${reason}）：${result.logs.join('；')}`);
    return true;
  } catch (error) {
    console.error('[性斗学园脚本] 角色名规范化时出错:', error);
    return false;
  } finally {
    isNormalizingCharacterNames = false;
  }
}

await normalizeLatestCharacterNames('脚本启动');

async function normalizeLatestBackpackEquipments(reason: string, previousMvuData?: Mvu.MvuData | null) {
  if (isNormalizingBackpackEquipments) {
    return false;
  }

  try {
    isNormalizingBackpackEquipments = true;
    const mvuData = await getLatestMvuData();
    if (!mvuData || !mvuData.stat_data) {
      console.warn(`[性斗学园脚本] 无法获取 MVU 数据，跳过背包装备去重（${reason}）`);
      return false;
    }

    const result = normalizeBackpackEquipmentsInMvuData(mvuData, previousMvuData);
    if (!result.changed) {
      return false;
    }

    await replaceLatestMvuData(mvuData);
    console.info(`[性斗学园脚本] 背包装备去重完成（${reason}）：${result.logs.join('；')}`);
    return true;
  } catch (error) {
    console.error('[性斗学园脚本] 背包装备去重时出错:', error);
    return false;
  } finally {
    isNormalizingBackpackEquipments = false;
  }
}

await normalizeLatestBackpackEquipments('脚本启动');

/**
 * 从 MVU 数据中获取变量值（安全获取）
 */
function getValue(data: any, path: string, defaultValue: any = 0): any {
  return get(data, `stat_data.${path}`, defaultValue);
}

/**
 * 根据等级计算段位
 * - 无段位: 0-9
 * - D段: 10-19
 * - C段: 20-29
 * - B段: 30-39
 * - A段: 40-59
 * - S段: 60-79
 * - SS段: 80-99
 * - SSS段: 100
 */
function calculateRank(level: number): string {
  if (level >= 100) return 'SSS';
  if (level >= 80) return 'SS';
  if (level >= 60) return 'S';
  if (level >= 40) return 'A';
  if (level >= 30) return 'B';
  if (level >= 20) return 'C';
  if (level >= 10) return 'D';
  return '无段位';
}

const EXORCISM_MAZE_UNLOCK_LEVEL = 50;
const EXORCISM_MAZE_QUEST_NAME = '事件-EX 隐藏副本·驱魔迷宫';
const EXORCISM_MAZE_UNLOCK_FLAG = '性斗学园_驱魔迷宫_首次达到50级已解锁';

function readAllVariables(): Record<string, any> {
  try {
    return typeof globalAny.getAllVariables === 'function' ? globalAny.getAllVariables() || {} : {};
  } catch (error) {
    console.warn('[性斗学园脚本] 读取聊天变量失败:', error);
    return {};
  }
}

function isExorcismMazeUnlockRecorded(): boolean {
  return readAllVariables()[EXORCISM_MAZE_UNLOCK_FLAG] === true;
}

function markExorcismMazeUnlockRecorded() {
  try {
    if (typeof globalAny.insertOrAssignVariables === 'function') {
      globalAny.insertOrAssignVariables({ [EXORCISM_MAZE_UNLOCK_FLAG]: true }, { type: 'chat' });
    } else {
      console.warn('[性斗学园脚本] insertOrAssignVariables 不可用，无法写入驱魔迷宫首次解锁聊天变量');
    }
  } catch (error) {
    console.warn('[性斗学园脚本] 写入驱魔迷宫首次解锁聊天变量失败:', error);
  }
}

function isQuestInactive(status: unknown): boolean {
  return ['已完成', '已失败', '已放弃'].includes(String(status || ''));
}

function prepareExorcismMazeQuestUnlock(mvuData: Mvu.MvuData): { changed: boolean; shouldRecord: boolean } {
  const statData = mvuData?.stat_data as Record<string, any> | undefined;
  if (!statData) return { changed: false, shouldRecord: false };

  const level = Number(get(statData, '角色基础._等级', 1));
  if (!Number.isFinite(level) || level < EXORCISM_MAZE_UNLOCK_LEVEL) {
    return { changed: false, shouldRecord: false };
  }

  if (!statData.任务系统 || typeof statData.任务系统 !== 'object') {
    statData.任务系统 = {};
  }
  const taskSystem = statData.任务系统 as Record<string, any>;
  if (!taskSystem.支线任务 || typeof taskSystem.支线任务 !== 'object') {
    taskSystem.支线任务 = {};
  }

  const sideQuests = taskSystem.支线任务 as Record<string, any>;
  const existingQuest = sideQuests[EXORCISM_MAZE_QUEST_NAME];
  const mainQuestName = String(taskSystem.主线任务?.名称 || '');
  const mainQuestStatus = taskSystem.主线任务?.状态;
  const hasQuest = !!existingQuest || (mainQuestName.includes('驱魔迷宫') && !isQuestInactive(mainQuestStatus));
  const hasRecorded = isExorcismMazeUnlockRecorded();

  if (hasQuest) {
    return { changed: false, shouldRecord: !hasRecorded };
  }
  if (hasRecorded) {
    return { changed: false, shouldRecord: false };
  }

  sideQuests[EXORCISM_MAZE_QUEST_NAME] = {
    描述: '风音与铃音神社下方的古老封印出现异动。协助双子巫女深入地下五层迷宫，阻止“万魔之母”苏醒。',
    类型: '隐藏',
    状态: '进行中',
    目标: {
      解锁条件: '角色首次达到50级',
      当前阶段: '前往神社确认封印异动',
      地下层数: 5,
    },
    奖励: '封印回廊高阶奖励、稀有装备、隐藏剧情解锁',
    期限: '无',
  };

  console.info('[性斗学园脚本] 首次达到50级，已解锁隐藏任务：事件-EX 隐藏副本·驱魔迷宫');
  return { changed: true, shouldRecord: true };
}

function notifyCGUnlockRecordsUpdated(characters: string[], unlockedCount: number) {
  if (unlockedCount <= 0) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('cg-unlock-records-updated', {
      detail: {
        characters,
        unlockedCount,
      },
    }),
  );
}

/**
 * 独立更新段位（确保段位始终与等级匹配）
 */
async function updateRank() {
  try {
    const mvuData = await getLatestMvuData();
    if (!mvuData || !mvuData.stat_data) {
      console.warn('[性斗学园脚本] 无法获取 MVU 数据，跳过段位更新');
      return;
    }

    const level = getValue(mvuData, '角色基础._等级', 1);
    const expectedRank = calculateRank(level);
    const currentRank = get(mvuData.stat_data, '角色基础._段位', '无段位');

    if (expectedRank !== currentRank) {
      set(mvuData.stat_data, '角色基础._段位', expectedRank);
      await replaceLatestMvuData(mvuData);
      console.info(
        `[性斗学园脚本] [独立段位更新] 等级 ${level} → ${expectedRank}段 (从 "${currentRank}" 更新为 "${expectedRank}")`,
      );
    }
  } catch (error) {
    console.error('[性斗学园脚本] 独立段位更新时出错:', error);
  }
}

/**
 * 计算并更新所有依赖变量
 *
 * 计算顺序很重要：
 * 1. 先计算基础属性最终值（魅力、幸运、闪避、暴击）
 * 2. 再计算性斗力（依赖等级和潜力）
 * 3. 最后计算忍耐力（依赖等级和潜力）
 */
async function updateDependentVariables() {
  if (isUpdating) {
    return;
  }

  try {
    isUpdating = true;

    const mvuData = await getLatestMvuData();
    if (!mvuData || !mvuData.stat_data) {
      console.warn('[性斗学园脚本] 无法获取 MVU 数据，跳过更新');
      return;
    }

    const statData = mvuData.stat_data;
    const updates: Record<string, any> = {};

    const currentLevel = Number(getValue(mvuData, '角色基础._等级', 1) as any);
    const currentExp = Number(getValue(mvuData, '角色基础.经验值', 0) as any);
    const difficulty = String(getValue(mvuData, '角色基础.难度', '普通') as any);
    const potential = Number(getValue(mvuData, '核心状态._潜力', 5.0) as any);
    const talents = statData.技能系统?.$天赋 || {};
    const talentIds = Object.keys(talents);
    const currentTalentId = talentIds.length > 0 ? talentIds[0] : undefined;

    const currentLust = Number(getValue(mvuData, '核心状态.$快感', 0) as any);
    const maxLust = Number(getValue(mvuData, '核心状态.$最大快感', 100) as any);

    if (shouldTriggerOrgasm(currentLust, maxLust)) {
      const currentTempStates = statData.临时状态?.状态列表 || {};
      updates['核心状态.$快感'] = 0;
      updates['临时状态.状态列表'] = {
        ...currentTempStates,
        贤者时间: {
          加成: {
            基础性斗力成算: -20,
            基础忍耐力成算: 10,
          },
          剩余回合: 3,
          描述: '高潮后的短暂状态',
        },
      };
    }

    const baseExpNeededPerLevel = (() => {
      switch (difficulty) {
        case '简单':
          return 100;
        case '普通':
          return 125;
        case '困难':
          return 150;
        case '抖M':
          return 200;
        case '作弊':
          return 100;
        default:
          return 125;
      }
    })();

    const expReduction = getDailyTalentEffect(currentTalentId, 'exp_reduce');
    const expNeededPerLevel = Math.max(50, Math.floor((baseExpNeededPerLevel * (100 - expReduction)) / 100));

    let finalLevel = currentLevel;
    let finalExp = currentExp;

    if (finalLevel < 100 && finalExp >= expNeededPerLevel) {
      const levelsGained = Math.min(100 - finalLevel, Math.floor(finalExp / expNeededPerLevel));
      if (levelsGained > 0) {
        const newLevel = finalLevel + levelsGained;
        const remainingExp = finalExp - levelsGained * expNeededPerLevel;
        const attributePointsPerLevel = Math.floor(potential / 2);
        const skillPointsPerLevel = Math.floor(potential);
        const currentAttributePoints = Number(getValue(mvuData, '核心状态.$属性点', 0) as any);
        const currentSkillPoints = Number(getValue(mvuData, '核心状态.$技能点', 0) as any);

        updates['角色基础._等级'] = newLevel;
        updates['角色基础.经验值'] = remainingExp;
        updates['核心状态.$属性点'] = currentAttributePoints + levelsGained * attributePointsPerLevel;
        updates['核心状态.$技能点'] = currentSkillPoints + levelsGained * skillPointsPerLevel;

        finalLevel = newLevel;
        finalExp = remainingExp;
      }
    }

    if (finalLevel >= 100 && finalExp > 0) {
      const goldEarned = finalExp * 200;
      const currentGold = Number(getValue(mvuData, '物品系统.学园金币', 0) as any);
      updates['角色基础.经验值'] = 0;
      updates['物品系统.学园金币'] = currentGold + goldEarned;
      console.info(
        `[性斗学园脚本] 满级经验转金币：${finalExp}经验 → ${goldEarned}金币 (总金币: ${currentGold + goldEarned})`,
      );
      finalExp = 0;
    }

    const expectedRank = calculateRank(finalLevel);
    const currentRank = get(mvuData.stat_data, '角色基础._段位', '无段位');
    if (expectedRank !== currentRank) {
      updates['角色基础._段位'] = expectedRank;
    }

    if (Object.keys(updates).length > 0) {
      for (const [path, value] of Object.entries(updates)) {
        set(mvuData.stat_data, path, value);
      }
    }

    const exorcismMazeUnlock = prepareExorcismMazeQuestUnlock(mvuData);

    if (Object.keys(updates).length > 0 || exorcismMazeUnlock.changed) {
      await replaceLatestMvuData(mvuData);
    }
    if (exorcismMazeUnlock.shouldRecord) {
      markExorcismMazeUnlockRecorded();
    }
    const legacyCGMigration = await migrateLegacyCGUnlocksToCharacterVariables(mvuData);
    const maxFavorCGUnlock = await unlockMaxFavorCharacterCGsFromMvuData(mvuData);
    const avatarVariationUnlock = await unlockAvatarVariationsFromMvuData(mvuData);

    if (legacyCGMigration.changed) {
      console.info(`[性斗学园脚本] 已将旧版本地CG记录迁移至角色变量：${legacyCGMigration.unlockedCount} 张`);
      notifyCGUnlockRecordsUpdated(legacyCGMigration.characters, legacyCGMigration.unlockedCount);
    }
    if (maxFavorCGUnlock.changed) {
      console.info(
        `[性斗学园脚本] 好感度已满，自动解锁角色CG：${maxFavorCGUnlock.characters.join('、')}，新增 ${maxFavorCGUnlock.unlockedCount} 张`,
      );
      notifyCGUnlockRecordsUpdated(maxFavorCGUnlock.characters, maxFavorCGUnlock.unlockedCount);
    }
    if (avatarVariationUnlock.changed) {
      console.info(
        `[性斗学园脚本] 自动解锁头像差分：${avatarVariationUnlock.characters.join('、')}，新增 ${avatarVariationUnlock.unlockedCount} 张`,
      );
    }
  } catch (error) {
    console.error('[性斗学园脚本] 更新持久变量时出错:', error);
    toastr.error('数值更新出错，请查看控制台', '脚本错误', { timeOut: 5000 });
  } finally {
    isUpdating = false;
  }
}

/**
 * 注册 MVU 事件监听器（需要在 MVU 初始化后调用）
 */
function registerMvuEventListeners() {
  if (typeof Mvu === 'undefined' || !Mvu) {
    console.warn('[性斗学园脚本] Mvu 不存在，无法注册事件监听器');
    return false;
  }

  try {
    /**
     * 监听 MVU 变量更新事件
     * 在变量更新结束后，重新计算所有依赖的变量
     */
    eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, async (variables, variables_before_update) => {
      console.info('[性斗学园脚本] 检测到 MVU 变量更新事件');

      const normalizePreview = normalizeCharacterNamesInMvuData(variables);
      if (normalizePreview.changed) {
        console.info(`[性斗学园脚本] 检测到角色名需要规范化：${normalizePreview.logs.join('；')}`);
        setTimeout(async () => {
          await normalizeLatestCharacterNames('MVU变量更新');
        }, 50);
      }

      const backpackEquipmentPreview = normalizeBackpackEquipmentsInMvuData(
        clonePlainData(variables),
        variables_before_update,
      );
      if (backpackEquipmentPreview.changed) {
        console.info(`[性斗学园脚本] 检测到重复装备需要忽略：${backpackEquipmentPreview.logs.join('；')}`);
        setTimeout(async () => {
          await normalizeLatestBackpackEquipments('MVU变量更新', variables_before_update);
        }, 50);
      }

      // 检查会影响持久派生事务的变量变化：高潮处理、升级、段位、满好感CG。
      const basePaths = [
        '角色基础._等级',
        '角色基础.经验值',
        '角色基础.难度',
        '角色基础._段位', // 段位变化时也需要重新检查并更新
        '核心状态._潜力',
        '核心状态.$最大快感',
        '核心状态.$快感',
        '技能系统.$天赋',
        '关系系统',
      ];

      let hasBaseChange = false;
      const changedPaths: string[] = [];

      for (const path of basePaths) {
        const oldValue = get(variables_before_update, `stat_data.${path}`);
        const newValue = get(variables, `stat_data.${path}`);

        // 使用深度比较，因为可能是对象
        if (!isEqual(oldValue, newValue)) {
          hasBaseChange = true;
          changedPaths.push(path);
          console.info(`[性斗学园脚本] 检测到变量变化: ${path}`, { oldValue, newValue });
        }
      }

      // 如果有基础变量变化，更新依赖变量
      if (hasBaseChange) {
        console.info(`[性斗学园脚本] 检测到 ${changedPaths.length} 个变量变化，开始更新依赖变量`);
        // 使用 setTimeout 避免在事件处理中直接更新导致的问题
        setTimeout(async () => {
          await updateDependentVariables();
        }, 100); // 稍微延迟确保数据已完全写入
      }
    });

    /**
     * 监听变量初始化事件
     * 在变量初始化后，计算初始的依赖变量值
     */
    eventOn(Mvu.events.VARIABLE_INITIALIZED, async () => {
      scheduleCurrentChatUserInfoSync('变量初始化', [200, 1000, 2500, 5000]);
      await enforcePotentialCapOnStartup();
      await normalizeLatestCharacterNames('变量初始化');
      await normalizeLatestBackpackEquipments('变量初始化');
      await updateDependentVariables();
    });

    console.info('[性斗学园脚本] MVU 事件监听器注册成功');
    return true;
  } catch (error) {
    console.error('[性斗学园脚本] 注册 MVU 事件监听器失败:', error);
    return false;
  }
}

// 尝试注册 MVU 事件监听器
registerMvuEventListeners();

/**
 * 处理对话后的耐力和快感更新
 * 每次对话后：恢复10%最大耐力，降低10%最大快感（向下取整）
 */
async function handleConversationUpdate() {
  try {
    const mvuData = await getLatestMvuData();
    if (!mvuData || !mvuData.stat_data) {
      console.warn('[性斗学园脚本] 无法获取 MVU 数据，跳过对话更新');
      return;
    }

    const statData = mvuData.stat_data;

    // 获取当前天赋ID
    const talents = statData.技能系统?.$天赋;
    const currentTalentId = talents && Object.keys(talents).length > 0 ? Object.keys(talents)[0] : undefined;

    // 获取天赋效果倍率
    const staminaMultiplier = getDailyTalentEffect(currentTalentId, 'stamina_recovery_double') || 1;
    const pleasureMultiplier = getDailyTalentEffect(currentTalentId, 'pleasure_reduce_double') || 1;

    // 获取当前耐力和快感值
    const currentStamina = getValue(mvuData, '核心状态.$耐力', 0);
    const maxStamina = getValue(mvuData, '核心状态.$最大耐力', 100);
    const currentLust = getValue(mvuData, '核心状态.$快感', 0);
    const maxLust = getValue(mvuData, '核心状态.$最大快感', 100);

    // 计算恢复/降低量（10%最大值，向下取整，应用天赋倍率）
    const staminaRecover = Math.floor(maxStamina * 0.1 * staminaMultiplier);
    const lustReduce = Math.floor(maxLust * 0.1 * pleasureMultiplier);

    // 计算新值（带上下限限制）
    const newStamina = Math.min(maxStamina, Math.max(0, currentStamina + staminaRecover));
    const newLust = Math.max(0, currentLust - lustReduce);

    // 更新值
    set(statData, '核心状态.$耐力', newStamina);
    set(statData, '核心状态.$快感', newLust);

    // 写回 MVU 数据
    await replaceLatestMvuData(mvuData);

    console.info(
      `[性斗学园脚本] 对话后更新：耐力 ${currentStamina} → ${newStamina} (+${staminaRecover}), 快感 ${currentLust} → ${newLust} (-${lustReduce})`,
    );
  } catch (error) {
    console.error('[性斗学园脚本] 对话更新时出错:', error);
  }
}

/**
 * 监听消息接收事件（AI回复后触发）
 * 每次对话后更新耐力和快感
 */
// tavern_events 在脚本环境中是全局可用的
if (typeof tavern_events !== 'undefined' && tavern_events.MESSAGE_RECEIVED) {
  eventOn(tavern_events.MESSAGE_RECEIVED, async () => {
    console.info('[性斗学园脚本] 检测到消息接收事件，开始更新对话后的状态');
    // 延迟一点执行，确保消息已完全更新
    setTimeout(async () => {
      await normalizeLatestCharacterNames('AI回复后');
      await handleConversationUpdate();
      // 对话后也需要重新计算依赖变量
      await updateDependentVariables();
    }, 200);
  });
  console.info('[性斗学园脚本] 已注册对话后状态更新监听器');
} else {
  console.warn('[性斗学园脚本] tavern_events.MESSAGE_RECEIVED 不可用，无法监听对话事件');
}

let syncUserInfoTimers: ReturnType<typeof setTimeout>[] = [];

function clearUserInfoSyncTimers() {
  for (const timer of syncUserInfoTimers) {
    clearTimeout(timer);
  }
  syncUserInfoTimers = [];
}

function getCurrentChatIdForLog(): string {
  const globalAny = window as any;
  return String(globalAny.SillyTavern?.getCurrentChatId?.() || 'unknown');
}

function scheduleCurrentChatUserInfoSync(reason: string, delays: number[] = [300, 1000, 2500, 5000, 8000]) {
  clearUserInfoSyncTimers();

  const scheduledChatId = getCurrentChatIdForLog();
  syncUserInfoTimers = delays.map((delay, index) =>
    setTimeout(() => {
      errorCatched(async () => {
        const currentChatId = getCurrentChatIdForLog();
        console.info(
          `[性斗学园脚本] ${reason}：第 ${index + 1}/${delays.length} 次同步当前聊天用户信息到酒馆用户人设`,
          { scheduledChatId, currentChatId, delay },
        );

        const synced = await syncCurrentChatUserInfoToPersona('[性斗学园脚本]');
        if (synced) {
          clearUserInfoSyncTimers();
        }
      })();
    }, delay),
  );
}

if (typeof tavern_events !== 'undefined' && tavern_events.CHAT_CHANGED) {
  eventOn(tavern_events.CHAT_CHANGED, () => {
    scheduleCurrentChatUserInfoSync('聊天切换', [300, 1000, 2500, 5000, 8000]);
  });
  console.info('[性斗学园脚本] 已注册聊天切换用户人设同步监听器');
} else {
  console.warn('[性斗学园脚本] tavern_events.CHAT_CHANGED 不可用，无法监听聊天切换同步用户人设');
}

/**
 * 等待 MVU 初始化完成（带重试机制）
 */
async function waitForMvuReady(maxRetries = 20, interval = 500): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    if (await waitForMvu()) {
      console.info(`[性斗学园脚本] MVU 已就绪 (第 ${i + 1} 次检查)`);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  console.error('[性斗学园脚本] 等待 MVU 初始化超时');
  return false;
}

/**
 * 初始化时执行一次计算
 */
$(() => {
  // 显示加载提示
  toastr.success('性斗学园数值计算脚本已启动', '脚本加载成功', {
    timeOut: 3000,
    progressBar: true,
  });

  errorCatched(async () => {
    // 等待 MVU 初始化完成
    const mvuReady = await waitForMvuReady();
    if (!mvuReady) {
      toastr.error('MVU 初始化超时，脚本功能可能受限', '初始化警告', { timeOut: 5000 });
      return;
    }

    // MVU 就绪后，重新注册事件监听器（如果之前注册失败）
    registerMvuEventListeners();

    console.info('[性斗学园脚本] 初始化：开始首次计算');
    scheduleCurrentChatUserInfoSync('脚本初始化', [100, 800, 2000, 5000]);
    await updateDependentVariables();
    // 初始化时也更新段位
    await updateRank();
  })();

  // 添加定时检查机制（每10秒检查一次，确保实时更新）
  setInterval(async () => {
    if (!isUpdating) {
      await updateDependentVariables();
    }
    // 独立更新段位，确保段位始终与等级匹配
    await updateRank();
  }, 10000);

  // 初始化状态栏
  initStatusBar();
  removeLegacyStatusBarButton();
  installBackstreetMainPromptInjector();
  registerScriptUpdateGlobals();
  scheduleScriptUpdateCheck();

  // 兼容旧按钮事件；正常入口已改为悬浮小手机。
  eventOn(getButtonEvent('打开状态栏'), () => {
    console.info('[性斗学园脚本] 旧状态栏按钮被点击，转为打开悬浮窗');
    toggleStatusBar();
  });
});

/**
 * 初始化状态栏
 */
function initStatusBar() {
  if (statusBarApp) return;

  try {
    statusBarContainer = createScriptIdDiv();
    statusBarContainer.css({
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      width: '100%',
      height: '100%',
      zIndex: '99999', // 提高 z-index 确保在最上层
      pointerEvents: 'none', // 容器本身不拦截事件，但内部元素可以
      // 移动端适配
      touchAction: 'none', // 防止移动端手势冲突
      WebkitOverflowScrolling: 'touch', // iOS 平滑滚动
      margin: '0',
      padding: '0',
      overflow: 'visible', // 确保内容可见
    });

    // 确保添加到 body 的最上层
    $('body').append(statusBarContainer);

    const app = createApp(StatusBarWrapper);

    teleportStyle();
    statusBarApp = app;
    app.mount(statusBarContainer[0]);

    console.info('[性斗学园脚本] 状态栏已初始化');
  } catch (error) {
    console.error('[性斗学园脚本] 初始化状态栏失败:', error);
  }
}

/**
 * 隐藏旧的脚本按钮入口，状态栏改由右下悬浮球打开。
 */
function removeLegacyStatusBarButton() {
  try {
    const updateButtons = globalAny.updateScriptButtonsWith;
    const getButtons = globalAny.getScriptButtons;
    const replaceButtons = globalAny.replaceScriptButtons;
    const removeButton = (buttons: any[]) => buttons.filter(button => button?.name !== '打开状态栏');

    if (typeof updateButtons === 'function') {
      updateButtons(removeButton);
      console.info('[性斗学园脚本] 已隐藏旧状态栏按钮，改用悬浮小手机入口');
      return;
    }

    if (typeof getButtons === 'function' && typeof replaceButtons === 'function') {
      replaceButtons(removeButton(getButtons()));
      console.info('[性斗学园脚本] 已隐藏旧状态栏按钮，改用悬浮小手机入口');
    }
  } catch (error) {
    console.warn('[性斗学园脚本] 隐藏旧状态栏按钮失败，将保留兼容入口:', error);
  }
}

/**
 * 切换状态栏显示
 */
function toggleStatusBar() {
  console.info('[性斗学园脚本] 切换状态栏，当前状态:', statusBarVisible);

  if (!statusBarApp) {
    console.info('[性斗学园脚本] 状态栏未初始化，开始初始化...');
    initStatusBar();
    // 等待初始化完成后再切换
    setTimeout(() => {
      const state = (window as any).__statusBarState;
      if (state && state.toggle) {
        state.toggle();
        statusBarVisible = state.isVisible.value;
      } else {
        statusBarVisible = !statusBarVisible;
      }
      console.info('[性斗学园脚本] 状态栏已切换为:', statusBarVisible);
    }, 300);
    return;
  }

  // 通过全局状态切换
  const state = (window as any).__statusBarState;
  if (state && state.toggle) {
    state.toggle();
    statusBarVisible = state.isVisible.value;
  } else {
    statusBarVisible = !statusBarVisible;
  }
  console.info('[性斗学园脚本] 状态栏已切换为:', statusBarVisible);
}

/**
 * 脚本卸载时显示提示
 */
$(window).on('pagehide', () => {
  toastr.info('性斗学园数值计算脚本已关闭', '脚本卸载', {
    timeOut: 2000,
    progressBar: true,
  });

  // 清理状态栏
  if (statusBarApp) {
    statusBarApp.unmount();
    statusBarApp = null;
  }
  if (statusBarContainer) {
    statusBarContainer.remove();
    statusBarContainer = null;
  }
  deteleportStyle();
});

console.info('性斗学园数值计算脚本已加载');
