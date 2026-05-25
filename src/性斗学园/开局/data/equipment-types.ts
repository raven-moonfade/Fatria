/**
 * 装备系统类型定义
 * 用于性斗学园的装备数据结构
 */

// ==================== 枚举定义 ====================

/** 装备槽位 */
export enum EquipmentSlot {
  /** 主装备 - 主要武器/道具 */
  MAIN = 'main',
  /** 副装备 - 辅助装备 */
  SUB = 'sub',
  /** 饰品1 */
  ACCESSORY_1 = 'accessory_1',
  /** 饰品2 */
  ACCESSORY_2 = 'accessory_2',
  /** 特殊装备 - 特殊用途装备 */
  SPECIAL = 'special',
}

/** 装备类型 */
export enum EquipmentType {
  /** 攻击型 */
  OFFENSIVE = 'offensive',
  /** 防御型 */
  DEFENSIVE = 'defensive',
  /** 辅助型 */
  UTILITY = 'utility',
  /** 控制型 */
  CONTROL = 'control',
  /** 增幅型 */
  AMPLIFIER = 'amplifier',
  /** 特殊型 */
  SPECIAL = 'special',
}

/** 装备稀有度 */
export enum EquipmentRarity {
  /** 普通 (白色) */
  COMMON = 'C',
  /** 优良 (绿色) */
  UNCOMMON = 'B',
  /** 稀有 (蓝色) */
  RARE = 'A',
  /** 史诗 (紫色) */
  EPIC = 'S',
  /** 传说 (橙色) */
  LEGENDARY = 'SS',
  /** 神话 (粉色) */
  MYTHIC = 'SSS',
}

/** 装备来源 */
export enum EquipmentSource {
  /** 商店购买 */
  SHOP = 'shop',
  /** 战斗掉落 */
  DROP = 'drop',
  /** 任务奖励 */
  QUEST = 'quest',
  /** 制作合成 */
  CRAFT = 'craft',
  /** 活动奖励 */
  EVENT = 'event',
  /** 初始装备 */
  STARTER = 'starter',
}

// ==================== 接口定义 ====================

/** 基础属性加成 */
export interface EquipmentBonus {
  /** 魅力加成 */
  魅力加成?: number;
  /** 幸运加成 */
  幸运加成?: number;
  /** 基础性斗力加成（固定值） */
  基础性斗力加成?: number;
  /** 基础性斗力成算（百分比） */
  基础性斗力成算?: number;
  /** 基础忍耐力加成（固定值） */
  基础忍耐力加成?: number;
  /** 基础忍耐力成算（百分比） */
  基础忍耐力成算?: number;
  /** 闪避率加成 */
  闪避率加成?: number;
  /** 暴击率加成 */
  暴击率加成?: number;
  /** 最大耐力加成 */
  最大耐力加成?: number;
  /** 最大快感加成 */
  最大快感加成?: number;
}

/** 装备特效 */
export interface EquipmentEffect {
  /** 效果ID */
  id: string;
  /** 效果名称 */
  name: string;
  /** 效果描述 */
  description: string;
  /** 触发条件 */
  trigger: string;
  /** 触发概率（0-100） */
  chance: number;
  /** 冷却回合 */
  cooldown: number;
  /** 效果值（具体含义取决于效果类型） */
  value: number;
}

/** 套装信息 */
export interface SetInfo {
  /** 套装ID */
  setId: string;
  /** 在套装中的位置 */
  pieceIndex: number;
}

/** 装备数据 */
export interface EquipmentData {
  // === 基本信息 ===
  /** 唯一ID */
  id: string;
  /** 装备名称 */
  name: string;
  /** 装备描述 */
  description: string;
  /** 图标名称 */
  icon: string;
  /** 装备槽位 */
  slot: EquipmentSlot;
  /** 装备类型 */
  type: EquipmentType;
  /** 稀有度 */
  rarity: EquipmentRarity;

  // === 属性加成 ===
  /** 基础属性加成 */
  baseBonus: EquipmentBonus;
  /** 强化后额外加成（每级） */
  upgradeBonus?: Partial<EquipmentBonus>;
  /** 当前强化等级（运行时） */
  currentLevel?: number;
  /** 最大强化等级 */
  maxLevel: number;

  // === 特殊效果 ===
  /** 装备特效列表 */
  effects: EquipmentEffect[];

  // === 套装信息 ===
  /** 套装信息（如果属于套装） */
  setInfo?: SetInfo;

  // === 限制条件 ===
  /** 等级要求 */
  levelRequirement: number;
  /** 性别限制 */
  genderRestriction: string[];
  /** 体质要求 */
  constitutionRequirement?: string[];

  // === 其他信息 ===
  /** 获取来源 */
  source: EquipmentSource;
  /** 出售价格 */
  sellPrice: number;
  /** 购买价格（0表示不可购买） */
  buyPrice: number;
  /** 是否可交易 */
  tradeable: boolean;
  /** 风味文字 */
  flavorText?: string;
}

