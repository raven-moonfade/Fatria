<template>
  <div v-if="isVisible" class="status-bar-overlay" @click.self="close">
    <div class="status-bar-container" @click.stop>
      <div class="phone-device">
        <div class="phone-frame" :class="phoneFrameClasses" :style="phoneStyle">
          <div class="phone-wallpaper" :style="wallpaperLayerStyle">
            <img v-if="customWallpaperSrc" class="phone-wallpaper-image" :src="customWallpaperSrc" alt="" />
          </div>
          <div class="phone-tint"></div>

          <button
            v-if="currentPage === 'home'"
            class="phone-exit-button"
            type="button"
            title="退出"
            aria-label="退出状态栏"
            @click="close"
          >
            <i class="fas fa-power-off"></i>
          </button>

          <main class="phone-screen" :class="{ 'phone-screen-app': currentPage !== 'home' }">
            <section v-if="currentPage === 'home'" class="home-screen">
              <div class="home-widgets">
                <button class="home-widget time-widget" type="button" @click="setPage('dashboard')">
                  <span class="widget-main">{{ currentTime }}</span>
                  <span class="widget-sub">{{ currentDate }}</span>
                </button>
                <button class="home-widget location-widget" type="button" @click="setPage('map')">
                  <span class="widget-main">{{ currentLocation }}</span>
                  <span class="widget-sub">{{ currentCoordinate }}</span>
                </button>
              </div>

              <div class="app-grid">
                <button
                  v-for="app in homeApps"
                  :key="app.page"
                  class="phone-app"
                  type="button"
                  @click="setPage(app.page)"
                >
                  <span class="app-icon" :class="app.colorClass">
                    <i :class="app.icon"></i>
                  </span>
                  <span class="app-label">{{ app.label }}</span>
                </button>
              </div>

              <div class="dock">
                <button
                  v-for="app in dockApps"
                  :key="app.page"
                  class="dock-app"
                  type="button"
                  @click="setPage(app.page)"
                >
                  <span class="app-icon" :class="app.colorClass">
                    <i :class="app.icon"></i>
                  </span>
                  <span class="app-label">{{ app.label }}</span>
                </button>
              </div>
            </section>

            <section v-else class="app-page-shell" :class="{ 'app-page-shell-flush': currentPage === 'backstreet' }">
              <header v-if="currentPage !== 'backstreet'" class="app-page-header">
                <button class="back-button" type="button" title="返回桌面" @click="setPage('home')">
                  <i class="fas fa-chevron-left"></i>
                </button>
                <div class="app-page-title">
                  <span class="page-icon" :class="currentApp?.colorClass">
                    <i :class="currentApp?.icon || 'fas fa-mobile-screen-button'"></i>
                  </span>
                  <span>{{ currentPageTitle }}</span>
                </div>
              </header>

              <div class="status-content" :class="{ 'status-content-flush': currentPage === 'backstreet' }">
                <DashboardPage v-if="currentPage === 'dashboard'" :character-data="characterData" />

                <ProfilePage v-if="currentPage === 'profile'" :character-data="characterData" :combat-data="combatData" />

                <InventoryPage v-if="currentPage === 'inventory'" :character-data="characterData" />

                <QuestPage v-if="currentPage === 'quest'" :character-data="characterData" />

                <RelationshipPage v-if="currentPage === 'relationship'" :character-data="characterData" />

                <BackstreetPage
                  v-if="currentPage === 'backstreet'"
                  :character-data="characterData"
                  @back-home="setPage('home')"
                />

                <SkillPage v-if="currentPage === 'skills'" :character-data="characterData" />

                <MapPage v-if="currentPage === 'map'" :character-data="characterData" />

                <ShopPage v-if="currentPage === 'shop'" :character-data="characterData" />

                <CGPage v-if="currentPage === 'cg'" :character-data="characterData" />

                <div v-if="currentPage === 'settings'" class="settings-page">
                  <div class="settings-category-heading">
                    <span>桌面设置</span>
                    <small>外观与入口</small>
                  </div>

                  <section class="settings-section">
                    <div class="settings-section-title">
                      <span>手机屏幕背景</span>
                      <small>桌面与应用底图</small>
                    </div>

                    <div class="wallpaper-preview-card" :style="wallpaperLayerStyle">
                      <img v-if="customWallpaperSrc" class="wallpaper-preview-image" :src="customWallpaperSrc" alt="" />
                      <div class="wallpaper-preview-status">
                        <span>{{ currentTime }}</span>
                        <span>{{ currentLocation }}</span>
                      </div>
                      <button
                        class="wallpaper-camera-button"
                        type="button"
                        title="上传背景图"
                        aria-label="上传背景图"
                        @click="openWallpaperFilePicker"
                      >
                        <i class="fas fa-camera"></i>
                      </button>
                    </div>

                    <div class="wallpaper-preset-grid">
                      <button
                        v-for="preset in WALLPAPER_PRESETS"
                        :key="preset.value"
                        class="wallpaper-preset-button"
                        :class="{ active: phonePrefs.wallpaperPreset === preset.value && !phonePrefs.wallpaperUrl }"
                        type="button"
                        @click="selectWallpaperPreset(preset.value)"
                      >
                        <span class="wallpaper-preset-swatch" :style="{ backgroundImage: preset.background }"></span>
                        <span>{{ preset.label }}</span>
                      </button>
                    </div>

                    <label class="settings-text-field">
                      <span>图片地址</span>
                      <input v-model="phonePrefs.wallpaperUrl" type="text" placeholder="https://..." />
                    </label>

                    <div class="settings-actions">
                      <button class="settings-action-primary" type="button" @click="openWallpaperFilePicker">
                        <i class="fas fa-image"></i>
                        上传图片
                      </button>
                      <button type="button" @click="clearWallpaper">
                        <i class="fas fa-rotate-left"></i>
                        恢复默认
                      </button>
                    </div>

                    <input
                      ref="wallpaperInputRef"
                      class="wallpaper-file-input"
                      type="file"
                      accept="image/*"
                      @change="handleWallpaperFileSelected"
                    />
                  </section>

                  <section class="settings-section">
                    <div class="settings-section-title">
                      <span>界面显示</span>
                      <small>字体与主题</small>
                    </div>

                    <label class="settings-row">
                      <span class="settings-row-icon"><i class="fas fa-font"></i></span>
                      <span class="settings-row-label">界面字体</span>
                      <select v-model="phonePrefs.fontFamily">
                        <option v-for="font in PHONE_FONT_OPTIONS" :key="font.value" :value="font.value">
                          {{ font.label }}
                        </option>
                      </select>
                    </label>

                    <label class="settings-row">
                      <span class="settings-row-icon"><i class="fas fa-palette"></i></span>
                      <span class="settings-row-label">主题色</span>
                      <select v-model="phonePrefs.theme">
                        <option v-for="theme in PHONE_THEME_OPTIONS" :key="theme.value" :value="theme.value">
                          {{ theme.label }}
                        </option>
                      </select>
                    </label>
                  </section>

                  <section class="settings-section">
                    <div class="settings-section-title">
                      <span>图标美化</span>
                      <small>桌面与入口</small>
                    </div>

                    <div class="icon-style-group">
                      <div class="icon-style-label">桌面 App</div>
                      <div class="icon-style-grid">
                        <button
                          v-for="style in APP_ICON_STYLE_OPTIONS"
                          :key="style.value"
                          class="icon-style-button"
                          :class="{ active: phonePrefs.appIconStyle === style.value }"
                          type="button"
                          @click="phonePrefs.appIconStyle = style.value"
                        >
                          <span class="icon-style-preview" :class="`preview-app-${style.value}`">
                            <i class="fas fa-id-card"></i>
                          </span>
                          <span>{{ style.label }}</span>
                        </button>
                      </div>
                    </div>

                    <div class="icon-style-group">
                      <div class="icon-style-label">悬浮入口</div>
                      <div class="icon-style-grid">
                        <button
                          v-for="style in LAUNCHER_STYLE_OPTIONS"
                          :key="style.value"
                          class="icon-style-button"
                          :class="{ active: phonePrefs.launcherStyle === style.value }"
                          type="button"
                          @click="phonePrefs.launcherStyle = style.value"
                        >
                          <span class="icon-style-preview launcher-preview" :class="`preview-launcher-${style.value}`">
                            <i class="fas fa-mobile-alt"></i>
                          </span>
                          <span>{{ style.label }}</span>
                        </button>
                      </div>
                    </div>
                  </section>

                  <section class="settings-section settings-section-compact">
                    <div class="settings-section-title">
                      <span>背景细节</span>
                      <small>透明度与质感</small>
                    </div>

                    <label class="settings-slider-row">
                      <span>
                        <span>壁纸强度</span>
                        <strong>{{ phonePrefs.wallpaperOpacity }}%</strong>
                      </span>
                      <input v-model.number="phonePrefs.wallpaperOpacity" type="range" min="20" max="100" step="5" />
                    </label>

                    <label class="settings-slider-row">
                      <span>
                        <span>背景模糊</span>
                        <strong>{{ phonePrefs.wallpaperBlur }}px</strong>
                      </span>
                      <input v-model.number="phonePrefs.wallpaperBlur" type="range" min="0" max="16" step="1" />
                    </label>

                    <label class="settings-slider-row">
                      <span>
                        <span>遮罩深度</span>
                        <strong>{{ phonePrefs.tintStrength }}%</strong>
                      </span>
                      <input v-model.number="phonePrefs.tintStrength" type="range" min="0" max="70" step="5" />
                    </label>
                  </section>

                  <div class="settings-category-heading">
                    <span>后街设置</span>
                    <small>聊天与模型</small>
                  </div>

                  <section class="settings-section settings-section-compact">
                    <div class="settings-section-title">
                      <span>后街聊天</span>
                      <small>显示楼层</small>
                    </div>

                    <label class="settings-slider-row">
                      <span>
                        <span>可见聊天楼层</span>
                        <strong>{{ phonePrefs.backstreetVisibleMessageCount }} 层</strong>
                      </span>
                      <input
                        v-model.number="phonePrefs.backstreetVisibleMessageCount"
                        type="range"
                        min="5"
                        max="100"
                        step="1"
                      />
                    </label>
                  </section>

                  <section class="settings-section">
                    <div class="settings-section-title">
                      <span>后街第二 API</span>
                      <small>OpenAI Compatible</small>
                    </div>

                    <label class="settings-row">
                      <span class="settings-row-icon"><i class="fas fa-plug-circle-bolt"></i></span>
                      <span class="settings-row-label">启用第二 API</span>
                      <input
                        v-model="secondaryPhoneApi.enabled"
                        class="settings-toggle"
                        type="checkbox"
                        @change="persistSecondaryApiSettings()"
                      />
                    </label>

                    <label class="settings-text-field">
                      <span>API URL</span>
                      <input
                        v-model.trim="secondaryPhoneApi.baseUrl"
                        type="text"
                        placeholder="https://api.example.com/v1"
                      />
                    </label>

                    <label class="settings-text-field">
                      <span>API Key</span>
                      <input v-model.trim="secondaryPhoneApi.apiKey" type="password" placeholder="sk-..." />
                    </label>

                    <label class="settings-row">
                      <span class="settings-row-icon"><i class="fas fa-microchip"></i></span>
                      <span class="settings-row-label">调用模型</span>
                      <select
                        v-model="secondaryPhoneApi.model"
                        :disabled="secondaryApiModelOptions.length === 0"
                        @change="persistSecondaryApiSettings()"
                      >
                        <option value="">未选择</option>
                        <option v-for="model in secondaryApiModelOptions" :key="model" :value="model">
                          {{ model }}
                        </option>
                      </select>
                    </label>

                    <div class="settings-actions">
                      <button
                        class="settings-action-primary"
                        type="button"
                        :disabled="isSecondaryApiTesting"
                        @click="refreshSecondaryApiModels"
                      >
                        <i class="fas fa-cloud-arrow-down"></i>
                        {{ isSecondaryApiTesting ? '读取中' : '读取模型' }}
                      </button>
                      <button type="button" @click="clearSecondaryApiModel">
                        <i class="fas fa-rotate-left"></i>
                        清除模型
                      </button>
                    </div>

                    <div class="settings-helper" :class="{ ready: secondaryApiReady }">
                      {{ secondaryApiStatusText }}
                    </div>
                  </section>
                </div>
              </div>
            </section>
          </main>

          <div v-if="currentPage !== 'backstreet'" class="home-indicator"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { getLatestMvuData, replaceLatestMvuData } from '../../shared/mvuStore';
