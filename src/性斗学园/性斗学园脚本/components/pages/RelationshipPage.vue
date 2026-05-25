<template>
  <div class="relationship-page">
    <!-- 在场人物 -->
    <div class="section" v-if="presentCharacters.length > 0">
      <div class="section-header">
        <i class="fas fa-users"></i>
        <span>在场人物</span>
        <span class="count-badge">{{ presentCharacters.length }}</span>
      </div>
      <div class="present-list">
        <div class="present-item" v-for="(name, index) in presentCharacters" :key="index">
          <div class="present-avatar" @click="showAvatarModal(name)">
            <img :src="getAvatarUrl(name)" :alt="name" @error="handleImageError($event)" class="avatar-img" />
          </div>
          <span class="present-name">{{ name }}</span>
        </div>
      </div>
    </div>

    <!-- 关系网络 -->
    <div class="section">
      <div class="section-header">
        <i class="fas fa-heart"></i>
        <span>关系网络</span>
        <span class="count-badge" v-if="Object.keys(relationships).length > 0">
          {{ Object.keys(relationships).length }}
        </span>
      </div>

      <div class="relationship-list" v-if="Object.keys(relationships).length > 0">
        <div class="relationship-card" v-for="(rel, name) in relationships" :key="name">
          <button class="discard-btn" @click.stop="forgetRelationship(String(name))" title="遗忘">
            <i class="fas fa-times"></i>
          </button>
          <div class="rel-header">
            <div class="rel-avatar" @click="showAvatarModal(String(name))">
              <img
                :src="getAvatarUrl(String(name))"
                :alt="String(name)"
                @error="handleImageError($event)"
                class="avatar-img"
              />
            </div>
            <div class="rel-info">
              <div class="rel-name">{{ name }}</div>
              <div v-if="rel.关系类型" class="rel-type" :class="getRelationTypeClass(rel.关系类型)">
                <i :class="getRelationIcon(rel.关系类型)"></i>
                {{ rel.关系类型 }}
              </div>
              <div v-else class="rel-type type-unknown">
                <i class="fas fa-user-circle"></i>
                未建立关系
              </div>
            </div>
          </div>

          <!-- 关系数值 -->
          <div class="rel-stats">
            <div class="stat-item">
              <div class="stat-header">
                <span class="stat-label">好感度</span>
                <span class="stat-value" :class="getAffectionClass(rel.好感度)">
                  {{ rel.好感度 || 0 }}
                </span>
              </div>
              <div class="stat-bar">
                <div
                  class="stat-fill affection"
                  :class="getAffectionClass(rel.好感度)"
                  :style="{ width: `${rel.好感度 || 0}%` }"
                ></div>
              </div>
            </div>

            <div class="stat-item" v-if="rel.调教进度 !== undefined">
              <div class="stat-header">
                <span class="stat-label">调教进度</span>
                <span class="stat-value training">{{ rel.调教进度 || 0 }}%</span>
              </div>
              <div class="stat-bar">
                <div class="stat-fill training" :style="{ width: `${rel.调教进度 || 0}%` }"></div>
              </div>
            </div>

            <div class="stat-item" v-if="rel.臣服度 !== undefined">
              <div class="stat-header">
                <span class="stat-label">臣服度</span>
                <span class="stat-value" :class="getSubmissionClass(rel.臣服度)">
                  {{ rel.臣服度 || 0 }}
                </span>
              </div>
              <div class="stat-bar">
                <div
                  class="stat-fill submission"
                  :class="getSubmissionClass(rel.臣服度)"
                  :style="{ width: `${rel.臣服度 || 0}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else>
        <div class="empty-icon">
          <i class="fas fa-heart-crack"></i>
        </div>
        <p class="empty-title">暂无关系数据</p>
        <p class="empty-desc">与学园中的人物互动来建立关系</p>
      </div>
    </div>

    <!-- 势力声望 -->
    <div class="section">
      <div class="section-header">
        <i class="fas fa-flag"></i>
        <span>势力声望</span>
      </div>

      <div class="reputation-list" v-if="Object.keys(reputations).length > 0">
        <div class="reputation-card" v-for="(value, name) in reputations" :key="name">
          <div class="rep-header">
            <div class="rep-icon">
              <i :class="getReputationIcon(String(name))"></i>
            </div>
            <div class="rep-info">
              <div class="rep-name">{{ name }}</div>
              <div class="rep-value" :class="getReputationClass(Number(value))">
                {{ Number(value) > 0 ? '+' : '' }}{{ Number(value) }}
              </div>
            </div>
          </div>
          <div class="rep-bar">
            <div
              class="rep-fill"
              :class="getReputationClass(Number(value))"
              :style="{ width: `${getReputationPercentage(Number(value))}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else>
        <div class="empty-icon">
          <i class="fas fa-flag"></i>
        </div>
        <p class="empty-title">暂无声望数据</p>
        <p class="empty-desc">与各势力互动来建立声望</p>
      </div>
    </div>
  </div>

  <!-- 头像放大模态框 -->
  <div v-if="showModal" class="avatar-modal" @click="closeModal">
    <div class="modal-backdrop"></div>
    <div class="modal-content" @click.stop>
      <button class="modal-close" @click="closeModal">
        <i class="fas fa-times"></i>
      </button>
      <div class="modal-header">
        <h3>{{ modalCharacterName }}</h3>
      </div>
      <div class="modal-body">
        <img :src="modalAvatarUrl" :alt="modalCharacterName" @error="handleModalImageError" class="modal-avatar-img" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getLatestMvuData, replaceLatestMvuData } from '../../../shared/mvuStore';
