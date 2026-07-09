import type {
  BossMechanicAction,
  BossMechanicDefinition,
  BossMechanicKind,
  BossPhaseDefinition,
  DeclarativeBossDefinition,
} from './bossMechanicEngine';

export interface ExorcismRequiredMechanism {
  key: string;
  kind: BossMechanicKind;
  label: string;
  purpose: string;
  implementation: string;
  usedBy: string[];
}

export const EXORCISM_REQUIRED_MECHANISMS: ExorcismRequiredMechanism[] = [
  {
    key: 'phaseSkillPool',
    kind: 'skillPool',
    label: '阶段技能池',
    purpose: '同一个 Boss 按阶段切换技能池、倍率、高潮上限或可用标签。',
    implementation: 'BossPhaseDefinition.skillPoolKey + setSkillPool action；技能库后续按 skillPoolKey 取技能。',
    usedBy: ['阿曼达', '八尺夫人', '鬼巫女椿', '万魔之母', '希思', '无常', '玉藻前'],
  },
  {
    key: 'thresholdTransition',
    kind: 'phaseTransition',
    label: '阈值转阶段',
    purpose: '按 HP、回合、伤害步进、高潮计数或手动事件进入下一阶段。',
    implementation:
      'hpPercentAtOrBelow / turnAtLeast / damageTakenPercentStep / climaxCountAtLeast trigger + setPhase action。',
    usedBy: ['阿曼达', '八尺夫人', '鬼巫女椿', '万魔之母', '希思', '玉藻前', '无常'],
  },
  {
    key: 'turnLimit',
    kind: 'turnLimit',
    label: '回合时限',
    purpose: '限时唤醒、限时击破、逾时增援或逾时觉醒。',
    implementation: 'turnAtLeast trigger + blockedByFlag；完成目标时由任务/关系系统写入 flag。',
    usedBy: ['鬼樱', '玉藻前'],
  },
  {
    key: 'judgementChallenge',
    kind: 'judgementChallenge',
    label: '连续判定挑战',
    purpose: '把多段意志/净化/同化判定抽成统一流程。',
    implementation: 'startJudgement action 携带 judgementKey、requiredSuccesses、difficultyModifier。',
    usedBy: ['八尺夫人', '猫又', '天狗', '雪女', '万魔之母', '暗精灵娘', '络新妇'],
  },
  {
    key: 'progressMeter',
    kind: 'assimilationProgress',
    label: '进度条状态',
    purpose: '孵化、寒气、植物寄生、精神侵蚀、同化等都使用同一种进度条。',
    implementation: 'skillTagHit trigger + addProgress action；progressAtLeast trigger 触发下一机制。',
    usedBy: ['阿娜温', '黑暗史莱姆', '猫又', '天狗', '雪女', '希思', '鬼巫女椿', '络新妇'],
  },
  {
    key: 'badEndTrigger',
    kind: 'specialRule',
    label: '失败分支触发器',
    purpose: '把战败次数、连续判定失败、终结技命中导致的失败分支统一表达。',
    implementation: 'lossCountAtLeast / judgementFailed / progressAtLeast trigger + triggerBadEnd action。',
    usedBy: ['霜凝', '无常', '猫又', '天狗', '雪女', '八尺夫人', '络新妇'],
  },
  {
    key: 'genderVariant',
    kind: 'genderVariant',
    label: '性别变体技能',
    purpose: '同一机制按主角性别选择不同技能池或效果修正。',
    implementation: 'playerGenderIs trigger + setSkillPool / modifySkillTag action；战斗适配层负责传入 playerGender。',
    usedBy: ['八尺夫人', '无常'],
  },
  {
    key: 'companionRequired',
    kind: 'specialRule',
    label: '同行者门槛',
    purpose: '某些净化战必须由关系系统确认指定同行者在场。',
    implementation: 'companionMissing trigger + skipBattle/log；不新增副本变量。',
    usedBy: ['薇尔'],
  },
  {
    key: 'companionWakeup',
    kind: 'companionWakeup',
    label: '同伴唤醒',
    purpose: '呼唤名字、好感捷径、同行 NPC 介入共同推进唤醒进度。',
    implementation:
      'playerDialogue / relationshipAtLeast / companionPresent trigger + addProgress / stun / setFlag action。',
    usedBy: ['鬼樱', '灵樱', '克洛伊', '薇尔'],
  },
  {
    key: 'relationshipShortcut',
    kind: 'relationshipShortcut',
    label: '好感捷径',
    purpose: '让关系系统直接影响净化、跳阶段或长硬直。',
    implementation: 'relationshipAtLeast trigger；关系值仍从关系系统读取。',
    usedBy: ['鬼樱', '灵樱', '玉藻前', '无常', '霜凝'],
  },
  {
    key: 'personaSwitch',
    kind: 'personaSwitch',
    label: '人格切换',
    purpose: '受伤步进、技能标签或真名呼唤造成行动取消、硬直、下回合先手等。',
    implementation:
      'damageTakenPercentStep / skillTagUsed / playerDialogue trigger + cancelAction / stun / setPhase action。',
    usedBy: ['克洛伊'],
  },
  {
    key: 'multiActorPhase',
    kind: 'multiActor',
    label: '多演员阶段',
    purpose: '一个 Boss 战内同时存在多个敌方演员，并共享或独立失败条件。',
    implementation: 'actorStates + allActorsDefeated trigger；任务系统负责最终进度记录。',
    usedBy: ['无常', '鬼樱'],
  },
  {
    key: 'reviveIfNotSimultaneous',
    kind: 'reviveRule',
    label: '非同步击破复活',
    purpose: '双人阶段若未同回合击破，存活者倒计时复活另一方。',
    implementation: 'actorDefeated trigger 设置倒计时 flag/counter，turnStart 到期 reviveActor。',
    usedBy: ['无常'],
  },
  {
    key: 'environmentAura',
    kind: 'environmentAura',
    label: '场地光环',
    purpose: '结界、花粉、寒气、石化凝视等常驻环境效果。',
    implementation: 'battleStart / turnStart trigger + applyStatus 或 modifySkillTag action。',
    usedBy: ['阿娜温', '鬼樱', '石像鬼娘', '雪女', '黑暗史莱姆'],
  },
  {
    key: 'ritualProtect',
    kind: 'protectRitual',
    label: '净化仪式窗口',
    purpose: '击破后不直接结束，而是开启 1 到数回合的净化/封印保护流程。',
    implementation: 'startRitual action；任务系统记录仪式成功或失败。',
    usedBy: ['僵尸天羽', '薇尔', '万魔之母', '鬼巫女椿'],
  },
  {
    key: 'forcedUltimate',
    kind: 'forcedUltimate',
    label: '濒死强制奥义',
    purpose: '低 HP 时强制进入一次不可忽略的最终判定或技能。',
    implementation: 'hpPercentAtOrBelow trigger + forceSkill / startJudgement action。',
    usedBy: ['八尺夫人', '万魔之母', '络新妇'],
  },
  {
    key: 'skillTagModifier',
    kind: 'skillTagModifier',
    label: '技能标签修正',
    purpose: '按阶段或场地对洗脑、净化、堕落、圣系、寒气等标签统一加减。',
    implementation: 'modifySkillTag action；技能库只需要维护标签，不需要给每个 Boss 写专属分支。',
    usedBy: ['阿曼达', '鬼巫女椿', '鬼樱', '克洛伊', '万魔之母'],
  },
  {
    key: 'lossCounter',
    kind: 'lossCounter',
    label: '跨场战败计数',
    purpose: '多次败北后触发特殊分支，但计数归任务系统或关系系统持久化。',
    implementation: 'lossCountAtLeast trigger；运行时只消费外部传入的 lossCounters。',
    usedBy: ['霜凝', '无常', '猫又', '天狗', '雪女', '络新妇'],
  },
];

