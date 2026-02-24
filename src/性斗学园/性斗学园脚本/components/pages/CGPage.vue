<template>
  <div class="cg-page">
    <!-- 分类标签 -->
    <div class="category-tabs">
      <button
        v-for="category in categories"
        :key="category.key"
        class="category-tab"
        :class="{ active: currentCategory === category.key }"
        @click="currentCategory = category.key"
      >
        <i :class="category.icon"></i>
        <span>{{ category.label }}</span>
        <span class="count-badge">{{ getCategoryCount(category.key) }}</span>
      </button>
    </div>

    <!-- CG内容区域 -->
    <div class="cg-content">
      <!-- 角色选择器（仅在非全部模式下显示） -->
      <div class="character-selector" v-if="currentCategory !== 'all'">
        <div class="section-header">
          <i class="fas fa-user"></i>
          <span>选择角色</span>
        </div>
        <div class="character-list">
          <button
            v-for="char in availableCharacters"
            :key="char"
            class="character-btn"
            :class="{ active: selectedCharacter === char }"
            @click="selectedCharacter = char"
          >
            <div class="char-avatar">
              <img :src="getAvatarUrl(char)" :alt="char" @error="handleImageError($event)" class="avatar-img" />
            </div>
            <span class="char-name">{{ char }}</span>
            <span class="unlock-badge" v-if="getCharacterUnlockCount(char) > 0">
              {{ getCharacterUnlockCount(char) }}
            </span>
          </button>
        </div>
      </div>

      <!-- 全部CG模式：按角色分组显示 -->
      <template v-if="currentCategory === 'all'">
        <div class="section-header main-header">
          <i class="fas fa-images"></i>
          <span>全部CG</span>
          <span class="count-badge">{{ getTotalUnlockedCount }} / {{ getTotalCGCount }}</span>
        </div>

        <!-- 仅显示已解锁CG勾选框 -->
        <label class="unlock-filter-checkbox">
          <input type="checkbox" v-model="showOnlyUnlocked" />
          <span class="checkbox-custom"></span>
          <span class="checkbox-label">仅显示已解锁</span>
        </label>

        <div v-for="char in filteredCharactersWithCGs" :key="char" class="character-section">
          <div class="character-section-header" @click="toggleCharacterCollapse(char)">
            <div class="char-avatar-small">
              <img :src="getAvatarUrl(char)" :alt="char" @error="handleImageError($event)" class="avatar-img" />
            </div>
            <span class="char-section-name">{{ char }}</span>
            <span class="count-badge">{{ getCharacterUnlockCount(char) }} / {{ getCharacterCGCount(char) }}</span>
            <i class="fas collapse-icon" :class="isCharacterCollapsed(char) ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
          </div>
          <div class="cg-grid" v-show="!isCharacterCollapsed(char)">
            <div
              v-for="cg in getCharacterCGs(char)"
              :key="cg.id + '-' + cg.imageIndex"
              class="cg-item"
              :class="{
                locked: !isCGImageUnlocked(cg.id, cg.imageIndex),
                unlocked: isCGImageUnlocked(cg.id, cg.imageIndex),
              }"
              @click="handleCGImageClick(cg)"
            >
              <div class="cg-thumbnail">
                <img
                  v-if="isCGImageUnlocked(cg.id, cg.imageIndex)"
                  :src="getCGImageUrl(cg)"
                  :alt="cg.name"
                  @error="handleCGImageError($event)"
                  class="cg-img"
                />
                <div v-else class="locked-overlay">
                  <i class="fas fa-lock"></i>
                </div>
              </div>
              <div class="cg-info">
                <span class="cg-name">{{ isCGImageUnlocked(cg.id, cg.imageIndex) ? cg.name : '???' }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 分类CG模式：显示过滤后的CG -->
      <template v-else>
        <div class="section-header">
          <i class="fas fa-images"></i>
          <span>{{ getCategoryLabel(currentCategory) }}</span>
          <span class="count-badge">{{ getFilteredUnlockedCount }} / {{ getCategoryTotalCount }}</span>
        </div>

        <!-- 仅显示已解锁CG勾选框（始终显示，不受过滤结果影响） -->
        <label class="unlock-filter-checkbox">
          <input type="checkbox" v-model="showOnlyUnlocked" />
          <span class="checkbox-custom"></span>
          <span class="checkbox-label">仅显示已解锁</span>
        </label>

        <div class="section" v-if="filteredCGImages.length > 0">
          <div class="cg-grid">
            <div
              v-for="cg in filteredCGImages"
              :key="cg.id + '-' + cg.imageIndex"
              class="cg-item"
              :class="{
                locked: !isCGImageUnlocked(cg.id, cg.imageIndex),
                unlocked: isCGImageUnlocked(cg.id, cg.imageIndex),
              }"
              @click="handleCGImageClick(cg)"
            >
              <div class="cg-thumbnail">
                <img
                  v-if="isCGImageUnlocked(cg.id, cg.imageIndex)"
                  :src="getCGImageUrl(cg)"
                  :alt="cg.name"
                  @error="handleCGImageError($event)"
                  class="cg-img"
                />
                <div v-else class="locked-overlay">
                  <i class="fas fa-lock"></i>
                </div>
              </div>
              <div class="cg-info">
                <span class="cg-name">{{ isCGImageUnlocked(cg.id, cg.imageIndex) ? cg.name : '???' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div class="empty-state" v-else-if="getCategoryTotalCount > 0">
          <div class="empty-icon">
            <i class="fas fa-images"></i>
          </div>
          <p class="empty-title">暂无CG数据</p>
          <p class="empty-desc">
            {{ selectedCharacter ? `${selectedCharacter}的CG尚未解锁` : '请选择一个角色查看CG' }}
          </p>
        </div>
      </template>
    </div>

    <!-- CG放大模态框 -->
    <div v-if="showModal" class="cg-modal" @click="closeModal">
      <div class="modal-backdrop"></div>
      <div class="modal-content" @click.stop>
        <button class="modal-close" @click="closeModal">
          <i class="fas fa-times"></i>
        </button>
        <div class="modal-header">
          <h3>{{ modalCG?.name }}</h3>
          <span class="modal-character">{{ modalCG?.characterName }}</span>
        </div>
        <div class="modal-body">
          <!-- 单张图片显示（不再轮播，每张图片单独解锁） -->
          <div class="image-container">
            <img
              v-if="modalCG"
              :src="getModalImageUrl()"
              :alt="modalCG.name"
              @error="handleModalImageError"
              class="modal-cg-img"
            />
          </div>
          <!-- CG描述 -->
          <div class="modal-description" v-if="modalCG">
            <p>{{ modalCG.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { CG_CONFIGS, type CGEvent } from '../../../战斗界面/data/cgConfig';

// 解锁的CG存储（每张图片单独解锁，格式：cgId-imageIndex）
const unlockedCGs = ref<Set<string>>(new Set());

// 角色折叠状态存储
const collapsedCharacters = ref<Set<string>>(new Set());

// 仅显示已解锁CG
const showOnlyUnlocked = ref(false);

// 检查角色是否折叠
function isCharacterCollapsed(characterName: string): boolean {
  return collapsedCharacters.value.has(characterName);
}

// 切换角色折叠状态
function toggleCharacterCollapse(characterName: string) {
  if (collapsedCharacters.value.has(characterName)) {
    collapsedCharacters.value.delete(characterName);
  } else {
    collapsedCharacters.value.add(characterName);
  }
}

// 分类定义
const categories = [
  { key: 'all', label: '全部', icon: 'fas fa-th' },
  { key: 'male_defeat', label: '男U战败', icon: 'fas fa-mars' },
  { key: 'male_victory', label: '男U战胜', icon: 'fas fa-trophy' },
  { key: 'female_defeat', label: '女U战败', icon: 'fas fa-venus' },
  { key: 'female_victory', label: '女U战胜', icon: 'fas fa-crown' },
];

const currentCategory = ref('all');
const selectedCharacter = ref<string | null>(null);
const showModal = ref(false);
const modalCG = ref<FlattenedCGImage | null>(null);

// 从cgConfig获取所有CG数据并扁平化（每张图片作为单独项）
interface FlattenedCGImage {
  id: string;
  name: string;
  description: string;
  imageName: string;
  imageIndex: number;
  characterName: string;
  genderKey: 'male' | 'female';
  resultKey: 'defeat' | 'victory';
}

// 将所有CG事件展开为单独的图片项
const allCGImages = computed<FlattenedCGImage[]>(() => {
  const result: FlattenedCGImage[] = [];

  for (const config of CG_CONFIGS) {
    // 处理所有事件类型
    const processEvents = (events: CGEvent[], genderKey: 'male' | 'female', resultKey: 'defeat' | 'victory') => {
      for (const event of events) {
        // 每张图片单独作为一个CG项
        for (let i = 0; i < event.images.length; i++) {
          result.push({
            id: event.id,
            name: event.name,
            description: event.description,
            imageName: event.images[i],
            imageIndex: i,
            characterName: config.characterName,
            genderKey,
            resultKey,
          });
        }
      }
    };

    processEvents(config.male.defeat, 'male', 'defeat');
    processEvents(config.male.victory, 'male', 'victory');
    processEvents(config.female.defeat, 'female', 'defeat');
    processEvents(config.female.victory, 'female', 'victory');
  }

  return result;
});

// 可用的角色列表
const availableCharacters = computed(() => {
  const chars = new Set<string>();
  for (const cg of allCGImages.value) {
    chars.add(cg.characterName);
  }
  return Array.from(chars).sort();
});

// 有CG的角色列表（用于全部模式显示，考虑仅显示已解锁过滤）
const charactersWithCGs = computed(() => {
  return availableCharacters.value;
});

// 过滤后的角色列表（当勾选"仅显示已解锁"时，只返回有已解锁CG的角色）
const filteredCharactersWithCGs = computed(() => {
  if (!showOnlyUnlocked.value) {
    return availableCharacters.value;
  }
  // 只返回至少有一个已解锁CG的角色
  return availableCharacters.value.filter(char => {
    return allCGImages.value.some(cg => cg.characterName === char && isCGImageUnlocked(cg.id, cg.imageIndex));
  });
});

// 获取某角色的所有CG（支持仅显示已解锁过滤）
function getCharacterCGs(characterName: string): FlattenedCGImage[] {
  let cgs = allCGImages.value.filter(cg => cg.characterName === characterName);
  if (showOnlyUnlocked.value) {
    cgs = cgs.filter(cg => isCGImageUnlocked(cg.id, cg.imageIndex));
  }
  return cgs;
}

// 获取某角色的CG总数（不受过滤影响的总数）
function getCharacterCGCountTotal(characterName: string): number {
  return allCGImages.value.filter(cg => cg.characterName === characterName).length;
}

// 获取某角色的CG数量（受过滤影响）
function getCharacterCGCount(characterName: string): number {
  return getCharacterCGs(characterName).length;
}

// 获取分类模式下的总CG数量（不受仅显示已解锁过滤影响）
const getCategoryTotalCount = computed(() => {
  let result = allCGImages.value;

  // 按分类过滤
  if (currentCategory.value !== 'all') {
    const [gender, outcome] = currentCategory.value.split('_');
    result = result.filter(cg => cg.genderKey === gender && cg.resultKey === outcome);
  }

  // 按角色过滤
  if (selectedCharacter.value) {
    result = result.filter(cg => cg.characterName === selectedCharacter.value);
  }

  return result.length;
});

// 总CG数量
const getTotalCGCount = computed(() => allCGImages.value.length);

// 总已解锁数量
const getTotalUnlockedCount = computed(() => {
  return allCGImages.value.filter(cg => isCGImageUnlocked(cg.id, cg.imageIndex)).length;
});

// 过滤后的CG图片列表（分类模式下使用，支持仅显示已解锁过滤）
const filteredCGImages = computed(() => {
  let result = allCGImages.value;

  // 按分类过滤
  if (currentCategory.value !== 'all') {
    const [gender, outcome] = currentCategory.value.split('_');
    result = result.filter(cg => cg.genderKey === gender && cg.resultKey === outcome);
  }

  // 按角色过滤
  if (selectedCharacter.value) {
    result = result.filter(cg => cg.characterName === selectedCharacter.value);
  }

  // 仅显示已解锁过滤
  if (showOnlyUnlocked.value) {
    result = result.filter(cg => isCGImageUnlocked(cg.id, cg.imageIndex));
  }

  return result;
});

// 分类模式下的已解锁数量
const getFilteredUnlockedCount = computed(() => {
  return filteredCGImages.value.filter(cg => isCGImageUnlocked(cg.id, cg.imageIndex)).length;
});

// 生成CG图片唯一键
function getCGImageKey(cgId: string, imageIndex: number): string {
  return `${cgId}-${imageIndex}`;
}

// 加载已解锁的CG
function loadUnlockedCGs() {
  try {
    const stored = localStorage.getItem('unlocked_cgs');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        unlockedCGs.value = new Set(parsed);
      }
    }
    console.info('[CG页面] 加载已解锁CG数量:', unlockedCGs.value.size);
  } catch (e) {
    console.error('[CG页面] 加载解锁CG失败:', e);
  }
}

// 保存已解锁的CG
function saveUnlockedCGs() {
  try {
    localStorage.setItem('unlocked_cgs', JSON.stringify(Array.from(unlockedCGs.value)));
  } catch (e) {
    console.error('[CG页面] 保存解锁CG失败:', e);
  }
}

// 解锁CG图片（供外部调用）
function unlockCGImage(cgId: string, imageIndex: number) {
  const key = getCGImageKey(cgId, imageIndex);
  if (!unlockedCGs.value.has(key)) {
    unlockedCGs.value.add(key);
    saveUnlockedCGs();
    console.info('[CG页面] 解锁CG图片:', key);
  }
}

// 检查某张CG图片是否已解锁
function isCGImageUnlocked(cgId: string, imageIndex: number): boolean {
  const key = getCGImageKey(cgId, imageIndex);
  return unlockedCGs.value.has(key);
}

// 获取分类的CG数量
function getCategoryCount(category: string): number {
  if (category === 'all') {
    return allCGImages.value.length;
  }
  const [gender, outcome] = category.split('_');
  return allCGImages.value.filter(cg => cg.genderKey === gender && cg.resultKey === outcome).length;
}

// 获取分类标签
function getCategoryLabel(category: string): string {
  const cat = categories.find(c => c.key === category);
  return cat?.label || category;
}

// 获取角色解锁数量
function getCharacterUnlockCount(characterName: string): number {
  return allCGImages.value.filter(cg => cg.characterName === characterName && isCGImageUnlocked(cg.id, cg.imageIndex))
    .length;
}

// 生成头像 URL（沐芯兰特殊处理）
function getAvatarUrl(name: string): string {
  // 沐芯兰的头像文件名是"沐芯兰_1.png"而不是"沐芯兰.png"
  const fileName = name === '沐芯兰' ? '沐芯兰_1' : name;
  return `https://huggingface.co/datasets/Vin05/AI-Gallery/resolve/main/性斗学园/头像/${encodeURIComponent(fileName)}.png`;
}

// 生成CG图片URL
function getCGImageUrl(cg: FlattenedCGImage): string {
  const genderFolder = cg.genderKey === 'male' ? '男u' : '女u';
  const resultFolder = cg.resultKey === 'victory' ? '战胜事件' : '战败事件';
  return `https://huggingface.co/datasets/Vin05/AI-Gallery/resolve/main/性斗学园/cg/${cg.characterName}/${genderFolder}/${resultFolder}/${cg.imageName}`;
}

// 获取模态框图片URL
function getModalImageUrl(): string {
  if (!modalCG.value) return '';
  return getCGImageUrl(modalCG.value);
}

// 处理图片加载失败
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
  const parent = img.parentElement;
  if (parent && !parent.querySelector('.fallback-icon')) {
    const icon = document.createElement('i');
    icon.className = 'fas fa-user fallback-icon';
    parent.appendChild(icon);
  }
}

// 处理CG图片加载失败
function handleCGImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
  const parent = img.parentElement;
  if (parent && !parent.querySelector('.fallback-icon')) {
    const icon = document.createElement('i');
    icon.className = 'fas fa-image fallback-icon';
    parent.appendChild(icon);
  }
}

