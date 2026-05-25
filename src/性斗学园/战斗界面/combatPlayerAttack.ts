import * as BossSystem from './bossSystem';
import type { BossDialogue, BossState } from './bossSystem';
import type { CombatResult } from './combatCalculator';
import type { CombatLogEntry, Skill } from './types';
import type { TalentData } from '../性斗学园脚本/data/talentDatabase';
import * as TalentSystem from './talentSystem';
import type { TimedStatusEffect } from '../shared/statusEngine';

export interface PlayerAttackOptions {
  guaranteedHit?: boolean;
  guaranteedCrit?: boolean;
  damageMultiplier?: number;
  critDamageBoost?: number;
  extraHitCount?: number;
}

export type PlayerAttackAction =
  | {
      kind: 'log';
      message: string;
      source: string;
      type: CombatLogEntry['type'];
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
    }
  | {
      kind: 'changePlayerPleasure';
      delta: number;
    }
  | {
      kind: 'setTalentState';
      talentState: TalentSystem.TalentState;
    }
  | {
      kind: 'bindEnemy';
      turns: number;
      bindSource: 'player' | 'enemy';
    }
  | {
      kind: 'setEnemyStatus';
      statusName: string;
      effect: TimedStatusEffect;
    }
  | {
      kind: 'addEnemyStatusBonus';
      statusName: string;
      bonus: Record<string, number>;
      duration: number;
    }
  | {
      kind: 'updateEnemyStats';
    }
  | {
      kind: 'adjustEnemyStats';
      evasionDelta?: number;
      critDelta?: number;
    }
  | {
      kind: 'queueBossDialogues';
      dialogues: BossDialogue[];
      blocking?: boolean;
    };

export interface PlayerAttackPreparation {
  talentAttackResult: TalentSystem.TalentEffectResult;
  attackOptions: PlayerAttackOptions;
  actions: PlayerAttackAction[];
}

function getCritDamageBoostFromTalent(talent: TalentData): number {
  for (const effect of talent.effects) {
    if (effect.trigger === 'on_crit' && effect.effect === 'boost_crit_damage') {
      return effect.params.value || 25;
    }
  }

  return 0;
}

