import * as BossSystem from './bossSystem';
import type { BossState } from './bossSystem';
import type { TimedStatusEffect } from '../shared/statusEngine';
import type { Character, CombatLogEntry, TurnState } from './types';

export type BossClimaxTransition =
  | {
      bossId: 'muxinlan';
      nextPhase: 1 | 2 | 3;
    }
  | {
      bossId: 'christine';
      nextPhase: 1 | 2;
    };

export type BossClimaxAction =
  | {
      kind: 'log';
      message: string;
      source: string;
      type: CombatLogEntry['type'];
    }
  | {
      kind: 'setSharedClimaxLimit';
      limit: number;
    }
  | {
      kind: 'removeEnemyStatus';
      statusName: string;
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
      kind: 'persistCombatConfig';
      enemyName: string;
      climaxLimit: number;
    }
  | {
      kind: 'resetEnemyPleasure';
    }
  | {
      kind: 'clearClimaxTarget';
    }
  | {
      kind: 'saveCombatState';
    }
  | {
      kind: 'setTurnPhaseLater';
      phase: TurnState['phase'];
      delayMs: number;
    };

export function getBossClimaxTransition(params: {
  targetIsEnemy: boolean;
  bossState: BossState;
  enemy: Character;
}): BossClimaxTransition | null {
  if (!params.targetIsEnemy || !params.bossState.isBossFight) {
    return null;
  }

  if (params.bossState.bossId === 'muxinlan') {
    const transitionCheck = BossSystem.shouldTransitionPhase(
      params.enemy.stats.currentPleasure,
      params.enemy.stats.maxPleasure,
      params.enemy.stats.climaxCount,
      params.bossState.currentPhase,
    );

    return transitionCheck.shouldTransition
      ? {
          bossId: 'muxinlan',
          nextPhase: transitionCheck.nextPhase,
        }
      : null;
  }

  if (params.bossState.bossId === 'christine') {
    const transitionCheck = BossSystem.shouldChristineTransitionPhase(
      params.enemy.stats.currentPleasure,
      params.enemy.stats.maxPleasure,
      params.enemy.stats.climaxCount,
      params.bossState.currentPhase as 1 | 2,
    );

    return transitionCheck.shouldTransition
      ? {
          bossId: 'christine',
          nextPhase: transitionCheck.nextPhase,
        }
      : null;
  }

  return null;
}

export function createBossClimaxLockActions(): BossClimaxAction[] {
  return [{ kind: 'resetEnemyPleasure' }, { kind: 'clearClimaxTarget' }, { kind: 'saveCombatState' }];
}

export function createEdenAwakeningActions(params: {
  targetIsEnemy: boolean;
  bossState: BossState;
  enemyName: string;
}): BossClimaxAction[] {
  if (!params.targetIsEnemy || !params.bossState.isBossFight || params.bossState.bossId !== 'eden') {
    return [];
  }
  if (!params.bossState.edenSleeping) {
    return [];
  }

  const awakeningResult = BossSystem.processEdenAwakening();
  const newClimaxLimit = awakeningResult.newClimaxLimit;

  return [
    {
      kind: 'log',
      message: `${params.enemyName} 被快感唤醒了！`,
      source: 'system',
      type: 'critical',
    },
    {
      kind: 'setSharedClimaxLimit',
      limit: newClimaxLimit,
    },
    {
      kind: 'removeEnemyStatus',
      statusName: '懒惰沉睡',
    },
    {
      kind: 'setEnemyStatus',
      statusName: '苏醒激怒',
      effect: {
        加成: {
          基础忍耐力成算: 100,
        },
        剩余回合: 999,
      },
    },
    { kind: 'updateEnemyStats' },
    {
      kind: 'persistCombatConfig',
      enemyName: params.enemyName,
      climaxLimit: newClimaxLimit,
    },
    {
      kind: 'log',
      message: '【苏醒】伊甸芙宁从沉睡中醒来，沉睡debuff已消除！',
      source: 'system',
      type: 'critical',
    },
    {
      kind: 'log',
      message: '【苏醒·激怒】忍耐力成算+100%（每回合衰减15%）',
      source: 'system',
      type: 'buff',
    },
    {
      kind: 'log',
      message: `【规则变更】高潮次数上限提升至 ${newClimaxLimit} 次！`,
      source: 'system',
      type: 'critical',
    },
    { kind: 'resetEnemyPleasure' },
    { kind: 'clearClimaxTarget' },
    { kind: 'saveCombatState' },
    {
      kind: 'setTurnPhaseLater',
      phase: 'playerInput',
      delayMs: 2000,
    },
  ];
}