import { ENEMY_DATABASE, NAME_ALIASES } from '../../../战斗界面/enemyDatabase';

const props = defineProps<{
  characterData: any;
}>();

const presentCharacters = computed(() => {
  return props.characterData.关系系统?.在场人物 || [];
});

const relationships = computed(() => {
  const relSystem = props.characterData.关系系统 || {};
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(relSystem)) {
    if (key !== '在场人物' && typeof value === 'object' && value !== null) {
      result[key] = value;
    }
  }

  return result;
});

const reputations = computed(() => {
  return props.characterData.势力声望 || {};
});

// 头像放大模态框
const showModal = ref(false);
const modalAvatarUrl = ref('');
const modalCharacterName = ref('');

/**
 * 解析头像全名（支持包含匹配）
 * @param rawName 关系系统中的名字（可能是全名、别名或包含别名的字符串）
 * @returns 匹配到的全名，用于拼接图片 URL
 */
function resolveAvatarFullName(rawName: string): string {
  if (!rawName) return rawName;

  // 1. 先尝试精确匹配（关系名刚好是某个敌人库全名）
  if (rawName in ENEMY_DATABASE) {
    return rawName;
  }

  // 2. 包含匹配：遍历别名表，只要关系名包含某个别名 key，就映射到对应全名
  //    如果包含多个别名（如"雪莉与爱丽丝"），优先返回第一个匹配到的
  for (const [alias, fullName] of Object.entries(NAME_ALIASES)) {
    if (rawName.includes(alias)) {
      console.info(`[关系页] 通过包含匹配 "${rawName}" 包含 "${alias}"，映射到角色: ${fullName}`);
      return fullName;
    }
  }

  // 3. 都没匹配到，返回原名（会尝试用原名拼接 URL，失败后降级为 icon）
  return rawName;
}

// 生成头像 URL
function getAvatarUrl(name: string): string {
  const fullName = resolveAvatarFullName(name);
  return `https://img.vinsimage.org/性斗学园/头像/${encodeURIComponent(fullName)}.png`;
}

// 处理图片加载失败
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  // 降级为默认头像（使用 icon）
  img.style.display = 'none';
  const parent = img.parentElement;
  if (parent && !parent.querySelector('.fallback-icon')) {
    const icon = document.createElement('i');
    icon.className = 'fas fa-user fallback-icon';
    parent.appendChild(icon);
  }
}

// 显示头像放大模态框
function showAvatarModal(name: string) {
  modalCharacterName.value = name;
  modalAvatarUrl.value = getAvatarUrl(name);
  showModal.value = true;
}

// 关闭模态框
function closeModal() {
  showModal.value = false;
}