import { getDailyTalentEffect } from '../data/talentDatabase';
import BackstreetPage from './pages/BackstreetPage.vue';
import CGPage from './pages/CGPage.vue';
import DashboardPage from './pages/DashboardPage.vue';
import InventoryPage from './pages/InventoryPage.vue';
import MapPage from './pages/MapPage.vue';
import ProfilePage from './pages/ProfilePage.vue';
import QuestPage from './pages/QuestPage.vue';
import RelationshipPage from './pages/RelationshipPage.vue';
import ShopPage from './pages/ShopPage.vue';
import SkillPage from './pages/SkillPage.vue';
import {
  fetchSecondaryPhoneApiModels,
  loadSecondaryPhoneApiSettings,
  saveSecondaryPhoneApiSettings,
  type SecondaryPhoneApiSettings,
} from '../phone/phoneApiSettings';

const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const characterData = ref<any>({});
const combatData = ref<any>({});
const currentTime = ref('12:00');
const currentDate = ref('2025年1月1日');
const currentLocation = ref('初始点');
const currentCoordinate = ref('[1-1]');

type PageKey =
  | 'home'
  | 'dashboard'
  | 'profile'
  | 'skills'
  | 'inventory'
  | 'quest'
  | 'relationship'
  | 'backstreet'
  | 'shop'
  | 'cg'
  | 'map'
  | 'settings';

const WALLPAPER_PRESETS = [
  {
    value: 'aqua',
    label: '湖蓝',
    background:
      'radial-gradient(circle at 24% 18%, rgba(255, 255, 255, 0.75), transparent 24%), linear-gradient(145deg, #84e0df 0%, #6cb8d8 52%, #7bd3c6 100%)',
  },
  {
    value: 'dawn',
    label: '晨光',
    background:
      'radial-gradient(circle at 76% 16%, rgba(255, 251, 214, 0.78), transparent 22%), linear-gradient(145deg, #f5a88d 0%, #f4d77d 50%, #79c8b2 100%)',
  },
  {
    value: 'garden',
    label: '庭院',
    background:
      'radial-gradient(circle at 20% 75%, rgba(255, 255, 255, 0.62), transparent 24%), linear-gradient(145deg, #5fac7a 0%, #89c97f 42%, #d6d98a 100%)',
  },
  {
    value: 'night',
    label: '夜色',
    background:
      'radial-gradient(circle at 70% 20%, rgba(180, 214, 255, 0.62), transparent 20%), linear-gradient(145deg, #17213f 0%, #365a7d 54%, #3f8b91 100%)',
  },
] as const;

const PHONE_THEME_OPTIONS = [
  { value: 'aqua', label: '湖蓝' },
  { value: 'midnight', label: '午夜' },
  { value: 'rose', label: '暮粉' },
  { value: 'glass', label: '玻璃' },
] as const;

const PHONE_FONT_OPTIONS = [
  { value: 'system', label: '系统默认' },
  { value: 'rounded', label: '圆润黑体' },
  { value: 'serif', label: '书籍宋体' },
  { value: 'kaiti', label: '手写楷体' },
  { value: 'mono', label: '等宽字体' },
] as const;

