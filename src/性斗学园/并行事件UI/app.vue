<template>
  <div class="parallel-events-beautifier" :style="containerStyle">
    <div v-if="events.length > 0" class="beautified-events-wrapper" :class="{ collapsed: isCollapsed }">
      <!-- 装饰性渐变背景 -->
      <div class="gradient-overlay"></div>
      <div class="shimmer-effect"></div>

      <!-- 标题（可点击折叠） -->
      <div class="events-header" @click="toggleCollapse">
        <i class="fas fa-stream"></i>
        <span>并行事件</span>
        <i class="fas collapse-icon" :class="isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
        <span class="event-count">({{ events.length }})</span>
      </div>

      <!-- 事件列表（可折叠） -->
      <div class="events-list" v-show="!isCollapsed">
        <div v-for="(event, index) in events" :key="index" class="event-item" :style="eventItemStyle">
          <div class="event-character">
            <i class="fas fa-user-circle"></i>
            <span class="character-name">{{ event.character }}</span>
          </div>
          <div class="event-description">
            {{ event.description }}
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-events">
      <p>未找到并行事件</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getSharedTextColor } from '../shared/textAppearance';

// 正则表达式：匹配 <parallel> 标签包裹的内容
const PARALLEL_REGEX = /<parallel>([\s\S]*?)<\/parallel>/g;

// 事件接口
interface ParallelEvent {
  character: string;
  description: string;
}

const events = ref<ParallelEvent[]>([]);
const textColor = ref(getSharedTextColor());

// 折叠状态（默认折叠）
const isCollapsed = ref(true);

// 配置
const config = ref({
  字体大小: '0.95rem',
  内边距: '1.5rem',
  字符名颜色: '#ec4899',
  描述颜色: '#e5e7eb',
  行间距: '1rem',
});

// 容器样式
const containerStyle = computed(() => ({
  width: '100%',
  margin: '0',
  padding: '0',
  '--shared-text-color': textColor.value,
}));

// 事件项样式
const eventItemStyle = computed(() => ({
  marginBottom: config.value.行间距,
  fontSize: config.value.字体大小,
}));

// 获取所有变量
const getAllVariables = (): any => {
  try {
    const globalAny = window as any;
    if (globalAny.getAllVariables) {
      return globalAny.getAllVariables();
    }
    return {};
  } catch (error) {
    console.error('[并行事件UI] 获取变量失败:', error);
    return {};
  }
};

// 插入或分配变量
const insertOrAssignVariables = (variables: any, options?: any): void => {
  try {
    const globalAny = window as any;
    if (globalAny.insertOrAssignVariables) {
      globalAny.insertOrAssignVariables(variables, options);
    }
  } catch (error) {
    console.error('[并行事件UI] 保存变量失败:', error);
  }
};

// 加载折叠状态
const loadCollapseState = () => {
  try {
    const variables = getAllVariables();
    const parallelEventsConfig = variables['并行事件UI配置'] || {};
    const savedState = parallelEventsConfig['折叠状态'];

    // 如果用户之前设置过，使用保存的状态；否则默认折叠
    if (savedState !== undefined) {
      isCollapsed.value = savedState === true;
    } else {
      isCollapsed.value = true; // 默认折叠
    }

    console.info('[并行事件UI] 折叠状态已加载:', isCollapsed.value);
  } catch (error) {
    console.warn('[并行事件UI] 加载折叠状态失败，使用默认值:', error);
    isCollapsed.value = true; // 默认折叠
  }
};

// 保存折叠状态
const saveCollapseState = () => {
  try {
    const variables = getAllVariables();
    const parallelEventsConfig = variables['并行事件UI配置'] || {};
    parallelEventsConfig['折叠状态'] = isCollapsed.value;

    insertOrAssignVariables({ 并行事件UI配置: parallelEventsConfig }, { type: 'chat' });

    console.info('[并行事件UI] 折叠状态已保存:', isCollapsed.value);
  } catch (error) {
    console.error('[并行事件UI] 保存折叠状态失败:', error);
  }
};

// 切换折叠状态
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  saveCollapseState();
};

// 获取当前消息ID
const getCurrentMessageId = (): string | null => {
  try {
    const globalAny = window as any;
    if (globalAny.getCurrentMessageId) {
      return globalAny.getCurrentMessageId();
    }
    // 备用方法：从URL获取
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('message_id') || null;
  } catch (error) {
    console.error('[并行事件UI] 获取消息ID失败:', error);
    return null;
  }
};

// 获取聊天消息
const getChatMessages = (messageId: string | null): any[] => {
  try {
    const globalAny = window as any;
    if (globalAny.getChatMessages && messageId) {
      return globalAny.getChatMessages(messageId);
    }
    // 备用方法：从全局变量获取
    if (globalAny.chat && globalAny.chat.messages) {
      return globalAny.chat.messages;
    }
    return [];
  } catch (error) {
    console.error('[并行事件UI] 获取消息失败:', error);
    return [];
  }
};

// 解析并行事件内容
const parseParallelEvents = (content: string): ParallelEvent[] => {
  const parsedEvents: ParallelEvent[] = [];

  // 按行分割
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  for (const line of lines) {
    // 只匹配标准格式：[角色名 | 描述内容]
    // 使用严格的正则表达式，确保格式正确
    const match = line.match(/^\[([^\|\[\]]+)\s*\|\s*(.+)\]$/);
    if (match) {
      const character = match[1].trim();
      const description = match[2].trim();

      // 确保角色名和描述都不为空
      if (character && description) {
        parsedEvents.push({
          character: character,
          description: description,
        });
      }
    }
    // 不再处理其他格式，只接受标准格式 [名字 | 描述]
  }

  return parsedEvents;
};

