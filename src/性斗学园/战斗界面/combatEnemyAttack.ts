import * as BossSystem from './bossSystem';
import type { BossState } from './bossSystem';
import type { TalentData } from '../性斗学园脚本/data/talentDatabase';
import { executeAttack, type CombatResult } from './combatCalculator';
import type { Character, CombatLogEntry, Skill } from './types';
import * as TalentSystem from './talentSystem';
import type { TimedStatusEffect } from '../shared/statusEngine';

export interface EnemyAttackOptions {
  guaranteedHit: boolean;
  guaranteedCrit: boolean;
  extraHitCount: number;
  damageMultiplier?: number;
}

export interface EnemyAttackModifierResult {
  options: EnemyAttackOptions;
  logs: string[];
}

export type PlayerTalentAction =
  | {
      kind: 'log';
      message: string;
      source: string;
      type: CombatLogEntry['type'];
    }
  | {
      kind: 'bindPlayer';
      turns: number;
      bindSource: 'player' | 'enemy';
    }
  | {
      kind: 'removePlayerBuff';
      buffName: string;
    }
  | {
      kind: 'applyPlayerBuff';
      buffName: string;
      bonus: Record<string, number>;
      duration: number;
    };

export type EnemyPostDamageBossAction =
  | {
      kind: 'log';
      message: string;
      source: string;
      type: CombatLogEntry['type'];
    }
  | {
      kind: 'setEnemyStatus';
      statusName: string;
      effect: TimedStatusEffect;
    }
  | {
      kind: 'removeEnemyStatus';
      statusName: string;
    }
  | {
      kind: 'updateEnemyStats';
    }
  | {
      kind: 'bindEnemy';
      turns: number;
      bindSource: 'player' | 'enemy';
    };

export interface EnemyDodgedBossResult {
  actions: EnemyPostDamageBossAction[];
  shouldCheckEnemyClimax: boolean;
}

export type EnemySkillAttackEvent =
  | {
      kind: 'log';
      message: string;
      source: string;
      type: CombatLogEntry['type'];
    }
  | {
      kind: 'effect';
      effect: 'critical' | 'dodge';
    }
  | {
      kind: 'enemyBossActions';
      actions: EnemyPostDamageBossAction[];
    }
  | {
      kind: 'playerTalentActions';
      actions: PlayerTalentAction[];
    };

export interface EnemySkillAttackResolution {
  result: CombatResult;
  beforeDialogueEvents: EnemySkillAttackEvent[];
  afterDialogueEvents: EnemySkillAttackEvent[];
  finalDamage: number;
  shouldApplySkillEffects: boolean;
  shouldCheckEnemyClimax: boolean;
}

function createLogEvent(message: string, source: string, type: CombatLogEntry['type']): EnemySkillAttackEvent {
  return {
    kind: 'log',
    message,
    source,
    type,
  };
}

export function buildEnemyAttackOptions(params: {
  sinType: string | null;
  talentState: TalentSystem.TalentState;
  bossState: BossState;
  playerWasBoundAtEnemyTurnStart: boolean;
}): EnemyAttackModifierResult {
  const logs: string[] = [];
  let guaranteedHit = false;
  let guaranteedCrit = false;
  let extraHitCount = 0;

  if (params.sinType === 'lust' && params.talentState.lustEnemyGuaranteedCrit) {
    guaranteedHit = true;
    guaranteedCrit = true;
    params.talentState.lustEnemyGuaranteedCrit = false;
    logs.push('【七宗罪·色欲】魅惑连续失败的代价！敌人本次攻击必定命中且暴击！');
  }

  if (params.bossState.isBossFight && params.bossState.bossId === 'christine' && params.bossState.currentPhase === 2) {
    guaranteedCrit = true;
    extraHitCount += 1;
    logs.push('【敌人·暴怒】克莉丝汀的攻击必定暴击，连击+1！');
  }

  if (params.bossState.isBossFight && params.bossState.bossId === 'vespera') {
    const boundBonus = BossSystem.getVesperaBoundAttackBonus(params.playerWasBoundAtEnemyTurnStart);
    guaranteedHit = guaranteedHit || boundBonus.guaranteedHit;
    guaranteedCrit = guaranteedCrit || boundBonus.guaranteedCrit;
    if (boundBonus.guaranteedHit) {
      logs.push('【束缚猎物】你被束缚了！薇丝佩菈的攻击必定命中且必定暴击！');
    }
  }

  if (params.bossState.isBossFight && params.bossState.bossId === 'agnes' && params.bossState.agnesFrenzyActive) {
    const frenzyMods = BossSystem.getAgnesFrenzyModifiers();
    guaranteedHit = guaranteedHit || frenzyMods.guaranteedHit;
    guaranteedCrit = guaranteedCrit || frenzyMods.guaranteedCrit;
    extraHitCount += frenzyMods.extraHits;
    logs.push('【发狂】艾格妮丝发狂模式：连击+1，必定命中，必定暴击！');
  }

  return {
    options: {
      guaranteedHit,
      guaranteedCrit,
      extraHitCount,
    },
    logs,
  };
}

