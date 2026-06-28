<template>
  <div class="animate-slide-up space-y-6">
    <!-- Mode Toggle Button (右上角) -->
    <div class="mb-2 flex justify-end">
      <button
        :class="[
          'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-300',
          isLifeSimMode
            ? 'border-purple-500/50 bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/20 hover:bg-purple-500/30'
            : 'border-white/20 bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white',
        ]"
        :title="isLifeSimMode ? '切换到正常模式' : '切换到生活模拟模式'"
        @click="toggleLifeSimMode"
      >
        <i :class="['fas', isLifeSimMode ? 'fa-user-secret' : 'fa-user']"></i>
        <span v-if="isLifeSimMode">生活模拟</span>
        <span v-else>正常模式</span>
      </button>
    </div>

    <!-- 正常模式：角色创建 -->
    <template v-if="!isLifeSimMode">
      <div class="rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-inner shadow-white/5 backdrop-blur-sm">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="flex items-center gap-2 text-sm font-semibold text-white">
              <i class="fas fa-id-card text-secondary"></i>
              人物预设
            </div>
            <div class="mt-1 text-xs text-gray-400">
              {{ playerPresets.length > 0 ? '选择一个保存的人设并填入当前表单。' : '当前角色卡还没有保存的人设。' }}
            </div>
          </div>
          <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
            <div class="relative min-w-0 sm:min-w-[160px]">
              <select
                :value="selectedPlayerPresetName"
                :disabled="playerPresets.length === 0"
                class="focus:ring-secondary/40 w-full appearance-none rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 pr-9 text-sm font-semibold text-white shadow-inner shadow-white/5 backdrop-blur-sm transition-all hover:border-white/25 hover:bg-white/15 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                @change="e => emit('update-selected-player-preset', (e.target as HTMLSelectElement).value)"
              >
                <option v-if="playerPresets.length === 0" value="">暂无预设</option>
                <option v-for="preset in playerPresets" :key="preset.name" :value="preset.name">
                  {{ preset.name }}
                </option>
              </select>
              <i class="fas fa-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-gray-300"></i>
            </div>
            <button
              type="button"
              class="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-white/10 transition-all hover:scale-[1.02] hover:shadow-white/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="playerPresets.length === 0"
              @click="emit('load-player-preset')"
            >
              <i class="fas fa-download"></i> 载入预设
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <!-- Name Input -->
        <div class="group relative">
          <label class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
            <i class="fas fa-user text-secondary"></i> 姓名
          </label>
          <input
            type="text"
            :value="data.name"
            class="focus:ring-secondary/50 focus:border-transparent focus:ring-2 focus:outline-none w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-all duration-300"
            placeholder="输入你的角色名..."
            @input="e => updateData({ name: (e.target as HTMLInputElement).value })"
          />
        </div>

        <!-- Age Input -->
        <div class="group relative">
          <label class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
            <i class="fas fa-graduation-cap text-secondary"></i> 年龄
          </label>
          <input
            type="number"
            min="15"
            max="25"
            :value="data.age"
            class="focus:ring-secondary/50 focus:ring-2 focus:outline-none w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white backdrop-blur-sm transition-all"
            @input="e => updateData({ age: parseInt((e.target as HTMLInputElement).value) || 16 })"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <!-- Gender Selection -->
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-300">性别</label>
          <div class="flex rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
            <button
              v-for="g in Object.values(Gender)"
              :key="g"
              :class="[
                'flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-300',
                data.gender === g
                  ? 'bg-secondary text-white shadow-lg shadow-pink-500/30'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white',
              ]"
              @click="handleGenderChange(g as Gender)"
            >
              {{ g }}
            </button>
          </div>
        </div>

        <!-- Difficulty Selection -->
        <div>
          <label class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
            <i class="fas fa-exclamation-circle text-red-400"></i> 游戏难度
          </label>
          <select
            :value="data.difficulty"
            :disabled="data.difficulty === Difficulty.CHEATER"
            :class="[
              'w-full appearance-none rounded-xl border bg-white/5 px-4 py-3 text-white backdrop-blur-sm focus:ring-2 focus:ring-red-500/50 focus:outline-none',
              data.difficulty === Difficulty.CHEATER
                ? 'cursor-not-allowed border-yellow-500/50 bg-yellow-500/10 opacity-75'
                : 'cursor-pointer border-white/10',
            ]"
            @change="e => updateData({ difficulty: (e.target as HTMLSelectElement).value as Difficulty })"
          >
            <option
              v-for="d in availableDifficulties"
              :key="d"
              :value="d"
              :class="[
                'bg-slate-900',
                d === Difficulty.MASOCHIST && data.difficulty !== Difficulty.MASOCHIST
                  ? 'text-gray-500 opacity-40'
                  : 'text-white',
              ]"
            >
              {{ getDifficultyDisplayName(d) }}
            </option>
          </select>
          <div
            v-if="data.difficulty === Difficulty.MASOCHIST"
            class="mt-2 flex items-center gap-1 text-xs text-pink-400"
          >
            <i class="fas fa-lock"></i> 已选择抖M特化难度
          </div>
          <p v-if="data.difficulty === Difficulty.CHEATER" class="mt-2 flex items-center gap-1 text-xs text-yellow-400">
            <i class="fas fa-lock"></i> 作弊模式已激活，难度已锁定
          </p>
        </div>
      </div>

      <!-- Appearance Textarea -->
      <div>
        <label class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
          <i class="fas fa-face-smile text-secondary"></i> 外貌描述
        </label>
        <textarea
          rows="2"
          :value="data.appearance"
          class="focus:ring-secondary/50 focus:ring-2 focus:outline-none w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-all"
          placeholder="例如：银色长发，红瞳，身材娇小，常年围着一条红色围巾..."
          @input="e => updateData({ appearance: (e.target as HTMLTextAreaElement).value })"
        />
      </div>

      <!-- Personality Textarea -->
      <div>
        <label class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
          <i class="fas fa-align-left text-secondary"></i> 性格与背景
        </label>
        <textarea
          rows="3"
          :value="data.personality"
          class="focus:ring-secondary/50 focus:ring-2 focus:outline-none w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-all"
          placeholder="你的性格特点，以及你是如何进入这所学院的..."
          @input="e => updateData({ personality: (e.target as HTMLTextAreaElement).value })"
        />
      </div>
    </template>

    <!-- 生活模拟模式：NPC选择 -->
    <template v-else>
      <NpcCharacterSelect ref="npcSelectRef" @select="handleNpcSelect" />

      <!-- 难度选择（生活模拟模式） -->
      <div v-if="localSelectedNpc" class="mt-4">
        <label class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
          <i class="fas fa-exclamation-circle text-red-400"></i> 游戏难度
        </label>
        <select
          :value="data.difficulty"
          :disabled="data.difficulty === Difficulty.CHEATER"
          :class="[
            'w-full appearance-none rounded-xl border bg-white/5 px-4 py-3 text-white backdrop-blur-sm focus:ring-2 focus:ring-purple-500/50 focus:outline-none',
            data.difficulty === Difficulty.CHEATER
              ? 'cursor-not-allowed border-yellow-500/50 bg-yellow-500/10 opacity-75'
              : 'cursor-pointer border-purple-500/30',
          ]"
          @change="e => updateData({ difficulty: (e.target as HTMLSelectElement).value as Difficulty })"
        >
          <option
            v-for="d in availableDifficulties"
            :key="d"
            :value="d"
            :class="[
              'bg-slate-900',
              d === Difficulty.MASOCHIST && data.difficulty !== Difficulty.MASOCHIST
                ? 'text-gray-500 opacity-40'
                : 'text-white',
            ]"
          >
            {{ getDifficultyDisplayName(d) }}
          </option>
        </select>
        <p v-if="data.difficulty === Difficulty.CHEATER" class="mt-2 flex items-center gap-1 text-xs text-yellow-400">
          <i class="fas fa-lock"></i> 作弊模式已激活，难度已锁定
        </p>
      </div>

      <!-- 开局场景输入 -->
      <div v-if="localSelectedNpc" class="mt-4">
        <label class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
          <i class="fas fa-map-marker-alt text-purple-400"></i> 开局场景
        </label>
        <textarea
          v-model="openingScene"
          rows="3"
          class="w-full resize-none rounded-xl border border-purple-500/30 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
          placeholder="描述你的开局场景，例如：正在教室备课/刚从体育馆训练结束..."
        />
      </div>
    </template>

    <div class="mt-2">
      <label class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
        <i class="fas fa-calendar-alt text-secondary"></i> 主线时间线
      </label>
      <select
        :value="data.mainlineTimeline"
        class="focus:ring-secondary/50 focus:ring-2 focus:outline-none w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white backdrop-blur-sm"
        @change="e => updateData({ mainlineTimeline: (e.target as HTMLSelectElement).value as MainlineTimeline })"
      >
        <option
          v-for="timeline in Object.values(MainlineTimeline)"
          :key="timeline"
          :value="timeline"
          class="bg-slate-900 text-white"
        >
          {{ timeline }}
        </option>
      </select>
      <p class="mt-2 text-xs text-gray-400">
        选择“无”时不改动日期；选择主线后会把开局日期设置为该主线触发日前两天。注：会导致之前的剧情无法触发，慎选。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { NpcCharacter } from '../data/npcCharacters';
