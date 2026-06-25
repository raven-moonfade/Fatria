import type { BossDialogue, BossState } from './bossSystem';
import * as BossSystem from './bossSystem';
import type { Character, CombatLogEntry, TurnState } from './types';
import * as TalentSystem from './talentSystem';

export type TurnStartAction =
  | {
      kind: 'log';
      message: string;
      source: string;
      type: CombatLogEntry['type'];
    }
  | {
      kind: 'setPlayerEndurance';
      value: number;
    }
  | {
      kind: 'changePlayerPleasure';
      delta: number;
    }
  | {
      kind: 'resourcePopup';
      target: 'player' | 'enemy';
      resource: 'stamina' | 'pleasure';
      delta: number;
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
    }
  | {
      kind: 'applyEnemyBuff';
      buffName: string;
      bonus: Record<string, number>;
      duration: number;
    }
  | {
      kind: 'setTalentState';
      talentState: TalentSystem.TalentState;
    }
  | {
      kind: 'queueBossDialogues';
      dialogues: BossDialogue[];
    }
  | {
      kind: 'setDialogueSkippable';
      skippable: boolean;
    }
  | {
      kind: 'hideSurrenderMenu';
    }
  | {
      kind: 'setTurnPhase';
      phase: TurnState['phase'];
    }
  | {
      kind: 'restorePlayerInputIfProcessing';
    };

export interface EnduranceRecoveryResult {
  recovered: number;
  oldEndurance: number;
  newEndurance: number;
}

export interface HeisakiDebtSettlement {
  pleasureIncrease: number;
  debtReduction: number;
  greedSatisfiedDebuff: {
    enduranceCalcDebuff: number;
    duration: number;
  };
}

export function recoverTurnStartEndurance(character: Character): EnduranceRecoveryResult {
  const recovery = Math.ceil(3 + character.stats.maxEndurance * 0.03);
  const oldEndurance = character.stats.currentEndurance;
  character.stats.currentEndurance = Math.min(character.stats.maxEndurance, character.stats.currentEndurance + recovery);

  return {
    recovered: character.stats.currentEndurance - oldEndurance,
    oldEndurance,
    newEndurance: character.stats.currentEndurance,
  };
}

export function createEnduranceRecoveryLog(
  characterName: string,
  recovery: EnduranceRecoveryResult,
): TurnStartAction | null {
  if (recovery.recovered <= 0) {
    return null;
  }

  return {
    kind: 'log',
    message: `${characterName} 回复了 ${recovery.recovered} 点体力`,
    source: 'system',
    type: 'info',
  };
}

export function createEnduranceRecoveryPopup(
  target: 'player' | 'enemy',
  recovery: EnduranceRecoveryResult,
): TurnStartAction | null {
  if (recovery.recovered <= 0) {
    return null;
  }

  return {
    kind: 'resourcePopup',
    target,
    resource: 'stamina',
    delta: recovery.recovered,
  };
}

export function createTurnStartRecoveryActions(player: Character, enemy: Character): TurnStartAction[] {
  const playerRecovery = recoverTurnStartEndurance(player);
  const enemyRecovery = recoverTurnStartEndurance(enemy);

  return [
    createEnduranceRecoveryLog(player.name, playerRecovery),
    createEnduranceRecoveryPopup('player', playerRecovery),
    createEnduranceRecoveryLog(enemy.name, enemyRecovery),
    createEnduranceRecoveryPopup('enemy', enemyRecovery),
  ].filter(Boolean) as TurnStartAction[];
}

