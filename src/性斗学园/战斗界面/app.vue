<template>
  <div class="combat-wrapper">
    <!-- 背景效果 -->
    <BackgroundAmbience />

    <!-- 顶部标题栏 -->
    <header class="combat-header">
      <div class="header-left">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="terminal-icon"
        >
          <path d="m4 17 6-6-6-6" />
          <path d="M12 19h8" />
        </svg>
        <div>
          <h1 class="title">性斗学园</h1>
        </div>
      </div>
      <div class="header-right">
        <div class="turn-counter">TURN {{ turnState.currentTurn }}</div>
        <div class="phase-indicator">{{ getPhaseText(turnState.phase) }}</div>
      </div>
    </header>

    <!-- 主战斗区域 -->
    <main class="combat-arena">
      <!-- 玩家角色 -->
      <CharacterPanel
        :character="player"
        :is-enemy="false"
        :turn-state="turnState"
        :enemy-intention="turnState.enemyIntention"
        :resource-popups="playerResourcePopups"
        :combat-reaction="playerCombatReaction"
      />

      <!-- VS 分隔线 -->
      <div class="vs-divider">
        <div class="divider-line"></div>
        <span class="vs-text">VS</span>
        <div class="divider-line"></div>
      </div>

      <!-- 敌人角色 -->
      <CharacterPanel
        :character="enemy"
        :is-enemy="true"
        :turn-state="turnState"
        :enemy-intention="turnState.enemyIntention"
        :resource-popups="enemyResourcePopups"
        :combat-reaction="enemyCombatReaction"
      />

      <!-- 伊甸芙宁沉睡图标 (只保留zzz图标) -->
      <div
        v-if="
          BossSystem.bossState.isBossFight &&
          BossSystem.bossState.bossId === 'eden' &&
          BossSystem.bossState.edenSleeping
        "
        class="eden-sleep-icon"
      >
        <span class="sleep-icon">💤</span>
      </div>

      <!-- 黑崎晴雯债务显示 -->
      <div
        v-if="BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'heisaki'"
        class="heisaki-debt-display"
      >
        <div class="debt-container">
          <div class="debt-icon">💰</div>
          <div class="debt-info">
            <span class="debt-label">债务</span>
            <span class="debt-value" :class="{ 'debt-danger': BossSystem.bossState.heisakiDebt > 0 }">
              {{ BossSystem.bossState.heisakiDebt }}
            </span>
          </div>
        </div>
      </div>

      <!-- 艾格妮丝卡路里显示 -->
      <div
        v-if="BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'agnes'"
        class="agnes-calorie-display"
      >
        <div class="calorie-container">
          <div class="calorie-icon">🍰</div>
          <div class="calorie-info">
            <span class="calorie-label">卡路里</span>
            <span class="calorie-value" :class="{ 'calorie-high': BossSystem.bossState.agnesCalories >= 100 }">
              {{ BossSystem.bossState.agnesCalories }}
            </span>
          </div>
        </div>
      </div>
    </main>

    <!-- BOSS文字特效 -->
    <div
      v-if="bossOverlayText"
      :key="bossDialogueKey"
      class="boss-text-overlay active"
      :class="{
        'boss-text-muxinlan': BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'muxinlan',
        'boss-text-christine': BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'christine',
        'boss-text-eden': BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'eden',
      }"
      @click="handleBossTextClick"
    >
      {{ bossOverlayText }}
    </div>

    <!-- BOSS阶段转换特效 -->
    <div v-if="phaseTransitionEffect" class="phase-transition-effect" :class="phaseTransitionEffect">
      <div class="transition-flash"></div>
      <div class="transition-particles">
        <div
          v-for="i in 50"
          :key="i"
          class="particle"
          :style="{ '--delay': i * 0.02 + 's', '--x': Math.random() * 100 + '%', '--y': Math.random() * 100 + '%' }"
        ></div>
      </div>
      <div class="transition-shockwave"></div>
    </div>

    <!-- 粒子封印画布 -->
    <canvas ref="sealCanvas" class="seal-canvas"></canvas>

    <!-- 右上角浮动战斗日志 -->
    <aside class="floating-log-panel">
      <CombatLog :logs="logs" :default-expanded="false" :show-preview="false" dock="side" />
    </aside>

    <!-- 底部操作区域 -->
    <footer class="combat-footer">
      <div class="footer-content">
        <!-- 操作菜单 -->
        <div class="action-section">
          <!-- 菜单标题 -->
          <div v-if="turnState.phase === 'playerInput'" class="action-header">
            <button class="tab-btn" :class="{ active: activeMenu === 'main' }" @click="activeMenu = 'main'">
              行动
            </button>
            <div class="tab-divider"></div>
            <span class="action-hint">请选择你的行动</span>
          </div>
          <div v-else class="action-header">
            <span class="waiting-text">
              {{ turnState.phase === 'climaxResolution' ? '等待抉择...' : '等待行动结算...' }}
            </span>
          </div>

          <!-- 操作按钮区 -->
          <div class="action-grid">
            <!-- 处理中遮罩 -->
            <div
              v-if="turnState.phase !== 'playerInput' && turnState.phase !== 'climaxResolution'"
              class="processing-overlay"
            >
              <span>计算中...</span>
            </div>

            <Transition name="slide" mode="out-in">
              <!-- 主菜单 -->
              <div v-if="activeMenu === 'main'" key="main" class="menu-main">
                <Card hover class="menu-card" @click="activeMenu = 'skills'">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="icon-blue"
                  >
                    <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
                    <path d="M13 19l6-6" />
                    <path d="m16 16 4 4" />
                    <path d="m19 21 2-2" />
                  </svg>
                  <span>战斗技能</span>
                </Card>
                <Card
                  :hover="!isItemsDisabled"
                  class="menu-card"
                  :class="{ disabled: isItemsDisabled }"
                  @click="!isItemsDisabled && (activeMenu = 'items')"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="icon-green"
                  >
                    <path d="M4 20V10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>{{ getItemsMenuLabel() }}</span>
                </Card>
                <Card v-if="hasEquipmentSkills" hover class="menu-card" @click="activeMenu = 'equipment'">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="icon-violet"
                  >
                    <path d="m12 2 3 6 6 .9-4.5 4.4 1.1 6.2L12 16.6 6.4 19.5l1.1-6.2L3 8.9 9 8z" />
                    <path d="M12 8v5" />
                    <path d="M9.5 10.5h5" />
                  </svg>
                  <span>装备技</span>
                </Card>
                <Card hover class="menu-card" @click="handleSkipTurn">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="icon-yellow"
                  >
                    <polygon points="5 4 15 12 5 20 5 4" />
                    <line x1="19" y1="5" x2="19" y2="19" />
                  </svg>
                  <span>跳过回合</span>
                </Card>
                <div class="surrender-stack">
                  <button class="tab-btn portrait-upload-btn" @click="openPlayerPortraitPicker">更换立绘</button>
                  <Card
                    :hover="!allowSurrender && !isSurrenderDisabled"
                    class="menu-card"
                    :class="{ disabled: allowSurrender || isSurrenderDisabled }"
                    data-action="surrender-menu"
                    @click="toggleSurrenderMenu"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      class="icon-gray"
                    >
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                      <line x1="4" y1="22" x2="4" y2="15" />
                    </svg>
                    <span>{{
                      isSurrenderDisabled
                        ? isSinSurrenderDisabled
                          ? '七宗罪封印'
                          : '已封印'
                        : allowSurrender
                          ? '不可投降'
                          : showSurrenderMenu
                            ? '收起'
                            : '投降'
                    }}</span>
                  </Card>
                  <div v-if="showSurrenderMenu" class="surrender-submenu">
                    <button
                      class="tab-btn surrender-sub-btn"
                      :disabled="allowSurrender || isSurrenderDisabled"
                      @click="handleSurrender"
                    >
                      投降
                    </button>
                    <button
                      class="tab-btn surrender-sub-btn"
                      :disabled="isSurrenderDisabled"
                      @click="handleSelfPleasure"
                    >
                      自慰
                    </button>
                    <button class="tab-btn surrender-sub-btn" :disabled="isSurrenderDisabled" @click="handleTempted">
                      被诱惑
                    </button>
                    <button class="tab-btn surrender-sub-btn" :disabled="isSurrenderDisabled" @click="handleTribute">
                      上贡
                    </button>
                  </div>
                  <input
                    ref="playerPortraitInput"
                    class="hidden-file-input"
                    type="file"
                    accept="image/*"
                    @change="handlePlayerPortraitSelected"
                  />
                </div>
              </div>

              <!-- 技能菜单 -->
              <div v-else-if="activeMenu === 'skills'" key="skills" class="menu-skills">
                <Card
                  v-for="skill in player.skills"
                  :key="skill.id"
                  :hover="playerBoundTurns <= 0 && !isSkillDisabled(skill)"
                  class="skill-card"
                  :class="{
                    disabled: playerBoundTurns <= 0 && isSkillDisabled(skill),
                    'bound-blocked': playerBoundTurns > 0,
                    'unusable-shake': unusableSkillFeedbackId === skill.id,
                  }"
                  @click="handlePlayerSkill(skill)"
                  @mouseenter="showSkillEffectTooltip(skill, $event)"
                  @mouseleave="hideSkillEffectTooltip(skill.id)"
                  @touchstart="startSkillEffectLongPress(skill, $event)"
                  @touchend="finishSkillEffectTouch"
                  @touchcancel="cancelSkillEffectLongPress"
                  @touchmove="cancelSkillEffectLongPress"
                  @contextmenu.prevent="showSkillEffectTooltip(skill, $event)"
                >
                  <div v-if="skill.currentCooldown > 0" class="cooldown-overlay">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span class="cooldown-count">{{ skill.currentCooldown }}<small>T</small></span>
                  </div>
                  <div class="skill-header">
                    <span
                      class="skill-name"
                      :class="{ 'skill-disabled': playerBoundTurns <= 0 && isSkillDisabled(skill) }"
                    >
                      {{ skill.name }}
                    </span>
                    <span class="skill-rarity" :class="'rarity-' + (skill.data?.rarity || 'C').toLowerCase()">{{
                      skill.data?.rarity || 'C'
                    }}</span>
                    <span v-if="skill.data?.level" class="skill-level">Lv.{{ skill.data.level }}</span>
                  </div>
                  <p class="skill-desc">
                    {{
                      skill.data?.damageDescription ||
                      skill.description ||
                      `造成${skill.data?.powerCoeff || 100}%性斗力伤害`
                    }}
                  </p>
                  <div class="skill-stats-row">
                    <span
                      class="stat-item cost"
                      :class="{
                        'cost-danger': player.stats.currentEndurance < getDisplaySkillCost(skill),
                        'cost-multiplied':
                          BossSystem.bossState.isBossFight &&
                          BossSystem.bossState.bossId === 'heisaki' &&
                          BossSystem.getHeisakiSkillCostMultiplier(skill.id) > 1,
                      }"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {{ getDisplaySkillCost(skill) }}耐力
                      <span
                        v-if="
                          BossSystem.bossState.isBossFight &&
                          BossSystem.bossState.bossId === 'heisaki' &&
                          BossSystem.getHeisakiSkillCostMultiplier(skill.id) > 1
                        "
                        class="cost-multiplier"
                      >
                        (×{{ BossSystem.getHeisakiSkillCostMultiplier(skill.id) }})
                      </span>
                    </span>
                    <span v-if="skill.cooldown > 0" class="stat-item cooldown">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {{ skill.cooldown }}回合
                    </span>
                    <span class="stat-item accuracy">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="2" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                      {{ skill.data?.accuracyModifier || 100 }}%
                    </span>
                  </div>
                </Card>
                <button class="back-btn" @click="activeMenu = 'main'">返回</button>
              </div>

              <!-- 物品菜单 -->
              <div v-else-if="activeMenu === 'items'" key="items" class="menu-items">
                <template v-if="player.items.filter(i => i.quantity > 0).length > 0">
                  <Card
                    v-for="item in player.items.filter(i => i.quantity > 0)"
                    :key="item.id"
                    :hover="true"
                    class="item-card"
                    @click="handlePlayerItemClick(item)"
                    @mouseenter="showItemEffectTooltip(item, $event)"
                    @mouseleave="hideSkillEffectTooltip(`item_${item.id}`)"
                    @touchstart="startItemEffectLongPress(item, $event)"
                    @touchend="finishSkillEffectTouch"
                    @touchcancel="cancelSkillEffectLongPress"
                    @touchmove="cancelSkillEffectLongPress"
                    @contextmenu.prevent="showItemEffectTooltip(item, $event)"
                  >
                    <div class="item-header">
                      <span class="item-name">{{ item.name }}</span>
                      <span class="item-quantity">x{{ item.quantity }}</span>
                    </div>
                    <p class="item-desc">{{ item.description }}</p>
                    <div v-if="item.staminaRestore || item.pleasureReduce" class="item-effect">
                      <span v-if="item.staminaRestore" class="effect-stamina">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        +{{ item.staminaRestore }} 耐力
                      </span>
                      <span v-if="item.pleasureReduce" class="effect-pleasure">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <path
                            d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
                          />
                        </svg>
                        -{{ item.pleasureReduce }} 快感
                      </span>
                    </div>
                  </Card>
                </template>
                <div v-else class="empty-items">
                  <p class="empty-text">背包中没有可用的战斗用品</p>
                </div>
                <button class="back-btn" @click="activeMenu = 'main'">返回</button>
              </div>

              <!-- 装备技菜单 -->
              <div v-else-if="activeMenu === 'equipment'" key="equipment" class="menu-equipment">
                <template v-if="equippedEquipmentSkills.length > 0">
                  <Card
                    v-for="skill in equippedEquipmentSkills"
                    :key="skill.id"
                    :hover="!isEquipmentSkillDisabled(skill)"
                    class="skill-card equipment-skill-card"
                    :class="{ disabled: isEquipmentSkillDisabled(skill) }"
                    @click="handleEquipmentSkill(skill)"
                  >
                    <div v-if="getEquipmentSkillCooldown(skill) > 0" class="cooldown-overlay">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span class="cooldown-count">{{ getEquipmentSkillCooldown(skill) }}<small>T</small></span>
                    </div>
                    <div class="skill-header">
                      <span class="skill-name equipment-skill-name">{{ skill.name }}</span>
                      <span class="skill-rarity" :class="'rarity-' + skill.grade.toLowerCase()">{{ skill.grade }}</span>
                    </div>
                    <p class="equipment-source">{{ skill.equipmentName }} · {{ skill.slotKey }}</p>
                    <p class="skill-desc equipment-skill-desc" :title="skill.description">{{ skill.description }}</p>
                    <div class="skill-stats-row">
                      <span class="stat-item equipment-use">
                        {{ getEquipmentSkillRemainingUses(skill) }}/{{ skill.usesPerBattle }}次
                      </span>
                      <span v-if="skill.cooldown > 0" class="stat-item cooldown">{{ skill.cooldown }}回合</span>
                      <span v-if="skill.sharedCooldownGroup" class="stat-item equipment-free">共享冷却</span>
                      <span class="stat-item equipment-free">不耗行动</span>
                    </div>
                  </Card>
                </template>
                <div v-else class="empty-items">
                  <p class="empty-text">当前没有已装备的装备技</p>
                </div>
                <button class="back-btn" @click="activeMenu = 'main'">返回</button>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- 胜负结算遮罩 -->
      <Teleport to="body">
        <div v-if="turnState.phase === 'victory' || turnState.phase === 'defeat'" class="result-overlay">
          <div class="result-content">
            <h2 class="result-title" :class="turnState.phase">
              {{ turnState.phase === 'victory' ? '完全胜利' : '彻底败北' }}
            </h2>
            <p class="result-subtitle">战斗结束</p>

            <!-- CG图片显示 -->
            <div v-if="cgImageUrl" class="cg-container">
              <img :src="cgImageUrl" :alt="cgDescription" class="cg-image" @error="handleCGImageError" />
            </div>

            <button class="btn btn-process" @click="handleSendCombatLogToLLM">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              发送日志输出过程
            </button>
          </div>
        </div>
      </Teleport>
    </footer>

    <div
      v-if="skillEffectTooltip"
      class="skill-effect-tooltip"
      :style="{
        left: `${skillEffectTooltip.left}px`,
        top: `${skillEffectTooltip.top}px`,
        width: `${skillEffectTooltip.width}px`,
        maxHeight: `${skillEffectTooltip.maxHeight}px`,
      }"
    >
      <div class="skill-effect-tooltip-title">{{ skillEffectTooltip.title || '效果说明' }}</div>
      <div
        v-for="effect in skillEffectTooltip.effects"
        :key="`${skillEffectTooltip.skillId}-${effect.label}-${effect.description}`"
        class="skill-effect-tooltip-item"
        :class="`tone-${effect.tone}`"
      >
        <span class="skill-effect-tooltip-label">{{ effect.label }}</span>
        <p>{{ effect.description }}</p>
      </div>
    </div>

    <!-- 战斗特效 -->
    <CombatEffect v-if="effectType" :type="effectType!" :show="showEffect" />

    <!-- 装备技释放特效 -->
    <div
      v-if="equipmentSkillVisualEffect"
      :key="equipmentSkillVisualEffect.key"
      class="equipment-skill-visual"
      :class="[`tone-${equipmentSkillVisualEffect.tone}`, `grade-${equipmentSkillVisualEffect.grade.toLowerCase()}`]"
    >
      <div class="equipment-skill-visual-sweep"></div>
      <div class="equipment-skill-visual-sigil">
        <span>{{ equipmentSkillVisualEffect.grade }}</span>
      </div>
      <div class="equipment-skill-visual-caption">
        <span class="equipment-skill-visual-source">{{ equipmentSkillVisualEffect.equipmentName }}</span>
        <span class="equipment-skill-visual-name">{{ equipmentSkillVisualEffect.skillName }}</span>
      </div>
    </div>

    <!-- 协同作战立绘特效 -->
    <div v-if="companionAssistEffect" class="companion-assist-effect">
      <div class="companion-assist-strike"></div>
      <img class="companion-assist-portrait" :src="companionAssistEffect.avatarUrl" :alt="companionAssistEffect.name" />
      <div class="companion-assist-caption">
        <span class="companion-name">{{ companionAssistEffect.name }}</span>
        <span class="companion-skill">{{ companionAssistEffect.skillName }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { computed, onMounted, ref, watch } from 'vue';
import BackgroundAmbience from './components/BackgroundAmbience.vue';
import Card from './components/Card.vue';
import CharacterPanel from './components/CharacterPanel.vue';
import CombatEffect from './components/CombatEffect.vue';
import CombatLog from './components/CombatLog.vue';
import {
  applyPhaseEnemyData,
  buildChristineTransitionDialogues,
  buildMuxinlanTransitionDialogues,
  buildPhaseSkillRuntime,
  createChristinePhaseSideEffectActions,
  createMuxinlanPhaseSideEffectActions,
  getChristinePhaseConfig,
  getDialogueWaitTime,
  getMuxinlanPhaseConfig,
  getYamadaHanakoPhaseConfig,
  type BossPhaseRuntimeConfig,
  type BossPhaseSideEffectAction,
} from './combatBossTransitions';
import { createBossRuntimeSetup, getPlayerGenderFromData, type BossSetupAction } from './combatBossSetup';
import {
  createClimaxLimitStatusLogs,
  createClimaxTriggerLogs,
  getClimaxOutcomeAfterSettlement,
  getClimaxSide,
  hasReachedPleasureLimit,
  settleClimaxCount,
  type ClimaxLog,
} from './combatClimax';
import {
  createBossClimaxLockActions,
  createEdenAwakeningActions,
  getBossClimaxTransition,
  type BossClimaxAction,
} from './combatClimaxBoss';
import { buildCombatEndContext, createPostBattleRecoveryLogs, selectCombatCG } from './combatConclusion';
import {
  COOPERATION_CHANCE_STEP,
  createCooperationCompanion,
  createCooperationRoll,
  getPresentCompanionNames,
  hasMatchingCooperationIdentity,
  hasActiveExorcismMazeSideQuest,
  pickCooperationAction,
  resolveCompanionSkillAttack,
  type CooperationCompanion,
} from './combatCooperation';
import {
  buildExorcismClimaxCounterKeys,
  createExorcismPhaseRuntimeConfig,
  createExorcismRuntimeSetup,
  getExorcismHpPercent,
  getExorcismPleasurePercent,
  getExorcismSkillTags,
} from './combatExorcismMechanics';
import { buildCombatNarrationPrompt } from './combatLog';
import {
  buildSpecialNegativeItemSummary,
  calculateSelfPleasureChange,
  calculateSkillDisplayCost,
  createTemptedStatusBonus,
  getItemTemporaryBuffDuration,
  isSkillActionDisabled,
  rollTributePenalty,
  validateMuxinlanHonorMedalUse,
} from './combatPlayerActions';
import {
  applyTalentPassiveDamageBoost,
  createAgnesPlayerDamageActions,
  createHeisakiHighRaritySkillUsedActions,
  createHeisakiLowRarityHitActions,
  createPlayerAttackPreparation,
  createPlayerCriticalHitActions,
  createPlayerDamageDealtActions,
  createPlayerDodgedActions,
  createTalentBindAfterHitActions,
  type PlayerAttackAction,
} from './combatPlayerAttack';
import {
  decrementSkillCooldowns,
  prepareEnemySkillUseForTurn,
  selectEnemyIntention,
  syncEnemySkillCooldowns,
} from './combatEnemyActions';
import {
  type EnemyPostDamageBossAction,
  type EnemySkillAttackEvent,
  type PlayerTalentAction,
  queueEnemySkillBattleDialogue,
  resolveEnemySkillAttack,
} from './combatEnemyAttack';
import {
  createAgnesFeastTurnStartActions,
  createBoundEnemyTurnResolution,
  createEdenTurnStartResult,
  createPlayerBindTurnStartActions,
  createVesperaSelfSacrificeAfterDialogueActions,
  createVesperaSelfSacrificeStartResult,
  type EnemyTurnStartAction,
} from './combatEnemyTurnStart';
import {
  createElizabethSkillCommandActions,
  createElizabethSkipCommandActions,
  type ElizabethCommandAction,
} from './combatElizabethActions';
import {
  buildExpiredStatusLogs,
  buildResourceChangeLog,
  buildSkillStatusLog,
  getEffectTypeName,
  getSkillStatusKey,
  normalizeSkillEffectType,
  readSkillEffectList,
  type ResolvedSkillEffect,
  resolveSkillEffect,
  upsertSkillStatus,
} from './combatSkillEffects';
import { createSinSkipTurnActions, type SkipTurnAction } from './combatSkipTurn';
import { createPlayerSinTurnEndResult, type TurnEndAction } from './combatTurnEnd';
import {
  createElizabethTurnStartActions,
  createHeisakiDebtSettlementActions,
  createHeisakiTurnStartActions,
  createPlayerSinTurnStartActions,
  createTurnStartRecoveryActions,
  createVesperaTurnStartActions,
  type TurnStartAction,
} from './combatTurnStart';
import {
  beginNextPlayerTurn,
  createEnemyIntentionPreviewLog,
  createEnemyTurnActionStartLog,
  createReadySkillCooldownLogs,
} from './combatTurnFlow';
import {
  addPlayerTemporaryStatus,
  addUniquePlayerTemporaryStatus,
  applyPostBattlePlayerRecovery,
  clearPlayerTemporaryStatuses,
  decrementBackpackItem,
  deductPlayerExpAndCoins,
  getPlayerSkillRarity,
  persistCombatConfig,
  persistPlayerCombatState,
  readAgnesFeastContext,
  readCombatStatData,
  readNormalizedCombatStatData,
  readPlayerGender,
  readPlayerTemporaryStatusList,
  removePlayerTemporaryStatus,
  setPlayerResource,
  setPlayerTemporaryStatusList,
  updateCombatStatData,
} from './combatPersistence';
import { grantVictoryRewards } from './combatRewards';
import { createCombatRuntime } from './combatRuntime';
import { statusListToEffects } from './combatStatusView';
import {
  createDefaultEnemy,
  createDefaultPlayer,
  getEnemyPortraitUrl,
  resolvePlayerCustomAvatar,
  savePlayerCustomAvatarBlob,
} from './constants';
import { ENEMY_DATABASE, NAME_ALIASES, normalizeEnemyName, resolveEnemyName } from './enemyDatabase';
import type { Character, CombatLogEntry, Item, Skill, SkillData, TurnState } from './types';
import { executeAttack } from './combatCalculator';
import {
  applyBossMechanicEvaluation,
  evaluateBossMechanics,
  type BossMechanicAction,
  type BossMechanicRuntime,
  type BossSkillActor,
  type BossTriggerType,
  type DeclarativeBossDefinition,
} from './bossMechanicEngine';
// BOSS系统
import * as BossSystem from './bossSystem';
// 天赋系统
import { getTalentById, type TalentData } from '../性斗学园脚本/data/talentDatabase';
import * as TalentSystem from './talentSystem';
import { getEnemySnapshot, getPlayerSnapshot } from '../shared/statSelectors';
import { tickStatusList, type TimedStatusEffect } from '../shared/statusEngine';
import {
  getEquipmentSkillsFromEquippedSlots,
  type EquippedEquipmentSkill,
  type EquipmentSkillDefinition,
} from '../shared/legendaryEquipment';
import { XIAOYEYUE_MAGIC_GIRL_REQUIRED_NAME } from '../shared/xiaoyeyueMagicGirl';

// 延迟加载数据库模块的辅助函数
let enemyDbModule: any = null;
let skillDbModule: any = null;
let enemySkillDbModule: any = null;

async function loadDatabaseModules() {
  if (!enemyDbModule) {
    enemyDbModule = await import('./enemyDatabase');
  }
  if (!skillDbModule) {
    skillDbModule = await import('./skillDatabase');
  }
  if (!enemySkillDbModule) {
    enemySkillDbModule = await import('./enemySkillDatabase');
  }
  return { enemyDbModule, skillDbModule, enemySkillDbModule };
}

// ================= 状态 =================
const player = ref<Character>(createDefaultPlayer());
const enemy = ref<Character>(createDefaultEnemy());
const combatRuntime = createCombatRuntime();
const enemyRuntimeStatuses = combatRuntime.enemyStatuses;
const enemyRuntimeSkillCooldowns = combatRuntime.enemySkillCooldowns;
const enemyRuntimeSkillEffects = combatRuntime.enemySkillEffects;
const turnState = combatRuntime.turnState;
const logs = combatRuntime.logs;
const activeMenu = ref<'main' | 'skills' | 'items' | 'equipment'>('main');
const allowSurrender = ref<boolean>(true); // 允许认输：true时不可认输，false时允许认输
const showSurrenderMenu = ref<boolean>(false);
let hasLoggedMissingPlayerSkills = false;
let lastMissingEnemySkillKey = '';
const playerBoundTurns = combatRuntime.playerBoundTurns; // 玩家被束缚的回合数
const enemyBoundTurns = combatRuntime.enemyBoundTurns; // 敌人被束缚的回合数
const playerBindSource = combatRuntime.playerBindSource; // 玩家束缚的施加者
const enemyBindSource = combatRuntime.enemyBindSource; // 敌人束缚的施加者

// 感官麻木状态（束缚解除后获得，期间再次被束缚只持续1回合）
const playerSensoryNumb = combatRuntime.playerSensoryNumb; // 玩家感官麻木剩余回合
const enemySensoryNumb = combatRuntime.enemySensoryNumb; // 敌人感官麻木剩余回合
const MAX_BIND_DURATION = 4; // 束缚回合上限

// BOSS禁用状态（第二阶段禁用物品和投降）
const isBossItemsDisabled = ref<boolean>(false);
const isBossSurrenderDisabled = ref<boolean>(false);

// 每回合道具使用限制
const itemUsedThisTurn = ref<boolean>(false);

// 装备技战斗内状态
const equippedEquipmentSkills = ref<EquippedEquipmentSkill[]>([]);
const equipmentSkillUses = ref<Record<string, number>>({});
const equipmentSkillCooldowns = ref<Record<string, number>>({});
const equipmentSkillSharedCooldowns = ref<Record<string, number>>({});

type EquipmentSkillVisualTone = 'bind' | 'chain' | 'rose' | 'crown';
interface EquipmentSkillVisualState {
  key: number;
  skillName: string;
  equipmentName: string;
  grade: string;
  tone: EquipmentSkillVisualTone;
}

// 七宗罪禁用状态（计算属性）
const isSinItemsDisabled = computed(() => {
  return TalentSystem.sinTalentDisablesItems(playerTalent.value);
});
const isSinSurrenderDisabled = computed(() => {
  return TalentSystem.sinTalentDisablesSurrender(playerTalent.value);
});
// 综合禁用状态（BOSS或七宗罪任一禁用则禁用，或本回合已使用道具）
const isItemsDisabled = computed(() => isBossItemsDisabled.value || isSinItemsDisabled.value || itemUsedThisTurn.value);
const isSurrenderDisabled = computed(() => isBossSurrenderDisabled.value || isSinSurrenderDisabled.value);
const hasEquipmentSkills = computed(() => equippedEquipmentSkills.value.length > 0);

function getItemsMenuLabel(): string {
  if (!isItemsDisabled.value) return '物品背包';
  if (itemUsedThisTurn.value) return '冷却中';
  if (isSinItemsDisabled.value) return '七宗罪封印';
  return '已封印';
}

// BOSS对话显示状态
const bossOverlayText = ref<string>('');
const bossDialogueKey = ref<number>(0); // 用于强制重新创建DOM元素，让动画重新播放
const sealCanvas = ref<HTMLCanvasElement | null>(null);

// BOSS阶段转换状态
const isPhaseTransitioning = ref<boolean>(false);
const phaseTransitionEffect = ref<'phase1to2' | 'phase2to3' | 'eden-game-over' | '' | null>(null);

// 特效状态
const effectType = ref<'critical' | 'dodge' | 'climax' | 'victory' | 'defeat' | null>(null);
const showEffect = ref(false);
const companionAssistEffect = ref<{ name: string; avatarUrl: string; skillName: string } | null>(null);
const equipmentSkillVisualEffect = ref<EquipmentSkillVisualState | null>(null);
type ResourcePopupTarget = 'player' | 'enemy';
type ResourcePopupKind = 'stamina' | 'pleasure';
interface ResourcePopup {
  id: number;
  target: ResourcePopupTarget;
  resource: ResourcePopupKind;
  delta: number;
  delay: number;
  offset: number;
}

interface ResourcePopupSuppression {
  target: ResourcePopupTarget;
  resource: ResourcePopupKind;
  delta: number;
}

interface SkillEffectTooltipItem {
  label: string;
  description: string;
  tone: 'buff' | 'debuff' | 'resource' | 'control' | 'special';
}

interface SkillEffectTooltipState {
  skillId: string;
  title?: string;
  effects: SkillEffectTooltipItem[];
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

interface CharacterCombatReaction {
  key: number;
  type: 'item-use' | 'item-hit' | 'status-block' | 'status-self-hit';
  label: string;
}

const resourcePopups = ref<ResourcePopup[]>([]);
let resourcePopupId = 0;
const resourcePopupSuppressions: ResourcePopupSuppression[] = [];
const playerResourcePopups = computed(() => resourcePopups.value.filter(popup => popup.target === 'player'));
const enemyResourcePopups = computed(() => resourcePopups.value.filter(popup => popup.target === 'enemy'));
const playerCombatReaction = ref<CharacterCombatReaction | null>(null);
const enemyCombatReaction = ref<CharacterCombatReaction | null>(null);
const playerSkillEffectDetails = ref<Record<string, SkillEffectTooltipItem[]>>({});
const skillEffectTooltip = ref<SkillEffectTooltipState | null>(null);
const cooperationTriggerChance = ref(0);
const unusableSkillFeedbackId = ref<string | null>(null);
let companionAssistTimer: ReturnType<typeof setTimeout> | null = null;
let equipmentSkillVisualTimer: ReturnType<typeof setTimeout> | null = null;
let unusableSkillFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
let skillEffectLongPressTimer: ReturnType<typeof setTimeout> | null = null;
let skillEffectClickGuardTimer: ReturnType<typeof setTimeout> | null = null;
let skillEffectClickGuardId: string | null = null;
const combatReactionTimers: Partial<Record<CombatSide, ReturnType<typeof setTimeout>>> = {};

// 玩家立绘上传 input
const playerPortraitInput = ref<HTMLInputElement | null>(null);

const PLAYER_GALLERY_PORTRAIT_OVERRIDES: Record<string, string> = {
  [XIAOYEYUE_MAGIC_GIRL_REQUIRED_NAME]: XIAOYEYUE_MAGIC_GIRL_REQUIRED_NAME,
  沐芯兰: '沐芯兰_2',
  克莉丝汀: '克莉丝汀_2',
  艾格妮丝蔷薇: '艾格妮丝',
  伊甸芙宁: '伊甸芙宁_2',
};

// CG相关状态
const cgImageUrl = ref<string | null>(null);
const cgDescription = ref<string>('');

// 天赋系统状态
const playerTalent = ref<TalentData | null>(null);
const playerTalentState = ref<TalentSystem.TalentState>(TalentSystem.createDefaultTalentState());

// 驱魔副本声明式 Boss 运行态
const exorcismBossDefinition = ref<DeclarativeBossDefinition | null>(null);
const exorcismBossRuntime = ref<BossMechanicRuntime | null>(null);
const exorcismSkillTagMultipliers = ref<Record<string, number>>({});
let currentCombatStatData: any = null;

// ================= BOSS对话显示系统 =================
// 点击跳过当前对话
function handleBossTextClick() {
  if (BossSystem.isShowingDialogue.value) {
    BossSystem.skipDialogue();
  }
}

// 将bossSystem.ts的对话直接映射到淡入淡出文字层
watch(
  () => [BossSystem.isShowingDialogue.value, BossSystem.currentDialogue.value],
  () => {
    if (BossSystem.isShowingDialogue.value && BossSystem.currentDialogue.value) {
      const d = BossSystem.currentDialogue.value;
      // 只显示对话文本，不显示说话人
      bossOverlayText.value = d.text;
      // 更新key强制Vue重新创建DOM元素，让动画重新播放
      bossDialogueKey.value++;
    } else {
      bossOverlayText.value = '';
    }
  },
  { immediate: true, deep: true },
);

watch(activeMenu, () => {
  hideSkillEffectTooltip();
  cancelSkillEffectLongPress();
});

// 粒子封印系统
interface Particle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  size: number;
  color: string;
  speed: number;
  delay: number;
  isArrived: boolean;
}

let particles: Particle[] = [];
let animationFrameId: number | null = null;

// 生成对角线叉叉坐标点
function generateCrossPoints(rect: DOMRect, count: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const padding = 12;
  const size = rect.width - padding * 2;

  for (let i = 0; i < count; i++) {
    const pos = (i / count) * size;
    // 左上到右下
    points.push({ x: rect.left + padding + pos, y: rect.top + padding + pos });
    // 右上到左下
    points.push({ x: rect.left + padding + pos, y: rect.top + padding + (size - pos) });
  }
  return points;
}

// 创建粒子
function createParticle(tx: number, ty: number, delay: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const dist = 500 + Math.random() * 300;
  const shades = ['#000000', '#1a1a1a', '#0d0d0d'];

  return {
    x: tx + Math.cos(angle) * dist,
    y: ty + Math.sin(angle) * dist,
    tx,
    ty,
    size: Math.random() * 6 + 4,
    color: shades[Math.floor(Math.random() * shades.length)],
    speed: 0.05 + Math.random() * 0.03,
    delay,
    isArrived: false,
  };
}

// 更新粒子
function updateParticle(p: Particle) {
  if (p.delay > 0) {
    p.delay--;
    return;
  }
  if (p.isArrived) return;

  p.x += (p.tx - p.x) * p.speed;
  p.y += (p.ty - p.y) * p.speed;

  if (Math.abs(p.x - p.tx) < 0.5 && Math.abs(p.y - p.ty) < 0.5) {
    p.x = p.tx;
    p.y = p.ty;
    p.isArrived = true;
  }
}

// 绘制粒子
function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  if (p.delay > 0) return;
  ctx.fillStyle = p.color;
  ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
}

// 粒子动画循环
function animateParticles() {
  if (!sealCanvas.value) return;
  const ctx = sealCanvas.value.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, sealCanvas.value.width, sealCanvas.value.height);
  particles.forEach(p => {
    updateParticle(p);
    drawParticle(ctx, p);
  });

  animationFrameId = requestAnimationFrame(animateParticles);
}

// 执行封印效果（禁用按钮）
function castSealEffect(targetSelectors: string[]) {
  particles = [];

  targetSelectors.forEach(selector => {
    const el = document.querySelector(selector) as HTMLElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const points = generateCrossPoints(rect, 50);

    points.forEach(p => {
      particles.push(createParticle(p.x, p.y, Math.random() * 40));
    });

    // 1.2秒后按钮变暗
    setTimeout(() => {
      el.classList.add('is-sealed');
    }, 1200);
  });

  if (animationFrameId === null) {
    animateParticles();
  }
}

// 解除封印效果
function removeSealEffect(targetSelectors: string[]) {
  targetSelectors.forEach(selector => {
    const el = document.querySelector(selector) as HTMLElement;
    if (el) {
      el.classList.remove('is-sealed');
    }
  });
  particles = [];
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (sealCanvas.value) {
    const ctx = sealCanvas.value.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, sealCanvas.value.width, sealCanvas.value.height);
    }
  }
}

/**
 * 计算闪避率（带递减收益）
 * - 0-60%: 1:1比例
 * - 60%-70%: 5:1比例（超过60的部分除以5）
 * - 上限: 70%
 *
 * 例如：原始闪避率100 -> 60 + (100-60)/5 = 60 + 8 = 68
 * 达到70%上限需要原始闪避率110（60 + 50/5 = 70）
 */
function calcEvasionWithDiminishingReturns(rawEvasion: number): number {
  const normalCap = 60; // 正常比例的上限
  const hardCap = 70; // 闪避率绝对上限
  const diminishingRatio = 5; // 超过60后的递减比例

  // 确保不为负数
  const safeRaw = Math.max(0, rawEvasion);

  if (safeRaw <= normalCap) {
    // 60以内，1:1比例
    return safeRaw;
  }

  // 超过60的部分按5:1递减
  const excessEvasion = safeRaw - normalCap;
  const diminishedBonus = excessEvasion / diminishingRatio;
  const finalEvasion = normalCap + diminishedBonus;

  // 最终上限为70
  return Math.min(hardCap, finalEvasion);
}

