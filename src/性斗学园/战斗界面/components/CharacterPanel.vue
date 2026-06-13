<template>
  <div class="character-panel" :class="{ 'is-enemy': isEnemy }">
    <div class="panel-inner">
      <!-- 角色名 -->
      <div class="character-name">{{ character.name }}</div>

      <!-- 头像与悬停属性 -->
      <div class="avatar-container">
        <div class="avatar-glow" :class="isEnemy ? 'glow-enemy' : 'glow-player'"></div>

        <img
          :src="character.avatarUrl"
          :alt="character.name"
          class="avatar-image"
          :class="{
            'avatar-enemy': isEnemy,
            'avatar-player': !isEnemy,
            'avatar-pulse': turnState.phase === 'processing' && !isEnemy,
            'avatar-scale': turnState.phase === 'enemyAction' && isEnemy,
            'avatar-climax':
              turnState.phase === 'climaxResolution' && turnState.climaxTarget === (isEnemy ? 'enemy' : 'player'),
          }"
          @error="handleImageError"
        />

        <!-- 移动端预告图标 -->
        <div v-if="isEnemy && turnState.phase === 'playerInput' && enemyIntention" class="mobile-warning">
          <span>!</span>
        </div>

        <!-- 属性悬停面板 -->
        <div class="stats-overlay">
          <div class="overlay-title">详细属性</div>
          <StatsPanel :stats="character.stats" :status-effects="character.statusEffects" compact />
        </div>
      </div>

      <!-- 状态条 -->
      <div class="bars-container">
        <div class="resource-bar-slot">
          <ProgressBar
            :value="character.stats.currentEndurance"
            :max="character.stats.maxEndurance"
            color="green"
            label="体力"
            :show-value="true"
            :icon="activityIcon"
          />
          <span
            v-for="popup in staminaPopups"
            :key="popup.id"
            class="resource-popup stamina"
            :class="popup.delta > 0 ? 'gain' : 'loss'"
            :style="{
              '--popup-offset': `${popup.offset}px`,
              '--popup-delay': `${popup.delay}ms`,
            }"
            aria-hidden="true"
          >
            {{ popup.delta > 0 ? '+' : '' }}{{ popup.delta }}
          </span>
        </div>
        <div class="resource-bar-slot">
          <ProgressBar
            :value="character.stats.currentPleasure"
            :max="character.stats.maxPleasure"
            color="pink"
            label="快感"
            :show-value="true"
            :icon="heartIcon"
          />
          <span
            v-for="popup in pleasurePopups"
            :key="popup.id"
            class="resource-popup pleasure"
            :class="popup.delta > 0 ? 'gain' : 'loss'"
            :style="{
              '--popup-offset': `${popup.offset}px`,
              '--popup-delay': `${popup.delay}ms`,
            }"
            aria-hidden="true"
          >
            {{ popup.delta > 0 ? '+' : '' }}{{ popup.delta }}
          </span>
        </div>
        <div class="climax-bar">
          <ProgressBar
            :value="character.stats.climaxCount"
            :max="character.stats.maxClimaxCount"
            color="purple"
            label="高潮"
            :show-value="true"
            :icon="zapIcon"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getRandomImageUrl } from '../constants';
import type { Character, Skill, TurnState } from '../types';
import ProgressBar from './ProgressBar.vue';
import StatsPanel from './StatsPanel.vue';

interface ResourcePopup {
  id: number;
  resource: 'stamina' | 'pleasure';
  delta: number;
  delay: number;
  offset: number;
}

const props = defineProps<{
  character: Character;
  isEnemy: boolean;
  turnState: TurnState;
  enemyIntention: Skill | null;
  resourcePopups?: ResourcePopup[];
}>();

const staminaPopups = computed(() => (props.resourcePopups ?? []).filter(popup => popup.resource === 'stamina'));
const pleasurePopups = computed(() => (props.resourcePopups ?? []).filter(popup => popup.resource === 'pleasure'));

// 图片加载失败标记
const imageLoadError = ref(false);

// 处理图片加载失败
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  if (imageLoadError.value) return; // 避免无限循环

  imageLoadError.value = true;

  // 降级使用随机图片
  img.src = getRandomImageUrl();
};

