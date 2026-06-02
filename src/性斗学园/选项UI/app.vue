<template>
  <div class="option-beautifier" :style="textColorStyle">
    <div v-if="options.length > 0" class="options-container">
      <div
        v-for="(option, index) in options"
        :key="index"
        class="option-card"
        :class="{
          'option-card-hover': true,
          'option-card-fight': option.isFight,
        }"
        @click="option.isFight ? triggerFight() : selectOption(option.text)"
      >
        <!-- 性斗按钮特殊显示 -->
        <div v-if="option.isFight" class="fight-button-content">
          <div class="fight-button-text">【发起性斗】</div>
        </div>

        <!-- 普通选项显示 -->
        <template v-else>
          <!-- 选项标签 -->
          <div class="option-label">
            {{ option.label }}
          </div>

          <!-- 选项内容 -->
          <div class="option-content">
            {{ option.text }}
          </div>

          <!-- 点击提示 -->
          <div class="option-hint">
            <i class="fas fa-mouse-pointer"></i>
            点击选择
          </div>
        </template>
      </div>
    </div>
    <div v-else class="no-options">
      <p>{{ emptyState.title }}</p>
      <small v-if="emptyState.detail">{{ emptyState.detail }}</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getLatestMvuData } from '../shared/mvuStore';
import { getSharedTextColor } from '../shared/textAppearance';

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

interface OptionItem {
  label: string;
  text: string;
  isFight?: boolean; // 标记是否为性斗选项（E.开头）
}

const options = ref<OptionItem[]>([]);
const enemyName = ref('');
const textColor = ref(getSharedTextColor());
const emptyReason = ref<'none' | 'no-options-pattern' | 'missing-enemy-name' | 'no-option-tag' | 'no-message'>('none');
const textColorStyle = computed(() => ({
  '--shared-text-color': textColor.value,
}));
const emptyState = computed(() => {
  switch (emptyReason.value) {
    case 'missing-enemy-name':
      return {
        title: '未读取到性斗对手',
        detail: '已匹配到“发起性斗”选项，但缺少变量：性斗系统.对手名称。',
      };
    case 'no-options-pattern':
      return {
        title: '未匹配到 A/B/C/D 选项',
        detail: '请确认 <option> 内使用了 A.、A、A) 或 (A) 这类选项格式。',
      };
    case 'no-option-tag':
      return {
        title: '未找到 <option> 标签',
        detail: '当前消息中没有可供选项 UI 解析的 <option>...</option> 内容。',
      };
    case 'no-message':
      return {
        title: '未找到当前消息',
        detail: '选项 UI 暂时无法读取当前楼层内容。',
      };
    default:
      return {
        title: '未找到选项内容',
        detail: '',
      };
  }
});

const loadEnemyNameFromMvu = async () => {
  try {
    const mvuData = await getLatestMvuData();
    const name = get(mvuData, 'stat_data.性斗系统.对手名称', '');
    enemyName.value = typeof name === 'string' ? name.trim() : '';
  } catch (error) {
    console.error('[选项美化] 获取对手名称失败:', error);
    enemyName.value = '';
  }
};

// 解析选项文本
const parseOptions = (text: string): OptionItem[] => {
  const items: OptionItem[] = [];
  const optionText = text.replace(/<option_analysis\b[^>]*>[\s\S]*?<\/option_analysis>/gi, '');

  // 按行分割
  const lines = optionText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  for (const line of lines) {
    // 特殊处理：E. 开头的选项为性斗选项
    if (line.match(/^E\.\s*(.+)$/i)) {
      const match = line.match(/^E\.\s*(.+)$/i);
      if (match) {
        items.push({
          label: 'E',
          text: match[1].trim(),
          isFight: true,
        });
        continue; // 跳过后续匹配
      }
    }

    // 匹配选项格式：
    // 1. A. 文本
    // 2. A、文本
    // 3. A) 文本
    // 4. (A) 文本
    let match = line.match(/^([A-Z])\.\s*(.+)$/);
    if (!match) {
      match = line.match(/^([A-Z])、\s*(.+)$/);
    }
    if (!match) {
      match = line.match(/^([A-Z])\)\s*(.+)$/);
    }
    if (!match) {
      match = line.match(/^\(([A-Z])\)\s*(.+)$/);
    }

    if (match) {
      items.push({
        label: match[1],
        text: match[2].trim(),
      });
    }
  }

  // 如果没有匹配到标准格式，尝试按序号分割
  if (items.length === 0) {
    // 尝试匹配数字序号：1. 2. 3. 等
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const numMatch = line.match(/^(\d+)\.\s*(.+)$/);
      if (numMatch) {
        // 将数字转换为字母（1->A, 2->B, 3->C...）
        const num = parseInt(numMatch[1]);
        const label = String.fromCharCode(64 + num); // 65是'A'的ASCII码
        items.push({
          label: label,
          text: numMatch[2].trim(),
        });
      }
    }
  }

  return items;
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
    console.error('[选项美化] 获取消息ID失败:', error);
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
    console.error('[选项美化] 获取消息失败:', error);
    return [];
  }
};