const APP_ICON_STYLE_OPTIONS = [
  { value: 'glass-tile', label: '晶窗' },
  { value: 'academy-badge', label: '徽章' },
  { value: 'prism-card', label: '棱卡' },
  { value: 'corner-chip', label: '芯片' },
  { value: 'paper-sticker', label: '贴纸' },
] as const;

const LAUNCHER_STYLE_OPTIONS = [
  { value: 'orb', label: '灵球' },
  { value: 'pocket-phone', label: '袖珍' },
  { value: 'academy-badge', label: '校徽' },
  { value: 'noir-dial', label: '黑盘' },
  { value: 'holo-chip', label: '全息' },
] as const;

type PhoneTheme = (typeof PHONE_THEME_OPTIONS)[number]['value'];
type PhoneFont = (typeof PHONE_FONT_OPTIONS)[number]['value'];
type AppIconStyle = (typeof APP_ICON_STYLE_OPTIONS)[number]['value'];
type LauncherStyle = (typeof LAUNCHER_STYLE_OPTIONS)[number]['value'];
type WallpaperPreset = (typeof WALLPAPER_PRESETS)[number]['value'];

const PHONE_FONT_FAMILIES: Record<PhoneFont, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif',
  rounded: '"PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif',
  serif: '"Noto Serif SC", "Songti SC", "SimSun", serif',
  kaiti: '"Kaiti SC", "KaiTi", "STKaiti", serif',
  mono: '"Cascadia Mono", Consolas, "Microsoft YaHei", monospace',
};

interface PhonePreferences {
  wallpaperUrl: string;
  wallpaperPreset: WallpaperPreset;
  theme: PhoneTheme;
  fontFamily: PhoneFont;
  appIconStyle: AppIconStyle;
  launcherStyle: LauncherStyle;
  wallpaperOpacity: number;
  wallpaperBlur: number;
  tintStrength: number;
  backstreetVisibleMessageCount: number;
}

interface PhoneApp {
  page: Exclude<PageKey, 'home'>;
  label: string;
  icon: string;
  colorClass: string;
  dock?: boolean;
}

const PHONE_PREFS_STORAGE_KEY = 'fatria-status-phone-preferences-v1';
const PHONE_PREFS_UPDATED_EVENT = 'fatria-status-phone-preferences-updated';

const DEFAULT_PHONE_PREFS: PhonePreferences = {
  wallpaperUrl: '',
  wallpaperPreset: 'aqua',
  theme: 'aqua',
  fontFamily: 'system',
  appIconStyle: 'glass-tile',
  launcherStyle: 'orb',
  wallpaperOpacity: 70,
  wallpaperBlur: 0,
  tintStrength: 15,
  backstreetVisibleMessageCount: 20,
};

const phoneApps: PhoneApp[] = [
  { page: 'dashboard', label: '状态', icon: 'fas fa-house-chimney', colorClass: 'app-cyan' },
  { page: 'profile', label: '档案', icon: 'fas fa-id-card', colorClass: 'app-blue', dock: true },
  { page: 'skills', label: '技能', icon: 'fas fa-wand-magic-sparkles', colorClass: 'app-violet', dock: true },
  { page: 'inventory', label: '背包', icon: 'fas fa-briefcase', colorClass: 'app-amber', dock: true },
  { page: 'quest', label: '任务', icon: 'fas fa-list-check', colorClass: 'app-green' },
  { page: 'relationship', label: '关系', icon: 'fas fa-heart', colorClass: 'app-pink' },
  { page: 'backstreet', label: '后街', icon: 'fas fa-comments', colorClass: 'app-backstreet' },
  { page: 'map', label: '地图', icon: 'fas fa-map-location-dot', colorClass: 'app-teal' },
  { page: 'shop', label: '商店', icon: 'fas fa-store', colorClass: 'app-orange' },
  { page: 'cg', label: '相册', icon: 'fas fa-images', colorClass: 'app-rose' },
  { page: 'settings', label: '设置', icon: 'fas fa-gear', colorClass: 'app-slate', dock: true },
];

const currentPage = ref<PageKey>('home');
const wallpaperInputRef = ref<HTMLInputElement | null>(null);
const phonePrefs = ref<PhonePreferences>(loadPhonePreferences());
const secondaryPhoneApi = ref<SecondaryPhoneApiSettings>(loadSecondaryPhoneApiSettings());
const secondaryApiModelOptions = ref<string[]>([...secondaryPhoneApi.value.models]);
const secondaryApiStatus = ref('');
const isSecondaryApiTesting = ref(false);

const homeApps = computed(() => phoneApps.filter(app => !app.dock));
const dockApps = computed(() => phoneApps.filter(app => app.dock));
const currentApp = computed(() => phoneApps.find(app => app.page === currentPage.value));
const currentPageTitle = computed(() => currentApp.value?.label || '性斗学园');
const customWallpaperSrc = computed(() => phonePrefs.value.wallpaperUrl.trim());
const phoneFrameClasses = computed(() => [
  `theme-${phonePrefs.value.theme}`,
  `icon-style-${phonePrefs.value.appIconStyle}`,
]);
const wallpaperLayerStyle = computed(() => ({
  backgroundImage: getWallpaperPresetBackground(phonePrefs.value.wallpaperPreset),
}));
const phoneStyle = computed(() => {
  return {
    '--phone-wallpaper-opacity': `${clampNumber(phonePrefs.value.wallpaperOpacity, 20, 100) / 100}`,
    '--phone-wallpaper-blur': `${clampNumber(phonePrefs.value.wallpaperBlur, 0, 16)}px`,
    '--phone-tint-opacity': `${clampNumber(phonePrefs.value.tintStrength, 0, 70) / 100}`,
    '--phone-font-family': PHONE_FONT_FAMILIES[phonePrefs.value.fontFamily] ?? PHONE_FONT_FAMILIES.system,
  };
});
const secondaryApiReady = computed(
  () =>
    Boolean(
      secondaryPhoneApi.value.enabled &&
        secondaryPhoneApi.value.baseUrl.trim() &&
        secondaryPhoneApi.value.model.trim(),
    ),
);
const secondaryApiStatusText = computed(() => {
  if (secondaryApiStatus.value) return secondaryApiStatus.value;
  if (secondaryApiReady.value) return `后街聊天将使用第二 API：${secondaryPhoneApi.value.model}`;
  if (secondaryPhoneApi.value.enabled) return '已启用，请读取模型并选择调用模型。';
  return '关闭时后街聊天继续使用酒馆原 API。';
});

watch(
  phonePrefs,
  prefs => {
    savePhonePreferences(prefs);
  },
  { deep: true },
);

watch(
  secondaryPhoneApi,
  settings => {
    persistSecondaryApiSettings(settings);
  },
  { deep: true },
);

function syncSecondaryApiModelOptions(settings: SecondaryPhoneApiSettings) {
  secondaryApiModelOptions.value = settings.model
    ? Array.from(new Set([settings.model, ...settings.models]))
    : [...settings.models];
}

function persistSecondaryApiSettings(settings: SecondaryPhoneApiSettings = secondaryPhoneApi.value) {
  saveSecondaryPhoneApiSettings(settings);
  syncSecondaryApiModelOptions(settings);
}

function setPage(page: PageKey) {
  currentPage.value = page;
}

function clampNumber(value: number, min: number, max: number): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return min;
  return Math.min(max, Math.max(min, numericValue));
}

function isPhoneTheme(value: unknown): value is PhoneTheme {
  return PHONE_THEME_OPTIONS.some(option => option.value === value);
}

function isPhoneFont(value: unknown): value is PhoneFont {
  return PHONE_FONT_OPTIONS.some(option => option.value === value);
}

