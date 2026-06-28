export const CHAT_USER_INFO_VARIABLE_KEY = '性斗学园当前聊天用户信息';
export const XUEDOU_WORLDBOOK_NAME = '性斗学园';
export const USER_WORLDBOOK_ENTRY_NAME = 'user';

const CHAT_VARIABLE_OPTION: VariableOption = { type: 'chat' };

function readVariables(option: VariableOption): Record<string, any> {
  try {
    const globalAny = window as any;
    if (typeof globalAny.getVariables === 'function') {
      return globalAny.getVariables(option) || {};
    }
  } catch (error) {
    console.warn('[性斗学园] 读取变量失败:', option, error);
  }

  return {};
}

export function getCurrentChatUserInfo(): string {
  const value = readVariables(CHAT_VARIABLE_OPTION)[CHAT_USER_INFO_VARIABLE_KEY];
  return typeof value === 'string' ? value.trim() : '';
}

export function saveCurrentChatUserInfo(userInfo: string): boolean {
  const content = String(userInfo || '').trim();
  if (!content) {
    return false;
  }

  try {
    const globalAny = window as any;
    if (typeof globalAny.insertOrAssignVariables === 'function') {
      globalAny.insertOrAssignVariables({ [CHAT_USER_INFO_VARIABLE_KEY]: content }, CHAT_VARIABLE_OPTION);
      return true;
    }
  } catch (error) {
    console.warn('[性斗学园] 写入当前聊天用户信息失败:', error);
  }

  return false;
}

export async function writeUserInfoToWorldbook(userInfo: string, logPrefix = '[性斗学园]'): Promise<boolean> {
  const content = String(userInfo || '').trim();
  if (!content) {
    return false;
  }

  const globalAny = window as any;
  let worldbookUpdated = false;
  let userEntryUid: number | null = null;

  try {
    if (typeof updateWorldbookWith === 'function') {
      let updatedByName = false;
      await updateWorldbookWith(
        XUEDOU_WORLDBOOK_NAME,
        (worldbook: any[]) => {
          const entry = worldbook.find((e: any) => e?.name === USER_WORLDBOOK_ENTRY_NAME);
          if (!entry) {
            return worldbook;
          }

          entry.content = content;
          const parsedUid = Number(entry.uid);
          if (Number.isFinite(parsedUid)) {
            userEntryUid = parsedUid;
          }
          updatedByName = true;
          return worldbook;
        },
        { render: 'immediate' },
      );

      if (updatedByName) {
        worldbookUpdated = true;
        console.info(`${logPrefix} 世界书 name=user 已通过 updateWorldbookWith 更新`);
      }
    }

    if (typeof getWorldbook === 'function' && typeof replaceWorldbook === 'function') {
      const worldbook = await getWorldbook(XUEDOU_WORLDBOOK_NAME);
      const entry = worldbook.find((e: any) => e?.name === USER_WORLDBOOK_ENTRY_NAME);
      if (entry) {
        entry.content = content;
        const parsedUid = Number(entry.uid);
        if (Number.isFinite(parsedUid)) {
          userEntryUid = parsedUid;
        }
        await replaceWorldbook(XUEDOU_WORLDBOOK_NAME, worldbook, { render: 'immediate' });
        worldbookUpdated = true;
        console.info(`${logPrefix} 世界书 name=user 已直接更新`);
      }
    }
  } catch (error) {
    console.warn(`${logPrefix} 直接访问世界书失败:`, error);
  }

  if (!worldbookUpdated) {
    if ((userEntryUid === null || !Number.isFinite(userEntryUid)) && typeof getWorldbook === 'function') {
      try {
        const worldbook = await getWorldbook(XUEDOU_WORLDBOOK_NAME);
        const entry = worldbook.find((e: any) => e?.name === USER_WORLDBOOK_ENTRY_NAME);
        const parsedUid = Number(entry?.uid);
        if (Number.isFinite(parsedUid)) {
          userEntryUid = parsedUid;
        }
      } catch (error) {
        console.warn(`${logPrefix} 获取 name=user 条目 uid 失败:`, error);
      }
    }

    if (userEntryUid === null || !Number.isFinite(userEntryUid)) {
      console.warn(`${logPrefix} 未找到世界书 name=user 条目，无法通过 slash 更新`);
    } else {
      const command = `/setentryfield file=${XUEDOU_WORLDBOOK_NAME} uid=${userEntryUid} field=content ${content}`;

      try {
        if (typeof triggerSlash === 'function') {
          await triggerSlash(command);
          worldbookUpdated = true;
          console.info(`${logPrefix} 已通过 triggerSlash 更新世界书 name=user`);
        }
      } catch (error) {
        console.warn(`${logPrefix} triggerSlash 执行失败:`, error);
      }

      if (!worldbookUpdated) {
        const executors = [
          () => globalAny.SillyTavern?.executeSlashCommand?.(command),
          () => globalAny.executeSlashCommand?.(command),
          () => globalAny.SillyTavern?.processSlashCommand?.(command),
          () => globalAny.parent?.SillyTavern?.executeSlashCommand?.(command),
          () => globalAny.parent?.executeSlashCommand?.(command),
        ];

        for (const executor of executors) {
          try {
            const result = await executor();
            if (result !== undefined && result !== false) {
              worldbookUpdated = true;
              console.info(`${logPrefix} 已通过 slash 命令执行器更新世界书 name=user`);
              break;
            }
          } catch {
            continue;
          }
        }
      }
    }
  }

  if (!worldbookUpdated) {
    console.warn(`${logPrefix} 无法自动更新世界书 name=user`);
  }

  return worldbookUpdated;
}

export async function syncCurrentChatUserInfoToWorldbook(logPrefix = '[性斗学园]'): Promise<boolean> {
  const userInfo = getCurrentChatUserInfo();
  if (!userInfo) {
    console.info(`${logPrefix} 当前聊天没有保存用户信息，跳过同步世界书 user 条目`);
    return false;
  }

  return writeUserInfoToWorldbook(userInfo, logPrefix);
}
