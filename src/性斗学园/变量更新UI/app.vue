<template>
  <div class="variable-update-beautifier" :style="textColorStyle">
    <div v-if="updateContent" class="update-container">
      <div class="update-card" :class="{ 'is-expanded': isExpanded }">
        <!-- 折叠栏头部 -->
        <div class="update-header" @click="toggleExpand">
          <div class="header-left">
            <div class="expand-icon" :class="{ rotated: isExpanded }">
              <i class="fas fa-chevron-down"></i>
            </div>
            <div class="header-title">
              <i class="fas fa-sync-alt"></i>
              <span>变量更新</span>
            </div>
          </div>
          <div class="header-badge">
            <i class="fas fa-code"></i>
          </div>
        </div>

        <!-- 折叠内容 -->
        <div class="update-content" v-show="isExpanded">
          <div class="content-wrapper" v-html="formattedContent"></div>
        </div>
      </div>
    </div>
    <div v-else class="no-update">
      <p>未找到变量更新内容</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getSharedTextColor } from '../shared/textAppearance';

const updateContent = ref<string>('');
const isExpanded = ref(false);
const textColor = ref(getSharedTextColor());
const textColorStyle = computed(() => ({
  '--shared-text-color': textColor.value,
}));

// 格式化内容
const formattedContent = computed(() => {
  if (!updateContent.value) return '';

  let content = updateContent.value;

  // 处理 <Analysis> 标签
  content = content.replace(/<Analysis>([\s\S]*?)<\/Analysis>/gi, (match, analysisContent) => {
    return `
        <div class="analysis-section">
          <div class="section-header">
            <i class="fas fa-search"></i>
            <span>分析</span>
          </div>
          <div class="section-content">
            ${formatAnalysisContent(analysisContent.trim())}
          </div>
        </div>
      `;
  });

  // 处理 <JSONPatch> 标签
  content = content.replace(/<JSONPatch>([\s\S]*?)<\/JSONPatch>/gi, (match, jsonContent) => {
    return `
        <div class="jsonpatch-section">
          <div class="section-header">
            <i class="fas fa-code"></i>
            <span> 变量更新代码 </span>
          </div>
          <div class="section-content">
            ${formatJSONContent(jsonContent.trim())}
          </div>
        </div>
      `;
  });

  return content;
});

// 格式化分析内容
const formatAnalysisContent = (content: string): string => {
  // 转义HTML
  let formatted = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 处理列表项（以 - 开头）
  formatted = formatted.replace(/^- (.+)$/gm, '<div class="analysis-item">• $1</div>');

  // 处理子列表项（以   - 开头，有缩进）
  formatted = formatted.replace(/^  - (.+)$/gm, '<div class="analysis-subitem">  • $1</div>');

  // 恢复换行
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
};

// 格式化JSON内容
const formatJSONContent = (content: string): string => {
  try {
    // 尝试解析JSON
    const json = JSON.parse(content);
    // 格式化JSON
    const formatted = JSON.stringify(json, null, 2);

    // 高亮JSON语法
    return highlightJSON(formatted);
  } catch (error) {
    // 如果解析失败，直接显示原始内容
    return `<pre class="json-error">${escapeHTML(content)}</pre>`;
  }
};

