<template>
  <div class="dashboard-page">
    <!-- 顶部信息栏 -->
    <div class="top-row">
      <!-- 日期卡片 -->
      <div class="date-card">
        <div class="card-icon">
          <i class="fas fa-calendar-day"></i>
        </div>
        <div class="card-content">
          <div class="card-label">日期</div>
          <div class="card-value">{{ timeData.日期 || '' }}</div>
          <div class="card-sub">{{ weekdayText(timeData.星期) }}</div>
        </div>
      </div>

      <!-- 位置卡片 -->
      <div class="location-card">
        <div class="card-icon">
          <i class="fas fa-map-marker-alt"></i>
        </div>
        <div class="card-content">
          <div class="card-label">位置</div>
          <div class="card-value">{{ locationData.地点名称 || '未知地点' }}</div>
          <div class="card-sub">{{ locationData.楼层 || 1 }}F {{ locationData.坐标 || '[?]' }}</div>
        </div>
      </div>

      <!-- 金币卡片 -->
      <div class="coins-card">
        <div class="card-icon">
          <i class="fas fa-coins"></i>
        </div>
        <div class="card-content">
          <div class="card-label">金币</div>
          <div class="card-value gold">{{ formatNumber(characterData.物品系统?.学园金币 || 0) }}</div>
        </div>
      </div>
    </div>

    <!-- 角色状态卡片 -->
    <div class="character-card">
      <div class="character-header">
        <div class="character-info">
          <div class="character-level">Lv.{{ characterData.角色基础?._等级 || 1 }}</div>
          <div class="character-rank">{{ characterData.角色基础?._段位 || '无段位' }}</div>
        </div>
        <div class="combat-stats">
          <div class="stat-item">
            <i class="fas fa-fire"></i>
            <span>{{ derivedStats.sexPower }}</span>
          </div>
          <div class="stat-item">
            <i class="fas fa-shield-halved"></i>
            <span>{{ derivedStats.endurance }}</span>
          </div>
        </div>
      </div>

      <!-- 状态条 -->
      <div class="status-bars">
        <div class="bar-item">
          <div class="bar-header">
            <i class="fas fa-bolt stamina-icon"></i>
            <span class="bar-label">耐力</span>
            <span class="bar-value"
              >{{ characterData.核心状态?.$耐力 || 0 }}/{{ characterData.核心状态?.$最大耐力 || 100 }}</span
            >
          </div>
          <div class="bar-track">
            <div
              class="bar-fill stamina"
              :style="{
                width: `${getPercentage(characterData.核心状态?.$耐力 || 0, characterData.核心状态?.$最大耐力 || 100)}%`,
              }"
            ></div>
          </div>
        </div>

        <div class="bar-item">
          <div class="bar-header">
            <i class="fas fa-heart-pulse lust-icon"></i>
            <span class="bar-label">快感</span>
            <span class="bar-value"
              >{{ characterData.核心状态?.$快感 || 0 }}/{{ characterData.核心状态?.$最大快感 || 100 }}</span
            >
          </div>
          <div class="bar-track">
            <div
              class="bar-fill lust"
              :style="{
                width: `${getPercentage(characterData.核心状态?.$快感 || 0, characterData.核心状态?.$最大快感 || 100)}%`,
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷属性 -->
    <div class="quick-stats">
      <div class="quick-stat">
        <span class="qs-label">魅力</span>
        <span class="qs-value charm">{{ derivedStats.charm }}</span>
      </div>
      <div class="quick-stat">
        <span class="qs-label">幸运</span>
        <span class="qs-value luck">{{ derivedStats.luck }}</span>
      </div>
      <div class="quick-stat">
        <span class="qs-label">闪避</span>
        <span class="qs-value dodge">{{ derivedStats.evasion }}%</span>
      </div>
      <div class="quick-stat">
        <span class="qs-label">暴击</span>
        <span class="qs-value crit">{{ derivedStats.crit }}%</span>
      </div>
    </div>

    <!-- 当前任务 -->
    <div class="quest-card" v-if="mainQuest && mainQuest.名称">
      <div class="quest-header">
        <i class="fas fa-scroll"></i>
        <span>当前任务</span>
      </div>
      <div class="quest-content">
        <div class="quest-title">{{ mainQuest.名称 }}</div>
        <div class="quest-desc">{{ mainQuest.描述 || '暂无描述' }}</div>
        <div class="quest-status" :class="mainQuest.状态 === '进行中' ? 'active' : 'done'">
          {{ mainQuest.状态 || '进行中' }}
        </div>
      </div>
    </div>

    <!-- 难度调节 -->
    <div class="difficulty-card">
      <div class="difficulty-header">
        <i class="fas fa-sliders"></i>
        <span>难度调节</span>
      </div>
      <div class="difficulty-content">
        <div class="difficulty-options">
          <button
            v-for="(diff, index) in difficultyOptions"
            :key="diff.value"
            class="difficulty-option"
            :class="{
              active: currentDifficulty === diff.value,
              disabled: isDifficultyLower(diff.value),
            }"
            :style="{ '--difficulty-color': diff.color }"
            @click="selectDifficulty(diff.value, index)"
          >
            <i :class="diff.icon"></i>
            <span>{{ diff.label }}</span>
          </button>
        </div>
        <div class="difficulty-hint">
          <i class="fas fa-info-circle"></i>
          <span>难度一旦提升将无法降低</span>
        </div>
      </div>
    </div>

    <!-- 难度确认弹窗 -->
    <div v-if="showConfirmModal" class="confirm-modal-overlay" @click.self="cancelDifficultyChange">
      <div class="confirm-modal">
        <div class="confirm-modal-header">
          <i class="fas fa-exclamation-triangle"></i>
          <span>确认更改难度</span>
        </div>
        <div class="confirm-modal-body">
          <p>
            你确定要将难度从
            <span class="difficulty-text current">{{ getDifficultyLabel(currentDifficulty) }}</span>
            提升到
            <span class="difficulty-text target" :style="{ color: getTargetDifficultyColor() }">{{
              getDifficultyLabel(pendingDifficulty)
            }}</span>
            吗？
          </p>
          <p class="warning-text">
            <i class="fas fa-warning"></i>
            难度提升后将无法降低！
          </p>
        </div>
        <div class="confirm-modal-actions">
          <button class="cancel-btn" @click="cancelDifficultyChange">取消</button>
          <button class="confirm-btn" @click="confirmDifficultyChange">确认提升</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getLatestMvuData, replaceLatestMvuData } from '../../../shared/mvuStore';
