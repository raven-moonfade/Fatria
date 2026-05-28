<template>
  <div
    class="combat-log"
    :class="{
      'log-expanded': isExpanded,
      'log-with-preview': showPreview,
      'log-side': dock === 'side',
    }"
  >
    <!-- 头部切换栏 -->
    <div class="log-header" @click="isExpanded = !isExpanded">
      <div class="log-title">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>战斗日志</span>
      </div>
      <div class="log-toggle">
        <svg
          v-if="isExpanded"
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="m18 15-6-6-6 6" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>

    <!-- 折叠时显示最新日志 -->
    <div v-if="showPreview && !isExpanded && logs.length > 0" class="log-preview">
      <span class="log-turn">[{{ logs[logs.length - 1].turn }}]</span>
      {{ logs[logs.length - 1].message }}
    </div>

    <!-- 展开的日志列表 -->
    <div class="log-content" :class="{ 'log-hidden': !isExpanded }">
      <p v-if="logs.length === 0" class="log-empty">战斗即将开始...</p>
      <div
        v-for="log in logs"
        :key="log.id"
        class="log-entry"
        :class="{
          'log-critical': log.type === 'critical',
          'log-damage': log.type === 'damage',
          'log-heal': log.type === 'heal',
          'log-info': log.type === 'info',
          'log-buff': log.type === 'buff',
        }"
      >
        <span class="log-turn">[{{ log.turn }}]</span>
        {{ log.message }}
      </div>
      <div ref="bottomRef"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import type { CombatLogEntry } from '../types';

const props = withDefaults(
  defineProps<{
    logs: CombatLogEntry[];
    defaultExpanded?: boolean;
    showPreview?: boolean;
    dock?: 'block' | 'side';
  }>(),
  {
    defaultExpanded: true,
    showPreview: true,
    dock: 'block',
  },
);

const isExpanded = ref(props.defaultExpanded);
const bottomRef = ref<HTMLDivElement | null>(null);

// 自动滚动到底部
watch(
  () => props.logs.length,
  () => {
    if (isExpanded.value) {
      nextTick(() => {
        bottomRef.value?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  },
);
</script>

<style lang="scss" scoped>
.combat-log {
  position: relative;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
  height: 2.25rem;

  &.log-with-preview:not(.log-expanded) {
    height: 3rem;
  }

  &.log-expanded {
    height: 12rem;
  }
}

.log-side {
  width: 2.75rem;
  height: 9.5rem;
  border-right: 0;
  border-radius: 0.75rem 0 0 0.75rem;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(12, 12, 16, 0.9)),
    radial-gradient(circle at 0 20%, rgba(125, 211, 252, 0.18), transparent 45%);
  box-shadow:
    -12px 16px 36px rgba(0, 0, 0, 0.45),
    inset 1px 0 0 rgba(255, 255, 255, 0.08);
  transition:
    width 0.26s ease,
    height 0.26s ease,
    box-shadow 0.26s ease,
    background 0.26s ease;

  &.log-expanded {
    width: min(26rem, calc(100vw - 4rem));
    height: 16rem;
    border-radius: 0.75rem 0 0 0.75rem;
    background: rgba(8, 11, 18, 0.92);
  }

  &:not(.log-expanded) {
    .log-header {
      inset: 0;
      width: 100%;
      height: 100%;
      flex-direction: column;
      justify-content: center;
      gap: 0.55rem;
      padding: 0.65rem 0.4rem;
      background: linear-gradient(180deg, rgba(56, 189, 248, 0.14), rgba(168, 85, 247, 0.14));
    }

    .log-title {
      flex-direction: column;
      gap: 0.45rem;
      writing-mode: vertical-rl;
      text-orientation: mixed;

      svg {
        transform: rotate(90deg);
      }

      span {
        letter-spacing: 0;
      }
    }

    .log-toggle {
      opacity: 0.7;
      transform: rotate(90deg);
    }

    .log-content {
      visibility: hidden;
    }
  }

  &.log-expanded {
    .log-header {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 2.35rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: linear-gradient(90deg, rgba(56, 189, 248, 0.12), rgba(168, 85, 247, 0.12));
    }

    .log-content {
      padding-top: 2.85rem;
    }
  }
}

.log-header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2rem;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.75rem;
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

.log-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0;
}

.log-toggle {
  color: #94a3b8;
}

.log-preview {
  position: absolute;
  top: 2rem;
  left: 1rem;
  right: 1rem;
  font-size: 0.875rem;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-content {
  padding-top: 2.5rem;
  padding-bottom: 0.5rem;
  padding-left: 1rem;
  padding-right: 1rem;
  height: 100%;
  overflow-y: auto;

  &.log-hidden {
    visibility: hidden;
  }
}

.log-empty {
  color: #64748b;
  text-align: center;
  font-style: italic;
  margin-top: 2.5rem;
}

.log-entry {
  animation: slideUp 0.2s ease;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  font-family: ui-monospace, monospace;

  &:last-of-type {
    border-bottom: none;
  }
}

.log-turn {
  opacity: 0.5;
  font-size: 0.75rem;
  margin-right: 0.5rem;
}

.log-critical {
  color: #facc15;
  font-weight: 700;
}

.log-damage {
  color: #fca5a5;
}

.log-heal {
  color: #86efac;
}

.log-info {
  color: #cbd5e1;
}

.log-buff {
  color: #fbbf24;
  font-weight: 700;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