export function createPlayerAttackPreparation(params: {
  skill: Skill;
  talent: TalentData | null;
  talentContext: TalentSystem.TalentEffectContext;
  talentState: TalentSystem.TalentState;
  currentTurn: number;
  bossState: BossState;
}): PlayerAttackPreparation {
  const actions: PlayerAttackAction[] = [];
  let talentAttackResult: TalentSystem.TalentEffectResult = {};
  let critDamageBoost = 0;
  let extraHitCount = 0;
  let guaranteedCrit = false;
  let guaranteedHit = false;

  if (params.talent) {
    const hasBindEffect = params.skill.data?.buffs?.some((effect: any) => effect.type === 'bind') || false;
    talentAttackResult = TalentSystem.processTalentOnAttack(params.talent, params.talentContext, hasBindEffect);
    critDamageBoost = getCritDamageBoostFromTalent(params.talent);

    const sinType = TalentSystem.getSinTalentType(params.talent);
    switch (sinType) {
      case 'wrath': {
        const wrathMods = TalentSystem.getWrathModifiers(params.talentState);
        if (wrathMods.extraHitCount) {
          extraHitCount = wrathMods.extraHitCount;
          actions.push({
            kind: 'log',
            message: `【七宗罪·暴怒】连击+${extraHitCount}`,
            source: 'system',
            type: 'critical',
          });
        }
        break;
      }
      case 'sloth': {
        const slothMods = TalentSystem.getSlothAttackModifiers(params.talentState, params.currentTurn);
        guaranteedCrit = Boolean(slothMods.guaranteedCrit);
        guaranteedHit = Boolean(slothMods.guaranteedHit);
        if (slothMods.extraHitCount) {
          extraHitCount = slothMods.extraHitCount;
        }

        if (params.talentState.slothStacks > 0) {
          const stacks = params.talentState.slothStacks;
          actions.push(
            {
              kind: 'log',
              message: `【七宗罪·懒惰】消耗${stacks}层积蓄：${stacks >= 1 ? '必定暴击' : ''}${stacks >= 2 ? '、必定命中' : ''}${stacks >= 3 ? '、连击+2' : ''}`,
              source: 'system',
              type: 'info',
            },
            {
              kind: 'removePlayerBuff',
              buffName: '天赋_懒惰_积蓄',
            },
          );
          params.talentState.slothStacks = 0;
        }

        params.talentState.slothDebuffTurns = 2;
        actions.push(
          {
            kind: 'applyPlayerBuff',
            buffName: '天赋_懒惰_懒散',
            bonus: { 基础性斗力成算: -20, 闪避率加成: -15 },
            duration: 2,
          },
          {
            kind: 'log',
            message: '【七宗罪·懒惰】使用技能后进入懒散状态（2回合性斗力成算-20%、闪避率-15%）',
            source: 'system',
            type: 'critical',
          },
        );
        break;
      }
      case 'gluttony': {
        params.talentState.gluttonyDealtDamageThisTurn = true;
        break;
      }
      case 'pride': {
        if (params.talentState.prideAbsoluteConfidence) {
          guaranteedHit = true;
          extraHitCount = 2;
          actions.push({
            kind: 'log',
            message: '【七宗罪·傲慢】绝对自信！必定命中，连击+2',
            source: 'system',
            type: 'buff',
          });
          params.talentState.prideAbsoluteConfidence = false;
          params.talentState.prideConsecutiveCrits = 0;
        }
        break;
      }
      case 'greed': {
        if (params.talentState.greedStacks >= 3) {
          critDamageBoost = 150;
          actions.push({
            kind: 'log',
            message: '【七宗罪·贪婪】贪婪层数≥3，暴击伤害提升至300%！',
            source: 'system',
            type: 'buff',
          });
        }
        break;
      }
    }
  }

  if (params.bossState.isBossFight && params.bossState.bossId === 'eden') {
    critDamageBoost += 150;
    actions.push({
      kind: 'log',
      message: '【懒惰·脆弱】对伊甸芙宁的暴击伤害固定为300%！',
      source: 'system',
      type: 'critical',
    });
  }

  return {
    talentAttackResult,
    attackOptions: {
      guaranteedHit: talentAttackResult.guaranteedHit || guaranteedHit,
      guaranteedCrit,
      damageMultiplier: talentAttackResult.damageMultiplier,
      critDamageBoost,
      extraHitCount,
    },
    actions,
  };
}

export function applyTalentPassiveDamageBoost(params: {
  talent: TalentData | null;
  result: CombatResult;
  context: {
    playerPleasure: number;
    playerMaxPleasure: number;
    playerStamina: number;
    playerMaxStamina: number;
    enemyPleasure: number;
    enemyMaxPleasure: number;
  };
}): PlayerAttackAction[] {
  if (!params.talent || params.result.totalDamage <= 0 || params.result.isDodged) {
    return [];
  }

  const passiveModifiers = TalentSystem.getTalentPassiveModifiers(params.talent, params.context);

  console.info(
    `[天赋系统] 被动效果检查: 玩家快感=${params.context.playerPleasure}/${params.context.playerMaxPleasure}, 耐力=${params.context.playerStamina}/${params.context.playerMaxStamina}`,
  );
  console.info(
    `[天赋系统] 被动修正: damageBoostPercent=${passiveModifiers.damageBoostPercent}, powerCoeffBoost=${passiveModifiers.powerCoeffBoost}`,
  );

  if (passiveModifiers.damageBoostPercent <= 0 && passiveModifiers.powerCoeffBoost <= 0) {
    return [];
  }

  const boostPercent = passiveModifiers.damageBoostPercent + passiveModifiers.powerCoeffBoost;
  const boostedDamage = Math.floor(params.result.totalDamage * (1 + boostPercent / 100));
  const extraDamage = boostedDamage - params.result.totalDamage;
  if (extraDamage <= 0) {
    return [];
  }

  params.result.totalDamage = boostedDamage;
  return [
    {
      kind: 'log',
      message: `【${params.talent.name}】触发：伤害提升${boostPercent}%（+${extraDamage}）`,
      source: 'system',
      type: 'info',
    },
  ];
}

export function createPlayerDodgedActions(params: {
  sinType: string | null;
  talentState: TalentSystem.TalentState;
}): PlayerAttackAction[] {
  if (params.sinType === 'gluttony') {
    params.talentState.gluttonyDealtDamageThisTurn = false;
  }
  if (params.sinType === 'wrath') {
    params.talentState.wrathDealtDamageThisTurn = false;
  }

  return [];
}

