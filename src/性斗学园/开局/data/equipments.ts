/**
 * 装备数据库
 * 包含所有可获取的装备
 */

import {
  EquipmentData,
  EquipmentRarity,
  EquipmentSetData,
  EquipmentSlot,
  EquipmentSource,
  EquipmentType,
} from './equipment-types';

// ==================== 主装备 ====================

export const MAIN_EQUIPMENTS: EquipmentData[] = [
  // === 普通 ===
  {
    id: 'eq_basic_feather',
    name: '羽毛',
    description: '柔软的羽毛，用来轻柔地挑逗',
    icon: 'Feather',
    slot: EquipmentSlot.MAIN,
    type: EquipmentType.OFFENSIVE,
    rarity: EquipmentRarity.COMMON,
    baseBonus: {
      基础性斗力加成: 5,
    },
    maxLevel: 5,
    upgradeBonus: {
      基础性斗力加成: 2,
    },
    effects: [],
    levelRequirement: 1,
    genderRestriction: [],
    source: EquipmentSource.STARTER,
    sellPrice: 50,
    buyPrice: 100,
    tradeable: true,
    flavorText: '最基础的挑逗工具',
  },
  {
    id: 'eq_massage_oil',
    name: '按摩精油',
    description: '香气宜人的按摩用精油',
    icon: 'Droplets',
    slot: EquipmentSlot.MAIN,
    type: EquipmentType.UTILITY,
    rarity: EquipmentRarity.COMMON,
    baseBonus: {
      基础性斗力加成: 3,
      魅力加成: 3,
    },
    maxLevel: 5,
    upgradeBonus: {
      基础性斗力加成: 1,
      魅力加成: 1,
    },
    effects: [
      {
        id: 'eff_slippery',
        name: '润滑',
        description: '使用按摩技能时效果+20%',
        trigger: 'on_massage_skill',
        chance: 100,
        cooldown: 0,
        value: 20,
      },
    ],
    levelRequirement: 1,
    genderRestriction: [],
    source: EquipmentSource.SHOP,
    sellPrice: 80,
    buyPrice: 200,
    tradeable: true,
  },
  // === 稀有 ===
  {
    id: 'eq_silk_ribbon',
    name: '丝绸缎带',
    description: '柔软的丝绸缎带，可用于束缚',
    icon: 'Ribbon',
    slot: EquipmentSlot.MAIN,
    type: EquipmentType.CONTROL,
    rarity: EquipmentRarity.RARE,
    baseBonus: {
      基础性斗力加成: 8,
      暴击率加成: 5,
    },
    maxLevel: 8,
    upgradeBonus: {
      基础性斗力加成: 3,
      暴击率加成: 1,
    },
    effects: [
      {
        id: 'eff_bind_enhance',
        name: '束缚强化',
        description: '束缚技能持续时间+1回合',
        trigger: 'on_bind_skill',
        chance: 100,
        cooldown: 0,
        value: 1,
      },
    ],
    levelRequirement: 5,
    genderRestriction: [],
    source: EquipmentSource.DROP,
    sellPrice: 300,
    buyPrice: 800,
    tradeable: true,
  },
  {
    id: 'eq_vibrator',
    name: '小型震动器',
    description: '便携式震动道具，功能强大',
    icon: 'Zap',
    slot: EquipmentSlot.MAIN,
    type: EquipmentType.OFFENSIVE,
    rarity: EquipmentRarity.RARE,
    baseBonus: {
      基础性斗力加成: 12,
      基础性斗力成算: 5,
    },
    maxLevel: 8,
    upgradeBonus: {
      基础性斗力加成: 4,
      基础性斗力成算: 2,
    },
    effects: [
      {
        id: 'eff_vibration',
        name: '持续震动',
        description: '攻击后30%几率使目标获得持续快感状态',
        trigger: 'on_attack',
        chance: 30,
        cooldown: 2,
        value: 5,
      },
    ],
    levelRequirement: 8,
    genderRestriction: [],
    source: EquipmentSource.SHOP,
    sellPrice: 500,
    buyPrice: 1500,
    tradeable: true,
    flavorText: '嗡嗡嗡~',
  },
  // === 史诗 ===
  {
    id: 'eq_golden_whip',
    name: '黄金调教鞭',
    description: '镀金的皮革鞭，既华丽又实用',
    icon: 'Star',
    slot: EquipmentSlot.MAIN,
    type: EquipmentType.OFFENSIVE,
    rarity: EquipmentRarity.EPIC,
    baseBonus: {
      基础性斗力加成: 18,
      基础性斗力成算: 10,
      暴击率加成: 8,
    },
    maxLevel: 10,
    upgradeBonus: {
      基础性斗力加成: 5,
      基础性斗力成算: 3,
      暴击率加成: 2,
    },
    effects: [
      {
        id: 'eff_golden_strike',
        name: '黄金一击',
        description: '暴击时额外造成20%伤害并附加羞耻状态',
        trigger: 'on_crit',
        chance: 100,
        cooldown: 0,
        value: 20,
      },
    ],
    levelRequirement: 15,
    genderRestriction: [],
    source: EquipmentSource.DROP,
    sellPrice: 1500,
    buyPrice: 5000,
    tradeable: true,
    flavorText: '啪！乖一点...',
  },
  {
    id: 'eq_hypno_pendant',
    name: '催眠水晶吊坠',
    description: '散发着神秘光芒的水晶，有催眠效果',
    icon: 'Gem',
    slot: EquipmentSlot.MAIN,
    type: EquipmentType.CONTROL,
    rarity: EquipmentRarity.EPIC,
    baseBonus: {
      基础性斗力加成: 10,
      魅力加成: 15,
    },
    maxLevel: 10,
    upgradeBonus: {
      基础性斗力加成: 3,
      魅力加成: 4,
    },
    effects: [
      {
        id: 'eff_hypno_gaze',
        name: '迷离之眼',
        description: '精神技能命中率+15%，迷离效果持续+1回合',
        trigger: 'on_mental_skill',
        chance: 100,
        cooldown: 0,
        value: 15,
      },
    ],
    levelRequirement: 18,
    genderRestriction: [],
    source: EquipmentSource.QUEST,
    sellPrice: 2000,
    buyPrice: 0,
    tradeable: false,
    flavorText: '看着这颗水晶...放松...听我的话...',
  },
  // === 传说 ===
  {
    id: 'eq_succubus_tail',
    name: '魅魔之尾',
    description: '传说中魅魔的尾巴，蕴含强大的诱惑之力',
    icon: 'Heart',
    slot: EquipmentSlot.MAIN,
    type: EquipmentType.AMPLIFIER,
    rarity: EquipmentRarity.LEGENDARY,
    baseBonus: {
      基础性斗力加成: 25,
      基础性斗力成算: 20,
      魅力加成: 20,
      暴击率加成: 10,
    },
    maxLevel: 15,
    upgradeBonus: {
      基础性斗力加成: 6,
      基础性斗力成算: 4,
      魅力加成: 5,
    },
    effects: [
      {
        id: 'eff_succubus_drain',
        name: '精气吸取',
        description: '造成伤害时回复等量15%的耐力',
        trigger: 'on_damage_dealt',
        chance: 100,
        cooldown: 0,
        value: 15,
      },
      {
        id: 'eff_allure',
        name: '致命诱惑',
        description: '战斗开始时有50%几率使敌人进入魅惑状态',
        trigger: 'battle_start',
        chance: 50,
        cooldown: 0,
        value: 2,
      },
    ],
    levelRequirement: 25,
    genderRestriction: [],
    source: EquipmentSource.DROP,
    sellPrice: 8000,
    buyPrice: 0,
    tradeable: false,
    flavorText: '来吧，让我品尝你的精气...',
  },
];

