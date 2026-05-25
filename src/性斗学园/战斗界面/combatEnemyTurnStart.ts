import * as BossSystem from './bossSystem';
import type { BossDialogue, BossState } from './bossSystem';
import type { CombatLogEntry, TurnState } from './types';
import type { TimedStatusEffect } from '../shared/statusEngine';

export type BindSource = 'player' | 'enemy';

export type EnemyTurnStartAction =
  | {
      kind: 'log';
      message: string;
      source: string;
      type: CombatLogEntry['type'];
    }
  | {
      kind: 'setPlayerBind';
      turns: number;
      bindSource: BindSource | null;
    }
  | {
      kind: 'setPlayerSensoryNumb';
      turns: number;
    }
  | {
      kind: 'changePlayerPleasure';
      delta: number;
    }
  | {
      kind: 'applyPlayerBuff';
      buffName: string;
      bonus: Record<string, number>;
      duration: number;
    }
  | {
      kind: 'setEnemyBind';
      turns: number;
      bindSource: BindSource | null;
    }
  | {
      kind: 'setEnemySensoryNumb';
      turns: number;
    }
  | {
      kind: 'decrementBackpackItem';
      itemName: string;
    }
  | {
      kind: 'decrementRuntimePlayerItem';
      itemName: string;
    }
  | {
      kind: 'changeEnemyEndurance';
      delta: number;
    }
  | {
      kind: 'changeEnemyPleasure';
      delta: number;
    }
  | {
      kind: 'setEnemyStatus';
      statusName: string;
      effect: TimedStatusEffect;
    }
  | {
      kind: 'updateEnemyStats';
    }
  | {
      kind: 'queueBossDialogues';
      dialogues: BossDialogue[];
      blocking?: boolean;
    }
  | {
      kind: 'setDialogueSkippable';
      skippable: boolean;
    }
  | {
      kind: 'setTurnPhase';
      phase: TurnState['phase'];
    }
  | {
      kind: 'setPhaseTransitionEffect';
      effect: 'eden-game-over' | '';
    };

export interface EdenTurnStartResult {
  actions: EnemyTurnStartAction[];
  triggerGameOver: boolean;
  skipEnemyAction: boolean;
}

export interface BoundEnemyTurnStartResult {
  actions: EnemyTurnStartAction[];
  shouldCheckEnemyClimax: boolean;
}

export interface BoundEnemyTurnResolution {
  boundActions: EnemyTurnStartAction[];
  shouldCheckEnemyClimax: boolean;
  edenActions: EnemyTurnStartAction[];
  triggerGameOver: boolean;
  tickActions: EnemyTurnStartAction[];
}

export interface VesperaSelfSacrificeStartResult {
  actions: EnemyTurnStartAction[];
  triggered: boolean;
  bindDuration: number;
}

export function createPlayerBindTurnStartActions(params: {
  playerName: string;
  boundTurns: number;
  bindSource: BindSource | null;
}): EnemyTurnStartAction[] {
  if (params.boundTurns <= 0 || !params.bindSource) {
    return [];
  }

  const nextTurns = params.boundTurns - 1;
  if (nextTurns > 0) {
    return [
      {
        kind: 'setPlayerBind',
        turns: nextTurns,
        bindSource: params.bindSource,
      },
      {
        kind: 'log',
        message: `${params.playerName} 的束缚效果剩余 ${nextTurns} 回合`,
        source: 'system',
        type: 'info',
      },
    ];
  }

  const actions: EnemyTurnStartAction[] = [
    {
      kind: 'setPlayerBind',
      turns: 0,
      bindSource: null,
    },
    {
      kind: 'log',
      message: `${params.playerName} 的束缚效果消失了`,
      source: 'system',
      type: 'info',
    },
  ];

  if (params.bindSource === 'enemy') {
    actions.push(
      {
        kind: 'setPlayerSensoryNumb',
        turns: 2,
      },
      {
        kind: 'log',
        message: `${params.playerName} 获得了【感官麻木】状态，持续2回合`,
        source: 'system',
        type: 'buff',
      },
    );
  }

  return actions;
}

