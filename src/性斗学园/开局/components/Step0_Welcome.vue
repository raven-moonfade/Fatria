<template>
  <div class="animate-slide-up space-y-6">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-xl font-bold text-white">环境监测</h3>
          <p class="mt-1 text-xs text-gray-400">开局前自动确认酒馆助手、提示词模板与 MVU 变量环境。</p>
        </div>
        <button
          class="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-gray-100 transition hover:border-white/20 hover:bg-white/15"
          type="button"
          :disabled="isChecking"
          @click="runEnvironmentCheck"
        >
          <i :class="['fas', isChecking ? 'fa-spinner animate-spin' : 'fa-rotate-right', 'mr-2']"></i>
          重新检测
        </button>
      </div>

      <div class="space-y-3">
        <div
          v-for="item in environmentChecks"
          :key="item.id"
          class="flex gap-3 rounded-xl border p-3"
          :class="statusClass(item.status)"
        >
          <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/20">
            <i :class="['fas', statusIcon(item.status)]"></i>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-white">{{ item.label }}</span>
              <span class="text-xs" :class="statusTextClass(item.status)">{{ statusText(item.status) }}</span>
            </div>
            <div class="mt-1 text-xs leading-relaxed text-gray-300">{{ item.detail }}</div>
          </div>
        </div>
      </div>

      <div
        v-if="environmentSummary"
        class="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-3 text-xs text-yellow-100"
      >
        {{ environmentSummary }}
      </div>
    </div>

    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <h3 class="mb-3 text-xl font-bold text-white">温馨提示</h3>
      <div class="space-y-4 text-sm leading-relaxed text-gray-200">
        <p>你好，这里是前端作者“𝒱𝒾𝓃 ”，本卡由“芙芙可爱捏”，“𝒱𝒾𝓃”与“114514·Remilia”共同创作，仅在类脑与旅程免费发布/更新。</p>
        <div class="flex flex-col gap-2">
          <a
            class="text-secondary decoration-secondary/40 underline underline-offset-4 hover:decoration-secondary"
            href="https://discord.com/channels/1134557553011998840/1423668401422729452"
            target="_blank"
            rel="noreferrer"
          >
            类脑发布帖
          </a>
          <a
            class="text-secondary decoration-secondary/40 underline underline-offset-4 hover:decoration-secondary"
            href="https://discord.com/channels/1291925535324110879/1415162247139037304"
            target="_blank"
            rel="noreferrer"
          >
            旅程发布帖
          </a>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <h3 class="mb-3 text-xl font-bold text-white">已测试模型/预设</h3>
      <div class="space-y-2 text-sm text-gray-200">
        <div>Claude opus 4.6: Ny/Mur鹿鹿预设</div>
        <div>Gemini 3.1 pro: Izumi</div>
      </div>
    </div>

    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <h3 class="mb-3 text-xl font-bold text-white">游玩前请确保</h3>
      <div class="space-y-2 text-sm text-gray-200">
        <div class="text-base">
          1. 酒馆助手与提示词模板已安装并更新到<span class="font-bold text-red-400">最新版本</span>
        </div>
        <div>2. 酒馆助手渲染已开启且小白x渲染已关闭</div>
        <div>3. 开梯子！开梯子！开梯子！</div>
        <div>4. 世界书有COT，请自行缝进预设，帖子内看标注有教程，不行去答疑区问。</div>
      </div>
    </div>

    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <h3 class="mb-3 text-xl font-bold text-white">问答（不看就问我打死你！）</h3>
      <div class="space-y-4 text-sm leading-relaxed text-gray-200">
        <div>
          <div class="font-semibold text-white">Q: 我为什么看不到前端？</div>
          <div>
            A: 如果你确保开了梯子的话，那就是你网络太差了。去正则把 正文UI/并行事件UI/选项UI/变量更新UI/战斗UI/开局美化
            一共6个正则关闭，并拉到局部正则最下面开启对应的6个备用正则。
          </div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 我为什么找不到状态栏？</div>
          <div>A: 状态栏现在通过屏幕上的小手机悬浮球开启，拖到顺手的位置后会记住。</div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 世界书好多灰色条目，需要开吗？</div>
          <div>A: 别动，不需要开。</div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 不同的难度有什么影响？会不会很难啊？</div>
          <div>A: 难度直接影响开局点数，升级所需经验与敌人数值，会直接大幅度影响体验。</div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 我为什么无法进入性斗？我需要从哪里进入性斗？</div>
          <div>
            A:
            请确保你的选项UI的外观与其他UI一致，如果不一致就说明你的正则冲突了，其他的选项正则把我的正则覆盖掉了，请自行寻找查找正则表达式带&lt;option&gt;的全局/预设正则并关闭。（正文UI同理，但正文UI没那么重要）
          </div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 为什么我看不到立绘/cg？</div>
          <div>A: 所有立绘与cg皆在性斗中查看，部分角色暂无cg。想知道哪些角色有cg可以自行在对应帖子下查找。</div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 为什么明明AI更新了xxx变量，我却没有在状态栏中看到？</div>
          <div>
            A: 绝大部分变量不由AI管理也不能管理，皆有脚本操控。对于目前AI可影响的变量请自行查看“Zod 变量结构”脚本。
          </div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 为什么AI说的和我的状态栏不一样？</div>
          <div>A: 以状态栏为主，AI会口胡。</div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 更新后需要重开吗？</div>
          <div>A: 不需要，只需要重新读取一遍初始变量即可。</div>
        </div>

        <div class="pt-2 text-gray-300">如果你已经阅读完毕，欢迎进入下一页。</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { compare } from 'compare-versions';
