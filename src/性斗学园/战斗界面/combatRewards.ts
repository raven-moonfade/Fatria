import { resolveEnemyName } from './enemyDatabase';
import { createVirtueItemMvuData, getVirtueItemByBoss } from './virtueItems';
import type { VirtueItem } from './virtueItems';
import { grantBackpackItemIfMissing, readCombatStatData } from './combatPersistence';
import type { CombatLogEntry } from './types';
import {
  createLegendaryEquipmentMvuData,
  EXORCISM_FINAL_REWARD_EQUIPMENT,
  isSevenSinsBossProgressComplete,
  normalizeSevenSinsBossProgress,
  resolveSevenSinByEnemyName,
  SEVEN_SIN_KEYS,
  SEVEN_SIN_LEGACY_DROP_NAMES,
  SEVEN_SINS_PROGRESS_VARIABLE_KEY,
  SEVEN_SINS_REWARD_EQUIPMENT,
  type SevenSinsBossProgress,
} from '../shared/legendaryEquipment';

export interface RewardLog {
  message: string;
  type: CombatLogEntry['type'];
}

function formatVirtueBonusText(bonuses: VirtueItem['bonuses']): string {
  return Object.entries(bonuses)
    .filter(([, value]) => value !== 0 && value !== undefined)
    .map(([key, value]) => `${key.replace('加成', '').replace('基础', '')}+${value}`)
    .join(', ');
}

function formatLegendaryBonusText(bonuses: Record<string, any>): string {
  return Object.entries(bonuses)
    .filter(([, value]) => Number(value) !== 0)
    .map(([key, value]) => `${key.replace('加成', '').replace('基础', '')}+${value}`)
    .join(', ');
}

function readSevenSinsBossProgressFromChat(): SevenSinsBossProgress {
  try {
    const globalAny = globalThis as any;
    if (typeof globalAny.getVariables !== 'function') {
      return normalizeSevenSinsBossProgress(null);
    }

    const chatVariables = globalAny.getVariables({ type: 'chat' }) || {};
    return normalizeSevenSinsBossProgress(chatVariables[SEVEN_SINS_PROGRESS_VARIABLE_KEY]);
  } catch (error) {
    console.warn('[战斗界面] 读取七罪Boss进度失败', error);
    return normalizeSevenSinsBossProgress(null);
  }
}

function writeSevenSinsBossProgressToChat(progress: SevenSinsBossProgress): void {
  try {
    const globalAny = globalThis as any;
    if (typeof globalAny.insertOrAssignVariables !== 'function') {
      console.warn('[战斗界面] insertOrAssignVariables 不可用，无法写入七罪Boss进度');
      return;
    }

    globalAny.insertOrAssignVariables({ [SEVEN_SINS_PROGRESS_VARIABLE_KEY]: progress }, { type: 'chat' });
  } catch (error) {
    console.warn('[战斗界面] 写入七罪Boss进度失败', error);
  }
}

async function readOwnedEquipmentNames(): Promise<Set<string>> {
  const names = await readCombatStatData(statData => {
    const owned = new Set<string>();
    const backpack = statData?.物品系统?.背包 || {};
    Object.keys(backpack).forEach(itemName => owned.add(itemName));

    const slots = statData?.物品系统?._装备栏 || {};
    Object.values(slots).forEach((slot: any) => {
      const equipmentName = String(slot?.名称 || '');
      if (equipmentName) {
        owned.add(equipmentName);
      }
    });

    return owned;
  });

  return names || new Set<string>();
}

function syncSevenSinsProgressByLegacyDrops(
  progress: SevenSinsBossProgress,
  ownedEquipmentNames: Set<string>,
): boolean {
  let changed = false;

  SEVEN_SIN_KEYS.forEach(sin => {
    if (!progress[sin] && ownedEquipmentNames.has(SEVEN_SIN_LEGACY_DROP_NAMES[sin])) {
      progress[sin] = true;
      changed = true;
    }
  });

  if (!progress.七罪王冠已领取 && ownedEquipmentNames.has(SEVEN_SINS_REWARD_EQUIPMENT.name)) {
    progress.七罪王冠已领取 = true;
    changed = true;
  }

  return changed;
}

