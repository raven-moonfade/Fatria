import * as BossSystem from './bossSystem';
import type { BossDialogue, BossState } from './bossSystem';
import type { CombatLogEntry } from './types';
import type { TimedStatusEffect } from '../shared/statusEngine';

export type ElizabethCommandAction =
  | {
      kind: 'log';
      message: string;
      source: string;
      type: CombatLogEntry['type'];
    }
  | {
      kind: 'changePlayerEndurance';
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
    };

function isElizabethCommandPending(bossState: BossState): boolean {
  return bossState.isBossFight && bossState.bossId === 'elizabeth' && Boolean(bossState.elizabethCurrentCommand);
}

function createDialogueActions(dialogues: BossDialogue[]): ElizabethCommandAction[] {
  if (dialogues.length === 0) {
    return [];
  }

  return [
    {
      kind: 'queueBossDialogues',
      dialogues,
    },
  ];
}

function createElizabethViolationActions(params: {
  command: 'kneel' | 'tribute';
  playerMaxEndurance: number;
  punishBoss: boolean;
}): ElizabethCommandAction[] {
  const staminaPenalty = Math.floor(params.playerMaxEndurance * 0.2);
  const commandName = params.command === 'kneel' ? '跪拜' : '献礼';
  const bonus = BossSystem.getElizabethViolationBonus();
  const actions: ElizabethCommandAction[] = [
    {
      kind: 'changePlayerEndurance',
      delta: -staminaPenalty,
    },
    {
      kind: 'log',
      message: `【君王的剧本】你违反了伊丽莎白的${commandName}命令！耐力-${staminaPenalty}！`,
      source: 'system',
      type: 'critical',
    },
    {
      kind: 'log',
      message: `【傲慢·权能】伊丽莎白获得：性斗力+${bonus.sexPowerBonus}，忍耐力+${bonus.enduranceBonus}，闪避+${bonus.evasionBonus}%，暴击+${bonus.critBonus}%`,
      source: 'system',
      type: 'buff',
    },
    {
      kind: 'setEnemyStatus',
      statusName: '傲慢叠加',
      effect: {
        加成: {
          基础性斗力加成: bonus.sexPowerBonus,
          基础忍耐力加成: bonus.enduranceBonus,
          闪避率加成: bonus.evasionBonus,
          暴击率加成: bonus.critBonus,
        },
        剩余回合: 999,
      },
    },
  ];

  if (params.punishBoss) {
    const critDebuff = BossSystem.getElizabethCritCounterDebuff();
    actions.push(
      {
        kind: 'log',
        message: `【傲慢·破绽】伊丽莎白被暴击反制！闪避率${critDebuff.evasionDebuff}%，忍耐力成算${critDebuff.enduranceCalcDebuff}%（2回合）`,
        source: 'system',
        type: 'critical',
      },
      {
        kind: 'setEnemyStatus',
        statusName: '暴击反制',
        effect: {
          加成: {
            闪避率加成: critDebuff.evasionDebuff,
            基础忍耐力成算: critDebuff.enduranceCalcDebuff,
          },
          剩余回合: 2,
        },
      },
    );
  }

  actions.push({ kind: 'updateEnemyStats' });
  return actions;
}

export function createElizabethSkillCommandActions(params: {
  bossState: BossState;
  skillRarity: string;
  isCritical: boolean;
  playerMaxEndurance: number;
}): ElizabethCommandAction[] {
  if (!isElizabethCommandPending(params.bossState)) {
    return [];
  }

  const command = params.bossState.elizabethCurrentCommand!;
  const obedienceResult = BossSystem.checkElizabethCommandObedience('skill', params.skillRarity, params.isCritical);
  const actions = createDialogueActions(obedienceResult.dialogues);

  if (obedienceResult.obeyed) {
    actions.push({
      kind: 'log',
      message: `【君王的剧本】你服从了伊丽莎白的献礼命令，使用了${params.skillRarity}级技能。`,
      source: 'system',
      type: 'info',
    });
    return actions;
  }

  actions.push(
    ...createElizabethViolationActions({
      command,
      playerMaxEndurance: params.playerMaxEndurance,
      punishBoss: obedienceResult.punishBoss,
    }),
  );
  return actions;
}

export function createElizabethSkipCommandActions(params: {
  bossState: BossState;
  playerMaxEndurance: number;
}): ElizabethCommandAction[] {
  if (!isElizabethCommandPending(params.bossState)) {
    return [];
  }

  const command = params.bossState.elizabethCurrentCommand!;
  const obedienceResult = BossSystem.checkElizabethCommandObedience('skip', undefined, false);
  const actions = createDialogueActions(obedienceResult.dialogues);

  if (obedienceResult.obeyed) {
    actions.push({
      kind: 'log',
      message: '【君王的剧本】你服从了伊丽莎白的跪拜命令。',
      source: 'system',
      type: 'info',
    });
    return actions;
  }

  actions.push(
    ...createElizabethViolationActions({
      command,
      playerMaxEndurance: params.playerMaxEndurance,
      punishBoss: obedienceResult.punishBoss,
    }),
  );
  return actions;
}
