import _ from 'lodash';
import { getLatestMvuData, replaceLatestMvuData } from '../shared/mvuStore';
import type { TimedStatusEffect } from '../shared/statusEngine';
import type { Item } from './types';

const PLAYER_STATUS_LIST_PATH = '临时状态.状态列表';
const PLAYER_STAMINA_PATH = '核心状态.$耐力';
const PLAYER_PLEASURE_PATH = '核心状态.$快感';
const PLAYER_MAX_STAMINA_PATH = '核心状态.$最大耐力';
const COMBAT_ENEMY_NAME_PATH = '性斗系统.对手名称';
const COMBAT_CLIMAX_LIMIT_PATH = '性斗系统.胜负规则.高潮次数上限';
const BACKPACK_PATH = '物品系统.背包';
const PLAYER_GENDER_PATH = '角色基础.性别';

export function normalizeClimaxLimit(value: unknown): number {
  return Math.max(1, Number(value) || 0);
}

export async function updateCombatStatData(
  updater: (statData: Record<string, any>, mvuData: Mvu.MvuData) => void | Promise<void>,
): Promise<Record<string, any> | null> {
  const mvuData = await getLatestMvuData();
  if (!mvuData?.stat_data) {
    return null;
  }

  await updater(mvuData.stat_data, mvuData);
  await replaceLatestMvuData(mvuData);
  return mvuData.stat_data;
}

export async function readCombatStatData<T>(
  reader: (statData: Record<string, any>, mvuData: Mvu.MvuData) => T | Promise<T>,
): Promise<T | null> {
  const mvuData = await getLatestMvuData();
  if (!mvuData?.stat_data) {
    return null;
  }

  return reader(mvuData.stat_data, mvuData);
}

export async function normalizeStoredClimaxLimit(mvuData: Mvu.MvuData): Promise<number> {
  const maxClimaxCountRaw = _.get(mvuData.stat_data, COMBAT_CLIMAX_LIMIT_PATH, 1);
  const maxClimaxCount = normalizeClimaxLimit(maxClimaxCountRaw);

  if (maxClimaxCountRaw !== maxClimaxCount) {
    _.set(mvuData.stat_data, COMBAT_CLIMAX_LIMIT_PATH, maxClimaxCount);
    await replaceLatestMvuData(mvuData);
  }

  return maxClimaxCount;
}

export async function readNormalizedCombatStatData(): Promise<{
  statData: Record<string, any>;
  maxClimaxCount: number;
} | null> {
  const mvuData = await getLatestMvuData();
  if (!mvuData?.stat_data) {
    return null;
  }

  return {
    statData: mvuData.stat_data,
    maxClimaxCount: await normalizeStoredClimaxLimit(mvuData),
  };
}

export async function persistCombatConfig(enemyName: string, climaxLimit: number): Promise<void> {
  await updateCombatStatData(statData => {
    _.set(statData, COMBAT_ENEMY_NAME_PATH, enemyName);
    _.set(statData, COMBAT_CLIMAX_LIMIT_PATH, normalizeClimaxLimit(climaxLimit));
  });
}

export async function persistPlayerCombatState(params: {
  items: Item[];
  stamina: number;
  pleasure: number;
  enemyName: string;
  maxClimaxCount: number;
}): Promise<void> {
  await updateCombatStatData(statData => {
    params.items.forEach(item => {
      const backpackPath = `物品系统.背包.${item.id}`;
      if (!_.has(statData, backpackPath)) return;

      if (item.quantity > 0) {
        _.set(statData, `${backpackPath}.数量`, item.quantity);
      } else {
        _.unset(statData, backpackPath);
      }
    });

    _.set(statData, PLAYER_STAMINA_PATH, params.stamina);
    _.set(statData, PLAYER_PLEASURE_PATH, params.pleasure);
    _.set(statData, COMBAT_ENEMY_NAME_PATH, params.enemyName);
    _.set(statData, COMBAT_CLIMAX_LIMIT_PATH, normalizeClimaxLimit(params.maxClimaxCount));
  });
}

export async function readPlayerGender(fallback: '男' | '女' = '男'): Promise<'男' | '女'> {
  const gender = await readCombatStatData(statData =>
    String(_.get(statData, PLAYER_GENDER_PATH, fallback) || fallback),
  );
  return gender === '男' ? '男' : '女';
}

export async function readCombatBackpack(): Promise<Record<string, any>> {
  const backpack = await readCombatStatData(statData => _.get(statData, BACKPACK_PATH, {}) as Record<string, any>);
  return backpack || {};
}

export async function readAgnesFeastContext(): Promise<{
  playerGender: '男' | '女';
  backpack: Record<string, any>;
}> {
  const context = await readCombatStatData(statData => {
    const gender = String(_.get(statData, PLAYER_GENDER_PATH, '女') || '女');
    const playerGender: '男' | '女' = gender === '男' ? '男' : '女';
    return {
      playerGender,
      backpack: (_.get(statData, BACKPACK_PATH, {}) || {}) as Record<string, any>,
    };
  });

  return context || { playerGender: '女', backpack: {} };
}

export async function getPlayerSkillRarity(skillId: string, fallback = 'C'): Promise<string> {
  const rarity = await readCombatStatData(statData =>
    _.get(statData, `技能系统.主动技能.${skillId}.基本信息.稀有度`, fallback),
  );
  return typeof rarity === 'string' && rarity ? rarity : fallback;
}