// 提取并显示选项
const extractOptions = () => {
  try {
    emptyReason.value = 'none';

    // 获取当前消息ID
    const messageId = getCurrentMessageId();

    // 获取当前消息内容
    const messages = getChatMessages(messageId);
    if (messages.length === 0) {
      console.warn('[选项美化] 未找到当前消息');
      options.value = [];
      emptyReason.value = 'no-message';
      return;
    }

    const message = messages[0];
    const messageText = message.message;

    // 使用正则表达式提取 <option> 标签中的内容
    const regex = /<option>([\s\S]*?)<\/option>/;
    const match = messageText.match(regex);

    if (match && match[1]) {
      const optionText = match[1].trim();
      const parsedOptions = parseOptions(optionText);
      const hasFightOption = parsedOptions.some(option => option.isFight);
      options.value = parsedOptions;
      if (!enemyName.value) {
        options.value = options.value.filter(o => !o.isFight);
      }
      if (options.value.length === 0) {
        emptyReason.value = hasFightOption && !enemyName.value ? 'missing-enemy-name' : 'no-options-pattern';
        console.warn('[选项美化] 无可显示选项:', emptyReason.value);
      }
      console.info('[选项美化] 已提取选项，数量:', options.value.length);
    } else {
      console.info('[选项美化] 未找到 <option> 标签');
      options.value = [];
      emptyReason.value = 'no-option-tag';
    }
  } catch (error) {
    console.error('[选项美化] 提取选项时出错:', error);
  }
};

// 触发性斗（使用 /sendas 命令生成一个包含 <fight> 的角色消息楼层，不触发自动回复）
const triggerFight = () => {
  try {
    const parentWindow = window.parent;
    const parentAny = parentWindow as any;
    const $parent = parentAny.$ || parentAny.jQuery;

    if (!$parent) {
      console.warn('[选项美化] 无法访问父窗口的jQuery');
      return;
    }

    // 获取当前角色信息
    const getCharacterInfo = () => {
      // 方法1：从 chat 对象获取
      if (parentAny.chat) {
        const chat = parentAny.chat;
        if (chat.characters && chat.characters.length > 0) {
          return {
            name: chat.characters[0].name || chat.characters[0].title || 'Assistant',
            avatar: chat.characters[0].avatar || '',
          };
        }
        if (chat.character) {
          return {
            name: chat.character.name || chat.character.title || 'Assistant',
            avatar: chat.character.avatar || '',
          };
        }
      }

      // 方法2：从全局变量获取
      if (parentAny.character) {
        return {
          name: parentAny.character.name || parentAny.character.title || 'Assistant',
          avatar: parentAny.character.avatar || '',
        };
      }

      // 方法3：从当前消息中获取角色名
      if (parentAny.chat && parentAny.chat.messages && parentAny.chat.messages.length > 0) {
        const lastMessage = parentAny.chat.messages[parentAny.chat.messages.length - 1];
        if (lastMessage && lastMessage.name && !lastMessage.is_user) {
          return {
            name: lastMessage.name,
            avatar: lastMessage.avatar || '',
          };
        }
      }

      // 默认值
      return {
        name: 'Assistant',
        avatar: '',
      };
    };

    const charInfo = getCharacterInfo();

    // 方法1：尝试使用 SillyTavern 的命令执行器
    if (parentAny.executeSlashCommand && typeof parentAny.executeSlashCommand === 'function') {
      // 构建 /sendas 命令
      const command = `/sendas name="${charInfo.name}"${charInfo.avatar ? ` avatar="${charInfo.avatar}"` : ''} <fight>`;
      parentAny.executeSlashCommand(command);
      console.info('[选项美化] 已通过 executeSlashCommand 执行 /sendas 命令');
      return;
    }

    // 方法2：通过输入框执行命令（不触发自动回复）
    const inputSelectors = [
      '#send_textarea',
      'textarea[name="send_textarea"]',
      '.send_textarea',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="消息"]',
      '.chat-input textarea',
      '#chat-input textarea',
    ];

    let $input: JQuery | null = null;
    for (const selector of inputSelectors) {
      const $candidate = $parent(selector) as JQuery;
      if ($candidate.length > 0) {
        $input = $candidate;
        break;
      }
    }

    if (!$input || $input.length === 0) {
      console.warn('[选项美化] 未找到输入框，无法执行 /sendas 命令');
      return;
    }

    // 构建 /sendas 命令字符串
    let command = `/sendas name="${charInfo.name}"`;
    if (charInfo.avatar) {
      command += ` avatar="${charInfo.avatar}"`;
    }
    command += ' <fight>';

    // 设置输入框的值
    $input.val(command);

    // 触发 input 和 change 事件
    $input.trigger('input');
    $input.trigger('change');

    // 等待一小段时间确保命令已设置
    setTimeout(() => {
      // 查找发送按钮并点击（这会执行命令但不会触发AI生成）
      const sendButtonSelectors = [
        '#send_but',
        'button[type="submit"]',
        '.send-button',
        'button.send',
        '[data-send-button]',
        'button[aria-label*="Send"]',
        'button[aria-label*="发送"]',
      ];

      let $sendButton: JQuery | null = null;
      for (const selector of sendButtonSelectors) {
        const $candidate = $parent(selector) as JQuery;
        if ($candidate.length > 0 && !$candidate.prop('disabled')) {
          $sendButton = $candidate;
          break;
        }
      }

      if ($sendButton && $sendButton.length > 0) {
        // 点击发送按钮执行命令
        $sendButton.trigger('click');
        console.info('[选项美化] 已通过发送按钮执行 /sendas 命令');
      } else {
        // 如果找不到发送按钮，尝试触发 Enter 键
        const inputElement = $input[0] as HTMLElement;
        if (inputElement) {
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          });
          inputElement.dispatchEvent(enterEvent);
          console.info('[选项美化] 已通过Enter键执行 /sendas 命令');
        }
      }
    }, 50);
  } catch (error) {
    console.error('[选项美化] 触发性斗时出错:', error);
  }
};

