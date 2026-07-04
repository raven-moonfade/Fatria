import { compare } from 'compare-versions';

export const SCRIPT_VERSION = '3.3.3';
export const SCRIPT_UPDATE_EVENT = 'fatria-script-update-status';

const UPDATE_MANIFEST_URL =
  'https://raw.githubusercontent.com/vincentrong2005/Fatria/main/src/%E6%80%A7%E6%96%97%E5%AD%A6%E5%9B%AD/%E6%80%A7%E6%96%97%E5%AD%A6%E5%9B%AD%E8%84%9A%E6%9C%AC/update-manifest.json';
const UPDATE_CHECK_STORAGE_KEY = 'fatria-sex-battle-academy-script-update-v2';
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface ScriptUpdateManifest {
  version: string;
  changelog?: string[];
}

export interface ScriptUpdateState {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  status: 'idle' | 'checking' | 'available' | 'latest' | 'error';
  message: string;
  checkedAt?: number;
  manifest?: ScriptUpdateManifest;
}

interface ScriptUpdateCache {
  lastCheckedAt?: number;
  latestVersion?: string;
  dismissedVersion?: string;
  manifest?: ScriptUpdateManifest;
}

interface CheckScriptUpdateOptions {
  force?: boolean;
  silent?: boolean;
  prompt?: boolean;
}

const globalAny = globalThis as any;

let scriptUpdateState: ScriptUpdateState = {
  currentVersion: SCRIPT_VERSION,
  latestVersion: SCRIPT_VERSION,
  hasUpdate: false,
  status: 'idle',
  message: '尚未检查更新。',
};
let updateCheckScheduled = false;

export function getScriptUpdateState(): ScriptUpdateState {
  return cloneState(scriptUpdateState);
}

export function scheduleScriptUpdateCheck(delayMs = 4000): void {
  if (updateCheckScheduled) return;
  updateCheckScheduled = true;
  window.setTimeout(() => {
    void checkScriptUpdate({ force: true, prompt: true, silent: true });
  }, delayMs);
}

export function registerScriptUpdateGlobals(): void {
  globalAny.__fatriaScriptUpdater = {
    currentVersion: SCRIPT_VERSION,
    check: checkScriptUpdate,
    showGuide: showScriptUpdateGuide,
    getState: getScriptUpdateState,
  };
}