// 处理模态框图片加载失败
function handleModalImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
  const parent = img.parentElement;
  if (parent && !parent.querySelector('.modal-fallback')) {
    const fallback = document.createElement('div');
    fallback.className = 'modal-fallback';
    fallback.innerHTML = '<i class="fas fa-image"></i><p>图片加载失败</p>';
    parent.appendChild(fallback);
  }
}

// 点击CG图片
function handleCGImageClick(cg: FlattenedCGImage) {
  if (!isCGImageUnlocked(cg.id, cg.imageIndex)) {
    // 未解锁，显示提示
    if (typeof toastr !== 'undefined') {
      toastr.info('此CG尚未解锁，在性斗中触发事件后可解锁');
    }
    return;
  }

  // 已解锁，显示模态框
  modalCG.value = cg;
  showModal.value = true;
}

// 关闭模态框
function closeModal() {
  showModal.value = false;
  modalCG.value = null;
}

// 监听全局CG解锁事件（兼容旧格式：解锁整个事件的所有图片）
function handleCGUnlockEvent(event: CustomEvent) {
  const cgId = event.detail?.cgId;
  const imageIndex = event.detail?.imageIndex;

  if (cgId !== undefined) {
    if (imageIndex !== undefined) {
      // 新格式：解锁单张图片
      unlockCGImage(cgId, imageIndex);
    } else {
      // 旧格式：解锁该事件的所有图片
      const eventCGs = allCGImages.value.filter(cg => cg.id === cgId);
      for (const cg of eventCGs) {
        unlockCGImage(cg.id, cg.imageIndex);
      }
    }
  }
}

