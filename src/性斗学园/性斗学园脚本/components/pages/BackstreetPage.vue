<template>
  <div class="backstreet-page">
    <aside v-if="!activeContact" class="contact-panel">
      <div class="contact-toolbar">
        <button class="home-back-btn" type="button" title="返回主菜单" aria-label="返回主菜单" @click="emit('backHome')">
          <i class="fas fa-chevron-left"></i>
        </button>
        <div class="search-row">
          <i class="fas fa-magnifying-glass"></i>
          <input v-model="searchText" type="text" placeholder="搜索联系人" />
        </div>
      </div>

      <div class="contact-list">
        <button
          v-for="contact in filteredContacts"
          :key="contact.id"
          class="contact-item"
          type="button"
          @click="selectContact(contact.name)"
        >
          <span class="contact-avatar">
            <img
              v-if="shouldUseAvatarImage(contact.name)"
              :src="getAvatarUrl(contact.name)"
              :alt="contact.name"
              @error="markAvatarFailed(contact.name)"
            />
            <span v-else>{{ contactInitial(contact.name) }}</span>
          </span>
          <span class="contact-main">
            <span class="contact-name">{{ contact.name }}</span>
            <span class="contact-last">{{ contact.lastMessage || ' ' }}</span>
          </span>
          <span class="contact-time">{{ contact.lastTime }}</span>
        </button>

        <div v-if="filteredContacts.length === 0" class="empty-state">
          <i class="fas fa-user-slash"></i>
          <span>没有联系人</span>
        </div>
      </div>
    </aside>

    <section v-else class="chat-panel">
      <header class="chat-header">
        <button class="header-back-btn" type="button" title="联系人" aria-label="联系人" @click="backToContacts">
          <i class="fas fa-chevron-left"></i>
        </button>
        <div class="chat-title">
          <span class="chat-title-avatar">
            <img
              v-if="shouldUseAvatarImage(activeContact)"
              :src="getAvatarUrl(activeContact)"
              :alt="activeContact"
              @error="markAvatarFailed(activeContact)"
            />
            <span v-else>{{ contactInitial(activeContact) }}</span>
          </span>
          <div class="chat-title-info">
            <span class="chat-title-name">{{ activeContact }}</span>
            <span class="chat-title-status"><i class="status-dot"></i>在线</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="header-action-btn" type="button" title="刷新" aria-label="刷新" @click="loadThread(activeContact)">
            <i class="fas fa-rotate"></i>
          </button>
        </div>
      </header>

      <div ref="messageListRef" class="message-list">
        <template v-for="(message, index) in visibleMessages" :key="message.id">
          <div v-if="shouldShowTimestamp(index)" class="time-divider">
            <span>{{ message.time }}</span>
          </div>

          <div class="message-row" :class="message.sender">
            <!-- Contact / system avatar on the left -->
            <span v-if="message.sender === 'contact' || message.sender === 'system'" class="msg-avatar">
              <img
                v-if="shouldUseAvatarImage(activeContact)"
                :src="getAvatarUrl(activeContact)"
                :alt="activeContact"
                @error="markAvatarFailed(activeContact)"
              />
              <span v-else>{{ contactInitial(activeContact) }}</span>
            </span>

            <div class="message-bubble">
              <button class="message-delete" type="button" title="删除此处及以下消息" aria-label="删除此处及以下消息" @click="deleteMessage(message)">
                <i class="fas fa-trash-can"></i>
              </button>
              <div class="message-text">{{ message.text }}</div>
            </div>

            <!-- User avatar on the right -->
            <span v-if="message.sender === 'user'" class="msg-avatar user-avatar">
              <img v-if="playerAvatarUrl" :src="playerAvatarUrl" alt="我" />
              <i v-else class="fas fa-user"></i>
            </span>
          </div>
        </template>

        <div v-if="messages.length === 0" class="empty-state chat-empty">
          <i class="fas fa-comment-dots"></i>
          <span>暂无消息</span>
        </div>

        <div v-if="isSending" class="message-row contact">
          <span class="msg-avatar">
            <img
              v-if="shouldUseAvatarImage(activeContact)"
              :src="getAvatarUrl(activeContact)"
              :alt="activeContact"
              @error="markAvatarFailed(activeContact)"
            />
            <span v-else>{{ contactInitial(activeContact) }}</span>
          </span>
          <div class="message-bubble typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>

      <div v-if="errorText" class="error-row">
        <i class="fas fa-triangle-exclamation"></i>
        <span>{{ errorText }}</span>
      </div>

      <form class="composer" @submit.prevent="sendMessage">
        <textarea
          v-model="draft"
          :disabled="isSending"
          rows="1"
          placeholder="发送消息…"
          @keydown.enter.exact.prevent="sendMessage"
        ></textarea>
        <button class="composer-send" type="submit" title="发送" aria-label="发送" :disabled="isSending || !draft.trim()">
          <i class="fas fa-paper-plane"></i>
        </button>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { backstreetService } from '../../phone/backstreetService';