export function createPlayerCriticalHitTalentActions(
  sinType: string | null,
  talentState: TalentSystem.TalentState,
): PlayerTalentAction[] {
  const actions: PlayerTalentAction[] = [];

  if (sinType === 'sloth' && talentState.slothStacks >= 3) {
    talentState.slothStacks = 0;
    actions.push(
      { kind: 'bindPlayer', turns: 1, bindSource: 'player' },
      {
        kind: 'log',
        message: '【七宗罪·懒惰】被暴击！3层积蓄全部清空，被束缚1回合！',
        source: 'system',
        type: 'critical',
      },
      { kind: 'removePlayerBuff', buffName: '天赋_懒惰_积蓄' },
    );
  }

  if (sinType === 'pride' && !talentState.prideShaken) {
    talentState.prideShaken = true;
    talentState.prideShakenTurns = 2;
    actions.push(
      {
        kind: 'log',
        message: '【七宗罪·傲慢】被暴击！进入"动摇"状态（2回合暴击率/闪避率-30%）',
        source: 'system',
        type: 'critical',
      },
      {
        kind: 'applyPlayerBuff',
        buffName: '天赋_傲慢_动摇',
        bonus: { 暴击率加成: -30, 闪避率加成: -30 },
        duration: 2,
      },
    );
  }

  return actions;
}

export function calculateIncomingPlayerDamage(params: {
  totalDamage: number;
  talent: TalentData | null;
  talentContext: TalentSystem.TalentEffectContext | null;
}): number {
  let finalDamage = params.totalDamage;

  if (!params.talent || !params.talentContext || params.totalDamage <= 0) {
    return finalDamage;
  }

  const talentResult = TalentSystem.processTalentOnDamageReceived(
    params.talent,
    params.talentContext,
    params.totalDamage,
  );

  if (talentResult.damageReduction) {
    finalDamage = Math.max(0, finalDamage - talentResult.damageReduction);
  }
  if (talentResult.damageReductionPercent) {
    finalDamage = Math.max(0, Math.floor(finalDamage * (1 - talentResult.damageReductionPercent / 100)));
  }
  if (talentResult.skipEffect) {
    finalDamage = 0;
  }

  return finalDamage;
}

export function applyPleasureDamage(
  target: Character,
  damage: number,
): {
  oldPleasure: number;
  newPleasure: number;
} {
  const oldPleasure = target.stats.currentPleasure;
  target.stats.currentPleasure = Math.min(target.stats.maxPleasure, target.stats.currentPleasure + damage);
  return {
    oldPleasure,
    newPleasure: target.stats.currentPleasure,
  };
}

export function createPlayerDamagedTalentActions(
  sinType: string | null,
  talentState: TalentSystem.TalentState,
  finalDamage: number,
): PlayerTalentAction[] {
  const actions: PlayerTalentAction[] = [];

  if (sinType !== 'gluttony' || finalDamage <= 0) {
    return actions;
  }

  const oldStacks = talentState.gluttonyStacks;
  talentState.gluttonyStacks = Math.min(5, oldStacks + 1);
  const newStacks = talentState.gluttonyStacks;

  if (newStacks <= oldStacks) {
    return actions;
  }

  actions.push(
    {
      kind: 'log',
      message: `【七宗罪·暴食】受到伤害，获得1层「饕餮」（当前${newStacks}层）`,
      source: 'system',
      type: 'buff',
    },
    {
      kind: 'applyPlayerBuff',
      buffName: '天赋_暴食_饕餮',
      bonus: {
        基础性斗力成算: newStacks * 10,
        基础忍耐力成算: newStacks * 10,
        暴击率加成: newStacks * 5,
      },
      duration: 999,
    },
  );

  if (newStacks >= 5) {
    talentState.gluttonyOvereatNext = true;
    actions.push({
      kind: 'log',
      message: '【七宗罪·暴食】饕餮达到5层！下回合将进入「过食」状态',
      source: 'system',
      type: 'critical',
    });
  }

  return actions;
}