function isAppIconStyle(value: unknown): value is AppIconStyle {
  return APP_ICON_STYLE_OPTIONS.some(option => option.value === value);
}

function isLauncherStyle(value: unknown): value is LauncherStyle {
  return LAUNCHER_STYLE_OPTIONS.some(option => option.value === value);
}

function isWallpaperPreset(value: unknown): value is WallpaperPreset {
  return WALLPAPER_PRESETS.some(option => option.value === value);
}

function getWallpaperPresetBackground(preset: WallpaperPreset): string {
  return WALLPAPER_PRESETS.find(option => option.value === preset)?.background ?? WALLPAPER_PRESETS[0].background;
}

function loadPhonePreferences(): PhonePreferences {
  try {
    const raw = window.localStorage?.getItem(PHONE_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PHONE_PREFS };

    const parsed = JSON.parse(raw) as Partial<PhonePreferences>;
    const theme = isPhoneTheme(parsed.theme) ? parsed.theme : DEFAULT_PHONE_PREFS.theme;
    const wallpaperPreset = isWallpaperPreset(parsed.wallpaperPreset)
      ? parsed.wallpaperPreset
      : DEFAULT_PHONE_PREFS.wallpaperPreset;
    const fontFamily = isPhoneFont(parsed.fontFamily) ? parsed.fontFamily : DEFAULT_PHONE_PREFS.fontFamily;
    const appIconStyle = isAppIconStyle(parsed.appIconStyle)
      ? parsed.appIconStyle
      : DEFAULT_PHONE_PREFS.appIconStyle;
    const launcherStyle = isLauncherStyle(parsed.launcherStyle)
      ? parsed.launcherStyle
      : DEFAULT_PHONE_PREFS.launcherStyle;

    return {
      wallpaperUrl: typeof parsed.wallpaperUrl === 'string' ? parsed.wallpaperUrl : DEFAULT_PHONE_PREFS.wallpaperUrl,
      wallpaperPreset,
      theme,
      fontFamily,
      appIconStyle,
      launcherStyle,
      wallpaperOpacity: clampNumber(Number(parsed.wallpaperOpacity), 20, 100),
      wallpaperBlur: clampNumber(Number(parsed.wallpaperBlur), 0, 16),
      tintStrength: clampNumber(Number(parsed.tintStrength), 0, 70),
      backstreetVisibleMessageCount: clampNumber(
        Number(parsed.backstreetVisibleMessageCount ?? DEFAULT_PHONE_PREFS.backstreetVisibleMessageCount),
        5,
        100,
      ),
    };
  } catch {
    return { ...DEFAULT_PHONE_PREFS };
  }
}

function savePhonePreferences(prefs: PhonePreferences) {
  try {
    window.localStorage?.setItem(PHONE_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // 偏好保存失败时仍然保留当前运行态设置。
  }

  window.dispatchEvent(new CustomEvent(PHONE_PREFS_UPDATED_EVENT, { detail: { ...prefs } }));
}

async function refreshSecondaryApiModels() {
  if (isSecondaryApiTesting.value) return;
  isSecondaryApiTesting.value = true;
  secondaryApiStatus.value = '正在连接第二 API...';

  try {
    const models = await fetchSecondaryPhoneApiModels(secondaryPhoneApi.value);
    secondaryApiModelOptions.value = models;
    secondaryPhoneApi.value.models = models;
    secondaryPhoneApi.value.enabled = true;
    if (!models.includes(secondaryPhoneApi.value.model)) {
      secondaryPhoneApi.value.model = models[0] || '';
    }
    saveSecondaryPhoneApiSettings(secondaryPhoneApi.value);
    secondaryApiStatus.value = `已读取 ${models.length} 个模型，当前：${secondaryPhoneApi.value.model || '未选择'}`;
    if (typeof toastr !== 'undefined') {
      toastr.success('模型列表读取成功', '后街第二 API');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '读取模型失败';
    secondaryApiStatus.value = message;
    if (typeof toastr !== 'undefined') {
      toastr.error(message, '后街第二 API');
    }
  } finally {
    isSecondaryApiTesting.value = false;
  }
}

function clearSecondaryApiModel() {
  secondaryPhoneApi.value.model = '';
  secondaryPhoneApi.value.models = [];
  secondaryApiModelOptions.value = [];
  secondaryApiStatus.value = '已清除模型选择，关闭开关时会使用酒馆原 API。';
}

function openWallpaperFilePicker() {
  wallpaperInputRef.value?.click();
}

function selectWallpaperPreset(preset: WallpaperPreset) {
  phonePrefs.value.wallpaperPreset = preset;
  phonePrefs.value.wallpaperUrl = '';
}

function clearWallpaper() {
  phonePrefs.value.wallpaperUrl = '';
}

function handleWallpaperFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  prepareWallpaperDataUrl(file)
    .then(dataUrl => {
      phonePrefs.value.wallpaperUrl = dataUrl;
    })
    .catch(error => {
      console.error('[状态栏] 背景图加载失败:', error);
      if (typeof toastr !== 'undefined') {
        toastr.error('背景图加载失败，请换一张图片试试。', '状态栏');
      }
    })
    .finally(() => {
      input.value = '';
    });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'));
    reader.onload = e => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('读取图片结果无效'));
      }
    };
    reader.readAsDataURL(file);
  });
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片解码失败'));
    image.src = url;
  });
}