/** 套装效果 */
export interface SetBonusEffect {
  /** 所需件数 */
  piecesRequired: number;
  /** 效果描述 */
  description: string;
  /** 属性加成 */
  bonus?: EquipmentBonus;
  /** 特殊效果ID */
  specialEffectId?: string;
}

/** 套装数据 */
export interface EquipmentSetData {
  /** 套装ID */
  id: string;
  /** 套装名称 */
  name: string;
  /** 套装描述 */
  description: string;
  /** 套装图标 */
  icon: string;
  /** 包含的装备ID列表 */
  pieces: string[];
  /** 套装效果（不同件数的效果） */
  setBonus: SetBonusEffect[];
  /** 稀有度 */
  rarity: EquipmentRarity;
}

/** 已装备状态 */
export interface EquippedItem {
  /** 装备ID */
  equipmentId: string;
  /** 当前强化等级 */
  level: number;
  /** 额外词条（随机属性） */
  randomStats?: EquipmentBonus;
}

/** 装备栏状态 */
export interface EquipmentLoadout {
  [EquipmentSlot.MAIN]?: EquippedItem;
  [EquipmentSlot.SUB]?: EquippedItem;
  [EquipmentSlot.ACCESSORY_1]?: EquippedItem;
  [EquipmentSlot.ACCESSORY_2]?: EquippedItem;
  [EquipmentSlot.SPECIAL]?: EquippedItem;
}

// ==================== 常量 ====================

/** 装备槽位中文名 */
export const EQUIPMENT_SLOT_NAMES: Record<EquipmentSlot, string> = {
  [EquipmentSlot.MAIN]: '主装备',
  [EquipmentSlot.SUB]: '副装备',
  [EquipmentSlot.ACCESSORY_1]: '饰品1',
  [EquipmentSlot.ACCESSORY_2]: '饰品2',
  [EquipmentSlot.SPECIAL]: '特殊装备',
};

/** 装备类型中文名 */
export const EQUIPMENT_TYPE_NAMES: Record<EquipmentType, string> = {
  [EquipmentType.OFFENSIVE]: '攻击型',
  [EquipmentType.DEFENSIVE]: '防御型',
  [EquipmentType.UTILITY]: '辅助型',
  [EquipmentType.CONTROL]: '控制型',
  [EquipmentType.AMPLIFIER]: '增幅型',
  [EquipmentType.SPECIAL]: '特殊型',
};

/** 装备稀有度颜色 */
export const EQUIPMENT_RARITY_COLORS: Record<EquipmentRarity, string> = {
  [EquipmentRarity.COMMON]: '#9ca3af', // 灰色
  [EquipmentRarity.UNCOMMON]: '#22c55e', // 绿色
  [EquipmentRarity.RARE]: '#3b82f6', // 蓝色
  [EquipmentRarity.EPIC]: '#a855f7', // 紫色
  [EquipmentRarity.LEGENDARY]: '#f97316', // 橙色
  [EquipmentRarity.MYTHIC]: '#ec4899', // 粉色
};

/** 装备稀有度中文名 */
export const EQUIPMENT_RARITY_NAMES: Record<EquipmentRarity, string> = {
  [EquipmentRarity.COMMON]: '普通',
  [EquipmentRarity.UNCOMMON]: '优良',
  [EquipmentRarity.RARE]: '稀有',
  [EquipmentRarity.EPIC]: '史诗',
  [EquipmentRarity.LEGENDARY]: '传说',
  [EquipmentRarity.MYTHIC]: '神话',
};

/** 强化费用系数（每级） */
export const UPGRADE_COST_MULTIPLIER: Record<EquipmentRarity, number> = {
  [EquipmentRarity.COMMON]: 100,
  [EquipmentRarity.UNCOMMON]: 200,
  [EquipmentRarity.RARE]: 400,
  [EquipmentRarity.EPIC]: 800,
  [EquipmentRarity.LEGENDARY]: 1500,
  [EquipmentRarity.MYTHIC]: 3000,
};

/** 计算强化费用 */
export function calculateUpgradeCost(equipment: EquipmentData, currentLevel: number): number {
  const baseCost = UPGRADE_COST_MULTIPLIER[equipment.rarity];
  return Math.floor(baseCost * Math.pow(1.5, currentLevel));
}

/** 计算总属性加成（含强化） */
export function calculateTotalBonus(equipment: EquipmentData, level: number): EquipmentBonus {
  const total: EquipmentBonus = { ...equipment.baseBonus };

  if (equipment.upgradeBonus && level > 0) {
    for (const [key, value] of Object.entries(equipment.upgradeBonus)) {
      const k = key as keyof EquipmentBonus;
      if (value !== undefined) {
        total[k] = (total[k] || 0) + value * level;
      }
    }
  }

  return total;
}
