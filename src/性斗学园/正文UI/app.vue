<template>
  <div class="content-beautifier" :style="containerStyle">
    <div v-if="content" class="beautified-content-wrapper" :style="wrapperStyle">
      <!-- 装饰性渐变背景 -->
      <div class="gradient-overlay"></div>

      <!-- 顶部信息栏 -->
      <div v-if="hasDateInfo" class="info-bar" :style="infoBarStyle">
        <div v-if="dateInfo.日期" class="info-item">
          <i class="fas fa-calendar"></i>
          <span>{{ dateInfo.日期 }}</span>
        </div>
        <div v-if="dateInfo.星期" class="info-item">
          <i class="fas fa-calendar-week"></i>
          <span>{{ formatWeekday(dateInfo.星期) }}</span>
        </div>
        <div v-if="dateInfo.时间" class="info-item">
          <i class="fas fa-clock"></i>
          <span>{{ dateInfo.时间 }}</span>
        </div>
        <div v-if="dateInfo.地点名称" class="info-item">
          <i class="fas fa-map-marker-alt"></i>
          <span>{{ dateInfo.地点名称 }}</span>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="beautified-content" :style="contentStyle" v-html="formattedContent"></div>
    </div>
    <div v-else class="no-content">
      <p>未找到需要美化的内容</p>
    </div>

    <!-- 设置按钮 -->
    <button class="settings-button" title="设置" @click="showSettings = true">
      <i class="fas fa-cog"></i>
    </button>

    <!-- 设置面板 -->
    <Teleport to="body">
      <div v-if="showSettings" class="settings-overlay" @click.self="closeSettings">
        <div class="settings-panel">
          <div class="settings-header">
            <h2>正文美化设置</h2>
            <button class="close-button" @click="closeSettings">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="settings-content">
            <!-- 使用说明 -->
            <div class="help-section">
              <div class="help-icon">
                <i class="fas fa-info-circle"></i>
              </div>
              <div class="help-content">
                <p><strong>使用提示：</strong></p>
                <ul>
                  <li>修改参数后，点击"保存设置"按钮使配置生效</li>
                  <li>所有尺寸单位支持 <code>px</code>、<code>rem</code>、<code>em</code>、<code>%</code> 等CSS单位</li>
                  <li>行高可以使用纯数字（如 1.8）或带单位的值</li>
                  <li>配置会保存到当前聊天，下次打开时会自动加载</li>
                </ul>
              </div>
            </div>

            <div class="setting-item">
              <label>
                <i class="fas fa-text-height"></i>
                字体大小
                <span class="help-tooltip" title="控制正文文字的大小">
                  <i class="fas fa-question-circle"></i>
                </span>
              </label>
              <input v-model="localConfig.字体大小" type="text" placeholder="例如: 1rem, 16px, 1.2em" />
              <div class="setting-hint">
                <i class="fas fa-lightbulb"></i>
                推荐值：<code>1rem</code>（默认）、<code>1.2rem</code>（稍大）、<code>0.9rem</code>（稍小）
                <br />支持单位：px、rem、em、pt
              </div>
            </div>

            <div class="setting-item">
              <label>
                <i class="fas fa-arrows-alt-h"></i>
                正文框宽度
                <span class="help-tooltip" title="控制正文容器的最大宽度">
                  <i class="fas fa-question-circle"></i>
                </span>
              </label>
              <input v-model="localConfig.正文框宽度" type="text" placeholder="例如: 800px, 90%, 100%" />
              <div class="setting-hint">
                <i class="fas fa-lightbulb"></i>
                推荐值：<code>100%</code>（全宽）、<code>800px</code>（固定宽度）、<code>90%</code>（留边距）
                <br />使用百分比可自适应屏幕宽度，使用像素值可固定宽度
              </div>
            </div>

            <div class="setting-item">
              <label>
                <i class="fas fa-text-width"></i>
                字间距
                <span class="help-tooltip" title="控制字符之间的间距">
                  <i class="fas fa-question-circle"></i>
                </span>
              </label>
              <input v-model="localConfig.字间距" type="text" placeholder="例如: 0.05em, 2px, 0.1em" />
              <div class="setting-hint">
                <i class="fas fa-lightbulb"></i>
                推荐值：<code>0.05em</code>（默认）、<code>0.1em</code>（宽松）、<code>0.02em</code>（紧凑）
                <br />使用 <code>em</code> 单位会根据字体大小自动调整，<code>px</code> 为固定值
              </div>
            </div>

            <div class="setting-item">
              <label>
                <i class="fas fa-font"></i>
                字体选择
                <span class="help-tooltip" title="选择正文使用的字体族">
                  <i class="fas fa-question-circle"></i>
                </span>
              </label>
              <select v-model="localConfig.字体选择">
                <option value="system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif">
                  系统默认
                </option>
                <option value="'Microsoft YaHei', '微软雅黑', sans-serif">微软雅黑</option>
                <option value="'SimSun', '宋体', serif">宋体</option>
                <option value="'SimHei', '黑体', sans-serif">黑体</option>
                <option value="'KaiTi', '楷体', serif">楷体</option>
                <option value="'FangSong', '仿宋', serif">仿宋</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Times New Roman', Times, serif">Times New Roman</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="'Fira Code', 'Courier New', monospace">Fira Code</option>
              </select>
              <div class="setting-hint">
                <i class="fas fa-lightbulb"></i>
                选择适合阅读的字体。中文字体推荐：微软雅黑、宋体；英文字体推荐：Georgia、Times New Roman
              </div>
            </div>

            <div class="setting-item">
              <label>
                <i class="fas fa-palette"></i>
                字体颜色
                <span class="help-tooltip" title="控制正文、并行事件、选项与变量更新的文字颜色">
                  <i class="fas fa-question-circle"></i>
                </span>
              </label>
              <div class="color-input-row">
                <input v-model="localConfig.字体颜色" type="color" />
                <input v-model="localConfig.字体颜色" type="text" placeholder="例如: #f3f4f6" />
              </div>
              <div class="setting-hint">
                <i class="fas fa-lightbulb"></i>
                该颜色会保存到角色变量，并同步到正文、并行事件、选项与变量更新 UI。
              </div>
            </div>

            <div class="setting-item">
              <label>
                <i class="fas fa-align-justify"></i>
                行高
                <span class="help-tooltip" title="控制行与行之间的间距，影响阅读舒适度">
                  <i class="fas fa-question-circle"></i>
                </span>
              </label>
              <input v-model="localConfig.行高" type="text" placeholder="例如: 1.8, 2, 1.6" />
              <div class="setting-hint">
                <i class="fas fa-lightbulb"></i>
                推荐值：<code>1.8</code>（默认，舒适阅读）、<code>2</code>（宽松）、<code>1.6</code>（紧凑）
                <br />可以使用纯数字（相对字体大小）或带单位的值（如 <code>24px</code>）
              </div>
            </div>

            <div class="setting-item">
              <label>
                <i class="fas fa-expand-arrows-alt"></i>
                内边距
                <span class="help-tooltip" title="控制正文内容与容器边缘的距离">
                  <i class="fas fa-question-circle"></i>
                </span>
              </label>
              <input v-model="localConfig.内边距" type="text" placeholder="例如: 2rem, 24px, 1.5rem" />
              <div class="setting-hint">
                <i class="fas fa-lightbulb"></i>
                推荐值：<code>2rem</code>（默认）、<code>1.5rem</code>（紧凑）、<code>3rem</code>（宽松）
                <br />控制正文四周的留白，影响阅读体验和视觉效果
              </div>
            </div>
          </div>

          <div class="settings-footer">
            <button class="reset-button" @click="resetConfig"><i class="fas fa-undo"></i> 重置为默认</button>
            <button class="save-button" @click="saveConfig"><i class="fas fa-save"></i> 保存设置</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getLatestMvuData } from '../shared/mvuStore';