async function prepareWallpaperDataUrl(file: File): Promise<string> {
  const fileType = file.type.toLowerCase();
  if (!fileType.startsWith('image/')) {
    throw new Error('请选择图片文件');
  }

  if (fileType === 'image/gif' || fileType === 'image/svg+xml') {
    return readFileAsDataUrl(file);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImageFromUrl(objectUrl);
    const maxSide = 1440;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      return readFileAsDataUrl(file);
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.86);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * 规范化名字：去除中间点等特殊字符
 * 例如："雪莉·克里姆希尔德" -> "雪莉克里姆希尔德"
 * @param name 原始名称
 * @returns 去除特殊字符后的名称
 */
function normalizeName(name: string): string {
  // 去除中间点（·、・、‧等变体）
  return name.replace(/[·・‧]/g, '');
}

// 从 MVU 获取数据
async function loadMvuData() {
  try {
    const mvuData = await getLatestMvuData();
    if (!mvuData || !mvuData.stat_data) {
      console.warn('[状态栏] MVU数据为空');
      return;
    }

    // ==================== 规范化关系系统中的名字 ====================
    let needsUpdate = false;
    const relationships = mvuData.stat_data.关系系统 as Record<string, any> | undefined;

    if (relationships && typeof relationships === 'object') {
      const keysToNormalize: { oldKey: string; newKey: string }[] = [];

      // 遍历关系系统的所有键（人物名字）
      for (const key of Object.keys(relationships)) {
        // 跳过非人物键（如在场人物数组）
        if (key === '在场人物') continue;

        const normalizedKey = normalizeName(key);
        // 如果名字包含中间点，需要规范化
        if (normalizedKey !== key) {
          keysToNormalize.push({ oldKey: key, newKey: normalizedKey });
        }
      }

      // 如果有需要规范化的名字
      if (keysToNormalize.length > 0) {
        for (const { oldKey, newKey } of keysToNormalize) {
          // 如果规范化后的键已存在，合并数据（保留更高的好感度）
          if (relationships[newKey]) {
            const oldData = relationships[oldKey];
            const existingData = relationships[newKey];
            // 保留好感度更高的关系数据
            if ((oldData?.好感度 || 0) > (existingData?.好感度 || 0)) {
              relationships[newKey] = oldData;
            }
          } else {
            // 直接使用规范化后的键
            relationships[newKey] = relationships[oldKey];
          }
          // 删除旧键
          delete relationships[oldKey];
          console.info(`[状态栏] 关系系统名字规范化: "${oldKey}" → "${newKey}"`);
        }
        needsUpdate = true;
      }

      // 同时规范化在场人物数组中的名字
      const presentCharacters = relationships['在场人物'] as string[] | undefined;
      if (Array.isArray(presentCharacters)) {
        const normalizedCharacters = presentCharacters.map((name: string) => normalizeName(name));
        // 检查是否有变化
        const hasChange = presentCharacters.some((name: string, i: number) => name !== normalizedCharacters[i]);
        if (hasChange) {
          relationships['在场人物'] = normalizedCharacters;
          console.info(
            `[状态栏] 在场人物名字规范化: ${presentCharacters.join(', ')} → ${normalizedCharacters.join(', ')}`,
          );
          needsUpdate = true;
        }
      }
    }

    // 如果有变更，写回 MVU
    if (needsUpdate) {
      await replaceLatestMvuData(mvuData);
      console.info('[状态栏] 已更新规范化后的关系系统数据');
    }

    characterData.value = mvuData.stat_data;
    combatData.value = mvuData.stat_data;

    // 检查是否需要自动升级
    await checkAutoLevelUp(mvuData);
  } catch (error) {
    console.error('[状态栏] 加载 MVU 数据失败:', error);
  }
}

// 自动升级检查
async function checkAutoLevelUp(mvuData: any) {
  try {
    const statData = mvuData.stat_data;

    // 获取当前经验值、等级和潜力
    const currentExp = statData.角色基础?.经验值 || 0;
    const currentLevel = statData.角色基础?._等级 || 1;
    const potential = statData.核心状态?._潜力 || 5.0; // 潜力值 (5.0-10.0)
    const difficulty = statData.角色基础?.难度 || '普通';

    // 检查天赋：经验降低效果
    const talents = statData.技能系统?.$天赋;
    const currentTalentId = talents && Object.keys(talents).length > 0 ? Object.keys(talents)[0] : undefined;
    const expReduction = getDailyTalentEffect(currentTalentId, 'exp_reduce'); // 百分比

    // 每100经验值升一级（根据难度和天赋调整）
    const baseExpNeeded = (() => {
      switch (difficulty) {
        case '简单':
          return 100;
        case '普通':
          return 125;
        case '困难':
          return 150;
        case '抖M':
          return 200;
        case '作弊':
          return 100;
        default:
          return 125;
      }
    })();

    // 应用经验降低天赋效果
    const expNeeded = Math.max(50, Math.floor((baseExpNeeded * (100 - expReduction)) / 100));

    // 检查是否可以升级（最高100级）
    if (currentExp >= expNeeded && currentLevel < 100) {
      // 计算升级次数和剩余经验
      const levelsGained = Math.floor(currentExp / expNeeded);
      const newLevel = Math.min(100, currentLevel + levelsGained);
      const actualLevelsGained = newLevel - currentLevel;
      const remainingExp = currentExp - actualLevelsGained * expNeeded;

      if (actualLevelsGained > 0) {
        // 升级奖励：根据潜力计算，每级获得 floor(潜力/2) 点（属性点和技能点相同）
        const attributePointsPerLevel = Math.floor(potential / 2);
        const skillPointsPerLevel = Math.floor(potential);
        let attributePointsGained = actualLevelsGained * attributePointsPerLevel;
        let skillPointsGained = actualLevelsGained * skillPointsPerLevel;

        // 天赋：升级时额外获得属性点（使用之前已获取的currentTalentId）
        const extraStatPoints = getDailyTalentEffect(currentTalentId, 'extra_stat_point') * actualLevelsGained;
        attributePointsGained += extraStatPoints;

        // 天赋：升级时额外获得技能点
        const extraSkillPoints = getDailyTalentEffect(currentTalentId, 'extra_skill_point') * actualLevelsGained;
        skillPointsGained += extraSkillPoints;

        // 更新 MVU 数据
        if (!statData.角色基础) statData.角色基础 = {};
        if (!statData.核心状态) statData.核心状态 = {};

        statData.角色基础._等级 = newLevel;
        statData.角色基础.经验值 = remainingExp;
        statData.核心状态.$属性点 = (statData.核心状态.$属性点 || 0) + attributePointsGained;
        statData.核心状态.$技能点 = (statData.核心状态.$技能点 || 0) + skillPointsGained;

        // 升级不再自动增加属性，只增加属性点和技能点让用户自由分配

        // 写回 MVU
        await replaceLatestMvuData(mvuData);

        // 更新本地数据
        characterData.value = statData;
        combatData.value = statData;

        // 显示升级提示
        const bonusText =
          extraStatPoints > 0 || extraSkillPoints > 0
            ? `（含天赋加成：+${extraStatPoints}属性点、+${extraSkillPoints}技能点）`
            : '';
        if (typeof toastr !== 'undefined') {
          toastr.success(
            `等级提升至 ${newLevel}！获得 ${attributePointsGained} 属性点、${skillPointsGained} 技能点${bonusText}`,
            '🎉 升级！',
            { timeOut: 3000 },
          );
        }
      }
    }
  } catch (error) {
    console.error('[状态栏] 自动升级检查失败:', error);
  }
}

// 更新手机顶部状态（从 MVU 读取游戏时间与当前位置）
async function updateTime() {
  try {
    const mvuData = await getLatestMvuData();
    const statData = mvuData?.stat_data;
    const timeData = statData?.时间系统;
    const locationData = statData?.位置系统;

    const gameTime = timeData?.时间;
    if (typeof gameTime === 'string' && gameTime.trim()) {
      currentTime.value = gameTime.trim();
    } else if (typeof gameTime === 'number') {
      const hours = Math.floor(gameTime / 60);
      const minutes = gameTime % 60;
      currentTime.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    } else {
      currentTime.value = '00:00';
    }

    currentDate.value = typeof timeData?.日期 === 'string' && timeData.日期 ? timeData.日期 : '2025年1月1日';
    currentLocation.value =
      typeof locationData?.地点名称 === 'string' && locationData.地点名称
        ? locationData.地点名称
        : typeof locationData?.坐标 === 'string' && locationData.坐标
          ? locationData.坐标
          : '初始点';
    currentCoordinate.value =
      typeof locationData?.坐标 === 'string' && locationData.坐标
        ? locationData.坐标
        : `F${Number(locationData?.楼层 || 1)}`;
  } catch (error) {
    console.warn('[状态栏] 读取手机状态失败:', error);
    currentTime.value = '00:00';
    currentDate.value = '2025年1月1日';
    currentLocation.value = '初始点';
    currentCoordinate.value = '[1-1]';
  }
}

// 关闭状态栏
function close() {
  emit('close');
}

// 监听 MVU 变量更新
let updateInterval: number | null = null;

onMounted(() => {
  loadMvuData();
  updateTime();

  // 每2秒更新一次数据
  updateInterval = window.setInterval(() => {
    if (props.isVisible) {
      loadMvuData();
      updateTime(); // 同时更新游戏时间
    }
  }, 2000);

  // 监听 MVU 变量更新事件
  const globalAny = window as any;
  if (globalAny.eventOn && globalAny.Mvu) {
    globalAny.eventOn(globalAny.Mvu.events.VARIABLE_UPDATE_ENDED, () => {
      if (props.isVisible) {
        loadMvuData();
        updateTime(); // 变量更新时也更新游戏时间
      }
    });
  }

  // 监听自定义数据更新事件（用于背包界面等）
  const dataUpdateHandler = () => {
    if (props.isVisible) {
      loadMvuData();
    }
  };
  window.addEventListener('mvu-data-updated', dataUpdateHandler);

  // 保存处理器引用以便清理
  (window as any).__statusBarDataUpdateHandler = dataUpdateHandler;
});

onUnmounted(() => {
  if (updateInterval !== null) {
    clearInterval(updateInterval);
  }
  // 移除事件监听
  const handler = (window as any).__statusBarDataUpdateHandler;
  if (handler) {
    window.removeEventListener('mvu-data-updated', handler);
    delete (window as any).__statusBarDataUpdateHandler;
  }
});
</script>

<style scoped lang="scss">
.status-bar-overlay {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  width: 100dvw !important;
  height: 100vh !important;
  height: 100dvh !important;
  background: transparent !important;
  z-index: 99999 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right))
    max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  pointer-events: none !important;
  overflow: hidden;
  box-sizing: border-box;
}

