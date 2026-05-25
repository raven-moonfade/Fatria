<template>
  <div class="animate-slide-up space-y-8 pb-4">
    <!-- Active Skills Section (hidden in Life Sim Mode) -->
    <div v-if="!isLifeSimMode" class="bg-black/20 border border-white/5 rounded-2xl overflow-hidden">
      <div class="bg-white/5 border-b border-white/5 p-4 flex justify-between items-center backdrop-blur-md">
        <div class="flex items-center gap-2">
          <div class="p-1.5 bg-red-500/20 rounded text-red-400">
            <i class="fas fa-hand-fist"></i>
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">主动技能</h3>
            <p class="text-xs text-gray-400">选择 {{ MAX_ACTIVE_SKILLS }} 个性斗手段</p>
          </div>
        </div>
        <div class="text-right bg-white/5 px-3 py-1 rounded-full border border-white/5">
          <span
            :class="[
              'font-bold',
              data.initialActiveSkills.length === MAX_ACTIVE_SKILLS ? 'text-secondary' : 'text-white',
            ]"
          >
            {{ data.initialActiveSkills.length }}
          </span>
          <span class="text-gray-500 text-sm">/{{ MAX_ACTIVE_SKILLS }}</span>
        </div>
      </div>

      <div class="p-4 h-[350px] overflow-y-auto custom-scrollbar">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            v-for="skill in starterSkills"
            :key="skill.id"
            @click="toggleActiveSkill(skill.id)"
            :disabled="
              !data.initialActiveSkills.includes(skill.id) && data.initialActiveSkills.length >= MAX_ACTIVE_SKILLS
            "
            :class="[
              'relative group p-3 rounded-xl border transition-all duration-300 text-left flex flex-col gap-2',
              data.initialActiveSkills.includes(skill.id)
                ? 'bg-secondary/20 border-secondary ring-1 ring-secondary'
                : data.initialActiveSkills.length >= MAX_ACTIVE_SKILLS
                  ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30',
            ]"
          >
            <!-- 技能头部 -->
            <div class="flex items-start gap-3">
              <div
                :class="[
                  'p-2.5 rounded-lg transition-colors shrink-0',
                  data.initialActiveSkills.includes(skill.id)
                    ? 'bg-secondary text-white'
                    : 'bg-black/30 text-gray-400 group-hover:text-gray-200',
                ]"
              >
                <i :class="['fas', getIconClass(skill.icon)]"></i>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                  <h4
                    :class="[
                      'font-bold text-sm truncate pr-2 transition-colors',
                      data.initialActiveSkills.includes(skill.id) ? 'text-white' : 'text-gray-200',
                    ]"
                  >
                    {{ skill.name }}
                  </h4>
                  <span :class="['text-xs px-1.5 py-0.5 rounded', getRarityClass(skill.rarity)]">
                    {{ skill.rarity }}
                  </span>
                </div>
                <p class="text-xs text-secondary mt-1 font-medium">
                  {{ skill.effectDescription }}
                </p>
              </div>
            </div>

            <!-- 技能数值 -->
            <div class="flex flex-wrap gap-1.5 mt-1">
              <span class="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                <i class="fas fa-bolt-lightning mr-1"></i>{{ skill.staminaCost }}耐力
              </span>
              <span
                v-if="skill.cooldown > 0"
                class="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30"
              >
                <i class="fas fa-clock mr-1"></i>{{ skill.cooldown }}回合
              </span>
              <span class="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                <i class="fas fa-crosshairs mr-1"></i>{{ skill.accuracy }}%
              </span>
            </div>

            <!-- 伤害公式 -->
            <div v-if="skill.damageFormula && skill.damageFormula.length > 0" class="text-xs text-gray-400">
              <span class="text-gray-500">伤害:</span>
              <span v-for="(dmg, idx) in skill.damageFormula" :key="idx" class="text-orange-400">
                {{ idx > 0 ? ' + ' : '' }}{{ Math.round(dmg.coefficient * 100) }}%{{ getDamageSourceName(dmg.source) }}
                <span v-if="(dmg.baseValue ?? 0) > 0">+{{ dmg.baseValue ?? 0 }}</span>
              </span>
            </div>

            <!-- 选中标记 -->
            <div v-if="data.initialActiveSkills.includes(skill.id)" class="absolute top-2 right-2">
              <i class="fas fa-check-circle text-secondary"></i>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Constitution Skills Section -->
    <div class="bg-black/20 border border-white/5 rounded-2xl overflow-hidden">
      <div class="bg-white/5 border-b border-white/5 p-4 flex justify-between items-center backdrop-blur-md">
        <div class="flex items-center gap-2">
          <div class="p-1.5 bg-blue-500/20 rounded text-blue-400">
            <i class="fas fa-dna"></i>
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">特殊体质</h3>
            <p class="text-xs text-gray-400">选择 {{ MAX_PASSIVE_SKILLS }} 个永久体质</p>
          </div>
        </div>
        <div class="text-right bg-white/5 px-3 py-1 rounded-full border border-white/5">
          <span
            :class="[
              'font-bold',
              data.initialPassiveSkills.length === MAX_PASSIVE_SKILLS ? 'text-secondary' : 'text-white',
            ]"
          >
            {{ data.initialPassiveSkills.length }}
          </span>
          <span class="text-gray-500 text-sm">/{{ MAX_PASSIVE_SKILLS }}</span>
        </div>
      </div>

      <div class="p-4 h-[350px] overflow-y-auto custom-scrollbar">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            v-for="constitution in currentConstitutions"
            :key="constitution.id"
            @click="toggleConstitution(constitution.id)"
            :disabled="
              !data.initialPassiveSkills.includes(constitution.id) &&
              data.initialPassiveSkills.length >= MAX_PASSIVE_SKILLS
            "
            :class="[
              'relative group p-3 rounded-xl border transition-all duration-300 text-left flex flex-col gap-2',
              data.initialPassiveSkills.includes(constitution.id)
                ? 'bg-secondary/20 border-secondary ring-1 ring-secondary'
                : data.initialPassiveSkills.length >= MAX_PASSIVE_SKILLS
                  ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30',
            ]"
          >
            <!-- 体质头部 -->
            <div class="flex items-start gap-3">
              <div
                :class="[
                  'p-2.5 rounded-lg transition-colors shrink-0',
                  data.initialPassiveSkills.includes(constitution.id)
                    ? 'bg-secondary text-white'
                    : 'bg-black/30 text-gray-400 group-hover:text-gray-200',
                ]"
              >
                <i :class="['fas', getIconClass(constitution.icon)]"></i>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                  <h4
                    :class="[
                      'font-bold text-sm truncate pr-2 transition-colors',
                      data.initialPassiveSkills.includes(constitution.id) ? 'text-white' : 'text-gray-200',
                    ]"
                  >
                    {{ constitution.name }}
                  </h4>
                  <span :class="['text-xs px-1.5 py-0.5 rounded', getConstitutionRarityClass(constitution.rarity)]">
                    {{ constitution.rarity }}
                  </span>
                </div>
                <p class="text-xs text-secondary mt-1 font-medium">
                  {{ constitution.effectDescription }}
                </p>
              </div>
            </div>

            <!-- 属性加成 -->
            <div v-if="constitution.permanentModifiers.length > 0" class="flex flex-wrap gap-1.5">
              <span
                v-for="(mod, idx) in constitution.permanentModifiers"
                :key="idx"
                :class="[
                  'text-xs px-2 py-0.5 rounded border',
                  mod.value > 0
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30',
                ]"
              >
                {{ getModifierLabel(mod.stat) }} {{ mod.value > 0 ? '+' : '' }}{{ mod.value
                }}{{ mod.isPercent ? '%' : '' }}
              </span>
            </div>

            <!-- 敏感度修正 -->
            <div v-if="constitution.sensitivityModifiers.length > 0" class="flex flex-wrap gap-1.5">
              <span
                v-for="(sens, idx) in constitution.sensitivityModifiers"
                :key="idx"
                class="text-xs px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30"
              >
                {{ sens.bodyPart === 'all' ? '全身' : sens.bodyPart }}敏感度 {{ sens.modifier > 0 ? '+' : ''
                }}{{ sens.modifier }}%
              </span>
            </div>

            <!-- 选中标记 -->
            <div v-if="data.initialPassiveSkills.includes(constitution.id)" class="absolute top-2 right-2">
              <i class="fas fa-check-circle text-secondary"></i>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ConstitutionRarity, getConstitutionsForGender } from '../data/constitutions';