import { getPlayerDerivedStats } from '../../../shared/statSelectors';

const props = defineProps<{
  characterData: any;
}>();

const locationData = computed(() => {
  return props.characterData.位置系统 || {};
});

const timeData = computed(() => {
  return props.characterData.时间系统 || {};
});

const mainQuest = computed(() => {
  return props.characterData.任务系统?.主线任务 || {};
});

const derivedStats = computed(() => getPlayerDerivedStats(props.characterData || {}));

// 难度选项定义
const difficultyOptions = [
  { value: '简单', label: '简单', icon: 'fas fa-feather', color: '#34d399' },
  { value: '普通', label: '普通', icon: 'fas fa-balance-scale', color: '#60a5fa' },
  { value: '困难', label: '困难', icon: 'fas fa-fire', color: '#fbbf24' },
  { value: '抖M', label: '抖M', icon: 'fas fa-skull', color: '#f87171' },
];

// 难度等级映射（用于比较）
const difficultyLevels: Record<string, number> = {
  简单: 0,
  普通: 1,
  困难: 2,
  抖M: 3,
};

// 当前难度
const currentDifficulty = computed(() => {
  return props.characterData.角色基础?.难度 || '普通';
});

// 弹窗状态
const showConfirmModal = ref(false);
const pendingDifficulty = ref<string | null>(null);

// 判断某难度是否比当前难度低（无法选择）
function isDifficultyLower(difficulty: string): boolean {
  const currentLevel = difficultyLevels[currentDifficulty.value] ?? 1;
  const targetLevel = difficultyLevels[difficulty] ?? 1;
  return targetLevel < currentLevel;
}