// 选择选项并复制到输入框
const selectOption = (optionText: string) => {
  try {
    // 使用 window.parent 访问父窗口
    const parentWindow = window.parent;
    const $parent = (parentWindow as any).$ || (parentWindow as any).jQuery;

    if (!$parent) {
      console.warn('[选项美化] 无法访问父窗口的jQuery');
      return;
    }

    // 查找输入框（尝试多种选择器）
    const inputSelectors = [
      '#send_textarea',
      'textarea[name="send_textarea"]',
      '.send_textarea',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="消息"]',
      '.chat-input textarea',
      '#chat-input textarea',
    ];

    let $input: JQuery | null = null;
    for (const selector of inputSelectors) {
      const $candidate = $parent(selector) as JQuery;
      if ($candidate.length > 0) {
        $input = $candidate;
        break;
      }
    }

    if ($input && $input.length > 0) {
      // 设置输入框的值
      $input.val(optionText);

      // 触发 input 事件，确保 Vue/React 等框架能检测到变化
      $input.trigger('input');
      $input.trigger('change');

      // 聚焦输入框
      $input.focus();

      console.info('[选项美化] 已选择选项:', optionText);
    } else {
      console.warn('[选项美化] 未找到输入框');

      // 如果找不到输入框，尝试使用剪贴板API
      if (navigator.clipboard) {
        navigator.clipboard.writeText(optionText).catch(() => {
          console.warn('[选项美化] 复制到剪贴板失败');
        });
      }
    }
  } catch (error) {
    console.error('[选项美化] 选择选项时出错:', error);
  }
};