import { DamageSource, SkillRarity, STARTER_SKILLS } from '../data/skills';
import { getIconClass } from '../icon-helper';
import { CharacterData, Gender } from '../types';

const props = defineProps<{
  data: CharacterData;
  isLifeSimMode?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update-data', fields: Partial<CharacterData>): void;
}>();

const MAX_ACTIVE_SKILLS = 5;
const MAX_PASSIVE_SKILLS = 2;

// 使用新的数据结构
const starterSkills = computed(() => STARTER_SKILLS);

// 获取当前性别可用的体质
const currentConstitutions = computed(() => {
  const genderMap: Record<Gender, string> = {
    [Gender.MALE]: 'male',
    [Gender.FEMALE]: 'female',
    [Gender.OTHER]: 'other',
  };
  return getConstitutionsForGender(genderMap[props.data.gender] || 'other');
});

// 获取技能稀有度样式
const getRarityClass = (rarity: SkillRarity): string => {
  switch (rarity) {
    case SkillRarity.COMMON:
      return 'bg-gray-500/20 text-gray-400';
    case SkillRarity.RARE:
      return 'bg-blue-500/20 text-blue-400';
    case SkillRarity.EPIC:
      return 'bg-purple-500/20 text-purple-400';
    case SkillRarity.LEGENDARY:
      return 'bg-orange-500/20 text-orange-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
};

// 获取体质稀有度样式
const getConstitutionRarityClass = (rarity: ConstitutionRarity): string => {
  switch (rarity) {
    case ConstitutionRarity.COMMON:
      return 'bg-gray-500/20 text-gray-400';
    case ConstitutionRarity.RARE:
      return 'bg-blue-500/20 text-blue-400';
    case ConstitutionRarity.EPIC:
      return 'bg-purple-500/20 text-purple-400';
    case ConstitutionRarity.LEGENDARY:
      return 'bg-orange-500/20 text-orange-400';
    case ConstitutionRarity.MYTHIC:
      return 'bg-pink-500/20 text-pink-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
};

// 获取属性修正标签
const getModifierLabel = (stat: string): string => {
  const map: Record<string, string> = {
    魅力加成: '魅力',
    幸运加成: '幸运',
    基础性斗力加成: '性斗力',
    基础性斗力成算: '性斗力乘算',
    基础忍耐力加成: '忍耐力',
    基础忍耐力成算: '忍耐力乘算',
    闪避率加成: '闪避率',
    暴击率加成: '暴击率',
    最大耐力加成: '最大耐力',
    最大快感加成: '最大快感',
  };
  return map[stat] || stat;
};

// 获取伤害来源名称
const getDamageSourceName = (source: DamageSource): string => {
  switch (source) {
    case DamageSource.SEX_POWER:
      return '性斗力';
    case DamageSource.CHARM:
      return '魅力';
    case DamageSource.LEVEL:
      return '等级';
    case DamageSource.TARGET_LUST:
      return '目标快感';
    case DamageSource.TARGET_MISSING_STAMINA:
      return '目标已损耐力';
    case DamageSource.LUCK:
      return '幸运';
    case DamageSource.POTENTIAL:
      return '潜力';
    case DamageSource.SELF_LUST:
      return '自身快感';
    default:
      return '未知';
  }
};

const toggleActiveSkill = (skillId: string) => {
  const current = [...props.data.initialActiveSkills];
  const index = current.indexOf(skillId);
  if (index >= 0) {
    current.splice(index, 1);
  } else if (current.length < MAX_ACTIVE_SKILLS) {
    current.push(skillId);
  }
  emit('update-data', { initialActiveSkills: current });
};

const toggleConstitution = (constitutionId: string) => {
  const current = [...props.data.initialPassiveSkills];
  const index = current.indexOf(constitutionId);
  if (index >= 0) {
    current.splice(index, 1);
  } else if (current.length < MAX_PASSIVE_SKILLS) {
    current.push(constitutionId);
  }
  emit('update-data', { initialPassiveSkills: current });
};
</script>

<style lang="scss" scoped></style>