// 初始化时默认选中第一个有CG的角色，并折叠所有角色
watch(
  availableCharacters,
  chars => {
    if (chars.length > 0 && !selectedCharacter.value) {
      selectedCharacter.value = chars[0];
    }
    // 默认折叠所有角色
    if (chars.length > 0 && collapsedCharacters.value.size === 0) {
      chars.forEach(char => collapsedCharacters.value.add(char));
    }
  },
  { immediate: true },
);

onMounted(() => {
  loadUnlockedCGs();

  // 监听CG解锁事件
  window.addEventListener('cg-unlocked', handleCGUnlockEvent as EventListener);

  // 暴露解锁函数到全局（供战斗系统调用）
  const globalAny = window as any;
  globalAny.__cgUnlockImage = unlockCGImage;
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('cg-unlocked', handleCGUnlockEvent as EventListener);
});
</script>

<style scoped lang="scss">
.cg-page {
  padding: 12px 16px;
  overflow-y: auto;
  flex: 1;
  position: relative;
  padding-bottom: 80px; // 为底部导航栏留出空间
}

// 分类标签
.category-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
  }

  &.active {
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(168, 85, 247, 0.3));
    border-color: rgba(236, 72, 153, 0.5);
    color: white;
  }

  i {
    font-size: 11px;
  }

  .count-badge {
    padding: 2px 6px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 10px;
    font-size: 10px;
  }
}