import { DEFAULT_TEXT_COLOR, getTextAppearanceConfig, saveTextAppearanceConfig } from '../shared/textAppearance';

// 原生实现的 get 函数
function get<T = any>(obj: any, path: string, defaultValue?: T): T {
  if (!obj || !path) return defaultValue as T;
  const keys = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  let result: any = obj;
  for (const key of keys) {
    if (result == null) return defaultValue as T;
    result = result[key];
  }
  return result === undefined ? (defaultValue as T) : result;
}

const content = ref<string>('');
const showSettings = ref(false);

// 日期和地点信息
interface DateInfo {
  日期?: string;
  星期?: number;
  时间?: string;
  地点名称?: string;
}

const dateInfo = ref<DateInfo>({});

// 检查是否有日期信息
const hasDateInfo = computed(() => {
  return !!(dateInfo.value.日期 || dateInfo.value.星期 || dateInfo.value.时间 || dateInfo.value.地点名称);
});

// 格式化星期
const formatWeekday = (weekday: number): string => {
  const weekdays = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return weekdays[weekday] || `周${weekday}`;
};

// 加载MVU变量信息
const loadMvuInfo = async () => {
  try {
    const mvuData = await getLatestMvuData();
    if (!mvuData || !mvuData.stat_data) {
      console.warn('[正文美化] 无法获取 MVU 数据');
      return;
    }

    const statData = mvuData.stat_data;

    dateInfo.value = {
      日期: get(statData, '时间系统.日期'),
      星期: get(statData, '时间系统.星期'),
      时间: get(statData, '时间系统.时间'),
      地点名称: get(statData, '位置系统.地点名称'),
    };

    console.info('[正文美化] MVU 信息已加载:', dateInfo.value);
  } catch (error) {
    console.warn('[正文美化] 加载 MVU 信息失败:', error);
  }
};

