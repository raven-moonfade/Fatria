<template>
  <div class="status-bar-shell">
    <button
      v-show="!isVisible"
      ref="launcherRef"
      class="status-launcher"
      :class="[{ dragging: isDragging }, `launcher-style-${launcherSkin}`]"
      :style="launcherStyle"
      type="button"
      title="打开状态栏"
      aria-label="打开状态栏"
      @keydown.enter.prevent="openLauncher"
      @keydown.space.prevent="openLauncher"
    >
      <span class="launcher-halo"></span>
      <span class="launcher-glass"></span>
      <i class="fas fa-mobile-alt" aria-hidden="true"></i>
    </button>

    <StatusBar :is-visible="isVisible" @close="close" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import StatusBar from './StatusBar.vue';

const LAUNCHER_SIZE = 58;
const VIEWPORT_PADDING = 12;
const DRAG_THRESHOLD = 6;
const POSITION_STORAGE_KEY = 'fatria-status-launcher-position-v2';
const LEGACY_POSITION_STORAGE_KEY = 'fatria-status-launcher-position';
const PHONE_PREFS_STORAGE_KEY = 'fatria-status-phone-preferences-v1';
const PHONE_PREFS_UPDATED_EVENT = 'fatria-status-phone-preferences-updated';
const LAUNCHER_STYLE_OPTIONS = ['orb', 'pocket-phone', 'academy-badge', 'noir-dial', 'holo-chip'] as const;

type LauncherPosition = {
  x: number;
  y: number;
};

type LauncherStyle = (typeof LAUNCHER_STYLE_OPTIONS)[number];

type DragState = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
  pointerId?: number;
} | null;

const launcherRef = ref<HTMLButtonElement | null>(null);
const launcherPosition = ref<LauncherPosition>({
  x: VIEWPORT_PADDING,
  y: VIEWPORT_PADDING,
});
const launcherSkin = ref<LauncherStyle>('orb');
const dragState = ref<DragState>(null);
const isDragging = ref(false);
let lastDragEndedAt = 0;
let activeHostWindow: Window | null = null;
let activeHostDocument: Document | null = null;

// 全局状态管理，保留给旧按钮事件和其它脚本调用。
const globalAny = window as any;
if (!globalAny.__statusBarState) {
  const isVisibleRef = ref(false);
  globalAny.__statusBarState = {
    isVisible: isVisibleRef,
  };
}

const isVisible = globalAny.__statusBarState.isVisible;

globalAny.__statusBarState.open = () => {
  isVisible.value = true;
};
globalAny.__statusBarState.close = () => {
  isVisible.value = false;
};
globalAny.__statusBarState.toggle = () => {
  isVisible.value = !isVisible.value;
};

const launcherStyle = computed(() => ({
  left: `${launcherPosition.value.x}px`,
  top: `${launcherPosition.value.y}px`,
}));

function loadLauncherPosition(): LauncherPosition {
  try {
    const raw = getStorage()?.getItem(POSITION_STORAGE_KEY);
    if (!raw) return clampLauncherPosition(getDefaultPosition());

    const parsed = JSON.parse(raw);
    return clampLauncherPosition({
      x: Number(parsed?.x ?? getDefaultPosition().x),
      y: Number(parsed?.y ?? getDefaultPosition().y),
    });
  } catch {
    return clampLauncherPosition(getDefaultPosition());
  }
}