export function createEnemyDodgedBossResult(params: { bossState: BossState; enemy: Character }): EnemyDodgedBossResult {
  const actions: EnemyPostDamageBossAction[] = [];
  let shouldCheckEnemyClimax = false;

  if (params.bossState.isBossFight && params.bossState.bossId === 'vespera') {
    const dodgeResult = BossSystem.recordVesperaPlayerDodge();
    if (dodgeResult.triggerDebuff) {
      const totalDebuff = BossSystem.getVesperaConsecutiveDodgeDebuff();
      actions.push(
        {
          kind: 'setEnemyStatus',
          statusName: 'BOSS_薇丝佩菈_连续闪避debuff',
          effect: {
            加成: {
              闪避率加成: totalDebuff.totalEvasionDebuff,
              基础忍耐力成算: totalDebuff.totalEnduranceCalcDebuff,
            },
            剩余回合: 999,
          },
        },
        { kind: 'updateEnemyStats' },
        {
          kind: 'log',
          message: `【挑逗惩罚】连续闪避${dodgeResult.consecutiveDodges}次！薇丝佩菈闪避率${totalDebuff.totalEvasionDebuff}%，忍耐力成算${totalDebuff.totalEnduranceCalcDebuff}%！`,
          source: 'system',
          type: 'debuff',
        },
      );
    }
  }

  if (params.bossState.isBossFight && params.bossState.bossId === 'christine' && params.bossState.currentPhase === 2) {
    const wrathPleasureGain = Math.floor(params.enemy.stats.maxPleasure * 0.2);
    params.enemy.stats.currentPleasure = Math.min(
      params.enemy.stats.maxPleasure,
      params.enemy.stats.currentPleasure + wrathPleasureGain,
    );
    shouldCheckEnemyClimax = true;
    actions.push({
      kind: 'log',
      message: `【敌人·暴怒】${params.enemy.name} 攻击被闪避无法造成伤害！快感+${wrathPleasureGain}！`,
      source: 'system',
      type: 'critical',
    });
  }

  return { actions, shouldCheckEnemyClimax };
}