// 配置选项（从酒馆变量获取，带默认值）
interface ContentBeautifierConfig {
  字体大小?: string;
  正文框宽度?: string;
  字间距?: string;
  字体选择?: string;
  字体颜色?: string;
  行高?: string;
  内边距?: string;
}

const defaultConfig: ContentBeautifierConfig = {
  字体大小: '1.2rem',
  正文框宽度: '100%',
  字间距: '0.05em',
  字体选择: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  字体颜色: DEFAULT_TEXT_COLOR,
  行高: '1.8',
  内边距: '2rem',
};

const config = ref<ContentBeautifierConfig>({ ...defaultConfig });
const localConfig = ref<ContentBeautifierConfig>({ ...defaultConfig });

// 加载配置
const loadConfig = () => {
  try {
    const beautifierConfig = getTextAppearanceConfig();

    config.value = {
      字体大小: beautifierConfig['字体大小'] || defaultConfig.字体大小,
      正文框宽度: beautifierConfig['正文框宽度'] || defaultConfig.正文框宽度,
      字间距: beautifierConfig['字间距'] || defaultConfig.字间距,
      字体选择: beautifierConfig['字体选择'] || defaultConfig.字体选择,
      字体颜色: beautifierConfig['字体颜色'] || defaultConfig.字体颜色,
      行高: beautifierConfig['行高'] || defaultConfig.行高,
      内边距: beautifierConfig['内边距'] || defaultConfig.内边距,
    };

    // 同步到本地配置
    localConfig.value = { ...config.value };

    console.info('[正文美化] 配置已加载:', config.value);
  } catch (error) {
    console.warn('[正文美化] 加载配置失败，使用默认值:', error);
    localConfig.value = { ...defaultConfig };
  }
};

// 保存配置
const saveConfig = () => {
  try {
    // 更新当前配置
    config.value = { ...localConfig.value };

    // 保存到角色变量，供正文、并行事件、选项与变量更新 UI 共同读取
    saveTextAppearanceConfig(localConfig.value);

    console.info('[正文美化] 配置已保存:', config.value);

    // 关闭设置面板
    showSettings.value = false;

    // 显示成功提示
    if (typeof toastr !== 'undefined') {
      toastr.success('设置已保存', '正文美化');
    }
  } catch (error) {
    console.error('[正文美化] 保存配置失败:', error);
    if (typeof toastr !== 'undefined') {
      toastr.error('保存失败，请重试', '正文美化');
    }
  }
};

// 重置配置
const resetConfig = () => {
  localConfig.value = { ...defaultConfig };
  if (typeof toastr !== 'undefined') {
    toastr.info('已重置为默认值', '正文美化');
  }
};