export function createPlayerSinTurnStartActions(params: {
  sinType: string | null;
  talentContext: TalentSystem.TalentEffectContext;
  talentState: TalentSystem.TalentState;
  currentTurn: number;
  currentEndurance: number;
}): TurnStartAction[] {
  const actions: TurnStartAction[] = [];

  switch (params.sinType) {
    case 'wrath': {
      params.talentState.wrathActive = true;
      params.talentState.wrathDealtDamageThisTurn = false;
      break;
    }
    case 'sloth': {
      if (params.currentTurn >= 1 && params.currentTurn <= 3) {
        params.talentState.slothCannotAttackTurns = 4 - params.currentTurn;
        actions.push({
          kind: 'log',
          message: `【七宗罪·懒惰】前3回合无法攻击（剩余${params.talentState.slothCannotAttackTurns}回合）`,
          source: 'system',
          type: 'info',
        });
      } else {
        params.talentState.slothCannotAttackTurns = 0;
      }

      if (params.talentState.slothDebuffTurns > 0) {
        params.talentState.slothDebuffTurns--;
        if (params.talentState.slothDebuffTurns === 0) {
          actions.push(
            {
              kind: 'log',
              message: '【七宗罪·懒惰】懒散状态解除',
              source: 'system',
              type: 'info',
            },
            {
              kind: 'removePlayerBuff',
              buffName: '天赋_懒惰_懒散',
            },
          );
        }
      }
      break;
    }
    case 'gluttony': {
      params.talentState.gluttonyDealtDamageThisTurn = false;
      if (params.talentState.gluttonyOvereatNext) {
        params.talentState.gluttonyOvereatNext = false;
        params.talentState.gluttonyStacks = 0;
        actions.push(
          {
            kind: 'bindPlayer',
            turns: 1,
            bindSource: 'player',
          },
          {
            kind: 'log',
            message: '【七宗罪·暴食】进入「过食」状态！被束缚1回合，饕餮层数清空',
            source: 'system',
            type: 'critical',
          },
        );
      }
      break;
    }
    case 'greed': {
      const result = TalentSystem.processGreedOnTurnStart(params.talentContext, params.currentEndurance);
      if (result.staminaCost > 0) {
        actions.push({
          kind: 'setPlayerEndurance',
          value: Math.max(0, params.currentEndurance - result.staminaCost),
        });
      }

      actions.push(
        {
          kind: 'setTalentState',
          talentState: { ...params.talentContext.talentState },
        },
        {
          kind: 'log',
          message: result.message,
          source: 'system',
          type: 'buff',
        },
      );

      const greedStacks = params.talentContext.talentState.greedStacks;
      if (greedStacks > 0) {
        actions.push({
          kind: 'applyPlayerBuff',
          buffName: '天赋_贪婪_层数',
          bonus: {
            暴击率加成: greedStacks * 10,
            魅力加成: greedStacks * 30,
            幸运加成: greedStacks * 30,
            基础性斗力成算: greedStacks * 15,
            闪避率加成: greedStacks * -10,
          },
          duration: 999,
        });
      }
      break;
    }
    case 'pride': {
      if (params.talentState.prideShakenTurns > 0) {
        params.talentState.prideShakenTurns--;
        if (params.talentState.prideShakenTurns === 0) {
          params.talentState.prideShaken = false;
          actions.push({
            kind: 'log',
            message: '【七宗罪·傲慢】动摇状态解除',
            source: 'system',
            type: 'info',
          });
        }
      }
      break;
    }
  }

  return actions;
}

export function createVesperaTurnStartActions(params: {
  bossState: BossState;
  currentTurn: number;
  playerMaxPleasure: number;
  playerBoundTurns: number;
}): TurnStartAction[] {
  if (!params.bossState.isBossFight || params.bossState.bossId !== 'vespera') {
    return [];
  }

  const actions: TurnStartAction[] = [];
  const vesperaResult = BossSystem.processVesperaTurnStart(params.currentTurn, params.playerMaxPleasure);

  if (vesperaResult.pleasureIncrease > 0) {
    actions.push(
      {
        kind: 'changePlayerPleasure',
        delta: vesperaResult.pleasureIncrease,
      },
      {
        kind: 'log',
        message: `【信息素侵蚀】快感增加 ${vesperaResult.pleasureIncrease}（第${params.currentTurn}回合×4%×最大快感）`,
        source: 'system',
        type: 'debuff',
      },
    );
  }

  if (vesperaResult.sexPowerCalcBuff !== 0 || vesperaResult.enduranceCalcDebuff !== 0) {
    actions.push(
      {
        kind: 'applyPlayerBuff',
        buffName: 'BOSS_薇丝佩菈_信息素',
        bonus: {
          基础性斗力成算: vesperaResult.sexPowerCalcBuff,
          基础忍耐力成算: vesperaResult.enduranceCalcDebuff,
        },
        duration: 999,
      },
      {
        kind: 'log',
        message: `【信息素侵蚀】性斗力成算+${vesperaResult.sexPowerCalcBuff}%，忍耐力成算${vesperaResult.enduranceCalcDebuff}%`,
        source: 'system',
        type: 'debuff',
      },
    );
  }

  if (vesperaResult.shouldBindNextTurn && params.playerBoundTurns <= 0) {
    actions.push(
      {
        kind: 'bindPlayer',
        turns: 1,
        bindSource: 'enemy',
      },
      {
        kind: 'log',
        message: '【体力透支】上回合使用了高耐力技能，被强制束缚1回合！',
        source: 'system',
        type: 'critical',
      },
    );
  }

  return actions;
}