// 提取并显示并行事件
const extractParallelEvents = () => {
  try {
    // 获取当前消息ID
    const messageId = getCurrentMessageId();

    // 获取当前消息内容
    const messages = getChatMessages(messageId);
    if (messages.length === 0) {
      console.warn('[并行事件UI] 未找到当前消息');
      return;
    }

    const message = messages[0];

    // 获取消息内容
    const messageText = message.message || '';

    // 使用正则表达式提取所有 <parallel> 标签中的内容
    const matches = Array.from(messageText.matchAll(PARALLEL_REGEX));

    if (matches.length > 0) {
      // 取最后一个匹配（最新的并行事件）
      const lastMatch = matches[matches.length - 1];
      const parallelContent = lastMatch[1].trim();

      // 解析事件
      const parsedEvents = parseParallelEvents(parallelContent);
      events.value = parsedEvents;

      console.info('[并行事件UI] 已提取并行事件，数量:', parsedEvents.length);
    } else {
      events.value = [];
      console.info('[并行事件UI] 未找到 <parallel> 标签');
    }
  } catch (error) {
    console.error('[并行事件UI] 提取并行事件时出错:', error);
    events.value = [];
  }
};

// 等待全局函数初始化
const waitForGlobalFunctions = async (maxRetries = 30, interval = 200): Promise<boolean> => {
  const globalAny = window as any;
  for (let i = 0; i < maxRetries; i++) {
    if (typeof globalAny.getChatMessages === 'function' && typeof globalAny.getCurrentMessageId === 'function') {
      console.info(`[并行事件UI] 全局函数已就绪 (第 ${i + 1} 次检查)`);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  console.error('[并行事件UI] 等待全局函数初始化超时');
  return false;
};

onMounted(async () => {
  console.info('[并行事件UI] 组件已加载');
  textColor.value = getSharedTextColor();

  // 等待全局函数初始化
  const functionsReady = await waitForGlobalFunctions();
  if (!functionsReady) {
    console.error('[并行事件UI] 全局函数未就绪，无法提取事件');
    return;
  }

  // 加载折叠状态
  loadCollapseState();

  // 延迟提取，确保消息已加载
  setTimeout(() => {
    extractParallelEvents();
  }, 100);

  // 监听消息更新（如果支持）
  const globalAny = window as any;
  if (globalAny.eventOn) {
    // 监听消息更新事件
    globalAny.eventOn('messageUpdated', () => {
      setTimeout(() => {
        extractParallelEvents();
      }, 100);
    });
  }
});
</script>

<style lang="scss" scoped>
.parallel-events-beautifier {
  width: 100%;
  margin: 0;
  padding: 0;
}

.beautified-events-wrapper {
  position: relative;
  margin: 0 auto;
  padding: 1.5rem;
  border-radius: 1rem;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(180%);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 2px 8px rgba(99, 102, 241, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;

  // 折叠状态：最小化高度
  &.collapsed {
    padding: 0.75rem 1.5rem;

    .events-header {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(99, 102, 241, 0.5) 25%,
      rgba(236, 72, 153, 0.5) 75%,
      transparent 100%
    );
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%);
    border-color: rgba(236, 72, 153, 0.4);
    box-shadow:
      0 12px 48px rgba(0, 0, 0, 0.4),
      0 4px 16px rgba(99, 102, 241, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);

    &::before {
      opacity: 1;
    }

    .gradient-overlay {
      opacity: 0.3;
    }

    .shimmer-effect {
      animation: shimmer 3s infinite;
    }
  }
}

.gradient-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.2) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(236, 72, 153, 0.2) 0%, transparent 50%);
  opacity: 0.2;
  transition: opacity 0.4s ease;
  pointer-events: none;
  z-index: 0;
}

.shimmer-effect {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
  pointer-events: none;
  z-index: 1;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.events-header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  user-select: none;
  transition: all 0.3s ease;

  &:hover {
    opacity: 0.9;

    .collapse-icon {
      transform: scale(1.1);
    }
  }

  i:not(.collapse-icon) {
    color: #6366f1;
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  span:not(.event-count) {
    color: #ffffff;
    font-size: 1.1rem;
    font-weight: 600;
    background: linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #8b5cf6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
    flex: 1;
  }

  .collapse-icon {
    color: #6366f1;
    font-size: 0.9rem;
    margin-left: auto;
    transition: transform 0.3s ease;
    flex-shrink: 0;
  }

  .event-count {
    color: #9ca3af;
    font-size: 0.85rem;
    font-weight: 500;
    flex-shrink: 0;
  }
}

.events-list {
  position: relative;
  z-index: 2;
}

.event-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  transition: all 0.3s ease;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%);
    border-color: rgba(236, 72, 153, 0.3);
    transform: translateX(4px);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.2),
      0 2px 4px rgba(99, 102, 241, 0.2);
  }
}

.event-character {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  i {
    color: #6366f1;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .character-name {
    color: #ec4899;
    font-weight: 600;
    font-size: 0.95rem;
    text-shadow: 0 1px 2px rgba(236, 72, 153, 0.3);
  }
}

.event-description {
  color: var(--shared-text-color, #e5e7eb);
  line-height: 1.6;
  padding-left: 1.5rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.no-events {
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.9rem;
}

// 响应式设计
@media (max-width: 768px) {
  .beautified-events-wrapper {
    padding: 1rem;
    border-radius: 0.75rem;

    &.collapsed {
      padding: 0.5rem 1rem;
    }
  }

  .events-header {
    font-size: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    gap: 0.5rem;

    span:not(.event-count) {
      font-size: 1rem;
    }

    .event-count {
      font-size: 0.8rem;
    }
  }

  .event-item {
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .event-description {
    padding-left: 1.25rem;
    font-size: 0.9rem;
  }
}
</style>