import { computed, onMounted, ref } from 'vue';

type CheckStatus = 'checking' | 'pass' | 'fail' | 'warn';

type EnvironmentCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

const REQUIRED_TAVERN_HELPER_VERSION = '4.8.4';
const isChecking = ref(false);
const environmentChecks = ref<EnvironmentCheck[]>([
  {
    id: 'tavern-helper',
    label: '酒馆助手版本',
    status: 'checking',
    detail: `需要酒馆助手版本大于 ${REQUIRED_TAVERN_HELPER_VERSION}。`,
  },
  {
    id: 'prompt-template',
    label: '提示词模板',
    status: 'checking',
    detail: '正在检测提示词模板插件是否安装并开启渲染。',
  },
  {
    id: 'mvu',
    label: 'MVU 脚本',
    status: 'checking',
    detail: '正在检测 MVU 脚本是否开启，并确认已读取性斗学园初始变量。',
  },
]);

const environmentSummary = computed(() => {
  if (isChecking.value) {
    return '';
  }
  const failed = environmentChecks.value.filter(item => item.status === 'fail');
  if (failed.length === 0) {
    return '';
  }
  return `检测到 ${failed.length} 项环境异常，请先修正后再继续开局。`;
});

function updateCheck(id: string, patch: Partial<EnvironmentCheck>) {
  environmentChecks.value = environmentChecks.value.map(item => (item.id === id ? { ...item, ...patch } : item));
}

function statusIcon(status: CheckStatus): string {
  if (status === 'pass') return 'fa-check';
  if (status === 'fail') return 'fa-xmark';
  if (status === 'warn') return 'fa-triangle-exclamation';
  return 'fa-spinner animate-spin';
}

function statusText(status: CheckStatus): string {
  if (status === 'pass') return '通过';
  if (status === 'fail') return '未通过';
  if (status === 'warn') return '需确认';
  return '检测中';
}

function statusClass(status: CheckStatus): string {
  if (status === 'pass') return 'border-green-400/25 bg-green-500/10';
  if (status === 'fail') return 'border-red-400/25 bg-red-500/10';
  if (status === 'warn') return 'border-yellow-400/25 bg-yellow-500/10';
  return 'border-white/10 bg-black/10';
}

function statusTextClass(status: CheckStatus): string {
  if (status === 'pass') return 'text-green-300';
  if (status === 'fail') return 'text-red-300';
  if (status === 'warn') return 'text-yellow-300';
  return 'text-gray-300';
}

async function runEnvironmentCheck() {
  isChecking.value = true;
  environmentChecks.value = environmentChecks.value.map(item => ({ ...item, status: 'checking' }));

  await Promise.all([checkTavernHelperVersion(), checkPromptTemplate(), checkMvu()]);
  isChecking.value = false;
}