// 关闭设置面板
const closeSettings = () => {
  // 恢复为当前配置
  localConfig.value = { ...config.value };
  showSettings.value = false;
};

// 计算样式
const containerStyle = computed(() => ({
  width: '100%',
  margin: '0',
  padding: '0',
}));

const wrapperStyle = computed(() => ({
  maxWidth: config.value.正文框宽度,
  margin: '0 auto',
}));

const contentStyle = computed(() => {
  const paddingValue = config.value.内边距 || '2rem';

  return {
    fontSize: config.value.字体大小,
    letterSpacing: config.value.字间距,
    fontFamily: config.value.字体选择,
    color: config.value.字体颜色 || DEFAULT_TEXT_COLOR,
    lineHeight: config.value.行高,
    padding: paddingValue,
    paddingTop: hasDateInfo.value ? '1.5rem' : paddingValue, // 如果有信息栏，增加顶部内边距以与分隔线保持距离
  };
});

// 信息栏样式（与正文内容内边距一致）
const infoBarStyle = computed(() => {
  const paddingValue = config.value.内边距 || '2rem';

  return {
    paddingLeft: paddingValue,
    paddingRight: paddingValue,
    paddingTop: paddingValue,
    paddingBottom: '0.75rem',
  };
});

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatPlainTextSegment = (text: string, className?: string): string => {
  const escaped = escapeHtml(text).replace(/\n/g, '<br>');
  if (!className) return escaped;
  return `<span class="${className}">${escaped}</span>`;
};

const applySpecialTextFormatting = (text: string): string => {
  const parts: string[] = [];
  const pattern = /\*\*([\s\S]+?)\*\*|\*([^*\n]+?)\*|“([\s\S]+?)”|"([^"\n]+?)"/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      parts.push(formatPlainTextSegment(text.slice(lastIndex, matchIndex)));
    }

    const innerMonologue = match[1] ?? match[2];
    if (innerMonologue !== undefined) {
      parts.push(formatPlainTextSegment(innerMonologue, 'xuedou-inner-monologue'));
    } else {
      parts.push(formatPlainTextSegment(match[0], 'xuedou-dialogue-text'));
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(formatPlainTextSegment(text.slice(lastIndex)));
  }

  return parts.join('');
};

// 格式化内容，保留换行
const formattedContent = computed(() => {
  if (!content.value) return '';

  // 检查内容是否已经包含HTML标签
  const hasHtmlTags = /<[^>]+>/.test(content.value);

  if (hasHtmlTags) {
    // 如果已经包含HTML，将换行符转换为 <br>（但不在HTML标签内）
    // 使用更简单的方法：在非HTML标签的换行处插入 <br>
    return content.value.replace(/\n(?!\s*<)/g, '<br>');
  } else {
    // 如果是纯文本，转义HTML特殊字符，并识别对话/内心戏标记
    return applySpecialTextFormatting(content.value);
  }
});

// 清理思维链标签及其之前的内容
const cleanThinkingTags = (text: string): string => {
  // 匹配各种思维链标签的结束标签，只保留标签之后的内容
  // 支持的标签：</think>, </thinking>, </reasoning>, </think>, </thought>, </chain_of_thought> 等
  // 匹配结束标签（以 </ 开头）或自闭合标签
  const thinkingTagPatterns = [
    /<\/redacted_reasoning>/gi,
    /<\/reasoning>/gi,
    /<\/thinking>/gi,
    /<\/think>/gi,
    /<\/thought>/gi,
    /<\/chain_of_thought>/gi,
    /<\/chain>/gi,
    /<\/analysis>/gi,
    /<\/reflection>/gi,
    /<\/think_nya~>/gi,
  ];

  // 查找最后一个思维链结束标签的位置
  let lastIndex = -1;

  for (const pattern of thinkingTagPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const endIndex = match.index! + match[0].length;
      if (endIndex > lastIndex) {
        lastIndex = endIndex;
      }
    }
  }

  // 如果找到了思维链标签，只保留标签之后的内容
  if (lastIndex > 0) {
    const cleaned = text.substring(lastIndex).trim();
    // 如果清理后内容为空或只有空白，返回原始内容（可能是误匹配）
    if (cleaned.length > 0) {
      return cleaned;
    }
  }

  return text;
};