export function createEnemyBindTickActions(params: {
  enemyName: string;
  boundTurns: number;
  bindSource: BindSource | null;
}): EnemyTurnStartAction[] {
  if (params.boundTurns <= 0) {
    return [];
  }

  const nextTurns = params.boundTurns - 1;
  if (nextTurns > 0) {
    return [
      {
        kind: 'setEnemyBind',
        turns: nextTurns,
        bindSource: params.bindSource,
      },
      {
        kind: 'log',
        message: `${params.enemyName} 的束缚效果剩余 ${nextTurns} 回合`,
        source: 'system',
        type: 'info',
      },
    ];
  }

  return [
    {
      kind: 'setEnemyBind',
      turns: 0,
      bindSource: null,
    },
    {
      kind: 'log',
      message: `${params.enemyName} 的束缚效果消失了`,
      source: 'system',
      type: 'info',
    },
    {
      kind: 'setEnemySensoryNumb',
      turns: 2,
    },
    {
      kind: 'log',
      message: `${params.enemyName} 获得了【感官麻木】状态，持续2回合`,
      source: 'system',
      type: 'buff',
    },
  ];
}

export function createBoundEnemyTurnStartResult(params: {
  bossState: BossState;
  enemyName: string;
  boundTurns: number;
  enemyMaxPleasure: number;
}): BoundEnemyTurnStartResult {
  if (params.boundTurns <= 0) {
    return { actions: [], shouldCheckEnemyClimax: false };
  }

  const actions: EnemyTurnStartAction[] = [
    {
      kind: 'log',
      message: `${params.enemyName} 被束缚了，无法行动！剩余 ${params.boundTurns} 回合`,
      source: 'system',
      type: 'info',
    },
  ];
  let shouldCheckEnemyClimax = false;

  if (params.bossState.isBossFight && params.bossState.bossId === 'christine' && params.bossState.currentPhase === 2) {
    const wrathPleasureGain = Math.floor(params.enemyMaxPleasure * 0.2);
    actions.push(
      {
        kind: 'changeEnemyPleasure',
        delta: wrathPleasureGain,
      },
      {
        kind: 'log',
        message: `【敌人·暴怒】${params.enemyName} 被束缚无法造成伤害！快感+${wrathPleasureGain}！`,
        source: 'system',
        type: 'critical',
      },
    );
    shouldCheckEnemyClimax = true;
  }

  return { actions, shouldCheckEnemyClimax };
}

export function createBoundEnemyTurnResolution(params: {
  bossState: BossState;
  enemyName: string;
  boundTurns: number;
  bindSource: BindSource | null;
  enemyMaxPleasure: number;
  enemyStatuses: Record<string, any>;
}): BoundEnemyTurnResolution {
  const boundResult = createBoundEnemyTurnStartResult({
    bossState: params.bossState,
    enemyName: params.enemyName,
    boundTurns: params.boundTurns,
    enemyMaxPleasure: params.enemyMaxPleasure,
  });
  const edenResult = createEdenTurnStartResult({
    bossState: params.bossState,
    enemyName: params.enemyName,
    boundTurns: params.boundTurns,
    enemyStatuses: params.enemyStatuses,
    isEnemyBound: true,
  });

  return {
    boundActions: boundResult.actions,
    shouldCheckEnemyClimax: boundResult.shouldCheckEnemyClimax,
    edenActions: edenResult.actions,
    triggerGameOver: edenResult.triggerGameOver,
    tickActions: createEnemyBindTickActions({
      enemyName: params.enemyName,
      boundTurns: params.boundTurns,
      bindSource: params.bindSource,
    }),
  };
}

export function createVesperaSelfSacrificeStartResult(params: {
  bossState: BossState;
  enemyName: string;
  enemyBoundTurns: number;
  enemyBindSource: BindSource | null;
  bossClimaxCount: number;
  playerGender: string;
}): VesperaSelfSacrificeStartResult {
  if (!BossSystem.shouldUseVesperaSelfSacrifice(params.bossClimaxCount, params.playerGender)) {
    return { actions: [], triggered: false, bindDuration: 0 };
  }

  const sacrificeResult = BossSystem.executeVesperaSelfSacrifice();
  return {
    actions: [
      ...createEnemyBindTickActions({
        enemyName: params.enemyName,
        boundTurns: params.enemyBoundTurns,
        bindSource: params.enemyBindSource,
      }),
      {
        kind: 'setDialogueSkippable',
        skippable: false,
      },
      {
        kind: 'queueBossDialogues',
        dialogues: sacrificeResult.dialogues,
      },
    ],
    triggered: true,
    bindDuration: sacrificeResult.bindDuration,
  };
}

