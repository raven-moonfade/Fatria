import { calcEvasionWithDiminishingReturns } from '../shared/combatMath';
import { executeAttack, type CombatResult } from './combatCalculator';
import {
  applyLevelScaling,
  getEnemyBaseDataByName,
  normalizeEnemyName,
  resolveEnemyName,
  type EnemyBaseData,
} from './enemyDatabase';
import { EXORCISM_BOSS_DEFINITIONS } from './exorcismBossDefinitions';
import type { Character, CombatLogEntry, Skill, SkillData } from './types';

export const COOPERATION_QUEST_KEYWORD = '驱魔迷宫';
export const COOPERATION_CHANCE_STEP = 20;
export const COOPERATION_MAX_CHANCE = 100;

export interface CooperationRollResult {
  triggered: boolean;
  roll: number | null;
  nextChance: number;
}

export interface CooperationCompanion {
  name: string;
  resolvedName: string;
  character: Character;
  skills: Skill[];
}

export interface CompanionAttackLog {
  message: string;
  source: string;
  type: CombatLogEntry['type'];
}

export interface CompanionAttackResolution {
  result: CombatResult;
  logs: CompanionAttackLog[];
  effect: 'critical' | 'dodge' | null;
  finalDamage: number;
  shouldApplySkillEffects: boolean;
}

function isObjectRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isQuestInactive(status: unknown): boolean {
  return ['已完成', '已失败', '已放弃'].includes(String(status || ''));
}

function containsKeyword(value: unknown, keyword: string, depth = 0): boolean {
  if (depth > 5) return false;
  if (typeof value === 'string') return value.includes(keyword);
  if (Array.isArray(value)) return value.some(item => containsKeyword(item, keyword, depth + 1));
  if (!isObjectRecord(value)) return false;

  return Object.entries(value).some(([key, child]) => {
    return key.includes(keyword) || containsKeyword(child, keyword, depth + 1);
  });
}

export function hasActiveExorcismMazeSideQuest(statData: Record<string, any> | null | undefined): boolean {
  const sideQuests = statData?.任务系统?.支线任务;
  if (!isObjectRecord(sideQuests)) return false;

  return Object.entries(sideQuests).some(([questName, questData]) => {
    if (!questName.includes(COOPERATION_QUEST_KEYWORD) && !containsKeyword(questData, COOPERATION_QUEST_KEYWORD)) {
      return false;
    }

    const status = isObjectRecord(questData) ? (questData.状态 ?? questData.status) : undefined;
    return !isQuestInactive(status);
  });
}

export function getPresentCompanionNames(statData: Record<string, any> | null | undefined): string[] {
  const rawCompanions = statData?.关系系统?.在场人物;
  if (!Array.isArray(rawCompanions)) return [];

  const names = rawCompanions.map(item => String(item || '').trim()).filter(Boolean);
  return [...new Set(names)];
}

function normalizeIdentityName(name: unknown): string {
  return normalizeEnemyName(String(name || ''))
    .trim()
    .toLowerCase();
}

function addIdentityName(identityNames: Set<string>, name: unknown, shouldResolve = true): boolean {
  const rawName = String(name || '').trim();
  if (!rawName) return false;

  let changed = false;
  const normalizedName = normalizeIdentityName(rawName);
  if (normalizedName && !identityNames.has(normalizedName)) {
    identityNames.add(normalizedName);
    changed = true;
  }

  if (!shouldResolve) return changed;

  const resolvedName = normalizeIdentityName(resolveEnemyName(rawName));
  if (resolvedName && !identityNames.has(resolvedName)) {
    identityNames.add(resolvedName);
    changed = true;
  }

  return changed;
}

function getExorcismDefinitionIdentityNames(definition: (typeof EXORCISM_BOSS_DEFINITIONS)[number]): string[] {
  return [
    definition.displayName,
    ...definition.aliases,
    ...definition.phases.flatMap(phase => [phase.displayName, phase.dataKey]),
  ].filter((name): name is string => Boolean(name));
}

function identityNameMatches(left: string, right: string): boolean {
  if (!left || !right) return false;
  if (left === right) return true;

  return (right.length >= 2 && left.includes(right)) || (left.length >= 2 && right.includes(left));
}

function definitionMatchesIdentityNames(
  identityNames: Set<string>,
  definition: (typeof EXORCISM_BOSS_DEFINITIONS)[number],
): boolean {
  const definitionNames = getExorcismDefinitionIdentityNames(definition).map(normalizeIdentityName).filter(Boolean);
  return definitionNames.some(definitionName => {
    return [...identityNames].some(identityName => identityNameMatches(identityName, definitionName));
  });
}

export function getCooperationIdentityNames(names: Array<string | null | undefined>): Set<string> {
  const identityNames = new Set<string>();
  names.forEach(name => addIdentityName(identityNames, name));

  const matchedDefinitionIds = new Set<string>();
  let expanded = true;
  while (expanded) {
    expanded = false;
    EXORCISM_BOSS_DEFINITIONS.forEach(definition => {
      if (matchedDefinitionIds.has(definition.id) || !definitionMatchesIdentityNames(identityNames, definition)) {
        return;
      }

      matchedDefinitionIds.add(definition.id);
      getExorcismDefinitionIdentityNames(definition).forEach(definitionName => {
        if (addIdentityName(identityNames, definitionName, false)) {
          expanded = true;
        }
      });
    });
  }

  return identityNames;
}

export function hasMatchingCooperationIdentity(
  leftNames: Array<string | null | undefined>,
  rightNames: Array<string | null | undefined>,
): boolean {
  const leftIdentityNames = getCooperationIdentityNames(leftNames);
  const rightIdentityNames = getCooperationIdentityNames(rightNames);

  return [...leftIdentityNames].some(identityName => rightIdentityNames.has(identityName));
}