// 角色选择器
.character-selector {
  margin-bottom: 16px;
}

.character-list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 0;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }
}

.character-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 70px;
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
  }

  &.active {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(102, 126, 234, 0.1));
    border-color: rgba(102, 126, 234, 0.4);
  }

  .char-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(102, 126, 234, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .fallback-icon {
      font-size: 16px;
      color: #a5b4fc;
    }
  }

  .char-name {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.8);
    text-align: center;
    max-width: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .unlock-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: 2px 5px;
    background: linear-gradient(135deg, #ec4899, #a855f7);
    border-radius: 8px;
    font-size: 9px;
    color: white;
    font-weight: 600;
  }
}

// 内容区域
.cg-content {
  flex: 1;
}

.section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 12px;

  i:first-child {
    color: #ec4899;
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

.main-header {
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 16px;
}

// 角色分组区域
.character-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

.character-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  &:active {
    background: rgba(255, 255, 255, 0.08);
  }

  .char-avatar-small {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(102, 126, 234, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .char-section-name {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }

  .count-badge {
    margin-left: auto;
    padding: 3px 10px;
    background: rgba(236, 72, 153, 0.2);
    border-radius: 12px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
  }

  .collapse-icon {
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    margin-left: 8px;
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }
}

// 仅显示已解锁CG勾选框样式
.unlock-filter-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  cursor: pointer;
  user-select: none;

  input[type='checkbox'] {
    display: none;
  }

  .checkbox-custom {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(236, 72, 153, 0.5);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;

    &::after {
      content: '';
      width: 10px;
      height: 6px;
      border: 2px solid transparent;
      border-top: none;
      border-right: none;
      transform: rotate(-45deg) translateY(-1px);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
  }

  input[type='checkbox']:checked + .checkbox-custom {
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.6), rgba(168, 85, 247, 0.6));
    border-color: rgba(236, 72, 153, 0.8);

    &::after {
      border-color: white;
      opacity: 1;
    }
  }

  .checkbox-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }

  &:hover {
    .checkbox-custom {
      border-color: rgba(236, 72, 153, 0.8);
      background: rgba(255, 255, 255, 0.1);
    }

    .checkbox-label {
      color: rgba(255, 255, 255, 0.9);
    }
  }
}

