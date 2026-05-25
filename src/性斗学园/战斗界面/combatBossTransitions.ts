import * as BossSystem from './bossSystem';
import type { BossDialogue } from './bossSystem';
import * as TalentSystem from './talentSystem';
import type { Character, CombatLogEntry, CombatStats, Skill } from './types';

export type BossPhaseTransitionEffect = 'phase1to2' | 'phase2to3';

export interface BossPhaseRuntimeConfig {
  displayName: string;
  dataKey: string;
  skillPoolKey?: string;
  avatarUrl?: string;
  climaxLimit: number;
  transitionEffect: BossPhaseTransitionEffect;
}

export interface BossPhaseSkillRuntime {
  skills: Skill[];
  cooldowns: Record<string, number>;
  effects: Record<string, any>;
  names: string[];
}

export type BossPhaseSideEffectAction =
  | {
      kind: 'log';
      message: string;
      source: string;
      type: CombatLogEntry['type'];
    }
  | {
      kind: 'setBossControlsDisabled';
      itemsDisabled: boolean;
      surrenderDisabled: boolean;
    }
  | {
      kind: 'castSealEffect';
      selectors: string[];
      delayMs: number;
    }
  | {
      kind: 'removeSealEffect';
      selectors: string[];
    }
  | {
      kind: 'applyEnemyBuff';
      buffName: string;
      bonus: Record<string, number>;
      duration: number;
    };

export function getDialogueWaitTime(dialogues: BossDialogue[]): number {
  return dialogues.length * 2500 + 500;
}

export function getMuxinlanPhaseConfig(nextPhase: 1 | 2 | 3): BossPhaseRuntimeConfig {
  return {
    displayName: BossSystem.getMuxinlanDisplayName(nextPhase),
    dataKey: BossSystem.getMuxinlanDataKey(nextPhase),
    avatarUrl: BossSystem.getMuxinlanAvatarUrl(nextPhase),
    climaxLimit: BossSystem.getConfiguredBossClimaxLimit(
      'muxinlan',
      nextPhase,
      BossSystem.BOSS_CONFIG.muxinlan.climaxLimits[nextPhase - 1],
    ),
    transitionEffect: nextPhase === 2 ? 'phase1to2' : 'phase2to3',
  };
}

export function getChristinePhaseConfig(nextPhase: 1 | 2): BossPhaseRuntimeConfig {
  return {
    displayName: BossSystem.getChristineDisplayName(nextPhase),
    dataKey: BossSystem.getChristineDataKey(nextPhase),
    avatarUrl: BossSystem.getChristineAvatarUrl(nextPhase),
    climaxLimit: BossSystem.getConfiguredBossClimaxLimit(
      'christine',
      nextPhase,
      BossSystem.BOSS_CONFIG.christine.climaxLimits[nextPhase - 1],
    ),
    transitionEffect: 'phase1to2',
  };
}

export function getYamadaHanakoPhaseConfig(nextPhase: 1 | 2): BossPhaseRuntimeConfig {
  return {
    displayName: BossSystem.getYamadaHanakoDisplayName(nextPhase),
    dataKey: BossSystem.getYamadaHanakoDataKey(nextPhase),
    skillPoolKey: BossSystem.getYamadaHanakoSkillPoolKey(nextPhase),
    avatarUrl: BossSystem.getYamadaHanakoAvatarUrl(nextPhase),
    climaxLimit: BossSystem.getConfiguredBossClimaxLimit('yamadaHanako', nextPhase, 1),
    transitionEffect: 'phase1to2',
  };
}

export function buildMuxinlanTransitionDialogues(currentPhase: 1 | 2 | 3): BossDialogue[] {
  const dialogues: BossDialogue[] = [];
  const lockHpDialogues = BossSystem.getPhaseDialogues(currentPhase, 'lockHp');
  if (lockHpDialogues) {
    dialogues.push(...lockHpDialogues);
  }

  const transitionDialogues = BossSystem.getPhaseDialogues(currentPhase, 'transition');
  if (transitionDialogues) {
    dialogues.push(...transitionDialogues);
  }

  return dialogues;
}

export function buildChristineTransitionDialogues(currentPhase: 1 | 2, nextPhase: 1 | 2): BossDialogue[] {
  const dialogues: BossDialogue[] = [];
  const lockHpDialogue = BossSystem.getChristineLockHpDialogue(currentPhase);
  if (lockHpDialogue) {
    dialogues.push(lockHpDialogue);
  }

  if (currentPhase === 1 && nextPhase === 2) {
    dialogues.push(...BossSystem.CHRISTINE_DIALOGUES.phase1_to_2);
  }

  return dialogues;
}

export function applyPhaseEnemyData(params: {
  enemy: Character;
  enemyData: any;
  config: BossPhaseRuntimeConfig;
  normalizeEvasion: (rawEvasion: number) => number;
  updateAvatar: boolean;
}): void {
  const { enemy, enemyData, config, normalizeEvasion, updateAvatar } = params;

  enemy.name = config.displayName;
  if (updateAvatar && config.avatarUrl) {
    enemy.avatarUrl = config.avatarUrl;
  }

  enemy.stats.level = enemyData.对手等级;
  enemy.stats.charm = enemyData.对手魅力;
  enemy.stats.luck = enemyData.对手幸运;
  enemy.stats.evasion = normalizeEvasion(enemyData.对手闪避率);
  enemy.stats.crit = enemyData.对手暴击率;
  enemy.stats.maxEndurance = enemyData.对手最大耐力;
  enemy.stats.currentEndurance = enemyData.对手耐力;
  enemy.stats.maxPleasure = enemyData.对手最大快感;
  enemy.stats.currentPleasure = 0;
  enemy.stats.climaxCount = 0;
  enemy.stats.sexPower = enemyData.对手性斗力;
  enemy.stats.baseEndurance = enemyData.对手忍耐力;
  enemy.stats.maxClimaxCount = config.climaxLimit;
}