function saveLauncherPosition(position: LauncherPosition) {
  try {
    getStorage()?.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch {
    // localStorage 不可用时只保留本次页面内位置。
  }
}

function getHostDocument(): Document {
  return activeHostDocument ?? launcherRef.value?.ownerDocument ?? document;
}

function getHostWindow(): Window {
  return activeHostWindow ?? getHostDocument().defaultView ?? window;
}

function getStorage(): Storage | null {
  try {
    return getHostWindow().localStorage ?? window.localStorage ?? null;
  } catch {
    try {
      return window.localStorage ?? null;
    } catch {
      return null;
    }
  }
}

function isLauncherStyle(value: unknown): value is LauncherStyle {
  return LAUNCHER_STYLE_OPTIONS.includes(value as LauncherStyle);
}

function readLauncherSkinFromStorage(): LauncherStyle {
  try {
    const raw = getStorage()?.getItem(PHONE_PREFS_STORAGE_KEY);
    if (!raw) return 'orb';

    const parsed = JSON.parse(raw);
    return isLauncherStyle(parsed?.launcherStyle) ? parsed.launcherStyle : 'orb';
  } catch {
    return 'orb';
  }
}

function syncLauncherSkinFromStorage() {
  launcherSkin.value = readLauncherSkinFromStorage();
}

function handlePhonePreferencesUpdated(event: Event) {
  const detail = (event as CustomEvent).detail;
  if (isLauncherStyle(detail?.launcherStyle)) {
    launcherSkin.value = detail.launcherStyle;
    return;
  }

  syncLauncherSkinFromStorage();
}

function handlePhonePreferencesStorage(event: StorageEvent) {
  if (event.key && event.key !== PHONE_PREFS_STORAGE_KEY) return;
  syncLauncherSkinFromStorage();
}

function clampLauncherPosition(position: LauncherPosition): LauncherPosition {
  const viewport = getViewportSize();
  const maxX = Math.max(VIEWPORT_PADDING, viewport.width - LAUNCHER_SIZE - VIEWPORT_PADDING);
  const maxY = Math.max(VIEWPORT_PADDING, viewport.height - LAUNCHER_SIZE - VIEWPORT_PADDING);
  return {
    x: Math.min(Math.max(position.x, VIEWPORT_PADDING), maxX),
    y: Math.min(Math.max(position.y, VIEWPORT_PADDING), maxY),
  };
}

function getDefaultPosition(): LauncherPosition {
  const viewport = getViewportSize();
  return {
    x: Math.max(VIEWPORT_PADDING, viewport.width - LAUNCHER_SIZE - 18),
    y: Math.max(VIEWPORT_PADDING, viewport.height - LAUNCHER_SIZE - 88),
  };
}

function getViewportSize() {
  const hostDocument = getHostDocument();
  const hostWindow = getHostWindow();
  const root = hostDocument.documentElement;
  const body = hostDocument.body;
  const visualViewport = hostWindow.visualViewport;
  const containerRect = launcherRef.value?.closest<HTMLElement>('[script_id]')?.getBoundingClientRect();
  const width = Math.max(
    Number(hostWindow.innerWidth) || 0,
    Number(root?.clientWidth) || 0,
    Number(body?.clientWidth) || 0,
    Number(visualViewport?.width) || 0,
    Number(containerRect?.width) || 0,
  );
  const height = Math.max(
    Number(hostWindow.innerHeight) || 0,
    Number(root?.clientHeight) || 0,
    Number(body?.clientHeight) || 0,
    Number(visualViewport?.height) || 0,
    Number(containerRect?.height) || 0,
  );

  return {
    width: Math.max(width, LAUNCHER_SIZE + VIEWPORT_PADDING * 2),
    height: Math.max(height, LAUNCHER_SIZE + VIEWPORT_PADDING * 2),
  };
}

function applyLauncherPosition(position: LauncherPosition, shouldSave = false) {
  const nextPosition = clampLauncherPosition(position);
  launcherPosition.value = nextPosition;

  const launcher = launcherRef.value;
  if (launcher) {
    launcher.style.left = `${nextPosition.x}px`;
    launcher.style.top = `${nextPosition.y}px`;
  }

  if (shouldSave) {
    saveLauncherPosition(nextPosition);
  }
}

function beginDrag(clientX: number, clientY: number, pointerId?: number) {
  const rect = launcherRef.value?.getBoundingClientRect();
  dragState.value = {
    startX: clientX,
    startY: clientY,
    originX: rect?.left ?? launcherPosition.value.x,
    originY: rect?.top ?? launcherPosition.value.y,
    moved: false,
    pointerId,
  };
  isDragging.value = false;
}

function handlePointerDown(event: PointerEvent) {
  if (event.button !== 0) return;

  event.preventDefault();
  event.stopPropagation();
  beginDrag(event.clientX, event.clientY, event.pointerId);
  addPointerFallbackListeners();
  try {
    launcherRef.value?.setPointerCapture(event.pointerId);
  } catch {
    // Pointer capture may fail in some embedded webviews; pointermove still handles the common path.
  }
}

function moveLauncher(clientX: number, clientY: number) {
  if (!dragState.value) return;

  const dx = clientX - dragState.value.startX;
  const dy = clientY - dragState.value.startY;
  if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
    dragState.value.moved = true;
    isDragging.value = true;
  }

  applyLauncherPosition({
    x: dragState.value.originX + dx,
    y: dragState.value.originY + dy,
  });
}

