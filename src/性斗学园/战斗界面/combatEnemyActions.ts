import { DamageSource, SkillType, type Character, type CombatLogEntry, type Skill } from './types';

export type EnemyIntentionFailureReason = 'empty' | 'noValidSkill' | 'noChoice';

export interface EnemyIntentionSelection {
  skill: Skill | null;
  invalidSkills: Skill[];
  failureReason?: EnemyIntentionFailureReason;
}

export type EnemySkillFallbackReason = 'intentionUnavailable' | 'allCooling';

export interface EnemySkillSelection {
  skill: Skill | null;
  fallbackReason?: EnemySkillFallbackReason;
}

export interface EnemyActionLog {
  message: string;
  source: string;
  type: CombatLogEntry['type'];
}

export type EnemySkillUseStopReason = 'noSkill' | 'insufficientEndurance';

export interface EnemySkillUsePreparation {
  skill: Skill | null;
  canUseSkill: boolean;
  stopReason?: EnemySkillUseStopReason;
  logs: EnemyActionLog[];
}

function pickRandom<T>(items: T[], random = Math.random): T | null {
  if (items.length === 0) {
    return null;
  }

  return items[Math.floor(random() * items.length)] ?? null;
}

function isValidEnemySkill(skill: Skill): boolean {
  return Boolean(skill.id && skill.name);
}

function mapMvuDamageSource(source: string): DamageSource {
  switch (source) {
    case '魅力':
      return DamageSource.CHARM;
    case '幸运':
      return DamageSource.LUCK;
    case '固定值':
      return DamageSource.FIXED;
    case '目标快感':
      return DamageSource.TARGET_PLEASURE;
    default:
      return DamageSource.SEX_POWER;
  }
}

export function syncEnemySkillCooldowns(skills: Skill[], cooldowns: Record<string, number>): void {
  skills.forEach(skill => {
    skill.currentCooldown = cooldowns[skill.id] ?? skill.currentCooldown ?? 0;
  });
}

export function selectEnemyIntention(skills: Skill[], random = Math.random): EnemyIntentionSelection {
  if (skills.length === 0) {
    return { skill: null, invalidSkills: [], failureReason: 'empty' };
  }

  const invalidSkills = skills.filter(skill => !isValidEnemySkill(skill));
  const validSkills = skills.filter(isValidEnemySkill);
  if (validSkills.length === 0) {
    return { skill: null, invalidSkills, failureReason: 'noValidSkill' };
  }

  const availableSkills = validSkills.filter(skill => skill.currentCooldown === 0);
  const skillsToChoose = availableSkills.length > 0 ? availableSkills : validSkills;
  const skill = pickRandom(skillsToChoose, random);

  return skill ? { skill, invalidSkills } : { skill: null, invalidSkills, failureReason: 'noChoice' };
}

export function selectEnemySkillForTurn(
  skills: Skill[],
  intention: Skill | null,
  random = Math.random,
): EnemySkillSelection {
  const intendedSkill = intention ? skills.find(skill => skill.id === intention.id) : undefined;

  if (intendedSkill && intendedSkill.currentCooldown <= 0) {
    return { skill: intendedSkill };
  }

  const availableSkill = pickRandom(
    skills.filter(skill => skill.currentCooldown === 0),
    random,
  );
  if (availableSkill) {
    return { skill: availableSkill, fallbackReason: 'intentionUnavailable' };
  }

  return skills[0] ? { skill: skills[0], fallbackReason: 'allCooling' } : { skill: null };
}

export function getEnemySkillCost(skill: Skill): number {
  return skill.data?.staminaCost || skill.cost || 0;
}

export function getEnemySkillCooldown(skill: Skill): number {
  return skill.data?.cooldown || skill.cooldown || 0;
}

export function applyEnemySkillCooldown(
  skills: Skill[],
  cooldowns: Record<string, number>,
  skill: Skill,
): number | null {
  const skillIndex = skills.findIndex(candidate => candidate.id === skill.id);
  if (skillIndex === -1) {
    return null;
  }

  const cooldown = getEnemySkillCooldown(skill);
  skills[skillIndex].currentCooldown = cooldown;
  cooldowns[skill.id] = cooldown;
  return cooldown;
}