// ================= MVU 集成 =================
// 获取用户名字
function getUserName(): string {
  try {
    // 方法1：从聊天消息中获取最新的用户消息
    if (typeof getChatMessages === 'function') {
      const messages = getChatMessages(-1, { role: 'user' });
      if (messages && messages.length > 0) {
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage?.name) {
          return lastUserMessage.name;
        }
      }
    }

    // 方法2：从全局对象获取
    const globalAny = window as any;
    if (globalAny.chat?.characters && globalAny.chat.characters.length > 0) {
      // 尝试获取用户名字（通常是第一个角色）
      const userChar = globalAny.chat.characters.find((c: any) => c.is_user || c.role === 'user');
      if (userChar?.name) {
        return userChar.name;
      }
    }

    // 方法3：从SillyTavern获取
    if (globalAny.SillyTavern?.chat?.characters) {
      const userChar = globalAny.SillyTavern.chat.characters.find((c: any) => c.is_user || c.role === 'user');
      if (userChar?.name) {
        return userChar.name;
      }
    }
  } catch (e) {
    console.warn('[战斗界面] 获取用户名失败', e);
  }

  // 默认值
  return '玩家';
}

function resolveKnownPortraitName(name: string): string | null {
  const normalizedName = normalizeEnemyName(String(name || '').trim());
  if (!normalizedName || normalizedName === '玩家') {
    return null;
  }

  const overrideName = PLAYER_GALLERY_PORTRAIT_OVERRIDES[normalizedName];
  if (overrideName) {
    return overrideName;
  }

  if (normalizedName in ENEMY_DATABASE) {
    return normalizedName;
  }

  const aliasName = NAME_ALIASES[normalizedName];
  if (aliasName && aliasName in ENEMY_DATABASE) {
    return aliasName;
  }

  const enemyDbNames = Object.keys(ENEMY_DATABASE).sort((a, b) => b.length - a.length);
  for (const fullName of enemyDbNames) {
    if (normalizedName.includes(fullName)) {
      return fullName;
    }
  }

  const enemyAliases = Object.entries(NAME_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, fullName] of enemyAliases) {
    if (normalizedName.includes(alias) && fullName in ENEMY_DATABASE) {
      return fullName;
    }
  }

  return null;
}

function resolvePlayerGalleryPortraitUrl(playerName: string): string | null {
  const portraitName = resolveKnownPortraitName(playerName);
  return portraitName ? getEnemyPortraitUrl(portraitName) : null;
}

function setSharedClimaxLimit(limit: number) {
  player.value.stats.maxClimaxCount = limit;
  enemy.value.stats.maxClimaxCount = limit;
}

function setEnemyRuntimeStatus(name: string, effect: TimedStatusEffect) {
  enemyRuntimeStatuses.value = {
    ...(enemyRuntimeStatuses.value as Record<string, any>),
    [name]: {
      加成: effect.加成 || {},
      剩余回合: Math.max(0, Number(effect.剩余回合) || 0),
      描述: effect.描述 || '',
      资源变化: effect.资源变化,
      特殊效果: effect.特殊效果,
    },
  };
  enemy.value.statusEffects = statusListToEffects(enemyRuntimeStatuses.value, 'enemy_');
}

function addEnemyRuntimeStatusBonus(name: string, bonus: Record<string, number>, duration: number) {
  const current = ((enemyRuntimeStatuses.value as Record<string, any>)[name] || {}) as TimedStatusEffect;
  const currentBonus = { ...(current.加成 || {}) } as Record<string, number>;
  Object.entries(bonus).forEach(([key, value]) => {
    currentBonus[key] = (Number(currentBonus[key]) || 0) + value;
  });
  setEnemyRuntimeStatus(name, {
    加成: currentBonus,
    剩余回合: duration,
    描述: current.描述 || '',
    资源变化: current.资源变化,
    特殊效果: current.特殊效果,
  });
}

function applyBossSetupActions(actions: BossSetupAction[]) {
  actions.forEach(action => {
    switch (action.kind) {
      case 'log':
        addLog(action.message, action.source, action.type);
        break;
      case 'setEnemyStatus':
        setEnemyRuntimeStatus(action.statusName, action.effect);
        break;
      case 'setSurrenderDisabled':
        isBossSurrenderDisabled.value = action.disabled;
        break;
    }
  });
}

interface ExorcismMechanicApplyResult {
  cancelAction: boolean;
  skipBattle: boolean;
  phaseChanged: boolean;
  triggeredBadEnd: boolean;
}

interface ExorcismMechanicOptions {
  skill?: Skill;
  skillActor?: BossSkillActor;
  targetEnemy?: Character;
  playerDialogue?: string;
  damageTakenPercent?: number;
  climaxCounters?: Record<string, number>;
}

function resetExorcismRuntime() {
  exorcismBossDefinition.value = null;
  exorcismBossRuntime.value = null;
  exorcismSkillTagMultipliers.value = {};
}

function getExorcismCompanions(): string[] | undefined {
  const rawCompanions = _.get(currentCombatStatData, '关系系统.在场人物');
  if (!Array.isArray(rawCompanions)) return undefined;
  return rawCompanions.map(item => String(item)).filter(Boolean);
}

function getExorcismRelationships(): Record<string, number> {
  const relationships = _.get(currentCombatStatData, '关系系统', {}) as Record<string, any>;
  const result: Record<string, number> = {};
  Object.entries(relationships || {}).forEach(([name, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const favor = Number(value.好感度 ?? value.favor ?? value.affection);
    if (Number.isFinite(favor)) {
      result[name] = favor;
    }
  });
  return result;
}

function isCurrentEnemyName(
  statData: Record<string, any>,
  companionName: string,
  resolvedCompanionName: string,
): boolean {
  const rawEnemyNames = [enemy.value.name, String(_.get(statData, '性斗系统.对手名称', '') || '')].filter(Boolean);
  return hasMatchingCooperationIdentity(rawEnemyNames, [companionName, resolvedCompanionName]);
}

async function getCooperationCompanions(statData: Record<string, any>): Promise<CooperationCompanion[]> {
  const { enemySkillDbModule } = await loadDatabaseModules();
  const companions: CooperationCompanion[] = [];

  getPresentCompanionNames(statData).forEach(companionName => {
    const resolvedName = resolveEnemyName(companionName);
    if (isCurrentEnemyName(statData, companionName, resolvedName)) {
      return;
    }

    const skillDataList = (enemySkillDbModule.getEnemySkills(companionName, resolvedName) || []) as SkillData[];
    const companion = createCooperationCompanion({
      name: companionName,
      skillDataList,
      playerLevel: player.value.stats.level,
      maxClimaxCount: player.value.stats.maxClimaxCount,
      getAvatarUrl: getEnemyPortraitUrl,
    });

    if (companion) {
      companions.push(companion);
    }
  });

  return companions;
}

function getCurrentExorcismSkillTagMultiplier(skill: Skill | null | undefined): number {
  const tags = getExorcismSkillTags(skill);
  if (tags.length === 0) return 1;

  return tags.reduce((multiplier, tag) => multiplier * (exorcismSkillTagMultipliers.value[tag] ?? 1), 1);
}

function buildExorcismClimaxCounters(enemyClimaxCount: number): Record<string, number> {
  const definition = exorcismBossDefinition.value;
  const runtime = exorcismBossRuntime.value;
  if (!definition || !runtime) return {};

  const counters: Record<string, number> = {};
  buildExorcismClimaxCounterKeys(definition, runtime).forEach(key => {
    counters[key] = enemyClimaxCount;
  });
  return counters;
}

function updateExorcismDamageStepRuntime(
  definition: DeclarativeBossDefinition,
  runtime: BossMechanicRuntime,
  matchedMechanicIds: string[],
  damageTakenPercent: number | undefined,
) {
  if (typeof damageTakenPercent !== 'number') return;

  for (const mechanicId of matchedMechanicIds) {
    const mechanic = definition.mechanics.find(item => item.id === mechanicId);
    const damageStepTrigger = mechanic?.triggers.find(trigger => trigger.type === 'damageTakenPercentStep');
    if (!damageStepTrigger) continue;
    const everyPercent = Math.max(1, damageStepTrigger.everyPercent ?? 20);
    runtime.lastDamageStep = Math.max(runtime.lastDamageStep, Math.floor(damageTakenPercent / everyPercent));
  }
}

async function applyExorcismPhaseRuntime(phase: number): Promise<BossPhaseRuntimeConfig | null> {
  const definition = exorcismBossDefinition.value;
  if (!definition) return null;

  const phaseConfig = createExorcismPhaseRuntimeConfig({
    definition,
    phase,
    defaultClimaxLimit: player.value.stats.maxClimaxCount || enemy.value.stats.maxClimaxCount || 1,
    getEnemyPortraitUrl,
  });
  if (!phaseConfig) {
    addLog(`【驱魔机制】未找到 ${definition.displayName} 的第 ${phase} 阶段配置。`, 'system', 'critical');
    return null;
  }

  isPhaseTransitioning.value = true;
  phaseTransitionEffect.value = phaseConfig.transitionEffect;

  const newEnemyData = await loadAndApplyBossPhaseRuntime(phaseConfig, {
    updateAvatar: true,
    skillLogLabel: '[战斗界面] 驱魔Boss阶段技能池:',
  });

  if (newEnemyData) {
    setSharedClimaxLimit(phaseConfig.climaxLimit);
    addLog(`【驱魔阶段】${phaseConfig.displayName} 进入第 ${phase} 阶段。`, 'system', 'critical');
  } else {
    addLog(`【驱魔阶段】阶段数据加载失败：${phaseConfig.dataKey}`, 'system', 'critical');
  }

  isPhaseTransitioning.value = false;
  setTimeout(() => {
    phaseTransitionEffect.value = null;
  }, 1200);

  return phaseConfig;
}

async function loadExorcismSkillPool(skillPoolKey: string) {
  await loadEnemyRuntimeSkills(skillPoolKey, currentCombatStatData || {});
  turnState.enemyIntention = null;
}

async function forceExorcismEnemySkill(skillId: string) {
  let forcedSkill = enemy.value.skills.find(skill => skill.id === skillId);

  if (!forcedSkill) {
    const { enemySkillDbModule } = await loadDatabaseModules();
    const skillData = enemySkillDbModule.ENEMY_SKILLS?.[skillId];
    if (skillData) {
      enemyRuntimeSkillCooldowns.value = {
        ...(enemyRuntimeSkillCooldowns.value as Record<string, number>),
        [skillData.id]: 0,
      };
      enemyRuntimeSkillEffects.value = {
        ...(enemyRuntimeSkillEffects.value as Record<string, any>),
        [skillData.id]: enemySkillDbModule.convertToMvuSkillFormat(skillData),
      };
      forcedSkill = {
        id: skillData.id,
        name: skillData.name,
        description: skillData.description,
        cost: skillData.staminaCost || 0,
        type: skillData.type || 'attack',
        cooldown: skillData.cooldown || 0,
        currentCooldown: 0,
        data: skillData,
      };
      enemy.value.skills = [forcedSkill, ...enemy.value.skills.filter(skill => skill.id !== skillData.id)];
    }
  }

  if (!forcedSkill) {
    addLog(`【驱魔机制】未找到强制技能：${skillId}`, 'system', 'critical');
    return;
  }

  turnState.enemyIntention = forcedSkill;
  addLog(`【驱魔机制】${enemy.value.name} 锁定技能：${forcedSkill.name}`, 'system', 'critical');
}

async function applyExorcismMechanicActions(actions: BossMechanicAction[], result: ExorcismMechanicApplyResult) {
  let loadedPhaseSkillPoolKey: string | undefined;

  for (const action of actions) {
    switch (action.type) {
      case 'setPhase': {
        if (typeof action.phase !== 'number') break;
        const phaseConfig = await applyExorcismPhaseRuntime(action.phase);
        loadedPhaseSkillPoolKey = phaseConfig?.skillPoolKey;
        result.phaseChanged = true;
        await evaluateAndApplyExorcismMechanics('phaseEnter');
        await evaluateAndApplyExorcismMechanics('playerGenderIs');
        break;
      }
      case 'setSkillPool':
        if (action.skillPoolKey && action.skillPoolKey !== loadedPhaseSkillPoolKey) {
          await loadExorcismSkillPool(action.skillPoolKey);
        }
        break;
      case 'addProgress':
      case 'setProgress':
        if (action.stateKey && exorcismBossRuntime.value) {
          const value = exorcismBossRuntime.value.progress[action.stateKey] ?? 0;
          addLog(`【驱魔进度】${action.stateKey}: ${value}`, 'system', 'info');
        }
        break;
      case 'resetPleasure':
        enemy.value.stats.currentPleasure = 0;
        break;
      case 'resetCombatResources': {
        const target = action.resourceTarget ?? 'both';
        const resetPleasure = action.resetPleasure !== false;
        const resetClimaxCount = action.resetClimaxCount !== false;
        const shouldResetPlayer = target === 'player' || target === 'both';
        const shouldResetEnemy = target === 'enemy' || target === 'both';

        if (!resetPleasure && !resetClimaxCount) break;

        if (shouldResetPlayer) {
          if (resetPleasure) {
            player.value.stats.currentPleasure = 0;
            await syncPlayerPleasureToMvu(0);
          }
          if (resetClimaxCount) {
            player.value.stats.climaxCount = 0;
          }
        }

        if (shouldResetEnemy) {
          if (resetPleasure) {
            syncEnemyPleasureToRuntime(0);
          }
          if (resetClimaxCount) {
            enemy.value.stats.climaxCount = 0;
          }
        }

        const resetTargetName = target === 'both' ? '双方' : target === 'player' ? player.value.name : enemy.value.name;
        const resetParts: string[] = [];
        if (resetPleasure) resetParts.push('快感');
        if (resetClimaxCount) resetParts.push('高潮次数');
        addLog(`【驱魔机制】${resetTargetName}${resetParts.join('与')}已重置。`, 'system', 'info');
        break;
      }
      case 'log':
        if (action.message) {
          addLog(`【驱魔机制】${action.message}`, 'system', 'info');
        }
        break;
      case 'applyStatus':
        if (action.statusName) {
          setEnemyRuntimeStatus(action.statusName, {
            加成: {},
            剩余回合: action.duration ?? 999,
            描述: action.message || action.statusName,
          });
          await updateEnemyRealtimeStats();
        }
        break;
      case 'startJudgement':
        if (action.judgementKey) {
          addLog(
            `【驱魔判定】${action.judgementKey} 开始：需要连续成功 ${action.requiredSuccesses ?? 1} 次。`,
            'system',
            'critical',
          );
        }
        break;
      case 'startRitual':
        if (action.ritualKey) {
          addLog(
            `【驱魔仪式】${action.ritualKey} 开始：需要维持 ${action.requiredTurns ?? 1} 回合。`,
            'system',
            'critical',
          );
        }
        break;
      case 'triggerBadEnd':
        result.triggeredBadEnd = true;
        turnState.phase = 'defeat';
        triggerEffect('defeat');
        addLog('【驱魔失败】特殊失败分支已触发。', 'system', 'critical');
        break;
      case 'skipBattle':
        result.skipBattle = true;
        turnState.phase = 'gameOver';
        addLog('【驱魔机制】当前条件不满足，战斗已被阻止。', 'system', 'critical');
        break;
      case 'forceSkill':
        if (action.skillId) {
          await forceExorcismEnemySkill(action.skillId);
        }
        break;
      case 'modifySkillTag':
        if (action.skillTags && typeof action.multiplier === 'number') {
          const nextMultipliers = { ...exorcismSkillTagMultipliers.value };
          action.skillTags.forEach(tag => {
            nextMultipliers[tag] = action.multiplier ?? 1;
          });
          exorcismSkillTagMultipliers.value = nextMultipliers;
        }
        break;
      case 'cancelAction':
        result.cancelAction = true;
        break;
      case 'stun': {
        const duration = Math.max(1, action.duration ?? 1);
        enemyBoundTurns.value = Math.max(enemyBoundTurns.value, duration);
        enemyBindSource.value = 'player';
        break;
      }
      case 'reviveActor':
        if (action.actorId && exorcismBossRuntime.value) {
          exorcismBossRuntime.value.actorStates[action.actorId] = 'active';
          addLog(`【驱魔机制】${action.actorId} 重新进入战斗。`, 'system', 'critical');
        }
        break;
    }
  }
}

async function evaluateAndApplyExorcismMechanics(
  event: BossTriggerType,
  options: ExorcismMechanicOptions = {},
): Promise<ExorcismMechanicApplyResult> {
  const result: ExorcismMechanicApplyResult = {
    cancelAction: false,
    skipBattle: false,
    phaseChanged: false,
    triggeredBadEnd: false,
  };

  const definition = exorcismBossDefinition.value;
  const runtime = exorcismBossRuntime.value;
  if (!definition || !runtime) return result;

  runtime.turn = turnState.currentTurn;
  const targetEnemy = options.targetEnemy ?? enemy.value;
  const evaluation = evaluateBossMechanics(definition, runtime, {
    event,
    currentPhase: runtime.currentPhase,
    turn: turnState.currentTurn,
    hpPercent: getExorcismHpPercent(targetEnemy),
    pleasurePercent: getExorcismPleasurePercent(targetEnemy),
    damageTakenPercent: options.damageTakenPercent,
    skillTags: getExorcismSkillTags(options.skill),
    skillActor: options.skillActor,
    playerDialogue: options.playerDialogue,
    playerGender: await readPlayerGender('男'),
    companions: getExorcismCompanions(),
    relationships: getExorcismRelationships(),
    progress: runtime.progress,
    flags: runtime.flags,
    counters: runtime.counters,
    lossCounters: runtime.lossCounters,
    climaxCounters: options.climaxCounters,
    actorStates: runtime.actorStates,
  });

  if (evaluation.actions.length === 0) return result;

  applyBossMechanicEvaluation(runtime, evaluation);
  updateExorcismDamageStepRuntime(definition, runtime, evaluation.matchedMechanicIds, options.damageTakenPercent);
  await applyExorcismMechanicActions(evaluation.actions, result);

  return result;
}

function applyEnemySnapshotToRuntime(
  data: any,
  displayName: string,
  avatarUrl: string,
  resetResources: boolean,
): boolean {
  const snapshot = getEnemySnapshot(data, enemyRuntimeStatuses.value);
  if (!snapshot) {
    return false;
  }

  enemy.value.name = displayName || snapshot.name;
  enemy.value.avatarUrl = avatarUrl;
  enemy.value.stats.level = snapshot.level;
  enemy.value.stats.maxEndurance = snapshot.resources.maxStamina;
  enemy.value.stats.maxPleasure = snapshot.resources.maxPleasure;
  enemy.value.stats.maxClimaxCount = snapshot.resources.maxClimax;
  enemy.value.stats.sexPower = snapshot.stats.sexPower;
  enemy.value.stats.baseEndurance = snapshot.stats.endurance;
  enemy.value.stats.charm = snapshot.stats.charm;
  enemy.value.stats.luck = snapshot.stats.luck;
  enemy.value.stats.evasion = snapshot.stats.evasion;
  enemy.value.stats.crit = snapshot.stats.crit;
  enemy.value.statusEffects = statusListToEffects(enemyRuntimeStatuses.value, 'enemy_');

  if (resetResources) {
    enemy.value.stats.currentEndurance = snapshot.resources.maxStamina;
    enemy.value.stats.currentPleasure = 0;
    enemy.value.stats.climaxCount = 0;
  } else {
    enemy.value.stats.currentEndurance = Math.min(enemy.value.stats.currentEndurance, snapshot.resources.maxStamina);
    enemy.value.stats.currentPleasure = Math.min(enemy.value.stats.currentPleasure, snapshot.resources.maxPleasure);
  }

  return true;
}

function getEnemySkillLookupName(enemyName: string, data: any): string {
  const playerGender = getPlayerGenderFromData(data);
  if (enemyName === '艾格妮丝' || enemyName.includes('艾格妮丝')) {
    return playerGender === '男' ? '艾格妮丝_男' : '艾格妮丝';
  }
  if (enemyName === '芙莲' || enemyName.includes('芙莲')) {
    return playerGender === '男' ? '芙莲_男' : '芙莲';
  }
  if (enemyName === '薇丝佩菈' || enemyName.includes('薇丝佩菈')) {
    return playerGender === '男' ? '薇丝佩菈_男' : '薇丝佩菈';
  }
  return enemyName;
}

async function loadEnemyRuntimeSkills(enemyName: string, data: any) {
  const { enemySkillDbModule } = await loadDatabaseModules();
  const skillLookupName = getEnemySkillLookupName(enemyName, data);
  const dedicatedSkills = enemySkillDbModule.getEnemySkills(enemyName, skillLookupName) || [];
  const fallbackSkills =
    dedicatedSkills.length === 0 && typeof enemySkillDbModule.getFallbackEnemySkills === 'function'
      ? enemySkillDbModule.getFallbackEnemySkills(enemyName)
      : [];
  const skillDataList = dedicatedSkills.length > 0 ? dedicatedSkills : fallbackSkills;

  enemyRuntimeSkillCooldowns.value = {};
  enemyRuntimeSkillEffects.value = {};

  if (skillDataList.length === 0) {
    enemy.value.skills = [];
    const missingKey = `${enemyName}:${skillLookupName}`;
    const message = `未读取到对手技能系统：${enemyName} 没有匹配到可用技能池，请检查最新楼层变量。尝试删除性斗楼层并重新点击性斗按钮。`;
    console.warn(`[战斗界面] ${message}`, { enemyName, skillLookupName });
    if (lastMissingEnemySkillKey !== missingKey) {
      addLog(message, 'system', 'critical');
      lastMissingEnemySkillKey = missingKey;
    }
    return;
  }

  lastMissingEnemySkillKey = '';
  if (dedicatedSkills.length === 0) {
    console.info(`[战斗界面] 对手未命中专属技能池，使用通用NPC技能池: ${enemyName}`, {
      enemyName,
      skillLookupName,
      skills: skillDataList.map((skill: any) => skill.name),
    });
  }
  enemy.value.skills = skillDataList.map((skillData: any) => {
    enemyRuntimeSkillCooldowns.value[skillData.id] = 0;
    enemyRuntimeSkillEffects.value[skillData.id] = enemySkillDbModule.convertToMvuSkillFormat(skillData);
    return {
      id: skillData.id,
      name: skillData.name,
      description: skillData.description,
      cost: skillData.staminaCost || 0,
      type: skillData.type || 'attack',
      cooldown: skillData.cooldown || 0,
      currentCooldown: 0,
      data: skillData,
    };
  });

  console.info(
    `[战斗界面] 已加载对手运行时技能: ${enemyName}`,
    enemy.value.skills.map(skill => skill.name),
  );
}

async function loadEnemyRuntimeData(data: any, maxClimaxCount: number) {
  const rawName = String(_.get(data, '性斗系统.对手名称', '风纪委员长') || '风纪委员长');
  const normalizedName = normalizeEnemyName(rawName);
  currentCombatStatData = data;
  enemyRuntimeStatuses.value = {};
  enemyRuntimeSkillCooldowns.value = {};
  enemyRuntimeSkillEffects.value = {};
  isBossItemsDisabled.value = false;
  isBossSurrenderDisabled.value = false;
  resetExorcismRuntime();

  const exorcismSetup = createExorcismRuntimeSetup({
    enemyName: normalizedName,
    defaultClimaxLimit: maxClimaxCount,
    getEnemyPortraitUrl,
  });
  if (exorcismSetup) {
    exorcismBossDefinition.value = exorcismSetup.definition;
    exorcismBossRuntime.value = exorcismSetup.runtime;
    _.set(data, '性斗系统.对手名称', exorcismSetup.phaseConfig.dataKey);
    _.set(data, '性斗系统.胜负规则.高潮次数上限', exorcismSetup.phaseConfig.climaxLimit);
    setSharedClimaxLimit(exorcismSetup.phaseConfig.climaxLimit);

    const loaded = await loadAndApplyBossPhaseRuntime(exorcismSetup.phaseConfig, {
      updateAvatar: true,
      skillLogLabel: '[战斗界面] 驱魔Boss初始技能池:',
    });
    if (!loaded) {
      const snapshotOk = applyEnemySnapshotToRuntime(
        data,
        exorcismSetup.phaseConfig.displayName,
        exorcismSetup.phaseConfig.avatarUrl || getEnemyPortraitUrl(exorcismSetup.phaseConfig.dataKey),
        true,
      );
      if (!snapshotOk) {
        enemy.value.name = exorcismSetup.phaseConfig.displayName;
        enemy.value.avatarUrl =
          exorcismSetup.phaseConfig.avatarUrl || getEnemyPortraitUrl(exorcismSetup.phaseConfig.dataKey);
        enemy.value.stats.maxClimaxCount = exorcismSetup.phaseConfig.climaxLimit;
      }
      await loadEnemyRuntimeSkills(exorcismSetup.phaseConfig.skillPoolKey ?? exorcismSetup.phaseConfig.dataKey, data);
    }

    await persistCombatConfig(exorcismSetup.phaseConfig.dataKey, exorcismSetup.phaseConfig.climaxLimit);
    console.info('[战斗界面] 驱魔Boss运行态已初始化:', {
      bossId: exorcismSetup.definition.id,
      displayName: enemy.value.name,
      dataName: exorcismSetup.phaseConfig.dataKey,
      skillPoolName: exorcismSetup.phaseConfig.skillPoolKey,
      skills: enemy.value.skills.length,
    });
    return;
  }

  const bossOrNormal = createBossRuntimeSetup({
    enemyName: normalizedName,
    data,
    defaultClimaxLimit: maxClimaxCount,
    resolveEnemyName,
    getEnemyPortraitUrl,
  });
  applyBossSetupActions(bossOrNormal.actions);
  _.set(data, '性斗系统.对手名称', bossOrNormal.dataName);
  _.set(data, '性斗系统.胜负规则.高潮次数上限', bossOrNormal.climaxLimit);
  setSharedClimaxLimit(bossOrNormal.climaxLimit);

  if (BossSystem.bossState.bossId === 'yamadaHanako') {
    const initialPhase = BossSystem.bossState.currentPhase === 2 ? 2 : 1;
    const phaseConfig = getYamadaHanakoPhaseConfig(initialPhase);
    const loaded = await loadAndApplyBossPhaseRuntime(phaseConfig, {
      updateAvatar: true,
      skillLogLabel: '[战斗界面] 山田花子阶段技能池:',
    });

    if (loaded) {
      console.info('[战斗界面] 山田花子特殊战运行态已初始化:', {
        displayName: enemy.value.name,
        dataName: phaseConfig.dataKey,
        skillPoolName: phaseConfig.skillPoolKey,
        skills: enemy.value.skills.length,
      });
      return;
    }
  }

  const snapshotOk = applyEnemySnapshotToRuntime(data, bossOrNormal.displayName, bossOrNormal.avatarUrl, true);
  if (!snapshotOk) {
    console.warn(`[战斗界面] 未找到对手数据库数据，使用默认运行态: ${bossOrNormal.displayName}`);
    enemy.value.name = bossOrNormal.displayName;
    enemy.value.avatarUrl = bossOrNormal.avatarUrl;
    enemy.value.stats.maxClimaxCount = bossOrNormal.climaxLimit;
  }

  const resolvedDataName =
    getEnemySnapshot(data, enemyRuntimeStatuses.value)?.name || resolveEnemyName(bossOrNormal.dataName);
  await loadEnemyRuntimeSkills(bossOrNormal.skillPoolName ?? resolvedDataName, data);

  await persistCombatConfig(bossOrNormal.dataName, bossOrNormal.climaxLimit);

  console.info('[战斗界面] 对手运行态已初始化:', {
    displayName: enemy.value.name,
    dataName: bossOrNormal.dataName,
    skills: enemy.value.skills.length,
  });
}

async function loadFromMvu() {
  try {
    const combatData = await readNormalizedCombatStatData();
    if (!combatData) return;

    const data = combatData.statData;
    currentCombatStatData = data;

    const userName = getUserName();

    // 获取统一的高潮次数上限 (双方共享) - 至少为1
    const maxClimaxCount = combatData.maxClimaxCount;

    const playerSnapshot = getPlayerSnapshot(data, userName);
    player.value.name = playerSnapshot.name;
    player.value.stats.maxEndurance = playerSnapshot.resources.maxStamina;
    player.value.stats.currentEndurance = playerSnapshot.resources.stamina;
    player.value.stats.maxPleasure = playerSnapshot.resources.maxPleasure;
    player.value.stats.currentPleasure = playerSnapshot.resources.pleasure;
    player.value.stats.level = playerSnapshot.level;
    player.value.stats.charm = playerSnapshot.stats.charm;
    player.value.stats.luck = playerSnapshot.stats.luck;
    player.value.stats.evasion = playerSnapshot.stats.evasion;
    player.value.stats.crit = playerSnapshot.stats.crit;
    player.value.stats.sexPower = playerSnapshot.stats.sexPower;
    player.value.stats.baseEndurance = playerSnapshot.stats.endurance;
    player.value.stats.climaxCount = playerSnapshot.resources.climax;
    player.value.stats.maxClimaxCount = maxClimaxCount;

    // 加载玩家天赋 - 从技能系统.$天赋读取
    const talents = _.get(data, '技能系统.$天赋', {});
    const talentIds = Object.keys(talents);
    if (talentIds.length > 0) {
      const talentId = talentIds[0]; // 只取第一个天赋
      const talentData = getTalentById(talentId);
      if (talentData) {
        playerTalent.value = talentData;
        playerTalentState.value = TalentSystem.createDefaultTalentState();

        // 属性加成由 shared/statSelectors 从 MVU 状态实时计算，这里只保留运行时天赋状态。
      } else {
        // 如果数据库中没有，尝试从MVU数据读取
        const mvuTalent = talents[talentId];
        if (mvuTalent) {
          playerTalent.value = {
            id: talentId,
            name: mvuTalent.天赋名称 || '未知天赋',
            description: mvuTalent.天赋描述 || '',
            rarity: 'C',
            bonus: mvuTalent.天赋效果 || {},
            effects: [],
          };
        }
      }
    } else {
      playerTalent.value = null;
    }

    // 加载玩家技能 - 从技能系统.主动技能读取
    const availableSkills = _.get(data, '技能系统.主动技能', {});
    const skillIds = Object.keys(availableSkills);
    if (skillIds.length > 0) {
      const { getSkillById } = await import('./skillDatabase');
      const { DamageSource } = await import('./types');
      const nextSkillEffectDetails: Record<string, SkillEffectTooltipItem[]> = {};

      player.value.skills = skillIds
        .map(skillId => {
          const skillData = getSkillById(skillId);
          if (!skillData) {
            // 如果数据库中没有，尝试从MVU数据中读取技能信息
            const mvuSkill = availableSkills[skillId];
            if (mvuSkill && mvuSkill.基本信息) {
              // 从MVU数据生成效果描述
              let effectDesc = '';
              const damageInfo = mvuSkill.伤害与效果 || {};
              const tooltipItems = buildSkillEffectTooltipItems(damageInfo.效果列表);
              if (tooltipItems.length > 0) {
                nextSkillEffectDetails[skillId] = tooltipItems;
              }
              if (damageInfo) {
                const sourceName = damageInfo.伤害来源 || '性斗力';
                const coefficient = damageInfo.系数 || 100;
                effectDesc = `造成${coefficient}%${sourceName}伤害`;

                // 添加效果列表信息
                if (damageInfo.效果列表 && Object.keys(damageInfo.效果列表).length > 0) {
                  const effects = Object.values(damageInfo.效果列表).map((eff: any) => {
                    const value = eff.是否为百分比 ? `${eff.效果值}%` : eff.效果值;
                    return `${eff.效果类型}+${value}`;
                  });
                  effectDesc += `，${effects.join('、')}`;
                }
              }

              // 根据伤害来源和系数构建伤害公式
              const damageSource = damageInfo.伤害来源 || '性斗力';
              const coefficient = (damageInfo.系数 || 100) / 100; // 转换为小数（100% = 1.0）

              // 映射伤害来源到DamageSource枚举（使用字符串值，因为DamageSource是字符串枚举）
              let source: any;
              switch (damageSource) {
                case '性斗力':
                  source = 'sex_power'; // DamageSource.SEX_POWER
                  break;
                case '魅力':
                  source = 'charm'; // DamageSource.CHARM
                  break;
                case '幸运':
                  source = 'luck'; // DamageSource.LUCK
                  break;
                case '固定值':
                  source = 'fixed'; // DamageSource.FIXED
                  break;
                case '目标快感':
                  source = 'target_pleasure'; // DamageSource.TARGET_PLEASURE
                  break;
                default:
                  source = 'sex_power';
              }

              // 构建伤害公式组件
              const damageFormula = [
                {
                  source: source,
                  coefficient: coefficient,
                  baseValue: 0,
                },
              ];

              // 创建基本的SkillData对象（读取连击数、准确率、暴击修正）
              const rawRarity = mvuSkill.基本信息?.稀有度;
              const rarity =
                rawRarity === 'C' || rawRarity === 'B' || rawRarity === 'A' || rawRarity === 'S' || rawRarity === 'SS'
                  ? rawRarity
                  : 'C';
              const basicSkillData = {
                id: skillId,
                name: mvuSkill.基本信息.技能名称 || skillId,
                description: mvuSkill.基本信息.技能描述 || '',
                effectDescription: effectDesc,
                rarity,
                level: mvuSkill.基本信息?.技能等级 || 1,
                type: 'attack' as any,
                staminaCost: mvuSkill.冷却与消耗?.耐力消耗 || 0,
                cooldown: mvuSkill.冷却与消耗?.冷却回合数 || 0,
                castTime: 0,
                damageFormula: damageFormula,
                powerCoeff: damageInfo.系数 || 100,
                damageSource: source,
                accuracy: mvuSkill.伤害与效果?.基础命中率 || 100,
                critModifier: mvuSkill.伤害与效果?.暴击修正 || 0,
                buffs: [],
                canBeReflected: false,
                hitCount: mvuSkill.伤害与效果?.连击数 || 1,
                accuracyModifier: mvuSkill.伤害与效果?.准确率 || 100,
              };

              return {
                id: skillId,
                name: mvuSkill.基本信息.技能名称 || skillId,
                description: mvuSkill.基本信息.技能描述 || '',
                cost: mvuSkill.冷却与消耗?.耐力消耗 || 0,
                type: 'attack' as any,
                cooldown: mvuSkill.冷却与消耗?.冷却回合数 || 0,
                currentCooldown: 0,
                data: basicSkillData,
              };
            }
            return null;
          }

          // 获取技能当前冷却 - 注意：Schema中没有明确的玩家技能冷却字段
          // 技能冷却在战斗中管理，不需要从MVU读取（每次战斗开始时冷却为0）
          const currentCooldown = 0;

          const mvuSkill = availableSkills[skillId];
          const mvuBasicInfo = mvuSkill?.基本信息;
          const rawRarity = mvuBasicInfo?.稀有度;
          const mergedRarity =
            rawRarity === 'C' || rawRarity === 'B' || rawRarity === 'A' || rawRarity === 'S' || rawRarity === 'SS'
              ? rawRarity
              : skillData.rarity || 'C';
          const mergedLevel = mvuBasicInfo?.技能等级 || skillData.level || 1;
          const mvuDamageInfo = mvuSkill?.伤害与效果;
          let mergedDamageSource: any =
            skillData.damageSource || (skillData.damageFormula?.[0]?.source as any) || 'sex_power';
          let mergedPowerCoeff: number =
            skillData.powerCoeff !== undefined
              ? (skillData.powerCoeff as number)
              : skillData.damageFormula?.length === 1
                ? Math.round((skillData.damageFormula[0].coefficient || 1) * 100)
                : 100;
          let mergedDamageFormula = skillData.damageFormula;
          let mergedAccuracy = skillData.accuracy;
          let mergedCritModifier = skillData.critModifier;
          let mergedHitCount = skillData.hitCount;
          let mergedAccuracyModifier = skillData.accuracyModifier;
          let mergedEffectDescription = skillData.effectDescription;

          const tooltipItemsFromMvu = buildSkillEffectTooltipItems(mvuDamageInfo?.效果列表);
          const tooltipItems =
            tooltipItemsFromMvu.length > 0 ? tooltipItemsFromMvu : buildLegacyBuffTooltipItems(skillData.buffs);
          if (tooltipItems.length > 0) {
            nextSkillEffectDetails[skillId] = tooltipItems;
          }

          if (mvuDamageInfo) {
            const damageSourceName = mvuDamageInfo.伤害来源 || '性斗力';
            const coefficient = (mvuDamageInfo.系数 || 100) / 100;
            let source: any;
            switch (damageSourceName) {
              case '性斗力':
                source = 'sex_power';
                break;
              case '魅力':
                source = 'charm';
                break;
              case '幸运':
                source = 'luck';
                break;
              case '固定值':
                source = 'fixed';
                break;
              case '目标快感':
                source = 'target_pleasure';
                break;
              default:
                source = 'sex_power';
            }
            mergedDamageSource = source;
            mergedPowerCoeff = mvuDamageInfo.系数 || 100;
            mergedDamageFormula = [
              {
                source,
                coefficient,
                baseValue: 0,
              },
            ];
            mergedAccuracy = mvuDamageInfo.基础命中率 || mergedAccuracy;
            mergedCritModifier = mvuDamageInfo.暴击修正 || mergedCritModifier;
            mergedHitCount = mvuDamageInfo.连击数 || mergedHitCount;
            mergedAccuracyModifier = mvuDamageInfo.准确率 || mergedAccuracyModifier;
          }

          if (mvuBasicInfo?.技能描述) {
            mergedEffectDescription = mvuBasicInfo.技能描述;
          }

          const mergedSkillData = {
            ...skillData,
            rarity: mergedRarity,
            level: mergedLevel,
            damageSource: mergedDamageSource,
            powerCoeff: mergedPowerCoeff,
            damageFormula: mergedDamageFormula,
            accuracy: mergedAccuracy,
            critModifier: mergedCritModifier,
            hitCount: mergedHitCount,
            accuracyModifier: mergedAccuracyModifier,
            effectDescription: mergedEffectDescription,
          };

          return {
            id: skillData.id,
            name: skillData.name,
            description: mvuBasicInfo?.技能描述 || skillData.description,
            cost: mvuSkill?.冷却与消耗?.耐力消耗 || skillData.staminaCost,
            type: skillData.type,
            cooldown: mvuSkill?.冷却与消耗?.冷却回合数 ?? skillData.cooldown,
            currentCooldown,
            data: mergedSkillData,
          };
        })
        .filter(skill => skill !== null) as any;

      playerSkillEffectDetails.value = nextSkillEffectDetails;

      if (player.value.skills.length === 0) {
        const message = '读取到技能系统.主动技能，但没有任何技能能转换为战斗技能，请检查技能结构。';
        console.warn(`[战斗界面] ${message}`, { skillIds });
        if (!hasLoggedMissingPlayerSkills) {
          addLog(message, 'system', 'critical');
          hasLoggedMissingPlayerSkills = true;
        }
      } else {
        hasLoggedMissingPlayerSkills = false;
        console.info(
          '[战斗界面] 已加载玩家技能:',
          player.value.skills.map((s: any) => s.name),
        );
      }
    } else {
      player.value.skills = [];
      playerSkillEffectDetails.value = {};
      const message =
        '未读取到玩家技能系统：技能系统.主动技能为空或不存在，请检查变量写入。尝试删除性斗楼层并重新点击性斗按钮。';
      console.warn(`[战斗界面] ${message}`);
      if (!hasLoggedMissingPlayerSkills) {
        addLog(message, 'system', 'critical');
        hasLoggedMissingPlayerSkills = true;
      }
    }

    const nextEquipmentSkills = getEquipmentSkillsFromEquippedSlots(data);
    equippedEquipmentSkills.value = nextEquipmentSkills;
    resetEquipmentSkillBattleState(nextEquipmentSkills);
    console.info(
      '[战斗界面] 已加载装备技:',
      nextEquipmentSkills.map(skill => `${skill.equipmentName}:${skill.name}`),
    );

    // 获取对手名称
    const enemyName = _.get(data, '性斗系统.对手名称', '');
    console.info('[战斗界面] 对手名称:', enemyName);

    await loadEnemyRuntimeData(data, maxClimaxCount);

    // 加载玩家物品 - 从物品系统.背包读取"战斗用品"为true的消耗品
    const backpack = _.get(data, '物品系统.背包', {});
    // 从背包中筛选出战斗用品（类型为"消耗品"且战斗用品为true）
    const combatUsableItems: Item[] = [];
    Object.entries(backpack).forEach(([itemId, itemData]: [string, any]) => {
      // 检查是否为消耗品且战斗用品为true
      if (itemData?.类型 === '消耗品' && itemData?.战斗用品 === true) {
        // 获取数量
        const quantity = itemData?.数量 || 0;
        if (quantity > 0) {
          // 物品名严格使用背包 key(itemId)，对齐独立变量结构。
          // 物品描述仅用于显示/说明，不能反向推断为物品名
          const itemName = itemId;

          // 调试日志
          if (itemData?.加成属性) {
            console.info(`[战斗界面] 加载临时buff物品: ${itemId}`, itemData.加成属性);
          }

          // 创建Item对象
          // 使用itemId作为名称（因为背包的key就是物品名称）
          const item: Item = {
            id: itemId,
            name: itemName, // 显示用名称（优先使用描述里提取的名称）
            description: itemData?.描述 || '战斗用品',
            quantity: quantity,
            staminaRestore: itemData?.耐力增加,
            pleasureReduce: itemData?.快感降低,
            pleasureIncrease: itemData?.快感增加,
            bonuses: itemData?.加成属性, // 添加加成属性
            combatEffects: itemData?.战斗效果列表 || itemData?.效果列表,
            effect: (user, _target) => {
              // 根据物品属性应用效果
              let message = `${user.name} 使用了 ${itemId}`;

              // 恢复耐力
              if (itemData?.耐力增加) {
                const oldEndurance = user.stats.currentEndurance;
                user.stats.currentEndurance = Math.min(
                  user.stats.maxEndurance,
                  user.stats.currentEndurance + itemData.耐力增加,
                );
                const actualHeal = user.stats.currentEndurance - oldEndurance;
                if (actualHeal > 0) {
                  message += `，恢复了 ${actualHeal} 点耐力`;
                }
              }

              // 降低快感
              if (itemData?.快感降低) {
                const delta = Number(itemData.快感降低) || 0;
                const oldPleasure = user.stats.currentPleasure;
                const nextPleasure = Math.min(user.stats.maxPleasure, Math.max(0, user.stats.currentPleasure - delta));
                user.stats.currentPleasure = nextPleasure;
                const actualChange = user.stats.currentPleasure - oldPleasure;
                if (actualChange > 0) {
                  message += `，快感增加了 ${actualChange} 点`;
                } else if (actualChange < 0) {
                  message += `，快感降低了 ${-actualChange} 点`;
                }
              }

              // 增加快感
              if (itemData?.快感增加) {
                const oldPleasure = user.stats.currentPleasure;
                user.stats.currentPleasure = Math.min(
                  user.stats.maxPleasure,
                  user.stats.currentPleasure + itemData.快感增加,
                );
                const actualIncrease = user.stats.currentPleasure - oldPleasure;
                if (actualIncrease > 0) {
                  message += `，快感增加了 ${actualIncrease} 点`;
                }
              }

              // 临时buff：写入MVU的临时状态
              if (itemData?.加成属性 && Object.keys(itemData.加成属性).length > 0) {
                // 这里只记录消息，实际写入MVU在handlePlayerItem中处理
                const buffDesc = itemData.描述?.match(/持续(\d+)回合/);
                const duration = buffDesc ? parseInt(buffDesc[1]) : 3;
                message += `，获得临时增益（持续${duration}回合）`;
              }

              return {
                id: Math.random().toString(36).substr(2, 9),
                turn: turnState.currentTurn,
                message: message + '。',
                source: 'player',
                type: 'heal' as const,
              };
            },
          };
          combatUsableItems.push(item);
        }
      }
    });

    // 如果有战斗用品，替换玩家物品列表；否则清空物品列表
    if (combatUsableItems.length > 0) {
      player.value.items = combatUsableItems;
      console.info(
        '[战斗界面] 已加载战斗用品:',
        combatUsableItems.map(i => `${i.name} x${i.quantity}`),
      );
    } else {
      // 如果没有战斗用品，清空物品列表（不显示默认物品）
      player.value.items = [];
      console.info('[战斗界面] 未找到战斗用品，物品列表已清空');
    }
    // 物品逻辑结束

    // 解析临时状态列表为 UI 状态
    const statusList = _.get(data, '临时状态.状态列表', {});
    console.info('[战斗界面] Raw Status List:', statusList);
    player.value.statusEffects = statusListToEffects(statusList);

    // 读取允许认输设置（注意：true时不可认输，false时允许认输）
    const surrenderAllowed = _.get(data, '性斗系统.胜负规则.允许认输', true);
    allowSurrender.value = !surrenderAllowed; // 反转逻辑：true时不可认输，false时允许认输

    // 回合数是本次战斗运行态；刷新后重新进入战斗。
    turnState.currentTurn = 1;

    console.info('[战斗界面] 已从MVU加载数据');
  } catch (e) {
    console.warn('[战斗界面] MVU加载失败，使用默认数据', e);
  }
}

// 对手数据现在由 loadEnemyRuntimeData 从数据库读入，并保存在本次战斗运行态中。

let saveToMvuQueue: Promise<void> = Promise.resolve();

async function saveToMvu() {
  const saveTask = saveToMvuQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        await persistPlayerCombatState({
          items: player.value.items,
          stamina: player.value.stats.currentEndurance,
          pleasure: player.value.stats.currentPleasure,
          enemyName: enemy.value.name,
          maxClimaxCount: player.value.stats.maxClimaxCount,
        });
      } catch (e) {
        console.warn('[战斗界面] MVU保存失败', e);
      }
    });

  saveToMvuQueue = saveTask;
  await saveTask;
}