function handlePointerMove(event: PointerEvent) {
  if (!dragState.value) return;
  if (dragState.value.pointerId !== undefined && dragState.value.pointerId !== event.pointerId) return;

  event.preventDefault();
  event.stopPropagation();
  moveLauncher(event.clientX, event.clientY);
}

function handlePointerUp(event: PointerEvent) {
  if (!dragState.value) return;
  if (dragState.value.pointerId !== undefined && dragState.value.pointerId !== event.pointerId) return;

  event.preventDefault();
  event.stopPropagation();
  releasePointerCapture(event.pointerId);
  removePointerFallbackListeners();
  finishDrag(true);
}

function handlePointerCancel(event: PointerEvent) {
  if (!dragState.value) return;
  if (dragState.value.pointerId !== undefined && dragState.value.pointerId !== event.pointerId) return;

  event.preventDefault();
  event.stopPropagation();
  releasePointerCapture(event.pointerId);
  removePointerFallbackListeners();
  finishDrag(false);
}

function releasePointerCapture(pointerId: number) {
  try {
    if (launcherRef.value?.hasPointerCapture(pointerId)) {
      launcherRef.value.releasePointerCapture(pointerId);
    }
  } catch {
    // Ignore release failures from browsers/webviews with partial PointerEvent support.
  }
}

function handleLauncherClick(event: MouseEvent) {
  event.preventDefault();
  if (Date.now() - lastDragEndedAt < 350) {
    return;
  }

  if (!dragState.value) {
    openLauncher();
  }
}

function finishDrag(shouldOpenWhenNotMoved: boolean) {
  if (!dragState.value) return;

  const shouldOpen = !dragState.value.moved;
  if (dragState.value.moved) {
    applyLauncherPosition(launcherPosition.value, true);
    lastDragEndedAt = Date.now();
  }

  dragState.value = null;
  isDragging.value = false;

  if (shouldOpenWhenNotMoved && shouldOpen) {
    openLauncher();
  }
}

function addPointerFallbackListeners() {
  const hostWindow = getHostWindow();
  const hostDocument = getHostDocument();
  hostWindow.addEventListener('pointermove', handlePointerMove, true);
  hostWindow.addEventListener('pointerup', handlePointerUp, true);
  hostWindow.addEventListener('pointercancel', handlePointerCancel, true);
  hostDocument.addEventListener('pointermove', handlePointerMove, true);
  hostDocument.addEventListener('pointerup', handlePointerUp, true);
  hostDocument.addEventListener('pointercancel', handlePointerCancel, true);
}

function removePointerFallbackListeners() {
  const hostWindow = getHostWindow();
  const hostDocument = getHostDocument();
  hostWindow.removeEventListener('pointermove', handlePointerMove, true);
  hostWindow.removeEventListener('pointerup', handlePointerUp, true);
  hostWindow.removeEventListener('pointercancel', handlePointerCancel, true);
  hostDocument.removeEventListener('pointermove', handlePointerMove, true);
  hostDocument.removeEventListener('pointerup', handlePointerUp, true);
  hostDocument.removeEventListener('pointercancel', handlePointerCancel, true);
}

