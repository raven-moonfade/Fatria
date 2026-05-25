export const PLAYER_AVATAR_STORAGE_KEY = 'xuedou_player_avatar_url';
export const ACTIVATED_CHEAT_CODES_STORAGE_KEY = 'xuedou_activated_cheat_codes';
export const UNLOCKED_CG_STORAGE_KEY = 'xuedou_unlocked_cgs';
export const SPECIAL_BATTLE_UNLOCK_STORAGE_KEY = 'xuedou_shop_special_battle_unlocked';

const LEGACY_PLAYER_AVATAR_KEYS = ['xuedou_profile_avatar_url', 'combat_player_custom_avatar'];
const LEGACY_UNLOCKED_CG_KEYS = ['unlocked_cgs'];
const LEGACY_SPECIAL_BATTLE_UNLOCK_KEYS = ['shop_unlock_special_battle'];

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('[性斗学园] localStorage 不可用:', error);
    return null;
  }
}

function getCurrentChatScope(): string {
  try {
    const globalAny = window as any;
    return String(globalAny.SillyTavern?.getCurrentChatId?.() || 'global');
  } catch {
    return 'global';
  }
}

function scopedKey(baseKey: string): string {
  return `${baseKey}:${getCurrentChatScope()}`;
}

export function getStoredPlayerAvatar(): string | null {
  const storage = getStorage();
  if (!storage) return null;

  const primaryKey = scopedKey(PLAYER_AVATAR_STORAGE_KEY);
  const primaryValue = storage.getItem(primaryKey);
  if (primaryValue?.trim()) {
    return primaryValue;
  }

  for (const legacyKey of LEGACY_PLAYER_AVATAR_KEYS) {
    const legacyValue = storage.getItem(legacyKey);
    if (legacyValue?.trim()) {
      storage.setItem(primaryKey, legacyValue);
      return legacyValue;
    }
  }

  return null;
}

export function saveStoredPlayerAvatar(avatarUrl: string): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(scopedKey(PLAYER_AVATAR_STORAGE_KEY), avatarUrl);
}

export function clearStoredPlayerAvatar(): void {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(scopedKey(PLAYER_AVATAR_STORAGE_KEY));
  for (const legacyKey of LEGACY_PLAYER_AVATAR_KEYS) {
    storage.removeItem(legacyKey);
  }
}

export function getActivatedCheatCodes(): Set<string> {
  const storage = getStorage();
  if (!storage) return new Set();

  const rawValue = storage.getItem(scopedKey(ACTIVATED_CHEAT_CODES_STORAGE_KEY));
  if (!rawValue) return new Set();

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((code): code is string => typeof code === 'string'));
  } catch (error) {
    console.warn('[性斗学园] 作弊码记录解析失败，将重置本地记录:', error);
    return new Set();
  }
}

export function saveActivatedCheatCodes(codes: Iterable<string>): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(scopedKey(ACTIVATED_CHEAT_CODES_STORAGE_KEY), JSON.stringify([...codes]));
}

function parseStoredStringSet(rawValue: string | null, label: string): Set<string> {
  if (!rawValue) return new Set();

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((value): value is string => typeof value === 'string'));
  } catch (error) {
    console.warn(`[性斗学园] ${label}解析失败，将忽略本地记录:`, error);
    return new Set();
  }
}

export function getUnlockedCGKeys(): Set<string> {
  const storage = getStorage();
  if (!storage) return new Set();

  const primaryKey = scopedKey(UNLOCKED_CG_STORAGE_KEY);
  const unlockedKeys = parseStoredStringSet(storage.getItem(primaryKey), 'CG解锁记录');

  for (const legacyKey of LEGACY_UNLOCKED_CG_KEYS) {
    const legacyKeys = parseStoredStringSet(storage.getItem(legacyKey), '旧CG解锁记录');
    for (const key of legacyKeys) {
      unlockedKeys.add(key);
    }
  }

  if (unlockedKeys.size > 0) {
    storage.setItem(primaryKey, JSON.stringify([...unlockedKeys]));
  }

  return unlockedKeys;
}

export function saveUnlockedCGKeys(keys: Iterable<string>): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(scopedKey(UNLOCKED_CG_STORAGE_KEY), JSON.stringify([...keys]));
}

export function unlockCGKey(cgKey: string): boolean {
  const unlockedKeys = getUnlockedCGKeys();
  if (unlockedKeys.has(cgKey)) {
    return false;
  }

  unlockedKeys.add(cgKey);
  saveUnlockedCGKeys(unlockedKeys);
  return true;
}

export function getCGImageKey(cgId: string, imageIndex: number): string {
  return `${cgId}-${imageIndex}`;
}

export function isSpecialBattleUnlocked(): boolean {
  const storage = getStorage();
  if (!storage) return false;

  const primaryValue = storage.getItem(scopedKey(SPECIAL_BATTLE_UNLOCK_STORAGE_KEY));
  if (primaryValue === '1') {
    return true;
  }

  for (const legacyKey of LEGACY_SPECIAL_BATTLE_UNLOCK_KEYS) {
    if (storage.getItem(legacyKey) === '1') {
      storage.setItem(scopedKey(SPECIAL_BATTLE_UNLOCK_STORAGE_KEY), '1');
      return true;
    }
  }

  return false;
}

export function saveSpecialBattleUnlocked(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(scopedKey(SPECIAL_BATTLE_UNLOCK_STORAGE_KEY), '1');
}