import type { BackstreetContact, BackstreetMessage } from '../../phone/types';
import { ENEMY_DATABASE, NAME_ALIASES } from '../../../战斗界面/enemyDatabase';
import { getStoredPlayerAvatar } from '../../../shared/localPreferences';

const props = defineProps<{
  characterData: any;
}>();

const emit = defineEmits<{
  (event: 'backHome'): void;
}>();

const PHONE_PREFS_STORAGE_KEY = 'fatria-status-phone-preferences-v1';
const PHONE_PREFS_UPDATED_EVENT = 'fatria-status-phone-preferences-updated';
const DEFAULT_VISIBLE_MESSAGE_COUNT = 20;

const contacts = ref<BackstreetContact[]>([]);
const messages = ref<BackstreetMessage[]>([]);
const activeContact = ref('');
const searchText = ref('');
const draft = ref('');
const isSending = ref(false);
const errorText = ref('');
const messageListRef = ref<HTMLElement | null>(null);
const failedAvatars = ref(new Set<string>());
const playerAvatarUrl = ref('');
const visibleMessageCount = ref(readVisibleMessageCount());

const filteredContacts = computed(() => {
  const query = searchText.value.trim().toLowerCase();
  const list = contacts.value;
  if (!query) return list.slice(0, 120);
  return list.filter(contact => contact.name.toLowerCase().includes(query)).slice(0, 120);
});
const visibleMessages = computed(() => messages.value.slice(-visibleMessageCount.value));

watch(
  () => props.characterData,
  () => {
    loadContacts();
  },
  { deep: false },
);

onMounted(() => {
  loadContacts();
  loadPlayerAvatar();
  window.addEventListener(PHONE_PREFS_UPDATED_EVENT, handlePhonePreferencesUpdated);
  window.addEventListener('storage', handlePhonePreferencesStorage);
});

onUnmounted(() => {
  window.removeEventListener(PHONE_PREFS_UPDATED_EVENT, handlePhonePreferencesUpdated);
  window.removeEventListener('storage', handlePhonePreferencesStorage);
});

watch(visibleMessageCount, () => {
  scrollToBottom();
});

function clampVisibleMessageCount(value: unknown): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return DEFAULT_VISIBLE_MESSAGE_COUNT;
  return Math.min(100, Math.max(5, Math.round(numericValue)));
}