// ==================== 副装备 ====================

export const SUB_EQUIPMENTS: EquipmentData[] = [
  {
    id: 'eq_mirror',
    name: '手镜',
    description: '精致的小镜子，可用来给对方看自己的表情',
    icon: 'Mirror',
    slot: EquipmentSlot.SUB,
    type: EquipmentType.UTILITY,
    rarity: EquipmentRarity.COMMON,
    baseBonus: {
      魅力加成: 5,
    },
    maxLevel: 5,
    upgradeBonus: {
      魅力加成: 2,
    },
    effects: [
      {
        id: 'eff_shame_mirror',
        name: '羞耻之镜',
        description: '羞耻技能效果+15%',
        trigger: 'on_shame_skill',
        chance: 100,
        cooldown: 0,
        value: 15,
      },
    ],
    levelRequirement: 1,
    genderRestriction: [],
    source: EquipmentSource.SHOP,
    sellPrice: 60,
    buyPrice: 150,
    tradeable: true,
  },
  {
    id: 'eq_blindfold',
    name: '眼罩',
    description: '柔软的丝绸眼罩，剥夺视觉',
    icon: 'EyeSlash',
    slot: EquipmentSlot.SUB,
    type: EquipmentType.CONTROL,
    rarity: EquipmentRarity.UNCOMMON,
    baseBonus: {
      基础性斗力加成: 5,
      闪避率加成: -3,
    },
    maxLevel: 6,
    upgradeBonus: {
      基础性斗力加成: 2,
    },
    effects: [
      {
        id: 'eff_heighten_senses',
        name: '感官强化',
        description: '对被蒙眼目标造成的伤害+25%',
        trigger: 'on_attack_blinded',
        chance: 100,
        cooldown: 0,
        value: 25,
      },
    ],
    levelRequirement: 3,
    genderRestriction: [],
    source: EquipmentSource.SHOP,
    sellPrice: 120,
    buyPrice: 350,
    tradeable: true,
  },
  {
    id: 'eq_collar',
    name: '皮革项圈',
    description: '带有铃铛的精致项圈',
    icon: 'Ring',
    slot: EquipmentSlot.SUB,
    type: EquipmentType.CONTROL,
    rarity: EquipmentRarity.RARE,
    baseBonus: {
      基础性斗力加成: 10,
      魅力加成: 8,
    },
    maxLevel: 8,
    upgradeBonus: {
      基础性斗力加成: 3,
      魅力加成: 2,
    },
    effects: [
      {
        id: 'eff_bell_sound',
        name: '铃声响起',
        description: '移动时铃铛作响',
        trigger: 'on_move',
        chance: 100,
        cooldown: 1,
        value: 3,
      },
    ],
    levelRequirement: 8,
    genderRestriction: [],
    source: EquipmentSource.DROP,
    sellPrice: 400,
    buyPrice: 1200,
    tradeable: true,
  },
];

