# 更新日志

## v2.0 - 完整战斗系统重构 (2025-01-XX)

### 🎯 核心改进

#### 1. 统一高潮次数上限

- **问题**：之前玩家和敌人的`maxClimaxCount`是独立设置的，导致不一致
- **解决**：现在双方都从MVU变量`性斗系统.胜负规则.高潮次数上限`读取统一的上限值
- **实现位置**：`app.vue` - `loadFromMvu()`函数

#### 2. 技能数据库系统

- **创建文件**：`skillDatabase.ts`
- **功能**：
  - 集中管理所有技能的完整数据
  - 包含伤害公式、buff效果、冷却时间等
  - 支持按ID或类型查询技能
- **技能分类**：
  - 通用技能（8个）：指尖挑逗、深吻、衣物破坏、羞耻拍打、污言秽语、弱点洞察、嘲讽挑衅、喘息
  - 高级技能（3个）：精油按摩、束缚、费洛蒙

#### 3. 正确的伤害计算

- **创建文件**：`combatCalculator.ts`
- **非线性减伤模型**：
  ```
  防御系数 = 忍耐力 / (忍耐力 + 100)
  最终伤害 = 基础伤害 × (1 - 防御系数)
  ```
- **示例**：
  - 忍耐力20：减伤16.7%
  - 忍耐力50：减伤33.3%
  - 忍耐力100：减伤50%
  - 忍耐力200：减伤66.7%

#### 4. 闪避和暴击判定系统

- **闪避计算**：
  ```
  命中率 = 技能基础命中率 - 目标闪避率 + (攻击者幸运 / 10)
  命中率范围：10% ~ 95%
  ```
- **暴击计算**：
  ```
  暴击率 = 基础暴击率 + (幸运 / 5) + 技能暴击修正
  暴击率范围：0% ~ 80%
  暴击伤害：基础伤害 × 2
  ```

#### 5. 完整Buff/Debuff系统

- **支持状态效果**：
  - **增益**：ATK_UP, DEF_UP, CRIT_UP，DODGE_UP，LUCK_UP, CHARM_UP
  - **减益**：ATK_DOWN, DEF_DOWN, CRIT_DOWN, DODGE_DOWN, LUCK_DOWN, CHARM_DOWN
  - **控制** BIND
- **特性**：
  - 可叠加buff支持最大层数限制
  - 自动持续时间管理（每回合递减）
  - 持续伤害/回复效果自动结算
  - Buff修正应用到最终伤害计算

#### 6. MVU技能集成

- **从MVU读取玩家技能**：
  - 路径：`技能系统.主动技能`
  - 格式：完整主动技能结构，见 `src/性斗学园/变量结构/schema.ts`
- **技能冷却运行态化**：
  - 玩家和敌人的当前技能冷却只存在于本次战斗内存
  - 刷新或重进战斗后重新初始化
- **精简同步**：战斗只把玩家资源、对手名称和胜负规则保存到MVU；玩家高潮次数、当前回合和战斗摘要只保存在本次战斗运行态

### 📁 文件变更

#### 新增文件

1. `skillDatabase.ts` - 技能数据库
2. `combatCalculator.ts` - 战斗计算引擎

#### 修改文件

1. `types.ts` - 添加完整的技能和buff类型定义
2. `app.vue` - 重构战斗逻辑以使用新系统
3. `enemyDatabase.ts` - 简化为使用技能ID引用
4. `README.md` - 更新文档说明

### 🔧 技术细节

#### 类型系统增强

```typescript
// 新增枚举
enum DamageSource { SEX_POWER, CHARM, LUCK, FIXED, TARGET_PLEASURE }
enum SkillType { PHYSICAL, MENTAL, CHARM, SUPPORT, CONTROL, ULTIMATE }
enum BuffType { ATK_UP, DEF_DOWN, SENSITIVE, ... }

// 新增接口
interface BuffEffect { type, value, isPercent, duration, stackable, maxStacks }
interface DamageComponent { source, coefficient, baseValue }
interface SkillData { ... 完整技能数据 }
interface Skill { ... 运行时技能实例 }
```

#### 战斗流程

```
玩家选择技能
  → 消耗耐力
  → 设置冷却
  → 执行攻击 (combatCalculator.executeAttack)
    → 计算基础伤害
    → 判定闪避
    → 判定暴击
    → 应用防御减伤
    → 应用Buff修正
  → 应用技能Buff (combatCalculator.applySkillBuffs)
  → 更新状态
  → 检查高潮
  → 敌人回合
    → (同上流程)
  → 回合结算
    → 更新状态效果 (combatCalculator.updateStatusEffects)
    → 递减冷却
    → 耐力回复
    → 保存到MVU
```

### 🎮 使用示例

#### 在MVU中配置技能

```yaml
技能系统:
  主动技能:
    指尖挑逗:
      基本信息:
        技能名称: 指尖挑逗
        技能等级: 1
        稀有度: C
      冷却与消耗:
        耐力消耗: 10
        冷却回合数: 0
      伤害与效果:
        伤害来源: 性斗力
        系数: 60
        基础命中率: 90
        连击数: 1
        准确率: 100
        暴击修正: 0
        效果列表: {}
性斗系统:
  胜负规则:
    高潮次数上限: 3 # 双方共享
  对手名称: '白石响子'
```

### 🐛 修复的问题

1. ✅ 敌人的`maxClimaxCount`现在从MVU统一读取
2. ✅ 技能不再使用旧的`effect`函数，改用数据驱动
3. ✅ 伤害计算使用正确的非线性减伤公式
4. ✅ 闪避和暴击受幸运值影响
5. ✅ Buff效果正确应用到伤害计算中
6. ✅ 技能冷却在玩家和敌人回合都会递减

### 📝 待办事项

- [ ] 添加更多技能到技能数据库
- [ ] 实现combo连击系统
- [ ] 添加技能升级系统
- [ ] 实现装备系统对技能的影响
- [ ] 添加战斗重放功能