// 选择难度
function selectDifficulty(difficulty: string, _index: number) {
  // 如果点击的是当前难度，不做任何操作
  if (difficulty === currentDifficulty.value) return;

  // 如果点击的难度比当前低，不做任何操作
  if (isDifficultyLower(difficulty)) return;

  // 显示确认弹窗
  pendingDifficulty.value = difficulty;
  showConfirmModal.value = true;
}

// 确认更改难度
async function confirmDifficultyChange() {
  if (!pendingDifficulty.value) return;

  try {
    const mvuData = await getLatestMvuData();
    if (!mvuData || !mvuData.stat_data) {
      toastr.error('无法获取角色数据');
      return;
    }

    // 更新难度
    if (!mvuData.stat_data.角色基础) {
      mvuData.stat_data.角色基础 = {};
    }
    mvuData.stat_data.角色基础.难度 = pendingDifficulty.value;

    await replaceLatestMvuData(mvuData);

    toastr.success(`难度已提升至 ${pendingDifficulty.value}`, '难度调整');
  } catch (error) {
    console.error('[DashboardPage] 更改难度失败:', error);
    toastr.error('更改难度失败，请重试');
  } finally {
    showConfirmModal.value = false;
    pendingDifficulty.value = null;
  }
}

// 取消更改难度
function cancelDifficultyChange() {
  showConfirmModal.value = false;
  pendingDifficulty.value = null;
}

// 获取难度标签
function getDifficultyLabel(difficulty: string | null): string {
  if (!difficulty) return '';
  const option = difficultyOptions.find(opt => opt.value === difficulty);
  return option?.label || difficulty;
}

// 获取目标难度颜色
function getTargetDifficultyColor(): string {
  if (!pendingDifficulty.value) return '#fff';
  const option = difficultyOptions.find(opt => opt.value === pendingDifficulty.value);
  return option?.color || '#fff';
}

function weekdayText(day: number): string {
  const map = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const idx = Math.min(7, Math.max(1, Number(day || 1))) - 1;
  return map[idx];
}

function getPercentage(current: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(100, Math.max(0, (current / max) * 100));
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}
</script>

<style scoped lang="scss">
.dashboard-page {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  flex: 1;
}

.top-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.date-card,
.location-card,
.coins-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.date-card {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.3), rgba(96, 165, 250, 0.1));

  .card-icon {
    color: #60a5fa;
  }
}

.location-card {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(99, 102, 241, 0.1));

  .card-icon {
    color: #818cf8;
  }
}

.coins-card {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(251, 191, 36, 0.1));

  .card-icon {
    color: #fbbf24;
  }

  .card-value.gold {
    color: #fcd34d;
  }
}

.card-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-value {
  font-size: 16px;
  font-weight: 700;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'JetBrains Mono', monospace;
}

.character-card {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.1));
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.character-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.character-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.character-level {
  font-size: 20px;
  font-weight: 700;
  color: white;
}

.character-rank {
  padding: 4px 10px;
  background: rgba(251, 191, 36, 0.2);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: #fcd34d;
}

.combat-stats {
  display: flex;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 20px;

  i {
    font-size: 12px;

    &.fa-fire {
      color: #f87171;
    }

    &.fa-shield-halved {
      color: #34d399;
    }
  }

  span {
    font-size: 14px;
    font-weight: 600;
    color: white;
    font-family: 'JetBrains Mono', monospace;
  }
}

.status-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;

  i {
    font-size: 12px;
    width: 16px;
    text-align: center;
  }

  .stamina-icon {
    color: #34d399;
  }
  .lust-icon {
    color: #f472b6;
  }
  .bar-label {
    color: rgba(255, 255, 255, 0.7);
  }

  .bar-value {
    margin-left: auto;
    color: rgba(255, 255, 255, 0.5);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
  }
}

