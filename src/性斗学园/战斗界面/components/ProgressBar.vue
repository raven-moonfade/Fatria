<template>
  <div class="progress-container">
    <div class="progress-header">
      <span class="progress-label">
        <span v-if="icon" class="progress-icon" v-html="icon"></span>
        {{ label }}
      </span>
      <span v-if="showValue" class="progress-value">{{ value }} / {{ max }}</span>
    </div>
    <div class="progress-track" :class="`track-${color}`">
      <div class="progress-fill" :class="`fill-${color}`" :style="{ width: `${percentage}%` }">
        <div class="shimmer"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    value: number;
    max: number;
    color: 'blue' | 'red' | 'purple' | 'green' | 'pink';
    label?: string;
    showValue?: boolean;
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
  }>(),
  {
    label: '',
    showValue: true,
    size: 'md',
    icon: '',
  },
);

const percentage = computed(() => {
  return Math.min(Math.max((props.value / props.max) * 100, 0), 100);
});
</script>

<style lang="scss" scoped>
.progress-container {
  width: 100%;
  margin-bottom: 0.55rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: #cbd5e1;
}

.progress-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-icon {
  opacity: 0.8;
  display: flex;
  align-items: center;

  :deep(svg) {
    width: 12px;
    height: 12px;
  }
}

.progress-value {
  font-family: ui-monospace, monospace;
  color: rgba(255, 255, 255, 0.8);
}

.progress-track {
  width: 100%;
  border-radius: 9999px;
  overflow: hidden;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  height: 0.5rem;

  &.track-blue {
    background-color: rgba(30, 64, 175, 0.4);
  }
  &.track-red {
    background-color: rgba(127, 29, 29, 0.4);
  }
  &.track-purple {
    background-color: rgba(88, 28, 135, 0.4);
  }
  &.track-green {
    background-color: rgba(20, 83, 45, 0.4);
  }
  &.track-pink {
    background-color: rgba(157, 23, 77, 0.4);
  }
}

.progress-fill {
  height: 100%;
  transition: all 0.7s ease-out;
  position: relative;

  &.fill-blue {
    background: linear-gradient(to right, #06b6d4, #2563eb);
    box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
  }
  &.fill-red {
    background: linear-gradient(to right, #f43f5e, #dc2626);
    box-shadow: 0 0 10px rgba(225, 29, 72, 0.5);
  }
  &.fill-purple {
    background: linear-gradient(to right, #8b5cf6, #9333ea);
    box-shadow: 0 0 10px rgba(124, 58, 237, 0.5);
  }
  &.fill-green {
    background: linear-gradient(to right, #34d399, #16a34a);
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
  }
  &.fill-pink {
    background: linear-gradient(to right, #f472b6, #fb7185);
    box-shadow: 0 0 10px rgba(244, 114, 182, 0.5);
  }
}

.shimmer {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.2);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