export async function checkScriptUpdate(options: CheckScriptUpdateOptions = {}): Promise<ScriptUpdateState> {
  const cache = readUpdateCache();
  const now = Date.now();
  if (!options.force && cache.lastCheckedAt && now - cache.lastCheckedAt < UPDATE_CHECK_INTERVAL_MS) {
    applyCachedUpdateState(cache);
    const state = getScriptUpdateState();
    if (state.hasUpdate && state.manifest) {
      notifyAvailableScriptUpdate(state.manifest, cache, options);
    }
    return state;
  }

  setScriptUpdateState({
    status: 'checking',
    message: '正在检查脚本更新...',
  });

  try {
    const manifest = await fetchUpdateManifest();
    const latestVersion = normalizeVersion(manifest.version);
    const hasUpdate = compare(SCRIPT_VERSION, latestVersion, '<');

    writeUpdateCache({
      ...cache,
      lastCheckedAt: now,
      latestVersion,
      manifest,
    });

    setScriptUpdateState({
      latestVersion,
      hasUpdate,
      status: hasUpdate ? 'available' : 'latest',
      message: hasUpdate
        ? `发现新版本 v${latestVersion}，请清除浏览器缓存后刷新浏览器。（帖子内标注也有只刷新单个脚本缓存的办法）`
        : `当前已是最新版 v${SCRIPT_VERSION}。`,
      checkedAt: now,
      manifest,
    });

    if (hasUpdate) {
      notifyAvailableScriptUpdate(manifest, cache, options);
    } else if (!options.silent && options.force) {
      notifySuccess(`当前已是最新版 v${SCRIPT_VERSION}。`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '检查更新失败';
    setScriptUpdateState({
      status: 'error',
      hasUpdate: false,
      message,
    });
    if (!options.silent) {
      notifyError(message);
    }
    console.warn('[性斗学园脚本] 检查脚本更新失败:', error);
  }

  return getScriptUpdateState();
}

export function showScriptUpdateGuide(manifestOverride?: ScriptUpdateManifest): void {
  const manifest = manifestOverride ?? scriptUpdateState.manifest;
  if (!manifest) {
    window.alert('尚未读取到更新信息。请先点击“检查更新”。');
    return;
  }

  window.alert(buildUpdateGuideText(manifest));
  writeUpdateCache({
    ...readUpdateCache(),
    dismissedVersion: normalizeVersion(manifest.version),
  });
}

function promptScriptUpdateGuide(manifest: ScriptUpdateManifest): void {
  const latestVersion = normalizeVersion(manifest.version);
  const confirmed = window.confirm(
    `发现性斗学园脚本新版本 v${latestVersion}。\n\n当前运行版本：v${SCRIPT_VERSION}\n\n是否查看清除浏览器缓存的方法？`,
  );
  if (confirmed) {
    showScriptUpdateGuide(manifest);
    return;
  }

  writeUpdateCache({
    ...readUpdateCache(),
    dismissedVersion: latestVersion,
  });
}

function notifyAvailableScriptUpdate(
  manifest: ScriptUpdateManifest,
  cache: ScriptUpdateCache,
  options: CheckScriptUpdateOptions,
): void {
  const latestVersion = normalizeVersion(manifest.version);
  if (options.prompt && cache.dismissedVersion !== latestVersion) {
    promptScriptUpdateGuide(manifest);
    return;
  }

  if (!options.silent) {
    notifyInfo(`发现脚本新版本 v${latestVersion}，请清除浏览器缓存后重新加载。`);
  }
}

async function fetchUpdateManifest(): Promise<ScriptUpdateManifest> {
  const response = await fetch(UPDATE_MANIFEST_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`读取更新清单失败：HTTP ${response.status}`);
  }

  const manifest = (await response.json()) as Partial<ScriptUpdateManifest>;
  return normalizeManifest(manifest);
}

function normalizeManifest(manifest: Partial<ScriptUpdateManifest>): ScriptUpdateManifest {
  const version = normalizeVersion(manifest.version);
  if (!version) {
    throw new Error('更新清单缺少 version。');
  }
  return {
    version,
    changelog: Array.isArray(manifest.changelog) ? manifest.changelog.map(safeString).filter(Boolean) : [],
  };
}

function applyCachedUpdateState(cache: ScriptUpdateCache): void {
  const latestVersion = normalizeVersion(cache.latestVersion || SCRIPT_VERSION) || SCRIPT_VERSION;
  const hasUpdate = compare(SCRIPT_VERSION, latestVersion, '<');
  setScriptUpdateState({
    latestVersion,
    hasUpdate,
    status: hasUpdate ? 'available' : 'latest',
    message: hasUpdate
      ? `发现新版本 v${latestVersion}，请清除浏览器缓存后重新加载脚本。`
      : `当前已是最新版 v${SCRIPT_VERSION}。`,
    checkedAt: cache.lastCheckedAt,
    manifest: cache.manifest ?? (hasUpdate ? { version: latestVersion, changelog: [] } : undefined),
  });
}

function normalizeVersion(version: unknown): string {
  return safeString(version).replace(/^v/i, '');
}

function buildUpdateGuideText(manifest: ScriptUpdateManifest): string {
  const latestVersion = normalizeVersion(manifest.version);
  const changelog = manifest.changelog?.filter(Boolean).slice(0, 6) ?? [];
  const changelogText = changelog.length > 0 ? `\n\n更新内容：\n${changelog.map(item => `- ${item}`).join('\n')}` : '';
  return [
    `性斗学园脚本已有新版本 v${latestVersion}。`,
    '',
    `当前运行版本：v${SCRIPT_VERSION}`,
    '',
    '这次不会自动改写角色卡脚本内容。',
    '如果你的脚本条目是外链 import，请清除浏览器缓存后刷新酒馆页面，让浏览器重新加载 GitHub/CDN 上的新脚本。',
    '',
    '常用处理方法：',
    '1. 在浏览器里强制刷新当前页面。',
    '2. 如果仍然是旧版，清除该站点缓存后重新打开酒馆。',
    '3. 若使用 jsDelivr 分支链接且 CDN 仍未刷新，请稍等缓存更新，或临时改用带版本号/commit 的链接。',
    changelogText,
  ].join('\n');
}

function setScriptUpdateState(patch: Partial<ScriptUpdateState>): void {
  scriptUpdateState = {
    ...scriptUpdateState,
    ...patch,
    currentVersion: SCRIPT_VERSION,
  };
  window.dispatchEvent(new CustomEvent(SCRIPT_UPDATE_EVENT, { detail: getScriptUpdateState() }));
}

function cloneState(state: ScriptUpdateState): ScriptUpdateState {
  return {
    ...state,
    manifest: state.manifest
      ? {
          ...state.manifest,
          changelog: [...(state.manifest.changelog ?? [])],
        }
      : undefined,
  };
}

function readUpdateCache(): ScriptUpdateCache {
  try {
    const raw = window.localStorage?.getItem(UPDATE_CHECK_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ScriptUpdateCache;
    return {
      lastCheckedAt: Number.isFinite(Number(parsed.lastCheckedAt)) ? Number(parsed.lastCheckedAt) : undefined,
      latestVersion: normalizeVersion(parsed.latestVersion),
      dismissedVersion: normalizeVersion(parsed.dismissedVersion),
      manifest: parsed.manifest ? normalizeManifest(parsed.manifest) : undefined,
    };
  } catch {
    return {};
  }
}

function writeUpdateCache(cache: ScriptUpdateCache): void {
  try {
    window.localStorage?.setItem(UPDATE_CHECK_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // 更新缓存失败不影响脚本本体使用。
  }
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function notifyInfo(message: string): void {
  if (typeof toastr !== 'undefined') {
    toastr.info(message, '性斗学园脚本更新');
  }
}

function notifySuccess(message: string): void {
  if (typeof toastr !== 'undefined') {
    toastr.success(message, '性斗学园脚本更新');
  }
}

function notifyError(message: string): void {
  if (typeof toastr !== 'undefined') {
    toastr.error(message, '性斗学园脚本更新');
  }
}