// 提取并显示内容
const extractContent = () => {
  try {
    // 获取当前消息ID
    const messageId = getCurrentMessageId();

    // 获取当前消息内容
    const messages = getChatMessages(messageId);
    if (messages.length === 0) {
      console.warn('[正文美化] 未找到当前消息');
      return;
    }

    const message = messages[0];

    // 获取格式化后的消息内容（应用了酒馆正则后的内容）
    // 因为前端界面是通过正则表达式替换加载的，所以需要获取原始消息内容
    const messageText = message.message;

    // 使用正则表达式提取最后一个 <content> 标签中的内容
    // 这样可以跳过思维链中可能出现的 <content> 标签
    const regex = /[\s\S]*?<content>([\s\S]*?)<\/content>/;
    const match = messageText.match(regex);

    if (match && match[1]) {
      // 清理思维链标签及其之前的内容
      let extractedContent = match[1].trim();
      extractedContent = cleanThinkingTags(extractedContent);

      content.value = extractedContent;
      console.info('[正文美化] 已提取内容，长度:', extractedContent.length);
    } else {
      content.value = ''; // 清空内容，避免显示旧内容
      console.info('[正文美化] 未找到 <content> 标签');
    }
  } catch (error) {
    console.error('[正文美化] 提取内容时出错:', error);
  }
};

onMounted(() => {
  console.info('[正文美化] 组件已加载');

  // 加载配置
  loadConfig();

  // 加载MVU信息
  loadMvuInfo();

  // 延迟提取，确保消息已加载
  setTimeout(() => {
    extractContent();
  }, 100);

  // 监听MVU变量更新事件
  const globalAny = window as any;
  if (globalAny.Mvu && globalAny.eventOn) {
    globalAny.eventOn(globalAny.Mvu.events.VARIABLE_UPDATE_ENDED, () => {
      setTimeout(() => {
        loadMvuInfo();
      }, 100);
    });
  }
});
</script>

<style lang="scss" scoped>
.content-beautifier {
  width: 100%;
  margin: 0;
  padding: 0;
}

// 顶部信息栏（融合在正文容器内）
.info-bar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-evenly; // 均匀分布，充分利用宽度
  padding: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-wrap: wrap;
  background: transparent;
  gap: 1rem; // 作为最小间距的备用

  .info-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #e5e7eb;
    font-size: 0.9rem;
    font-weight: 500;
    flex: 1 1 auto; // 允许增长和收缩，但保持自动基础大小
    min-width: 0; // 允许收缩到内容以下
    justify-content: center; // 内容居中对齐，配合 space-evenly 使用

    i {
      color: #6366f1;
      width: 1rem;
      text-align: center;
      flex-shrink: 0;
    }

    span {
      color: #f3f4f6;
      white-space: nowrap;
    }
  }

  // 分隔线 - 使用伪元素在信息项之间创建分隔
  .info-item:not(:last-child) {
    position: relative;

    &::after {
      content: '';
      position: absolute;
      right: calc(-0.5rem - 0.5px); // 位于信息项右侧，考虑 gap
      top: 50%;
      transform: translateY(-50%);
      width: 1px;
      height: 1.25rem;
      background: rgba(255, 255, 255, 0.2);
    }
  }

  // 小屏幕时改为单列布局
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 0.75rem;

    .info-item {
      flex: none;
      width: 100%;
      justify-content: flex-start;

      &::after {
        display: none; // 小屏幕时隐藏分隔线
      }
    }
  }
}

