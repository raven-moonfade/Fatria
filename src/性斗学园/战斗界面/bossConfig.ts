import { CURRENT_BOSS_DEFINITION_BY_ID, type CurrentBossDefinition, type LegacyBossConfigId } from './bossDefinitions';

function toLegacyBossConfig(definition: CurrentBossDefinition) {
  const phaseDefinitions = [...definition.phases].sort((left, right) => left.phase - right.phase);

  return {
    id: definition.id,
    phases: phaseDefinitions.length,
    dataKeys: phaseDefinitions.map(phase => phase.dataKey ?? phase.displayName),
    displayNames: phaseDefinitions.map(phase => phase.displayName),
    levels: phaseDefinitions.map(phase => phase.level),
    climaxLimits: phaseDefinitions.map(phase => phase.climaxLimit ?? 1),
    ...definition.legacy,
  };
}

const LEGACY_BOSS_CONFIG_IDS: LegacyBossConfigId[] = ['muxinlan', 'christine', 'eden', 'vespera', 'heisaki'];

export const BOSS_CONFIG = Object.fromEntries(
  LEGACY_BOSS_CONFIG_IDS.map(bossId => [bossId, toLegacyBossConfig(CURRENT_BOSS_DEFINITION_BY_ID[bossId])]),
) as {
  [BossId in LegacyBossConfigId]: ReturnType<typeof toLegacyBossConfig> & { id: BossId };
};
