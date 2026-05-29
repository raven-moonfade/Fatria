import type { BossPhaseRuntimeConfig, BossPhaseTransitionEffect } from './combatBossTransitions';
import {
  createBossMechanicRuntime,
  getBossPhase,
  type BossMechanicRuntime,
  type BossPhaseDefinition,
  type DeclarativeBossDefinition,
} from './bossMechanicEngine';
import { getExorcismBossDefinitionMatch } from './exorcismBossDefinitions';
import type { Character, Skill } from './types';

export interface ExorcismRuntimeSetup {
  definition: DeclarativeBossDefinition;
  runtime: BossMechanicRuntime;
  phaseConfig: BossPhaseRuntimeConfig;
}

const ALWAYS_START_FROM_FIRST_PHASE_BOSS_IDS = new Set(['exorcism_wuchang']);

function getPhaseTransitionEffect(phase: number): BossPhaseTransitionEffect {
  return phase <= 2 ? 'phase1to2' : 'phase2to3';
}

function getPhaseDisplayName(definition: DeclarativeBossDefinition, phase: BossPhaseDefinition): string {
  const phaseName = phase.displayName || definition.displayName;
  if (phaseName === definition.displayName || phaseName.includes(definition.displayName)) {
    return phaseName;
  }
  return `${definition.displayName}·${phaseName}`;
}

function hasClimaxPhaseTransition(definition: DeclarativeBossDefinition): boolean {
  return definition.mechanics.some(
    mechanic =>
      mechanic.triggers.some(trigger => trigger.type === 'climaxCountAtLeast') &&
      mechanic.actions.some(action => action.type === 'setPhase'),
  );
}

function getClimaxPhaseLimit(definition: DeclarativeBossDefinition, phase: BossPhaseDefinition, fallback: number): number {
  if (!hasClimaxPhaseTransition(definition)) {
    return phase.climaxLimit ?? fallback;
  }

  const finalPhase = Math.max(...definition.phases.map(item => item.phase));
  return phase.phase === finalPhase ? 3 : 1;
}

export function createExorcismPhaseRuntimeConfig(params: {
  definition: DeclarativeBossDefinition;
  phase: number;
  defaultClimaxLimit: number;
  getEnemyPortraitUrl: (enemyName: string) => string;
}): BossPhaseRuntimeConfig | null {
  const phase = getBossPhase(params.definition, params.phase);
  if (!phase) return null;

  const dataKey = phase.dataKey || params.definition.displayName;
  return {
    displayName: getPhaseDisplayName(params.definition, phase),
    dataKey,
    skillPoolKey: phase.skillPoolKey,
    avatarUrl: params.getEnemyPortraitUrl(dataKey),
    climaxLimit: getClimaxPhaseLimit(params.definition, phase, params.defaultClimaxLimit),
    transitionEffect: getPhaseTransitionEffect(phase.phase),
  };
}

export function createExorcismRuntimeSetup(params: {
  enemyName: string;
  defaultClimaxLimit: number;
  getEnemyPortraitUrl: (enemyName: string) => string;
}): ExorcismRuntimeSetup | null {
  const match = getExorcismBossDefinitionMatch(params.enemyName);
  const definition = match?.definition;
  if (!definition || definition.status === 'blocked') return null;

  const runtime = createBossMechanicRuntime(definition);
  if (match.phase && !ALWAYS_START_FROM_FIRST_PHASE_BOSS_IDS.has(definition.id)) {
    runtime.currentPhase = match.phase.phase;
    runtime.skillPoolKey = match.phase.skillPoolKey;
  }

  const phaseConfig = createExorcismPhaseRuntimeConfig({
    definition,
    phase: runtime.currentPhase,
    defaultClimaxLimit: params.defaultClimaxLimit,
    getEnemyPortraitUrl: params.getEnemyPortraitUrl,
  });
  if (!phaseConfig) return null;

  return {
    definition,
    runtime,
    phaseConfig,
  };
}

export function getExorcismSkillTags(skill: Skill | null | undefined): string[] {
  const tags = skill?.data?.tags;
  return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : [];
}

export function getExorcismPleasurePercent(character: Character): number {
  const maxPleasure = Math.max(1, character.stats.maxPleasure || 1);
  return Math.max(0, Math.min(100, (character.stats.currentPleasure / maxPleasure) * 100));
}

export function getExorcismHpPercent(character: Character): number {
  return Math.max(0, Math.min(100, 100 - getExorcismPleasurePercent(character)));
}

export function buildExorcismClimaxCounterKeys(
  definition: DeclarativeBossDefinition,
  runtime: BossMechanicRuntime,
): string[] {
  const currentPhase = getBossPhase(definition, runtime.currentPhase);
  return [
    definition.id,
    definition.id.replace(/^exorcism_/, ''),
    definition.displayName,
    ...definition.aliases,
    currentPhase?.dataKey,
    currentPhase?.skillPoolKey,
  ].filter((key): key is string => Boolean(key));
}