export const EXORCISM_BLOCKED_BOSS_SOURCES: Array<{
  id: string;
  sourceEntry: string;
  displayName: string;
  reason: string;
}> = [];

function logAction(message: string): BossMechanicAction {
  return { type: 'log', message };
}

function phaseByHp(params: {
  id: string;
  label: string;
  threshold: number;
  fromPhase: number;
  phase: number;
  skillPoolKey: string;
  message: string;
  notes?: string;
}): BossMechanicDefinition {
  return {
    id: params.id,
    kind: 'phaseTransition',
    label: params.label,
    description: `HP 降至 ${params.threshold}% 或以下时切换至第 ${params.phase} 阶段。`,
    reusable: true,
    once: true,
    triggers: [{ type: 'hpPercentAtOrBelow', phase: params.fromPhase, threshold: params.threshold }],
    actions: [
      { type: 'setPhase', phase: params.phase },
      { type: 'setSkillPool', skillPoolKey: params.skillPoolKey },
      logAction(params.message),
    ],
    notes: params.notes,
  };
}

function phaseByTurn(params: {
  id: string;
  label: string;
  turn: number;
  phase: number;
  skillPoolKey?: string;
  message: string;
  blockedByFlag?: string;
  notes?: string;
}): BossMechanicDefinition {
  const actions: BossMechanicAction[] = [{ type: 'setPhase', phase: params.phase }, logAction(params.message)];
  if (params.skillPoolKey) actions.splice(1, 0, { type: 'setSkillPool', skillPoolKey: params.skillPoolKey });

  return {
    id: params.id,
    kind: 'turnLimit',
    label: params.label,
    description: `第 ${params.turn} 回合开始时触发限时阶段变化。`,
    reusable: true,
    once: true,
    triggers: [{ type: 'turnAtLeast', turn: params.turn, blockedByFlag: params.blockedByFlag }],
    actions,
    notes: params.notes,
  };
}

function dialogueStun(params: {
  id: string;
  label: string;
  dialogueIncludes: string[];
  duration: number;
  message: string;
  notes?: string;
}): BossMechanicDefinition {
  return {
    id: params.id,
    kind: 'companionWakeup',
    label: params.label,
    description: '玩家台词命中特定关键词时造成短暂硬直或唤醒波动。',
    reusable: true,
    triggers: [{ type: 'playerDialogue', dialogueIncludes: params.dialogueIncludes }],
    actions: [{ type: 'stun', duration: params.duration }, logAction(params.message)],
    notes: params.notes,
  };
}

function skillModifier(params: {
  id: string;
  label: string;
  phase?: number;
  skillTags: string[];
  multiplier: number;
  message: string;
  notes?: string;
}): BossMechanicDefinition {
  return {
    id: params.id,
    kind: 'skillTagModifier',
    label: params.label,
    description: `修正技能标签: ${params.skillTags.join(', ')}。`,
    reusable: true,
    triggers: [{ type: 'phaseEnter', phase: params.phase }],
    actions: [
      { type: 'modifySkillTag', skillTags: params.skillTags, multiplier: params.multiplier },
      logAction(params.message),
    ],
    notes: params.notes,
  };
}

function skillProgress(params: {
  id: string;
  label: string;
  skillTags: string[];
  stateKey: string;
  amount: number;
  message: string;
  notes?: string;
}): BossMechanicDefinition {
  return {
    id: params.id,
    kind: 'assimilationProgress',
    label: params.label,
    description: `命中 ${params.skillTags.join(', ')} 标签技能时累积 ${params.stateKey}。`,
    reusable: true,
    triggers: [{ type: 'skillTagHit', skillTags: params.skillTags, skillActor: 'enemy' }],
    actions: [{ type: 'addProgress', stateKey: params.stateKey, amount: params.amount }, logAction(params.message)],
    notes: params.notes,
  };
}

function progressJudgement(params: {
  id: string;
  label: string;
  stateKey: string;
  threshold: number;
  judgementKey: string;
  requiredSuccesses: number;
  difficultyModifier?: number;
  message: string;
  notes?: string;
}): BossMechanicDefinition {
  return {
    id: params.id,
    kind: 'judgementChallenge',
    label: params.label,
    description: `${params.stateKey} 达到 ${params.threshold} 后开启连续判定。`,
    reusable: true,
    once: true,
    triggers: [{ type: 'progressAtLeast', stateKey: params.stateKey, threshold: params.threshold }],
    actions: [
      {
        type: 'startJudgement',
        judgementKey: params.judgementKey,
        requiredSuccesses: params.requiredSuccesses,
        difficultyModifier: params.difficultyModifier,
      },
      logAction(params.message),
    ],
    notes: params.notes,
  };
}

function progressOrLossJudgement(params: {
  id: string;
  label: string;
  stateKey: string;
  progressThreshold: number;
  lossCounterKey: string;
  lossThreshold: number;
  judgementKey: string;
  requiredSuccesses: number;
  difficultyModifier?: number;
  message: string;
  notes?: string;
}): BossMechanicDefinition {
  return {
    id: params.id,
    kind: 'judgementChallenge',
    label: params.label,
    description: `进度达到 ${params.progressThreshold} 或败北 ${params.lossThreshold} 次后开启连续判定。`,
    reusable: true,
    once: true,
    triggers: [
      { type: 'progressAtLeast', stateKey: params.stateKey, threshold: params.progressThreshold },
      { type: 'lossCountAtLeast', lossCounterKey: params.lossCounterKey, threshold: params.lossThreshold },
    ],
    actions: [
      {
        type: 'startJudgement',
        judgementKey: params.judgementKey,
        requiredSuccesses: params.requiredSuccesses,
        difficultyModifier: params.difficultyModifier,
      },
      logAction(params.message),
    ],
    notes: params.notes,
  };
}

function lossBadEnd(params: {
  id: string;
  label: string;
  lossCounterKey: string;
  threshold: number;
  message: string;
  notes?: string;
}): BossMechanicDefinition {
  return {
    id: params.id,
    kind: 'lossCounter',
    label: params.label,
    description: `跨场战败计数达到 ${params.threshold} 后触发失败分支。`,
    reusable: true,
    once: true,
    triggers: [{ type: 'lossCountAtLeast', lossCounterKey: params.lossCounterKey, threshold: params.threshold }],
    actions: [{ type: 'triggerBadEnd' }, logAction(params.message)],
    notes: params.notes,
  };
}

function aura(params: {
  id: string;
  label: string;
  statusName: string;
  message: string;
  notes?: string;
}): BossMechanicDefinition {
  return {
    id: params.id,
    kind: 'environmentAura',
    label: params.label,
    description: '战斗开始时施加场地或结界状态。',
    reusable: true,
    once: true,
    triggers: [{ type: 'battleStart' }],
    actions: [{ type: 'applyStatus', statusName: params.statusName }, logAction(params.message)],
    notes: params.notes,
  };
}

function relationshipShortcut(params: {
  id: string;
  label: string;
  target: string;
  min: number;
  flag: string;
  message: string;
  notes?: string;
}): BossMechanicDefinition {
  return {
    id: params.id,
    kind: 'relationshipShortcut',
    label: params.label,
    description: `${params.target} 好感达到 ${params.min} 时开放捷径。`,
    reusable: true,
    once: true,
    triggers: [{ type: 'relationshipAtLeast', relationshipTarget: params.target, relationshipMin: params.min }],
    actions: [{ type: 'setFlag', flag: params.flag, value: true }, logAction(params.message)],
    notes: params.notes,
  };
}