import type { PlayerPresetSummary } from '../../shared/playerPresetStore';
import { CharacterData, Difficulty, Gender, MainlineTimeline } from '../types';
import NpcCharacterSelect from './NpcCharacterSelect.vue';

const props = defineProps<{
  data: CharacterData;
  isLifeSimUnlocked?: boolean;
  isLifeSimMode?: boolean;
  playerPresets: PlayerPresetSummary[];
  selectedPlayerPresetName?: string;
}>();

const emit = defineEmits<{
  (e: 'update-data', fields: Partial<CharacterData>): void;
  (e: 'update-life-sim-mode', isActive: boolean): void;
  (e: 'select-npc', npc: NpcCharacter | null): void;
  (e: 'request-life-sim-confirm'): void;
  (e: 'load-player-preset'): void;
  (e: 'update-selected-player-preset', name: string): void;
}>();

// 本地状态
const localSelectedNpc = ref<NpcCharacter | null>(null);
const openingScene = ref('');

// 切换模式
const toggleLifeSimMode = () => {
  if (!props.isLifeSimMode) {
    // 切换到生活模拟模式时显示确认弹窗
    emit('request-life-sim-confirm');
  } else {
    // 从生活模拟模式切换回普通模式，直接切换
    emit('update-life-sim-mode', false);
  }
};