function openLauncher() {
  globalAny.__statusBarState.open();
}

function close() {
  globalAny.__statusBarState.close();
}

function handleResize() {
  applyLauncherPosition(launcherPosition.value);
}

onMounted(() => {
  activeHostDocument = launcherRef.value?.ownerDocument ?? document;
  activeHostWindow = activeHostDocument.defaultView ?? window;
  (activeHostWindow as any).__statusBarState = globalAny.__statusBarState;

  try {
    getStorage()?.removeItem(LEGACY_POSITION_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }

  applyLauncherPosition(loadLauncherPosition());
  syncLauncherSkinFromStorage();
  launcherRef.value?.addEventListener('pointerdown', handlePointerDown);
  launcherRef.value?.addEventListener('pointermove', handlePointerMove);
  launcherRef.value?.addEventListener('pointerup', handlePointerUp);
  launcherRef.value?.addEventListener('pointercancel', handlePointerCancel);
  launcherRef.value?.addEventListener('click', handleLauncherClick);
  activeHostWindow.addEventListener('resize', handleResize);
  activeHostWindow.addEventListener(PHONE_PREFS_UPDATED_EVENT, handlePhonePreferencesUpdated);
  activeHostWindow.addEventListener('storage', handlePhonePreferencesStorage);
  if (activeHostWindow !== window) {
    window.addEventListener(PHONE_PREFS_UPDATED_EVENT, handlePhonePreferencesUpdated);
    window.addEventListener('storage', handlePhonePreferencesStorage);
  }
});

onUnmounted(() => {
  const hostWindow = getHostWindow();
  hostWindow.removeEventListener('resize', handleResize);
  hostWindow.removeEventListener(PHONE_PREFS_UPDATED_EVENT, handlePhonePreferencesUpdated);
  hostWindow.removeEventListener('storage', handlePhonePreferencesStorage);
  if (hostWindow !== window) {
    window.removeEventListener(PHONE_PREFS_UPDATED_EVENT, handlePhonePreferencesUpdated);
    window.removeEventListener('storage', handlePhonePreferencesStorage);
  }
  launcherRef.value?.removeEventListener('pointerdown', handlePointerDown);
  launcherRef.value?.removeEventListener('pointermove', handlePointerMove);
  launcherRef.value?.removeEventListener('pointerup', handlePointerUp);
  launcherRef.value?.removeEventListener('pointercancel', handlePointerCancel);
  launcherRef.value?.removeEventListener('click', handleLauncherClick);
  removePointerFallbackListeners();
  if (dragState.value?.pointerId !== undefined) {
    releasePointerCapture(dragState.value.pointerId);
  }
  activeHostWindow = null;
  activeHostDocument = null;
});
</script>

<style scoped lang="scss">
.status-bar-shell {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 99999;
}

.status-launcher {
  position: fixed;
  width: 58px;
  height: 58px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 50%;
  padding: 0;
  display: grid;
  place-items: center;
  color: #ffffff;
  background:
    radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.42), transparent 28%),
    linear-gradient(145deg, rgba(34, 211, 238, 0.95), rgba(99, 102, 241, 0.95) 54%, rgba(236, 72, 153, 0.9));
  box-shadow:
    0 14px 34px rgba(15, 23, 42, 0.36),
    0 0 0 1px rgba(255, 255, 255, 0.18) inset;
  cursor: grab;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  z-index: 100000;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    filter 0.18s ease;

  &:hover {
    transform: translateY(-2px) scale(1.04);
    filter: saturate(1.08);
    box-shadow:
      0 18px 40px rgba(15, 23, 42, 0.42),
      0 0 0 1px rgba(255, 255, 255, 0.22) inset;
  }

  &:active,
  &.dragging {
    cursor: grabbing;
    transform: scale(0.96);
  }

  i {
    position: relative;
    z-index: 2;
    font-size: 25px;
    text-shadow: 0 2px 8px rgba(15, 23, 42, 0.35);
  }
}