// 高亮JSON语法
const highlightJSON = (json: string): string => {
  let highlighted = escapeHTML(json);

  // 先高亮操作类型（特殊处理）
  highlighted = highlighted.replace(
    /"op"\s*:\s*"([^"]+)"/g,
    '<span class="json-key">"op"</span>: <span class="json-op">"$1"</span>',
  );

  // 高亮键名（但不包括已经处理过的 "op"）
  highlighted = highlighted.replace(/"([^"]+)"\s*:/g, (match, key) => {
    if (key === 'op') return match; // 跳过已处理的 op
    return `<span class="json-key">"${key}"</span>:`;
  });

  // 高亮字符串值（值部分）
  highlighted = highlighted.replace(/:\s*"([^"]+)"/g, ': <span class="json-string">"$1"</span>');

  // 高亮数组中的字符串
  highlighted = highlighted.replace(/\[\s*"([^"]+)"\s*\]/g, '[<span class="json-string">"$1"</span>]');
  highlighted = highlighted.replace(/"([^"]+)",/g, '<span class="json-string">"$1"</span>,');

  // 高亮数字
  highlighted = highlighted.replace(/:\s*(\d+)/g, ': <span class="json-number">$1</span>');

  // 高亮布尔值
  highlighted = highlighted.replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>');

  // 高亮null
  highlighted = highlighted.replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');

  return `<pre class="json-code">${highlighted}</pre>`;
};

// 转义HTML
const escapeHTML = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// 切换展开/折叠
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
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
    console.error('[变量更新] 获取消息ID失败:', error);
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
    console.error('[变量更新] 获取消息失败:', error);
    return [];
  }
};

// 提取并显示更新内容
const extractUpdateContent = () => {
  try {
    // 获取当前消息ID
    const messageId = getCurrentMessageId();

    // 获取当前消息内容
    const messages = getChatMessages(messageId);
    if (messages.length === 0) {
      console.warn('[变量更新] 未找到当前消息');
      return;
    }

    const message = messages[0];
    const messageText = message.message;

    // 使用正则表达式提取所有 <UpdateVariable> 或 <update> 标签中的内容
    // 匹配最后一个标签（跳过思维链中的标签）
    const regexUpdateVariable = /<UpdateVariable>([\s\S]*?)<\/UpdateVariable>/gi;
    const regexUpdate = /<update>([\s\S]*?)<\/update>/gi;

    // 分别匹配两种标签
    const matchesUpdateVariable = Array.from(messageText.matchAll(regexUpdateVariable));
    const matchesUpdate = Array.from(messageText.matchAll(regexUpdate));

    // 合并所有匹配，并记录每个匹配的位置
    const allMatches: Array<{ content: string; index: number }> = [];

    matchesUpdateVariable.forEach(match => {
      if (match.index !== undefined) {
        allMatches.push({ content: match[1], index: match.index });
      }
    });

    matchesUpdate.forEach(match => {
      if (match.index !== undefined) {
        allMatches.push({ content: match[1], index: match.index });
      }
    });

    // 按位置排序，取最后一个匹配（最新的变量更新）
    if (allMatches.length > 0) {
      allMatches.sort((a, b) => a.index - b.index);
      const lastMatch = allMatches[allMatches.length - 1];
      const updateVariableContent = lastMatch.content.trim();

      // 只提取 <Analysis> 和 <JSONPatch> 部分
      let extractedContent = '';

      // 提取 Analysis 部分
      const analysisMatch = updateVariableContent.match(/<Analysis>([\s\S]*?)<\/Analysis>/i);
      if (analysisMatch && analysisMatch[1]) {
        extractedContent += `<Analysis>${analysisMatch[1].trim()}</Analysis>\n\n`;
      }

      // 提取 JSONPatch 部分
      const jsonPatchMatch = updateVariableContent.match(/<JSONPatch>([\s\S]*?)<\/JSONPatch>/i);
      if (jsonPatchMatch && jsonPatchMatch[1]) {
        extractedContent += `<JSONPatch>${jsonPatchMatch[1].trim()}</JSONPatch>`;
      }

      if (extractedContent.trim()) {
        updateContent.value = extractedContent.trim();
        console.info('[变量更新] 已提取更新内容，长度:', updateContent.value.length);
      } else {
        updateContent.value = '';
        console.info('[变量更新] 未找到 <Analysis> 或 <JSONPatch> 标签');
      }
    } else {
      updateContent.value = '';
      console.info('[变量更新] 未找到 <UpdateVariable> 或 <update> 标签');
    }
  } catch (error) {
    console.error('[变量更新] 提取内容时出错:', error);
    updateContent.value = '';
  }
};

