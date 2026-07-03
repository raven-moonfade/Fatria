import type { CharacterData } from '../types';
import { Gender } from '../types';
import { assertPersonaContentClean } from './personaContentGuard';

export type PlayerPersonaWriteStatus = 'created' | 'replaced';

export type PlayerPersonaWriteResult = {
  name: string;
  status: PlayerPersonaWriteStatus;
  activated: boolean;
};

type PersonaApi = {
  getPersonaNames: typeof getPersonaNames;
  getPersona: typeof getPersona;
  createPersona: typeof createPersona;
  updatePersonaWith: typeof updatePersonaWith;
};

function getGlobalApi(name: string): unknown {
  const globalAny = window as any;
  return globalAny[name] || globalAny.TavernHelper?.[name];
}

function getPersonaApi(): PersonaApi {
  const getPersonaNamesApi = getGlobalApi('getPersonaNames');
  const getPersonaApi = getGlobalApi('getPersona');
  const createPersonaApi = getGlobalApi('createPersona');
  const updatePersonaWithApi = getGlobalApi('updatePersonaWith');

  if (
    typeof getPersonaNamesApi !== 'function' ||
    typeof getPersonaApi !== 'function' ||
    typeof createPersonaApi !== 'function' ||
    typeof updatePersonaWithApi !== 'function'
  ) {
    throw new Error('当前酒馆助手没有暴露用户人设管理接口，无法自动创建用户人设。');
  }

  return {
    getPersonaNames: getPersonaNamesApi as typeof getPersonaNames,
    getPersona: getPersonaApi as typeof getPersona,
    createPersona: createPersonaApi as typeof createPersona,
    updatePersonaWith: updatePersonaWithApi as typeof updatePersonaWith,
  };
}

export function normalizePlayerPersonaName(name: string): string {
  return String(name || '').trim();
}

export function getPlayerPersonaNameMatchCount(name: string): number {
  const personaName = normalizePlayerPersonaName(name);
  if (!personaName) {
    return 0;
  }

  const { getPersonaNames: getPersonaNamesApi } = getPersonaApi();
  return getPersonaNamesApi().filter(item => String(item || '').trim() === personaName).length;
}

function getGenderText(data: CharacterData): string {
  const hasBreasts = data.configFeatures?.hasBreasts ?? data.gender === Gender.FEMALE;
  const hasPenis = data.configFeatures?.hasPenis ?? data.gender === Gender.MALE;

  if (hasBreasts && hasPenis) return '扶她';
  if (hasPenis) return '男';
  if (hasBreasts) return '女';
  return '无性';
}

export function buildPlayerPersonaDescription(data: CharacterData): string {
  const name = normalizePlayerPersonaName(data.name);
  if (!name) {
    throw new Error('请先填写姓名，再创建用户人设。');
  }

  if (!data.palettePersona?.trim()) {
    throw new Error('请先生成用户信息，再创建用户人设。');
  }

  assertPersonaContentClean('用户信息', data.palettePersona);

  const parts: string[] = ['【基础信息】', `姓名：${name}`, `年龄：${data.age}`, `性别：${getGenderText(data)}`];

  if (data.appearance?.trim()) {
    assertPersonaContentClean('外貌描述', data.appearance);
    parts.push('', '【外貌】', data.appearance.trim());
  }

  if (data.personality?.trim()) {
    assertPersonaContentClean('背景', data.personality);
    parts.push('', '【背景】', data.personality.trim());
  }

  parts.push('', '【用户信息】', data.palettePersona.trim());

  return `<用户信息>\n${parts.join('\n')}\n</用户信息>`;
}

function quoteSlashArgument(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

async function activatePlayerPersona(personaName: string): Promise<boolean> {
  const command = `/persona-set mode=lookup ${quoteSlashArgument(personaName)}`;
  const globalAny = window as any;
  const triggerSlashApi = globalAny.triggerSlash || globalAny.TavernHelper?.triggerSlash;

  if (typeof triggerSlashApi === 'function') {
    await triggerSlashApi(command);
    return true;
  }

  const executors: Array<() => unknown | Promise<unknown>> = [
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
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

function normalizePersonaDescription(value: string): string {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .trim();
}

async function writePlayerPersonaDescription(api: PersonaApi, personaName: string, description: string): Promise<void> {
  await api.updatePersonaWith(
    personaName,
    persona => ({
      ...persona,
      name: personaName,
      title: personaName,
      description,
    }),
    { render: 'immediate' },
  );
}

export async function createOrReplacePlayerPersonaFromCharacter(data: CharacterData): Promise<PlayerPersonaWriteResult> {
  const personaName = normalizePlayerPersonaName(data.name);
  const description = buildPlayerPersonaDescription(data);
  const api = getPersonaApi();
  const matchCount = getPlayerPersonaNameMatchCount(personaName);

  if (matchCount > 1) {
    throw new Error(`酒馆中存在多个名为「${personaName}」的用户人设，无法安全覆盖。请先在用户人设管理里处理重名项。`);
  }

  const personaPayload = {
    name: personaName,
    title: personaName,
    description,
  };

  if (matchCount === 0) {
    const created = await api.createPersona(personaName, personaPayload, { render: 'none' });
    if (!created) {
      throw new Error(`创建用户人设「${personaName}」失败，可能已经存在同名或同头像用户人设。`);
    }
  }

  await writePlayerPersonaDescription(api, personaName, description);

  const savedPersona = api.getPersona(personaName);
  const expectedDescription = normalizePersonaDescription(description);
  const savedDescription = normalizePersonaDescription(savedPersona?.description || '');
  if (savedDescription !== expectedDescription) {
    throw new Error(
      `用户人设「${personaName}」写入后读回校验失败：酒馆保存的 description 长度 ${savedDescription.length}，本次应写入 ${expectedDescription.length}。`,
    );
  }

  const activated = await activatePlayerPersona(personaName);
  if (!activated) {
    throw new Error(`用户人设「${personaName}」已写入，但自动启用失败。请检查酒馆 Slash 命令接口。`);
  }

  return {
    name: personaName,
    status: matchCount === 0 ? 'created' : 'replaced',
    activated,
  };
}