.beautified-content-wrapper {
  position: relative;
  margin: 0 auto;
  padding: 0;
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

.beautified-content {
  position: relative;
  z-index: 2;
  color: inherit;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);

  :deep(p) {
    margin: 1rem 0;
    color: inherit;
    text-align: justify;
    word-wrap: break-word;
    word-break: break-word;

    &:first-child {
      margin-top: 0;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }

  // 保留换行和空格
  word-wrap: break-word;
  overflow-wrap: break-word;

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    margin: 1rem 0 0.75rem 0;
    color: #ffffff;
    font-weight: 600;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h1) {
    font-size: 2rem;
    font-weight: 700;
    margin: 1.5rem 0 1rem 0;
    background: linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #8b5cf6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
    letter-spacing: 0.02em;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h2) {
    font-size: 1.5rem;
    font-weight: 600;
    color: #ec4899;
    text-shadow: 0 1px 3px rgba(236, 72, 153, 0.3);
    margin: 1.25rem 0 0.75rem 0;
    letter-spacing: 0.01em;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h3) {
    font-size: 1.25rem;
    font-weight: 600;
    color: #8b5cf6;
    text-shadow: 0 1px 2px rgba(139, 92, 246, 0.3);
    margin: 1rem 0 0.5rem 0;
    letter-spacing: 0.01em;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(strong),
  :deep(b) {
    color: #ec4899;
    font-weight: 600;
  }

  :deep(em),
  :deep(i) {
    color: #8b5cf6;
    font-style: italic;
  }

  :deep(.xuedou-dialogue-text) {
    color: #8ea2ff;
    font-weight: 600;
    text-shadow: 0 1px 4px rgba(99, 102, 241, 0.35);
  }

  :deep(.xuedou-inner-monologue) {
    color: #a8a8ad;
    font-style: italic;
    font-weight: 500;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  }

  :deep(a) {
    color: #6366f1;
    text-decoration: none;
    border-bottom: 1px solid rgba(99, 102, 241, 0.3);
    transition: all 0.2s ease;

    &:hover {
      color: #ec4899;
      border-bottom-color: rgba(236, 72, 153, 0.5);
    }
  }

  :deep(ul),
  :deep(ol) {
    margin: 0.75rem 0;
    padding-left: 1.5rem;
    color: inherit;
  }

  :deep(li) {
    margin: 0.5rem 0;
  }

  :deep(blockquote) {
    margin: 1.5rem 0;
    padding: 1.25rem 1.75rem;
    border-left: 4px solid;
    border-image: linear-gradient(180deg, #6366f1 0%, #ec4899 100%) 1;
    background: linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, rgba(236, 72, 153, 0.1) 100%);
    border-radius: 0.75rem;
    color: #cbd5e1;
    font-style: italic;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    position: relative;

    &::before {
      content: '"';
      position: absolute;
      top: 0.5rem;
      left: 1rem;
      font-size: 3rem;
      color: rgba(99, 102, 241, 0.3);
      font-family: serif;
      line-height: 1;
    }
  }

  :deep(code) {
    padding: 0.25rem 0.6rem;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(99, 102, 241, 0.2) 100%);
    border-radius: 0.5rem;
    color: #ec4899;
    font-family: 'Fira Code', 'Courier New', 'Consolas', monospace;
    font-size: 0.9em;
    border: 1px solid rgba(236, 72, 153, 0.2);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  :deep(pre) {
    margin: 1.5rem 0;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.5) 0%, rgba(30, 30, 50, 0.6) 100%);
    border-radius: 0.75rem;
    overflow-x: auto;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.3),
      0 4px 8px rgba(0, 0, 0, 0.2);
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, #6366f1 0%, #ec4899 100%);
      border-radius: 0.75rem 0.75rem 0 0;
    }

    code {
      padding: 0;
      background: none;
      color: #e5e7eb;
      border: none;
      box-shadow: none;
    }
  }

  :deep(hr) {
    margin: 2rem 0;
    border: none;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(99, 102, 241, 0.5) 25%,
      rgba(236, 72, 153, 0.5) 75%,
      transparent 100%
    );
    border-radius: 1px;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 0.75rem;
    margin: 1.5rem 0;
    box-shadow:
      0 8px 16px rgba(0, 0, 0, 0.3),
      0 2px 4px rgba(99, 102, 241, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition:
      transform 0.3s ease,
      box-shadow 0.3s ease;

    &:hover {
      transform: scale(1.02);
      box-shadow:
        0 12px 24px rgba(0, 0, 0, 0.4),
        0 4px 8px rgba(99, 102, 241, 0.3);
    }
  }
}

.no-content {
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.9rem;
}