async function syncSevenSinsBossReward(enemyName: string, resolvedEnemyName: string): Promise<RewardLog[]> {
  const logs: RewardLog[] = [];
  const progress = readSevenSinsBossProgressFromChat();
  const ownedEquipmentNames = await readOwnedEquipmentNames();
  let changed = syncSevenSinsProgressByLegacyDrops(progress, ownedEquipmentNames);
  const legacySynced = changed;

  const defeatedSin = resolveSevenSinByEnemyName(`${enemyName} ${resolvedEnemyName}`);
  if (defeatedSin && !progress[defeatedSin]) {
    progress[defeatedSin] = true;
    changed = true;
    const defeatedCount = SEVEN_SIN_KEYS.filter(sin => progress[sin]).length;
    logs.push({
      message: `【七罪进度】已记录击败${defeatedSin}Boss（${defeatedCount}/7）`,
      type: 'info',
    });
  }

  if (legacySynced) {
    logs.push({
      message: '【七罪进度】已根据旧存档中的七美德/七罪装备同步击败记录。',
      type: 'info',
    });
  }

  if (isSevenSinsBossProgressComplete(progress) && !progress.七罪王冠已领取) {
    const granted = await grantBackpackItemIfMissing(
      SEVEN_SINS_REWARD_EQUIPMENT.name,
      createLegendaryEquipmentMvuData(SEVEN_SINS_REWARD_EQUIPMENT),
    );
    progress.七罪王冠已领取 = true;
    changed = true;

    if (granted) {
      logs.push({
        message: `【七宗罪】七罪归一，获得EX特殊装备：${SEVEN_SINS_REWARD_EQUIPMENT.name}`,
        type: 'victory',
      });
      logs.push({
        message: `效果：${formatLegendaryBonusText(SEVEN_SINS_REWARD_EQUIPMENT.bonuses)}`,
        type: 'buff',
      });
    }
  }

  if (changed) {
    writeSevenSinsBossProgressToChat(progress);
  }

  return logs;
}

function isExorcismFinalBoss(enemyName: string, resolvedEnemyName: string): boolean {
  const text = `${enemyName} ${resolvedEnemyName}`.toLowerCase();
  return text.includes('万魔之母') || text.includes('万魔母') || text.includes('mother_demon');
}

export async function grantVictoryRewards(enemyName: string, isVictory: boolean): Promise<RewardLog[]> {
  if (!isVictory) {
    return [];
  }

  const logs: RewardLog[] = [];
  const resolvedEnemyName = resolveEnemyName(enemyName).replace(/_\d+$/g, '');

  try {
    const virtueItem = getVirtueItemByBoss(resolvedEnemyName);
    if (virtueItem) {
      const granted = await grantBackpackItemIfMissing(virtueItem.name, createVirtueItemMvuData(virtueItem));
      if (granted) {
        logs.push({
          message: `【七美德】获得SS级特殊装备：${virtueItem.name}`,
          type: 'victory',
        });
        logs.push({
          message: `效果：${formatVirtueBonusText(virtueItem.bonuses)}`,
          type: 'buff',
        });
      }
    }
  } catch (error) {
    console.warn('[战斗界面] 发放七美德装备失败', error);
  }

  try {
    if (isExorcismFinalBoss(enemyName, resolvedEnemyName)) {
      const granted = await grantBackpackItemIfMissing(
        EXORCISM_FINAL_REWARD_EQUIPMENT.name,
        createLegendaryEquipmentMvuData(EXORCISM_FINAL_REWARD_EQUIPMENT),
      );

      if (granted) {
        logs.push({
          message: `【驱魔净化】获得SSS级特殊装备：${EXORCISM_FINAL_REWARD_EQUIPMENT.name}`,
          type: 'victory',
        });
        logs.push({
          message: `效果：${formatLegendaryBonusText(EXORCISM_FINAL_REWARD_EQUIPMENT.bonuses)}`,
          type: 'buff',
        });
      }
    }
  } catch (error) {
    console.warn('[战斗界面] 发放净罪白蔷薇失败', error);
  }

  try {
    logs.push(...(await syncSevenSinsBossReward(enemyName, resolvedEnemyName)));
  } catch (error) {
    console.warn('[战斗界面] 同步七罪Boss奖励失败', error);
  }

  try {
    if (resolvedEnemyName === '沐芯兰' || resolvedEnemyName.toLowerCase().includes('muxinlan')) {
      const granted = await grantBackpackItemIfMissing('沐芯兰的权限卡', {
        等级: 'SS',
        描述: '沐芯兰战败后获得的战利品，作用未知',
        类型: '其他',
        数量: 1,
      });

      if (granted) {
        logs.push({
          message: '获得道具：沐芯兰的权限卡 ×1',
          type: 'info',
        });
      }
    }
  } catch (error) {
    console.warn('[战斗界面] 发放沐芯兰权限卡失败', error);
  }

  return logs;
}
