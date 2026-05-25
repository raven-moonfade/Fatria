import type { TimedStatusEffect } from '../shared/statusEngine';
import type { CombatLogEntry } from './types';
import * as BossSystem from './bossSystem';

export type PlayerBinaryGender = '男' | '女';

export type BossSetupAction =
  | {
      kind: 'log';
      message: string;
      source: string;
      type: CombatLogEntry['type'];
    }
  | {
      kind: 'setEnemyStatus';
      statusName: string;
      effect: TimedStatusEffect;
    }
  | {
      kind: 'setSurrenderDisabled';
      disabled: boolean;
    };

export interface BossRuntimeSetup {
  displayName: string;
  dataName: string;
  skillPoolName?: string;
  avatarUrl: string;
  climaxLimit: number;
  actions: BossSetupAction[];
}

export function getPlayerGenderFromData(data: any, fallback: PlayerBinaryGender = '女'): PlayerBinaryGender {
  const rawGender = String(data?.角色基础?.性别 ?? fallback);
  return rawGender === '男' ? '男' : '女';
}

export function createBossRuntimeSetup(params: {
  enemyName: string;
  data: any;
  defaultClimaxLimit: number;
  resolveEnemyName: (enemyName: string) => string;
  getEnemyPortraitUrl: (enemyName: string) => string;
}): BossRuntimeSetup {
  const actions: BossSetupAction[] = [];
  let displayName = params.enemyName;
  let dataName = params.resolveEnemyName(params.enemyName);
  let skillPoolName: string | undefined;
  let avatarUrl = params.getEnemyPortraitUrl(dataName);
  let climaxLimit = params.defaultClimaxLimit;

  if (BossSystem.isMuxinlanBoss(params.enemyName)) {
    BossSystem.initMuxinlanBoss();
    displayName = BossSystem.getMuxinlanDisplayName(1);
    dataName = displayName;
    avatarUrl = BossSystem.getMuxinlanAvatarUrl(1);
    climaxLimit = BossSystem.getConfiguredBossClimaxLimit(
      'muxinlan',
      1,
      BossSystem.BOSS_CONFIG.muxinlan.climaxLimits[0],
    );
    actions.push({ kind: 'log', message: '【特殊战斗】沐芯兰BOSS战开始！', source: 'system', type: 'critical' });
  } else if (BossSystem.isChristineBoss(params.enemyName)) {
    BossSystem.initChristineBoss();
    displayName = BossSystem.getChristineDisplayName(1);
    dataName = displayName;
    avatarUrl = BossSystem.getChristineAvatarUrl(1);
    climaxLimit = BossSystem.getConfiguredBossClimaxLimit(
      'christine',
      1,
      BossSystem.BOSS_CONFIG.christine.climaxLimits[0],
    );
  } else if (BossSystem.isEdenBoss(params.enemyName)) {
    BossSystem.initEdenBoss();
    displayName = BossSystem.getEdenDisplayName();
    dataName = displayName;
    avatarUrl = BossSystem.getEdenAvatarUrl();
    climaxLimit = BossSystem.getConfiguredBossClimaxLimit('eden', 1, BossSystem.BOSS_CONFIG.eden.climaxLimits[0]);
    actions.push(
      {
        kind: 'setEnemyStatus',
        statusName: '懒惰沉睡',
        effect: {
          加成: { 基础忍耐力成算: -70 },
          剩余回合: 99,
        },
      },
      {
        kind: 'log',
        message: '【七宗罪·懒惰】伊甸芙宁的懒惰天赋正在影响战场...',
        source: 'system',
        type: 'critical',
      },
      { kind: 'log', message: '【懒惰效果】你的技能冷却+3，耐力消耗翻倍', source: 'system', type: 'debuff' },
    );
  } else if (BossSystem.isElizabethBoss(params.enemyName)) {
    BossSystem.initElizabethBoss();
    displayName = BossSystem.getElizabethDisplayName();
    dataName = displayName;
    avatarUrl = BossSystem.getElizabethAvatarUrl();
    climaxLimit = BossSystem.getConfiguredBossClimaxLimit('elizabeth', 1, 3);
    actions.push(
      {
        kind: 'log',
        message: '【七宗罪·傲慢】伊丽莎白夜羽的傲慢天赋正在影响战场...',
        source: 'system',
        type: 'critical',
      },
      {
        kind: 'log',
        message: '【君王的剧本】每奇数回合会发布演出指令，违反者将受到惩罚！',
        source: 'system',
        type: 'info',
      },
    );
  } else if (BossSystem.isVesperaBoss(params.enemyName)) {
    const playerGender = getPlayerGenderFromData(params.data, '男');
    BossSystem.initVesperaBoss(playerGender);
    displayName = BossSystem.getVesperaDisplayName();
    dataName = displayName;
    avatarUrl = BossSystem.getVesperaAvatarUrl();
    climaxLimit = BossSystem.getConfiguredBossClimaxLimit('vespera', 1, BossSystem.BOSS_CONFIG.vespera.climaxLimits[0]);
    actions.push(
      {
        kind: 'log',
        message: '【七宗罪·色欲】薇丝佩菈的色欲天赋正在影响战场...',
        source: 'system',
        type: 'critical',
      },
      {
        kind: 'log',
        message: '【信息素侵蚀】每回合你的性斗力成算+5%，忍耐力成算-5%，快感增加',
        source: 'system',
        type: 'debuff',
      },
      { kind: 'log', message: '【束缚猎物】被束缚时薇丝佩菈攻击必定命中且必定暴击', source: 'system', type: 'debuff' },
      { kind: 'log', message: '【体力透支】使用耐力消耗>28的技能后，下回合被强制束缚', source: 'system', type: 'info' },
    );
  } else if (BossSystem.isHeisakiBoss(params.enemyName)) {
    BossSystem.initHeisakiBoss();
    displayName = BossSystem.getHeisakiDisplayName();
    dataName = displayName;
    avatarUrl = BossSystem.getHeisakiAvatarUrl();
    climaxLimit = BossSystem.getConfiguredBossClimaxLimit('heisaki', 1, BossSystem.BOSS_CONFIG.heisaki.climaxLimits[0]);
    actions.push(
      { kind: 'setSurrenderDisabled', disabled: true },
      {
        kind: 'log',
        message: '【七宗罪·贪婪】黑崎晴雯的贪婪天赋正在影响战场...',
        source: 'system',
        type: 'critical',
      },
      {
        kind: 'log',
        message: '【利息翻倍】使用A/S/SS级技能后，该技能下次耐力消耗翻4倍',
        source: 'system',
        type: 'debuff',
      },
      { kind: 'log', message: '【透支机制】耐力不足时允许透支，不足部分计入债务', source: 'system', type: 'info' },
      { kind: 'log', message: '【债务利息】债务每回合增加30%利息', source: 'system', type: 'debuff' },
      { kind: 'log', message: '【贪婪契约】投降按钮已被封印！', source: 'system', type: 'critical' },
    );
  } else if (BossSystem.isAgnesBoss(params.enemyName)) {
    const playerGender = getPlayerGenderFromData(params.data);
    BossSystem.initAgnesBoss(playerGender);
    displayName = BossSystem.getAgnesDisplayName();
    dataName = displayName;
    avatarUrl = params.getEnemyPortraitUrl(displayName);
    climaxLimit = BossSystem.getConfiguredBossClimaxLimit('agnes', 1, 5);
    actions.push(
      { kind: 'setSurrenderDisabled', disabled: true },
      {
        kind: 'log',
        message: '【七宗罪·暴食】艾格妮丝蔷薇的暴食天赋正在影响战场...',
        source: 'system',
        type: 'critical',
      },
      {
        kind: 'log',
        message: '【卡路里堆叠】每一笔快感伤害的125%转化为艾格妮丝的卡路里',
        source: 'system',
        type: 'info',
      },
      {
        kind: 'log',
        message: '【卡路里效果】每100卡路里，性斗力/忍耐力成算+20%，魅力+30',
        source: 'system',
        type: 'debuff',
      },
      {
        kind: 'log',
        message: '【共餐机制】每3回合开始时（1,4,7...），艾格妮丝会偷取你的一个道具',
        source: 'system',
        type: 'debuff',
      },
      { kind: 'log', message: '【暴食契约】投降按钮已被封印！', source: 'system', type: 'critical' },
    );
  } else if (BossSystem.isYamadaHanakoBoss(params.enemyName)) {
    const initialPhase = BossSystem.isYamadaHanakoTrueName(params.enemyName) ? 2 : 1;
    BossSystem.initYamadaHanakoBoss(initialPhase);
    displayName = BossSystem.getYamadaHanakoDisplayName(initialPhase);
    dataName = initialPhase === 2 ? displayName : BossSystem.getYamadaHanakoDataKey(initialPhase);
    skillPoolName = BossSystem.getYamadaHanakoSkillPoolKey(initialPhase);
    avatarUrl = BossSystem.getYamadaHanakoAvatarUrl(initialPhase) ?? params.getEnemyPortraitUrl(displayName);
    climaxLimit = BossSystem.getConfiguredBossClimaxLimit('yamadaHanako', initialPhase, 1);
    actions.push(
      {
        kind: 'log',
        message:
          initialPhase === 2
            ? '【真名解放】西园寺辉夜以真实姿态参战，使用Lv75数据与真名技能池。'
            : '【伪装状态】山田花子暂时隐藏真名，使用Lv12数据与伪装技能池。',
        source: 'system',
        type: 'critical',
      },
      {
        kind: 'log',
        message: '【月下真名】伪装状态快感达到50%时，将清空快感并切换为西园寺辉夜。',
        source: 'system',
        type: 'info',
      },
    );
  }

  return {
    displayName,
    dataName,
    skillPoolName,
    avatarUrl,
    climaxLimit,
    actions,
  };
}
