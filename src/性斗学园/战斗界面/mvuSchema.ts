import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
// DON'T IMPORT zod OR lodash HERE, USE THEM DIRECTLY!

// --- 核心定义 (可复用) ---
// 1. 定义加成统计 Schema（已移除意志力加成）
const BonusSchema = z.object({
  魅力加成: z.coerce.number().prefault(0),
  幸运加成: z.coerce.number().prefault(0),
  基础性斗力加成: z.coerce.number().prefault(0),
  基础性斗力成算: z.coerce.number().prefault(0),
  基础忍耐力加成: z.coerce.number().prefault(0),
  基础忍耐力成算: z.coerce.number().prefault(0),
  闪避率加成: z.coerce.number().prefault(0),
  暴击率加成: z.coerce.number().prefault(0),
}).prefault({});

// 2. 定义单个状态效果 Schema（包含加成和回合数）
const StatusEffectSchema = z.object({
  加成: BonusSchema,
  剩余回合: z.coerce.number().min(0).prefault(0),
}).prefault({});

// 2.1 定义临时状态 Schema（重构：状态列表包含每个状态的加成和回合数，加成统计实时计算总和）
const TempStatusSchema = z.object({
  状态列表: z.record(z.string(), StatusEffectSchema).prefault({}),
  加成统计: BonusSchema, // 从状态列表实时计算的总加成
}).prefault({});

// 3. 定义关系 Schema（移除关系类型限制，改为自由字符串）
const RelationshipSchema = z.object({
  好感度: z.coerce.number().transform(n => _.clamp(n, 0, 100)).prefault(0),
  关系类型: z.string().prefault("陌生人"),
}).prefault({});

// 4. 定义技能效果 Schema（移除意志力，添加是否作用敌人）
const SkillEffectSchema = z.object({
  效果类型: z.enum(["性斗力", "忍耐力", "魅力", "幸运", "闪避率", "暴击率", "束缚"]).catch("性斗力").prefault("性斗力"),
  效果值: z.coerce.number().prefault(0),
  是否为百分比: z.boolean().prefault(false),
  持续回合数: z.coerce.number().min(0).prefault(0),
  是否作用敌人: z.boolean().prefault(true), // true=作用于敌人, false=作用于自己
}).prefault({});

// 5. 定义主动技能 Schema (用于玩家与对手，添加连击数/准确率/暴击修正)
const ActiveSkillSchema = z.object({
  基本信息: z.object({
    技能名称: z.string().prefault(""),
    技能描述: z.string().prefault(""),
    基础描述: z.string().prefault(""), // 技能的基础描述模板，升级后不变
    技能等级: z.coerce.number().transform(n => _.clamp(n, 1, 5)).prefault(1),
    稀有度: z.enum(["C", "B", "A", "S", "SS"]).catch("C").prefault("C"),
  }).prefault({}),
  冷却与消耗: z.object({
    耐力消耗: z.coerce.number().min(0).prefault(0),
    冷却回合数: z.coerce.number().min(0).prefault(0),
  }).prefault({}),
  伤害与效果: z.object({
    伤害来源: z.enum(["性斗力", "魅力", "幸运", "固定值", "目标快感"]).catch("性斗力").prefault("性斗力"), // 移除意志力
    系数: z.coerce.number().prefault(100), // 百分比
    基础命中率: z.coerce.number().prefault(100), // 百分比
    连击数: z.coerce.number().min(1).prefault(1), // 技能连续攻击次数
    准确率: z.coerce.number().prefault(100), // 技能准确率修正（百分比）
    暴击修正: z.coerce.number().prefault(0), // 暴击率额外修正（百分比）
    效果列表: z.record(z.string(), SkillEffectSchema).prefault({}), // Key为效果自定义名称
  }).prefault({}),
});

// 5.1 定义天赋 Schema
const TalentSchema = z.object({
  天赋名称: z.string().prefault(""),
  天赋描述: z.string().prefault(""),
  天赋效果: BonusSchema,
}).prefault({});

// 6. 定义物品系统相关 Schema
// 6.1 已装备物品
const EquippedItemSchema = z.object({
  名称: z.string().prefault(""),
  等级: z.enum(["C", "B", "A", "S", "SS"]).catch("C").prefault("C"),
  加成属性: BonusSchema,
  描述: z.string().prefault(""),
}).prefault({});

// 6.2 背包物品 (使用 discriminatedUnion)
const BaseItemSchema = z.object({
  等级: z.enum(["C", "B", "A", "S", "SS"]).catch("C").prefault("C"),
  描述: z.string().prefault(""),
});