export function createVesperaSelfSacrificeAfterDialogueActions(params: {
  bindDuration: number;
  enemyCharm: number;
}): EnemyTurnStartAction[] {
  const sacrificeDamage = Math.floor(params.enemyCharm * 2.0 + 50);
  return [
    {
      kind: 'setPlayerBind',
      turns: params.bindDuration,
      bindSource: 'enemy',
    },
    {
      kind: 'log',
      message: '【自体献祭·鬼角先生】薇丝佩菈使用了特殊技能！',
      source: 'system',
      type: 'critical',
    },
    {
      kind: 'log',
      message: `【自体献祭】必定命中！你被束缚了 ${params.bindDuration} 回合！`,
      source: 'system',
      type: 'critical',
    },
    {
      kind: 'changePlayerPleasure',
      delta: sacrificeDamage,
    },
    {
      kind: 'log',
      message: `【自体献祭】造成 ${sacrificeDamage} 点快感伤害！`,
      source: 'system',
      type: 'damage',
    },
    {
      kind: 'applyPlayerBuff',
      buffName: 'BOSS_薇丝佩菈_自体献祭',
      bonus: {
        基础忍耐力成算: -30,
        闪避率加成: -30,
      },
      duration: 3,
    },
    {
      kind: 'log',
      message: '【自体献祭】敏感度+50%，防御-30%，性斗力-30%（3回合）',
      source: 'system',
      type: 'debuff',
    },
  ];
}

function toAgnesFeastItems(backpack: Record<string, any>): any[] {
  return Object.entries(backpack)
    .filter(([, item]) => {
      if (!item || !item.战斗用品) return false;
      return Number(item.数量 || 0) > 0;
    })
    .map(([name, item]) => ({
      name,
      ...item,
      quantity: item.数量 || 0,
    }));
}

function createAgnesItemEffectActions(params: {
  itemName: string;
  itemEffects: { type: string; value: number; buffs?: Record<string, number> }[];
}): EnemyTurnStartAction[] {
  const actions: EnemyTurnStartAction[] = [];

  params.itemEffects.forEach(effect => {
    if (effect.type === '耐力') {
      actions.push(
        {
          kind: 'changeEnemyEndurance',
          delta: effect.value,
        },
        {
          kind: 'log',
          message: `【共餐】艾格妮丝恢复了 ${effect.value} 点耐力`,
          source: 'system',
          type: 'buff',
        },
      );
      return;
    }

    if (effect.type === '快感') {
      actions.push({
        kind: 'changeEnemyPleasure',
        delta: effect.value,
      });
      if (effect.value < 0) {
        actions.push({
          kind: 'log',
          message: `【共餐】艾格妮丝减少了 ${Math.abs(effect.value)} 点快感`,
          source: 'system',
          type: 'buff',
        });
      }
      return;
    }

    if (effect.type === 'buff') {
      actions.push(
        {
          kind: 'setEnemyStatus',
          statusName: `共餐_${params.itemName}`,
          effect: {
            加成: effect.buffs || {},
            剩余回合: 3,
          },
        },
        {
          kind: 'log',
          message: `【共餐】艾格妮丝获得了「${params.itemName}」的3倍效果（3回合）`,
          source: 'system',
          type: 'buff',
        },
      );
    }
  });

  if (actions.some(action => action.kind === 'setEnemyStatus')) {
    actions.push({ kind: 'updateEnemyStats' });
  }

  return actions;
}