export async function decrementBackpackItem(itemName: string): Promise<boolean> {
  let changed = false;

  await updateCombatStatData(statData => {
    const backpack = (_.get(statData, BACKPACK_PATH, {}) || {}) as Record<string, any>;
    const itemInBackpack = backpack[itemName];
    if (!itemInBackpack) {
      return;
    }

    const currentQty = Number(itemInBackpack.数量 ?? itemInBackpack.quantity ?? 0) || 0;
    if (currentQty > 1) {
      itemInBackpack.数量 = currentQty - 1;
    } else {
      delete backpack[itemName];
    }

    _.set(statData, BACKPACK_PATH, backpack);
    changed = true;
  });

  return changed;
}

export async function grantBackpackItemIfMissing(itemName: string, itemData: Record<string, any>): Promise<boolean> {
  let granted = false;

  await updateCombatStatData(statData => {
    if (!_.get(statData, '物品系统')) {
      _.set(statData, '物品系统', {});
    }

    const backpack = (_.get(statData, BACKPACK_PATH, {}) || {}) as Record<string, any>;
    if (backpack[itemName]) {
      _.set(statData, BACKPACK_PATH, backpack);
      return;
    }

    backpack[itemName] = itemData;
    _.set(statData, BACKPACK_PATH, backpack);
    granted = true;
  });

  return granted;
}

export async function setPlayerResource(resource: 'stamina' | 'pleasure', value: number): Promise<void> {
  await updateCombatStatData(statData => {
    _.set(statData, resource === 'stamina' ? PLAYER_STAMINA_PATH : PLAYER_PLEASURE_PATH, value);
  });
}

export async function clearPlayerTemporaryStatuses(): Promise<void> {
  await setPlayerTemporaryStatusList({});
}

export async function readPlayerTemporaryStatusList(): Promise<Record<string, any>> {
  const statusList = await readCombatStatData(
    statData => _.get(statData, PLAYER_STATUS_LIST_PATH, {}) as Record<string, any>,
  );
  return statusList || {};
}

export async function setPlayerTemporaryStatusList(statusList: Record<string, any>): Promise<void> {
  await updateCombatStatData(statData => {
    _.set(statData, PLAYER_STATUS_LIST_PATH, statusList);
  });
}

export async function addPlayerTemporaryStatus(statusName: string, statusEffect: TimedStatusEffect): Promise<void> {
  await updateCombatStatData(statData => {
    const statusList = _.get(statData, PLAYER_STATUS_LIST_PATH, {}) as Record<string, any>;
    statusList[statusName] = statusEffect;
    _.set(statData, PLAYER_STATUS_LIST_PATH, statusList);
  });
}

export async function addUniquePlayerTemporaryStatus(
  baseStatusName: string,
  statusEffect: TimedStatusEffect,
): Promise<string | null> {
  let finalStatusName: string | null = null;

  await updateCombatStatData(statData => {
    const statusList = _.get(statData, PLAYER_STATUS_LIST_PATH, {}) as Record<string, any>;
    let statusName = baseStatusName;
    let index = 1;

    while (statusList[statusName]) {
      statusName = `${baseStatusName}_${index}`;
      index++;
    }

    statusList[statusName] = statusEffect;
    finalStatusName = statusName;
    _.set(statData, PLAYER_STATUS_LIST_PATH, statusList);
  });

  return finalStatusName;
}

export async function removePlayerTemporaryStatus(statusName: string): Promise<void> {
  await updateCombatStatData(statData => {
    const statusList = _.get(statData, PLAYER_STATUS_LIST_PATH, {}) as Record<string, any>;
    delete statusList[statusName];
    _.set(statData, PLAYER_STATUS_LIST_PATH, statusList);
  });
}

export async function applyPostBattlePlayerRecovery(): Promise<{
  oldPleasure: number;
  newPleasure: number;
  oldStamina: number;
  newStamina: number;
  staminaIncrease: number;
} | null> {
  let result: {
    oldPleasure: number;
    newPleasure: number;
    oldStamina: number;
    newStamina: number;
    staminaIncrease: number;
  } | null = null;

  await updateCombatStatData(statData => {
    const oldPleasure = Number(_.get(statData, PLAYER_PLEASURE_PATH, 0)) || 0;
    const maxStamina = Number(_.get(statData, PLAYER_MAX_STAMINA_PATH, 100)) || 100;
    const oldStamina = Number(_.get(statData, PLAYER_STAMINA_PATH, 0)) || 0;
    const newPleasure = Math.floor(oldPleasure / 2);
    const staminaIncrease = Math.floor(maxStamina * 0.2);
    const newStamina = Math.min(maxStamina, oldStamina + staminaIncrease);

    _.set(statData, PLAYER_PLEASURE_PATH, newPleasure);
    _.set(statData, PLAYER_STAMINA_PATH, newStamina);

    result = {
      oldPleasure,
      newPleasure,
      oldStamina,
      newStamina,
      staminaIncrease,
    };
  });

  return result;
}

export async function deductPlayerExpAndCoins(expLoss: number, coinLoss: number): Promise<void> {
  await updateCombatStatData(statData => {
    const currentExp = Number(_.get(statData, '角色基础.经验值', 0)) || 0;
    const currentCoins = Number(_.get(statData, '物品系统.学园金币', 0)) || 0;

    _.set(statData, '角色基础.经验值', Math.max(0, currentExp - expLoss));
    _.set(statData, '物品系统.学园金币', Math.max(0, currentCoins - coinLoss));
  });
}