function readVisibleMessageCount(): number {
  try {
    const raw = window.localStorage?.getItem(PHONE_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE_MESSAGE_COUNT;
    const parsed = JSON.parse(raw) as { backstreetVisibleMessageCount?: unknown };
    return clampVisibleMessageCount(parsed.backstreetVisibleMessageCount);
  } catch {
    return DEFAULT_VISIBLE_MESSAGE_COUNT;
  }
}

function syncVisibleMessageCount() {
  visibleMessageCount.value = readVisibleMessageCount();
}

function handlePhonePreferencesUpdated(event: Event) {
  const detail = (event as CustomEvent).detail;
  if (detail && Object.prototype.hasOwnProperty.call(detail, 'backstreetVisibleMessageCount')) {
    visibleMessageCount.value = clampVisibleMessageCount(detail.backstreetVisibleMessageCount);
    return;
  }
  syncVisibleMessageCount();
}

function handlePhonePreferencesStorage(event: StorageEvent) {
  if (event.key && event.key !== PHONE_PREFS_STORAGE_KEY) return;
  syncVisibleMessageCount();
}

function loadPlayerAvatar() {
  try {
    const url = getStoredPlayerAvatar();
    playerAvatarUrl.value = url?.trim() || '';
  } catch {
    playerAvatarUrl.value = '';
  }
}

async function loadContacts() {
  try {
    contacts.value = await backstreetService.listContacts(props.characterData || {});
  } catch (error) {
    console.warn('[后街页面] 联系人加载失败:', error);
    errorText.value = '联系人加载失败';
  }
}

async function selectContact(name: string) {
  activeContact.value = name;
  loadPlayerAvatar();
  await loadThread(name);
}

async function loadThread(name: string) {
  try {
    errorText.value = '';
    messages.value = await backstreetService.getMessages(name);
    await scrollToBottom();
  } catch (error) {
    console.warn('[后街页面] 聊天加载失败:', error);
    errorText.value = '聊天加载失败';
  }
}

async function sendMessage() {
  const contact = activeContact.value;
  const text = draft.value.trim();
  if (!contact || !text || isSending.value) return;

  draft.value = '';
  isSending.value = true;
  errorText.value = '';

  try {
    const userMessage = await backstreetService.appendUserMessage(contact, text, props.characterData || {});
    messages.value = [...messages.value, userMessage];
    await scrollToBottom();
    await loadContacts();

    const replies = await backstreetService.generateContactReply(contact, props.characterData || {});
    messages.value = [...messages.value, ...replies];
    await loadContacts();
  } catch (error) {
    console.error('[后街页面] 发送失败:', error);
    errorText.value = error instanceof Error ? error.message : '发送失败';
    await loadThread(contact);
  } finally {
    isSending.value = false;
    await scrollToBottom();
  }
}

async function deleteMessage(message: BackstreetMessage) {
  const contact = activeContact.value;
  if (!contact || isSending.value) return;
  try {
    errorText.value = '';
    messages.value = await backstreetService.deleteMessage(contact, message.id);
    await loadContacts();
    await scrollToBottom();
  } catch (error) {
    console.error('[后街页面] 删除消息失败:', error);
    errorText.value = error instanceof Error ? error.message : '删除失败';
  }
}

function backToContacts() {
  activeContact.value = '';
  messages.value = [];
  loadContacts();
}

function resolveAvatarFullName(rawName: string): string {
  const name = rawName.trim();
  if (!name) return name;
  if (name in ENEMY_DATABASE) return name;

  for (const [alias, fullName] of Object.entries(NAME_ALIASES)) {
    if (name.includes(alias)) return fullName;
  }

  return name;
}

function getAvatarUrl(name: string): string {
  const fullName = resolveAvatarFullName(name);
  return `https://img.vinsimage.org/性斗学园/头像/${encodeURIComponent(fullName)}.png`;
}

function shouldUseAvatarImage(name: string): boolean {
  const fullName = resolveAvatarFullName(name);
  return !!fullName && !failedAvatars.value.has(fullName);
}

function markAvatarFailed(name: string) {
  const fullName = resolveAvatarFullName(name);
  const next = new Set(failedAvatars.value);
  next.add(fullName);
  failedAvatars.value = next;
}

function contactInitial(name: string): string {
  return name.trim().slice(0, 1) || '后';
}

/** Show timestamp divider if first message or time changed from previous */
function shouldShowTimestamp(index: number): boolean {
  if (index === 0) return true;
  const prev = visibleMessages.value[index - 1];
  const curr = visibleMessages.value[index];
  return prev.time !== curr.time;
}

async function scrollToBottom() {
  await nextTick();
  const el = messageListRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}
</script>

<style scoped lang="scss">
/* ═══════════════════════════════════════════════════════
   Root Container — transparent dark theme to blend
   with the phone frame's wallpaper / gradient
   ═══════════════════════════════════════════════════════ */
.backstreet-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #f0ecff;
  background: transparent;
}