export function createAgnesFeastTurnStartActions(params: {
  bossState: BossState;
  playerGender: '男' | '女';
  backpack: Record<string, any>;
}): EnemyTurnStartAction[] {
  if (!params.bossState.isBossFight || params.bossState.bossId !== 'agnes') {
    return [];
  }

  params.bossState.agnesCurrentTurn++;
  if ((params.bossState.agnesCurrentTurn - 1) % 3 !== 0) {
    return [];
  }

  const logs: string[] = [];
  const feastResult = BossSystem.executeAgnesFeast(toAgnesFeastItems(params.backpack), params.playerGender, logs);
  const actions: EnemyTurnStartAction[] = logs.map(log => ({
    kind: 'log',
    message: log,
    source: 'system',
    type: log.includes('发狂') ? 'critical' : 'info',
  }));

  if (!feastResult.itemStolen) {
    return actions;
  }

  if (feastResult.feastDialogue) {
    actions.push({
      kind: 'queueBossDialogues',
      dialogues: [feastResult.feastDialogue as BossDialogue],
      blocking: true,
    });
  }

  actions.push(
    {
      kind: 'decrementBackpackItem',
      itemName: feastResult.itemName,
    },
    {
      kind: 'decrementRuntimePlayerItem',
      itemName: feastResult.itemName,
    },
  );

  if (feastResult.isBadFood) {
    actions.push(
      {
        kind: 'log',
        message: `【发狂】艾格妮丝吃到了「${feastResult.itemName}」，陷入发狂状态！`,
        source: 'system',
        type: 'critical',
      },
      {
        kind: 'log',
        message: '【发狂效果】本回合攻击：连击+1，必定命中，必定暴击！',
        source: 'system',
        type: 'critical',
      },
      {
        kind: 'queueBossDialogues',
        dialogues: BossSystem.AGNES_DIALOGUES.frenzy_trigger,
        blocking: true,
      },
    );
    return actions;
  }

  actions.push(
    ...createAgnesItemEffectActions({
      itemName: feastResult.itemName,
      itemEffects: feastResult.itemEffects,
    }),
  );

  return actions;
}

export function createEdenTurnStartResult(params: {
  bossState: BossState;
  enemyName: string;
  boundTurns: number;
  enemyStatuses: Record<string, any>;
  isEnemyBound: boolean;
}): EdenTurnStartResult {
  if (!params.bossState.isBossFight || params.bossState.bossId !== 'eden') {
    return { actions: [], triggerGameOver: false, skipEnemyAction: false };
  }

  const actions: EnemyTurnStartAction[] = [];
  const countdownResult = BossSystem.processEdenTurnStart(params.boundTurns);
  const isUrgent = countdownResult.countdownValue <= 3;
  actions.push({
    kind: 'log',
    message: params.isEnemyBound
      ? `【懒惰·倒计时】剩余 ${countdownResult.countdownValue} 回合（被束缚额外-2）`
      : `【懒惰·倒计时】剩余 ${countdownResult.countdownValue} 回合`,
    source: 'system',
    type: params.isEnemyBound ? (isUrgent ? 'critical' : 'info') : isUrgent ? 'danger' : 'critical',
  });

  if (!params.bossState.edenSleeping && params.bossState.edenAwakened) {
    const awakeningBuff = params.enemyStatuses['苏醒激怒'];
    if (awakeningBuff?.加成 && typeof awakeningBuff.加成.基础忍耐力成算 === 'number') {
      const oldValue = awakeningBuff.加成.基础忍耐力成算;
      const newValue = oldValue - 15;
      actions.push(
        {
          kind: 'setEnemyStatus',
          statusName: '苏醒激怒',
          effect: {
            ...awakeningBuff,
            加成: {
              ...awakeningBuff.加成,
              基础忍耐力成算: newValue,
            },
          },
        },
        {
          kind: 'updateEnemyStats',
        },
        {
          kind: 'log',
          message: `【苏醒·激怒】忍耐力成算衰减：${oldValue}% → ${newValue}%`,
          source: 'system',
          type: params.isEnemyBound ? 'info' : 'debuff',
        },
      );
    }
  }

  if (countdownResult.triggerSkill16) {
    actions.push(
      {
        kind: 'log',
        message: '【懒惰】伊甸芙宁的倒计时归零！',
        source: 'system',
        type: 'critical',
      },
      {
        kind: 'setTurnPhase',
        phase: 'processing',
      },
      {
        kind: 'setDialogueSkippable',
        skippable: false,
      },
      {
        kind: 'queueBossDialogues',
        dialogues: BossSystem.EDEN_DIALOGUES.countdown_zero,
      },
      {
        kind: 'setPhaseTransitionEffect',
        effect: 'eden-game-over',
      },
    );
    return { actions, triggerGameOver: true, skipEnemyAction: true };
  }

  if (!params.isEnemyBound && params.bossState.edenSleeping) {
    const sleepDialogue = BossSystem.getEdenRandomBattleDialogue();
    actions.push({
      kind: 'log',
      message: `${params.enemyName} 正在沉睡中...不会进行攻击`,
      source: 'system',
      type: 'info',
    });

    if (sleepDialogue) {
      actions.push({
        kind: 'queueBossDialogues',
        dialogues: [sleepDialogue],
        blocking: false,
      });
    }

    return { actions, triggerGameOver: false, skipEnemyAction: true };
  }

  return { actions, triggerGameOver: false, skipEnemyAction: false };
}