const EquipmentInBagSchema = BaseItemSchema.extend({
  类型: z.literal("装备"),
  加成属性: BonusSchema,
  部位: z.enum(["主装备", "副装备", "饰品", "特殊装备"]),
  数量: z.literal(1).prefault(1),
});

const ConsumableItemSchema = BaseItemSchema.extend({
  类型: z.literal("消耗品"),
  加成属性: BonusSchema.optional(),
  耐力增加: z.coerce.number().optional(),
  快感降低: z.coerce.number().optional(),
  潜力提升: z.coerce.number().optional(), // 新增：潜力提升值
  战斗用品: z.boolean().prefault(false),
  数量: z.coerce.number().min(0).prefault(1),
});

const OtherItemSchema = BaseItemSchema.extend({
  类型: z.literal("其他"),
  数量: z.coerce.number().min(0).prefault(1),
});

const BackpackItemSchema = z.discriminatedUnion("类型", [
  EquipmentInBagSchema,
  ConsumableItemSchema,
  OtherItemSchema,
]);

export const Schema = z.object({
  // --- 角色基础 ---
  角色基础: z.object({
    _等级: z.coerce.number().transform(n => _.clamp(n, 1, 100)).prefault(1),
    _姓名: z.string().prefault(""),
    经验值: z.coerce.number().min(0).prefault(0),
    声望: z.coerce.number().transform(n => _.clamp(n, -10000, 10000)).prefault(0),
    _段位: z.enum(["无段位", "D", "C", "B", "A", "S", "SS", "SSS"]).prefault("无段位"),
    难度: z.enum(["简单", "普通", "困难", "抖M", "作弊"]).prefault("普通"), // 新增
    性别: z.enum(["男", "女", "非二元"]).prefault("女"), // 新增
  }).prefault({}),
  
  // --- 核心状态（已移除意志力相关字段）---
  核心状态: z.object({
    $属性点: z.coerce.number().min(0).prefault(0),
    $技能点: z.coerce.number().min(0).prefault(0),
    $最大耐力: z.coerce.number().min(1).prefault(100),
    $耐力: z.coerce.number().min(0).prefault(100),
    $最大快感: z.coerce.number().min(1).prefault(100),
    $快感: z.coerce.number().min(0).prefault(0),
    堕落度: z.coerce.number().transform(n => _.clamp(n, 0, 100)).prefault(0),
    _潜力: z.coerce.number().transform(n => _.clamp(n, 5.0, 10.0)).prefault(5.0),
    _魅力: z.coerce.number().min(0).prefault(10),
    $基础魅力: z.coerce.number().min(0).prefault(10),
    _幸运: z.coerce.number().min(0).prefault(10),
    $基础幸运: z.coerce.number().min(0).prefault(10),
    $基础性斗力: z.coerce.number().prefault(10),
    $基础忍耐力: z.coerce.number().prefault(10),
    _闪避率: z.coerce.number().transform(n => _.clamp(n, 0, 70)).prefault(0),
    $基础闪避率: z.coerce.number().min(0).prefault(0),
    _暴击率: z.coerce.number().transform(n => _.clamp(n, 0, 100)).prefault(0),
    $基础暴击率: z.coerce.number().min(0).prefault(0),
  }).prefault({}),
  
  // --- 状态 ---
  临时状态: TempStatusSchema,
  永久状态: z.object({
    状态列表: z.array(z.string()).prefault([]),
    加成统计: BonusSchema,
  }).prefault({}),
  
  // --- 性斗系统 ---
  性斗系统: z.object({
    对手名称: z.string().prefault(""),
    性斗类型: z.enum(["日常切磋", "升段赛", "决斗", "擂台赛", "校内赛", "多校联赛", "黑暗决赛", "无"]).catch("无").prefault("无"),
    胜负规则: z.object({
      高潮次数上限: z.coerce.number().prefault(1),
      允许认输: z.boolean().prefault(true),
    }).prefault({}),
    当前回合: z.coerce.number().min(0).prefault(0),
    行动日志: z.record(z.string(), z.string()).prefault({}),
    高潮次数: z.coerce.number().prefault(0),
    实时性斗力: z.coerce.number().prefault(0),
    实时忍耐力: z.coerce.number().prefault(0),
    // --- 对手基础属性（战斗中不变，从敌人数据库加载后固定）---
    对手魅力: z.coerce.number().prefault(0),
    对手幸运: z.coerce.number().prefault(0),
    对手闪避率: z.coerce.number().prefault(0),
    对手暴击率: z.coerce.number().prefault(0),
    对手等级: z.coerce.number().min(0).prefault(1),
    对手耐力: z.coerce.number().prefault(100),
    对手最大耐力: z.coerce.number().prefault(100),
    对手快感: z.coerce.number().prefault(0),
    对手最大快感: z.coerce.number().prefault(100),
    对手高潮次数: z.coerce.number().prefault(0),
    对手性斗力: z.coerce.number().prefault(0),
    对手忍耐力: z.coerce.number().prefault(0),
    // --- 对手实时属性（= 基础属性 + 临时状态加成统计，战斗UI读取这些值）---
    对手实时魅力: z.coerce.number().prefault(0),
    对手实时幸运: z.coerce.number().prefault(0),
    对手实时闪避率: z.coerce.number().prefault(0),
    对手实时暴击率: z.coerce.number().prefault(0),
    对手实时性斗力: z.coerce.number().prefault(0),
    对手实时忍耐力: z.coerce.number().prefault(0),
    对手临时状态: TempStatusSchema,
    对手技能冷却: z.record(z.string(), z.coerce.number()).prefault({}),
    // 对手可用技能: 结构与玩家主动技能完全对等
    对手可用技能: z.record(z.string(), ActiveSkillSchema).prefault({}),
    战斗物品: z.record(z.string(), z.number()).prefault({}),
  }).prefault({}),
  
  // --- 关系系统 ---
  关系系统: z.object({
    在场人物: z.array(z.string()).prefault([]),
  }).catchall(RelationshipSchema).prefault({}),
  
  // --- 任务系统 ---
  任务系统: z.object({
    主线任务: z.object({
      名称: z.string().prefault(""),
      描述: z.string().prefault(""),
      状态: z.enum(["进行中", "已完成", "已失败", "已放弃"]).catch("进行中").prefault("进行中"),
      目标: z.record(z.string(), z.any()).prefault({}),
      奖励: z.string().prefault(""),
      期限: z.string().prefault("无"),
    }).prefault({}),
    支线任务: z.record(z.string(), z.object({
      描述: z.string().prefault(""),
      类型: z.enum(["日常", "特殊", "限时", "隐藏"]).catch("日常").prefault("日常"),
      状态: z.enum(["进行中", "已完成", "已失败", "已放弃"]).catch("进行中").prefault("进行中"),
      目标: z.record(z.string(), z.any()).prefault({}),
      奖励: z.string().prefault(""),
      期限: z.string().prefault("无"),
    }).prefault({})).prefault({}),
    已完成记录: z.array(z.string()).prefault([]),
  }).prefault({}),
  
  // --- 物品系统 (重构) ---
  物品系统: z.object({
    学园金币: z.coerce.number().min(0).prefault(0),
    背包: z.record(z.string(), BackpackItemSchema).prefault({}),
    _装备栏: z.object({
      主装备: EquippedItemSchema,
      副装备: EquippedItemSchema,
      饰品1: EquippedItemSchema,
      饰品2: EquippedItemSchema,
      特殊装备: EquippedItemSchema,
    }).prefault({}),
    装备总加成: BonusSchema,
  }).prefault({}),
  
  // --- 位置与时间 ---
  位置系统: z.object({
    坐标: z.string().prefault("[1-1]"),
    楼层: z.coerce.number().prefault(1),
    地点名称: z.string().prefault("初始点"),
  }).prefault({}),
  
  时间系统: z.object({
    日期: z.string().prefault("2025-3-17"),
    星期: z.coerce.number().transform(n => _.clamp(n, 1, 7)).prefault(1),
    时间: z.string().prefault("08:00"),
  }).prefault({}),
  
  // --- 势力声望 ---
  势力声望: z.object({
    学生会: z.coerce.number().transform(n => _.clamp(n, -100, 100)).prefault(0),
    女权协会: z.coerce.number().transform(n => _.clamp(n, -100, 100)).prefault(0),
    BF社: z.coerce.number().transform(n => _.clamp(n, -100, 100)).prefault(0),
    体育联盟: z.coerce.number().transform(n => _.clamp(n, -100, 100)).prefault(0),
    研究会: z.coerce.number().transform(n => _.clamp(n, -100, 100)).prefault(0),
    地下联盟: z.coerce.number().transform(n => _.clamp(n, -100, 100)).prefault(0),
    男性自保联盟: z.coerce.number().transform(n => _.clamp(n, -100, 100)).prefault(0),
    雌堕会: z.coerce.number().transform(n => _.clamp(n, -100, 100)).prefault(0),
  }).prefault({}),
  
  // --- 技能系统 ---
  技能系统: z.object({
    // 主动技能: 复用 ActiveSkillSchema
    主动技能: z.record(z.string(), ActiveSkillSchema).prefault({}),
    // 天赋系统
    $天赋: z.record(z.string(), TalentSchema).prefault({}),
  }).prefault({}),
});

$(() => {
  registerMvuSchema(Schema);
  console.info('[战斗界面] MVU Schema已注册');
});