/* ═══════════════════════════════════════════════════════
   Contact List Panel
   ═══════════════════════════════════════════════════════ */
.contact-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px 0;
}

.contact-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.home-back-btn {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.88);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  backdrop-filter: blur(8px);
  transition:
    background 0.15s,
    transform 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
}

.search-row {
  min-width: 0;
  flex: 1;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 14px;
  padding: 0 13px;
  color: rgba(240, 236, 255, 0.6);
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(8px);

  i {
    font-size: 13px;
    flex-shrink: 0;
  }

  input {
    min-width: 0;
    flex: 1;
    height: 100%;
    border: 0 !important;
    outline: 0 !important;
    background: transparent !important;
    color: #fff !important;
    font: inherit;
    font-size: 14px;
    box-shadow: none !important;

    &::placeholder {
      color: rgba(240, 236, 255, 0.4) !important;
    }
  }
}

.contact-list {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.contact-item {
  min-height: 62px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  color: #f0ecff;
  background: rgba(255, 255, 255, 0.06);
  text-align: left;
  backdrop-filter: blur(6px);
  transition:
    transform 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.18);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.99);
  }
}

.contact-avatar {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  font-size: 17px;
  overflow: hidden;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.06));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.contact-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-name,
.contact-last,
.contact-time {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}

.contact-last {
  font-size: 12px;
  color: rgba(240, 236, 255, 0.5);
}

.contact-time {
  font-size: 11px;
  color: rgba(240, 236, 255, 0.4);
  align-self: flex-start;
  margin-top: 2px;
}

/* ═══════════════════════════════════════════════════════
   Chat Panel
   ═══════════════════════════════════════════════════════ */
.chat-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* ═══════════════════════════════════════════════════════
   Chat Header — frosted glass bar
   ═══════════════════════════════════════════════════════ */
.chat-header {
  min-height: 52px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(10, 14, 28, 0.45);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(14px);
}

.header-back-btn {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.08);
  font-size: 15px;
  flex-shrink: 0;
  transition:
    background 0.15s,
    transform 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
}

.chat-title {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-title-avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.chat-title-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.chat-title-name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-title-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #6ee7b7;
  font-weight: 500;
}

.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6ee7b7;
  box-shadow: 0 0 6px rgba(110, 231, 183, 0.5);
}

.header-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.header-action-btn {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.06);
  font-size: 13px;
  transition:
    background 0.15s,
    color 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.9);
  }
}

/* ═══════════════════════════════════════════════════════
   Message List
   ═══════════════════════════════════════════════════════ */
.message-list {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 8px;
}

/* ═══════════════════════════════════════════════════════
   Time Divider
   ═══════════════════════════════════════════════════════ */
.time-divider {
  display: flex;
  justify-content: center;
  padding: 10px 0 8px;

  span {
    font-size: 11px;
    color: rgba(240, 236, 255, 0.45);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 3px 14px;
    backdrop-filter: blur(4px);
  }
}

/* ═══════════════════════════════════════════════════════
   Message Row
   ═══════════════════════════════════════════════════════ */
.message-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 14px;
  gap: 8px;
  padding: 0 10px;

  /* ── User messages: bubble first, avatar on the right ── */
  &.user {
    justify-content: flex-end;

    .message-bubble {
      color: #fff;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 16px 4px 16px 16px;
      box-shadow:
        0 4px 16px rgba(99, 102, 241, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);

      &::after {
        content: '';
        position: absolute;
        top: 10px;
        right: -6px;
        width: 0;
        height: 0;
        border: 6px solid transparent;
        border-left-color: #8b5cf6;
        border-right: 0;
      }
    }
  }

  /* ── Contact / system messages: avatar on left ── */
  &.contact,
  &.system {
    .message-bubble {
      color: #f0ecff;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 4px 16px 16px 16px;
      backdrop-filter: blur(6px);
      box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);

      &::after {
        content: '';
        position: absolute;
        top: 10px;
        left: -6px;
        width: 0;
        height: 0;
        border: 6px solid transparent;
        border-right-color: rgba(255, 255, 255, 0.1);
        border-left: 0;
      }
    }
  }
}

