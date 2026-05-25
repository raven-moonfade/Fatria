import type { Character, CombatLogEntry, TurnState } from './types';

export type ClimaxSide = 'player' | 'enemy';

export interface ClimaxLog {
  message: string;
  source: string;
  type: CombatLogEntry['type'];
}

export interface ClimaxSettlement {
  logs: ClimaxLog[];
}

export interface ClimaxOutcome {
  phase: Extract<TurnState['phase'], 'victory' | 'defeat'>;
  effect: 'victory' | 'defeat';
  log: ClimaxLog;
}

export function getClimaxSide(targetIsEnemy: boolean): ClimaxSide {
  return targetIsEnemy ? 'enemy' : 'player';
}

export function hasReachedPleasureLimit(character: Character): boolean {
  return character.stats.currentPleasure >= character.stats.maxPleasure;
}

export function createClimaxTriggerLogs(params: {
  characterName: string;
  reason?: string;
  useProcessEllipsis?: boolean;
}): ClimaxLog[] {
  const headline = params.reason
    ? `${params.characterName} 因${params.reason}达到了快感上限！`
    : `${params.characterName} 达到了快感上限！`;
  const climaxText =
    params.useProcessEllipsis === false ? `${params.characterName} 达到了高潮！` : `${params.characterName} 达到了高潮！ (过程略)`;

  return [
    {
      message: headline,
      source: 'system',
      type: 'critical',
    },
    {
      message: climaxText,
      source: 'system',
      type: 'info',
    },
  ];
}

export function settleClimaxCount(params: {
  character: Character;
  side: ClimaxSide;
  preventClimaxCount?: boolean;
}): ClimaxSettlement {
  const { character, side, preventClimaxCount = false } = params;

  character.stats.currentPleasure = 0;
  if (side === 'enemy' || !preventClimaxCount) {
    character.stats.climaxCount += 1;
  }

  return {
    logs: [
      {
        message: `${character.name} 的高潮次数：${character.stats.climaxCount}/${character.stats.maxClimaxCount}`,
        source: 'system',
        type: 'info',
      },
    ],
  };
}

export function createClimaxLimitStatusLogs(character: Character): ClimaxLog[] {
  if (character.stats.maxClimaxCount <= 0 || character.stats.climaxCount < character.stats.maxClimaxCount) {
    return [];
  }

  return [
    {
      message: `${character.name} 达到了高潮次数上限，进入虚脱状态！`,
      source: 'system',
      type: 'critical',
    },
    {
      message: `${character.name} 的耐力降低30%`,
      source: 'system',
      type: 'critical',
    },
  ];
}

export function getClimaxOutcomeAfterSettlement(params: {
  targetSide: ClimaxSide;
  player: Character;
  enemy: Character;
  currentTurn: number;
}): ClimaxOutcome | null {
  if (params.targetSide === 'enemy' && params.enemy.stats.climaxCount >= params.enemy.stats.maxClimaxCount) {
    return {
      phase: 'victory',
      effect: 'victory',
      log: {
        message: `${params.enemy.name} 达到了最大高潮次数！战斗胜利！共${params.currentTurn}回合。`,
        source: 'system',
        type: 'critical',
      },
    };
  }

  if (params.targetSide === 'player' && params.player.stats.climaxCount >= params.player.stats.maxClimaxCount) {
    return {
      phase: 'defeat',
      effect: 'defeat',
      log: {
        message: `${params.player.name} 达到了最大高潮次数... 败北，共${params.currentTurn}回合。`,
        source: 'system',
        type: 'damage',
      },
    };
  }

  return null;
}