// 图标SVG
const activityIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
const heartIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>`;
const zapIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
</script>

<style lang="scss" scoped>
.character-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  max-width: 45%;
  transition: all 0.3s ease;
}

@media (min-width: 1024px) {
  .character-panel {
    max-width: 24rem;
  }
}

.panel-inner {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.character-name {
  font-size: 0.875rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.75rem;
  text-align: center;
  word-break: break-word;
  line-height: 1.2;
  max-width: 100%;

  // 小屏手机（<375px）
  @media (max-width: 374px) {
    font-size: 0.75rem;
  }

  // 中等手机（375px-640px）
  @media (min-width: 375px) and (max-width: 640px) {
    font-size: 0.875rem;
  }

  // 平板（641px-1023px）
  @media (min-width: 641px) and (max-width: 1023px) {
    font-size: 1rem;
  }

  // 桌面（>=1024px）
  @media (min-width: 1024px) {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }
}

// ========== 名称标签 ==========
.name-badge {
  margin-bottom: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 20;
  max-width: 100%;
  position: relative;

  @media (min-width: 1024px) {
    padding: 0.35rem 1rem;
  }
}

.badge-player {
  background: rgba(6, 78, 59, 0.6);
  color: #a5f3fc;
}

.badge-enemy {
  background: rgba(76, 5, 25, 0.6);
  color: #fecdd3;
}

.name-text {
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (min-width: 1024px) {
    font-size: 1rem;
  }
}

.intention-hint {
  display: none;
  position: absolute;
  top: -2rem;
  right: 0;
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.5);
  color: #fef08a;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  animation: pulse 2s ease-in-out infinite;
  align-items: center;
  white-space: nowrap;

  @media (min-width: 1024px) {
    display: flex;
  }
}

.intention-icon {
  margin-right: 0.25rem;
}

// ========== 头像 ==========
.avatar-container {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3; // 匹配 832x1216 比例
  max-width: 180px;
  margin-bottom: 0.5rem;

  @media (min-width: 1024px) {
    max-width: 260px;
    margin-bottom: 0.9rem;
  }

  @media (min-width: 1024px) and (min-height: 900px) {
    max-width: 300px;
  }

  &:hover {
    .avatar-glow {
      opacity: 0.4;
    }

    .avatar-image {
      filter: brightness(0.5) blur(2px);
    }

    .stats-overlay {
      opacity: 1;
    }
  }
}

.avatar-glow {
  position: absolute;
  inset: 0;
  border-radius: 1rem;
  filter: blur(30px);
  opacity: 0.2;
  transition: opacity 0.7s ease;

  @media (min-width: 1024px) {
    filter: blur(48px);
  }
}

.glow-player {
  background: #06b6d4;
}

.glow-enemy {
  background: #f43f5e;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.75rem;
  border: 2px solid;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  z-index: 10;
  position: relative;
  transition: all 0.3s ease;

  @media (min-width: 1024px) {
    border-radius: 1rem;
  }
}

.avatar-player {
  border-color: rgba(6, 182, 212, 0.3);
}

.avatar-enemy {
  border-color: rgba(244, 63, 94, 0.3);
}

.avatar-pulse {
  animation: pulse 1s ease-in-out infinite;
}

.avatar-scale {
  transform: scale(1.05);
}

.avatar-climax {
  filter: brightness(1.25) saturate(2);
  animation: pulse 0.5s ease-in-out infinite;
}

.mobile-warning {
  display: block;
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  z-index: 30;
  background: #eab308;
  color: black;
  border-radius: 50%;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 1s ease-in-out infinite;
  border: 2px solid #fef08a;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);

  span {
    font-size: 0.625rem;
    font-weight: 700;
  }

  @media (min-width: 1024px) {
    display: none;
  }
}

.stats-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.3s ease;
  padding: 5%;
  border-radius: 1rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);

  // 让内容随容器缩放
  font-size: clamp(0.5rem, 2vw, 0.875rem);
}

.overlay-title {
  font-size: 1em;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.5em;
  font-weight: 700;
}

// ========== 状态条 ==========
.bars-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0;

  @media (min-width: 1024px) {
    gap: 0.5rem;
    padding: 0 1rem;
  }
}

.resource-bar-slot {
  position: relative;
  width: 100%;
}

.resource-popup {
  position: absolute;
  left: 50%;
  bottom: 0.45rem;
  z-index: 8;
  pointer-events: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1.1rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0;
  opacity: 0;
  transform: translate(calc(-50% + var(--popup-offset)), 8px) scale(0.72);
  animation: resource-popup-bounce 1.2s cubic-bezier(0.16, 1, 0.3, 1) var(--popup-delay) forwards;
  will-change: transform, opacity;

  &.stamina {
    color: #86efac;
    text-shadow:
      0 0 5px rgba(22, 163, 74, 0.95),
      0 0 14px rgba(34, 197, 94, 0.75),
      0 1px 2px rgba(0, 0, 0, 0.9);
  }

  &.pleasure {
    color: #fb7185;
    text-shadow:
      0 0 5px rgba(225, 29, 72, 0.95),
      0 0 14px rgba(244, 63, 94, 0.78),
      0 1px 2px rgba(0, 0, 0, 0.9);
  }
}

.climax-bar {
  width: 100%;
  display: flex;
  gap: 0.5rem;
}

@keyframes resource-popup-bounce {
  0% {
    opacity: 0;
    transform: translate(calc(-50% + var(--popup-offset)), 8px) scale(0.72);
  }
  18% {
    opacity: 1;
    transform: translate(calc(-50% + var(--popup-offset)), -9px) scale(1.18);
  }
  38% {
    opacity: 1;
    transform: translate(calc(-50% + var(--popup-offset)), -3px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--popup-offset)), -46px) scale(0.88);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
</style>