async function forgetRelationship(name: string) {
  const ok = confirm(`确认遗忘与「${name}」的关系吗？`);
  if (!ok) return;

  try {
    const mvuData = await getLatestMvuData();
    if (!mvuData || !mvuData.stat_data) {
      console.error('[关系界面] 无法获取 MVU 数据');
      return;
    }

    const statData = mvuData.stat_data;
    if (!statData.关系系统 || !statData.关系系统[name]) {
      return;
    }

    delete statData.关系系统[name];

    await replaceLatestMvuData(mvuData);

    if (typeof toastr !== 'undefined') {
      toastr.success(`已遗忘与 ${name} 的关系`);
    }

    window.dispatchEvent(new CustomEvent('mvu-data-updated'));
  } catch (error) {
    console.error('[关系界面] 遗忘失败:', error);
    if (typeof toastr !== 'undefined') {
      toastr.error('遗忘失败，请重试');
    }
  }
}

function getRelationTypeClass(type: string | undefined): string {
  if (!type) return 'type-unknown';
  const map: Record<string, string> = {
    陌生人: 'type-stranger',
    同学: 'type-classmate',
    朋友: 'type-friend',
    恋人: 'type-lover',
    主仆: 'type-master',
    完全臣服: 'type-submissive',
    仇敌: 'type-enemy',
  };
  return map[type] || 'type-unknown';
}

function getRelationIcon(type: string | undefined): string {
  if (!type) return 'fas fa-user-circle';
  const map: Record<string, string> = {
    陌生人: 'fas fa-question',
    同学: 'fas fa-graduation-cap',
    朋友: 'fas fa-handshake',
    恋人: 'fas fa-heart',
    主仆: 'fas fa-crown',
    完全臣服: 'fas fa-link',
    仇敌: 'fas fa-skull',
  };
  return map[type] || 'fas fa-user-circle';
}

function getAffectionClass(value: number): string {
  if (value >= 80) return 'very-high';
  if (value >= 60) return 'high';
  if (value >= 40) return 'medium';
  if (value >= 20) return 'low';
  return 'very-low';
}

function getSubmissionClass(value: number): string {
  if (value >= 80) return 'very-high';
  if (value >= 60) return 'high';
  if (value >= 40) return 'medium';
  if (value >= 20) return 'low';
  return 'very-low';
}

function getReputationIcon(name: string): string {
  const map: Record<string, string> = {
    学生会: 'fas fa-crown',
    女权协会: 'fas fa-venus',
    BF社: 'fas fa-flask',
    体育联盟: 'fas fa-dumbbell',
    研究会: 'fas fa-book',
    地下联盟: 'fas fa-mask',
    男性自保联盟: 'fas fa-shield-alt',
    雌堕会: 'fas fa-feather',
  };
  return map[name] || 'fas fa-flag';
}

function getReputationClass(value: number): string {
  if (value >= 50) return 'very-high';
  if (value >= 20) return 'high';
  if (value >= -20) return 'medium';
  if (value >= -50) return 'low';
  return 'very-low';
}

function getReputationPercentage(value: number): number {
  // 将 -100 到 100 的范围映射到 0 到 100
  return Math.max(0, Math.min(100, (value + 100) / 2));
}

// 处理模态框图片加载失败
function handleModalImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
  const parent = img.parentElement;
  if (parent && !parent.querySelector('.modal-fallback')) {
    const fallback = document.createElement('div');
    fallback.className = 'modal-fallback';
    fallback.innerHTML = '<i class="fas fa-user"></i><p>暂无此图片</p>';
    parent.appendChild(fallback);
  }
}
</script>

<style scoped lang="scss">
.relationship-page {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  position: relative;
}

.section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 14px;

  i:first-child {
    color: #667eea;
  }

  .count-badge {
    margin-left: auto;
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-size: 11px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.6);
  }
}

.present-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.present-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(102, 126, 234, 0.05));
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 12px;

  .present-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(102, 126, 234, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s ease;

    &:hover {
      transform: scale(1.1);
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    i,
    .fallback-icon {
      font-size: 14px;
      color: #a5b4fc;
    }
  }

  .present-name {
    font-size: 13px;
    font-weight: 500;
    color: white;
  }
}

.relationship-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.relationship-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
}

.discard-btn {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: rgba(248, 113, 113, 0.9);
  border: 1px solid rgba(248, 113, 113, 0.9);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;

  &:hover {
    transform: scale(1.08);
    background: rgba(248, 113, 113, 1);
  }

  &:active {
    transform: scale(1);
  }

  i {
    font-size: 10px;
    line-height: 1;
  }
}

.rel-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.rel-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }

  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  i,
  .fallback-icon {
    font-size: 20px;
    color: rgba(255, 255, 255, 0.6);
  }
}

.rel-info {
  flex: 1;
}