export function isDirectPleasureSkill(skillData: SkillData): boolean {
  const hitCount = Math.max(0, Math.floor(Number(skillData.hitCount ?? 1) || 0));
  return hitCount > 0 && skillData.damageFormula.length > 0;
}

export function createCooperationRoll(currentChance: number, random = Math.random): CooperationRollResult {
  const normalizedChance = Math.max(0, Math.min(COOPERATION_MAX_CHANCE, currentChance));
  if (normalizedChance <= 0) {
    return {
      triggered: false,
      roll: null,
      nextChance: COOPERATION_CHANCE_STEP,
    };
  }

  const roll = random() * 100;
  const triggered = roll < normalizedChance;
  return {
    triggered,
    roll,
    nextChance: triggered ? 0 : Math.min(COOPERATION_MAX_CHANCE, normalizedChance + COOPERATION_CHANCE_STEP),
  };
}

export function createCooperationSkill(skillData: SkillData): Skill {
  return {
    id: skillData.id,
    name: skillData.name,
    description: skillData.description,
    cost: 0,
    type: skillData.type,
    cooldown: 0,
    currentCooldown: 0,
    data: skillData,
  };
}

function createCompanionCharacter(params: {
  name: string;
  resolvedName: string;
  baseData: EnemyBaseData;
  avatarUrl: string;
  skills: Skill[];
  maxClimaxCount: number;
}): Character {
  return {
    id: `companion_${params.resolvedName}`,
    name: params.resolvedName || params.name,
    avatarUrl: params.avatarUrl,
    isPlayer: false,
    statusEffects: [],
    items: [],
    skills: params.skills,
    stats: {
      maxEndurance: params.baseData.对手最大耐力,
      currentEndurance: params.baseData.对手最大耐力,
      maxPleasure: params.baseData.对手最大快感,
      currentPleasure: 0,
      climaxCount: 0,
      maxClimaxCount: params.maxClimaxCount,
      sexPower: params.baseData.对手性斗力,
      baseEndurance: params.baseData.对手忍耐力,
      evasion: calcEvasionWithDiminishingReturns(params.baseData.对手闪避率),
      crit: params.baseData.对手暴击率,
      charm: params.baseData.对手魅力,
      luck: params.baseData.对手幸运,
      level: params.baseData.对手等级,
    },
  };
}

export function createCooperationCompanion(params: {
  name: string;
  skillDataList: SkillData[];
  playerLevel: number;
  maxClimaxCount: number;
  getAvatarUrl: (name: string) => string;
}): CooperationCompanion | null {
  const resolvedName = resolveEnemyName(params.name);
  const baseData = getEnemyBaseDataByName(resolvedName);
  if (!baseData) return null;

  const directSkills = params.skillDataList.filter(isDirectPleasureSkill).map(createCooperationSkill);
  if (directSkills.length === 0) return null;

  const scaledBaseData = applyLevelScaling(baseData, params.playerLevel);
  const character = createCompanionCharacter({
    name: params.name,
    resolvedName,
    baseData: scaledBaseData,
    avatarUrl: params.getAvatarUrl(resolvedName),
    skills: directSkills,
    maxClimaxCount: params.maxClimaxCount,
  });

  return {
    name: params.name,
    resolvedName,
    character,
    skills: directSkills,
  };
}

function pickRandom<T>(items: T[], random = Math.random): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(random() * items.length)] ?? null;
}

export function pickCooperationAction(
  companions: CooperationCompanion[],
  random = Math.random,
): {
  companion: CooperationCompanion;
  skill: Skill;
} | null {
  const companion = pickRandom(companions, random);
  if (!companion) return null;

  const skill = pickRandom(companion.skills, random);
  if (!skill) return null;

  return { companion, skill };
}

export function resolveCompanionSkillAttack(params: {
  companion: Character;
  target: Character;
  skill: Skill;
}): CompanionAttackResolution {
  if (!params.skill.data) {
    throw new Error(`协同技能 ${params.skill.name} 的数据不存在，无法使用`);
  }

  const logs: CompanionAttackLog[] = [
    {
      message: `【协同作战】${params.companion.name} 现身支援，使用了 ${params.skill.name}！`,
      source: 'system',
      type: 'critical',
    },
  ];

  const result = executeAttack(params.companion, params.target, params.skill.data, true);
  let finalDamage = 0;

  if (result.isDodged) {
    logs.push({
      message: `${params.target.name} 闪避了协同攻击！`,
      source: 'system',
      type: 'info',
    });
  } else {
    result.logs.forEach(log => {
      logs.push({ message: log, source: 'system', type: 'info' });
    });

    if (result.totalDamage > 0) {
      finalDamage = result.totalDamage;
      const oldPleasure = params.target.stats.currentPleasure;
      params.target.stats.currentPleasure = Math.min(
        params.target.stats.maxPleasure,
        params.target.stats.currentPleasure + finalDamage,
      );

      logs.push({
        message: result.isCritical
          ? `协同暴击！总计造成 ${finalDamage} 点快感！`
          : `协同攻击造成 ${finalDamage} 点快感`,
        source: 'system',
        type: result.isCritical ? 'critical' : 'damage',
      });
      logs.push({
        message: `${params.target.name} 的快感从 ${oldPleasure}/${params.target.stats.maxPleasure} 增加到 ${params.target.stats.currentPleasure}/${params.target.stats.maxPleasure}`,
        source: 'system',
        type: 'info',
      });
    }
  }

  return {
    result,
    logs,
    effect: result.isDodged ? 'dodge' : result.isCritical ? 'critical' : null,
    finalDamage,
    shouldApplySkillEffects: !result.isDodged,
  };
}
