/**
 * 战斗系统常量定义
 * 用于PVE回合制战斗的固定数值
 */

// ==================== 等级系统 ====================

/** 等级范围 */
export const LEVEL_RANGE = {
  MIN: 1,
  MAX: 100,
} as const;

/** 潜力范围 */
export const POTENTIAL_RANGE = {
  MIN: 5.0,
  MAX: 10.0,
} as const;

// ==================== 属性范围 ====================

/** 魅力范围 */
export const CHARM_RANGE = {
  MIN: 0,
  MAX: 100,
} as const;

/** 幸运范围 */
export const LUCK_RANGE = {
  MIN: 0,
  MAX: 100,
} as const;

/** 最大耐力范围 */
export const MAX_STAMINA_RANGE = {
  MIN: 1,
  MAX: 500,
} as const;

/** 最大快感范围 */
export const MAX_LUST_RANGE = {
  MIN: 1,
  MAX: 500,
} as const;

/** 闪避率范围 */
export const DODGE_RATE_RANGE = {
  MIN: 0,
  MAX: 60,
} as const;

/** 暴击率范围 */
export const CRIT_RATE_RANGE = {
  MIN: 0,
  MAX: 100,
} as const;

// ==================== 战斗系统常量 ====================

/**
 * 获取快感上限（从变量中读取）
 * 注意：快感上限不是固定值，而是使用 MVU 中的 核心状态.$最大快感
 * @param maxLust 最大快感值
 * @returns 快感上限（等于最大快感值）
 */
export function getLustThreshold(maxLust: number): number {
  return maxLust;
}

/** 每级升级所需经验值 */
export const EXP_PER_LEVEL = 100;

/** 升级获得的属性点计算公式：潜力 / 2（向下取整） */
export function getAttributePointsOnLevelUp(potential: number): number {
  return Math.floor(potential / 2);
}

// ==================== 状态效果 ====================

/** 贤者时间（高潮后） */
export const POST_ORGASM_STATE = {
  DURATION: 3, // 持续回合数
  SEX_POWER_REDUCTION: 0.2, // 性斗力 -20%
  ENDURANCE_BOOST: 0.1, // 忍耐力 +10%
} as const;

/** 虚脱状态（达到高潮次数上限） */
export const EXHAUSTION_STATE = {
  STAMINA_REDUCTION: 0.3, // 当前耐力 -30%
} as const;

// ==================== 经验值获取 ====================

/** 经验值获取范围 */
export const EXP_GAINS = {
  /** 战斗中每轮对抗 */
  PER_ROUND: { min: 10, max: 20 },

  /** 性斗胜利基础经验 */
  VICTORY_BASE: 25,

  /** 性斗胜利等级差加成（每级差5点） */
  VICTORY_LEVEL_BONUS: 5,

  /** 性斗胜利最低经验 */
  VICTORY_MIN: 30,

  /** 性斗失败经验 */
  DEFEAT: { min: 10, max: 25 },

  /** 调教中每次高潮 */
  ORGASM: { min: 20, max: 40 },

  /** 探索经验 */
  EXPLORATION: { min: 5, max: 15 },

  /** 观战和练习 */
  SPECTATE: { min: 10, max: 30 },
} as const;

/**
 * 计算性斗胜利经验
 * @param userLevel 玩家等级
 * @param enemyLevel 敌人等级
 * @returns 获得的经验值
 */
export function calculateVictoryExp(userLevel: number, enemyLevel: number): number {
  const levelDiff = enemyLevel - userLevel;
  const exp = EXP_GAINS.VICTORY_BASE + levelDiff * EXP_GAINS.VICTORY_LEVEL_BONUS;
  return Math.max(EXP_GAINS.VICTORY_MIN, exp);
}

/**
 * 获取随机经验值（在范围内）
 * @param range 经验值范围 {min, max}
 * @returns 随机经验值
 */
export function getRandomExp(range: { min: number; max: number }): number {
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}