// 等待全局函数初始化
const waitForGlobalFunctions = async (maxRetries = 30, interval = 200): Promise<boolean> => {
  const globalAny = window as any;
  for (let i = 0; i < maxRetries; i++) {
    if (typeof globalAny.getChatMessages === 'function' && typeof globalAny.getCurrentMessageId === 'function') {
      console.info(`[选项美化] 全局函数已就绪 (第 ${i + 1} 次检查)`);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  console.error('[选项美化] 等待全局函数初始化超时');
  return false;
};

onMounted(async () => {
  console.info('[选项美化] 组件已加载');
  textColor.value = getSharedTextColor();

  // 等待全局函数初始化
  const functionsReady = await waitForGlobalFunctions();
  if (!functionsReady) {
    console.error('[选项美化] 全局函数未就绪，无法提取选项');
    return;
  }

  await loadEnemyNameFromMvu();

  // 提取选项并带重试机制
  const extractWithRetry = async (retries = 5, delay = 200) => {
    for (let i = 0; i < retries; i++) {
      await new Promise(resolve => setTimeout(resolve, delay));
      extractOptions();
      if (options.value.length > 0) {
        console.info('[选项美化] 成功提取选项，重试次数:', i);
        return;
      }
      // 逐渐增加延迟
      delay = Math.min(delay * 1.5, 1000);
    }
    console.warn('[选项美化] 多次重试后仍未找到选项');
  };

  extractWithRetry();
});
</script>

<style lang="scss" scoped>
.option-beautifier {
  width: 100%;
  margin: 0;
  padding: 0;
}

.options-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding: 1rem 0;

  // 性斗选项独占一行，宽度为两倍
  .option-card-fight {
    grid-column: 1 / -1; // 跨越所有列
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%) !important;
    border-color: rgba(239, 68, 68, 0.4) !important;
    background-image:
      radial-gradient(circle at 20% 30%, rgba(239, 68, 68, 0.2) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(220, 38, 38, 0.2) 0%, transparent 50%) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 1.5rem 2rem !important;

    &::before {
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(239, 68, 68, 0.6) 25%,
        rgba(220, 38, 38, 0.6) 75%,
        transparent 100%
      ) !important;
    }

    &:hover {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.25) 100%) !important;
      background-image:
        radial-gradient(circle at 20% 30%, rgba(239, 68, 68, 0.35) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(220, 38, 38, 0.35) 0%, transparent 50%) !important;
      border-color: rgba(239, 68, 68, 0.7) !important;
      box-shadow:
        0 12px 40px rgba(239, 68, 68, 0.5),
        0 6px 20px rgba(220, 38, 38, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
      transform: translateY(-3px) scale(1.02) !important;

      .fight-button-text {
        transform: scale(1.05);
        text-shadow:
          0 0 15px rgba(239, 68, 68, 1),
          0 2px 6px rgba(0, 0, 0, 0.6),
          0 0 30px rgba(239, 68, 68, 0.6);
      }
    }

    &:active {
      transform: translateY(-1px) scale(1) !important;
    }
  }

  // 性斗按钮内容区域
  .fight-button-content {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem 0;
  }

  .fight-button-text {
    color: #ffffff;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-align: center;
    text-shadow:
      0 0 10px rgba(239, 68, 68, 0.8),
      0 2px 4px rgba(0, 0, 0, 0.5),
      0 0 20px rgba(239, 68, 68, 0.4);
    background: linear-gradient(135deg, #ffffff 0%, #fee2e2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    position: relative;

    // 添加发光效果
    &::before {
      content: '【发起性斗】';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      color: rgba(239, 68, 68, 0.3);
      filter: blur(8px);
      z-index: -1;
    }
  }
}

.option-card {
  position: relative;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px) saturate(180%);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.2),
    0 2px 4px rgba(99, 102, 241, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 1rem;

  // 渐变背景装饰
  background-image:
    radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.15) 0%, transparent 50%);

  // 装饰性渐变背景
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(99, 102, 241, 0.6) 25%,
      rgba(236, 72, 153, 0.6) 75%,
      transparent 100%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  // 闪烁效果
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
    transition: left 0.5s ease;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(236, 72, 153, 0.18) 100%);
    background-image:
      radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.25) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.25) 0%, transparent 50%);
    border-color: rgba(236, 72, 153, 0.4);
    box-shadow:
      0 6px 24px rgba(0, 0, 0, 0.3),
      0 2px 8px rgba(99, 102, 241, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);

    &::before {
      opacity: 1;
    }

    &::after {
      left: 100%;
    }

    .option-label {
      background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
    }

    .option-content {
      color: var(--shared-text-color, #f3f4f6);
    }

    .option-hint {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.2),
      0 1px 2px rgba(99, 102, 241, 0.15);
  }
}

.option-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(236, 72, 153, 0.4) 100%);
  border: 2px solid rgba(99, 102, 241, 0.5);
  border-radius: 50%;
  color: #ffffff;
  font-weight: 700;
  font-size: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 2px 8px rgba(99, 102, 241, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.option-content {
  flex: 1;
  color: var(--shared-text-color, #e5e7eb);
  font-size: 0.95rem;
  line-height: 1.6;
  text-align: left;
  word-wrap: break-word;
  transition: color 0.3s ease;
  letter-spacing: 0.01em;
}

.option-hint {
  display: none;
  align-items: center;
  gap: 0.5rem;
  color: rgba(236, 72, 153, 0.8);
  font-size: 0.8rem;
  font-weight: 500;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s ease;
  flex-shrink: 0;

  i {
    font-size: 0.85rem;
  }
}

.no-options {
  padding: 3rem 2rem;
  text-align: center;
  color: #9ca3af;
  font-size: 1rem;

  p {
    margin: 0;
  }

  small {
    display: block;
    margin-top: 0.5rem;
    color: rgba(156, 163, 175, 0.78);
    font-size: 0.85rem;
    line-height: 1.5;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .options-container {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .option-card {
    padding: 0.875rem 1rem;
  }

  .option-label {
    width: 2rem;
    height: 2rem;
    font-size: 0.9rem;
  }

  .option-content {
    font-size: 0.9rem;
  }
}
</style>