// ==================== 饰品 ====================

export const ACCESSORIES: EquipmentData[] = [
  {
    id: 'eq_charm_ring',
    name: '魅力戒指',
    description: '提升魅力的简单戒指',
    icon: 'Ring',
    slot: EquipmentSlot.ACCESSORY_1,
    type: EquipmentType.AMPLIFIER,
    rarity: EquipmentRarity.COMMON,
    baseBonus: {
      魅力加成: 8,
    },
    maxLevel: 5,
    upgradeBonus: {
      魅力加成: 3,
    },
    effects: [],
    levelRequirement: 1,
    genderRestriction: [],
    source: EquipmentSource.SHOP,
    sellPrice: 100,
    buyPrice: 300,
    tradeable: true,
  },
  {
    id: 'eq_luck_pendant',
    name: '四叶草吊坠',
    description: '据说能带来好运的吊坠',
    icon: 'Clover',
    slot: EquipmentSlot.ACCESSORY_1,
    type: EquipmentType.UTILITY,
    rarity: EquipmentRarity.COMMON,
    baseBonus: {
      幸运加成: 10,
    },
    maxLevel: 5,
    upgradeBonus: {
      幸运加成: 3,
    },
    effects: [],
    levelRequirement: 1,
    genderRestriction: [],
    source: EquipmentSource.SHOP,
    sellPrice: 100,
    buyPrice: 300,
    tradeable: true,
  },
  {
    id: 'eq_stamina_bracelet',
    name: '耐力手环',
    description: '增强体力的运动手环',
    icon: 'Dumbbell',
    slot: EquipmentSlot.ACCESSORY_1,
    type: EquipmentType.DEFENSIVE,
    rarity: EquipmentRarity.UNCOMMON,
    baseBonus: {
      $最大耐力加成: 20,
      基础忍耐力加成: 5,
    },
    maxLevel: 6,
    upgradeBonus: {
      $最大耐力加成: 8,
      基础忍耐力加成: 2,
    },
    effects: [],
    levelRequirement: 5,
    genderRestriction: [],
    source: EquipmentSource.SHOP,
    sellPrice: 200,
    buyPrice: 600,
    tradeable: true,
  },
  {
    id: 'eq_rose_earring',
    name: '玫瑰耳环',
    description: '精致的玫瑰形状耳环，散发淡淡花香',
    icon: 'Flower',
    slot: EquipmentSlot.ACCESSORY_2,
    type: EquipmentType.AMPLIFIER,
    rarity: EquipmentRarity.RARE,
    baseBonus: {
      魅力加成: 12,
      基础性斗力成算: 5,
    },
    maxLevel: 8,
    upgradeBonus: {
      魅力加成: 4,
      基础性斗力成算: 2,
    },
    effects: [
      {
        id: 'eff_rose_scent',
        name: '玫瑰香气',
        description: '每回合有20%几率使敌人进入轻微发情状态',
        trigger: 'turn_end',
        chance: 20,
        cooldown: 3,
        value: 5,
      },
    ],
    levelRequirement: 10,
    genderRestriction: [],
    source: EquipmentSource.DROP,
    sellPrice: 500,
    buyPrice: 1500,
    tradeable: true,
    flavorText: '每一朵玫瑰都带刺...',
  },
  {
    id: 'eq_resilience_amulet',
    name: '意志护符',
    description: '增强精神力量的神秘护符',
    icon: 'Shield',
    slot: EquipmentSlot.ACCESSORY_2,
    type: EquipmentType.DEFENSIVE,
    rarity: EquipmentRarity.EPIC,
    baseBonus: {
      基础忍耐力加成: 10,
      基础忍耐力成算: 10,
    },
    maxLevel: 10,
    upgradeBonus: {
      基础忍耐力加成: 3,
      基础忍耐力成算: 2,
    },
    effects: [
      {
        id: 'eff_mental_barrier',
        name: '精神屏障',
        description: '受到精神攻击时有30%几率完全无效化',
        trigger: 'on_mental_attack_received',
        chance: 30,
        cooldown: 2,
        value: 100,
      },
    ],
    levelRequirement: 15,
    genderRestriction: [],
    source: EquipmentSource.QUEST,
    sellPrice: 1200,
    buyPrice: 0,
    tradeable: false,
  },
];