export function createPlayerCriticalHitActions(params: {
  sinType: string | null;
  talentState: TalentSystem.TalentState;
  bossState: BossState;
}): PlayerAttackAction[] {
  const actions: PlayerAttackAction[] = [];

  if (params.sinType === 'pride') {
    params.talentState.prideCritThisTurn = true;
  }

  if (params.bossState.isBossFight && params.bossState.bossId === 'eden') {
    const critDebuffResult = BossSystem.processEdenCritReceived();
    actions.push(
      {
        kind: 'log',
        message: `【懒惰·脆弱】倒计时+${critDebuffResult.countdownIncrease}！当前倒计时: ${params.bossState.edenCountdown}`,
        source: 'system',
        type: 'critical',
      },
      {
        kind: 'log',
        message: `【懒惰·脆弱】闪避率${critDebuffResult.evasionDebuff}%，暴击率${critDebuffResult.critDebuff}%（可叠加）`,
        source: 'system',
        type: 'debuff',
      },
      {
        kind: 'addEnemyStatusBonus',
        statusName: '被暴击debuff',
        bonus: {
          闪避率加成: critDebuffResult.evasionDebuff,
          暴击率加成: critDebuffResult.critDebuff,
        },
        duration: 999,
      },
      { kind: 'updateEnemyStats' },
      {
        kind: 'adjustEnemyStats',
        evasionDelta: critDebuffResult.evasionDebuff,
        critDelta: critDebuffResult.critDebuff,
      },
    );
  }

  return actions;
}

export function createAgnesPlayerDamageActions(params: {
  bossState: BossState;
  damage: number;
}): PlayerAttackAction[] {
  if (!params.bossState.isBossFight || params.bossState.bossId !== 'agnes' || params.damage <= 0) {
    return [];
  }

  const actions: PlayerAttackAction[] = [];
  const calorieLogs: string[] = [];
  const thresholdResult = BossSystem.addAgnesCalories(params.damage, calorieLogs);
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
    actions.push({
      kind: 'queueBossDialogues',
      dialogues: thresholdResult.dialogues,
      blocking: true,
    });
  }

  return actions;
}

export function createPlayerDamageDealtActions(params: {
  talent: TalentData | null;
  talentContext: TalentSystem.TalentEffectContext;
  talentState: TalentSystem.TalentState;
  totalDamage: number;
  playerMaxPleasure: number;
  playerCharm: number;
  enemyCharm: number;
  enemyName: string;
  enemyBoundTurns: number;
  bossState: BossState;
}): PlayerAttackAction[] {
  if (!params.talent || params.totalDamage <= 0) {
    return [];
  }

  const actions: PlayerAttackAction[] = [];
  TalentSystem.processTalentOnDamageDealt(params.talent, params.talentContext, params.totalDamage);

  const sinType = TalentSystem.getSinTalentType(params.talent);

  if (sinType === 'gluttony') {
    const pleasureReduce = Math.floor(params.playerMaxPleasure * 0.2);
    params.talentState.gluttonyDealtDamageThisTurn = true;
    actions.push(
      {
        kind: 'changePlayerPleasure',
        delta: -pleasureReduce,
      },
      {
        kind: 'log',
        message: `【七宗罪·暴食】造成伤害，自身快感-${pleasureReduce}`,
        source: 'system',
        type: 'buff',
      },
    );
  }

  if (sinType === 'wrath') {
    params.talentState.wrathDealtDamageThisTurn = true;
  }

  if (sinType === 'lust') {
    const charmResult = TalentSystem.processLustCharm(params.talentContext, params.playerCharm, params.enemyCharm);
    actions.push(
      {
        kind: 'setTalentState',
        talentState: { ...params.talentContext.talentState },
      },
      {
        kind: 'log',
        message: `【七宗罪·色欲】${charmResult.message}`,
        source: 'system',
        type: charmResult.success ? 'info' : 'critical',
      },
    );

    if (charmResult.success && charmResult.bindEnemy) {
      if (params.bossState.isBossFight && params.bossState.bossId === 'muxinlan') {
        actions.push({
          kind: 'log',
          message: `${params.enemyName} 免疫了魅惑束缚效果！`,
          source: 'system',
          type: 'info',
        });
      } else if (params.enemyBoundTurns === 0) {
        const bindDuration = charmResult.bindDuration || 1;
        actions.push(
          {
            kind: 'bindEnemy',
            turns: bindDuration,
            bindSource: 'player',
          },
          {
            kind: 'log',
            message: `${params.enemyName} 被魅惑束缚了 ${bindDuration} 回合！`,
            source: 'system',
            type: 'info',
          },
        );
      }

      if (charmResult.selfEnduranceDebuff) {
        actions.push({
          kind: 'applyPlayerBuff',
          buffName: '天赋_色欲_魅惑代价',
          bonus: { 基础忍耐力成算: charmResult.selfEnduranceDebuff },
          duration: 999,
        });
      }
    }

    if (charmResult.enemyGuaranteedHitCrit) {
      params.talentState.lustEnemyGuaranteedCrit = true;
    }
  }

  return actions;
}