// 等待全局函数初始化
const waitForGlobalFunctions = async (maxRetries = 30, interval = 200): Promise<boolean> => {
  const globalAny = window as any;
  for (let i = 0; i < maxRetries; i++) {
    if (typeof globalAny.getChatMessages === 'function' && typeof globalAny.getCurrentMessageId === 'function') {
      console.info(`[变量更新] 全局函数已就绪 (第 ${i + 1} 次检查)`);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  console.error('[变量更新] 等待全局函数初始化超时');
  return false;
};

onMounted(async () => {
  console.info('[变量更新] 组件已加载');
  textColor.value = getSharedTextColor();

  // 等待全局函数初始化
  const functionsReady = await waitForGlobalFunctions();
  if (!functionsReady) {
    console.error('[变量更新] 全局函数未就绪，无法提取内容');
    return;
  }

  // 延迟提取，确保消息已加载
  setTimeout(() => {
    extractUpdateContent();
  }, 100);
});
</script>

<style lang="scss" scoped>
.variable-update-beautifier {
  width: 100%;
  margin: 0;
  padding: 0;
}

.update-container {
  margin: 1rem 0;
}

.update-card {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.75rem;
  overflow: hidden;
  backdrop-filter: blur(20px) saturate(180%);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.2),
    0 2px 4px rgba(99, 102, 241, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  background-image:
    radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.15) 0%, transparent 50%);

  &.is-expanded {
    border-color: rgba(236, 72, 153, 0.3);
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.3),
      0 4px 8px rgba(99, 102, 241, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }
}

.update-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .expand-icon {
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6366f1;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &.rotated {
      transform: rotate(180deg);
    }
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #e5e7eb;
    font-weight: 600;
    font-size: 1rem;

    i {
      color: #6366f1;
    }
  }

  .header-badge {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%);
    border-radius: 50%;
    color: #6366f1;
    font-size: 0.9rem;
  }
}

.update-content {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.content-wrapper {
  color: var(--shared-text-color, #e5e7eb);
  font-size: 0.95rem;
  line-height: 1.7;

  :deep(.analysis-section),
  :deep(.jsonpatch-section) {
    margin-bottom: 1.5rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(.section-header) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid rgba(99, 102, 241, 0.3);
    color: #ec4899;
    font-weight: 600;
    font-size: 1rem;

    i {
      color: #6366f1;
    }
  }

  :deep(.section-content) {
    color: var(--shared-text-color, #d1d5db);
  }

  :deep(.analysis-item) {
    margin: 0.1rem 0;
    padding-left: 1rem;
    color: var(--shared-text-color, #e5e7eb);
    line-height: 1;
  }

  :deep(.analysis-subitem) {
    margin: 0.15rem 0;
    padding-left: 2rem;
    color: var(--shared-text-color, #cbd5e1);
    font-size: 0.9em;
    line-height: 1.4;
  }

  :deep(.json-code) {
    margin: 0.75rem 0;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 0.5rem;
    overflow-x: auto;
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-family: 'Fira Code', 'Courier New', 'Consolas', monospace;
    font-size: 0.85rem;
    line-height: 1.6;

    .json-key {
      color: #6366f1;
      font-weight: 600;
    }

    .json-string {
      color: #10b981;
    }

    .json-number {
      color: #f59e0b;
    }

    .json-boolean {
      color: #ec4899;
    }

    .json-null {
      color: #9ca3af;
    }

    .json-op {
      color: #8b5cf6;
      font-weight: 600;
    }
  }

  :deep(.json-error) {
    margin: 0.75rem 0;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 0.5rem;
    color: #fca5a5;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    white-space: pre-wrap;
  }
}

.no-update {
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.9rem;

  p {
    margin: 0;
  }
}
</style>
