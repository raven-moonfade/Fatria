/**
 * 战斗数值辅助函数。
 *
 * v2 变量结构只持久化事实；性斗力、忍耐力等派生数值统一交给 shared selector 计算。
 */

import { getPlayerDerivedStats } from '../../shared/statSelectors';

export const EXP_PER_LEVEL = 100;
export const POST_ORGASM_SEX_POWER_REDUCTION = 0.2;
export const POST_ORGASM_ENDURANCE_BOOST = 0.1;
export const EXHAUSTION_STAMINA_REDUCTION = 0.3;

export interface MvuCombatData {
  角色基础: {
    _等级: number;
    经验值?: number;
  };
  核心状态: {
    _潜力: number;
    $最大耐力: number;
    $最大快感: number;
    $快感: number;
    $耐力: number;
  };
  基础属性?: {
    _魅力?: number;
    _幸运?: number;
    _闪避率?: number;
    _暴击率?: number;
  };
  物品系统?: any;
  永久状态?: any;
  临时状态?: any;
  性斗系统?: any;
  技能系统?: any;
}

export function calculateSexualCombatPower(data: MvuCombatData): number {
  return getPlayerDerivedStats(data).sexPower;
}

export function calculateEndurance(data: MvuCombatData): number {
  return getPlayerDerivedStats(data).endurance;
}

export function shouldTriggerOrgasm(lust: number, maxLust: number): boolean {
  return Number(lust) >= Number(maxLust);
}

export function handleOrgasm(data: MvuCombatData): any {
  return {
    核心状态: {
      $快感: 0,
    },
    临时状态: {
      状态列表: {
        ...(data.临时状态?.状态列表 || {}),
        贤者时间: {
          加成: {
            基础性斗力成算: -20,
            基础忍耐力成算: 10,
          },
          剩余回合: 3,
          描述: '高潮后的短暂状态',
        },
      },
    },
  };
}

export function isExhausted(orgasmCount: number, maxOrgasmCount: number): boolean {
  return Number(orgasmCount) >= Number(maxOrgasmCount);
}

export function getExpToNextLevel(currentLevel: number, currentExp: number): number {
  const expForNextLevel = currentLevel * EXP_PER_LEVEL;
  return Math.max(0, expForNextLevel - currentExp);
}

export function canLevelUp(currentLevel: number, currentExp: number): boolean {
  if (currentLevel >= 100) return false;
  return currentExp >= currentLevel * EXP_PER_LEVEL;
}

export function getAttributePointsOnLevelUp(potential: number): number {
  return Math.floor(Number(potential) / 2);
}

export function handleLevelUp(data: MvuCombatData): any | null {
  if (!canLevelUp(data.角色基础._等级, data.角色基础.经验值 || 0)) {
    return null;
  }

  return {
    角色基础: {
      _等级: data.角色基础._等级 + 1,
    },
  };
}

export const EXP_GAINS = {
  PER_ROUND: { min: 10, max: 20 },
  VICTORY_BASE: 25,
  VICTORY_LEVEL_BONUS: 5,
  VICTORY_MIN: 30,
  DEFEAT: { min: 10, max: 25 },
  ORGASM: { min: 20, max: 40 },
  EXPLORATION: { min: 5, max: 15 },
  SPECTATE: { min: 10, max: 30 },
};

export function calculateVictoryExp(userLevel: number, enemyLevel: number): number {
  const levelDiff = enemyLevel - userLevel;
  const exp = EXP_GAINS.VICTORY_BASE + levelDiff * EXP_GAINS.VICTORY_LEVEL_BONUS;
  return Math.max(EXP_GAINS.VICTORY_MIN, exp);
}

export function getRandomExp(range: { min: number; max: number }): number {
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

export function extractCombatData(mvuData: any): MvuCombatData {
  const statData = mvuData?.stat_data || {};

  return {
    角色基础: {
      _等级: statData.角色基础?._等级 || 1,
      经验值: statData.角色基础?.经验值 || 0,
    },
    核心状态: {
      _潜力: statData.核心状态?._潜力 || 5,
      $最大耐力: statData.核心状态?.$最大耐力 || 100,
      $最大快感: statData.核心状态?.$最大快感 || 100,
      $快感: statData.核心状态?.$快感 || 0,
      $耐力: statData.核心状态?.$耐力 || 100,
    },
    基础属性: statData.基础属性,
    物品系统: statData.物品系统,
    永久状态: statData.永久状态,
    临时状态: statData.临时状态,
    性斗系统: statData.性斗系统,
    技能系统: statData.技能系统,
  };
}