function companionMissingRule(params: {
  id: string;
  label: string;
  companion: string;
  message: string;
  notes?: string;
}): BossMechanicDefinition {
  return {
    id: params.id,
    kind: 'specialRule',
    label: params.label,
    description: `关系系统在场人物缺少 ${params.companion} 时阻止或延后战斗。`,
    reusable: true,
    triggers: [{ type: 'companionMissing', companion: params.companion }],
    actions: [{ type: 'skipBattle' }, logAction(params.message)],
    notes: params.notes,
  };
}

function manualRule(params: {
  id: string;
  kind: BossMechanicKind;
  label: string;
  description: string;
  message: string;
  notes?: string;
}): BossMechanicDefinition {
  return {
    id: params.id,
    kind: params.kind,
    label: params.label,
    description: params.description,
    reusable: true,
    triggers: [{ type: 'manual' }],
    actions: [logAction(params.message)],
    notes: params.notes,
  };
}

function phaseByClimax(params: {
  id: string;
  label: string;
  climaxCounterKey: string;
  threshold: number;
  phase: number;
  skillPoolKey: string;
  message: string;
  notes?: string;
}): BossMechanicDefinition {
  const actions: BossMechanicAction[] = [
    { type: 'setPhase', phase: params.phase },
    { type: 'setSkillPool', skillPoolKey: params.skillPoolKey },
    {
      type: 'resetCombatResources',
      resourceTarget: 'both',
      resetPleasure: true,
      resetClimaxCount: true,
    },
  ];
  actions.push(logAction(params.message));

  return {
    id: params.id,
    kind: 'phaseTransition',
    label: params.label,
    description: `${params.climaxCounterKey} 计数达到 ${params.threshold} 后切换至第 ${params.phase} 阶段。`,
    reusable: true,
    once: true,
    triggers: [{ type: 'climaxCountAtLeast', climaxCounterKey: params.climaxCounterKey, threshold: params.threshold }],
    actions,
    notes: params.notes,
  };
}