// ==================== 特殊装备 ====================

export const SPECIAL_EQUIPMENTS: EquipmentData[] = [
  {
    id: 'eq_aphrodisiac_pouch',
    name: '媚药香囊',
    description: '装有特殊药剂的香囊，散发迷人气息',
    icon: 'Flask',
    slot: EquipmentSlot.SPECIAL,
    type: EquipmentType.CONTROL,
    rarity: EquipmentRarity.RARE,
    baseBonus: {
      基础性斗力加成: 8,
      魅力加成: 5,
    },
    maxLevel: 8,
    upgradeBonus: {
      基础性斗力加成: 2,
      魅力加成: 2,
    },
    effects: [
      {
        id: 'eff_aphrodisiac_aura',
        name: '媚药光环',
        description: '战斗开始时使所有敌人敏感度+20%',
        trigger: 'battle_start',
        chance: 100,
        cooldown: 0,
        value: 20,
      },
    ],
    levelRequirement: 12,
    genderRestriction: [],
    source: EquipmentSource.CRAFT,
    sellPrice: 600,
    buyPrice: 2000,
    tradeable: true,
    flavorText: '闻一闻...是不是感觉身体有点热？',
  },
  {
    id: 'eq_recording_device',
    name: '隐藏摄像头',
    description: '可以悄悄记录的微型设备',
    icon: 'Camera',
    slot: EquipmentSlot.SPECIAL,
    type: EquipmentType.UTILITY,
    rarity: EquipmentRarity.EPIC,
    baseBonus: {
      幸运加成: 10,
      魅力加成: 5,
    },
    maxLevel: 10,
    upgradeBonus: {
      幸运加成: 3,
      魅力加成: 2,
    },
    effects: [
      {
        id: 'eff_blackmail',
        name: '威胁材料',
        description: '羞耻类技能效果+30%，乏力持续+1回合',
        trigger: 'on_shame_skill',
        chance: 100,
        cooldown: 0,
        value: 30,
      },
    ],
    levelRequirement: 18,
    genderRestriction: [],
    source: EquipmentSource.DROP,
    sellPrice: 1000,
    buyPrice: 3500,
    tradeable: true,
    flavorText: '笑一个~',
  },
  {
    id: 'eq_student_handbook',
    name: '性斗学园校规手册',
    description: '记载了学园规则的神秘手册',
    icon: 'Book',
    slot: EquipmentSlot.SPECIAL,
    type: EquipmentType.UTILITY,
    rarity: EquipmentRarity.LEGENDARY,
    baseBonus: {
      魅力加成: 10,
      幸运加成: 10,
      基础性斗力加成: 10,
      基础忍耐力加成: 10,
    },
    maxLevel: 15,
    upgradeBonus: {
      魅力加成: 3,
      幸运加成: 3,
      基础性斗力加成: 3,
      基础忍耐力加成: 3,
    },
    effects: [
      {
        id: 'eff_knowledge_power',
        name: '知识就是力量',
        description: '获得经验值+20%',
        trigger: 'on_exp_gain',
        chance: 100,
        cooldown: 0,
        value: 20,
      },
    ],
    levelRequirement: 1,
    genderRestriction: [],
    source: EquipmentSource.STARTER,
    sellPrice: 0,
    buyPrice: 0,
    tradeable: false,
    flavorText: '欢迎来到性斗学园，认真学习校规哦~',
  },
];