// 处理NPC选择
const handleNpcSelect = (npc: NpcCharacter | null) => {
  localSelectedNpc.value = npc;
  emit('select-npc', npc);
  if (npc) {
    // 自动设置角色名为NPC名
    emit('update-data', { name: npc.name });
  }
};

// 监听开局场景变化
watch(openingScene, newScene => {
  emit('update-data', { personality: `[生活模拟模式开局场景]\n${newScene}` });
});

// 过滤难度选项：隐藏"作弊者"，除非当前已经是"作弊者"
const availableDifficulties = computed(() => {
  const allDifficulties = Object.values(Difficulty);
  // 如果当前难度是"作弊者"，则显示所有选项（包括作弊者）
  if (props.data.difficulty === Difficulty.CHEATER) {
    return allDifficulties;
  }
  // 否则隐藏"作弊者"选项
  return allDifficulties.filter(d => d !== Difficulty.CHEATER);
});

// 获取难度的显示名称
const getDifficultyDisplayName = (difficulty: Difficulty): string => {
  if (difficulty === Difficulty.MASOCHIST) {
    // 如果当前已选中"抖M"，显示"抖M特化"
    if (props.data.difficulty === Difficulty.MASOCHIST) {
      return '抖M特化';
    }
    // 否则显示"（隐藏条目）"
    return '（隐藏条目）';
  }
  return difficulty;
};

const updateData = (fields: Partial<CharacterData>) => {
  emit('update-data', fields);
};

const handleGenderChange = (gender: Gender) => {
  // 切换性别时，同时更新默认的身体配置
  let configFeatures: CharacterData['configFeatures'];

  if (gender === Gender.MALE) {
    // 男性：默认只有男性性征
    configFeatures = {
      hasBreasts: false,
      hasPenis: true,
    };
  } else if (gender === Gender.FEMALE) {
    // 女性：默认只有女性性征
    configFeatures = {
      hasBreasts: true,
      hasPenis: false,
    };
  } else {
    // 非二元：默认两种性征都可用，之后在角色类型页中自行勾选
    configFeatures = {
      hasBreasts: true,
      hasPenis: true,
    };
  }

  updateData({
    gender,
    archetypeId: null,
    configFeatures,
    // 清除性器特征（因为性别改变了）
    maleGenitalType: undefined,
    femaleGenitalType: undefined,
  });
};

// 暴露给父组件
defineExpose({
  localSelectedNpc,
  openingScene,
});
</script>

<style lang="scss" scoped>
// 让隐藏条目更不起眼
select option.text-gray-500 {
  color: rgba(156, 163, 175, 0.3) !important;
  font-size: 0.85em;
  font-style: italic;
}
</style>
