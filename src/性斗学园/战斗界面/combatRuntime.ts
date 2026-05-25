import { reactive, ref } from 'vue';
import type { CombatLogEntry, TurnState } from './types';
import type { StatusList } from '../shared/statusEngine';

export function createCombatRuntime() {
  const turnState = reactive<TurnState>({
    currentTurn: 1,
    phase: 'playerInput',
    enemyIntention: null,
    climaxTarget: null,
  });

  return {
    turnState,
    logs: ref<CombatLogEntry[]>([]),
    enemyStatuses: ref<StatusList>({}),
    enemySkillCooldowns: ref<Record<string, number>>({}),
    enemySkillEffects: ref<Record<string, any>>({}),
    playerBoundTurns: ref(0),
    enemyBoundTurns: ref(0),
    playerBindSource: ref<'player' | 'enemy' | null>(null),
    enemyBindSource: ref<'player' | 'enemy' | null>(null),
    playerSensoryNumb: ref(0),
    enemySensoryNumb: ref(0),
  };
}
