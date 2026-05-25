/**
 * BOSS战斗系统
 *
 * 沐芯兰是一个三阶段BOSS：
 * 1. 代行机体·茉莉（伪装形态）- 50级，高闪避，嚣张雌小鬼
 * 2. 完全同步·祸星茉莉（暴力女王形态）- 88级，高攻击，压倒性力量
 * 3. 真身露出·沐芯兰（羸弱的傲娇女王）- 11级，极度虚弱
 */

import { reactive, ref } from 'vue';
import { BOSS_CONFIG } from './bossConfig';
import { createBossMechanicRuntime, evaluateBossMechanics } from './bossMechanicEngine';
import {
  getCurrentBossDefinition,
  getCurrentBossPhaseAvatarUrl,
  getCurrentBossPhaseClimaxLimit,
  getCurrentBossPhaseDataKey,
  getCurrentBossPhaseDisplayName,
  getCurrentBossPhaseSkillPoolKey,
  type CurrentBossId,
} from './bossDefinitions';

export { BOSS_CONFIG } from './bossConfig';
export { CURRENT_BOSS_DEFINITIONS, CURRENT_BOSS_DEFINITION_BY_ID } from './bossDefinitions';

// ==================== 类型定义 ====================
export interface BossState {
  isBossFight: boolean;
  bossId: string;
  currentPhase: 1 | 2 | 3;
  phaseTransitioning: boolean;
  dialogueIndex: number;
  buttonsDisabled: boolean;
  hasUsedMedal: boolean; // 是否使用了三好学生勋章
  // Eden专属状态（懒惰天赋）
  edenSleeping: boolean; // 是否处于沉睡状态
  edenCountdown: number; // 8回合倒计时
  edenAwakened: boolean; // 是否已被唤醒过（用于判断高潮次数调整）
  edenCritDebuffApplied: boolean; // 是否已应用暴击debuff
  // Elizabeth专属状态（傲慢天赋）
  elizabethCurrentCommand: 'kneel' | 'tribute' | null; // 当前演出指令
  elizabethCommandTurn: number; // 发布指令的回合
  elizabethViolationCount: number; // 违反次数（用于叠加buff）
  // Vespera专属状态（色欲天赋）
  vesperaCurrentTurn: number; // 当前回合数
  vesperaLastSkillStaminaCost: number; // 玩家上回合使用技能的耐力消耗
  vesperaPlayerDodgedLastTurn: boolean; // 玩家上回合是否闪避
  vesperaPlayerDodgedThisTurn: boolean; // 玩家本回合是否闪避
  vesperaConsecutiveDodges: number; // 玩家连续闪避次数
  vesperaSelfSacrificeUsed: boolean; // 是否已使用自体献祭
  // Heisaki专属状态（贪婪天赋）
  heisakiDebt: number; // 玩家债务值
  heisakiSkillCostMultipliers: Record<string, number>; // 各技能的耐力消耗倍率
  heisakiDebtSettlementTriggered: boolean; // 本回合是否触发了债务结算
  // Agnes专属状态（暴食天赋）
  agnesCalories: number; // 卡路里累计值
  agnesCalorieThreshold: number; // 上次触发对话的卡路里阈值（100的倍数）
  agnesFrenzyActive: boolean; // 是否处于发狂状态
  agnesFrenzyExtraHits: number; // 发狂额外连击数
  agnesFrenzyGuaranteedHit: boolean; // 发狂必定命中
  agnesFrenzyCrit: boolean; // 发狂必定暴击
  agnesCurrentTurn: number; // 当前回合数
}

export interface BossDialogue {
  speaker: string;
  text: string;
  emotion?: 'arrogant' | 'angry' | 'weak' | 'tsundere';
}

// ==================== 沐芯兰对话库 ====================
export const MUXINLAN_DIALOGUES = {
  // 第一阶段入场
  phase1_entry: [
    { speaker: '茉莉(?)', text: '"哎呀呀~是哪位不自量力的垃圾呢？"', emotion: 'arrogant' as const },
    { speaker: '茉莉(?)', text: '"让我猜猜...又是一个想挑战女王大人的蠢货吧？"', emotion: 'arrogant' as const },
    {
      speaker: '茉莉(?)',
      text: '"好吧好吧~既然你这么想被玩弄，那我就勉为其难地陪你玩玩吧♡"',
      emotion: 'arrogant' as const,
    },
  ],

  // 第一阶段战斗中（随机）
  phase1_battle: [
    {
      speaker: '茉莉(?)',
      text: '"哎呀呀，小垃圾的攻击是开了自动避让模式吗？真是让人发笑呢~♡"',
      emotion: 'arrogant' as const,
    },
    {
      speaker: '茉莉(?)',
      text: '"就这？就这点程度？杂鱼就是杂鱼呢~多练几年再来挑战本小姐吧"',
      emotion: 'arrogant' as const,
    },
    { speaker: '茉莉(?)', text: '"再努力一点嘛~不然我都要睡着了呢~"', emotion: 'arrogant' as const },
    {
      speaker: '茉莉(?)',
      text: '"小东西你真的有在认真吗？还是说...这就是你的全力了？噗~"',
      emotion: 'arrogant' as const,
    },
    { speaker: '茉莉(?)', text: '"被我的丝线缠住了呢~接下来要怎么玩弄你好呢？"', emotion: 'arrogant' as const },
    { speaker: '茉莉(?)', text: '"哟~小可怜还在挣扎呢？真是可爱到让人想欺负呢♡"', emotion: 'arrogant' as const },
    {
      speaker: '茉莉(?)',
      text: '"要不要姐姐我稍微放点水呀？啊，不用了，反正你也赢不了~"',
      emotion: 'arrogant' as const,
    },
    {
      speaker: '茉莉(?)',
      text: '"看你这么努力的样子，本小姐都有点不忍心了呢~骗你的啦♡"',
      emotion: 'arrogant' as const,
    },
    { speaker: '茉莉(?)', text: '"杂鱼杂鱼~♡ 要不要我教教你怎么打架呀？"', emotion: 'arrogant' as const },
    { speaker: '茉莉(?)', text: '"哎呀，这么弱还敢来挑战我？是谁给你的勇气呢~"', emotion: 'arrogant' as const },
    {
      speaker: '茉莉(?)',
      text: '"哎呀呀~小垃圾的体力快不行了吗？要不要姐姐我帮你一把呀~♡"',
      emotion: 'arrogant' as const,
    },
    { speaker: '茉莉(?)', text: '"你的攻击...是在给我挠痒痒吗？噗~真是太好笑了呢~"', emotion: 'arrogant' as const },
    {
      speaker: '茉莉(?)',
      text: '"要不要我让你一只手呀？啊，不行不行，那样太欺负你了呢~♡"',
      emotion: 'arrogant' as const,
    },
    {
      speaker: '茉莉(?)',
      text: '"小可怜~♡ 看你这么努力的样子，我都快要感动了呢~骗你的啦！"',
      emotion: 'arrogant' as const,
    },
  ],

  // 第一阶段锁血时
  phase1_lockHp: [
    { speaker: '茉莉(?)', text: '"呜...！（身体微微颤抖）"', emotion: 'angry' as const },
    { speaker: '茉莉(?)', text: '"哼...没想到你还有两下子嘛..."', emotion: 'angry' as const },
    { speaker: '茉莉(?)', text: '"不过...这种程度就想让我认输？"', emotion: 'angry' as const },
  ],

  // 第一阶段到第二阶段转换
  phase1_to_2: [
    { speaker: '祸星茉莉', text: '"那么...就让你见识一下真正的力量吧。"', emotion: 'angry' as const },
    {
      speaker: '꧁༺茉莉༻꧂',
      text: '"利息已经滚到你付不起的程度了。现在，把你的胜算全部清零吧。"',
      emotion: 'angry' as const,
    },
  ],

  // 第二阶段战斗中（随机）
  phase2_battle: [
    { speaker: '꧁༺茉莉༻꧂', text: '"感受到了吗？这就是被完全支配的感觉。"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"你的意识...现在归我所有了。"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"让我...将你撕碎吧！"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"在女王面前...跪下吧，杂鱼。"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"这就是与女王为敌的下场。"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"挣扎吧，反抗吧...然后绝望吧。"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"你的抵抗...只会让我更加兴奋！"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"碾碎你...是我此刻唯一的念头。"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"我的茉莉...会让你体验真正的恐惧！"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"你的灵魂...将成为我的收藏品。"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"反抗？可笑...你已经是我的玩偶了。"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"你的意志...在我面前一文不值！"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"这就是反抗女王的代价！好好享受吧！"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"你的绝望...是我最美妙的食粮！"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"跪下！然后向我忏悔你的愚蠢！"', emotion: 'angry' as const },
  ],

  // 第二阶段锁血时
  phase2_lockHp: [
    { speaker: '꧁༺茉莉༻꧂', text: '"不...不可能...！"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"我的茉莉...竟然...！"', emotion: 'angry' as const },
  ],

  // 第二阶段到第三阶段转换
  phase2_to_3: [
    { speaker: '꧁༺茉莉༻꧂', text: '"不...不要...！（茉莉跪倒在地，不再行动）"', emotion: 'weak' as const },
    { speaker: '系统', text: '【"茉莉"已被击败，意识强制弹回本体】', emotion: 'weak' as const },
    { speaker: '沐芯兰（真身）', text: '"咳...咳咳...（瘫坐在地，浑身颤抖）"', emotion: 'weak' as const },
    { speaker: '沐芯兰（真身）', text: '"茉莉...竟然被你这种杂鱼...（咬牙）"', emotion: 'tsundere' as const },
    { speaker: '沐芯兰（真身）', text: '"...杂鱼！维修费要从你的校园金币里扣！"', emotion: 'tsundere' as const },
  ],

  // 第三阶段战斗中（顺序播放，有连续性）
  phase3_battle: [
    { speaker: '沐芯兰（真身）', text: '"别、别过来！我警告你...（声音颤抖）"', emotion: 'tsundere' as const },
    { speaker: '沐芯兰（真身）', text: '"看什么看！没见过真正的女王吗？"', emotion: 'tsundere' as const },
    { speaker: '沐芯兰（真身）', text: '"扶、扶我一下...这是命令！"', emotion: 'tsundere' as const },
    { speaker: '沐芯兰（真身）', text: '"...你还在等什么？快点啊笨蛋！"', emotion: 'tsundere' as const },
    { speaker: '沐芯兰（真身）', text: '"（小声）...为什么不直接结束呢..."', emotion: 'weak' as const },
  ],

  // 使用三好学生勋章时（跳过第二阶段）
  medal_trigger: [
    { speaker: '茉莉(?)', text: '"那、那个是...！"', emotion: 'weak' as const },
    { speaker: '茉莉(?)', text: '"为什么你会有那个东西...！"', emotion: 'weak' as const },
    { speaker: '???', text: '"（茉莉突然停止动作）"', emotion: 'weak' as const },
    { speaker: '沐芯兰（真身）', text: '"...你是从哪里得到那个勋章的？"', emotion: 'tsundere' as const },
    { speaker: '沐芯兰（真身）', text: '"（声音颤抖）那是...那是我以前..."', emotion: 'weak' as const },
    { speaker: '沐芯兰（真身）', text: '"...既...既然你有那个东西..."', emotion: 'tsundere' as const },
  ],

  // 免疫束缚时的嘲笑（第一阶段）
  bind_immune_phase1: [
    { speaker: '茉莉(?)', text: '"哎呀呀~想用丝线束缚本小姐？你是不是搞错了什么？"', emotion: 'arrogant' as const },
    { speaker: '茉莉(?)', text: '"束缚？噗~这种小把戏对我可没用哦~♡"', emotion: 'arrogant' as const },
    { speaker: '茉莉(?)', text: '"就凭这点程度就想困住我？真是天真的小垃圾呢~"', emotion: 'arrogant' as const },
    { speaker: '茉莉(?)', text: '"我可是操纵丝线的专家，你这是班门弄斧呢~"', emotion: 'arrogant' as const },
  ],

  // 免疫束缚时的嘲笑（第二阶段）
  bind_immune_phase2: [
    { speaker: '꧁༺茉莉༻꧂', text: '"束缚？你在开玩笑吗？"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"想困住女王？你配吗？"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"这种低级手段...简直是侮辱。"', emotion: 'angry' as const },
    { speaker: '꧁༺茉莉༻꧂', text: '"我的技术可不是你这种杂鱼能理解的。"', emotion: 'angry' as const },
  ],

  // 免疫束缚时的嘲笑（第三阶段）
  bind_immune_phase3: [
    { speaker: '沐芯兰（真身）', text: '"哼...别、别想用这种手段...（轻松挣脱）"', emotion: 'tsundere' as const },
    { speaker: '沐芯兰（真身）', text: '"就算是真身...我也不会被这种东西困住的！"', emotion: 'tsundere' as const },
    { speaker: '沐芯兰（真身）', text: '"（小声）...虽然很虚弱，但束缚还是免疫的..."', emotion: 'weak' as const },
  ],
};

// ==================== BOSS状态管理 ====================
export const bossState = reactive<BossState>({
  isBossFight: false,
  bossId: '',
  currentPhase: 1,
  phaseTransitioning: false,
  dialogueIndex: 0,
  buttonsDisabled: false,
  hasUsedMedal: false,
  // Eden专属状态
  edenSleeping: false,
  edenCountdown: 8,
  edenAwakened: false,
  edenCritDebuffApplied: false,
  // Elizabeth专属状态
  elizabethCurrentCommand: null,
  elizabethCommandTurn: 0,
  elizabethViolationCount: 0,
  // Vespera专属状态
  vesperaCurrentTurn: 0,
  vesperaLastSkillStaminaCost: 0,
  vesperaPlayerDodgedLastTurn: false,
  vesperaPlayerDodgedThisTurn: false,
  vesperaConsecutiveDodges: 0,
  vesperaSelfSacrificeUsed: false,
  // Heisaki专属状态
  heisakiDebt: 0,
  heisakiSkillCostMultipliers: {},
  heisakiDebtSettlementTriggered: false,
  // Agnes专属状态
  agnesCalories: 0,
  agnesCalorieThreshold: 0,
  agnesFrenzyActive: false,
  agnesFrenzyExtraHits: 0,
  agnesFrenzyGuaranteedHit: false,
  agnesFrenzyCrit: false,
  agnesCurrentTurn: 0,
});

