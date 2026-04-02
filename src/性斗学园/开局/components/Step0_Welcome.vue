<template>
  <div class="space-y-6 animate-slide-up">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <h3 class="mb-3 text-xl font-bold text-white">温馨提示</h3>
      <div class="space-y-4 text-sm leading-relaxed text-gray-200">
        <p>你好，这里是前端作者“𝒱𝒾𝓃 ”，本卡为“芙芙可爱捏”与“𝒱𝒾𝓃”共同创作，仅在类脑与旅程免费发布/更新。</p>
        <div class="flex flex-col gap-2">
          <a
            class="text-secondary underline decoration-secondary/40 underline-offset-4 hover:decoration-secondary"
            href="https://discord.com/channels/1134557553011998840/1423668401422729452"
            target="_blank"
            rel="noreferrer"
          >
            类脑发布帖
          </a>
          <a
            class="text-secondary underline decoration-secondary/40 underline-offset-4 hover:decoration-secondary"
            href="https://discord.com/channels/1291925535324110879/1415162247139037304"
            target="_blank"
            rel="noreferrer"
          >
            旅程发布帖
          </a>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <h3 class="mb-3 text-xl font-bold text-white">已测试模型/预设</h3>
      <div class="space-y-2 text-sm text-gray-200">
        <div>Claude opus 4.6: Ny/Mur鹿鹿预设</div>
        <div>Gemini 3.1 pro: Izumi</div>
      </div>
    </div>

    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <h3 class="mb-3 text-xl font-bold text-white">游玩前请确保</h3>
      <div class="space-y-2 text-sm text-gray-200">
        <div class="text-base">
          1. 酒馆助手与提示词模板已安装并更新到<span class="font-bold text-red-400">最新版本</span>
        </div>
        <div>2. 酒馆助手渲染已开启且小白x渲染已关闭</div>
        <div>3. 开梯子！开梯子！开梯子！</div>
        <div>4. 世界书有COT，请自行缝进预设，不知道怎么缝的去类脑找，不行去答疑区问。</div>
      </div>
    </div>

    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <h3 class="mb-3 text-xl font-bold text-white">问答（不看就问我打死你！）</h3>
      <div class="space-y-4 text-sm leading-relaxed text-gray-200">
        <div>
          <div class="font-semibold text-white">Q: 我为什么看不到前端？</div>
          <div>
            A: 如果你确保开了梯子的话，那就是你网络太差了。去正则把 正文UI/并行事件UI/选项UI/变量更新UI/战斗UI/开局美化
            一共6个正则关闭，并拉到局部正则最下面开启对应的6个备用正则。
          </div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 我为什么找不到状态栏？</div>
          <div>A: 状态栏通过输入框上方的“打开状态栏”按钮开启，如果看不到，上下划动两下确保按钮没有被隐藏。</div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 世界书好多灰色条目，需要开吗？</div>
          <div>A: 别动，不需要开。</div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 不同的难度有什么影响？会不会很难啊？</div>
          <div>A: 难度直接影响开局点数，升级所需经验与敌人数值，会直接大幅度影响体验。</div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 我为什么无法进入性斗？我需要从哪里进入性斗？</div>
          <div>
            A:
            请确保你的选项UI的外观与其他UI一致，如果不一致就说明你的正则冲突了，其他的选项正则把我的正则覆盖掉了，请自行寻找查找正则表达式带&lt;option&gt;的全局/预设正则并关闭。（正文UI同理，但正文UI没那么重要）
          </div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 为什么我看不到立绘/cg？</div>
          <div>A: 所有立绘与cg皆在性斗中查看，部分角色暂无cg。想知道哪些角色有cg可以自行在对应帖子下查找。</div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 为什么明明AI更新了xxx变量，我却没有在状态栏中看到？</div>
          <div>
            A: 绝大部分变量不由AI管理也不能管理，皆有脚本操控。对于目前AI可影响的变量请自行查看“Zod 变量结构”脚本。
          </div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 为什么AI说的和我的状态栏不一样？</div>
          <div>A: 以状态栏为主，AI会口胡。</div>
        </div>

        <div>
          <div class="font-semibold text-white">Q: 更新后需要重开吗？</div>
          <div>A: 不需要，只需要重新读取一遍初始变量即可。</div>
        </div>

        <div class="pt-2 text-gray-300">如果你已经阅读完毕，欢迎进入下一页。</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>