export function createEnemyPostDamageBossActions(params: {
  bossState: BossState;
  finalDamage: number;
  enemy: Character;
}): EnemyPostDamageBossAction[] {
  const actions: EnemyPostDamageBossAction[] = [];

  if (params.bossState.isBossFight && params.bossState.bossId === 'agnes' && params.finalDamage > 0) {
    const calorieLogs: string[] = [];
    const thresholdResult = BossSystem.addAgnesCalories(params.finalDamage, calorieLogs);
    calorieLogs.forEach(log => {
      actions.push({
        kind: 'log',
        message: log,
        source: 'system',
        type: log.includes('成算') ? 'debuff' : 'info',
      });
    });

    if (thresholdResult.triggeredThreshold) {
      const calorieBonus = BossSystem.getAgnesCalorieBonus();
      actions.push(
        {
          kind: 'setEnemyStatus',
          statusName: '卡路里加成',
          effect: {
            加成: {
              基础性斗力成算: calorieBonus.sexPowerCalcBonus,
              基础忍耐力成算: calorieBonus.enduranceCalcBonus,
              魅力加成: calorieBonus.charmCalcBonus,
            },
            剩余回合: 999,
          },
        },
        { kind: 'updateEnemyStats' },
      );
    }

    if (thresholdResult.triggeredThreshold && thresholdResult.dialogues.length > 0) {
      BossSystem.queueDialogues(thresholdResult.dialogues, true);
    }
  }

  if (params.bossState.isBossFight && params.bossState.bossId === 'agnes' && params.bossState.agnesFrenzyActive) {
    const aftermathLogs: string[] = [];
    BossSystem.handleAgnesFrenzyAftermath(aftermathLogs);
    aftermathLogs.forEach(log => {
      actions.push({
        kind: 'log',
        message: log,
        source: 'system',
        type: log.includes('束缚') ? 'critical' : 'info',
      });
    });

    actions.push(
      { kind: 'bindEnemy', turns: 1, bindSource: 'enemy' },
      {
        kind: 'log',
        message: '【发狂代价】艾格妮丝陷入虚脱，被束缚1回合！',
        source: 'system',
        type: 'critical',
      },
    );
    BossSystem.queueDialogues(BossSystem.AGNES_DIALOGUES.frenzy_aftermath, true);

    const calorieBonus = BossSystem.getAgnesCalorieBonus();
    if (calorieBonus.sexPowerCalcBonus > 0 || calorieBonus.enduranceCalcBonus > 0 || calorieBonus.charmCalcBonus > 0) {
      actions.push({
        kind: 'setEnemyStatus',
        statusName: '卡路里加成',
        effect: {
          加成: {
            基础性斗力成算: calorieBonus.sexPowerCalcBonus,
            基础忍耐力成算: calorieBonus.enduranceCalcBonus,
            魅力加成: calorieBonus.charmCalcBonus,
          },
          剩余回合: 999,
        },
      });
    } else {
      actions.push({ kind: 'removeEnemyStatus', statusName: '卡路里加成' });
    }
    actions.push({ kind: 'updateEnemyStats' });
  }

  if (params.bossState.isBossFight && params.bossState.bossId === 'elizabeth' && params.finalDamage > 0) {
    const vampireHeal = BossSystem.getElizabethVampirismHeal(params.finalDamage);
    if (vampireHeal > 0) {
      params.enemy.stats.currentPleasure = Math.max(0, params.enemy.stats.currentPleasure - vampireHeal);
      actions.push({
        kind: 'log',
        message: `【吸血】伊丽莎白夜羽吸取了生命精髓使自己冷静了下来，快感-${vampireHeal}`,
        source: 'system',
        type: 'info',
      });
    }
  }

  return actions;
}