// 终局态保护：异步回调返回时不能把胜负结算改回行动阶段。
function isBattleFinished(): boolean {
  return turnState.phase === 'victory' || turnState.phase === 'defeat' || turnState.phase === 'gameOver';
}

function isBattleFlowLocked(): boolean {
  return isBattleFinished() || turnState.climaxTarget !== null;
}

// ================= 辅助函数 =================

type CombatSide = 'player' | 'enemy';
type SpecialSkillEffectType = '敏感' | '乏力' | '迷离' | '集中' | '反弹' | '吸取快感';

const PLAYER_STATUS_LIST_PATH = '临时状态.状态列表';
const PLAYER_STAMINA_PATH = '核心状态.$耐力';
const PLAYER_PLEASURE_PATH = '核心状态.$快感';

function formatEffectAmount(value: number, isPercentage: boolean, options: { signed?: boolean } = {}): string {
  const signed = options.signed ?? true;
  const sign = signed && value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value)}${isPercentage ? '%' : ''}`;
}

function formatFlatOrPercentAmount(value: number, isPercentage: boolean): string {
  return `${Math.abs(value)}${isPercentage ? '%' : '点'}`;
}

function formatDuration(duration: number): string {
  return `${duration}回合`;
}

function getSkillEffectTargetName(targetEnemy: boolean): string {
  return targetEnemy ? '目标' : '自身';
}

function getSkillEffectTone(_targetEnemy: boolean, effectValue: number): SkillEffectTooltipItem['tone'] {
  return effectValue >= 0 ? 'buff' : 'debuff';
}

function describeResourceEffect(
  resourceName: string,
  value: number,
  isPercentage: boolean,
  targetName: string,
  duration?: number,
): string {
  const verb = value >= 0 ? '增加' : '降低';
  const amount = isPercentage ? `最大${resourceName}的 ${Math.abs(value)}%` : `${Math.abs(value)}点`;
  const prefix = duration
    ? `每回合使${targetName}${resourceName}${verb}${amount}`
    : `立即使${targetName}${resourceName}${verb}${amount}`;
  return duration ? `${prefix}，持续${formatDuration(duration)}。` : `${prefix}。`;
}

function describeSpecialSkillEffect(
  effect: Extract<ResolvedSkillEffect, { kind: 'specialStatus' }>,
): SkillEffectTooltipItem {
  const targetName = getSkillEffectTargetName(effect.targetEnemy);
  const percent = Math.abs(effect.effectValue);
  const duration = formatDuration(effect.duration);

  switch (effect.effectType as SpecialSkillEffectType) {
    case '敏感':
      return {
        label: `敏感 ${formatEffectAmount(effect.effectValue, true)}`,
        description: `${targetName}受到的快感伤害提高${percent}%，持续${duration}。`,
        tone: 'special',
      };
    case '乏力':
      return {
        label: `乏力 ${percent}%`,
        description: `${targetName}行动前有${percent}%概率无法行动，持续${duration}。`,
        tone: 'control',
      };
    case '迷离':
      return {
        label: `迷离 ${percent}%`,
        description: `${targetName}行动时有${percent}%概率敌我误判，使本次技能作用到自己身上或空转，持续${duration}。`,
        tone: 'control',
      };
    case '集中':
      return {
        label: '集中',
        description: `${targetName}下一次有效攻击必定暴击，触发后消耗，最多持续${duration}。`,
        tone: 'special',
      };
    case '反弹':
      return {
        label: `反弹 ${percent}%`,
        description: `${targetName}受到快感伤害时，将伤害的${percent}%作为快感反弹给攻击者，持续${duration}。`,
        tone: 'special',
      };
    case '吸取快感':
      return {
        label: `吸取快感 ${percent}%`,
        description: `${targetName}造成快感伤害后，按伤害的${percent}%降低自身快感，持续${duration}。`,
        tone: 'special',
      };
    default:
      return {
        label: `${effect.effectType} ${formatEffectAmount(effect.effectValue, effect.isPercentage)}`,
        description: `${targetName}获得${effect.effectType}效果，持续${duration}。`,
        tone: 'special',
      };
  }
}

function describeSkillEffect(effectData: unknown): SkillEffectTooltipItem | null {
  const resolvedEffect = resolveSkillEffect(effectData);
  if (resolvedEffect.kind === 'skip') {
    return null;
  }

  if (resolvedEffect.kind === 'bind') {
    return {
      label: `束缚 ${formatDuration(resolvedEffect.duration)}`,
      description: `${getSkillEffectTargetName(resolvedEffect.targetEnemy)}无法行动，持续${formatDuration(resolvedEffect.duration)}。`,
      tone: 'control',
    };
  }

  const targetName = getSkillEffectTargetName(resolvedEffect.targetEnemy);
  if (resolvedEffect.kind === 'resource') {
    const resourceName = resolvedEffect.resource === 'pleasure' ? '快感' : '耐力';
    return {
      label: `${resourceName} ${formatEffectAmount(resolvedEffect.effectValue, resolvedEffect.isPercentage)}`,
      description: describeResourceEffect(
        resourceName,
        resolvedEffect.effectValue,
        resolvedEffect.isPercentage,
        targetName,
      ),
      tone: 'resource',
    };
  }

  if (resolvedEffect.kind === 'resourceOverTime') {
    const resourceName = resolvedEffect.resource === 'pleasure' ? '快感' : '耐力';
    return {
      label: `持续${resourceName} ${formatEffectAmount(resolvedEffect.effectValue, resolvedEffect.isPercentage)}`,
      description: describeResourceEffect(
        resourceName,
        resolvedEffect.effectValue,
        resolvedEffect.isPercentage,
        targetName,
        resolvedEffect.duration,
      ),
      tone: 'resource',
    };
  }

  if (resolvedEffect.kind === 'specialStatus') {
    return describeSpecialSkillEffect(resolvedEffect);
  }

  const effectName = getEffectTypeName(resolvedEffect.effectType);
  const verb = resolvedEffect.effectValue >= 0 ? '提高' : '降低';
  return {
    label: `${effectName} ${formatEffectAmount(resolvedEffect.effectValue, resolvedEffect.isPercentage)}`,
    description: `${targetName}${effectName}${verb}${formatFlatOrPercentAmount(
      resolvedEffect.effectValue,
      resolvedEffect.isPercentage,
    )}，持续${formatDuration(resolvedEffect.duration)}。`,
    tone: getSkillEffectTone(resolvedEffect.targetEnemy, resolvedEffect.effectValue),
  };
}

function buildSkillEffectTooltipItems(effectList: Record<string, any> | undefined | null): SkillEffectTooltipItem[] {
  return Object.values(effectList || {})
    .map(effectData => describeSkillEffect(effectData))
    .filter((item): item is SkillEffectTooltipItem => item !== null);
}

function describeLegacyBuffEffect(buff: SkillData['buffs'][number]): SkillEffectTooltipItem | null {
  const valueText = formatEffectAmount(buff.value, buff.isPercent);
  const duration = formatDuration(buff.duration);

  switch (String(buff.type)) {
    case 'atk_up':
      return {
        label: `性斗力 ${valueText}`,
        description: `自身性斗力提高${formatFlatOrPercentAmount(buff.value, buff.isPercent)}，持续${duration}。`,
        tone: 'buff',
      };
    case 'def_up':
      return {
        label: `忍耐力 ${valueText}`,
        description: `自身忍耐力提高${formatFlatOrPercentAmount(buff.value, buff.isPercent)}，持续${duration}。`,
        tone: 'buff',
      };
    case 'atk_down':
      return {
        label: `性斗力 ${valueText}`,
        description: `目标性斗力降低${formatFlatOrPercentAmount(buff.value, buff.isPercent)}，持续${duration}。`,
        tone: 'debuff',
      };
    case 'def_down':
      return {
        label: `忍耐力 ${valueText}`,
        description: `目标忍耐力降低${formatFlatOrPercentAmount(buff.value, buff.isPercent)}，持续${duration}。`,
        tone: 'debuff',
      };
    case 'dodge_up':
      return {
        label: `闪避率 ${valueText}`,
        description: `自身闪避率提高${formatFlatOrPercentAmount(buff.value, buff.isPercent)}，持续${duration}。`,
        tone: 'buff',
      };
    case 'dodge_down':
      return {
        label: `闪避率 ${valueText}`,
        description: `目标闪避率降低${formatFlatOrPercentAmount(buff.value, buff.isPercent)}，持续${duration}。`,
        tone: 'debuff',
      };
    case 'crit_up':
      return {
        label: `暴击率 ${valueText}`,
        description: `自身暴击率提高${formatFlatOrPercentAmount(buff.value, buff.isPercent)}，持续${duration}。`,
        tone: 'buff',
      };
    case 'crit_down':
      return {
        label: `暴击率 ${valueText}`,
        description: `目标暴击率降低${formatFlatOrPercentAmount(buff.value, buff.isPercent)}，持续${duration}。`,
        tone: 'debuff',
      };
    case 'luck_down':
      return {
        label: `幸运 ${valueText}`,
        description: `目标幸运降低${formatFlatOrPercentAmount(buff.value, buff.isPercent)}，持续${duration}。`,
        tone: 'debuff',
      };
    case 'charm_down':
      return {
        label: `魅力 ${valueText}`,
        description: `目标魅力降低${formatFlatOrPercentAmount(buff.value, buff.isPercent)}，持续${duration}。`,
        tone: 'debuff',
      };
    case 'sensitive':
      return {
        label: `敏感 ${valueText}`,
        description: `目标受到的快感伤害提高${formatFlatOrPercentAmount(buff.value, true)}，持续${duration}。`,
        tone: 'special',
      };
    case 'fear':
      return {
        label: `乏力 ${valueText}`,
        description: `目标行动前有${Math.abs(buff.value)}%概率无法行动，持续${duration}。`,
        tone: 'control',
      };
    case 'confuse':
      return {
        label: `迷离 ${valueText}`,
        description: `目标行动时有${Math.abs(buff.value)}%概率敌我误判，使本次技能作用到自己身上或空转，持续${duration}。`,
        tone: 'control',
      };
    case 'focus':
      return {
        label: '集中',
        description: `自身下一次有效攻击必定暴击，触发后消耗，最多持续${duration}。`,
        tone: 'special',
      };
    case 'bind':
      return { label: `束缚 ${duration}`, description: `目标无法行动，持续${duration}。`, tone: 'control' };
    case 'dot_lust':
      return {
        label: `持续快感 ${valueText}`,
        description: `每回合使目标快感增加${formatFlatOrPercentAmount(buff.value, buff.isPercent)}，持续${duration}。`,
        tone: 'resource',
      };
    case 'regen':
      return {
        label: `持续耐力 ${valueText}`,
        description: `每回合使自身耐力恢复${formatFlatOrPercentAmount(buff.value, buff.isPercent)}，持续${duration}。`,
        tone: 'resource',
      };
    default:
      return null;
  }
}

function buildLegacyBuffTooltipItems(buffs: SkillData['buffs'] | undefined): SkillEffectTooltipItem[] {
  return (buffs || [])
    .map(buff => describeLegacyBuffEffect(buff))
    .filter((item): item is SkillEffectTooltipItem => item !== null);
}

function getSkillEffectTooltipItems(skill: Skill): SkillEffectTooltipItem[] {
  const mvuEffects = playerSkillEffectDetails.value[skill.id];
  if (mvuEffects && mvuEffects.length > 0) {
    return mvuEffects;
  }
  return buildLegacyBuffTooltipItems(skill.data?.buffs);
}

function getItemEffectTooltipItems(item: Item): SkillEffectTooltipItem[] {
  const effects = buildSkillEffectTooltipItems(item.combatEffects);
  const bonusLabels: Record<string, { label: string; isPercentage: boolean }> = {
    基础性斗力加成: { label: '性斗力', isPercentage: false },
    基础性斗力成算: { label: '性斗力', isPercentage: true },
    基础忍耐力加成: { label: '忍耐力', isPercentage: false },
    基础忍耐力成算: { label: '忍耐力', isPercentage: true },
    魅力加成: { label: '魅力', isPercentage: false },
    幸运加成: { label: '幸运', isPercentage: false },
    闪避率加成: { label: '闪避率', isPercentage: false },
    暴击率加成: { label: '暴击率', isPercentage: false },
  };

  Object.entries(item.bonuses || {}).forEach(([bonusName, rawValue]) => {
    const value = Number(rawValue) || 0;
    const bonus = bonusLabels[bonusName];
    if (!bonus || value === 0) return;

    const duration = getItemTemporaryBuffDuration(item);
    effects.push({
      label: `${bonus.label} ${formatEffectAmount(value, bonus.isPercentage)}`,
      description: `自身${bonus.label}${value > 0 ? '提高' : '降低'}${formatFlatOrPercentAmount(
        value,
        bonus.isPercentage,
      )}，持续${formatDuration(duration)}。`,
      tone: value > 0 ? 'buff' : 'debuff',
    });
  });

  if (item.staminaRestore) {
    effects.unshift({
      label: `耐力 +${item.staminaRestore}`,
      description: `立即恢复自身${item.staminaRestore}点耐力。`,
      tone: 'resource',
    });
  }
  if (item.pleasureReduce) {
    effects.unshift({
      label: `快感 -${item.pleasureReduce}`,
      description: `立即降低自身${item.pleasureReduce}点快感。`,
      tone: 'resource',
    });
  }
  if (item.pleasureIncrease) {
    effects.unshift({
      label: `快感 +${item.pleasureIncrease}`,
      description: `立即增加自身${item.pleasureIncrease}点快感。`,
      tone: 'resource',
    });
  }

  return effects;
}

function clampTooltipPosition(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getSkillEffectTooltipPlacement(event?: Event): Omit<SkillEffectTooltipState, 'skillId' | 'effects'> {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 360;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 640;
  const target = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  const rect = target?.getBoundingClientRect();
  const baseWidth = rect ? rect.width + 44 : 260;
  const width = Math.min(Math.max(baseWidth, 240), Math.max(220, viewportWidth - 24), 330);
  const anchorLeft = rect ? rect.left + rect.width / 2 - width / 2 : viewportWidth / 2 - width / 2;
  const top = rect ? rect.top : viewportHeight - 160;

  return {
    left: clampTooltipPosition(anchorLeft, 12, Math.max(12, viewportWidth - width - 12)),
    top: clampTooltipPosition(top, 76, Math.max(76, viewportHeight - 12)),
    width,
    maxHeight: Math.max(56, Math.min(220, top - 24)),
  };
}

function showSkillEffectTooltip(skill: Skill, event?: Event, placement = getSkillEffectTooltipPlacement(event)) {
  const effects = getSkillEffectTooltipItems(skill);
  if (effects.length === 0) {
    skillEffectTooltip.value = null;
    return;
  }

  skillEffectTooltip.value = {
    skillId: skill.id,
    effects,
    ...placement,
  };
}

function showItemEffectTooltip(item: Item, event?: Event, placement = getSkillEffectTooltipPlacement(event)) {
  const effects = getItemEffectTooltipItems(item);
  if (effects.length === 0) {
    skillEffectTooltip.value = null;
    return;
  }

  skillEffectTooltip.value = {
    skillId: `item_${item.id}`,
    title: `${item.name} · 效果说明`,
    effects,
    ...placement,
  };
}

function hideSkillEffectTooltip(skillId?: string) {
  if (!skillId || skillEffectTooltip.value?.skillId === skillId) {
    skillEffectTooltip.value = null;
  }
}

function cancelSkillEffectLongPress() {
  if (skillEffectLongPressTimer) {
    clearTimeout(skillEffectLongPressTimer);
    skillEffectLongPressTimer = null;
  }
}

function startSkillEffectLongPress(skill: Skill, event?: Event) {
  cancelSkillEffectLongPress();
  if (getSkillEffectTooltipItems(skill).length === 0) {
    return;
  }

  const placement = getSkillEffectTooltipPlacement(event);
  skillEffectLongPressTimer = setTimeout(() => {
    showSkillEffectTooltip(skill, undefined, placement);
    skillEffectLongPressTimer = null;
    skillEffectClickGuardId = skill.id;
    if (skillEffectClickGuardTimer) {
      clearTimeout(skillEffectClickGuardTimer);
    }
    skillEffectClickGuardTimer = setTimeout(() => {
      if (skillEffectClickGuardId === skill.id) {
        skillEffectClickGuardId = null;
      }
      skillEffectClickGuardTimer = null;
    }, 1600);
  }, 450);
}

function startItemEffectLongPress(item: Item, event?: Event) {
  cancelSkillEffectLongPress();
  if (getItemEffectTooltipItems(item).length === 0) {
    return;
  }

  const sourceId = `item_${item.id}`;
  const placement = getSkillEffectTooltipPlacement(event);
  skillEffectLongPressTimer = setTimeout(() => {
    showItemEffectTooltip(item, undefined, placement);
    skillEffectLongPressTimer = null;
    skillEffectClickGuardId = sourceId;
    if (skillEffectClickGuardTimer) {
      clearTimeout(skillEffectClickGuardTimer);
    }
    skillEffectClickGuardTimer = setTimeout(() => {
      if (skillEffectClickGuardId === sourceId) {
        skillEffectClickGuardId = null;
      }
      skillEffectClickGuardTimer = null;
    }, 1600);
  }, 450);
}

function finishSkillEffectTouch() {
  cancelSkillEffectLongPress();
}

function shouldIgnoreSkillClickFromLongPress(skill: Skill): boolean {
  if (skillEffectClickGuardId !== skill.id) {
    return false;
  }

  skillEffectClickGuardId = null;
  if (skillEffectClickGuardTimer) {
    clearTimeout(skillEffectClickGuardTimer);
    skillEffectClickGuardTimer = null;
  }
  return true;
}

function shouldIgnoreItemClickFromLongPress(item: Item): boolean {
  const sourceId = `item_${item.id}`;
  if (skillEffectClickGuardId !== sourceId) {
    return false;
  }

  skillEffectClickGuardId = null;
  if (skillEffectClickGuardTimer) {
    clearTimeout(skillEffectClickGuardTimer);
    skillEffectClickGuardTimer = null;
  }
  return true;
}

function getCombatantBySide(side: CombatSide): Character {
  return side === 'player' ? player.value : enemy.value;
}

function resolveEffectTargetSide(
  effect: Extract<ResolvedSkillEffect, { kind: 'status' | 'resource' | 'resourceOverTime' | 'specialStatus' | 'bind' }>,
  isPlayerSkill: boolean,
): CombatSide {
  const targetIsPlayer = isPlayerSkill ? !effect.targetEnemy : effect.targetEnemy;
  return targetIsPlayer ? 'player' : 'enemy';
}

function clampResourceValue(value: number, maxValue: number): number {
  return Math.max(0, Math.min(maxValue, Math.floor(value)));
}

function calculateResourceDelta(
  actor: Character,
  resource: 'pleasure' | 'endurance',
  effectValue: number,
  isPercentage: boolean,
): number {
  if (!isPercentage) {
    return Math.trunc(effectValue);
  }

  const maxValue = resource === 'pleasure' ? actor.stats.maxPleasure : actor.stats.maxEndurance;
  return Math.trunc((maxValue * effectValue) / 100);
}

function applyResourceChangeInStatData(
  statData: Record<string, any>,
  targetSide: CombatSide,
  resource: 'pleasure' | 'endurance',
  effectValue: number,
  isPercentage: boolean,
): number {
  const actor = getCombatantBySide(targetSide);
  const currentValue = resource === 'pleasure' ? actor.stats.currentPleasure : actor.stats.currentEndurance;
  const maxValue = resource === 'pleasure' ? actor.stats.maxPleasure : actor.stats.maxEndurance;
  const delta = calculateResourceDelta(actor, resource, effectValue, isPercentage);
  const nextValue = clampResourceValue(currentValue + delta, maxValue);
  const actualChange = nextValue - currentValue;

  if (resource === 'pleasure') {
    actor.stats.currentPleasure = nextValue;
  } else {
    actor.stats.currentEndurance = nextValue;
  }

  if (targetSide === 'player') {
    _.set(statData, resource === 'pleasure' ? PLAYER_PLEASURE_PATH : PLAYER_STAMINA_PATH, nextValue);
  }

  return actualChange;
}

function applyResourceDeltaToCharacter(actor: Character, resource: 'pleasure' | 'endurance', delta: number): number {
  if (!Number.isFinite(delta) || delta === 0) {
    return 0;
  }

  const currentValue = resource === 'pleasure' ? actor.stats.currentPleasure : actor.stats.currentEndurance;
  const maxValue = resource === 'pleasure' ? actor.stats.maxPleasure : actor.stats.maxEndurance;
  const nextValue = clampResourceValue(currentValue + delta, maxValue);
  const actualChange = nextValue - currentValue;

  if (resource === 'pleasure') {
    actor.stats.currentPleasure = nextValue;
  } else {
    actor.stats.currentEndurance = nextValue;
  }

  return actualChange;
}

async function applyResourceDeltaToSide(
  targetSide: CombatSide,
  resource: 'pleasure' | 'endurance',
  delta: number,
): Promise<number> {
  if (!Number.isFinite(delta) || delta === 0) {
    return 0;
  }

  const actor = getCombatantBySide(targetSide);
  const actualChange = applyResourceDeltaToCharacter(actor, resource, delta);
  if (targetSide === 'player' && actualChange !== 0) {
    if (resource === 'pleasure') {
      await syncPlayerPleasureToMvu(actor.stats.currentPleasure);
    } else {
      await syncPlayerStaminaToMvu(actor.stats.currentEndurance);
    }
  }

  return actualChange;
}

async function applyResourceDeltaToCombatant(
  targetSide: CombatSide,
  actor: Character | undefined,
  resource: 'pleasure' | 'endurance',
  delta: number,
): Promise<number> {
  if (actor) {
    return applyResourceDeltaToCharacter(actor, resource, delta);
  }

  return applyResourceDeltaToSide(targetSide, resource, delta);
}

function getStatusListForSideFromStatData(statData: Record<string, any>, side: CombatSide): Record<string, any> {
  return side === 'player'
    ? (_.get(statData, PLAYER_STATUS_LIST_PATH, {}) as Record<string, any>)
    : ({ ...(enemyRuntimeStatuses.value as Record<string, any>) } as Record<string, any>);
}

function setStatusListForSideInStatData(
  statData: Record<string, any>,
  side: CombatSide,
  statusList: Record<string, any>,
) {
  if (side === 'player') {
    _.set(statData, PLAYER_STATUS_LIST_PATH, statusList);
    player.value.statusEffects = statusListToEffects(statusList);
  } else {
    enemyRuntimeStatuses.value = statusList;
    enemy.value.statusEffects = statusListToEffects(enemyRuntimeStatuses.value, 'enemy_');
  }
}

async function readStatusListForSide(side: CombatSide): Promise<Record<string, any>> {
  return side === 'player'
    ? await readPlayerTemporaryStatusList()
    : ({ ...(enemyRuntimeStatuses.value as Record<string, any>) } as Record<string, any>);
}

async function setStatusListForSide(side: CombatSide, statusList: Record<string, any>): Promise<void> {
  if (side === 'player') {
    await setPlayerTemporaryStatusList(statusList);
    player.value.statusEffects = statusListToEffects(statusList);
  } else {
    enemyRuntimeStatuses.value = statusList;
    enemy.value.statusEffects = statusListToEffects(enemyRuntimeStatuses.value, 'enemy_');
  }
}

function getSpecialStatusEntries(
  statusList: Record<string, any>,
  effectType: SpecialSkillEffectType,
): Array<{ key: string; value: number; isPercentage: boolean }> {
  const entries: Array<{ key: string; value: number; isPercentage: boolean }> = [];

  Object.entries(statusList || {}).forEach(([key, entry]) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const remainingTurns = Math.max(0, Number((entry as TimedStatusEffect).剩余回合) || 0);
    const special = (entry as TimedStatusEffect).特殊效果;
    if (remainingTurns <= 0 || !special || normalizeSkillEffectType(special.类型 || '') !== effectType) {
      return;
    }

    entries.push({
      key,
      value: Number(special.效果值) || 0,
      isPercentage: Boolean(special.是否为百分比),
    });
  });

  return entries;
}

async function getSpecialStatusValue(side: CombatSide, effectType: SpecialSkillEffectType): Promise<number> {
  const statusList = await readStatusListForSide(side);
  return getSpecialStatusEntries(statusList, effectType).reduce((sum, entry) => sum + entry.value, 0);
}

async function hasSpecialStatus(side: CombatSide, effectType: SpecialSkillEffectType): Promise<boolean> {
  const statusList = await readStatusListForSide(side);
  return getSpecialStatusEntries(statusList, effectType).length > 0;
}

async function removeSpecialStatuses(side: CombatSide, effectType: SpecialSkillEffectType): Promise<number> {
  const statusList = await readStatusListForSide(side);
  const entries = getSpecialStatusEntries(statusList, effectType);
  if (entries.length === 0) {
    return 0;
  }

  entries.forEach(entry => {
    delete statusList[entry.key];
  });
  await setStatusListForSide(side, statusList);
  return entries.length;
}

async function rollSpecialStatusTrigger(side: CombatSide, effectType: SpecialSkillEffectType): Promise<boolean> {
  const statusList = await readStatusListForSide(side);
  const entries = getSpecialStatusEntries(statusList, effectType);
  const chance =
    entries.length > 0 ? Math.max(0, Math.min(100, Math.max(...entries.map(entry => Number(entry.value) || 0)))) : 0;

  return chance > 0 && Math.random() * 100 < chance;
}

async function tryInterruptActionBySpecialStatus(side: CombatSide): Promise<string | null> {
  const actorName = getCombatantBySide(side).name;
  if (await rollSpecialStatusTrigger(side, '乏力')) {
    return `${actorName} 被乏力压制，没能行动！`;
  }

  return null;
}

async function tryConfuseActionBySpecialStatus(side: CombatSide): Promise<string | null> {
  const actorName = getCombatantBySide(side).name;
  if (await rollSpecialStatusTrigger(side, '迷离')) {
    return `${actorName} 陷入迷离，敌我误判！`;
  }

  return null;
}

function getSensitiveDamageMultiplier(sensitiveValue: number): number {
  return Math.max(0, 1 + sensitiveValue / 100);
}

function buildSensitiveDamageLog(targetName: string, sensitiveValue: number): string | null {
  if (sensitiveValue === 0) {
    return null;
  }

  const direction = sensitiveValue > 0 ? '提高' : '降低';
  return `${targetName} 的敏感状态使受到的快感伤害${direction}${Math.abs(sensitiveValue)}%`;
}

interface EquipmentSkillLog {
  message: string;
  type: CombatLogEntry['type'];
}

function resetEquipmentSkillBattleState(skills: EquipmentSkillDefinition[]) {
  equipmentSkillUses.value = Object.fromEntries(skills.map(skill => [skill.id, 0]));
  equipmentSkillCooldowns.value = {};
  equipmentSkillSharedCooldowns.value = {};
}

function getEquipmentSkillRemainingUses(skill: EquipmentSkillDefinition): number {
  const used = Math.max(0, Number(equipmentSkillUses.value[skill.id]) || 0);
  return Math.max(0, skill.usesPerBattle - used);
}

function getEquipmentSkillCooldown(skill: EquipmentSkillDefinition): number {
  const ownCooldown = Math.max(0, Number(equipmentSkillCooldowns.value[skill.id]) || 0);
  const sharedCooldown = skill.sharedCooldownGroup
    ? Math.max(0, Number(equipmentSkillSharedCooldowns.value[skill.sharedCooldownGroup]) || 0)
    : 0;
  return Math.max(ownCooldown, sharedCooldown);
}

function isEquipmentSkillDisabled(skill: EquipmentSkillDefinition): boolean {
  return (
    turnState.phase !== 'playerInput' ||
    getEquipmentSkillRemainingUses(skill) <= 0 ||
    getEquipmentSkillCooldown(skill) > 0
  );
}

function markEquipmentSkillUsed(skill: EquipmentSkillDefinition) {
  equipmentSkillUses.value = {
    ...equipmentSkillUses.value,
    [skill.id]: Math.max(0, Number(equipmentSkillUses.value[skill.id]) || 0) + 1,
  };

  if (skill.cooldown > 0) {
    equipmentSkillCooldowns.value = {
      ...equipmentSkillCooldowns.value,
      [skill.id]: skill.cooldown,
    };
  }

  if (skill.sharedCooldownGroup && skill.sharedCooldown && skill.sharedCooldown > 0) {
    equipmentSkillSharedCooldowns.value = {
      ...equipmentSkillSharedCooldowns.value,
      [skill.sharedCooldownGroup]: skill.sharedCooldown,
    };
  }
}

function decrementEquipmentSkillCooldowns() {
  const nextCooldowns: Record<string, number> = {};
  Object.entries(equipmentSkillCooldowns.value).forEach(([skillId, cooldown]) => {
    const next = Math.max(0, Number(cooldown) || 0) - 1;
    if (next > 0) {
      nextCooldowns[skillId] = next;
    }
  });
  equipmentSkillCooldowns.value = nextCooldowns;

  const nextSharedCooldowns: Record<string, number> = {};
  Object.entries(equipmentSkillSharedCooldowns.value).forEach(([groupId, cooldown]) => {
    const next = Math.max(0, Number(cooldown) || 0) - 1;
    if (next > 0) {
      nextSharedCooldowns[groupId] = next;
    }
  });
  equipmentSkillSharedCooldowns.value = nextSharedCooldowns;
}

function getStatusRemainingTurns(entry: unknown): number {
  if (typeof entry === 'number') {
    return Math.max(0, Number(entry) || 0);
  }
  if (!entry || typeof entry !== 'object') {
    return 0;
  }
  return Math.max(0, Number((entry as TimedStatusEffect).剩余回合) || 0);
}

function getStatusBonus(entry: unknown): Record<string, number> {
  if (!entry || typeof entry !== 'object') {
    return {};
  }
  const bonus = (entry as TimedStatusEffect).加成;
  return bonus && typeof bonus === 'object' ? (bonus as Record<string, number>) : {};
}

function getStatusResourceChange(entry: unknown): TimedStatusEffect['资源变化'] | undefined {
  if (!entry || typeof entry !== 'object') {
    return undefined;
  }
  return (entry as TimedStatusEffect).资源变化;
}

function getStatusSpecialEffect(entry: unknown): TimedStatusEffect['特殊效果'] | undefined {
  if (!entry || typeof entry !== 'object') {
    return undefined;
  }
  return (entry as TimedStatusEffect).特殊效果;
}

function isNegativeSpecialEffect(special: TimedStatusEffect['特殊效果']): boolean {
  if (!special?.类型) {
    return false;
  }
  const type = normalizeSkillEffectType(special.类型);
  const value = Number(special.效果值) || 0;
  if (type === '敏感') {
    return value > 0;
  }
  return ['乏力', '迷离'].includes(type) && value > 0;
}

function isPositiveSpecialEffect(special: TimedStatusEffect['特殊效果']): boolean {
  if (!special?.类型) {
    return false;
  }
  const type = normalizeSkillEffectType(special.类型);
  const value = Number(special.效果值) || 0;
  if (type === '敏感') {
    return value < 0;
  }
  return ['集中', '反弹', '吸取快感'].includes(type) && value > 0;
}

function isNegativeStatusEntry(entry: unknown): boolean {
  if (getStatusRemainingTurns(entry) <= 0) {
    return false;
  }

  const bonuses = Object.values(getStatusBonus(entry)).map(value => Number(value) || 0);
  if (bonuses.some(value => value < 0)) {
    return true;
  }

  const resourceChange = getStatusResourceChange(entry);
  if (resourceChange) {
    const pleasure = Number(resourceChange.快感) || 0;
    const endurance = Number(resourceChange.耐力) || 0;
    if (pleasure > 0 || endurance < 0) {
      return true;
    }
  }

  return isNegativeSpecialEffect(getStatusSpecialEffect(entry));
}

function isPositiveStatusEntry(entry: unknown): boolean {
  if (getStatusRemainingTurns(entry) <= 0 || isNegativeStatusEntry(entry)) {
    return false;
  }

  const bonuses = Object.values(getStatusBonus(entry)).map(value => Number(value) || 0);
  if (bonuses.some(value => value > 0)) {
    return true;
  }

  const resourceChange = getStatusResourceChange(entry);
  if (resourceChange) {
    const pleasure = Number(resourceChange.快感) || 0;
    const endurance = Number(resourceChange.耐力) || 0;
    if (pleasure < 0 || endurance > 0) {
      return true;
    }
  }

  return isPositiveSpecialEffect(getStatusSpecialEffect(entry));
}

async function applyEnemyEquipmentStatus(statusName: string, effect: TimedStatusEffect) {
  setEnemyRuntimeStatus(statusName, effect);
  await updateEnemyRealtimeStats();
}

async function applyPlayerEquipmentStatus(statusName: string, effect: TimedStatusEffect) {
  await addPlayerTemporaryStatus(statusName, effect);
  await reloadStatusFromMvu();
}

async function changePlayerPleasure(delta: number): Promise<{ before: number; after: number; actual: number }> {
  const before = player.value.stats.currentPleasure;
  const after = Math.max(0, Math.min(player.value.stats.maxPleasure, before + delta));
  player.value.stats.currentPleasure = after;
  await syncPlayerPleasureToMvu(after);
  return { before, after, actual: after - before };
}

async function changePlayerEndurance(delta: number): Promise<{ before: number; after: number; actual: number }> {
  const before = player.value.stats.currentEndurance;
  const after = Math.max(0, Math.min(player.value.stats.maxEndurance, before + delta));
  player.value.stats.currentEndurance = after;
  await syncPlayerStaminaToMvu(after);
  return { before, after, actual: after - before };
}

async function applyEnemyBindFromEquipment(duration: number, skillName: string): Promise<EquipmentSkillLog[]> {
  const logs: EquipmentSkillLog[] = [];
  if (BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'muxinlan') {
    const immuneDialogue = BossSystem.getBindImmuneDialogue(BossSystem.bossState.currentPhase);
    if (immuneDialogue) {
      BossSystem.queueDialogues([immuneDialogue]);
    }
    logs.push({ message: `${enemy.value.name} 免疫了${skillName}的束缚效果！`, type: 'debuff' });
    return logs;
  }

  let finalDuration = Math.max(1, duration);
  if (enemySensoryNumb.value > 0) {
    finalDuration = 1;
    enemySensoryNumb.value = 0;
    logs.push({ message: `【感官麻木】${enemy.value.name} 的束缚持续时间被减少为1回合！`, type: 'info' });
  }

  finalDuration = Math.min(finalDuration, MAX_BIND_DURATION);
  enemyBoundTurns.value = Math.max(enemyBoundTurns.value, finalDuration);
  enemyBindSource.value = 'player';
  logs.push({ message: `${enemy.value.name} 被${skillName}束缚了 ${finalDuration} 回合。`, type: 'debuff' });
  return logs;
}

async function clearPlayerDebuffsForEquipment(): Promise<EquipmentSkillLog[]> {
  const statusList = await readPlayerTemporaryStatusList();
  const nextStatusList: Record<string, any> = {};
  const removedNames: string[] = [];

  Object.entries(statusList).forEach(([name, entry]) => {
    if (isNegativeStatusEntry(entry)) {
      removedNames.push(name);
      return;
    }
    nextStatusList[name] = entry;
  });

  await setPlayerTemporaryStatusList(nextStatusList);
  player.value.statusEffects = statusListToEffects(nextStatusList);

  const wasBound = playerBoundTurns.value > 0;
  if (wasBound) {
    playerBoundTurns.value = 0;
    playerBindSource.value = null;
  }

  await reloadStatusFromMvu();
  const count = removedNames.length + (wasBound ? 1 : 0);
  return [
    {
      message: count > 0 ? `净心清除了自身 ${count} 个负面状态。` : '净心发动，但自身没有可清除的负面状态。',
      type: count > 0 ? 'buff' : 'info',
    },
  ];
}

async function removeEnemyPositiveStatuses(limit: number): Promise<string[]> {
  const statusList = { ...(enemyRuntimeStatuses.value as Record<string, any>) };
  const removed: string[] = [];

  for (const [name, entry] of Object.entries(statusList)) {
    if (removed.length >= limit) {
      break;
    }
    if (!isPositiveStatusEntry(entry)) {
      continue;
    }
    delete statusList[name];
    removed.push(name);
  }

  if (removed.length > 0) {
    enemyRuntimeStatuses.value = statusList;
    enemy.value.statusEffects = statusListToEffects(statusList, 'enemy_');
    await updateEnemyRealtimeStats();
  }

  return removed;
}

async function extendPositiveStatuses(side: CombatSide): Promise<number> {
  const statusList = await readStatusListForSide(side);
  let count = 0;

  Object.entries(statusList).forEach(([name, entry]) => {
    if (!isPositiveStatusEntry(entry) || !entry || typeof entry !== 'object') {
      return;
    }

    statusList[name] = {
      ...(entry as TimedStatusEffect),
      剩余回合: getStatusRemainingTurns(entry) + 1,
    };
    count++;
  });

  await setStatusListForSide(side, statusList);
  if (side === 'enemy') {
    await updateEnemyRealtimeStats();
  } else {
    await reloadStatusFromMvu();
  }

  return count;
}

async function applyEquipmentSkillEffect(skill: EquippedEquipmentSkill): Promise<EquipmentSkillLog[]> {
  const logs: EquipmentSkillLog[] = [
    { message: `${player.value.name} 发动装备技【${skill.name}】。`, type: skill.grade === 'EX' ? 'critical' : 'buff' },
  ];

  switch (skill.id) {
    case 'equipment_immobilizing_disc_bind': {
      const duration = enemy.value.stats.evasion > 60 ? 3 : 2;
      await applyEnemyEquipmentStatus('装备技_定身_闪避压制', {
        加成: { 闪避率加成: -45 },
        剩余回合: duration,
        描述: '定身：闪避率降低',
      });
      await applyEnemyEquipmentStatus('装备技_定身_敏感', {
        加成: {},
        剩余回合: duration,
        描述: '定身：敏感',
        特殊效果: { 类型: '敏感', 效果值: 25, 是否为百分比: true },
      });
      logs.push({
        message:
          duration > 2
            ? `${enemy.value.name} 当前闪避率高于60%，定身延长至 ${duration} 回合。`
            : `${enemy.value.name} 被定身压制，持续 ${duration} 回合。`,
        type: 'debuff',
      });
      break;
    }

    case 'equipment_god_binding_chain_break': {
      const targetHadHigherEndurance = enemy.value.stats.baseEndurance > player.value.stats.sexPower;
      await applyEnemyEquipmentStatus('装备技_破界_忍耐破坏', {
        加成: { 基础忍耐力成算: -35 },
        剩余回合: 2,
        描述: '破界：基础忍耐力成算降低',
      });
      logs.push(...(await applyEnemyBindFromEquipment(1, '破界')));
      if (targetHadHigherEndurance) {
        await applyEnemyEquipmentStatus('装备技_破界_敏感', {
          加成: {},
          剩余回合: 2,
          描述: '破界：敏感',
          特殊效果: { 类型: '敏感', 效果值: 30, 是否为百分比: true },
        });
        logs.push({
          message: `${enemy.value.name} 的基础忍耐力高于玩家基础性斗力，额外获得敏感+30%。`,
          type: 'debuff',
        });
      }
      break;
    }

    case 'equipment_white_rose_purify': {
      logs.push(...(await clearPlayerDebuffsForEquipment()));
      const reduce = Math.floor(player.value.stats.maxPleasure * 0.2);
      const change = await changePlayerPleasure(-reduce);
      logs.push({
        message: `${player.value.name} 的快感 ${change.before} → ${change.after}（-${Math.abs(change.actual)}）。`,
        type: 'heal',
      });
      break;
    }

    case 'equipment_crown_pride': {
      const removed = await removeEnemyPositiveStatuses(3);
      if (removed.length > 0) {
        await applyEnemyEquipmentStatus('七罪王冠_傲慢_忍耐裁落', {
          加成: { 基础忍耐力成算: -8 * removed.length },
          剩余回合: 2,
          描述: '傲慢裁定：被清除正面Buff后的忍耐削弱',
        });
        logs.push({ message: `傲慢裁定清除了${enemy.value.name} ${removed.length} 个正面Buff。`, type: 'debuff' });
      } else {
        logs.push({ message: `${enemy.value.name} 没有可被傲慢裁定清除的正面Buff。`, type: 'info' });
      }
      await applyPlayerEquipmentStatus('七罪王冠_傲慢_代价_闪避', {
        加成: { 闪避率加成: -15 },
        剩余回合: 3,
        描述: '傲慢裁定的代价',
      });
      logs.push({ message: '代价：自身闪避率-15，持续3回合。', type: 'debuff' });
      break;
    }

    case 'equipment_crown_envy': {
      const bonus: Record<string, number> = {};
      if (enemy.value.stats.sexPower > player.value.stats.sexPower) bonus.基础性斗力加成 = 50;
      if (enemy.value.stats.baseEndurance > player.value.stats.baseEndurance) bonus.基础忍耐力加成 = 50;
      if (enemy.value.stats.charm > player.value.stats.charm) bonus.魅力加成 = 40;
      if (enemy.value.stats.luck > player.value.stats.luck) bonus.幸运加成 = 40;

      if (Object.keys(bonus).length > 0) {
        await applyPlayerEquipmentStatus('七罪王冠_嫉妒_优势夺取', {
          加成: bonus,
          剩余回合: 2,
          描述: '嫉妒裁定：夺取目标高于自身的优势',
        });
        logs.push({ message: '嫉妒裁定夺取了目标高于自身的优势属性，持续2回合。', type: 'buff' });
      } else {
        logs.push({ message: '嫉妒裁定未发现目标高于自身的优势属性。', type: 'info' });
      }
      await applyPlayerEquipmentStatus('七罪王冠_嫉妒_代价_迷离', {
        加成: {},
        剩余回合: 1,
        描述: '嫉妒裁定的代价',
        特殊效果: { 类型: '迷离', 效果值: 50, 是否为百分比: true },
      });
      logs.push({ message: '代价：自身迷离+50%，持续1回合。', type: 'debuff' });
      break;
    }

    case 'equipment_crown_wrath': {
      await applyEnemyEquipmentStatus('七罪王冠_暴怒_性斗力压制', {
        加成: { 基础性斗力成算: -30 },
        剩余回合: 1,
        描述: '暴怒裁定：基础性斗力成算降低',
      });
      await applyEnemyEquipmentStatus('七罪王冠_暴怒_暴击压制', {
        加成: { 暴击率加成: -25 },
        剩余回合: 2,
        描述: '暴怒裁定：暴击率降低',
      });
      const increase = Math.floor(player.value.stats.maxPleasure * 0.2);
      const change = await changePlayerPleasure(increase);
      logs.push({ message: `${enemy.value.name} 被暴怒裁定压制进攻。`, type: 'debuff' });
      logs.push({
        message: `代价：自身快感 ${change.before} → ${change.after}（+${Math.abs(change.actual)}）。`,
        type: 'debuff',
      });
      break;
    }

    case 'equipment_crown_sloth': {
      logs.push(...(await applyEnemyBindFromEquipment(1, '怠惰裁定')));
      await applyEnemyEquipmentStatus('七罪王冠_怠惰_闪避迟滞', {
        加成: { 闪避率加成: -35 },
        剩余回合: 2,
        描述: '怠惰裁定：闪避率降低',
      });
      await applyPlayerEquipmentStatus('七罪王冠_怠惰_代价_性斗力', {
        加成: { 基础性斗力成算: -10 },
        剩余回合: 3,
        描述: '怠惰裁定的代价',
      });
      logs.push({ message: '代价：自身基础性斗力成算-10，持续3回合。', type: 'debuff' });
      break;
    }

    case 'equipment_crown_greed': {
      const selfCount = await extendPositiveStatuses('player');
      const enemyCount = await extendPositiveStatuses('enemy');
      logs.push({ message: `贪婪裁定延长自身 ${selfCount} 个正面Buff 1回合。`, type: selfCount > 0 ? 'buff' : 'info' });
      logs.push({
        message: `代价：对方 ${enemyCount} 个正面Buff 也被延长1回合。`,
        type: enemyCount > 0 ? 'debuff' : 'info',
      });
      break;
    }

    case 'equipment_crown_gluttony': {
      const enduranceGain = Math.ceil(player.value.stats.maxEndurance * 0.25);
      const pleasureReduce = Math.floor(player.value.stats.maxPleasure * 0.15);
      const enduranceChange = await changePlayerEndurance(enduranceGain);
      const pleasureChange = await changePlayerPleasure(-pleasureReduce);
      await applyPlayerEquipmentStatus('七罪王冠_暴食_代价_闪避', {
        加成: { 闪避率加成: -25 },
        剩余回合: 2,
        描述: '暴食裁定的代价',
      });
      logs.push({
        message: `暴食裁定恢复耐力 ${enduranceChange.before} → ${enduranceChange.after}，快感 ${pleasureChange.before} → ${pleasureChange.after}。`,
        type: 'heal',
      });
      logs.push({ message: '代价：自身闪避率-25，持续2回合。', type: 'debuff' });
      break;
    }

    case 'equipment_crown_lust': {
      await applyEnemyEquipmentStatus('七罪王冠_色欲_敏感', {
        加成: {},
        剩余回合: 2,
        描述: '色欲裁定：敏感',
        特殊效果: { 类型: '敏感', 效果值: 40, 是否为百分比: true },
      });
      await applyEnemyEquipmentStatus('七罪王冠_色欲_忍耐瓦解', {
        加成: { 基础忍耐力成算: -20 },
        剩余回合: 2,
        描述: '色欲裁定：基础忍耐力成算降低',
      });
      await applyPlayerEquipmentStatus('七罪王冠_色欲_代价_敏感', {
        加成: {},
        剩余回合: 2,
        描述: '色欲裁定的代价',
        特殊效果: { 类型: '敏感', 效果值: 40, 是否为百分比: true },
      });
      logs.push({ message: `${enemy.value.name} 获得敏感+40%并被削弱忍耐。`, type: 'debuff' });
      logs.push({ message: '代价：自身也获得敏感+40%，持续2回合。', type: 'debuff' });
      break;
    }
  }

  return logs;
}

async function handleEquipmentSkill(skill: EquippedEquipmentSkill) {
  if (turnState.phase !== 'playerInput') {
    return;
  }

  if (getEquipmentSkillRemainingUses(skill) <= 0) {
    addLog(`【${skill.name}】本场战斗已使用完毕。`, 'system', 'info');
    return;
  }

  const cooldown = getEquipmentSkillCooldown(skill);
  if (cooldown > 0) {
    addLog(`【${skill.name}】仍在冷却中（${cooldown}回合）。`, 'system', 'info');
    return;
  }

  try {
    triggerEquipmentSkillVisual(skill);
    const skillLogs = await applyEquipmentSkillEffect(skill);
    markEquipmentSkillUsed(skill);
    skillLogs.forEach(log => addLog(log.message, 'system', log.type));
    await saveToMvu();
    await reloadStatusFromMvu();

    if (await triggerPendingClimaxFromResourceChange('装备技')) {
      return;
    }

    activeMenu.value = 'main';
  } catch (error) {
    console.error('[战斗界面] 装备技发动失败', error);
    addLog(`【${skill.name}】发动失败。`, 'system', 'critical');
  }
}

async function applyPostDamageSpecialEffects(params: {
  attackerSide: CombatSide;
  targetSide: CombatSide;
  damage: number;
  attacker?: Character;
  target?: Character;
}): Promise<string[]> {
  const logs: string[] = [];
  if (params.damage <= 0) {
    return logs;
  }

  const attacker = params.attacker || getCombatantBySide(params.attackerSide);
  const target = params.target || getCombatantBySide(params.targetSide);
  const reflectPercent = Math.max(0, await getSpecialStatusValue(params.targetSide, '反弹'));
  if (reflectPercent > 0) {
    const reflected = Math.floor((params.damage * reflectPercent) / 100);
    const actualChange = await applyResourceDeltaToCombatant(
      params.attackerSide,
      params.attacker,
      'pleasure',
      reflected,
    );
    if (actualChange > 0) {
      logs.push(`${target.name} 的反弹使 ${attacker.name} 增加了 ${actualChange} 点快感`);
    }
  }

  const drainPercent = Math.max(0, await getSpecialStatusValue(params.attackerSide, '吸取快感'));
  if (drainPercent > 0) {
    const drained = Math.floor((params.damage * drainPercent) / 100);
    const actualChange = await applyResourceDeltaToCombatant(
      params.attackerSide,
      params.attacker,
      'pleasure',
      -drained,
    );
    if (actualChange < 0) {
      logs.push(`${attacker.name} 吸取快感，降低了 ${Math.abs(actualChange)} 点自身快感`);
    }
  }

  return logs;
}

async function applyTimedResourceChanges(side: CombatSide, statusList: Record<string, any>): Promise<string[]> {
  const logs: string[] = [];
  const actor = getCombatantBySide(side);

  for (const [statusName, statusData] of Object.entries(statusList || {})) {
    if (!statusData || typeof statusData !== 'object') {
      continue;
    }

    const remainingTurns = Math.max(0, Number((statusData as TimedStatusEffect).剩余回合) || 0);
    const resourceChange = (statusData as TimedStatusEffect).资源变化;
    if (remainingTurns <= 0 || !resourceChange) {
      continue;
    }

    const changes: Array<{
      resource: 'pleasure' | 'endurance';
      label: string;
      value: number;
    }> = [
      { resource: 'pleasure', label: '快感', value: Number(resourceChange.快感) || 0 },
      { resource: 'endurance', label: '耐力', value: Number(resourceChange.耐力) || 0 },
    ];

    for (const change of changes) {
      if (change.value === 0) {
        continue;
      }

      const delta = calculateResourceDelta(actor, change.resource, change.value, Boolean(resourceChange.是否为百分比));
      const actualChange = await applyResourceDeltaToSide(side, change.resource, delta);
      if (actualChange !== 0) {
        const verb = actualChange > 0 ? '增加' : '降低';
        logs.push(`${actor.name} 受到 ${statusName} 影响，${change.label}${verb}了 ${Math.abs(actualChange)} 点`);
      }
    }
  }

  return logs;
}

async function triggerPendingClimaxFromResourceChange(reason?: string): Promise<boolean> {
  if (turnState.climaxTarget !== null) {
    return true;
  }

  if (enemy.value.stats.currentPleasure >= enemy.value.stats.maxPleasure) {
    await triggerClimaxProcessing({ characterName: enemy.value.name, targetIsEnemy: true, reason });
    return true;
  }

  if (player.value.stats.currentPleasure >= player.value.stats.maxPleasure) {
    await triggerClimaxProcessing({ characterName: player.value.name, targetIsEnemy: false, reason });
    return true;
  }

  return false;
}

// ================= 完全重写的 Debuff 运算逻辑 =================
// 设计原则：
// 1. 技能命中时：只写入 MVU 状态列表，不修改任何属性值
// 2. 属性计算时：从状态列表动态计算总加成（在 reloadStatusFromMvu 中）
// 3. 回合结束时：只减少剩余回合数，移除过期状态
// 这样确保 debuff 效果只"生效"一次（通过动态计算），而不是重复叠加

/**
 * 将效果列表写入对应状态列表。
 * 玩家状态写入 MVU；对手状态只写入本次战斗运行态。
 * 只负责写入，不修改任何属性值。
 * 属性值的变化通过 reloadStatusFromMvu 中的动态计算实现
 */
function applyCombatEffectListToStatData(params: {
  statData: Record<string, any>;
  effectList: Record<string, any>;
  sourceId: string;
  isPlayerSkill: boolean;
  logs: string[];
}) {
  console.info(`[Debuff系统] 效果列表keys:`, Object.keys(params.effectList));
  for (const [effectName, effectData] of Object.entries(params.effectList)) {
    console.info(
      `[Debuff系统] 开始处理效果: ${effectName}, effectData类型=${typeof effectData}, effectData=`,
      effectData,
    );
    if (!effectData || typeof effectData !== 'object') {
      console.warn(`[Debuff系统] 跳过无效效果: ${effectName}`);
      continue;
    }

    const resolvedEffect = resolveSkillEffect(effectData);
    if (resolvedEffect.kind === 'skip') {
      if (resolvedEffect.reason) {
        console.warn(`[Debuff系统] ${resolvedEffect.reason}`);
      }
      continue;
    }

    console.info(
      `[Debuff系统] 处理效果: ${effectName}, 类型=${resolvedEffect.kind === 'bind' ? '束缚' : resolvedEffect.effectType}`,
    );

    // 特殊处理：束缚效果（不写入状态列表，直接设置束缚回合数）
    if (resolvedEffect.kind === 'bind') {
      console.info(
        `[束缚] 检测到束缚效果: duration=${resolvedEffect.duration}, targetEnemy=${resolvedEffect.targetEnemy}, isPlayerSkill=${params.isPlayerSkill}`,
      );
      const targetIsPlayer = params.isPlayerSkill ? !resolvedEffect.targetEnemy : resolvedEffect.targetEnemy;
      console.info(
        `[束缚] 束缚目标计算: targetIsPlayer=${targetIsPlayer}, isPlayerSkill=${params.isPlayerSkill}, targetEnemy=${resolvedEffect.targetEnemy}`,
      );
      if (targetIsPlayer) {
        let immuneToBind = false;
        if (playerTalent.value) {
          const talentContext = createTalentEffectContext();
          const debuffResult = TalentSystem.processTalentOnDebuffReceived(playerTalent.value, talentContext, 'bind');
          if (debuffResult.preventBind) {
            immuneToBind = true;
            params.logs.push(`【${playerTalent.value.name}】免疫了束缚效果！`);
            console.info(`[束缚] 天赋免疫束缚效果`);
          }
        }

        if (immuneToBind) {
          continue;
        }

        let finalDuration = resolvedEffect.duration;
        const sinTypeForBind = TalentSystem.getSinTalentType(playerTalent.value);
        if (sinTypeForBind === 'greed') {
          finalDuration += 2;
          params.logs.push(`【七宗罪·贪婪】被束缚时持续时间+2回合！`);
        }

        if (playerSensoryNumb.value > 0) {
          finalDuration = 1;
          playerSensoryNumb.value = 0;
          params.logs.push(`【感官麻木】${player.value.name} 的束缚持续时间被减少为1回合！`);
        }

        finalDuration = Math.min(finalDuration, MAX_BIND_DURATION);
        playerBoundTurns.value = finalDuration;
        playerBindSource.value = params.isPlayerSkill ? 'player' : 'enemy';
        params.logs.push(`${player.value.name} 被束缚了 ${finalDuration} 回合，无法行动！`);
        console.info(`[束缚] ★★★ 设置玩家束缚: playerBoundTurns=${playerBoundTurns.value}`);
      } else {
        if (BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'muxinlan') {
          const immuneDialogue = BossSystem.getBindImmuneDialogue(BossSystem.bossState.currentPhase);
          if (immuneDialogue) {
            BossSystem.queueDialogues([immuneDialogue]);
          }
          params.logs.push(`${enemy.value.name} 免疫了束缚效果！`);
          console.info(`[束缚] 沐芯兰BOSS免疫束缚`);
          continue;
        }

        let finalEnemyDuration = resolvedEffect.duration;
        if (enemySensoryNumb.value > 0) {
          finalEnemyDuration = 1;
          enemySensoryNumb.value = 0;
          params.logs.push(`【感官麻木】${enemy.value.name} 的束缚持续时间被减少为1回合！`);
        }

        finalEnemyDuration = Math.min(finalEnemyDuration, MAX_BIND_DURATION);
        enemyBoundTurns.value = finalEnemyDuration;
        enemyBindSource.value = params.isPlayerSkill ? 'player' : 'enemy';
        params.logs.push(`${enemy.value.name} 被束缚了 ${finalEnemyDuration} 回合，无法行动！`);
        console.info(
          `[束缚] ★★★ 设置敌人束缚: enemyBoundTurns=${enemyBoundTurns.value}, enemyBindSource=${enemyBindSource.value}`,
        );
      }
      continue;
    }

    const targetSide = resolveEffectTargetSide(resolvedEffect, params.isPlayerSkill);
    const targetName = getCombatantBySide(targetSide).name;

    if (resolvedEffect.kind === 'resource') {
      const actualChange = applyResourceChangeInStatData(
        params.statData,
        targetSide,
        resolvedEffect.resource,
        resolvedEffect.effectValue,
        resolvedEffect.isPercentage,
      );
      if (actualChange !== 0) {
        params.logs.push(buildResourceChangeLog(targetName, resolvedEffect, actualChange));
      }
      continue;
    }

    const statusKey = getSkillStatusKey(resolvedEffect.effectType, params.sourceId, effectName);
    const currentStatusList = getStatusListForSideFromStatData(params.statData, targetSide);

    let statusEffect: TimedStatusEffect;
    if (resolvedEffect.kind === 'status') {
      statusEffect = {
        加成: resolvedEffect.bonus,
        剩余回合: resolvedEffect.duration,
      };
    } else if (resolvedEffect.kind === 'resourceOverTime') {
      statusEffect = {
        加成: {},
        剩余回合: resolvedEffect.duration,
        描述: `${resolvedEffect.effectType} ${resolvedEffect.effectValue}${resolvedEffect.isPercentage ? '%' : ''}`,
        资源变化:
          resolvedEffect.resource === 'pleasure'
            ? { 快感: resolvedEffect.effectValue, 是否为百分比: resolvedEffect.isPercentage }
            : { 耐力: resolvedEffect.effectValue, 是否为百分比: resolvedEffect.isPercentage },
      };
    } else {
      statusEffect = {
        加成: {},
        剩余回合: resolvedEffect.duration,
        描述: `${resolvedEffect.effectType} ${resolvedEffect.effectValue}${resolvedEffect.isPercentage ? '%' : ''}`,
        特殊效果: {
          类型: resolvedEffect.effectType,
          效果值: resolvedEffect.effectValue,
          是否为百分比: resolvedEffect.isPercentage,
        },
      };
    }

    const result = upsertSkillStatus(currentStatusList, statusKey, statusEffect);
    params.logs.push(buildSkillStatusLog(targetName, resolvedEffect, result.refreshed));

    if (result.refreshed) {
      console.info(`[Debuff系统] 刷新已有状态: ${statusKey}`);
    } else {
      console.info(`[Debuff系统] 添加新状态: ${statusKey}`, result.statusList[statusKey]);
    }

    setStatusListForSideInStatData(params.statData, targetSide, result.statusList);
  }
}

async function applyCombatSkillEffects(skillId: string, isPlayerSkill: boolean): Promise<string[]> {
  const logs: string[] = [];
  console.info(`[Debuff系统] applyCombatSkillEffects被调用: skillId=${skillId}, isPlayerSkill=${isPlayerSkill}`);

  try {
    const statData = await updateCombatStatData(statData => {
      // 玩家技能效果来自 MVU；对手技能效果来自本次战斗的运行时技能表。
      const { skillPath, effectList } = readSkillEffectList(
        statData,
        enemyRuntimeSkillEffects.value,
        skillId,
        isPlayerSkill,
      );

      if (!effectList || Object.keys(effectList).length === 0) {
        return;
      }

      console.info(
        `[Debuff系统] 处理技能效果: ${skillId}, isPlayerSkill=${isPlayerSkill}, 路径=${skillPath}`,
        effectList,
      );

      applyCombatEffectListToStatData({ statData, effectList, sourceId: skillId, isPlayerSkill, logs });
    });

    if (!statData) {
      console.warn('[战斗界面] 无法获取MVU数据');
      return logs;
    }

    // 更新对手实时属性（运行态状态列表 -> 实时属性 -> UI）
    await updateEnemyRealtimeStats();
  } catch (e) {
    console.error('[Debuff系统] 应用效果失败', e);
    logs.push('应用技能效果失败');
  }

  return logs;
}

async function applyCombatItemEffects(item: Item): Promise<string[]> {
  const logs: string[] = [];
  const effectList = item.combatEffects || {};
  if (Object.keys(effectList).length === 0) {
    return logs;
  }

  try {
    const statData = await updateCombatStatData(statData => {
      console.info(`[Debuff系统] 处理道具效果: ${item.id}`, effectList);
      applyCombatEffectListToStatData({
        statData,
        effectList,
        sourceId: `item_${item.id}`,
        isPlayerSkill: true,
        logs,
      });
    });

    if (!statData) {
      console.warn('[战斗界面] 无法获取MVU数据');
      return logs;
    }

    await updateEnemyRealtimeStats();
    await reloadStatusFromMvu();
  } catch (e) {
    console.error('[Debuff系统] 应用道具效果失败', e);
    logs.push('应用道具效果失败');
  }

  return logs;
}

async function applyCompanionSkillEffects(skill: Skill): Promise<string[]> {
  const logs: string[] = [];
  if (!skill.data) return logs;

  const { enemySkillDbModule } = await loadDatabaseModules();
  const runtimeSkill = enemySkillDbModule.convertToMvuSkillFormat(skill.data);
  const effectList = (_.get(runtimeSkill, '伤害与效果.效果列表', {}) || {}) as Record<string, any>;
  if (Object.keys(effectList).length === 0) return logs;

  let enemyStatusChanged = false;

  for (const [effectName, effectData] of Object.entries(effectList)) {
    const resolvedEffect = resolveSkillEffect(effectData);
    if (resolvedEffect.kind === 'skip') continue;

    if (!resolvedEffect.targetEnemy) {
      continue;
    }

    if (resolvedEffect.kind === 'bind') {
      if (BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'muxinlan') {
        const immuneDialogue = BossSystem.getBindImmuneDialogue(BossSystem.bossState.currentPhase);
        if (immuneDialogue) {
          BossSystem.queueDialogues([immuneDialogue]);
        }
        logs.push(`${enemy.value.name} 免疫了协同束缚效果！`);
        continue;
      }

      let finalDuration = resolvedEffect.duration;
      if (enemySensoryNumb.value > 0) {
        finalDuration = 1;
        enemySensoryNumb.value = 0;
        logs.push(`【感官麻木】${enemy.value.name} 的束缚持续时间被减少为1回合！`);
      }

      finalDuration = Math.min(finalDuration, MAX_BIND_DURATION);
      enemyBoundTurns.value = finalDuration;
      enemyBindSource.value = 'player';
      logs.push(`${enemy.value.name} 被协同束缚了 ${finalDuration} 回合，无法行动！`);
      continue;
    }

    if (resolvedEffect.kind === 'resource') {
      const delta = calculateResourceDelta(
        enemy.value,
        resolvedEffect.resource,
        resolvedEffect.effectValue,
        resolvedEffect.isPercentage,
      );
      const actualChange = await applyResourceDeltaToSide('enemy', resolvedEffect.resource, delta);
      if (actualChange !== 0) {
        logs.push(buildResourceChangeLog(enemy.value.name, resolvedEffect, actualChange));
      }
      continue;
    }

    const statusKey = `协同_${getSkillStatusKey(resolvedEffect.effectType, skill.id, effectName)}`;
    const currentStatusList = { ...(enemyRuntimeStatuses.value as Record<string, any>) };
    let statusEffect: TimedStatusEffect;
    if (resolvedEffect.kind === 'status') {
      statusEffect = {
        加成: resolvedEffect.bonus,
        剩余回合: resolvedEffect.duration,
      };
    } else if (resolvedEffect.kind === 'resourceOverTime') {
      statusEffect = {
        加成: {},
        剩余回合: resolvedEffect.duration,
        描述: `${resolvedEffect.effectType} ${resolvedEffect.effectValue}${resolvedEffect.isPercentage ? '%' : ''}`,
        资源变化:
          resolvedEffect.resource === 'pleasure'
            ? { 快感: resolvedEffect.effectValue, 是否为百分比: resolvedEffect.isPercentage }
            : { 耐力: resolvedEffect.effectValue, 是否为百分比: resolvedEffect.isPercentage },
      };
    } else {
      statusEffect = {
        加成: {},
        剩余回合: resolvedEffect.duration,
        描述: `${resolvedEffect.effectType} ${resolvedEffect.effectValue}${resolvedEffect.isPercentage ? '%' : ''}`,
        特殊效果: {
          类型: resolvedEffect.effectType,
          效果值: resolvedEffect.effectValue,
          是否为百分比: resolvedEffect.isPercentage,
        },
      };
    }
    const result = upsertSkillStatus(currentStatusList, statusKey, statusEffect);

    enemyRuntimeStatuses.value = result.statusList;
    enemyStatusChanged = true;
    logs.push(buildSkillStatusLog(enemy.value.name, resolvedEffect, result.refreshed));
  }

  if (enemyStatusChanged) {
    await updateEnemyRealtimeStats();
  }

  return logs;
}

/**
 * 回合结束时更新状态效果
 * 只负责减少剩余回合数，移除过期状态
 * 不修改任何属性值
 */
async function tickCombatStatusEffects(): Promise<string[]> {
  const logs: string[] = [];

  try {
    // 处理玩家状态
    const playerStatusList = await readPlayerTemporaryStatusList();
    logs.push(...(await applyTimedResourceChanges('player', playerStatusList)));
    const updatedPlayerStatus = tickStatusList(playerStatusList);
    logs.push(...buildExpiredStatusLogs(player.value.name, updatedPlayerStatus.过期状态));
    updatedPlayerStatus.过期状态.forEach(statusKey => {
      console.info(`[Debuff系统] 玩家状态过期: ${statusKey}`);
    });
    await setPlayerTemporaryStatusList(updatedPlayerStatus.状态列表);

    // 处理对手状态（v2 中对手状态是战斗运行态，不写入 MVU）
    logs.push(...(await applyTimedResourceChanges('enemy', enemyRuntimeStatuses.value as Record<string, any>)));
    const updatedEnemyStatus = tickStatusList(enemyRuntimeStatuses.value);
    logs.push(...buildExpiredStatusLogs(enemy.value.name, updatedEnemyStatus.过期状态));
    updatedEnemyStatus.过期状态.forEach(statusKey => {
      console.info(`[Debuff系统] 对手状态过期: ${statusKey}`);
    });
    enemyRuntimeStatuses.value = updatedEnemyStatus.状态列表;

    // 状态变化后更新对手实时属性
    await updateEnemyRealtimeStats();
  } catch (e) {
    console.error('[Debuff系统] 更新状态失败', e);
  }

  return logs;
}

function loadSkillData(skill: any): void {
  if (!skill.data) skill.data = {};
  if (!skill.data.damageSource) {
    const source = skill.data.damageFormula?.[0]?.source;
    if (source) skill.data.damageSource = source;
  }
  if (!skill.data.powerCoeff) {
    const coef = skill.data.damageFormula?.[0]?.coefficient;
    if (coef) skill.data.powerCoeff = Math.round(coef * 100);
  }
}

/**
 * 更新对手实时属性到 UI
 * 流程：运行时状态列表 -> shared/statSelectors 实时计算属性 -> 同步 UI
 */
async function updateEnemyRealtimeStats(): Promise<void> {
  try {
    const updated = await readCombatStatData(data => {
      const previousResources = {
        endurance: enemy.value.stats.currentEndurance,
        pleasure: enemy.value.stats.currentPleasure,
        climax: enemy.value.stats.climaxCount,
      };

      if (!applyEnemySnapshotToRuntime(data, enemy.value.name, enemy.value.avatarUrl, false)) {
        enemy.value.statusEffects = statusListToEffects(enemyRuntimeStatuses.value, 'enemy_');
        return false;
      }

      enemy.value.stats.currentEndurance = Math.min(previousResources.endurance, enemy.value.stats.maxEndurance);
      enemy.value.stats.currentPleasure = Math.min(previousResources.pleasure, enemy.value.stats.maxPleasure);
      enemy.value.stats.climaxCount = previousResources.climax;
      return true;
    });

    if (!updated) {
      return;
    }

    console.info(
      `[Debuff系统] 对手运行态属性已更新 - 性斗力:${enemy.value.stats.sexPower}, 忍耐力:${enemy.value.stats.baseEndurance}`,
    );
  } catch (e) {
    console.error('[Debuff系统] 更新对手实时属性失败', e);
  }
}

/**
 * 重新读取 MVU 中的状态，更新 UI 显示
 * 玩家：从临时/永久/装备加成计算
 * 对手：调用 updateEnemyRealtimeStats 更新
 */
async function reloadStatusFromMvu() {
  if (isBattleFlowLocked()) {
    return;
  }

  try {
    await readCombatStatData(data => {
      // === 玩家属性计算 ===
      const playerStatusList = _.get(data, '临时状态.状态列表', {});
      player.value.statusEffects = statusListToEffects(playerStatusList);

      const refreshedPlayer = getPlayerSnapshot(data, getUserName());
      player.value.stats.maxEndurance = refreshedPlayer.resources.maxStamina;
      player.value.stats.currentEndurance = refreshedPlayer.resources.stamina;
      player.value.stats.maxPleasure = refreshedPlayer.resources.maxPleasure;
      player.value.stats.currentPleasure = refreshedPlayer.resources.pleasure;
      player.value.stats.level = refreshedPlayer.level;
      player.value.stats.charm = refreshedPlayer.stats.charm;
      player.value.stats.luck = refreshedPlayer.stats.luck;
      player.value.stats.evasion = refreshedPlayer.stats.evasion;
      player.value.stats.crit = refreshedPlayer.stats.crit;
      player.value.stats.sexPower = refreshedPlayer.stats.sexPower;
      player.value.stats.baseEndurance = refreshedPlayer.stats.endurance;
    });

    // === 对手属性计算（调用专用函数）===
    await updateEnemyRealtimeStats();
  } catch (e) {
    console.error('[战斗界面] 重新读取状态失败', e);
  }
}

// 触发战斗特效
function triggerEffect(type: 'critical' | 'dodge' | 'climax' | 'victory' | 'defeat') {
  effectType.value = type;
  showEffect.value = true;
  setTimeout(() => {
    showEffect.value = false;
    setTimeout(() => {
      effectType.value = null;
    }, 300);
  }, 1500);
}

function triggerCharacterReaction(side: CombatSide, type: CharacterCombatReaction['type'], label: string) {
  const reactionRef = side === 'player' ? playerCombatReaction : enemyCombatReaction;
  const existingTimer = combatReactionTimers[side];
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  reactionRef.value = null;
  requestAnimationFrame(() => {
    reactionRef.value = { key: Date.now() + Math.random(), type, label };
    combatReactionTimers[side] = setTimeout(() => {
      reactionRef.value = null;
      delete combatReactionTimers[side];
    }, 720);
  });
}

function getCombatItemTargetSides(item: Item): CombatSide[] {
  const sides = new Set<CombatSide>();
  Object.values(item.combatEffects || {}).forEach(effectData => {
    const resolvedEffect = resolveSkillEffect(effectData);
    if (resolvedEffect.kind !== 'skip') {
      sides.add(resolvedEffect.targetEnemy ? 'enemy' : 'player');
    }
  });

  if (item.staminaRestore || item.pleasureReduce || item.pleasureIncrease || item.bonuses) {
    sides.add('player');
  }
  return [...sides];
}

function triggerCombatItemVisual(item: Item) {
  triggerCharacterReaction('player', 'item-use', `使用 ${item.name}`);
  getCombatItemTargetSides(item).forEach(side => {
    if (side === 'enemy') {
      triggerCharacterReaction('enemy', 'item-hit', item.name);
    }
  });
}

function getEquipmentSkillVisualTone(skill: EquippedEquipmentSkill): EquipmentSkillVisualTone {
  if (skill.equipmentId === 'immobilizing_disc') return 'bind';
  if (skill.equipmentId === 'god_binding_chain') return 'chain';
  if (skill.equipmentId === 'white_rose_of_atonement') return 'rose';
  return 'crown';
}

function triggerEquipmentSkillVisual(skill: EquippedEquipmentSkill) {
  if (equipmentSkillVisualTimer) {
    clearTimeout(equipmentSkillVisualTimer);
  }

  equipmentSkillVisualEffect.value = {
    key: Date.now(),
    skillName: skill.name,
    equipmentName: skill.equipmentName,
    grade: skill.grade,
    tone: getEquipmentSkillVisualTone(skill),
  };

  equipmentSkillVisualTimer = setTimeout(() => {
    equipmentSkillVisualEffect.value = null;
    equipmentSkillVisualTimer = null;
  }, 1750);
}

function pushResourcePopup(
  target: ResourcePopupTarget,
  resource: ResourcePopupKind,
  delta: number,
  options: { allowSplit?: boolean; index?: number; total?: number } = {},
) {
  if (!Number.isFinite(delta) || delta === 0) {
    return;
  }

  if (options.allowSplit !== false && resource === 'pleasure' && Math.abs(delta) >= 2) {
    const splitCount = Math.min(4, Math.max(2, Math.ceil(Math.abs(delta) / 35)));
    const sign = delta > 0 ? 1 : -1;
    const base = Math.floor(Math.abs(delta) / splitCount);
    let remaining = Math.abs(delta);
    for (let index = 0; index < splitCount; index++) {
      const amount = index === splitCount - 1 ? remaining : base;
      remaining -= amount;
      pushResourcePopup(target, resource, amount * sign, { allowSplit: false, index, total: splitCount });
    }
    return;
  }

  const total = Math.max(1, options.total ?? 1);
  const index = Math.max(0, options.index ?? 0);
  const popup: ResourcePopup = {
    id: ++resourcePopupId,
    target,
    resource,
    delta,
    delay: index * 85,
    offset: total > 1 ? (index - (total - 1) / 2) * 22 : 0,
  };

  resourcePopups.value.push(popup);
  setTimeout(() => {
    resourcePopups.value = resourcePopups.value.filter(item => item.id !== popup.id);
  }, 1400 + popup.delay);
}

function suppressNextResourcePopup(target: ResourcePopupTarget, resource: ResourcePopupKind, delta: number) {
  if (!Number.isFinite(delta) || delta === 0) {
    return;
  }

  const suppression: ResourcePopupSuppression = { target, resource, delta };
  resourcePopupSuppressions.push(suppression);
  setTimeout(() => {
    const index = resourcePopupSuppressions.indexOf(suppression);
    if (index >= 0) {
      resourcePopupSuppressions.splice(index, 1);
    }
  }, 250);
}

function consumeResourcePopupSuppression(
  target: ResourcePopupTarget,
  resource: ResourcePopupKind,
  delta: number,
): boolean {
  const index = resourcePopupSuppressions.findIndex(
    item => item.target === target && item.resource === resource && item.delta === delta,
  );
  if (index < 0) {
    return false;
  }

  resourcePopupSuppressions.splice(index, 1);
  return true;
}

function pushExplicitResourcePopup(target: ResourcePopupTarget, resource: ResourcePopupKind, delta: number) {
  suppressNextResourcePopup(target, resource, delta);
  pushResourcePopup(target, resource, delta);
}

function triggerCompanionAssistVisual(companion: CooperationCompanion, skill: Skill) {
  if (companionAssistTimer) {
    clearTimeout(companionAssistTimer);
  }

  companionAssistEffect.value = {
    name: companion.character.name,
    avatarUrl: companion.character.avatarUrl,
    skillName: skill.name,
  };

  companionAssistTimer = setTimeout(() => {
    companionAssistEffect.value = null;
    companionAssistTimer = null;
  }, 1800);
}

function triggerUnusableSkillFeedback(skill: Skill) {
  if (unusableSkillFeedbackTimer) {
    clearTimeout(unusableSkillFeedbackTimer);
  }

  unusableSkillFeedbackId.value = null;
  setTimeout(() => {
    unusableSkillFeedbackId.value = skill.id;
    unusableSkillFeedbackTimer = setTimeout(() => {
      unusableSkillFeedbackId.value = null;
      unusableSkillFeedbackTimer = null;
    }, 420);
  }, 0);
}

// 清空临时状态（战斗结束后调用）
async function clearTemporaryStatus() {
  try {
    // 清空玩家临时状态；对手状态只清空运行态。
    await clearPlayerTemporaryStatuses();
    enemyRuntimeStatuses.value = {};

    // 清空束缚状态
    playerBoundTurns.value = 0;
    enemyBoundTurns.value = 0;
    playerBindSource.value = null;
    enemyBindSource.value = null;
    // 清空感官麻木状态
    playerSensoryNumb.value = 0;
    enemySensoryNumb.value = 0;

    addLog('临时状态已清空', 'system', 'info');
  } catch (e) {
    console.error('[战斗界面] 清空临时状态失败', e);
  }
}

function createExorcismDefeatStatus(statusName: '战败' | '沦陷'): TimedStatusEffect {
  const fallen = statusName === '沦陷';
  return {
    加成: {
      魅力加成: 0,
      幸运加成: 0,
      基础性斗力加成: 0,
      基础性斗力成算: fallen ? -10 : 0,
      基础忍耐力加成: 0,
      基础忍耐力成算: fallen ? -10 : -5,
      闪避率加成: 0,
      暴击率加成: 0,
    },
    剩余回合: 99,
    描述: fallen ? '完全失去战斗力，即将被恶堕' : '首次战败，战斗力下降',
  };
}

async function applyExorcismDefeatStatus(statusListBeforeClear: Record<string, unknown>) {
  if (turnState.phase !== 'defeat' || !exorcismBossDefinition.value) {
    return;
  }

  const alreadyDefeated = Boolean(statusListBeforeClear.战败 || statusListBeforeClear.沦陷);
  const statusName = alreadyDefeated ? '沦陷' : '战败';
  const statusEffect = createExorcismDefeatStatus(statusName);

  await setPlayerTemporaryStatusList({ [statusName]: statusEffect });
  player.value.statusEffects = statusListToEffects({ [statusName]: statusEffect });
  addLog(
    statusName === '沦陷'
      ? '【驱魔战败】战败状态加深为「沦陷」，完全失去战斗力，即将被恶堕。'
      : '【驱魔战败】获得「战败」状态，战斗力下降。',
    'system',
    'critical',
  );
}

function addLog(message: string, source: string, type: CombatLogEntry['type'] = 'info') {
  const logEntry: CombatLogEntry = {
    id: Math.random().toString(36).substr(2, 9),
    turn: turnState.currentTurn,
    message,
    source,
    type,
  };
  logs.value.push(logEntry);
}

function addClimaxLogs(climaxLogs: ClimaxLog[]) {
  climaxLogs.forEach(log => addLog(log.message, log.source, log.type));
}

function addTurnFlowLogs(turnLogs: { message: string; source: string; type: CombatLogEntry['type'] }[]) {
  turnLogs.forEach(log => addLog(log.message, log.source, log.type));
}

async function triggerClimaxProcessing(params: {
  characterName: string;
  targetIsEnemy: boolean;
  reason?: string;
  useProcessEllipsis?: boolean;
}) {
  if (isBattleFlowLocked()) {
    return;
  }

  addClimaxLogs(createClimaxTriggerLogs(params));
  triggerEffect('climax');
  await processClimaxAfterLLM(params.targetIsEnemy);
}

let combatResultFinalized = false;

async function finishCombatAfterResult() {
  if (combatResultFinalized) {
    return;
  }

  combatResultFinalized = true;
  const finalPhase = turnState.phase;
  const playerStatusListBeforeClear =
    finalPhase === 'defeat' && exorcismBossDefinition.value ? await readPlayerTemporaryStatusList() : {};

  selectAndDisplayCG();
  turnState.enemyIntention = null;
  turnState.climaxTarget = null;
  await clearTemporaryStatus();
  turnState.phase = finalPhase;
  await applyExorcismDefeatStatus(playerStatusListBeforeClear);
  await saveToMvu();
}

async function applyBossClimaxActions(actions: BossClimaxAction[]) {
  for (const action of actions) {
    switch (action.kind) {
      case 'log':
        addLog(action.message, action.source, action.type);
        break;
      case 'setSharedClimaxLimit':
        setSharedClimaxLimit(action.limit);
        break;
      case 'removeEnemyStatus': {
        const statusList = { ...(enemyRuntimeStatuses.value as Record<string, any>) };
        delete statusList[action.statusName];
        enemyRuntimeStatuses.value = statusList;
        break;
      }
      case 'setEnemyStatus':
        setEnemyRuntimeStatus(action.statusName, action.effect);
        break;
      case 'updateEnemyStats':
        await updateEnemyRealtimeStats();
        break;
      case 'persistCombatConfig':
        await persistCombatConfig(action.enemyName, action.climaxLimit);
        break;
      case 'resetEnemyPleasure':
        enemy.value.stats.currentPleasure = 0;
        break;
      case 'clearClimaxTarget':
        turnState.climaxTarget = null;
        break;
      case 'saveCombatState':
        await saveToMvu();
        break;
      case 'setTurnPhaseLater':
        setTimeout(() => {
          if (!isBattleFlowLocked()) {
            turnState.phase = action.phase;
          }
        }, action.delayMs);
        break;
    }
  }
}

async function applyBossPhaseSideEffectActions(actions: BossPhaseSideEffectAction[]) {
  for (const action of actions) {
    switch (action.kind) {
      case 'log':
        addLog(action.message, action.source, action.type);
        break;
      case 'setBossControlsDisabled':
        isBossItemsDisabled.value = action.itemsDisabled;
        isBossSurrenderDisabled.value = action.surrenderDisabled;
        break;
      case 'castSealEffect':
        setTimeout(() => {
          castSealEffect(action.selectors);
        }, action.delayMs);
        break;
      case 'removeSealEffect':
        removeSealEffect(action.selectors);
        break;
      case 'applyEnemyBuff':
        await applyTalentBuff('enemy', action.buffName, action.bonus, action.duration);
        break;
    }
  }
}

function cloneCharacter(char: Character): Character {
  return {
    ...char,
    stats: { ...char.stats },
    skills: char.skills.map(s => ({ ...s })),
    items: char.items.map(i => ({ ...i })),
    statusEffects: [...char.statusEffects],
  };
}

function getPhaseText(phase: TurnState['phase']): string {
  const texts: Record<TurnState['phase'], string> = {
    playerInput: '玩家回合',
    processing: '结算中',
    enemyAction: '敌方行动',
    victory: '胜利',
    defeat: '败北',
    climaxResolution: '高潮处理',
    gameOver: '游戏结束',
  };
  return texts[phase];
}

function getSkillCostContext(skill: Skill) {
  if (!BossSystem.bossState.isBossFight) {
    return {};
  }

  const bossId = BossSystem.bossState.bossId;
  return {
    bossId,
    edenStaminaCostMultiplier: bossId === 'eden' ? BossSystem.getEdenSlothEffects().staminaCostMultiplier : undefined,
    heisakiSkillCost: bossId === 'heisaki' ? BossSystem.calculateHeisakiSkillCost(skill.id, skill.cost) : undefined,
  };
}

function getDisplaySkillCost(skill: Skill): number {
  return calculateSkillDisplayCost(skill, getSkillCostContext(skill));
}

function isSkillDisabled(skill: Skill): boolean {
  return isSkillActionDisabled(skill, player.value.stats.currentEndurance, getSkillCostContext(skill));
}

function applyPlayerTalentActions(actions: PlayerTalentAction[]) {
  actions.forEach(action => {
    switch (action.kind) {
      case 'log':
        addLog(action.message, action.source, action.type);
        break;
      case 'bindPlayer':
        playerBoundTurns.value = action.turns;
        playerBindSource.value = action.bindSource;
        break;
      case 'removePlayerBuff':
        removeTalentBuff('player', action.buffName);
        break;
      case 'applyPlayerBuff':
        applyTalentBuff('player', action.buffName, action.bonus, action.duration);
        break;
    }
  });
}

function applyPlayerAttackActions(
  actions: PlayerAttackAction[],
  context: { nextPlayer?: Character; nextEnemy?: Character } = {},
) {
  actions.forEach(action => {
    switch (action.kind) {
      case 'log':
        addLog(action.message, action.source, action.type);
        break;
      case 'removePlayerBuff':
        removeTalentBuff('player', action.buffName);
        break;
      case 'applyPlayerBuff':
        applyTalentBuff('player', action.buffName, action.bonus, action.duration);
        break;
      case 'changePlayerPleasure': {
        const target = context.nextPlayer || player.value;
        target.stats.currentPleasure = Math.max(
          0,
          Math.min(target.stats.maxPleasure, target.stats.currentPleasure + action.delta),
        );
        break;
      }
      case 'setTalentState':
        playerTalentState.value = action.talentState;
        break;
      case 'bindEnemy':
        enemyBoundTurns.value = action.turns;
        enemyBindSource.value = action.bindSource;
        break;
      case 'setEnemyStatus':
        setEnemyRuntimeStatus(action.statusName, action.effect);
        break;
      case 'addEnemyStatusBonus':
        addEnemyRuntimeStatusBonus(action.statusName, action.bonus, action.duration);
        break;
      case 'updateEnemyStats':
        updateEnemyRealtimeStats();
        break;
      case 'adjustEnemyStats': {
        const target = context.nextEnemy || enemy.value;
        if (typeof action.evasionDelta === 'number') {
          target.stats.evasion = calcEvasionWithDiminishingReturns(target.stats.evasion + action.evasionDelta);
        }
        if (typeof action.critDelta === 'number') {
          target.stats.crit = Math.max(0, target.stats.crit + action.critDelta);
        }
        break;
      }
      case 'queueBossDialogues':
        BossSystem.queueDialogues(action.dialogues, action.blocking);
        break;
    }
  });
}

function applyElizabethCommandActions(actions: ElizabethCommandAction[], context: { targetPlayer?: Character } = {}) {
  actions.forEach(action => {
    switch (action.kind) {
      case 'log':
        addLog(action.message, action.source, action.type);
        break;
      case 'changePlayerEndurance': {
        const target = context.targetPlayer || player.value;
        target.stats.currentEndurance = Math.max(
          0,
          Math.min(target.stats.maxEndurance, target.stats.currentEndurance + action.delta),
        );
        break;
      }
      case 'setEnemyStatus':
        setEnemyRuntimeStatus(action.statusName, action.effect);
        break;
      case 'updateEnemyStats':
        updateEnemyRealtimeStats();
        break;
      case 'queueBossDialogues':
        BossSystem.queueDialogues(action.dialogues);
        break;
    }
  });
}

function applyEnemyBossActions(actions: EnemyPostDamageBossAction[]) {
  actions.forEach(action => {
    switch (action.kind) {
      case 'log':
        addLog(action.message, action.source, action.type);
        break;
      case 'setEnemyStatus':
        setEnemyRuntimeStatus(action.statusName, action.effect);
        break;
      case 'removeEnemyStatus': {
        const statusList = { ...(enemyRuntimeStatuses.value as Record<string, any>) };
        delete statusList[action.statusName];
        enemyRuntimeStatuses.value = statusList;
        break;
      }
      case 'updateEnemyStats':
        updateEnemyRealtimeStats();
        break;
      case 'bindEnemy':
        enemyBoundTurns.value = action.turns;
        enemyBindSource.value = action.bindSource;
        break;
    }
  });
}

function applyEnemySkillAttackEvents(events: EnemySkillAttackEvent[]) {
  events.forEach(event => {
    switch (event.kind) {
      case 'log':
        addLog(event.message, event.source, event.type);
        break;
      case 'effect':
        triggerEffect(event.effect);
        break;
      case 'enemyBossActions':
        applyEnemyBossActions(event.actions);
        break;
      case 'playerTalentActions':
        applyPlayerTalentActions(event.actions);
        break;
    }
  });
}

async function applyEnemyTurnStartActions(actions: EnemyTurnStartAction[]) {
  for (const action of actions) {
    switch (action.kind) {
      case 'log':
        addLog(action.message, action.source, action.type);
        break;
      case 'setPlayerBind':
        playerBoundTurns.value = action.turns;
        playerBindSource.value = action.bindSource;
        break;
      case 'setPlayerSensoryNumb':
        playerSensoryNumb.value = action.turns;
        break;
      case 'changePlayerPleasure':
        player.value.stats.currentPleasure = Math.min(
          player.value.stats.maxPleasure,
          player.value.stats.currentPleasure + action.delta,
        );
        await syncPlayerPleasureToMvu(player.value.stats.currentPleasure);
        break;
      case 'applyPlayerBuff':
        await applyTalentBuff('player', action.buffName, action.bonus, action.duration);
        break;
      case 'setEnemyBind':
        enemyBoundTurns.value = action.turns;
        enemyBindSource.value = action.bindSource;
        break;
      case 'setEnemySensoryNumb':
        enemySensoryNumb.value = action.turns;
        break;
      case 'decrementBackpackItem':
        await decrementBackpackItem(action.itemName);
        break;
      case 'decrementRuntimePlayerItem': {
        const itemIndex = player.value.items.findIndex((item: any) => (item.name || item.id) === action.itemName);
        if (itemIndex !== -1) {
          player.value.items[itemIndex].quantity--;
          if (player.value.items[itemIndex].quantity <= 0) {
            player.value.items.splice(itemIndex, 1);
          }
        }
        break;
      }
      case 'changeEnemyEndurance':
        enemy.value.stats.currentEndurance = Math.min(
          enemy.value.stats.maxEndurance,
          enemy.value.stats.currentEndurance + action.delta,
        );
        break;
      case 'changeEnemyPleasure':
        enemy.value.stats.currentPleasure = Math.max(0, enemy.value.stats.currentPleasure + action.delta);
        break;
      case 'setEnemyStatus':
        setEnemyRuntimeStatus(action.statusName, action.effect);
        break;
      case 'updateEnemyStats':
        updateEnemyRealtimeStats();
        break;
      case 'queueBossDialogues':
        BossSystem.queueDialogues(action.dialogues, action.blocking);
        break;
      case 'setDialogueSkippable':
        BossSystem.setDialogueSkippable(action.skippable);
        break;
      case 'setTurnPhase':
        if (!isBattleFlowLocked()) {
          turnState.phase = action.phase;
        }
        break;
      case 'setPhaseTransitionEffect':
        phaseTransitionEffect.value = action.effect;
        break;
    }
  }
}

function applyTurnStartActions(actions: TurnStartAction[]) {
  actions.forEach(action => {
    switch (action.kind) {
      case 'log':
        addLog(action.message, action.source, action.type);
        break;
      case 'setPlayerEndurance':
        player.value.stats.currentEndurance = action.value;
        syncPlayerStaminaToMvu(player.value.stats.currentEndurance);
        break;
      case 'changePlayerPleasure':
        player.value.stats.currentPleasure = Math.min(
          player.value.stats.maxPleasure,
          player.value.stats.currentPleasure + action.delta,
        );
        syncPlayerPleasureToMvu(player.value.stats.currentPleasure);
        break;
      case 'resourcePopup':
        pushExplicitResourcePopup(action.target, action.resource, action.delta);
        break;
      case 'bindPlayer':
        playerBoundTurns.value = action.turns;
        playerBindSource.value = action.bindSource;
        break;
      case 'removePlayerBuff':
        removeTalentBuff('player', action.buffName);
        break;
      case 'applyPlayerBuff':
        applyTalentBuff('player', action.buffName, action.bonus, action.duration);
        break;
      case 'applyEnemyBuff':
        applyTalentBuff('enemy', action.buffName, action.bonus, action.duration);
        break;
      case 'setTalentState':
        playerTalentState.value = action.talentState;
        break;
      case 'queueBossDialogues':
        BossSystem.queueDialogues(action.dialogues);
        break;
      case 'setDialogueSkippable':
        BossSystem.setDialogueSkippable(action.skippable);
        break;
      case 'hideSurrenderMenu':
        showSurrenderMenu.value = false;
        break;
      case 'setTurnPhase':
        if (!isBattleFlowLocked()) {
          turnState.phase = action.phase;
        }
        break;
      case 'restorePlayerInputIfProcessing':
        if (turnState.phase === 'processing' && !isBattleFlowLocked()) {
          turnState.phase = 'playerInput';
        }
        break;
    }
  });
}

function applyTurnEndActions(actions: TurnEndAction[]) {
  actions.forEach(action => {
    switch (action.kind) {
      case 'log':
        addLog(action.message, action.source, action.type);
        break;
      case 'changePlayerPleasure':
        player.value.stats.currentPleasure = Math.min(
          player.value.stats.maxPleasure,
          player.value.stats.currentPleasure + action.delta,
        );
        break;
    }
  });
}

function applySkipTurnActions(actions: SkipTurnAction[]) {
  actions.forEach(action => {
    switch (action.kind) {
      case 'log':
        addLog(action.message, action.source, action.type);
        break;
      case 'changePlayerPleasure':
        player.value.stats.currentPleasure = Math.min(
          player.value.stats.maxPleasure,
          player.value.stats.currentPleasure + action.delta,
        );
        break;
      case 'setTalentState':
        playerTalentState.value = action.talentState;
        break;
      case 'applyPlayerBuff':
        applyTalentBuff('player', action.buffName, action.bonus, action.duration);
        break;
      case 'removePlayerBuff':
        removeTalentBuff('player', action.buffName);
        break;
    }
  });
}

// ================= 战斗逻辑 =================
function syncEnemySkillCooldownsFromRuntime() {
  syncEnemySkillCooldowns(enemy.value.skills, enemyRuntimeSkillCooldowns.value);
}

function determineEnemyIntention() {
  // 预告生成前，确保技能卡片读取最新的运行态冷却。
  syncEnemySkillCooldownsFromRuntime();

  const selection = selectEnemyIntention(enemy.value.skills);
  selection.invalidSkills.forEach(skill => {
    console.warn('[战斗界面] 发现无效技能:', skill);
  });

  if (selection.failureReason === 'empty') {
    console.warn('[战斗界面] 敌人没有可用技能');
    turnState.enemyIntention = null;
    return;
  }

  if (selection.failureReason === 'noValidSkill') {
    console.warn('[战斗界面] 没有有效的敌人技能');
    turnState.enemyIntention = null;
    return;
  }

  if (selection.failureReason === 'noChoice' || !selection.skill) {
    console.warn('[战斗界面] 没有可选择的技能');
    turnState.enemyIntention = null;
    return;
  }

  console.info('[战斗界面] 选择预告技能:', selection.skill.name, 'ID:', selection.skill.id);
  turnState.enemyIntention = selection.skill;
}

async function handlePlayerSkill(skill: Skill) {
  if (shouldIgnoreSkillClickFromLongPress(skill)) {
    return;
  }
  hideSkillEffectTooltip();

  if (turnState.phase !== 'playerInput') return;

  // 注意：敌人束缚的递减在敌人回合开始时处理（handleEnemyTurn），不在这里处理

  // 检查是否被束缚
  if (playerBoundTurns.value > 0) {
    triggerUnusableSkillFeedback(skill);
    addLog(`${player.value.name} 被束缚了，无法使用技能！剩余 ${playerBoundTurns.value} 回合`, 'system', 'info');
    return;
  }

  // ========== 七宗罪-懒惰：前3回合无法攻击 ==========
  const sinType = TalentSystem.getSinTalentType(playerTalent.value);
  if (sinType === 'sloth' && playerTalentState.value.slothCannotAttackTurns > 0) {
    addLog(
      `【七宗罪·懒惰】前3回合无法攻击！剩余${playerTalentState.value.slothCannotAttackTurns}回合`,
      'system',
      'critical',
    );
    return;
  }

  const specialInterruptLog = await tryInterruptActionBySpecialStatus('player');
  if (turnState.phase !== 'playerInput' || isBattleFlowLocked()) return;
  if (specialInterruptLog) {
    turnState.phase = 'processing';
    addLog(specialInterruptLog, 'system', 'debuff');
    triggerCharacterReaction('player', 'status-block', '乏力 · 行动失败');
    setTimeout(() => {
      if (!isBattleFlowLocked()) {
        void handleEnemyTurn();
      }
    }, 1000);
    return;
  }

  const requiredCost = getDisplaySkillCost(skill);
  if (BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'heisaki') {
    if (requiredCost > skill.cost) {
      addLog(`【利息翻倍】${skill.name} 耐力消耗: ${skill.cost} → ${requiredCost}`, 'system', 'debuff');
    }
  }

  // 检查体力是否足够（使用计算后的实际消耗）
  // 黑崎晴雯BOSS战允许透支
  if (BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'heisaki') {
    // 贪婪机制：允许透支，不检查耐力
  } else if (player.value.stats.currentEndurance < requiredCost) {
    addLog(`体力不足，无法使用技能！需要 ${requiredCost} 点体力`, 'system', 'info');
    return;
  }

  if (isSkillDisabled(skill)) {
    addLog(skill.currentCooldown > 0 ? '技能冷却中！' : '耐力不足！', 'system', 'info');
    return;
  }

  turnState.phase = 'processing';
  const nextPlayer = cloneCharacter(player.value);
  let nextEnemy = cloneCharacter(enemy.value);

  // 消耗体力（检查耐力稳定天赋限制）
  let actualCost = getDisplaySkillCost(skill);
  if (BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'eden' && actualCost > skill.cost) {
    addLog(`【懒惰·虚弱】耐力消耗增加！${skill.cost} → ${actualCost}`, 'system', 'debuff');
  }

  if (playerTalent.value) {
    const staminaCap = TalentSystem.getTalentStaminaChangeCap(playerTalent.value);
    if (staminaCap !== null && actualCost > staminaCap) {
      addLog(`【${playerTalent.value.name}】触发：耐力消耗限制为${staminaCap}点`, 'system', 'info');
      actualCost = staminaCap;
    }
  }

  // ========== 黑崎晴雯BOSS：贪婪天赋 - 透支机制 ==========
  if (BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'heisaki') {
    const overdraftResult = BossSystem.processHeisakiOverdraft(nextPlayer.stats.currentEndurance, actualCost);
    if (overdraftResult.debtIncrease > 0) {
      // 透支：消耗所有耐力，剩余部分计入债务
      nextPlayer.stats.currentEndurance = 0;
      addLog(`${nextPlayer.name} 消耗了 ${overdraftResult.staminaToUse} 点体力`, 'system', 'info');
      addLog(
        `【透支】耐力不足，债务增加 ${overdraftResult.debtIncrease}，当前债务: ${overdraftResult.newDebt}`,
        'system',
        'critical',
      );
      // 播放透支对话
      if (overdraftResult.dialogues.length > 0) {
        BossSystem.queueDialogues(overdraftResult.dialogues);
      }
    } else {
      nextPlayer.stats.currentEndurance -= actualCost;
      addLog(`${nextPlayer.name} 消耗了 ${actualCost} 点体力`, 'system', 'info');
    }
  } else {
    nextPlayer.stats.currentEndurance -= actualCost;
    addLog(`${nextPlayer.name} 消耗了 ${actualCost} 点体力`, 'system', 'info');
  }

  // ========== 薇丝佩菈BOSS：记录玩家技能耐力消耗（用于下回合束缚判定） ==========
  if (BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'vespera') {
    BossSystem.recordVesperaPlayerSkillCost(skill.cost);
    if (skill.cost > 28) {
      addLog(`【体力透支】使用了耐力消耗>28的技能，下回合将被束缚！`, 'system', 'danger');
    }
  }

  // 设置冷却
  const skillIndex = nextPlayer.skills.findIndex(s => s.id === skill.id);
  if (skillIndex !== -1) {
    let finalCooldown = skill.cooldown || 0;

    // ========== 伊甸芙宁BOSS：懒惰天赋 - 玩家技能冷却+2（所有技能） ==========
    if (BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'eden') {
      const slothEffects = BossSystem.getEdenSlothEffects();
      const originalCooldown = finalCooldown;
      finalCooldown += slothEffects.cooldownIncrease;
      addLog(`【懒惰·迟钝】技能冷却时间增加！${originalCooldown} → ${finalCooldown}`, 'system', 'debuff');
    }

    nextPlayer.skills[skillIndex].currentCooldown = finalCooldown;
    if (finalCooldown > 0) {
      addLog(`${skill.name} 进入冷却，冷却时间 ${finalCooldown} 回合`, 'system', 'info');
    }
  }

  // 使用新的战斗计算系统
  import('./combatCalculator').then(async ({ executeAttack, applySkillBuffs }) => {
    try {
      if (isBattleFlowLocked()) {
        return;
      }

      // 检查技能数据是否存在
      if (!skill.data) {
        addLog(`技能 ${skill.name} 的数据不存在，无法使用`, 'system', 'critical');
        turnState.phase = 'playerInput';
        return;
      }

      const exorcismUsedResult = await evaluateAndApplyExorcismMechanics('skillTagUsed', {
        skill,
        skillActor: 'player',
      });
      if (exorcismUsedResult.phaseChanged) {
        nextEnemy = cloneCharacter(enemy.value);
      }
      if (exorcismUsedResult.cancelAction || exorcismUsedResult.skipBattle || exorcismUsedResult.triggeredBadEnd) {
        player.value = nextPlayer;
        enemy.value = nextEnemy;
        await saveToMvu();
        if (!exorcismUsedResult.triggeredBadEnd && !exorcismUsedResult.skipBattle) {
          setTimeout(() => {
            if (!isBattleFlowLocked()) {
              void handleEnemyTurn();
            }
          }, 1000);
        }
        return;
      }

      // ========== 天赋/七宗罪/BOSS攻击前修正 ==========
      const attackPreparation = createPlayerAttackPreparation({
        skill,
        talent: playerTalent.value,
        talentContext: createTalentEffectContext(),
        talentState: playerTalentState.value,
        currentTurn: turnState.currentTurn,
        bossState: BossSystem.bossState,
      });
      applyPlayerAttackActions(attackPreparation.actions);
      const talentAttackResult = attackPreparation.talentAttackResult;
      const attackOptions = { ...attackPreparation.attackOptions };
      const preAttackSpecialLogs: string[] = [];
      const exorcismDamageMultiplier = getCurrentExorcismSkillTagMultiplier(skill);
      if (exorcismDamageMultiplier !== 1) {
        attackOptions.damageMultiplier = (attackOptions.damageMultiplier ?? 1) * exorcismDamageMultiplier;
        addLog(`【驱魔机制】${skill.name} 标签倍率 x${exorcismDamageMultiplier}`, 'system', 'info');
      }

      const playerFocusActive = await hasSpecialStatus('player', '集中');
      if (playerFocusActive) {
        attackOptions.guaranteedCrit = true;
        preAttackSpecialLogs.push(`${nextPlayer.name} 的集中状态生效，本次攻击必定暴击！`);
      }

      const playerConfusionLog = await tryConfuseActionBySpecialStatus('player');
      const playerAttackTargetSide: CombatSide = playerConfusionLog ? 'player' : 'enemy';
      const playerAttackTarget = playerConfusionLog ? nextPlayer : nextEnemy;
      if (playerConfusionLog) {
        preAttackSpecialLogs.push(`${playerConfusionLog} ${skill.name}失控作用到自己身上！`);
        triggerCharacterReaction('player', 'status-self-hit', '迷离 · 误伤自身');
      }

      const targetSensitiveValue = await getSpecialStatusValue(playerAttackTargetSide, '敏感');
      const sensitiveLog = buildSensitiveDamageLog(playerAttackTarget.name, targetSensitiveValue);
      if (sensitiveLog) {
        attackOptions.damageMultiplier =
          (attackOptions.damageMultiplier ?? 1) * getSensitiveDamageMultiplier(targetSensitiveValue);
        preAttackSpecialLogs.push(sensitiveLog);
      }

      const result = executeAttack(nextPlayer, playerAttackTarget, skill.data, true, attackOptions); // 玩家攻击敌人时启用等级压制
      const shouldConsumeFocus =
        playerFocusActive && skill.data.damageFormula.length > 0 && Math.max(0, Number(skill.data.hitCount ?? 1)) > 0;

      // ========== 天赋被动效果：应用伤害加成 ==========
      applyPlayerAttackActions(
        applyTalentPassiveDamageBoost({
          talent: playerTalent.value,
          result,
          context: {
            playerPleasure: nextPlayer.stats.currentPleasure,
            playerMaxPleasure: nextPlayer.stats.maxPleasure,
            playerStamina: nextPlayer.stats.currentEndurance,
            playerMaxStamina: nextPlayer.stats.maxEndurance,
            enemyPleasure: nextEnemy.stats.currentPleasure,
            enemyMaxPleasure: nextEnemy.stats.maxPleasure,
          },
        }),
      );

      // 记录战斗日志
      addLog(`${nextPlayer.name} 使用了 ${skill.name}！`, 'player', 'info');
      preAttackSpecialLogs.forEach(log => addLog(log, 'system', 'info'));
      if (shouldConsumeFocus && (await removeSpecialStatuses('player', '集中')) > 0) {
        addLog(`${nextPlayer.name} 的集中效果已消耗`, 'system', 'info');
      }
      const skillRarity = await getPlayerSkillRarity(skill.id, 'C');

      applyElizabethCommandActions(
        createElizabethSkillCommandActions({
          bossState: BossSystem.bossState,
          skillRarity,
          isCritical: result.isCritical,
          playerMaxEndurance: nextPlayer.stats.maxEndurance,
        }),
        { targetPlayer: nextPlayer },
      );

      let hasDirectDamage = false;

      if (result.isDodged) {
        addLog(`${playerAttackTarget.name} 闪避了所有攻击！`, 'system', 'info');
        triggerEffect('dodge');
        applyPlayerAttackActions(
          createPlayerDodgedActions({
            sinType: TalentSystem.getSinTalentType(playerTalent.value),
            talentState: playerTalentState.value,
          }),
        );
      } else {
        // 输出详细的伤害计算过程（包括连击日志）
        console.info('[战斗界面] 玩家攻击 - result.logs:', result.logs);
        if (result.logs && result.logs.length > 0) {
          result.logs.forEach(log => {
            addLog(log, 'system', 'info');
          });
        } else {
          console.warn('[战斗界面] 玩家攻击 - result.logs 为空或未定义');
        }

        hasDirectDamage = result.hits.length > 0 || result.totalDamage > 0;

        if (hasDirectDamage) {
          // 使用totalDamage而不是actualDamage（连击总伤害）
          if (result.isCritical) {
            addLog(`暴击！总计造成 ${result.totalDamage} 点快感！`, 'player', 'critical');
            triggerEffect('critical');
            applyPlayerAttackActions(
              createPlayerCriticalHitActions({
                sinType: TalentSystem.getSinTalentType(playerTalent.value),
                talentState: playerTalentState.value,
                bossState: BossSystem.bossState,
              }),
              { nextEnemy },
            );
          } else {
            addLog(`总计造成 ${result.totalDamage} 点快感`, 'player', 'damage');
          }

          // 应用伤害（结算快感）- 使用totalDamage
          const damageTarget = playerConfusionLog ? nextPlayer : nextEnemy;
          const oldPleasure = damageTarget.stats.currentPleasure;
          damageTarget.stats.currentPleasure = Math.min(
            damageTarget.stats.maxPleasure,
            damageTarget.stats.currentPleasure + result.totalDamage,
          );
          const actualPleasureDamage = damageTarget.stats.currentPleasure - oldPleasure;
          addLog(
            `${damageTarget.name} 的快感从 ${oldPleasure}/${damageTarget.stats.maxPleasure} 增加到 ${damageTarget.stats.currentPleasure}/${damageTarget.stats.maxPleasure}`,
            'system',
            'info',
          );

          if (!playerConfusionLog) {
            applyPlayerAttackActions(
              createAgnesPlayerDamageActions({
                bossState: BossSystem.bossState,
                damage: result.totalDamage,
              }),
            );

            applyPlayerAttackActions(
              createPlayerDamageDealtActions({
                talent: playerTalent.value,
                talentContext: createTalentEffectContext(),
                talentState: playerTalentState.value,
                totalDamage: result.totalDamage,
                playerMaxPleasure: nextPlayer.stats.maxPleasure,
                playerCharm: nextPlayer.stats.charm,
                enemyCharm: nextEnemy.stats.charm,
                enemyName: nextEnemy.name,
                enemyBoundTurns: enemyBoundTurns.value,
                bossState: BossSystem.bossState,
              }),
              { nextPlayer, nextEnemy },
            );

            const postDamageSpecialLogs = await applyPostDamageSpecialEffects({
              attackerSide: 'player',
              targetSide: 'enemy',
              damage: actualPleasureDamage,
              attacker: nextPlayer,
              target: nextEnemy,
            });
            postDamageSpecialLogs.forEach(log => addLog(log, 'system', 'info'));
          }
        }

        // 先提交攻击后的运行态，再应用技能效果，避免即时资源变化被旧克隆覆盖。
        player.value = nextPlayer;
        enemy.value = nextEnemy;

        // 应用buff/debuff效果（包括束缚，统一由 applyCombatSkillEffects 处理）
        if (playerConfusionLog) {
          addLog('迷离使技能附带效果没有正确生效。', 'system', 'debuff');
        } else {
          try {
            const effectLogs = await applyCombatSkillEffects(skill.id, true);
            effectLogs.forEach(log => addLog(log, 'system', 'info'));
          } catch (e) {
            console.error('[战斗界面] 应用技能效果失败', e);
          }
        }

        if (hasDirectDamage && !playerConfusionLog) {
          applyPlayerAttackActions(
            createTalentBindAfterHitActions({
              talentAttackResult,
              enemyBoundTurns: enemyBoundTurns.value,
              enemyName: nextEnemy.name,
              bossState: BossSystem.bossState,
            }),
          );

          // ========== 黑崎晴雯BOSS：贪婪天赋 - C/B级技能命中时随机技能耐力消耗减半 ==========
          applyPlayerAttackActions(
            createHeisakiLowRarityHitActions({
              bossState: BossSystem.bossState,
              skillRarity,
              playerSkills: nextPlayer.skills,
            }),
          );
        }
      }

      // ========== 黑崎晴雯BOSS：贪婪天赋 - A/S/SS级技能使用后耐力消耗翻倍 ==========
      applyPlayerAttackActions(
        createHeisakiHighRaritySkillUsedActions({
          bossState: BossSystem.bossState,
          skillId: skill.id,
          skillName: skill.name,
          skillRarity,
        }),
      );

      const yamadaTrueNameReleased =
        hasDirectDamage && !playerConfusionLog
          ? await maybeTriggerYamadaHanakoTrueNameRelease(nextPlayer, nextEnemy)
          : false;

      // 更新状态
      player.value = nextPlayer;
      enemy.value = nextEnemy;

      let exorcismStopsBattle = false;
      const collectExorcismResult = (mechanicResult: ExorcismMechanicApplyResult) => {
        if (mechanicResult.triggeredBadEnd || mechanicResult.skipBattle) {
          exorcismStopsBattle = true;
        }
      };

      if (!result.isDodged && !playerConfusionLog) {
        collectExorcismResult(
          await evaluateAndApplyExorcismMechanics('skillTagHit', {
            skill,
            skillActor: 'player',
          }),
        );
        collectExorcismResult(await evaluateAndApplyExorcismMechanics('progressAtLeast'));
      }

      if (hasDirectDamage && !playerConfusionLog) {
        const damageTakenPercent = getExorcismPleasurePercent(enemy.value);
        const damageStepResult = await evaluateAndApplyExorcismMechanics('damageTakenPercentStep', {
          damageTakenPercent,
        });
        collectExorcismResult(damageStepResult);
        collectExorcismResult(await evaluateAndApplyExorcismMechanics('hpPercentAtOrBelow'));
        collectExorcismResult(await evaluateAndApplyExorcismMechanics('progressAtLeast'));
        if (damageStepResult.cancelAction) {
          addLog('【驱魔机制】当前行动被人格/场地机制中断。', 'system', 'critical');
        }
      }

      // 保存状态（先保存，确保高潮状态写入MVU）
      await saveToMvu();
      if (exorcismStopsBattle) {
        return;
      }

      // 检查是否高潮（在reloadStatusFromMvu之前检查，避免覆盖）
      if (await triggerPendingClimaxFromResourceChange('技能效果')) {
        return;
      } else {
        // 没有高潮时，才重新读取状态加成
        if (!yamadaTrueNameReleased) {
          await reloadStatusFromMvu();
        }

        // 使用技能后，轮到对方结算快感
        setTimeout(() => {
          if (!isBattleFlowLocked()) {
            void handleEnemyTurn();
          }
        }, 1000);
      }
    } catch (e) {
      console.error('[战斗界面] 使用技能时出错', e);
      addLog('使用技能时出错', 'system', 'critical');
      if (!isBattleFlowLocked()) {
        turnState.phase = 'playerInput';
      }
    }
  });
}

async function commitPlayerItemUseState(
  nextPlayer: Character,
  nextEnemy: Character,
  options: { addTurnMarker?: boolean } = {},
) {
  player.value = nextPlayer;
  enemy.value = nextEnemy;
  activeMenu.value = 'main';
  await saveToMvu();
  await reloadStatusFromMvu();

  if (options.addTurnMarker) {
    addLog(`--- 第 ${turnState.currentTurn} 回合 ---`, 'system', 'info');
  }
}

function handlePlayerItemClick(item: Item) {
  if (shouldIgnoreItemClickFromLongPress(item)) {
    return;
  }
  hideSkillEffectTooltip();
  void handlePlayerItem(item);
}

async function handlePlayerItem(item: Item) {
  if (turnState.phase !== 'playerInput' || item.quantity <= 0) {
    if (item.quantity <= 0) {
      addLog(`${item.name} 数量不足，无法使用`, 'system', 'info');
    }
    return;
  }

  // 使用物品不结束回合，所以不需要设置processing状态
  const nextPlayer = cloneCharacter(player.value);
  const nextEnemy = cloneCharacter(enemy.value);

  const itemIndex = nextPlayer.items.findIndex(i => i.id === item.id);
  if (itemIndex > -1) {
    nextPlayer.items[itemIndex].quantity -= 1;
    addLog(
      `${nextPlayer.name} 使用了 ${item.name}，剩余数量：${nextPlayer.items[itemIndex].quantity}`,
      'system',
      'info',
    );
    // 标记本回合已使用道具
    itemUsedThisTurn.value = true;
    triggerCombatItemVisual(item);
  }

  const specialNegativeItemSummary = buildSpecialNegativeItemSummary(item);
  if (specialNegativeItemSummary) {
    addLog(
      `记录：第 ${turnState.currentTurn} 回合使用了【${item.name}】 -> ${specialNegativeItemSummary}`,
      'system',
      'info',
    );
  }

  // ==================== 特殊道具：意志奇点（清除自身所有buff/debuff并回复行动） ====================
  if (item.id === '意志奇点') {
    try {
      // 清除束缚状态（束缚属于负面控制，也应被清除）
      playerBoundTurns.value = 0;
      playerBindSource.value = null;

      // 清空玩家临时状态（buff/debuff）
      await clearPlayerTemporaryStatuses();

      addLog('意志奇点发动：已清除自身所有buff与debuff，并恢复行动。', 'system', 'critical');

      // 回复行动：确保仍处于玩家回合可输入状态
      turnState.phase = 'playerInput';

      await commitPlayerItemUseState(nextPlayer, nextEnemy, { addTurnMarker: true });
      return;
    } catch (e) {
      console.error('[战斗界面] 意志奇点处理失败', e);
      addLog('意志奇点使用失败', 'system', 'critical');
      // 失败也至少把物品扣除后的数量同步
      await commitPlayerItemUseState(nextPlayer, nextEnemy);
      return;
    }
  }

  // ==================== 特殊道具：三好学生勋章（跳过沐芯兰第二阶段） ====================
  if (item.id === 'honor_medal_muxinlan') {
    const validation = validateMuxinlanHonorMedalUse(BossSystem.bossState);
    if (!validation.allowed) {
      addLog(validation.message || '该道具现在无法使用。', 'system', 'info');
      // 更新状态
      await commitPlayerItemUseState(nextPlayer, nextEnemy);
      return;
    }

    const ok = BossSystem.useHonorMedal();
    if (ok) {
      addLog('你使用了【三好学生荣誉勋章】！沐芯兰的第二阶段将被跳过。', 'system', 'critical');
    } else {
      addLog('该道具使用失败。', 'system', 'info');
    }

    await commitPlayerItemUseState(nextPlayer, nextEnemy, { addTurnMarker: true });
    return;
  }

  // 应用物品效果
  const log = item.effect(nextPlayer, nextEnemy);
  addLog(log.message, log.source, log.type);

  // 记录属性变化
  if (item.staminaRestore) {
    addLog(
      `${nextPlayer.name} 的耐力变化：${player.value.stats.currentEndurance} → ${nextPlayer.stats.currentEndurance}`,
      'system',
      'info',
    );
  }
  if (item.pleasureReduce || item.pleasureIncrease) {
    addLog(
      `${nextPlayer.name} 的快感变化：${player.value.stats.currentPleasure} → ${nextPlayer.stats.currentPleasure}`,
      'system',
      'info',
    );
  }

  // 如果物品有临时buff，写入MVU的临时状态
  if (item.bonuses && Object.keys(item.bonuses).length > 0) {
    const duration = getItemTemporaryBuffDuration(item);

    await addUniquePlayerTemporaryStatus(item.name, {
      加成: item.bonuses,
      剩余回合: duration,
    });

    addLog(`${item.name} 的状态效果已生效，持续 ${duration} 回合`, 'system', 'info');
  }

  await commitPlayerItemUseState(nextPlayer, nextEnemy);

  const itemEffectLogs = await applyCombatItemEffects(item);
  itemEffectLogs.forEach(effectLog => addLog(effectLog, 'system', 'info'));
  if (await triggerPendingClimaxFromResourceChange('道具效果')) {
    return;
  }

  // 注意：使用物品不结束回合，玩家可以继续操作
  // 只有使用技能才会结束回合并轮到对方行动
}

async function finishTurnAndMaybeStartNextTurn(): Promise<boolean> {
  if (isBattleFlowLocked()) {
    return true;
  }

  const climaxTriggered = await endTurn();
  if (isBattleFlowLocked()) {
    return true;
  }

  if (!climaxTriggered) {
    setTimeout(() => {
      if (!isBattleFlowLocked()) {
        void startNewTurn();
      }
    }, 1000);
  }
  return climaxTriggered;
}

async function refreshStatusEffectsAtTurnStart() {
  if (isBattleFlowLocked()) {
    return;
  }

  const logs = await tickCombatStatusEffects();
  if (isBattleFlowLocked()) {
    return;
  }

  logs.forEach(log => addLog(log, 'system', 'info'));
  if (await triggerPendingClimaxFromResourceChange('持续状态')) {
    return;
  }
  await reloadStatusFromMvu();
}

async function runEdenGameOverSequence() {
  if (isBattleFlowLocked()) {
    return;
  }

  await BossSystem.waitForDialoguesToFinish();
  if (isBattleFlowLocked()) {
    return;
  }

  addLog(`【Game Over】伊甸芙宁发动了终极技能！`, 'system', 'critical');
  addLog(`【Game Over】造成500%性斗力伤害，必定暴击，5连击！`, 'system', 'damage');

  const gameOverDamage = Math.floor(enemy.value.stats.sexPower * 5.0 * 5);
  player.value.stats.currentPleasure = Math.min(
    player.value.stats.maxPleasure,
    player.value.stats.currentPleasure + gameOverDamage,
  );
  addLog(`${player.value.name} 受到了 ${gameOverDamage} 点快感！`, 'system', 'critical');

  setTimeout(() => {
    phaseTransitionEffect.value = '';
  }, 1500);

  if (player.value.stats.currentPleasure >= player.value.stats.maxPleasure) {
    player.value.stats.climaxCount++;
    addLog(
      `${player.value.name} 达到了高潮！(${player.value.stats.climaxCount}/${player.value.stats.maxClimaxCount})`,
      'system',
      'climax',
    );
    triggerEffect('climax');

    if (player.value.stats.climaxCount >= player.value.stats.maxClimaxCount) {
      addLog(`${player.value.name} 达到高潮次数上限，战斗结束！`, 'system', 'critical');
      addLog(`${enemy.value.name} 获得了胜利！`, 'system', 'victory');
      triggerEffect('defeat');
      BossSystem.queueDialogues(BossSystem.EDEN_DIALOGUES.victory);
      turnState.phase = 'gameOver';
      return;
    }

    player.value.stats.currentPleasure = 0;
  }

  await finishTurnAndMaybeStartNextTurn();
}

async function runEnemySkillAction(playerWasBoundAtEnemyTurnStart: boolean) {
  if (isBattleFlowLocked()) {
    return;
  }

  // 使用预告的技能（如果预告存在且可用），否则随机选择
  if (!turnState.enemyIntention) {
    // 如果没有预告，随机选择一个技能
    determineEnemyIntention();
    addLog(`${enemy.value.name} 随机选择了技能`, 'system', 'info');
  }

  const nextPlayer = cloneCharacter(player.value);
  let nextEnemy = cloneCharacter(enemy.value);

  const specialInterruptLog = await tryInterruptActionBySpecialStatus('enemy');
  if (specialInterruptLog) {
    addLog(specialInterruptLog, 'system', 'debuff');
    triggerCharacterReaction('enemy', 'status-block', '乏力 · 行动失败');
    await finishTurnAndMaybeStartNextTurn();
    return;
  }

  const enemySkillUse = prepareEnemySkillUseForTurn({
    enemy: nextEnemy,
    intention: turnState.enemyIntention,
    cooldowns: enemyRuntimeSkillCooldowns.value,
    runtimeSkillEffects: enemyRuntimeSkillEffects.value,
  });
  enemySkillUse.logs.forEach(log => addLog(log.message, log.source, log.type));
  if (!enemySkillUse.canUseSkill || !enemySkillUse.skill) {
    await finishTurnAndMaybeStartNextTurn();
    return;
  }
  const skill = enemySkillUse.skill;

  try {
    // 检查技能数据是否存在
    if (!skill.data) {
      addLog(`技能 ${skill.name} 的数据不存在，无法使用`, 'system', 'critical');
      await finishTurnAndMaybeStartNextTurn();
      return;
    }

    const exorcismUsedResult = await evaluateAndApplyExorcismMechanics('skillTagUsed', {
      skill,
      skillActor: 'enemy',
    });
    if (exorcismUsedResult.phaseChanged) {
      nextEnemy = cloneCharacter(enemy.value);
    }
    if (exorcismUsedResult.cancelAction || exorcismUsedResult.skipBattle || exorcismUsedResult.triggeredBadEnd) {
      player.value = nextPlayer;
      enemy.value = nextEnemy;
      await saveToMvu();
      if (!exorcismUsedResult.triggeredBadEnd && !exorcismUsedResult.skipBattle) {
        await finishTurnAndMaybeStartNextTurn();
      }
      return;
    }

    const exorcismDamageMultiplier = getCurrentExorcismSkillTagMultiplier(skill);
    if (exorcismDamageMultiplier !== 1) {
      addLog(`【驱魔机制】${skill.name} 标签倍率 x${exorcismDamageMultiplier}`, 'system', 'info');
    }

    const enemyFocusActive = await hasSpecialStatus('enemy', '集中');
    const shouldConsumeEnemyFocus =
      enemyFocusActive && skill.data.damageFormula.length > 0 && Math.max(0, Number(skill.data.hitCount ?? 1)) > 0;
    if (enemyFocusActive) {
      addLog(`${nextEnemy.name} 的集中状态生效，本次攻击必定暴击！`, 'system', 'info');
    }

    const enemyConfusionLog = await tryConfuseActionBySpecialStatus('enemy');
    if (enemyConfusionLog) {
      addLog(`${nextEnemy.name} 使用了 ${skill.name}！`, 'enemy', 'info');
      addLog(`${enemyConfusionLog} ${skill.name}失控作用到自己身上！`, 'system', 'debuff');
      triggerCharacterReaction('enemy', 'status-self-hit', '迷离 · 误伤自身');

      const enemySelfSensitiveValue = await getSpecialStatusValue('enemy', '敏感');
      const enemySelfSensitiveLog = buildSensitiveDamageLog(nextEnemy.name, enemySelfSensitiveValue);
      const confusedAttackOptions: { guaranteedCrit?: boolean; damageMultiplier?: number } = {};
      if (enemyFocusActive) {
        confusedAttackOptions.guaranteedCrit = true;
      }
      const confusedDamageMultiplier = exorcismDamageMultiplier * getSensitiveDamageMultiplier(enemySelfSensitiveValue);
      if (confusedDamageMultiplier !== 1) {
        confusedAttackOptions.damageMultiplier = confusedDamageMultiplier;
      }

      if (enemySelfSensitiveLog) {
        addLog(enemySelfSensitiveLog, 'system', 'info');
      }

      const confusedResult = executeAttack(nextEnemy, nextEnemy, skill.data, false, confusedAttackOptions);
      const shouldConsumeConfusedEnemyFocus =
        enemyFocusActive && skill.data.damageFormula.length > 0 && Math.max(0, Number(skill.data.hitCount ?? 1)) > 0;
      if (shouldConsumeConfusedEnemyFocus && (await removeSpecialStatuses('enemy', '集中')) > 0) {
        addLog(`${nextEnemy.name} 的集中效果已消耗`, 'system', 'info');
      }

      if (confusedResult.logs && confusedResult.logs.length > 0) {
        confusedResult.logs.forEach(log => addLog(log, 'system', 'info'));
      }

      const hasConfusedDirectDamage = confusedResult.hits.length > 0 || confusedResult.totalDamage > 0;
      if (confusedResult.isDodged) {
        addLog(`${nextEnemy.name} 闪避了失控的动作！`, 'system', 'info');
        triggerEffect('dodge');
      } else if (hasConfusedDirectDamage) {
        if (confusedResult.isCritical) {
          addLog(`暴击！${nextEnemy.name} 对自己造成 ${confusedResult.totalDamage} 点快感！`, 'enemy', 'critical');
          triggerEffect('critical');
        } else {
          addLog(`${nextEnemy.name} 对自己造成 ${confusedResult.totalDamage} 点快感`, 'enemy', 'damage');
        }

        const oldEnemyPleasure = nextEnemy.stats.currentPleasure;
        nextEnemy.stats.currentPleasure = Math.min(
          nextEnemy.stats.maxPleasure,
          nextEnemy.stats.currentPleasure + confusedResult.totalDamage,
        );
        addLog(
          `${nextEnemy.name} 的快感从 ${oldEnemyPleasure}/${nextEnemy.stats.maxPleasure} 增加到 ${nextEnemy.stats.currentPleasure}/${nextEnemy.stats.maxPleasure}`,
          'system',
          'info',
        );
      } else {
        addLog('迷离使技能附带效果没有正确生效。', 'system', 'debuff');
      }

      player.value = nextPlayer;
      enemy.value = nextEnemy;
      await saveToMvu();
      if (await triggerPendingClimaxFromResourceChange('迷离')) {
        return;
      }
      await finishTurnAndMaybeStartNextTurn();
      return;
    }

    const playerSensitiveValue = await getSpecialStatusValue('player', '敏感');
    const playerSensitiveLog = buildSensitiveDamageLog(nextPlayer.name, playerSensitiveValue);
    if (playerSensitiveLog) {
      addLog(playerSensitiveLog, 'system', 'info');
    }

    const attackResolution = resolveEnemySkillAttack({
      player: nextPlayer,
      enemy: nextEnemy,
      skill,
      bossState: BossSystem.bossState,
      playerWasBoundAtEnemyTurnStart,
      sinType: TalentSystem.getSinTalentType(playerTalent.value),
      talentState: playerTalentState.value,
      talent: playerTalent.value,
      createTalentContext: createTalentEffectContext,
      damageMultiplier: exorcismDamageMultiplier,
      attackDamageMultiplier: getSensitiveDamageMultiplier(playerSensitiveValue),
      guaranteedCritFromStatus: enemyFocusActive,
    });
    if (shouldConsumeEnemyFocus && (await removeSpecialStatuses('enemy', '集中')) > 0) {
      addLog(`${nextEnemy.name} 的集中效果已消耗`, 'system', 'info');
    }

    applyEnemySkillAttackEvents(attackResolution.beforeDialogueEvents);

    const playerGenderForDialogue =
      BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'vespera'
        ? await readPlayerGender('男')
        : '男';
    queueEnemySkillBattleDialogue(BossSystem.bossState, playerGenderForDialogue);

    applyEnemySkillAttackEvents(attackResolution.afterDialogueEvents);

    const postDamageSpecialLogs = await applyPostDamageSpecialEffects({
      attackerSide: 'enemy',
      targetSide: 'player',
      damage: attackResolution.finalDamage,
      attacker: nextEnemy,
      target: nextPlayer,
    });
    postDamageSpecialLogs.forEach(log => addLog(log, 'system', 'info'));

    player.value = nextPlayer;
    enemy.value = nextEnemy;

    if (await triggerPendingClimaxFromResourceChange('技能效果')) {
      return;
    }

    if (attackResolution.shouldApplySkillEffects) {
      try {
        const effectLogs = await applyCombatSkillEffects(skill.id, false);
        effectLogs.forEach(log => addLog(log, 'system', 'info'));
      } catch (e) {
        console.error('[战斗界面] 应用技能效果失败', e);
        addLog('应用技能效果时出错，但战斗继续', 'system', 'info');
      }
    }

    // 更新状态
    player.value = nextPlayer;
    enemy.value = nextEnemy;

    let exorcismStopsBattle = false;
    if (attackResolution.shouldApplySkillEffects) {
      const hitResult = await evaluateAndApplyExorcismMechanics('skillTagHit', {
        skill,
        skillActor: 'enemy',
      });
      const progressResult = await evaluateAndApplyExorcismMechanics('progressAtLeast');
      exorcismStopsBattle =
        hitResult.triggeredBadEnd ||
        hitResult.skipBattle ||
        progressResult.triggeredBadEnd ||
        progressResult.skipBattle;
    }

    // 保存状态（先保存，确保高潮状态写入MVU）
    await saveToMvu();
    if (exorcismStopsBattle) {
      return;
    }

    // 检查是否高潮（在reloadStatusFromMvu之前检查，避免覆盖）
    if (await triggerPendingClimaxFromResourceChange('技能效果')) {
      return;
    } else {
      // 没有高潮时，才重新读取状态加成
      await reloadStatusFromMvu();

      // 对方执行完技能后，处理回合结束事务，然后进入下一回合
      await finishTurnAndMaybeStartNextTurn();
    }
  } catch (e) {
    console.error('[战斗界面] 敌人使用技能时出错', e);
    addLog('敌人使用技能时出错', 'system', 'critical');
    await finishTurnAndMaybeStartNextTurn();
  }
}

async function handleEnemyTurn() {
  if (isBattleFlowLocked()) {
    return;
  }

  turnState.phase = 'enemyAction';

  console.info(
    `[束缚系统] 敌人回合开始 - enemyBoundTurns=${enemyBoundTurns.value}, enemyBindSource=${enemyBindSource.value}`,
  );

  // 记录：敌人回合开始时玩家是否处于束缚状态（用于本回合薇丝佩菈必中必暴判定）
  const playerWasBoundAtEnemyTurnStart = playerBoundTurns.value > 0;

  await applyEnemyTurnStartActions(
    createPlayerBindTurnStartActions({
      playerName: player.value.name,
      boundTurns: playerBoundTurns.value,
      bindSource: playerBindSource.value,
    }),
  );

  // ========== 艾格妮丝BOSS：共餐机制（每3回合触发：1,4,7,10...） ==========
  if (BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'agnes') {
    const agnesFeastContext = await readAgnesFeastContext();
    await applyEnemyTurnStartActions(
      createAgnesFeastTurnStartActions({
        bossState: BossSystem.bossState,
        playerGender: agnesFeastContext.playerGender,
        backpack: agnesFeastContext.backpack,
      }),
    );
  }

  // ========== 薇丝佩菈BOSS：自体献祭检查（高潮2/3次后，仅女性玩家） ==========
  if (BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'vespera') {
    const playerGender = await readPlayerGender('男');
    const selfSacrificeResult = createVesperaSelfSacrificeStartResult({
      bossState: BossSystem.bossState,
      enemyName: enemy.value.name,
      enemyBoundTurns: enemyBoundTurns.value,
      enemyBindSource: enemyBindSource.value,
      bossClimaxCount: enemy.value.stats.climaxCount || 0,
      playerGender,
    });
    if (selfSacrificeResult.triggered) {
      await applyEnemyTurnStartActions(selfSacrificeResult.actions);
      (async () => {
        await BossSystem.waitForDialoguesToFinish();
        if (isBattleFlowLocked()) {
          return;
        }

        await applyEnemyTurnStartActions(
          createVesperaSelfSacrificeAfterDialogueActions({
            bindDuration: selfSacrificeResult.bindDuration,
            enemyCharm: enemy.value.stats.charm,
          }),
        );

        await finishTurnAndMaybeStartNextTurn();
      })();

      return;
    }
  }

  // 检查敌人是否被束缚（玩家施加的束缚）
  console.info(`[束缚系统] 检查敌人束缚状态 - enemyBoundTurns=${enemyBoundTurns.value}`);
  if (enemyBoundTurns.value > 0) {
    const boundTurnResolution = createBoundEnemyTurnResolution({
      bossState: BossSystem.bossState,
      enemyName: enemy.value.name,
      boundTurns: enemyBoundTurns.value,
      bindSource: enemyBindSource.value,
      enemyMaxPleasure: enemy.value.stats.maxPleasure,
      enemyStatuses: enemyRuntimeStatuses.value as Record<string, any>,
    });
    await applyEnemyTurnStartActions(boundTurnResolution.boundActions);
    if (boundTurnResolution.shouldCheckEnemyClimax) {
      if (enemy.value.stats.currentPleasure >= enemy.value.stats.maxPleasure && turnState.climaxTarget === null) {
        void triggerClimaxProcessing({ characterName: enemy.value.name, targetIsEnemy: true });
        return;
      }
    }

    await applyEnemyTurnStartActions(boundTurnResolution.edenActions);
    if (boundTurnResolution.triggerGameOver) {
      void runEdenGameOverSequence();
      return;
    }

    await applyEnemyTurnStartActions(boundTurnResolution.tickActions);
    void finishTurnAndMaybeStartNextTurn();
    return;
  }

  const edenResult = createEdenTurnStartResult({
    bossState: BossSystem.bossState,
    enemyName: enemy.value.name,
    boundTurns: enemyBoundTurns.value,
    enemyStatuses: enemyRuntimeStatuses.value as Record<string, any>,
    isEnemyBound: false,
  });
  await applyEnemyTurnStartActions(edenResult.actions);
  if (edenResult.triggerGameOver) {
    void runEdenGameOverSequence();
    return;
  }
  if (edenResult.skipEnemyAction) {
    void finishTurnAndMaybeStartNextTurn();
    return;
  }

  addTurnFlowLogs([createEnemyTurnActionStartLog(enemy.value.name)]);

  setTimeout(() => {
    if (!isBattleFlowLocked()) {
      void runEnemySkillAction(playerWasBoundAtEnemyTurnStart);
    }
  }, 1000);
}

async function tryRunCompanionCooperationAtTurnStart(): Promise<boolean> {
  if (isBattleFlowLocked()) {
    return true;
  }

  const statData = await readCombatStatData(data => data as Record<string, any>);
  if (statData) {
    currentCombatStatData = statData;
  }

  if (!statData || !hasActiveExorcismMazeSideQuest(statData)) {
    cooperationTriggerChance.value = 0;
    return false;
  }

  const companions = await getCooperationCompanions(statData);
  if (companions.length === 0) {
    cooperationTriggerChance.value = 0;
    return false;
  }

  const rollResult = createCooperationRoll(cooperationTriggerChance.value);
  cooperationTriggerChance.value = rollResult.nextChance;
  if (!rollResult.triggered) {
    const message =
      rollResult.roll === null
        ? `【协同作战】${companions.map(companion => companion.resolvedName).join('、')}进入协同状态，触发率提升至 ${COOPERATION_CHANCE_STEP}%`
        : `【协同作战】本回合未触发，触发率提升至 ${rollResult.nextChance}%`;
    addLog(message, 'system', 'info');
    return false;
  }

  const action = pickCooperationAction(companions);
  if (!action) {
    return false;
  }

  cooperationTriggerChance.value = 0;
  triggerCompanionAssistVisual(action.companion, action.skill);

  try {
    const nextEnemy = cloneCharacter(enemy.value);
    const attackResolution = resolveCompanionSkillAttack({
      companion: action.companion.character,
      target: nextEnemy,
      skill: action.skill,
    });

    attackResolution.logs.forEach(log => addLog(log.message, log.source, log.type));
    if (attackResolution.effect) {
      triggerEffect(attackResolution.effect);
    }

    enemy.value = nextEnemy;

    if (attackResolution.shouldApplySkillEffects) {
      const effectLogs = await applyCompanionSkillEffects(action.skill);
      effectLogs.forEach(log => addLog(log, 'system', 'info'));
    }

    addLog('【协同作战】触发率回落至 0%', 'system', 'info');

    if (enemy.value.stats.currentPleasure >= enemy.value.stats.maxPleasure && turnState.climaxTarget === null) {
      await triggerClimaxProcessing({ characterName: enemy.value.name, targetIsEnemy: true, reason: '协同作战' });
      return true;
    }
  } catch (error) {
    console.error('[战斗界面] 协同作战执行失败', error);
    addLog('协同作战执行失败', 'system', 'critical');
  }

  return isBattleFlowLocked();
}

async function startNewTurn() {
  if (isBattleFlowLocked()) {
    return;
  }

  if (!beginNextPlayerTurn(turnState)) {
    return;
  }

  // 重置每回合道具使用限制
  itemUsedThisTurn.value = false;

  const exorcismTurnStart = await evaluateAndApplyExorcismMechanics('turnStart');
  const exorcismTurnLimit = await evaluateAndApplyExorcismMechanics('turnAtLeast');
  if (
    isBattleFlowLocked() ||
    exorcismTurnStart.triggeredBadEnd ||
    exorcismTurnStart.skipBattle ||
    exorcismTurnLimit.triggeredBadEnd ||
    exorcismTurnLimit.skipBattle
  ) {
    return;
  }

  if (await tryRunCompanionCooperationAtTurnStart()) {
    return;
  }

  // 随机选择对方技能，进行预告；驱魔机制强制技能优先。
  if (!turnState.enemyIntention) {
    determineEnemyIntention();
  }
  const previewLog = createEnemyIntentionPreviewLog(enemy.value.name, turnState.enemyIntention);
  if (previewLog) {
    addTurnFlowLogs([previewLog]);
  }

  // 回合开始回复（双方各回复 3+最大耐力*0.03 点体力，向上取整）
  applyTurnStartActions(createTurnStartRecoveryActions(player.value, enemy.value));
  await saveToMvu();

  // 冷却递减
  addTurnFlowLogs(createReadySkillCooldownLogs(decrementSkillCooldowns(player.value.skills).readySkills));
  decrementSkillCooldowns(enemy.value.skills, enemyRuntimeSkillCooldowns.value);
  decrementEquipmentSkillCooldowns();

  void refreshStatusEffectsAtTurnStart();

  // 束缚回合数现在在专门的endTurn函数中处理

  // 处理天赋回合开始效果
  if (playerTalent.value) {
    const talentContext = createTalentEffectContext();
    TalentSystem.processTalentOnTurnStart(playerTalent.value, talentContext);

    // ========== 七宗罪回合开始效果 ==========
    applyTurnStartActions(
      createPlayerSinTurnStartActions({
        sinType: TalentSystem.getSinTalentType(playerTalent.value),
        talentContext,
        talentState: playerTalentState.value,
        currentTurn: turnState.currentTurn,
        currentEndurance: player.value.stats.currentEndurance,
      }),
    );
  }

  applyTurnStartActions(
    createVesperaTurnStartActions({
      bossState: BossSystem.bossState,
      currentTurn: turnState.currentTurn,
      playerMaxPleasure: player.value.stats.maxPleasure,
      playerBoundTurns: playerBoundTurns.value,
    }),
  );

  applyTurnStartActions(
    createElizabethTurnStartActions({
      bossState: BossSystem.bossState,
      currentTurn: turnState.currentTurn,
    }),
  );

  const heisakiTurnStart = createHeisakiTurnStartActions({
    bossState: BossSystem.bossState,
    currentPleasure: player.value.stats.currentPleasure,
    maxPleasure: player.value.stats.maxPleasure,
  });
  applyTurnStartActions(heisakiTurnStart.actions);
  if (heisakiTurnStart.settlement) {
    BossSystem.waitForDialoguesToFinish().then(() => {
      if (!isBattleFlowLocked()) {
        applyTurnStartActions(createHeisakiDebtSettlementActions(heisakiTurnStart.settlement!));
      }
    });
  }

  addLog(`--- 第 ${turnState.currentTurn} 回合 ---`, 'system', 'info');
  void saveToMvu();
}

// 创建天赋效果上下文
function createTalentEffectContext(): TalentSystem.TalentEffectContext {
  return {
    playerPleasure: player.value.stats.currentPleasure,
    playerMaxPleasure: player.value.stats.maxPleasure,
    playerStamina: player.value.stats.currentEndurance,
    playerMaxStamina: player.value.stats.maxEndurance,
    enemyPleasure: enemy.value.stats.currentPleasure,
    enemyMaxPleasure: enemy.value.stats.maxPleasure,
    enemyStamina: enemy.value.stats.currentEndurance,
    enemyMaxStamina: enemy.value.stats.maxEndurance,
    currentTurn: turnState.currentTurn,
    talentState: playerTalentState.value,
    modifyPlayerPleasure: (delta: number) => {
      const oldPleasure = player.value.stats.currentPleasure;
      player.value.stats.currentPleasure = Math.max(0, Math.min(player.value.stats.maxPleasure, oldPleasure + delta));
      // 同步到MVU
      syncPlayerPleasureToMvu(player.value.stats.currentPleasure);
    },
    modifyPlayerStamina: (delta: number) => {
      const oldStamina = player.value.stats.currentEndurance;
      player.value.stats.currentEndurance = Math.max(0, Math.min(player.value.stats.maxEndurance, oldStamina + delta));
      // 同步到MVU
      syncPlayerStaminaToMvu(player.value.stats.currentEndurance);
    },
    modifyEnemyPleasure: (delta: number) => {
      const oldPleasure = enemy.value.stats.currentPleasure;
      enemy.value.stats.currentPleasure = Math.max(0, Math.min(enemy.value.stats.maxPleasure, oldPleasure + delta));
      syncEnemyPleasureToRuntime(enemy.value.stats.currentPleasure);
    },
    modifyEnemyStamina: (delta: number) => {
      const oldStamina = enemy.value.stats.currentEndurance;
      enemy.value.stats.currentEndurance = Math.max(0, Math.min(enemy.value.stats.maxEndurance, oldStamina + delta));
    },
    addLog: (message: string, source: string, type: string) => {
      addLog(message, source as any, type as any);
    },
    applyBuff: (target: 'player' | 'enemy', buffName: string, bonus: Record<string, number>, duration: number) => {
      // 简化的buff应用，将buff写入临时状态
      applyTalentBuff(target, buffName, bonus, duration);
    },
  };
}

// 同步玩家快感到MVU
async function syncPlayerPleasureToMvu(value: number) {
  try {
    await setPlayerResource('pleasure', value);
  } catch (e) {
    console.error('[天赋系统] 同步玩家快感失败', e);
  }
}

// 同步玩家耐力到MVU
async function syncPlayerStaminaToMvu(value: number) {
  try {
    await setPlayerResource('stamina', value);
  } catch (e) {
    console.error('[天赋系统] 同步玩家耐力失败', e);
  }
}

function syncEnemyPleasureToRuntime(value: number) {
  enemy.value.stats.currentPleasure = value;
}

// 移除天赋buff
async function removeTalentBuff(target: 'player' | 'enemy', buffName: string) {
  try {
    if (target === 'enemy') {
      const statusList = { ...(enemyRuntimeStatuses.value as Record<string, any>) };
      delete statusList[buffName];
      enemyRuntimeStatuses.value = statusList;
      await updateEnemyRealtimeStats();
      return;
    }

    await removePlayerTemporaryStatus(buffName);
    await reloadStatusFromMvu();
  } catch (e) {
    console.error('[天赋系统] 移除buff失败', e);
  }
}

// 应用天赋buff到临时状态
async function applyTalentBuff(
  target: 'player' | 'enemy',
  buffName: string,
  bonus: Record<string, number>,
  duration: number,
) {
  try {
    if (target === 'enemy') {
      setEnemyRuntimeStatus(buffName, {
        加成: bonus,
        剩余回合: duration,
      });
      await updateEnemyRealtimeStats();
      return;
    }

    await addPlayerTemporaryStatus(buffName, {
      加成: bonus,
      剩余回合: duration,
    });

    // 重新计算属性
    await reloadStatusFromMvu();
  } catch (e) {
    console.error('[天赋系统] 应用buff失败', e);
  }
}

// 处理回合结束时的事务，返回true表示触发了高潮（不应继续startNewTurn）
async function endTurn(): Promise<boolean> {
  if (isBattleFlowLocked()) {
    return true;
  }

  // 束缚回合数在尝试行动时递减，不在这里处理

  // 处理天赋回合结束效果
  if (playerTalent.value) {
    const talentContext = createTalentEffectContext();
    TalentSystem.processTalentOnTurnEnd(playerTalent.value, talentContext);

    const sinType = TalentSystem.getSinTalentType(playerTalent.value);
    const sinTurnEndResult = createPlayerSinTurnEndResult({
      sinType,
      talentState: playerTalentState.value,
      playerMaxPleasure: player.value.stats.maxPleasure,
      playerCurrentPleasure: player.value.stats.currentPleasure,
    });
    applyTurnEndActions(sinTurnEndResult.actions);

    if (
      sinTurnEndResult.climaxReason &&
      player.value.stats.currentPleasure >= player.value.stats.maxPleasure &&
      turnState.climaxTarget === null
    ) {
      await triggerClimaxProcessing({
        characterName: player.value.name,
        targetIsEnemy: false,
        reason: sinTurnEndResult.climaxReason,
      });
      return true; // 高潮处理会接管后续流程
    }
  }

  const exorcismTurnEnd = await evaluateAndApplyExorcismMechanics('turnEnd');
  const exorcismProgress = await evaluateAndApplyExorcismMechanics('progressAtLeast');
  if (
    isBattleFlowLocked() ||
    exorcismTurnEnd.triggeredBadEnd ||
    exorcismTurnEnd.skipBattle ||
    exorcismProgress.triggeredBadEnd ||
    exorcismProgress.skipBattle
  ) {
    return true;
  }

  return false; // 没有触发高潮
}

// 选择并显示CG
async function selectAndDisplayCG() {
  try {
    const playerGender = await readPlayerGender('男');
    const selection = await selectCombatCG({
      enemyName: enemy.value.name,
      playerGender,
      phase: turnState.phase,
    });

    cgImageUrl.value = selection.imageUrl;
    cgDescription.value = selection.description;

    console.info('[战斗界面] CG选择结果:', {
      eventName: selection.eventName,
      imageUrl: selection.imageUrl,
      cgKey: selection.cgKey,
      unlockedNewCG: selection.unlockedNewCG,
    });
  } catch (e) {
    console.error('[战斗界面] 选择CG时发生异常', e);
    cgImageUrl.value = null;
    cgDescription.value = '';
  }
}

// 处理CG图片加载错误
function handleCGImageError() {
  cgImageUrl.value = null;
}

// 发送战斗日志给LLM生成过程描述
async function sendCombatLogToLLM(_context: string) {
  try {
    const fullPrompt = buildCombatNarrationPrompt({
      logs: logs.value,
      playerName: player.value.name,
      enemyName: enemy.value.name,
      totalTurns: turnState.currentTurn,
      isVictory: turnState.phase === 'victory',
      cgDescription: cgDescription.value,
    });

    // 先发送战斗日志文本到聊天中显示（作为用户消息）
    if (typeof createChatMessages === 'function') {
      await createChatMessages([
        {
          role: 'user',
          message: fullPrompt,
        },
      ]);
    }

    // 发送给LLM生成
    if (typeof generate === 'function') {
      addLog('正在生成过程描述...', 'system', 'info');
      const generatedText = await generate({ user_input: fullPrompt });

      // 将生成的内容发送到聊天（作为AI助手消息）
      if (typeof createChatMessages === 'function') {
        await createChatMessages([
          {
            role: 'assistant',
            message: `[战斗过程] ${generatedText}`,
          },
        ]);

        // 只触发一次AI回复（移除重复触发）
        // 注意：createChatMessages 已经会触发AI回复，所以不需要再调用 triggerSlash
        addLog('已将过程描述发送给LLM，等待AI回复...', 'system', 'info');
      }
    } else {
      console.warn('[战斗界面] generate函数不可用');
      addLog('无法生成过程描述，generate函数不可用', 'system', 'info');

      // 如果 generate 不可用，直接触发一次AI回复
      if (typeof triggerSlash === 'function') {
        await triggerSlash('/trigger');
      }
    }
  } catch (e) {
    console.error('[战斗界面] 发送日志给LLM失败', e);
    addLog('发送日志给LLM失败', 'system', 'critical');
  }
}

// 处理发送战斗日志（用于胜负结算）
async function handleSendCombatLogToLLM() {
  await sendCombatLogToLLM(buildCombatEndContext(turnState.phase));

  const rewardLogs = await grantVictoryRewards(enemy.value.name, turnState.phase === 'victory');
  rewardLogs.forEach(log => addLog(log.message, 'system', log.type));

  // 战斗结算机制：玩家当前快感减半，耐力增加最大耐力的20%
  try {
    const recoveryResult = await applyPostBattlePlayerRecovery();
    createPostBattleRecoveryLogs(recoveryResult).forEach(log => addLog(log.message, 'system', log.type));
    if (recoveryResult) {
      console.info(
        `[战斗结算] 快感: ${recoveryResult.oldPleasure} → ${recoveryResult.newPleasure}, 耐力: ${recoveryResult.oldStamina} → ${recoveryResult.newStamina} (+${recoveryResult.staminaIncrease})`,
      );
    }
  } catch (e) {
    console.error('[战斗界面] 战斗结算失败', e);
    addLog('战斗结算时出错，但战斗记录已发送', 'system', 'critical');
  }

  // 清空战斗日志
  logs.value = [];
}

// ==================== BOSS阶段切换处理 ====================
// 步骤1：锁血并立即换图（沐芯兰）
function lockHealthAndChangeAvatar(nextPhase: 1 | 2 | 3) {
  const currentPhase = BossSystem.bossState.currentPhase;
  const phaseConfig = getMuxinlanPhaseConfig(nextPhase);
  console.info(`[战斗界面] BOSS阶段切换开始: ${currentPhase} -> ${nextPhase}`);

  // 锁血：快感设为最大值-1，防止触发高潮
  enemy.value.stats.currentPleasure = enemy.value.stats.maxPleasure - 1;

  // 立即更立绘和名称
  enemy.value.name = phaseConfig.displayName;
  if (phaseConfig.avatarUrl) {
    enemy.value.avatarUrl = phaseConfig.avatarUrl;
  }

  // 设置转换状态
  isPhaseTransitioning.value = true;
  phaseTransitionEffect.value = phaseConfig.transitionEffect;

  // 1.5秒后自动清除特效（冲击波动画完成后）
  setTimeout(() => {
    phaseTransitionEffect.value = null;
  }, 1500);

  console.info(`[战斗界面] 已锁血并更换立绘: ${phaseConfig.displayName}`);
}

// 克莉丝汀BOSS：锁血并换名换立绘
function lockHealthAndChangeAvatarChristine(nextPhase: 1 | 2) {
  const currentPhase = BossSystem.bossState.currentPhase;
  const phaseConfig = getChristinePhaseConfig(nextPhase);
  console.info(`[战斗界面] 克莉丝汀BOSS阶段切换开始: ${currentPhase} -> ${nextPhase}`);

  // 锁血：快感设为最大值-1，防止触发高潮
  enemy.value.stats.currentPleasure = enemy.value.stats.maxPleasure - 1;

  // 立即更换名称和立绘
  enemy.value.name = phaseConfig.displayName;
  // 更换立绘：克莉丝汀_1 或 克莉丝汀_2
  if (phaseConfig.avatarUrl) {
    enemy.value.avatarUrl = phaseConfig.avatarUrl;
  }

  // 设置转换状态
  isPhaseTransitioning.value = true;
  phaseTransitionEffect.value = phaseConfig.transitionEffect;

  // 1.5秒后自动清除特效
  setTimeout(() => {
    phaseTransitionEffect.value = null;
  }, 1500);

  console.info(`[战斗界面] 克莉丝汀已锁血并更换名称: ${phaseConfig.displayName}`);
}

async function loadAndApplyBossPhaseRuntime(
  phaseConfig: BossPhaseRuntimeConfig,
  options: {
    updateAvatar: boolean;
    skillLogLabel: string;
    targetEnemy?: Character;
  },
): Promise<any | null> {
  const { enemyDbModule, enemySkillDbModule } = await loadDatabaseModules();
  const newEnemyData = enemyDbModule.getEnemyBaseDataByName(phaseConfig.dataKey);
  if (!newEnemyData) {
    console.warn(`[战斗界面] 未找到阶段数据: ${phaseConfig.dataKey}`);
    return null;
  }

  const targetEnemy = options.targetEnemy ?? enemy.value;

  applyPhaseEnemyData({
    enemy: targetEnemy,
    enemyData: newEnemyData,
    config: phaseConfig,
    normalizeEvasion: calcEvasionWithDiminishingReturns,
    updateAvatar: options.updateAvatar,
  });
  targetEnemy.statusEffects = statusListToEffects(enemyRuntimeStatuses.value, 'enemy_');

  player.value.stats.maxClimaxCount = phaseConfig.climaxLimit;
  player.value.stats.climaxCount = 0;

  const skillPoolKey = phaseConfig.skillPoolKey ?? phaseConfig.dataKey;
  const newSkills = enemySkillDbModule.getEnemySkills(skillPoolKey, skillPoolKey);
  if (newSkills && newSkills.length > 0) {
    const skillRuntime = buildPhaseSkillRuntime(newSkills, enemySkillDbModule.convertToMvuSkillFormat);
    targetEnemy.skills = skillRuntime.skills;
    console.info(options.skillLogLabel, skillRuntime.names);

    enemyRuntimeSkillCooldowns.value = skillRuntime.cooldowns;
    enemyRuntimeSkillEffects.value = skillRuntime.effects;
  }

  await persistCombatConfig(phaseConfig.displayName, phaseConfig.climaxLimit);

  return newEnemyData;
}

// 步骤3：执行转阶段逻辑（在文字播放完成后调用）
async function executePhaseTransitionLogic(nextPhase: 1 | 2 | 3) {
  if (isBattleFlowLocked()) {
    return;
  }

  const currentPhase = BossSystem.bossState.currentPhase;
  console.info(`[战斗界面] 执行阶段转换逻辑: ${currentPhase} -> ${nextPhase}`);

  // 执行阶段转换（更新BOSS状态）
  BossSystem.executePhaseTransition(nextPhase);

  // 获取新阶段的配置
  const phaseConfig = getMuxinlanPhaseConfig(nextPhase);

  // 添加阶段切换日志
  addLog(`【阶段切换】${enemy.value.name} 进入了新形态！`, 'system', 'critical');

  // 从数据库加载新阶段的敌人数据
  try {
    const newEnemyData = await loadAndApplyBossPhaseRuntime(phaseConfig, {
      updateAvatar: true,
      skillLogLabel: '[战斗界面] 加载新阶段技能:',
    });

    if (newEnemyData) {
      await applyBossPhaseSideEffectActions(
        createMuxinlanPhaseSideEffectActions({
          nextPhase,
          displayName: phaseConfig.displayName,
          enemyData: newEnemyData,
          playerStats: player.value.stats,
          talentContext: createTalentEffectContext(),
        }),
      );
    }
  } catch (e) {
    console.error('[战斗界面] BOSS阶段切换失败', e);
  }

  // 完成阶段转换
  BossSystem.completePhaseTransition();

  // 清除转换状态和特效
  isPhaseTransitioning.value = false;
  phaseTransitionEffect.value = null;

  // 重置回合状态，继续战斗
  if (isBattleFlowLocked()) {
    return;
  }
  turnState.phase = 'playerInput';
  addLog(`阶段切换完成，继续战斗...`, 'system', 'info');
}

// 完整的阶段转换流程（协调三个步骤）- 沐芯兰
async function handleBossPhaseTransition(nextPhase: 1 | 2 | 3) {
  const currentPhase = BossSystem.bossState.currentPhase;

  // 步骤1：锁血+换图（立即执行）
  lockHealthAndChangeAvatar(nextPhase);

  // 步骤2：播放锁血对话 + 转阶段对话（使用bossSystem.ts的对话系统）
  // 先播放lockHp对话，再播放phase_to对话
  const allDialogues = buildMuxinlanTransitionDialogues(currentPhase);

  // 播放所有对话
  if (allDialogues.length > 0) {
    BossSystem.queueDialogues(allDialogues);
  }

  // 步骤3：等待对话播放完成后执行转阶段逻辑
  // 计算等待时间：每句对话2.5秒
  const waitTime = getDialogueWaitTime(allDialogues);

  setTimeout(async () => {
    if (!isBattleFlowLocked()) {
      await executePhaseTransitionLogic(nextPhase);
    }
  }, waitTime);
}

// 克莉丝汀BOSS阶段转换流程
async function handleChristinePhaseTransition(nextPhase: 1 | 2) {
  const currentPhase = BossSystem.bossState.currentPhase;

  // 步骤1：锁血+换名（不换立绘）
  lockHealthAndChangeAvatarChristine(nextPhase);

  // 步骤2：播放锁血对话 + 转阶段对话
  const allDialogues = buildChristineTransitionDialogues(currentPhase as 1 | 2, nextPhase);

  // 播放所有对话
  if (allDialogues.length > 0) {
    BossSystem.queueDialogues(allDialogues);
  }

  // 步骤3：等待对话播放完成后执行转阶段逻辑
  const waitTime = getDialogueWaitTime(allDialogues);

  setTimeout(async () => {
    if (!isBattleFlowLocked()) {
      await executeChristinePhaseTransitionLogic(nextPhase);
    }
  }, waitTime);
}

// 克莉丝汀BOSS阶段转换逻辑
async function executeChristinePhaseTransitionLogic(nextPhase: 1 | 2) {
  if (isBattleFlowLocked()) {
    return;
  }

  const currentPhase = BossSystem.bossState.currentPhase;
  console.info(`[战斗界面] 克莉丝汀执行阶段转换逻辑: ${currentPhase} -> ${nextPhase}`);

  // 更新BOSS状态
  BossSystem.bossState.currentPhase = nextPhase;
  BossSystem.bossState.phaseTransitioning = false;

  // 获取新阶段的配置
  const phaseConfig = getChristinePhaseConfig(nextPhase);

  // 添加阶段切换日志
  addLog(`【阶段切换】${enemy.value.name} 人格切换！`, 'system', 'critical');

  // 从数据库加载新阶段的敌人数据
  try {
    const newEnemyData = await loadAndApplyBossPhaseRuntime(phaseConfig, {
      updateAvatar: false,
      skillLogLabel: '[战斗界面] 克莉丝汀加载新阶段技能:',
    });

    if (newEnemyData) {
      await applyBossPhaseSideEffectActions(createChristinePhaseSideEffectActions(nextPhase));
    }
  } catch (e) {
    console.error('[战斗界面] 克莉丝汀阶段转换数据加载失败', e);
  }

  // 清除转换状态
  isPhaseTransitioning.value = false;
  phaseTransitionEffect.value = null;

  // 重置回合状态，继续战斗
  if (isBattleFlowLocked()) {
    return;
  }
  turnState.phase = 'playerInput';
  addLog(`阶段切换完成，继续战斗...`, 'system', 'info');
}

async function maybeTriggerYamadaHanakoTrueNameRelease(nextPlayer: Character, nextEnemy: Character): Promise<boolean> {
  if (
    !BossSystem.shouldTriggerYamadaHanakoTrueNameRelease(nextEnemy.stats.currentPleasure, nextEnemy.stats.maxPleasure)
  ) {
    return false;
  }

  const phaseConfig = getYamadaHanakoPhaseConfig(2);
  BossSystem.executeYamadaHanakoTrueNameRelease();
  BossSystem.bossState.phaseTransitioning = true;
  isPhaseTransitioning.value = true;
  phaseTransitionEffect.value = phaseConfig.transitionEffect;

  addLog('【真名解放】山田花子的伪装被击碎，月下真名「西园寺辉夜」显现！', 'system', 'critical');
  addLog('【规则变更】快感清空，战斗数据切换为Lv75，技能池切换为真名形态。', 'system', 'critical');

  try {
    const newEnemyData = await loadAndApplyBossPhaseRuntime(phaseConfig, {
      updateAvatar: true,
      skillLogLabel: '[战斗界面] 山田花子真名解放技能池:',
      targetEnemy: nextEnemy,
    });

    if (newEnemyData) {
      nextPlayer.stats.maxClimaxCount = phaseConfig.climaxLimit;
      nextPlayer.stats.climaxCount = 0;
    }
  } catch (e) {
    console.error('[战斗界面] 山田花子真名解放失败', e);
    addLog('【真名解放】阶段数据加载失败，请检查山田花子数据配置。', 'system', 'critical');
  }

  turnState.climaxTarget = null;
  BossSystem.bossState.phaseTransitioning = false;
  isPhaseTransitioning.value = false;
  setTimeout(() => {
    phaseTransitionEffect.value = null;
  }, 1500);

  return true;
}

// 处理高潮后的逻辑（自动继续，不显示按钮）
async function processClimaxAfterLLM(targetIsEnemy: boolean) {
  if (isBattleFinished()) {
    return;
  }

  // 防止重复调用：如果已经在处理高潮，则直接返回
  if (turnState.climaxTarget !== null) {
    console.warn('[战斗界面] 高潮处理已在进行中，跳过重复调用');
    return;
  }

  const targetSide = getClimaxSide(targetIsEnemy);
  const char = targetIsEnemy ? enemy.value : player.value;

  // 再次检查快感是否真的达到最大值（防止重复触发）
  if (!hasReachedPleasureLimit(char)) {
    console.warn('[战斗界面] 快感未达到最大值，跳过高潮处理');
    return;
  }

  // 立即设置climaxTarget，防止重复调用
  turnState.climaxTarget = targetSide;

  // ==================== BOSS锁血和阶段切换检测 ====================
  // 必须在增加高潮次数之前检测，以实现锁血效果
  const bossTransition = getBossClimaxTransition({
    targetIsEnemy,
    bossState: BossSystem.bossState,
    enemy: enemy.value,
  });
  if (bossTransition) {
    if (bossTransition.bossId === 'muxinlan') {
      await handleBossPhaseTransition(bossTransition.nextPhase);
    } else {
      await handleChristinePhaseTransition(bossTransition.nextPhase);
    }

    await applyBossClimaxActions(createBossClimaxLockActions());
    return;
  }

  // ==================== 伊甸芙宁BOSS：沉睡状态高潮触发苏醒 ====================
  const edenAwakeningActions = createEdenAwakeningActions({
    targetIsEnemy,
    bossState: BossSystem.bossState,
    enemyName: enemy.value.name,
  });
  if (edenAwakeningActions.length > 0) {
    await applyBossClimaxActions(edenAwakeningActions);
    return;
  }

  // 检查坚持天赋效果（高潮时有概率不计入高潮次数）
  let preventClimaxCount = false;
  if (!targetIsEnemy && playerTalent.value) {
    const talentContext = createTalentEffectContext();
    const climaxResult = TalentSystem.processTalentOnClimax(playerTalent.value, talentContext);
    if (climaxResult.preventClimaxCount) {
      preventClimaxCount = true;
      addLog(`【${playerTalent.value.name}】触发：本次高潮不计入高潮次数！`, 'system', 'critical');
    }
  }

  // 直接修改stats对象，不使用cloneCharacter（确保Vue响应式更新）
  addClimaxLogs(
    settleClimaxCount({
      character: char,
      side: targetSide,
      preventClimaxCount,
    }).logs,
  );

  // 保存状态到MVU
  await saveToMvu();

  if (targetIsEnemy) {
    const climaxCounters = buildExorcismClimaxCounters(enemy.value.stats.climaxCount);
    const exorcismClimaxResult = await evaluateAndApplyExorcismMechanics('climaxCountAtLeast', { climaxCounters });
    if (exorcismClimaxResult.phaseChanged) {
      await saveToMvu();
    }
  }

  if (isBattleFinished()) {
    if (turnState.phase === 'victory' || turnState.phase === 'defeat') {
      await finishCombatAfterResult();
    }
    return;
  }

  // 检查并记录贤者时间状态
  try {
    const tempStates = await readPlayerTemporaryStatusList();
    if ('贤者时间' in tempStates) {
      addLog(`${char.name} 进入了贤者时间状态（持续${tempStates.贤者时间}回合）`, 'system', 'info');
      addLog(`${char.name} 的性斗力降低20%，忍耐力提升10%`, 'system', 'info');
    }

    // 检查虚脱状态（高潮次数只保存在本次战斗运行态）
    addClimaxLogs(createClimaxLimitStatusLogs(char));
  } catch (e) {
    console.warn('[战斗界面] 检查状态变化失败', e);
  }

  // 检查是否达到最大高潮次数（胜负判定）
  const climaxOutcome = getClimaxOutcomeAfterSettlement({
    targetSide,
    player: player.value,
    enemy: enemy.value,
    currentTurn: turnState.currentTurn,
  });
  if (climaxOutcome) {
    turnState.phase = climaxOutcome.phase;
    addClimaxLogs([climaxOutcome.log]);
    triggerEffect(climaxOutcome.effect);
    await finishCombatAfterResult();
    return;
  }

  // 高潮后继续战斗，进入下一回合
  addLog(`高潮结束，战斗继续...`, 'system', 'info');
  setTimeout(async () => {
    if (isBattleFinished()) {
      return;
    }

    turnState.climaxTarget = null;
    const climaxTriggered = await endTurn();
    if (!climaxTriggered && !isBattleFlowLocked()) {
      await startNewTurn();
    }
  }, 1500);
}

async function handleSkipTurn() {
  if (turnState.phase !== 'playerInput') {
    return;
  }

  showSurrenderMenu.value = false;

  const extraRecovery = Math.ceil(3 + player.value.stats.maxEndurance * 0.03);
  const oldPlayerEndurance = player.value.stats.currentEndurance;
  player.value.stats.currentEndurance = Math.min(
    player.value.stats.maxEndurance,
    player.value.stats.currentEndurance + extraRecovery,
  );
  if (player.value.stats.currentEndurance > oldPlayerEndurance) {
    addLog(
      `${player.value.name} 因跳过回合额外回复了 ${player.value.stats.currentEndurance - oldPlayerEndurance} 点体力`,
      'system',
      'info',
    );
  }

  // 被束缚时也可以跳过回合
  if (playerBoundTurns.value > 0) {
    addLog(`${player.value.name} 被束缚了，跳过回合`, 'system', 'info');
  } else {
    addLog(`${player.value.name} 选择了跳过回合`, 'system', 'info');
  }

  // ========== 七宗罪跳过回合效果 ==========
  const sinType = TalentSystem.getSinTalentType(playerTalent.value);
  if (sinType) {
    const talentContext = createTalentEffectContext();
    applySkipTurnActions(
      createSinSkipTurnActions({
        sinType,
        talentContext,
        maxPleasure: player.value.stats.maxPleasure,
      }),
    );
  }

  applyElizabethCommandActions(
    createElizabethSkipCommandActions({
      bossState: BossSystem.bossState,
      playerMaxEndurance: player.value.stats.maxEndurance,
    }),
  );

  // 保存状态
  await saveToMvu();

  // 检查玩家是否因七宗罪效果达到高潮
  if (player.value.stats.currentPleasure >= player.value.stats.maxPleasure && turnState.climaxTarget === null) {
    void triggerClimaxProcessing({
      characterName: player.value.name,
      targetIsEnemy: false,
      useProcessEllipsis: false,
    });
    return; // 高潮处理会负责后续流程
  }

  // 跳过回合，直接轮到对方行动
  turnState.phase = 'processing';
  setTimeout(() => {
    if (!isBattleFlowLocked()) {
      void handleEnemyTurn();
    }
  }, 1000);
}

function openPlayerPortraitPicker() {
  if (!playerPortraitInput.value) {
    return;
  }
  playerPortraitInput.value.click();
}

async function handlePlayerPortraitSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件');
    input.value = '';
    return;
  }

  if (file.size > 25 * 1024 * 1024) {
    alert('图片文件过大，请选择小于 25MB 的图片');
    input.value = '';
    return;
  }

  try {
    const objectUrl = await savePlayerCustomAvatarBlob(file);
    // 强制触发响应式更新：创建新对象
    player.value = {
      ...player.value,
      avatarUrl: objectUrl,
    };
    console.info('[战斗界面] 玩家立绘已更新');
  } catch (error) {
    console.error('[战斗界面] 玩家立绘保存失败:', error);
    alert('图片保存失败，请稍后重试或换一张图片');
  } finally {
    input.value = '';
  }
}

async function handleSurrender() {
  showSurrenderMenu.value = false;

  // BOSS第二阶段禁用投降
  if (isBossSurrenderDisabled.value) {
    addLog('「逃跑？在女王面前...你以为你有这个资格吗？」', 'enemy', 'critical');
    return;
  }

  // 七宗罪禁用投降
  if (isSinSurrenderDisabled.value) {
    const sinType = TalentSystem.getSinTalentType(playerTalent.value);
    const sinNames: Record<string, string> = { wrath: '暴怒', greed: '贪婪', pride: '傲慢' };
    addLog(`【七宗罪·${sinNames[sinType || ''] || ''}】无法投降！`, 'system', 'critical');
    return;
  }

  // allowSurrender为true时不可认输，false时允许认输
  if (allowSurrender.value) {
    addLog('不能逃跑！这是尊严之战！', 'system', 'info');
    return;
  }

  // 允许认输，结束战斗
  turnState.phase = 'defeat';
  addLog('你选择了投降...', 'system', 'info');
  addLog('--- 战斗结束 ---', 'system', 'info');
  await finishCombatAfterResult();
}

function toggleSurrenderMenu() {
  if (turnState.phase !== 'playerInput') {
    return;
  }

  if (isBossSurrenderDisabled.value) {
    addLog('「逃跑？在女王面前...你以为你有这个资格吗？」', 'enemy', 'critical');
    return;
  }

  showSurrenderMenu.value = !showSurrenderMenu.value;
}

async function handleSelfPleasure() {
  if (turnState.phase !== 'playerInput') {
    return;
  }

  showSurrenderMenu.value = false;

  const { before, after, increase } = calculateSelfPleasureChange(player.value.stats);
  player.value.stats.currentPleasure = after;

  addLog(
    `${player.value.name} 选择了在对手前自慰，快感从 ${before}/${player.value.stats.maxPleasure} 上升到 ${after}/${player.value.stats.maxPleasure}（+${increase}）。`,
    'system',
    'info',
  );

  await saveToMvu();

  if (turnState.phase === 'playerInput') {
    turnState.phase = 'processing';
    setTimeout(() => {
      if (turnState.phase === 'processing' && !isBattleFlowLocked()) {
        void handleEnemyTurn();
      }
    }, 1000);
  }
}

async function handleTempted() {
  if (turnState.phase !== 'playerInput') {
    return;
  }

  showSurrenderMenu.value = false;

  await applyTalentBuff('player', '被诱惑', createTemptedStatusBonus(player.value.stats), 2);

  addLog(`${player.value.name} 被对手诱惑，意识一阵恍惚，身心都被压制了一截（全属性降低）。`, 'system', 'critical');

  await saveToMvu();
  turnState.phase = 'processing';
  setTimeout(() => {
    if (turnState.phase === 'processing' && !isBattleFlowLocked()) {
      void handleEnemyTurn();
    }
  }, 1000);
}

async function handleTribute() {
  if (turnState.phase !== 'playerInput') {
    return;
  }

  showSurrenderMenu.value = false;

  const { expLoss, coinLoss } = rollTributePenalty();

  try {
    await deductPlayerExpAndCoins(expLoss, coinLoss);
  } catch (e) {
    console.warn('[战斗界面] 上贡扣除经验/金币失败', e);
  }

  addLog(`${player.value.name} 选择了给对手上贡，经验 -${expLoss}，金币 -${coinLoss}。`, 'system', 'info');

  await saveToMvu();
  turnState.phase = 'processing';
  setTimeout(() => {
    if (turnState.phase === 'processing' && !isBattleFlowLocked()) {
      void handleEnemyTurn();
    }
  }, 1000);
}

// ================= 状态监听 =================
watch(
  [
    () => player.value.stats.currentPleasure,
    () => player.value.stats.currentEndurance,
    () => enemy.value.stats.currentPleasure,
    () => enemy.value.stats.currentEndurance,
  ],
  () => {
    if (turnState.phase === 'climaxResolution' || isBattleFinished()) return;

    // 检查高潮（自动处理，不显示按钮）
    // 注意：如果climaxTarget已经设置，说明正在处理高潮，跳过检查
    if (turnState.climaxTarget === null) {
      if (enemy.value.stats.currentPleasure >= enemy.value.stats.maxPleasure) {
        void triggerClimaxProcessing({ characterName: enemy.value.name, targetIsEnemy: true });
        return;
      }
      if (player.value.stats.currentPleasure >= player.value.stats.maxPleasure) {
        void triggerClimaxProcessing({ characterName: player.value.name, targetIsEnemy: false });
        return;
      }
    }
  },
);

async function refreshPlayerAvatar() {
  try {
    const customAvatarUrl = await resolvePlayerCustomAvatar();
    const galleryAvatarUrl = resolvePlayerGalleryPortraitUrl(player.value.name);
    const avatarUrl = customAvatarUrl || galleryAvatarUrl;
    if (avatarUrl) {
      player.value = {
        ...player.value,
        avatarUrl,
      };
      if (!customAvatarUrl && galleryAvatarUrl) {
        console.info('[战斗界面] 已根据玩家姓名匹配图库立绘:', player.value.name, galleryAvatarUrl);
      }
    }
  } catch (error) {
    console.warn('[战斗界面] 玩家头像加载失败:', error);
  }
}

watch(
  [
    () => player.value.stats.currentEndurance,
    () => player.value.stats.currentPleasure,
    () => enemy.value.stats.currentEndurance,
    () => enemy.value.stats.currentPleasure,
  ],
  ([playerStamina, playerPleasure, enemyStamina, enemyPleasure], oldValues) => {
    if (!oldValues) {
      return;
    }

    const changes: Array<{
      target: ResourcePopupTarget;
      resource: ResourcePopupKind;
      current: number;
      previous: number;
    }> = [
      { target: 'player', resource: 'stamina', current: playerStamina, previous: oldValues[0] },
      { target: 'player', resource: 'pleasure', current: playerPleasure, previous: oldValues[1] },
      { target: 'enemy', resource: 'stamina', current: enemyStamina, previous: oldValues[2] },
      { target: 'enemy', resource: 'pleasure', current: enemyPleasure, previous: oldValues[3] },
    ];

    changes.forEach(change => {
      const delta = change.current - change.previous;
      if (consumeResourcePopupSuppression(change.target, change.resource, delta)) {
        return;
      }
      pushResourcePopup(change.target, change.resource, delta);
    });
  },
);

// ================= 初始化 =================
onMounted(async () => {
  // 重置BOSS状态，确保重新进入战斗时状态正确
  BossSystem.resetBossState();

  await loadFromMvu();

  // 优先保留 MVU 中的角色基础._姓名，避免默认聊天名“玩家”覆盖专名立绘。
  const userName = getUserName();
  if (userName && userName !== '玩家') {
    player.value.name = userName;
  }
  await refreshPlayerAvatar();

  // 重新计算所有属性（包括加成）
  await reloadStatusFromMvu();

  // 初始化粒子封印画布
  if (sealCanvas.value) {
    sealCanvas.value.width = window.innerWidth;
    sealCanvas.value.height = window.innerHeight;
  }

  addLog(`遭遇了 ${enemy.value.name} !`, 'system', 'info');
  addLog(`--- 战斗开始 ---`, 'system', 'info');

  const exorcismBattleStart = await evaluateAndApplyExorcismMechanics('battleStart');
  const exorcismPhaseEnter = await evaluateAndApplyExorcismMechanics('phaseEnter');
  const exorcismPlayerGender = await evaluateAndApplyExorcismMechanics('playerGenderIs');
  const exorcismCompanionPresent = await evaluateAndApplyExorcismMechanics('companionPresent');
  const exorcismRelationship = await evaluateAndApplyExorcismMechanics('relationshipAtLeast');
  const exorcismCompanionMissing = await evaluateAndApplyExorcismMechanics('companionMissing');
  if (
    exorcismBattleStart.skipBattle ||
    exorcismBattleStart.triggeredBadEnd ||
    exorcismPhaseEnter.skipBattle ||
    exorcismPhaseEnter.triggeredBadEnd ||
    exorcismPlayerGender.skipBattle ||
    exorcismPlayerGender.triggeredBadEnd ||
    exorcismCompanionPresent.skipBattle ||
    exorcismCompanionPresent.triggeredBadEnd ||
    exorcismRelationship.skipBattle ||
    exorcismRelationship.triggeredBadEnd ||
    exorcismCompanionMissing.skipBattle ||
    exorcismCompanionMissing.triggeredBadEnd
  ) {
    return;
  }

  if (await tryRunCompanionCooperationAtTurnStart()) {
    return;
  }

  // 随机选择对方技能，进行预告；驱魔机制强制技能优先。
  if (!turnState.enemyIntention) {
    determineEnemyIntention();
  }
  if (turnState.enemyIntention) {
    addLog(`预告：${enemy.value.name} 准备使用 ${turnState.enemyIntention.name}`, 'system', 'info');
  }

  // 处理天赋战斗开始效果
  if (playerTalent.value) {
    const talentContext = createTalentEffectContext();
    TalentSystem.processTalentOnBattleStart(playerTalent.value, talentContext);

    // ========== 七宗罪-嫉妒：战斗开始时属性比较 ==========
    const sinType = TalentSystem.getSinTalentType(playerTalent.value);
    if (sinType === 'envy') {
      const envyResult = TalentSystem.processEnvyOnBattleStart(
        talentContext,
        {
          sexPower: player.value.stats.sexPower,
          endurance: player.value.stats.baseEndurance,
          charm: player.value.stats.charm,
          luck: player.value.stats.luck,
          evasion: player.value.stats.evasion,
          crit: player.value.stats.crit,
        },
        {
          sexPower: enemy.value.stats.sexPower,
          endurance: enemy.value.stats.baseEndurance,
          charm: enemy.value.stats.charm,
          luck: enemy.value.stats.luck,
          evasion: enemy.value.stats.evasion,
          crit: enemy.value.stats.crit,
        },
      );
      playerTalentState.value = { ...talentContext.talentState };

      // 应用嫉妒效果
      for (const effect of envyResult.effects) {
        addLog(`【七宗罪·嫉妒】${effect.message}`, 'system', effect.isBonus ? 'buff' : 'critical');
        // 应用属性修改
        const bonusKey = effect.attribute + '加成';
        applyTalentBuff('player', `天赋_嫉妒_${effect.attribute}`, { [bonusKey]: effect.value }, 999);
      }
    }

    // ========== 七宗罪-傲慢：战斗开始时全属性比较 ==========
    if (sinType === 'pride') {
      const playerStats = {
        sexPower: player.value.stats.sexPower,
        endurance: player.value.stats.baseEndurance,
        charm: player.value.stats.charm,
        luck: player.value.stats.luck,
        evasion: player.value.stats.evasion,
        crit: player.value.stats.crit,
      };
      const enemyStats = {
        sexPower: enemy.value.stats.sexPower,
        endurance: enemy.value.stats.baseEndurance,
        charm: enemy.value.stats.charm,
        luck: enemy.value.stats.luck,
        evasion: enemy.value.stats.evasion,
        crit: enemy.value.stats.crit,
      };
      const statNames: Record<string, string> = {
        sexPower: '基础性斗力',
        endurance: '基础忍耐力',
        charm: '魅力',
        luck: '幸运',
        evasion: '闪避率',
        crit: '暴击率',
      };

      for (const [key, playerVal] of Object.entries(playerStats)) {
        const enemyVal = enemyStats[key as keyof typeof enemyStats];
        const displayName = statNames[key];
        // 只有性斗力和忍耐力使用"成算"，其他使用"加成"
        const isSexPowerOrEndurance = key === 'sexPower' || key === 'endurance';
        const bonusSuffix = isSexPowerOrEndurance ? '成算' : '加成';
        const bonusValue = isSexPowerOrEndurance ? 20 : Math.floor(playerVal * 0.2); // 成算用百分比，加成用实际值

        if (playerVal > enemyVal) {
          // 自身属性高于对手，+20%
          const actualBonus = isSexPowerOrEndurance ? 20 : bonusValue;
          addLog(
            `【七宗罪·傲慢】${displayName}：自身(${playerVal}) > 对手(${enemyVal})，${displayName}+${isSexPowerOrEndurance ? '20%' : actualBonus}`,
            'system',
            'buff',
          );
          applyTalentBuff('player', `天赋_傲慢_${displayName}`, { [`${displayName}${bonusSuffix}`]: actualBonus }, 999);
        } else if (playerVal < enemyVal) {
          // 自身属性低于对手，-20%
          const actualPenalty = isSexPowerOrEndurance ? -20 : -bonusValue;
          addLog(
            `【七宗罪·傲慢】${displayName}：自身(${playerVal}) < 对手(${enemyVal})，${displayName}${isSexPowerOrEndurance ? '-20%' : actualPenalty}`,
            'system',
            'critical',
          );
          applyTalentBuff(
            'player',
            `天赋_傲慢_${displayName}`,
            { [`${displayName}${bonusSuffix}`]: actualPenalty },
            999,
          );
        }
      }
    }

    // 应用被动天赋效果到临时状态（如压迫感减少敌人闪避、极限爆发的性斗力加成等）
    const passiveModifiers = TalentSystem.getTalentPassiveModifiers(playerTalent.value, {
      playerPleasure: player.value.stats.currentPleasure,
      playerMaxPleasure: player.value.stats.maxPleasure,
      playerStamina: player.value.stats.currentEndurance,
      playerMaxStamina: player.value.stats.maxEndurance,
      enemyPleasure: enemy.value.stats.currentPleasure,
      enemyMaxPleasure: enemy.value.stats.maxPleasure,
    });

    // 压迫感：降低敌人闪避率
    if (passiveModifiers.enemyDodgeReduction > 0) {
      applyTalentBuff('enemy', '天赋_压迫感', { 闪避率加成: -passiveModifiers.enemyDodgeReduction }, 999);
      addLog(`【${playerTalent.value.name}】敌人闪避率降低${passiveModifiers.enemyDodgeReduction}%`, 'system', 'info');
    }

    addLog(`【天赋】${playerTalent.value.name} 已激活`, 'system', 'info');
  }

  // ========== 敌人七宗罪天赋处理 ==========
  const enemySinType = TalentSystem.getEnemySinTalentType(enemy.value.name);
  if (enemySinType) {
    // 克莉丝汀是隐藏BOSS，不显示敌人天赋日志
    const isChristineHiddenBoss = BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'christine';
    if (!isChristineHiddenBoss) {
      addLog(
        `【敌人天赋】${enemy.value.name} 拥有七宗罪天赋：${getSinTalentDisplayName(enemySinType)}`,
        'system',
        'critical',
      );
    }

    // 嫉妒：战斗开始时属性比较（敌人视角：敌人与玩家比较）
    if (enemySinType === 'envy') {
      const talentContext = createTalentEffectContext();
      const envyResult = TalentSystem.processEnvyOnBattleStart(
        talentContext,
        // 敌人的属性（作为"自身"）
        {
          sexPower: enemy.value.stats.sexPower,
          endurance: enemy.value.stats.baseEndurance,
          charm: enemy.value.stats.charm,
          luck: enemy.value.stats.luck,
          evasion: enemy.value.stats.evasion,
          crit: enemy.value.stats.crit,
        },
        // 玩家的属性（作为"对手"）
        {
          sexPower: player.value.stats.sexPower,
          endurance: player.value.stats.baseEndurance,
          charm: player.value.stats.charm,
          luck: player.value.stats.luck,
          evasion: player.value.stats.evasion,
          crit: player.value.stats.crit,
        },
      );

      // 应用嫉妒效果到敌人
      for (const effect of envyResult.effects) {
        addLog(`【敌人·嫉妒】${effect.message}`, 'system', effect.isBonus ? 'buff' : 'critical');
        const bonusKey = effect.attribute + '加成';
        applyTalentBuff('enemy', `敌人天赋_嫉妒_${effect.attribute}`, { [bonusKey]: effect.value }, 999);
      }
    }

    // 暴怒：克莉丝汀专属（仅第二阶段触发）
    // 第一阶段不触发暴怒效果，第二阶段才激活
    // 克莉丝汀是隐藏BOSS，第一阶段不显示任何暴怒相关日志
    if (enemySinType === 'wrath') {
      // 克莉丝汀BOSS战：第一阶段不激活暴怒，第二阶段才激活
      if (BossSystem.bossState.isBossFight && BossSystem.bossState.bossId === 'christine') {
        if (BossSystem.bossState.currentPhase === 1) {
          // 隐藏BOSS第一阶段，不显示任何天赋相关日志
        } else {
          // 第二阶段：激活暴怒效果
          applyTalentBuff('enemy', '敌人天赋_暴怒_闪避归零', { 闪避率加成: -999 }, 999);
          addLog(
            `【敌人·暴怒】${enemy.value.name} 暴怒觉醒！闪避率归零，所有攻击连击+1，必定暴击！`,
            'system',
            'critical',
          );
        }
      }
    }
  }
});

// 获取七宗罪天赋显示名称
function getSinTalentDisplayName(sinType: string): string {
  const names: Record<string, string> = {
    lust: '色欲',
    wrath: '暴怒',
    envy: '嫉妒',
    sloth: '懒惰',
    pride: '傲慢',
    gluttony: '暴食',
    greed: '贪婪',
  };
  return names[sinType] || sinType;
}
</script>

<style lang="scss" scoped>
.combat-wrapper {
  position: relative;
  min-height: 100vh;
  background: #09090b;
  font-family: 'Noto Sans SC', system-ui, sans-serif;
  color: #e2e8f0;
  overflow-x: hidden;
}

// ========== 顶部标题 ==========
.combat-header {
  position: relative;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.9rem 1.5rem;
  background: linear-gradient(to bottom, rgba(9, 9, 11, 0.95), transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.terminal-icon {
  color: #c084fc;
}

.title {
  font-size: 1.45rem;
  font-weight: 900;
  letter-spacing: -0.025em;
  background: linear-gradient(135deg, #c084fc, #f472b6, #fb7185);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 30px rgba(192, 132, 252, 0.5);
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.turn-counter {
  font-size: 1.45rem;
  font-family: ui-monospace, monospace;
  font-weight: 900;
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 20px rgba(96, 165, 250, 0.5);
  letter-spacing: 0.05em;
}

.phase-indicator {
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 600;
  margin-top: 0.25rem;
}

// ========== 战斗区域 ==========
.combat-arena {
  position: relative;
  z-index: 10;
  max-width: 72rem;
  margin: 0 auto;
  padding: 1.25rem 1rem;
  padding-bottom: 0.9rem;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: center;
  gap: 0.75rem;

  @media (max-width: 640px) {
    padding-bottom: 0.75rem;
  }
}

.floating-log-panel {
  position: absolute;
  top: 6.4rem;
  right: 0;
  z-index: 55;
  width: auto;
  pointer-events: auto;

  @media (max-width: 640px) {
    top: 5.25rem;
  }
}

.vs-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0.3;
  padding-top: 4rem;
  flex-shrink: 0;
  width: 8%;
}

.divider-line {
  height: 6rem;
  width: 1px;
  background: linear-gradient(to bottom, transparent, white, transparent);
}

.vs-text {
  margin: 0.75rem 0;
  font-weight: 900;
  font-size: 1.5rem;
  font-style: italic;
  font-family: ui-monospace, monospace;
  color: rgba(255, 255, 255, 0.5);
}

// ========== 底部操作区 ==========
.combat-footer {
  position: sticky;
  bottom: 0;
  width: 100%;
  z-index: 30;
  background: linear-gradient(to top, rgba(9, 9, 11, 0.98), rgba(9, 9, 11, 0.85));
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(30px) saturate(180%);
  padding: 0.6rem 1rem 0.75rem;
  box-shadow:
    0 -20px 60px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;

  @media (max-width: 640px) {
    padding: 0.45rem 0.65rem 0.65rem;
  }
}

.footer-content {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  display: flex;
  flex-direction: column-reverse;
  gap: 0.5rem;
}

.action-section {
  flex: 1;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.action-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.tab-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 640px) {
    padding: 0.35rem 0.9rem;
    font-size: 0.7rem;
    letter-spacing: 0.06em;
  }

  &.active {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
    color: white;
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  }

  &:hover:not(.active) {
    color: white;
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }
}

.tab-divider {
  height: 1px;
  width: 2rem;
  background: rgba(255, 255, 255, 0.2);
}

.action-hint {
  font-size: 0.75rem;
  color: #94a3b8;
}

.waiting-text {
  font-size: 0.875rem;
  color: #64748b;
  animation: pulse 2s ease-in-out infinite;
}

.action-grid {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.processing-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.05);

  span {
    color: rgba(255, 255, 255, 0.5);
    font-family: ui-monospace, monospace;
    letter-spacing: 0.1em;
  }
}

// 技能菜单样式
.menu-skills {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.15rem;
  // max-height constraint removed as per user request

  // 自定义滚动条
  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

// ========== 菜单样式 ==========
.menu-main {
  display: flex;
  gap: 0.5rem;
  height: 100%;
  width: 100%;
}

.surrender-stack {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.surrender-submenu {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.surrender-sub-btn {
  width: 100%;
  padding: 0.55rem 0.75rem;
  font-size: 0.95rem;
  border-radius: 0.75rem;
}

.portrait-upload-btn {
  width: 100%;
  text-transform: none;
}

.hidden-file-input {
  display: none;
}

.menu-skills,
.menu-items,
.menu-equipment {
  display: flex;
  gap: 0.4rem;
  height: 100%;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;

  // Webkit浏览器滚动条样式
  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.menu-card {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem 1rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  user-select: none;
  position: relative;

  @media (max-width: 640px) {
    gap: 0.5rem;
    padding: 1rem 0.65rem;
    border-radius: 0.9rem;
    font-size: 0.85rem;

    svg {
      width: 26px;
      height: 26px;
    }

    span {
      font-size: 0.8rem;
      line-height: 1.1;
    }
  }
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent);
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover::before {
    opacity: 1;
  }

  &:hover {
    transform: translateY(-4px) scale(1.02);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  }

  span {
    font-weight: 700;
    white-space: nowrap;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.9);
  }

  svg {
    transition: transform 0.3s;
  }

  &:hover svg {
    transform: scale(1.1) rotate(5deg);
  }
}

.icon-blue {
  color: #38bdf8;
}
.icon-green {
  color: #4ade80;
}
.icon-yellow {
  color: #fbbf24;
}
.icon-red {
  color: #f87171;
}
.icon-violet {
  color: #a78bfa;
}

.skill-card,
.item-card {
  flex: 0 0 auto; // 不允许收缩，保持固定宽度
  min-width: 205px;
  max-width: 240px;
  width: 205px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;

  &:hover:not(.disabled) {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.05));
  }

  &.disabled {
    opacity: 0.5;
    filter: grayscale(0.7);
    cursor: not-allowed;
  }
}

.skill-card {
  justify-content: flex-start;
  gap: 0.5rem;
  min-height: 8.25rem;
  overflow: visible;

  &.bound-blocked {
    cursor: not-allowed;
    border-color: rgba(248, 113, 113, 0.18);
    box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.08);
  }

  &.unusable-shake {
    animation: unusableSkillShake 0.38s linear;
  }
}

.equipment-skill-card {
  width: 260px;
  min-width: 260px;
  max-width: 300px;
  height: calc(100% - 0.25rem);
  min-height: 9.75rem;
  overflow-x: hidden;
  overflow-y: auto;
  border-color: rgba(167, 139, 250, 0.2);
  scrollbar-width: thin;
  scrollbar-color: rgba(167, 139, 250, 0.42) transparent;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(167, 139, 250, 0.38);
    border-radius: 999px;
  }

  .skill-stats-row {
    margin-top: 0.25rem;
  }
}

.equipment-source {
  margin: -0.2rem 0 0;
  color: #a78bfa;
  font-size: 0.62rem;
  line-height: 1.2;
}

.equipment-skill-name {
  color: #c4b5fd;
}

.skill-effect-tooltip {
  position: fixed;
  z-index: 120;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.55rem;
  overflow-y: auto;
  transform: translateY(calc(-100% - 0.55rem));
  border-radius: 0.45rem;
  background: rgba(2, 6, 23, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.32);
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.48),
    0 0 0 1px rgba(255, 255, 255, 0.06) inset;
  backdrop-filter: blur(12px);
  animation: skillTooltipIn 0.16s ease-out;
  cursor: default;
  pointer-events: none;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
}

.skill-effect-tooltip-title {
  font-size: 0.68rem;
  line-height: 1;
  font-weight: 800;
  color: #e2e8f0;
}

.skill-effect-tooltip-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-left: 0.45rem;
  border-left: 2px solid rgba(148, 163, 184, 0.35);

  &.tone-buff {
    border-left-color: rgba(74, 222, 128, 0.75);
  }

  &.tone-debuff,
  &.tone-control {
    border-left-color: rgba(248, 113, 113, 0.75);
  }

  &.tone-resource {
    border-left-color: rgba(56, 189, 248, 0.75);
  }

  &.tone-special {
    border-left-color: rgba(251, 191, 36, 0.78);
  }

  p {
    margin: 0;
    color: #cbd5e1;
    font-size: 0.66rem;
    line-height: 1.32;
  }
}

.skill-effect-tooltip-label {
  color: #f8fafc;
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1.15;
  word-break: break-word;
}

.cooldown-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(2px);

  svg {
    color: #38bdf8;
    margin-bottom: 0.25rem;
    animation: pulse 2s ease-in-out infinite;
  }
}

.cooldown-count {
  font-size: 1.5rem;
  font-weight: 900;
  color: white;
  letter-spacing: -0.05em;

  small {
    font-size: 0.625rem;
    margin-left: 2px;
    vertical-align: top;
    opacity: 0.6;
    font-weight: normal;
  }
}

.skill-header,
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.15rem;
}

.skill-name {
  font-weight: 700;
  font-size: 0.875rem;
  color: #38bdf8;
  overflow: hidden;
  text-overflow: ellipsis;

  &.skill-disabled {
    color: #94a3b8;
  }
}

.skill-cost {
  font-size: 0.625rem;
  font-family: ui-monospace, monospace;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  white-space: nowrap;

  &.cost-danger {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
}

.skill-desc {
  font-size: 0.75rem;
  color: #cbd5e1;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.equipment-skill-card .skill-desc.equipment-skill-desc {
  display: block;
  -webkit-line-clamp: initial;
  -webkit-box-orient: initial;
  overflow: visible;
  color: #dbe4ff;
  font-size: 0.72rem;
  line-height: 1.5;
  white-space: normal;
  word-break: break-word;
}

.item-desc {
  font-size: 0.625rem;
  color: #94a3b8;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.skill-type {
  margin-top: 0.5rem;
  font-size: 0.625rem;
  text-transform: uppercase;
  font-weight: 700;
  color: #64748b;
  transition: color 0.2s;

  &.type-disabled {
    color: #475569;
  }
}

// 技能稀有度徽章
.skill-rarity {
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  margin-left: 0.5rem;

  &.rarity-c {
    background: rgba(100, 116, 139, 0.3);
    color: #94a3b8;
    border: 1px solid rgba(100, 116, 139, 0.5);
  }

  &.rarity-b {
    background: rgba(56, 189, 248, 0.2);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.4);
  }

  &.rarity-a {
    background: rgba(168, 85, 247, 0.2);
    color: #a855f7;
    border: 1px solid rgba(168, 85, 247, 0.4);
  }

  &.rarity-s {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.3));
    color: #fbbf24;
    border: 1px solid rgba(251, 191, 36, 0.5);
    text-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
  }

  &.rarity-ss {
    background: linear-gradient(135deg, rgba(248, 113, 113, 0.28), rgba(220, 38, 38, 0.28));
    color: #f87171;
    border: 1px solid rgba(248, 113, 113, 0.55);
    text-shadow: 0 0 10px rgba(248, 113, 113, 0.55);
  }

  &.rarity-sss {
    background: linear-gradient(135deg, rgba(250, 204, 21, 0.32), rgba(217, 119, 6, 0.26));
    color: #fde68a;
    border: 1px solid rgba(250, 204, 21, 0.62);
    text-shadow: 0 0 10px rgba(250, 204, 21, 0.5);
  }

  &.rarity-ex {
    background: linear-gradient(135deg, rgba(196, 181, 253, 0.34), rgba(244, 114, 182, 0.26));
    color: #f5d0fe;
    border: 1px solid rgba(216, 180, 254, 0.65);
    text-shadow: 0 0 12px rgba(216, 180, 254, 0.55);
  }
}

// 技能等级
.skill-level {
  font-size: 0.5rem;
  font-weight: 600;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
  margin-left: 0.25rem;
}

// 技能属性行
.skill-stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: auto;
  padding: 0.35rem 0.4rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.375rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;

  svg {
    opacity: 0.8;
  }

  &.cost {
    color: #4ade80;

    &.cost-danger {
      color: #f87171;
    }

    &.cost-multiplied {
      color: #fbbf24;
      background: rgba(234, 179, 8, 0.15);
      border: 1px solid rgba(234, 179, 8, 0.3);
    }

    .cost-multiplier {
      font-size: 0.5rem;
      color: #f87171;
      font-weight: 700;
      margin-left: 0.25rem;
    }
  }

  &.cooldown {
    color: #38bdf8;
  }

  &.accuracy {
    color: #fbbf24;
  }

  &.equipment-use {
    color: #c4b5fd;
  }

  &.equipment-free {
    color: #facc15;
  }
}

.item-name {
  font-weight: 700;
  font-size: 0.875rem;
  color: #4ade80;
}

@keyframes skillTooltipIn {
  from {
    opacity: 0;
    transform: translateY(calc(-100% - 0.35rem)) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(calc(-100% - 0.55rem)) scale(1);
  }
}

@keyframes unusableSkillShake {
  0%,
  100% {
    transform: translateX(0);
  }
  10% {
    transform: translateX(-7px);
  }
  20% {
    transform: translateX(7px);
  }
  30% {
    transform: translateX(-6px);
  }
  40% {
    transform: translateX(6px);
  }
  50% {
    transform: translateX(-5px);
  }
  60% {
    transform: translateX(5px);
  }
  75% {
    transform: translateX(-3px);
  }
  90% {
    transform: translateX(2px);
  }
}

.item-quantity {
  font-size: 0.625rem;
  font-family: ui-monospace, monospace;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  background: rgba(16, 185, 129, 0.4);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #bbf7d0;
}

.item-effect {
  margin-top: 0.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.625rem;
}

.effect-stamina {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 0.25rem;
  color: #4ade80;
  font-weight: 600;

  svg {
    width: 12px;
    height: 12px;
  }
}

.effect-pleasure {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  background: rgba(236, 72, 153, 0.15);
  border: 1px solid rgba(236, 72, 153, 0.3);
  border-radius: 0.25rem;
  color: #f472b6;
  font-weight: 600;

  svg {
    width: 12px;
    height: 12px;
  }
}

.back-btn {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: #cbd5e1;
  min-width: 60px;
  flex-shrink: 0; // 防止返回按钮被压缩
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0.75rem 1rem;

  &:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.1));
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateX(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

.empty-items {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.empty-text {
  color: #64748b;
  font-size: 0.875rem;
  text-align: center;
}

// ========== 高潮弹窗 ==========
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: fadeIn 0.3s ease;
}

.climax-modal {
  background: linear-gradient(to bottom, rgba(88, 28, 135, 0.9), black);
  border: 1px solid rgba(168, 85, 247, 0.5);
  border-radius: 1rem;
  padding: 2.5rem;
  max-width: 28rem;
  width: 100%;
  box-shadow: 0 0 50px rgba(168, 85, 247, 0.3);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.modal-bg-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.1;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23fff' fill-opacity='0.1'/%3E%3C/svg%3E");
  pointer-events: none;
}

.climax-icon {
  color: #ec4899;
  margin: 0 auto 1rem;
  animation: pulse 1.5s ease-in-out infinite;
}

.climax-title {
  font-size: 1.875rem;
  font-weight: 900;
  color: white;
  margin-bottom: 0.5rem;
  letter-spacing: -0.025em;
}

.climax-desc {
  color: #e9d5ff;
  margin-bottom: 2rem;
  font-size: 0.875rem;
}

.climax-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn {
  width: 100%;
  padding: 1rem;
  font-weight: 700;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.btn-process {
  background: linear-gradient(135deg, #db2777, #ec4899);
  color: white;
  box-shadow:
    0 8px 24px rgba(219, 39, 119, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.05em;

  &:hover {
    background: linear-gradient(135deg, #ec4899, #f472b6);
    transform: translateY(-2px);
    box-shadow:
      0 12px 32px rgba(219, 39, 119, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.2) inset;
  }

  &:active {
    transform: translateY(0);
  }
}

.btn-skip {
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.05);

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
}

// ========== 结果遮罩 ==========
.result-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: max(20px, env(safe-area-inset-top, 0px)) 20px calc(20px + env(safe-area-inset-bottom, 0px)) 20px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  animation: fadeIn 0.3s ease;
}

.result-content {
  text-align: center;
  padding: 2.4rem 1.6rem;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(9, 9, 11, 0.98));
  border-radius: 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  backdrop-filter: blur(30px);
  max-width: 400px;
  width: 72%;
  position: relative;
  overflow: hidden;
  margin-top: 20px;
  margin-bottom: 20px;

  @media (min-height: 600px) {
    margin-top: max(40px, 10vh);
  }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.05), transparent 70%);
    pointer-events: none;
  }
}

.result-title {
  font-size: 4.5rem;
  font-weight: 900;
  margin-bottom: 1rem;
  letter-spacing: -0.05em;
  text-shadow: 0 0 40px currentColor;
  position: relative;
  z-index: 1;

  &.victory {
    background: linear-gradient(135deg, #fde047, #f59e0b, #f97316);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 20px rgba(253, 224, 71, 0.5));
  }

  &.defeat {
    background: linear-gradient(135deg, #94a3b8, #64748b, #475569);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 20px rgba(148, 163, 184, 0.3));
  }
}

.result-subtitle {
  font-size: 1.5rem;
  color: #cbd5e1;
  font-weight: 400;
  letter-spacing: 0.15em;
  margin-bottom: 2rem;
  text-transform: uppercase;
  position: relative;
  z-index: 1;
  opacity: 0.8;
}

.cg-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto 2rem;
  border-radius: 1rem;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 1;

  @media (max-width: 640px) {
    max-width: 100%;
    margin-bottom: 1.5rem;
  }
}

.cg-image {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
  background: rgba(0, 0, 0, 0.3);
}

.restart-btn {
  padding: 0.75rem 2rem;
  background: white;
  color: black;
  font-weight: 700;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }
}

// ========== 动画 ==========
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

// ========== BOSS文字特效样式 ==========
.boss-text-overlay {
  position: fixed;
  top: 35%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 60px;
  font-weight: 900;
  color: #ff1493;
  opacity: 0;
  pointer-events: none;
  z-index: 100;
  text-shadow:
    0 0 20px #ff1493,
    0 0 40px #dc143c,
    2px 2px 0 #000;
  letter-spacing: 10px;
  font-family: 'Courier New', monospace;

  &.active {
    animation: bossTextSlam 2.5s ease-out forwards;
  }
}

.boss-text-overlay.boss-text-muxinlan {
  font-size: 44px;
  letter-spacing: 6px;
}

.boss-text-overlay.boss-text-christine {
  font-size: 40px;
  letter-spacing: 4px;
  color: #c084fc; // 紫色调，符合克莉丝汀的女王形象
  text-shadow:
    0 0 20px rgba(192, 132, 252, 0.8),
    0 0 40px rgba(192, 132, 252, 0.4);
}

.boss-text-overlay.boss-text-eden {
  font-size: 38px;
  letter-spacing: 5px;
  color: #60a5fa; // 水蓝色调，符合伊甸芙宁的水系形象
  text-shadow:
    0 0 20px rgba(96, 165, 250, 0.8),
    0 0 40px rgba(96, 165, 250, 0.4),
    0 0 60px rgba(59, 130, 246, 0.3);
  font-family: 'Comic Sans MS', 'Segoe UI', sans-serif; // 符合她的二次元显眼包风格
}

@keyframes bossTextSlam {
  0% {
    transform: translateX(-50%) scale(3);
    opacity: 0;
    filter: blur(10px);
  }
  30% {
    transform: translateX(-50%) scale(1);
    opacity: 1;
    filter: blur(0px);
  }
  70% {
    transform: translateX(-50%) scale(1);
    opacity: 1;
    filter: blur(0px);
  }
  80% {
    transform: translateX(-50%) scale(1);
    opacity: 0.8;
    filter: blur(2px);
  }
  85% {
    transform: translateX(-50%) scale(1);
    opacity: 0.5;
    filter: blur(5px);
  }
  90% {
    transform: translateX(-50%) scale(1);
    opacity: 0.2;
    filter: blur(8px);
  }
  100% {
    transform: translateX(-50%) scale(1);
    opacity: 0;
    filter: blur(10px);
  }
}

// ========== 粒子封印画布 ==========
.seal-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 50;
}

// ========== 封印效果（按钮暗淡） ==========
.is-sealed {
  filter: grayscale(1) brightness(0.3) contrast(1.2) !important;
  pointer-events: none !important;
  cursor: not-allowed !important;
  transition: filter 0.5s ease;
}

// ========== 装备技释放特效 ==========
.equipment-skill-visual {
  position: fixed;
  inset: 0;
  z-index: 89;
  pointer-events: none;
  overflow: hidden;
  --skill-primary: #a78bfa;
  --skill-secondary: #fbbf24;
  --skill-accent: #38bdf8;
  animation: equipmentVisualFade 1.75s ease-out forwards;

  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  &::before {
    width: min(70vw, 720px);
    aspect-ratio: 1;
    border: 1px solid color-mix(in srgb, var(--skill-primary) 72%, transparent);
    box-shadow:
      0 0 24px color-mix(in srgb, var(--skill-primary) 56%, transparent),
      inset 0 0 42px color-mix(in srgb, var(--skill-accent) 22%, transparent);
    animation: equipmentVisualRing 1.75s ease-out forwards;
  }

  &::after {
    width: min(48vw, 430px);
    aspect-ratio: 1;
    border: 1px dashed color-mix(in srgb, var(--skill-secondary) 72%, transparent);
    animation: equipmentVisualGlyph 1.75s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }

  &.tone-bind {
    --skill-primary: #facc15;
    --skill-secondary: #38bdf8;
    --skill-accent: #fde68a;
  }

  &.tone-chain {
    --skill-primary: #94a3b8;
    --skill-secondary: #a78bfa;
    --skill-accent: #f43f5e;
  }

  &.tone-rose {
    --skill-primary: #f9a8d4;
    --skill-secondary: #f8fafc;
    --skill-accent: #86efac;
  }

  &.tone-crown {
    --skill-primary: #c084fc;
    --skill-secondary: #fbbf24;
    --skill-accent: #fb7185;
  }

  &.grade-ex {
    --skill-primary: #d8b4fe;
    --skill-secondary: #f0abfc;
    --skill-accent: #fbbf24;
  }
}

.equipment-skill-visual-sweep {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(92vw, 920px);
  height: 7px;
  background: linear-gradient(90deg, transparent, var(--skill-primary), var(--skill-secondary), transparent);
  filter: drop-shadow(0 0 14px var(--skill-primary));
  transform: translate(-50%, -50%) rotate(-18deg) scaleX(0);
  animation: equipmentVisualSweep 1.75s ease-out forwards;
}

.equipment-skill-visual-sigil {
  position: absolute;
  left: 50%;
  top: 42%;
  width: 88px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--skill-secondary) 78%, transparent);
  background:
    linear-gradient(135deg, rgba(2, 6, 23, 0.82), rgba(15, 23, 42, 0.62)),
    conic-gradient(from 90deg, var(--skill-primary), var(--skill-secondary), var(--skill-accent), var(--skill-primary));
  color: #fff;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-shadow: 0 0 14px var(--skill-secondary);
  box-shadow:
    0 0 30px color-mix(in srgb, var(--skill-primary) 62%, transparent),
    inset 0 0 22px rgba(255, 255, 255, 0.12);
  transform: translate(-50%, -50%) scale(0.62) rotate(-20deg);
  animation: equipmentVisualSigil 1.75s cubic-bezier(0.2, 0.85, 0.2, 1) forwards;
}

.equipment-skill-visual-caption {
  position: absolute;
  left: 50%;
  top: calc(42% + 66px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  transform: translateX(-50%);
  text-align: center;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.86);
  animation: equipmentVisualCaption 1.75s ease-out forwards;
}

.equipment-skill-visual-source {
  color: color-mix(in srgb, var(--skill-secondary) 82%, white);
  font-size: clamp(12px, 1.7vw, 16px);
  font-weight: 800;
}

.equipment-skill-visual-name {
  color: #f8fafc;
  font-size: clamp(24px, 4.6vw, 54px);
  font-weight: 950;
  line-height: 1;
}

@media (max-width: 768px) {
  .equipment-skill-visual-sigil {
    top: 39%;
    width: 72px;
  }

  .equipment-skill-visual-caption {
    top: calc(39% + 56px);
    width: min(86vw, 360px);
  }
}

@keyframes equipmentVisualFade {
  0% {
    opacity: 0;
  }
  10%,
  76% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes equipmentVisualRing {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.58);
  }
  28% {
    opacity: 0.9;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.22);
  }
}

@keyframes equipmentVisualGlyph {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.42) rotate(-30deg);
  }
  24%,
  62% {
    opacity: 0.86;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.12) rotate(34deg);
  }
}

@keyframes equipmentVisualSweep {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(-18deg) scaleX(0);
  }
  18% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(-18deg) scaleX(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(-18deg) scaleX(0.2) translateX(28%);
  }
}

@keyframes equipmentVisualSigil {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.62) rotate(-20deg);
  }
  22% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.05) rotate(0deg);
  }
  76% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(8deg);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9) rotate(18deg);
  }
}

@keyframes equipmentVisualCaption {
  0%,
  12% {
    opacity: 0;
    transform: translate(-50%, 10px);
  }
  28%,
  74% {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -8px);
  }
}

// ========== 协同作战立绘特效 ==========
.companion-assist-effect {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 88;
  overflow: hidden;
}

.companion-assist-strike {
  position: absolute;
  top: 22%;
  right: 7%;
  width: min(44vw, 520px);
  height: min(44vw, 520px);
  border: 2px solid rgba(125, 211, 252, 0.75);
  border-radius: 50%;
  box-shadow:
    0 0 24px rgba(125, 211, 252, 0.55),
    inset 0 0 36px rgba(251, 191, 36, 0.22);
  animation: companionStrike 1.8s ease-out forwards;
}

.companion-assist-portrait {
  position: absolute;
  right: 8%;
  bottom: 12%;
  width: min(36vw, 320px);
  max-height: 76vh;
  object-fit: contain;
  filter: drop-shadow(0 0 28px rgba(125, 211, 252, 0.65)) drop-shadow(0 10px 32px rgba(0, 0, 0, 0.75));
  animation: companionPortraitIn 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.companion-assist-caption {
  position: absolute;
  right: clamp(20px, 9vw, 140px);
  bottom: 9%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.85);
  animation: companionCaptionIn 1.8s ease-out forwards;
}

.companion-name {
  font-size: clamp(22px, 4vw, 44px);
  font-weight: 800;
  color: #f8fafc;
}

.companion-skill {
  font-size: clamp(13px, 2vw, 18px);
  color: #fde68a;
}

@media (max-width: 768px) {
  .companion-assist-strike {
    top: 26%;
    right: -16%;
    width: 78vw;
    height: 78vw;
  }

  .companion-assist-portrait {
    right: -4%;
    bottom: 18%;
    width: min(58vw, 240px);
    max-height: 58vh;
  }

  .companion-assist-caption {
    right: 18px;
    bottom: 14%;
  }
}

@keyframes companionStrike {
  0% {
    opacity: 0;
    transform: scale(0.5) rotate(-16deg);
  }
  22% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
  68% {
    opacity: 0.85;
    transform: scale(1.08) rotate(8deg);
  }
  100% {
    opacity: 0;
    transform: scale(1.35) rotate(18deg);
  }
}

@keyframes companionPortraitIn {
  0% {
    opacity: 0;
    transform: translateX(34%) scale(0.9);
  }
  18% {
    opacity: 1;
    transform: translateX(0) scale(1.04);
  }
  72% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(18%) scale(0.96);
  }
}

@keyframes companionCaptionIn {
  0%,
  10% {
    opacity: 0;
    transform: translateY(12px);
  }
  26%,
  70% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-8px);
  }
}

// ========== BOSS阶段转换特效 ==========
.phase-transition-effect {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 90;
  overflow: hidden;
}

// 闪光效果
.transition-flash {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.9) 0%, transparent 70%);
  animation: flashEffect 0.8s ease-out;
}

// 粒子效果
.transition-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.transition-particles .particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #ff1493;
  border-radius: 50%;
  box-shadow:
    0 0 10px #ff1493,
    0 0 20px #ff1493;
  left: var(--x);
  top: var(--y);
  animation: particleExplode 1.5s ease-out var(--delay) forwards;
}

// 冲击波效果
.transition-shockwave {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100px;
  height: 100px;
  margin: -50px 0 0 -50px;
  border: 3px solid #ff1493;
  border-radius: 50%;
  animation: shockwaveExpand 1.2s ease-out;
}

// 第一阶段转第二阶段特效（红粉色）
.phase-transition-effect.phase1to2 {
  .transition-flash {
    background: radial-gradient(circle at center, rgba(255, 20, 147, 0.8) 0%, transparent 70%);
  }

  .particle {
    background: #ff1493;
    box-shadow:
      0 0 10px #ff1493,
      0 0 20px #ff1493;
  }

  .transition-shockwave {
    border-color: #ff1493;
    box-shadow:
      0 0 20px #ff1493,
      0 0 40px #ff1493,
      inset 0 0 20px #ff1493;
  }
}

// 第二阶段转第三阶段特效（紫色）
.phase-transition-effect.phase2to3 {
  .transition-flash {
    background: radial-gradient(circle at center, rgba(138, 43, 226, 0.8) 0%, transparent 70%);
  }

  .particle {
    background: #8a2be2;
    box-shadow:
      0 0 10px #8a2be2,
      0 0 20px #8a2be2;
  }

  .transition-shockwave {
    border-color: #8a2be2;
    box-shadow:
      0 0 20px #8a2be2,
      0 0 40px #8a2be2,
      inset 0 0 20px #8a2be2;
  }
}

// 闪光动画
@keyframes flashEffect {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}

// 粒子爆炸动画
@keyframes particleExplode {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(calc((var(--x) - 50%) * 2), calc((var(--y) - 50%) * 2)) scale(0);
  }
}

// 冲击波扩散动画
@keyframes shockwaveExpand {
  0% {
    width: 100px;
    height: 100px;
    margin: -50px 0 0 -50px;
    opacity: 1;
  }
  100% {
    width: 2000px;
    height: 2000px;
    margin: -1000px 0 0 -1000px;
    opacity: 0;
  }
}

// ========== 伊甸芙宁沉睡图标 (只显示zzz) ==========
.eden-sleep-icon {
  position: absolute;
  top: 80px;
  right: 3%;
  z-index: 30;
  pointer-events: none;

  @media (min-width: 1024px) {
    top: 100px;
    right: 5%;
  }

  .sleep-icon {
    font-size: 28px;
    animation: sleepFloat 2s ease-in-out infinite;

    @media (min-width: 1024px) {
      font-size: 40px;
    }
  }
}

// ========== 黑崎晴雯债务显示 ==========
.heisaki-debt-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 25;
  pointer-events: none;

  .debt-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(161, 98, 7, 0.25) 100%);
    border: 2px solid rgba(234, 179, 8, 0.6);
    border-radius: 12px;
    box-shadow:
      0 0 20px rgba(234, 179, 8, 0.3),
      0 0 40px rgba(234, 179, 8, 0.15),
      inset 0 0 15px rgba(234, 179, 8, 0.1);
    backdrop-filter: blur(8px);
    animation: debtPulse 2s ease-in-out infinite;

    @media (min-width: 1024px) {
      padding: 1rem 1.75rem;
      gap: 0.75rem;
    }
  }

  .debt-icon {
    font-size: 1.5rem;
    animation: coinSpin 3s ease-in-out infinite;

    @media (min-width: 1024px) {
      font-size: 2rem;
    }
  }

  .debt-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .debt-label {
    font-size: 0.625rem;
    font-weight: 600;
    color: rgba(234, 179, 8, 0.8);
    text-transform: uppercase;
    letter-spacing: 0.05em;

    @media (min-width: 1024px) {
      font-size: 0.75rem;
    }
  }

  .debt-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #fbbf24;
    text-shadow: 0 0 10px rgba(234, 179, 8, 0.5);
    font-family: 'Courier New', monospace;

    @media (min-width: 1024px) {
      font-size: 1.75rem;
    }

    &.debt-danger {
      color: #f87171;
      text-shadow: 0 0 15px rgba(248, 113, 113, 0.6);
      animation: debtDanger 0.5s ease-in-out infinite alternate;
    }
  }
}

@keyframes debtPulse {
  0%,
  100% {
    box-shadow:
      0 0 20px rgba(234, 179, 8, 0.3),
      0 0 40px rgba(234, 179, 8, 0.15),
      inset 0 0 15px rgba(234, 179, 8, 0.1);
  }
  50% {
    box-shadow:
      0 0 30px rgba(234, 179, 8, 0.5),
      0 0 60px rgba(234, 179, 8, 0.25),
      inset 0 0 20px rgba(234, 179, 8, 0.15);
  }
}

@keyframes coinSpin {
  0%,
  100% {
    transform: rotateY(0deg);
  }
  50% {
    transform: rotateY(180deg);
  }
}

@keyframes debtDanger {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.05);
  }
}

// ========== 艾格妮丝卡路里显示 ==========
.agnes-calorie-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 25;
  pointer-events: none;

  .calorie-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.25) 100%);
    border: 2px solid rgba(236, 72, 153, 0.6);
    border-radius: 12px;
    box-shadow:
      0 0 20px rgba(236, 72, 153, 0.3),
      0 0 40px rgba(236, 72, 153, 0.15),
      inset 0 0 15px rgba(236, 72, 153, 0.1);
    backdrop-filter: blur(8px);
    animation: caloriePulse 2s ease-in-out infinite;

    @media (min-width: 1024px) {
      padding: 1rem 1.75rem;
      gap: 0.75rem;
    }
  }

  .calorie-icon {
    font-size: 1.5rem;
    animation: cakeWobble 2s ease-in-out infinite;

    @media (min-width: 1024px) {
      font-size: 2rem;
    }
  }

  .calorie-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .calorie-label {
    font-size: 0.625rem;
    font-weight: 600;
    color: rgba(236, 72, 153, 0.8);
    text-transform: uppercase;
    letter-spacing: 0.05em;

    @media (min-width: 1024px) {
      font-size: 0.75rem;
    }
  }

  .calorie-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #f472b6;
    text-shadow: 0 0 10px rgba(236, 72, 153, 0.5);
    font-family: 'Courier New', monospace;

    @media (min-width: 1024px) {
      font-size: 1.75rem;
    }

    &.calorie-high {
      color: #c084fc;
      text-shadow: 0 0 15px rgba(192, 132, 252, 0.6);
      animation: calorieHigh 0.5s ease-in-out infinite alternate;
    }
  }
}

@keyframes caloriePulse {
  0%,
  100% {
    box-shadow:
      0 0 20px rgba(236, 72, 153, 0.3),
      0 0 40px rgba(236, 72, 153, 0.15),
      inset 0 0 15px rgba(236, 72, 153, 0.1);
  }
  50% {
    box-shadow:
      0 0 30px rgba(236, 72, 153, 0.5),
      0 0 60px rgba(236, 72, 153, 0.25),
      inset 0 0 20px rgba(236, 72, 153, 0.15);
  }
}

@keyframes cakeWobble {
  0%,
  100% {
    transform: rotate(-5deg);
  }
  50% {
    transform: rotate(5deg);
  }
}

@keyframes calorieHigh {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.05);
  }
}

@keyframes sleepFloat {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.8;
  }
  50% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

// 保留旧的水盾样式（可选择删除，但保留以防需要）
.eden-water-shield {
  position: absolute;
  // 定位到敌人立绘区域
  top: 40%; // 向上移动
  right: 3%;
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 5; // 在立绘之后

  // 移动端尺寸 (匹配 avatar max-width: 180px)
  width: 200px;
  height: 300px;

  @media (min-width: 1024px) {
    // 桌面端尺寸 (匹配 avatar max-width: 320px)
    width: 350px;
    height: 530px;
    right: 5%;
  }

  .water-shield-overlay {
    position: absolute;
    inset: -15%; // 使用百分比覆盖，随父元素缩放
    background: linear-gradient(
      135deg,
      rgba(96, 165, 250, 0.3) 0%,
      rgba(59, 130, 246, 0.4) 25%,
      rgba(96, 165, 250, 0.2) 50%,
      rgba(59, 130, 246, 0.35) 75%,
      rgba(96, 165, 250, 0.3) 100%
    );
    border-radius: 50%;
    animation:
      waterShieldPulse 3s ease-in-out infinite,
      waterShieldRotate 8s linear infinite;
    box-shadow:
      0 0 30px rgba(96, 165, 250, 0.5),
      0 0 60px rgba(59, 130, 246, 0.3),
      inset 0 0 40px rgba(96, 165, 250, 0.2);
  }

  .sleep-icon {
    position: absolute;
    top: 5%;
    right: -15%;
    font-size: 24px; // 移动端
    animation: sleepFloat 2s ease-in-out infinite;

    @media (min-width: 1024px) {
      font-size: 36px; // 桌面端
    }
  }
}

@keyframes waterShieldPulse {
  0%,
  100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

@keyframes waterShieldRotate {
  from {
    filter: hue-rotate(0deg);
  }
  to {
    filter: hue-rotate(30deg);
  }
}

@keyframes sleepFloat {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.8;
  }
  50% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

// ========== 伊甸芙宁倒计时显示 (响应式缩放) ==========
.eden-countdown {
  position: absolute;
  // 移动端定位
  top: 60px;
  right: 1%;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.8), rgba(59, 130, 246, 0.6));
  border: 2px solid rgba(96, 165, 250, 0.6);
  border-radius: 16px;
  color: white;
  font-weight: bold;
  z-index: 25;
  animation: fadeIn 0.3s ease-out;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);

  @media (min-width: 1024px) {
    // 桌面端定位
    top: 80px;
    right: 3%;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 20px;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
  }

  .countdown-icon {
    font-size: 14px;

    @media (min-width: 1024px) {
      font-size: 20px;
    }
  }

  .countdown-number {
    font-size: 16px;
    font-family: 'Courier New', monospace;
    min-width: 20px;
    text-align: center;

    @media (min-width: 1024px) {
      font-size: 24px;
      min-width: 30px;
    }
  }

  &.countdown-urgent {
    background: linear-gradient(135deg, rgba(220, 38, 38, 0.8), rgba(239, 68, 68, 0.6));
    border-color: rgba(248, 113, 113, 0.6);
    animation: urgentPulse 0.5s ease-in-out infinite;
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
  }
}

@keyframes urgentPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
</style>