.status-launcher.launcher-style-pocket-phone {
  color: #244a55;
  border-radius: 18px;
  border-color: rgba(255, 255, 255, 0.58);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.78), transparent 34%),
    linear-gradient(145deg, #f7fdff, #b7ece7 58%, #7ac6c0);
  box-shadow:
    0 16px 32px rgba(37, 92, 104, 0.24),
    0 0 0 5px rgba(36, 74, 85, 0.12) inset,
    inset 0 1px 0 rgba(255, 255, 255, 0.74),
    inset 0 -12px 18px rgba(73, 160, 154, 0.16);

  .launcher-halo {
    border-radius: 22px;
    background: rgba(80, 190, 184, 0.18);
  }

  .launcher-glass {
    inset: 8px 11px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.28);
    box-shadow: 0 1px 12px rgba(255, 255, 255, 0.32) inset;
  }

  i {
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.42);
  }
}

.status-launcher.launcher-style-academy-badge {
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.5);
  background:
    radial-gradient(circle at 50% 52%, rgba(255, 255, 255, 0.22), transparent 28%),
    linear-gradient(145deg, #4f8fd7, #315d9d);
  box-shadow:
    0 14px 30px rgba(33, 73, 130, 0.3),
    0 0 0 6px rgba(255, 255, 255, 0.12) inset,
    inset 0 1px 0 rgba(255, 255, 255, 0.28);

  .launcher-halo {
    background: rgba(79, 143, 215, 0.18);
  }

  .launcher-glass {
    inset: 10px;
    border: 1px solid rgba(255, 255, 255, 0.28);
    background: transparent;
    box-shadow: none;
  }
}

.status-launcher.launcher-style-noir-dial {
  border-color: rgba(255, 255, 255, 0.2);
  background:
    repeating-conic-gradient(from 18deg, rgba(255, 255, 255, 0.09) 0 8deg, transparent 8deg 22deg),
    radial-gradient(circle, #303641 0 42%, #121820 43% 100%);
  box-shadow:
    0 16px 34px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);

  .launcher-halo {
    background: rgba(255, 255, 255, 0.08);
  }

  .launcher-glass {
    inset: 12px;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 1px 10px rgba(255, 255, 255, 0.14) inset;
  }
}

.status-launcher.launcher-style-holo-chip {
  color: #ffffff;
  border-radius: 14px;
  clip-path: polygon(14% 0, 100% 0, 100% 76%, 76% 100%, 0 100%, 0 14%);
  border-color: rgba(255, 255, 255, 0.34);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.38), transparent 32%),
    linear-gradient(135deg, #8ee8ff, #c084fc 48%, #8bffcf);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.18) inset,
    0 0 22px rgba(142, 232, 255, 0.28),
    0 16px 34px rgba(39, 70, 82, 0.3);

  .launcher-halo {
    background: rgba(142, 232, 255, 0.2);
  }

  .launcher-glass {
    border-radius: 10px;
    clip-path: polygon(14% 0, 100% 0, 100% 76%, 76% 100%, 0 100%, 0 14%);
  }
}

.launcher-halo {
  position: absolute;
  inset: -7px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.16);
  animation: launcher-pulse 2.4s ease-out infinite;
}

.launcher-glass {
  position: absolute;
  inset: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 1px 10px rgba(255, 255, 255, 0.22) inset;
}

@keyframes launcher-pulse {
  0% {
    transform: scale(0.88);
    opacity: 0.75;
  }
  70%,
  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}

@media (max-width: 480px) {
  .status-launcher {
    width: 54px;
    height: 54px;

    i {
      font-size: 23px;
    }
  }
}
</style>