export function createElizabethTurnStartActions(params: {
  bossState: BossState;
  currentTurn: number;
}): TurnStartAction[] {
  if (!params.bossState.isBossFight || params.bossState.bossId !== 'elizabeth') {
    return [];
  }

  const actions: TurnStartAction[] = [];
  const commandResult = BossSystem.processElizabethTurnStart(params.currentTurn);
  if (!commandResult.hasCommand || !commandResult.command) {
    return actions;
  }

  if (commandResult.dialogues.length > 0) {
    actions.push({
      kind: 'queueBossDialogues',
      dialogues: commandResult.dialogues,
    });
  }

  if (commandResult.command === 'kneel') {
    actions.push({
      kind: 'log',
      message: '【君王的剧本】伊丽莎白命令你跪拜！本回合必须选择"跳过回合"！',
      source: 'system',
      type: 'critical',
    });
  } else if (commandResult.command === 'tribute') {
    actions.push({
      kind: 'log',
      message: '【君王的剧本】伊丽莎白命令你献礼！本回合必须使用C级技能！',
      source: 'system',
      type: 'critical',
    });
  }

  return actions;
}

export function createHeisakiTurnStartActions(params: {
  bossState: BossState;
  currentPleasure: number;
  maxPleasure: number;
}): {
  actions: TurnStartAction[];
  settlement: HeisakiDebtSettlement | null;
} {
  if (!params.bossState.isBossFight || params.bossState.bossId !== 'heisaki') {
    return { actions: [], settlement: null };
  }

  const actions: TurnStartAction[] = [];
  const interestResult = BossSystem.processHeisakiDebtInterest();
  if (interestResult.interestAmount > 0) {
    actions.push({
      kind: 'log',
      message: `【债务利息】债务增加 ${interestResult.interestAmount}（30%利息），当前债务: ${interestResult.newDebt}`,
      source: 'system',
      type: 'debuff',
    });
  }

  if (!BossSystem.shouldTriggerHeisakiDebtSettlement(params.currentPleasure, params.maxPleasure)) {
    return { actions, settlement: null };
  }

  const settlementResult = BossSystem.executeHeisakiDebtSettlement(params.currentPleasure, params.maxPleasure);
  actions.push(
    { kind: 'hideSurrenderMenu' },
    { kind: 'setTurnPhase', phase: 'processing' },
    { kind: 'setDialogueSkippable', skippable: false },
  );

  if (settlementResult.dialogues.length > 0) {
    actions.push({
      kind: 'queueBossDialogues',
      dialogues: settlementResult.dialogues,
    });
  }

  return {
    actions,
    settlement: {
      pleasureIncrease: settlementResult.pleasureIncrease,
      debtReduction: settlementResult.debtReduction,
      greedSatisfiedDebuff: settlementResult.greedSatisfiedDebuff,
    },
  };
}

export function createHeisakiDebtSettlementActions(settlement: HeisakiDebtSettlement): TurnStartAction[] {
  const actions: TurnStartAction[] = [
    {
      kind: 'changePlayerPleasure',
      delta: settlement.pleasureIncrease,
    },
    {
      kind: 'log',
      message: `【债务结算】快感增加 ${settlement.pleasureIncrease}，债务减少 ${settlement.debtReduction}`,
      source: 'system',
      type: 'critical',
    },
  ];

  if (settlement.greedSatisfiedDebuff.enduranceCalcDebuff !== 0) {
    actions.push(
      {
        kind: 'applyEnemyBuff',
        buffName: 'BOSS_黑崎晴雯_贪婪满足',
        bonus: {
          基础忍耐力成算: settlement.greedSatisfiedDebuff.enduranceCalcDebuff,
        },
        duration: settlement.greedSatisfiedDebuff.duration,
      },
      {
        kind: 'log',
        message: `【贪婪满足】黑崎晴雯忍耐力成算${settlement.greedSatisfiedDebuff.enduranceCalcDebuff}%（${settlement.greedSatisfiedDebuff.duration}回合）`,
        source: 'system',
        type: 'buff',
      },
    );
  }

  actions.push({ kind: 'restorePlayerInputIfProcessing' });

  return actions;
}