export function decrementSkillCooldowns(
  skills: Skill[],
  cooldowns?: Record<string, number>,
): {
  readySkills: Skill[];
} {
  const readySkills: Skill[] = [];

  skills.forEach(skill => {
    if (skill.currentCooldown > 0) {
      skill.currentCooldown--;
      if (skill.currentCooldown === 0) {
        readySkills.push(skill);
      }
    }

    if (cooldowns) {
      cooldowns[skill.id] = skill.currentCooldown;
    }
  });

  return { readySkills };
}

export function hydrateEnemySkillDataFromRuntime(skill: Skill, runtimeSkill: any): boolean {
  if (skill.data || !runtimeSkill?.基本信息) {
    return false;
  }

  const damageInfo = runtimeSkill.伤害与效果 || {};
  const damageSource = damageInfo.伤害来源 || '性斗力';
  const coefficient = (damageInfo.系数 || 100) / 100;

  skill.data = {
    id: skill.id,
    name: runtimeSkill.基本信息.技能名称 || skill.id,
    description: runtimeSkill.基本信息.技能描述 || '',
    effectDescription: '',
    type: SkillType.ATTACK,
    staminaCost: runtimeSkill.冷却与消耗?.耐力消耗 || 0,
    cooldown: runtimeSkill.冷却与消耗?.冷却回合数 || 0,
    castTime: 0,
    damageFormula: [{ source: mapMvuDamageSource(damageSource), coefficient, baseValue: 0 }],
    accuracy: damageInfo.基础命中率 || 100,
    critModifier: damageInfo.暴击修正 || 0,
    buffs: [],
    canBeReflected: false,
    hitCount: damageInfo.连击数 || 1,
    accuracyModifier: damageInfo.准确率 || 100,
  };

  return true;
}

export function prepareEnemySkillUseForTurn(params: {
  enemy: Character;
  intention: Skill | null;
  cooldowns: Record<string, number>;
  runtimeSkillEffects: Record<string, any>;
}): EnemySkillUsePreparation {
  const logs: EnemyActionLog[] = [];
  const enemySkillSelection = selectEnemySkillForTurn(params.enemy.skills, params.intention);
  const skill = enemySkillSelection.skill;

  if (skill) {
    if (enemySkillSelection.fallbackReason === 'intentionUnavailable') {
      logs.push({
        message: `${params.enemy.name} 的预告技能冷却中，改为使用 ${skill.name}`,
        source: 'system',
        type: 'info',
      });
    } else if (enemySkillSelection.fallbackReason === 'allCooling') {
      logs.push({
        message: `${params.enemy.name} 所有技能都在冷却，使用 ${skill.name}`,
        source: 'system',
        type: 'info',
      });
    }
  }

  if (!skill) {
    logs.push({
      message: `${params.enemy.name} 没有可用技能`,
      source: 'system',
      type: 'info',
    });
    return { skill: null, canUseSkill: false, stopReason: 'noSkill', logs };
  }

  const skillCost = getEnemySkillCost(skill);
  if (params.enemy.stats.currentEndurance < skillCost) {
    logs.push({
      message: `${params.enemy.name} 体力不足，无法使用 ${skill.name}！`,
      source: 'system',
      type: 'info',
    });
    return { skill, canUseSkill: false, stopReason: 'insufficientEndurance', logs };
  }

  if (!skill.data) {
    try {
      const runtimeSkill = params.runtimeSkillEffects[skill.id];
      if (hydrateEnemySkillDataFromRuntime(skill, runtimeSkill)) {
        console.info('[战斗界面] 从运行时表重建敌人技能数据:', skill.name);
      }
    } catch (e) {
      console.error('[战斗界面] 重新构建技能数据失败', e);
    }
  }

  params.enemy.stats.currentEndurance -= skillCost;
  logs.push({
    message: `${params.enemy.name} 消耗了 ${skillCost} 点体力`,
    source: 'system',
    type: 'info',
  });

  const cooldown = applyEnemySkillCooldown(params.enemy.skills, params.cooldowns, skill);
  if (cooldown !== null && cooldown > 0) {
    logs.push({
      message: `${skill.name} 进入冷却，冷却时间 ${cooldown} 回合`,
      source: 'system',
      type: 'info',
    });
  }

  return { skill, canUseSkill: true, logs };
}
