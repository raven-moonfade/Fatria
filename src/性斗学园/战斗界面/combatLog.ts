import type { CombatLogEntry } from './types';

function shouldKeepNarrationLog(log: CombatLogEntry): boolean {
  const message = log.message;

  if ((log.source === 'player' || log.source === 'enemy') && message.includes('使用了')) return true;
  if (message.includes('【协同作战】') && message.includes('使用了')) return true;
  if (message.includes('闪避了攻击')) return true;
  if (message.includes('暴击！')) return true;
  if (message.includes('造成') && (message.includes('快感') || message.includes('伤害') || message.includes('暴击')))
    return true;
  if (message.includes('的快感从')) return true;
  if (message.includes('第') && message.includes('回合')) return true;
  if (message.includes('闪避了')) return true;
  if (
    message.includes('使用了') ||
    message.includes('剩余数量') ||
    (message.includes('记录：第') && message.includes('回合使用了'))
  ) {
    return true;
  }
  if (message.includes('被束缚了') && message.includes('无法行动')) return true;
  if (message.includes('选择了投降') || message.includes('不能逃跑')) return true;
  if (message.includes('自慰') || message.includes('上贡') || message.includes('诱惑')) return true;
  if (message.includes('达到快感上限')) return true;
  if (message.includes('达到高潮')) return true;
  if (message.includes('高潮次数')) return true;
  if (message.includes('败北') || message.includes('胜利') || message.includes('崩溃')) return true;

  if (
    message.includes('进入了贤者时间状态') ||
    message.includes('进入虚脱状态') ||
    message.includes('性斗力降低') ||
    message.includes('性斗力提升') ||
    message.includes('忍耐力降低') ||
    message.includes('忍耐力提升') ||
    message.includes('耐力降低') ||
    message.includes('耐力提升')
  ) {
    return false;
  }

  return false;
}

export function collectCombatLogText(logs: CombatLogEntry[], playerName: string, enemyName: string): string {
  const filteredLogs = logs.filter(shouldKeepNarrationLog);
  const logTexts: string[] = [];
  let lastTurnHeader: string | null = null;

  for (const log of filteredLogs) {
    if (log.source === 'player') {
      logTexts.push(`${playerName}: ${log.message}`);
      continue;
    }

    if (log.source === 'enemy') {
      logTexts.push(`${enemyName}: ${log.message}`);
      continue;
    }

    const message = log.message;
    if (/^---\s*第\s*\d+\s*回合\s*---$/.test(message)) {
      if (lastTurnHeader === message) {
        continue;
      }
      lastTurnHeader = message;
    } else {
      lastTurnHeader = null;
    }
    logTexts.push(message);
  }

  return logTexts.join('\n');
}

export function buildCombatNarrationPrompt(params: {
  logs: CombatLogEntry[];
  playerName: string;
  enemyName: string;
  totalTurns: number;
  isVictory: boolean;
  cgDescription?: string;
}): string {
  const combatLogText = collectCombatLogText(params.logs, params.playerName, params.enemyName);
  const resultText = params.isVictory ? '胜利' : '战败';
  const contextText = params.isVictory ? '调教/羞辱场景' : '被调教场景';
  const cgText = params.cgDescription ? `\n${params.cgDescription}` : '';

  return `请根据以下战斗日志生成${resultText}剧情\n[战斗日志]\n${combatLogText}\n共${params.totalTurns}回合。\n请根据以上性斗过程，生成一段性斗时的剧情描写（${contextText}）。${cgText}`;
}
