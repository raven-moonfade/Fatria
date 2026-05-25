import { resolveEnemyName } from './enemyDatabase';
import { createVirtueItemMvuData, getVirtueItemByBoss } from './virtueItems';
import type { VirtueItem } from './virtueItems';
import { grantBackpackItemIfMissing } from './combatPersistence';
import type { CombatLogEntry } from './types';

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
