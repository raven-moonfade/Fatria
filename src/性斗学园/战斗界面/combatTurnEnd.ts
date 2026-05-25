import type { CombatLogEntry } from './types';
import * as TalentSystem from './talentSystem';

export type TurnEndAction =
  | {
      kind: 'log';
      message: string;
      source: string;
      type: CombatLogEntry['type'];
    }
  | {
      kind: 'changePlayerPleasure';
      delta: number;
    };

export interface PlayerSinTurnEndResult {
  actions: TurnEndAction[];
  climaxReason: string | null;
}

export function createPlayerSinTurnEndResult(params: {
  sinType: string | null;
  talentState: TalentSystem.TalentState;
  playerMaxPleasure: number;
  playerCurrentPleasure: number;
}): PlayerSinTurnEndResult {
  const actions: TurnEndAction[] = [];
  let climaxReason: string | null = null;

  if (params.sinType === 'pride') {
    if (params.talentState.prideCritThisTurn) {
      params.talentState.prideConsecutiveCrits++;
      if (params.talentState.prideConsecutiveCrits >= 2) {
        params.talentState.prideAbsoluteConfidence = true;
        actions.push({
          kind: 'log',
          message: `【七宗罪·傲慢】连续${params.talentState.prideConsecutiveCrits}回合暴击！下回合攻击必中且连击+2`,
          source: 'system',
          type: 'buff',
        });
      }
    } else if (params.talentState.prideConsecutiveCrits > 0) {
      params.talentState.prideConsecutiveCrits = 0;
    }
    params.talentState.prideCritThisTurn = false;
  }

  if (params.sinType === 'gluttony' && !params.talentState.gluttonyDealtDamageThisTurn) {
    const pleasureIncrease = Math.floor(params.playerMaxPleasure * 0.2);
    actions.push(
      {
        kind: 'changePlayerPleasure',
        delta: pleasureIncrease,
      },
      {
        kind: 'log',
        message: `【七宗罪·暴食】本回合未造成伤害，快感+${pleasureIncrease}`,
        source: 'system',
        type: 'critical',
      },
    );
    if (params.playerCurrentPleasure + pleasureIncrease >= params.playerMaxPleasure) {
      climaxReason = '暴食效果';
    }
  }

  if (params.sinType === 'wrath' && !params.talentState.wrathDealtDamageThisTurn) {
    const pleasureIncrease = Math.floor(params.playerMaxPleasure * 0.2);
    actions.push(
      {
        kind: 'changePlayerPleasure',
        delta: pleasureIncrease,
      },
      {
        kind: 'log',
        message: `【七宗罪·暴怒】本回合未造成伤害，快感+${pleasureIncrease}`,
        source: 'system',
        type: 'critical',
      },
    );
    if (params.playerCurrentPleasure + pleasureIncrease >= params.playerMaxPleasure) {
      climaxReason = '暴怒效果';
    }
  }

  return { actions, climaxReason };
}