async function checkTavernHelperVersion() {
  try {
    const globalAny = window as any;
    const versionGetter = globalAny.getTavernHelperVersion;
    if (typeof versionGetter !== 'function') {
      updateCheck('tavern-helper', {
        status: 'fail',
        detail: '未检测到 getTavernHelperVersion，请确认酒馆助手已安装并启用。',
      });
      return;
    }

    const version = String(await versionGetter());
    const isCompatible = compare(version, REQUIRED_TAVERN_HELPER_VERSION, '>');
    updateCheck('tavern-helper', {
      status: isCompatible ? 'pass' : 'fail',
      detail: isCompatible
        ? `当前版本 ${version}，满足 > ${REQUIRED_TAVERN_HELPER_VERSION}。`
        : `当前版本 ${version}，需要升级到大于 ${REQUIRED_TAVERN_HELPER_VERSION}。`,
    });
  } catch (error) {
    updateCheck('tavern-helper', {
      status: 'fail',
      detail: `酒馆助手版本读取失败：${formatError(error)}`,
    });
  }
}

async function checkPromptTemplate() {
  try {
    const globalAny = window as any;
    await waitGlobal(globalAny, 'EjsTemplate');

    const template = globalAny.EjsTemplate;
    if (!template || typeof template.getFeatures !== 'function') {
      updateCheck('prompt-template', {
        status: 'fail',
        detail: '未检测到提示词模板插件 EjsTemplate，请确认插件已安装。',
      });
      return;
    }

    const features = template.getFeatures();
    const enabled = Boolean(features?.enabled);
    const renderEnabled = Boolean(features?.render_enabled);
    updateCheck('prompt-template', {
      status: enabled && renderEnabled ? 'pass' : 'fail',
      detail:
        enabled && renderEnabled
          ? '提示词模板已安装，插件与楼层渲染均已开启。'
          : `提示词模板已安装，但${enabled ? '' : '插件未开启'}${!enabled && !renderEnabled ? '，且' : ''}${
              renderEnabled ? '' : '楼层渲染未开启'
            }。`,
    });
  } catch (error) {
    updateCheck('prompt-template', {
      status: 'fail',
      detail: `提示词模板检测失败：${formatError(error)}`,
    });
  }
}

async function checkMvu() {
  try {
    const globalAny = window as any;
    await waitGlobal(globalAny, 'Mvu');

    const mvu = globalAny.Mvu;
    if (!mvu || typeof mvu.getMvuData !== 'function') {
      updateCheck('mvu', {
        status: 'fail',
        detail: '未检测到 MVU 全局对象，请确认 MVU 脚本已安装并开启。',
      });
      return;
    }

    const mvuData = mvu.getMvuData({ type: 'message', message_id: 'latest' });
    const initializedLorebooks = Object.keys(mvuData?.initialized_lorebooks ?? {});
    const statData = mvuData?.stat_data ?? {};
    const hasSexBattleVars =
      initializedLorebooks.includes('性斗学园') ||
      Boolean(statData?.角色基础 || statData?.核心状态 || statData?.性斗系统);

    updateCheck('mvu', {
      status: hasSexBattleVars ? 'pass' : 'warn',
      detail: hasSexBattleVars
        ? 'MVU 脚本已开启，并已检测到性斗学园变量数据。'
        : 'MVU 脚本已开启，但未检测到性斗学园初始变量；请重新读取初始变量或确认“变量结构”脚本已启用。',
    });
  } catch (error) {
    updateCheck('mvu', {
      status: 'fail',
      detail: `MVU 检测失败：${formatError(error)}`,
    });
  }
}

async function waitGlobal(globalAny: any, key: string) {
  if (typeof globalAny.waitGlobalInitialized === 'function') {
    try {
      await Promise.race([
        globalAny.waitGlobalInitialized(key),
        new Promise(resolve => {
          setTimeout(resolve, 3000);
        }),
      ]);
    } catch (error) {
      console.warn(`[开局环境监测] 等待 ${key} 初始化时出现异常:`, error);
    }
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

onMounted(() => {
  void runEnvironmentCheck();
});
</script>
