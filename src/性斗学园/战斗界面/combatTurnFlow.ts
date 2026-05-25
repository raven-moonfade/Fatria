import type { CombatLogEntry, Skill, TurnState } from './types';

export interface TurnFlowLog {
  message: string;
  source: string;
  type: CombatLogEntry['type'];
}

export function canStartNextPlayerTurn(phase: TurnState['phase']): boolean {
  return phase !== 'climaxResolution' && phase !== 'victory' && phase !== 'defeat' && phase !== 'gameOver';
}

export function beginNextPlayerTurn(turnState: TurnState): boolean {
  if (!canStartNextPlayerTurn(turnState.phase)) {
    return false;
  }

  turnState.currentTurn++;
  turnState.climaxTarget = null;
  turnState.phase = 'playerInput';
  return true;
}

export function createEnemyIntentionPreviewLog(enemyName: string, intention: Skill | null): TurnFlowLog | null {
  if (!intention) {
    return null;
  }

  return {
    message: `预告：${enemyName} 准备使用 ${intention.name}`,
    source: 'system',
    type: 'info',
  };
}

export function createReadySkillCooldownLogs(skills: Skill[]): TurnFlowLog[] {
  return skills.map(skill => ({
    message: `${skill.name} 冷却完成`,
    source: 'system',
    type: 'info',
  }));
}

export function createEnemyTurnActionStartLog(enemyName: string): TurnFlowLog {
  return {
    message: `${enemyName} 开始行动...`,
    source: 'system',
    type: 'info',
  };
}

export function isClimaxPending(turnState: TurnState): boolean {
  return turnState.climaxTarget !== null;
}