// CG网格
.cg-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.cg-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &.unlocked {
    border-color: rgba(236, 72, 153, 0.3);

    &:hover {
      border-color: rgba(236, 72, 153, 0.5);
    }
  }

  &.locked {
    opacity: 0.6;

    &:hover {
      opacity: 0.8;
    }
  }

  .cg-thumbnail {
    width: 100%;
    aspect-ratio: 1;
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    .cg-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .locked-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.6);

      i {
        font-size: 24px;
        color: rgba(255, 255, 255, 0.4);
      }
    }

    .fallback-icon {
      font-size: 24px;
      color: rgba(255, 255, 255, 0.3);
    }
  }

  .cg-info {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .cg-name {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.8);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cg-rarity {
      font-size: 9px;
      color: #fbbf24;
      display: flex;
      align-items: center;
      gap: 2px;

      i {
        font-size: 8px;
      }
    }
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;

  .empty-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;

    i {
      font-size: 24px;
      color: rgba(255, 255, 255, 0.3);
    }
  }

  .empty-title {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 8px;
  }

  .empty-desc {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
  }
}

// 模态框 - fixed定位居中 + 视口单位实现等比例缩放
// 手机UI基准尺寸: 390px x 722px
.cg-modal {
  position: fixed; // 相对于视口定位，确保始终可见
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  // 使用视口单位padding，与手机UI保持相对比例
  padding: max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right))
    max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
}