.bar-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;

  &.stamina {
    background: linear-gradient(90deg, #34d399, #10b981);
  }

  &.lust {
    background: linear-gradient(90deg, #f472b6, #ec4899);
  }
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.quick-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .qs-label {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.4);
    margin-bottom: 4px;
  }

  .qs-value {
    font-size: 16px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;

    &.charm {
      color: #f472b6;
    }
    &.luck {
      color: #fbbf24;
    }
    &.dodge {
      color: #60a5fa;
    }
    &.crit {
      color: #f87171;
    }
  }
}

.quest-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.quest-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);

  i {
    color: #667eea;
  }
}

.quest-content {
  padding: 14px;
}

.quest-title {
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin-bottom: 6px;
}

.quest-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  margin-bottom: 10px;
}

.quest-status {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;

  &.active {
    background: rgba(96, 165, 250, 0.2);
    color: #93c5fd;
  }

  &.done {
    background: rgba(52, 211, 153, 0.2);
    color: #6ee7b7;
  }
}

/* 难度调节卡片 */
.difficulty-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.difficulty-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);

  i {
    color: #a78bfa;
  }
}

.difficulty-content {
  padding: 14px;
}

.difficulty-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.difficulty-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  i {
    font-size: 18px;
    color: var(--difficulty-color, rgba(255, 255, 255, 0.5));
    transition: all 0.2s ease;
  }

  span {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }

  &:hover:not(.disabled):not(.active) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);

    i {
      transform: scale(1.1);
    }
  }

  &.active {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--difficulty-color, rgba(255, 255, 255, 0.5));
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.15);

    i {
      color: var(--difficulty-color, white);
      filter: drop-shadow(0 0 6px var(--difficulty-color, white));
    }

    span {
      color: white;
    }
  }

  &.disabled {
    opacity: 0.35;
    cursor: not-allowed;

    i {
      color: rgba(255, 255, 255, 0.3);
    }

    span {
      color: rgba(255, 255, 255, 0.4);
    }
  }
}

.difficulty-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(251, 191, 36, 0.1);
  border-radius: 8px;
  font-size: 11px;
  color: rgba(251, 191, 36, 0.8);

  i {
    font-size: 12px;
  }
}

/* 确认弹窗样式 */
.confirm-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.confirm-modal {
  background: linear-gradient(135deg, rgba(30, 30, 45, 0.98), rgba(20, 20, 35, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  width: 90%;
  max-width: 340px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}

.confirm-modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: rgba(251, 191, 36, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  i {
    font-size: 20px;
    color: #fbbf24;
  }

  span {
    font-size: 16px;
    font-weight: 600;
    color: white;
  }
}

.confirm-modal-body {
  padding: 20px;

  p {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.6;
    margin: 0 0 12px;
  }

  .difficulty-text {
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;

    &.current {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.9);
    }

    &.target {
      background: rgba(248, 113, 113, 0.2);
    }
  }

  .warning-text {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: rgba(248, 113, 113, 0.15);
    border-radius: 8px;
    font-size: 13px;
    color: #f87171;
    margin-top: 16px;
    margin-bottom: 0;

    i {
      font-size: 14px;
    }
  }
}

.confirm-modal-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  button {
    flex: 1;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .cancel-btn {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);

    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  }

  .confirm-btn {
    background: linear-gradient(135deg, #f87171, #dc2626);
    color: white;
    box-shadow: 0 4px 12px rgba(248, 113, 113, 0.3);

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(248, 113, 113, 0.4);
    }
  }
}

.time-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.time-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.3), rgba(59, 130, 246, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;

  i {
    font-size: 18px;
    color: #60a5fa;
  }
}

.time-info {
  flex: 1;
}

.game-time {
  font-size: 20px;
  font-weight: 700;
  color: white;
  font-family: 'JetBrains Mono', monospace;
}

.game-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.feed-section {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 14px;
}

.feed-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 12px;

  i {
    color: #667eea;
  }
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feed-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.feed-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;

  &.info {
    background: #60a5fa;
  }
  &.warning {
    background: #fbbf24;
  }
  &.success {
    background: #34d399;
  }
  &.error {
    background: #f87171;
  }
}

.feed-content {
  flex: 1;
}

.feed-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
}

.feed-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 4px;
}
</style>
