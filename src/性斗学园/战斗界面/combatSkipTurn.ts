import type { CombatLogEntry } from './types';
import * as TalentSystem from './talentSystem';

export type SkipTurnAction =
  | {
      kind: 'log';
      message: string;
      source: string;
      type: CombatLogEntry['type'];
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
      kind: 'applyPlayerBuff';
      buffName: string;
      bonus: Record<string, number>;
      duration: number;
    }
  | {
      kind: 'removePlayerBuff';
      buffName: string;
    };

export function createSinSkipTurnActions(params: {
  sinType: string | null;
  talentContext: TalentSystem.TalentEffectContext;
  maxPleasure: number;
}): SkipTurnAction[] {
  const actions: SkipTurnAction[] = [];

  switch (params.sinType) {
    case 'sloth': {
      const result = TalentSystem.processSlothSkipTurn(params.talentContext);
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

      const stacks = params.talentContext.talentState.slothStacks;
      if (stacks > 0) {
        actions.push({
          kind: 'applyPlayerBuff',
          buffName: '天赋_懒惰_积蓄',
          bonus: {
            基础性斗力成算: stacks * 10,
            基础忍耐力成算: stacks * 10,
            闪避率加成: stacks * 5,
          },
          duration: 999,
        });
      }
      break;
    }
    case 'greed': {
      const result = TalentSystem.processGreedSkipTurn(params.talentContext, params.maxPleasure);
      actions.push({
        kind: 'setTalentState',
        talentState: { ...params.talentContext.talentState },
      });

      if (!result.message) {
        break;
      }

      actions.push(
        {
          kind: 'changePlayerPleasure',
          delta: result.pleasureIncrease,
        },
        {
          kind: 'log',
          message: result.message,
          source: 'system',
          type: 'critical',
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
      } else {
        actions.push({
          kind: 'removePlayerBuff',
          buffName: '天赋_贪婪_层数',
        });
      }
      break;
    }
  }

  return actions;
}
