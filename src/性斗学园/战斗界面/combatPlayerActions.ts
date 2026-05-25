import type { CombatStats, Item, Skill } from './types';

export interface SkillCostContext {
  bossId?: string;
  edenStaminaCostMultiplier?: number;
  heisakiSkillCost?: number;
}

export interface MuxinlanHonorMedalState {
  isBossFight: boolean;
  bossId: string;
  currentPhase: number;
  hasUsedMedal: boolean;
}

const SPECIAL_NEGATIVE_ITEM_IDS = new Set(['意志崩解液', '迷情之露', '缠梦香']);

export function calculateSkillDisplayCost(skill: Skill, context: SkillCostContext = {}): number {
  let cost = skill.cost;

  if (context.bossId === 'eden' && typeof context.edenStaminaCostMultiplier === 'number') {
    cost = Math.floor(cost * context.edenStaminaCostMultiplier);
  }

  if (context.bossId === 'heisaki' && typeof context.heisakiSkillCost === 'number') {
    cost = context.heisakiSkillCost;
  }

  return Math.max(0, Math.floor(cost));
}

export function isSkillActionDisabled(skill: Skill, currentEndurance: number, context: SkillCostContext = {}): boolean {
  if (skill.currentCooldown > 0) {
    return true;
  }

  // 黑崎晴雯BOSS战允许透支，所以不检查耐力。
  if (context.bossId === 'heisaki') {
    return false;
  }

  return currentEndurance < calculateSkillDisplayCost(skill, context);
}

export function buildSpecialNegativeItemSummary(item: Item): string | null {
  if (!SPECIAL_NEGATIVE_ITEM_IDS.has(item.id)) {
    return null;
  }

  const parts: string[] = [];
  if (typeof item.pleasureReduce === 'number' && item.pleasureReduce !== 0) {
    const delta = -item.pleasureReduce;
    parts.push(delta > 0 ? `快感+${delta}` : `快感${delta}`);
  }

  if (typeof item.pleasureIncrease === 'number' && item.pleasureIncrease !== 0) {
    parts.push(`快感+${item.pleasureIncrease}`);
  }

  if (item.bonuses && Object.keys(item.bonuses).length > 0) {
    const bonusDesc = Object.entries(item.bonuses)
      .map(([key, value]) => `${key}${value >= 0 ? '+' : ''}${value}`)
      .join('、');
    parts.push(bonusDesc);
  }

  return parts.length > 0 ? parts.join('；') : '（效果未知）';
}

export function getItemTemporaryBuffDuration(item: Item, fallback = 3): number {
  const durationMatch = item.description?.match(/持续(\d+)回合/);
  if (!durationMatch) {
    return fallback;
  }

  const duration = Number.parseInt(durationMatch[1], 10);
  return Number.isFinite(duration) && duration > 0 ? duration : fallback;
}

export function validateMuxinlanHonorMedalUse(state: MuxinlanHonorMedalState): {
  allowed: boolean;
  message?: string;
} {
  if (!state.isBossFight || state.bossId !== 'muxinlan') {
    return { allowed: false, message: '该道具只能在与沐芯兰的战斗中使用。' };
  }

  if (state.currentPhase !== 1) {
    return { allowed: false, message: '该道具只能在沐芯兰第一阶段使用。' };
  }

  if (state.hasUsedMedal) {
    return { allowed: false, message: '该道具已经使用过了。' };
  }

  return { allowed: true };
}

export function calculateSelfPleasureChange(stats: CombatStats): {
  before: number;
  after: number;
  increase: number;
} {
  const before = stats.currentPleasure;
  const increase = Math.floor(stats.maxPleasure * 0.3);
  const after = Math.min(stats.maxPleasure, before + increase);
  return { before, after, increase: after - before };
}

export function createTemptedStatusBonus(stats: CombatStats): Record<string, number> {
  return {
    魅力加成: -Math.floor(stats.charm * 0.5),
    幸运加成: -Math.floor(stats.luck * 0.5),
    闪避率加成: -Math.floor(stats.evasion * 0.5),
    暴击率加成: -Math.floor(stats.crit * 0.5),
    基础性斗力成算: -50,
    基础忍耐力成算: -50,
  };
}

export function rollTributePenalty(random = Math.random): {
  expLoss: number;
  coinLoss: number;
} {
  return {
    expLoss: 20 + Math.floor(random() * 61),
    coinLoss: 100 + Math.floor(random() * 901),
  };
}