// ==================== 套装数据 ====================

export const EQUIPMENT_SETS: EquipmentSetData[] = [
  {
    id: 'set_novice',
    name: '新手三件套',
    description: '适合刚入学的新生使用的基础套装',
    icon: 'GraduationCap',
    pieces: ['eq_basic_feather', 'eq_mirror', 'eq_charm_ring'],
    setBonus: [
      {
        piecesRequired: 2,
        description: '魅力+5',
        bonus: {
          魅力加成: 5,
        },
      },
      {
        piecesRequired: 3,
        description: '性斗力成算+10%，经验获取+10%',
        bonus: {
          基础性斗力成算: 10,
        },
        specialEffectId: 'exp_bonus_10',
      },
    ],
    rarity: EquipmentRarity.COMMON,
  },
  {
    id: 'set_dominatrix',
    name: '女王套装',
    description: '支配者专用的豪华套装',
    icon: 'Crown',
    pieces: ['eq_golden_whip', 'eq_collar', 'eq_resilience_amulet'],
    setBonus: [
      {
        piecesRequired: 2,
        description: '性斗力成算+15%，控制技能持续+1回合',
        bonus: {
          基础性斗力成算: 15,
        },
        specialEffectId: 'control_duration_1',
      },
      {
        piecesRequired: 3,
        description: '支配者气场：战斗开始时降低所有敌人攻击力20%持续3回合',
        specialEffectId: 'dominatrix_aura',
      },
    ],
    rarity: EquipmentRarity.EPIC,
  },
  {
    id: 'set_seducer',
    name: '诱惑者套装',
    description: '以魅力取胜的诱惑专家套装',
    icon: 'Heart',
    pieces: ['eq_hypno_pendant', 'eq_rose_earring', 'eq_aphrodisiac_pouch'],
    setBonus: [
      {
        piecesRequired: 2,
        description: '魅力+15，魅惑技能成功率+10%',
        bonus: {
          魅力加成: 15,
        },
        specialEffectId: 'charm_skill_bonus',
      },
      {
        piecesRequired: 3,
        description: '致命诱惑：造成伤害时有15%几率使目标进入魅惑状态',
        specialEffectId: 'fatal_charm',
      },
    ],
    rarity: EquipmentRarity.EPIC,
  },
];

// ==================== 导出所有装备 ====================

export const ALL_EQUIPMENTS: EquipmentData[] = [
  ...MAIN_EQUIPMENTS,
  ...SUB_EQUIPMENTS,
  ...ACCESSORIES,
  ...SPECIAL_EQUIPMENTS,
];

/** 按ID获取装备 */
export function getEquipmentById(id: string): EquipmentData | undefined {
  return ALL_EQUIPMENTS.find(eq => eq.id === id);
}

/** 按槽位获取装备 */
export function getEquipmentsBySlot(slot: EquipmentSlot): EquipmentData[] {
  return ALL_EQUIPMENTS.filter(eq => eq.slot === slot);
}

/** 按稀有度获取装备 */
export function getEquipmentsByRarity(rarity: EquipmentRarity): EquipmentData[] {
  return ALL_EQUIPMENTS.filter(eq => eq.rarity === rarity);
}

/** 获取可购买装备 */
export function getPurchasableEquipments(): EquipmentData[] {
  return ALL_EQUIPMENTS.filter(eq => eq.buyPrice > 0);
}

/** 按来源获取装备 */
export function getEquipmentsBySource(source: EquipmentSource): EquipmentData[] {
  return ALL_EQUIPMENTS.filter(eq => eq.source === source);
}

/** 获取初始装备 */
export function getStarterEquipments(): EquipmentData[] {
  return ALL_EQUIPMENTS.filter(eq => eq.source === EquipmentSource.STARTER);
}

/** 获取套装信息 */
export function getEquipmentSetById(id: string): EquipmentSetData | undefined {
  return EQUIPMENT_SETS.find(set => set.id === id);
}

/** 检查装备是否属于某套装 */
export function getEquipmentSet(equipmentId: string): EquipmentSetData | undefined {
  return EQUIPMENT_SETS.find(set => set.pieces.includes(equipmentId));
}