.rel-name {
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin-bottom: 6px;
}

.rel-type {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;

  i {
    font-size: 10px;
  }

  &.type-stranger {
    background: rgba(156, 163, 175, 0.15);
    color: #d1d5db;
  }

  &.type-classmate {
    background: rgba(96, 165, 250, 0.15);
    color: #93c5fd;
  }

  &.type-friend {
    background: rgba(52, 211, 153, 0.15);
    color: #6ee7b7;
  }

  &.type-lover {
    background: rgba(244, 114, 182, 0.15);
    color: #f9a8d4;
  }

  &.type-master {
    background: rgba(251, 191, 36, 0.15);
    color: #fcd34d;
  }

  &.type-submissive {
    background: rgba(167, 139, 250, 0.15);
    color: #c4b5fd;
  }

  &.type-enemy {
    background: rgba(248, 113, 113, 0.15);
    color: #fca5a5;
  }

  &.type-unknown {
    background: rgba(156, 163, 175, 0.1);
    color: rgba(255, 255, 255, 0.4);
  }
}

.rel-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.stat-value {
  font-size: 13px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;

  &.very-high {
    color: #f472b6;
  }
  &.high {
    color: #34d399;
  }
  &.medium {
    color: #60a5fa;
  }
  &.low {
    color: #fbbf24;
  }
  &.very-low {
    color: rgba(255, 255, 255, 0.4);
  }
  &.training {
    color: #a78bfa;
  }
}

.stat-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;

  &.affection {
    &.very-high {
      background: linear-gradient(90deg, #ec4899, #f472b6);
    }
    &.high {
      background: linear-gradient(90deg, #10b981, #34d399);
    }
    &.medium {
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
    }
    &.low {
      background: linear-gradient(90deg, #f59e0b, #fbbf24);
    }
    &.very-low {
      background: rgba(255, 255, 255, 0.2);
    }
  }

  &.training {
    background: linear-gradient(90deg, #8b5cf6, #a78bfa);
  }

  &.submission {
    &.very-high {
      background: linear-gradient(90deg, #ec4899, #f472b6);
    }
    &.high {
      background: linear-gradient(90deg, #f59e0b, #fbbf24);
    }
    &.medium {
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
    }
    &.low {
      background: linear-gradient(90deg, #10b981, #34d399);
    }
    &.very-low {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;

  .empty-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.03);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;

    i {
      font-size: 32px;
      color: rgba(255, 255, 255, 0.15);
    }
  }

  .empty-title {
    font-size: 16px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 6px;
  }

  .empty-desc {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.3);
  }
}

.reputation-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reputation-card {
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.rep-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.rep-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;

  i {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.7);
  }
}

.rep-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rep-name {
  font-size: 14px;
  font-weight: 500;
  color: white;
}

.rep-value {
  font-size: 14px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;

  &.very-high {
    color: #34d399;
  }
  &.high {
    color: #60a5fa;
  }
  &.medium {
    color: rgba(255, 255, 255, 0.6);
  }
  &.low {
    color: #fbbf24;
  }
  &.very-low {
    color: #f87171;
  }
}

.rep-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.rep-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease;

  &.very-high {
    background: linear-gradient(90deg, #10b981, #34d399);
  }
  &.high {
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
  }
  &.medium {
    background: rgba(255, 255, 255, 0.3);
  }
  &.low {
    background: linear-gradient(90deg, #f59e0b, #fbbf24);
  }
  &.very-low {
    background: linear-gradient(90deg, #ef4444, #f87171);
  }
}

// 头像放大模态框样式
.avatar-modal {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
}

.modal-content {
  position: relative;
  background: linear-gradient(135deg, rgba(30, 30, 50, 0.98), rgba(20, 20, 40, 0.98));
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  width: 360px;
  max-width: 95vw;
  max-height: 100%;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  margin-top: 8px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;

  @media (min-height: 600px) {
    margin-top: max(20px, 5vh);
  }
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(248, 113, 113, 0.9);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
    background: rgba(248, 113, 113, 1);
  }

  i {
    font-size: 14px;
  }
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: white;
  }
}

.modal-body {
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  flex: 1;
  min-height: 0;
}

.modal-avatar-img {
  width: 100%;
  max-height: 100%;
  border-radius: 12px;
  object-fit: contain;
}

.modal-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.4);

  i {
    font-size: 48px;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
}
</style>
