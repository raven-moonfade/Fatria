import _ from 'lodash';
import type { StatusList, TimedStatusEffect } from '../shared/statusEngine';

export type ResolvedSkillEffect =
  | {
      kind: 'status';
      effectType: string;
      effectValue: number;
      isPercentage: boolean;
      duration: number;
      targetEnemy: boolean;
      bonus: Record<string, number>;
    }
  | {
      kind: 'bind';
      duration: number;
      targetEnemy: boolean;
    }
  | {
      kind: 'skip';
      reason?: string;
    };

const EFFECT_TYPE_LABELS: Record<string, string> = {
  魅力: '魅力',
  幸运: '幸运',
  闪避率: '闪避率',
  暴击率: '暴击率',
  束缚: '束缚',
};

export function readSkillEffectList(
  statData: Record<string, any>,
  enemyRuntimeSkillEffects: Record<string, any>,
  skillId: string,
  isPlayerSkill: boolean,
): {
  skillPath: string;
  effectList: Record<string, any>;
} {
  const skillPath = isPlayerSkill
    ? `技能系统.主动技能.${skillId}.伤害与效果.效果列表`
    : `enemyRuntimeSkillEffects.${skillId}.伤害与效果.效果列表`;

  return {
    skillPath,
    effectList: isPlayerSkill
      ? (_.get(statData, skillPath, {}) as Record<string, any>)
      : (_.get(enemyRuntimeSkillEffects, `${skillId}.伤害与效果.效果列表`, {}) as Record<string, any>),
  };
}

export function resolveSkillEffect(effectData: unknown): ResolvedSkillEffect {
  if (!effectData || typeof effectData !== 'object') {
    return { kind: 'skip', reason: '无效效果' };
  }

  const effectType = _.get(effectData, '效果类型', '') as string;
  const effectValue = Number(_.get(effectData, '效果值', 0)) || 0;
  const isPercentage = Boolean(_.get(effectData, '是否为百分比', false));
  const duration = Math.max(0, Number(_.get(effectData, '持续回合数', 0)) || 0);
  const targetEnemy = Boolean(_.get(effectData, '是否作用敌人', true));

  if (effectType === '束缚') {
    if (duration === 0) {
      return { kind: 'skip', reason: '束缚效果duration为0' };
    }

    return { kind: 'bind', duration, targetEnemy };
  }

  if (effectValue === 0 || duration === 0) {
    return { kind: 'skip' };
  }

  const bonusFieldMap: Record<string, string> = {
    性斗力: isPercentage ? '基础性斗力成算' : '基础性斗力加成',
    忍耐力: isPercentage ? '基础忍耐力成算' : '基础忍耐力加成',
    魅力: '魅力加成',
    幸运: '幸运加成',
    闪避率: '闪避率加成',
    暴击率: '暴击率加成',
  };
  const bonusField = bonusFieldMap[effectType];

  if (!bonusField) {
    return { kind: 'skip', reason: `未知效果类型: ${effectType}` };
  }

  return {
    kind: 'status',
    effectType,
    effectValue,
    isPercentage,
    duration,
    targetEnemy,
    bonus: { [bonusField]: effectValue },
  };
}

export function getSkillStatusKey(effectType: string, skillId: string, effectName: string): string {
  return `${effectType}_${skillId}_${effectName}`;
}

export function upsertSkillStatus(
  statusList: StatusList | Record<string, any>,
  statusKey: string,
  effect: TimedStatusEffect,
): {
  statusList: Record<string, TimedStatusEffect>;
  refreshed: boolean;
} {
  const nextStatusList = { ...(statusList || {}) } as Record<string, TimedStatusEffect>;
  const refreshed = Boolean(nextStatusList[statusKey]);

  if (refreshed) {
    nextStatusList[statusKey] = {
      ...nextStatusList[statusKey],
      剩余回合: Math.max(0, Number(effect.剩余回合) || 0),
    };
  } else {
    nextStatusList[statusKey] = {
      加成: effect.加成 || {},
      剩余回合: Math.max(0, Number(effect.剩余回合) || 0),
      描述: effect.描述 || '',
    };
  }

  return { statusList: nextStatusList, refreshed };
}

export function buildSkillStatusLog(
  targetName: string,
  effect: Extract<ResolvedSkillEffect, { kind: 'status' }>,
  refreshed: boolean,
): string {
  if (refreshed) {
    return `${targetName} 的 ${effect.effectType} 效果已刷新 (${effect.duration} 回合)`;
  }

  const sign = effect.effectValue > 0 ? '+' : '';
  return `${targetName} ${sign}${effect.effectValue}${effect.isPercentage ? '%' : ''} ${effect.effectType} (${effect.duration} 回合)`;
}

export function getEffectTypeName(effectType: string): string {
  return EFFECT_TYPE_LABELS[effectType] || effectType;
}

export function buildExpiredStatusLogs(ownerName: string, expiredStatusKeys: string[]): string[] {
  return expiredStatusKeys.map(statusKey => {
    const effectType = statusKey.split('_')[0];
    return `${ownerName} 的 ${getEffectTypeName(effectType)} 效果消失了`;
  });
}