// 当前显示的对话
export const currentDialogue = ref<BossDialogue | null>(null);
export const dialogueQueue = ref<BossDialogue[]>([]);
export const isShowingDialogue = ref(false);

export const isDialogueSkippable = ref(true);

// 对话自动播放定时器
let dialogueAutoPlayTimer: number | null = null;
const DIALOGUE_DISPLAY_DURATION = 2500; // 每句对话显示2.5秒

export function getConfiguredBossClimaxLimit(bossId: CurrentBossId, phase: number, fallback: number = 1): number {
  return getCurrentBossPhaseClimaxLimit(bossId, phase) ?? fallback;
}

function getConfiguredPhaseTransition(params: {
  bossId: CurrentBossId;
  phase: number;
  currentPleasure: number;
  maxPleasure: number;
  currentClimaxCount: number;
  flags?: Record<string, boolean>;
}): number | undefined {
  const definition = getCurrentBossDefinition(params.bossId);
  const runtime = createBossMechanicRuntime(definition);
  const pleasurePercent = params.maxPleasure <= 0 ? 100 : (params.currentPleasure / params.maxPleasure) * 100;

  runtime.currentPhase = params.phase;
  runtime.flags = { ...(params.flags ?? {}) };

  const evaluation = evaluateBossMechanics(definition, runtime, {
    event: 'pleasurePercentAtOrAbove',
    currentPhase: params.phase,
    turn: runtime.turn,
    pleasurePercent,
    climaxCounters: { boss: params.currentClimaxCount },
    flags: params.flags,
  });
  const setPhaseAction = evaluation.actions.find(
    action => action.type === 'setPhase' && typeof action.phase === 'number',
  );
  return setPhaseAction?.phase;
}

// ==================== BOSS检测函数 ====================
/**
 * 检测是否是沐芯兰BOSS战
 */
export function isMuxinlanBoss(enemyName: string): boolean {
  if (!enemyName) return false;
  const name = enemyName.toLowerCase();
  return name.includes('茉莉') || name.includes('沐芯兰') || name.includes('muxinlan');
}

/**
 * 初始化沐芯兰BOSS战
 */
export function initMuxinlanBoss(): void {
  bossState.isBossFight = true;
  bossState.bossId = 'muxinlan';
  bossState.currentPhase = 1;
  bossState.phaseTransitioning = false;
  bossState.dialogueIndex = 0;
  bossState.buttonsDisabled = false;
  bossState.hasUsedMedal = false;

  // 播放入场对话
  queueDialogues(MUXINLAN_DIALOGUES.phase1_entry);
}

/**
 * 重置BOSS状态
 */
export function resetBossState(): void {
  bossState.isBossFight = false;
  bossState.bossId = '';
  bossState.currentPhase = 1;
  bossState.phaseTransitioning = false;
  bossState.dialogueIndex = 0;
  bossState.buttonsDisabled = false;
  bossState.hasUsedMedal = false;
  // Eden专属状态重置
  bossState.edenSleeping = false;
  bossState.edenCountdown = 8;
  bossState.edenAwakened = false;
  bossState.edenCritDebuffApplied = false;
  // Elizabeth专属状态重置
  bossState.elizabethCurrentCommand = null;
  bossState.elizabethCommandTurn = 0;
  bossState.elizabethViolationCount = 0;
  // Vespera专属状态重置
  bossState.vesperaCurrentTurn = 0;
  bossState.vesperaLastSkillStaminaCost = 0;
  bossState.vesperaPlayerDodgedLastTurn = false;
  bossState.vesperaPlayerDodgedThisTurn = false;
  bossState.vesperaConsecutiveDodges = 0;
  bossState.vesperaSelfSacrificeUsed = false;
  // Heisaki专属状态重置
  bossState.heisakiDebt = 0;
  bossState.heisakiSkillCostMultipliers = {};
  bossState.heisakiDebtSettlementTriggered = false;
  // Agnes专属状态重置
  bossState.agnesCalories = 0;
  bossState.agnesCalorieThreshold = 0;
  bossState.agnesFrenzyActive = false;
  bossState.agnesFrenzyExtraHits = 0;
  bossState.agnesFrenzyGuaranteedHit = false;
  bossState.agnesFrenzyCrit = false;
  bossState.agnesCurrentTurn = 0;
  currentDialogue.value = null;
  dialogueQueue.value = [];
  isShowingDialogue.value = false;
}

// ==================== 对话系统 ====================
/**
 * 清空对话队列并停止自动播放
 */
export function clearDialogueQueue(): void {
  if (dialogueAutoPlayTimer !== null) {
    window.clearTimeout(dialogueAutoPlayTimer);
    dialogueAutoPlayTimer = null;
  }
  dialogueQueue.value = [];
  isShowingDialogue.value = false;
  currentDialogue.value = null;
}

/**
 * 将对话加入队列（可选择是否打断当前对话）
 * @param dialogues 对话数组
 * @param interrupt 是否打断当前对话（默认true，清空队列后显示新对话）
 */
export function queueDialogues(dialogues: BossDialogue[], interrupt: boolean = true): void {
  if (interrupt) {
    // 打断模式：清空队列，立即显示新对话
    clearDialogueQueue();
  }

  dialogueQueue.value.push(...dialogues);

  if (!isShowingDialogue.value) {
    showNextDialogue();
  }
}

/**
 * 显示下一条对话（并启动自动播放定时器）
 */
export function showNextDialogue(): void {
  // 清除之前的定时器
  if (dialogueAutoPlayTimer !== null) {
    window.clearTimeout(dialogueAutoPlayTimer);
    dialogueAutoPlayTimer = null;
  }

  if (dialogueQueue.value.length === 0) {
    isShowingDialogue.value = false;
    currentDialogue.value = null;
    isDialogueSkippable.value = true;
    return;
  }

  isShowingDialogue.value = true;
  currentDialogue.value = dialogueQueue.value.shift() || null;

  // 启动自动播放定时器：3秒后自动显示下一条
  dialogueAutoPlayTimer = window.setTimeout(() => {
    showNextDialogue();
  }, DIALOGUE_DISPLAY_DURATION);
}

/**
 * 跳过当前对话（立即显示下一条）
 */
export function skipDialogue(): void {
  if (!isDialogueSkippable.value) {
    return;
  }
  showNextDialogue();
}

export function setDialogueSkippable(skippable: boolean): void {
  isDialogueSkippable.value = skippable;
}

export function waitForDialoguesToFinish(pollIntervalMs: number = 50): Promise<void> {
  return new Promise(resolve => {
    const timer = window.setInterval(() => {
      if (!isShowingDialogue.value && dialogueQueue.value.length === 0 && currentDialogue.value === null) {
        window.clearInterval(timer);
        resolve();
      }
    }, pollIntervalMs);
  });
}

/**
 * 获取指定阶段的对话数组
 * @param phase 当前阶段
 * @param type 对话类型：'lockHp' 锁血对话, 'transition' 转阶段对话, 'entry' 入场对话, 'battle' 战斗对话
 */
export function getPhaseDialogues(
  phase: 1 | 2 | 3,
  type: 'lockHp' | 'transition' | 'entry' | 'battle',
): BossDialogue[] | null {
  switch (type) {
    case 'lockHp':
      if (phase === 1) return MUXINLAN_DIALOGUES.phase1_lockHp;
      if (phase === 2) return MUXINLAN_DIALOGUES.phase2_lockHp;
      return null;
    case 'transition':
      if (phase === 1) return MUXINLAN_DIALOGUES.phase1_to_2;
      if (phase === 2) return MUXINLAN_DIALOGUES.phase2_to_3;
      return null;
    case 'entry':
      if (phase === 1) return MUXINLAN_DIALOGUES.phase1_entry;
      return null;
    case 'battle':
      if (phase === 1) return MUXINLAN_DIALOGUES.phase1_battle;
      if (phase === 2) return MUXINLAN_DIALOGUES.phase2_battle;
      if (phase === 3) return MUXINLAN_DIALOGUES.phase3_battle;
      return null;
    default:
      return null;
  }
}

/**
 * 获取随机锁血对话
 */