export function resolveEnemySkillAttack(params: {
  player: Character;
  enemy: Character;
  skill: Skill;
  bossState: BossState;
  playerWasBoundAtEnemyTurnStart: boolean;
  sinType: string | null;
  talentState: TalentSystem.TalentState;
  talent: TalentData | null;
  createTalentContext: () => TalentSystem.TalentEffectContext;
  damageMultiplier?: number;
  attackDamageMultiplier?: number;
  guaranteedCritFromStatus?: boolean;
}): EnemySkillAttackResolution {
  if (!params.skill.data) {
    throw new Error(`技能 ${params.skill.name} 的数据不存在，无法使用`);
  }

  const beforeDialogueEvents: EnemySkillAttackEvent[] = [];
  const afterDialogueEvents: EnemySkillAttackEvent[] = [];
  let finalDamage = 0;
  let shouldCheckEnemyClimax = false;

  const enemyAttackModifiers = buildEnemyAttackOptions({
    sinType: params.sinType,
    talentState: params.talentState,
    bossState: params.bossState,
    playerWasBoundAtEnemyTurnStart: params.playerWasBoundAtEnemyTurnStart,
  });
  enemyAttackModifiers.logs.forEach(log => {
    beforeDialogueEvents.push(createLogEvent(log, 'system', 'critical'));
  });

  if (params.guaranteedCritFromStatus) {
    enemyAttackModifiers.options.guaranteedCrit = true;
  }
  if (params.attackDamageMultiplier && params.attackDamageMultiplier > 0 && params.attackDamageMultiplier !== 1) {
    enemyAttackModifiers.options.damageMultiplier =
      (enemyAttackModifiers.options.damageMultiplier ?? 1) * params.attackDamageMultiplier;
  }

  const result = executeAttack(params.enemy, params.player, params.skill.data, false, enemyAttackModifiers.options);
  if (params.damageMultiplier && params.damageMultiplier !== 1) {
    result.totalDamage = Math.max(0, Math.floor(result.totalDamage * params.damageMultiplier));
    result.actualDamage = Math.max(0, Math.floor(result.actualDamage * params.damageMultiplier));
    result.hits = result.hits.map(hit => ({
      ...hit,
      damage: Math.max(0, Math.floor(hit.damage * params.damageMultiplier!)),
    }));
    result.logs.push(`【驱魔机制】技能标签倍率: x${params.damageMultiplier}`);
  }

  const maxDamageCap = Math.floor(params.player.stats.maxPleasure * 0.4);
  console.info(
    `[战斗界面] 敌人攻击玩家 - 玩家最大快感=${params.player.stats.maxPleasure}, 40%上限=${maxDamageCap}, 总伤害=${result.totalDamage}`,
  );

  beforeDialogueEvents.push(createLogEvent(`${params.enemy.name} 使用了 ${params.skill.name}！`, 'enemy', 'info'));

  if (result.isDodged) {
    afterDialogueEvents.push(createLogEvent(`${params.player.name} 闪避了所有攻击！`, 'system', 'info'));
    afterDialogueEvents.push({ kind: 'effect', effect: 'dodge' });

    const enemyDodgedBossResult = createEnemyDodgedBossResult({
      bossState: params.bossState,
      enemy: params.enemy,
    });
    afterDialogueEvents.push({ kind: 'enemyBossActions', actions: enemyDodgedBossResult.actions });
    shouldCheckEnemyClimax = enemyDodgedBossResult.shouldCheckEnemyClimax;
  } else {
    console.info('[战斗界面] 敌人攻击 - result.logs:', result.logs);
    if (result.logs && result.logs.length > 0) {
      result.logs.forEach(log => {
        afterDialogueEvents.push(createLogEvent(log, 'system', 'info'));
      });
    } else {
      console.warn('[战斗界面] 敌人攻击 - result.logs 为空或未定义');
    }

    const hasDirectDamage = result.hits.length > 0 || result.totalDamage > 0;

    if (!hasDirectDamage) {
      finalDamage = 0;
    } else if (result.isCritical) {
      afterDialogueEvents.push(
        createLogEvent(`暴击！总计造成 ${result.totalDamage} 点快感！`, 'enemy', 'critical'),
      );
      afterDialogueEvents.push({ kind: 'effect', effect: 'critical' });
      afterDialogueEvents.push({
        kind: 'playerTalentActions',
        actions: createPlayerCriticalHitTalentActions(params.sinType, params.talentState),
      });
    } else {
      afterDialogueEvents.push(createLogEvent(`总计造成 ${result.totalDamage} 点快感`, 'enemy', 'damage'));
    }

    if (hasDirectDamage) {
      finalDamage = calculateIncomingPlayerDamage({
        totalDamage: result.totalDamage,
        talent: params.talent,
        talentContext: params.talent && result.totalDamage > 0 ? params.createTalentContext() : null,
      });

      const pleasureChange = applyPleasureDamage(params.player, finalDamage);
      afterDialogueEvents.push(
        createLogEvent(
          `${params.player.name} 的快感从 ${pleasureChange.oldPleasure}/${params.player.stats.maxPleasure} 增加到 ${pleasureChange.newPleasure}/${params.player.stats.maxPleasure}`,
          'system',
          'info',
        ),
      );

      afterDialogueEvents.push({
        kind: 'enemyBossActions',
        actions: createEnemyPostDamageBossActions({
          bossState: params.bossState,
          finalDamage,
          enemy: params.enemy,
        }),
      });

      afterDialogueEvents.push({
        kind: 'playerTalentActions',
        actions: createPlayerDamagedTalentActions(params.sinType, params.talentState, finalDamage),
      });
    }
  }

  return {
    result,
    beforeDialogueEvents,
    afterDialogueEvents,
    finalDamage,
    shouldApplySkillEffects: !result.isDodged,
    shouldCheckEnemyClimax,
  };
}

export function queueEnemySkillBattleDialogue(bossState: BossState, playerGender: '男' | '女' = '男'): void {
  if (!bossState.isBossFight) {
    return;
  }

  let battleDialogue: BossSystem.BossDialogue | undefined;
  if (bossState.bossId === 'muxinlan') {
    battleDialogue = BossSystem.getRandomBattleDialogue(bossState.currentPhase);
  } else if (bossState.bossId === 'christine') {
    battleDialogue = BossSystem.getChristineRandomBattleDialogue(bossState.currentPhase as 1 | 2);
  } else if (bossState.bossId === 'vespera') {
    battleDialogue = BossSystem.getVesperaRandomBattleDialogue(playerGender);
  }

  if (battleDialogue) {
    BossSystem.queueDialogues([battleDialogue]);
  }
}