// 设置按钮
.settings-button {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(236, 72, 153, 0.9) 100%);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 4px 12px rgba(99, 102, 241, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;

  &:hover {
    transform: scale(1.1) rotate(90deg);
    box-shadow:
      0 6px 16px rgba(99, 102, 241, 0.5),
      0 4px 8px rgba(0, 0, 0, 0.3);
    background: linear-gradient(135deg, rgba(99, 102, 241, 1) 0%, rgba(236, 72, 153, 1) 100%);
  }

  &:active {
    transform: scale(0.95) rotate(90deg);
  }
}

// 设置面板遮罩
.settings-overlay {
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
  z-index: 2000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

// 设置面板
.settings-panel {
  background: linear-gradient(135deg, rgba(30, 30, 50, 0.95) 0%, rgba(20, 20, 40, 0.95) 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 1.5rem;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 8px 24px rgba(99, 102, 241, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px) saturate(180%);
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .close-button {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #e5e7eb;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      transform: rotate(90deg);
    }
  }
}

.settings-content {
  padding: 2rem;
}

// 帮助说明区域
.help-section {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 0.75rem;
  border-left: 4px solid #6366f1;

  .help-icon {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%);
    border-radius: 50%;
    color: #6366f1;
    font-size: 1.1rem;
  }

  .help-content {
    flex: 1;
    color: #d1d5db;
    font-size: 0.9rem;
    line-height: 1.6;

    p {
      margin: 0 0 0.5rem 0;
      color: #e5e7eb;

      strong {
        color: #ec4899;
      }
    }

    ul {
      margin: 0;
      padding-left: 1.25rem;
      list-style: none;

      li {
        position: relative;
        padding-left: 1.25rem;
        margin-bottom: 0.4rem;

        &::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #6366f1;
          font-weight: bold;
        }
      }
    }

    code {
      padding: 0.15rem 0.4rem;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 0.25rem;
      color: #ec4899;
      font-size: 0.85em;
      font-family: 'Courier New', monospace;
    }
  }
}

.setting-item {
  margin-bottom: 2rem;

  label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
    color: #e5e7eb;
    font-weight: 500;
    font-size: 0.95rem;

    i {
      color: #6366f1;
      width: 1.2rem;
    }

    .help-tooltip {
      margin-left: auto;
      color: #9ca3af;
      cursor: help;
      transition: color 0.2s ease;

      &:hover {
        color: #6366f1;
      }
    }
  }

  input,
  select {
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 0.5rem;
    color: #f3f4f6;
    font-size: 0.95rem;
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: rgba(99, 102, 241, 0.5);
      background: rgba(255, 255, 255, 0.08);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    &::placeholder {
      color: #9ca3af;
    }
  }

  select {
    cursor: pointer;

    option {
      background: #1e293b;
      color: #f3f4f6;
    }
  }

  .color-input-row {
    display: grid;
    grid-template-columns: 3.25rem 1fr;
    gap: 0.75rem;
    align-items: center;

    input[type='color'] {
      min-width: 3.25rem;
      height: 2.75rem;
      padding: 0.25rem;
      cursor: pointer;
    }
  }

  .setting-hint {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: rgba(99, 102, 241, 0.05);
    border-left: 3px solid rgba(99, 102, 241, 0.3);
    border-radius: 0.375rem;
    color: #cbd5e1;
    font-size: 0.85rem;
    line-height: 1.6;

    i {
      color: #fbbf24;
      margin-right: 0.5rem;
    }

    code {
      padding: 0.1rem 0.3rem;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 0.25rem;
      color: #ec4899;
      font-size: 0.9em;
      font-family: 'Courier New', monospace;
    }

    br {
      margin-top: 0.25rem;
    }
  }
}

.settings-footer {
  display: flex;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);

  button {
    flex: 1;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: none;

    i {
      font-size: 0.9rem;
    }
  }

  .reset-button {
    background: rgba(255, 255, 255, 0.1);
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, 0.2);

    &:hover {
      background: rgba(255, 255, 255, 0.15);
      color: white;
    }
  }

  .save-button {
    background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);

    &:hover {
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  }
}
</style>