export const EXORCISM_BOSS_DEFINITIONS: DeclarativeBossDefinition[] = [
  {
    id: 'exorcism_amanda',
    sourceEntry: '驱魔_Boss_阿曼达.txt',
    displayName: '阿曼达',
    aliases: ['阿曼达', 'Amanda'],
    category: 'exorcism',
    status: 'draft',
    phases: [
      { phase: 1, displayName: '修女仪式', dataKey: '阿曼达_一阶段', skillPoolKey: 'amanda_nun' },
      {
        phase: 2,
        displayName: '魅魔觉醒',
        dataKey: '阿曼达_二阶段',
        skillPoolKey: 'amanda_awakened',
        statMultiplier: 1.3,
      },
    ],
    mechanics: [
      phaseByHp({
        id: 'amanda_hp40_awaken',
        label: '魅魔觉醒',
        threshold: 40,
        fromPhase: 1,
        phase: 2,
        skillPoolKey: 'amanda_awakened',
        message: '阿曼达进入二阶段，洗脑系技能池与倍率切换。',
      }),
      skillModifier({
        id: 'amanda_brainwash_boost',
        label: '洗脑系强化',
        phase: 2,
        skillTags: ['brainwash', 'ritual'],
        multiplier: 1.5,
        message: '二阶段洗脑/仪式标签技能效果提高。',
      }),
      dialogueStun({
        id: 'amanda_mother_dialogue_stun',
        label: '母性称呼硬直',
        dialogueIncludes: ['求饶', '妈妈', '撒娇'],
        duration: 1,
        message: '命中特定称呼后阿曼达短暂失神。',
      }),
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B2_阿曼达净化'] },
  },
  {
    id: 'exorcism_anawen',
    sourceEntry: '驱魔_Boss_阿娜温.txt',
    displayName: '阿娜温',
    aliases: ['阿娜温', 'Anawen'],
    category: 'exorcism',
    status: 'draft',
    phases: [{ phase: 1, displayName: '植物寄生体', dataKey: '阿娜温', skillPoolKey: 'anawen_plant' }],
    mechanics: [
      aura({
        id: 'anawen_pollen_aura',
        label: '花粉场地',
        statusName: '驱魔_阿娜温_花粉麻痹',
        message: '阿娜温战斗开始时施加花粉场地。',
      }),
      skillProgress({
        id: 'anawen_parasite_progress',
        label: '植物寄生进度',
        skillTags: ['plant', 'pollen', 'parasite'],
        stateKey: 'plantAssimilation',
        amount: 12,
        message: '植物/花粉/寄生标签命中后累积寄生进度。',
      }),
      progressJudgement({
        id: 'anawen_root_judgement',
        label: '根系同化判定',
        stateKey: 'plantAssimilation',
        threshold: 100,
        judgementKey: 'anawen_root_break',
        requiredSuccesses: 3,
        message: '植物寄生进度满后进入连续挣脱判定。',
      }),
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B4_阿娜温净化'] },
  },
  {
    id: 'exorcism_dark_elf',
    sourceEntry: '驱魔_Boss_暗精灵娘.txt',
    displayName: '暗精灵娘',
    aliases: ['暗精灵娘', '暗精灵'],
    category: 'exorcism',
    status: 'draft',
    phases: [{ phase: 1, displayName: '暗精灵魅惑者', dataKey: '暗精灵娘', skillPoolKey: 'dark_elf_charm' }],
    mechanics: [
      skillProgress({
        id: 'dark_elf_mental_erosion',
        label: '精神侵蚀',
        skillTags: ['charm', 'mental', 'illusion'],
        stateKey: 'mentalErosion',
        amount: 15,
        message: '魅惑/精神/幻术标签命中后累积精神侵蚀。',
      }),
      progressJudgement({
        id: 'dark_elf_corruption_judgement',
        label: '堕化连续判定',
        stateKey: 'mentalErosion',
        threshold: 100,
        judgementKey: 'dark_elf_will_check',
        requiredSuccesses: 3,
        difficultyModifier: 20,
        message: '精神侵蚀满后开启连续意志判定。',
      }),
      {
        id: 'dark_elf_failed_judgement_counter',
        kind: 'judgementChallenge',
        label: '判定失败累积',
        description: '连续判定失败次数达到阈值时触发失败分支。',
        reusable: true,
        once: true,
        triggers: [{ type: 'judgementFailed', counterKey: 'dark_elf_will_check', threshold: 3 }],
        actions: [{ type: 'triggerBadEnd' }, logAction('暗精灵娘的精神侵蚀判定失败达到阈值。')],
      },
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B4_暗精灵娘净化'] },
  },
  {
    id: 'exorcism_hachishaku',
    sourceEntry: '驱魔_Boss_八尺夫人.txt',
    displayName: '八尺夫人',
    aliases: ['八尺夫人', '八尺'],
    category: 'exorcism',
    status: 'draft',
    phases: [
      { phase: 1, displayName: '慈母阶段', dataKey: '八尺夫人_慈母', skillPoolKey: 'hachishaku_mother' },
      { phase: 2, displayName: '真母阶段', dataKey: '八尺夫人_真母', skillPoolKey: 'hachishaku_true_mother' },
    ],
    mechanics: [
      aura({
        id: 'hachishaku_size_pressure',
        label: '体格差压制',
        statusName: '驱魔_八尺夫人_体格差压制',
        message: '八尺夫人战斗开始时施加挣脱判定难度修正。',
      }),
      phaseByHp({
        id: 'hachishaku_hp40_true_mother',
        label: '真母阶段',
        threshold: 40,
        fromPhase: 1,
        phase: 2,
        skillPoolKey: 'hachishaku_true_mother',
        message: '八尺夫人进入二阶段真母形态。',
        notes: '世界书还允许通过拒绝母爱类台词提前触发。',
      }),
      {
        id: 'hachishaku_reject_love_transition',
        kind: 'phaseTransition',
        label: '拒绝母爱转阶段',
        description: '玩家明确拒绝时提前进入二阶段。',
        reusable: true,
        once: true,
        triggers: [{ type: 'playerDialogue', dialogueIncludes: ['拒绝', '不是妈妈', '不需要母爱'] }],
        actions: [
          { type: 'setPhase', phase: 2 },
          { type: 'setSkillPool', skillPoolKey: 'hachishaku_true_mother' },
          logAction('玩家拒绝母爱，八尺夫人提前进入真母阶段。'),
        ],
      },
      {
        id: 'hachishaku_gender_variant',
        kind: 'genderVariant',
        label: '性别差异化技能池',
        description: '按主角性别选择二阶段技能变体。',
        reusable: true,
        triggers: [
          { type: 'playerGenderIs', phase: 2, gender: '男' },
          { type: 'playerGenderIs', phase: 2, gender: '女' },
        ],
        actions: [logAction('八尺夫人按玩家性别启用对应技能变体。')],
      },
      {
        id: 'hachishaku_hp15_forced_ultimate',
        kind: 'forcedUltimate',
        label: '胎内回归判定',
        description: '二阶段 HP 低于 15% 时强制进入 3 回合连续判定。',
        reusable: true,
        once: true,
        triggers: [{ type: 'hpPercentAtOrBelow', phase: 2, threshold: 15 }],
        actions: [
          {
            type: 'startJudgement',
            judgementKey: 'hachishaku_final_return',
            requiredSuccesses: 3,
            difficultyModifier: 0,
          },
          logAction('八尺夫人濒死时触发最终连续判定。'),
        ],
      },
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B4_八尺夫人净化'] },
  },
  {
    id: 'exorcism_tsubaki',
    sourceEntry: '驱魔_Boss_鬼巫女椿.txt',
    displayName: '鬼巫女椿',
    aliases: ['鬼巫女椿', '椿'],
    category: 'exorcism',
    status: 'draft',
    phases: [
      { phase: 1, displayName: '鬼族巫女', dataKey: '鬼巫女椿_一阶段', skillPoolKey: 'tsubaki_oni_miko' },
      { phase: 2, displayName: '狐妻觉醒', dataKey: '鬼巫女椿_二阶段', skillPoolKey: 'tsubaki_fox_wife' },
    ],
    mechanics: [
      {
        id: 'tsubaki_purification_seal',
        kind: 'skillTagModifier',
        label: '净化封印',
        description: '风音在场时，椿会压制净化标签效果。',
        reusable: true,
        once: true,
        triggers: [{ type: 'companionPresent', companion: '风音' }],
        actions: [
          { type: 'modifySkillTag', skillTags: ['purification'], multiplier: 0.5 },
          logAction('鬼巫女椿对风音施加净化封印。'),
        ],
      },
      phaseByHp({
        id: 'tsubaki_hp50_fox_wife',
        label: '狐妻觉醒',
        threshold: 50,
        fromPhase: 1,
        phase: 2,
        skillPoolKey: 'tsubaki_fox_wife',
        message: '鬼巫女椿进入狐妻觉醒阶段。',
      }),
      skillModifier({
        id: 'tsubaki_phase2_skill_boost',
        label: '狐妻阶段强化',
        phase: 2,
        skillTags: ['corruption', 'foxFire', 'seed'],
        multiplier: 1.25,
        message: '狐妻觉醒后堕落/狐火/种子标签强化。',
      }),
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B3_鬼巫女椿压制'], companionNames: ['风音', '铃音'] },
  },
  {
    id: 'exorcism_oni_sakura',
    sourceEntry: '驱魔_Boss_鬼樱.txt',
    displayName: '鬼樱',
    aliases: ['鬼樱'],
    category: 'exorcism',
    status: 'draft',
    phases: [
      { phase: 1, displayName: '堕落风音', dataKey: '鬼樱', skillPoolKey: 'oni_sakura_single' },
      { phase: 2, displayName: '双子堕落', dataKey: '鬼樱_铃音连锁', skillPoolKey: 'oni_sakura_twins' },
    ],
    mechanics: [
      aura({
        id: 'oni_sakura_fallen_barrier',
        label: '堕落结界',
        statusName: '驱魔_鬼樱_堕落结界',
        message: '鬼樱战斗开始时施加堕落结界。',
      }),
      {
        id: 'oni_sakura_name_wakeup',
        kind: 'companionWakeup',
        label: '呼唤风音',
        description: '每次呼唤风音名字累积唤醒进度，3 次触发闪回。',
        reusable: true,
        triggers: [{ type: 'playerDialogue', dialogueIncludes: ['风音'] }],
        actions: [
          { type: 'addProgress', stateKey: 'oniSakuraWakeup', amount: 1 },
          { type: 'stun', duration: 1 },
          logAction('呼唤风音使鬼樱出现唤醒波动。'),
        ],
      },
      relationshipShortcut({
        id: 'oni_sakura_relationship_wakeup',
        label: '好感唤醒捷径',
        target: '风音',
        min: 50,
        flag: 'oni_sakura_flashback_ready',
        message: '风音好感达到阈值，真诚呼唤可直接触发闪回。',
      }),
      progressJudgement({
        id: 'oni_sakura_wakeup_complete',
        label: '唤醒闪回',
        stateKey: 'oniSakuraWakeup',
        threshold: 3,
        judgementKey: 'oni_sakura_wakeup',
        requiredSuccesses: 1,
        message: '鬼樱唤醒进度达到 3，进入闪回窗口。',
      }),
      phaseByTurn({
        id: 'oni_sakura_turn15_rinn_falls',
        label: '铃音连锁堕落',
        turn: 15,
        phase: 2,
        skillPoolKey: 'oni_sakura_twins',
        blockedByFlag: 'oni_sakura_wakeup_complete',
        message: '15 回合内未完成唤醒，铃音加入敌方阶段。',
      }),
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B3_鬼樱唤醒'], companionNames: ['铃音'] },
  },
  {
    id: 'exorcism_dark_slime',
    sourceEntry: '驱魔_Boss_黑暗史莱姆.txt',
    displayName: '黑暗史莱姆',
    aliases: ['黑暗史莱姆', '史莱姆'],
    category: 'exorcism',
    status: 'draft',
    phases: [{ phase: 1, displayName: '黑暗核心', dataKey: '黑暗史莱姆', skillPoolKey: 'dark_slime' }],
    mechanics: [
      aura({
        id: 'dark_slime_engulf_field',
        label: '吞没场地',
        statusName: '驱魔_黑暗史莱姆_吞没场地',
        message: '黑暗史莱姆战斗开始时施加吞没场地。',
      }),
      skillProgress({
        id: 'dark_slime_assimilation',
        label: '同化进度',
        skillTags: ['engulf', 'slime', 'corrosion'],
        stateKey: 'slimeAssimilation',
        amount: 15,
        message: '吞没/史莱姆/腐蚀标签命中后累积同化进度。',
      }),
      {
        id: 'dark_slime_core_weakness',
        kind: 'specialRule',
        label: '核心弱点',
        description: '命中核心或净化标签时暴露弱点窗口。',
        reusable: true,
        triggers: [{ type: 'skillTagHit', skillTags: ['core', 'purification'], skillActor: 'player' }],
        actions: [
          { type: 'setFlag', flag: 'dark_slime_core_exposed', value: true },
          logAction('黑暗史莱姆核心弱点暴露。'),
        ],
      },
      progressJudgement({
        id: 'dark_slime_assimilation_judgement',
        label: '史莱姆同化判定',
        stateKey: 'slimeAssimilation',
        threshold: 100,
        judgementKey: 'dark_slime_breakout',
        requiredSuccesses: 3,
        message: '史莱姆同化进度满后进入挣脱判定。',
      }),
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B4_黑暗史莱姆净化'] },
  },
  {
    id: 'exorcism_zombie_tianyu',
    sourceEntry: '驱魔_Boss_僵尸天羽.txt',
    displayName: '僵尸天羽',
    aliases: ['僵尸天羽', '僵尸凰天羽'],
    category: 'exorcism',
    status: 'draft',
    phases: [{ phase: 1, displayName: '僵尸化天羽', dataKey: '僵尸天羽', skillPoolKey: 'zombie_tianyu' }],
    mechanics: [
      manualRule({
        id: 'zombie_tianyu_stat_source',
        kind: 'specialRule',
        label: '动态数值来源',
        description: '战斗数值应从凰天羽当前人物数据派生，不在前端硬编码固定范围。',
        message: '僵尸天羽需要读取凰天羽现有角色数据作为基础。',
      }),
      {
        id: 'zombie_tianyu_purification_window',
        kind: 'protectRitual',
        label: '净化窗口',
        description: '天羽高潮计数达到 1 后开启 1 回合净化仪式窗口。',
        reusable: true,
        once: true,
        triggers: [{ type: 'climaxCountAtLeast', climaxCounterKey: 'zombie_tianyu', threshold: 1 }],
        actions: [
          { type: 'startRitual', ritualKey: 'zombie_tianyu_purification', requiredTurns: 1 },
          logAction('僵尸天羽进入 1 回合净化窗口。'),
        ],
      },
      {
        id: 'zombie_tianyu_fuyin_guard',
        kind: 'specialRule',
        label: '符咒使用限制',
        description: '不合规使用关键符咒时应取消本回合行动。',
        reusable: true,
        triggers: [{ type: 'skillTagUsed', skillTags: ['forbiddenTalisman'], skillActor: 'player' }],
        actions: [{ type: 'cancelAction' }, logAction('风音中断了不合规符咒使用，本回合行动取消。')],
      },
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B1_僵尸天羽净化'], companionNames: ['风音'] },
  },
  {
    id: 'exorcism_chloe',
    sourceEntry: '驱魔_Boss_克洛伊.txt',
    displayName: '克洛伊',
    aliases: ['克洛伊', 'Chloe'],
    category: 'exorcism',
    status: 'draft',
    phases: [
      { phase: 1, displayName: '魔化面', dataKey: '克洛伊_魔化面', skillPoolKey: 'chloe_demonic' },
      { phase: 2, displayName: '神化面', dataKey: '克洛伊_神化面', skillPoolKey: 'chloe_sacred' },
    ],
    mechanics: [
      {
        id: 'chloe_damage_step_to_sacred',
        kind: 'personaSwitch',
        label: '伤害步进神化面切换',
        description: '魔化面每承受 20% 总伤害触发一次人格争夺，取消当前行动并切换至神化面。',
        reusable: true,
        triggers: [{ type: 'damageTakenPercentStep', phase: 1, everyPercent: 20 }],
        actions: [
          { type: 'cancelAction' },
          { type: 'setPhase', phase: 2 },
          { type: 'setSkillPool', skillPoolKey: 'chloe_sacred' },
          logAction('克洛伊人格切换为神化面，当前行动取消。'),
        ],
      },
      {
        id: 'chloe_damage_step_to_demonic',
        kind: 'personaSwitch',
        label: '伤害步进魔化面切换',
        description: '神化面每承受 20% 总伤害触发一次人格争夺，取消当前行动并切换至魔化面。',
        reusable: true,
        triggers: [{ type: 'damageTakenPercentStep', phase: 2, everyPercent: 20 }],
        actions: [
          { type: 'cancelAction' },
          { type: 'setPhase', phase: 1 },
          { type: 'setSkillPool', skillPoolKey: 'chloe_demonic' },
          logAction('克洛伊人格切换为魔化面，当前行动取消。'),
        ],
      },
      dialogueStun({
        id: 'chloe_true_name_stun',
        label: '呼唤真名',
        dialogueIncludes: ['克洛伊'],
        duration: 1,
        message: '呼唤克洛伊真名造成 1 回合人格冲突硬直。',
      }),
      {
        id: 'chloe_purification_force_sacred',
        kind: 'personaSwitch',
        label: '净化强制神化面',
        description: '净化或圣系标签命中时强制切换至神化面。',
        reusable: true,
        triggers: [{ type: 'skillTagUsed', skillTags: ['purification', 'holy'], skillActor: 'player' }],
        actions: [
          { type: 'setPhase', phase: 2 },
          { type: 'setSkillPool', skillPoolKey: 'chloe_sacred' },
          logAction('净化/圣系标签强制克洛伊切换至神化面。'),
        ],
      },
      {
        id: 'chloe_corruption_force_demonic',
        kind: 'personaSwitch',
        label: '污秽强制魔化面',
        description: '腐化或暗系标签命中时强制切换至魔化面。',
        reusable: true,
        triggers: [{ type: 'skillTagUsed', skillTags: ['corruption', 'dark'], skillActor: 'player' }],
        actions: [
          { type: 'setPhase', phase: 1 },
          { type: 'setSkillPool', skillPoolKey: 'chloe_demonic' },
          logAction('腐化/暗系标签强制克洛伊切换至魔化面。'),
        ],
      },
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B4_克洛伊净化'] },
  },
  {
    id: 'exorcism_spirit_sakura',
    sourceEntry: '驱魔_Boss_灵樱.txt',
    displayName: '灵樱',
    aliases: ['灵樱'],
    category: 'exorcism',
    status: 'draft',
    phases: [{ phase: 1, displayName: '堕落铃音', dataKey: '灵樱', skillPoolKey: 'spirit_sakura' }],
    mechanics: [
      {
        id: 'spirit_sakura_name_wakeup',
        kind: 'companionWakeup',
        label: '呼唤铃音',
        description: '呼唤铃音名字累积唤醒进度。',
        reusable: true,
        triggers: [{ type: 'playerDialogue', dialogueIncludes: ['铃音'] }],
        actions: [
          { type: 'addProgress', stateKey: 'spiritSakuraWakeup', amount: 1 },
          { type: 'stun', duration: 1 },
          logAction('呼唤铃音使灵樱产生唤醒波动。'),
        ],
      },
      {
        id: 'spirit_sakura_kazane_support',
        kind: 'companionWakeup',
        label: '风音支援',
        description: '风音在场时推进唤醒目标。',
        reusable: true,
        once: true,
        triggers: [{ type: 'companionPresent', companion: '风音' }],
        actions: [
          { type: 'addProgress', stateKey: 'spiritSakuraWakeup', amount: 1 },
          logAction('风音在场，灵樱唤醒进度获得额外推进。'),
        ],
      },
      relationshipShortcut({
        id: 'spirit_sakura_relationship_shortcut',
        label: '铃音好感捷径',
        target: '铃音',
        min: 50,
        flag: 'spirit_sakura_wakeup_shortcut',
        message: '铃音好感达到阈值，唤醒流程获得捷径。',
      }),
      progressJudgement({
        id: 'spirit_sakura_wakeup_complete',
        label: '灵樱唤醒判定',
        stateKey: 'spiritSakuraWakeup',
        threshold: 3,
        judgementKey: 'spirit_sakura_wakeup',
        requiredSuccesses: 1,
        message: '灵樱唤醒进度达到 3，进入唤醒判定。',
      }),
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B5_灵樱唤醒'], companionNames: ['风音'] },
  },
  {
    id: 'exorcism_jorogumo',
    sourceEntry: '驱魔_Boss_络新妇.txt',
    displayName: '络新妇',
    aliases: ['络新妇', 'Jorogumo', 'Jorōgumo', '蛛娘'],
    category: 'exorcism',
    status: 'draft',
    phases: [{ phase: 1, displayName: '络新妇', dataKey: '络新妇', skillPoolKey: 'jorogumo' }],
    mechanics: [
      skillProgress({
        id: 'jorogumo_cocoon_progress',
        label: '茧化进度',
        skillTags: ['silk', 'cocoon', 'parasite', 'brainwash'],
        stateKey: 'jorogumoCocoon',
        amount: 10,
        message: '络新妇的蛛丝、寄生或洗脑标签命中后累积茧化进度。',
        notes: '世界书中不同技能分别提供 +5/+10/+15 茧化进度；声明层先保留通用进度入口，差异由后续技能标签适配层细化。',
      }),
      {
        id: 'jorogumo_rebirth_ultimate',
        kind: 'forcedUltimate',
        label: '丝茧重生启动',
        description: '茧化进度达到 80 或连续败北 2 次时强制启动同化终局技能。',
        reusable: true,
        once: true,
        triggers: [
          { type: 'progressAtLeast', stateKey: 'jorogumoCocoon', threshold: 80 },
          { type: 'lossCountAtLeast', lossCounterKey: 'jorogumoLoss', threshold: 2 },
        ],
        actions: [{ type: 'forceSkill', skillId: '络新妇_10' }, logAction('络新妇启动“蛛娘女儿化·丝茧重生”。')],
      },
      progressOrLossJudgement({
        id: 'jorogumo_cocoon_rebirth_judgement',
        label: '丝茧重生五段判定',
        stateKey: 'jorogumoCocoon',
        progressThreshold: 80,
        lossCounterKey: 'jorogumoLoss',
        lossThreshold: 2,
        judgementKey: 'jorogumo_cocoon_rebirth',
        requiredSuccesses: 5,
        difficultyModifier: 25,
        message: '茧化进度或败北次数达到阈值，开启五段连续意志判定。',
        notes: '世界书为包裹、茧化完成、肢体蛛化、意识改写、破茧重生五阶段；任意阶段成功则同化中断。',
      }),
      {
        id: 'jorogumo_cocoon_bad_end',
        kind: 'judgementChallenge',
        label: '蛛娘的女儿',
        description: '丝茧重生五段判定全部失败时触发失败分支。',
        reusable: true,
        once: true,
        triggers: [{ type: 'judgementFailed', counterKey: 'jorogumo_cocoon_rebirth', threshold: 5 }],
        actions: [{ type: 'triggerBadEnd' }, logAction('络新妇完成丝茧重生，触发 Bad End“蛛娘的女儿”。')],
      },
      dialogueStun({
        id: 'jorogumo_loneliness_stun',
        label: '孤独动摇',
        dialogueIncludes: ['孤独', '陪伴', '温柔'],
        duration: 1,
        message: '真诚触及孤独与陪伴时，络新妇短暂动摇。',
      }),
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B3_络新妇净化'] },
  },
  {
    id: 'exorcism_nekomata',
    sourceEntry: '驱魔_Boss_猫又.txt',
    displayName: '猫又',
    aliases: ['猫又'],
    category: 'exorcism',
    status: 'draft',
    phases: [{ phase: 1, displayName: '猫又妖化', dataKey: '猫又', skillPoolKey: 'nekomata' }],
    mechanics: [
      skillProgress({
        id: 'nekomata_assimilation_progress',
        label: '猫化同化进度',
        skillTags: ['cat', 'charm', 'assimilation'],
        stateKey: 'catAssimilation',
        amount: 15,
        message: '猫又标签技能命中后累积猫化同化进度。',
      }),
      progressOrLossJudgement({
        id: 'nekomata_three_step_judgement',
        label: '猫又三段判定',
        stateKey: 'catAssimilation',
        progressThreshold: 80,
        lossCounterKey: 'nekomataLoss',
        lossThreshold: 2,
        judgementKey: 'nekomata_assimilation',
        requiredSuccesses: 3,
        message: '猫又同化进度或战败次数达到阈值，开启三段判定。',
      }),
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B3_猫又净化'] },
  },
  {
    id: 'exorcism_gargoyle',
    sourceEntry: '驱魔_Boss_石像鬼娘.txt',
    displayName: '石像鬼娘',
    aliases: ['石像鬼娘', '石像鬼'],
    category: 'exorcism',
    status: 'draft',
    phases: [{ phase: 1, displayName: '石像鬼伏击者', dataKey: '石像鬼娘', skillPoolKey: 'gargoyle' }],
    mechanics: [
      {
        id: 'gargoyle_ambush',
        kind: 'specialRule',
        label: '伏击先手',
        description: '战斗开始时强制使用伏击开场技。',
        reusable: true,
        once: true,
        triggers: [{ type: 'battleStart' }],
        actions: [{ type: 'forceSkill', skillId: 'gargoyle_ambush' }, logAction('石像鬼娘以伏击技能开场。')],
      },
      {
        id: 'gargoyle_stone_gaze',
        kind: 'environmentAura',
        label: '石化凝视',
        description: '石化凝视标签命中时施加石化状态。',
        reusable: true,
        triggers: [{ type: 'skillTagHit', skillTags: ['stoneGaze'], skillActor: 'enemy' }],
        actions: [{ type: 'applyStatus', statusName: '驱魔_石像鬼娘_石化凝视' }, logAction('石像鬼娘的石化凝视命中。')],
      },
      skillProgress({
        id: 'gargoyle_corruption_progress',
        label: '石化侵蚀进度',
        skillTags: ['stone', 'corruption'],
        stateKey: 'gargoyleCorruption',
        amount: 10,
        message: '石化/腐化标签命中后累积石化侵蚀进度。',
      }),
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B4_石像鬼娘净化'] },
  },
  {
    id: 'exorcism_shuangning',
    sourceEntry: '驱魔_Boss_霜凝.txt',
    displayName: '霜凝',
    aliases: ['霜凝'],
    category: 'exorcism',
    status: 'draft',
    phases: [{ phase: 1, displayName: '僵尸娘小 Boss', dataKey: '霜凝', skillPoolKey: 'shuangning' }],
    mechanics: [
      aura({
        id: 'shuangning_cold_aura',
        label: '寒气尸香',
        statusName: '驱魔_霜凝_寒气尸香',
        message: '霜凝战斗开始时施加寒气场地。',
      }),
      lossBadEnd({
        id: 'shuangning_third_loss_conversion',
        label: '第三次败北转化',
        lossCounterKey: 'shuangningLoss',
        threshold: 3,
        message: '霜凝败北计数达到 3，触发转化分支。',
        notes: '计数应由任务系统持久化；净化解除条件在 B5 后由任务系统处理。',
      }),
      {
        id: 'shuangning_defeat_judgement_failure',
        kind: 'judgementChallenge',
        label: '战败连续失败',
        description: '任意战败结算中连续 3 次判定失败也会触发失败分支。',
        reusable: true,
        once: true,
        triggers: [{ type: 'judgementFailed', counterKey: 'shuangning_defeat_will', threshold: 3 }],
        actions: [{ type: 'triggerBadEnd' }, logAction('霜凝战败判定连续失败达到阈值。')],
      },
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B1_霜凝净化'] },
  },
  {
    id: 'exorcism_tengu',
    sourceEntry: '驱魔_Boss_天狗.txt',
    displayName: '天狗',
    aliases: ['天狗', '天狗娘'],
    category: 'exorcism',
    status: 'draft',
    phases: [{ phase: 1, displayName: '天狗娘', dataKey: '天狗', skillPoolKey: 'tengu' }],
    mechanics: [
      skillProgress({
        id: 'tengu_hatching_progress',
        label: '孵化进度',
        skillTags: ['feather', 'nest', 'hatching'],
        stateKey: 'hatchingProgress',
        amount: 15,
        message: '羽毛/巢穴/孵化标签命中后累积孵化进度。',
      }),
      progressOrLossJudgement({
        id: 'tengu_four_step_judgement',
        label: '天狗四段判定',
        stateKey: 'hatchingProgress',
        progressThreshold: 80,
        lossCounterKey: 'tenguLoss',
        lossThreshold: 2,
        judgementKey: 'tengu_hatching',
        requiredSuccesses: 4,
        message: '孵化进度或战败次数达到阈值，开启四段连续判定。',
      }),
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B3_天狗净化'] },
  },
  {
    id: 'exorcism_mother_of_demons',
    sourceEntry: '驱魔_Boss_万魔之母.txt',
    displayName: '万魔之母',
    aliases: ['万魔之母', '万魔母'],
    category: 'exorcism',
    status: 'draft',
    phases: [
      { phase: 1, displayName: '萝莉形态', dataKey: '万魔之母_一阶段', skillPoolKey: 'mother_demon_child' },
      { phase: 2, displayName: '少女形态', dataKey: '万魔之母_二阶段', skillPoolKey: 'mother_demon_girl' },
      { phase: 3, displayName: '熟女形态', dataKey: '万魔之母_三阶段', skillPoolKey: 'mother_demon_mature' },
    ],
    mechanics: [
      phaseByHp({
        id: 'mother_demon_hp60_phase2',
        label: '少女形态',
        threshold: 60,
        fromPhase: 1,
        phase: 2,
        skillPoolKey: 'mother_demon_girl',
        message: '万魔之母进入第二阶段。',
      }),
      phaseByHp({
        id: 'mother_demon_hp30_phase3',
        label: '熟女形态',
        threshold: 30,
        fromPhase: 2,
        phase: 3,
        skillPoolKey: 'mother_demon_mature',
        message: '万魔之母进入第三阶段。',
      }),
      {
        id: 'mother_demon_hp10_forced_ultimate',
        kind: 'forcedUltimate',
        label: '终局强制奥义',
        description: 'HP 低于 10% 时强制进入最终判定。',
        reusable: true,
        once: true,
        triggers: [{ type: 'hpPercentAtOrBelow', phase: 3, threshold: 10 }],
        actions: [
          { type: 'forceSkill', skillId: 'mother_demon_final_ultimate' },
          { type: 'startJudgement', judgementKey: 'mother_demon_final', requiredSuccesses: 3 },
          logAction('万魔之母触发终局强制奥义。'),
        ],
      },
      {
        id: 'mother_demon_final_ritual',
        kind: 'protectRitual',
        label: '封印核心净化仪式',
        description: '最终击破后开启多回合净化/封印保护流程。',
        reusable: true,
        triggers: [{ type: 'manual' }],
        actions: [
          { type: 'startRitual', ritualKey: 'mother_demon_core_seal', requiredTurns: 3 },
          logAction('万魔之母击破后开启封印核心净化仪式。'),
        ],
      },
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B5_万魔之母封印'], companionNames: ['风音'] },
  },
  {
    id: 'exorcism_veil',
    sourceEntry: '驱魔_Boss_薇尔.txt',
    displayName: '薇尔',
    aliases: ['薇尔'],
    category: 'exorcism',
    status: 'draft',
    phases: [{ phase: 1, displayName: '初拥吸血姬', dataKey: '薇尔', skillPoolKey: 'veil' }],
    mechanics: [
      companionMissingRule({
        id: 'veil_requires_vesiel',
        label: '维斯伊尔同行门槛',
        companion: '维斯伊尔',
        message: '缺少维斯伊尔在场，薇尔净化战应延后。',
      }),
      manualRule({
        id: 'veil_stat_source',
        kind: 'specialRule',
        label: '动态数值来源',
        description: '薇尔数值应从维斯伊尔当前人物数据派生，不在前端硬编码固定范围。',
        message: '薇尔需要读取维斯伊尔现有角色数据作为基础。',
      }),
      dialogueStun({
        id: 'veil_true_name_stun',
        label: '呼唤原名',
        dialogueIncludes: ['维斯伊尔'],
        duration: 1,
        message: '呼唤维斯伊尔原名造成薇尔 1 回合硬直。',
      }),
      {
        id: 'veil_purification_ritual',
        kind: 'protectRitual',
        label: '血契解除仪式',
        description: '击破后由风音进行净化仪式解除血契。',
        reusable: true,
        triggers: [{ type: 'manual' }],
        actions: [
          { type: 'startRitual', ritualKey: 'veil_blood_contract', requiredTurns: 1 },
          logAction('薇尔击破后开启血契解除仪式。'),
        ],
      },
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B2_薇尔净化'], companionNames: ['维斯伊尔', '风音'] },
  },
  {
    id: 'exorcism_wuchang',
    sourceEntry: '驱魔_Boss_无常.txt',
    displayName: '无常',
    aliases: ['无常', '无常姐妹', '黑白无常', '黑无常', '白无常'],
    category: 'exorcism',
    status: 'draft',
    phases: [
      { phase: 1, displayName: '小黑单独出战', dataKey: '无常_小黑', skillPoolKey: 'wuchang_black', climaxLimit: 1 },
      { phase: 2, displayName: '小白接替出战', dataKey: '无常_小白', skillPoolKey: 'wuchang_white', climaxLimit: 1 },
      { phase: 3, displayName: '黑白双人联战', dataKey: '无常_双人', skillPoolKey: 'wuchang_dual', climaxLimit: 3 },
    ],
    mechanics: [
      phaseByClimax({
        id: 'wuchang_black_down_phase2',
        label: '小白接替',
        climaxCounterKey: 'wuchang_black',
        threshold: 1,
        phase: 2,
        skillPoolKey: 'wuchang_white',
        message: '小黑被压制后，小白接替进入第二阶段。',
      }),
      phaseByClimax({
        id: 'wuchang_white_down_phase3',
        label: '双人联战',
        climaxCounterKey: 'wuchang_white',
        threshold: 1,
        phase: 3,
        skillPoolKey: 'wuchang_dual',
        message: '小白被压制后，黑白无常进入双人联战。',
      }),
      {
        id: 'wuchang_dual_actor_phase',
        kind: 'multiActor',
        label: '双人同场',
        description: '第三阶段小黑/小白同时在场，需要同回合击倒。',
        reusable: true,
        once: true,
        triggers: [{ type: 'phaseEnter', phase: 3 }],
        actions: [
          { type: 'markActorState', actorId: 'wuchang_black', actorState: 'active' },
          { type: 'markActorState', actorId: 'wuchang_white', actorState: 'active' },
          logAction('无常第三阶段启用双人同场机制。'),
        ],
      },
      {
        id: 'wuchang_revive_if_not_simultaneous',
        kind: 'reviveRule',
        label: '非同步击破复活',
        description: '第三阶段若只击倒一方，3 回合后复活。',
        reusable: true,
        triggers: [
          { type: 'actorDefeated', phase: 3, actorId: 'wuchang_black' },
          { type: 'actorDefeated', phase: 3, actorId: 'wuchang_white' },
        ],
        actions: [
          { type: 'setCounter', counterKey: 'wuchang_revive_turns', value: 3 },
          logAction('无常双人阶段未同步击破，启动 3 回合复活倒计时。'),
        ],
      },
      {
        id: 'wuchang_dual_clear',
        kind: 'multiActor',
        label: '同步击破完成',
        description: '第三阶段小黑/小白均被击倒时完成战斗。',
        reusable: true,
        once: true,
        triggers: [{ type: 'allActorsDefeated', phase: 3, actorIds: ['wuchang_black', 'wuchang_white'] }],
        actions: [{ type: 'setFlag', flag: 'wuchang_dual_defeated', value: true }, logAction('黑白无常已同步击破。')],
      },
      lossBadEnd({
        id: 'wuchang_third_loss_bad_end',
        label: '第三次败北仪式',
        lossCounterKey: 'wuchangLoss',
        threshold: 3,
        message: '无常败北计数达到 3，触发特殊失败分支。',
      }),
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B1_无常净化'] },
  },
  {
    id: 'exorcism_heath',
    sourceEntry: '驱魔_Boss_希思.txt',
    displayName: '希思',
    aliases: ['希思', 'Heath'],
    category: 'exorcism',
    status: 'draft',
    phases: [
      { phase: 1, displayName: '支配烙印', dataKey: '希思_一阶段', skillPoolKey: 'heath_mark' },
      { phase: 2, displayName: '诅咒扩张', dataKey: '希思_二阶段', skillPoolKey: 'heath_curse' },
      { phase: 3, displayName: '同化终局', dataKey: '希思_三阶段', skillPoolKey: 'heath_assimilation' },
    ],
    mechanics: [
      phaseByHp({
        id: 'heath_hp66_phase2',
        label: '诅咒扩张',
        threshold: 66,
        fromPhase: 1,
        phase: 2,
        skillPoolKey: 'heath_curse',
        message: '希思进入第二阶段，解锁诅咒技能池。',
      }),
      phaseByHp({
        id: 'heath_hp33_phase3',
        label: '同化终局',
        threshold: 33,
        fromPhase: 2,
        phase: 3,
        skillPoolKey: 'heath_assimilation',
        message: '希思进入第三阶段，解锁同化技能池。',
      }),
      skillProgress({
        id: 'heath_mark_curse_progress',
        label: '烙印诅咒进度',
        skillTags: ['mark', 'curse', 'domination'],
        stateKey: 'heathAssimilation',
        amount: 12,
        message: '烙印/诅咒/支配标签命中后累积希思同化进度。',
      }),
      progressJudgement({
        id: 'heath_assimilation_judgement',
        label: '希思同化判定',
        stateKey: 'heathAssimilation',
        threshold: 100,
        judgementKey: 'heath_assimilation',
        requiredSuccesses: 3,
        message: '希思同化进度满后开启连续判定。',
      }),
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B2_希思净化'] },
  },
  {
    id: 'exorcism_yuki_onna',
    sourceEntry: '驱魔_Boss_雪女.txt',
    displayName: '雪女',
    aliases: ['雪女'],
    category: 'exorcism',
    status: 'draft',
    phases: [{ phase: 1, displayName: '雪女', dataKey: '雪女', skillPoolKey: 'yuki_onna' }],
    mechanics: [
      aura({
        id: 'yuki_onna_cold_field',
        label: '寒域',
        statusName: '驱魔_雪女_寒域',
        message: '雪女战斗开始时施加寒域。',
      }),
      skillProgress({
        id: 'yuki_onna_warmth_drain',
        label: '暖意流失进度',
        skillTags: ['cold', 'yangDrain', 'snow'],
        stateKey: 'warmthDrain',
        amount: 15,
        message: '寒气/阳气流失/雪系标签命中后累积暖意流失进度。',
      }),
      progressOrLossJudgement({
        id: 'yuki_onna_three_will_checks',
        label: '三连意志判定',
        stateKey: 'warmthDrain',
        progressThreshold: 80,
        lossCounterKey: 'yukiOnnaLoss',
        lossThreshold: 2,
        judgementKey: 'yuki_onna_will',
        requiredSuccesses: 3,
        message: '暖意流失进度或战败次数达到阈值，开启三连意志判定。',
      }),
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B3_雪女净化'] },
  },
  {
    id: 'exorcism_tamamo',
    sourceEntry: '驱魔_Boss_玉藻前.txt',
    displayName: '玉藻前',
    aliases: ['玉藻前', '玉藻'],
    category: 'exorcism',
    status: 'draft',
    phases: [
      { phase: 1, displayName: '九尾试探', dataKey: '玉藻前_一阶段', skillPoolKey: 'tamamo_phase1' },
      { phase: 2, displayName: '九尾觉醒', dataKey: '玉藻前_二阶段', skillPoolKey: 'tamamo_phase2' },
    ],
    mechanics: [
      phaseByTurn({
        id: 'tamamo_turn6_awaken',
        label: '第六回合觉醒',
        turn: 6,
        phase: 2,
        skillPoolKey: 'tamamo_phase2',
        blockedByFlag: 'tamamo_defeated_before_turn6',
        message: '玉藻前第六回合进入二阶段九尾觉醒。',
        notes: '5 回合内击破时由战斗结算写入 tamamo_defeated_before_turn6 并跳过二阶段。',
      }),
      relationshipShortcut({
        id: 'tamamo_elizabeth_relationship_skip',
        label: '伊丽莎白好感捷径',
        target: '伊丽莎白',
        min: 80,
        flag: 'tamamo_elizabeth_shortcut',
        message: '伊丽莎白好感达到 80，玉藻前战可走特殊捷径。',
      }),
      manualRule({
        id: 'tamamo_fast_clear_skip',
        kind: 'phaseTransition',
        label: '五回合内击破跳阶段',
        description: '若第 5 回合结束前击破一阶段，则跳过二阶段。',
        message: '玉藻前快攻击破条件由战斗结算写入 flag。',
      }),
    ],
    taskHooks: { questName: '驱魔', objectiveKeys: ['B3_玉藻前净化'], companionNames: ['伊丽莎白'] },
  },
];

export const EXORCISM_BOSS_DEFINITION_BY_ID = new Map(
  EXORCISM_BOSS_DEFINITIONS.map(definition => [definition.id, definition]),
);

export interface ExorcismBossDefinitionMatch {
  definition: DeclarativeBossDefinition;
  phase?: BossPhaseDefinition;
}

function normalizeBossDefinitionKeyword(keyword: string): string {
  return String(keyword || '')
    .trim()
    .toLowerCase();
}

function getBossPhaseIdentityNames(definition: DeclarativeBossDefinition, phase: BossPhaseDefinition): string[] {
  return [
    phase.displayName,
    phase.dataKey,
    phase.skillPoolKey,
    `${definition.displayName}·${phase.displayName}`,
  ].filter((name): name is string => Boolean(name));
}

export function getExorcismBossDefinitionMatch(keyword: string): ExorcismBossDefinitionMatch | undefined {
  const normalizedKeyword = normalizeBossDefinitionKeyword(keyword);

  for (const definition of EXORCISM_BOSS_DEFINITIONS) {
    if (
      normalizeBossDefinitionKeyword(definition.id) === normalizedKeyword ||
      normalizeBossDefinitionKeyword(definition.displayName) === normalizedKeyword ||
      normalizeBossDefinitionKeyword(definition.sourceEntry) === normalizedKeyword ||
      definition.aliases.some(alias => normalizeBossDefinitionKeyword(alias) === normalizedKeyword)
    ) {
      return { definition };
    }

    const phase = definition.phases.find(item =>
      getBossPhaseIdentityNames(definition, item).some(name => normalizeBossDefinitionKeyword(name) === normalizedKeyword),
    );
    if (phase) {
      return { definition, phase };
    }
  }

  return undefined;
}

export function getExorcismBossDefinition(keyword: string): DeclarativeBossDefinition | undefined {
  return getExorcismBossDefinitionMatch(keyword)?.definition;
}

export function isExorcismBossDefinitionReady(keyword: string): boolean {
  return getExorcismBossDefinition(keyword)?.status === 'ready';
}