.status-bar-container {
  position: relative;
  width: min(404px, calc(100vw - 24px));
  width: min(404px, calc(100dvw - 24px));
  height: min(762px, calc(100vh - 24px));
  height: min(762px, calc(100dvh - 24px));
  min-width: 0;
  pointer-events: auto;
}

.phone-device {
  position: relative;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 26px 42px rgba(0, 0, 0, 0.42));
  animation: phone-enter 0.22s cubic-bezier(0.2, 0.9, 0.2, 1);
}

.phone-frame {
  --screen-base: #75d7d8;
  --screen-accent: #5aa7a8;
  --screen-accent-strong: #3d7e82;
  --glass-bg: rgba(68, 122, 125, 0.56);
  --glass-border: rgba(255, 255, 255, 0.22);
  --phone-wallpaper-opacity: 0;
  --phone-wallpaper-blur: 0px;
  --phone-tint-opacity: 0.15;
  --phone-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;

  position: relative;
  width: 100%;
  height: 100%;
  border: 10px solid #202126;
  border-radius: 46px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 38%, rgba(255, 255, 255, 0.22), transparent 30%),
    linear-gradient(180deg, var(--screen-base), #77d7d3 64%, #82ddd7);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 0 0 2px rgba(0, 0, 0, 0.18);
  font-family: var(--phone-font-family);
}

.theme-midnight {
  --screen-base: #202741;
  --screen-accent: #5d6ac6;
  --screen-accent-strong: #24305d;
  --glass-bg: rgba(20, 27, 50, 0.64);
}

.theme-rose {
  --screen-base: #e89ab6;
  --screen-accent: #ba6689;
  --screen-accent-strong: #7f415f;
  --glass-bg: rgba(132, 63, 91, 0.56);
}

.theme-glass {
  --screen-base: #b7c8d8;
  --screen-accent: #65798b;
  --screen-accent-strong: #3a4d5f;
  --glass-bg: rgba(69, 86, 102, 0.5);
}

.phone-wallpaper {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: var(--phone-wallpaper-opacity);
  filter: blur(var(--phone-wallpaper-blur));
  transform: scale(1.04);
  z-index: 0;
}

.phone-wallpaper-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
}

.phone-tint {
  position: absolute;
  inset: 0;
  background: rgba(7, 18, 28, var(--phone-tint-opacity));
  pointer-events: none;
  z-index: 1;
}

.phone-screen {
  position: relative;
  z-index: 3;
  height: 100%;
  min-height: 0;
  padding: 32px 28px 42px;
  box-sizing: border-box;
}

.phone-screen-app {
  padding: 0;
}

.phone-exit-button {
  position: absolute;
  top: 18px;
  right: 20px;
  z-index: 8;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 13px;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(14, 30, 38, 0.28);
  box-shadow:
    0 10px 22px rgba(15, 23, 42, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  cursor: pointer;
  backdrop-filter: blur(12px);
  transition:
    transform 0.16s ease,
    background 0.16s ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(14, 30, 38, 0.42);
  }
}

.home-screen,
.app-page-shell {
  height: 100%;
  min-height: 0;
}

.home-screen {
  display: flex;
  flex-direction: column;
}

.home-widgets {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin: 38px 0 38px;
}

.home-widget {
  min-width: 0;
  height: 90px;
  border: 1px solid var(--glass-border);
  border-radius: 22px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--glass-bg);
  box-shadow:
    0 12px 18px rgba(30, 64, 72, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition:
    transform 0.18s ease,
    background 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.18);
  }
}

.widget-main {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 28px;
  line-height: 1.1;
  font-weight: 700;
}

.location-widget .widget-main {
  font-size: 22px;
}

.widget-sub {
  max-width: 100%;
  margin-top: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.78);
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  row-gap: 26px;
  column-gap: 20px;
  justify-items: center;
  align-content: start;
}

.phone-app,
.dock-app {
  width: 76px;
  min-width: 0;
  border: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #fff;
  background: transparent;
  cursor: pointer;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
  transition: transform 0.16s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &:active {
    transform: scale(0.96);
  }
}

.app-icon {
  position: relative;
  width: 58px;
  height: 58px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 16px;
  overflow: hidden;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.94);
  background: rgba(80, 133, 136, 0.78);
  box-shadow:
    0 10px 18px rgba(28, 64, 74, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition:
    border-radius 0.18s ease,
    clip-path 0.18s ease,
    filter 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.32), transparent 42%, rgba(0, 0, 0, 0.14));
    pointer-events: none;
  }

  i {
    position: relative;
    z-index: 1;
    font-size: 25px;
  }
}

.app-label {
  width: 76px;
  min-height: 17px;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
}