export function getLockHpDialogue(phase: 1 | 2 | 3): BossDialogue | null {
  let dialogues: BossDialogue[];

  switch (phase) {
    case 1:
      dialogues = MUXINLAN_DIALOGUES.phase1_lockHp;
      break;
    case 2:
      dialogues = MUXINLAN_DIALOGUES.phase2_lockHp;
      break;
    case 3:
      // 第三阶段没有锁血对话
      return null;
    default:
      return null;
  }

  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

/**
 * 获取随机束缚免疫嘲笑对话
 */
export function getBindImmuneDialogue(phase: 1 | 2 | 3): BossDialogue | null {
  let dialogues: BossDialogue[];

  switch (phase) {
    case 1:
      dialogues = MUXINLAN_DIALOGUES.bind_immune_phase1;
      break;
    case 2:
      dialogues = MUXINLAN_DIALOGUES.bind_immune_phase2;
      break;
    case 3:
      dialogues = MUXINLAN_DIALOGUES.bind_immune_phase3;
      break;
    default:
      return null;
  }

  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

/**
 * 获取随机战斗对话
 */
export function getRandomBattleDialogue(phase: 1 | 2 | 3): BossDialogue | null {
  let dialogues: BossDialogue[];

  switch (phase) {
    case 1:
      dialogues = MUXINLAN_DIALOGUES.phase1_battle;
      break;
    case 2:
      dialogues = MUXINLAN_DIALOGUES.phase2_battle;
      break;
    case 3: {
      // 第三阶段使用顺序对话
      const idx = bossState.dialogueIndex;
      if (idx < MUXINLAN_DIALOGUES.phase3_battle.length) {
        bossState.dialogueIndex++;
        return MUXINLAN_DIALOGUES.phase3_battle[idx];
      }
      // 循环最后几条
      return MUXINLAN_DIALOGUES.phase3_battle[MUXINLAN_DIALOGUES.phase3_battle.length - 1];
    }
    default:
      return null;
  }

  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

// ==================== 阶段切换 ====================
/**
 * 获取当前阶段的敌人数据键名
 */
export function getMuxinlanDataKey(phase: 1 | 2 | 3): string {
  return getCurrentBossPhaseDataKey('muxinlan', phase) ?? `沐芯兰_${phase}`;
}

/**
 * 获取当前阶段的显示名称
 */
export function getMuxinlanDisplayName(phase: 1 | 2 | 3): string {
  const displayName = getCurrentBossPhaseDisplayName('muxinlan', phase);
  if (displayName) return displayName;

  switch (phase) {
    case 1:
      return '茉莉(?)';
    case 2:
      return '꧁༺茉莉༻꧂';
    case 3:
      return '沐芯兰（真身）';
    default:
      return '茉莉';
  }
}

/**
 * 获取当前阶段的立绘
 */
export function getMuxinlanAvatarUrl(phase: 1 | 2 | 3): string {
  return (
    getCurrentBossPhaseAvatarUrl('muxinlan', phase) ?? `https://img.vinsimage.org/性斗学园/立绘/沐芯兰_${phase}.png`
  );
}

/**
 * 检查是否应该锁血（阻止高潮）
 */
export function shouldLockPleasure(
  currentPleasure: number,
  maxPleasure: number,
  currentClimaxCount: number,
  phase: 1 | 2 | 3,
): boolean {
  if (!bossState.isBossFight || bossState.bossId !== 'muxinlan') {
    return false;
  }

  // 第一阶段：快感达到最大快感-1时锁血
  if (phase === 1 && currentPleasure >= maxPleasure - 1) {
    return true;
  }

  // 第二阶段：高潮次数达到4次且快感即将满时锁血
  if (phase === 2 && currentClimaxCount >= 4 && currentPleasure >= maxPleasure - 1) {
    return true;
  }

  return false;
}

/**
 * 检查是否应该触发阶段转换
 */
export function shouldTransitionPhase(
  currentPleasure: number,
  maxPleasure: number,
  currentClimaxCount: number,
  phase: 1 | 2 | 3,
): { shouldTransition: boolean; nextPhase: 1 | 2 | 3 } {
  if (!bossState.isBossFight || bossState.bossId !== 'muxinlan') {
    return { shouldTransition: false, nextPhase: phase };
  }

  // 获取当前阶段的高潮次数上限
  const climaxLimit = getCurrentBossPhaseClimaxLimit('muxinlan', phase) ?? BOSS_CONFIG.muxinlan.climaxLimits[phase - 1];
  const configuredNextPhase = getConfiguredPhaseTransition({
    bossId: 'muxinlan',
    phase,
    currentPleasure,
    maxPleasure,
    currentClimaxCount,
    flags: { honorMedalUsed: bossState.hasUsedMedal },
  });

  // 第一阶段：快感达到最大值时，转换到第二阶段
  if (phase === 1 && currentPleasure >= maxPleasure) {
    // 如果使用了勋章，跳过第二阶段直接到第三阶段
    if (bossState.hasUsedMedal) {
      return { shouldTransition: true, nextPhase: configuredNextPhase === 3 ? configuredNextPhase : 3 };
    }
    return { shouldTransition: true, nextPhase: configuredNextPhase === 2 ? configuredNextPhase : 2 };
  }

  // 第二阶段：高潮次数达到上限-1且快感达到最大值时，转换到第三阶段
  // 例如：climaxLimit=3时，高潮2次后快感满就转换
  if (phase === 2 && currentClimaxCount >= climaxLimit - 1 && currentPleasure >= maxPleasure) {
    return { shouldTransition: true, nextPhase: configuredNextPhase === 3 ? configuredNextPhase : 3 };
  }

  return { shouldTransition: false, nextPhase: phase };
}

/**
 * 执行阶段转换
 * 注意：转换对话已在app.vue的handleBossPhaseTransition中统一处理，这里不再重复播放
 */
export function executePhaseTransition(nextPhase: 1 | 2 | 3): void {
  bossState.phaseTransitioning = true;

  // 转换对话已在app.vue中播放，这里只处理状态更新
  // 更新阶段
  bossState.currentPhase = nextPhase;
  bossState.dialogueIndex = 0; // 重置第三阶段对话索引

  // 第二阶段禁用按钮
  if (nextPhase === 2) {
    bossState.buttonsDisabled = true;
  }

  // 第三阶段解除按钮禁用
  if (nextPhase === 3) {
    bossState.buttonsDisabled = false;
  }
}

/**
 * 完成阶段转换
 */
export function completePhaseTransition(): void {
  bossState.phaseTransitioning = false;
}

// ==================== 特殊道具检测 ====================
/**
 * 检查是否拥有三好学生勋章
 */
export function hasHonorMedal(items: any[]): boolean {
  if (!items || !Array.isArray(items)) return false;
  return items.some(
    item =>
      item &&
      (item.name?.includes('三好学生') ||
        item.name?.includes('荣誉勋章') ||
        item.name?.includes('沐芯兰') ||
        item.id === 'honor_medal_muxinlan'),
  );
}

/**
 * 使用三好学生勋章
 */
export function useHonorMedal(): boolean {
  if (bossState.currentPhase !== 1) {
    return false; // 只能在第一阶段使用
  }

  bossState.hasUsedMedal = true;
  queueDialogues(MUXINLAN_DIALOGUES.medal_trigger);
  return true;
}

// ==================== 克莉丝汀 BOSS 对话库 ====================
export const CHRISTINE_DIALOGUES = {
  // 第一阶段入场（表人格/弱气）
  phase1_entry: [
    { speaker: '克莉丝汀(?)', text: '"那个...这、这位同学...请不要这样盯着我看..."', emotion: 'weak' as const },
    { speaker: '克莉丝汀(?)', text: '"性、性斗什么的...我真的不擅长...能不能放过我...?"', emotion: 'weak' as const },
  ],

  // 第一阶段战斗中（随机）
  phase1_battle: [
    { speaker: '克莉丝汀(?)', text: '"对、对不起!我不是故意挡路的...请不要打我..."', emotion: 'weak' as const },
    {
      speaker: '克莉丝汀(?)',
      text: '"呜呜...文件撒了一地...如果不快点收拾好,会被会长骂的..."',
      emotion: 'weak' as const,
    },
    { speaker: '克莉丝汀(?)', text: '"请、请不要这样...我真的很害怕..."', emotion: 'weak' as const },
    { speaker: '克莉丝汀(?)', text: '"能不能...温柔一点..."', emotion: 'weak' as const },
  ],

  // 第一阶段锁血时
  phase1_lockHp: [
    { speaker: '克莉丝汀(?)', text: '"呜...！（身体微微颤抖）"', emotion: 'weak' as const },
    { speaker: '克莉丝汀(?)', text: '"不...不要再欺负我了..."', emotion: 'weak' as const },
  ],

  // 第一阶段到第二阶段转换（人格切换）
  phase1_to_2: [
    { speaker: '克莉丝汀(?)', text: '"......"', emotion: 'weak' as const },
    { speaker: '???', text: '"（眼神突然变得冰冷锐利）"', emotion: 'angry' as const },
    { speaker: '꧁༺克莉丝汀༻꧂', text: '"...呵。"', emotion: 'angry' as const },
    { speaker: '꧁༺克莉丝汀༻꧂', text: '"刚才不是很嚣张吗? 怎么现在像条死狗一样趴在地上?"', emotion: 'angry' as const },
    {
      speaker: '꧁༺克莉丝汀༻꧂',
      text: '"既然你这么喜欢欺负弱小...那就让你体验一下被绝对力量碾碎的感觉。"',
      emotion: 'angry' as const,
    },
  ],

  // 第二阶段战斗中（随机）
  phase2_battle: [
    { speaker: '꧁༺克莉丝汀༻꧂', text: '"闭嘴,垃圾。我允许你射了吗?"', emotion: 'angry' as const },
    {
      speaker: '꧁༺克莉丝汀༻꧂',
      text: '"这双丝袜的味道如何? 是不是比你那贫瘠的人生还要丰富?"',
      emotion: 'angry' as const,
    },
    { speaker: '꧁༺克莉丝汀༻꧂', text: '"给我想着我的脚去死吧。"', emotion: 'angry' as const },
    { speaker: '꧁༺克莉丝汀༻꧂', text: '"木马,最大功率。"', emotion: 'angry' as const },
    { speaker: '꧁༺克莉丝汀༻꧂', text: '"跪下！然后向我忏悔你的愚蠢！"', emotion: 'angry' as const },
    { speaker: '꧁༺克莉丝汀༻꧂', text: '"挣扎吧...反抗吧...然后绝望吧。"', emotion: 'angry' as const },
    { speaker: '꧁༺克莉丝汀༻꧂', text: '"不榨干最后一滴精液...我是不会停止的。"', emotion: 'angry' as const },
    { speaker: '꧁༺克莉丝汀༻꧂', text: '"这就是欺负弱小的代价。好好享受吧。"', emotion: 'angry' as const },
  ],

  // 战后（恢复/慌乱）- 战斗结束后触发
  post_battle: [
    { speaker: '克莉丝汀', text: '"啊!!! 对、对不起!! 我、我又失控了...呜呜呜..."', emotion: 'tsundere' as const },
    {
      speaker: '克莉丝汀',
      text: '"同、同学你没事吧?! 流了好多白色的东西...我、我这就帮你擦干净!"',
      emotion: 'tsundere' as const,
    },
    { speaker: '克莉丝汀', text: '"请、请不要讨厌克莉丝汀...我真的不是故意的..."', emotion: 'weak' as const },
  ],

  // 免疫束缚时的嘲笑（第一阶段）
  bind_immune_phase1: [
    { speaker: '克莉丝汀(?)', text: '"呜...虽、虽然很害怕，但是这种程度的束缚..."', emotion: 'weak' as const },
  ],

  // 免疫束缚时的嘲笑（第二阶段）
  bind_immune_phase2: [
    { speaker: '꧁༺克莉丝汀༻꧂', text: '"想困住女王？你配吗？"', emotion: 'angry' as const },
    { speaker: '꧁༺克莉丝汀༻꧂', text: '"这种低级手段...简直是侮辱。"', emotion: 'angry' as const },
  ],
};

// ==================== 克莉丝汀 BOSS 检测函数 ====================
/**
 * 检测是否是克莉丝汀BOSS战
 */
export function isChristineBoss(enemyName: string): boolean {
  if (!enemyName) return false;
  const name = enemyName.toLowerCase();
  return name.includes('克莉丝汀') || name.includes('christine') || name.includes('书记');
}

/**
 * 初始化克莉丝汀BOSS战
 */
export function initChristineBoss(): void {
  bossState.isBossFight = true;
  bossState.bossId = 'christine';
  bossState.currentPhase = 1;
  bossState.phaseTransitioning = false;
  bossState.dialogueIndex = 0;
  bossState.buttonsDisabled = false;
  bossState.hasUsedMedal = false;

  // 播放入场对话
  queueDialogues(CHRISTINE_DIALOGUES.phase1_entry);
}

/**
 * 获取克莉丝汀当前阶段的敌人数据键名
 */
export function getChristineDataKey(phase: 1 | 2): string {
  return getCurrentBossPhaseDataKey('christine', phase) ?? `克莉丝汀_${phase}`;
}

/**
 * 获取克莉丝汀当前阶段的显示名称
 */
export function getChristineDisplayName(phase: 1 | 2): string {
  const displayName = getCurrentBossPhaseDisplayName('christine', phase);
  if (displayName) return displayName;

  switch (phase) {
    case 1:
      return '克莉丝汀(?)';
    case 2:
      return '꧁༺克莉丝汀༻꧂';
    default:
      return '克莉丝汀';
  }
}

/**
 * 获取克莉丝汀当前阶段的立绘
 */
export function getChristineAvatarUrl(phase: 1 | 2): string {
  // 克莉丝汀分阶段立绘：克莉丝汀_1、克莉丝汀_2
  return (
    getCurrentBossPhaseAvatarUrl('christine', phase) ?? `https://img.vinsimage.org/性斗学园/立绘/克莉丝汀_${phase}.png`
  );
}

/**
 * 获取克莉丝汀随机战斗对话
 */
export function getChristineRandomBattleDialogue(phase: 1 | 2): BossDialogue | null {
  let dialogues: BossDialogue[];

  switch (phase) {
    case 1:
      dialogues = CHRISTINE_DIALOGUES.phase1_battle;
      break;
    case 2:
      dialogues = CHRISTINE_DIALOGUES.phase2_battle;
      break;
    default:
      return null;
  }

  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

/**
 * 获取克莉丝汀锁血对话
 */
export function getChristineLockHpDialogue(phase: 1 | 2): BossDialogue | null {
  if (phase === 1) {
    const dialogues = CHRISTINE_DIALOGUES.phase1_lockHp;
    return dialogues[Math.floor(Math.random() * dialogues.length)];
  }
  return null; // 第二阶段没有锁血
}

/**
 * 获取克莉丝汀束缚免疫对话
 */
export function getChristineBindImmuneDialogue(phase: 1 | 2): BossDialogue | null {
  let dialogues: BossDialogue[];

  switch (phase) {
    case 1:
      dialogues = CHRISTINE_DIALOGUES.bind_immune_phase1;
      break;
    case 2:
      dialogues = CHRISTINE_DIALOGUES.bind_immune_phase2;
      break;
    default:
      return null;
  }

  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

/**
 * 检查克莉丝汀是否应该锁血
 */
export function shouldChristineLockPleasure(currentPleasure: number, maxPleasure: number, phase: 1 | 2): boolean {
  if (!bossState.isBossFight || bossState.bossId !== 'christine') {
    return false;
  }

  // 第一阶段：快感达到最大快感-1时锁血
  if (phase === 1 && currentPleasure >= maxPleasure - 1) {
    return true;
  }

  return false;
}

/**
 * 检查克莉丝汀是否应该触发阶段转换
 */
export function shouldChristineTransitionPhase(
  currentPleasure: number,
  maxPleasure: number,
  _currentClimaxCount: number,
  phase: 1 | 2,
): { shouldTransition: boolean; nextPhase: 1 | 2 } {
  if (!bossState.isBossFight || bossState.bossId !== 'christine') {
    return { shouldTransition: false, nextPhase: phase };
  }

  const configuredNextPhase = getConfiguredPhaseTransition({
    bossId: 'christine',
    phase,
    currentPleasure,
    maxPleasure,
    currentClimaxCount: _currentClimaxCount,
  });

  // 第一阶段：快感达到最大值时，转换到第二阶段
  if (phase === 1 && currentPleasure >= maxPleasure) {
    return { shouldTransition: true, nextPhase: configuredNextPhase === 2 ? configuredNextPhase : 2 };
  }

  return { shouldTransition: false, nextPhase: phase };
}

// ==================== 伊甸芙宁 BOSS 对话库 ====================
export const EDEN_DIALOGUES = {
  // 入场对话
  entry: [{ speaker: '伊甸芙宁', text: '"喂,杂鱼。你玩《Genshin Impact》吗?"', emotion: 'arrogant' as const }],

  // 沉睡状态对话（开局进入沉睡）
  sleeping_start: [
    { speaker: '伊甸芙宁', text: '"哈~好困喵...算了，先睡一会儿吧~"', emotion: 'weak' as const },
    { speaker: '伊甸芙宁', text: '"杂鱼你自己玩，别吵醒人家..."', emotion: 'weak' as const },
    { speaker: '系统', text: '【懒惰天赋】伊甸芙宁陷入了沉睡...', emotion: 'weak' as const },
  ],

  // 沉睡中被攻击的反应
  sleeping_attacked: [
    { speaker: '伊甸芙宁', text: '"嗯...（翻了个身）...五分钟后再来..."', emotion: 'weak' as const },
    { speaker: '伊甸芙宁', text: '"别闹...人家还没抽到芙宁娜呢..."', emotion: 'weak' as const },
    { speaker: '伊甸芙宁', text: '"呼呼...（睡得很香的样子）"', emotion: 'weak' as const },
  ],

  // 沉睡期间快感达到上限被唤醒
  awakening_pleasure: [
    { speaker: '伊甸芙宁', text: '"...！（猛然睁眼）"', emotion: 'angry' as const },
    { speaker: '伊甸芙宁', text: '"谁?!谁敢趁我睡觉偷袭?!"', emotion: 'angry' as const },
    { speaker: '伊甸芙宁', text: '"杂鱼...你可真有胆量啊...让我好好教训你！"', emotion: 'angry' as const },
  ],

  // 倒计时归零使用Game Over
  countdown_zero: [
    { speaker: '伊甸芙宁', text: '"好无聊啊...这样下去要睡过头了..."', emotion: 'arrogant' as const },
    { speaker: '伊甸芙宁', text: '"时间到了哦~ 杂鱼连这点小游戏都赢不了呢~"', emotion: 'arrogant' as const },
    { speaker: '伊甸芙宁', text: '"好了好了，让芙宁大人亲自来终结这无聊的对局吧！"', emotion: 'arrogant' as const },
    { speaker: '伊甸芙宁', text: '"啪！Game Over~ 别浪费人家时间了！"', emotion: 'arrogant' as const },
  ],

  // 苏醒后战斗中对话
  battle: [
    {
      speaker: '伊甸芙宁',
      text: '"杂鱼~ 杂鱼~❤️ 不会吧不会吧? 不会真的有人连我召唤的一只史莱姆都打不过吧?"',
      emotion: 'arrogant' as const,
    },
    { speaker: '伊甸芙宁', text: '"好弱哎~ 这是什么杂鱼? 我都快睡着了~"', emotion: 'arrogant' as const },
    { speaker: '伊甸芙宁', text: '"麻烦快点投降好吗? 我还要回去抽卡呢!"', emotion: 'arrogant' as const },
    { speaker: '伊甸芙宁', text: '"芙宁大人的脚好香吧? 承认吧杂鱼~❤️"', emotion: 'arrogant' as const },
    {
      speaker: '伊甸芙宁',
      text: '"起舞吧~ 哒、哒、哒~ 你的叫声比音游的打击音效难听多了。"',
      emotion: 'arrogant' as const,
    },
    { speaker: '伊甸芙宁', text: '"这身装备太丑了，辣眼睛。变！给你换套更适合的~"', emotion: 'arrogant' as const },
  ],

  // 被暴击时的反应
  crit_reaction: [
    { speaker: '伊甸芙宁', text: '"啊?! 你竟然敢打人家?!"', emotion: 'angry' as const },
    {
      speaker: '伊甸芙宁',
      text: '"你知不知道我老妈是谁? 信不信我号召全校集火把你号封了?!"',
      emotion: 'angry' as const,
    },
    { speaker: '伊甸芙宁', text: '"好痛...（揉了揉被打的地方）...算你走运！"', emotion: 'tsundere' as const },
  ],

  // 束缚免疫对话
  bind_immune: [
    { speaker: '伊甸芙宁', text: '"想束缚人家? 你是不是搞错了什么? 我可是GM权限哦~"', emotion: 'arrogant' as const },
  ],

  // 战胜玩家后
  victory: [
    { speaker: '伊甸芙宁', text: '"游戏结束~ 杂鱼果然是杂鱼呢~"', emotion: 'arrogant' as const },
    { speaker: '伊甸芙宁', text: '"算了算了，看在你这么配合的份上，赏你点金币吧~"', emotion: 'arrogant' as const },
  ],

  // 战败（极其罕见）
  defeat: [
    { speaker: '伊甸芙宁', text: '"呜哇哇!! 你作弊! 你开挂!"', emotion: 'weak' as const },
    { speaker: '伊甸芙宁', text: '"难道你的圣遗物全是双爆40分吗?! 这不科学!"', emotion: 'weak' as const },
    {
      speaker: '伊甸芙宁',
      text: '"我要告诉妈妈(院长)! 你欺负人! 呜呜呜...赔钱! 把我的精神损失费赔给我!"',
      emotion: 'tsundere' as const,
    },
  ],
};

// ==================== 伊甸芙宁 BOSS 检测与初始化 ====================
/**
 * 检测是否是伊甸芙宁BOSS战
 */
export function isEdenBoss(enemyName: string): boolean {
  if (!enemyName) return false;
  const name = enemyName.toLowerCase();
  return name.includes('伊甸芙宁') || name.includes('eden') || name.includes('funin') || name.includes('芙宁');
}

/**
 * 初始化伊甸芙宁BOSS战
 */
export function initEdenBoss(): void {
  bossState.isBossFight = true;
  bossState.bossId = 'eden';
  bossState.currentPhase = 1;
  bossState.phaseTransitioning = false;
  bossState.dialogueIndex = 0;
  bossState.buttonsDisabled = false;
  bossState.hasUsedMedal = false;
  // Eden专属状态初始化
  bossState.edenSleeping = true; // 开局进入沉睡
  bossState.edenCountdown = 6; // 6回合倒计时（上限6）
  bossState.edenAwakened = false;
  bossState.edenCritDebuffApplied = false;

  // 播放入场对话，然后进入沉睡
  queueDialogues([...EDEN_DIALOGUES.entry, ...EDEN_DIALOGUES.sleeping_start]);
}

/**
 * 获取伊甸芙宁显示名称
 */
export function getEdenDisplayName(): string {
  return getCurrentBossPhaseDisplayName('eden', 1) ?? '伊甸芙宁';
}

/**
 * 获取伊甸芙宁立绘URL
 */
export function getEdenAvatarUrl(sleeping: boolean = false): string {
  if (sleeping) {
    return (
      getCurrentBossDefinition('eden').legacy?.sleepingAvatarUrl ??
      'https://img.vinsimage.org/性斗学园/立绘/伊甸芙宁_1.png'
    );
  }
  return getCurrentBossPhaseAvatarUrl('eden', 1) ?? 'https://img.vinsimage.org/性斗学园/立绘/伊甸芙宁_2.png';
}

/**
 * 获取伊甸芙宁随机战斗对话
 */
export function getEdenRandomBattleDialogue(): BossDialogue | null {
  if (bossState.edenSleeping) {
    // 沉睡中被攻击
    const dialogues = EDEN_DIALOGUES.sleeping_attacked;
    return dialogues[Math.floor(Math.random() * dialogues.length)];
  }
  const dialogues = EDEN_DIALOGUES.battle;
  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

/**
 * 获取伊甸芙宁被暴击对话
 */
export function getEdenCritReactionDialogue(): BossDialogue | null {
  const dialogues = EDEN_DIALOGUES.crit_reaction;
  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

/**
 * 获取伊甸芙宁束缚免疫对话
 */
export function getEdenBindImmuneDialogue(): BossDialogue | null {
  const dialogues = EDEN_DIALOGUES.bind_immune;
  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

// ==================== 伊甸芙宁 懒惰天赋机制 ====================
/**
 * 处理伊甸芙宁回合开始（倒计时处理）
 * @param enemyBoundTurns 敌人被束缚的回合数
 * @returns 是否应该触发Game Over技能
 */
export function processEdenTurnStart(enemyBoundTurns: number = 0): { triggerSkill16: boolean; countdownValue: number } {
  if (!bossState.isBossFight || bossState.bossId !== 'eden') {
    return { triggerSkill16: false, countdownValue: 6 };
  }

  // 倒计时-1
  bossState.edenCountdown--;

  // 如果被束缚，额外-2
  if (enemyBoundTurns > 0) {
    bossState.edenCountdown -= 2;
  }

  // 检查是否归零
  if (bossState.edenCountdown <= 0) {
    // 重置倒计时
    bossState.edenCountdown = 6;
    // 如果沉睡中，苏醒
    if (bossState.edenSleeping) {
      bossState.edenSleeping = false;
    }
    // 触发Game Over技能
    return { triggerSkill16: true, countdownValue: bossState.edenCountdown };
  }

  return { triggerSkill16: false, countdownValue: bossState.edenCountdown };
}

/**
 * 检查伊甸芙宁是否应该苏醒（沉睡期间快感达到上限）
 */
export function shouldEdenAwaken(currentPleasure: number, maxPleasure: number): boolean {
  if (!bossState.isBossFight || bossState.bossId !== 'eden') {
    return false;
  }

  // 必须是沉睡状态且未被唤醒过
  if (!bossState.edenSleeping) {
    return false;
  }

  // 快感达到上限时触发苏醒
  return currentPleasure >= maxPleasure;
}

/**
 * 执行伊甸芙宁苏醒流程
 * @returns 新的高潮次数上限（3）
 */
export function processEdenAwakening(): { newClimaxLimit: number } {
  bossState.edenSleeping = false;
  bossState.edenAwakened = true;
  bossState.edenCountdown = 6; // 重置倒计时（上限6）

  // 播放苏醒对话
  queueDialogues(EDEN_DIALOGUES.awakening_pleasure);

  // 返回新的高潮次数上限
  return { newClimaxLimit: 3 };
}

/**
 * 处理伊甸芙宁被暴击
 * @returns debuff信息 (闪避率-8, 暴击率-8)
 */
export function processEdenCritReceived(): {
  countdownIncrease: number;
  evasionDebuff: number;
  critDebuff: number;
  critDamageMultiplier: number;
} {
  if (!bossState.isBossFight || bossState.bossId !== 'eden') {
    return { countdownIncrease: 0, evasionDebuff: 0, critDebuff: 0, critDamageMultiplier: 1 };
  }

  // 倒计时+4（不超过6）
  bossState.edenCountdown = Math.min(6, bossState.edenCountdown + 4);

  // 标记已应用暴击debuff（闪避率-8，暴击率-8）
  bossState.edenCritDebuffApplied = true;

  return {
    countdownIncrease: 4,
    evasionDebuff: -8, // 闪避率-8（减少值）
    critDebuff: -8, // 暴击率-8（减少值）
    critDamageMultiplier: 3.0, // 暴击伤害固定为300%
  };
}

/**
 * 获取懒惰天赋对玩家的debuff效果（增强版）
 * @returns 玩家debuff参数
 */
export function getEdenSlothEffects(): {
  cooldownIncrease: number;
  staminaCostMultiplier: number;
  sleepingEnduranceDebuff: number; // 沉睡状态下伊甸芙宁自己的忍耐力成算debuff
} {
  if (!bossState.isBossFight || bossState.bossId !== 'eden') {
    return { cooldownIncrease: 0, staminaCostMultiplier: 1, sleepingEnduranceDebuff: 0 };
  }

  return {
    cooldownIncrease: 3, // 技能冷却+3（增强）
    staminaCostMultiplier: 2.0, // 耐力消耗×2（增强）
    sleepingEnduranceDebuff: bossState.edenSleeping ? -70 : 0, // 沉睡时-70%忍耐力成算
  };
}

/**
 * 检查伊甸芙宁是否应该锁血（沉睡期间快感将达到上限时）
 */
export function shouldEdenLockPleasure(currentPleasure: number, maxPleasure: number): boolean {
  if (!bossState.isBossFight || bossState.bossId !== 'eden') {
    return false;
  }

  // 沉睡期间快感即将达到上限时锁血
  if (bossState.edenSleeping && currentPleasure >= maxPleasure - 1) {
    return true;
  }

  return false;
}

/**
 * 获取伊甸芙宁懒惰天赋描述信息（用于UI显示）
 */
export function getEdenSlothDescription(): string {
  const effects = [
    '【七宗罪·懒惰】',
    '• 开局进入沉睡状态，不使用任何技能',
    '• 8回合倒计时，归零时使用Game Over并重置',
    '• 被束缚时倒计时额外-2',
    '• 沉睡期间被打至高潮将苏醒，高潮次数上限变为3',
    '• 玩家技能冷却+2，耐力消耗×1.5',
    '• 被暴击后：倒计时+4，闪避-30%，忍耐力成算-30%',
    '• 受到暴击时伤害固定为300%',
  ];
  return effects.join('\n');
}

// ==================== 伊丽莎白夜羽 BOSS 对话库 ====================
export const ELIZABETH_DIALOGUES = {
  // 入场对话
  entry: [
    { speaker: '伊丽莎白夜羽', text: '"哼，汝这卑微的凡人，竟有幸得见吾之真容..."', emotion: 'arrogant' as const },
    {
      speaker: '伊丽莎白夜羽',
      text: '"既已踏入吾之永夜领域，便做好成为吾眷属的觉悟吧！"',
      emotion: 'arrogant' as const,
    },
    { speaker: '伊丽莎白夜羽', text: '"记住，在这场「演出」中，吾才是唯一的主角！"', emotion: 'arrogant' as const },
  ],

  // 跪拜指令
  command_kneel: [
    { speaker: '伊丽莎白夜羽', text: '"跪下！这是君王的命令！"', emotion: 'arrogant' as const },
    { speaker: '伊丽莎白夜羽', text: '"在永夜的主宰面前，汝只配匍匐！"', emotion: 'arrogant' as const },
  ],

  // 献礼指令
  command_tribute: [
    { speaker: '伊丽莎白夜羽', text: '"献上汝微薄的技艺吧！吾允许汝使用最低等的技能！"', emotion: 'arrogant' as const },
    { speaker: '伊丽莎白夜羽', text: '"展示汝的实力...当然，只限最低等的那种！"', emotion: 'arrogant' as const },
  ],

  // 玩家服从
  player_obey: [
    { speaker: '伊丽莎白夜羽', text: '"哼...还算识相。"', emotion: 'arrogant' as const },
    { speaker: '伊丽莎白夜羽', text: '"不错，继续保持这份恭顺..."', emotion: 'arrogant' as const },
  ],

  // 玩家违反（未暴击）
  player_disobey: [
    { speaker: '伊丽莎白夜羽', text: '"竟敢违抗吾的命令？！愚蠢至极！"', emotion: 'angry' as const },
    { speaker: '伊丽莎白夜羽', text: '"看来汝需要更严厉的惩罚才能学会服从！"', emotion: 'angry' as const },
    { speaker: '伊丽莎白夜羽', text: '"很好...吾喜欢不听话的猎物。这样玩弄起来才有趣！"', emotion: 'angry' as const },
  ],

  // 玩家违反且暴击（触发debuff）
  player_disobey_crit: [
    { speaker: '伊丽莎白夜羽', text: '"...！可恶...汝的攻击竟然...！"', emotion: 'weak' as const },
    { speaker: '伊丽莎白夜羽', text: '"哼...不过是走运而已...吾只是一时大意..."', emotion: 'tsundere' as const },
    {
      speaker: '伊丽莎白夜羽',
      text: '"（咬牙）...这次就放过汝，但下次绝不会再犯这种失误..."',
      emotion: 'tsundere' as const,
    },
  ],
};

// ==================== 伊丽莎白夜羽 BOSS 检测与初始化 ====================
/**
 * 检测是否是伊丽莎白夜羽BOSS战
 */
export function isElizabethBoss(enemyName: string): boolean {
  if (!enemyName) return false;
  const name = enemyName.toLowerCase();
  return name.includes('伊丽莎白') || name.includes('elizabeth') || name.includes('夜羽');
}

/**
 * 初始化伊丽莎白夜羽BOSS战
 */
export function initElizabethBoss(): void {
  bossState.isBossFight = true;
  bossState.bossId = 'elizabeth';
  bossState.currentPhase = 1;
  bossState.phaseTransitioning = false;
  bossState.dialogueIndex = 0;
  bossState.buttonsDisabled = false;
  bossState.hasUsedMedal = false;
  // Elizabeth专属状态初始化
  bossState.elizabethCurrentCommand = null;
  bossState.elizabethCommandTurn = 0;
  bossState.elizabethViolationCount = 0;

  // 播放入场对话
  queueDialogues(ELIZABETH_DIALOGUES.entry);
}

/**
 * 获取伊丽莎白夜羽显示名称
 */
export function getElizabethDisplayName(): string {
  return getCurrentBossPhaseDisplayName('elizabeth', 1) ?? '伊丽莎白夜羽';
}

/**
 * 获取伊丽莎白夜羽立绘URL
 */
export function getElizabethAvatarUrl(): string {
  return getCurrentBossPhaseAvatarUrl('elizabeth', 1) ?? 'https://img.vinsimage.org/性斗学园/立绘/伊丽莎白夜羽.png';
}

// ==================== 伊丽莎白夜羽 傲慢天赋机制 ====================
/**
 * 处理伊丽莎白回合开始（发布演出指令）
 * 每奇数回合发布一个随机指令
 */
export function processElizabethTurnStart(currentTurn: number): {
  hasCommand: boolean;
  command: 'kneel' | 'tribute' | null;
  dialogues: BossDialogue[];
} {
  if (!bossState.isBossFight || bossState.bossId !== 'elizabeth') {
    return { hasCommand: false, command: null, dialogues: [] };
  }

  // 奇数回合发布指令
  if (currentTurn % 2 === 1) {
    const commands: Array<'kneel' | 'tribute'> = ['kneel', 'tribute'];
    const command = commands[Math.floor(Math.random() * commands.length)];

    bossState.elizabethCurrentCommand = command;
    bossState.elizabethCommandTurn = currentTurn;

    const dialogues = command === 'kneel' ? ELIZABETH_DIALOGUES.command_kneel : ELIZABETH_DIALOGUES.command_tribute;

    return {
      hasCommand: true,
      command,
      dialogues: [dialogues[Math.floor(Math.random() * dialogues.length)]],
    };
  }

  return { hasCommand: false, command: null, dialogues: [] };
}

/**
 * 检查玩家是否服从了指令
 * @param actionType 玩家行动类型: 'skip' | 'skill'
 * @param skillRarity 使用的技能稀有度（如果是技能）
 * @param isCrit 是否暴击
 */
export function checkElizabethCommandObedience(
  actionType: 'skip' | 'skill',
  skillRarity?: string,
  isCrit?: boolean,
): {
  obeyed: boolean;
  punishPlayer: boolean;
  punishBoss: boolean;
  dialogues: BossDialogue[];
} {
  if (!bossState.isBossFight || bossState.bossId !== 'elizabeth') {
    return { obeyed: true, punishPlayer: false, punishBoss: false, dialogues: [] };
  }

  const command = bossState.elizabethCurrentCommand;
  if (!command) {
    return { obeyed: true, punishPlayer: false, punishBoss: false, dialogues: [] };
  }

  let obeyed = false;

  if (command === 'kneel') {
    // 跪拜指令：必须跳过回合
    obeyed = actionType === 'skip';
  } else if (command === 'tribute') {
    // 献礼指令：必须使用C级技能（跳过回合也算违反）
    obeyed = actionType === 'skill' && skillRarity === 'C';
  }

  // 清除当前指令
  bossState.elizabethCurrentCommand = null;

  if (obeyed) {
    const dialogues = ELIZABETH_DIALOGUES.player_obey;
    return {
      obeyed: true,
      punishPlayer: false,
      punishBoss: false,
      dialogues: [dialogues[Math.floor(Math.random() * dialogues.length)]],
    };
  } else {
    bossState.elizabethViolationCount++;

    // 检查是否暴击触发特殊效果
    if (isCrit) {
      const dialogues = ELIZABETH_DIALOGUES.player_disobey_crit;
      return {
        obeyed: false,
        punishPlayer: true,
        punishBoss: true, // 暴击时也惩罚BOSS
        dialogues: [dialogues[Math.floor(Math.random() * dialogues.length)]],
      };
    } else {
      const dialogues = ELIZABETH_DIALOGUES.player_disobey;
      return {
        obeyed: false,
        punishPlayer: true,
        punishBoss: false,
        dialogues: [dialogues[Math.floor(Math.random() * dialogues.length)]],
      };
    }
  }
}

/**
 * 获取伊丽莎白违反惩罚的BOSS加成值（可叠加）
 */
export function getElizabethViolationBonus(): {
  sexPowerBonus: number;
  enduranceBonus: number;
  evasionBonus: number;
  critBonus: number;
} {
  const count = bossState.elizabethViolationCount;
  return {
    sexPowerBonus: count * 50,
    enduranceBonus: count * 50,
    evasionBonus: count * 5,
    critBonus: count * 5,
  };
}

/**
 * 获取伊丽莎白暴击反制debuff效果（2回合）
 */
export function getElizabethCritCounterDebuff(): {
  evasionDebuff: number;
  enduranceCalcDebuff: number;
} {
  return {
    evasionDebuff: -60, // 闪避率-60%
    enduranceCalcDebuff: -90, // 忍耐力成算-90%
  };
}

/**
 * 获取伊丽莎白吸血效果（每次攻击回复10%伤害值的快感）
 */
export function getElizabethVampirismHeal(damageDealt: number): number {
  if (!bossState.isBossFight || bossState.bossId !== 'elizabeth') {
    return 0;
  }
  return Math.floor(damageDealt * 0.1);
}

/**
 * 获取伊丽莎白傲慢天赋描述信息（用于UI显示）
 */
export function getElizabethPrideDescription(): string {
  const effects = [
    '【七宗罪·傲慢】',
    '• 高潮次数上限固定为3',
    '',
    '【君王的剧本】每奇数回合发布演出指令：',
    '• 「跪拜」：玩家必须跳过回合',
    '• 「献礼」：玩家必须使用C级技能',
    '',
    '【违反惩罚】：',
    '• 玩家扣除20%最大耐力',
    '• BOSS获得：性斗力+50，忍耐力+50，闪避+5%，暴击+5%（可叠加）',
    '',
    '【暴击反制】违反指令时暴击触发：',
    '• BOSS获得：闪避率-60%，忍耐力成算-90%（2回合）',
    '',
    '【吸血】每次攻击回复10%伤害值的快感',
  ];
  return effects.join('\n');
}

// ==================== 薇丝佩菈 BOSS 对话库 ====================
export const VESPERA_DIALOGUES = {
  // 入场对话
  entry: [
    { speaker: '薇丝佩菈', text: '"呵呵...又一只迷途的羔羊闯入了我的领域~"', emotion: 'arrogant' as const },
    { speaker: '薇丝佩菈', text: '"让我看看...你是男是女呢？"', emotion: 'arrogant' as const },
  ],

  // 入场对话（女性玩家）
  entry_female: [
    { speaker: '薇丝佩菈', text: '"哦？是个可爱的女孩子呢~❤️"', emotion: 'arrogant' as const },
    { speaker: '薇丝佩菈', text: '"太好了...我最喜欢女孩子了...让我好好疼爱你吧~"', emotion: 'arrogant' as const },
  ],

  // 入场对话（男性玩家）
  entry_male: [
    { speaker: '薇丝佩菈', text: '"...是男的啊。真是晦气。"', emotion: 'angry' as const },
    { speaker: '薇丝佩菈', text: '"算了，快点解决掉你，我还要去找可爱的女孩子玩呢。"', emotion: 'angry' as const },
  ],

  // 战斗中对话（女性玩家）
  battle_female: [
    { speaker: '薇丝佩菈', text: '"你的身体好敏感呢~是不是已经开始喜欢上我了？❤️"', emotion: 'arrogant' as const },
    { speaker: '薇丝佩菈', text: '"不要害羞嘛~在我面前，你可以尽情地展现自己~"', emotion: 'arrogant' as const },
    { speaker: '薇丝佩菈', text: '"呵呵...你的表情好可爱...让我更想欺负你了~"', emotion: 'arrogant' as const },
    { speaker: '薇丝佩菈', text: '"感受到了吗？这就是被我的信息素包围的感觉~"', emotion: 'arrogant' as const },
    { speaker: '薇丝佩菈', text: '"乖孩子...再坚持一下就好了...很快你就会完全属于我~"', emotion: 'arrogant' as const },
  ],

  // 战斗中对话（男性玩家）
  battle_male: [
    { speaker: '薇丝佩菈', text: '"真是碍眼...快点射出来然后滚蛋。"', emotion: 'angry' as const },
    { speaker: '薇丝佩菈', text: '"你这种东西也配碰我？用脚趾头对付你就够了。"', emotion: 'angry' as const },
    { speaker: '薇丝佩菈', text: '"恶心...赶紧结束这场闹剧吧。"', emotion: 'angry' as const },
    { speaker: '薇丝佩菈', text: '"哼...男人果然都是这么没用。"', emotion: 'angry' as const },
  ],

  // 玩家被束缚时
  player_bound: [
    { speaker: '薇丝佩菈', text: '"被抓住了呢~现在你无处可逃了哦~❤️"', emotion: 'arrogant' as const },
    { speaker: '薇丝佩菈', text: '"乖乖不动...让我好好品尝你~"', emotion: 'arrogant' as const },
  ],

  // 玩家连续闪避时
  player_consecutive_dodge: [
    { speaker: '薇丝佩菈', text: '"呵...还挺灵活的嘛...不过这样只会让我更兴奋~"', emotion: 'arrogant' as const },
    { speaker: '薇丝佩菈', text: '"（微微喘息）...你的闪避让我有点...着急了呢..."', emotion: 'weak' as const },
  ],

  // 自体献祭技能对话（仅女性玩家，高潮次数2/3时）
  self_sacrifice: [
    { speaker: '薇丝佩菈', text: '"呼...呼...（眼神变得迷离）"', emotion: 'weak' as const },
    { speaker: '薇丝佩菈', text: '"不行了...我已经忍不住了..."', emotion: 'weak' as const },
    { speaker: '薇丝佩菈', text: '"你...让我用这个...好吗？❤️"', emotion: 'arrogant' as const },
    {
      speaker: '系统',
      text: '【色欲天赋·自体献祭】薇丝佩菈强行将你压在身下，扯下了了她的鬼角，插入了你的小穴中',
      emotion: 'weak' as const,
    },
    { speaker: '薇丝佩菈', text: '"现在...你完全是我的了...永远都是...❤️"', emotion: 'arrogant' as const },
  ],

  // 自体献祭后的战斗对话
  post_sacrifice: [
    { speaker: '薇丝佩菈', text: '"感觉如何？我的全部...都给你了哦~❤️"', emotion: 'arrogant' as const },
    { speaker: '薇丝佩菈', text: '"现在你已经被我标记了...逃不掉的~"', emotion: 'arrogant' as const },
  ],

  // 束缚免疫对话
  bind_immune: [
    { speaker: '薇丝佩菈', text: '"想束缚我？呵呵...你搞错了，应该是我束缚你才对~"', emotion: 'arrogant' as const },
  ],

  // 战胜玩家后（女性）
  victory_female: [
    { speaker: '薇丝佩菈', text: '"呵呵...你输了呢~从现在起，你就是我的人了~❤️"', emotion: 'arrogant' as const },
    { speaker: '薇丝佩菈', text: '"别担心...我会好好疼爱你的...永远~"', emotion: 'arrogant' as const },
  ],

  // 战胜玩家后（男性）
  victory_male: [
    { speaker: '薇丝佩菈', text: '"终于结束了...真是浪费时间。"', emotion: 'angry' as const },
    { speaker: '薇丝佩菈', text: '"滚吧，别再让我看到你。"', emotion: 'angry' as const },
  ],

  // 战败
  defeat: [
    { speaker: '薇丝佩菈', text: '"不...不可能...我怎么会..."', emotion: 'weak' as const },
    { speaker: '薇丝佩菈', text: '"（喘息）...你...你赢了...这次..."', emotion: 'weak' as const },
  ],
};

// ==================== 薇丝佩菈 BOSS 检测与初始化 ====================
/**
 * 检测是否是薇丝佩菈BOSS战
 */
export function isVesperaBoss(enemyName: string): boolean {
  if (!enemyName) return false;
  const name = enemyName.toLowerCase();
  return name.includes('薇丝佩菈') || name.includes('vespera') || name.includes('色欲');
}

/**
 * 初始化薇丝佩菈BOSS战
 */
export function initVesperaBoss(playerGender: string = '女'): void {
  bossState.isBossFight = true;
  bossState.bossId = 'vespera';
  bossState.currentPhase = 1;
  bossState.phaseTransitioning = false;
  bossState.dialogueIndex = 0;
  bossState.buttonsDisabled = false;
  bossState.hasUsedMedal = false;
  // Vespera专属状态初始化
  bossState.vesperaCurrentTurn = 0;
  bossState.vesperaLastSkillStaminaCost = 0;
  bossState.vesperaPlayerDodgedLastTurn = false;
  bossState.vesperaPlayerDodgedThisTurn = false;
  bossState.vesperaConsecutiveDodges = 0;
  bossState.vesperaSelfSacrificeUsed = false;

  // 播放入场对话（根据玩家性别）
  const entryDialogues: BossDialogue[] = [...VESPERA_DIALOGUES.entry];
  if (playerGender === '男') {
    entryDialogues.push(...VESPERA_DIALOGUES.entry_male);
  } else {
    entryDialogues.push(...VESPERA_DIALOGUES.entry_female);
  }
  queueDialogues(entryDialogues);
}

/**
 * 获取薇丝佩菈显示名称
 */
export function getVesperaDisplayName(): string {
  return getCurrentBossPhaseDisplayName('vespera', 1) ?? '薇丝佩菈';
}

/**
 * 获取薇丝佩菈立绘URL
 */
export function getVesperaAvatarUrl(): string {
  return getCurrentBossPhaseAvatarUrl('vespera', 1) ?? 'https://img.vinsimage.org/性斗学园/立绘/薇丝佩菈.png';
}

/**
 * 获取薇丝佩菈随机战斗对话
 */
export function getVesperaRandomBattleDialogue(playerGender: string = '女'): BossDialogue | null {
  // 如果已使用自体献祭，使用献祭后对话
  if (bossState.vesperaSelfSacrificeUsed) {
    const dialogues = VESPERA_DIALOGUES.post_sacrifice;
    return dialogues[Math.floor(Math.random() * dialogues.length)];
  }

  const dialogues = playerGender === '男' ? VESPERA_DIALOGUES.battle_male : VESPERA_DIALOGUES.battle_female;
  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

/**
 * 获取薇丝佩菈束缚免疫对话
 */
export function getVesperaBindImmuneDialogue(): BossDialogue | null {
  const dialogues = VESPERA_DIALOGUES.bind_immune;
  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

// ==================== 薇丝佩菈 色欲天赋机制 ====================

/**
 * 处理薇丝佩菈回合开始
 * @param currentTurn 当前回合数
 * @param playerMaxPleasure 玩家最大快感
 * @returns 玩家应增加的快感值和buff/debuff信息
 */
export function processVesperaTurnStart(
  currentTurn: number,
  playerMaxPleasure: number,
): {
  pleasureIncrease: number;
  sexPowerCalcBuff: number;
  enduranceCalcDebuff: number;
  shouldBindNextTurn: boolean;
} {
  if (!bossState.isBossFight || bossState.bossId !== 'vespera') {
    return { pleasureIncrease: 0, sexPowerCalcBuff: 0, enduranceCalcDebuff: 0, shouldBindNextTurn: false };
  }

  bossState.vesperaCurrentTurn = currentTurn;

  // 每回合开始时，玩家自动增添一层 基础性斗力成算+5 的buff与 基础忍耐力成算 -5 的debuff （可叠加）
  const sexPowerCalcBuff = currentTurn * 5; // 累计buff
  const enduranceCalcDebuff = currentTurn * -5; // 累计debuff

  // 玩家每回合开始时自身快感增添 当前回合*3%*最大快感
  const pleasureIncrease = Math.floor(currentTurn * 0.03 * playerMaxPleasure);

  // 检查上回合是否使用了耐力消耗>28的技能，如果是则本回合被束缚
  const shouldBindNextTurn = bossState.vesperaLastSkillStaminaCost > 28;

  // 重置上回合技能消耗记录（避免重复触发）
  bossState.vesperaLastSkillStaminaCost = 0;

  // 更新闪避状态
  bossState.vesperaPlayerDodgedLastTurn = bossState.vesperaPlayerDodgedThisTurn;
  bossState.vesperaPlayerDodgedThisTurn = false;

  return {
    pleasureIncrease,
    sexPowerCalcBuff,
    enduranceCalcDebuff,
    shouldBindNextTurn,
  };
}

/**
 * 记录玩家使用的技能耐力消耗
 */
export function recordVesperaPlayerSkillCost(staminaCost: number): void {
  if (!bossState.isBossFight || bossState.bossId !== 'vespera') {
    return;
  }
  bossState.vesperaLastSkillStaminaCost = staminaCost;
}

/**
 * 记录玩家本回合闪避
 */
export function recordVesperaPlayerDodge(): {
  consecutiveDodges: number;
  triggerDebuff: boolean;
  evasionDebuff: number;
  enduranceCalcDebuff: number;
} {
  if (!bossState.isBossFight || bossState.bossId !== 'vespera') {
    return { consecutiveDodges: 0, triggerDebuff: false, evasionDebuff: 0, enduranceCalcDebuff: 0 };
  }

  bossState.vesperaPlayerDodgedThisTurn = true;

  // 检查是否连续两回合闪避
  if (bossState.vesperaPlayerDodgedLastTurn && bossState.vesperaPlayerDodgedThisTurn) {
    bossState.vesperaConsecutiveDodges++;

    // 播放对话
    queueDialogues([
      VESPERA_DIALOGUES.player_consecutive_dodge[
        Math.floor(Math.random() * VESPERA_DIALOGUES.player_consecutive_dodge.length)
      ],
    ]);

    // 薇丝佩菈自身闪避率-8，忍耐力成算-8（永久，可叠加）
    return {
      consecutiveDodges: bossState.vesperaConsecutiveDodges,
      triggerDebuff: true,
      evasionDebuff: -8,
      enduranceCalcDebuff: -8,
    };
  }

  return { consecutiveDodges: 0, triggerDebuff: false, evasionDebuff: 0, enduranceCalcDebuff: 0 };
}

/**
 * 获取薇丝佩菈对束缚玩家的攻击加成
 * @param isPlayerBound 玩家是否被束缚
 */
export function getVesperaBoundAttackBonus(isPlayerBound: boolean): {
  guaranteedHit: boolean;
  guaranteedCrit: boolean;
} {
  if (!bossState.isBossFight || bossState.bossId !== 'vespera') {
    return { guaranteedHit: false, guaranteedCrit: false };
  }

  // 若玩家属于束缚状态，则薇丝佩菈的攻击必定命中且必定暴击
  if (isPlayerBound) {
    // 播放束缚猎物对话
    queueDialogues([VESPERA_DIALOGUES.player_bound[Math.floor(Math.random() * VESPERA_DIALOGUES.player_bound.length)]]);
    return { guaranteedHit: true, guaranteedCrit: true };
  }

  return { guaranteedHit: false, guaranteedCrit: false };
}

/**
 * 检查是否应该使用自体献祭技能
 * @param bossClimaxCount BOSS高潮次数
 * @param playerGender 玩家性别
 */
export function shouldUseVesperaSelfSacrifice(bossClimaxCount: number, playerGender: string): boolean {
  if (!bossState.isBossFight || bossState.bossId !== 'vespera') {
    return false;
  }

  // 已经使用过则不再使用
  if (bossState.vesperaSelfSacrificeUsed) {
    return false;
  }

  // 只有当BOSS高潮次数为2或3且玩家为女性时才使用
  // 注意：高潮次数2/3意味着高潮2次或3次后
  if ((bossClimaxCount === 2 || bossClimaxCount === 3) && playerGender !== '男') {
    return true;
  }

  return false;
}

/**
 * 执行自体献祭技能
 * @returns 技能效果信息
 */
export function executeVesperaSelfSacrifice(): {
  bindDuration: number;
  dialogues: BossDialogue[];
} {
  if (!bossState.isBossFight || bossState.bossId !== 'vespera') {
    return { bindDuration: 0, dialogues: [] };
  }

  bossState.vesperaSelfSacrificeUsed = true;

  return {
    bindDuration: 3, // 3回合束缚
    dialogues: VESPERA_DIALOGUES.self_sacrifice,
  };
}

/**
 * 获取薇丝佩菈累计的连续闪避debuff
 */
export function getVesperaConsecutiveDodgeDebuff(): {
  totalEvasionDebuff: number;
  totalEnduranceCalcDebuff: number;
} {
  if (!bossState.isBossFight || bossState.bossId !== 'vespera') {
    return { totalEvasionDebuff: 0, totalEnduranceCalcDebuff: 0 };
  }

  // 每次连续闪避-8，可叠加
  return {
    totalEvasionDebuff: bossState.vesperaConsecutiveDodges * -8,
    totalEnduranceCalcDebuff: bossState.vesperaConsecutiveDodges * -8,
  };
}

/**
 * 获取薇丝佩菈色欲天赋描述信息（用于UI显示）
 */
export function getVesperaLustDescription(): string {
  const effects = [
    '【七宗罪·色欲】',
    '',
    '【信息素侵蚀】每回合开始时：',
    '• 玩家获得：性斗力成算+5%（可叠加）',
    '• 玩家获得：忍耐力成算-5%（可叠加）',
    '• 玩家快感增加：当前回合×3%×最大快感',
    '',
    '【束缚猎物】玩家被束缚时：',
    '• 薇丝佩菈攻击必定命中',
    '• 薇丝佩菈攻击必定暴击',
    '',
    '【体力透支】玩家使用耐力消耗>28的技能后：',
    '• 下一回合被强制束缚1回合',
    '',
    '【挑逗惩罚】玩家连续两回合闪避时：',
    '• 薇丝佩菈闪避率-8%（永久，可叠加）',
    '• 薇丝佩菈忍耐力成算-8%（永久，可叠加）',
    '',
    '【自体献祭】高潮2/3次后（仅女性玩家）：',
    '• 强制使用特殊技能（无视束缚）',
    '• 必定命中，附带3回合束缚',
  ];
  return effects.join('\n');
}

// ==================== 黑崎晴雯 BOSS 对话库 ====================
export const HEISAKI_DIALOGUES = {
  // 入场对话
  entry: [
    { speaker: '黑崎晴雯', text: '"名字写在风纪册上。然后…把你的筹码交出来。"', emotion: 'arrogant' as const },
    { speaker: '黑崎晴雯', text: '"别误会，我不是在邀请你——我是在登记猎物。"', emotion: 'arrogant' as const },
    { speaker: '黑崎晴雯', text: '"利息很贵。你越挣扎，越值得我慢慢品尝。"', emotion: 'arrogant' as const },
  ],

  // 战斗中对话
  battle: [
    { speaker: '黑崎晴雯', text: '"规矩很简单：你出手一次，我就把价码抬高一次。"', emotion: 'arrogant' as const },
    {
      speaker: '黑崎晴雯',
      text: '"人类的理性…真廉价。只要一点点利息，就会碎得很漂亮。"',
      emotion: 'arrogant' as const,
    },
    { speaker: '黑崎晴雯', text: '"我喜欢亮晶晶的东西。包括你现在发抖的表情。"', emotion: 'arrogant' as const },
    { speaker: '黑崎晴雯', text: '"别急，我会很有耐心——直到你学会‘顺从’。"', emotion: 'arrogant' as const },
    {
      speaker: '黑崎晴雯',
      text: '"嗯…这回合结束后，我要去泡杯红茶。加五块方糖。你也一样甜就好了。"',
      emotion: 'arrogant' as const,
    },
    { speaker: '黑崎晴雯', text: '"你越透支，我越省事。毕竟，欠条最后都会落到我手里。"', emotion: 'arrogant' as const },
  ],

  // 玩家使用高稀有度技能时
  high_rarity_skill: [
    { speaker: '黑崎晴雯', text: '"奢侈的招式。很好——我会把它的价码抬到你承受不起。"', emotion: 'arrogant' as const },
    { speaker: '黑崎晴雯', text: '"再用一次试试？我保证你的‘代价’会更漂亮。"', emotion: 'arrogant' as const },
  ],

  // 玩家使用低稀有度技能命中时
  low_rarity_skill_hit: [
    { speaker: '黑崎晴雯', text: '"这种廉价的把戏也敢往我身上丢？…啧，算你捡到一点便宜。"', emotion: 'angry' as const },
    { speaker: '黑崎晴雯', text: '"别把我当成会被‘省钱’打败的那种生物。"', emotion: 'angry' as const },
  ],

  // 玩家透支耐力时
  overdraft: [
    { speaker: '黑崎晴雯', text: '"耐力不够？很好。写欠条吧——我喜欢看你签字的样子。"', emotion: 'arrogant' as const },
    { speaker: '黑崎晴雯', text: '"透支？那不是失误，是你主动把自己交到我手里。"', emotion: 'arrogant' as const },
  ],

  // 债务结算触发时（特殊对话，不可跳过）
  debt_settlement: [
    { speaker: '黑崎晴雯', text: '"停下。现在开始结算。"', emotion: 'arrogant' as const },
    { speaker: '黑崎晴雯', text: '"别眨眼。我会让你记住被掠食的感觉。"', emotion: 'arrogant' as const },
  ],

  // 债务结算后（贪婪满足）
  greed_satisfied: [{ speaker: '黑崎晴雯', text: '"……嗯。味道不错。"', emotion: 'weak' as const }],

  // 束缚免疫对话
  bind_immune: [{ speaker: '黑崎晴雯', text: '"想束缚龙族？你在开玩笑吧？"', emotion: 'arrogant' as const }],

  // 战胜玩家后
  victory: [
    { speaker: '黑崎晴雯', text: '"交易完成~你的一切...现在都是我的了~"', emotion: 'arrogant' as const },
    { speaker: '黑崎晴雯', text: '"别担心，我会好好「保管」你的~"', emotion: 'arrogant' as const },
  ],

  // 战败
  defeat: [
    { speaker: '黑崎晴雯', text: '"不...不可能...我的收藏..."', emotion: 'weak' as const },
    { speaker: '黑崎晴雯', text: '"（咬牙）...这笔账...我记下了..."', emotion: 'angry' as const },
  ],
};

// ==================== 黑崎晴雯 BOSS 检测与初始化 ====================
/**
 * 检测是否是黑崎晴雯BOSS战
 */
export function isHeisakiBoss(enemyName: string): boolean {
  if (!enemyName) return false;
  const name = enemyName.toLowerCase();
  return (
    name.includes('黑崎晴雯') ||
    name.includes('heisaki') ||
    name.includes('晴雯') ||
    name.includes('黑崎') ||
    name.includes('贪婪')
  );
}

/**
 * 初始化黑崎晴雯BOSS战
 */
export function initHeisakiBoss(): void {
  bossState.isBossFight = true;
  bossState.bossId = 'heisaki';
  bossState.currentPhase = 1;
  bossState.phaseTransitioning = false;
  bossState.dialogueIndex = 0;
  bossState.buttonsDisabled = false;
  bossState.hasUsedMedal = false;
  // Heisaki专属状态初始化
  bossState.heisakiDebt = 0;
  bossState.heisakiSkillCostMultipliers = {};
  bossState.heisakiDebtSettlementTriggered = false;

  // 播放入场对话
  queueDialogues(HEISAKI_DIALOGUES.entry);
}

/**
 * 获取黑崎晴雯显示名称
 */
export function getHeisakiDisplayName(): string {
  return getCurrentBossPhaseDisplayName('heisaki', 1) ?? '黑崎晴雯';
}

/**
 * 获取黑崎晴雯立绘URL
 */
export function getHeisakiAvatarUrl(): string {
  return getCurrentBossPhaseAvatarUrl('heisaki', 1) ?? 'https://img.vinsimage.org/性斗学园/立绘/黑崎晴雯.png';
}

/**
 * 获取黑崎晴雯随机战斗对话
 */
export function getHeisakiRandomBattleDialogue(): BossDialogue | null {
  const dialogues = HEISAKI_DIALOGUES.battle;
  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

/**
 * 获取黑崎晴雯束缚免疫对话
 */
export function getHeisakiBindImmuneDialogue(): BossDialogue | null {
  const dialogues = HEISAKI_DIALOGUES.bind_immune;
  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

// ==================== 黑崎晴雯 贪婪天赋机制 ====================

/**
 * 获取技能当前的耐力消耗倍率
 * @param skillId 技能ID
 * @returns 当前倍率（默认1）
 */
export function getHeisakiSkillCostMultiplier(skillId: string): number {
  if (!bossState.isBossFight || bossState.bossId !== 'heisaki') {
    return 1;
  }
  return bossState.heisakiSkillCostMultipliers[skillId] || 1;
}

/**
 * 计算技能实际耐力消耗（考虑倍率）
 * @param skillId 技能ID
 * @param baseCost 基础耐力消耗
 * @returns 实际耐力消耗
 */
export function calculateHeisakiSkillCost(skillId: string, baseCost: number): number {
  if (!bossState.isBossFight || bossState.bossId !== 'heisaki') {
    return baseCost;
  }
  const multiplier = bossState.heisakiSkillCostMultipliers[skillId] || 1;
  return Math.floor(baseCost * multiplier);
}

/**
 * 处理玩家使用A/S/SS级技能后的耐力消耗翻倍
 * @param skillId 技能ID
 * @param skillRarity 技能稀有度
 * @returns 是否触发了翻倍
 */
export function processHeisakiHighRaritySkillUsed(
  skillId: string,
  skillRarity: string,
): {
  triggered: boolean;
  newMultiplier: number;
  dialogues: BossDialogue[];
} {
  if (!bossState.isBossFight || bossState.bossId !== 'heisaki') {
    return { triggered: false, newMultiplier: 1, dialogues: [] };
  }

  // 只有A、S、SS级技能触发翻倍
  if (skillRarity !== 'A' && skillRarity !== 'S' && skillRarity !== 'SS') {
    return { triggered: false, newMultiplier: 1, dialogues: [] };
  }

  // 获取当前倍率，翻倍
  const currentMultiplier = bossState.heisakiSkillCostMultipliers[skillId] || 1;
  const newMultiplier = currentMultiplier * 4;
  bossState.heisakiSkillCostMultipliers[skillId] = newMultiplier;

  // 随机播放对话
  const dialogues = HEISAKI_DIALOGUES.high_rarity_skill;

  return {
    triggered: true,
    newMultiplier,
    dialogues: [dialogues[Math.floor(Math.random() * dialogues.length)]],
  };
}

/**
 * 处理玩家使用C/B级技能命中后的随机技能耐力消耗减半
 * @param playerSkillIds 玩家所有技能ID列表
 * @returns 被减半的技能ID和新倍率
 */
export function processHeisakiLowRaritySkillHit(playerSkillIds: string[]): {
  triggered: boolean;
  affectedSkillId: string | null;
  newMultiplier: number;
  dialogues: BossDialogue[];
} {
  if (!bossState.isBossFight || bossState.bossId !== 'heisaki') {
    return { triggered: false, affectedSkillId: null, newMultiplier: 1, dialogues: [] };
  }

  if (playerSkillIds.length === 0) {
    return { triggered: false, affectedSkillId: null, newMultiplier: 1, dialogues: [] };
  }

  // 随机选择一个技能
  const randomIndex = Math.floor(Math.random() * playerSkillIds.length);
  const affectedSkillId = playerSkillIds[randomIndex];

  // 获取当前倍率，减半（向上取整，最低为1）
  const currentMultiplier = bossState.heisakiSkillCostMultipliers[affectedSkillId] || 1;
  const newMultiplier = Math.max(1, Math.ceil(currentMultiplier / 2));
  bossState.heisakiSkillCostMultipliers[affectedSkillId] = newMultiplier;

  // 随机播放对话
  const dialogues = HEISAKI_DIALOGUES.low_rarity_skill_hit;

  return {
    triggered: true,
    affectedSkillId,
    newMultiplier,
    dialogues: [dialogues[Math.floor(Math.random() * dialogues.length)]],
  };
}

/**
 * 处理玩家透支耐力（耐力不足时使用债务承担）
 * @param currentStamina 当前耐力
 * @param requiredStamina 需要的耐力
 * @returns 透支信息
 */
export function processHeisakiOverdraft(
  currentStamina: number,
  requiredStamina: number,
): {
  canUseSkill: boolean;
  staminaToUse: number;
  debtIncrease: number;
  newDebt: number;
  dialogues: BossDialogue[];
} {
  if (!bossState.isBossFight || bossState.bossId !== 'heisaki') {
    // 非BOSS战，正常判断
    return {
      canUseSkill: currentStamina >= requiredStamina,
      staminaToUse: requiredStamina,
      debtIncrease: 0,
      newDebt: 0,
      dialogues: [],
    };
  }

  // 贪婪机制：允许透支
  if (currentStamina >= requiredStamina) {
    // 耐力足够，正常消耗
    return {
      canUseSkill: true,
      staminaToUse: requiredStamina,
      debtIncrease: 0,
      newDebt: bossState.heisakiDebt,
      dialogues: [],
    };
  }

  // 耐力不足，透支
  const debtIncrease = requiredStamina - currentStamina;
  bossState.heisakiDebt += debtIncrease;

  // 随机播放透支对话
  const dialogues = HEISAKI_DIALOGUES.overdraft;

  return {
    canUseSkill: true,
    staminaToUse: currentStamina, // 消耗所有当前耐力
    debtIncrease,
    newDebt: bossState.heisakiDebt,
    dialogues: [dialogues[Math.floor(Math.random() * dialogues.length)]],
  };
}

/**
 * 处理回合开始时的债务利息（30%向下取整）
 * @returns 利息增加量和新债务值
 */
export function processHeisakiDebtInterest(): {
  interestAmount: number;
  newDebt: number;
} {
  if (!bossState.isBossFight || bossState.bossId !== 'heisaki') {
    return { interestAmount: 0, newDebt: 0 };
  }

  // 重置债务结算标记
  bossState.heisakiDebtSettlementTriggered = false;

  if (bossState.heisakiDebt <= 0) {
    return { interestAmount: 0, newDebt: 0 };
  }

  // 30%利息，向下取整
  const interestAmount = Math.floor(bossState.heisakiDebt * 0.3);
  bossState.heisakiDebt += interestAmount;

  return {
    interestAmount,
    newDebt: bossState.heisakiDebt,
  };
}

/**
 * 检查是否应该触发债务结算
 * @param currentPleasure 当前快感
 * @param maxPleasure 最大快感
 * @returns 是否应该触发
 */
export function shouldTriggerHeisakiDebtSettlement(currentPleasure: number, maxPleasure: number): boolean {
  if (!bossState.isBossFight || bossState.bossId !== 'heisaki') {
    return false;
  }
  if (bossState.heisakiDebt <= 0) {
    return false;
  }
  if (currentPleasure >= maxPleasure) {
    return false;
  }

  // 当玩家的当前快感 + 债务 > 快感上限时触发
  return currentPleasure + bossState.heisakiDebt > maxPleasure;
}

/**
 * 执行债务结算
 * @param currentPleasure 当前快感
 * @param maxPleasure 最大快感
 * @returns 结算结果
 */
export function executeHeisakiDebtSettlement(
  currentPleasure: number,
  maxPleasure: number,
): {
  pleasureIncrease: number;
  debtReduction: number;
  newDebt: number;
  dialogues: BossDialogue[];
  greedSatisfiedDebuff: { enduranceCalcDebuff: number; duration: number };
} {
  if (!bossState.isBossFight || bossState.bossId !== 'heisaki') {
    return {
      pleasureIncrease: 0,
      debtReduction: 0,
      newDebt: 0,
      dialogues: [],
      greedSatisfiedDebuff: { enduranceCalcDebuff: 0, duration: 0 },
    };
  }

  // 计算可以结算的债务量（不超过快感上限-当前快感）
  const availableSpace = maxPleasure - currentPleasure;
  const debtToSettle = Math.min(bossState.heisakiDebt, Math.max(0, availableSpace));

  // 实际增加的快感量（可能触发高潮）
  const pleasureIncrease = debtToSettle;

  // 减少债务
  bossState.heisakiDebt -= debtToSettle;
  bossState.heisakiDebtSettlementTriggered = true;

  // 返回结算对话和贪婪满足debuff
  return {
    pleasureIncrease,
    debtReduction: debtToSettle,
    newDebt: bossState.heisakiDebt,
    dialogues: [...HEISAKI_DIALOGUES.debt_settlement, ...HEISAKI_DIALOGUES.greed_satisfied],
    greedSatisfiedDebuff: {
      enduranceCalcDebuff: -90, // 忍耐力成算-90%
      duration: 2, // 2回合
    },
  };
}

/**
 * 获取当前债务值
 */
export function getHeisakiDebt(): number {
  if (!bossState.isBossFight || bossState.bossId !== 'heisaki') {
    return 0;
  }
  return bossState.heisakiDebt;
}

/**
 * 获取黑崎晴雯贪婪天赋描述信息（用于UI显示）
 */
export function getHeisakiGreedDescription(): string {
  const effects = [
    '【七宗罪·贪婪】黑崎晴雯的贪婪天赋：',
    '',
    '【利息翻倍】使用A/S/SS级技能后：',
    '• 该技能下次耐力消耗翻4倍（可叠加）',
    '',
    '【廉价回馈】使用C/B级技能命中后：',
    '• 随机一个技能耐力消耗减半（可叠加）',
    '',
    '【透支机制】耐力不足时：',
    '• 允许透支，不足部分计入债务',
    '• 债务每回合增加30%利息（向下取整）',
    '',
    '【债务结算】当前快感+债务 > 快感上限时：',
    '• 触发债务结算，增加等同于债务的快感',
    '• 债务减少等同于溢出部分',
    '',
    '【贪婪满足】债务结算触发时：',
    '• 黑崎晴雯获得忍耐力成算-90%（1回合）',
  ];
  return effects.join('\n');
}

// ==================== 艾格妮丝 BOSS 对话库（七宗罪·暴食）====================
export const AGNES_DIALOGUES = {
  // 开场白（根据玩家性别区分）
  entry_female: [
    {
      speaker: '艾格妮丝',
      text: '"哎呀~今天的下午茶来了呢...请允许本公主为您斟上一杯...特制红茶♡"',
      emotion: 'arrogant' as const,
    },
    {
      speaker: '艾格妮丝',
      text: '"这芬芳的气息...是只有美丽的少女才会散发出的高贵香调呢~"',
      emotion: 'arrogant' as const,
    },
    { speaker: '艾格妮丝', text: '"来吧，让本公主好好...品鉴一下你的味道♡"', emotion: 'arrogant' as const },
  ],
  entry_male: [
    { speaker: '艾格妮丝', text: '"......（皱眉戴上蕾丝口罩）"', emotion: 'angry' as const },
    { speaker: '艾格妮丝', text: '"又是一只臭烘烘的雄性害虫吗...真是败坏本公主的胃口。"', emotion: 'angry' as const },
    { speaker: '艾格妮丝', text: '"既然你管不住自己的下半身，那本公主就帮你废了它！"', emotion: 'angry' as const },
  ],

  // 卡路里突破对话（每突破100触发）
  calorie_milestone: [
    { speaker: '艾格妮丝', text: '"嗯~不错不错...♡ 本公主还没满足呢~"', emotion: 'arrogant' as const },
    { speaker: '艾格妮丝', text: '"呼...本公主的肚子越来越暖了...力量在涌动~"', emotion: 'arrogant' as const },
    { speaker: '艾格妮丝', text: '"这种充实感...真是让人欲罢不能呢...再来一点♡"', emotion: 'arrogant' as const },
    { speaker: '艾格妮丝', text: '"真不错呢~♡，本公主现在状态绝佳！"', emotion: 'arrogant' as const },
  ],

  // 共餐触发对话（偷取道具时）
  feast_steal_female: [
    { speaker: '艾格妮丝', text: '"哦？你背包里有好东西呢~本公主不客气地收下了♡"', emotion: 'arrogant' as const },
    { speaker: '艾格妮丝', text: '"与美少女共餐是最高雅的享受...让我尝尝这是什么味道~"', emotion: 'arrogant' as const },
  ],
  feast_steal_male: [
    { speaker: '艾格妮丝', text: '"你的东西？现在是本公主的了。（轻蔑地夺走）"', emotion: 'angry' as const },
    { speaker: '艾格妮丝', text: '"害虫的物品...勉强能入口。别以为本公主会感谢你。"', emotion: 'angry' as const },
  ],

  // 发狂对话（吃到不好的东西）
  frenzy_trigger: [{ speaker: '艾格妮丝', text: '"这、这是什么堕落之物...！？"', emotion: 'angry' as const }],

  // 发狂后束缚对话
  frenzy_aftermath: [
    { speaker: '艾格妮丝', text: '"不好吃...太恶心了...本公主要把你撕碎...！"', emotion: 'angry' as const },
    { speaker: '艾格妮丝', text: '"本公主的皇冠...别碰本公主的皇冠...（虚弱）"', emotion: 'weak' as const },
  ],
};

// ==================== 艾格妮丝 BOSS 检测函数 ====================
/**
 * 检测是否是艾格妮丝BOSS战
 */
export function isAgnesBoss(enemyName: string): boolean {
  if (!enemyName) return false;
  const name = enemyName.toLowerCase();
  return (
    name.includes('艾格妮丝') ||
    name.includes('agnes') ||
    name.includes('蔷薇') ||
    name.includes('鼠族公主') ||
    name.includes('暴食')
  );
}

/**
 * 初始化艾格妮丝BOSS战
 * @param playerGender 玩家性别 'male' | 'female' | 'other'
 */
export function initAgnesBoss(playerGender: string): void {
  bossState.isBossFight = true;
  bossState.bossId = 'agnes';
  bossState.currentPhase = 1;
  bossState.phaseTransitioning = false;
  bossState.dialogueIndex = 0;
  bossState.buttonsDisabled = false;
  bossState.hasUsedMedal = false;
  // Agnes专属状态初始化
  bossState.agnesCalories = 0;
  bossState.agnesCalorieThreshold = 0;
  bossState.agnesFrenzyActive = false;
  bossState.agnesFrenzyExtraHits = 0;
  bossState.agnesFrenzyGuaranteedHit = false;
  bossState.agnesFrenzyCrit = false;

  // 根据玩家性别播放不同开场白
  const isMale = playerGender === 'male' || playerGender === '男';
  const entryDialogues = isMale ? AGNES_DIALOGUES.entry_male : AGNES_DIALOGUES.entry_female;
  queueDialogues(entryDialogues);
}

/**
 * 获取艾格妮丝显示名称
 */
export function getAgnesDisplayName(): string {
  return getCurrentBossPhaseDisplayName('agnes', 1) ?? '艾格妮丝';
}

/**
 * 获取当前卡路里值
 */
export function getAgnesCalories(): number {
  if (!bossState.isBossFight || bossState.bossId !== 'agnes') {
    return 0;
  }
  return bossState.agnesCalories;
}

/**
 * 添加卡路里（快感伤害的80%转化为卡路里）
 * @param pleasureDamage 快感伤害值
 * @param logs 日志数组
 * @returns 新增的卡路里值和是否触发阈值
 */
export function addAgnesCalories(
  pleasureDamage: number,
  logs: string[],
): { calorieGain: number; triggeredThreshold: boolean; dialogues: any[] } {
  if (!bossState.isBossFight || bossState.bossId !== 'agnes') {
    return { calorieGain: 0, triggeredThreshold: false, dialogues: [] };
  }

  // 125%的快感伤害转化为卡路里
  const calorieGain = Math.floor(pleasureDamage * 1.25);
  if (calorieGain <= 0) return { calorieGain: 0, triggeredThreshold: false, dialogues: [] };

  const oldCalories = bossState.agnesCalories;
  bossState.agnesCalories += calorieGain;
  const newCalories = bossState.agnesCalories;

  logs.push(`【七宗罪·暴食】卡路里+${calorieGain}（当前${newCalories}）`);

  // 检查是否突破100的整数倍
  const oldThreshold = Math.floor(oldCalories / 100);
  const newThreshold = Math.floor(newCalories / 100);

  let triggeredThreshold = false;
  let dialogues: any[] = [];

  if (newThreshold > oldThreshold) {
    triggeredThreshold = true;
    // 计算新增的成算加成
    const bonusPercent = newThreshold * 20;
    logs.push(`【七宗罪·暴食】卡路里突破${newThreshold * 100}！性斗力/忍耐力成算+${bonusPercent}%`);

    // 获取突破对话 - 作为阻塞式对话返回
    dialogues = [
      AGNES_DIALOGUES.calorie_milestone[Math.floor(Math.random() * AGNES_DIALOGUES.calorie_milestone.length)],
    ];

    bossState.agnesCalorieThreshold = newThreshold * 100;
  }

  return { calorieGain, triggeredThreshold, dialogues };
}

/**
 * 获取卡路里带来的成算加成（每100卡路里：性斗力/忍耐力成算+12%，魅力加成+18）
 */
export function getAgnesCalorieBonus(): {
  sexPowerCalcBonus: number;
  enduranceCalcBonus: number;
  charmCalcBonus: number;
} {
  if (!bossState.isBossFight || bossState.bossId !== 'agnes') {
    return { sexPowerCalcBonus: 0, enduranceCalcBonus: 0, charmCalcBonus: 0 };
  }

  const threshold = Math.floor(bossState.agnesCalories / 100);
  const percentBonus = threshold * 20; // 每100卡路里+20%
  const charmBonus = threshold * 30; // 每100卡路里+30魅力

  return {
    sexPowerCalcBonus: percentBonus,
    enduranceCalcBonus: percentBonus,
    charmCalcBonus: charmBonus,
  };
}

// 特殊道具列表（吃到会发狂的道具）
export const AGNES_BAD_FOOD_ITEMS = ['意识奇点', '中枢神经兴奋剂', '强力媚药', '致幻剂'];

/**
 * 执行共餐机制（奇数回合开始时）
 * @param playerItems 玩家物品列表
 * @param playerGender 玩家性别
 * @param logs 日志数组
 * @returns { itemStolen, isBadFood, itemEffects } 偷取的道具信息
 */
export function executeAgnesFeast(
  playerItems: any[],
  playerGender: string,
  logs: string[],
): {
  itemStolen: any | null;
  itemName: string;
  isBadFood: boolean;
  itemEffects: { type: string; value: number; buffs?: Record<string, number> }[];
  feastDialogue: { speaker: string; text: string; emotion: string } | null;
} {
  if (!bossState.isBossFight || bossState.bossId !== 'agnes') {
    return { itemStolen: null, itemName: '', isBadFood: false, itemEffects: [], feastDialogue: null };
  }

  // 过滤出有效的道具（数量>0的）
  const availableItems = playerItems.filter(item => item && (item.quantity > 0 || item.count > 0));
  if (availableItems.length === 0) {
    logs.push(`【七宗罪·暴食】共餐失败...玩家背包空空如也`);
    return { itemStolen: null, itemName: '', isBadFood: false, itemEffects: [], feastDialogue: null };
  }

  // 按道具种类等概率选取（与数量无关）
  const uniqueItems = [...new Map(availableItems.map(item => [item.name || item.id, item])).values()];
  const selectedItem = uniqueItems[Math.floor(Math.random() * uniqueItems.length)];
  const itemName = selectedItem.name || selectedItem.id || '未知道具';

  // 检查是否是发狂道具
  const isBadFood = AGNES_BAD_FOOD_ITEMS.some(badFood => itemName.includes(badFood));

  // 生成包含道具名称的动态共餐对话（不直接调用queueDialogues，由app.vue控制）
  const isMale = playerGender === 'male' || playerGender === '男';
  const feastDialogue = isMale
    ? { speaker: '艾格妮丝', text: `"「${itemName}」？现在是本公主的了。（轻蔑地夺走）"`, emotion: 'angry' as const }
    : { speaker: '艾格妮丝', text: `"哦？「${itemName}」呢~本公主不客气地收下了♡"`, emotion: 'arrogant' as const };

  logs.push(`【七宗罪·暴食】艾格妮丝共餐了你的「${itemName}」！`);

  if (isBadFood) {
    // 发狂！
    logs.push(`【七宗罪·暴食】艾格妮丝吃到了「${itemName}」！这是不好的东西！`);

    // 触发发狂状态
    bossState.agnesFrenzyActive = true;
    bossState.agnesFrenzyExtraHits = 1; // 连击+1
    bossState.agnesFrenzyGuaranteedHit = true; // 必定命中
    bossState.agnesFrenzyCrit = true; // 必定暴击

    logs.push(`【七宗罪·暴食】发狂！本回合连击+1，必定命中，必定暴击！`);

    return {
      itemStolen: selectedItem,
      itemName,
      isBadFood: true,
      itemEffects: [], // 特殊道具不触发效果
      feastDialogue,
    };
  }

  // 正常道具：计算3倍效果
  const itemEffects = getItemEffects(selectedItem);
  const tripleEffects = itemEffects.map(effect => {
    // 对于buff类型，需要将buffs字段的值也乘以3
    if (effect.type === 'buff' && effect.buffs) {
      const tripleBuffs: Record<string, number> = {};
      for (const [key, value] of Object.entries(effect.buffs)) {
        tripleBuffs[key] = (value as number) * 3;
      }
      return {
        type: effect.type,
        value: effect.value,
        buffs: tripleBuffs,
      };
    }
    // 对于耐力/快感类型，直接乘以3
    return {
      type: effect.type,
      value: effect.value * 3,
      buffs: effect.buffs,
    };
  });

  if (tripleEffects.length > 0) {
    const effectDescriptions = tripleEffects
      .map(e => {
        if (e.type === 'buff' && e.buffs) {
          return Object.entries(e.buffs)
            .map(([k, v]) => `${k}${v > 0 ? '+' : ''}${v}`)
            .join(', ');
        }
        return `${e.type}${e.value > 0 ? '+' : ''}${e.value}`;
      })
      .join(', ');
    logs.push(`【七宗罪·暴食】艾格妮丝获得3倍效果：${effectDescriptions}`);
  }

  return {
    itemStolen: selectedItem,
    itemName,
    isBadFood: false,
    itemEffects: tripleEffects,
    feastDialogue,
  };
}

/**
 * 解析道具效果（用于共餐机制）
 * 根据MVU道具数据结构解析：
 * - 加成属性: { 魅力加成: X, 幸运加成: Y, ... }
 * - 耐力增加: X
 * - 快感降低: X
 */
function getItemEffects(item: any): { type: string; value: number; buffs?: Record<string, number> }[] {
  const effects: { type: string; value: number; buffs?: Record<string, number> }[] = [];

  if (!item) return effects;

  // 从 耐力增加 字段解析
  if (item.耐力增加 && typeof item.耐力增加 === 'number') {
    effects.push({ type: '耐力', value: item.耐力增加 });
  }

  // 从 快感降低 字段解析（负值表示降低快感）
  if (item.快感降低 && typeof item.快感降低 === 'number') {
    effects.push({ type: '快感', value: -item.快感降低 });
  }

  // 从 加成属性 字段解析（buff类道具）
  if (item.加成属性 && typeof item.加成属性 === 'object') {
    const buffEntries = Object.entries(item.加成属性);
    if (buffEntries.length > 0) {
      // 返回buff类型效果，包含所有加成属性
      effects.push({
        type: 'buff',
        value: 1, // 占位值，实际效果在buffs字段
        buffs: item.加成属性 as Record<string, number>,
      });
    }
  }

  // 备用方案：从道具名称推断效果
  const name = item.name || item.名称 || '';
  if (effects.length === 0) {
    if (name.includes('耐力药剂')) {
      const match = name.match(/(\d+)/);
      if (match) {
        effects.push({ type: '耐力', value: parseInt(match[1]) });
      }
    }
    if (name.includes('冷静剂')) {
      const match = name.match(/(\d+)/);
      if (match) {
        effects.push({ type: '快感', value: -parseInt(match[1]) });
      }
    }
  }

  return effects;
}

/**
 * 处理发狂后的效果（卡路里减半，束缚2回合）
 * @param logs 日志数组
 * @returns 需要应用的束缚回合数
 */
export function handleAgnesFrenzyAftermath(logs: string[]): number {
  if (!bossState.isBossFight || bossState.bossId !== 'agnes') {
    return 0;
  }

  if (!bossState.agnesFrenzyActive) {
    return 0;
  }

  // 卡路里减半（而非清空）
  const oldCalories = bossState.agnesCalories;
  const halvedCalories = Math.floor(oldCalories / 2);
  bossState.agnesCalories = halvedCalories;
  const lostCalories = oldCalories - halvedCalories;

  // 重新计算阈值
  bossState.agnesCalorieThreshold = Math.floor(halvedCalories / 100) * 100;

  logs.push(`【七宗罪·暴食】艾格妮丝呕吐了...卡路里减半（-${lostCalories}，剩余${halvedCalories}）`);

  // 播放发狂后对话
  queueDialogues(AGNES_DIALOGUES.frenzy_aftermath, false);

  // 重置发狂状态
  bossState.agnesFrenzyActive = false;
  bossState.agnesFrenzyExtraHits = 0;
  bossState.agnesFrenzyGuaranteedHit = false;
  bossState.agnesFrenzyCrit = false;

  logs.push(`【七宗罪·暴食】艾格妮丝被束缚1回合！`);

  return 1; // 返回束缚回合数
}

/**
 * 检查是否处于发狂状态
 */
export function isAgnesFrenzyActive(): boolean {
  return bossState.isBossFight && bossState.bossId === 'agnes' && bossState.agnesFrenzyActive;
}

/**
 * 获取发狂状态的战斗修正
 */
export function getAgnesFrenzyModifiers(): {
  extraHits: number;
  guaranteedHit: boolean;
  guaranteedCrit: boolean;
} {
  if (!isAgnesFrenzyActive()) {
    return { extraHits: 0, guaranteedHit: false, guaranteedCrit: false };
  }

  return {
    extraHits: bossState.agnesFrenzyExtraHits,
    guaranteedHit: bossState.agnesFrenzyGuaranteedHit,
    guaranteedCrit: bossState.agnesFrenzyCrit,
  };
}

/**
 * 获取艾格妮丝暴食天赋描述信息（用于UI显示）
 */
export function getAgnesGluttonyDescription(): string {
  const effects = [
    '【七宗罪·暴食】艾格妮丝蔷薇的暴食天赋：',
    '',
    '【卡路里堆叠】每一笔快感伤害：',
    '• 125%转化为艾格妮丝的「卡路里」',
    '• 每100卡路里：性斗力/忍耐力成算+20%，魅力+30',
    '',
    '【共餐】每3回合开始时（1,4,7...）：',
    '• 随机消耗玩家1个道具',
    '• 艾格妮丝获得3倍道具效果',
    '',
    '【发狂】共餐到特殊道具时：',
    '• 本回合连击+1，必定命中，必定暴击',
    '• 之后卡路里减半',
    '• 艾格妮丝被束缚1回合',
  ];
  return effects.join('\n');
}

// ==================== 山田花子 / 西园寺辉夜 BOSS 检测与阶段 ====================

/**
 * 检测是否是山田花子特殊战。
 */
export function isYamadaHanakoBoss(enemyName: string): boolean {
  if (!enemyName) return false;
  const name = enemyName.toLowerCase();
  return (
    name.includes('山田花子') ||
    name.includes('山田') ||
    name.includes('花子') ||
    name.includes('西园寺辉夜') ||
    name.includes('辉夜') ||
    name.includes('yamada') ||
    name.includes('hanako')
  );
}

export function isYamadaHanakoTrueName(enemyName: string): boolean {
  if (!enemyName) return false;
  const name = enemyName.toLowerCase();
  return name.includes('西园寺辉夜') || name.includes('辉夜');
}

export function initYamadaHanakoBoss(initialPhase: 1 | 2 = 1): void {
  bossState.isBossFight = true;
  bossState.bossId = 'yamadaHanako';
  bossState.currentPhase = initialPhase;
  bossState.phaseTransitioning = false;
  bossState.dialogueIndex = 0;
  bossState.buttonsDisabled = false;
  bossState.hasUsedMedal = false;
}

export function getYamadaHanakoDisplayName(phase: 1 | 2 = bossState.currentPhase as 1 | 2): string {
  return getCurrentBossPhaseDisplayName('yamadaHanako', phase) ?? (phase === 2 ? '西园寺辉夜' : '山田花子');
}

export function getYamadaHanakoDataKey(phase: 1 | 2 = bossState.currentPhase as 1 | 2): string {
  return getCurrentBossPhaseDataKey('yamadaHanako', phase) ?? (phase === 2 ? '山田花子' : '山田花子_伪装');
}

export function getYamadaHanakoSkillPoolKey(phase: 1 | 2 = bossState.currentPhase as 1 | 2): string {
  return getCurrentBossPhaseSkillPoolKey('yamadaHanako', phase) ?? getYamadaHanakoDataKey(phase);
}

export function getYamadaHanakoAvatarUrl(phase: 1 | 2 = bossState.currentPhase as 1 | 2): string | undefined {
  return getCurrentBossPhaseAvatarUrl('yamadaHanako', phase) ?? 'https://img.vinsimage.org/性斗学园/立绘/山田花子.png';
}

export function shouldTriggerYamadaHanakoTrueNameRelease(currentPleasure: number, maxPleasure: number): boolean {
  if (!bossState.isBossFight || bossState.bossId !== 'yamadaHanako' || bossState.currentPhase !== 1) {
    return false;
  }

  return (
    getConfiguredPhaseTransition({
      bossId: 'yamadaHanako',
      phase: 1,
      currentPleasure,
      maxPleasure,
      currentClimaxCount: 0,
    }) === 2
  );
}

export function executeYamadaHanakoTrueNameRelease(): void {
  bossState.currentPhase = 2;
  bossState.phaseTransitioning = false;
}