/* ═══════════════════════════════════════════════════════
   Message Avatar (both sides)
   ═══════════════════════════════════════════════════════ */
.msg-avatar {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  i {
    font-size: 15px;
    opacity: 0.7;
  }
}

.user-avatar {
  background: linear-gradient(145deg, #6366f1, #8b5cf6);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.18),
    0 4px 12px rgba(99, 102, 241, 0.25);
}

/* ═══════════════════════════════════════════════════════
   Message Bubble
   ═══════════════════════════════════════════════════════ */
.message-bubble {
  position: relative;
  max-width: min(76%, 270px);
  padding: 10px 13px;
}

.message-delete {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  opacity: 0;
  transform: scale(0.8);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease,
    background 0.15s ease;
  z-index: 2;

  i {
    font-size: 10px;
  }

  &:hover {
    background: #ef4444;
  }
}

.message-bubble:hover .message-delete,
.message-delete:focus-visible {
  opacity: 1;
  transform: scale(1);
}

@media (hover: none) {
  .message-delete {
    opacity: 0.7;
    transform: scale(1);
  }
}

.message-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 14px;
  line-height: 1.5;
  letter-spacing: 0.01em;
}

/* ═══════════════════════════════════════════════════════
   Typing Indicator
   ═══════════════════════════════════════════════════════ */
.typing {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 14px 18px !important;

  span {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: rgba(240, 236, 255, 0.5);
    animation: typing-pulse 1.2s ease-in-out infinite;
  }

  span:nth-child(2) {
    animation-delay: 0.15s;
  }

  span:nth-child(3) {
    animation-delay: 0.3s;
  }
}

/* ═══════════════════════════════════════════════════════
   Composer Bar — frosted glass bottom bar
   ═══════════════════════════════════════════════════════ */
.composer {
  min-height: 56px;
  padding: 8px 10px 8px;
  display: flex;
  align-items: flex-end;
  gap: 7px;
  background: rgba(10, 14, 28, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(14px);

  textarea {
    min-width: 0;
    flex: 1;
    max-height: 88px;
    resize: none;
    border: 1px solid rgba(33, 49, 59, 0.12) !important;
    border-radius: 18px;
    padding: 9px 14px;
    outline: 0 !important;
    color: #27313d !important;
    background: rgba(255, 255, 255, 0.92) !important;
    font: inherit;
    font-size: 14px;
    line-height: 1.45;
    box-shadow: none !important;
    transition: border-color 0.15s;

    &::placeholder {
      color: rgba(39, 49, 61, 0.36) !important;
    }

    &:focus {
      border-color: rgba(99, 102, 241, 0.42) !important;
      background: #fff !important;
    }
  }
}

.composer-send {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(145deg, #6366f1, #8b5cf6);
  font-size: 14px;
  flex-shrink: 0;
  box-shadow:
    0 4px 14px rgba(99, 102, 241, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition:
    opacity 0.15s,
    transform 0.15s;

  &:disabled {
    opacity: 0.35;
    box-shadow: none;
  }

  &:not(:disabled):hover {
    transform: scale(1.06);
  }

  &:not(:disabled):active {
    transform: scale(0.95);
  }
}



/* ═══════════════════════════════════════════════════════
   Error & Empty States
   ═══════════════════════════════════════════════════════ */
.error-row,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
}

.error-row {
  min-height: 34px;
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.15);
  border-top: 1px solid rgba(239, 68, 68, 0.12);
  padding: 0 12px;
  backdrop-filter: blur(6px);
}

.empty-state {
  color: rgba(240, 236, 255, 0.4);
  padding: 24px 0;
}

.chat-empty {
  height: 100%;
}

/* ═══════════════════════════════════════════════════════
   Animations
   ═══════════════════════════════════════════════════════ */
@keyframes typing-pulse {
  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}
</style>