.app-cyan {
  background: linear-gradient(145deg, #31b8c9, #287c8e);
}

.app-blue {
  background: linear-gradient(145deg, #4f8fd7, #315d9d);
}

.app-violet {
  background: linear-gradient(145deg, #8b6de8, #5b45ad);
}

.app-amber {
  background: linear-gradient(145deg, #d99535, #a35f1e);
}

.app-green {
  background: linear-gradient(145deg, #4fac78, #2f7651);
}

.app-pink {
  background: linear-gradient(145deg, #e6679a, #ad3d6c);
}

.app-teal {
  background: linear-gradient(145deg, #48a99f, #2f716c);
}

.app-orange {
  background: linear-gradient(145deg, #e17a42, #a84c28);
}

.app-rose {
  background: linear-gradient(145deg, #c35f7d, #8b3a58);
}

.app-backstreet {
  background: linear-gradient(145deg, #35a687, #2c6778);
}

.app-slate {
  background: linear-gradient(145deg, #91a3ad, #566a74);
}

.icon-style-glass-tile .app-icon {
  border-radius: 18px;
  box-shadow:
    0 12px 22px rgba(28, 64, 74, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 -10px 18px rgba(0, 0, 0, 0.1);

  &::after {
    background:
      radial-gradient(circle at 28% 22%, rgba(255, 255, 255, 0.5), transparent 24%),
      linear-gradient(145deg, rgba(255, 255, 255, 0.24), transparent 46%, rgba(0, 0, 0, 0.12));
  }
}

.icon-style-academy-badge .app-icon {
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.42);
  border-radius: 999px;
  box-shadow:
    0 12px 20px rgba(20, 48, 58, 0.26),
    0 0 0 5px rgba(255, 255, 255, 0.1) inset,
    inset 0 1px 0 rgba(255, 255, 255, 0.34);

  &::before {
    inset: 8px;
    border: 1px solid rgba(255, 255, 255, 0.34);
    border-radius: 999px;
  }

  &::after {
    inset: auto 9px 9px;
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.24);
  }
}

.icon-style-prism-card .app-icon {
  border-color: rgba(255, 255, 255, 0.24);
  border-radius: 9px 20px 9px 20px;
  transform: rotate(-5deg);
  box-shadow:
    0 14px 22px rgba(15, 23, 42, 0.24),
    -5px 5px 0 rgba(255, 255, 255, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);

  &::before {
    right: auto;
    width: 10px;
    background: rgba(255, 255, 255, 0.22);
  }

  &::after {
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.38), transparent 32%),
      linear-gradient(315deg, rgba(255, 255, 255, 0.18), transparent 42%);
  }

  i {
    transform: rotate(5deg);
  }
}

.icon-style-corner-chip .app-icon {
  border-color: rgba(255, 255, 255, 0.3);
  border-radius: 13px;
  clip-path: polygon(14% 0, 100% 0, 100% 76%, 76% 100%, 0 100%, 0 14%);
  filter: saturate(1.1) contrast(1.04);
  box-shadow:
    0 12px 20px rgba(15, 23, 42, 0.25),
    inset 0 0 0 2px rgba(255, 255, 255, 0.18);

  &::before {
    inset: 7px;
    border: 1px dashed rgba(255, 255, 255, 0.22);
    clip-path: polygon(14% 0, 100% 0, 100% 76%, 76% 100%, 0 100%, 0 14%);
  }

  &::after {
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.26), transparent 38%),
      repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 8px);
  }
}

.icon-style-paper-sticker .app-icon {
  border: 3px solid rgba(255, 255, 255, 0.88);
  border-radius: 18px 25px 16px 24px;
  transform: rotate(4deg);
  filter: saturate(1.08) brightness(1.04);
  box-shadow:
    0 13px 18px rgba(15, 23, 42, 0.2),
    0 0 0 1px rgba(44, 62, 74, 0.1);

  &::before {
    top: 7px;
    right: 7px;
    bottom: auto;
    left: auto;
    width: 12px;
    height: 12px;
    border-radius: 0 7px 0 10px;
    background: rgba(255, 255, 255, 0.66);
    box-shadow: -2px 2px 4px rgba(15, 23, 42, 0.14);
  }

  &::after {
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.18), transparent 44%);
  }

  i {
    transform: rotate(-4deg);
  }
}

.dock {
  margin-top: auto;
  min-height: 94px;
  padding: 12px 10px 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 26px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  justify-items: center;
  align-items: center;
  background: rgba(58, 109, 112, 0.56);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 14px 24px rgba(32, 74, 79, 0.18);
  backdrop-filter: blur(14px);
}

.dock-app {
  width: 64px;
  gap: 5px;

  .app-icon {
    width: 50px;
    height: 50px;
    border-radius: 14px;

    i {
      font-size: 22px;
    }
  }

  .app-label {
    width: 64px;
    font-size: 11px;
  }
}

.app-page-shell {
  display: flex;
  flex-direction: column;
  background: transparent;
  overflow: hidden;
}

.app-page-shell-flush {
  background: transparent;
}

.app-page-header {
  position: relative;
  z-index: 30;
  flex: 0 0 76px;
  height: 76px;
  padding: 18px 22px 10px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 8px;
  color: #fff;
  background: linear-gradient(180deg, rgba(18, 33, 45, 0.28), rgba(18, 33, 45, 0.08));
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  box-sizing: border-box;
}

.app-page-header::after {
  content: '';
}

.back-button {
  position: relative;
  z-index: 2;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition:
    transform 0.16s ease,
    background 0.16s ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.18);
  }
}

.app-page-title {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-size: 15px;
  font-weight: 800;

  > span:last-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.page-icon {
  position: relative;
  width: 28px;
  height: 28px;
  overflow: hidden;
  border-radius: 9px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  box-shadow:
    0 6px 12px rgba(15, 23, 42, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.24), transparent 48%);
    pointer-events: none;
  }

  i {
    position: relative;
    z-index: 1;
    font-size: 13px;
  }
}

.icon-style-academy-badge .page-icon {
  border-radius: 999px;
}

.icon-style-prism-card .page-icon {
  border-radius: 6px 12px 6px 12px;
  transform: rotate(-5deg);

  i {
    transform: rotate(5deg);
  }
}

.icon-style-corner-chip .page-icon {
  border-radius: 7px;
  clip-path: polygon(14% 0, 100% 0, 100% 76%, 76% 100%, 0 100%, 0 14%);
}

.icon-style-paper-sticker .page-icon {
  border: 2px solid rgba(255, 255, 255, 0.84);
  border-radius: 10px 14px 9px 13px;
  transform: rotate(4deg);

  i {
    transform: rotate(-4deg);
  }
}

.status-content {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  z-index: 2;
  padding-bottom: 28px;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.22);
    border-radius: 2px;
  }
}

.status-content-flush {
  overflow: hidden;
  padding-bottom: 0;
}

.settings-page {
  min-height: 100%;
  padding: 14px 14px 30px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: #21313b;
  background:
    radial-gradient(circle at 18% 8%, rgba(255, 255, 255, 0.86), transparent 24%),
    linear-gradient(180deg, rgba(247, 251, 255, 0.96), rgba(226, 239, 245, 0.88));
  box-sizing: border-box;
}

.settings-category-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 2px 0;

  span {
    min-width: 0;
    color: #21313b;
    font-size: 16px;
    font-weight: 950;
  }

  small {
    flex: 0 0 auto;
    color: #71838e;
    font-size: 11px;
    font-weight: 800;
  }
}

.settings-section {
  padding: 14px;
  border: 1px solid rgba(137, 160, 172, 0.2);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow:
    0 16px 30px rgba(31, 73, 88, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(12px);
}

.settings-section-compact {
  padding-bottom: 10px;
}

.settings-section-title {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;

  span {
    min-width: 0;
    color: #1f2e38;
    font-size: 15px;
    font-weight: 900;
  }

  small {
    flex: 0 0 auto;
    color: #7c8b95;
    font-size: 11px;
    font-weight: 700;
  }
}

.icon-style-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  & + & {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid rgba(133, 154, 164, 0.14);
  }
}

.icon-style-label {
  color: #526672;
  font-size: 12px;
  font-weight: 900;
}