.modal-content {
  position: relative;
  background: linear-gradient(135deg, rgba(30, 30, 40, 0.98), rgba(20, 20, 30, 0.98));
  // 圆角使用视口单位，与容器保持相对比例
  border-radius: clamp(12px, 2vmin, 18px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  // 宽度：最小200px，最大350px，中间按视口85%缩放
  width: clamp(200px, 85vmin, 350px);
  // 高度：最小300px，最大600px，中间按视口75%缩放
  max-height: clamp(300px, 75vmin, 600px);
  max-height: calc(100dvh - 20px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.modal-close {
  position: absolute;
  top: clamp(8px, 1.5vmin, 12px);
  right: clamp(8px, 1.5vmin, 12px);
  // 按钮尺寸使用视口单位
  width: clamp(24px, 4vmin, 32px);
  height: clamp(24px, 4vmin, 32px);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;
  font-size: clamp(12px, 2vmin, 16px);

  &:hover {
    background: rgba(248, 113, 113, 0.8);
  }
}

.modal-header {
  // 使用视口单位padding
  padding: clamp(10px, 2vmin, 16px) clamp(12px, 2.5vmin, 20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;

  h3 {
    margin: 0;
    font-size: clamp(12px, 2vmin, 16px);
    font-weight: 600;
    color: white;
    padding-right: clamp(28px, 5vmin, 40px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .modal-character {
    font-size: clamp(10px, 1.5vmin, 12px);
    color: rgba(255, 255, 255, 0.5);
    margin-top: clamp(2px, 0.5vmin, 4px);
    display: block;
  }
}

.modal-body {
  // 使用视口单位padding
  padding: clamp(10px, 2vmin, 16px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.5vmin, 12px);
  flex: 1;
  min-height: 0; // 允许flex子项收缩
}

// 单张图片容器（不再使用轮播）- 使用视口单位保持比例
.image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: clamp(8px, 1.5vmin, 12px);
  overflow: hidden;
  flex: 1;
  min-height: 0; // 允许flex子项收缩

  .modal-cg-img {
    width: 100%;
    height: 100%;
    max-height: clamp(150px, 40vmin, 350px);
    object-fit: contain;
  }

  .modal-fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(6px, 1vmin, 10px);
    color: rgba(255, 255, 255, 0.4);
    padding: clamp(20px, 4vmin, 40px);

    i {
      font-size: clamp(20px, 4vmin, 32px);
    }

    p {
      font-size: clamp(10px, 1.5vmin, 13px);
      margin: 0;
    }
  }
}

// 描述
.modal-description {
  padding: clamp(8px, 1.5vmin, 12px);
  background: rgba(255, 255, 255, 0.05);
  border-radius: clamp(8px, 1.5vmin, 12px);
  flex-shrink: 0;

  p {
    margin: 0;
    font-size: clamp(11px, 1.8vmin, 14px);
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.7);
  }
}
</style>
