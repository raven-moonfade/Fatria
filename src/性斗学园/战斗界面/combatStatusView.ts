import type { StatusList } from '../shared/statusEngine';
import type { StatusEffect } from './types';

const BONUS_LABELS: Record<string, string> = {
  魅力加成: '魅力',
  幸运加成: '幸运',
  闪避率加成: '闪避',
  暴击率加成: '暴击',
  基础性斗力加成: '性斗力',
  基础性斗力成算: '性斗力%',
  基础忍耐力加成: '忍耐力',
  基础忍耐力成算: '忍耐力%',
};

function readStatusDuration(statusData: unknown): number {
  if (typeof statusData === 'number') {
    return statusData;
  }

  if (statusData && typeof statusData === 'object') {
    return Number((statusData as { 剩余回合?: unknown }).剩余回合) || 0;
  }

  return 0;
}

function readStatusBonuses(statusData: unknown): Record<string, number> {
  if (!statusData || typeof statusData !== 'object') {
    return {};
  }

  const bonuses = (statusData as { 加成?: unknown }).加成;
  if (!bonuses || typeof bonuses !== 'object') {
    return {};
  }

  return bonuses as Record<string, number>;
}

function getStatusIcon(statusName: string, type: 'buff' | 'debuff'): string {
  if (statusName.includes('敏感')) return '❤️';
  if (statusName.includes('沉默')) return '😶';
  if (statusName.includes('束缚')) return '⛓️';
  if (statusName.includes('无敌')) return '🛡️';
  if (statusName.includes('必暴')) return '💥';
  if (statusName.includes('嘲讽')) return '🤬';
  return type === 'debuff' ? '▼' : '▲';
}

export function statusListToEffects(statusList: StatusList | Record<string, unknown> | null | undefined, prefix = '') {
  const effects: StatusEffect[] = [];

  Object.entries(statusList || {}).forEach(([name, val]) => {
    const duration = readStatusDuration(val);
    if (duration <= 0) return;

    const bonuses = readStatusBonuses(val);
    let displayName = name;
    let type: 'buff' | 'debuff' = 'buff';

    if (Object.keys(bonuses).length > 0) {
      const bonusTexts: string[] = [];
      for (const [key, value] of Object.entries(bonuses)) {
        if (value === 0) continue;

        const attrName = BONUS_LABELS[key] || key;
        const sign = value > 0 ? '+' : '';
        bonusTexts.push(`${attrName}${sign}${value}`);
        if (value < 0) type = 'debuff';
      }

      displayName = bonusTexts.join(', ') || name;
    }

    effects.push({
      id: prefix + name,
      name: displayName,
      duration,
      icon: getStatusIcon(name, type),
      type,
      effect: {
        type: 'focus' as any,
        value: 0,
        isPercent: false,
        duration,
        stackable: false,
      },
    });
  });

  return effects;
}