export function buildPhaseSkillRuntime(
  skillDataList: any[] | null | undefined,
  convertToMvuSkillFormat: (skill: any) => any,
): BossPhaseSkillRuntime {
  const cooldowns: Record<string, number> = {};
  const effects: Record<string, any> = {};
  const skills = (skillDataList || []).map(skill => {
    cooldowns[skill.id] = 0;
    effects[skill.id] = convertToMvuSkillFormat(skill);
    return {
      id: skill.id,
      name: skill.name,
      description: skill.effectDescription || skill.description,
      cost: skill.staminaCost,
      type: skill.type,
      cooldown: skill.cooldown,
      currentCooldown: 0,
      data: skill,
    } as Skill;
  });

  return {
    skills,
    cooldowns,
    effects,
    names: skills.map(skill => skill.name),
  };
}

function createEnemyStatSnapshot(enemyData: any) {
  return {
    sexPower: enemyData.对手性斗力,
    endurance: enemyData.对手忍耐力,
    charm: enemyData.对手魅力,
    luck: enemyData.对手幸运,
    evasion: enemyData.对手闪避率,
    crit: enemyData.对手暴击率,
  };
}

function createPlayerStatSnapshot(playerStats: CombatStats) {
  return {
    sexPower: playerStats.sexPower,
    endurance: playerStats.baseEndurance,
    charm: playerStats.charm,
    luck: playerStats.luck,
    evasion: playerStats.evasion,
    crit: playerStats.crit,
  };
}

export function createMuxinlanPhaseSideEffectActions(params: {
  nextPhase: 1 | 2 | 3;
  displayName: string;
  enemyData: any;
  playerStats: CombatStats;
  talentContext: TalentSystem.TalentEffectContext;
}): BossPhaseSideEffectAction[] {
  const actions: BossPhaseSideEffectAction[] = [];
  const sealedSelectors = ['.menu-card:has(svg[data-icon="package"])', '[data-action="surrender-menu"]'];

  if (params.nextPhase === 2) {
    actions.push(
      {
        kind: 'setBossControlsDisabled',
        itemsDisabled: true,
        surrenderDisabled: true,
      },
      {
        kind: 'castSealEffect',
        selectors: sealedSelectors,
        delayMs: 500,
      },
      {
        kind: 'log',
        message: '【警告】物品背包和投降按钮已被禁用！',
        source: 'system',
        type: 'critical',
      },
    );
  } else if (params.nextPhase === 3) {
    actions.push(
      {
        kind: 'setBossControlsDisabled',
        itemsDisabled: false,
        surrenderDisabled: false,
      },
      {
        kind: 'removeSealEffect',
        selectors: sealedSelectors,
      },
      {
        kind: 'log',
        message: '【提示】禁用效果已解除，可以正常使用物品和投降（啊你真的会在这个阶段投降吗？）',
        source: 'system',
        type: 'info',
      },
    );
  }

  if (TalentSystem.getEnemySinTalentType(params.displayName) !== 'envy') {
    return actions;
  }

  actions.push({
    kind: 'log',
    message: `【敌人·嫉妒】${params.displayName} 的嫉妒天赋再次发动！`,
    source: 'system',
    type: 'critical',
  });

  const envyResult = TalentSystem.processEnvyOnBattleStart(
    params.talentContext,
    createEnemyStatSnapshot(params.enemyData),
    createPlayerStatSnapshot(params.playerStats),
  );

  for (const effect of envyResult.effects) {
    actions.push(
      {
        kind: 'log',
        message: `【敌人·嫉妒】${effect.message}`,
        source: 'system',
        type: effect.isBonus ? 'buff' : 'critical',
      },
      {
        kind: 'applyEnemyBuff',
        buffName: `敌人天赋_嫉妒_阶段${params.nextPhase}_${effect.attribute}`,
        bonus: { [`${effect.attribute}加成`]: effect.value },
        duration: 999,
      },
    );
  }

  return actions;
}

export function createChristinePhaseSideEffectActions(nextPhase: 1 | 2): BossPhaseSideEffectAction[] {
  if (nextPhase !== 2) {
    return [];
  }

  return [
    {
      kind: 'setBossControlsDisabled',
      itemsDisabled: true,
      surrenderDisabled: true,
    },
    {
      kind: 'log',
      message: '【女王觉醒】克莉丝汀的里人格觉醒！物品和投降被封印！',
      source: 'system',
      type: 'critical',
    },
    {
      kind: 'applyEnemyBuff',
      buffName: '敌人天赋_暴怒_闪避归零',
      bonus: { 闪避率加成: -999 },
      duration: 999,
    },
    {
      kind: 'log',
      message: '【敌人·暴怒】克莉丝汀暴怒觉醒！闪避率归零，所有攻击连击+1，必定暴击！',
      source: 'system',
      type: 'critical',
    },
    {
      kind: 'log',
      message: '【敌人·暴怒】若克莉丝汀本回合没有造成快感伤害，将因暴怒增加自身20%最大快感的快感！',
      source: 'system',
      type: 'critical',
    },
  ];
}
