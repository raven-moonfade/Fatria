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

      <!-- Background Textarea -->
      <div>
        <label class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
          <i class="fas fa-align-left text-secondary"></i> 背景
        </label>
        <textarea
          :rows="data.personality.length > 260 ? 8 : 3"
          :value="data.personality"
          class="focus:ring-secondary/50 focus:ring-2 focus:outline-none w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-all"
          placeholder="你是如何进入这所学院的？过去发生过什么、现在被什么关系或处境牵动..."
          @input="e => updateData({ personality: (e.target as HTMLTextAreaElement).value })"
        />
        <div class="mt-3">
          <label class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
            <i class="fas fa-palette text-secondary"></i> 用户信息概述
          </label>
          <textarea
            :rows="data.palettePersonaOverview.length > 220 ? 6 : 3"
            :value="data.palettePersonaOverview"
            class="focus:ring-secondary/50 focus:ring-2 focus:outline-none w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-all"
            :placeholder="paletteOverviewPrompt"
            @input="e => updateData({ palettePersonaOverview: (e.target as HTMLTextAreaElement).value })"
          />
          <div class="mt-2 space-y-1 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs leading-relaxed text-gray-400">
            <p>写一两句就够，不用写完整人设。</p>
            <p>不抢话：写容易被误读的动作或语气。例：我沉默是在想措辞；说“过来/别动”通常是关心；拉手是着急挽留，不是控制。</p>
            <p>抢话：会生成简化用户调色盘，让 AI 能续写 user 的口吻和行为，但仍限制重大决定。</p>
          </div>
        </div>
        <div class="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-inner shadow-white/5 backdrop-blur-sm">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <div class="flex items-center gap-2 text-sm font-semibold text-white">
                <i class="fas fa-wand-magic-sparkles text-secondary"></i>
                一键生成用户信息
              </div>
            </div>
            <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                class="flex items-center justify-center gap-2 rounded-xl border border-secondary/40 bg-secondary/20 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-500/10 transition-all hover:scale-[1.02] hover:bg-secondary/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isGeneratingPalettePersona"
                @click="handleGeneratePalettePersona('ai_reads_user')"
              >
                <i
                  :class="[
                    'fas',
                    isGeneratingPalettePersona && generatingUserInfoMode === 'ai_reads_user'
                      ? 'fa-spinner fa-spin'
                      : 'fa-user-shield',
                  ]"
                ></i>
                {{
                  isGeneratingPalettePersona && generatingUserInfoMode === 'ai_reads_user'
                    ? '生成中...'
                    : '生成不抢话'
                }}
              </button>
              <button
                type="button"
                class="flex items-center justify-center gap-2 rounded-xl border border-amber-300/40 bg-amber-400/15 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.02] hover:bg-amber-400/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isGeneratingPalettePersona"
                @click="handleGeneratePalettePersona('ai_plays_user')"
              >
                <i
                  :class="[
                    'fas',
                    isGeneratingPalettePersona && generatingUserInfoMode === 'ai_plays_user'
                      ? 'fa-spinner fa-spin'
                      : 'fa-comments',
                  ]"
                ></i>
                {{
                  isGeneratingPalettePersona && generatingUserInfoMode === 'ai_plays_user'
                    ? '生成中...'
                    : '生成抢话'
                }}
              </button>
            </div>
          </div>
          <p class="mt-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs leading-relaxed text-gray-400">
            不抢话：你自己写 user 的话和动作，AI 只理解含义，不生成调色盘。抢话：AI 会生成简化用户调色盘，用来续写 user 的口吻和行为，但不能替 user 做重大决定。
          </p>
          <p
            v-if="palettePersonaMessage"
            :class="[
              'mt-3 rounded-xl border px-3 py-2 text-xs leading-relaxed',
              palettePersonaMessageType === 'error'
                ? 'border-red-400/30 bg-red-500/10 text-red-200'
                : 'border-green-400/30 bg-green-500/10 text-green-200',
            ]"
          >
            {{ palettePersonaMessage }}
          </p>
          <div v-if="isGeneratingPalettePersona || palettePersonaDisplayText.trim()" class="mt-4">
            <label class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
              <i class="fas fa-palette text-secondary"></i> 用户信息内容
            </label>
            <div
              ref="palettePersonaPreviewRef"
              class="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-gray-100 shadow-inner shadow-white/5 backdrop-blur-sm"
            >
              {{ palettePersonaDisplayText }}
            </div>
            <div class="mt-4 rounded-xl border border-white/10 bg-black/15 px-4 py-3">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 text-sm font-semibold text-white">
                    <i class="fas fa-user-gear text-secondary"></i>
                    创建酒馆用户人设
                  </div>
                  <p class="mt-1 text-xs leading-relaxed text-gray-400">
                    将当前姓名、年龄、性别、外貌、背景和用户信息写入酒馆用户设定；成功后不再写入世界书 user 条目。
                  </p>
                </div>
                <button
                  type="button"
                  class="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400/15 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/10 transition-all hover:scale-[1.02] hover:bg-cyan-400/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isGeneratingPalettePersona || isCreatingUserPersona || !data.name.trim() || !data.palettePersona.trim()"
                  @click="emit('create-user-persona')"
                >
                  <i :class="['fas', isCreatingUserPersona ? 'fa-spinner fa-spin' : 'fa-user-plus']"></i>
                  {{ isCreatingUserPersona ? '写入中...' : isUsingTavernUserPersona ? '重新写入用户人设' : '创建用户人设' }}
                </button>
              </div>
              <p
                v-if="userPersonaMessage"
                :class="[
                  'mt-3 rounded-xl border px-3 py-2 text-xs leading-relaxed',
                  userPersonaMessageType === 'error'
                    ? 'border-red-400/30 bg-red-500/10 text-red-200'
                    : userPersonaMessageType === 'warning'
                      ? 'border-yellow-400/30 bg-yellow-500/10 text-yellow-100'
                      : 'border-green-400/30 bg-green-500/10 text-green-200',
                ]"
              >
                {{ userPersonaMessage }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Opening Scene Outline Textarea -->
      <div>
        <label class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
          <i class="fas fa-map-marker-alt text-secondary"></i> 开局情景大纲
        </label>
        <textarea
          :rows="(data.openingSceneOutline || '').length > 220 ? 6 : 3"
          :value="data.openingSceneOutline || ''"
          class="focus:ring-secondary/50 focus:ring-2 focus:outline-none w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-all"
          placeholder="描述开局时你会处在什么场景：例如刚到学园门口、深夜留在训练馆、被老师叫去办公室..."
          @input="e => updateData({ openingSceneOutline: (e.target as HTMLTextAreaElement).value })"
        />
        <p class="mt-2 text-xs leading-relaxed text-gray-400">
          可选。这里只决定开局时的场景大纲，不会阻拦下一步，也不会写进用户信息。
        </p>
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
          <i class="fas fa-map-marker-alt text-purple-400"></i> 开局情景大纲
        </label>
        <textarea
          :value="data.openingSceneOutline || ''"
          rows="3"
          class="w-full resize-none rounded-xl border border-purple-500/30 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
          placeholder="描述你的开局场景，例如：正在教室备课/刚从体育馆训练结束..."
          @input="e => updateData({ openingSceneOutline: (e.target as HTMLTextAreaElement).value })"
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
import { computed, nextTick, ref, watch } from 'vue';
import type { NpcCharacter } from '../data/npcCharacters';
import type { PlayerPresetSummary } from '../../shared/playerPresetStore';
import { CharacterData, Difficulty, Gender, MainlineTimeline } from '../types';
import { generatePalettePersona, type UserInfoGenerationMode } from '../utils/palettePersonaGenerator';
import NpcCharacterSelect from './NpcCharacterSelect.vue';

const props = defineProps<{
  data: CharacterData;
  isLifeSimUnlocked?: boolean;
  isLifeSimMode?: boolean;
  playerPresets: PlayerPresetSummary[];
  selectedPlayerPresetName?: string;
  isCreatingUserPersona?: boolean;
  userPersonaMessage?: string;
  userPersonaMessageType?: 'success' | 'warning' | 'error';
  isUsingTavernUserPersona?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update-data', fields: Partial<CharacterData>): void;
  (e: 'update-life-sim-mode', isActive: boolean): void;
  (e: 'select-npc', npc: NpcCharacter | null): void;
  (e: 'request-life-sim-confirm'): void;
  (e: 'load-player-preset'): void;
  (e: 'update-selected-player-preset', name: string): void;
  (e: 'create-user-persona'): void;
}>();

// 本地状态
const localSelectedNpc = ref<NpcCharacter | null>(null);
const isGeneratingPalettePersona = ref(false);
const generatingUserInfoMode = ref<UserInfoGenerationMode | null>(null);
const palettePersonaMessage = ref('');
const palettePersonaMessageType = ref<'success' | 'error'>('success');
const streamingPalettePersonaPreview = ref('');
const palettePersonaPreviewRef = ref<HTMLElement | null>(null);
const paletteOverviewPrompt =
  '例：我沉默是在想措辞；拉手是着急挽留不是控制；熟了会吐槽，紧张会话多；发色/身高别每段重复写。';

const palettePersonaDisplayText = computed(() => {
  if (isGeneratingPalettePersona.value) {
    return streamingPalettePersonaPreview.value || '等待主 API 返回用户信息正文...';
  }
  return props.data.palettePersona;
});

watch(streamingPalettePersonaPreview, async () => {
  if (!isGeneratingPalettePersona.value) return;
  await nextTick();
  if (palettePersonaPreviewRef.value) {
    palettePersonaPreviewRef.value.scrollTop = palettePersonaPreviewRef.value.scrollHeight;
  }
});

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

const handleGeneratePalettePersona = async (mode: UserInfoGenerationMode) => {
  if (isGeneratingPalettePersona.value) return;
  isGeneratingPalettePersona.value = true;
  generatingUserInfoMode.value = mode;
  palettePersonaMessage.value = '';
  palettePersonaMessageType.value = 'success';
  streamingPalettePersonaPreview.value = '';

  try {
    const generatedPersona = await generatePalettePersona(props.data, {
      mode,
      onStream: fullText => {
        if (fullText.trim()) {
          streamingPalettePersonaPreview.value = fullText;
        }
      },
    });
    streamingPalettePersonaPreview.value = generatedPersona.palette;
    updateData({
      palettePersona: generatedPersona.palette,
    });
    await nextTick();
    palettePersonaMessage.value =
      mode === 'ai_plays_user' ? '抢话用户信息已生成。' : '不抢话用户信息已生成。';
  } catch (error) {
    console.error('[性斗学园开局] 一键生成用户信息失败:', error);
    palettePersonaMessageType.value = 'error';
    palettePersonaMessage.value = error instanceof Error ? error.message : '生成失败，请稍后重试。';
  } finally {
    isGeneratingPalettePersona.value = false;
    generatingUserInfoMode.value = null;
  }
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