.icon-style-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.icon-style-button {
  min-width: 0;
  border: 1px solid rgba(124, 142, 153, 0.18);
  border-radius: 14px;
  padding: 7px 4px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #4d5f69;
  background: rgba(248, 251, 252, 0.92);
  cursor: pointer;
  font-size: 11px;
  font-weight: 900;
  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    background 0.16s ease;

  &.active {
    border-color: rgba(44, 139, 158, 0.72);
    box-shadow: 0 0 0 2px rgba(86, 188, 205, 0.18);
    color: #1d7180;
    background: #fff;
  }

  &:hover {
    transform: translateY(-1px);
  }

  > span:last-child {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.icon-style-preview {
  position: relative;
  width: 34px;
  height: 34px;
  overflow: hidden;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #fff;
  box-shadow:
    0 8px 14px rgba(31, 73, 88, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);

  i {
    position: relative;
    z-index: 1;
    font-size: 15px;
  }
}

.launcher-preview {
  border-radius: 999px;
}

.preview-app-glass-tile {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.28), transparent 42%),
    linear-gradient(145deg, #31b8c9, #315d9d);
}

.preview-app-academy-badge {
  border: 2px solid rgba(255, 255, 255, 0.68);
  border-radius: 999px;
  background: linear-gradient(145deg, #4f8fd7, #315d9d);
  box-shadow:
    0 0 0 4px rgba(255, 255, 255, 0.18) inset,
    0 8px 14px rgba(31, 73, 88, 0.16);
}

.preview-app-prism-card {
  border-radius: 7px 15px 7px 15px;
  transform: rotate(-5deg);
  background: linear-gradient(145deg, #8b6de8, #5b45ad);
  box-shadow:
    -3px 3px 0 rgba(84, 108, 140, 0.24),
    0 8px 14px rgba(31, 73, 88, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);

  i {
    transform: rotate(5deg);
  }
}

.preview-app-corner-chip {
  border-radius: 8px;
  clip-path: polygon(14% 0, 100% 0, 100% 76%, 76% 100%, 0 100%, 0 14%);
  background: linear-gradient(145deg, #48a99f, #2f716c);
}

.preview-app-paper-sticker {
  border: 3px solid rgba(255, 255, 255, 0.9);
  border-radius: 13px 17px 12px 16px;
  transform: rotate(4deg);
  background: linear-gradient(145deg, #e6679a, #ad3d6c);

  i {
    transform: rotate(-4deg);
  }
}

.preview-launcher-orb {
  background: linear-gradient(145deg, #22d3ee, #6366f1 54%, #ec4899);
}

.preview-launcher-pocket-phone {
  border-radius: 10px;
  background: linear-gradient(145deg, #f7fdff, #8ed4cc);
  color: #244a55;
}

.preview-launcher-academy-badge {
  border: 2px solid rgba(255, 255, 255, 0.7);
  background: linear-gradient(145deg, #4f8fd7, #315d9d);
}

.preview-launcher-noir-dial {
  background: linear-gradient(145deg, #2b3039, #080b10);
}

.preview-launcher-holo-chip {
  border-radius: 9px;
  clip-path: polygon(14% 0, 100% 0, 100% 76%, 76% 100%, 0 100%, 0 14%);
  background: linear-gradient(145deg, #8ee8ff, #c084fc 48%, #8bffcf);
}

.wallpaper-preview-card {
  position: relative;
  height: 168px;
  border: 1px solid rgba(255, 255, 255, 0.56);
  border-radius: 24px;
  overflow: hidden;
  background-color: #8fd3d4;
  background-size: cover;
  background-position: center;
  box-shadow:
    0 18px 28px rgba(47, 96, 108, 0.18),
    inset 0 0 0 1px rgba(255, 255, 255, 0.28);
}

.wallpaper-preview-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
}

.wallpaper-preview-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(10, 31, 43, 0.3), transparent 38%),
    linear-gradient(0deg, rgba(10, 31, 43, 0.2), transparent 42%);
  pointer-events: none;
}

.wallpaper-preview-status {
  position: absolute;
  top: 14px;
  left: 16px;
  right: 16px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  text-shadow: 0 2px 8px rgba(9, 25, 34, 0.36);

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.wallpaper-camera-button {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 1;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #25333c;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 12px 20px rgba(14, 39, 51, 0.22);
  cursor: pointer;
  transition:
    transform 0.16s ease,
    background 0.16s ease;

  &:hover {
    transform: translateY(-1px);
    background: #fff;
  }
}

.wallpaper-preset-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.wallpaper-preset-button {
  min-width: 0;
  border: 1px solid rgba(124, 142, 153, 0.18);
  border-radius: 14px;
  padding: 7px 5px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #4d5f69;
  background: rgba(248, 251, 252, 0.9);
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease;

  &.active {
    border-color: rgba(44, 139, 158, 0.72);
    box-shadow: 0 0 0 2px rgba(86, 188, 205, 0.18);
    color: #1d7180;
  }

  &:hover {
    transform: translateY(-1px);
  }
}

.wallpaper-preset-swatch {
  width: 100%;
  aspect-ratio: 1.35;
  border-radius: 10px;
  background-size: cover;
  background-position: center;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.38);
}

.settings-text-field {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: #5c6f7b;
  font-size: 12px;
  font-weight: 800;

  input {
    width: 100%;
    min-width: 0;
    height: 40px;
    border: 1px solid rgba(124, 142, 153, 0.22) !important;
    border-radius: 13px;
    padding: 0 12px;
    color: #25333c !important;
    background-color: rgba(247, 250, 252, 0.94) !important;
    box-sizing: border-box;
    box-shadow: none !important;
    outline: none;

    &::placeholder {
      color: #8797a1;
      opacity: 1;
    }
  }
}

.settings-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;

  button {
    min-width: 0;
    height: 40px;
    border: 1px solid rgba(118, 139, 151, 0.2);
    border-radius: 13px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    color: #42525c;
    background: rgba(247, 250, 252, 0.96);
    cursor: pointer;
    font-size: 12px;
    font-weight: 900;
    white-space: nowrap;

    &:hover {
      background: #fff;
    }

    &:disabled {
      cursor: wait;
      opacity: 0.68;
    }
  }

  .settings-action-primary {
    border-color: rgba(45, 151, 169, 0.36);
    color: #fff;
    background: linear-gradient(145deg, #38aebc, #247b8c);

    &:hover {
      background: linear-gradient(145deg, #45bdca, #2d8799);
    }
  }
}

.settings-row {
  min-height: 50px;
  border-bottom: 1px solid rgba(133, 154, 164, 0.16);
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) minmax(112px, 42%);
  align-items: center;
  gap: 10px;

  &:last-child {
    border-bottom: 0;
  }

  select {
    width: 100%;
    min-width: 0;
    height: 36px;
    border: 1px solid rgba(124, 142, 153, 0.22) !important;
    border-radius: 12px;
    padding: 0 9px;
    color: #273640 !important;
    background-color: rgba(247, 250, 252, 0.96) !important;
    box-shadow: none !important;
    outline: none;
    font-weight: 800;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.62;
    }
  }
}

.settings-toggle {
  justify-self: end;
  width: 46px;
  height: 26px;
  margin: 0;
  accent-color: #2ca4b5;
  cursor: pointer;
}

.settings-helper {
  margin-top: 10px;
  border: 1px solid rgba(124, 142, 153, 0.16);
  border-radius: 12px;
  padding: 9px 10px;
  color: #637684;
  background: rgba(247, 250, 252, 0.74);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.45;

  &.ready {
    border-color: rgba(45, 151, 169, 0.28);
    color: #237484;
    background: rgba(230, 250, 252, 0.72);
  }
}

.settings-row-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(145deg, #5bb8c2, #397d91);
  box-shadow: 0 8px 16px rgba(43, 120, 140, 0.18);
}

.settings-row-label {
  min-width: 0;
  overflow: hidden;
  color: #263640;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 900;
}

.settings-slider-row {
  padding: 6px 0 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #42525c;
  font-size: 12px;
  font-weight: 900;

  > span {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  strong {
    color: #1e7c8b;
    font-size: 12px;
  }

  input[type='range'] {
    width: 100%;
    min-width: 0;
    height: 24px;
    padding: 0;
    accent-color: #2ca4b5;
  }
}

.wallpaper-file-input {
  display: none;
}

.home-indicator {
  position: absolute;
  bottom: 12px;
  left: 50%;
  width: 126px;
  height: 5px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.42);
  z-index: 8;
  pointer-events: none;
}

@media (max-width: 640px) {
  .status-bar-container {
    width: calc(100vw - 16px);
    width: calc(100dvw - 16px);
    height: calc(100vh - 16px);
    height: calc(100dvh - 16px);
  }

  .phone-frame {
    border-width: 6px;
    border-radius: 36px;
  }

  .phone-screen {
    padding: 26px 18px 38px;
  }

  .phone-screen-app {
    padding: 0;
  }

  .app-page-header {
    flex-basis: 68px;
    height: 68px;
    padding: 14px 16px 8px;
  }

  .phone-exit-button {
    top: 14px;
    right: 16px;
    width: 36px;
    height: 36px;
  }

  .home-widgets {
    gap: 12px;
    margin: 34px 0 28px;
  }

  .home-widget {
    height: 78px;
    border-radius: 18px;
  }

  .widget-main {
    font-size: 24px;
  }

  .location-widget .widget-main {
    font-size: 18px;
  }

  .app-grid {
    column-gap: 10px;
    row-gap: 20px;
  }

  .phone-app {
    width: 68px;
  }

  .app-icon {
    width: 52px;
    height: 52px;
  }

  .app-label {
    width: 68px;
    font-size: 12px;
  }
}

@media (max-height: 690px) {
  .home-widgets {
    margin: 28px 0 18px;
  }

  .home-widget {
    height: 68px;
  }

  .app-grid {
    row-gap: 16px;
  }

  .app-icon {
    width: 50px;
    height: 50px;
  }

  .dock {
    min-height: 80px;
    padding-top: 9px;
  }
}

@keyframes phone-enter {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