export function createTalentBindAfterHitActions(params: {
  talentAttackResult: TalentSystem.TalentEffectResult;
  enemyBoundTurns: number;
  enemyName: string;
  bossState: BossState;
}): PlayerAttackAction[] {
  if (!params.talentAttackResult.addBind || !params.talentAttackResult.bindDuration || params.enemyBoundTurns !== 0) {
    return [];
  }

  if (params.bossState.isBossFight && params.bossState.bossId === 'muxinlan') {
    return [
      {
        kind: 'log',
        message: `${params.enemyName} 免疫了天赋束缚效果！`,
        source: 'system',
        type: 'info',
      },
    ];
  }

  return [
    {
      kind: 'bindEnemy',
      turns: params.talentAttackResult.bindDuration,
      bindSource: 'player',
    },
    {
      kind: 'log',
      message: `【天赋】${params.enemyName} 被束缚了 ${params.talentAttackResult.bindDuration} 回合！`,
      source: 'system',
      type: 'info',
    },
  ];
}

export function createHeisakiLowRarityHitActions(params: {
  bossState: BossState;
  skillRarity: string;
  playerSkills: Skill[];
}): PlayerAttackAction[] {
  if (!params.bossState.isBossFight || params.bossState.bossId !== 'heisaki') {
    return [];
  }

  if (params.skillRarity !== 'C' && params.skillRarity !== 'B') {
    return [];
  }

  const playerSkillIds = params.playerSkills.map(skill => skill.id);
  const halfResult = BossSystem.processHeisakiLowRaritySkillHit(playerSkillIds);
  if (!halfResult.triggered || !halfResult.affectedSkillId) {
    return [];
  }

  const affectedSkill = params.playerSkills.find(skill => skill.id === halfResult.affectedSkillId);
  const actions: PlayerAttackAction[] = [
    {
      kind: 'log',
      message: `【廉价回馈】${affectedSkill?.name || halfResult.affectedSkillId} 耐力消耗倍率减半（当前倍率: ${halfResult.newMultiplier}x）`,
      source: 'system',
      type: 'buff',
    },
  ];

  if (halfResult.dialogues.length > 0) {
    actions.push({
      kind: 'queueBossDialogues',
      dialogues: halfResult.dialogues,
    });
  }

  return actions;
}

export function createHeisakiHighRaritySkillUsedActions(params: {
  bossState: BossState;
  skillId: string;
  skillName: string;
  skillRarity: string;
}): PlayerAttackAction[] {
  if (!params.bossState.isBossFight || params.bossState.bossId !== 'heisaki') {
    return [];
  }

  const doubleResult = BossSystem.processHeisakiHighRaritySkillUsed(params.skillId, params.skillRarity);
  if (!doubleResult.triggered) {
    return [];
  }

  const actions: PlayerAttackAction[] = [
    {
      kind: 'log',
      message: `【利息翻倍】${params.skillName} 下次耐力消耗将翻倍（当前倍率: ${doubleResult.newMultiplier}x）`,
      source: 'system',
      type: 'debuff',
    },
  ];

  if (doubleResult.dialogues.length > 0) {
    actions.push({
      kind: 'queueBossDialogues',
      dialogues: doubleResult.dialogues,
    });
  }

  return actions;
}
