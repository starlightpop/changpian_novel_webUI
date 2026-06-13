import './style.css';
import { marked } from 'marked';
import {
  findBackgroundTagEntityIssues,
  formatBackgroundSemanticsForPrompt,
  parseBackgroundSemantics,
  repairBackgroundTagEntityNames,
  validateBackgroundSemanticCoherence
} from './domain/background-semantics.js';
import {
  auditNarrativeMemory,
  formatNarrativeMemoryContext,
  recordNarrativeObservation,
  retrieveNarrativeMemory,
  syncNarrativeMemory
} from './domain/narrative-memory.js';
import {
  findForbiddenStoryConcepts,
  getCharacterRosterEntryIssues,
  validatePlotIntegrity,
  validateCharacterName,
  validateEnsembleArchitecture,
  validateGoldenThreeChapters,
  validateMasterOutlineDepth
} from './domain/novel-integrity.js';
import {
  applyCharacterPatchTransaction,
  buildCharacterCanonContracts,
  createCharacterIssueLedger,
  evaluateCharacterQualityGate,
  extendCharacterCanonContracts,
  getCharacterAcceptanceBlockers,
  getCharacterCanonUpstreamIssues,
  getCharacterFieldHash,
  partitionCharacterIntegrityIssues,
  validateCharacterSemanticIntegrity
} from './domain/character-integrity.js';
import {
  appendAgentModelCall,
  createAgentCheckpoint,
  createAgentContextFingerprint,
  createAgentPlan,
  createAgentRunRecord,
  estimateTokenCount,
  replanAgentPlan,
  recordVerifiedExperience,
  selectAgentModelRoute,
  updateAgentPlan
} from './domain/agent-orchestration.js';

// 配置 marked 以支持安全渲染和换行
marked.setOptions({
  breaks: true,
  gfm: true
});

/* ==========================================================================
   State Management & Default Data Configuration
   ========================================================================== */
const GROUP_METADATA = {
  'world-setting': '世界观设定',
  'character-growth': '角色与成长（动力源）',
  'themes-core': '主题与核心',
  'plot-framework': '剧情与伏笔（因果线）'
};

const TYPE_METADATA = {
  'location': { name: '地理位置', icon: 'map-pin' },
  'faction': { name: '势力组织', icon: 'users' },
  'system': { name: '力量体系/法则', icon: 'shield' },
  'main-character': { name: '核心主角（视角中心）', icon: 'user' },
  'major-character': { name: '主要人物', icon: 'star' },
  'family-character': { name: '主角家族', icon: 'home' },
  'former-sect-character': { name: '旧宗门人物', icon: 'landmark' },
  'antagonist-character': { name: '反派阵营', icon: 'swords' },
  'neutral-character': { name: '中立势力', icon: 'scale' },
  'hidden-character': { name: '隐藏势力', icon: 'eye-off' },
  'civilian-character': { name: '凡人社会', icon: 'store' },
  'supporting-character': { name: '核心配角（关系网络）', icon: 'users' },
  'character-network': { name: '人物关系拓扑', icon: 'share-2' },
  'core-power': { name: '核心力量/机制', icon: 'zap' },
  'secret-clue': { name: '隐秘线索（终极悬念）', icon: 'lock' },
  'main-outline': { name: '主线大纲（因果螺旋）', icon: 'activity' },
  'pace-hooks': { name: '节奏与钩子', icon: 'link' },
  'planting': { name: '伏笔设置（Planting）', icon: 'flag' },
  'payoff': { name: '回收机制（Payoff）', icon: 'refresh-cw' },
  'narrative-kernel': { name: '叙事内核（硬约束）', icon: 'cpu' },
  'event-card': { name: '事件卡（状态机）', icon: 'git-branch' },
  'promise-ledger': { name: '伏笔台账', icon: 'clipboard-list' },
  'state-ledger': { name: '状态台账', icon: 'database' },
  'faction-plan': { name: '势力计划', icon: 'network' },
  'volume-outline': { name: '卷级规划', icon: 'layers' },
  'chapter-outline': { name: '章节细纲', icon: 'list-tree' },
  'plot-causal-chain': { name: '剧情因果链', icon: 'git-merge' },
  'plot-timeline': { name: '时空与多线叙事', icon: 'clock-3' },
  'plot-audit': { name: '剧情审计报告', icon: 'scan-search' },
  'story-constitution': { name: '作品宪法（背景与简介硬约束）', icon: 'scroll-text' },
  'final-outline': { name: '最终综合大纲', icon: 'book-check' },
  'final-audit': { name: '全书终审报告', icon: 'badge-check' },
  'reference-analysis': { name: '原著结构拆解', icon: 'file-text' },
  'character-audit': { name: '人物和势力审计报告', icon: 'badge-check' }
};

const CHARACTER_TYPE_ORDER = [
  'main-character',
  'major-character',
  'family-character',
  'former-sect-character',
  'antagonist-character',
  'neutral-character',
  'hidden-character',
  'civilian-character',
  'supporting-character',
  'character-network'
];

const DEFAULT_CHAPTERS = [
  {
    id: 'chapter-1',
    title: '第一章',
    content: ''
  }
];

const DEFAULT_ASSETS = [
  // 世界观设定
  { id: 'ws-loc-1', group: 'world-setting', type: 'location', name: '新手村/开篇落脚处', desc: '故事的起点，为主角提供最初的安全区与初始事件（如：村落、城镇或宗门外院）。' },
  { id: 'ws-loc-2', group: 'world-setting', type: 'location', name: '核心冲突舞台', desc: '承载中期主线剧情、多方势力交汇的战略要地，具体形态必须服从当前背景。' },
  { id: 'ws-loc-3', group: 'world-setting', type: 'location', name: '高阶禁区/终局之地', desc: '终极秘密的埋藏地，通常与世界观 of 底层逻辑直接挂钩。' },
  { id: 'wf-geo-1', group: 'world-setting', type: 'location', name: '显性地图', desc: '剧情直接发生、人物能够实际抵达并行动的具体空间。' },
  { id: 'wf-geo-2', group: 'world-setting', type: 'location', name: '隐性地图（伏笔位）', desc: '早期被提及但无法进入的区域，通常作为中后期反转的伏笔（如：深渊裂隙）。' },

  { id: 'ws-fac-1', group: 'world-setting', type: 'faction', name: '本土/秩序阵营', desc: '维护现有规则或主角最初依附的组织，其制度和资源必须符合当前时代。' },
  { id: 'ws-fac-2', group: 'world-setting', type: 'faction', name: '敌对/反派阵营', desc: '因自身利益打破现有平衡、制造主要危机的对抗势力。' },
  { id: 'ws-fac-3', group: 'world-setting', type: 'faction', name: '中立/第三方势力', desc: '黑市、佣兵组织或隐世流派，用于调节剧情节奏与情报交汇。' },
  { id: 'wf-fac-1', group: 'world-setting', type: 'faction', name: '明面阵营', desc: '秩序的维护者与挑战者。' },
  { id: 'wf-fac-2', group: 'world-setting', type: 'faction', name: '影子阵营（伏笔位）', desc: '隐藏在历史尘埃中的“第三只手”，负责在关键节点回收前期不合理的逻辑死角。' },

  { id: 'ws-sys-1', group: 'world-setting', type: 'system', name: '核心功法/能力路径', desc: '决定个体如何获取超自然力量或社会地位的成长蓝图。' },
  { id: 'ws-sys-2', group: 'world-setting', type: 'system', name: '阶层晋升标准', desc: '清晰的等级划分，用以量化角色的成长，提供长线期待感。' },
  { id: 'cl-rul-1', group: 'world-setting', type: 'system', name: '已知规则', desc: '公开的力量体系等级。' },
  { id: 'cl-rul-2', group: 'world-setting', type: 'system', name: '底层后门（伏笔位）', desc: '力量体系中一个极不起眼的弱点或特性，在决战时刻作为“因果武器”回收。' },

  // 角色与成长（动力源）
  { id: 'cg-main-1', group: 'character-growth', type: 'main-character', name: '核心动机（欲望）', desc: '主角一往无前的原始驱动力（复仇、求生、探寻真相、守护）。' },
  { id: 'cg-main-2', group: 'character-growth', type: 'main-character', name: '初始缺陷与金手指', desc: '让人物落地的缺陷，配合打破既定规则的底层逻辑工具。' },
  { id: 'cl-core-1', group: 'character-growth', type: 'main-character', name: '明线动机', desc: '变强、复仇、生存（直接驱动力）。' },
  { id: 'cl-core-2', group: 'character-growth', type: 'main-character', name: '暗线宿命（伏笔位）', desc: '主角身世、体质或随身物品中隐藏的非对称信息，决定了终局的走向。' },

  { id: 'cg-supp-1', group: 'character-growth', type: 'supporting-character', name: '导师/伙伴（情感羁绊）', desc: '提供成长指引、情感支持或负责功能性叙事的正面角色。' },
  { id: 'cg-supp-2', group: 'character-growth', type: 'supporting-character', name: '一生之敌（镜像反派）', desc: '价值观与主角完全对立、实力同步成长的核心对抗者。' },

  // 主题与核心
  { id: 'tc-pow-1', group: 'themes-core', type: 'core-power', name: '核心力量来源', desc: '这个世界最底层的力量、资源与代价机制，必须符合背景设定中的时代和题材。' },
  { id: 'tc-pow-2', group: 'themes-core', type: 'core-power', name: '核心心理奖惩机制', desc: '故事带给读者的核心爽点与情绪价值。' },
  { id: 'tv-pow-1', group: 'themes-core', type: 'core-power', name: '核心力量运转', desc: '设定世界观中最本质的力量获取、运用与代价规则，具体形式必须服从背景时代。' },
  { id: 'tc-sec-1', group: 'themes-core', type: 'secret-clue', name: '底层埋线（Buried Ledger）', desc: '贯穿全书、涉及世界本质的终极谜题，驱动主角不断打破阶层、探索未知。' },
  { id: 'tv-sec-1', group: 'themes-core', type: 'secret-clue', name: '世界真相', desc: '所有伏笔最终指向同一个符合既定时代、历史与力量规则的终极真相。' },
  { id: 'tv-sec-2', group: 'themes-core', type: 'secret-clue', name: '因果螺旋', desc: '每一卷结尾回收前期伏笔，同时埋下更深层的疑问，形成逐步升级的因果结构。' },

  // 剧情与伏笔（因果线）
  { id: 'pf-out-1', group: 'plot-framework', type: 'main-outline', name: '核心危机（大事件）', desc: '推动整个世界格局走向崩盘或重组的宏观推手。' },
  { id: 'pf-out-2', group: 'plot-framework', type: 'main-outline', name: '三幕九线逻辑', desc: '将百万字长文拆解为阶段性目标明确的、可独立闭环的各个卷轴。' },
  { id: 'pf-pac-1', group: 'plot-framework', type: 'pace-hooks', name: '爽点/期待感设计', desc: '包含明确的“布局—压抑—爆发”的反馈循环。' },
  { id: 'pf-pac-2', group: 'plot-framework', type: 'pace-hooks', name: '钩子（Hooks）', desc: '章节与卷末的悬念留白，保证长线连载的读者粘性。' },
  
  { id: 'fc-pla-1', group: 'plot-framework', type: 'planting', name: '不经意的细节', desc: '随口提到的路人姓名、一件看似残破的古物、一个奇怪 of 社会习俗。' },
  { id: 'fc-pla-2', group: 'plot-framework', type: 'planting', name: '因果缺失', desc: '发生了一件大事，但没有任何一方势力宣称负责，留下“逻辑真空”作为钩子。' },
  { id: 'fc-pla-3', group: 'plot-framework', type: 'planting', name: '情绪支票', desc: '给主角一个无法立刻达成的承诺或仇恨，建立读者的长线心理期待。' },
  { id: 'fc-pay-1', group: 'plot-framework', type: 'payoff', name: '多线交汇', desc: '两个看似无关的伏笔在同一节点爆发（例如：前期得到的废矿石恰好是后期开启禁区遗迹的唯一钥匙）。' },
  { id: 'fc-pay-2', group: 'plot-framework', type: 'payoff', name: '逻辑自洽', desc: '回收时必须符合“意料之外，情理之中”，利用第一性原理推导出必然结果，而非机械降神。' },
  { id: 'fc-pay-3', group: 'plot-framework', type: 'payoff', name: '情绪核爆', desc: '伏笔回收的瞬间，必须同时完成角色成长、反派覆灭或世界观真相揭秘。' }
];

const DEFAULT_CATEGORY_ORDER = {
  'world-setting': ['location', 'faction', 'system', 'faction-plan'],
  'character-growth': [...CHARACTER_TYPE_ORDER],
  'themes-core': ['core-power', 'secret-clue'],
  'plot-framework': [
    'story-constitution',
    'narrative-kernel',
    'main-outline',
    'event-card',
    'promise-ledger',
    'state-ledger',
    'volume-outline',
    'chapter-outline',
    'plot-causal-chain',
    'plot-timeline',
    'plot-audit',
    'final-outline',
    'final-audit',
    'pace-hooks',
    'planting',
    'payoff'
  ]
};

function safeJsonParse(rawValue, fallback, label = 'localStorage') {
  if (rawValue === null || rawValue === undefined || rawValue === '') return fallback;
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.warn(`${label} JSON 解析失败，已使用兜底值：`, error);
    return fallback;
  }
}

function cloneDefault(value) {
  return JSON.parse(JSON.stringify(value));
}

const migratedDefaultNovel = {
  id: 'novel-default',
  name: '未命名长篇',
  chapters: safeJsonParse(localStorage.getItem('novel_chapters'), cloneDefault(DEFAULT_CHAPTERS), 'novel_chapters'),
  assets: safeJsonParse(localStorage.getItem('novel_assets'), cloneDefault(DEFAULT_ASSETS), 'novel_assets'),
  currentChapterId: localStorage.getItem('novel_current_chapter') || 'chapter-1',
  activeTarget: safeJsonParse(localStorage.getItem('novel_active_target'), { type: 'chapter', id: 'chapter-1' }, 'novel_active_target'),
  categoryOrder: cloneDefault(DEFAULT_CATEGORY_ORDER)
};

/* ==========================================================================
   Background Images
   ========================================================================== */
const BG_IMAGES = [
  // --- 纯色柔和（清爽低饱和） ---
  { id: 'solid-warm-white',  name: '晨光白', group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #f8f5f0, #fefefe)' },
  { id: 'solid-cream',       name: '奶油色', group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #fef9e7, #fdf4d8)' },
  { id: 'solid-sky-blue',    name: '天空蓝', group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #e8f4fd, #f0f7fc)' },
  { id: 'solid-mint',        name: '薄荷绿', group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #eaf6ef, #f2f9f4)' },
  { id: 'solid-sakura',      name: '樱花粉', group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #fdf0f3, #fef6f7)' },
  { id: 'solid-apricot',     name: '杏色',   group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #fef5ec, #fdf0e0)' },
  { id: 'solid-lavender',    name: '薰衣草', group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #f2eff9, #f8f5fc)' },
  { id: 'solid-sage',        name: '鼠尾草', group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #eef4eb, #f4f8f2)' },
  { id: 'solid-peach',       name: '蜜桃色', group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #fef4ef, #fdf0e8)' },
  { id: 'solid-moon',        name: '月白',   group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #f5f6fa, #fafbfd)' },
  { id: 'solid-ivory',       name: '象牙白', group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #fdfaf3, #fefdfb)' },
  { id: 'solid-sand',        name: '暖沙色', group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #faf5ee, #fcf8f4)' },
  { id: 'solid-mauve',       name: '浅藕荷', group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #f6f2f8, #fcf9fd)' },
  { id: 'solid-eggshell',    name: '蛋壳色', group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #f9f8f2, #fdfdfc)' },
  { id: 'solid-gold',        name: '晨曦金', group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #fef9ee, #fefbf5)' },
  { id: 'solid-sea',         name: '浅海蓝', group: '纯色柔和', type: 'light', value: 'linear-gradient(135deg, #eff6f8, #f6fafb)' },
  // --- 深色夜间（深沉不丑陋） ---
  { id: 'dark-navy',         name: '深海蓝', group: '深色夜间', type: 'dark', value: 'linear-gradient(135deg, #0c1629, #162132)' },
  { id: 'dark-charcoal',     name: '暗炭灰', group: '深色夜间', type: 'dark', value: 'linear-gradient(135deg, #14181f, #1c212a)' },
  { id: 'dark-midnight',     name: '子夜紫', group: '深色夜间', type: 'dark', value: 'linear-gradient(135deg, #14101e, #1e172a)' },
  { id: 'dark-forest',       name: '森林暗', group: '深色夜间', type: 'dark', value: 'linear-gradient(135deg, #0f1a14, #17241c)' },
  { id: 'dark-warm',         name: '暖棕夜', group: '深色夜间', type: 'dark', value: 'linear-gradient(135deg, #1a1410, #261e17)' },
  { id: 'dark-slate',        name: '石板灰', group: '深色夜间', type: 'dark', value: 'linear-gradient(135deg, #141b24, #1e2631)' },
  { id: 'dark-ink',          name: '墨玉黑', group: '深色夜间', type: 'dark', value: 'linear-gradient(135deg, #0f0f12, #1a1a1f)' },
  { id: 'dark-starry',       name: '星空夜', group: '深色夜间', type: 'dark', value: 'linear-gradient(135deg, #0b0e1a, #161b2e)' },
  { id: 'system',             name: '跟随系统', group: '系统',     type: 'system', value: 'linear-gradient(135deg, #f8f5f0 50%, #0c1629 50%)' },
  { id: 'none',               name: '默认渐变', group: '系统',     type: 'light',  value: '' }
];

function syncActiveApiKeyFromSlots() {
  if (!state.apiKeys || !Array.isArray(state.apiKeys) || state.apiKeys.length === 0) {
    state.apiKeys = [
      {
        id: 'slot-1',
        name: '模型配置 1',
        apiKey: state.apiKey || '',
        apiModel: state.apiModel || 'gemini-2.0-flash',
        apiUrl: state.apiUrl || 'https://generativelanguage.googleapis.com'
      }
    ];
    state.activeApiKeyId = 'slot-1';
  }
  
  let activeSlot = state.apiKeys.find(s => s.id === state.activeApiKeyId);
  if (!activeSlot) {
    activeSlot = state.apiKeys[0];
    state.activeApiKeyId = activeSlot.id;
  }
  
  state.apiKey = activeSlot.apiKey || '';
  state.apiModel = activeSlot.apiModel || 'gemini-2.0-flash';
  state.apiUrl = activeSlot.apiUrl || 'https://generativelanguage.googleapis.com';
  
  if (!state.primaryApiKeyId || !state.apiKeys.some(s => s.id === state.primaryApiKeyId)) {
    state.primaryApiKeyId = state.activeApiKeyId || 'slot-1';
  }
}

let state = {
  novels: safeJsonParse(localStorage.getItem('multi_novels'), [migratedDefaultNovel], 'multi_novels'),
  activeNovelId: localStorage.getItem('multi_active_novel_id') || 'novel-default',
  apiKey: localStorage.getItem('novel_api_key') || '',
  apiModel: localStorage.getItem('novel_api_model') || 'gemini-2.0-flash',
  apiUrl: localStorage.getItem('novel_api_url') || 'https://generativelanguage.googleapis.com',
  viewMode: localStorage.getItem('novel_view_mode') || 'edit',
  bgImage: localStorage.getItem('novel_bg_image') || 'solid-warm-white',
  apiKeys: safeJsonParse(localStorage.getItem('novel_api_keys'), [], 'novel_api_keys'),
  activeApiKeyId: localStorage.getItem('novel_active_api_key_id') || '',
  primaryApiKeyId: localStorage.getItem('novel_primary_api_key_id') || ''
};
syncActiveApiKeyFromSlots();
if (!Array.isArray(state.novels) || !state.novels.length) {
  state.novels = [migratedDefaultNovel];
}

// 默认只展开活动小说，其他全部折叠
let collapsedNovels = safeJsonParse(
  localStorage.getItem('collapsed_novels'),
  state.novels.map(n => n.id).filter(id => id !== state.activeNovelId),
  'collapsed_novels'
);
if (!Array.isArray(collapsedNovels)) {
  collapsedNovels = state.novels.map(n => n.id).filter(id => id !== state.activeNovelId);
}

let heartbeatState = safeJsonParse(localStorage.getItem('agent_heartbeat_state'), {}, 'agent_heartbeat_state');
let novelInfoModalOpenedFrom = null;
let activeAgentRuntime = null;

function sanitizeLegacyEnglishLabels(obj) {
  if (typeof obj === 'string') {
    let newStr = obj;
    const targetTranslations = {
      'faction': '势力组织',
      'location': '地理位置',
      'system': '力量体系/法则',
      'secret-clue': '隐秘线索',
      'core-power': '核心力量/机制',
      'main-outline': '主线大纲',
      'pace-hooks': '节奏与钩子',
      'planting': '伏笔设置',
      'payoff': '回收机制',
      'character': '人物',
      'promise-ledger': '伏笔台账',
      'state-ledger': '状态台账',
      'faction-plan': '势力计划',
      'volume-outline': '卷级规划',
      'chapter-outline': '章节细纲',
      'plot-causal-chain': '剧情因果链',
      'plot-timeline': '时空与多线叙事',
      'plot-audit': '剧情审计报告'
    };
    for (const [eng, chi] of Object.entries(targetTranslations)) {
      const regex1 = new RegExp(`【${eng}\\s*[｜|]`, 'g');
      newStr = newStr.replace(regex1, `【${chi}｜`);
      
      const regex2 = new RegExp(`\\[${eng}\\s*[｜|]`, 'g');
      newStr = newStr.replace(regex2, `[${chi}｜`);
    }
    return newStr;
  } else if (Array.isArray(obj)) {
    return obj.map(sanitizeLegacyEnglishLabels);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj = {};
    for (const [key, val] of Object.entries(obj)) {
      newObj[key] = sanitizeLegacyEnglishLabels(val);
    }
    return newObj;
  }
  return obj;
}

// 自动对已载入的数据进行英文标签词净化
let hasSanitization = false;
state.novels = state.novels.map(novel => {
  const serialized = JSON.stringify(novel);
  if (serialized.includes('【faction') || serialized.includes('[faction') ||
      serialized.includes('【location') || serialized.includes('[location') ||
      serialized.includes('【system') || serialized.includes('[system')) {
    hasSanitization = true;
    return sanitizeLegacyEnglishLabels(novel);
  }
  return novel;
});
if (hasSanitization) {
  localStorage.setItem('multi_novels', JSON.stringify(state.novels));
}

// 强制将现有的及加载的旧格式小说数据转换为全新的8个大类模版和示例项目结构
let hasMigration = false;
state.novels.forEach(novel => {
  const needsMigration = !novel.categoryOrder || 
                         novel.categoryOrder['world-foundation'] || 
                         novel.categoryOrder['character-logic'] || 
                         novel.categoryOrder['themes-value'] || 
                         novel.categoryOrder['foreshadowing-causal'] ||
                         (novel.assets && novel.assets.some(a => ['world-foundation', 'character-logic', 'themes-value', 'foreshadowing-causal'].includes(a.group) || ['space-geo', 'power-faction', 'main-core', 'skills-rules', 'value-power', 'value-secret'].includes(a.type)));

  if (needsMigration) {
    const groupMap = {
      'world-foundation': 'world-setting',
      'character-logic': 'character-growth',
      'themes-value': 'themes-core',
      'foreshadowing-causal': 'plot-framework'
    };
    const typeMap = {
      'space-geo': 'location',
      'power-faction': 'faction',
      'main-core': 'main-character',
      'skills-rules': 'system',
      'value-power': 'core-power',
      'value-secret': 'secret-clue'
    };
    
    if (novel.assets) {
      novel.assets.forEach(asset => {
        if (groupMap[asset.group]) {
          asset.group = groupMap[asset.group];
        }
        if (typeMap[asset.type]) {
          asset.type = typeMap[asset.type];
        }
      });
    } else {
      novel.assets = [];
    }

    novel.categoryOrder = cloneDefault(DEFAULT_CATEGORY_ORDER);

    if (novel.id === 'novel-default') {
      const defaultAssetsCopy = JSON.parse(JSON.stringify(DEFAULT_ASSETS));
      const userAssets = novel.assets.filter(a => !defaultAssetsCopy.some(da => da.id === a.id || da.name === a.name));
      novel.assets = [...defaultAssetsCopy, ...userAssets];
    } else {
      const defaultAssetsCopy = JSON.parse(JSON.stringify(DEFAULT_ASSETS));
      defaultAssetsCopy.forEach(da => {
        const newId = da.id + '-' + novel.id;
        da.id = newId;
        if (!novel.assets.some(a => a.name === da.name)) {
          novel.assets.push(da);
        }
      });
    }

    hasMigration = true;
  }
});
if (hasMigration) {
  localStorage.setItem('multi_novels', JSON.stringify(state.novels));
}

let syncTimeout = null;
let originalBgImage = 'solid-warm-white';
let sysThemeListener = null;

async function syncUserDataToServer() {
  const username = localStorage.getItem('novel_username');
  const token = localStorage.getItem('novel_session_token');
  if (!username || !token) return;
  
  const payload = {
    novels: state.novels,
    activeNovelId: state.activeNovelId,
    apiKey: state.apiKey,
    apiModel: state.apiModel,
    apiUrl: state.apiUrl,
    viewMode: state.viewMode || 'edit',
    collapsedNovels,
    heartbeatState,
    bgImage: state.bgImage,
    apiKeys: state.apiKeys,
    activeApiKeyId: state.activeApiKeyId,
    primaryApiKeyId: state.primaryApiKeyId
  };
  
  try {
    const response = await fetch('/api/user/save-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Token': token
      },
      body: JSON.stringify(payload)
    });
    if (response.status === 401) {
      alert('您的登录已过期，请重新登录以同步数据。');
      localStorage.removeItem('novel_session_token');
      localStorage.removeItem('novel_username');
      location.reload();
      return;
    }
    if (!response.ok) {
      console.warn('同步用户数据失败:', response.statusText);
    }
  } catch (error) {
    console.error('同步数据到服务器时发生错误:', error);
  }
}

function saveState() {
  state.novels.forEach(novel => {
    syncNarrativeMemory(novel, { reason: '应用状态保存前同步正式事实' });
  });
  const uname = localStorage.getItem('novel_username');
  if (uname) {
    localStorage.setItem(`multi_novels_${uname}`, JSON.stringify(state.novels));
    localStorage.setItem(`multi_active_novel_id_${uname}`, state.activeNovelId);
    localStorage.setItem(`collapsed_novels_${uname}`, JSON.stringify(collapsedNovels));
    localStorage.setItem(`novel_api_key_${uname}`, state.apiKey);
    localStorage.setItem(`novel_api_model_${uname}`, state.apiModel);
    localStorage.setItem(`novel_api_url_${uname}`, state.apiUrl);
    localStorage.setItem(`novel_view_mode_${uname}`, state.viewMode || 'edit');
    localStorage.setItem(`novel_bg_image_${uname}`, state.bgImage);
    localStorage.setItem(`novel_api_keys_${uname}`, JSON.stringify(state.apiKeys));
    localStorage.setItem(`novel_active_api_key_id_${uname}`, state.activeApiKeyId);
    localStorage.setItem(`novel_primary_api_key_id_${uname}`, state.primaryApiKeyId);
  } else {
    localStorage.setItem('multi_novels', JSON.stringify(state.novels));
    localStorage.setItem('multi_active_novel_id', state.activeNovelId);
    localStorage.setItem('collapsed_novels', JSON.stringify(collapsedNovels));
    localStorage.setItem('novel_api_key', state.apiKey);
    localStorage.setItem('novel_api_model', state.apiModel);
    localStorage.setItem('novel_api_url', state.apiUrl);
    localStorage.setItem('novel_view_mode', state.viewMode || 'edit');
    localStorage.setItem('novel_bg_image', state.bgImage);
    localStorage.setItem('novel_api_keys', JSON.stringify(state.apiKeys));
    localStorage.setItem('novel_active_api_key_id', state.activeApiKeyId);
    localStorage.setItem('novel_primary_api_key_id', state.primaryApiKeyId);
  }

  persistStateToDatabase();

  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(syncUserDataToServer, 2000);
}

async function persistStateToDatabase() {
  try {
    const body = JSON.stringify({
      novels: state.novels,
      activeNovelId: state.activeNovelId,
      collapsedNovels: collapsedNovels,
      apiKey: state.apiKey,
      apiModel: state.apiModel,
      apiUrl: state.apiUrl,
      viewMode: state.viewMode || 'edit',
      heartbeatState: heartbeatState,
      bgImage: state.bgImage,
      primaryApiKeyId: state.primaryApiKeyId
    });
    await fetch('/api/save-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
  } catch (e) {
    // SQLite 不可用时静默降级
  }
}

function applyViewMode() {
  if (!elements.knowledgeGraphView.classList.contains('hidden')) {
    elements.editorTextarea.classList.add('hidden');
    elements.editorPreview.classList.add('hidden');
    return;
  }

  const mode = state.viewMode || 'edit';
  if (mode === 'preview') {
    elements.modePreview.classList.add('active');
    elements.modeEdit.classList.remove('active');
    elements.editorTextarea.classList.add('hidden');
    elements.editorPreview.classList.remove('hidden');
    updatePreview();
  } else {
    elements.modeEdit.classList.add('active');
    elements.modePreview.classList.remove('active');
    elements.editorTextarea.classList.remove('hidden');
    elements.editorPreview.classList.add('hidden');
  }
}

function saveHeartbeatState() {
  localStorage.setItem('agent_heartbeat_state', JSON.stringify(heartbeatState));
}

function getActiveNovel() {
  return state.novels.find(n => n.id === state.activeNovelId) || state.novels[0];
}

/* ==========================================================================
   UI Elements Query
   ========================================================================== */
const elements = {
  novelsContainer: document.getElementById('novels-container'),
  activeNovelName: document.getElementById('active-novel-name'),
  addNovelBtn: document.getElementById('add-novel-btn'),
  
  chapterSelect: document.getElementById('chapter-select'),
  addChapterBtn: document.getElementById('add-chapter-btn'),
  editorBody: document.querySelector('.editor-body'),
  editorTextarea: document.getElementById('editor-textarea'),
  editorPreview: document.getElementById('editor-preview'),
  btnBold: document.getElementById('btn-bold'),
  btnItalic: document.getElementById('btn-italic'),
  btnComment: document.getElementById('btn-comment'),
  btnHeading: document.getElementById('btn-heading'),
  btnCode: document.getElementById('btn-code'),
  modeEdit: document.getElementById('mode-edit'),
  modePreview: document.getElementById('mode-preview'),
  knowledgeGraphView: document.getElementById('knowledge-graph-view'),
  characterGraphSvg: document.getElementById('character-graph-svg'),
  graphNodeDetail: document.getElementById('graph-node-detail'),
  graphSummary: document.getElementById('graph-summary'),
  graphResetView: document.getElementById('graph-reset-view'),
  graphSearchInput: document.getElementById('graph-search-input'),
  graphFactionFilter: document.getElementById('graph-faction-filter'),
  graphRelationFilter: document.getElementById('graph-relation-filter'),
  graphAddRelation: document.getElementById('graph-add-relation'),
  graphEditModal: document.getElementById('graph-edit-modal'),
  graphEditTitle: document.getElementById('graph-edit-title'),
  closeGraphEditModal: document.getElementById('close-graph-edit-modal'),
  graphCharacterForm: document.getElementById('graph-character-form'),
  graphCharacterOriginalName: document.getElementById('graph-character-original-name'),
  graphCharacterName: document.getElementById('graph-character-name'),
  graphCharacterIdentity: document.getElementById('graph-character-identity'),
  graphCharacterPublicIdentity: document.getElementById('graph-character-public-identity'),
  graphCharacterHiddenIdentities: document.getElementById('graph-character-hidden-identities'),
  graphCharacterIdentityRevealStage: document.getElementById('graph-character-identity-reveal-stage'),
  graphCharacterFaction: document.getElementById('graph-character-faction'),
  graphCharacterFactionScope: document.getElementById('graph-character-faction-scope'),
  graphCharacterStoryFunction: document.getElementById('graph-character-story-function'),
  graphCharacterAgeAppearance: document.getElementById('graph-character-age-appearance'),
  graphCharacterPersonality: document.getElementById('graph-character-personality'),
  graphCharacterLifeHistory: document.getElementById('graph-character-life-history'),
  graphCharacterGrowthHistory: document.getElementById('graph-character-growth-history'),
  graphCharacterDesire: document.getElementById('graph-character-desire'),
  graphCharacterGoal: document.getElementById('graph-character-goal'),
  graphCharacterInterests: document.getElementById('graph-character-interests'),
  graphCharacterAgency: document.getElementById('graph-character-agency'),
  graphCharacterAbility: document.getElementById('graph-character-ability'),
  graphCharacterWeakness: document.getElementById('graph-character-weakness'),
  graphCharacterArc: document.getElementById('graph-character-arc'),
  graphCharacterHighlight: document.getElementById('graph-character-highlight'),
  graphCharacterFate: document.getElementById('graph-character-fate'),
  graphCharacterPlotAnchor: document.getElementById('graph-character-plot-anchor'),
  graphCharacterSettingBasis: document.getElementById('graph-character-setting-basis'),
  graphCharacterForeshadowLink: document.getElementById('graph-character-foreshadow-link'),
  graphRelationForm: document.getElementById('graph-relation-form'),
  graphRelationIndex: document.getElementById('graph-relation-index'),
  graphRelationSource: document.getElementById('graph-relation-source'),
  graphRelationTarget: document.getElementById('graph-relation-target'),
  graphRelationType: document.getElementById('graph-relation-type'),
  graphRelationDirection: document.getElementById('graph-relation-direction'),
  graphRelationDescription: document.getElementById('graph-relation-description'),
  graphRelationConflict: document.getElementById('graph-relation-conflict'),
  deleteGraphRelationBtn: document.getElementById('btn-delete-graph-relation'),
  
  activeAssetHeader: document.getElementById('active-asset-header'),
  backToChapterBtn: document.getElementById('back-to-chapter-btn'),
  activeAssetTitle: document.getElementById('active-asset-title'),
  
  // Modals
  assetModal: document.getElementById('asset-modal'),
  modalTitle: document.getElementById('modal-title'),
  assetForm: document.getElementById('asset-form'),
  assetId: document.getElementById('asset-id'),
  assetGroupType: document.getElementById('asset-group-type'),
  assetType: document.getElementById('asset-type'),
  assetCustomType: document.getElementById('asset-custom-type'),
  assetName: document.getElementById('asset-name'),
  assetDesc: document.getElementById('asset-desc'),
  closeModal: document.getElementById('close-modal'),
  btnCancelModal: document.getElementById('btn-cancel-modal'),

  // New Novel Modal
  newNovelModal: document.getElementById('new-novel-modal'),
  newNovelForm: document.getElementById('new-novel-form'),
  newNovelName: document.getElementById('new-novel-name'),
  newNovelBackground: document.getElementById('new-novel-background'),
  newNovelBackgroundSemantics: document.getElementById('new-novel-background-semantics'),
  newNovelSynopsis: document.getElementById('new-novel-synopsis'),
  newNovelError: document.getElementById('new-novel-error'),
  newNovelProgress: document.getElementById('new-novel-progress'),
  newNovelProgressText: document.getElementById('new-novel-progress-text'),
  createNewNovelBtn: document.getElementById('btn-create-new-novel'),
  closeNewNovelModal: document.getElementById('close-new-novel-modal'),
  btnCancelNewNovel: document.getElementById('btn-cancel-new-novel'),

  // Multi-Agent Task Bar
  agentTaskTextarea: document.getElementById('agent-task-textarea'),
  agentTaskSendBtn: document.getElementById('agent-task-send-btn'),
  agentTaskStatus: document.getElementById('agent-task-status'),
  agentTaskStatusText: document.getElementById('agent-task-status-text'),
  
  // Mention Autocomplete & Sync Modal
  agentMentionDropdown: document.getElementById('agent-mention-dropdown'),
  mentionSyncModal: document.getElementById('mention-sync-modal'),
  mentionSyncList: document.getElementById('mention-sync-list'),
  btnCancelMentionSync: document.getElementById('btn-cancel-mention-sync'),
  btnConfirmMentionSync: document.getElementById('btn-confirm-mention-sync'),

  // Outline Review Modal
  outlineReviewModal: document.getElementById('outline-review-modal'),
  outlineReviewSummary: document.getElementById('outline-review-summary'),
  outlineReviewBeginning: document.getElementById('outline-review-beginning'),
  outlineReviewDevelopment: document.getElementById('outline-review-development'),
  outlineReviewClimax: document.getElementById('outline-review-climax'),
  outlineReviewEnding: document.getElementById('outline-review-ending'),
  approveOutlineBtn: document.getElementById('btn-approve-outline'),
  rejectOutlineBtn: document.getElementById('btn-reject-outline'),

  // Character Review Modal
  characterReviewModal: document.getElementById('character-review-modal'),
  characterReviewCount: document.getElementById('character-review-count'),
  characterReviewRelationCount: document.getElementById('character-review-relation-count'),
  characterReviewFactionCount: document.getElementById('character-review-faction-count'),
  characterAuditScore: document.getElementById('character-audit-score'),
  characterAuditReport: document.getElementById('character-audit-report'),
  characterReviewList: document.getElementById('character-review-list'),
  approveCharactersBtn: document.getElementById('btn-approve-characters'),
  rejectCharactersBtn: document.getElementById('btn-reject-characters'),

  // Plot Review Modal
  plotReviewModal: document.getElementById('plot-review-modal'),
  plotReviewTitle: document.getElementById('plot-review-title'),
  plotReviewSubtitle: document.getElementById('plot-review-subtitle'),
  plotReviewChapterCount: document.getElementById('plot-review-chapter-count'),
  plotReviewVolumeCount: document.getElementById('plot-review-volume-count'),
  plotAuditScore: document.getElementById('plot-audit-score'),
  plotReviewReport: document.getElementById('plot-review-report'),
  plotReviewList: document.getElementById('plot-review-list'),
  approvePlotBtn: document.getElementById('btn-approve-plot'),
  rejectPlotBtn: document.getElementById('btn-reject-plot'),

  // Novel Info Modal
  novelInfoModal: document.getElementById('novel-info-modal'),
  novelInfoForm: document.getElementById('novel-info-form'),
  novelInfoId: document.getElementById('novel-info-id'),
  novelInfoName: document.getElementById('novel-info-name'),
  novelInfoBackground: document.getElementById('novel-info-background'),
  novelInfoSynopsis: document.getElementById('novel-info-synopsis'),
  closeNovelInfoModal: document.getElementById('close-novel-info-modal'),
  cancelNovelInfo: document.getElementById('cancel-novel-info'),
  
  // Settings / File Inputs
  newNovelFile: document.getElementById('new-novel-file'),
  referenceNovelFile: document.getElementById('reference-novel-file'),
  referenceNovelStatus: document.getElementById('reference-novel-status'),
  newNovelReferenceStatus: document.getElementById('new-novel-reference-status'),

  // Reference Manager Modal
  referenceManagerModal: document.getElementById('reference-manager-modal'),
  referenceFileList: document.getElementById('reference-file-list'),
  btnManagerAddFile: document.getElementById('btn-manager-add-file'),
  managerAddFileInput: document.getElementById('manager-add-file-input'),
  btnCancelReferenceManager: document.getElementById('btn-cancel-reference-manager'),
  btnConfirmReferenceAnalysis: document.getElementById('btn-confirm-reference-analysis'),
  referenceConfirmCount: document.getElementById('reference-confirm-count'),

  // Progress modal
  referenceProgressModal: document.getElementById('reference-progress-modal'),
  referenceLogContent: document.getElementById('reference-log-content'),
  referenceProgressBar: document.getElementById('reference-progress-bar'),
  referenceProgressPercentage: document.getElementById('reference-progress-percentage'),
  referenceProgressStatus: document.getElementById('reference-progress-status'),
  btnCloseReferenceProgress: document.getElementById('btn-close-reference-progress'),

  // Outline review report
  outlineAuditReport: document.getElementById('outline-audit-report'),

  // Settings Modal
  settingsBtn: document.getElementById('settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  settingsForm: document.getElementById('settings-form'),
  apiUrlInput: document.getElementById('api-url-input'),
  apiKeyInput: document.getElementById('api-key-input'),
  modelInput: document.getElementById('model-input'),
  closeSettingsModal: document.getElementById('close-settings-modal'),
  btnCancelSettings: document.getElementById('btn-cancel-settings'),
  btnSaveBg: document.getElementById('btn-save-bg'),
  settingsSlotsContainer: document.getElementById('settings-slots-container'),
  slotNameInput: document.getElementById('slot-name-input'),
  btnDeleteSlot: document.getElementById('btn-delete-slot'),
  taskApiSwitchContainer: document.getElementById('task-api-switch-container')
};

/* ==========================================================================
   Rendering Functions
   ========================================================================== */
function renderNovels() {
  elements.novelsContainer.innerHTML = '';
  
  const activeNovel = getActiveNovel();
  if (elements.activeNovelName && activeNovel) {
    elements.activeNovelName.textContent = activeNovel.name;
  }

  state.novels.forEach((novel, index) => {
    const isCollapsed = collapsedNovels.includes(novel.id);
    const isActive = novel.id === state.activeNovelId;
    
    const sectionDiv = document.createElement('div');
    sectionDiv.className = `novel-section ${isCollapsed ? 'collapsed' : ''} ${isActive ? 'active' : ''}`;
    sectionDiv.dataset.novelId = novel.id;

    // Render Header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'novel-section-header';
    
    headerDiv.innerHTML = `
      <div class="novel-title-click">
        <i data-lucide="chevron-down" class="chevron-icon"></i>
        <span class="novel-name-text">${novel.name}</span>
      </div>
      <div class="novel-controls">
        <button class="novel-ctrl-btn move-up" title="上移"><i data-lucide="chevron-up"></i></button>
        <button class="novel-ctrl-btn move-down" title="下移"><i data-lucide="chevron-down"></i></button>
        <button class="novel-ctrl-btn edit-novel" title="重命名"><i data-lucide="edit-2"></i></button>
        <button class="novel-ctrl-btn delete-novel" title="删除"><i data-lucide="trash-2"></i></button>
      </div>
    `;

    // Bind select and collapse (Accordion logic)
    const titleClick = headerDiv.querySelector('.novel-title-click');
    titleClick.addEventListener('click', () => {
      if (state.activeNovelId !== novel.id) {
        state.activeNovelId = novel.id;
        
        // Accordion: Collapse all other novels, expand this active one
        collapsedNovels = state.novels.map(n => n.id).filter(id => id !== novel.id);
        
        saveState();
        renderChapters();
        switchEditorTarget(novel.activeTarget.type, novel.activeTarget.id);
      } else {
        // Toggle collapse of active novel
        const collapsedIndex = collapsedNovels.indexOf(novel.id);
        if (collapsedIndex > -1) {
          collapsedNovels.splice(collapsedIndex, 1);
        } else {
          collapsedNovels.push(novel.id);
        }
      }
      
      saveState();
      renderNovels();
    });

    // Reordering handlers
    headerDiv.querySelector('.move-up').addEventListener('click', (e) => {
      e.stopPropagation();
      if (index > 0) {
        const temp = state.novels[index];
        state.novels[index] = state.novels[index - 1];
        state.novels[index - 1] = temp;
        saveState();
        renderNovels();
      }
    });

    headerDiv.querySelector('.move-down').addEventListener('click', (e) => {
      e.stopPropagation();
      if (index < state.novels.length - 1) {
        const temp = state.novels[index];
        state.novels[index] = state.novels[index + 1];
        state.novels[index + 1] = temp;
        saveState();
        renderNovels();
      }
    });

    // Rename handler
    headerDiv.querySelector('.edit-novel').addEventListener('click', (e) => {
      e.stopPropagation();
      openNovelInfoModal(novel, 'edit-button');
    });

    // Delete handler
    headerDiv.querySelector('.delete-novel').addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.novels.length <= 1) {
        alert('必须保留至少一本小说！');
        return;
      }
      if (confirm(`确定要删除小说《${novel.name}》吗？将会连同所有章节和设定一起删除！`)) {
        state.novels = state.novels.filter(n => n.id !== novel.id);
        if (state.activeNovelId === novel.id) {
          state.activeNovelId = state.novels[0].id;
        }
        
        // Re-calculate collapsed list
        collapsedNovels = state.novels.map(n => n.id).filter(id => id !== state.activeNovelId);
        saveState();
        
        renderChapters();
        const activeNovelNow = getActiveNovel();
        switchEditorTarget(activeNovelNow.activeTarget.type, activeNovelNow.activeTarget.id);
        renderNovels();
      }
    });

    // Render Content block
    const contentDiv = document.createElement('div');
    contentDiv.className = 'novel-section-content';

    let groupsHtml = '';
    Object.keys(GROUP_METADATA).forEach(groupKey => {
      const groupName = GROUP_METADATA[groupKey];
      groupsHtml += `
        <div class="collapsible-group" id="group-${groupKey}-${novel.id}">
          <div class="group-header">
            <div class="group-title-click">
              <i data-lucide="chevron-down" class="chevron-icon"></i>
              <span>${groupName}</span>
            </div>
            <button class="add-btn" data-type="${groupKey}" title="添加项目"><i data-lucide="plus"></i></button>
          </div>
          <div class="group-content" id="content-${groupKey}-${novel.id}"></div>
        </div>
      `;
    });
    contentDiv.innerHTML = groupsHtml;

    // Collapsible group title click
    contentDiv.querySelectorAll('.group-title-click').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const group = trigger.closest('.collapsible-group');
        group.classList.toggle('collapsed');
      });
    });

    contentDiv.querySelectorAll('.add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if (state.activeNovelId !== novel.id) {
          state.activeNovelId = novel.id;
          collapsedNovels = state.novels.map(n => n.id).filter(id => id !== novel.id);
          saveState();
          renderChapters();
          switchEditorTarget(novel.activeTarget.type, novel.activeTarget.id);
          renderNovels();
        }
        
        openAssetModal(btn.dataset.type);
      });
    });

    sectionDiv.appendChild(headerDiv);
    sectionDiv.appendChild(contentDiv);
    elements.novelsContainer.appendChild(sectionDiv);

    // Render inner assets
    renderAssetsForNovel(novel, contentDiv);
  });

  lucide.createIcons();
}

function formatPromiseLedger(promiseLedger) {
  return promiseLedger.map((promise, index) => `## ${index + 1}. ${promise.id}
- **类型**：${promise.promiseType}
- **种子事件**：${promise.seedEventId}
- **预计回收**：${promise.expectedPayoffWindow}
- **回收事件**：${promise.payoffEventId || '待后续卷回收'}
- **状态**：${promise.status}
- **风险**：${promise.risk}
- **读者问题**：${promise.readerQuestion}`).join('\n\n');
}

function createPromiseLedgerAsset(promiseLedger, novelId, timestamp = Date.now()) {
  const paidCount = promiseLedger.filter(promise => promise.status === 'paid').length;
  return {
    id: `promise-ledger-summary-${novelId}-${timestamp}`,
    group: 'plot-framework',
    type: 'promise-ledger',
    name: `伏笔台账（${promiseLedger.length}条，已回收${paidCount}条）`,
    desc: formatPromiseLedger(promiseLedger)
  };
}

function consolidatePromiseLedgerAssets(novel) {
  const assets = novel.assets || [];
  const individualAssets = assets.filter(asset => asset.name?.startsWith('伏笔台账：'));
  const summaryAssets = assets.filter(asset => asset.type === 'promise-ledger');
  const ledger = Array.isArray(novel.promiseLedger) ? novel.promiseLedger : [];
  if (!individualAssets.length && summaryAssets.length === 1 && ledger.length) {
    const refreshed = createPromiseLedgerAsset(ledger, novel.id);
    const current = summaryAssets[0];
    if (current.name === refreshed.name && current.desc === refreshed.desc) return false;
    current.name = refreshed.name;
    current.desc = refreshed.desc;
    return true;
  }
  if (!individualAssets.length && summaryAssets.length <= 1) return false;

  const retainedAssets = assets.filter(asset =>
    !asset.name?.startsWith('伏笔台账：') &&
    asset.type !== 'promise-ledger'
  );
  if (ledger.length) {
    retainedAssets.push(createPromiseLedgerAsset(ledger, novel.id));
  } else if (individualAssets.length) {
    retainedAssets.push({
      id: `promise-ledger-summary-${novel.id}-${Date.now()}`,
      group: 'plot-framework',
      type: 'promise-ledger',
      name: `伏笔台账（${individualAssets.length}条）`,
      desc: individualAssets.map((asset, index) =>
        `## ${index + 1}. ${asset.name.replace(/^伏笔台账：/, '')}\n${asset.desc}`
      ).join('\n\n')
    });
  } else if (summaryAssets[0]) {
    retainedAssets.push(summaryAssets[0]);
  }
  novel.assets = retainedAssets;
  return true;
}

function ensureCharacterDerivedAssets(novel) {
  const characters = Array.isArray(novel.characterBible) ? novel.characterBible : [];
  if (!characters.length) return false;

  let changed = false;
  const seenNames = new Set();
  novel.assets = (novel.assets || []).filter(asset => {
    if (!asset.characterName) return true;
    if (!characters.some(character => character.name === asset.characterName)) {
      changed = true;
      return false;
    }
    if (seenNames.has(asset.characterName)) {
      changed = true;
      return false;
    }
    seenNames.add(asset.characterName);
    return true;
  });

  characters.forEach((character, index) => {
    const existing = novel.assets.find(asset => asset.characterName === character.name);
    if (existing) {
      existing.characterData = character;
      return;
    }
    novel.assets.push(characterToAsset(character, novel.id, index));
    changed = true;
  });

  if (!novel.assets.some(asset => asset.type === 'character-network')) {
    novel.assets.push(topologyToAsset(novel.characterRelations || [], novel.id));
    changed = true;
  }
  return changed;
}

function renderAssetsForNovel(novel, sectionContentDiv) {
  const promiseLedgerChanged = consolidatePromiseLedgerAssets(novel);
  const characterAssetsChanged = ensureCharacterDerivedAssets(novel);
  if (promiseLedgerChanged || characterAssetsChanged) {
    refreshNovelKnowledgeGraph(novel);
    saveState();
    void persistNovelKnowledgeGraph(novel);
  }
  // Ensure categoryOrder is initialized
  if (!novel.categoryOrder) {
    novel.categoryOrder = cloneDefault(DEFAULT_CATEGORY_ORDER);
  }

  // Ensure all types existing in assets list are present in categoryOrder arrays
  const uniqueTypes = [...new Set(novel.assets.map(a => a.type))];
  uniqueTypes.forEach(t => {
    const asset = novel.assets.find(a => a.type === t);
    const groupKey = asset ? asset.group : 'world-setting';
    
    if (!novel.categoryOrder[groupKey]) {
      novel.categoryOrder[groupKey] = [];
    }
    if (!novel.categoryOrder[groupKey].includes(t)) {
      novel.categoryOrder[groupKey].push(t);
    }
  });

  // Group assets by group and type
  const groups = {};
  Object.keys(GROUP_METADATA).forEach(gk => {
    groups[gk] = {};
    // Ensure default sub-groups exist even if empty
    if (novel.categoryOrder[gk]) {
      novel.categoryOrder[gk].forEach(t => {
        groups[gk][t] = [];
      });
    }
  });

  novel.assets.forEach(asset => {
    const groupName = asset.group || 'world-setting';
    const typeName = asset.type;
    
    if (!groups[groupName]) {
      groups[groupName] = {};
    }
    if (!groups[groupName][typeName]) {
      groups[groupName][typeName] = [];
    }
    groups[groupName][typeName].push(asset);
  });

  function renderGroupCategory(groupKey, container) {
    const groupTypes = groups[groupKey] || {};
    container.innerHTML = '';
    
    // Sort types strictly by categoryOrder array
    const sortedTypes = Object.keys(groupTypes).sort((a, b) => {
      const orderList = novel.categoryOrder[groupKey] || [];
      const indexA = orderList.indexOf(a);
      const indexB = orderList.indexOf(b);
      
      if (indexA > -1 && indexB > -1) return indexA - indexB;
      if (indexA > -1) return -1;
      if (indexB > -1) return 1;
      return a.localeCompare(b);
    });

    sortedTypes.forEach(typeKey => {
      const assetsList = groupTypes[typeKey];
      const derivedPlotTypes = new Set([
        'volume-outline', 'chapter-outline', 'plot-causal-chain', 'plot-timeline',
        'plot-audit', 'final-outline', 'final-audit'
      ]);
      if (derivedPlotTypes.has(typeKey) && assetsList.length === 0) return;
      const metadata = TYPE_METADATA[typeKey] || { name: typeKey, icon: 'tag' };
      
      const subGroupDiv = document.createElement('div');
      subGroupDiv.className = 'sub-group';
      
      // Category Title layout with Up/Down buttons
      const titleContainer = document.createElement('div');
      titleContainer.className = 'sub-group-title-container';
      
      const titleDiv = document.createElement('div');
      titleDiv.className = 'sub-group-title';
      titleDiv.innerHTML = `
        <i data-lucide="${metadata.icon}" class="icon-small"></i> 
        <span>${metadata.name}</span>
      `;

      titleDiv.addEventListener('click', () => {
        subGroupDiv.classList.toggle('collapsed');
      });

      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'sub-group-controls';
      controlsDiv.innerHTML = `
        <button class="sub-group-ctrl-btn move-up" title="上移"><i data-lucide="chevron-up"></i></button>
        <button class="sub-group-ctrl-btn move-down" title="下移"><i data-lucide="chevron-down"></i></button>
      `;

      controlsDiv.querySelector('.move-up').addEventListener('click', (e) => {
        e.stopPropagation();
        moveCategory(novel, groupKey, typeKey, 'up');
      });

      controlsDiv.querySelector('.move-down').addEventListener('click', (e) => {
        e.stopPropagation();
        moveCategory(novel, groupKey, typeKey, 'down');
      });

      titleContainer.appendChild(titleDiv);
      titleContainer.appendChild(controlsDiv);
      subGroupDiv.appendChild(titleContainer);

      const ul = document.createElement('ul');
      ul.className = 'asset-list';
      if (groupKey === 'character-growth') {
        ul.dataset.characterList = 'true';
      }

      assetsList.forEach(asset => {
        const li = document.createElement('li');
        li.className = 'asset-item';
        li.dataset.id = asset.id;
        li.dataset.searchText = `${asset.name} ${asset.characterData?.faction || ''} ${asset.characterData?.identity || ''}`.toLowerCase();
        li.dataset.faction = asset.characterData?.faction || '';
        li.innerHTML = `
          <span>${asset.name}</span>
          <div class="asset-actions">
            <button class="asset-action-btn move-up" title="上移"><i data-lucide="chevron-up"></i></button>
            <button class="asset-action-btn move-down" title="下移"><i data-lucide="chevron-down"></i></button>
            <button class="asset-action-btn edit" title="编辑"><i data-lucide="edit-2"></i></button>
            <button class="asset-action-btn delete" title="删除"><i data-lucide="trash-2"></i></button>
          </div>
        `;

        li.addEventListener('click', (e) => {
          if (e.target.closest('.asset-action-btn')) return;
          
          if (state.activeNovelId !== novel.id) {
            state.activeNovelId = novel.id;
            collapsedNovels = state.novels.map(n => n.id).filter(id => id !== novel.id);
            saveState();
            renderChapters();
            renderNovels();
          }
          
          switchEditorTarget('asset', asset.id);
        });

        // Asset Up/Down Sorting click handlers
        li.querySelector('.move-up').addEventListener('click', (e) => {
          e.stopPropagation();
          moveAsset(novel, asset.id, 'up');
        });

        li.querySelector('.move-down').addEventListener('click', (e) => {
          e.stopPropagation();
          moveAsset(novel, asset.id, 'down');
        });

        li.querySelector('.edit').addEventListener('click', (e) => {
          e.stopPropagation();
          
          if (state.activeNovelId !== novel.id) {
            state.activeNovelId = novel.id;
            collapsedNovels = state.novels.map(n => n.id).filter(id => id !== novel.id);
            saveState();
            renderChapters();
            renderNovels();
          }
          
          openAssetModal(asset.group, asset);
        });

        li.querySelector('.delete').addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`确定要删除设定“${asset.name}”吗？`)) {
            novel.assets = novel.assets.filter(a => a.id !== asset.id);
            if (asset.characterName) removeCharacterFromNovel(novel, asset.characterName);
            refreshNovelKnowledgeGraph(novel);
            saveState();
            void persistNovelKnowledgeGraph(novel);
            renderNovels();
          }
        });

        ul.appendChild(li);
      });

      subGroupDiv.appendChild(ul);
      container.appendChild(subGroupDiv);
    });
  }

  // Render for each of the 8 groups
  Object.keys(GROUP_METADATA).forEach(groupKey => {
    const container = sectionContentDiv.querySelector(`#content-${groupKey}-${novel.id}`);
    if (container) {
      renderGroupCategory(groupKey, container);
      if (groupKey === 'character-growth' && novel.characterBible?.length) {
        const toolbar = document.createElement('div');
        toolbar.className = 'character-list-toolbar';
        const factions = [...new Set(novel.characterBible.map(character => character.faction).filter(Boolean))].sort();
        toolbar.innerHTML = `
          <input type="search" placeholder="搜索 ${novel.characterBible.length} 个人物..." />
          <select>
            <option value="">全部势力</option>
            ${factions.map(faction => `<option value="${escapeHtml(faction)}">${escapeHtml(faction)}</option>`).join('')}
          </select>
          <span>${novel.characterBible.length} 人</span>
        `;
        const searchInput = toolbar.querySelector('input');
        const factionSelect = toolbar.querySelector('select');
        const applyFilter = () => {
          const query = searchInput.value.trim().toLowerCase();
          const faction = factionSelect.value;
          container.querySelectorAll('.asset-item').forEach(item => {
            const matchesSearch = !query || item.dataset.searchText.includes(query);
            const matchesFaction = !faction || item.dataset.faction === faction || !item.dataset.faction;
            item.classList.toggle('hidden', !(matchesSearch && matchesFaction));
          });
        };
        searchInput.addEventListener('input', applyFilter);
        factionSelect.addEventListener('change', applyFilter);
        container.prepend(toolbar);
      }
    }
  });
}

function renderChapters() {
  elements.chapterSelect.innerHTML = '';
  const activeNovel = getActiveNovel();
  if (!activeNovel) return;
  
  activeNovel.chapters.forEach(ch => {
    const option = document.createElement('option');
    option.value = ch.id;
    option.textContent = ch.title;
    if (ch.id === activeNovel.currentChapterId) {
      option.selected = true;
    }
    elements.chapterSelect.appendChild(option);
  });
}

/* ==========================================================================
   Helper Operations
   ========================================================================== */
function switchEditorTarget(type, id) {
  const activeNovel = getActiveNovel();
  if (!activeNovel) return;

  closeActivePopover();

  activeNovel.activeTarget = { type, id };
  saveState();

  document.querySelectorAll('.asset-item').forEach(item => {
    item.classList.toggle('active', type === 'asset' && item.dataset.id === id);
  });

  if (type === 'chapter') {
    elements.editorBody.classList.remove('graph-active');
    elements.knowledgeGraphView.classList.add('hidden');
    applyViewMode();
    elements.chapterSelect.classList.remove('hidden');
    elements.addChapterBtn.classList.remove('hidden');
    elements.activeAssetHeader.classList.add('hidden');

    activeNovel.currentChapterId = id;
    elements.chapterSelect.value = id;
    saveState();

    loadCurrentChapter();
  } else if (type === 'asset') {
    elements.chapterSelect.classList.add('hidden');
    elements.addChapterBtn.classList.add('hidden');
    elements.activeAssetHeader.classList.remove('hidden');

    const asset = activeNovel.assets.find(a => a.id === id);
    if (asset) {
      if (asset.type === 'character-network' && activeNovel.characterBible?.length) {
        elements.editorTextarea.classList.add('hidden');
        elements.editorPreview.classList.add('hidden');
        elements.editorBody.classList.add('graph-active');
        elements.knowledgeGraphView.classList.remove('hidden');
        renderCharacterGraph(activeNovel);
        return;
      }
      elements.editorBody.classList.remove('graph-active');
      elements.knowledgeGraphView.classList.add('hidden');
      applyViewMode();
      const typeMetadata = {
        'location': '地理位置',
        'faction': '势力组织',
        'power': '核心力量',
        'secret': '隐秘线索'
      };
      const typeName = typeMetadata[asset.type] || asset.type;
      elements.activeAssetTitle.textContent = `设定：${asset.name}`;
      elements.editorTextarea.value = asset.desc;
      updatePreview();
    }
  }
}

function getFactionColor(faction, factionIndex) {
  const palette = ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];
  return palette[factionIndex % palette.length];
}

function isMalformedCharacterName(name) {
  const value = String(name || '').trim();
  return !value || value.length > 40 || /[\r\n#*]/.test(value);
}

function extractCanonicalCharacterName(rawName, knownNames = []) {
  const value = String(rawName || '').trim();
  if (!value) return '';
  if (!isMalformedCharacterName(value)) return value;

  const matchedKnownName = [...new Set(knownNames.map(name => String(name || '').trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .find(name => value === name || (
      value.startsWith(name) &&
      /^[（(\s:：\-—]/.test(value.slice(name.length, name.length + 1))
    ));
  if (matchedKnownName) return matchedKnownName;

  const firstLine = value.split(/\r?\n/, 1)[0]
    .replace(/^[#*\-\s]+/, '')
    .replace(/\*\*/g, '')
    .trim();
  const candidate = firstLine.split(/[（(:：]/, 1)[0].trim();
  return candidate && candidate.length <= 30 && !/[#*\r\n]/.test(candidate)
    ? candidate
    : value;
}

function abbreviateGraphLabel(value, maxLength = 18) {
  const normalized = String(value || '未命名')
    .replace(/\s+/g, ' ')
    .replace(/[*#]/g, '')
    .trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}…`
    : normalized;
}

function restoreCharacterFieldsFromEmbeddedProfile(character, rawName) {
  const text = String(rawName || '');
  if (!/[\r\n]/.test(text)) return;
  const fieldMap = {
    '公开身份': 'publicIdentity',
    '隐藏身份': 'hiddenIdentities',
    '身份揭露': 'identityRevealStage',
    '阵营': 'faction',
    '势力范围与权限': 'factionScope',
    '性格': 'personality',
    '欲望': 'desire',
    '目标': 'goal',
    '利益与底线': 'interests',
    '主观能动性': 'agency',
    '能力与资源': 'ability',
    '缺陷与代价': 'weakness',
    '设定依据': 'settingBasis',
    '总纲锚点': 'plotAnchor',
    '伏笔与回收链': 'foreshadowLink',
    '人物生平': 'lifeHistory',
    '成长史': 'growthHistory',
    '人物弧光': 'arc',
    '人物高光': 'highlight',
    '最终命运': 'fate'
  };
  const matches = text.matchAll(/^- \*\*([^*]+)\*\*[：:]\s*(.+)$/gm);
  for (const match of matches) {
    const field = fieldMap[match[1].trim()];
    const value = match[2].trim();
    if (!field || !value) continue;
    if (field === 'hiddenIdentities') {
      if (!Array.isArray(character.hiddenIdentities) || !character.hiddenIdentities.length) {
        character.hiddenIdentities = /^(无|暂无)$/.test(value) ? [] : [value];
      }
    } else if (!String(character[field] || '').trim()) {
      character[field] = value;
    }
  }
}

function repairNovelCharacterGraphData(novel) {
  const characters = Array.isArray(novel?.characterBible) ? novel.characterBible : [];
  const relations = Array.isArray(novel?.characterRelations) ? novel.characterRelations : [];
  if (!characters.length) return { renamed: 0, invalidRelations: 0, isolatedCharacters: 0 };

  const relationNames = relations.flatMap(relation => [relation.source, relation.target]);
  const rosterNames = (novel.characterRosterDraft?.characters || []).map(character => character?.name);
  const knownNames = [...relationNames, ...rosterNames].filter(Boolean);
  const occupiedNames = new Set(characters.map(character => String(character?.name || '').trim()).filter(Boolean));
  const renamed = new Map();

  characters.forEach(character => {
    const oldName = String(character?.name || '').trim();
    if (!isMalformedCharacterName(oldName)) return;
    const cleanName = extractCanonicalCharacterName(oldName, knownNames);
    if (!cleanName || cleanName === oldName || occupiedNames.has(cleanName)) return;
    restoreCharacterFieldsFromEmbeddedProfile(character, oldName);
    character.name = cleanName;
    occupiedNames.delete(oldName);
    occupiedNames.add(cleanName);
    renamed.set(oldName, cleanName);
  });

  if (renamed.size) {
    relations.forEach(relation => {
      relation.source = renamed.get(relation.source) || relation.source;
      relation.target = renamed.get(relation.target) || relation.target;
    });
    characters.forEach(character => {
      (character.relationships || []).forEach(relation => {
        relation.target = renamed.get(relation.target) || relation.target;
      });
    });
    (novel.assets || []).forEach(asset => {
      renamed.forEach((cleanName, oldName) => {
        if (asset.characterName === oldName) asset.characterName = cleanName;
        if (asset.characterData?.name === oldName) asset.characterData.name = cleanName;
        asset.name = replaceNameInStructuredValue(asset.name, oldName, cleanName);
        asset.desc = replaceNameInStructuredValue(asset.desc, oldName, cleanName);
      });
    });
    syncEmbeddedCharacterRelationships(novel);
    refreshTopologyAsset(novel);
  }

  const hydratedFields = hydrateNovelCharacterProfiles(novel);
  const names = new Set(characters.map(character => character.name));
  const validRelations = relations.filter(relation =>
    names.has(relation.source) &&
    names.has(relation.target) &&
    relation.source !== relation.target
  );
  const connectedNames = new Set(validRelations.flatMap(relation => [relation.source, relation.target]));
  return {
    renamed: renamed.size,
    hydratedFields,
    invalidRelations: relations.length - validRelations.length,
    isolatedCharacters: characters.filter(character => !connectedNames.has(character.name)).length
  };
}

const COMPLETE_CHARACTER_PROFILE_FIELDS = [
  'identity', 'publicIdentity', 'identityRevealStage', 'faction', 'factionScope',
  'storyFunction', 'ageAndAppearance', 'personality', 'desire', 'goal', 'interests',
  'agency', 'ability', 'weakness', 'settingBasis', 'plotAnchor', 'foreshadowLink',
  'lifeHistory', 'growthHistory', 'arc', 'highlight', 'fate'
];

function createCharacterFieldFallback(character, field) {
  const name = character.name || '该人物';
  const identity = character.identity || '现有身份';
  const faction = character.faction || '所属阵营';
  const fallbacks = {
    identity: '身份待补充',
    publicIdentity: identity,
    identityRevealStage: '无',
    faction: '未归属',
    factionScope: `${faction}及其相关剧情活动范围`,
    storyFunction: `以${identity}身份参与主线并影响人物关系与剧情走向`,
    ageAndAppearance: `年龄与外貌符合${identity}的身份、经历和世界观`,
    personality: `性格与${identity}的经历、利益和立场保持一致`,
    desire: `维护自身重视的人与生活，并实现与${identity}相符的个人愿望`,
    goal: `在主线推进中完成自身职责并解决与${name}直接相关的矛盾`,
    interests: `维护个人安全、重要关系及${faction}中的核心利益`,
    agency: `依据自身判断主动选择行动，并承担选择造成的后果`,
    ability: `具备与${identity}相匹配的知识、技能、人脉或行动资源`,
    weakness: `受身份边界、资源限制和个人执念影响，需要为关键选择付出代价`,
    settingBasis: `依据现有背景设定、人物身份、所属阵营和已审核总纲`,
    plotAnchor: `参与与${name}身份、阵营及直接关系相关的主线阶段`,
    foreshadowLink: `通过其身份选择和人物关系承担铺垫、转折或回收作用`,
    lifeHistory: `${name}以${identity}身份生活于${faction}，其经历、立场和关系共同塑造了当前选择。`,
    growthHistory: `${name}在主线冲突和关系变化中调整原有认知，并逐步形成更明确的行动立场。`,
    arc: `${name}从受既有身份与处境限制，成长为能够主动选择并承担代价的人。`,
    highlight: `${name}在关键剧情节点运用自身能力和资源作出不可替代的主动选择。`,
    fate: `${name}的最终结局由其核心欲望、关键选择、人物关系和所付代价共同决定。`
  };
  return fallbacks[field] || '暂无详细设定';
}

function ensureCompleteCharacterProfile(character) {
  let changed = 0;
  COMPLETE_CHARACTER_PROFILE_FIELDS.forEach(field => {
    if (!String(character[field] || '').trim()) {
      character[field] = createCharacterFieldFallback(character, field);
      changed += 1;
    }
  });
  if (!Array.isArray(character.hiddenIdentities)) {
    character.hiddenIdentities = [];
    changed += 1;
  }
  if (!Array.isArray(character.relationships)) {
    character.relationships = [];
    changed += 1;
  }
  return changed;
}

function hydrateNovelCharacterProfiles(novel) {
  const characters = Array.isArray(novel?.characterBible) ? novel.characterBible : [];
  if (!characters.length) return 0;

  let changed = 0;
  const characterAssets = (novel.assets || []).filter(asset =>
    asset?.characterName && typeof asset.desc === 'string'
  );
  characterAssets.forEach(asset => {
    const character = characters.find(item => item.name === asset.characterName);
    if (!character) return;
    const before = COMPLETE_CHARACTER_PROFILE_FIELDS
      .map(field => String(character[field] || ''))
      .join('\u0000');
    syncCharacterFromAsset(novel, asset);
    const after = COMPLETE_CHARACTER_PROFILE_FIELDS
      .map(field => String(character[field] || ''))
      .join('\u0000');
    if (before !== after) changed += 1;
  });
  characters.forEach(character => {
    changed += ensureCompleteCharacterProfile(character);
  });
  return changed;
}

let characterGraphTransform = { x: 0, y: 0, scale: 1 };

function calculateCharacterGraphLayout(characters, relations, factions) {
  const width = 880;
  const height = 760;
  const center = { x: width / 2, y: height / 2 };
  const degree = new Map(characters.map(character => [character.name, 0]));
  relations.forEach(relation => {
    degree.set(relation.source, (degree.get(relation.source) || 0) + 1);
    degree.set(relation.target, (degree.get(relation.target) || 0) + 1);
  });
  const anchors = new Map();
  factions.forEach((faction, index) => {
    if (factions.length === 1) {
      anchors.set(faction, center);
      return;
    }
    const angle = (Math.PI * 2 * index) / Math.max(factions.length, 1) - Math.PI / 2;
    anchors.set(faction, {
      x: center.x + Math.cos(angle) * 265,
      y: center.y + Math.sin(angle) * 265
    });
  });
  const positions = new Map();
  const orderedCharacters = [...characters].sort((a, b) =>
    (degree.get(b.name) || 0) - (degree.get(a.name) || 0) || a.name.localeCompare(b.name)
  );
  orderedCharacters.forEach((character, index) => {
    const faction = character.faction || '未归属';
    const anchor = anchors.get(faction) || center;
    const factionMembers = orderedCharacters.filter(item => (item.faction || '未归属') === faction);
    const memberIndex = factionMembers.findIndex(item => item.name === character.name);
    const angle = memberIndex * 2.399963229728653;
    const radius = 22 + Math.sqrt(memberIndex) * 34;
    const centrality = Math.min(0.42, (degree.get(character.name) || 0) / Math.max(relations.length, 1));
    positions.set(character.name, {
      x: anchor.x + Math.cos(angle) * radius + (center.x - anchor.x) * centrality,
      y: anchor.y + Math.sin(angle) * radius + (center.y - anchor.y) * centrality,
      vx: 0,
      vy: 0
    });
  });

  const relationPairs = relations
    .map(relation => ({
      source: positions.get(relation.source),
      target: positions.get(relation.target)
    }))
    .filter(pair => pair.source && pair.target);
  const minimumDistance = characters.length > 55 ? 42 : 50;
  for (let iteration = 0; iteration < 240; iteration += 1) {
    const cooling = 1 - iteration / 260;
    for (let i = 0; i < orderedCharacters.length; i += 1) {
      const first = positions.get(orderedCharacters[i].name);
      for (let j = i + 1; j < orderedCharacters.length; j += 1) {
        const second = positions.get(orderedCharacters[j].name);
        let dx = second.x - first.x;
        let dy = second.y - first.y;
        let distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < 0.01) {
          dx = (j % 2 ? 1 : -1) * 0.1;
          dy = (i % 2 ? 1 : -1) * 0.1;
          distanceSquared = 0.02;
        }
        const distance = Math.sqrt(distanceSquared);
        const collisionBoost = distance < minimumDistance ? 4.8 : 1;
        const force = Math.min(5, (1050 * collisionBoost) / distanceSquared) * cooling;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        first.vx -= fx;
        first.vy -= fy;
        second.vx += fx;
        second.vy += fy;
      }
    }
    relationPairs.forEach(({ source, target }) => {
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const desired = 105;
      const force = (distance - desired) * 0.008 * cooling;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    });
    orderedCharacters.forEach(character => {
      const position = positions.get(character.name);
      const factionAnchor = anchors.get(character.faction || '未归属') || center;
      const characterDegree = degree.get(character.name) || 0;
      const corePull = character.roleTier === '核心主角' || characterDegree >= 8 ? 0.012 : 0;
      position.vx += (factionAnchor.x - position.x) * 0.004 * cooling;
      position.vy += (factionAnchor.y - position.y) * 0.004 * cooling;
      position.vx += (center.x - position.x) * corePull * cooling;
      position.vy += (center.y - position.y) * corePull * cooling;
      position.vx *= 0.78;
      position.vy *= 0.78;
      position.x = Math.max(42, Math.min(width - 42, position.x + position.vx));
      position.y = Math.max(42, Math.min(height - 42, position.y + position.vy));
    });
  }
  return { positions, degree, width, height };
}

function getCharacterGraphCurve(source, target, relationIndex) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const bend = ((relationIndex % 5) - 2) * Math.min(11, distance * 0.035);
  const controlX = (source.x + target.x) / 2 - (dy / distance) * bend;
  const controlY = (source.y + target.y) / 2 + (dx / distance) * bend;
  return `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;
}

function replaceNameInStructuredValue(value, oldName, newName) {
  if (typeof value === 'string') return value.split(oldName).join(newName);
  if (Array.isArray(value)) return value.map(item => replaceNameInStructuredValue(item, oldName, newName));
  if (value && typeof value === 'object') {
    Object.keys(value).forEach(key => {
      value[key] = replaceNameInStructuredValue(value[key], oldName, newName);
    });
  }
  return value;
}

function syncEmbeddedCharacterRelationships(novel) {
  const relations = novel.characterRelations || [];
  (novel.characterBible || []).forEach(character => {
    character.relationships = relations
      .filter(relation => relation.source === character.name || relation.target === character.name)
      .map(relation => {
        const outgoing = relation.source === character.name;
        return {
          target: outgoing ? relation.target : relation.source,
          type: relation.type,
          dynamic: relation.description,
          conflict: relation.interestConflict
        };
      });
  });
}

function rebuildDerivedCharacterAssets(novel) {
  const characterAssetsByName = new Map(
    (novel.assets || [])
      .filter(asset => asset.characterName)
      .map(asset => [asset.characterName, asset])
  );
  (novel.characterBible || []).forEach((character, index) => {
    const existing = characterAssetsByName.get(character.name);
    const rebuilt = characterToAsset(character, novel.id, index);
    if (existing) {
      existing.name = rebuilt.name;
      existing.type = rebuilt.type;
      existing.desc = rebuilt.desc;
      existing.characterName = character.name;
      existing.characterData = character;
    }
  });
  refreshTopologyAsset(novel);
  if (novel.plotBlueprint) {
    const plotTypes = new Set(['volume-outline', 'chapter-outline', 'plot-causal-chain', 'plot-timeline', 'plot-audit']);
    const plotResult = {
      chapterCount: novel.plotBlueprint.chapterCount,
      architecture: novel.plotBlueprint.architecture,
      chapters: novel.plotBlueprint.chapters,
      audit: novel.plotBlueprint.audit
    };
    novel.assets = [
      ...novel.assets.filter(asset => !plotTypes.has(asset.type)),
      ...plotSystemToAssets(plotResult, novel.id)
    ];
  }
}

function commitGraphEdit(novel, selectedCharacterName = '') {
  novel.assets = (novel.assets || []).filter(asset => !['final-outline', 'final-audit'].includes(asset.type));
  novel.finalAudit = null;
  novel.finalOutline = null;
  syncEmbeddedCharacterRelationships(novel);
  rebuildDerivedCharacterAssets(novel);
  refreshNovelKnowledgeGraph(novel);
  saveState();
  void persistNovelKnowledgeGraph(novel);
  renderNovels();
  renderCharacterGraph(novel);
  if (selectedCharacterName) {
    const selectedNode = [...elements.characterGraphSvg.querySelectorAll('.graph-node')]
      .find(node => node.dataset.name === selectedCharacterName);
    selectedNode?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
}

function updateCharacterGlobally(novel, oldName, updates) {
  const newName = String(updates.name || oldName).trim();
  if (!newName) throw new Error('人物姓名不能为空。');
  if (newName !== oldName && novel.characterBible.some(character => character.name === newName)) {
    throw new Error(`人物姓名“${newName}”已存在。`);
  }
  const character = novel.characterBible.find(item => item.name === oldName);
  if (!character) throw new Error(`未找到人物：${oldName}`);

  if (newName !== oldName) {
    ['background', 'synopsis', 'analysisSummary'].forEach(field => {
      novel[field] = replaceNameInStructuredValue(novel[field], oldName, newName);
    });
    replaceNameInStructuredValue(novel.masterOutline, oldName, newName);
    replaceNameInStructuredValue(novel.narrativeKernel, oldName, newName);
    replaceNameInStructuredValue(novel.eventCards, oldName, newName);
    replaceNameInStructuredValue(novel.promiseLedger, oldName, newName);
    replaceNameInStructuredValue(novel.stateLedger, oldName, newName);
    replaceNameInStructuredValue(novel.factionPlans, oldName, newName);
    replaceNameInStructuredValue(novel.plotBlueprint, oldName, newName);
    replaceNameInStructuredValue(novel.plotBlueprintDraft, oldName, newName);
    replaceNameInStructuredValue(novel.chapters, oldName, newName);
    replaceNameInStructuredValue(novel.characterAudit, oldName, newName);
    replaceNameInStructuredValue(novel.outlineAudit, oldName, newName);
    (novel.assets || []).forEach(asset => {
      asset.name = replaceNameInStructuredValue(asset.name, oldName, newName);
      asset.desc = replaceNameInStructuredValue(asset.desc, oldName, newName);
      if (asset.characterName === oldName) asset.characterName = newName;
    });
    (novel.characterRelations || []).forEach(relation => {
      if (relation.source === oldName) relation.source = newName;
      if (relation.target === oldName) relation.target = newName;
      relation.description = replaceNameInStructuredValue(relation.description, oldName, newName);
      relation.interestConflict = replaceNameInStructuredValue(relation.interestConflict, oldName, newName);
    });
    const asset = novel.assets.find(item => item.characterName === oldName);
    if (asset) asset.characterName = newName;
  }
  Object.assign(character, updates, { name: newName });
  ensureCompleteCharacterProfile(character);
  commitGraphEdit(novel, newName);
}

function updateRelationGlobally(novel, relationIndex, updates) {
  const relations = novel.characterRelations || [];
  if (updates.source === updates.target) throw new Error('关系双方不能是同一人物。');
  const names = new Set((novel.characterBible || []).map(character => character.name));
  if (!names.has(updates.source) || !names.has(updates.target)) {
    throw new Error('关系双方必须来自现有人物库。');
  }
  if (relationIndex < 0) {
    const duplicate = relations.some(relation =>
      relation.source === updates.source &&
      relation.target === updates.target &&
      relation.type === updates.type
    );
    if (duplicate) throw new Error('相同人物与关系类型已经存在。');
    relations.push(updates);
  } else {
    const relation = relations[relationIndex];
    if (!relation) throw new Error('未找到要修改的关系。');
    const replacements = [
      [relation.description, updates.description],
      [relation.interestConflict, updates.interestConflict]
    ].filter(([from, to]) => from && to && from !== to);
    replacements.forEach(([from, to]) => {
      replaceNameInStructuredValue(novel.eventCards, from, to);
      replaceNameInStructuredValue(novel.plotBlueprint, from, to);
      replaceNameInStructuredValue(novel.plotBlueprintDraft, from, to);
      (novel.assets || []).forEach(asset => {
        asset.desc = String(asset.desc || '').split(from).join(to);
      });
    });
    Object.assign(relation, updates);
  }
  if (novel.plotBlueprint) {
    novel.plotBlueprint.relationshipCanon = relations.map(relation => ({ ...relation }));
  }
  if (novel.plotBlueprintDraft) {
    novel.plotBlueprintDraft.relationshipCanon = relations.map(relation => ({ ...relation }));
  }
  commitGraphEdit(novel);
}

function openCharacterGraphEditor(character) {
  ensureCompleteCharacterProfile(character);
  elements.graphEditTitle.textContent = `编辑人物：${character.name}`;
  elements.graphRelationForm.classList.add('hidden');
  elements.graphCharacterForm.classList.remove('hidden');
  elements.graphCharacterOriginalName.value = character.name;
  elements.graphCharacterName.value = character.name;
  elements.graphCharacterIdentity.value = character.identity || '';
  elements.graphCharacterPublicIdentity.value = character.publicIdentity || '';
  elements.graphCharacterHiddenIdentities.value = (character.hiddenIdentities || []).join('、');
  elements.graphCharacterIdentityRevealStage.value = character.identityRevealStage || '';
  elements.graphCharacterFaction.value = character.faction || '';
  elements.graphCharacterFactionScope.value = character.factionScope || '';
  elements.graphCharacterStoryFunction.value = character.storyFunction || '';
  elements.graphCharacterAgeAppearance.value = character.ageAndAppearance || '';
  elements.graphCharacterPersonality.value = character.personality || '';
  elements.graphCharacterLifeHistory.value = character.lifeHistory || '';
  elements.graphCharacterGrowthHistory.value = character.growthHistory || '';
  elements.graphCharacterDesire.value = character.desire || '';
  elements.graphCharacterGoal.value = character.goal || '';
  elements.graphCharacterInterests.value = character.interests || '';
  elements.graphCharacterAgency.value = character.agency || '';
  elements.graphCharacterAbility.value = character.ability || '';
  elements.graphCharacterWeakness.value = character.weakness || '';
  elements.graphCharacterArc.value = character.arc || '';
  elements.graphCharacterHighlight.value = character.highlight || '';
  elements.graphCharacterFate.value = character.fate || '';
  elements.graphCharacterPlotAnchor.value = character.plotAnchor || '';
  elements.graphCharacterSettingBasis.value = character.settingBasis || '';
  elements.graphCharacterForeshadowLink.value = character.foreshadowLink || '';
  elements.graphEditModal.classList.remove('hidden');
}

function openRelationGraphEditor(novel, relationIndex) {
  const relation = novel.characterRelations[relationIndex] || {
    source: novel.characterBible[0]?.name || '',
    target: novel.characterBible[1]?.name || '',
    type: '利益关联',
    direction: '双向',
    description: '',
    interestConflict: ''
  };
  const options = novel.characterBible.map(character =>
    `<option value="${escapeHtml(character.name)}">${escapeHtml(character.name)}</option>`
  ).join('');
  elements.graphEditTitle.textContent = relationIndex < 0
    ? '新增人物关系'
    : `编辑关系：${relation.source} → ${relation.target}`;
  elements.graphCharacterForm.classList.add('hidden');
  elements.graphRelationForm.classList.remove('hidden');
  elements.graphRelationIndex.value = relationIndex;
  elements.graphRelationSource.innerHTML = options;
  elements.graphRelationTarget.innerHTML = options;
  elements.graphRelationSource.value = relation.source;
  elements.graphRelationTarget.value = relation.target;
  elements.graphRelationType.value = relation.type || '';
  elements.graphRelationDirection.value = relation.direction || '双向';
  elements.graphRelationDescription.value = relation.description || '';
  elements.graphRelationConflict.value = relation.interestConflict || '';
  elements.deleteGraphRelationBtn.classList.toggle('hidden', relationIndex < 0);
  elements.graphEditModal.classList.remove('hidden');
}

function renderCharacterGraph(novel) {
  const characters = novel.characterBible || [];
  characters.forEach(ensureCompleteCharacterProfile);
  const relations = novel.characterRelations || [];
  const allCharacterNames = new Set(characters.map(character => character.name));
  const validRelations = relations.filter(relation =>
    allCharacterNames.has(relation.source) &&
    allCharacterNames.has(relation.target) &&
    relation.source !== relation.target
  );
  const invalidRelationCount = relations.length - validRelations.length;
  const svg = elements.characterGraphSvg;
  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 1200 760');
  const namespace = 'http://www.w3.org/2000/svg';
  const factions = [...new Set(characters.map(character => character.faction || '未归属'))];
  const relationTypes = [...new Set(validRelations.map(relation => relation.type).filter(Boolean))].sort();
  const searchQuery = elements.graphSearchInput.value.trim().toLowerCase();
  const factionFilter = elements.graphFactionFilter.value;
  const relationFilter = elements.graphRelationFilter.value;

  elements.graphFactionFilter.innerHTML = `
    <option value="">全部势力</option>
    ${factions.map(faction => `<option value="${escapeHtml(faction)}">${escapeHtml(faction)}</option>`).join('')}
  `;
  elements.graphFactionFilter.value = factions.includes(factionFilter) ? factionFilter : '';
  elements.graphRelationFilter.innerHTML = `
    <option value="">全部关系</option>
    ${relationTypes.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('')}
  `;
  elements.graphRelationFilter.value = relationTypes.includes(relationFilter) ? relationFilter : '';

  const visibleCharacters = characters.filter(character => {
    const searchText = `${character.name} ${character.identity} ${character.faction}`.toLowerCase();
    return (!searchQuery || searchText.includes(searchQuery)) &&
      (!elements.graphFactionFilter.value || character.faction === elements.graphFactionFilter.value);
  });
  const visibleNames = new Set(visibleCharacters.map(character => character.name));
  const visibleRelations = validRelations.filter(relation =>
    visibleNames.has(relation.source) &&
    visibleNames.has(relation.target) &&
    (!elements.graphRelationFilter.value || relation.type === elements.graphRelationFilter.value)
  );
  const visibleFactions = [...new Set(visibleCharacters.map(character => character.faction || '未归属'))];
  const factionMap = new Map(factions.map((faction, index) => [faction, index]));
  const { positions, degree } = calculateCharacterGraphLayout(
    visibleCharacters,
    visibleRelations,
    visibleFactions
  );

  const viewport = document.createElementNS(namespace, 'g');
  viewport.setAttribute('class', 'graph-viewport');
  const factionLayer = document.createElementNS(namespace, 'g');
  const edgeLayer = document.createElementNS(namespace, 'g');
  const nodeLayer = document.createElementNS(namespace, 'g');
  const edgeElements = [];
  visibleFactions.forEach(faction => {
    const members = visibleCharacters
      .filter(character => (character.faction || '未归属') === faction)
      .map(character => positions.get(character.name))
      .filter(Boolean);
    if (!members.length) return;
    const centroid = {
      x: members.reduce((sum, member) => sum + member.x, 0) / members.length,
      y: members.reduce((sum, member) => sum + member.y, 0) / members.length
    };
    const radiusX = Math.max(52, Math.max(...members.map(member => Math.abs(member.x - centroid.x))) + 38);
    const radiusY = Math.max(42, Math.max(...members.map(member => Math.abs(member.y - centroid.y))) + 34);
    const region = document.createElementNS(namespace, 'ellipse');
    region.setAttribute('class', 'graph-faction-region');
    region.setAttribute('cx', centroid.x);
    region.setAttribute('cy', centroid.y);
    region.setAttribute('rx', radiusX);
    region.setAttribute('ry', radiusY);
    region.setAttribute('stroke', getFactionColor(faction, factionMap.get(faction) || 0));
    factionLayer.appendChild(region);
    const factionLabel = document.createElementNS(namespace, 'text');
    factionLabel.setAttribute('class', 'graph-faction-label');
    factionLabel.setAttribute('x', centroid.x);
    factionLabel.setAttribute('y', Math.max(18, centroid.y - radiusY + 16));
    factionLabel.textContent = `${abbreviateGraphLabel(faction, 16)} · ${members.length}人`;
    factionLayer.appendChild(factionLabel);
  });
  visibleRelations.forEach(relation => {
    const source = positions.get(relation.source);
    const target = positions.get(relation.target);
    if (!source || !target) return;
    const relationIndex = relations.indexOf(relation);
    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('d', getCharacterGraphCurve(source, target, relationIndex));
    path.setAttribute('class', 'graph-edge');
    path.dataset.source = relation.source;
    path.dataset.target = relation.target;
    path.dataset.relationIndex = relationIndex;
    const title = document.createElementNS(namespace, 'title');
    title.textContent = `${relation.source} → ${relation.target}：${relation.type}`;
    path.appendChild(title);
    path.addEventListener('click', event => {
      event.stopPropagation();
      edgeElements.forEach(edge => edge.classList.remove('selected'));
      nodeLayer.querySelectorAll('.graph-node').forEach(node => node.classList.remove('selected'));
      path.classList.add('selected');
      elements.graphNodeDetail.innerHTML = `
        <h3>${escapeHtml(relation.source)} → ${escapeHtml(relation.target)}</h3>
        <div class="detail-faction">${escapeHtml(relation.type)} · ${escapeHtml(relation.direction)}</div>
        <dl>
          <div><dt>关系现状与变化</dt><dd>${escapeHtml(relation.description)}</dd></div>
          <div><dt>利益交集或冲突</dt><dd>${escapeHtml(relation.interestConflict)}</dd></div>
        </dl>
        <div class="graph-detail-actions">
          <button type="button" class="btn btn-primary" data-edit-relation="${relations.indexOf(relation)}">编辑关系</button>
        </div>
      `;
      elements.graphNodeDetail.querySelector('[data-edit-relation]')?.addEventListener('click', () => {
        openRelationGraphEditor(novel, relations.indexOf(relation));
      });
    });
    edgeLayer.appendChild(path);
    edgeElements.push(path);
  });

  visibleCharacters.forEach(character => {
    const position = positions.get(character.name);
    if (!position) return;
    const group = document.createElementNS(namespace, 'g');
    group.setAttribute('class', 'graph-node');
    group.setAttribute('transform', `translate(${position.x} ${position.y})`);
    group.dataset.name = character.name;

    const characterDegree = degree.get(character.name) || 0;
    const nodeRadius = character.roleTier === '核心主角'
      ? 20
      : Math.min(17, 11 + characterDegree * 0.55);
    const circle = document.createElementNS(namespace, 'circle');
    circle.setAttribute('r', nodeRadius);
    circle.setAttribute('fill', getFactionColor(character.faction, factionMap.get(character.faction) || 0));
    group.appendChild(circle);

    const label = document.createElementNS(namespace, 'text');
    const labelAbove = position.y > 650 || (position.y > 350 && position.x < 440);
    label.setAttribute('y', labelAbove ? -(nodeRadius + 8) : nodeRadius + 16);
    label.textContent = abbreviateGraphLabel(character.name, 12);
    const labelTitle = document.createElementNS(namespace, 'title');
    labelTitle.textContent = character.name;
    group.appendChild(labelTitle);
    group.appendChild(label);

    group.addEventListener('click', () => {
      nodeLayer.querySelectorAll('.graph-node').forEach(node => node.classList.remove('selected'));
      group.classList.add('selected');
      edgeElements.forEach(edge => {
        edge.classList.toggle(
          'highlighted',
          edge.dataset.source === character.name || edge.dataset.target === character.name
        );
      });
      elements.graphNodeDetail.innerHTML = `
        <h3>${escapeHtml(character.name)}</h3>
        <div class="detail-faction">${escapeHtml(character.identity)} · ${escapeHtml(character.faction)}</div>
        <dl>
          <div><dt>公开身份</dt><dd>${escapeHtml(character.publicIdentity || character.identity)}</dd></div>
          <div><dt>隐藏身份</dt><dd>${escapeHtml(character.hiddenIdentities?.join('、') || '无')}</dd></div>
          <div><dt>身份揭露</dt><dd>${escapeHtml(character.identityRevealStage || '无')}</dd></div>
          <div><dt>势力范围</dt><dd>${escapeHtml(character.factionScope || '未填写')}</dd></div>
          <div><dt>剧情功能</dt><dd>${escapeHtml(character.storyFunction)}</dd></div>
          <div><dt>年龄与外貌</dt><dd>${escapeHtml(character.ageAndAppearance)}</dd></div>
          <div><dt>性格</dt><dd>${escapeHtml(character.personality)}</dd></div>
          <div><dt>主要经历</dt><dd>${escapeHtml(character.lifeHistory)}</dd></div>
          <div><dt>成长史</dt><dd>${escapeHtml(character.growthHistory)}</dd></div>
          <div><dt>人物弧光</dt><dd>${escapeHtml(character.arc)}</dd></div>
          <div><dt>高光时刻</dt><dd>${escapeHtml(character.highlight)}</dd></div>
          <div><dt>最终结局</dt><dd>${escapeHtml(character.fate)}</dd></div>
          <div><dt>欲望</dt><dd>${escapeHtml(character.desire)}</dd></div>
          <div><dt>目标</dt><dd>${escapeHtml(character.goal)}</dd></div>
          <div><dt>利益与底线</dt><dd>${escapeHtml(character.interests)}</dd></div>
          <div><dt>主观能动性</dt><dd>${escapeHtml(character.agency)}</dd></div>
          <div><dt>能力与资源</dt><dd>${escapeHtml(character.ability)}</dd></div>
          <div><dt>缺陷与代价</dt><dd>${escapeHtml(character.weakness)}</dd></div>
          <div><dt>总纲对应情节</dt><dd>${escapeHtml(character.plotAnchor)}</dd></div>
          <div><dt>设定依据</dt><dd>${escapeHtml(character.settingBasis)}</dd></div>
          <div><dt>伏笔与回收</dt><dd>${escapeHtml(character.foreshadowLink)}</dd></div>
          <div><dt>直接关系</dt><dd>${escapeHtml(
            (character.relationships || [])
              .map(relation => `${relation.target}（${relation.type}）：${relation.dynamic || relation.conflict || '关系随剧情发展'}`)
              .join('；') || '暂无直接关系'
          )}</dd></div>
        </dl>
        <div class="graph-detail-actions">
          <button type="button" class="btn btn-primary" data-edit-character="${escapeHtml(character.name)}">编辑人物</button>
        </div>
      `;
      elements.graphNodeDetail.querySelector('[data-edit-character]')?.addEventListener('click', () => {
        openCharacterGraphEditor(character);
      });
    });
    nodeLayer.appendChild(group);
  });
  viewport.appendChild(factionLayer);
  viewport.appendChild(edgeLayer);
  viewport.appendChild(nodeLayer);
  svg.appendChild(viewport);

  const applyTransform = () => {
    viewport.setAttribute(
      'transform',
      `translate(${characterGraphTransform.x} ${characterGraphTransform.y}) scale(${characterGraphTransform.scale})`
    );
  };
  applyTransform();

  let dragging = false;
  let lastPoint = null;
  svg.onpointerdown = event => {
    if (event.target.closest('.graph-node') || event.target.closest('.graph-edge')) return;
    dragging = true;
    lastPoint = { x: event.clientX, y: event.clientY };
    svg.setPointerCapture(event.pointerId);
    svg.style.cursor = 'grabbing';
  };
  svg.onpointermove = event => {
    if (!dragging || !lastPoint) return;
    characterGraphTransform.x += event.clientX - lastPoint.x;
    characterGraphTransform.y += event.clientY - lastPoint.y;
    lastPoint = { x: event.clientX, y: event.clientY };
    applyTransform();
  };
  svg.onpointerup = event => {
    dragging = false;
    lastPoint = null;
    svg.releasePointerCapture(event.pointerId);
    svg.style.cursor = 'grab';
  };
  svg.onwheel = event => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 0.89;
    characterGraphTransform.scale = Math.max(0.35, Math.min(3, characterGraphTransform.scale * factor));
    applyTransform();
  };

  const graphWarnings = invalidRelationCount
    ? ` · ${invalidRelationCount} 条关系端点无效`
    : '';
  elements.graphSummary.textContent =
    `${visibleCharacters.length}/${characters.length} 人 · ${visibleRelations.length}/${validRelations.length} 条关系 · ${factions.length} 个势力${graphWarnings}`;
  elements.graphSummary.title = invalidRelationCount
    ? '存在引用了人物库中不存在姓名的关系，请重新生成人物关系或编辑修复。'
    : '';
  elements.graphNodeDetail.innerHTML = '<span>点击人物节点查看并编辑人物；点击关系连线查看并编辑关系。修改会同步到人物库、章节细纲和知识图谱。</span>';
}

function loadCurrentChapter() {
  const activeNovel = getActiveNovel();
  if (!activeNovel) return;

  if (activeNovel.activeTarget.type === 'chapter') {
    const currentChapter = activeNovel.chapters.find(ch => ch.id === activeNovel.currentChapterId);
    if (currentChapter) {
      elements.editorTextarea.value = currentChapter.content;
      updatePreview();
    }
  }
}

let activePopover = null;

function closeActivePopover() {
  if (activePopover) {
    activePopover.remove();
    activePopover = null;
  }
}

function getFriendlyRefLabel(activeNovel, refType, refId, refNum, matchedText) {
  if (!activeNovel) return matchedText;
  
  if (refType === 'chapter-outline') {
    const chNum = parseInt(refNum, 10);
    const chapter = activeNovel.plotBlueprint?.chapters?.find(ch => parseInt(ch.chapterNumber, 10) === chNum);
    if (chapter) {
      const hasPrefix = matchedText.includes('前置章节：');
      const prefix = hasPrefix ? '前置章节：' : '';
      return `${prefix}第${chNum}章《${chapter.title}》`;
    }
  } else if (refType === 'thread') {
    const thread = activeNovel.plotBlueprint?.architecture?.narrativeThreads?.find(t => 
      t.id.toLowerCase() === refId.toLowerCase() || t.id.toLowerCase() === `thread-${refNum}`
    );
    if (thread) {
      const hasPrefix = matchedText.includes('叙事线：');
      const prefix = hasPrefix ? '叙事线：' : '';
      return `${prefix}${thread.name}线`;
    }
  } else if (refType === 'promise') {
    const promise = activeNovel.promiseLedger?.find(p => 
      p.id.toLowerCase() === refId.toLowerCase() || p.id.toLowerCase() === `promise-${refNum}`
    );
    if (promise) {
      let prefix = '';
      if (matchedText.includes('埋设伏笔：')) prefix = '埋设伏笔：';
      else if (matchedText.includes('回收伏笔：')) prefix = '回收伏笔：';
      else if (matchedText.includes('埋伏笔：')) prefix = '埋伏笔：';
      
      const brief = promise.readerQuestion ? ` (${promise.readerQuestion.slice(0, 10)}...)` : '';
      return `${prefix}伏笔：${promise.id}${brief}`;
    }
  }
  
  return matchedText;
}

function enrichReferenceLinks(htmlString) {
  if (!htmlString) return htmlString;
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const activeNovel = getActiveNovel();
  
  const skipTags = new Set(['CODE', 'PRE', 'SCRIPT', 'STYLE', 'A']);
  
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue;
      const regex = /(?:前置章节：|叙事线：|埋伏笔：|种子事件：|回收伏笔：|埋设伏笔：)?(chapter-outline-\d+|thread-\d+|promise-\d+)/g;
      
      if (regex.test(text)) {
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        regex.lastIndex = 0;
        
        let match;
        while ((match = regex.exec(text)) !== null) {
          const matchText = match[0];
          const refId = match[1];
          const startIndex = match.index;
          
          if (startIndex > lastIndex) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex, startIndex)));
          }
          
          const badge = document.createElement('span');
          badge.className = 'ref-badge';
          
          let refType = '';
          let refNum = '';
          if (refId.startsWith('chapter-outline-')) {
            refType = 'chapter-outline';
            refNum = refId.replace('chapter-outline-', '');
            badge.classList.add('badge-chapter');
          } else if (refId.startsWith('thread-')) {
            refType = 'thread';
            refNum = refId.replace('thread-', '');
            badge.classList.add('badge-thread');
          } else if (refId.startsWith('promise-')) {
            refType = 'promise';
            refNum = refId.replace('promise-', '');
            badge.classList.add('badge-promise');
          }
          
          badge.dataset.refType = refType;
          badge.dataset.refId = refId;
          badge.dataset.refNum = refNum;
          badge.textContent = getFriendlyRefLabel(activeNovel, refType, refId, refNum, matchText);
          
          fragment.appendChild(badge);
          lastIndex = regex.lastIndex;
        }
        
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }
        
        node.parentNode.replaceChild(fragment, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE && !skipTags.has(node.tagName)) {
      const children = Array.from(node.childNodes);
      children.forEach(walk);
    }
  }
  
  Array.from(doc.body.childNodes).forEach(walk);
  return doc.body.innerHTML;
}

function getRefDetails(activeNovel, refType, refId, refNum) {
  if (!activeNovel) return null;
  
  if (refType === 'chapter-outline') {
    const chNum = parseInt(refNum, 10);
    const chapter = activeNovel.plotBlueprint?.chapters?.find(ch => parseInt(ch.chapterNumber, 10) === chNum);
    if (chapter) {
      return {
        title: `第 ${chNum} 章：${chapter.title}`,
        badge: '章节细纲',
        badgeClass: 'badge-chapter',
        body: `**时空**：${chapter.time} ｜ ${chapter.location}
**视角**：${chapter.viewpoint}
**目标**：${chapter.characterGoal}
**行动**：${chapter.characterAction}
**冲突**：${chapter.conflict}
**梗概**：${chapter.plotSummary}
**转折与代价**：${chapter.turn} ｜ ${chapter.cost}
**信息与关系变化**：${chapter.knowledgeDelta} ｜ ${chapter.relationshipDelta}
**状态变化**：${chapter.stateDelta}
**因果理由**：${chapter.causalReason}`,
        targetId: `chapter-outline-${activeNovel.id}-${chNum}`
      };
    }
  } else if (refType === 'thread') {
    const thread = activeNovel.plotBlueprint?.architecture?.narrativeThreads?.find(t => 
      t.id.toLowerCase() === refId.toLowerCase() || t.id.toLowerCase() === `thread-${refNum}`
    );
    if (thread) {
      return {
        title: `叙事线：${thread.name}`,
        badge: '叙事线',
        badgeClass: 'badge-thread',
        body: `**驱动角色**：${thread.driverCharacters.join('、') || '无'}
**起止状态**：${thread.startState} → ${thread.endState}
**与其他线交汇点**：${thread.intersections.join('；') || '无'}`,
        targetType: 'plot-timeline'
      };
    }
  } else if (refType === 'promise') {
    const promise = activeNovel.promiseLedger?.find(p => 
      p.id.toLowerCase() === refId.toLowerCase() || p.id.toLowerCase() === `promise-${refNum}`
    );
    if (promise) {
      return {
        title: `伏笔：${promise.id}`,
        badge: '伏笔台账',
        badgeClass: 'badge-promise',
        body: `**类型**：${promise.promiseType}
**读者疑问**：${promise.readerQuestion}
**预计回收**：${promise.expectedPayoffWindow}
**状态与风险**：状态 ${promise.status} ｜ 风险 ${promise.risk}
**种子事件**：${promise.seedEventId || '无'}
**回收事件**：${promise.payoffEventId || '暂无'}`,
        targetType: 'promise-ledger'
      };
    }
  }
  
  const asset = activeNovel.assets?.find(a => 
    a.id === refId || 
    (refType === 'chapter-outline' && a.type === 'chapter-outline' && (a.id.includes(`-${refNum}-`) || a.id.endsWith(`-${refNum}`))) ||
    (refType === 'promise' && a.type === 'promise-ledger')
  );
  if (asset) {
    return {
      title: asset.name,
      badge: TYPE_METADATA[asset.type]?.name || asset.type,
      badgeClass: `badge-${refType}`,
      body: asset.desc.substring(0, 350) + (asset.desc.length > 350 ? '...' : ''),
      targetId: asset.id
    };
  }
  
  return null;
}

function jumpToReference(activeNovel, refType, refId, refNum, details) {
  let targetId = details.targetId;
  let targetType = details.targetType;
  
  let assetToSelect = null;
  if (targetId) {
    assetToSelect = activeNovel.assets.find(a => a.id === targetId);
    if (!assetToSelect && refType === 'chapter-outline') {
      assetToSelect = activeNovel.assets.find(a => a.type === 'chapter-outline' && (a.id.includes(`-outline-${activeNovel.id}-${refNum}-`) || a.id.endsWith(`-${refNum}`)));
      if (!assetToSelect) {
        const paddedNum = String(refNum).padStart(3, '0');
        assetToSelect = activeNovel.assets.find(a => a.type === 'chapter-outline' && a.name.startsWith(paddedNum));
      }
    }
  } else if (targetType) {
    assetToSelect = activeNovel.assets.find(a => a.type === targetType);
  }
  
  if (assetToSelect) {
    switchEditorTarget('asset', assetToSelect.id);
    
    setTimeout(() => {
      const sidebarItem = document.querySelector(`.asset-item[data-id="${assetToSelect.id}"]`);
      if (sidebarItem) {
        sidebarItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        sidebarItem.classList.add('pulse-highlight');
        setTimeout(() => sidebarItem.classList.remove('pulse-highlight'), 1500);
      }
      
      if (refType === 'thread' || refType === 'promise') {
        setTimeout(() => {
          elements.modePreview.click();
          
          setTimeout(() => {
            const previewEl = elements.editorPreview;
            const targets = Array.from(previewEl.querySelectorAll('h2, h3, li, p, strong'));
            const targetEl = targets.find(el => {
              const text = el.textContent;
              return text.includes(refId) || 
                     (refType === 'promise' && text.includes(`promise-${refNum}`)) || 
                     text.includes(details.title);
            });
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              const parentLi = targetEl.closest('li') || targetEl;
              parentLi.style.backgroundColor = 'rgba(59, 130, 246, 0.22)';
              parentLi.style.borderRadius = '4px';
              parentLi.style.transition = 'background-color 0.3s ease';
              setTimeout(() => {
                parentLi.style.backgroundColor = '';
              }, 2000);
            }
          }, 150);
        }, 150);
      }
    }, 100);
  } else {
    showToast(`未找到该参考项的详细设定。`, 'warning');
  }
}

function showRefPopover(badge) {
  closeActivePopover();
  
  const activeNovel = getActiveNovel();
  if (!activeNovel) return;
  
  const refType = badge.dataset.refType;
  const refId = badge.dataset.refId;
  const refNum = badge.dataset.refNum;
  
  const details = getRefDetails(activeNovel, refType, refId, refNum);
  if (!details) return;
  
  const popover = document.createElement('div');
  popover.className = 'ref-popover';
  
  popover.innerHTML = `
    <div class="popover-header">
      <span class="popover-title" title="${escapeHtml(details.title)}">${escapeHtml(details.title)}</span>
      <span class="popover-badge ${details.badgeClass}">${escapeHtml(details.badge)}</span>
    </div>
    <div class="popover-body">${marked.parse(details.body)}</div>
    <div class="popover-footer">
      <button class="popover-btn popover-btn-primary" id="popover-jump-btn">定位到此处</button>
      <button class="popover-btn" id="popover-close-btn">关闭</button>
    </div>
  `;
  
  document.body.appendChild(popover);
  activePopover = popover;
  
  const badgeRect = badge.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  
  let left = badgeRect.left + window.scrollX + (badgeRect.width - popoverRect.width) / 2;
  let top = badgeRect.top + window.scrollY - popoverRect.height - 10;
  
  if (left < 10) left = 10;
  if (left + popoverRect.width > window.innerWidth - 10) {
    left = window.innerWidth - popoverRect.width - 10;
  }
  
  if (badgeRect.top - popoverRect.height - 10 < 10) {
    top = badgeRect.bottom + window.scrollY + 10;
  }
  
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
  
  popover.querySelector('#popover-close-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    closeActivePopover();
  });
  
  popover.querySelector('#popover-jump-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    jumpToReference(activeNovel, refType, refId, refNum, details);
    closeActivePopover();
  });
}

function updatePreview() {
  const text = elements.editorTextarea.value;
  elements.editorPreview.innerHTML = enrichReferenceLinks(marked.parse(text));
}

function insertTextAtCursor(textToInsert) {
  const textarea = elements.editorTextarea;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const currentText = textarea.value;
  
  textarea.value = currentText.substring(0, start) + textToInsert + currentText.substring(end);
  textarea.focus();
  textarea.selectionStart = start + textToInsert.length;
  textarea.selectionEnd = start + textToInsert.length;
  
  const activeNovel = getActiveNovel();
  if (!activeNovel) return;

  if (activeNovel.activeTarget.type === 'chapter') {
    const currentChapter = activeNovel.chapters.find(ch => ch.id === activeNovel.activeTarget.id);
    if (currentChapter) {
      currentChapter.content = textarea.value;
      saveState();
    }
  } else if (activeNovel.activeTarget.type === 'asset') {
    const currentAsset = activeNovel.assets.find(a => a.id === activeNovel.activeTarget.id);
    if (currentAsset) {
      currentAsset.desc = textarea.value;
      syncCharacterFromAsset(activeNovel, currentAsset);
      refreshTopologyAsset(activeNovel);
      refreshNovelKnowledgeGraph(activeNovel);
      saveState();
      void persistNovelKnowledgeGraph(activeNovel);
    }
  }
  updatePreview();
}

function wrapSelection(prefix, suffix) {
  const textarea = elements.editorTextarea;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  const replacement = prefix + selectedText + suffix;
  
  insertTextAtCursor(replacement);
  
  textarea.selectionStart = start + prefix.length;
  textarea.selectionEnd = start + prefix.length + selectedText.length;
}

function moveCategory(novel, groupKey, typeKey, direction) {
  const list = novel.categoryOrder[groupKey];
  const typeIndex = list.indexOf(typeKey);
  if (typeIndex === -1) return;

  if (direction === 'up' && typeIndex > 0) {
    const temp = list[typeIndex];
    list[typeIndex] = list[typeIndex - 1];
    list[typeIndex - 1] = temp;
  } else if (direction === 'down' && typeIndex < list.length - 1) {
    const temp = list[typeIndex];
    list[typeIndex] = list[typeIndex + 1];
    list[typeIndex + 1] = temp;
  }
  saveState();
  renderNovels();
}

function moveAsset(novel, assetId, direction) {
  const assetIndex = novel.assets.findIndex(a => a.id === assetId);
  if (assetIndex === -1) return;
  const asset = novel.assets[assetIndex];
  
  // Find all assets in same category type
  const siblings = novel.assets.filter(a => a.type === asset.type);
  const siblingIndex = siblings.findIndex(a => a.id === assetId);
  
  if (direction === 'up' && siblingIndex > 0) {
    const targetSibling = siblings[siblingIndex - 1];
    const targetIndex = novel.assets.findIndex(a => a.id === targetSibling.id);
    
    // Swap position in assets array
    const temp = novel.assets[assetIndex];
    novel.assets[assetIndex] = novel.assets[targetIndex];
    novel.assets[targetIndex] = temp;
  } else if (direction === 'down' && siblingIndex < siblings.length - 1) {
    const targetSibling = siblings[siblingIndex + 1];
    const targetIndex = novel.assets.findIndex(a => a.id === targetSibling.id);
    
    // Swap position in assets array
    const temp = novel.assets[assetIndex];
    novel.assets[assetIndex] = novel.assets[targetIndex];
    novel.assets[targetIndex] = temp;
  }
  saveState();
  renderNovels();
}

/* ==========================================================================
   Modal Handling
   ========================================================================== */
function openNovelInfoModal(novel, openedFrom = 'edit-button') {
  novelInfoModalOpenedFrom = openedFrom;
  elements.novelInfoId.value = novel.id;
  elements.novelInfoName.value = novel.name || '';
  elements.novelInfoBackground.value = novel.background || '';
  elements.novelInfoSynopsis.value = novel.synopsis || '';
  elements.novelInfoModal.classList.remove('hidden');
  elements.novelInfoName.focus();
}

function closeNovelInfoModal() {
  elements.novelInfoModal.classList.add('hidden');
  elements.novelInfoForm.reset();
  novelInfoModalOpenedFrom = null;
}

function openAssetModal(group, asset = null) {
  elements.assetModal.classList.remove('hidden');
  elements.assetGroupType.value = group;
  elements.assetCustomType.classList.add('hidden');
  elements.assetCustomType.removeAttribute('required');
  
  elements.assetType.innerHTML = '';
  
  const groupTypes = {
    'world-setting': [
      { value: 'location', text: '地理位置' },
      { value: 'faction', text: '势力组织' },
      { value: 'system', text: '力量体系/法则' }
    ],
    'character-growth': [
      { value: 'main-character', text: '核心主角（视角中心）' },
      { value: 'major-character', text: '主要人物' },
      { value: 'family-character', text: '主角家族' },
      { value: 'former-sect-character', text: '旧宗门人物' },
      { value: 'antagonist-character', text: '反派阵营' },
      { value: 'neutral-character', text: '中立势力' },
      { value: 'hidden-character', text: '隐藏势力' },
      { value: 'civilian-character', text: '凡人社会' },
      { value: 'supporting-character', text: '核心配角（关系网络）' },
      { value: 'character-network', text: '人物关系拓扑' }
    ],
    'themes-core': [
      { value: 'core-power', text: '核心力量/机制' },
      { value: 'secret-clue', text: '隐秘线索（终极悬念）' }
    ],
    'plot-framework': [
      { value: 'main-outline', text: '主线大纲（因果螺旋）' },
      { value: 'pace-hooks', text: '节奏与钩子' },
      { value: 'planting', text: '伏笔设置（Planting）' },
      { value: 'payoff', text: '回收机制（Payoff）' }
    ]
  };

  const types = groupTypes[group] || [];
  let optionsHtml = '';
  types.forEach(t => {
    optionsHtml += `<option value="${t.value}">${t.text}</option>`;
  });
  optionsHtml += `<option value="custom">自定义类别...</option>`;
  elements.assetType.innerHTML = optionsHtml;

  elements.modalTitle.textContent = asset ? '编辑设定项' : '添加设定项';

  if (asset) {
    elements.assetId.value = asset.id;
    elements.assetName.value = asset.name;
    elements.assetDesc.value = asset.desc;
    
    const standardTypes = [
      'location', 'faction', 'system', 
      ...CHARACTER_TYPE_ORDER,
      'core-power', 'secret-clue', 
      'main-outline', 'pace-hooks', 'planting', 'payoff'
    ];
    if (standardTypes.includes(asset.type)) {
      elements.assetType.value = asset.type;
      elements.assetCustomType.value = '';
    } else {
      elements.assetType.value = 'custom';
      elements.assetCustomType.value = asset.type;
      elements.assetCustomType.classList.remove('hidden');
      elements.assetCustomType.setAttribute('required', 'true');
    }
  } else {
    elements.assetId.value = '';
    elements.assetName.value = '';
    elements.assetDesc.value = '';
    elements.assetCustomType.value = '';
  }
}

function closeAssetModal() {
  elements.assetModal.classList.add('hidden');
  elements.assetForm.reset();
  elements.assetCustomType.classList.add('hidden');
  elements.assetCustomType.removeAttribute('required');
}

function openNewNovelModal() {
  pendingReferenceFiles = [];
  pendingNewNovelAnalyses = [];
  if (elements.newNovelReferenceStatus) {
    elements.newNovelReferenceStatus.style.display = 'none';
    elements.newNovelReferenceStatus.textContent = '';
  }
  elements.newNovelModal.classList.remove('hidden');
  elements.newNovelError.classList.add('hidden');
  elements.newNovelProgress.classList.add('hidden');
  renderNewNovelBackgroundSemantics();
  elements.newNovelName.focus();
}

function closeNewNovelModal() {
  if (elements.createNewNovelBtn.disabled) return;
  elements.newNovelModal.classList.add('hidden');
  elements.newNovelForm.reset();
  elements.newNovelError.classList.add('hidden');
  elements.newNovelProgress.classList.add('hidden');
  renderNewNovelBackgroundSemantics();
}

function showNewNovelError(message) {
  elements.newNovelError.textContent = message;
  elements.newNovelError.classList.remove('hidden');
}

function renderSettingsSlots() {
  if (!elements.settingsSlotsContainer) return;
  elements.settingsSlotsContainer.innerHTML = '';
  
  if (!state.apiKeys) state.apiKeys = [];
  state.apiKeys.forEach(slot => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `slot-btn ${slot.id === state.activeApiKeyId ? 'active' : ''}`;
    const isPrimary = slot.id === state.primaryApiKeyId;
    const primaryLabel = isPrimary ? '<span style="color: #ef4444; font-weight: bold; margin-left: 4px;">【主控】</span>' : '';
    btn.innerHTML = `
      <span>${slot.name || '配置槽'}</span>
      <span style="font-size: 0.65rem; opacity: 0.7;">(${slot.apiModel || '未设定'})</span>
      ${primaryLabel}
    `;
    btn.addEventListener('click', () => {
      // Save current input values into the previously active slot first
      const currentActive = state.apiKeys.find(s => s.id === state.activeApiKeyId);
      if (currentActive) {
        currentActive.apiKey = elements.apiKeyInput.value.trim();
        currentActive.apiUrl = elements.apiUrlInput.value.trim();
        currentActive.apiModel = elements.modelInput.value.trim();
      }
      
      state.activeApiKeyId = slot.id;
      syncActiveApiKeyFromSlots();
      
      // Update fields
      elements.apiKeyInput.value = slot.apiKey || '';
      elements.apiUrlInput.value = slot.apiUrl || '';
      elements.modelInput.value = slot.apiModel || '';
      elements.slotNameInput.value = slot.name || '';
      
      renderSettingsSlots();
      renderTaskApiSwitch();
    });
    elements.settingsSlotsContainer.appendChild(btn);
  });
  
  // Add Slot button
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'slot-btn btn-add-slot';
  addBtn.innerHTML = '<i data-lucide="plus" style="width: 14px; height: 14px;"></i>添加配置';
  addBtn.addEventListener('click', () => {
    // Save current active first
    const currentActive = state.apiKeys.find(s => s.id === state.activeApiKeyId);
    if (currentActive) {
      currentActive.apiKey = elements.apiKeyInput.value.trim();
      currentActive.apiUrl = elements.apiUrlInput.value.trim();
      currentActive.apiModel = elements.modelInput.value.trim();
    }
    
    const newId = 'slot-' + Date.now();
    const newSlot = {
      id: newId,
      name: `配置槽 ${state.apiKeys.length + 1}`,
      apiKey: '',
      apiModel: 'gemini-2.0-flash',
      apiUrl: 'https://generativelanguage.googleapis.com'
    };
    state.apiKeys.push(newSlot);
    state.activeApiKeyId = newId;
    syncActiveApiKeyFromSlots();
    
    // Update inputs
    elements.apiKeyInput.value = '';
    elements.apiUrlInput.value = 'https://generativelanguage.googleapis.com';
    elements.modelInput.value = 'gemini-2.0-flash';
    elements.slotNameInput.value = newSlot.name;
    
    renderSettingsSlots();
    renderTaskApiSwitch();
    lucide.createIcons();
  });
  elements.settingsSlotsContainer.appendChild(addBtn);
  
  // Update slot name input for the current active slot
  const activeSlot = state.apiKeys.find(s => s.id === state.activeApiKeyId);
  if (activeSlot) {
    elements.slotNameInput.value = activeSlot.name || '';
  }
  
  // Disable delete button if only 1 slot
  if (state.apiKeys.length <= 1) {
    elements.btnDeleteSlot.style.display = 'none';
  } else {
    elements.btnDeleteSlot.style.display = 'block';
  }
  
  // Update "Set as primary model" button state
  const btnSetPrimary = document.getElementById('btn-set-primary-slot');
  if (btnSetPrimary) {
    if (state.activeApiKeyId === state.primaryApiKeyId) {
      btnSetPrimary.textContent = '已设置为主控模型';
      btnSetPrimary.disabled = true;
      btnSetPrimary.className = 'btn btn-secondary';
      btnSetPrimary.style.opacity = '0.6';
      btnSetPrimary.style.cursor = 'not-allowed';
    } else {
      btnSetPrimary.textContent = '设为主控模型';
      btnSetPrimary.disabled = false;
      btnSetPrimary.className = 'btn btn-secondary';
      btnSetPrimary.style.opacity = '1';
      btnSetPrimary.style.cursor = 'pointer';
    }
  }
  
  lucide.createIcons();
}

function renderTaskApiSwitch() {
  if (!elements.taskApiSwitchContainer) return;
  elements.taskApiSwitchContainer.innerHTML = '';
  
  if (!state.apiKeys || state.apiKeys.length === 0) {
    syncActiveApiKeyFromSlots();
  }
  
  // Add a small label
  const label = document.createElement('span');
  label.style.fontSize = '0.75rem';
  label.style.color = 'var(--text-muted)';
  label.style.alignSelf = 'center';
  label.style.marginRight = '6px';
  label.textContent = '当前AI模型：';
  elements.taskApiSwitchContainer.appendChild(label);

  state.apiKeys.forEach(slot => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `task-api-switch-btn ${slot.id === state.activeApiKeyId ? 'active' : ''}`;
    const icon = slot.id === state.activeApiKeyId ? 'check' : 'cpu';
    const isPrimary = slot.id === state.primaryApiKeyId;
    const primaryLabel = isPrimary ? '<span style="color: #ef4444; font-weight: bold; margin-left: 4px;">【主控】</span>' : '';
    btn.innerHTML = `
      <i data-lucide="${icon}" style="width: 12px; height: 12px;"></i>
      <span>${slot.name || '未命名'}</span>
      <span style="opacity: 0.6; font-size: 0.7rem; margin-left: 2px;">[${slot.apiModel || '未设定'}]</span>
      ${primaryLabel}
    `;
    btn.addEventListener('click', () => {
      state.activeApiKeyId = slot.id;
      syncActiveApiKeyFromSlots();
      saveState();
      
      // Update form values if settings modal is open
      if (!elements.settingsModal.classList.contains('hidden')) {
        elements.apiKeyInput.value = slot.apiKey || '';
        elements.apiUrlInput.value = slot.apiUrl || '';
        elements.modelInput.value = slot.apiModel || '';
        elements.slotNameInput.value = slot.name || '';
        renderSettingsSlots();
      }
      
      renderTaskApiSwitch();
      showToast(`已切换到 AI 配置：${slot.name} (${slot.apiModel})`, 'success');
    });
    elements.taskApiSwitchContainer.appendChild(btn);
  });
  
  lucide.createIcons();
}

/* ==========================================================================
   Mention Autocomplete & Linkage Sync
   ========================================================================== */
let selectedMentionIndex = 0;
let filteredMentions = [];

function checkMentions() {
  const textarea = elements.agentTaskTextarea;
  if (!textarea) return;
  const val = textarea.value;
  const caretPos = textarea.selectionStart;
  
  const lastAtIdx = val.lastIndexOf('@', caretPos - 1);
  if (lastAtIdx === -1) {
    hideMentionDropdown();
    return;
  }
  
  const query = val.slice(lastAtIdx + 1, caretPos);
  if (/\s/.test(query)) {
    hideMentionDropdown();
    return;
  }
  
  const activeNovel = getActiveNovel();
  if (!activeNovel) {
    hideMentionDropdown();
    return;
  }
  
  const options = [];
  (activeNovel.chapters || []).forEach(ch => {
    options.push({
      id: ch.id,
      name: ch.title,
      type: 'chapter',
      typeName: '章节'
    });
  });
  
  (activeNovel.assets || []).forEach(asset => {
    const derivedPlotTypes = new Set([
      'volume-outline', 'chapter-outline', 'plot-causal-chain', 'plot-timeline',
      'plot-audit', 'final-outline', 'final-audit'
    ]);
    if (derivedPlotTypes.has(asset.type)) return;
    options.push({
      id: asset.id,
      name: asset.name,
      type: 'asset',
      typeName: TYPE_METADATA[asset.type]?.name || asset.type
    });
  });
  
  filteredMentions = options.filter(opt => 
    opt.name.toLowerCase().includes(query.toLowerCase())
  );
  
  if (filteredMentions.length === 0) {
    hideMentionDropdown();
    return;
  }
  
  selectedMentionIndex = Math.min(selectedMentionIndex, filteredMentions.length - 1);
  if (selectedMentionIndex < 0) selectedMentionIndex = 0;
  showMentionDropdown(lastAtIdx);
}

function showMentionDropdown(atIndex) {
  const dropdown = elements.agentMentionDropdown || document.getElementById('agent-mention-dropdown');
  if (!dropdown) return;
  
  dropdown.innerHTML = '';
  dropdown.classList.remove('hidden');
  
  const header = document.createElement('div');
  header.className = 'mention-dropdown-header';
  header.textContent = '输入以过滤小说文件...';
  dropdown.appendChild(header);
  
  filteredMentions.forEach((opt, idx) => {
    const item = document.createElement('div');
    item.className = `mention-dropdown-item ${idx === selectedMentionIndex ? 'active' : ''}`;
    item.innerHTML = `
      <span>${escapeHtml(opt.name)}</span>
      <span class="mention-dropdown-item-type">${escapeHtml(opt.typeName)}</span>
    `;
    item.addEventListener('click', () => {
      insertMention(opt, atIndex);
    });
    dropdown.appendChild(item);
  });
}

function hideMentionDropdown() {
  const dropdown = elements.agentMentionDropdown || document.getElementById('agent-mention-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
}

function insertMention(option, atIndex) {
  const textarea = elements.agentTaskTextarea;
  if (!textarea) return;
  const val = textarea.value;
  const caretPos = textarea.selectionStart;
  
  const mentionText = `@[${option.name}](${option.type}:${option.id}) `;
  const newVal = val.slice(0, atIndex) + mentionText + val.slice(caretPos);
  
  textarea.value = newVal;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
  
  const newCaretPos = atIndex + mentionText.length;
  textarea.setSelectionRange(newCaretPos, newCaretPos);
  hideMentionDropdown();
}

function renderMentionSelection() {
  const dropdown = elements.agentMentionDropdown || document.getElementById('agent-mention-dropdown');
  if (!dropdown) return;
  const items = dropdown.querySelectorAll('.mention-dropdown-item');
  items.forEach((item, idx) => {
    item.classList.toggle('active', idx === selectedMentionIndex);
    if (idx === selectedMentionIndex) {
      item.scrollIntoView({ block: 'nearest' });
    }
  });
}

function parseMentionSyncResponse(rawText) {
  let cleaned = String(rawText || '').trim();
  if (cleaned.includes('```json')) {
    cleaned = cleaned.split('```json')[1].split('```')[0].trim();
  } else if (cleaned.includes('```')) {
    cleaned = cleaned.split('```')[1].split('```')[0].trim();
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && Array.isArray(parsed.modifications)) {
      return parsed;
    }
  } catch (e) {
    console.error("JSON parsing error on AI modifications:", e);
  }
  throw new Error("模型返回的修改方案格式不正确，无法自动解析，请重试。");
}

async function handleMentionModificationTask(task) {
  const mentions = [];
  const regex = /@\[(.*?)\]\((.*?):(.*?)\)/g;
  let match;
  while ((match = regex.exec(task)) !== null) {
    mentions.push({
      name: match[1],
      type: match[2],
      id: match[3]
    });
  }
  
  if (mentions.length === 0) return false;
  
  elements.agentTaskSendBtn.disabled = true;
  elements.agentTaskTextarea.disabled = true;
  elements.agentTaskStatus.classList.remove('hidden');
  elements.agentTaskStatusText.textContent = '正在分析修改指令与关联文件...';
  
  try {
    const activeNovel = getActiveNovel();
    if (!activeNovel) throw new Error("未找到活跃的小说项目。");
    
    // Gather targeted files content
    const targetFiles = mentions.map(m => {
      if (m.type === 'chapter') {
        const ch = activeNovel.chapters.find(c => c.id === m.id);
        return { id: m.id, type: 'chapter', name: ch ? ch.title : m.name, content: ch ? ch.content : '' };
      } else {
        const asset = activeNovel.assets.find(a => a.id === m.id);
        return { id: m.id, type: 'asset', name: asset ? asset.name : m.name, content: asset ? (asset.desc || '') : '' };
      }
    });
    
    // Gather all files for context
    const allFiles = [];
    (activeNovel.chapters || []).forEach(ch => {
      allFiles.push({ id: ch.id, type: 'chapter', name: ch.title, content: ch.content });
    });
    (activeNovel.assets || []).forEach(a => {
      const derivedPlotTypes = new Set([
        'volume-outline', 'chapter-outline', 'plot-causal-chain', 'plot-timeline',
        'plot-audit', 'final-outline', 'final-audit'
      ]);
      if (derivedPlotTypes.has(a.type)) return;
      allFiles.push({ id: a.id, type: 'asset', name: a.name, content: a.desc || '' });
    });
    
    const systemPrompt = `你是一个小说协作修改 Agent。用户希望修改小说中的特定文件（通过 @ 符号引用）。
你需要根据用户的修改指令，分析出所有需要进行内容修改的文件。这包括用户直接指定的“目标文件”，以及因为目标文件修改而需要联动同步修改的“关联文件”（例如：修改了某个人物的名字、背景、势力，需要同步修改提及该人物的章节、大纲、其他关联设定等；修改了某个地点设定，需要同步修改发生在该地点的剧情描述等）。

请你必须输出严格的 JSON 格式（不要包含 markdown 代码块外的其他文字），结构如下：
{
  "modifications": [
    {
      "type": "chapter" | "asset",
      "id": "文件的唯一ID",
      "name": "文件名称/标题",
      "isTarget": true, 
      "changeSummary": "该文件具体修改内容的简短中文说明",
      "reason": "进行此修改/联动修改的原因（中文）",
      "newContent": "修改后的该文件全部新内容。如果是章节，保留章节的完整格式与标题；如果是设定资产，保留其描述内容。注意：如果内容未发生改变，请不要放入此数组中。"
    }
  ]
}
`;

    const userPrompt = `小说名称：${activeNovel.name}
用户修改指令：${task}
用户直接引用的目标文件：
${targetFiles.map(tf => `- [${tf.type === 'chapter' ? '章节' : '设定'}] ${tf.name} (ID: ${tf.id})`).join('\n')}

当前小说所有文件的内容列表：
---
${allFiles.map(file => `文件类型: ${file.type === 'chapter' ? '章节' : '设定'}\n文件ID: ${file.id}\n文件名称: ${file.name}\n文件内容:\n${file.content}\n---`).join('\n')}

请进行深度分析，并输出所有需要修改的文件的修改方案（包含目标文件与关联同步文件）。如果某个文件在逻辑上不需要做任何实质修改，请不要列在 "modifications" 数组中。`;

    const rawText = await callConfiguredAI(systemPrompt, userPrompt, true);
    const result = parseMentionSyncResponse(rawText);
    
    if (!result.modifications || result.modifications.length === 0) {
      showToast('AI 分析完毕，未发现需要做任何修改。', 'info');
      return true;
    }
    
    // Open the sync confirmation modal
    const modal = elements.mentionSyncModal || document.getElementById('mention-sync-modal');
    modal.classList.remove('hidden');
    
    renderMentionSyncList(result.modifications);
    
    // Bind buttons
    const btnConfirm = elements.btnConfirmMentionSync || document.getElementById('btn-confirm-mention-sync');
    const btnCancel = elements.btnCancelMentionSync || document.getElementById('btn-cancel-mention-sync');
    
    // Remove existing event listeners by replacing buttons
    const newConfirm = btnConfirm.cloneNode(true);
    const newCancel = btnCancel.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newConfirm, btnConfirm);
    btnCancel.parentNode.replaceChild(newCancel, btnCancel);
    
    newConfirm.addEventListener('click', () => {
      const selectedIndices = [];
      modal.querySelectorAll('.sync-item-checkbox').forEach(cb => {
        if (cb.checked) {
          selectedIndices.push(parseInt(cb.dataset.index, 10));
        }
      });
      
      if (selectedIndices.length === 0) {
        showToast('未勾选任何修改项，修改已取消。', 'info');
      } else {
        applySyncModifications(result.modifications, selectedIndices);
      }
      modal.classList.add('hidden');
      elements.agentTaskTextarea.value = '';
      elements.agentTaskTextarea.style.height = 'auto';
    });
    
    newCancel.addEventListener('click', () => {
      showToast('修改已取消。', 'info');
      modal.classList.add('hidden');
    });
    
    return true;
  } catch (error) {
    showToast(`修改分析失败：${error.message}`, 'error');
    return true; 
  } finally {
    elements.agentTaskSendBtn.disabled = false;
    elements.agentTaskTextarea.disabled = false;
    elements.agentTaskStatus.classList.add('hidden');
  }
}

function renderMentionSyncList(modifications) {
  const container = elements.mentionSyncList || document.getElementById('mention-sync-list');
  if (!container) return;
  container.innerHTML = '';
  
  modifications.forEach((mod, idx) => {
    const card = document.createElement('div');
    card.className = 'sync-item-card';
    
    const isTargetText = mod.isTarget ? '修改目标' : '关联同步';
    const badgeClass = mod.isTarget ? 'target' : 'association';
    
    // Find original content
    const activeNovel = getActiveNovel();
    let originalContent = '（新建文件，暂无原始内容）';
    if (activeNovel) {
      if (mod.type === 'chapter') {
        const ch = activeNovel.chapters.find(c => c.id === mod.id);
        if (ch) originalContent = ch.content;
      } else {
        const asset = activeNovel.assets.find(a => a.id === mod.id);
        if (asset) originalContent = asset.desc || '';
      }
    }
    
    card.innerHTML = `
      <div class="sync-item-header">
        <div class="sync-item-title-wrapper">
          <input type="checkbox" class="sync-item-checkbox" data-index="${idx}" checked />
          <span class="sync-item-title">[${mod.type === 'chapter' ? '章节' : '设定'}] ${escapeHtml(mod.name)}</span>
          <span class="sync-item-badge ${badgeClass}">${isTargetText}</span>
        </div>
      </div>
      <div class="sync-item-desc">
        <strong>修改说明：</strong>${escapeHtml(mod.changeSummary)} <br/>
        <strong>修改原因：</strong>${escapeHtml(mod.reason)}
      </div>
      <button type="button" class="sync-item-diff-btn">
        <i data-lucide="eye" style="width: 14px; height: 14px;"></i> <span>查看具体修改内容</span>
      </button>
      <div class="sync-item-diff-panel hidden">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="sync-diff-section">
            <span class="sync-diff-label">修改前旧内容：</span>
            <div class="sync-diff-content">${escapeHtml(originalContent)}</div>
          </div>
          <div class="sync-diff-section">
            <span class="sync-diff-label">修改后新内容：</span>
            <div class="sync-diff-content">${escapeHtml(mod.newContent)}</div>
          </div>
        </div>
      </div>
    `;
    
    const diffBtn = card.querySelector('.sync-item-diff-btn');
    const diffPanel = card.querySelector('.sync-item-diff-panel');
    diffBtn.addEventListener('click', () => {
      const isHidden = diffPanel.classList.contains('hidden');
      diffPanel.classList.toggle('hidden');
      diffBtn.querySelector('span').textContent = isHidden ? '收起修改内容' : '查看具体修改内容';
      diffBtn.querySelector('i').setAttribute('data-lucide', isHidden ? 'eye-off' : 'eye');
      lucide.createIcons();
    });
    
    container.appendChild(card);
  });
  
  lucide.createIcons();
}

function applySyncModifications(modifications, selectedIndices) {
  const activeNovel = getActiveNovel();
  if (!activeNovel) return;
  
  let appliedCount = 0;
  
  selectedIndices.forEach(idx => {
    const mod = modifications[idx];
    if (mod.type === 'chapter') {
      const ch = activeNovel.chapters.find(c => c.id === mod.id);
      if (ch) {
        ch.content = mod.newContent;
        if (mod.name && ch.title !== mod.name) {
          ch.title = mod.name;
        }
        appliedCount++;
      }
    } else if (mod.type === 'asset') {
      const asset = activeNovel.assets.find(a => a.id === mod.id);
      if (asset) {
        const oldCharName = asset.characterName;
        asset.desc = mod.newContent;
        if (mod.name && asset.name !== mod.name) {
          asset.name = mod.name;
        }
        
        // Handle character name change propagation to characterBible
        if (oldCharName) {
          let newCharName = mod.name.split('（')[0].trim();
          if (!newCharName) {
            const match = mod.newContent.match(/^#\s+(.+)$/m);
            if (match) newCharName = match[1].trim();
          }
          if (newCharName && newCharName !== oldCharName) {
            asset.characterName = newCharName;
            if (asset.characterData) {
              asset.characterData.name = newCharName;
            }
            
            // Sync characterBible
            const charInBible = activeNovel.characterBible.find(c => c.name === oldCharName);
            if (charInBible) {
              charInBible.name = newCharName;
            }
            
            // Sync relationships targets
            (activeNovel.characterBible || []).forEach(c => {
              (c.relationships || []).forEach(r => {
                if (r.target === oldCharName) r.target = newCharName;
              });
            });
          }
        }
        appliedCount++;
      }
    }
  });
  
  if (appliedCount > 0) {
    rebuildDerivedCharacterAssets(activeNovel);
    syncEmbeddedCharacterRelationships(activeNovel);
    
    // Save state
    saveState();
    persistNovelKnowledgeGraph(activeNovel);
    
    // Render
    renderNovels();
    renderChapters();
    
    if (activeNovel.activeTarget) {
      switchEditorTarget(activeNovel.activeTarget.type, activeNovel.activeTarget.id);
    }
    
    showToast(`成功应用了 ${appliedCount} 项修改并完成同步！`, 'success');
  }
}

/* ==========================================================================
   Background Management
   ========================================================================== */
function applyBackground() {
  const bgEl = document.getElementById('app-background');
  if (bgEl) { bgEl.style.display = 'none'; }
  
  let bg = BG_IMAGES.find(b => b.id === state.bgImage);
  if (!bg) {
    bg = BG_IMAGES.find(b => b.id === 'none') || { id: 'none', type: 'light', value: '' };
  }
  
  // Clean up existing listener if any
  if (sysThemeListener) {
    try {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', sysThemeListener);
    } catch(e) {
      try {
        window.matchMedia('(prefers-color-scheme: dark)').removeListener(sysThemeListener);
      } catch(err) {}
    }
    sysThemeListener = null;
  }

  let bgType = bg.type;
  let bgValue = bg.value;

  if (bg.id === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    bgType = isDark ? 'dark' : 'light';
    bgValue = '';
    
    sysThemeListener = () => {
      applyBackground();
    };
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', sysThemeListener);
    } catch(e) {
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addListener(sysThemeListener);
      } catch(err) {}
    }
  }

  const active = bg.id !== 'none' && bg.id !== 'system';
  const useCssBg = bg.id === 'system' 
    ? !window.matchMedia('(prefers-color-scheme: dark)').matches 
    : (bg.id !== 'none' && bg.type === 'light');
    
  const useDarkBg = (bg.id !== 'none' && bg.id !== 'system' && bg.type === 'dark');

  document.body.classList.toggle('css-bg', useCssBg);
  document.body.classList.toggle('dark-bg', useDarkBg);
  
  if (active && (bgType === 'light' || bgType === 'dark')) {
    document.body.style.backgroundImage = bgValue;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    try {
      localStorage.setItem('novel_bg_type', bgType);
      localStorage.setItem('novel_bg_css', bgValue);
    } catch(e){}
  } else {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    try {
      const effectiveType = useCssBg ? 'light' : 'dark';
      localStorage.setItem('novel_bg_type', effectiveType);
      localStorage.setItem('novel_bg_css', '');
    } catch(e){}
  }
}

function renderBgSelector() {
  const container = document.getElementById('bg-selector');
  if (!container) return;
  container.innerHTML = '';
  const groups = {};
  BG_IMAGES.forEach(bg => {
    if (!groups[bg.group]) groups[bg.group] = [];
    groups[bg.group].push(bg);
  });
  
  for (const [groupName, bgs] of Object.entries(groups)) {
    const groupTitle = document.createElement('div');
    groupTitle.style.width = '100%';
    groupTitle.style.fontSize = '0.75rem';
    groupTitle.style.color = 'var(--text-secondary)';
    groupTitle.style.margin = '10px 0 5px 0';
    groupTitle.style.fontWeight = '500';
    groupTitle.textContent = groupName;
    container.appendChild(groupTitle);
    
    bgs.forEach(bg => {
      const opt = document.createElement('div');
      opt.className = `bg-option ${state.bgImage === bg.id ? 'selected' : ''}`;
      opt.title = bg.name;
      opt.style.background = bg.value || 'var(--bg-main)';
      opt.innerHTML = `<div class="bg-check"><i data-lucide="check" style="width: 10px; height: 10px;"></i></div>`;
      opt.addEventListener('click', () => {
        state.bgImage = bg.id;
        document.querySelectorAll('.bg-option').forEach(el => el.classList.remove('selected'));
        opt.classList.add('selected');
        applyBackground();
      });
      container.appendChild(opt);
    });
  }
  lucide.createIcons();
}

function openSettingsModal() {
  elements.settingsModal.classList.remove('hidden');
  syncActiveApiKeyFromSlots();
  
  // Save original background for cancel revert
  originalBgImage = state.bgImage;

  if (elements.apiKeyInput) {
    elements.apiKeyInput.type = 'password';
    const apiKeyEyeIcon = document.getElementById('api-key-eye-icon');
    if (apiKeyEyeIcon) {
      apiKeyEyeIcon.setAttribute('data-lucide', 'eye');
    }
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  const activeSlot = state.apiKeys.find(s => s.id === state.activeApiKeyId) || state.apiKeys[0];
  elements.apiKeyInput.value = activeSlot.apiKey || '';
  elements.modelInput.value = activeSlot.apiModel || 'gemini-2.0-flash';
  elements.apiUrlInput.value = activeSlot.apiUrl || 'https://generativelanguage.googleapis.com';
  elements.slotNameInput.value = activeSlot.name || '';
  
  renderSettingsSlots();
  renderBgSelector();
}

function closeSettingsModal(isSave = false) {
  elements.settingsModal.classList.add('hidden');
  if (!isSave && originalBgImage !== undefined) {
    state.bgImage = originalBgImage;
    applyBackground();
  }
}

function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${icon}" style="width: 16px; height: 16px;"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  // Remove toast from DOM after animations (3.3s)
  setTimeout(() => {
    toast.remove();
    if (container.children.length === 0) {
      container.remove();
    }
  }, 3300);
}

/* ==========================================================================
   AI Engine (Writing Assistant)
   ========================================================================== */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createAIError(message, status = 0, providerMessage = '') {
  const error = new Error(message);
  error.status = status;
  error.providerMessage = providerMessage;
  error.transient = status === 408 || status === 429 || status >= 500;
  return error;
}

function getApiSlot(slotId) {
  return (state.apiKeys || []).find(slot => slot.id === slotId) || null;
}

function resolveAIRequestConfig(config, jsonMode, role) {
  if (config !== state) {
    return {
      config,
      route: {
        role: role === 'auto' ? (jsonMode ? 'primary' : 'worker') : role,
        slotId: '',
        model: config?.apiModel || '',
        fallbackSlotId: ''
      }
    };
  }
  const route = selectAgentModelRoute({
    role,
    jsonMode,
    activeSlot: getApiSlot(state.activeApiKeyId),
    primarySlot: getApiSlot(state.primaryApiKeyId)
  });
  return {
    config: route.config || state,
    route
  };
}

function recordModelCall(details) {
  if (!activeAgentRuntime?.run) return;
  appendAgentModelCall(activeAgentRuntime.run, details);
  activeAgentRuntime.persist();
}

async function callConfiguredAI(
  systemPrompt,
  userPrompt,
  jsonMode = false,
  config = state,
  retryCount = 2,
  role = 'auto',
  allowFallback = true
) {
  const resolved = resolveAIRequestConfig(config, jsonMode, role);
  const requestConfig = resolved.config;
  const route = resolved.route;
  const baseUrl = String(requestConfig.apiUrl || '').replace(/\/$/, '');
  const isGeminiNative = baseUrl.includes('googleapis.com');
  const startedAt = Date.now();
  const inputTokens = estimateTokenCount(systemPrompt, userPrompt);
  let response;

  try {
    if (isGeminiNative) {
      const generationConfig = jsonMode
        ? { responseMimeType: 'application/json', temperature: 0.45 }
        : { temperature: 0.7 };
      response = await fetch(`${baseUrl}/v1beta/models/${requestConfig.apiModel}:generateContent?key=${requestConfig.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig
        })
      });
    } else {
      const completionsUrl = baseUrl.endsWith('/chat/completions')
        ? baseUrl
        : `${baseUrl}/chat/completions`;
      response = await fetch(completionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${requestConfig.apiKey}`
        },
        body: JSON.stringify({
          model: requestConfig.apiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: jsonMode ? 0.45 : 0.7
        })
      });
    }
  } catch (error) {
    recordModelCall({
      role: route.role,
      slotId: route.slotId,
      model: requestConfig.apiModel,
      success: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      inputTokens,
      outputTokens: 0,
      retryRemaining: retryCount,
      error: error.message
    });
    if (retryCount > 0) {
      await wait((4 - retryCount) * 1500);
      return callConfiguredAI(systemPrompt, userPrompt, jsonMode, config, retryCount - 1, role, allowFallback);
    }
    if (
      allowFallback &&
      config === state &&
      route.role === 'primary' &&
      route.fallbackSlotId
    ) {
      const fallbackConfig = getApiSlot(route.fallbackSlotId);
      if (fallbackConfig) {
        activeAgentRuntime?.noteReplan('model-call', `主控模型网络连接失败，降级到 ${fallbackConfig.apiModel}`, 'fallback');
        return callConfiguredAI(systemPrompt, userPrompt, jsonMode, fallbackConfig, 1, 'worker', false);
      }
    }
    throw createAIError(
      `无法连接模型接口 ${baseUrl}：${error.message}。这通常是网络、CORS 或 Base URL 问题。`
    );
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
    } catch (error) {
      // Keep the HTTP status when the provider does not return JSON.
    }
    if (retryCount > 0 && (response.status === 408 || response.status === 429 || response.status >= 500)) {
      recordModelCall({
        role: route.role,
        slotId: route.slotId,
        model: requestConfig.apiModel,
        success: false,
        status: response.status,
        durationMs: Date.now() - startedAt,
        inputTokens,
        outputTokens: 0,
        retryRemaining: retryCount,
        error: errorMessage
      });
      await wait((4 - retryCount) * 1500);
      return callConfiguredAI(systemPrompt, userPrompt, jsonMode, config, retryCount - 1, role, allowFallback);
    }
    if (
      allowFallback &&
      config === state &&
      route.role === 'primary' &&
      route.fallbackSlotId &&
      [408, 429, 500, 502, 503, 504].includes(response.status)
    ) {
      const fallbackConfig = getApiSlot(route.fallbackSlotId);
      if (fallbackConfig) {
        recordModelCall({
          role: route.role,
          slotId: route.slotId,
          model: requestConfig.apiModel,
          success: false,
          status: response.status,
          durationMs: Date.now() - startedAt,
          inputTokens,
          outputTokens: 0,
          retryRemaining: retryCount,
          error: errorMessage
        });
        activeAgentRuntime?.noteReplan('model-call', `主控模型失败，降级到 ${fallbackConfig.apiModel}`, 'fallback');
        return callConfiguredAI(
          systemPrompt,
          userPrompt,
          jsonMode,
          fallbackConfig,
          1,
          'worker',
          false
        );
      }
    }
    recordModelCall({
      role: route.role,
      slotId: route.slotId,
      model: requestConfig.apiModel,
      success: false,
      status: response.status,
      durationMs: Date.now() - startedAt,
      inputTokens,
      outputTokens: 0,
      retryRemaining: retryCount,
      error: errorMessage
    });
    throw createAIError(
      `模型 ${requestConfig.apiModel} 请求失败（HTTP ${response.status}）：${errorMessage}`,
      response.status,
      errorMessage
    );
  }

  const data = await response.json();
  let outputText = '';
  if (isGeminiNative) {
    outputText = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim() || '';
  } else {
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) outputText = content.trim();
    if (Array.isArray(content)) {
      outputText = content.map(item => item?.text || item?.content || '').join('').trim();
    }
  }
  const providerUsage = isGeminiNative
    ? data.usageMetadata
    : data.usage;
  recordModelCall({
    role: route.role,
    slotId: route.slotId,
    model: requestConfig.apiModel,
    success: Boolean(outputText),
    status: response.status,
    durationMs: Date.now() - startedAt,
    inputTokens: Number(providerUsage?.promptTokenCount || providerUsage?.prompt_tokens) || inputTokens,
    outputTokens: Number(providerUsage?.candidatesTokenCount || providerUsage?.completion_tokens) ||
      estimateTokenCount(outputText),
    totalTokens: Number(providerUsage?.totalTokenCount || providerUsage?.total_tokens) || 0,
    retryRemaining: retryCount
  });
  if (outputText) return outputText;
  throw new Error(`模型 ${requestConfig.apiModel} 返回成功，但响应结构中没有可用文本。`);
}

function parseAIJson(rawText) {
  const withoutFence = rawText
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  const firstBrace = withoutFence.indexOf('{');
  const lastBrace = withoutFence.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('AI 返回内容不是有效的 JSON。');
  }
  return JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1));
}

async function callJsonAgentWithRepair(systemPrompt, userPrompt, onStatus = () => {}, agentName = '总控 Agent') {
  const primaryRolePattern = /(总控|审核|审计|复审|修稿|修复|补救|裁决|整合|监督)/;
  const executionRole = primaryRolePattern.test(agentName) ? 'primary' : 'worker';
  const rawText = await callConfiguredAI(systemPrompt, userPrompt, true, state, 2, executionRole);
  try {
    return parseAIJson(rawText);
  } catch (error) {
    onStatus(`检测到 JSON 格式损坏，正在调用 JSON 修复 Agent 进行结构修复：${error.message}`, agentName);
    const repairedRaw = await callConfiguredAI(
      `你是 JSON 修复 Agent。只返回修复后的 JSON，不要代码围栏，不要解释。
任务：把用户提供的损坏 JSON 修复为可被 JSON.parse 解析的标准 JSON。
规则：
1. 不改写字段语义，不新增故事设定。
2. 只修复缺失逗号、引号、括号、尾部截断、Markdown 包裹等格式问题。
3. 若尾部对象不完整，保留已经完整的字段，补齐必要闭合结构。`,
      `解析错误：${error.message}
损坏内容：
${String(rawText).slice(0, 60000)}`,
      true,
      state,
      2,
      'primary'
    );
    return parseAIJson(repairedRaw);
  }
}

const AGENT_SKILL_INDEX = [
  {
    name: 'agent-orchestration',
    description: '约束主控与 worker 的职责、上下文冻结、证据契约、恢复策略、运行记录和经验沉淀。',
    triggers: /(Agent|智能体|协作|调度|规划|重规划|恢复|主控|worker|子模型|多模型)/i
  },
  {
    name: 'narrative-compiler',
    description: '用 Kernel、势力计划、事件卡、伏笔台账、状态台账编译长篇网文总纲，强调因果链和状态写回。',
    triggers: /(叙事编译|事件卡|状态台账|伏笔台账|因果链|长篇|百万字|总纲|大纲|剧情)/
  },
  {
    name: 'novel-outline',
    description: '创建、审核、修订长篇小说总纲，关注四阶段结构、悬疑反转、情绪曲线和伏笔回收。',
    triggers: /(总纲|大纲|开篇|高潮|结尾|反转|悬疑|剧情|伏笔|设定库)/
  },
  {
    name: 'character-system',
    description: '构建、审核、修复大型人物名册、人物档案和关系拓扑。',
    triggers: /(人物|角色|名册|关系|拓扑|弧光|高光|阵营|家族|反派)/
  },
  {
    name: 'plot-compiler',
    description: '基于总纲、人物和世界观编译卷纲与章节细纲，维护因果、伏笔、时空、多线群像和章节状态变化。',
    triggers: /(章节细纲|章纲|设计剧情|剧情脉络|群像|多线叙事|三幕.*线|时间线|空间线|100章|一百章)/
  },
  {
    name: 'novel-final-audit',
    description: '在总纲、人物和章节完成后执行跨域终审、最小补丁修复与最终长篇大纲整合。',
    triggers: /(全书终审|综合审核|最终审核|全面审核|最终整合|全书优化)/
  },
  {
    name: 'json-repair',
    description: '修复模型返回的损坏 JSON，保留语义并抢救完整对象。',
    triggers: /(JSON|解析|parse|逗号|括号|尾部|格式损坏)/
  },
  {
    name: 'heartbeat',
    description: '后台心跳检查清单，无事输出 HEARTBEAT_OK，有事输出简短通知。',
    triggers: /(心跳|heartbeat|定时|后台|自主|提醒|检查清单)/
  }
];

const STATIC_SKILL_FALLBACKS = {
  'narrative-compiler': `# narrative-compiler
Use for high-quality long-form webnovel outline creation.
Steps: lock immutable narrative kernel; build world pressure and faction plans; propose event cards; validate cause/action/opposition/cost/gain/state-delta; maintain promise ledger and state ledger; compile reviewed event chain into beginning/development/climax/ending. LLM proposes and repairs; program validates IDs, references, stage coverage, promise links, and state writeback.`,
  'novel-outline': `# novel-outline
Use for long-form outline creation, audit, and repair.
Steps: extract hard constraints; build beginning/development/climax/ending; enforce cause-choice-consequence; audit logic, agency, originality, suspense, emotional curve, and payoff; revise weak stages without lowering standards.`,
  'character-system': `# character-system
Use for large cast construction and repair.
Steps: start from canonical facts; complete roster first; keep desire/goal/interest/agency/arc/highlight/fate distinct; protect protagonists from antagonist templates; audit duplicates, contradictions, missing factions, tool-like characters, and outline drift.`,
  'plot-compiler': `# plot-compiler
Use after the master outline and character system exist.
Plan volumes first, then generate chapter cards in small batches. Every chapter must have causal prerequisites, participating existing characters, character-driven actions, conflict, turn, cost, state delta, time, space, planted/payoff clues, and an ending hook. Program logic rejects unknown characters, forward dependencies, duplicate chapters, missing fields, and orphan payoffs. LLM auditors judge pacing, plausibility, ensemble balance, suspense, reversals, and emotional curve.`,
  'novel-final-audit': `# novel-final-audit
Use after characters and chapter outlines are approved. Run deterministic cross-domain checks first, then audit character agency, arc realization, causal continuity, relationship progression, ensemble balance, pacing, suspense, time-space continuity, resource provenance, and clue payoff. Repair with minimal field patches instead of regenerating the full novel. Re-run hard checks and produce a final integrated outline plus a transparent review report.`,
  'json-repair': `# json-repair
Use when AI JSON fails parsing.
Repair syntax only: missing commas, quotes, braces, brackets, markdown fences, and truncated tails. Preserve semantics and do not invent story facts.`,
  'agent-orchestration': `# agent-orchestration
Freeze canonical context and model routing per run. The primary model owns planning, conflict resolution, repair escalation and acceptance. Workers return bounded evidence-backed claims. Persist stages, calls, quality gates, errors and review state. Retry transient failures, repair contract failures, and escalate semantic conflicts.`,
  heartbeat: `# heartbeat
Read HEARTBEAT.md. If no item requires attention, return HEARTBEAT_OK. If action is needed, notify briefly with reason and next action.`
};

const STATIC_HEARTBEAT_CHECKLIST = `# HEARTBEAT
- Check whether the active novel has unsynced knowledge graph data.
- Check whether a character roster draft has been stale for more than 24 hours.
- Check whether a master outline exists before character construction tasks.
- Check whether the last Agent task failed and can be retried safely.
- Check whether approved content is waiting for user review.
If no item requires attention, output HEARTBEAT_OK.`;

const AGENT_CONTEXT_BUDGET = {
  maxPromptChars: 24000,
  maxGraphChars: 7000,
  maxAssets: 28,
  maxAgentMemoChars: 2200,
  maxSkillChars: 3500
};

const agentSkillCache = new Map();

function getSkillIndexPrompt() {
  return `可用技能索引（只在任务匹配时按需加载具体 SKILL.md）：${AGENT_SKILL_INDEX
    .map(skill => `${skill.name}：${skill.description}`)
    .join('；')}`;
}

function matchAgentSkills(task) {
  const matched = AGENT_SKILL_INDEX.filter(skill => skill.triggers.test(task));
  return matched.length ? matched : [AGENT_SKILL_INDEX[0]];
}

async function loadAgentSkill(name) {
  if (agentSkillCache.has(name)) return agentSkillCache.get(name);
  try {
    const response = await fetch(`/api/agent-skills/${encodeURIComponent(name)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    const content = String(data.content || '').slice(0, AGENT_CONTEXT_BUDGET.maxSkillChars);
    agentSkillCache.set(name, content);
    return content;
  } catch (error) {
    const fallback = STATIC_SKILL_FALLBACKS[name] || `# ${name}\n\n技能文件暂不可用：${error.message}`;
    agentSkillCache.set(name, fallback);
    return fallback;
  }
}

async function loadSkillsForTask(task, explicitNames = []) {
  const names = [...new Set([
    'agent-orchestration',
    ...matchAgentSkills(task).map(skill => skill.name),
    ...explicitNames
  ])];
  const entries = await Promise.all(names.map(async name => ({
    name,
    content: await loadAgentSkill(name)
  })));
  return entries.map(entry => `【SKILL:${entry.name}】\n${entry.content}`).join('\n\n');
}

function compactString(value, maxChars) {
  const text = String(value || '').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length <= maxChars) return text;
  const head = text.slice(0, Math.floor(maxChars * 0.62));
  const tail = text.slice(-Math.floor(maxChars * 0.28));
  return `${head}\n\n[...中间内容已压缩，保留首尾和关键约束...]\n\n${tail}`;
}

let pendingReferenceFiles = [];
let pendingNewNovelAnalyses = [];
let referenceAnalysisCallback = null;

function buildReferenceNovelChunks(text, chunkSize = 9000, maxChunks = 16) {
  const normalized = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];
  const totalChunks = Math.ceil(normalized.length / chunkSize);
  if (totalChunks <= maxChunks) {
    return Array.from({ length: totalChunks }, (_, index) => ({
      index: index + 1,
      start: index * chunkSize,
      text: normalized.slice(index * chunkSize, (index + 1) * chunkSize)
    }));
  }
  const selected = new Set([0, totalChunks - 1]);
  for (let index = 1; index < maxChunks - 1; index += 1) {
    selected.add(Math.round(index * (totalChunks - 1) / (maxChunks - 1)));
  }
  return [...selected].sort((a, b) => a - b).map(chunkIndex => ({
    index: chunkIndex + 1,
    start: chunkIndex * chunkSize,
    text: normalized.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize)
  }));
}

function referenceAnalysisToMarkdown(analysis) {
  const list = value => (Array.isArray(value) ? value : []).map(item =>
    `- ${typeof item === 'string' ? item : JSON.stringify(item)}`
  ).join('\n') || '- 未提取';
  return `# 原著结构拆解（仅作低相似度技法参考）\n\n- **来源文件**：${analysis.fileName || '未命名 TXT'}\n- **原文字数**：${analysis.sourceLength || 0}\n- **分析片段**：${analysis.analyzedChunks || 0}\n- **说明**：不保存原著正文；禁止复制原著专有名词、标志性句子、人物组合和事件顺序。\n\n## 类型与读者承诺\n${analysis.genreAndAudience || '未提取'}\n\n## 人物原型与关系模式\n${list(analysis.characterArchetypes)}\n\n## 剧情架构与节奏\n${list(analysis.plotArchitecture)}\n${list(analysis.pacingModel)}\n\n## 因果链与伏笔技法\n${list(analysis.causalPatterns)}\n${list(analysis.foreshadowingPatterns)}\n\n## 世界规则与叙事技法\n${list(analysis.worldbuildingTechniques)}\n${list(analysis.transferableTechniques)}\n\n## 新书必须规避的复制风险\n${list(analysis.forbiddenCopyElements)}`;
}

function createReferenceAnalysisAsset(analysis, novelId, timestamp = Date.now()) {
  return {
    id: `reference-analysis-${novelId}-${timestamp}`,
    group: 'plot-framework',
    type: 'reference-analysis',
    name: `原著结构拆解｜${analysis.fileName || 'TXT 参考'}`,
    desc: referenceAnalysisToMarkdown(analysis)
  };
}

function upsertReferenceAnalysisAsset(novel, individualAnalyses = []) {
  const list = individualAnalyses.length > 0 
    ? individualAnalyses 
    : (novel?.referenceNovelAnalysis ? [novel.referenceNovelAnalysis] : []);
    
  if (list.length === 0) return;
  
  // Filter out previous reference analyses
  novel.assets = (novel.assets || []).filter(asset => asset.type !== 'reference-analysis');
  
  // Add all new ones
  list.forEach((analysis, idx) => {
    novel.assets.unshift(createReferenceAnalysisAsset(analysis, novel.id, Date.now() + idx));
  });
  
  if (!novel.categoryOrder) novel.categoryOrder = cloneDefault(DEFAULT_CATEGORY_ORDER);
  if (!novel.categoryOrder['plot-framework']) novel.categoryOrder['plot-framework'] = [];
  if (!novel.categoryOrder['plot-framework'].includes('reference-analysis')) {
    novel.categoryOrder['plot-framework'].unshift('reference-analysis');
  }
}

function logReferenceProgress(message, percentVal) {
  const line = document.createElement('div');
  line.className = 'log-line';
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  elements.referenceLogContent.appendChild(line);
  elements.referenceLogContent.scrollTop = elements.referenceLogContent.scrollHeight;
  
  elements.referenceProgressBar.style.width = `${percentVal}%`;
  elements.referenceProgressPercentage.textContent = `${percentVal}%`;
  elements.referenceProgressStatus.textContent = message;
}

function mergeReferenceAnalyses(analyses) {
  if (!analyses || !analyses.length) return null;
  const allBackgrounds = [];
  const allSynopses = [];
  analyses.forEach(analysis => {
    if (analysis.suggestedBackground) allBackgrounds.push(analysis.suggestedBackground);
    if (analysis.suggestedSynopsis) allSynopses.push(analysis.suggestedSynopsis);
  });
  const tags = [];
  const seenTags = new Set();
  allBackgrounds.forEach(bgStr => {
    bgStr.split(/[，,]/).map(t => t.trim()).filter(Boolean).forEach(tag => {
      const lower = tag.toLowerCase();
      if (!seenTags.has(lower)) {
        seenTags.add(lower);
        tags.push(tag);
      }
    });
  });
  let hasGender = tags.some(t => /(男频|女频)/.test(t));
  let hasWorldType = tags.some(t => NOVEL_WORLD_TYPE_PATTERN.test(t));
  if (!hasGender) tags.unshift('男频');
  if (!hasWorldType) tags.splice(1, 0, '架空古代');
  const defaults = ['系统', '热血', '爽文', '脑洞', '智商在线', '强者崛起', '爆笑', '轻松'];
  for (let i = 0; tags.length < 8 && i < defaults.length; i++) {
    const d = defaults[i];
    if (!seenTags.has(d.toLowerCase())) {
      tags.push(d);
      seenTags.add(d.toLowerCase());
    }
  }
  const mergedBackground = tags.join('，');
  const mergedSynopsis = allSynopses.length === 1 
    ? allSynopses[0] 
    : allSynopses.map((syn, idx) => `【原著参考 ${idx + 1} 仿写简介】\n${syn}`).join('\n');
  return {
    suggestedBackground: mergedBackground,
    suggestedSynopsis: mergedSynopsis,
    fileName: analyses.map(a => a.fileName).join('、'),
    sourceLength: analyses.reduce((sum, a) => sum + (a.sourceLength || 0), 0),
    analyzedChunks: analyses.reduce((sum, a) => sum + (a.analyzedChunks || 0), 0)
  };
}

async function analyzeMultipleReferenceFiles(files) {
  elements.referenceProgressModal.classList.remove('hidden');
  elements.referenceLogContent.innerHTML = '';
  elements.btnCloseReferenceProgress.disabled = true;
  elements.btnCloseReferenceProgress.textContent = '分析中...';
  
  logReferenceProgress(`开始分析，共 ${files.length} 个原著参考文件...`, 0);
  
  const analyses = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileBasePercent = Math.round((i / files.length) * 100);
      const fileWeight = 100 / files.length;
      
      logReferenceProgress(`正在处理 [${i + 1}/${files.length}] 《${file.name}》...`, fileBasePercent);
      
      const analysis = await analyzeReferenceNovelFile(file, statusMsg => {
        const chunkMatch = /片段\s*(\d+)\/(\d+)/.exec(statusMsg);
        let progressOffset = 10;
        if (chunkMatch) {
          const currentChunk = parseInt(chunkMatch[1], 10);
          const totalChunks = parseInt(chunkMatch[2], 10);
          progressOffset = 10 + Math.round((currentChunk / totalChunks) * 75);
        } else if (statusMsg.includes('汇总')) {
          progressOffset = 85;
        } else if (statusMsg.includes('保存')) {
          progressOffset = 95;
        } else if (statusMsg.includes('检测到')) {
          progressOffset = 100;
        }
        
        const currentPercent = fileBasePercent + Math.round((progressOffset / 100) * fileWeight);
        logReferenceProgress(`《${file.name}》: ${statusMsg}`, currentPercent);
      });
      
      analyses.push(analysis);
      logReferenceProgress(`《${file.name}》分析完成。`, fileBasePercent + Math.round(fileWeight));
    }
    
    logReferenceProgress('所有文件分析完成！', 100);
    elements.btnCloseReferenceProgress.textContent = '完成并应用';
    return analyses;
  } catch (err) {
    logReferenceProgress(`分析过程中断: ${err.message}`, 100);
    elements.btnCloseReferenceProgress.textContent = '关闭';
    throw err;
  } finally {
    elements.btnCloseReferenceProgress.disabled = false;
  }
}

async function checkReferenceNovelAnalysis(fileName) {
  try {
    const response = await fetch(`/api/reference-novels?fileName=${encodeURIComponent(fileName)}`, {
      headers: {
        'X-User-Token': localStorage.getItem('novel_session_token') || ''
      }
    });
    if (!response.ok) return null;
    const res = await response.json();
    if (res.exists) {
      return res.data;
    }
  } catch (e) {
    console.error('Failed to check existing reference novel analysis:', e);
  }
  return null;
}

async function saveReferenceNovelAnalysis(fileName, analysis) {
  try {
    const response = await fetch(`/api/reference-novels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Token': localStorage.getItem('novel_session_token') || ''
      },
      body: JSON.stringify({ fileName, analysis })
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error('Failed to save reference novel analysis:', e);
  }
  return null;
}

async function analyzeReferenceNovelFile(file, onStatus = () => {}) {
  if (!file || !/\.txt$/i.test(file.name)) {
    throw new Error('仅支持上传 .txt 小说原著。');
  }
  if (file.size > 30 * 1024 * 1024) {
    throw new Error('TXT 文件超过 30 MB，请先按卷拆分后上传。');
  }

  // 1. Check if cached analysis exists in backend
  onStatus('正在检查是否已有该小说的分析数据...');
  const existingAnalysis = await checkReferenceNovelAnalysis(file.name);
  if (existingAnalysis) {
    onStatus('检测到已存在该小说的拆解分析，直接复用已有数据中...');
    existingAnalysis.isLoadedFromCache = true;
    
    // Ensure fallback is populated in case cached version does not have suggestions
    if (!existingAnalysis.suggestedBackground) {
      const isFemale = /(女频|言情|女主|小师妹|团宠)/i.test(existingAnalysis.genreAndAudience || '');
      const isMale = !isFemale;
      const worldType = NOVEL_WORLD_TYPE_PATTERN.exec(existingAnalysis.genreAndAudience || existingAnalysis.worldbuildingTechniques?.join(' ') || '')?.[1] || '架空古代';
      existingAnalysis.suggestedBackground = [
        isMale ? '男频' : '女频',
        worldType,
        '系统', '热血', '爽文', '脑洞', '智商在线', '强者崛起'
      ].join('，');
    }
    if (!existingAnalysis.suggestedSynopsis) {
      existingAnalysis.suggestedSynopsis = `这是一个在${existingAnalysis.suggestedBackground.split(/[，,]/)[1] || '奇幻世界'}中展开的精彩故事。主角带着坚定的执念，在风云诡谲的世界里步步为营，破解重重迷雾，战胜强大的对手，成就一段传奇。`;
    }
    return existingAnalysis;
  }
  
  if (!state.apiKey) {
    throw new Error('请先在设置中配置并验证 API Key。');
  }
  const text = await file.text();
  if (text.trim().length < 500) {
    throw new Error('TXT 内容过短，无法进行有效的小说结构拆解。');
  }
  const chunks = buildReferenceNovelChunks(text);
  const chunkReports = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    onStatus(`正在拆解原著片段 ${index + 1}/${chunks.length}（覆盖全文不同位置）...`);
    const report = await callJsonAgentWithRepair(
      `你是长篇小说原著拆解 Agent。只返回 JSON：
{
  "characters":[{"name":"原著人物名，仅用于本次分析","role":"剧情职能","desire":"欲望","conflict":"冲突","arcStage":"本片段变化"}],
  "events":[{"cause":"前因","choice":"人物选择","consequence":"后果","function":"结构职能"}],
  "relationships":["关系及变化"],
  "clues":[{"seed":"伏笔种子","payoff":"可能回收","technique":"技法"}],
  "worldRules":["世界规则及限制"],
  "pacing":["节奏、悬念、情绪变化"],
  "styleTechniques":["可抽象借鉴的叙事技法"]
}

只做结构分析，不续写，不摘抄长句。原著人物名只能留在片段报告中，后续不得进入新书。`,
      `文件：${file.name}
片段位置：第 ${chunk.index} 段，起始字符 ${chunk.start}
原著片段：
${chunk.text}`,
      onStatus,
      '原著拆解 Agent'
    );
    chunkReports.push(report);
  }
  onStatus('正在汇总人物、剧情、因果、伏笔与节奏模式...');
  const synthesis = await callJsonAgentWithRepair(
    `你是原著结构总析 Agent。只返回 JSON：
{
  "genreAndAudience":"题材、受众、核心情绪承诺",
  "characterArchetypes":["抽象人物原型、欲望、缺陷、弧光和关系模式，不保留姓名"],
  "plotArchitecture":["开篇、发展、升级、高潮、结局的结构规律"],
  "causalPatterns":["可迁移的因果推进模式"],
  "foreshadowingPatterns":["伏笔埋设、误导、揭示、回收模式"],
  "pacingModel":["章节钩子、高潮低谷、信息释放规律"],
  "worldbuildingTechniques":["世界规则、势力、资源与代价的构建技法"],
  "transferableTechniques":["可用于新书但必须重新设计内容的技法"],
  "forbiddenCopyElements":["禁止复制的专有名词、标志性表达、人物组合、具体事件 and 原始顺序"]
}

必须去除原著姓名 and 专有名词，只保留抽象结构。目标是原创、低相似度的新书，不是换名复刻。`,
    `以下是对原著不同位置的片段报告，请综合去重：
${compactString(JSON.stringify(chunkReports), 52000)}`,
    onStatus,
    '原著总析 Agent'
  );

  const result = {
    ...synthesis,
    fileName: file.name,
    sourceLength: text.length,
    analyzedChunks: chunks.length,
    analyzedAt: new Date().toISOString()
  };

  // Enforce validation with fallbacks if model output failed to satisfy constraints
  if (!result.suggestedBackground) {
    const isFemale = /(女频|言情|女主|小师妹|团宠)/i.test(result.genreAndAudience || '');
    const isMale = !isFemale;
    const worldType = NOVEL_WORLD_TYPE_PATTERN.exec(result.genreAndAudience || result.worldbuildingTechniques?.join(' ') || '')?.[1] || '架空古代';
    result.suggestedBackground = [
      isMale ? '男频' : '女频',
      worldType,
      '系统', '热血', '爽文', '脑洞', '智商在线', '强者崛起'
    ].join('，');
  }
  if (!result.suggestedSynopsis) {
    result.suggestedSynopsis = `这是一个在${result.suggestedBackground.split(/[，,]/)[1] || '奇幻世界'}中展开的精彩故事。主角带着坚定的执念，在风云诡谲的世界里步步为营，破解重重迷雾，战胜强大的对手，成就一段传奇。`;
  }

  // 2. Save the new analysis to the backend
  onStatus('正在保存原著分析数据到本地目录...');
  const saveResult = await saveReferenceNovelAnalysis(file.name, result);
  if (saveResult && saveResult.relativePath) {
    result.savedPath = saveResult.relativePath;
  }

  return result;
}

function characterAuditToMarkdown(audit) {
  if (!audit) return '暂无审计数据。';
  const list = items => (items || []).map(item => `- ${item}`).join('\n');
  const issuesList = (audit.issues || []).map(issue => 
    `- **[${issue.severity || 'unknown'}] ${issue.category || '综合'}**: ${issue.problem || ''}\n  *建议：${issue.repair || '无'}*`
  ).join('\n');
  
  return `# 人物和势力体系审计报告\n\n## 综合评估\n- **最终评分**: ${audit.score || 0} 分\n- **是否通过**: ${audit.passed ? '通过' : '未通过（禁止写入正式人物库）'}\n- **审计总结**: ${audit.summary || '无'}\n\n## 发现的核心问题与优化建议\n${issuesList || '未发现待修复的严重问题。'}\n\n## 优势分析\n${list(audit.strengths) || '暂无优势评估。'}`;
}

function createCharacterAuditAsset(audit, novelId, timestamp = Date.now()) {
  return {
    id: `character-audit-${novelId}-${timestamp}`,
    group: 'character-growth',
    type: 'character-audit',
    name: `人物势力审计报告｜评分：${audit.score || 0}`,
    desc: characterAuditToMarkdown(audit)
  };
}

function upsertCharacterAuditAsset(novel, audit) {
  if (!novel || !audit) return;
  novel.characterAudit = audit;
  novel.assets = (novel.assets || []).filter(asset => asset.type !== 'character-audit');
  novel.assets.unshift(createCharacterAuditAsset(audit, novel.id));
  if (!novel.categoryOrder) novel.categoryOrder = cloneDefault(DEFAULT_CATEGORY_ORDER);
  if (!novel.categoryOrder['character-growth']) novel.categoryOrder['character-growth'] = [];
  if (!novel.categoryOrder['character-growth'].includes('character-audit')) {
    novel.categoryOrder['character-growth'].unshift('character-audit');
  }
}

function openReferenceManager(files, onConfirm) {
  if (files && files.length > 0) {
    const existingNames = new Set(pendingReferenceFiles.map(f => f.name));
    Array.from(files).forEach(file => {
      if (!existingNames.has(file.name)) {
        pendingReferenceFiles.push(file);
      }
    });
  }
  referenceAnalysisCallback = onConfirm;
  elements.referenceManagerModal.classList.remove('hidden');
  renderManagerFileList();
}

function renderManagerFileList() {
  if (!elements.referenceFileList) return;
  elements.referenceFileList.innerHTML = '';
  
  if (pendingReferenceFiles.length === 0) {
    elements.referenceFileList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">未选择任何原著参考文件。</div>';
    elements.referenceConfirmCount.textContent = '0';
    elements.btnConfirmReferenceAnalysis.disabled = true;
    return;
  }
  
  elements.btnConfirmReferenceAnalysis.disabled = false;
  elements.referenceConfirmCount.textContent = pendingReferenceFiles.length;
  
  pendingReferenceFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'reference-file-item';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.justifyContent = 'space-between';
    item.style.padding = '8px 12px';
    item.style.borderBottom = '1px solid var(--border-color)';
    item.style.color = 'var(--text-primary)';
    
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%;">
        <i data-lucide="file-text" style="color: var(--primary-color); flex-shrink: 0; width: 18px; height: 18px;"></i>
        <span class="file-name" style="font-weight: 500; font-size: 0.9rem;" title="${file.name}">${file.name}</span>
        <span class="file-size" style="font-size: 0.75rem; color: var(--text-secondary); flex-shrink: 0;">(${sizeInMB} MB)</span>
      </div>
      <button type="button" class="btn-delete-file icon-btn" style="color: var(--danger-color); padding: 4px; border-radius: 4px; background: transparent; cursor: pointer; border: none; display: flex; align-items: center; justify-content: center;" data-index="${index}" title="移除此文件">
        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
      </button>
    `;
    elements.referenceFileList.appendChild(item);
  });
  
  // Attach event listener to delete buttons
  elements.referenceFileList.querySelectorAll('.btn-delete-file').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      pendingReferenceFiles.splice(idx, 1);
      renderManagerFileList();
    });
  });
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function compactAssetsForContext(assets, task, limit = AGENT_CONTEXT_BUDGET.maxAssets) {
  const terms = String(task || '').split(/[\s，。！？、；：,.!?;:【】（）()\-_]+/).filter(term => term.length >= 2);
  return (assets || [])
    .map(asset => {
      const haystack = `${asset.name} ${asset.desc}`;
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 3 : 0), 0)
        + (['main-outline', 'faction', 'system', 'main-character', 'secret-clue', 'planting', 'payoff'].includes(asset.type) ? 2 : 0);
      return { asset, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ asset }) => ({
      group: asset.group,
      type: asset.type,
      name: asset.name,
      desc: compactString(asset.desc, 420)
    }));
}

function selectAgentPattern(task) {
  if (/(审核|审计|复审|优化|润色|修复|质量|评分|通过)/.test(task)) {
    return {
      name: 'Evaluator + Optimizer',
      description: '生成者与批评者循环，适合质量可评判的写作、审核和修复任务。'
    };
  }
  if (/(步骤|计划|执行|迁移|导入|批量|先.*再|按照)/.test(task)) {
    return {
      name: 'Planner + Executor',
      description: '先规划再执行，适合结构明确、可分步骤推进的任务。'
    };
  }
  return {
    name: 'Orchestrator + Workers',
    description: '协调者分发多个 worker 并合并结果，适合广泛探索 and 多维创作。'
  };
}

function extractChapterNumberFromTask(task) {
  if (!task) return null;
  const match = task.match(/(?:第\s*(\d+)\s*章|chapter-outline-(\d+)|chapter\s*(\d+))/i);
  if (match) {
    const num = match[1] || match[2] || match[3];
    return Number(num);
  }
  return null;
}

function buildRollingWorldState(novel, currentChapterNumber, generatedChapters = []) {
  const chapters = generatedChapters.length > 0 
    ? generatedChapters 
    : (novel?.plotBlueprint?.chapters || []);
  
  const previousChapters = chapters.filter(c => Number(c.chapterNumber) < currentChapterNumber);
  
  const plantedSet = new Map();
  const paidSet = new Set();
  
  for (const c of previousChapters) {
    const planted = Array.isArray(c.plantedClues) ? c.plantedClues : [];
    const paid = Array.isArray(c.paidClues) ? c.paidClues : [];
    for (const p of planted) {
      if (typeof p === 'string' && p.trim()) {
        plantedSet.set(p.trim(), c.chapterNumber);
      }
    }
    for (const p of paid) {
      if (typeof p === 'string' && p.trim()) {
        paidSet.add(p.trim());
      }
    }
  }
  
  const activeClues = [];
  for (const [clue, chNum] of plantedSet.entries()) {
    if (!paidSet.has(clue)) {
      activeClues.push({ clue, plantedInChapter: chNum });
    }
  }
  
  const characterPositions = {};
  for (const c of previousChapters) {
    const location = c.location || '';
    const participants = Array.isArray(c.participants) ? c.participants : [];
    const viewpoint = c.viewpoint || '';
    
    const allParticipants = new Set(participants);
    if (viewpoint) allParticipants.add(viewpoint);
    
    for (const p of allParticipants) {
      if (typeof p === 'string' && p.trim()) {
        const name = p.trim();
        characterPositions[name] = {
          lastSeenChapter: c.chapterNumber,
          location: location
        };
      }
    }
  }
  
  const completedMilestones = Array.from(paidSet);
  const recentDeltas = previousChapters.slice(-5).map(c => ({
    chapterNumber: c.chapterNumber,
    relationshipDelta: c.relationshipDelta || '无明显变化',
    stateDelta: c.stateDelta || '无明显变化',
    knowledgeDelta: c.knowledgeDelta || '无明显变化'
  }));

  return {
    activeClues,
    characterPositions,
    completedMilestones,
    recentDeltas
  };
}

function createSourceSignature(background, synopsis) {
  const source = `${String(background || '').trim()}\n${String(synopsis || '').trim()}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `constitution-${(hash >>> 0).toString(16)}`;
}

function extractExplicitProtagonistNames(synopsis) {
  const names = new Set();
  const text = String(synopsis || '');
  const patterns = [
    /(?:主角|男主|女主)(?:名为|叫做|叫|是)\s*([\u4e00-\u9fa5]{2,4})/g,
    /([\u4e00-\u9fa5]{2,4})(?:作为|正是|成为)(?:本书)?(?:主角|男主|女主)/g
  ];
  patterns.forEach(pattern => {
    for (const match of text.matchAll(pattern)) names.add(match[1]);
  });
  return [...names];
}

function deriveStoryConstitution(background, synopsis, narrativeKernel = null) {
  const backgroundText = String(background || '').trim();
  const synopsisText = String(synopsis || '').trim();
  const semanticAnalysis = validateBackgroundSemanticCoherence(backgroundText, synopsisText);
  const semanticProfile = semanticAnalysis.profile;
  const tags = semanticProfile.rawTags;
  const audience = semanticProfile.categories.audience[0] || inferAudience(backgroundText, synopsisText);
  const worldTypes = tags.filter(tag => NOVEL_WORLD_TYPE_PATTERN.test(tag));
  const relationshipMode = /无\s*CP/i.test(backgroundText)
    ? '无CP'
    : /后宫/.test(backgroundText)
      ? '后宫'
      : /单女主/.test(backgroundText)
        ? '单女主'
        : /多女主/.test(backgroundText)
          ? '多女主'
          : /言情|甜宠|爱情/.test(backgroundText)
            ? '感情线重要'
            : '未明确';
  const systemMode = /系统/.test(backgroundText)
    ? '允许系统金手指，但表现形式必须服从既定时代与世界观'
    : '不得无依据新增系统金手指';
  const explicitProtagonists = extractExplicitProtagonistNames(synopsisText);
  const hardConstraints = [
    audience && `受众定位必须保持为${audience}`,
    worldTypes.length && `时代/世界类型必须保持为${worldTypes.join('、')}`,
    relationshipMode !== '未明确' && `感情关系模式必须保持为${relationshipMode}`,
    tags.length && `用户明确题材标签：${tags.join('、')}`,
    ...semanticProfile.executionRules,
    semanticProfile.nonEntityTerms.length &&
      `以下词属于创作约束而非故事实体，严禁拼入实体名称：${semanticProfile.nonEntityTerms.join('、')}`,
    synopsisText && '简介中的主角、核心前史、关键关系、核心冲突和故事承诺不得被改写为相反事实',
    '默认采用真正的群像叙事：至少三位关键人物拥有独立欲望、利益、目标、行动线和选择后果，并在关键节点因果交汇',
    '总纲的开始、发展、高潮、结局只是数据容器，每个阶段内部必须包含人物驱动、群像推进、悬疑问题、因果升级、关键反转、爽点兑现和阶段代价，禁止流水账',
    '章节设计必须具备黄金三章：第一章危机入场，第二章升级并首次兑现，第三章形成小高潮、有效反转和长线承诺',
    '整体节奏符合番茄网文的快速入局、强冲突、持续钩子和阶段兑现，但不得牺牲常识、因果、人物主动性与代价',
    systemMode
  ].filter(Boolean);
  const prohibitedMutations = [
    '不得改变男频/女频定位',
    '不得把时代或世界类型替换成另一套题材世界',
    '不得改掉简介明确的主角姓名、身份、前史、亲缘、势力和核心目标',
    '不得把用户明确的无CP、单女主、多女主或后宫模式改成其他关系模式',
    '不得让后续人物、章节或结局否定已经审核通过的核心事实',
    '不得把受众、风格、读者承诺、叙事策略、结构模式或质量约束直接命名为人物、势力、地点、法宝、功法、境界、系统或事件',
    '不得把群像写成多人围绕主角提供功能，每条人物线必须脱离主角仍有成立的欲望、利益和行动',
    '不得用阶段名称代替剧情内容，不得用无代价打脸、机械巧合或凭空信息制造爽点和反转',
    '工作区名称只用于界面识别，不得推断为故事内容'
  ];
  return {
    version: 2,
    sourceSignature: createSourceSignature(backgroundText, synopsisText),
    audience,
    backgroundTags: tags,
    semanticProfile,
    semanticWarnings: semanticAnalysis.warnings,
    semanticCorrections: semanticAnalysis.corrections,
    worldTypes,
    relationshipMode,
    systemMode,
    explicitProtagonists,
    immutableBackground: backgroundText,
    immutableSynopsis: synopsisText,
    hardConstraints,
    prohibitedMutations,
    creativeFreedom: [
      '背景和简介未明确的人物、势力、地点、支线与伏笔可以创新',
      '新增内容必须解释其来源，并与既有事实建立因果连接',
      '允许反转，但反转只能重新解释既有事实，不能直接否定用户明确事实'
    ],
    kernelCommitments: narrativeKernel ? {
      genre: narrativeKernel.genre || '',
      protagonist: narrativeKernel.protagonist || '',
      premise: narrativeKernel.premise || '',
      coreConflict: narrativeKernel.coreConflict || '',
      emotionalPromise: narrativeKernel.emotionalPromise || '',
      endingDirection: narrativeKernel.endingDirection || '',
      canonTerms: narrativeKernel.canonTerms || [],
      tabooList: narrativeKernel.tabooList || []
    } : {}
  };
}

function ensureStoryConstitution(novel) {
  if (!novel) return null;
  const signature = createSourceSignature(novel.background, novel.synopsis);
  if (
    !novel.storyConstitution ||
    novel.storyConstitution.version !== 2 ||
    novel.storyConstitution.sourceSignature !== signature
  ) {
    novel.storyConstitution = deriveStoryConstitution(
      novel.background,
      novel.synopsis,
      novel.narrativeKernel
    );
  } else if (novel.narrativeKernel) {
    novel.storyConstitution.kernelCommitments = deriveStoryConstitution(
      novel.background,
      novel.synopsis,
      novel.narrativeKernel
    ).kernelCommitments;
  }
  return novel.storyConstitution;
}

function storyConstitutionToMarkdown(constitution) {
  const list = values => (values || []).map(value => `- ${value}`).join('\n') || '- 未明确';
  return `# 作品宪法

> 本文档由背景设定与作品简介编译而成，是总纲、人物、章节和终审共同遵守的最高事实源。

## 基础定位
- 受众：${constitution.audience || '未识别'}
- 世界类型：${constitution.worldTypes?.join('、') || '未明确'}
- 感情模式：${constitution.relationshipMode || '未明确'}
- 系统规则：${constitution.systemMode || '未明确'}
- 明确主角：${constitution.explicitProtagonists?.join('、') || constitution.kernelCommitments?.protagonist || '由总纲确认'}

## 背景标签语义
${formatBackgroundSemanticsForPrompt(constitution.semanticProfile)}

## 用户背景设定
${constitution.immutableBackground || '未提供'}

## 用户作品简介
${constitution.immutableSynopsis || '未提供'}

## 不可变硬约束
${list(constitution.hardConstraints)}

## 禁止改写
${list(constitution.prohibitedMutations)}

## 可创新范围
${list(constitution.creativeFreedom)}

## 已审核叙事承诺
- 前提：${constitution.kernelCommitments?.premise || '待总纲确认'}
- 核心冲突：${constitution.kernelCommitments?.coreConflict || '待总纲确认'}
- 情绪承诺：${constitution.kernelCommitments?.emotionalPromise || '待总纲确认'}
- 终局方向：${constitution.kernelCommitments?.endingDirection || '待总纲确认'}`;
}

function upsertStoryConstitutionAsset(novel) {
  const constitution = ensureStoryConstitution(novel);
  if (!constitution) return;
  const existing = (novel.assets || []).find(asset => asset.type === 'story-constitution');
  const asset = {
    id: existing?.id || `story-constitution-${novel.id}-${Date.now()}`,
    group: 'plot-framework',
    type: 'story-constitution',
    name: '作品宪法（背景与简介硬约束）',
    desc: storyConstitutionToMarkdown(constitution)
  };
  if (existing) Object.assign(existing, asset);
  else novel.assets = [asset, ...(novel.assets || [])];
}

function getConstitutionConsistencyIssues(value, constitution) {
  if (!constitution) return [];
  const issues = [];
  const text = JSON.stringify(value || {});
  const outputAudience = value?.narrativeKernel?.audience || value?.audience || '';
  if (constitution.audience && outputAudience && !outputAudience.includes(constitution.audience)) {
    issues.push(`受众定位漂移：要求${constitution.audience}，结果为${outputAudience}`);
  }
  if (constitution.relationshipMode === '无CP' &&
      /主角.{0,18}(?:相爱|恋爱|结为道侣|成婚|纳妾|后宫)|(?:男主|女主).{0,18}(?:相爱|恋爱|成婚)/.test(text)) {
    issues.push('感情模式漂移：背景明确无CP，但结果为主角安排了恋爱、婚姻或后宫关系');
  }
  if (constitution.relationshipMode === '后宫' &&
      /(?:无CP|终身不涉情爱|拒绝一切感情线)/i.test(text)) {
    issues.push('感情模式漂移：背景明确后宫，但结果将作品改成无CP');
  }
  constitution.explicitProtagonists.forEach(name => {
    if (name && !text.includes(name)) issues.push(`主角事实遗漏：简介明确主角“${name}”，结果未保留该姓名`);
  });
  issues.push(...findBackgroundTagEntityIssues(value, constitution.semanticProfile));
  return [...new Set(issues)];
}

function buildRuntimeTaskContext({ novel, task, extra = '', graphLimit = 18 }) {
  const constitution = ensureStoryConstitution(novel);
  const memoryIssues = novel ? auditNarrativeMemory(novel) : [];
  const memoryContext = novel
    ? retrieveNarrativeMemory(novel, task, {
      chapterNumber: extractChapterNumberFromTask(task),
      limit: 26
    })
    : null;
  const graphContext = novel
    ? retrieveGraphContext(novel, task, graphLimit)
    : { context: '暂无图谱数据', edges: [] };
  const assets = compactAssetsForContext(novel?.assets || [], task);
  
  let rollingWorldStateStr = '无';
  if (novel?.plotBlueprint?.chapters && novel.plotBlueprint.chapters.length > 0) {
    const currentChapterNumber = extractChapterNumberFromTask(task) || (novel.plotBlueprint.chapters.length + 1);
    const rollingState = buildRollingWorldState(novel, currentChapterNumber);
    rollingWorldStateStr = JSON.stringify(rollingState);
  }

  const context = `任务：${task}
小说名称：${novel?.name || '未命名小说'}
背景设定：${compactString(novel?.background || '未提供', 1800)}
作品简介：${compactString(novel?.synopsis || '未提供', 2600)}
作品宪法（最高事实优先级）：${compactString(JSON.stringify(constitution || {}), 5200)}
背景标签语义执行规则：${compactString(formatBackgroundSemanticsForPrompt(constitution?.semanticProfile), 2600)}
版本化全局叙事记忆：${compactString(formatNarrativeMemoryContext(memoryContext), 7600)}
叙事记忆一致性检查：${memoryIssues.length ? memoryIssues.join('；') : '通过'}
已审核总纲：${compactString(JSON.stringify(novel?.masterOutline || {}), 3200)}
叙事内核：${compactString(JSON.stringify(novel?.narrativeKernel || {}), 1800)}
事件卡摘要：${compactString(JSON.stringify((novel?.eventCards || []).map(event => ({
  id: event.id,
  order: event.order,
  stage: event.stage,
  title: event.title,
  action: event.protagonistAction,
  conflict: event.conflict,
  delta: event.stateDelta
}))), 4200)}
伏笔台账：${compactString(JSON.stringify(novel?.promiseLedger || []), 2600)}
章节剧情蓝图：${compactString(JSON.stringify((novel?.plotBlueprint?.chapters || []).map(chapter => ({
  n: chapter.chapterNumber,
  title: chapter.title,
  viewpoint: chapter.viewpoint,
  participants: chapter.participants,
  action: chapter.characterAction,
  conflict: chapter.conflict,
  turn: chapter.turn,
  delta: chapter.stateDelta,
  seed: chapter.plantedClues,
  payoff: chapter.paidClues,
  hook: chapter.endingHook
}))), 5200)}
滚动世界状态（累积因果追踪）：${compactString(rollingWorldStateStr, 3200)}
轻量设定索引：${JSON.stringify(assets)}
GraphRAG 摘要：${compactString(graphContext.context, AGENT_CONTEXT_BUDGET.maxGraphChars)}
相关链路：${compactString(graphContext.edges.map(edge => `${edge.source} --${edge.type}--> ${edge.target}`).join('\n'), 2600)}
背景风格硬约束：${getNovelStyleConstraint(novel)}
${extra}
${getSkillIndexPrompt()}`;
  return compactString(context, AGENT_CONTEXT_BUDGET.maxPromptChars);
}

function compressAgentMemo(text, maxChars = AGENT_CONTEXT_BUDGET.maxAgentMemoChars) {
  return compactString(text, maxChars);
}

function inferAgentTaskType(task) {
  if (isFinalNovelAuditTask(task)) return 'final-audit';
  if (isPlotDesignTask(task)) return 'plot';
  if (isCharacterBuildingTask(task)) return 'character';
  return 'outline';
}

class AgentRuntime {
  constructor(task, novel, onStatus = () => {}, taskType = '') {
    this.task = task;
    this.novel = novel;
    const currentNovel = getActiveNovel();
    this.persistenceNovel = currentNovel?.id === novel?.id ? currentNovel : novel;
    this.onStatus = onStatus;
    this.taskType = taskType || inferAgentTaskType(task);
    this.pattern = selectAgentPattern(task);
    this.startedAt = new Date().toISOString();
    this.run = null;
  }

  async prepare(explicitSkillNames = []) {
    const activeSlot = getApiSlot(state.activeApiKeyId);
    const primarySlot = getApiSlot(state.primaryApiKeyId) || activeSlot;
    const previousRun = [...(this.persistenceNovel?.agentRuns || [])].reverse().find(run =>
      run.taskType === this.taskType &&
      run.task === this.task &&
      run.contextFingerprint === createAgentContextFingerprint(this.persistenceNovel, this.task) &&
      ['running', 'failed-recoverable'].includes(run.status)
    );
    this.run = createAgentRunRecord({
      taskType: this.taskType,
      task: this.task,
      novel: this.persistenceNovel,
      activeModel: activeSlot?.apiModel || state.apiModel,
      primaryModel: primarySlot?.apiModel || activeSlot?.apiModel || state.apiModel
    });
    if (previousRun) {
      this.run.resumedFromRunId = previousRun.id;
      this.run.resumeCheckpoint = previousRun.checkpoints?.at(-1) || null;
    }
    this.run.pattern = this.pattern.name;
    this.run.plan = createAgentPlan(this.taskType);
    this.run.routing = {
      workerSlotId: activeSlot?.id || '',
      primarySlotId: primarySlot?.id || '',
      frozenAt: this.startedAt
    };
    this.persist();
    activeAgentRuntime = this;
    this.onStatus(`总控 Agent 已选择协作模式：${this.pattern.name}。`, '总控 Agent', 8);
    this.onStatus(
      `模型路由已冻结：主控 ${this.run.primaryModel || '未配置'}，工作模型 ${this.run.activeModel || '未配置'}。`,
      '总控 Agent',
      9
    );
    if (previousRun) {
      this.onStatus(
        `检测到同一事实版本的未完成运行 ${previousRun.id}，已继承其恢复线索并重新执行未确认流程。`,
        '恢复管理器',
        9
      );
    }
    recordNarrativeObservation(this.novel, {
      type: 'agent-task',
      status: 'running',
      summary: this.task,
      details: `协作模式：${this.pattern.name}`,
      source: 'AgentRuntime.prepare'
    });
    this.skills = await loadSkillsForTask(this.task, explicitSkillNames);
    this.baseContext = buildRuntimeTaskContext({
      novel: this.novel,
      task: this.task,
      extra: `协作模式：${this.pattern.name}｜${this.pattern.description}\n按需加载技能：\n${this.skills}`
    });
    this.checkpoint('context', '已冻结作品事实、模型路由和任务上下文', 'runtime-context');
    return this;
  }

  persist() {
    if (!this.run || !this.persistenceNovel) return;
    const runs = Array.isArray(this.persistenceNovel.agentRuns) ? this.persistenceNovel.agentRuns : [];
    const index = runs.findIndex(run => run.id === this.run.id);
    if (index >= 0) runs[index] = this.run;
    else runs.push(this.run);
    this.persistenceNovel.agentRuns = runs.slice(-30);
    this.persistenceNovel.activeAgentRunId = ['running', 'awaiting-review', 'failed-recoverable'].includes(this.run.status)
      ? this.run.id
      : '';
  }

  setStage(stage, status = 'running', error = '') {
    if (!this.run) return;
    this.run.plan = updateAgentPlan(this.run.plan, stage, status, error);
    this.run.stage = stage;
    this.run.updatedAt = new Date().toISOString();
    this.persist();
  }

  checkpoint(stage, summary = '', payloadRef = '') {
    if (!this.run) return null;
    this.setStage(stage, 'completed');
    const checkpoint = createAgentCheckpoint(this.run, {
      stage,
      summary,
      payloadRef,
      contextFingerprint: this.run.contextFingerprint
    });
    this.persist();
    saveState();
    return checkpoint;
  }

  noteReplan(stage, error, forcedAction = '') {
    if (!this.run) return null;
    const decision = replanAgentPlan(this.run.plan, stage, error);
    if (forcedAction) decision.action = forcedAction;
    this.run.plan = decision.plan;
    this.run.replans = [...(this.run.replans || []), {
      stage,
      action: decision.action,
      reason: decision.reason,
      error: compactString(error, 500),
      createdAt: new Date().toISOString()
    }].slice(-30);
    this.persist();
    return decision;
  }

  addQualityGate(name, passed, details = '') {
    if (!this.run) return;
    this.run.qualityGates = [...(this.run.qualityGates || []), {
      name,
      passed: Boolean(passed),
      details: compactString(details, 800),
      checkedAt: new Date().toISOString()
    }].slice(-50);
    this.persist();
  }

  addVerifiedExperience(candidate) {
    if (!this.persistenceNovel) return;
    this.persistenceNovel.agentExperienceCandidates = recordVerifiedExperience(
      this.persistenceNovel.agentExperienceCandidates || [],
      candidate
    );
    this.persist();
  }

  awaitingReview(summary = '') {
    if (!this.run) return;
    this.run.status = 'awaiting-review';
    this.run.stage = 'review';
    this.run.summary = compactString(summary, 800);
    this.run.updatedAt = new Date().toISOString();
    this.persist();
    saveState();
  }

  complete(summary = '') {
    if (!this.run) return;
    this.run.status = 'completed';
    this.run.stage = 'completed';
    this.run.progress = 100;
    this.run.summary = compactString(summary, 800);
    this.run.completedAt = new Date().toISOString();
    this.run.updatedAt = this.run.completedAt;
    this.persist();
    saveState();
    if (activeAgentRuntime === this) activeAgentRuntime = null;
  }

  reject(summary = '') {
    if (!this.run) return;
    this.run.status = 'rejected';
    this.run.stage = 'review';
    this.run.summary = compactString(summary || '用户拒绝本次候选结果。', 800);
    this.run.completedAt = new Date().toISOString();
    this.run.updatedAt = this.run.completedAt;
    this.persist();
    saveState();
    if (activeAgentRuntime === this) activeAgentRuntime = null;
  }

  fail(error) {
    if (!this.run) return;
    const stage = this.run.stage || 'unknown';
    const decision = this.noteReplan(stage, error?.message || error);
    this.run.errors = [...(this.run.errors || []), {
      stage,
      message: compactString(error?.message || error, 1000),
      action: decision?.action || 'escalate',
      createdAt: new Date().toISOString()
    }].slice(-50);
    this.run.status = decision?.action === 'escalate' ? 'blocked' : 'failed-recoverable';
    this.run.updatedAt = new Date().toISOString();
    this.persist();
    saveState();
    if (activeAgentRuntime === this) activeAgentRuntime = null;
  }

  assertContextCurrent() {
    if (!this.run) return;
    const current = createAgentContextFingerprint(this.persistenceNovel, this.task);
    if (current !== this.run.contextFingerprint) {
      const error = new Error('任务执行期间正式事实上下文已变化，结果已隔离，必须基于新版本重新规划。');
      this.addQualityGate('context-version', false, error.message);
      this.fail(error);
      throw error;
    }
    this.addQualityGate('context-version', true, this.run.contextFingerprint);
  }

  getWorkerContext(workerName, workerBrief = '') {
    return compactString(`子 Agent：${workerName}
工作边界：${workerBrief}
上下文隔离规则：只解决本 worker 的职责；不要复述全部设定；输出可合并的短备忘录。
${this.baseContext}`, AGENT_CONTEXT_BUDGET.maxPromptChars);
  }

  summarizeWorkerResult(workerName, result) {
    return `【${workerName} 摘要】\n${compressAgentMemo(result)}`;
  }
}

async function loadHeartbeatChecklist() {
  try {
    const response = await fetch('/api/heartbeat');
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return String(data.content || '');
  } catch (error) {
    console.warn(`心跳清单 API 不可用，使用内置清单：${error.message}`);
    return STATIC_HEARTBEAT_CHECKLIST;
  }
}

function inspectHeartbeatState() {
  return inspectHeartbeatStateWithChecklist('');
}

function parseHeartbeatChecklist(checklist) {
  const text = String(checklist || '');
  return {
    knowledgeGraph: /知识图谱|knowledge graph|knowledge-graphs/i.test(text),
    staleRoster: /名册|roster|草稿/i.test(text),
    missingOutline: /总纲|outline/i.test(text),
    lastFailure: /失败|failed|retry/i.test(text),
    waitingReview: /审核|review|waiting/i.test(text)
  };
}

function inspectHeartbeatStateWithChecklist(checklist) {
  const novel = getActiveNovel();
  const notices = [];
  if (!novel) return notices;
  const checks = parseHeartbeatChecklist(checklist);
  if (checks.knowledgeGraph && novel.knowledgeGraph && !novel.knowledgeGraphFile) {
    notices.push('知识图谱已有本地数据，但尚未成功持久化到 data/knowledge-graphs。');
  }
  if (checks.staleRoster && novel.characterRosterDraft?.updatedAt) {
    const ageMs = Date.now() - new Date(novel.characterRosterDraft.updatedAt).getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      notices.push(`人物名册草稿已超过 24 小时未完成：${novel.characterRosterDraft.characters?.length || 0} 人。`);
    }
  }
  if (checks.missingOutline && !novel.masterOutline && (novel.background || novel.synopsis)) {
    notices.push('当前小说已有背景/简介，但尚未审核通过全书总纲。');
  }
  if (checks.lastFailure && heartbeatState.lastFailure && heartbeatState.lastFailureAt) {
    notices.push(`上次 Agent 任务失败：${heartbeatState.lastFailure}`);
  }
  if (checks.waitingReview && heartbeatState.pendingReview) {
    notices.push(`有内容等待人工审核：${heartbeatState.pendingReview}`);
  }
  const activeRun = (novel.agentRuns || []).find(run => run.id === novel.activeAgentRunId);
  if (activeRun?.status === 'awaiting-review') {
    notices.push(`Agent 运行 ${activeRun.id} 已完成生成，正在等待人工审核。`);
  } else if (activeRun?.status === 'running') {
    const checkpoint = activeRun.checkpoints?.at(-1);
    notices.push(
      `检测到刷新前未结束的 Agent 运行 ${activeRun.id}，最近检查点：${checkpoint?.summary || activeRun.stage || '未知阶段'}。`
    );
  } else if (activeRun?.status === 'failed-recoverable') {
    notices.push(`Agent 运行 ${activeRun.id} 可恢复，下一次同任务会继承最近检查点与错误线索。`);
  }
  return notices;
}

async function runHeartbeatCycle({ force = false } = {}) {
  const now = Date.now();
  const intervalMs = 5 * 60 * 1000;
  if (!force && heartbeatState.lastRunAt && now - heartbeatState.lastRunAt < intervalMs) {
    return 'HEARTBEAT_OK';
  }
  heartbeatState.lastRunAt = now;
  const checklist = await loadHeartbeatChecklist();
  const notices = inspectHeartbeatStateWithChecklist(checklist);
  const result = notices.length
    ? `HEARTBEAT_NOTICE：${notices.slice(0, 3).join('；')}`
    : 'HEARTBEAT_OK';
  const noticeHash = result === 'HEARTBEAT_OK' ? '' : result;
  const cooldownMs = 30 * 60 * 1000;
  heartbeatState.lastChecklistDigest = compactString(checklist, 800);
  heartbeatState.lastResult = result;
  saveHeartbeatState();
  const shouldNotify = result !== 'HEARTBEAT_OK' && (
    heartbeatState.lastNoticeHash !== noticeHash ||
    !heartbeatState.lastNoticeAt ||
    now - new Date(heartbeatState.lastNoticeAt).getTime() > cooldownMs
  );
  if (shouldNotify) {
    heartbeatState.lastNoticeHash = noticeHash;
    heartbeatState.lastNoticeAt = new Date(now).toISOString();
    saveHeartbeatState();
    showToast(result.replace(/^HEARTBEAT_NOTICE：/, ''), 'info');
  }
  return result;
}

function startHeartbeatDaemon() {
  window.setInterval(() => {
    void runHeartbeatCycle();
  }, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void runHeartbeatCycle({ force: true });
  });
  void runHeartbeatCycle({ force: true });
}

function extractCompleteJsonObjectsFromArray(rawText, arrayProperty = 'characters') {
  const text = String(rawText || '')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '');
  const propertyMatch = new RegExp(`["']?${arrayProperty}["']?\\s*:\\s*\\[`, 'i').exec(text);
  if (!propertyMatch) return [];

  const arrayStart = propertyMatch.index + propertyMatch[0].length;
  const objects = [];
  let objectStart = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = arrayStart; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      if (depth === 0) objectStart = index;
      depth += 1;
      continue;
    }
    if (char === '}') {
      if (depth === 0) continue;
      depth -= 1;
      if (depth === 0 && objectStart >= 0) {
        const objectText = text.slice(objectStart, index + 1);
        try {
          objects.push(JSON.parse(objectText));
        } catch (error) {
          // Keep scanning: a later complete object may still be valid.
        }
        objectStart = -1;
      }
      continue;
    }
    if (char === ']' && depth === 0) break;
  }
  return objects;
}

function parseCharacterArrayResponse(rawText) {
  return parseNamedArrayResponse(rawText, 'characters');
}

function parseNamedArrayResponse(rawText, propertyName) {
  try {
    const parsed = parseAIJson(rawText);
    return {
      [propertyName]: Array.isArray(parsed[propertyName]) ? parsed[propertyName] : [],
      recovered: false,
      parseError: ''
    };
  } catch (error) {
    const recoveredItems = extractCompleteJsonObjectsFromArray(rawText, propertyName);
    if (!recoveredItems.length) throw error;
    return {
      [propertyName]: recoveredItems,
      recovered: true,
      parseError: error.message
    };
  }
}

async function parseNamedArrayResponseWithRepair(rawText, propertyName, onStatus = () => {}, agentName = 'JSON 修复 Agent') {
  try {
    return parseNamedArrayResponse(rawText, propertyName);
  } catch (firstError) {
    onStatus(`检测到 ${propertyName} JSON 损坏，正在进行语法修复：${firstError.message}`, agentName);
    try {
      const primarySlot = (state.apiKeys && state.primaryApiKeyId)
        ? (state.apiKeys.find(s => s.id === state.primaryApiKeyId) || state)
        : state;
      const repairedRaw = await callConfiguredAI(
        `你是 JSON 数组修复 Agent。只返回修复后的 JSON，不要代码围栏，不要解释。
目标格式：{"${propertyName}":[{...}]}
规则：
1. 只修复 JSON 语法问题，例如缺逗号、缺引号、缺括号、尾部截断。
2. 不改写字段语义，不新增故事设定。
3. 若末尾对象不完整，保留前面完整对象，补齐必要闭合结构。`,
        `解析错误：${firstError.message}
损坏内容：
${String(rawText).slice(0, 60000)}`,
        true,
        primarySlot
      );
      return parseNamedArrayResponse(repairedRaw, propertyName);
    } catch (repairError) {
      const recoveredItems = extractCompleteJsonObjectsFromArray(rawText, propertyName);
      if (recoveredItems.length) {
        onStatus(`${propertyName} JSON 修复失败，但已抢救 ${recoveredItems.length} 个完整对象：${repairError.message}`, agentName);
        return {
          [propertyName]: recoveredItems,
          recovered: true,
          parseError: repairError.message
        };
      }
      throw new Error(`${propertyName} JSON 修复失败：${repairError.message}`);
    }
  }
}

async function callNamedArrayAgentWithRepair(systemPrompt, userPrompt, propertyName, onStatus = () => {}, agentName = 'JSON Agent') {
  const rawText = await callConfiguredAI(systemPrompt, userPrompt, true, state, 2, 'worker');
  return parseNamedArrayResponseWithRepair(rawText, propertyName, onStatus, agentName);
}

function normalizeGeneratedAssets(result, novelId) {
  const allowedTypes = new Set(Object.keys(TYPE_METADATA));
  const typeGroupMap = {
    'location': 'world-setting',
    'faction': 'world-setting',
    'system': 'world-setting',
    'main-character': 'character-growth',
    'major-character': 'character-growth',
    'family-character': 'character-growth',
    'former-sect-character': 'character-growth',
    'antagonist-character': 'character-growth',
    'neutral-character': 'character-growth',
    'hidden-character': 'character-growth',
    'civilian-character': 'character-growth',
    'supporting-character': 'character-growth',
    'character-network': 'character-growth',
    'core-power': 'themes-core',
    'secret-clue': 'themes-core',
    'main-outline': 'plot-framework',
    'pace-hooks': 'plot-framework',
    'planting': 'plot-framework',
    'payoff': 'plot-framework'
  };
  const sourceAssets = Array.isArray(result.assets) ? result.assets : [];
  const assets = [];

  sourceAssets.forEach((asset, index) => {
    const type = String(asset.type || '').trim();
    const name = String(asset.name || '').trim();
    const desc = String(asset.desc || '').trim();
    if (!allowedTypes.has(type) || !name || !desc) return;
    assets.push({
      id: `ai-${novelId}-${index}-${Date.now()}`,
      group: typeGroupMap[type],
      type,
      name: name.slice(0, 80),
      desc
    });
  });

  const requiredTypes = ['location', 'faction', 'system', 'main-character', 'supporting-character', 'core-power', 'secret-clue', 'main-outline', 'pace-hooks', 'planting', 'payoff'];
  const missingTypes = requiredTypes.filter(type => !assets.some(asset => asset.type === type));
  if (assets.length < 11 || missingTypes.length > 0) {
    throw new Error(`AI 设定数据不完整，缺少：${missingTypes.map(type => TYPE_METADATA[type].name).join('、') || '足够的有效设定项'}。请重试。`);
  }
  return assets;
}

function getAssetJsonContract() {
  return `必须只返回一个 JSON 对象，不要输出 Markdown、解释或代码围栏。JSON 格式：
{
  "analysisSummary": "100字以内的作品定位总结",
  "firstChapterTitle": "第一章标题，不含章节序号",
  "openingGuide": "第一章开篇写作提示，120-250字",
  "masterOutline": {
    "beginning": "300-700字，必须依次包含【人物驱动】【群像推进】【悬疑问题】【因果升级】【关键反转】【爽点兑现】【阶段代价】",
    "development": "500-1200字，必须依次包含【人物驱动】【群像推进】【悬疑问题】【因果升级】【关键反转】【爽点兑现】【阶段代价】",
    "climax": "400-900字，必须依次包含【人物驱动】【群像推进】【悬疑问题】【因果升级】【关键反转】【爽点兑现】【阶段代价】",
    "ending": "300-700字，必须依次包含【人物驱动】【群像推进】【悬疑问题】【因果升级】【关键反转】【爽点兑现】【阶段代价】"
  },
  "assets": [
    {"group":"world-setting","type":"location","name":"名称","desc":"具体设定"},
    {"group":"world-setting","type":"faction","name":"名称","desc":"具体设定"},
    {"group":"world-setting","type":"system","name":"名称","desc":"具体设定"},
    {"group":"character-growth","type":"main-character","name":"名称","desc":"具体设定"},
    {"group":"character-growth","type":"supporting-character","name":"名称","desc":"具体设定"},
    {"group":"themes-core","type":"core-power","name":"名称","desc":"具体设定"},
    {"group":"themes-core","type":"secret-clue","name":"名称","desc":"具体设定"},
    {"group":"plot-framework","type":"main-outline","name":"名称","desc":"具体设定"},
    {"group":"plot-framework","type":"pace-hooks","name":"名称","desc":"具体设定"},
    {"group":"plot-framework","type":"planting","name":"名称","desc":"具体设定"},
    {"group":"plot-framework","type":"payoff","name":"名称","desc":"具体设定"}
  ]
}`;
}

function getNarrativeBlueprintContract() {
  return `必须只返回一个 JSON 对象，不要输出 Markdown、解释或代码围栏。JSON 格式：
{
  "narrativeKernel": {
    "genre": "题材类型",
    "audience": "男频|女频",
    "premise": "一句话核心设定",
    "protagonist": "主角姓名与初始身份",
    "coreConflict": "全书核心冲突",
    "emotionalPromise": "读者情绪承诺",
    "commercialHooks": ["可连载卖点"],
    "tabooList": ["不得违反的硬约束"],
    "canonTerms": ["统一术语/势力名/主角名"],
    "endingDirection": "终局方向"
  },
  "worldPressure": {
    "publicCrisis": "明面压力",
    "hiddenCrisis": "暗线压力",
    "resourcePressure": "资源或规则压力",
    "socialPressure": "人物关系/阶层/舆论压力"
  },
  "factionPlans": [{
    "id": "faction-1",
    "name": "势力名称",
    "leader": "负责人",
    "publicGoal": "公开目标",
    "hiddenGoal": "隐藏目标",
    "resources": ["资源"],
    "constraints": ["限制"],
    "timeline": ["开始阶段行动", "发展阶段行动", "高潮阶段行动", "结局阶段归宿"],
    "collisionPoints": ["与主角路线相撞的事件"]
  }],
  "eventCards": [{
    "id": "event-1",
    "volumeId": "volume-1",
    "order": 1,
    "title": "事件标题",
    "stage": "beginning|development|climax|ending",
    "preState": "事件前状态",
    "trigger": "触发条件",
    "protagonistGoal": "主角目标",
    "protagonistAction": "主角主动行动",
    "oppositionActor": "阻力人物或势力",
    "oppositionMotive": "对方动机",
    "oppositionResources": "对方资源",
    "conflict": "具体冲突",
    "cost": "主角或关系付出的代价",
    "gain": "获得的信息/资源/关系变化",
    "stateDelta": "事件后状态变化",
    "plantedPromises": ["本事件埋下的伏笔 id"],
    "paidPromises": ["本事件回收的伏笔 id"],
    "characterArcDelta": "人物弧光变化",
    "readerHook": "读者继续读的钩子",
    "validationFlags": ["自检标签"]
  }],
  "promiseLedger": [{
    "id": "promise-1",
    "promiseType": "伏笔|悬念|情感承诺|身份承诺|战力承诺",
    "seedEventId": "event-1",
    "expectedPayoffWindow": "发展|高潮|结局",
    "payoffEventId": "event-8",
    "status": "seeded|paid|open",
    "risk": "失效风险",
    "readerQuestion": "读者会产生的问题"
  }],
  "stateLedger": [{
    "eventId": "event-1",
    "protagonistState": "主角状态",
    "relationshipState": "关键关系变化",
    "worldState": "世界/势力状态",
    "readerState": "读者知道什么、期待什么"
  }]
}`;
}

function normalizeStringArray(value, limit = 8) {
  return Array.isArray(value)
    ? value.map(item => String(item || '').trim()).filter(Boolean).slice(0, limit)
    : [];
}

function normalizeNarrativeBlueprint(rawBlueprint, fallback = {}) {
  const blueprint = rawBlueprint && typeof rawBlueprint === 'object' ? rawBlueprint : {};
  const kernel = blueprint.narrativeKernel || {};
  const worldPressure = blueprint.worldPressure || {};
  const eventCards = Array.isArray(blueprint.eventCards) ? blueprint.eventCards : [];
  const promiseLedger = Array.isArray(blueprint.promiseLedger) ? blueprint.promiseLedger : [];
  const stateLedger = Array.isArray(blueprint.stateLedger) ? blueprint.stateLedger : [];
  const factionPlans = Array.isArray(blueprint.factionPlans) ? blueprint.factionPlans : [];
  const audienceFromBackground = /(男频|女频)/.exec(fallback.background || '')?.[1] || '';

  return {
    narrativeKernel: {
      genre: String(kernel.genre || '').trim(),
      audience: String(kernel.audience || audienceFromBackground || '').trim(),
      premise: String(kernel.premise || '').trim(),
      protagonist: String(kernel.protagonist || '').trim(),
      coreConflict: String(kernel.coreConflict || '').trim(),
      emotionalPromise: String(kernel.emotionalPromise || '').trim(),
      commercialHooks: normalizeStringArray(kernel.commercialHooks, 10),
      tabooList: normalizeStringArray(kernel.tabooList, 12),
      canonTerms: normalizeStringArray(kernel.canonTerms, 16),
      endingDirection: String(kernel.endingDirection || '').trim()
    },
    worldPressure: {
      publicCrisis: String(worldPressure.publicCrisis || '').trim(),
      hiddenCrisis: String(worldPressure.hiddenCrisis || '').trim(),
      resourcePressure: String(worldPressure.resourcePressure || '').trim(),
      socialPressure: String(worldPressure.socialPressure || '').trim()
    },
    factionPlans: factionPlans.map((plan, index) => ({
      id: String(plan.id || `faction-${index + 1}`).trim(),
      name: String(plan.name || '').trim(),
      leader: String(plan.leader || '').trim(),
      publicGoal: String(plan.publicGoal || '').trim(),
      hiddenGoal: String(plan.hiddenGoal || '').trim(),
      resources: normalizeStringArray(plan.resources, 8),
      constraints: normalizeStringArray(plan.constraints, 8),
      timeline: normalizeStringArray(plan.timeline, 8),
      collisionPoints: normalizeStringArray(plan.collisionPoints, 8)
    })).filter(plan => plan.name && (plan.publicGoal || plan.hiddenGoal)),
    eventCards: eventCards.map((event, index) => ({
      id: String(event.id || `event-${index + 1}`).trim(),
      volumeId: String(event.volumeId || 'volume-1').trim(),
      order: Number(event.order) || index + 1,
      title: String(event.title || '').trim(),
      stage: ['beginning', 'development', 'climax', 'ending'].includes(event.stage) ? event.stage : 'development',
      preState: String(event.preState || '').trim(),
      trigger: String(event.trigger || '').trim(),
      protagonistGoal: String(event.protagonistGoal || '').trim(),
      protagonistAction: String(event.protagonistAction || '').trim(),
      oppositionActor: String(event.oppositionActor || '').trim(),
      oppositionMotive: String(event.oppositionMotive || '').trim(),
      oppositionResources: String(event.oppositionResources || '').trim(),
      conflict: String(event.conflict || '').trim(),
      cost: String(event.cost || '').trim(),
      gain: String(event.gain || '').trim(),
      stateDelta: String(event.stateDelta || '').trim(),
      plantedPromises: normalizeStringArray(event.plantedPromises, 8),
      paidPromises: normalizeStringArray(event.paidPromises, 8),
      characterArcDelta: String(event.characterArcDelta || '').trim(),
      readerHook: String(event.readerHook || '').trim(),
      validationFlags: normalizeStringArray(event.validationFlags, 10)
    })).filter(event => event.title && event.trigger && event.protagonistAction && event.conflict),
    promiseLedger: promiseLedger.map((promise, index) => ({
      id: String(promise.id || `promise-${index + 1}`).trim(),
      promiseType: String(promise.promiseType || '伏笔').trim(),
      seedEventId: String(promise.seedEventId || '').trim(),
      expectedPayoffWindow: String(promise.expectedPayoffWindow || '').trim(),
      payoffEventId: String(promise.payoffEventId || '').trim(),
      status: String(promise.status || 'open').trim(),
      risk: String(promise.risk || '').trim(),
      readerQuestion: String(promise.readerQuestion || '').trim()
    })).filter(promise => promise.id && promise.seedEventId && promise.readerQuestion),
    stateLedger: stateLedger.map((stateItem, index) => ({
      eventId: String(stateItem.eventId || `event-${index + 1}`).trim(),
      protagonistState: String(stateItem.protagonistState || '').trim(),
      relationshipState: String(stateItem.relationshipState || '').trim(),
      worldState: String(stateItem.worldState || '').trim(),
      readerState: String(stateItem.readerState || '').trim()
    })).filter(stateItem => stateItem.eventId && (stateItem.protagonistState || stateItem.worldState || stateItem.readerState))
  };
}

function validateNarrativeBlueprint(blueprint, semanticProfile = null) {
  const issues = [];
  const kernel = blueprint.narrativeKernel || {};
  const events = Array.isArray(blueprint.eventCards) ? blueprint.eventCards : [];
  const promises = Array.isArray(blueprint.promiseLedger) ? blueprint.promiseLedger : [];
  const states = Array.isArray(blueprint.stateLedger) ? blueprint.stateLedger : [];
  const requiredKernelFields = ['audience', 'premise', 'protagonist', 'coreConflict', 'emotionalPromise', 'endingDirection'];
  requiredKernelFields.forEach(field => {
    if (!kernel[field]) issues.push(`叙事内核缺少 ${field}`);
  });
  if (!/(男频|女频)/.test(kernel.audience || '')) {
    issues.push('叙事内核必须明确 audience 为男频或女频');
  }
  if (events.length < 12) {
    issues.push(`事件卡不足：至少 12 个，当前 ${events.length} 个`);
  }
  ['beginning', 'development', 'climax', 'ending'].forEach(stage => {
    if (!events.some(event => event.stage === stage)) {
      issues.push(`事件卡缺少 ${stage} 阶段`);
    }
  });
  const eventIds = new Set();
  events.forEach(event => {
    if (eventIds.has(event.id)) issues.push(`事件 id 重复：${event.id}`);
    eventIds.add(event.id);
    ['title', 'preState', 'trigger', 'protagonistGoal', 'protagonistAction', 'oppositionActor', 'oppositionMotive', 'conflict', 'cost', 'gain', 'stateDelta', 'characterArcDelta', 'readerHook'].forEach(field => {
      if (!event[field]) issues.push(`事件 ${event.id || event.title} 缺少 ${field}`);
    });
  });
  const promiseIds = new Set();
  promises.forEach(promise => {
    if (promiseIds.has(promise.id)) issues.push(`伏笔 id 重复：${promise.id}`);
    promiseIds.add(promise.id);
    if (!eventIds.has(promise.seedEventId)) issues.push(`伏笔 ${promise.id} 的 seedEventId 不存在：${promise.seedEventId}`);
    if (promise.payoffEventId && !eventIds.has(promise.payoffEventId)) issues.push(`伏笔 ${promise.id} 的 payoffEventId 不存在：${promise.payoffEventId}`);
  });
  events.forEach(event => {
    [...event.plantedPromises, ...event.paidPromises].forEach(promiseId => {
      if (promiseId && !promiseIds.has(promiseId)) {
        issues.push(`事件 ${event.id} 引用了不存在的伏笔：${promiseId}`);
      }
    });
  });
  const stateEventIds = new Set(states.map(item => item.eventId));
  events.forEach(event => {
    if (!stateEventIds.has(event.id)) issues.push(`事件 ${event.id} 缺少状态台账记录`);
  });
  issues.push(...findBackgroundTagEntityIssues(blueprint, semanticProfile));
  return {
    passed: issues.length === 0,
    issues
  };
}

async function repairNarrativeBlueprint(context, blueprint, validation, onStatus = () => {}) {
  onStatus(`叙事蓝图结构校验未通过，正在自动修复 ${validation.issues.length} 个问题...`, '蓝图修复 Agent', 58);
  const repaired = await callJsonAgentWithRepair(
    `你是叙事蓝图修复 Agent。只返回符合以下契约的 JSON：
${getNarrativeBlueprintContract()}

修复规则：
1. 不得降低标准，不得删除困难问题来假装通过。
2. 必须补齐缺失事件、状态台账、伏笔 seed/payoff 和四阶段覆盖。
3. 不得改变背景设定、简介、男频/女频、主角和核心承诺。
4. 事件必须由因果推进，不能机械堆设定。`,
    `${context}
结构校验问题：${JSON.stringify(validation.issues)}
当前蓝图：${JSON.stringify(blueprint)}`,
    onStatus,
    '蓝图修复 Agent'
  );
  return normalizeNarrativeBlueprint(repaired);
}

function blueprintToAssets(blueprint, novelId) {
  const now = Date.now();
  const assets = [];
  const kernel = blueprint.narrativeKernel;
  const pressure = blueprint.worldPressure;
  assets.push({
    id: `kernel-${novelId}-${now}`,
    group: 'plot-framework',
    type: 'narrative-kernel',
    name: '叙事内核（不可变硬约束）',
    desc: [
      `受众：${kernel.audience}`,
      `题材：${kernel.genre}`,
      `前提：${kernel.premise}`,
      `主角：${kernel.protagonist}`,
      `核心冲突：${kernel.coreConflict}`,
      `情绪承诺：${kernel.emotionalPromise}`,
      `商业钩子：${kernel.commercialHooks.join('；')}`,
      `禁区：${kernel.tabooList.join('；')}`,
      `统一术语：${kernel.canonTerms.join('；')}`,
      `终局方向：${kernel.endingDirection}`
    ].join('\n')
  });
  assets.push({
    id: `pressure-${novelId}-${now}`,
    group: 'world-setting',
    type: 'system',
    name: '世界压力与长期矛盾',
    desc: `明面危机：${pressure.publicCrisis}\n暗线危机：${pressure.hiddenCrisis}\n资源压力：${pressure.resourcePressure}\n社会压力：${pressure.socialPressure}`
  });
  blueprint.factionPlans.forEach((plan, index) => {
    assets.push({
      id: `faction-plan-${novelId}-${index}-${now}`,
      group: 'world-setting',
      type: 'faction-plan',
      name: `势力计划：${plan.name}`,
      desc: `负责人：${plan.leader}\n公开目标：${plan.publicGoal}\n隐藏目标：${plan.hiddenGoal}\n资源：${plan.resources.join('；')}\n限制：${plan.constraints.join('；')}\n时间线：${plan.timeline.join(' -> ')}\n碰撞点：${plan.collisionPoints.join('；')}`
    });
  });
  blueprint.eventCards.forEach((event, index) => {
    assets.push({
      id: `event-card-${novelId}-${index}-${now}`,
      group: 'plot-framework',
      type: 'event-card',
      name: `${String(event.order).padStart(2, '0')}｜${event.title}`,
      desc: `阶段：${event.stage}
事件前：${event.preState}
触发：${event.trigger}
主角目标：${event.protagonistGoal}
主角行动：${event.protagonistAction}
阻力方：${event.oppositionActor}
阻力动机：${event.oppositionMotive}
阻力资源：${event.oppositionResources}
冲突：${event.conflict}
代价：${event.cost}
收益：${event.gain}
状态变化：${event.stateDelta}
埋伏笔：${event.plantedPromises.join('、') || '无'}
回收伏笔：${event.paidPromises.join('、') || '无'}
人物弧光：${event.characterArcDelta}
读者钩子：${event.readerHook}`
    });
  });
  if (blueprint.promiseLedger.length) {
    assets.push(createPromiseLedgerAsset(blueprint.promiseLedger, novelId, now));
  }
  assets.push({
    id: `state-ledger-${novelId}-${now}`,
    group: 'plot-framework',
    type: 'state-ledger',
    name: '状态台账（事件后写回）',
    desc: blueprint.stateLedger.map(item =>
      `【${item.eventId}】主角：${item.protagonistState}｜关系：${item.relationshipState}｜世界：${item.worldState}｜读者：${item.readerState}`
    ).join('\n')
  });
  return assets;
}

async function generateNarrativeBlueprint(name, background, synopsis, task, runtime, onStatus = () => {}) {
  const semanticAnalysis = validateBackgroundSemanticCoherence(background, synopsis);
  if (semanticAnalysis.errors.length) {
    throw new Error(`背景设定语义冲突：${semanticAnalysis.errors.join('；')}`);
  }
  const semanticProfile = semanticAnalysis.profile;
  const semanticPrompt = formatBackgroundSemanticsForPrompt(semanticProfile);
  const context = buildRuntimeTaskContext({
    novel: runtime?.novel || { name, background, synopsis, assets: [] },
    task,
    extra: `本任务采用叙事编译器流程：Kernel -> 世界压力 -> 势力计划 -> 事件卡 -> 伏笔台账 -> 状态台账。`
  });
  onStatus('Kernel Agent 正在锁定题材、受众、主角、核心冲突和终局承诺...', 'Kernel Agent', 18);
  const rawBlueprint = await callJsonAgentWithRepair(
    `你是长篇网文叙事编译器的总控 Agent。你必须组织多个专业 Agent 的结果，但最终只输出一个结构化叙事蓝图。
${getNarrativeBlueprintContract()}

硬性要求：
1. 背景设定必须明确男频或女频，输出 audience 必须继承这个定位。
2. 简介不是空时，主角、核心前史、CP、势力名称、情绪承诺必须以简介为准。
3. 至少生成 12 个 eventCards，覆盖 beginning/development/climax/ending。
4. 每个事件必须包含主角主动选择、对抗方动机、代价、收益和状态变化。
5. 至少生成 6 条 promiseLedger，必须有 seedEventId；重要伏笔必须有 payoffEventId。
6. stateLedger 必须覆盖每个 eventCard。
7. 冲突必须来自人物欲望、势力计划、世界压力或前序选择的后果，禁止机械降神。
8. 目标是百万字长篇可扩展大纲，不是短篇梗概。
9. 若背景包含“系统”，只能设计修仙世界内的金手指、器灵、面板、神通、任务或奖惩机制，不得把世界写成软件系统；禁止 BUG、代码、程序、格式化、补丁、逻辑解析、降维、集体潜意识、思维牢笼、天道剧本等现代或元叙事隐喻。
10. ${getNovelStyleConstraint(runtime?.novel || { background })}
11. ${semanticPrompt}
12. “反套路”等叙事策略必须体现为有铺垫、有因果的人物选择与预期偏转，严禁生成“反套路天鉴”“爽文神功”“热血宗”等把创作标签直接实体化的名称。
13. 默认按群像创作：至少三位关键人物拥有独立欲望、利益、行动计划和选择后果；他们不是主角工具人，事件卡必须体现人物线之间的因果碰撞。
14. 按番茄网文节奏设计开篇事件链：快速进入具体困境，连续三次升级与兑现，第三个开篇事件形成小高潮、有效反转和长线悬念。`,
    `${context}
小说名称：${name}
背景设定：${background}
作品简介：${synopsis || '未提供'}
用户任务：${task}

请在内部模拟以下 Agent 协作后输出最终 JSON：
Kernel Agent、世界压力 Agent、势力模拟 Agent、事件候选 Agent、因果校验 Agent、伏笔审计 Agent、读者曲线 Agent。`,
    onStatus,
    '叙事编译器'
  );
  let blueprint = normalizeNarrativeBlueprint(rawBlueprint, { background });
  const semanticRepairs = repairBackgroundTagEntityNames(blueprint, semanticProfile);
  if (semanticRepairs.length) {
    onStatus(
      `背景语义守门器已修正 ${semanticRepairs.length} 个标签实体化名称：${semanticRepairs.map(item => `${item.from}→${item.to}`).join('、')}`,
      '背景语义守门器',
      57
    );
  }
  let validation = validateNarrativeBlueprint(blueprint, semanticProfile);
  for (let round = 0; round < 2 && !validation.passed; round += 1) {
    blueprint = await repairNarrativeBlueprint(context, blueprint, validation, onStatus);
    repairBackgroundTagEntityNames(blueprint, semanticProfile);
    validation = validateNarrativeBlueprint(blueprint, semanticProfile);
  }
  if (!validation.passed) {
    throw new Error(`叙事蓝图结构校验未通过：${validation.issues.slice(0, 8).join('；')}`);
  }
  onStatus(`叙事蓝图校验通过：${blueprint.eventCards.length} 张事件卡，${blueprint.promiseLedger.length} 条伏笔台账。`, '因果校验 Agent', 62);
  return blueprint;
}

async function compileBlueprintToOutline(name, background, synopsis, task, blueprint, novelId, onStatus = () => {}) {
  const semanticProfile = parseBackgroundSemantics(background);
  const semanticPrompt = formatBackgroundSemanticsForPrompt(semanticProfile);
  onStatus('编译 Agent 正在把事件卡、伏笔台账和状态台账编译成用户可审核总纲...', '编译 Agent', 70);
  const compiled = await callJsonAgentWithRepair(
    `你是长篇小说大纲编译 Agent。只返回 JSON：
{
  "analysisSummary": "100字以内作品定位总结",
  "firstChapterTitle": "第一章标题，不含章节序号",
  "openingGuide": "第一章开篇写作提示，120-250字",
  "masterOutline": {
    "beginning": "300-700字，包含七个指定结构段",
    "development": "500-1200字，包含七个指定结构段",
    "climax": "400-900字，包含七个指定结构段",
    "ending": "300-700字，包含七个指定结构段"
  },
  "assets": [
    {"group":"world-setting","type":"location","name":"名称","desc":"具体设定"},
    {"group":"world-setting","type":"faction","name":"名称","desc":"具体设定"},
    {"group":"world-setting","type":"system","name":"名称","desc":"具体设定"},
    {"group":"character-growth","type":"main-character","name":"名称","desc":"具体设定"},
    {"group":"character-growth","type":"supporting-character","name":"名称","desc":"具体设定"},
    {"group":"themes-core","type":"core-power","name":"名称","desc":"具体设定"},
    {"group":"themes-core","type":"secret-clue","name":"名称","desc":"具体设定"},
    {"group":"plot-framework","type":"main-outline","name":"名称","desc":"具体设定"},
    {"group":"plot-framework","type":"pace-hooks","name":"名称","desc":"具体设定"},
    {"group":"plot-framework","type":"planting","name":"名称","desc":"具体设定"},
    {"group":"plot-framework","type":"payoff","name":"名称","desc":"具体设定"}
  ]
}

要求：
1. 总纲必须由事件卡因果链编译，不得新造与叙事内核冲突的大事件。
2. beginning/development/climax/ending 只是数据字段，不得写成流水线式阶段摘要。每个字段内部必须依次使用【人物驱动】【群像推进】【悬疑问题】【因果升级】【关键反转】【爽点兑现】【阶段代价】，写清人物欲望、主动选择、他人独立行动、信息差、因果后果与代价。
3. “系统流”不等于程序世界。系统只能以修仙世界内部机制出现，禁止 BUG、代码、程序、格式化、补丁、逻辑解析、降维、集体潜意识、思维牢笼、天道剧本等表达。
4. ${getNovelStyleConstraint({ background })}
5. ${semanticPrompt}
6. 非实体标签只能控制创作方法，不能直接出现在人物、势力、地点、法宝、功法、境界、系统等实体名称中。`,
    `小说名称：${name}
背景设定：${background}
作品简介：${synopsis || '未提供'}
用户任务：${task}
结构化叙事蓝图：${JSON.stringify(blueprint)}`,
    onStatus,
    '编译 Agent'
  );
  const result = {
    summary: String(compiled.analysisSummary || '').trim(),
    firstChapterTitle: String(compiled.firstChapterTitle || '故事开端').trim(),
    openingGuide: String(compiled.openingGuide || '请根据叙事蓝图开始创作第一章。').trim(),
    masterOutline: {
      beginning: String(compiled.masterOutline?.beginning || '').trim(),
      development: String(compiled.masterOutline?.development || '').trim(),
      climax: String(compiled.masterOutline?.climax || '').trim(),
      ending: String(compiled.masterOutline?.ending || '').trim()
    },
    assets: normalizeGeneratedAssets(compiled, novelId),
    narrativeKernel: blueprint.narrativeKernel,
    worldPressure: blueprint.worldPressure,
    factionPlans: blueprint.factionPlans,
    eventCards: blueprint.eventCards,
    promiseLedger: blueprint.promiseLedger,
    stateLedger: blueprint.stateLedger
  };
  const semanticRepairs = repairBackgroundTagEntityNames(result, semanticProfile);
  if (semanticRepairs.length) {
    onStatus(
      `背景语义守门器已修正 ${semanticRepairs.length} 个标签实体化名称：${semanticRepairs.map(item => `${item.from}→${item.to}`).join('、')}`,
      '背景语义守门器',
      78
    );
  }
  const missingOutlineStages = Object.entries(result.masterOutline)
    .filter(([, value]) => !value)
    .map(([key]) => ({ beginning: '开始', development: '发展', climax: '高潮', ending: '结局' })[key]);
  if (missingOutlineStages.length) {
    throw new Error(`蓝图编译后的总纲不完整，缺少：${missingOutlineStages.join('、')}。`);
  }
  result.assets = [
    ...blueprintToAssets(blueprint, novelId),
    ...result.assets
  ];
  syncMasterOutlineAsset(result, novelId);
  return result;
}

async function createNarrativeCompiledOutline(name, background, synopsis, task, existingAssets, novelId, runtime, onStatus = () => {}) {
  const blueprint = await generateNarrativeBlueprint(name, background, synopsis, task, runtime, onStatus);
  const result = await compileBlueprintToOutline(name, background, synopsis, task, blueprint, novelId, onStatus);
  return result;
}

async function runNovelAgents(name, background, synopsis, task, existingAssets = [], runtime = null) {
  const activeNovel = getActiveNovel();
  const runtimeNovel = {
    ...(activeNovel || {}),
    name,
    background,
    synopsis,
    assets: existingAssets.length ? existingAssets : (activeNovel?.assets || [])
  };
  const agentRuntime = runtime || await new AgentRuntime(task, runtimeNovel, () => {}).prepare(['novel-outline']);

  const agents = [
    {
      name: '世界观 Agent',
      prompt: '你负责地理空间、势力组织、力量体系与世界规则。识别冲突舞台、阵营关系、能力限制和可持续扩展点。'
    },
    {
      name: '角色 Agent',
      prompt: '你负责主角动机、缺陷、成长路径、配角关系网、镜像反派与情感羁绊。重点检查人物行为因果。'
    },
    {
      name: '剧情 Agent',
      prompt: '你负责完整全书总纲、长篇主线、阶段目标、节奏钩子、危机升级、伏笔 planting 与 payoff 对应关系。总纲必须明确写出开始、发展、高潮、结局，禁止只写前期。'
    },
    {
      name: '市场定位 Agent',
      prompt: '你负责男频/女频定位、题材卖点、读者情绪价值、核心爽点及简介承诺是否一致。'
    }
  ];

  const results = [];
  const batchSize = String(state.apiModel || '').toLowerCase().startsWith('agnes-') ? 1 : 2;
  // Limit concurrency to avoid provider rate limits while retaining parallel agent work.
  for (let index = 0; index < agents.length; index += batchSize) {
    const batch = agents.slice(index, index + batchSize);
    const batchResults = await Promise.all(batch.map(async agent => {
      try {
        const workerContext = agentRuntime.getWorkerContext(agent.name, agent.prompt);
        const rawMemo = await callConfiguredAI(
          `你是多 Agent 小说策划系统中的${agent.name}。${agent.prompt}
你是被总控 Agent 派生出的隔离 worker。只提交专业分析备忘录，不负责最终 JSON。禁止空泛评价，必须列出可进入设定库的具体结论，控制在 1200 字以内。`,
          `${workerContext}
必须遵循用户明确的男频/女频定位、题材、CP、已审核总纲、背景简介和左侧设定。输出简体中文，内容具体可执行，不得建立与现有世界观冲突的新规则。`
        );
        return agentRuntime.summarizeWorkerResult(agent.name, rawMemo);
      } catch (error) {
        throw new Error(`${agent.name}调用失败：${error.message}`);
      }
    }));
    results.push(...batchResults);
  }
  return results;
}

async function integrateAgentResults(name, background, synopsis, task, agentResults, novelId) {
  const systemPrompt = `你是多 Agent 小说策划系统的总编 Agent。你要审核、去重并整合四位专业 Agent 的结果，生成可直接写入应用左侧设定库的数据。

${getAssetJsonContract()}

要求：
1. assets 必须覆盖上述 11 种 type，每种至少 1 项；重要类别可有 2-4 项。
2. 严格遵循用户明确的男频/女频定位、题材、CP 与人物关系，不得擅自改成相反受众。
3. 简介为空时，基于背景关键词合理补全，但不得声称用户已提供具体剧情。
4. desc 要具体、可执行，包含人物动机、冲突、限制或后续用途，禁止使用“待补充”等占位语。
5. main-outline 应给出适合长篇连载的阶段性因果主线；planting 与 payoff 必须能够对应。
6. masterOutline 必须完整包含 beginning、development、climax、ending，但四个字段只是数据容器，严禁写成“开始发生A、发展发生B”的流水账。
7. 每个阶段内部必须依次包含【人物驱动】【群像推进】【悬疑问题】【因果升级】【关键反转】【爽点兑现】【阶段代价】，每段都要写清至少两名人物基于各自欲望和利益采取行动后如何碰撞。
8. 默认采用群像结构：配角和对手必须拥有独立目标、利益和行动线，不得只是围绕主角提供线索或被动反应。
9. 总纲必须从开篇触发事件推演到最终结局，明确核心矛盾升级、高潮爆发、主要伏笔回收，并符合番茄网文的快进入、强冲突、持续钩子、阶段兑现节奏。
10. 若专业 Agent 意见冲突，以用户任务和原始背景设定为最高优先级。`;

  const userPrompt = `小说名称：${name}
背景设定（必填）：${background}
作品简介（可能为空）：${synopsis || '未提供'}
用户任务：${task}

四位 Agent 的分析备忘录：
${agentResults.map((result, index) => `【Agent ${index + 1}】
${String(result).slice(0, 7000)}`).join('\n\n')}

请完成交叉审校并输出最终设定库。`;
  let result;
  try {
    result = await callJsonAgentWithRepair(systemPrompt, userPrompt, () => {}, '总编 Agent');
  } catch (error) {
    throw new Error(`总编 Agent 调用失败：${error.message}`);
  }
  const masterOutline = {
    beginning: String(result.masterOutline?.beginning || '').trim(),
    development: String(result.masterOutline?.development || '').trim(),
    climax: String(result.masterOutline?.climax || '').trim(),
    ending: String(result.masterOutline?.ending || '').trim()
  };
  const missingOutlineStages = Object.entries(masterOutline)
    .filter(([, value]) => !value)
    .map(([key]) => ({ beginning: '开始', development: '发展', climax: '高潮', ending: '结局' })[key]);
  if (missingOutlineStages.length) {
    throw new Error(`总纲不完整，缺少：${missingOutlineStages.join('、')}。`);
  }
  const assets = normalizeGeneratedAssets(result, novelId);
  const outlineDescription = `## 开始
${masterOutline.beginning}

## 发展
${masterOutline.development}

## 高潮
${masterOutline.climax}

## 结局
${masterOutline.ending}`;
  const existingOutlineIndex = assets.findIndex(asset => asset.type === 'main-outline');
  const masterOutlineAsset = {
    id: `master-outline-${novelId}-${Date.now()}`,
    group: 'plot-framework',
    type: 'main-outline',
    name: '全书总纲（开始-发展-高潮-结局）',
    desc: outlineDescription
  };
  if (existingOutlineIndex >= 0) {
    assets.splice(existingOutlineIndex, 0, masterOutlineAsset);
  } else {
    assets.push(masterOutlineAsset);
  }
  return {
    summary: String(result.analysisSummary || '').trim(),
    firstChapterTitle: String(result.firstChapterTitle || '故事开端').trim(),
    openingGuide: String(result.openingGuide || '请根据左侧设定库开始创作第一章。').trim(),
    masterOutline,
    assets
  };
}

function syncMasterOutlineAsset(result, novelId) {
  const outlineDescription = `## 开始
${result.masterOutline.beginning}

## 发展
${result.masterOutline.development}

## 高潮
${result.masterOutline.climax}

## 结局
${result.masterOutline.ending}`;
  const assets = Array.isArray(result.assets) ? result.assets : [];
  const masterOutlineAsset = assets.find(asset =>
    asset.type === 'main-outline' && String(asset.name || '').includes('全书总纲')
  );
  if (masterOutlineAsset) {
    masterOutlineAsset.desc = outlineDescription;
  } else {
    assets.unshift({
      id: `master-outline-${novelId}-${Date.now()}`,
      group: 'plot-framework',
      type: 'main-outline',
      name: '全书总纲（开始-发展-高潮-结局）',
      desc: outlineDescription
    });
    result.assets = assets;
  }
}

function applyNarrativeBlueprintResult(novel, result) {
  novel.analysisSummary = result.summary;
  novel.masterOutline = result.masterOutline;
  novel.narrativeKernel = result.narrativeKernel || null;
  novel.worldPressure = result.worldPressure || null;
  novel.factionPlans = Array.isArray(result.factionPlans) ? result.factionPlans : [];
  novel.eventCards = Array.isArray(result.eventCards) ? result.eventCards : [];
  novel.promiseLedger = Array.isArray(result.promiseLedger) ? result.promiseLedger : [];
  novel.stateLedger = Array.isArray(result.stateLedger) ? result.stateLedger : [];
  novel.outlineAudit = result.outlineAudit || null;
  novel.storyConstitution = result.storyConstitution || deriveStoryConstitution(
    novel.background,
    novel.synopsis,
    novel.narrativeKernel
  );
  novel.consistencyStatus = {
    needsReaudit: false,
    reason: '总纲已按当前作品宪法重新生成并通过审核',
    updatedAt: new Date().toISOString()
  };
  upsertStoryConstitutionAsset(novel);
}

function extendCategoryOrderForNarrativeCompiler(novel) {
  if (!novel.categoryOrder) novel.categoryOrder = cloneDefault(DEFAULT_CATEGORY_ORDER);
  Object.entries(DEFAULT_CATEGORY_ORDER).forEach(([group, types]) => {
    if (!novel.categoryOrder[group]) novel.categoryOrder[group] = [];
    types.forEach(type => {
      if (!novel.categoryOrder[group].includes(type)) {
        novel.categoryOrder[group].push(type);
      }
    });
  });
}

async function auditMasterOutlineQuality(context, result, onStatus = () => {}, styleConstraint = '', constitution = null) {
  onStatus('总纲审核 Agent 正在评估剧情逻辑、创意、悬疑反转和情绪曲线...', '总纲审核 Agent', 82);
  const audit = await callJsonAgentWithRepair(
    `你是长篇小说总纲审核 Agent。只返回 JSON，不要代码围栏：
{
  "passed": true,
  "score": 0,
  "summary": "审核结论",
  "issues": [{
    "severity": "critical|high|medium|low",
    "category": "剧情逻辑|人物动机|背景偏离|创意不足|深度不足|悬疑反转|开篇吸引力|高潮情绪|结尾惊喜|套路化|伏笔回收",
    "problem": "具体问题",
    "repair": "具体修复方案"
  }],
  "strengths": ["优势"]
}

审核标准：
1. 总纲必须符合背景设定和简介承诺，不得改主角、题材、受众、CP 和核心前史。
2. 开篇必须有强钩子、明确欲望、触发事件和继续阅读理由。
3. 发展必须有因果升级、人物主动选择、关系变化和阶段性反转。
4. 高潮必须能带动整体情绪，不能只堆战力或机械揭露。
5. 结尾必须意料之外、情理之中，回收主要伏笔并形成主题落点。
6. 检查是否过于老套、缺少创意、缺少深度、缺少悬疑或反转。
7. critical/high 问题存在时 passed 必须为 false；score 低于 85 时 passed 必须为 false。
8. 把题材词“系统”与软件工程隐喻严格区分。系统流可以存在，但 BUG、代码、程序、格式化、补丁、逻辑解析、降维、集体潜意识、思维牢笼、天道剧本等现代/元叙事表达必须判为背景偏离。
9. ${styleConstraint}
10. 作品宪法是最高事实源。逐项核对受众、世界类型、题材标签、感情模式、简介主角、核心前史、关键关系和故事承诺；不得用“反转”名义否定明确事实。
11. 根据作品宪法中的 semanticProfile 审核标签是否真正执行：“反套路”必须是有铺垫的预期偏转，“智商在线”必须体现为基于信息和利益的合理决策，“爽文”必须形成行动与兑现闭环。
12. 受众、情绪、读者承诺、叙事策略和质量约束不是世界内实体；发现“反套路天鉴”“爽文神功”“热血宗”等名称必须判为 critical 背景偏离。
13. beginning/development/climax/ending 不是流水线标签。四段内部都必须完整包含【人物驱动】【群像推进】【悬疑问题】【因果升级】【关键反转】【爽点兑现】【阶段代价】。
14. 群像不是“多人出现”，而是至少三位人物拥有独立欲望、利益、行动线和选择后果，并在关键节点因果交汇。
15. 爽点必须是人物承压后主动行动获得的阶段兑现；反转必须重释已有事实，不能凭空追加设定。
作品宪法：${JSON.stringify(constitution || {})}`,
    `${context}
待审核结果：${JSON.stringify({
      summary: result.summary,
      firstChapterTitle: result.firstChapterTitle,
      openingGuide: result.openingGuide,
      masterOutline: result.masterOutline,
      narrativeKernel: result.narrativeKernel,
      eventCards: (result.eventCards || []).map(event => ({
        id: event.id,
        stage: event.stage,
        title: event.title,
        trigger: event.trigger,
        protagonistAction: event.protagonistAction,
        oppositionActor: event.oppositionActor,
        conflict: event.conflict,
        cost: event.cost,
        gain: event.gain,
        stateDelta: event.stateDelta,
        plantedPromises: event.plantedPromises,
        paidPromises: event.paidPromises
      })),
      promiseLedger: result.promiseLedger,
      stateLedger: result.stateLedger,
      assets: (result.assets || []).map(asset => ({
        type: asset.type,
        name: asset.name,
        desc: String(asset.desc || '').slice(0, 800)
      }))
    })}`,
    onStatus,
    '总纲审核 Agent'
  );
  const issues = Array.isArray(audit.issues) ? audit.issues.map(issue => ({
    ...issue,
    severity: String(issue.severity || 'medium').toLowerCase()
  })) : [];
  const score = Math.max(0, Math.min(100, Number(audit.score) || 0));
  const constitutionIssues = getConstitutionConsistencyIssues(result, constitution).map(problem => ({
    severity: 'critical',
    category: '背景偏离',
    problem,
    repair: '恢复作品宪法中的明确事实，只改动冲突字段，不得重写用户背景和简介。'
  }));
  const outlineDepthIssues = validateMasterOutlineDepth(result.masterOutline).map(problem => ({
    severity: 'high',
    category: '深度不足',
    problem,
    repair: '按指定七段结构重写对应阶段，补足人物主动选择、群像碰撞、悬疑、反转、爽点和代价。'
  }));
  issues.push(...constitutionIssues, ...outlineDepthIssues);
  const severe = issues.some(issue => ['critical', 'high'].includes(issue.severity));
  return {
    passed: Boolean(audit.passed) && score >= 85 && !severe &&
      constitutionIssues.length === 0 && outlineDepthIssues.length === 0,
    score: Math.max(0, score - constitutionIssues.length * 20 - outlineDepthIssues.length * 5),
    summary: String(audit.summary || '').trim(),
    issues,
    strengths: Array.isArray(audit.strengths) ? audit.strengths.map(String) : []
  };
}

async function repairMasterOutlineQuality(context, result, audit, novelId, onStatus = () => {}, styleConstraint = '', constitution = null) {
  onStatus(`总纲未达标（${audit.score} 分），总纲修稿 Agent 正在重写薄弱段落...`, '总纲修稿 Agent', 88);
  const repaired = await callJsonAgentWithRepair(
    `你是长篇小说总纲修稿 Agent。只返回 JSON，不要代码围栏：
{
  "summary": "修订后的作品定位总结",
  "firstChapterTitle": "第一章标题",
  "openingGuide": "第一章开篇写作提示",
  "masterOutline": {
    "beginning": "修订后的开始",
    "development": "修订后的发展",
    "climax": "修订后的高潮",
    "ending": "修订后的结局"
  }
}

要求：
1. 不得为了过审硬凑分数；必须真实修复审核指出的逻辑、创意、深度、悬疑、开篇、高潮和结尾问题。
2. 不得改变背景设定、简介承诺、受众、题材、CP、主角核心前史。
3. 保持四个字段完整，但严禁流水账。每个字段必须依次包含【人物驱动】【群像推进】【悬疑问题】【因果升级】【关键反转】【爽点兑现】【阶段代价】。
4. “系统”必须是修仙世界内的金手指机制，不得使用 BUG、代码、程序、格式化、补丁、逻辑解析、降维、集体潜意识、思维牢笼、天道剧本等现代或故事外隐喻。
5. ${styleConstraint}
6. 所有修改必须逐项服从作品宪法。简介明确的主角、前史、关系、势力、核心目标和感情模式不可替换。
7. semanticProfile 中的非实体标签只能转化为创作规则，不得拼入任何故事实体名称；“反套路”要通过预期、铺垫、人物选择、因果后果四步落实。
8. 默认群像：每个阶段至少写出两条非主角人物线的独立目标和行动，并说明它们如何与主线发生因果碰撞。
9. 按番茄网文节奏强化快速入局、持续冲突、阶段兑现和结尾钩子，但不得用无代价打脸或机械反转代替逻辑。
作品宪法：${JSON.stringify(constitution || {})}`,
    `${context}
审核问题：${JSON.stringify(audit.issues)}
当前结果：${JSON.stringify({
      summary: result.summary,
      firstChapterTitle: result.firstChapterTitle,
      openingGuide: result.openingGuide,
      masterOutline: result.masterOutline
    })}`,
    onStatus,
    '总纲修稿 Agent'
  );
  const repairedOutline = {
    beginning: String(repaired.masterOutline?.beginning || result.masterOutline.beginning || '').trim(),
    development: String(repaired.masterOutline?.development || result.masterOutline.development || '').trim(),
    climax: String(repaired.masterOutline?.climax || result.masterOutline.climax || '').trim(),
    ending: String(repaired.masterOutline?.ending || result.masterOutline.ending || '').trim()
  };
  if (Object.values(repairedOutline).some(value => !value)) {
    throw new Error('总纲修稿 Agent 未返回完整的开始、发展、高潮、结局。');
  }
  result.summary = String(repaired.summary || result.summary || '').trim();
  result.firstChapterTitle = String(repaired.firstChapterTitle || result.firstChapterTitle || '故事开端').trim();
  result.openingGuide = String(repaired.openingGuide || result.openingGuide || '请根据左侧设定库开始创作第一章。').trim();
  result.masterOutline = repairedOutline;
  syncMasterOutlineAsset(result, novelId);
  return result;
}

async function superviseMasterOutlineQuality(name, background, synopsis, task, result, novelId, onStatus = () => {}) {
  const styleConstraint = getNovelStyleConstraint({ background });
  const constitution = deriveStoryConstitution(background, synopsis, result.narrativeKernel);
  const context = `小说名称：${name}
背景设定：${background || '未提供'}
作品简介：${synopsis || '未提供'}
用户任务：${task}
背景风格硬约束：${styleConstraint}`;
  const initialStyleRepair = enforceOutlineResultStyle(result, background);
  if (initialStyleRepair.changes.length) {
    onStatus(
      `程序世界观守门器已修正 ${initialStyleRepair.changes.length} 处现代/元叙事越界表达，正在交给审核 Agent 复核语义。`,
      '世界观守门器',
      80
    );
    syncMasterOutlineAsset(result, novelId);
  }
  const semanticRepairs = repairBackgroundTagEntityNames(result, constitution.semanticProfile);
  if (semanticRepairs.length) {
    onStatus(
      `背景语义守门器已修正 ${semanticRepairs.length} 个标签实体化名称：${semanticRepairs.map(item => `${item.from}→${item.to}`).join('、')}`,
      '背景语义守门器',
      81
    );
    syncMasterOutlineAsset(result, novelId);
  }
  let audit = await auditMasterOutlineQuality(context, result, onStatus, styleConstraint, constitution);
  for (let round = 0; round < 3 && !audit.passed; round += 1) {
    result = await repairMasterOutlineQuality(context, result, audit, novelId, onStatus, styleConstraint, constitution);
    enforceOutlineResultStyle(result, background);
    repairBackgroundTagEntityNames(result, constitution.semanticProfile);
    syncMasterOutlineAsset(result, novelId);
    audit = await auditMasterOutlineQuality(context, result, onStatus, styleConstraint, constitution);
  }
  const remainingStyleViolations = findPremodernStyleViolations(result);
  if (remainingStyleViolations.length) {
    throw new Error(`总纲仍包含不符合${getNovelStylePolicy({ background }).era}世界观的表达：${remainingStyleViolations.slice(0, 8).join('、')}。`);
  }
  const remainingOutlineDepthIssues = validateMasterOutlineDepth(result.masterOutline);
  if (remainingOutlineDepthIssues.length) {
    throw new Error(`总纲仍是流水线式阶段摘要：${remainingOutlineDepthIssues.slice(0, 8).join('；')}`);
  }
  result.outlineAudit = audit;
  result.storyConstitution = deriveStoryConstitution(background, synopsis, result.narrativeKernel);
  const auditSummary = `总纲审核：${audit.score} 分。${audit.summary || ''}`;
  result.summary = result.summary
    ? `${result.summary}\n${auditSummary}`
    : auditSummary;
  if (!audit.passed) {
    const issueSummary = audit.issues
      .filter(issue => ['critical', 'high'].includes(issue.severity))
      .slice(0, 3)
      .map(issue => `${issue.category}：${issue.problem}`)
      .join('；');
    throw new Error(`总纲审核自动修复后仍未通过（${audit.score}分）：${issueSummary || audit.summary || '仍存在结构问题'}。`);
  }
  activeAgentRuntime?.addQualityGate(
    'master-outline-quality',
    true,
    `score=${audit.score}; critical/high=0; styleViolations=0; depthIssues=0`
  );
  onStatus(`总纲审核通过：${audit.score} 分，准备提交用户审核。`, '总控 Agent', 95);
  return result;
}

async function analyzeNovelSetup(name, background, synopsis, novelId, sourceBookText = '', task = '创建完整的新书初始化设定库', onStatus = () => {}) {
  let referenceNovelAnalysis = null;
  if (sourceBookText) {
    try {
      referenceNovelAnalysis = JSON.parse(sourceBookText);
    } catch (e) {
      referenceNovelAnalysis = { transferableTechniques: [compactString(sourceBookText, 5000)] };
    }
  }
  const runtimeNovel = { id: novelId, name, background, synopsis, referenceNovelAnalysis, assets: [] };
  const runtime = await new AgentRuntime(task, runtimeNovel, onStatus).prepare(['narrative-compiler', 'novel-outline']);
  const result = await createNarrativeCompiledOutline(name, background, synopsis, task, [], novelId, runtime, onStatus);
  return superviseMasterOutlineQuality(name, background, synopsis, task, result, novelId, onStatus);
}

async function executeAgentTask(task, onStatus = () => {}, stateManager = null) {
  const activeNovel = getActiveNovel();
  if (!activeNovel) throw new Error('当前没有可处理的小说。');
  const runtime = await new AgentRuntime(task, activeNovel, onStatus).prepare(['narrative-compiler', 'novel-outline']);

  if (stateManager) stateManager.updateNodeState('analysis', 'active');
  onStatus('叙事编译器正在生成 Kernel、势力计划、事件卡、伏笔台账和状态台账...', '总控 Agent', 15);
  let result = await createNarrativeCompiledOutline(
    activeNovel.name,
    activeNovel.background || '',
    activeNovel.synopsis || '',
    task,
    activeNovel.assets || [],
    activeNovel.id,
    runtime,
    onStatus
  );

  if (stateManager) {
    stateManager.updateNodeState('analysis', 'completed');
    stateManager.updateNodeState('integration', 'active');
  }
  onStatus('编译结果已完成，准备进入总纲质量审核...', '总编 Agent', 78);
  if (stateManager) {
    stateManager.updateNodeState('integration', 'completed');
    stateManager.updateNodeState('audit', 'active');
  }
  result = await superviseMasterOutlineQuality(
    activeNovel.name,
    activeNovel.background || '',
    activeNovel.synopsis || '',
    task,
    result,
    activeNovel.id,
    onStatus
  );

  if (stateManager) {
    stateManager.updateNodeState('audit', 'completed');
    stateManager.updateNodeState('review', 'active');
  }
  onStatus('总纲已通过 AI 审核，准备提交用户审核。', '系统', 100);

  return result;
}

function isCharacterBuildingTask(task) {
  return /(构建|创建|生成|设计|完善).{0,6}(人物|角色)|(人物|角色).{0,6}(体系|关系网|拓扑|档案)/.test(task);
}

function isPlotDesignTask(task) {
  const text = String(task || '').trim();
  const explicitPlotTask = /(设计|构建|生成|规划|编排|细化).{0,8}(剧情|章纲|章节细纲|细纲)|(剧情|章纲|章节细纲|细纲).{0,8}(设计|构建|生成|规划|编排)|群像多线叙事|三幕.{0,4}线/.test(text);
  const shortChapterTask = /(设计|构建|生成|规划|编排|细化)\s*\d{2,4}\s*(?:章|章节)(?:\s*(?:剧情|章纲|细纲|大纲))?$/.test(text);
  const countFirstTask = /^\s*\d{2,4}\s*(?:章|章节)\s*(?:剧情|章纲|细纲|大纲)?\s*$/.test(text);
  return explicitPlotTask || shortChapterTask || countFirstTask;
}

function isFinalNovelAuditTask(task) {
  return /(全书终审|综合审核|最终审核|全面审核|最终整合|全书优化|综合修改)/.test(String(task || ''));
}

function resolveCharacterReference(value, characterNames) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (characterNames.has(raw)) return raw;
  const withoutAnnotation = raw
    .replace(/\s*[（(][^）)]*[）)]\s*$/u, '')
    .replace(/\s*[-—:：]\s*(觉醒者|正式盟友|盟友|动摇者|斥候|状态|身份)\s*$/u, '')
    .trim();
  if (characterNames.has(withoutAnnotation)) return withoutAnnotation;
  return [...characterNames].find(name =>
    raw.startsWith(`${name}（`) ||
    raw.startsWith(`${name}(`) ||
    raw.startsWith(`${name}：`) ||
    raw.startsWith(`${name}-`)
  ) || '';
}

function normalizeChapterCharacterReferences(novel) {
  const characterNames = new Set((novel.characterBible || []).map(character => character.name));
  let normalizedCount = 0;
  (novel.plotBlueprint?.chapters || []).forEach(chapter => {
    const viewpoint = resolveCharacterReference(chapter.viewpoint, characterNames);
    if (viewpoint && viewpoint !== chapter.viewpoint) {
      chapter.viewpoint = viewpoint;
      normalizedCount += 1;
    }
    chapter.participants = (chapter.participants || []).map(name => {
      const resolved = resolveCharacterReference(name, characterNames);
      if (resolved && resolved !== name) normalizedCount += 1;
      return resolved || name;
    });
    chapter.newElements = (chapter.newElements || []).map(element => {
      if (element.type !== '人物') return element;
      const resolved = resolveCharacterReference(element.name, characterNames);
      if (!resolved) return element;
      normalizedCount += 1;
      return {
        ...element,
        type: '人物状态',
        name: resolved,
        purpose: element.purpose || `记录${resolved}在本章发生的身份、立场或关系变化`
      };
    });
  });
  return normalizedCount;
}

const PREMODERN_STYLE_REPLACEMENTS = [
  [/逻辑解析系统/gi, '天机推演系统'],
  [/逻辑解析/gi, '天机推演'],
  [/重大\s*(?:BUG|Bug|bug)/g, '重大天道漏洞'],
  [/\bBUG\b/gi, '天道漏洞'],
  [/系统漏洞/g, '天道漏洞'],
  [/底层代码/g, '天地根本法则'],
  [/世界代码/g, '天地法则'],
  [/错误代码/g, '失序法则'],
  [/代码/g, '法则纹路'],
  [/格式化/g, '涤清重塑'],
  [/活体补丁/g, '镇界之人'],
  [/补丁/g, '补天之法'],
  [/天道剧本/g, '天道定数'],
  [/命运剧本/g, '命数定轨'],
  [/集体潜意识(?:的)?固化/g, '众生执念的凝结'],
  [/集体潜意识/g, '众生共同执念'],
  [/潜意识/g, '心念深处'],
  [/思维牢笼/g, '道心桎梏'],
  [/思维禁锢/g, '心神禁锢'],
  [/认知牢笼/g, '见知桎梏'],
  [/\bdebug(?:ger)?\b/gi, '查验法则'],
  [/调试程序/g, '校验法则'],
  [/数据库/g, '典籍库'],
  [/算法/g, '推演之法'],
  [/软件/g, '术法载体'],
  [/硬件/g, '法器根基'],
  [/操作系统/g, '天道运转法则'],
  [/源码/g, '本源法纹'],
  [/源代码/g, '本源法纹'],
  [/编译/g, '推演成形'],
  [/模块/g, '法门'],
  [/服务器/g, '阵法中枢'],
  [/内存/g, '神识承载'],
  [/底层逻辑/g, '根本法理'],
  [/世界逻辑/g, '天地法理'],
  [/现实逻辑/g, '现世法理'],
  [/降维打击/g, '境界碾压'],
  [/降维/g, '削境'],
  [/赛博朋克/gi, '机关与符阵'],
  [/科幻/g, '奇术'],
  [/星际/g, '诸域'],
  [/\bAI\b/gi, '器灵'],
  [/人工智能/g, '器灵'],
  [/程序/g, '章法'],
  [/物理宇宙/g, '天地'],
  [/数据流/g, '灵息脉络'],
  [/锚点/g, '落脚处'],
  [/外星人/g, '天外异族'],
  [/银河系/g, '天河诸界'],
  [/宇宙/g, '天地'],
  [/时间旅行/g, '逆转光阴'],
  [/平行世界/g, '异世'],
  [/维度/g, '层次'],
  [/位面/g, '界域'],
  [/量子/g, '微尘'],
  [/直播/g, '当众传讯'],
  [/奇点/g, '异变源头'],
  [/元宇宙/g, '幻境'],
  [/虚拟现实/g, '幻境映照'],
  [/数字生命/g, '器灵生魂'],
  [/作者维度/g, '世事全局'],
  [/作者/g, '记述者'],
  [/读者/g, '世人'],
  [/写作/g, '记述'],
  [/剧情安排/g, '事态演变']
];

function getNovelStylePolicy(novel) {
  const background = String(novel.background || '');
  const premodern = /(架空古代|古代言情|历史架空|仙侠|修仙|武侠|东方玄幻)/.test(background) &&
    !/(现代|都市|末世|星际|科幻|赛博朋克)/.test(background);
  return {
    era: premodern ? '架空古代/前现代' : '按背景设定',
    premodern,
    forbiddenTerms: premodern
      ? PREMODERN_STYLE_REPLACEMENTS.map(([pattern]) => pattern.source.replace(/\\b/g, ''))
      : []
  };
}

function getNovelStyleConstraint(novel) {
  const policy = getNovelStylePolicy(novel || {});
  if (!policy.premodern) {
    return '严格继承背景设定中的时代、社会、技术和世界规则；不得混入其他题材体系，不得出现作者、读者、写作、剧情安排等故事外表达。';
  }
  return `本书属于${policy.era}。人物认知、称谓、制度、器物、交通、通讯、战争和力量体系必须符合该时代与既定世界观。背景中的“系统”是允许存在的修仙金手指，但必须表现为天道赐福、器灵、面板、神通或因果奖惩，不得写成软件、计算机或程序世界。严格禁止出现赛博朋克、科幻、星际、AI、人工智能、程序、BUG、代码、格式化、补丁、逻辑解析、底层逻辑、降维、物理宇宙、数据流、锚点、外星人、银河系、宇宙、时间旅行、平行世界、维度、位面、量子、直播、奇点、元宇宙、虚拟现实、数字生命、集体潜意识、思维牢笼、天道剧本，以及作者、读者、写作、剧情安排等故事外概念。允许使用修仙语境中的因果、天道、命数、道心、神魂，但必须用世界内语言解释。`;
}

function replaceStoryStyleTerms(value, replacements, path = '', changes = []) {
  if (typeof value === 'string') {
    let next = value;
    replacements.forEach(([pattern, replacement]) => {
      const before = next;
      next = next.replace(pattern, replacement);
      if (next !== before) changes.push({ path, from: pattern.source, to: replacement });
    });
    return next;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => replaceStoryStyleTerms(item, replacements, `${path}[${index}]`, changes));
  }
  if (value && typeof value === 'object') {
    Object.keys(value).forEach(key => {
      value[key] = replaceStoryStyleTerms(value[key], replacements, path ? `${path}.${key}` : key, changes);
    });
  }
  return value;
}

function enforceNovelStylePolicy(novel) {
  const policy = getNovelStylePolicy(novel);
  if (!policy.premodern) return { policy, changes: [] };
  const changes = [];
  [
    'synopsis', 'masterOutline', 'analysisSummary', 'narrativeKernel',
    'worldPressure', 'factionPlans', 'eventCards', 'promiseLedger',
    'stateLedger', 'characterBible', 'characterRelations', 'plotBlueprint', 'assets',
    'finalOutline', 'outlineAudit', 'finalAudit'
  ].forEach(field => {
    novel[field] = replaceStoryStyleTerms(
      novel[field],
      PREMODERN_STYLE_REPLACEMENTS,
      field,
      changes
    );
  });
  return { policy, changes };
}

function repairNovelBackgroundTagEntities(novel) {
  const profile = ensureStoryConstitution(novel)?.semanticProfile ||
    parseBackgroundSemantics(novel?.background || '');
  const generatedStoryData = {
    narrativeKernel: novel?.narrativeKernel,
    worldPressure: novel?.worldPressure,
    factionPlans: novel?.factionPlans,
    eventCards: novel?.eventCards,
    promiseLedger: novel?.promiseLedger,
    stateLedger: novel?.stateLedger,
    masterOutline: novel?.masterOutline,
    characterBible: novel?.characterBible,
    characterRelations: novel?.characterRelations,
    plotBlueprint: novel?.plotBlueprint,
    assets: novel?.assets,
    finalOutline: novel?.finalOutline
  };
  return repairBackgroundTagEntityNames(generatedStoryData, profile);
}

function enforceOutlineResultStyle(result, background) {
  const policy = getNovelStylePolicy({ background });
  if (!policy.premodern) return { policy, changes: [] };
  const changes = [];
  replaceStoryStyleTerms(result, PREMODERN_STYLE_REPLACEMENTS, 'outlineResult', changes);
  return { policy, changes };
}

function findPremodernStyleViolations(value) {
  const text = JSON.stringify(value || {});
  return PREMODERN_STYLE_REPLACEMENTS
    .filter(([pattern]) => new RegExp(pattern.source, pattern.flags.replace('g', '')).test(text))
    .map(([pattern]) => pattern.source.replace(/\\b/g, ''));
}

function autoRepairOrphanCluePayoffs(novel) {
  const chapters = novel.plotBlueprint?.chapters || [];
  const seedChapterByClue = new Map();
  const repairs = [];
  chapters.forEach(chapter => {
    (chapter.plantedClues || []).forEach(clue => {
      if (clue && !seedChapterByClue.has(clue)) seedChapterByClue.set(clue, chapter.chapterNumber);
    });
    (chapter.paidClues || []).forEach(clue => {
      if (!clue) return;
      const existingSeed = seedChapterByClue.get(clue);
      if (existingSeed && existingSeed < chapter.chapterNumber) return;
      const seedNumber = Math.max(1, chapter.chapterNumber - Math.min(8, Math.max(2, Math.floor(chapter.chapterNumber * 0.08))));
      const seedChapter = chapters.find(item => item.chapterNumber === seedNumber);
      if (!seedChapter) return;
      seedChapter.plantedClues = [...new Set([...(seedChapter.plantedClues || []), clue])];
      const clueText = `“${clue}”首次以不完整迹象出现，只建立疑问，不提前揭示答案`;
      if (!String(seedChapter.knowledgeDelta || '').includes(clue)) {
        seedChapter.knowledgeDelta = [seedChapter.knowledgeDelta, clueText].filter(Boolean).join('；');
      }
      if (!String(seedChapter.endingHook || '').includes(clue)) {
        seedChapter.endingHook = [seedChapter.endingHook, `有关${clue}的细节尚未得到解释`].filter(Boolean).join('；');
      }
      seedChapterByClue.set(clue, seedNumber);
      repairs.push({ clue, seedChapter: seedNumber, payoffChapter: chapter.chapterNumber });
    });
  });
  return repairs;
}

function runStaticFinalNovelAudit(novel) {
  const characters = novel.characterBible || [];
  const relations = novel.characterRelations || [];
  const chapters = novel.plotBlueprint?.chapters || [];
  const characterNames = new Set(characters.map(character => character.name));
  const blockingIssues = [];
  const repairableIssues = [];
  const warnings = [];
  const unnamedPattern = /路人[甲乙丙丁]|某(?:人|弟子|长老|村民)|无名(?:氏|者)/;
  const requiredCharacterFields = [
    'name', 'identity', 'personality', 'lifeHistory', 'growthHistory', 'arc',
    'highlight', 'fate', 'desire', 'goal', 'interests', 'agency'
  ];
  const appearances = new Map(characters.map(character => [character.name, 0]));
  const clueSeeds = new Map();
  const cluePayoffs = new Map();
  const stylePolicy = getNovelStylePolicy(novel);
  const constitution = ensureStoryConstitution(novel);

  if (!novel.masterOutline) blockingIssues.push('缺少已审核全书总纲');
  if (characters.length < 3) blockingIssues.push('人物体系不存在或数量不足');
  if (!chapters.length) blockingIssues.push('章节细纲不存在');
  getConstitutionConsistencyIssues({
    narrativeKernel: novel.narrativeKernel,
    masterOutline: novel.masterOutline,
    characters,
    relations,
    chapters
  }, constitution).forEach(issue => {
    blockingIssues.push(`作品宪法冲突：${issue}`);
  });
  characters.forEach(character => {
    const missing = requiredCharacterFields.filter(field => !String(character[field] || '').trim());
    if (missing.length) repairableIssues.push(`人物“${character.name || '未命名'}”缺少字段：${missing.join('、')}`);
    if (!character.name || unnamedPattern.test(character.name)) blockingIssues.push(`存在非具名人物：${character.name || '空姓名'}`);
  });
  relations.forEach((relation, index) => {
    if (!characterNames.has(relation.source) || !characterNames.has(relation.target)) {
      blockingIssues.push(`关系${index + 1}引用未知人物：${relation.source} → ${relation.target}`);
    }
  });
  chapters.forEach((chapter, index) => {
    if (Number(chapter.chapterNumber) !== index + 1) {
      blockingIssues.push(`章节序号不连续：期望${index + 1}，实际${chapter.chapterNumber}`);
    }
    if (!characterNames.has(chapter.viewpoint)) {
      repairableIssues.push(`第${chapter.chapterNumber}章视角人物不存在：${chapter.viewpoint}`);
    }
    (chapter.participants || []).forEach(name => {
      if (!characterNames.has(name)) repairableIssues.push(`第${chapter.chapterNumber}章出现未知人物：${name}`);
      else appearances.set(name, (appearances.get(name) || 0) + 1);
    });
    (chapter.resourcesUsed || []).forEach(resource => {
      if (!resource.origin || !resource.cost) {
        repairableIssues.push(`第${chapter.chapterNumber}章道具/资源“${resource.name}”缺少来源或代价`);
      }
    });
    (chapter.newElements || []).forEach(element => {
      if (!element.origin || !element.purpose) {
        repairableIssues.push(`第${chapter.chapterNumber}章新增元素“${element.name}”缺少来源或用途`);
      }
      if (element.type === '人物' && !characterNames.has(element.name)) {
        repairableIssues.push(`第${chapter.chapterNumber}章疑似天降人物：${element.name}`);
      }
    });
    (chapter.plantedClues || []).forEach(clue => {
      if (!clueSeeds.has(clue)) clueSeeds.set(clue, chapter.chapterNumber);
    });
    (chapter.paidClues || []).forEach(clue => {
      const seedChapter = clueSeeds.get(clue);
      if (!seedChapter || seedChapter >= chapter.chapterNumber) {
        repairableIssues.push(`第${chapter.chapterNumber}章回收未提前埋设的伏笔：${clue}`);
      }
      cluePayoffs.set(clue, chapter.chapterNumber);
    });
    if (!chapter.characterGoal || !chapter.characterAction || !chapter.cost || !chapter.stateDelta) {
      repairableIssues.push(`第${chapter.chapterNumber}章缺少人物目标、主动行动、代价或状态变化`);
    }
  });
  if (stylePolicy.premodern) {
    const storyText = JSON.stringify({
      synopsis: novel.synopsis,
      masterOutline: novel.masterOutline,
      analysisSummary: novel.analysisSummary,
      narrativeKernel: novel.narrativeKernel,
      worldPressure: novel.worldPressure,
      factionPlans: novel.factionPlans,
      eventCards: novel.eventCards,
      promiseLedger: novel.promiseLedger,
      stateLedger: novel.stateLedger,
      assets: novel.assets,
      characters,
      relations,
      chapters
    });
    PREMODERN_STYLE_REPLACEMENTS.forEach(([pattern]) => {
      const scanner = new RegExp(pattern.source, pattern.flags.replace('g', ''));
      if (scanner.test(storyText)) {
        repairableIssues.push(`背景为${stylePolicy.era}，仍出现禁用概念：${pattern.source.replace(/\\b/g, '')}`);
      }
    });
  }
  appearances.forEach((count, name) => {
    const character = characters.find(item => item.name === name);
    if (count === 0 && ['核心主角', '主要人物'].includes(character?.roleTier)) {
      warnings.push(`主要人物“${name}”未进入任何章节`);
    }
  });
  clueSeeds.forEach((seedChapter, clue) => {
    if (!cluePayoffs.has(clue)) warnings.push(`伏笔“${clue}”在第${seedChapter}章埋设但未回收`);
  });
  const viewpointCounts = chapters.reduce((map, chapter) => {
    map[chapter.viewpoint] = (map[chapter.viewpoint] || 0) + 1;
    return map;
  }, {});
  const dominantViewpoint = Object.entries(viewpointCounts).sort((a, b) => b[1] - a[1])[0];
  if (dominantViewpoint && dominantViewpoint[1] / chapters.length > 0.82 && characters.length >= 20) {
    warnings.push(`视角过度集中于“${dominantViewpoint[0]}”（${dominantViewpoint[1]}/${chapters.length}章），群像利用不足`);
  }
  return {
    passed: blockingIssues.length === 0,
    score: Math.max(0, 100 - blockingIssues.length * 10 - repairableIssues.length * 5 - warnings.length * 2),
    hardIssues: [...new Set(blockingIssues)],
    repairableIssues: [...new Set(repairableIssues)],
    warnings: [...new Set(warnings)],
    metrics: {
      characterCount: characters.length,
      relationCount: relations.length,
      chapterCount: chapters.length,
      seededClueCount: clueSeeds.size,
      paidClueCount: cluePayoffs.size,
      activeCharacterCount: [...appearances.values()].filter(Boolean).length
    },
    stylePolicy
  };
}

function applyFinalNovelPatches(novel, repair) {
  const characters = novel.characterBible || [];
  const relations = novel.characterRelations || [];
  const chapters = novel.plotBlueprint?.chapters || [];
  (repair.characterPatches || []).forEach(patch => {
    const character = characters.find(item => item.name === patch.name);
    if (!character || !patch.fields || typeof patch.fields !== 'object') return;
    Object.assign(character, patch.fields, { name: character.name });
  });
  (repair.relationPatches || []).forEach(patch => {
    const relation = relations.find(item =>
      item.source === patch.source && item.target === patch.target &&
      (!patch.type || item.type === patch.type)
    );
    if (relation && patch.fields && typeof patch.fields === 'object') Object.assign(relation, patch.fields);
  });
  (repair.chapterPatches || []).forEach(patch => {
    const chapter = chapters.find(item => Number(item.chapterNumber) === Number(patch.chapterNumber));
    if (!chapter || !patch.fields || typeof patch.fields !== 'object') return;
    Object.assign(chapter, normalizeChapterOutline({ ...chapter, ...patch.fields }, chapter.chapterNumber, chapter.volumeId));
  });
  (repair.volumePatches || []).forEach(patch => {
    const volume = novel.plotBlueprint?.architecture?.volumes?.find(item => item.id === patch.id);
    if (volume && patch.fields && typeof patch.fields === 'object') Object.assign(volume, patch.fields);
  });
  syncEmbeddedCharacterRelationships(novel);
}

function rebuildPromiseLedgerFromChapters(novel) {
  const existingById = new Map((novel.promiseLedger || []).map(promise => [promise.id, promise]));
  const ledgerById = new Map();
  (novel.plotBlueprint?.chapters || []).forEach(chapter => {
    (chapter.plantedClues || []).forEach(clue => {
      if (!clue) return;
      const existing = existingById.get(clue) || {};
      if (!ledgerById.has(clue)) {
        ledgerById.set(clue, {
          id: clue,
          promiseType: existing.promiseType || '章节伏笔',
          seedEventId: `chapter-outline-${chapter.chapterNumber}`,
          expectedPayoffWindow: existing.expectedPayoffWindow || '后续章节',
          payoffEventId: '',
          status: 'planted',
          risk: existing.risk || '需确保回收时推动人物选择或揭示关键信息',
          readerQuestion: existing.readerQuestion || `“${clue}”将如何影响人物与主线？`
        });
      }
    });
    (chapter.paidClues || []).forEach(clue => {
      if (!clue) return;
      const existing = ledgerById.get(clue) || existingById.get(clue) || {
        id: clue,
        promiseType: '章节伏笔',
        seedEventId: '',
        expectedPayoffWindow: `第${chapter.chapterNumber}章前`,
        risk: '来源需人工复核',
        readerQuestion: `“${clue}”如何完成回收？`
      };
      ledgerById.set(clue, {
        ...existing,
        payoffEventId: `chapter-outline-${chapter.chapterNumber}`,
        status: 'paid'
      });
    });
  });
  novel.promiseLedger = [...ledgerById.values()];
}

async function buildFinalNovelAudit(task, onStatus = () => {}, stateManager = null) {
  const activeNovel = getActiveNovel();
  if (!activeNovel?.masterOutline || !activeNovel.characterBible?.length || !activeNovel.plotBlueprint?.chapters?.length) {
    throw new Error('全书终审需要已审核总纲、人物体系和章节细纲。');
  }
  if (activeNovel.consistencyStatus?.needsReaudit) {
    throw new Error('背景设定或作品简介已修改，现有总纲、人物和章节需要重新生成或重新审计。');
  }
  const novel = structuredClone(activeNovel);
  const runtime = await new AgentRuntime(task, novel, onStatus).prepare([
    'novel-final-audit', 'character-system', 'plot-compiler', 'narrative-compiler'
  ]);
  stateManager?.updateNodeState('hard-check', 'active');
  const normalizedReferenceCount = normalizeChapterCharacterReferences(novel);
  const initialAudit = runStaticFinalNovelAudit(novel);
  const initialStaticScore = initialAudit.score;
  if (!initialAudit.passed) {
    throw new Error(`全书终审发现无法自动恢复的基础错误：${initialAudit.hardIssues.slice(0, 8).join('；')}`);
  }
  const styleEnforcement = enforceNovelStylePolicy(novel);
  const clueRepairs = autoRepairOrphanCluePayoffs(novel);
  let staticAudit = runStaticFinalNovelAudit(novel);
  onStatus(
    `程序初检 ${initialStaticScore} 分：归一化 ${normalizedReferenceCount} 处人物标注，自动补种 ${clueRepairs.length} 条伏笔，修正 ${styleEnforcement.changes.length} 处时代风格越界；剩余 ${staticAudit.repairableIssues.length} 个可修复问题。`,
    '程序硬检',
    18
  );
  const styleConstraint = getNovelStyleConstraint(novel);
  stateManager?.updateNodeState('hard-check', 'completed');
  stateManager?.updateNodeState('cross-audit', 'active');
  onStatus('跨域审计 Agent 正在核对人物弧光、章节行动、关系变化、伏笔、时空与因果链...', '跨域审计 Agent', 28);
  const characterDigest = novel.characterBible.map(character => ({
    name: character.name,
    identity: character.identity,
    faction: character.faction,
    personality: character.personality,
    desire: character.desire,
    goal: character.goal,
    interests: character.interests,
    agency: character.agency,
    arc: character.arc,
    highlight: character.highlight,
    fate: character.fate
  }));
  const chapterDigest = novel.plotBlueprint.chapters.map(chapter => ({
    n: chapter.chapterNumber,
    volume: chapter.volumeId,
    viewpoint: chapter.viewpoint,
    participants: chapter.participants,
    goal: chapter.characterGoal,
    action: chapter.characterAction,
    conflict: chapter.conflict,
    cause: chapter.causalReason,
    turn: chapter.turn,
    cost: chapter.cost,
    relationship: chapter.relationshipDelta,
    state: chapter.stateDelta,
    emotion: chapter.emotionalCurve,
    seed: chapter.plantedClues,
    payoff: chapter.paidClues,
    hook: chapter.endingHook
  }));
  const volumeAuditMemos = [];
  for (const [volumeIndex, volume] of novel.plotBlueprint.architecture.volumes.entries()) {
    const volumeChapters = chapterDigest.filter(chapter =>
      chapter.n >= volume.chapterStart && chapter.n <= volume.chapterEnd
    );
    const involvedNames = new Set(volumeChapters.flatMap(chapter => chapter.participants || []));
    const involvedCharacters = characterDigest.filter(character => involvedNames.has(character.name));
    onStatus(
      `卷审计 Worker ${volumeIndex + 1}/${novel.plotBlueprint.architecture.volumes.length} 正在检查第 ${volume.chapterStart}-${volume.chapterEnd} 章...`,
      `卷审计 Worker ${volumeIndex + 1}`,
      28 + Math.round((volumeIndex / Math.max(1, novel.plotBlueprint.architecture.volumes.length)) * 18)
    );
    const volumeAudit = await callJsonAgentWithRepair(
      `你是长篇网文分卷审计 Worker。只返回 JSON：
{"volumeId":"卷ID","summary":"短结论","issues":[{"severity":"critical|high|medium|low","domain":"人物|关系|因果|剧情|伏笔|时间|空间|节奏|群像|悬疑|高潮|低谷|常识","target":"人物名/章节号","problem":"具体问题","repairInstruction":"最小修改方案"}],"strengths":["优势"]}

只审查本卷：人物是否主动推动剧情，弧光是否有阶段变化，因果与时空是否连续，资源是否有来源，伏笔是否先埋后收，高潮低谷和章末钩子是否有效。
${styleConstraint}`,
      `${runtime.getWorkerContext(`卷审计 Worker ${volumeIndex + 1}`, `只审核 ${volume.id} 的章节`)}
卷纲：${JSON.stringify(volume)}
本卷人物：${JSON.stringify(involvedCharacters)}
本卷章节：${JSON.stringify(volumeChapters)}`,
      onStatus,
      `卷审计 Worker ${volumeIndex + 1}`
    );
    volumeAuditMemos.push({
      volumeId: volume.id,
      summary: String(volumeAudit.summary || ''),
      issues: Array.isArray(volumeAudit.issues) ? volumeAudit.issues : [],
      strengths: Array.isArray(volumeAudit.strengths) ? volumeAudit.strengths : []
    });
  }
  const audit = await callJsonAgentWithRepair(
    `你是长篇网文全书终审 Agent。只返回 JSON：
{"score":0,"summary":"总体结论","issues":[{"severity":"critical|high|medium|low","domain":"人物|关系|因果|剧情|伏笔|时间|空间|节奏|群像|悬疑|高潮|结局|常识","target":"人物名/章节号/卷ID","problem":"可验证问题","repairInstruction":"最小修改方案"}],"strengths":["优势"],"finalOutline":{"positioning":"作品定位","beginning":"最终开始","development":"最终发展","climax":"最终高潮","ending":"最终结局","coreCausalChain":"核心因果链","ensembleStructure":"三幕N线群像结构","suspenseAndPayoff":"悬疑、伏笔与回收","emotionalCurve":"全书情绪曲线"}}

审核原则：
1. 人物欲望、利益和主动选择必须真正推动章节，不能只在档案里存在。
2. 人物生平、成长史、弧光、高光和命运必须在章节中有铺垫、转折与兑现。
3. 检查关系变化连续性、势力行动合理性、因果闭环、时间空间连续和常识。
4. 检查群像多线是否交汇，高潮是否由前序选择累积，结局是否回收核心承诺。
5. 严禁天降人物、天降道具、机械巧合、为了剧情而剧情。
6. 不得因为题材套路本身扣分，只处罚具体、可定位的问题。
7. ${styleConstraint}`,
    `${runtime.getWorkerContext('全书终审 Agent', '合并分卷审计结果，检查跨卷关系、弧光与终局')}
程序指标：${JSON.stringify(staticAudit)}
人物摘要：${JSON.stringify(characterDigest)}
关系网：${JSON.stringify(novel.characterRelations)}
卷级规划：${JSON.stringify(novel.plotBlueprint.architecture)}
分卷审计备忘录：${JSON.stringify(volumeAuditMemos)}`,
    onStatus,
    '全书终审 Agent'
  );
  stateManager?.updateNodeState('cross-audit', 'completed');
  stateManager?.updateNodeState('repair', 'active');
  const staticRepairIssues = staticAudit.repairableIssues.map(problem => ({
    severity: 'high',
    domain: '程序约束',
    target: problem.match(/第\d+章|人物“[^”]+”/)?.[0] || '全局',
    problem,
    repairInstruction: '补齐缺失字段、来源、代价或正确的伏笔前置，不改变既有核心剧情。'
  }));
  const actionableIssues = [...new Map([
    ...staticRepairIssues,
    ...volumeAuditMemos.flatMap(memo => memo.issues)
      .filter(issue => ['critical', 'high', 'medium'].includes(issue.severity)),
    ...(audit.issues || []).filter(issue => ['critical', 'high', 'medium'].includes(issue.severity))
  ].map(issue => [`${issue.target || '全局'}|${issue.problem || ''}`, issue])).values()];
  let repair = { characterPatches: [], relationPatches: [], chapterPatches: [], volumePatches: [] };
  if (actionableIssues.length) {
    const targetedChapterNumbers = new Set();
    actionableIssues.forEach(issue => {
      const text = `${issue.target || ''} ${issue.problem || ''}`;
      for (const match of text.matchAll(/第?\s*(\d{1,3})\s*章/g)) {
        targetedChapterNumbers.add(Number(match[1]));
      }
    });
    const targetedChapterDigest = chapterDigest.filter(chapter => targetedChapterNumbers.has(chapter.n));
    onStatus(`定向修复 Agent 正在处理 ${actionableIssues.length} 个跨域问题，只修改必要字段...`, '定向修复 Agent', 55);
    repair = await callJsonAgentWithRepair(
      `你是长篇网文定向修复 Agent。只返回最小补丁 JSON：
{"characterPatches":[{"name":"现有人物姓名","fields":{"identity":"...","personality":"...","lifeHistory":"...","growthHistory":"...","desire":"...","goal":"...","interests":"...","agency":"...","arc":"...","highlight":"...","fate":"..."}}],
"relationPatches":[{"source":"现有人物","target":"现有人物","type":"可选原关系类型","fields":{"description":"...","interestConflict":"..."}}],
"chapterPatches":[{"chapterNumber":1,"fields":{"characterGoal":"...","characterAction":"...","conflict":"...","causalReason":"...","plotSummary":"...","turn":"...","cost":"...","resourcesUsed":[{"name":"...","origin":"此前来源","cost":"使用代价"}],"newElements":[{"type":"道具|地点|规则|信息","name":"...","origin":"前置来源","purpose":"用途"}],"knowledgeDelta":"...","relationshipDelta":"...","stateDelta":"...","emotionalCurve":"...","endingHook":"...","plantedClues":[],"paidClues":[]}}],
"volumePatches":[{"id":"现有卷ID","fields":{"volumeGoal":"...","primaryConflict":"...","midpointTurn":"...","lowPoint":"...","climax":"...","endState":"...","nextHook":"..."}}]}

规则：只修复审计明确指出的问题；不得改名、不得新增人物、不得新增无来源道具、不得重写全部人物或全部章节；补丁必须保持背景、简介和总纲核心承诺。
${styleConstraint}
伏笔修复规则：若某伏笔在第N章回收但此前未埋设，必须同时修改更早章节的 plantedClues、knowledgeDelta 或 endingHook 建立自然种子，禁止只删除回收项来逃避问题。`,
      `${runtime.getWorkerContext('定向修复 Agent', '根据问题清单输出最小字段补丁')}
问题：${JSON.stringify(actionableIssues)}
人物摘要：${JSON.stringify(characterDigest)}
命中章节：${JSON.stringify(targetedChapterDigest)}
卷级规划：${JSON.stringify(novel.plotBlueprint.architecture)}`,
      onStatus,
      '定向修复 Agent'
    );
    applyFinalNovelPatches(novel, repair);
  }
  enforceNovelStylePolicy(novel);
  autoRepairOrphanCluePayoffs(novel);
  rebuildPromiseLedgerFromChapters(novel);
  stateManager?.updateNodeState('repair', 'completed');
  stateManager?.updateNodeState('final-review', 'active');
  staticAudit = runStaticFinalNovelAudit(novel);
  if (staticAudit.passed && staticAudit.repairableIssues.length) {
    onStatus(
      `首轮修复后仍有 ${staticAudit.repairableIssues.length} 个程序问题，补救 Agent 正在进行第二轮定点修复...`,
      '补救 Agent',
      72
    );
    const retryRepair = await callJsonAgentWithRepair(
      `你是长篇大纲程序问题补救 Agent。只返回 JSON：
{"characterPatches":[],"relationPatches":[],"chapterPatches":[{"chapterNumber":1,"fields":{"viewpoint":"现有人物姓名","participants":["现有人物姓名"],"resourcesUsed":[],"newElements":[],"plantedClues":[],"paidClues":[],"characterGoal":"...","characterAction":"...","cost":"...","stateDelta":"..."}}],"volumePatches":[]}

只修复给出的问题。未知人物必须替换为人物库中的正确姓名；已有角色后面的括号身份或状态要去掉；无法证明的新人物从 newElements 中删除或改为“信息/人物状态”；补齐资源来源、代价和伏笔前置。不得新增人物。
${styleConstraint}
遇到“回收未提前埋设的伏笔”时，必须修改一个更早章节加入同名 plantedClues，并在 knowledgeDelta 或 endingHook 中写入不揭底的前兆；不得只修改回收章节。`,
      `人物库：${JSON.stringify(novel.characterBible.map(character => character.name))}
剩余问题：${JSON.stringify(staticAudit.repairableIssues)}
相关章节：${JSON.stringify(novel.plotBlueprint.chapters.filter(chapter =>
        staticAudit.repairableIssues.some(problem => problem.includes(`第${chapter.chapterNumber}章`))
      ))}`,
      onStatus,
      '补救 Agent'
    );
    applyFinalNovelPatches(novel, retryRepair);
    normalizeChapterCharacterReferences(novel);
    enforceNovelStylePolicy(novel);
    autoRepairOrphanCluePayoffs(novel);
    staticAudit = runStaticFinalNovelAudit(novel);
  }
  if (!staticAudit.passed || staticAudit.repairableIssues.length) {
    const remaining = [...staticAudit.hardIssues, ...staticAudit.repairableIssues];
    throw new Error(`终审补丁后仍存在程序硬错误，已停止应用：${remaining.slice(0, 8).join('；')}`);
  }
  onStatus('全书复审 Agent 正在验证修复后的弧光兑现、因果闭环、群像交汇和最终回收...', '全书复审 Agent', 82);
  const finalReview = await callJsonAgentWithRepair(
    `你是长篇网文全书复审 Agent。只返回 JSON：
{"score":0,"summary":"修复后结论","issues":[{"severity":"critical|high|medium|low","domain":"人物|关系|因果|剧情|伏笔|时间|空间|节奏|群像|悬疑|高潮|结局|常识","target":"具体目标","problem":"剩余问题","repairInstruction":"人工建议"}],"strengths":["修复后优势"],"finalOutline":{"positioning":"作品定位","beginning":"最终开始","development":"最终发展","climax":"最终高潮","ending":"最终结局","coreCausalChain":"核心因果链","ensembleStructure":"三幕N线群像结构","suspenseAndPayoff":"悬疑、伏笔与回收","emotionalCurve":"全书情绪曲线"}}

要求：基于修复后的真实数据评分。程序硬校验已通过，不得重复报告不存在的引用或缺章；仍有质量建议可以保留并交给人工判断，不得为了高分掩盖问题。
${styleConstraint}`,
    `${runtime.getWorkerContext('全书复审 Agent', '复核修复结果并整合最终大纲')}
原审计问题：${JSON.stringify(audit.issues || [])}
已应用补丁：${JSON.stringify(repair)}
修复后人物：${JSON.stringify(novel.characterBible.map(character => ({
      name: character.name,
      identity: character.identity,
      desire: character.desire,
      goal: character.goal,
      interests: character.interests,
      agency: character.agency,
      arc: character.arc,
      highlight: character.highlight,
      fate: character.fate
    })))}
修复后卷纲：${JSON.stringify(novel.plotBlueprint.architecture)}
分卷审计备忘录：${JSON.stringify(volumeAuditMemos)}
程序复核指标：${JSON.stringify(staticAudit)}`,
    onStatus,
    '全书复审 Agent'
  );
  const normalizedAudit = {
    score: Math.max(0, Math.min(100, Number(finalReview.score) || staticAudit.score)),
    summary: String(finalReview.summary || audit.summary || '全书跨域审核完成。'),
    issues: Array.isArray(finalReview.issues) ? finalReview.issues : [],
    strengths: Array.isArray(finalReview.strengths) ? finalReview.strengths : [],
    staticAudit,
    repairedIssueCount: actionableIssues.length,
    normalizedReferenceCount,
    autoPlantedClueCount: clueRepairs.length,
    styleRepairCount: styleEnforcement.changes.length,
    initialStaticScore,
    requiresHumanReview: true
  };
  runtime.addQualityGate(
    'final-novel-integrity',
    staticAudit.passed && staticAudit.repairableIssues.length === 0,
    `staticScore=${staticAudit.score}; semanticScore=${normalizedAudit.score}; remainingProgramIssues=${staticAudit.repairableIssues.length}`
  );
  if (staticAudit.passed && staticAudit.repairableIssues.length === 0 && actionableIssues.length > 0) {
    runtime.addVerifiedExperience({
      trigger: 'final-audit deterministic issues',
      resolution: 'apply minimal field patches then rerun static cross-domain validation',
      evidence: [`repaired=${actionableIssues.length}`, `staticScore=${staticAudit.score}`],
      deterministicVerified: true
    });
  }
  stateManager?.updateNodeState('final-review', 'completed');
  stateManager?.updateNodeState('review', 'active');
  onStatus(
    `全书终审完成：初检 ${initialStaticScore} 分，程序硬校验通过，已定向处理 ${actionableIssues.length} 个问题，复审 ${normalizedAudit.score} 分，提交人工审核。`,
    '总控 Agent',
    100
  );
  return {
    chapterCount: novel.plotBlueprint.chapterCount,
    architecture: novel.plotBlueprint.architecture,
    chapters: novel.plotBlueprint.chapters,
    characters: novel.characterBible,
    relations: novel.characterRelations,
    promiseLedger: novel.promiseLedger,
    audit: normalizedAudit,
    finalOutline: finalReview.finalOutline || audit.finalOutline || {
      positioning: novel.analysisSummary || '',
      ...novel.masterOutline
    }
  };
}

function getRequestedPlotChapterCount(task) {
  const match = String(task || '').match(/(\d{2,4})\s*(?:章|章节)/);
  return Math.min(300, Math.max(20, match ? Number(match[1]) : 100));
}

function normalizePlotArchitecture(raw, chapterCount) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const volumeCount = Math.max(1, Math.ceil(chapterCount / 20));
  const volumes = Array.isArray(source.volumes) ? source.volumes : [];
  return {
    premise: String(source.premise || '').trim(),
    firstPrinciples: (Array.isArray(source.firstPrinciples) ? source.firstPrinciples : []).map(String).filter(Boolean),
    narrativeThreads: (Array.isArray(source.narrativeThreads) ? source.narrativeThreads : []).map((thread, index) => ({
      id: String(thread.id || `thread-${index + 1}`),
      name: String(thread.name || `叙事线 ${index + 1}`),
      driverCharacters: (Array.isArray(thread.driverCharacters) ? thread.driverCharacters : []).map(String).filter(Boolean),
      independentGoal: String(thread.independentGoal || '').trim(),
      interestConflict: String(thread.interestConflict || '').trim(),
      agencyPlan: String(thread.agencyPlan || '').trim(),
      startState: String(thread.startState || ''),
      endState: String(thread.endState || ''),
      intersections: (Array.isArray(thread.intersections) ? thread.intersections : []).map(String).filter(Boolean)
    })),
    volumes: Array.from({ length: volumeCount }, (_, index) => {
      const volume = volumes[index] || {};
      const chapterStart = index * 20 + 1;
      const chapterEnd = Math.min(chapterCount, (index + 1) * 20);
      return {
        id: String(volume.id || `volume-${index + 1}`),
        title: String(volume.title || `第${index + 1}卷`).trim(),
        chapterStart,
        chapterEnd,
        startState: String(volume.startState || '').trim(),
        volumeGoal: String(volume.volumeGoal || '').trim(),
        primaryConflict: String(volume.primaryConflict || '').trim(),
        ensembleThreads: (Array.isArray(volume.ensembleThreads) ? volume.ensembleThreads : []).map(String).filter(Boolean),
        midpointTurn: String(volume.midpointTurn || '').trim(),
        climax: String(volume.climax || '').trim(),
        lowPoint: String(volume.lowPoint || '').trim(),
        endState: String(volume.endState || '').trim(),
        nextHook: String(volume.nextHook || '').trim()
      };
    })
  };
}

function normalizeChapterOutline(item, fallbackNumber, volumeId) {
  const chapterNumber = Number(item?.chapterNumber) || fallbackNumber;
  return {
    id: String(item?.id || `chapter-outline-${chapterNumber}`),
    chapterNumber,
    volumeId: String(item?.volumeId || volumeId),
    title: String(item?.title || `第${chapterNumber}章`).trim(),
    time: String(item?.time || '').trim(),
    location: String(item?.location || '').trim(),
    viewpoint: String(item?.viewpoint || '').trim(),
    participants: (Array.isArray(item?.participants) ? item.participants : []).map(String).filter(Boolean),
    threadIds: (Array.isArray(item?.threadIds) ? item.threadIds : []).map(String).filter(Boolean),
    prerequisiteChapterIds: (Array.isArray(item?.prerequisiteChapterIds) ? item.prerequisiteChapterIds : []).map(String).filter(Boolean),
    openingState: String(item?.openingState || '').trim(),
    characterGoal: String(item?.characterGoal || '').trim(),
    characterAction: String(item?.characterAction || '').trim(),
    opposition: String(item?.opposition || '').trim(),
    conflict: String(item?.conflict || '').trim(),
    causalReason: String(item?.causalReason || '').trim(),
    plotSummary: String(item?.plotSummary || '').trim(),
    turn: String(item?.turn || '').trim(),
    cost: String(item?.cost || '').trim(),
    resourcesUsed: (Array.isArray(item?.resourcesUsed) ? item.resourcesUsed : []).map(resource => ({
      name: String(resource?.name || '').trim(),
      origin: String(resource?.origin || '').trim(),
      cost: String(resource?.cost || '').trim()
    })).filter(resource => resource.name),
    newElements: (Array.isArray(item?.newElements) ? item.newElements : []).map(element => ({
      type: String(element?.type || '').trim(),
      name: String(element?.name || '').trim(),
      origin: String(element?.origin || '').trim(),
      purpose: String(element?.purpose || '').trim()
    })).filter(element => element.name),
    knowledgeDelta: String(item?.knowledgeDelta || '').trim(),
    relationshipDelta: String(item?.relationshipDelta || '').trim(),
    stateDelta: String(item?.stateDelta || '').trim(),
    emotionalCurve: String(item?.emotionalCurve || '').trim(),
    goldenChapterRole: String(item?.goldenChapterRole || '').trim(),
    readerPayoff: String(item?.readerPayoff || '').trim(),
    coreQuestion: String(item?.coreQuestion || '').trim(),
    plantedClues: (Array.isArray(item?.plantedClues) ? item.plantedClues : []).map(String).filter(Boolean),
    paidClues: (Array.isArray(item?.paidClues) ? item.paidClues : []).map(String).filter(Boolean),
    endingHook: String(item?.endingHook || '').trim()
  };
}

function createFallbackChapterOutline(chapterNumber, volume, characters, previousChapter = null) {
  const driver = characters[(chapterNumber - 1) % Math.max(1, characters.length)] || {};
  const opponent = characters[chapterNumber % Math.max(1, characters.length)] || {};
  return normalizeChapterOutline({
    chapterNumber,
    volumeId: volume.id,
    title: `${volume.title}·推进节点${chapterNumber - volume.chapterStart + 1}`,
    time: `承接第${chapterNumber - 1}章之后`,
    location: '沿用卷级规划中的当前主要场景',
    viewpoint: driver.name || '主角',
    participants: [driver.name, opponent.name].filter(Boolean),
    threadIds: [],
    prerequisiteChapterIds: previousChapter ? [previousChapter.id] : [],
    openingState: previousChapter?.stateDelta || volume.startState || '承接总纲与卷首状态',
    characterGoal: driver.goal || volume.volumeGoal || '推动当前阶段目标',
    characterAction: `${driver.name || '视角人物'}依据自身目标主动调查、谈判或采取行动`,
    opposition: opponent.name || volume.primaryConflict || '当前阶段阻力',
    conflict: volume.primaryConflict || '人物目标与现有秩序产生正面冲突',
    causalReason: previousChapter
      ? `由上一章“${previousChapter.stateDelta}”直接引发`
      : `由卷首状态“${volume.startState || volume.volumeGoal}”引发`,
    plotSummary: `围绕“${volume.volumeGoal || volume.primaryConflict}”推进一项可验证的行动，并产生后续代价。`,
    turn: '行动获得部分结果，但暴露新的限制或利益冲突',
    cost: '消耗资源、关系信用或安全空间',
    resourcesUsed: [],
    newElements: [],
    knowledgeDelta: '获得或失去一项会影响后续选择的信息',
    relationshipDelta: '至少一组人物关系因选择或代价发生变化',
    stateDelta: '主线信息、人物关系或势力状态至少一项发生变化',
    emotionalCurve: '期待上升—受阻—局部兑现—新悬念',
    goldenChapterRole: chapterNumber === 1
      ? '第一章-危机入场'
      : chapterNumber === 2
        ? '第二章-升级兑现'
        : chapterNumber === 3
          ? '第三章-小高潮立承诺'
          : '',
    readerPayoff: chapterNumber <= 3 ? '人物主动行动获得可感知结果，同时付出代价' : '本章兑现一个阶段预期',
    coreQuestion: chapterNumber <= 3 ? '人物将如何解决当前困境并触及长线核心矛盾' : '本章留下的下一步核心问题',
    plantedClues: [],
    paidClues: [],
    endingHook: volume.nextHook || '新的选择迫使人物进入下一章'
  }, chapterNumber, volume.id);
}

function validateAndHealPlotBlueprint(chapters, architecture, characters, chapterCount) {
  const characterNames = new Set(characters.map(character => character.name));
  const validChapters = [];
  const issues = [];
  const seenIds = new Set();
  const clueSeeds = new Map();
  for (let number = 1; number <= chapterCount; number += 1) {
    const volume = architecture.volumes.find(item => number >= item.chapterStart && number <= item.chapterEnd) || architecture.volumes[0];
    const source = chapters.find(item => Number(item.chapterNumber) === number);
    const chapter = source
      ? normalizeChapterOutline(source, number, volume.id)
      : createFallbackChapterOutline(number, volume, characters, validChapters.at(-1));
    chapter.chapterNumber = number;
    chapter.id = `chapter-outline-${number}`;
    chapter.volumeId = volume.id;
    chapter.participants = chapter.participants.filter(name => characterNames.has(name));
    if (chapter.viewpoint && !characterNames.has(chapter.viewpoint)) {
      issues.push(`第${number}章视角人物不存在：${chapter.viewpoint}`);
      chapter.viewpoint = chapter.participants[0] || characters[0]?.name || '';
    }
    if (!chapter.participants.length && chapter.viewpoint) chapter.participants = [chapter.viewpoint];
    chapter.prerequisiteChapterIds = chapter.prerequisiteChapterIds.filter(id => {
      const dep = Number(String(id).match(/\d+/)?.[0]);
      return dep && dep < number;
    });
    if (number > 1 && !chapter.prerequisiteChapterIds.length) {
      chapter.prerequisiteChapterIds = [`chapter-outline-${number - 1}`];
    }
    chapter.plantedClues.forEach(clue => clueSeeds.set(clue, number));
    chapter.paidClues = chapter.paidClues.filter(clue => {
      const seed = clueSeeds.get(clue);
      if (!seed || seed >= number) {
        issues.push(`第${number}章回收了未提前埋设的伏笔：${clue}`);
        return false;
      }
      return true;
    });
    chapter.resourcesUsed = chapter.resourcesUsed.filter(resource => {
      if (!resource.origin) {
        issues.push(`第${number}章资源“${resource.name}”缺少来源`);
        return false;
      }
      return true;
    });
    chapter.newElements = chapter.newElements.filter(element => {
      if (!element.origin || !element.purpose) {
        issues.push(`第${number}章新增元素“${element.name}”缺少来源或用途`);
        return false;
      }
      return true;
    });
    const requiredFields = ['title', 'time', 'location', 'viewpoint', 'openingState', 'characterGoal', 'characterAction', 'opposition', 'conflict', 'causalReason', 'plotSummary', 'turn', 'cost', 'knowledgeDelta', 'relationshipDelta', 'stateDelta', 'emotionalCurve', 'endingHook'];
    requiredFields.forEach(field => {
      if (!chapter[field]) issues.push(`第${number}章缺少 ${field}`);
    });
    if (seenIds.has(chapter.id)) issues.push(`章节 ID 重复：${chapter.id}`);
    seenIds.add(chapter.id);
    validChapters.push(chapter);
  }
  const hardIssues = [];
  if (validChapters.length !== chapterCount) {
    hardIssues.push(`章节数量不一致：${validChapters.length}/${chapterCount}`);
  }
  validChapters.forEach(chapter => {
    const requiredFields = ['title', 'time', 'location', 'viewpoint', 'openingState', 'characterGoal', 'characterAction', 'opposition', 'conflict', 'causalReason', 'plotSummary', 'turn', 'cost', 'knowledgeDelta', 'relationshipDelta', 'stateDelta', 'emotionalCurve', 'endingHook'];
    const missing = requiredFields.filter(field => !chapter[field]);
    if (missing.length) hardIssues.push(`第${chapter.chapterNumber}章修复后仍缺少：${missing.join('、')}`);
    if (!characterNames.has(chapter.viewpoint)) hardIssues.push(`第${chapter.chapterNumber}章修复后视角人物仍不存在：${chapter.viewpoint}`);
  });
  hardIssues.push(...validateGoldenThreeChapters(validChapters));
  hardIssues.push(...validateEnsembleArchitecture(architecture, characters));
  return { chapters: validChapters, issues, hardIssues };
}

async function buildPlotSystem(task, onStatus = () => {}, stateManager = null) {
  const novel = getActiveNovel();
  if (!novel?.masterOutline) throw new Error('请先生成并审核全书总纲。');
  if (novel.consistencyStatus?.needsReaudit) {
    throw new Error('背景设定或作品简介已修改，旧总纲不再可信。请先重新执行第一步生成总纲。');
  }
  if (!Array.isArray(novel.characterBible) || novel.characterBible.length < 3) {
    throw new Error('请先完成人物体系构建并审核通过，再设计章节剧情。');
  }
  const constitution = ensureStoryConstitution(novel);
  const chapterCount = getRequestedPlotChapterCount(task);
  const runtime = await new AgentRuntime(task, novel, onStatus).prepare(['plot-compiler', 'narrative-compiler']);
  const compactCharacters = novel.characterBible.map(character => ({
    name: character.name,
    identity: character.identity,
    faction: character.faction,
    desire: character.desire,
    goal: character.goal,
    interests: character.interests,
    agency: character.agency,
    arc: character.arc,
    fate: character.fate
  }));
  if (stateManager) stateManager.updateNodeState('architecture', 'active');
  onStatus(`剧情总控 Agent 正在按第一性原理规划 ${chapterCount} 章的卷级状态变化...`, '剧情总控 Agent', 8);
  const architectureRaw = await callJsonAgentWithRepair(
    `你是长篇网文剧情总控 Agent。只返回 JSON：
{"premise":"故事最小不可约核心","firstPrinciples":["若移除就不成立的基本事实"],"narrativeThreads":[{"id":"thread-1","name":"人物叙事线","driverCharacters":["已有姓名"],"independentGoal":"不依附主角也会追求的目标","interestConflict":"与其他人物或势力的利益冲突","agencyPlan":"该人物主动采取的连续行动","startState":"起点","endState":"终点","intersections":["与其他线发生因果碰撞的节点"]}],"volumes":[{"id":"volume-1","title":"卷名","startState":"卷首状态","volumeGoal":"可验证目标","primaryConflict":"核心冲突","ensembleThreads":["群像线"],"midpointTurn":"中点转折","climax":"卷高潮","lowPoint":"低谷","endState":"卷末状态变化","nextHook":"下一卷钩子"}]}

规则：
1. 严格基于总纲、背景、人物库，不新增未登记人物。
2. 默认每卷约 20 章，覆盖全部 ${chapterCount} 章。
3. 人物欲望和利益推动事件；不能为了剧情而剧情。
4. 冲突来自人物选择、势力计划、资源限制或前序后果。
5. 默认群像，至少设计3条由不同人物驱动的独立叙事线；每条线必须有自己的目标、利益冲突、主动行动和选择后果，不能只是主角支援线。
6. 三幕多线必须在卷级因果交汇，交汇要改变至少两条人物线的状态；高潮必须由前置选择和代价赚取。
7. 时间、空间、信息、资源和关系状态必须可连续追踪。
8. 作品宪法是最高事实源，卷纲不得改变受众、世界类型、感情模式、简介主角、核心前史和故事承诺。
作品宪法：${JSON.stringify(constitution)}`,
    `${runtime.baseContext}
人物库：${JSON.stringify(compactCharacters)}
目标章节数：${chapterCount}
用户要求：${task}`,
    onStatus,
    '剧情总控 Agent'
  );
  let architecture = normalizePlotArchitecture(architectureRaw, chapterCount);
  let ensembleIssues = validateEnsembleArchitecture(architecture, novel.characterBible);
  for (let round = 0; round < 2 && ensembleIssues.length; round += 1) {
    onStatus(
      `群像架构第${round + 1}轮校验发现${ensembleIssues.length}个问题，正在定向修复人物线...`,
      '群像架构修复 Agent',
      10 + round * 2
    );
    const repairedArchitecture = await callJsonAgentWithRepair(
      `你是群像叙事架构修复 Agent。只返回完整 JSON：
{"premise":"不改变","firstPrinciples":[],"narrativeThreads":[{"id":"thread-1","name":"人物叙事线","driverCharacters":["已有姓名"],"independentGoal":"独立目标","interestConflict":"利益冲突","agencyPlan":"主动行动计划","startState":"起点","endState":"终点","intersections":["与其他线的具体因果交汇"]}],"volumes":[]}

只修复群像结构：
1. 至少3条叙事线、至少3位不同驱动人物。
2. 每条线即使没有主角也会因人物自身欲望和利益继续发展。
3. 每条线必须有独立目标、利益冲突、主动行动、选择代价和与其他线的因果交汇。
4. 保留原卷纲、作品宪法、人物身份和世界观，不新增人物。`,
      `校验问题：${JSON.stringify(ensembleIssues)}
人物库：${JSON.stringify(compactCharacters)}
当前架构：${JSON.stringify(architecture)}`,
      onStatus,
      '群像架构修复 Agent'
    );
    architecture = normalizePlotArchitecture({
      ...architecture,
      ...repairedArchitecture,
      volumes: Array.isArray(repairedArchitecture.volumes) && repairedArchitecture.volumes.length
        ? repairedArchitecture.volumes
        : architecture.volumes
    }, chapterCount);
    ensembleIssues = validateEnsembleArchitecture(architecture, novel.characterBible);
  }
  if (ensembleIssues.length) {
    throw new Error(`群像架构校验未通过：${ensembleIssues.slice(0, 8).join('；')}`);
  }
  if (stateManager) {
    stateManager.updateNodeState('architecture', 'completed');
    stateManager.updateNodeState('chapters', 'active');
  }

  const chapters = [];
  for (let start = 1; start <= chapterCount; start += 5) {
    const end = Math.min(chapterCount, start + 4);
    const volume = architecture.volumes.find(item => start >= item.chapterStart && start <= item.chapterEnd) || architecture.volumes[0];
    onStatus(`章节编排 Agent 正在设计第 ${start}-${end} 章...`, '章节编排 Agent', 15 + Math.round((start / chapterCount) * 55));
    let batchResult;
    try {
      batchResult = await callNamedArrayAgentWithRepair(
        `你是长篇网文章节编排 Agent。只返回 JSON：
{"chapters":[{"chapterNumber":1,"volumeId":"volume-1","title":"章名","time":"具体相对时间","location":"具体地点","viewpoint":"已有视角人物","participants":["已有姓名"],"threadIds":["thread-1"],"prerequisiteChapterIds":["chapter-outline-前章号"],"openingState":"章首状态","characterGoal":"人物本章目标","characterAction":"人物主动行动","opposition":"阻力及其动机","conflict":"冲突","causalReason":"为什么此事此刻必然发生","plotSummary":"剧情梗概","turn":"转折","cost":"代价","resourcesUsed":[{"name":"资源/道具","origin":"此前来源","cost":"使用代价"}],"newElements":[{"type":"人物|道具|地点|规则|信息","name":"新增元素","origin":"合理来源与前置铺垫","purpose":"后续用途"}],"knowledgeDelta":"谁知道了什么、谁仍不知道","relationshipDelta":"人物关系发生什么变化","stateDelta":"章末状态变化","emotionalCurve":"情绪曲线","goldenChapterRole":"第一章-危机入场|第二章-升级兑现|第三章-小高潮立承诺|非黄金三章留空","readerPayoff":"本章给读者的具体兑现","coreQuestion":"本章建立或推进的核心悬疑问题","plantedClues":["伏笔唯一名称"],"paidClues":["之前已埋伏笔名称"],"endingHook":"章末钩子"}]}

规则：
1. 只设计第 ${start}-${end} 章，必须完整返回每一章。
2. participants/viewpoint 只能使用给定人物库姓名，严禁天降人物。
3. 严禁天降道具；新道具必须来自既有资源、人物制作、交易或前章发现。
4. 每章必须由人物目标和主动行动推动，并包含阻力、转折、代价、状态变化。
5. prerequisiteChapterIds 只能引用更早章节。
6. 伏笔先埋后收；不能同章无铺垫回收。
7. 符合常识与时空连续性，禁止突兀转场和机械巧合。
8. 所有资源和道具必须填写来源与使用代价；新增元素必须填写来源和后续用途。
9. 每章必须明确知识差和关系变化，避免人物突然知道不该知道的信息或关系无过程跳变。
10. ${getNovelStyleConstraint(novel)}
11. 本批章节必须服从作品宪法，不得用新设定覆盖背景或简介中的明确事实。
12. 符合番茄小说平台常见阅读节奏：前300字尽快进入人物困境或冲突，减少静态背景说明；每章都有推进、兑现和新问题，但禁止无逻辑打脸。
13. 黄金三章硬规则：
第1章 goldenChapterRole=第一章-危机入场：具体危机直接入场，主角作出第一次主动选择，结尾抛出不可忽视的问题。
第2章 goldenChapterRole=第二章-升级兑现：前章选择引发更强阻力，同时完成第一次可感知的小兑现或反击。
第3章 goldenChapterRole=第三章-小高潮立承诺：形成第一次小高潮和有效反转，明确全书长线核心矛盾与继续阅读承诺。
三章都必须填写 readerPayoff、coreQuestion 和强 endingHook。
14. 群像章节必须让非主角人物依据自身目标主动行动，行动即使没有主角也会发生；多线交汇必须产生因果后果。
作品宪法：${JSON.stringify(constitution)}`,
        `总纲：${JSON.stringify(novel.masterOutline)}
卷级规划：${JSON.stringify(volume)}
全局叙事线：${JSON.stringify(architecture.narrativeThreads)}
人物库：${JSON.stringify(compactCharacters)}
已有章节尾部：${JSON.stringify(chapters.slice(-5))}
本批范围：${start}-${end}`,
        'chapters',
        status => onStatus(status, '章节编排 Agent', 15 + Math.round((start / chapterCount) * 55)),
        '章节编排 Agent'
      );
    } catch (error) {
      onStatus(`第 ${start}-${end} 章 JSON 无法修复，启用结构化兜底并交给审计：${error.message}`, '章节编排 Agent', 15 + Math.round((start / chapterCount) * 55));
      batchResult = { chapters: [], recovered: true };
    }
    const returned = Array.isArray(batchResult.chapters) ? batchResult.chapters : [];
    for (let number = start; number <= end; number += 1) {
      const source = returned.find(item => Number(item.chapterNumber) === number);
      chapters.push(source
        ? normalizeChapterOutline(source, number, volume.id)
        : createFallbackChapterOutline(number, volume, novel.characterBible, chapters.at(-1)));
    }
  }

  if (stateManager) {
    stateManager.updateNodeState('chapters', 'completed');
    stateManager.updateNodeState('validation', 'active');
  }
  const validation = validateAndHealPlotBlueprint(chapters, architecture, novel.characterBible, chapterCount);
  if (validation.hardIssues.length) {
    throw new Error(`章节细纲存在程序硬错误：${validation.hardIssues.slice(0, 8).join('；')}`);
  }
  const stylePolicy = getNovelStylePolicy(novel);
  if (stylePolicy.premodern) {
    const styleChanges = [];
    replaceStoryStyleTerms(architecture, PREMODERN_STYLE_REPLACEMENTS, 'architecture', styleChanges);
    replaceStoryStyleTerms(validation.chapters, PREMODERN_STYLE_REPLACEMENTS, 'chapters', styleChanges);
    if (styleChanges.length) {
      onStatus(`时代风格校验已修正 ${styleChanges.length} 处越界概念。`, '世界观校验', 76);
    }
  }
  onStatus(`因果校验完成：${validation.chapters.length} 章连续，正在进行全局剧情审计...`, '因果校验 Agent', 78);
  const audit = await callJsonAgentWithRepair(
    `你是长篇网文剧情审计 Agent。只返回 JSON：
{"passed":true,"score":0,"summary":"结论","issues":[{"severity":"critical|high|medium|low","category":"因果|人物驱动|伏笔|群像|时间|空间|节奏|高潮|低谷|悬念|常识|突兀发展","problem":"问题","repair":"方案"}],"strengths":["优势"]}

审核重点：人物推动剧情、因果闭环、三幕多线交汇、时空连续、伏笔先埋后收、高潮有铺垫、低谷有代价、严禁天降人物/道具和机械巧合。
黄金三章必须单独审核：第1章危机入场并主动选择，第2章升级且首次兑现，第3章小高潮、反转并建立长线承诺。
番茄节奏要求快速入局、强冲突、持续钩子和阶段兑现，但不得牺牲常识、因果和人物独立动机。
群像要求至少三条由不同人物欲望和利益驱动的线，不是多人围观主角。
${getNovelStyleConstraint(novel)}
作品宪法：${JSON.stringify(constitution)}
任何与作品宪法冲突的内容必须列为 critical。`,
    `总纲：${JSON.stringify(novel.masterOutline)}
卷级规划：${JSON.stringify(architecture)}
章节细纲摘要：${JSON.stringify(validation.chapters.map(chapter => ({
      n: chapter.chapterNumber,
      title: chapter.title,
      viewpoint: chapter.viewpoint,
      action: chapter.characterAction,
      conflict: chapter.conflict,
      cause: chapter.causalReason,
      turn: chapter.turn,
      resources: chapter.resourcesUsed,
      newElements: chapter.newElements,
      knowledge: chapter.knowledgeDelta,
      relationship: chapter.relationshipDelta,
      delta: chapter.stateDelta,
      seed: chapter.plantedClues,
      payoff: chapter.paidClues,
      hook: chapter.endingHook
    })))}`,
    onStatus,
    '剧情审计 Agent'
  );
  const constitutionIssues = getConstitutionConsistencyIssues({
    narrativeKernel: novel.narrativeKernel,
    architecture,
    chapters: validation.chapters
  }, constitution);
  const normalizedAudit = {
    passed: Boolean(audit.passed) && Number(audit.score) >= 85 && constitutionIssues.length === 0,
    score: Math.max(0, Math.min(100, Number(audit.score) || 0) - constitutionIssues.length * 20),
    summary: String(audit.summary || ''),
    issues: [
      ...(Array.isArray(audit.issues) ? audit.issues : []),
      ...constitutionIssues.map(problem => ({
        severity: 'critical',
        category: '背景偏离',
        problem,
        repair: '恢复作品宪法中的明确事实后重新生成受影响章节。'
      }))
    ],
    strengths: Array.isArray(audit.strengths) ? audit.strengths : [],
    requiresHumanReview: !audit.passed || Number(audit.score) < 85 || constitutionIssues.length > 0,
    validationIssues: validation.issues
  };
  runtime.addQualityGate(
    'plot-integrity',
    validation.hardIssues.length === 0 && constitutionIssues.length === 0,
    `hardIssues=${validation.hardIssues.length}; constitutionIssues=${constitutionIssues.length}; semanticScore=${normalizedAudit.score}`
  );
  if (stateManager) {
    stateManager.updateNodeState('validation', 'completed');
    stateManager.updateNodeState('review', 'active');
  }
  onStatus(normalizedAudit.requiresHumanReview
    ? `剧情细纲已通过程序硬校验，AI 审计 ${normalizedAudit.score} 分，提交人工复核。`
    : `剧情审计通过：${normalizedAudit.score} 分。`, '系统', 100);
  return { chapterCount, architecture, chapters: validation.chapters, audit: normalizedAudit };
}

function getRequestedCharacterCount(task) {
  const countMatch = task.match(/(?:至少|不少于|生成|构建)?\s*(\d{2,3})\s*(?:个|名|位)?人物/);
  return Math.min(80, Math.max(50, countMatch ? Number(countMatch[1]) : 50));
}

function buildNovelKnowledgeGraph(novel) {
  const constitution = ensureStoryConstitution(novel);
  const narrativeMemory = syncNarrativeMemory(novel, { reason: '知识图谱构建前同步正式事实' });
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();
  const addNode = node => {
    if (!node.id || nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push(node);
  };

  addNode({
    id: 'novel-root',
    kind: 'novel',
    label: novel.name,
    text: `${novel.background || ''}
${novel.synopsis || ''}`
  });
  addNode({
    id: 'memory:root',
    kind: 'narrative-memory',
    label: `全局叙事记忆 r${narrativeMemory.revision}`,
    text: JSON.stringify({
      version: narrativeMemory.version,
      revision: narrativeMemory.revision,
      activeFacts: narrativeMemory.facts.filter(fact => fact.status === 'active').length,
      historicalFacts: narrativeMemory.facts.filter(fact => fact.status !== 'active').length,
      observations: narrativeMemory.observations.length,
      updatedAt: narrativeMemory.updatedAt
    })
  });
  edges.push({ source: 'novel-root', target: 'memory:root', type: 'maintains-memory' });
  Object.entries(GROUP_METADATA).forEach(([group, label]) => {
    addNode({ id: `group:${group}`, kind: 'group', label, text: label });
    edges.push({ source: 'novel-root', target: `group:${group}`, type: 'contains' });
  });

  if (constitution) {
    addNode({
      id: 'constitution:story',
      kind: 'story-constitution',
      label: '作品宪法',
      text: JSON.stringify(constitution)
    });
    edges.push({ source: 'novel-root', target: 'constitution:story', type: 'defines' });
  }

  (novel.assets || []).forEach(asset => {
    const id = `asset:${asset.id}`;
    addNode({
      id,
      kind: asset.type,
      label: asset.name,
      text: `${asset.name}
${asset.desc}`,
      assetId: asset.id
    });
    edges.push({ source: `group:${asset.group}`, target: id, type: 'contains' });
  });

  if (novel.narrativeKernel) {
    addNode({
      id: 'kernel:narrative',
      kind: 'narrative-kernel',
      label: '叙事内核',
      text: JSON.stringify(novel.narrativeKernel)
    });
    edges.push({ source: 'novel-root', target: 'kernel:narrative', type: 'defines' });
    if (constitution) edges.push({ source: 'constitution:story', target: 'kernel:narrative', type: 'constrains' });
  }

  (novel.factionPlans || []).forEach(plan => {
    addNode({
      id: `faction-plan:${plan.id || plan.name}`,
      kind: 'faction-plan',
      label: plan.name,
      text: [
        plan.leader,
        plan.publicGoal,
        plan.hiddenGoal,
        (plan.resources || []).join('；'),
        (plan.constraints || []).join('；'),
        (plan.timeline || []).join(' -> '),
        (plan.collisionPoints || []).join('；')
      ].join('\n'),
      plan
    });
    edges.push({ source: 'novel-root', target: `faction-plan:${plan.id || plan.name}`, type: 'plans' });
  });

  (novel.eventCards || []).forEach(event => {
    addNode({
      id: `event:${event.id}`,
      kind: 'event-card',
      label: `${event.order || ''} ${event.title}`,
      text: [
        event.stage,
        event.preState,
        event.trigger,
        event.protagonistGoal,
        event.protagonistAction,
        event.oppositionActor,
        event.oppositionMotive,
        event.conflict,
        event.cost,
        event.gain,
        event.stateDelta,
        event.characterArcDelta,
        event.readerHook
      ].join('\n'),
      event
    });
    edges.push({ source: 'novel-root', target: `event:${event.id}`, type: 'contains-event' });
    if (constitution) edges.push({ source: 'constitution:story', target: `event:${event.id}`, type: 'constrains' });
    if (novel.narrativeKernel) {
      edges.push({ source: 'kernel:narrative', target: `event:${event.id}`, type: 'constrains' });
    }
  });

  [...(novel.eventCards || [])]
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .forEach((event, index, sortedEvents) => {
      const next = sortedEvents[index + 1];
      if (next) {
        edges.push({
          source: `event:${event.id}`,
          target: `event:${next.id}`,
          type: 'causes',
          text: event.stateDelta
        });
      }
    });

  (novel.promiseLedger || []).forEach(promise => {
    addNode({
      id: `promise:${promise.id}`,
      kind: 'promise-ledger',
      label: promise.id,
      text: [
        promise.promiseType,
        promise.readerQuestion,
        promise.expectedPayoffWindow,
        promise.status,
        promise.risk
      ].join('\n'),
      promise
    });
    if (promise.seedEventId) {
      edges.push({ source: `event:${promise.seedEventId}`, target: `promise:${promise.id}`, type: 'plants' });
    }
    if (promise.payoffEventId) {
      edges.push({ source: `promise:${promise.id}`, target: `event:${promise.payoffEventId}`, type: 'pays-off' });
    }
  });

  (novel.stateLedger || []).forEach(stateItem => {
    addNode({
      id: `state:${stateItem.eventId}`,
      kind: 'state-ledger',
      label: `状态：${stateItem.eventId}`,
      text: [
        stateItem.protagonistState,
        stateItem.relationshipState,
        stateItem.worldState,
        stateItem.readerState
      ].join('\n'),
      stateItem
    });
    edges.push({ source: `event:${stateItem.eventId}`, target: `state:${stateItem.eventId}`, type: 'writes-state' });
  });

  (novel.plotBlueprint?.architecture?.volumes || []).forEach(volume => {
    addNode({
      id: `volume:${volume.id}`,
      kind: 'volume-outline',
      label: volume.title,
      text: [volume.startState, volume.volumeGoal, volume.primaryConflict, volume.midpointTurn, volume.lowPoint, volume.climax, volume.endState].join('\n'),
      volume
    });
    edges.push({ source: 'novel-root', target: `volume:${volume.id}`, type: 'contains-volume' });
  });
  const plotClueNodes = new Set();
  (novel.plotBlueprint?.chapters || []).forEach(chapter => {
    addNode({
      id: `plot-chapter:${chapter.chapterNumber}`,
      kind: 'chapter-outline',
      label: `${chapter.chapterNumber} ${chapter.title}`,
      text: [
        chapter.time, chapter.location, chapter.viewpoint, chapter.characterGoal,
        chapter.characterAction, chapter.opposition, chapter.conflict, chapter.plotSummary,
        chapter.turn, chapter.cost, chapter.stateDelta, chapter.emotionalCurve, chapter.endingHook
      ].join('\n'),
      chapter
    });
    edges.push({ source: `volume:${chapter.volumeId}`, target: `plot-chapter:${chapter.chapterNumber}`, type: 'contains-chapter' });
    if (constitution) edges.push({ source: 'constitution:story', target: `plot-chapter:${chapter.chapterNumber}`, type: 'constrains' });
    (chapter.prerequisiteChapterIds || []).forEach(dependencyId => {
      const dependencyNumber = Number(String(dependencyId).match(/\d+/)?.[0]);
      if (dependencyNumber) {
        edges.push({ source: `plot-chapter:${dependencyNumber}`, target: `plot-chapter:${chapter.chapterNumber}`, type: 'causes' });
      }
    });
    (chapter.participants || []).forEach(name => {
      edges.push({ source: `character:${name}`, target: `plot-chapter:${chapter.chapterNumber}`, type: name === chapter.viewpoint ? 'viewpoint-of' : 'participates-in' });
    });
    (chapter.plantedClues || []).forEach(clue => {
      const clueId = `plot-clue:${clue}`;
      if (!plotClueNodes.has(clueId)) {
        addNode({ id: clueId, kind: 'plot-clue', label: clue, text: clue });
        plotClueNodes.add(clueId);
      }
      edges.push({ source: `plot-chapter:${chapter.chapterNumber}`, target: clueId, type: 'plants' });
    });
    (chapter.paidClues || []).forEach(clue => {
      const clueId = `plot-clue:${clue}`;
      if (!plotClueNodes.has(clueId)) {
        addNode({ id: clueId, kind: 'plot-clue', label: clue, text: clue });
        plotClueNodes.add(clueId);
      }
      edges.push({ source: clueId, target: `plot-chapter:${chapter.chapterNumber}`, type: 'pays-off' });
    });
  });

  const characters = novel.characterBible || [];
  characters.forEach(character => {
    addNode({
      id: `character:${character.name}`,
      kind: 'character',
      label: character.name,
      text: [
        character.identity, character.faction, character.personality, character.lifeHistory,
        character.arc, character.highlight, character.fate, character.desire,
        character.goal, character.interests, character.agency
      ].join('\n'),
      character
    });
    if (constitution) edges.push({ source: 'constitution:story', target: `character:${character.name}`, type: 'constrains' });
  });
  (novel.characterRelations || []).forEach(relation => {
    edges.push({
      source: `character:${relation.source}`,
      target: `character:${relation.target}`,
      type: relation.type,
      text: `${relation.description} ${relation.interestConflict}`
    });
  });

  const factionAssets = (novel.assets || []).filter(asset => asset.type === 'faction');
  characters.forEach(character => {
    const faction = factionAssets.find(asset =>
      character.faction.includes(asset.name) || asset.name.includes(character.faction)
    );
    if (faction) {
      edges.push({
        source: `character:${character.name}`,
        target: `asset:${faction.id}`,
        type: 'belongs-to'
      });
    }
  });

  const plantings = (novel.assets || []).filter(asset => asset.type === 'planting');
  const payoffs = (novel.assets || []).filter(asset => asset.type === 'payoff');
  if (!(novel.promiseLedger || []).length) {
    plantings.forEach((planting, index) => {
      if (!payoffs.length) return;
      edges.push({
        source: `asset:${planting.id}`,
        target: `asset:${payoffs[index % payoffs.length].id}`,
        type: 'foreshadow-payoff',
        text: '兼容旧数据的弱关联；新数据应使用 Promise Ledger。'
      });
    });
  }

  const outlines = (novel.assets || []).filter(asset => asset.type === 'main-outline');
  const hooks = (novel.assets || []).filter(asset => asset.type === 'pace-hooks');
  outlines.forEach(outline => {
    hooks.forEach(hook => {
      edges.push({
        source: `asset:${outline.id}`,
        target: `asset:${hook.id}`,
        type: 'plot-hook'
      });
    });
  });

  return { version: 1, nodes, edges, updatedAt: new Date().toISOString() };
}

function retrieveGraphContext(novel, query, limit = 24) {
  const graph = buildNovelKnowledgeGraph(novel);
  const queryTerms = [...new Set(String(query || '')
    .toLowerCase()
    .split(/[\s，。！？、；：,.!?;:【】（）()\-_]+/)
    .filter(term => term.length >= 2))];
  const scored = graph.nodes
    .filter(node => !['group', 'novel'].includes(node.kind))
    .map(node => {
      const haystack = `${node.label}
${node.text || ''}`.toLowerCase();
      const score = queryTerms.reduce((total, term) => total + (haystack.includes(term) ? 3 : 0), 0)
        + (['main-outline', 'faction', 'system', 'secret-clue', 'planting', 'payoff'].includes(node.kind) ? 2 : 0);
      return { node, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  const selectedIds = new Set(scored.map(item => item.node.id));
  const relatedEdges = graph.edges.filter(edge => selectedIds.has(edge.source) || selectedIds.has(edge.target));
  const relatedIds = new Set(relatedEdges.flatMap(edge => [edge.source, edge.target]));
  const relatedNodes = graph.nodes.filter(node => relatedIds.has(node.id));
  const contextNodes = [...new Map([...scored.map(item => item.node), ...relatedNodes].map(node => [node.id, node])).values()]
    .slice(0, limit + 12);
  const KIND_TRANSLATIONS = {
    'faction': '势力组织',
    'location': '地理位置',
    'system': '力量体系/法则',
    'secret-clue': '隐秘线索',
    'core-power': '核心力量/机制',
    'main-outline': '主线大纲',
    'pace-hooks': '节奏与钩子',
    'planting': '伏笔设置',
    'payoff': '回收机制',
    'character': '人物',
    'main-character': '核心主角',
    'major-character': '主要人物',
    'family-character': '主角家族',
    'former-sect-character': '旧宗门人物',
    'antagonist-character': '反派阵营',
    'neutral-character': '中立势力',
    'hidden-character': '隐藏势力',
    'civilian-character': '凡人社会',
    'supporting-character': '核心配角',
    'character-network': '人物关系拓扑',
    'promise-ledger': '伏笔台账',
    'state-ledger': '状态台账',
    'faction-plan': '势力计划',
    'volume-outline': '卷级规划',
    'chapter-outline': '章节细纲',
    'plot-causal-chain': '剧情因果链',
    'plot-timeline': '时空与多线叙事',
    'plot-audit': '剧情审计报告',
    'story-constitution': '作品宪法',
    'final-outline': '最终综合大纲',
    'final-audit': '全书终审报告',
    'narrative-memory': '全局叙事记忆',
    'group': '分类组',
    'novel': '作品基础信息'
  };

  return {
    graph,
    context: contextNodes.map(node => {
      const translatedKind = KIND_TRANSLATIONS[node.kind] || node.kind;
      return `【${translatedKind}｜${node.label}】${String(node.text || '').slice(0, 900)}`;
    }).join('\n'),
    edges: relatedEdges.slice(0, 60)
  };
}

function refreshNovelKnowledgeGraph(novel) {
  novel.knowledgeGraph = buildNovelKnowledgeGraph(novel);
}

async function persistNovelKnowledgeGraph(novel) {
  refreshNovelKnowledgeGraph(novel);
  try {
    const token = localStorage.getItem('novel_session_token');
    if (!token) return;
    const memory = syncNarrativeMemory(novel, { reason: '服务端持久化前同步正式事实' });
    const [graphResponse, memoryResponse] = await Promise.all([
      fetch('/api/knowledge-graphs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Token': token
        },
        body: JSON.stringify({
          novelId: novel.id,
          novelName: novel.name,
          graph: novel.knowledgeGraph
        })
      }),
      fetch('/api/narrative-memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Token': token
        },
        body: JSON.stringify({
          novelId: novel.id,
          novelName: novel.name,
          memory
        })
      })
    ]);
    const result = await graphResponse.json().catch(() => ({}));
    const memoryResult = await memoryResponse.json().catch(() => ({}));
    const response = graphResponse;
    if (response.ok) {
      novel.knowledgeGraphFile = result.relativePath;
      novel.neo4jSync = result.neo4j || { configured: false, synced: false };
      novel.narrativeMemorySync = memoryResponse.ok
        ? {
          synced: true,
          revision: memoryResult.revision,
          activeFactCount: memoryResult.activeFactCount,
          updatedAt: new Date().toISOString()
        }
        : {
          synced: false,
          error: memoryResult.error || `HTTP ${memoryResponse.status}`,
          updatedAt: new Date().toISOString()
        };
      saveState();
    } else if (response.status === 401) {
      console.warn('[KnowledgeGraph] 登录状态已失效，已跳过本次知识图谱持久化。');
    }
  } catch (error) {
    // LocalStorage graph remains available when the persistence service is offline.
  }
}

function getCharacterContext(novel, task = '构建人物', canon = null) {
  const constitution = ensureStoryConstitution(novel);
  const defaultAssetIds = new Set(DEFAULT_ASSETS.map(asset => asset.id));
  const obsoleteTerms = new Set([
    ...(canon?.obsoleteTerms || []),
    ...(canon?.canonicalFactions || []).flatMap(faction => faction.aliases || [])
  ].map(term => String(term || '').trim()).filter(Boolean));
  const contextNovel = {
    ...novel,
    assets: (novel.assets || []).filter(asset =>
      !CHARACTER_TYPE_ORDER.includes(asset.type) &&
      asset.type !== 'main-outline' &&
      !defaultAssetIds.has(asset.id) &&
      ![...obsoleteTerms].some(term => `${asset.name} ${asset.desc}`.includes(term))
    ),
    characterBible: [],
    characterRelations: []
  };
  const graphQuery = [
    novel.background,
    novel.synopsis,
    novel.masterOutline?.beginning,
    novel.masterOutline?.development,
    task
  ].filter(Boolean).join(' ');
  const graphContext = retrieveGraphContext(contextNovel, graphQuery);
  return `工作区名称（仅用于界面识别，不是故事事实）：${novel.name}
背景设定：${novel.background || '未提供'}
作品简介：${novel.synopsis || '未提供'}
作品宪法（最高事实优先级）：
${JSON.stringify(constitution)}
全书总纲：
开始：${novel.masterOutline?.beginning || '未提供'}
发展：${novel.masterOutline?.development || '未提供'}
高潮：${novel.masterOutline?.climax || '未提供'}
结局：${novel.masterOutline?.ending || '未提供'}

角色事实裁决结果：
${canon ? JSON.stringify(canon) : '未单独裁决，以简介和已审核总纲为准'}

左侧设定与 GraphRAG 相关子图：
${graphContext.context}

相关因果/人物/剧情/伏笔边：
${graphContext.edges.map(edge => `${edge.source} --${edge.type}--> ${edge.target}`).join('\n') || '暂无'}

硬性约束：
1. 人物身份、能力、势力、经历和命运不得违反背景设定、简介、总纲或左侧任何已审核设定。
2. 新人物必须能明确对应至少一个既有势力、地点、规则、剧情阶段或伏笔链。
3. 若信息冲突，优先级依次为：用户确认事实 > 人物事实契约 > 已确认事件卡 > 总纲 > 阵营规划 > 模型推断。发现上游冲突必须停止，不能自行选择版本。
4. 工作区名称不得被推断为小说正式书名，也不得用于否定简介中的主角、势力和情节。
5. 不得擅自改变无 CP、男频/女频、力量规则、终局结局等硬约束。
6. 复数亲缘或群体称谓只能在简介、总纲或事件卡提供证据时拆分为具名人物，不得套用固定姓名、职业或命运。
7. 称谓、公开身份、隐藏身份和命运必须由人物事实契约及事件证据统一，禁止用通用模板自行解释冲突。
8. ${getNovelStyleConstraint(novel)}`;
}

function updateMasterOutlineAsset(novel) {
  const outlineDescription = `## 开始
${novel.masterOutline.beginning}

## 发展
${novel.masterOutline.development}

## 高潮
${novel.masterOutline.climax}

## 结局
${novel.masterOutline.ending}`;
  const outlineAssets = (novel.assets || []).filter(asset => asset.type === 'main-outline');
  const primary = outlineAssets.find(asset => asset.name.includes('全书总纲')) || outlineAssets[0];
  if (primary) {
    primary.name = '全书总纲（开始-发展-高潮-结局）';
    primary.desc = outlineDescription;
  } else {
    novel.assets.push({
      id: `master-outline-${novel.id}-${Date.now()}`,
      group: 'plot-framework',
      type: 'main-outline',
      name: '全书总纲（开始-发展-高潮-结局）',
      desc: outlineDescription
    });
  }
}

function replaceAllText(value, replacements) {
  let text = String(value || '');
  replacements.forEach(({ from, to }) => {
    if (!from || from === to) return;
    text = text.split(from).join(to);
  });
  return text;
}

function getFactionReplacements(canon, novel) {
  const replacements = [];
  (canon?.canonicalFactions || []).forEach(faction => {
    const to = String(faction.name || '').trim();
    (Array.isArray(faction.aliases) ? faction.aliases : []).forEach(alias => {
      const from = String(alias || '').trim();
      if (from && to && from !== to) replacements.push({ from, to });
    });
  });
  return [...new Map(replacements.map(item => [`${item.from}->${item.to}`, item])).values()];
}

function applyFactionReplacementsToNovel(novel, canon) {
  const replacements = getFactionReplacements(canon, novel);
  if (!replacements.length) return;

  ['background', 'synopsis', 'analysisSummary'].forEach(field => {
    novel[field] = replaceAllText(novel[field], replacements);
  });
  if (novel.masterOutline) {
    Object.keys(novel.masterOutline).forEach(key => {
      novel.masterOutline[key] = replaceAllText(novel.masterOutline[key], replacements);
    });
    updateMasterOutlineAsset(novel);
  }
  (novel.assets || []).forEach(asset => {
    asset.name = replaceAllText(asset.name, replacements);
    asset.desc = replaceAllText(asset.desc, replacements);
  });
}

function applyFactionReplacementsToCharacters(characters, relations, canon, novel) {
  const replacements = getFactionReplacements(canon, novel);
  if (!replacements.length) return { characters, relations };
  characters.forEach(character => {
    [
      'identity', 'publicIdentity', 'identityRevealStage', 'faction', 'factionScope',
      'lifeHistory', 'growthHistory', 'arc', 'highlight', 'fate', 'desire', 'goal',
      'interests', 'agency', 'ability', 'weakness', 'settingBasis', 'plotAnchor',
      'foreshadowLink', 'storyFunction'
    ].forEach(field => {
      character[field] = replaceAllText(character[field], replacements);
    });
    character.hiddenIdentities = (character.hiddenIdentities || []).map(value => replaceAllText(value, replacements));
    character.relationships = (character.relationships || []).map(relation => ({
      ...relation,
      type: replaceAllText(relation.type, replacements),
      dynamic: replaceAllText(relation.dynamic, replacements),
      conflict: replaceAllText(relation.conflict, replacements)
    }));
  });
  relations.forEach(relation => {
    relation.type = replaceAllText(relation.type, replacements);
    relation.description = replaceAllText(relation.description, replacements);
    relation.interestConflict = replaceAllText(relation.interestConflict, replacements);
  });
  return { characters, relations };
}

async function reconcileCharacterCanon(novel, onStatus) {
  onStatus('正在核对简介、总纲中的主角姓名、亲缘关系与势力名称...', '事实裁决 Agent', 3);
  const result = await callJsonAgentWithRepair(
    `你是长篇小说角色事实裁决 Agent。只返回 JSON，不要代码围栏：
{
  "needsOutlineRepair": false,
  "contradictions": ["具体冲突"],
  "unresolvedContradictions": ["自动修正后仍无法裁决、必须阻断人物生成的冲突"],
  "obsoleteTerms": ["已确认错误、后续必须废弃的旧主角名或旧势力名"],
  "canonicalCharacters": [{
    "name":"姓名",
    "role":"身份/关系",
    "publicIdentity":"不可被人物生成器改写的公开身份",
    "hiddenIdentity":"有明确证据时填写，否则为空",
    "faction":"明确阵营；未明确时写待剧情确认",
    "storyFunction":"依据简介确定的不可替代剧情功能",
    "goals":["已确认目标"],
    "fate":{"status":"alive|dead|unknown","eventId":"对应事件ID或空","description":"已确认命运"},
    "eventAnchors":["event-1"],
    "forbiddenClaims":["与已确认事实冲突、禁止写入的断言"],
    "sources":["story-constitution","master-outline","event-1"]
  }],
  "canonicalFactions": [{"id":"faction-1","name":"统一名称","aliases":["应废弃或统一的别名"],"evidence":"依据"}],
  "masterOutline": {
    "beginning":"修正后的完整开始",
    "development":"修正后的完整发展",
    "climax":"修正后的完整高潮",
    "ending":"修正后的完整结局"
  }
}

规则：
1. 背景设定和简介中的明确事实优先于总纲；总纲不得改掉简介主角姓名、亲缘身份、宗门或核心前史。
2. 工作区名称只是项目标签，不是小说正式书名，不参与冲突判断。
3. 区分同一人物的别名与不同人物。没有明确依据时不要擅自认定替身、夺舍或隐藏身份。
4. 简介未点名但后续可合理出现的重要人物可以进入名册，但必须绑定现有势力、事件或伏笔证据，不能套用固定姓名和职业模板。
4.1 复数亲缘称谓可以拆分为具名人物，但姓名、身份、能力与命运必须结合当前小说事实生成，不得继承其他小说设定。
5. 若总纲存在姓名、亲缘、宗门、势力或前史冲突，needsOutlineRepair 必须为 true，并在保持原有开始、发展、高潮、结局结构和剧情价值的前提下修正。
6. obsoleteTerms 只列出已被简介明确否定的错误旧名称，不得把合法别名或不同人物列入。
7. masterOutline 四部分始终完整返回；无冲突时原样返回。`,
    `工作区名称：${novel.name}
背景设定：${novel.background || '未提供'}
作品简介：${novel.synopsis || '未提供'}
当前总纲：${JSON.stringify(novel.masterOutline)}`,
    onStatus,
    '事实裁决 Agent'
  );
  const repairedOutline = {
    beginning: String(result.masterOutline?.beginning || novel.masterOutline.beginning || '').trim(),
    development: String(result.masterOutline?.development || novel.masterOutline.development || '').trim(),
    climax: String(result.masterOutline?.climax || novel.masterOutline.climax || '').trim(),
    ending: String(result.masterOutline?.ending || novel.masterOutline.ending || '').trim()
  };
  if (Object.values(repairedOutline).some(value => !value)) {
    throw new Error('角色事实裁决未返回完整的开始、发展、高潮和结局。');
  }
  if (result.needsOutlineRepair) {
    novel.masterOutline = repairedOutline;
    updateMasterOutlineAsset(novel);
    refreshNovelKnowledgeGraph(novel);
    saveState();
    void persistNovelKnowledgeGraph(novel);
    onStatus(
      `已修正总纲中的 ${Array.isArray(result.contradictions) ? result.contradictions.length : 0} 处角色事实冲突。`,
      '事实裁决 Agent',
      8
    );
  }
  const canon = {
    canonicalCharacters: Array.isArray(result.canonicalCharacters) ? result.canonicalCharacters : [],
    canonicalFactions: Array.isArray(result.canonicalFactions) ? result.canonicalFactions : [],
    contradictions: Array.isArray(result.contradictions) ? result.contradictions : [],
    unresolvedContradictions: Array.isArray(result.unresolvedContradictions) ? result.unresolvedContradictions : [],
    obsoleteTerms: Array.isArray(result.obsoleteTerms) ? result.obsoleteTerms : []
  };
  canon.characterCanon = buildCharacterCanonContracts(novel, canon);
  const upstreamIssues = getCharacterCanonUpstreamIssues(canon.characterCanon, novel);
  if (upstreamIssues.length) {
    throw new Error(`人物事实契约存在上游冲突，必须先修复总纲或事件卡：${upstreamIssues.slice(0, 8).join('；')}`);
  }
  novel.characterCanon = canon.characterCanon;
  applyFactionReplacementsToNovel(novel, canon);
  refreshNovelKnowledgeGraph(novel);
  saveState();
  void persistNovelKnowledgeGraph(novel);
  return canon;
}

function runStaticCharacterAudit(characters, relations, targetCount, canon = null, novel = null) {
  const names = characters.map(character => character.name);
  const nameSet = new Set(names);
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
  const malformedNames = names.filter(isMalformedCharacterName);
  const invalidRelationEndpoints = relations
    .filter(relation =>
      !nameSet.has(relation.source) ||
      !nameSet.has(relation.target) ||
      relation.source === relation.target
    )
    .map(relation => `${relation.source} → ${relation.target}`);
  const duplicatedProfiles = [];
  const profileMap = new Map();
  characters.forEach(character => {
    const signature = getCharacterProfileSignature(character);
    if (!signature || signature.replace(/\|/g, '').length < 30) return;
    if (profileMap.has(signature)) {
      duplicatedProfiles.push([profileMap.get(signature), character.name]);
    } else {
      profileMap.set(signature, character.name);
    }
  });
  const protagonistTemplatePollution = [];
  const protagonistIdentityLeaks = [];
  const antagonistIdentityBoundaryIssues = [];
  const ghostReferences = [...new Set([
    ...relations.flatMap(relation => [relation.source, relation.target]),
    ...characters.flatMap(character => (character.relationships || []).map(relation => relation.target))
  ])].filter(name => name && !nameSet.has(name));
  const weakFamilyConflicts = relations
    .filter(relation =>
      /(亲属|父女|父子|母女|母子|兄妹|兄弟|姐妹|家人)/.test(`${relation.type || ''} ${relation.description || ''}`) &&
      /(无实质冲突|利益一致|没有冲突|无冲突|完全一致|共同保护|暂无直接冲突)/.test(relation.interestConflict || '')
    )
    .map(relation => `${relation.source}-${relation.target}`);
  const relationDegree = new Map(names.map(name => [name, 0]));
  relations.forEach(relation => {
    relationDegree.set(relation.source, (relationDegree.get(relation.source) || 0) + 1);
    relationDegree.set(relation.target, (relationDegree.get(relation.target) || 0) + 1);
  });
  const isolatedCharacters = [...relationDegree.entries()]
    .filter(([, degree]) => degree < 2)
    .map(([name]) => name);
  const placeholderNames = names.filter(name => /(路人[甲乙丙丁]|无名氏|某某|待定)/.test(name));
  const missingCoreFields = characters
    .filter(character =>
      !character.desire || !character.goal || !character.interests || !character.agency ||
      !character.arc || !character.highlight || !character.publicIdentity ||
      !character.identityRevealStage || !character.factionScope ||
      (character.hiddenIdentities?.length > 0 && character.identityRevealStage === '无')
    )
    .map(character => character.name);
  const constitutionIssues = getConstitutionConsistencyIssues({
    narrativeKernel: novel?.narrativeKernel,
    characters,
    relations
  }, ensureStoryConstitution(novel));
  const semanticIssues = validateCharacterSemanticIntegrity({
    characters,
    relations,
    targetCount,
    canon: canon?.characterCanon || novel?.characterCanon || {},
    novel
  });
  const semanticPartition = partitionCharacterIntegrityIssues(semanticIssues);
  const hardPassed =
    characters.length >= targetCount &&
    duplicateNames.length === 0 &&
    malformedNames.length === 0 &&
    invalidRelationEndpoints.length === 0 &&
    placeholderNames.length === 0 &&
    missingCoreFields.length === 0 &&
    ghostReferences.length === 0 &&
    constitutionIssues.length === 0 &&
    semanticPartition.hard.length === 0;
  return {
    passed:
      characters.length >= targetCount &&
      duplicateNames.length === 0 &&
      malformedNames.length === 0 &&
      invalidRelationEndpoints.length === 0 &&
      placeholderNames.length === 0 &&
      isolatedCharacters.length === 0 &&
      missingCoreFields.length === 0 &&
      duplicatedProfiles.length === 0 &&
      protagonistTemplatePollution.length === 0 &&
      protagonistIdentityLeaks.length === 0 &&
      antagonistIdentityBoundaryIssues.length === 0 &&
      ghostReferences.length === 0 &&
      weakFamilyConflicts.length === 0 &&
      constitutionIssues.length === 0 &&
      semanticIssues.length === 0 &&
      relations.length >= targetCount,
    duplicateNames: [...new Set(duplicateNames)],
    malformedNames: [...new Set(malformedNames)],
    invalidRelationEndpoints: [...new Set(invalidRelationEndpoints)],
    placeholderNames,
    isolatedCharacters,
    missingCoreFields,
    duplicatedProfiles,
    protagonistTemplatePollution,
    protagonistIdentityLeaks,
    antagonistIdentityBoundaryIssues,
    ghostReferences,
    weakFamilyConflicts,
    constitutionIssues,
    semanticIssues,
    semanticHardIssues: semanticPartition.hard,
    semanticQualityIssues: semanticPartition.quality,
    hardPassed,
    relationCount: relations.length,
    actualCount: characters.length,
    targetCount
  };
}

function getHardCharacterAuditIssues(staticAudit) {
  const issues = [];
  if (!staticAudit) return ['静态审计缺失'];
  (staticAudit.constitutionIssues || []).forEach(issue => {
    issues.push(`作品宪法冲突：${issue}`);
  });
  (staticAudit.semanticHardIssues || []).forEach(issue => {
    issues.push(`人物语义硬错误：${issue}`);
  });
  if (staticAudit.actualCount < staticAudit.targetCount) {
    issues.push(`人物数量不足：${staticAudit.actualCount}/${staticAudit.targetCount}`);
  }
  [
    ['duplicateNames', '人物重名'],
    ['malformedNames', '非法姓名'],
    ['invalidRelationEndpoints', '非法关系端点'],
    ['placeholderNames', '占位姓名'],
    ['missingCoreFields', '核心字段缺失'],
    ['ghostReferences', '幽灵人物引用']
  ].forEach(([key, label]) => {
    const values = Array.isArray(staticAudit[key]) ? staticAudit[key] : [];
    if (values.length) {
      issues.push(`${label}：${values.slice(0, 8).join('、')}`);
    }
  });
  return issues;
}

function getCharacterCommitBlockers(result, novel) {
  const characters = Array.isArray(result?.characters) ? result.characters : [];
  const relations = Array.isArray(result?.relations) ? result.relations : [];
  const expectedCount = Number(result?.audit?.staticAudit?.targetCount) || characters.length;
  const semanticIssues = validateCharacterSemanticIntegrity({
    characters,
    relations,
    targetCount: expectedCount,
    canon: novel?.characterCanon || {},
    novel
  });
  const hardIssues = partitionCharacterIntegrityIssues(semanticIssues).hard;
  const incompleteCount = characters.filter(character =>
    character?.profileQuality === 'fallback' ||
    character?.profileQuality === 'incomplete' ||
    (character?._autoFilledFields || []).length > 0
  ).length;
  const forbiddenIssues = findForbiddenStoryConcepts({ characters, relations })
    .map(hit => `人物体系出现禁用概念“${hit.term}”（${hit.path}）`);
  return [...new Set([
    ...getCharacterAcceptanceBlockers(result?.audit, hardIssues, incompleteCount),
    ...forbiddenIssues
  ])];
}

function getPlotCommitBlockers(result, novel) {
  const chapters = Array.isArray(result?.chapters) ? result.chapters : [];
  const architecture = result?.architecture || {};
  const characters = Array.isArray(result?.characters) && result.characters.length
    ? result.characters
    : (novel?.characterBible || []);
  const structuralIssues = validatePlotIntegrity({ chapters, architecture, characters });
  const forbiddenIssues = findForbiddenStoryConcepts({
    architecture,
    chapters,
    finalOutline: result?.finalOutline
  }).map(hit => `剧情体系出现禁用概念“${hit.term}”（${hit.path}）`);
  return [...new Set([...structuralIssues, ...forbiddenIssues])];
}

function finalizeCharacterAuditForReview(audit, staticAudit, finalSevereIssues, repairRounds, incompleteCount = 0) {
  const hardIssues = getHardCharacterAuditIssues(staticAudit);
  const gate = evaluateCharacterQualityGate({
    audit,
    deterministicIssues: hardIssues,
    incompleteCount
  });
  return {
    blocked: gate.level === 'blocked',
    draftOnly: gate.level === 'draft' || gate.level === 'blocked',
    hardIssues: gate.blockers,
    audit: {
      ...audit,
      passed: gate.canCommit,
      qualityGate: gate.level,
      requiresHumanReview: gate.requiresHumanReview,
      repairRounds,
      hardIssues: gate.blockers,
      advisories: gate.advisories,
      staticAudit,
      summary: gate.level === 'review'
        ? `确定性校验通过，当前 ${gate.score} 分，仍有可人工判断的质量建议。${audit.summary || ''}`
        : gate.level === 'draft'
          ? `当前 ${gate.score} 分，已保存为隔离草稿，不覆盖正式人物库。${audit.summary || ''}`
          : audit.summary
    }
  };
}

async function auditCharacterSystem(context, characters, relations, staticAudit, onStatus) {
  const compactCharacters = characters.map(character => ({
    name: character.name,
    identity: character.identity,
    publicIdentity: character.publicIdentity,
    hiddenIdentities: character.hiddenIdentities,
    identityRevealStage: character.identityRevealStage,
    faction: character.faction,
    factionScope: character.factionScope,
    personality: character.personality,
    lifeHistory: character.lifeHistory,
    arc: character.arc,
    highlight: character.highlight,
    fate: character.fate,
    desire: character.desire,
    goal: character.goal,
    interests: character.interests,
    agency: character.agency,
    settingBasis: character.settingBasis,
    plotAnchor: character.plotAnchor,
    foreshadowLink: character.foreshadowLink
  }));
  const batchReports = [];
  for (let index = 0; index < compactCharacters.length; index += 10) {
    const batch = compactCharacters.slice(index, index + 10);
    const batchNames = new Set(batch.map(character => character.name));
    const batchRelations = relations.filter(relation =>
      batchNames.has(relation.source) || batchNames.has(relation.target)
    );
    onStatus(`人物审计 Agent 正在检查第 ${index + 1}-${index + batch.length} 位人物...`);
    const report = await callJsonAgentWithRepair(
      `你是长篇小说人物分批审计 Agent。只返回 JSON，不要代码围栏：
{
  "score": 0,
  "strengths": ["优点"],
  "issues": [{
    "severity": "critical|high|medium|low",
    "category": "重复|遗漏|身份矛盾|势力矛盾|关系矛盾|总纲偏离|背景冲突|人物弧光|人物高光|命运逻辑|工具人化|活人感|多重身份",
    "characterNames": ["相关人物姓名"],
    "problem": "具体问题",
    "repair": "明确修复方案",
    "evidence": ["人物事实契约字段、事件ID或原文证据；critical 必填"]
  }]
}

检查人物是否符合背景、简介、已修正总纲和角色事实契约；检查身份、势力、欲望、目标、利益、主动性、人物弧光、高光、命运及关系是否具体自洽。隐藏身份必须有合理揭露条件。critical 必须引用明确契约字段、事件 ID 或原文证据；没有证据只能标为 high 或更低。只报告可执行的真实问题。`,
      `${context}
本批人物：${JSON.stringify(batch)}
本批相关关系：${JSON.stringify(batchRelations)}`,
      status => onStatus(status),
      '人物审计 Agent'
    );
    batchReports.push({
      score: Math.max(0, Math.min(100, Number(report.score) || 0)),
      strengths: Array.isArray(report.strengths) ? report.strengths.map(String) : [],
      issues: Array.isArray(report.issues) ? report.issues : []
    });
  }

  onStatus('人物终审 Agent 正在核对全局重复、阵营、关系与剧情职能覆盖...');
  const globalRoster = characters.map(character => ({
    name: character.name,
    identity: character.identity,
    publicIdentity: character.publicIdentity,
    hiddenIdentities: character.hiddenIdentities,
    identityRevealStage: character.identityRevealStage,
    faction: character.faction,
    factionScope: character.factionScope,
    roleTier: character.roleTier,
    storyFunction: character.storyFunction,
    desire: character.desire,
    goal: character.goal,
    plotAnchor: character.plotAnchor,
    fate: character.fate
  }));
  const audit = await callJsonAgentWithRepair(
    `你是长篇小说人物体系终审 Agent。只返回 JSON，不要代码围栏：
{
  "passed": true,
  "score": 0,
  "summary": "审计总结",
  "strengths": ["优点"],
  "issues": [{
    "severity": "critical|high|medium|low",
    "category": "重复|遗漏|身份矛盾|势力矛盾|关系矛盾|总纲偏离|背景冲突|人物弧光|人物高光|命运逻辑|工具人化|活人感|多重身份",
    "characterNames": ["相关人物姓名"],
    "problem": "具体问题",
    "repair": "明确修复方案",
    "evidence": ["人物事实契约字段、事件ID或原文证据；critical 必填"]
  }],
  "coverage": {
    "plotDriving": "人物是否主动推动剧情",
    "identityConsistency": "身份与多重身份是否自洽",
    "factionConsistency": "势力范围和归属是否自洽",
    "relationshipConsistency": "关系图谱是否存在矛盾或孤岛",
    "arcQuality": "弧光是否完整",
    "highlightQuality": "高光是否由选择与代价产生",
    "livingness": "人物是否有极强活人感"
  }
}

审计标准：
1. 综合程序审计 and 分批审计，检查人物重复、同质化、遗漏的剧情职能和关系孤岛。
2. 检查公开身份、隐藏身份、多重身份、所属势力和势力活动范围是否冲突。
3. 检查关系方向、亲缘、师承、敌友、利益链和时间线是否互相矛盾。
4. 检查每个人是否符合背景、简介、总纲、世界规则、伏笔回收链和左侧设定。
5. 人物弧光必须由欲望、缺陷、主动选择、代价和认知变化组成。
6. 人物高光必须源于该人物独特能力和选择，不能抢夺他人功能或依赖巧合。
7. 人物必须主动推动剧情，有私欲、利益、偏见、生活痕迹、关系压力和自主决策，严禁工具人。
8. 工作区名称只是界面标签，不是小说正式书名，不得据此判定背景冲突。
9. 角色事实裁决已明确废弃的姓名或势力别名不得再次作为有效事实。
10. 简介未点名但功能清晰、且绑定既有势力或事件证据的人物可以存在；只有制造新规则体系或抢夺主线因果时才判为背景冲突。
11. 复数亲缘称谓可以拆分为具名人物，但必须依据当前小说事实，不得引用固定姓名或其他小说模板。
12. critical 问题必须提供人物事实契约字段、事件 ID 或原文证据；无证据的主观质量判断最高只能标为 high。
13. critical/high 问题存在时 passed 必须为 false；score 低于 85 时 passed 必须为 false。`,
    `${context}
程序硬审计：${JSON.stringify(staticAudit)}
分批审计报告：${JSON.stringify(batchReports)}
全局人物摘要：${JSON.stringify(globalRoster)}
全局关系：${JSON.stringify(relations)}`,
    status => onStatus(status),
    '人物终审 Agent'
  );
  const batchIssues = batchReports.flatMap(report => report.issues);
  const globalIssues = Array.isArray(audit.issues) ? audit.issues : [];
  const issues = [...batchIssues, ...globalIssues].map(issue => ({
    ...issue,
    severity: String(issue.severity || 'medium').toLowerCase(),
    characterNames: Array.isArray(issue.characterNames) ? issue.characterNames.map(String) : [],
    evidence: Array.isArray(issue.evidence) ? issue.evidence.map(String).filter(Boolean) : []
  }));
  const hasSevereIssues = issues.some(issue => ['critical', 'high'].includes(issue.severity));
  const score = Math.min(
    Math.max(0, Math.min(100, Number(audit.score) || 0)),
    ...batchReports.map(report => report.score)
  );
  return {
    passed: Boolean(audit.passed) && staticAudit.passed && !hasSevereIssues && score >= 85,
    score,
    summary: String(audit.summary || '').trim(),
    strengths: [
      ...(Array.isArray(audit.strengths) ? audit.strengths.map(String) : []),
      ...batchReports.flatMap(report => report.strengths)
    ].slice(0, 20),
    issues,
    coverage: audit.coverage || {},
    staticAudit
  };
}

async function repairCharacterSystem(context, characters, relations, audit, onStatus) {
  const severeIssues = audit.issues.filter(issue => ['critical', 'high'].includes(issue.severity));
  const explicitNames = severeIssues.flatMap(issue =>
    Array.isArray(issue.characterNames) ? issue.characterNames : []
  );
  const mentionedNames = severeIssues.flatMap(issue => {
    const text = `${issue.problem || ''} ${issue.repair || ''}`;
    return characters
      .map(character => character.name)
      .filter(name => name && text.includes(name));
  });
  const staticNames = [
    ...(audit.staticAudit?.missingCoreFields || []),
    ...(audit.staticAudit?.isolatedCharacters || []),
    ...(audit.staticAudit?.duplicateNames || []),
    ...(audit.staticAudit?.placeholderNames || []),
    ...(audit.staticAudit?.protagonistTemplatePollution || []),
    ...(audit.staticAudit?.protagonistIdentityLeaks || []),
    ...(audit.staticAudit?.antagonistIdentityBoundaryIssues || []),
    ...(audit.staticAudit?.ghostReferences || []),
    ...(audit.staticAudit?.duplicatedProfiles || []).flat()
  ];
  const existingNameSet = new Set(characters.map(character => character.name));
  const staticIssues = [
    ...(audit.staticAudit?.protagonistTemplatePollution || []).map(name => ({
      severity: 'high',
      category: '主角模板污染',
      characterNames: [name],
      problem: `${name} 的欲望、目标或主动行为与人物事实契约、背景简介或事件证据冲突。`,
      repair: '只依据当前小说的人物事实契约、背景简介和事件卡恢复主角的独立欲望、目标、主动选择与代价，不得套用任何固定题材或旧小说弧光。'
    })),
    ...(audit.staticAudit?.duplicatedProfiles || []).map(pair => ({
      severity: 'high',
      category: '人物复制',
      characterNames: pair,
      problem: `${pair.join('、')} 的性格、欲望、目标、弧光、高光或命运高度重复。`,
      repair: '按各自身份、阵营、利益和剧情职能拆分，必须给出不同的私人欲望、主动选择、代价、高光和结局。'
    })),
    ...(audit.staticAudit?.protagonistIdentityLeaks || []).map(name => ({
      severity: 'high',
      category: '身份污染',
      characterNames: [name],
      problem: `${name} 复制了其他人物受事实契约保护的隐藏身份或专属职责。`,
      repair: '删除无证据的身份复制，只保留该人物契约、事件锚点或用户确认事实能够证明的身份与职责。'
    })),
    ...(audit.staticAudit?.antagonistIdentityBoundaryIssues || []).map(name => ({
      severity: 'high',
      category: '反派身份边界',
      characterNames: [name],
      problem: `${name} 的身份、阵营、能力与人物事实契约相互混杂。`,
      repair: '按当前小说契约恢复其公开身份、阵营、能力边界和利益动机；删除未被事件或事实源证明的身份、能力与关系。'
    })),
    ...(audit.staticAudit?.ghostReferences || []).map(name => ({
      severity: 'high',
      category: '幽灵人物',
      characterNames: [],
      problem: `${name} 被关系或人物档案引用，但没有独立人物档案。`,
      repair: '若事实契约和事件卡能够证明该人物存在，则退回名册阶段补建档案；否则删除无档案引用并改为已存在人物。'
    })),
    ...(audit.staticAudit?.weakFamilyConflicts || []).map(pair => ({
      severity: 'high',
      category: '家族关系工具人化',
      characterNames: pair.split('-'),
      problem: `${pair} 的利益冲突过于一致或无冲突，导致团宠关系缺少活人感。`,
      repair: '保留亲情底色，但依据双方目标、职业原则、信息差或风险承担加入可验证的真实摩擦。'
    }))
  ];
  const combinedSevereIssues = [...severeIssues, ...staticIssues];
  const affectedNames = [...new Set([...explicitNames, ...mentionedNames, ...staticNames])]
    .filter(name => name && existingNameSet.has(name));
  if (!affectedNames.length && (!audit.passed || audit.score < 70)) {
    affectedNames.push(...characters.map(character => character.name));
  }
  if (!affectedNames.length) return { characters, relations };

  onStatus(`正在修正 ${affectedNames.length} 位人物及其关系矛盾...`);
  const characterMap = new Map(characters.map(character => [character.name, character]));
  for (let index = 0; index < affectedNames.length; index += 2) {
    const names = affectedNames.slice(index, index + 2);
    const relevantIssues = combinedSevereIssues.filter(issue => {
      const issueNames = Array.isArray(issue.characterNames) ? issue.characterNames : [];
      const issueText = `${issue.problem || ''} ${issue.repair || ''}`;
      return names.some(name => issueNames.includes(name) || issueText.includes(name));
    });
    const routedIssues = relevantIssues.length ? relevantIssues : combinedSevereIssues.filter(issue =>
      !Array.isArray(issue.characterNames) || issue.characterNames.length === 0
    );
    let repaired;
    try {
      repaired = await callNamedArrayAgentWithRepair(
      `你是人物体系字段级修复 Agent。只返回 JSON，不要代码围栏：
{"patches":[{"issueId":"必须对应输入问题ID","characterName":"姓名","changes":[{"field":"只填写需要修复的字段","oldHash":"输入提供的字段哈希","newValue":"修复后的完整字段值","evidence":["事实契约或事件ID"]}]}]}

禁止返回整个人物对象，禁止修改姓名。只修复问题涉及的字段，事实契约中的身份、阵营和命运只能恢复为契约值，不得自行改写。
每个补丁必须提供可核验的事实来源。不得通过删除欲望、冲突或自主性来消除矛盾。
每条审计问题只作用于明确点名的人物，严禁把其他角色的欲望、目标、行为、弧光、高光或命运复制到本批人物。主角、家人、反派、证人和中立角色的功能边界不得互换。
本批最多 2 人，必须输出完整闭合 JSON。`,
      `${context}
本批定向审计问题：${JSON.stringify(routedIssues)}
待修复人物：${JSON.stringify(names.map(name => characterMap.get(name)).filter(Boolean))}
可修改字段当前哈希：${JSON.stringify(names.map(name => {
        const character = characterMap.get(name) || {};
        return {
          name,
          hashes: Object.fromEntries(Object.entries(character).map(([field, value]) => [field, getCharacterFieldHash(value)]))
        };
      }))}
其他人物概要：${JSON.stringify(characters.map(character => ({
        name: character.name,
        roleTier: character.roleTier,
        identity: character.identity,
        faction: character.faction,
        storyFunction: character.storyFunction,
        desire: character.desire,
        goal: character.goal,
        arc: character.arc,
        highlight: character.highlight,
        fate: character.fate
      })))}`,
        'patches',
        onStatus,
        '人物体系修复 Agent'
      );
    } catch (error) {
      onStatus(`修复批次 ${names.join('、')} 返回 JSON 无法修复，已保留原人物并继续后续批次：${error.message}`);
      continue;
    }
    if (repaired.recovered) {
      onStatus(`修复批次 JSON 损坏，拒绝应用不完整补丁，本批保持原设定。`);
      continue;
    }
    const currentCharacters = characters.map(character => characterMap.get(character.name));
    const transaction = applyCharacterPatchTransaction({
      characters: currentCharacters,
      patches: repaired.patches,
      canon: getActiveNovel()?.characterCanon || {},
      novel: getActiveNovel() || {},
      relations,
      targetCount: characters.length
    });
    if (!transaction.committed) {
      onStatus(`修复批次 ${names.join('、')} 未通过事务校验，已整体回滚：${transaction.rejected.join('；') || '修复后问题数量增加'}`);
      continue;
    }
    transaction.characters.forEach(character => characterMap.set(character.name, character));
  }

  onStatus('正在重建受影响的人物关系链...');
  const repairedCharacters = characters.map(character => characterMap.get(character.name));
  const affectedNameSet = new Set(affectedNames);
  const affectedRelations = relations.filter(relation =>
    affectedNameSet.has(relation.source) || affectedNameSet.has(relation.target)
  );
  let repairedRelationsResult;
  try {
    repairedRelationsResult = await callNamedArrayAgentWithRepair(
    `你是人物关系修复 Agent。只返回 JSON：
{"relations":[{"source":"姓名","target":"姓名","type":"关系类型","direction":"双向|source指向target","description":"关系现状与变化轨迹","interestConflict":"利益交集或冲突","evidenceRefs":["event-1|character-canon:姓名|master-outline|synopsis"]}]}
只返回涉及待修复人物且有事实证据的关系。不得产生不存在的人物；无依据或与人物事实契约冲突的关系必须删除，不要求保持原数量。evidenceRefs 必须引用真实存在的事实源。`,
    `${context}
审计问题：${JSON.stringify(combinedSevereIssues)}
人物概要：${JSON.stringify(repairedCharacters.map(character => ({
      name: character.name,
      identity: character.identity,
      faction: character.faction,
      desire: character.desire,
      goal: character.goal,
      fate: character.fate
    })))}
待修复人物：${JSON.stringify(affectedNames)}
待修复关系：${JSON.stringify(affectedRelations)}`,
      'relations',
      onStatus,
      '人物关系修复 Agent'
    );
  } catch (error) {
    onStatus(`关系修复 JSON 无法修复，已保留原受影响关系并交给拓扑自愈：${error.message}`);
    repairedRelationsResult = {
      relations: affectedRelations,
      recovered: true,
      parseError: error.message
    };
  }
  if (repairedRelationsResult.recovered) {
    onStatus(`关系修复 JSON 尾部损坏，已保留 ${repairedRelationsResult.relations.length} 条完整关系。`);
  }
  const untouchedRelations = relations.filter(relation =>
    !affectedNameSet.has(relation.source) && !affectedNameSet.has(relation.target)
  );
  const repairedAffectedRelations = Array.isArray(repairedRelationsResult.relations)
    ? repairedRelationsResult.relations
    : affectedRelations;
  const nextRelations = [...untouchedRelations, ...repairedAffectedRelations];
  const activeNovel = getActiveNovel() || {};
  const beforeJointIssues = validateCharacterSemanticIntegrity({
    characters,
    relations,
    targetCount: characters.length,
    canon: activeNovel.characterCanon || {},
    novel: activeNovel
  });
  const afterJointIssues = validateCharacterSemanticIntegrity({
    characters: repairedCharacters,
    relations: nextRelations,
    targetCount: repairedCharacters.length,
    canon: activeNovel.characterCanon || {},
    novel: activeNovel
  });
  if (afterJointIssues.length > beforeJointIssues.length) {
    onStatus('人物与关系联合校验发现问题数量增加，本轮人物补丁和关系修改已整体回滚。');
    return { characters, relations };
  }
  return {
    characters: repairedCharacters,
    relations: nextRelations
  };
}

function normalizeCharacterData(character, finalRoster, rosterNameSet, requiredFields) {
  character = character && typeof character === 'object' ? character : {};
  character.name = extractCanonicalCharacterName(
    character.name,
    finalRoster.map(item => item.name)
  );
  const normalized = {};
  
  const autoFilledFields = [];
  requiredFields.forEach(field => {
    let val = String(character[field] || '').trim();
    if (!val) {
      autoFilledFields.push(field);
    }
    normalized[field] = val;
  });

  // Hidden identities mapping
  normalized.hiddenIdentities = Array.isArray(character.hiddenIdentities)
    ? character.hiddenIdentities.map(value => String(value).trim()).filter(Boolean)
    : [];

  // Fuzzy name matching helper for relationships
  const findFuzzyRosterName = (targetName) => {
    targetName = String(targetName || '').trim();
    if (!targetName) return null;
    if (rosterNameSet.has(targetName)) return targetName;
    
    // Lowercase match
    for (const name of rosterNameSet) {
      if (name.toLowerCase() === targetName.toLowerCase()) return name;
    }
    
    // Substring match
    for (const name of rosterNameSet) {
      if (name.includes(targetName) || targetName.includes(name)) {
        return name;
      }
    }
    return null;
  };

  // Normalize relationships
  normalized.relationships = (Array.isArray(character.relationships) ? character.relationships : [])
    .map(relation => {
      const fuzzyTarget = findFuzzyRosterName(relation.target);
      return {
        target: fuzzyTarget || String(relation.target || '').trim(),
        type: String(relation.type || '').trim(),
        dynamic: String(relation.dynamic || '').trim(),
        conflict: String(relation.conflict || '').trim()
      };
    })
    .filter(relation =>
      rosterNameSet.has(relation.target) &&
      relation.target !== normalized.name &&
      relation.type
    );

  normalized.roleTier = finalRoster.find(item => item.name === normalized.name)?.roleTier || '重要配角';
  normalized.storyFunction = String(
    normalized.storyFunction ||
    finalRoster.find(item => item.name === normalized.name)?.storyFunction ||
    ''
  ).trim();
  normalized._autoFilledFields = autoFilledFields;
  normalized._invalidRelationshipCount = Math.max(
    0,
    (Array.isArray(character.relationships) ? character.relationships.length : 0) - normalized.relationships.length
  );
  if (autoFilledFields.length || normalized._invalidRelationshipCount > 0) {
    normalized.profileQuality = 'incomplete';
  } else {
    normalized.profileQuality = String(character.profileQuality || 'complete');
  }

  return normalized;
}

function createFallbackCharacter(rosterChar) {
  return {
    name: rosterChar.name,
    identity: rosterChar.identity,
    publicIdentity: rosterChar.identity,
    hiddenIdentities: [],
    identityRevealStage: '无',
    faction: rosterChar.faction,
    factionScope: '所处阵营的活动范围、权力边界与个人权限',
    ageAndAppearance: '符合角色身份、年龄阶段和世界观的辨识度外貌',
    personality: '具有与其身份和利益一致的多面性格，并能独立判断局势',
    lifeHistory: `${rosterChar.name}是${rosterChar.faction}中的${rosterChar.identity}，其经历与主线冲突直接相关。`,
    growthHistory: '在所属阵营、社会规则和关键选择的共同作用下形成当前立场。',
    arc: '从坚持既有认知，到因主动选择承担代价并完成认知变化。',
    highlight: '在总纲关键节点依靠自身能力和选择改变局势，而非依赖巧合。',
    fate: '最终命运由其目标、阵营利益、个人选择及总纲结局共同决定。',
    desire: '争取与其身份经历相符的安全、认可、权力或真相。',
    goal: '完成自身阶段目标，并推动其负责的剧情职能落地。',
    interests: '维护个人生存、核心关系和所属势力利益，同时存在不可退让的底线。',
    agency: '能够根据新信息独立决策，并通过行动影响其他人物和剧情结果。',
    ability: '拥有与身份相匹配的专业能力、社会资源或战斗手段。',
    weakness: '其认知偏差、情感软肋或能力代价会限制选择并制造真实风险。',
    settingBasis: '依据小说背景设定、已审核总纲及左侧世界观条目。',
    plotAnchor: '参与总纲开始、发展、高潮或结局中的关键因果节点。',
    foreshadowLink: '其身份、选择或关系承担一条可在后续回收的剧情因果链。',
    storyFunction: rosterChar.storyFunction,
    roleTier: rosterChar.roleTier,
    relationships: [],
    profileQuality: 'incomplete',
    _autoFilledFields: [
      'factionScope', 'ageAndAppearance', 'personality', 'lifeHistory', 'growthHistory',
      'arc', 'highlight', 'fate', 'desire', 'goal', 'interests', 'agency', 'ability',
      'weakness', 'settingBasis', 'plotAnchor', 'foreshadowLink'
    ]
  };
}

function getCharacterProfileSignature(character) {
  return [
    character.personality,
    character.desire,
    character.goal,
    character.agency,
    character.arc,
    character.highlight,
    character.fate
  ].map(value => String(value || '').replace(/\s+/g, '').slice(0, 80)).join('|');
}

function applyCanonicalCharacterTerms(characters, canon, novel) {
  // 通用流程只允许做有明确事实来源的术语统一。任何针对具体小说、
  // 具体姓名或固定人物模板的改写都必须放入一次性迁移脚本。
  applyFactionReplacementsToCharacters(characters, [], canon, novel);
}

function getCharacterNameMatchScore(candidateName, rosterName) {
  const candidateKey = getRosterNameKey(candidateName);
  const rosterKey = getRosterNameKey(rosterName);
  if (!candidateKey || !rosterKey) return 0;
  if (candidateKey === rosterKey) return 100;
  if (candidateKey.includes(rosterKey) || rosterKey.includes(candidateKey)) return 60;
  return 0;
}

function reconcileCharactersWithRoster(rawCharacters, finalRoster, requiredFields) {
  const rosterNameSet = new Set(finalRoster.map(item => item.name));
  const candidates = (Array.isArray(rawCharacters) ? rawCharacters : [])
    .filter(character => character && typeof character === 'object')
    .map(character => normalizeCharacterData(character, finalRoster, rosterNameSet, requiredFields));
  const unusedCandidateIndexes = new Set(candidates.map((_, index) => index));
  const reconciled = [];
  let fallbackCount = 0;

  finalRoster.forEach(rosterChar => {
    let bestIndex = -1;
    let bestScore = 0;
    unusedCandidateIndexes.forEach(index => {
      const score = getCharacterNameMatchScore(candidates[index]?.name, rosterChar.name);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    let source;
    if (bestIndex >= 0 && bestScore >= 60) {
      source = { ...candidates[bestIndex], name: rosterChar.name };
      unusedCandidateIndexes.delete(bestIndex);
    } else {
      source = createFallbackCharacter(rosterChar);
      fallbackCount += 1;
    }
    reconciled.push(normalizeCharacterData(source, finalRoster, rosterNameSet, requiredFields));
  });

  return { characters: reconciled, fallbackCount };
}

function normalizeAndHealRelations(rawRelations, characters, targetCount) {
  const safeCharacters = (Array.isArray(characters) ? characters : [])
    .filter(character => character && typeof character.name === 'string' && character.name.trim());
  const nameSet = new Set(safeCharacters.map(character => character.name));
  const characterNames = safeCharacters.map(character => character.name);

  function cleanName(name) {
    return String(name || '')
      .replace(/[（\(\^[\【].*?[）\)]\】]/g, '')
      .replace(/(已故|幼年|青年|中年|老年|前世|后世|化身)/g, '')
      .trim();
  }

  function findFuzzyRosterName(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    if (nameSet.has(trimmed)) return trimmed;

    const cleanedTarget = cleanName(trimmed);
    if (!cleanedTarget) return null;

    for (const officialName of characterNames) {
      if (cleanName(officialName) === cleanedTarget) {
        return officialName;
      }
    }
    for (const officialName of characterNames) {
      const cleanedOfficial = cleanName(officialName);
      if (cleanedOfficial.includes(cleanedTarget) || cleanedTarget.includes(cleanedOfficial)) {
        return officialName;
      }
    }
    for (const officialName of characterNames) {
      if (officialName.includes(trimmed) || trimmed.includes(officialName)) {
        return officialName;
      }
    }
    return null;
  }

  const relationsArray = Array.isArray(rawRelations) ? rawRelations : [];
  let validRelations = [];
  const seenPairs = new Set();

  relationsArray.forEach(relation => {
    const rawSource = String(relation.source || '').trim();
    const rawTarget = String(relation.target || '').trim();
    const source = findFuzzyRosterName(rawSource);
    const target = findFuzzyRosterName(rawTarget);

    if (source && target && source !== target) {
      const type = String(relation.type || '关联').trim();
      const direction = String(relation.direction || '双向').trim();
      const description = String(relation.description || '因剧情发展产生的因果交集').trim();
      const interestConflict = String(relation.interestConflict || '立场与利益上的潜在冲突').trim();
      const evidenceRefs = [...new Set(
        (Array.isArray(relation.evidenceRefs) ? relation.evidenceRefs : [])
          .map(value => String(value || '').trim())
          .filter(Boolean)
      )];

      const key = `${source}->${target}`;
      const revKey = `${target}->${source}`;
      if (!seenPairs.has(key)) {
        validRelations.push({
          source,
          target,
          type,
          direction,
          description,
          interestConflict,
          evidenceRefs
        });
        seenPairs.add(key);
        if (direction === '双向') {
          seenPairs.add(revKey);
        }
      }
    }
  });

  return validRelations;
}

function normalizeRosterEntry(item) {
  const entry = {
    name: String(item?.name || '').trim(),
    identity: String(item?.identity || '').trim(),
    roleTier: String(item?.roleTier || '重要配角').trim(),
    faction: String(item?.faction || '').trim(),
    storyFunction: String(item?.storyFunction || '').trim()
  };
  if (!['核心主角', '主要人物', '重要配角'].includes(entry.roleTier)) {
    entry.roleTier = '重要配角';
  }
  return entry;
}

function getRosterNameKey(name) {
  return String(name || '')
    .replace(/\s+/g, '')
    .replace(/[•・]/g, '·')
    .replace(/[·._\-—"'“”‘’（）()【】[\]]/g, '')
    .toLowerCase();
}

function isValidRosterEntry(entry) {
  return Boolean(
    entry.name &&
    entry.identity &&
    entry.faction &&
    entry.storyFunction &&
    !/(路人[甲乙丙丁]|无名氏|某某|待定|未命名|角色\d+|其他|若干|众人|诸人|哥哥们|兄弟们|姐妹们|群体|一众)/.test(entry.name)
  );
}

function summarizeRosterCoverage(roster) {
  const buckets = {
    core: [],
    family: [],
    formerSect: [],
    antagonist: [],
    neutral: [],
    civilian: [],
    hidden: []
  };
  roster.forEach(character => {
    const text = `${character.name} ${character.identity} ${character.faction} ${character.storyFunction}`;
    if (character.roleTier === '核心主角' || /(主角|女主|男主)/.test(text)) buckets.core.push(character.name);
    if (/(家族|家人|亲属|父|母|兄|姐|弟|妹|伴侣|监护)/.test(text)) buckets.family.push(character.name);
    if (/(组织|门派|宗门|公司|学校|官署|军队|家族势力|机构)/.test(text)) buckets.formerSect.push(character.name);
    if (/(反派|敌对|对手|幕后|竞争|阻挠|追捕|压迫)/.test(text)) buckets.antagonist.push(character.name);
    if (/(中立|商会|情报|医者|律师|记者|盟友|顾问|专业)/.test(text)) buckets.neutral.push(character.name);
    if (/(普通人|居民|村|城镇|社区|百姓|教师|商贩|工人)/.test(text)) buckets.civilian.push(character.name);
    if (/(隐藏|隐秘|秘密|失踪|卧底|潜伏|证人|知情人)/.test(text)) buckets.hidden.push(character.name);
  });
  const targets = { core: 1, family: 3, formerSect: 5, antagonist: 5, neutral: 4, civilian: 3, hidden: 3 };
  const labels = {
    core: '核心主角',
    family: '家人与亲缘线',
    formerSect: '主要组织与制度人物',
    antagonist: '对抗与利益冲突人物',
    neutral: '中立/专业人物',
    civilian: '社会生活人物',
    hidden: '秘密、证人与伏笔人物'
  };
  const gaps = Object.entries(targets)
    .filter(([key, target]) => buckets[key].length < target)
    .map(([key, target]) => `${labels[key]}缺 ${target - buckets[key].length} 人`);
  return {
    counts: Object.fromEntries(Object.entries(buckets).map(([key, names]) => [labels[key], names.length])),
    gaps,
    recentNames: roster.slice(-20).map(character => character.name)
  };
}

async function generateCompleteRoster({
  targetCount,
  context,
  task,
  worldAnchors,
  requiredCharacters = [],
  seedRoster = [],
  canon = {},
  onCheckpoint = () => {},
  onStatus
}) {
  const rosterMap = new Map();
  seedRoster.map(normalizeRosterEntry).forEach(entry => {
    if (isValidRosterEntry(entry)) {
      rosterMap.set(getRosterNameKey(entry.name), entry);
    }
  });
  requiredCharacters.forEach((character, index) => {
    const entry = normalizeRosterEntry({
      name: character.name,
      identity: character.role || '简介明确角色',
      roleTier: /(主角|女主|男主)/.test(character.role || '') || index === 0
        ? '核心主角'
        : '主要人物',
      faction: character.faction || '待剧情确认',
      storyFunction: character.storyFunction || '落实简介中的关键人物承诺'
    });
    if (isValidRosterEntry(entry)) {
      rosterMap.set(getRosterNameKey(entry.name), entry);
    }
  });
  let lastError = null;
  let stalledRounds = 0;
  let lowYieldRounds = 0;
  let lastRejectionSummary = '';
  let lastRejectedNames = [];
  const maxAttempts = Math.max(18, Math.ceil(targetCount / 4) + 8);
  const roleFocuses = [
    '与核心人物存在长期利益关系、但拥有独立目标的人物',
    '主要组织中的决策者、执行者、受益者与内部异议者',
    '对抗方的决策者、执行者、利益盟友与潜在背叛者',
    '中立组织、专业职业、地方秩序与信息渠道人物',
    '掌握历史秘密、关键证据或伏笔回收条件的人物',
    '承担社会后果、生活压力和现实常识约束的关键人物'
  ];

  for (let attempt = 0; attempt < maxAttempts && rosterMap.size < targetCount; attempt += 1) {
    const remaining = targetCount - rosterMap.size;
    const requestCount = rosterMap.size === 0
      ? Math.min(10, targetCount)
      : Math.min(stalledRounds >= 2 ? 4 : lowYieldRounds >= 2 ? 8 : stalledRounds === 1 ? 4 : 8, remaining);
    const existingRoster = [...rosterMap.values()];
    const existingNames = existingRoster.map(character => character.name);
    const coverage = summarizeRosterCoverage(existingRoster);
    const progress = 10 + Math.round((rosterMap.size / targetCount) * 4);
    const status = rosterMap.size === 0
      ? `正在分批规划首批 ${requestCount} 位人物...`
      : `已获得 ${rosterMap.size}/${targetCount} 位有效人物，正在补齐剩余 ${remaining} 位...`;
    onStatus(status, '人物架构 Agent', progress);

    try {
      const rosterResult = await callNamedArrayAgentWithRepair(
        `你是长篇小说人物架构 Agent。请只返回 JSON，不要代码围栏：
{"characters":[{"name":"姓名","identity":"具体身份","roleTier":"核心主角|主要人物|重要配角","faction":"阵营","storyFunction":"不可替代的剧情功能"}]}

本轮必须返回 ${requestCount} 个全新具名人物。要求：
1. 姓名必须唯一、符合世界观，严禁路人甲、某某、无名氏、角色1等占位名。
2. 每个人都必须填写具体身份、所属阵营和不可替代的剧情功能。
3. 不得与已有姓名重复，也不得只改变称谓、空格或符号制造伪新人物。
4. 总名册需要覆盖核心人物、亲密关系、主要组织、对抗方、中立专业者、社会生活人物和秘密知情者；具体类别必须服从当前背景，不得强塞不属于该题材的门派、魔族、公司或家族。
5. 人物必须服务背景设定、简介、总纲和左侧设定，不得另起世界观。
6. 同一家庭或势力中的人物必须拥有不同利益、能力边界、主动选择和代价，不能共享单一模板。
7. 本轮重点补充：${roleFocuses[attempt % roleFocuses.length]}。
8. 只生成本轮新增人物，不得复述、改写或补全已有名册人物.
9. 输出保持简洁，每个字段控制在 30 字以内，确保 JSON 完整闭合。
10. 可用世界观依据：${worldAnchors.join('；')}。`,
        `${context}
用户任务：${task}
禁止使用的已有姓名：${existingNames.length ? JSON.stringify(existingNames) : '无'}${lastRejectionSummary ? `\n前几轮构思被系统拒绝的原因：${lastRejectionSummary}。请避免这些问题并确保返回符合规则的人物。` : ''}${lastRejectedNames && lastRejectedNames.length ? `\n禁止再次生成的无效/重复姓名：${lastRejectedNames.join('、')}` : ''}
当前名册覆盖统计：${JSON.stringify(coverage.counts)}
当前明确缺口：${coverage.gaps.length ? coverage.gaps.join('；') : '各类基础覆盖已满足，继续补充有独立利益链的角色'}
最近生成姓名：${JSON.stringify(coverage.recentNames)}
当前已有 ${rosterMap.size} 人，目标至少 ${targetCount} 人，本轮请补充 ${requestCount} 人。`,
        'characters',
        status => onStatus(status, '人物架构 Agent', progress),
        '人物架构 Agent'
      );
      const candidates = rosterResult.characters;
      let accepted = 0;
      const rejectionCounts = new Map();
      const rejectedNamesThisRound = [];

      candidates.map(normalizeRosterEntry).forEach(entry => {
        if (rosterMap.size >= targetCount) return;
        const key = getRosterNameKey(entry.name);
        if (rosterMap.has(key)) {
          rejectionCounts.set('姓名与现有名册重复', (rejectionCounts.get('姓名与现有名册重复') || 0) + 1);
          if (entry.name) rejectedNamesThisRound.push(entry.name);
          return;
        }

        const issues = [];
        if (!entry.name) {
          issues.push('姓名为空');
        } else {
          const nameIssues = validateCharacterName(entry.name);
          if (nameIssues.length) {
            issues.push(...nameIssues);
          }
        }
        if (!entry.identity) {
          issues.push('缺少具体身份');
        }
        if (!['核心主角', '主要人物', '重要配角'].includes(entry.roleTier)) {
          issues.push('角色层级无效');
        }
        if (!entry.faction) {
          issues.push('缺少所属阵营');
        }
        if (!entry.storyFunction) {
          issues.push('缺少不可替代的剧情功能');
        }

        if (issues.length) {
          issues.forEach(issue => rejectionCounts.set(issue, (rejectionCounts.get(issue) || 0) + 1));
          if (entry.name) rejectedNamesThisRound.push(entry.name);
          return;
        }

        rosterMap.set(key, entry);
        accepted += 1;
      });

      lastRejectionSummary = [...rejectionCounts.entries()]
        .map(([reason, count]) => `${reason} ${count} 人`)
        .join('；');
      lastRejectedNames = [...new Set([...lastRejectedNames, ...rejectedNamesThisRound])].slice(-15);

      onCheckpoint([...rosterMap.values()]);
      stalledRounds = accepted === 0 ? stalledRounds + 1 : 0;
      lowYieldRounds = accepted > 0 && accepted < Math.min(3, requestCount)
        ? lowYieldRounds + 1
        : 0;
      lastError = rosterResult.recovered
        ? new Error(`JSON 不完整，已抢救 ${candidates.length} 个完整人物对象：${rosterResult.parseError}`)
        : null;
      onStatus(
        `第 ${attempt + 1} 轮返回 ${candidates.length} 人${rosterResult.recovered ? '（JSON 尾部损坏，已容错提取）' : ''}，去重校验后新增 ${accepted} 人，当前 ${rosterMap.size}/${targetCount}${lastRejectionSummary ? `；拒绝：${lastRejectionSummary}` : ''}。`,
        '人物架构 Agent',
        Math.min(14, progress + 1)
      );
      if ((stalledRounds >= 4 || lowYieldRounds >= 3) && rosterMap.size < targetCount) {
        break;
      }
    } catch (error) {
      lastError = error;
      stalledRounds += 1;
      onStatus(
        `第 ${attempt + 1} 轮未提取到有效人物，下一轮将缩小为最多 4 人：${error.message}`,
        '人物架构 Agent',
        progress
      );
      if ([400, 401, 403, 404].includes(error.status)) throw error;
      if (stalledRounds >= 4 && rosterMap.size < targetCount) {
        break;
      }
    }
  }

  if (rosterMap.size < targetCount) {
    throw new Error(
      `人物名册生成停滞：当前只有 ${rosterMap.size}/${targetCount} 位有效具名人物。` +
      `${lastError ? ` 最近错误：${lastError.message}` : ''} 系统拒绝使用模板人物补足。`
    );
  }
  return [...rosterMap.values()].slice(0, targetCount);
}

function getCharacterRosterFingerprint(novel, targetCount) {
  return JSON.stringify({
    targetCount,
    background: novel.background || '',
    synopsis: novel.synopsis || '',
    masterOutline: novel.masterOutline || {}
  });
}

function getCharacterDeepeningBatchSize(roster, startIndex) {
  const tier = roster[startIndex]?.roleTier;
  if (tier === '核心主角') {
    return roster[startIndex + 1]?.roleTier === '核心主角' ? 2 : 1;
  }
  if (tier === '主要人物') return 3;
  return 4;
}

function buildCharacterEvidencePackage(novel, canon, batch) {
  const names = new Set(batch.map(character => character.name));
  const contracts = (canon?.characterCanon?.contracts || []).filter(contract => names.has(contract.name));
  const anchorIds = new Set(contracts.flatMap(contract => contract.eventAnchors || []));
  const events = (novel.eventCards || []).filter(event => {
    if (anchorIds.has(event.id)) return true;
    const value = JSON.stringify(event);
    return [...names].some(name => value.includes(name));
  });
  const factions = (novel.factionPlans || []).filter(plan => {
    const value = JSON.stringify(plan);
    return batch.some(character =>
      value.includes(character.faction) ||
      value.includes(character.name)
    );
  });
  return {
    precedence: canon?.characterCanon?.precedence || [],
    contracts,
    events,
    factions,
    outline: novel.masterOutline
  };
}

class AgentStateManager {
  constructor(taskType) {
    this.taskType = taskType; // 'character' | 'outline'
    this.currentState = 'IDLE';
    this.logs = [];
    this.nodes = [];
    this.progress = 0;
    this.initUI();
  }

  initUI() {
    const modal = document.getElementById('agent-progress-modal');
    if (modal) modal.classList.remove('hidden');

    const logContainer = document.getElementById('agent-log-content');
    if (logContainer) logContainer.innerHTML = '';
    
    const nodesContainer = document.getElementById('agent-nodes-container');
    if (nodesContainer) nodesContainer.innerHTML = '';

    const resultPanel = document.getElementById('agent-result-panel');
    if (resultPanel) {
      resultPanel.classList.add('hidden');
      resultPanel.className = 'agent-result-panel';
    }

    const actionBtn = document.getElementById('btn-progress-action');
    if (actionBtn) actionBtn.classList.add('hidden');
    
    const closeBtn = document.getElementById('btn-progress-close');
    if (closeBtn) closeBtn.classList.add('hidden');

    if (this.taskType === 'character') {
      this.nodes = [
        { id: 'roster', name: '名册规划' },
        { id: 'deepening', name: '档案深化' },
        { id: 'topology', name: '关系拓扑' },
        { id: 'audit', name: '逻辑审计' },
        { id: 'review', name: '完成协同' }
      ];
    } else if (this.taskType === 'plot') {
      this.nodes = [
        { id: 'architecture', name: '卷级架构' },
        { id: 'chapters', name: '章节编排' },
        { id: 'validation', name: '因果审计' },
        { id: 'review', name: '人工审核' }
      ];
    } else if (this.taskType === 'final-audit') {
      this.nodes = [
        { id: 'hard-check', name: '规则硬检' },
        { id: 'cross-audit', name: '跨域终审' },
        { id: 'repair', name: '定向修复' },
        { id: 'final-review', name: '全书复审' },
        { id: 'review', name: '人工审核' }
      ];
    } else {
      this.nodes = [
        { id: 'analysis', name: '多维分析' },
        { id: 'integration', name: '总编整合' },
        { id: 'audit', name: '总纲审核' },
        { id: 'review', name: '完成协同' }
      ];
    }

    if (nodesContainer) {
      this.nodes.forEach(node => {
        const nodeEl = document.createElement('div');
        nodeEl.className = 'agent-node';
        nodeEl.id = `agent-node-${node.id}`;
        nodeEl.innerHTML = `
          <div class="agent-node-dot">●</div>
          <div class="agent-node-name">${node.name}</div>
        `;
        nodesContainer.appendChild(nodeEl);
      });
    }

    this.updateProgress(0);
    this.log('系统', '协同创作系统初始化，准备就绪。', 'system');
  }

  updateNodeState(nodeId, state) {
    const nodeEl = document.getElementById(`agent-node-${nodeId}`);
    if (nodeEl) {
      nodeEl.classList.remove('active', 'completed');
      if (state === 'active') nodeEl.classList.add('active');
      if (state === 'completed') nodeEl.classList.add('completed');
    }
    if (activeAgentRuntime?.run) {
      activeAgentRuntime.setStage(nodeId, state === 'active' ? 'running' : state);
      if (state === 'completed') {
        activeAgentRuntime.checkpoint(nodeId, `${nodeId} 阶段已完成`, `${this.taskType}:${nodeId}`);
      }
    }
  }

  updateProgress(percentage) {
    this.progress = Math.min(100, Math.max(0, percentage));
    if (activeAgentRuntime?.run) {
      activeAgentRuntime.run.progress = this.progress;
      activeAgentRuntime.persist();
    }
    const progressBar = document.getElementById('agent-progress-bar');
    const progressText = document.getElementById('agent-progress-percentage');
    if (progressBar) progressBar.style.width = `${this.progress}%`;
    if (progressText) progressText.textContent = `${Math.round(this.progress)}%`;
  }

  log(agentName, message, type = 'info') {
    const logContainer = document.getElementById('agent-log-content');
    if (!logContainer) return;
    this.logs.push({ agentName, message, type, time: new Date().toISOString() });
    if (this.logs.length > 300) this.logs.splice(0, this.logs.length - 300);
    const logLine = document.createElement('div');
    logLine.className = `log-line ${type}`;
    const time = new Date().toLocaleTimeString();
    logLine.innerHTML = `[${time}] <strong>${escapeHtml(agentName)}</strong>: ${escapeHtml(message)}`;
    logContainer.appendChild(logLine);
    while (logContainer.children.length > 300) {
      logContainer.removeChild(logContainer.firstElementChild);
    }
    logContainer.scrollTop = logContainer.scrollHeight;
    
    const mainStatusText = document.getElementById('agent-task-status-text');
    if (mainStatusText) {
      mainStatusText.textContent = `[${agentName}] ${message}`;
    }
  }

  success(title, desc, onAction) {
    this.currentState = 'SUCCESS';
    this.updateProgress(100);
    
    this.nodes.forEach(node => this.updateNodeState(node.id, 'completed'));

    const resultPanel = document.getElementById('agent-result-panel');
    if (resultPanel) {
      resultPanel.className = 'agent-result-panel success';
      resultPanel.innerHTML = `
        <div class="agent-result-icon">✓</div>
        <h4 class="agent-result-title">${escapeHtml(title)}</h4>
        <p class="agent-result-desc">${escapeHtml(desc)}</p>
      `;
      resultPanel.classList.remove('hidden');
    }

    const actionBtn = document.getElementById('btn-progress-action');
    if (actionBtn) {
      actionBtn.classList.remove('hidden');
      actionBtn.onclick = () => {
        this.close();
        if (onAction) onAction();
      };
    }

    const closeBtn = document.getElementById('btn-progress-close');
    if (closeBtn) {
      closeBtn.classList.remove('hidden');
      closeBtn.onclick = () => this.close();
    }

    this.log('系统', '任务顺利完成，已准备好供用户审核。', 'success');
    activeAgentRuntime?.awaitingReview(`${title}：${desc}`);
  }

  failure(errorMsg) {
    this.currentState = 'FAILURE';
    
    const progressBar = document.getElementById('agent-progress-bar');
    if (progressBar) {
      progressBar.style.background = 'var(--danger-color)';
    }

    const resultPanel = document.getElementById('agent-result-panel');
    if (resultPanel) {
      resultPanel.className = 'agent-result-panel failure';
      resultPanel.innerHTML = `
        <div class="agent-result-icon">✗</div>
        <h4 class="agent-result-title">协同任务执行失败</h4>
        <p class="agent-result-desc">${escapeHtml(errorMsg)}</p>
      `;
      resultPanel.classList.remove('hidden');
    }

    const closeBtn = document.getElementById('btn-progress-close');
    if (closeBtn) {
      closeBtn.classList.remove('hidden');
      closeBtn.onclick = () => this.close();
    }

    this.log('系统', `执行发生错误：${errorMsg}`, 'error');
    activeAgentRuntime?.fail(new Error(errorMsg));
  }

  close() {
    const modal = document.getElementById('agent-progress-modal');
    if (modal) modal.classList.add('hidden');
  }
}

async function buildCharacterSystem(task, onStatus = () => {}, stateManager = null) {
  const novel = getActiveNovel();
  if (!novel) throw new Error('当前没有可处理的小说。');
  if (!novel.masterOutline) {
    throw new Error('请先生成并审核通过全书总纲，再构建人物体系。');
  }
  if (novel.consistencyStatus?.needsReaudit) {
    throw new Error('背景设定或作品简介已修改，旧总纲不再可信。请先重新执行第一步生成总纲。');
  }
  const runtime = await new AgentRuntime(task, novel, onStatus).prepare(['character-system']);
  const targetCount = getRequestedCharacterCount(task);
  const canon = await reconcileCharacterCanon(novel, onStatus);
  const context = compactString(`${runtime.baseContext}

角色事实裁决与人物构建上下文：
${getCharacterContext(novel, task, canon)}`, AGENT_CONTEXT_BUDGET.maxPromptChars);
  const rosterFingerprint = getCharacterRosterFingerprint(novel, targetCount);
  const seedRoster = novel.characterRosterDraft?.fingerprint === rosterFingerprint
    ? novel.characterRosterDraft.characters || []
    : [];
  if (seedRoster.length) {
    onStatus(
      `已恢复上次保存的 ${seedRoster.length}/${targetCount} 位有效人物，继续补齐名册。`,
      '人物架构 Agent',
      10
    );
  }
  const worldAnchors = (novel.assets || [])
    .filter(asset => ['location', 'faction', 'system', 'main-outline', 'secret-clue', 'planting', 'payoff'].includes(asset.type))
    .map(asset => `${asset.type}｜${asset.name}`)
    .slice(0, 80);

  if (stateManager) stateManager.updateNodeState('roster', 'active');
  onStatus(`正在规划至少 ${targetCount} 人名册与阵营分布...`, '人物架构 Agent', 10);
  let finalRoster = await generateCompleteRoster({
    targetCount,
    context,
    task: `${task}
必须纳入的角色事实：${JSON.stringify(canon.canonicalCharacters)}
必须统一使用的势力名称：${JSON.stringify(canon.canonicalFactions)}`,
    worldAnchors,
    requiredCharacters: canon.canonicalCharacters,
    seedRoster,
    canon,
    onCheckpoint: characters => {
      novel.characterRosterDraft = {
        fingerprint: rosterFingerprint,
        characters,
        updatedAt: new Date().toISOString()
      };
      saveState();
    },
    onStatus
  });
  canon.characterCanon = extendCharacterCanonContracts(canon.characterCanon, finalRoster, novel);
  novel.characterCanon = canon.characterCanon;
  saveState();
  onStatus(`名册规划完成：已获得 ${finalRoster.length} 位有效且不重名的人物。`, '人物架构 Agent', 15);
  const rosterReference = JSON.stringify(finalRoster);
  const characters = [];

  // Load saved deepening draft if fingerprint matches
  let existingDeepenedMap = new Map();
  if (novel.characterDeepeningDraft?.fingerprint === rosterFingerprint) {
    const loadedCharacters = novel.characterDeepeningDraft.characters || [];
    loadedCharacters.forEach(c => {
      if (c && c.name) {
        existingDeepenedMap.set(c.name, c);
      }
    });
    if (existingDeepenedMap.size > 0) {
      onStatus(
        `已恢复上次保存的 ${existingDeepenedMap.size}/${finalRoster.length} 位人物的详细档案，继续构思剩余人物。`,
        '人物深化 Agent',
        15
      );
    }
  }
  if (novel.characterSystemDraft?.fingerprint === rosterFingerprint) {
    const savedBestCharacters = novel.characterSystemDraft.characters || [];
    savedBestCharacters.forEach(character => {
      if (character?.name) existingDeepenedMap.set(character.name, character);
    });
    if (savedBestCharacters.length) {
      onStatus(
        `已载入上次隔离草稿中的 ${savedBestCharacters.length} 位最佳候选，继续修复而非重新生成。`,
        '人物深化 Agent',
        15
      );
    }
  }

  if (stateManager) {
    stateManager.updateNodeState('roster', 'completed');
    stateManager.updateNodeState('deepening', 'active');
  }

  for (let index = 0; index < finalRoster.length;) {
    const batchSize = getCharacterDeepeningBatchSize(finalRoster, index);
    const batch = finalRoster.slice(index, index + batchSize);
    const nextIndex = index + batch.length;
    const batchNames = batch.map(c => c.name).join('、');
    const evidencePackage = buildCharacterEvidencePackage(novel, canon, batch);
    const startProgress = 15;
    const endProgress = 65;
    const currentProgress = startProgress + Math.round((index / finalRoster.length) * (endProgress - startProgress));
    
    // Check if ALL characters in this batch have already been deepened and saved
    const allInBatchAlreadyDeepened = batch.every(c => existingDeepenedMap.has(c.name));
    if (allInBatchAlreadyDeepened) {
      onStatus(`已跳过已构思的第 ${index + 1}-${index + batch.length} 位人物（${batchNames}）`, '人物深化 Agent', currentProgress);
      batch.forEach(c => {
        characters.push(existingDeepenedMap.get(c.name));
      });
      index = nextIndex;
      continue;
    }

    let detailResult = null;
    const attempts = 3;
    const batchFailures = [];
    
    for (let tryCount = 1; tryCount <= attempts; tryCount += 1) {
      let retryPrompt = '';
      if (batchFailures.length) {
        retryPrompt = `\n\n【警告】前几次尝试构思失败，原因如下，请严格修正：\n${batchFailures.slice(-3).map(f => `- ${f}`).join('\n')}\n请重新生成本批，并确保每个角色的字段完整且姓名与指定名册完全一致。`;
      }
      
      onStatus(`正在构思第 ${index + 1}-${index + batch.length} 位人物（${batchNames}，尝试第 ${tryCount}/${attempts} 次）...`, '人物深化 Agent', currentProgress);
      
      try {
        detailResult = await callNamedArrayAgentWithRepair(
          `你是人物深度塑造 Agent。请只返回 JSON，不要代码围栏：
{"characters":[{
  "name":"必须与指定名册一致",
  "identity":"身份",
  "publicIdentity":"公开身份",
  "hiddenIdentities":["隐藏身份，可为空数组"],
  "identityRevealStage":"隐藏身份揭露阶段与触发条件；无隐藏身份写无",
  "faction":"阵营",
  "factionScope":"所属势力的地理范围、权力边界与人物权限",
  "ageAndAppearance":"年龄阶段与辨识度外貌",
  "personality":"多面性格与行为模式",
  "lifeHistory":"人物生平",
  "growthHistory":"成长史及关键转折",
  "arc":"人物弧光",
  "highlight":"人物高光时刻",
  "fate":"最终命运及原因",
  "desire":"内心欲望",
  "goal":"阶段与长期目标",
  "interests":"维护的利益及底线",
  "agency":"独立判断、主动选择和改变局势的方式",
  "ability":"能力与资源",
  "weakness":"缺陷、代价与盲区",
  "settingBasis":"明确写出该人物依据的左侧设定名称或背景条款",
  "plotAnchor":"明确写出该人物参与总纲的开始/发展/高潮/结局哪个阶段及关键事件",
  "foreshadowLink":"该人物关联的伏笔、秘密与回收方式；无伏笔时说明其因果作用",
  "relationships":[{"target":"名册中的具名人物","type":"关系类型","dynamic":"关系变化","conflict":"利益或情感冲突"}]
}]}

要求：每项字段必须具体且非空。每个人必须有独立思考、主观能动性、欲望、目标和利益，不得沦为推动主角的工具人。每人至少关联 3 个名册中的具名人物。人物不得偏离总纲、背景、简介和左侧设定；settingBasis、plotAnchor、foreshadowLink 必须能被现有上下文验证。
  同一家庭、门派或势力中的人物也必须拥有不同职业、私欲、缺陷、能力边界、高光和命运，不得共享同一人物模板，不得全部只服务主角。
本批人数已经按人物层级限制：核心主角最多2人、主要人物最多3人、重要配角最多4人。字段要具体但保持简洁，严禁长篇散文，必须输出完整闭合 JSON。`,
          `${context}
全体人物名册：${rosterReference}
本批必须深化：${JSON.stringify(batch)}
本批唯一有效证据包：${JSON.stringify(evidencePackage)}

注意：名册只提供身份骨架，不能照抄为最终档案。事实契约字段不得改写；无证据时不得新增身份、能力、关系或命运。必须为本批每个人补出独立生平、具体欲望、利益底线、主动选择、性格缺陷、成长代价、关系压力和高光时刻；同阵营人物不得共享同一人物弧光、同一高光和同一最终命运。${retryPrompt}`,
          'characters',
          status => onStatus(status, '人物深化 Agent', currentProgress),
          '人物深化 Agent'
        );
        
        const batchCharacters = detailResult.characters;
        const returnedNames = batchCharacters.map(character => String(character?.name || '').trim());
        
        if (batchCharacters.length !== batch.length) {
          throw new Error(`返回人物数量不匹配（期望 ${batch.length} 人，实际返回 ${batchCharacters.length} 人）`);
        }
        
        const missingNames = batch.filter(c => !returnedNames.includes(c.name)).map(c => c.name);
        if (missingNames.length > 0) {
          throw new Error(`缺少以下要求人物的详细档案：${missingNames.join('、')}。请检查是否拼写错误或遗漏`);
        }
        
        if (new Set(returnedNames).size !== returnedNames.length) {
          throw new Error(`返回的人物名称存在重复：${returnedNames.join('、')}`);
        }
        
        // Success for this batch!
        characters.push(...batchCharacters);
        
        // Save current progress to local storage draft
        novel.characterDeepeningDraft = {
          fingerprint: rosterFingerprint,
          characters: characters,
          updatedAt: new Date().toISOString()
        };
        saveState();
        break; // break retry loop
        
      } catch (error) {
        batchFailures.push(error.message);
        if (tryCount === attempts) {
          throw new Error(
            `第 ${index + 1}-${index + batch.length} 位人物档案生成失败，尝试 ${attempts} 次后仍无法成功：${error.message}`
          );
        }
        onStatus(`第 ${index + 1}-${index + batch.length} 位人物构思第 ${tryCount} 次尝试失败，正在重试：${error.message}`, '人物深化 Agent', currentProgress);
      }
    }
    index = nextIndex;
  }

  const requiredFields = [
    'name', 'identity', 'publicIdentity', 'identityRevealStage', 'faction', 'factionScope',
    'ageAndAppearance', 'personality', 'lifeHistory',
    'growthHistory', 'arc', 'highlight', 'fate', 'desire', 'goal', 'interests',
    'agency', 'ability', 'weakness', 'settingBasis', 'plotAnchor', 'foreshadowLink'
  ];
  const rosterNameSet = new Set(finalRoster.map(item => item.name));
  const initialReconciliation = reconcileCharactersWithRoster(characters, finalRoster, requiredFields);
  let finalCharacters = initialReconciliation.characters;
  applyCanonicalCharacterTerms(finalCharacters, canon, novel);
  const incomplete = finalCharacters.filter(character =>
    character.profileQuality === 'fallback' ||
    character.profileQuality === 'incomplete' ||
    (character._autoFilledFields || []).length > 0 ||
    requiredFields.some(field => !character[field]) ||
    !character.storyFunction ||
    character.relationships.length < 3 ||
    (character.hiddenIdentities.length > 0 && character.identityRevealStage === '无')
  );
  if (initialReconciliation.fallbackCount > 0) {
    onStatus(
      `档案深化有 ${initialReconciliation.fallbackCount} 位人物未被模型完整返回，已标记 incomplete 并阻止验收。`,
      '人物深化 Agent',
      68
    );
  }
  if (
    finalCharacters.length !== targetCount ||
    finalCharacters.some(character => !character?.name) ||
    new Set(finalCharacters.map(character => character.name)).size !== targetCount ||
    incomplete.length
  ) {
    throw new Error(
      `人物档案对齐失败：目标 ${targetCount} 人，实际 ${finalCharacters.filter(Boolean).length} 人，字段不完整 ${incomplete.length} 人。`
    );
  }

  if (stateManager) {
    stateManager.updateNodeState('deepening', 'completed');
    stateManager.updateNodeState('topology', 'active');
  }
  onStatus('正在构建全局人物关系网与利益冲突...', '关系拓扑 Agent', 75);
  if (finalCharacters.some(character => !character?.name)) {
    throw new Error('关系拓扑启动前发现无效人物对象，请重新执行人物档案深化。');
  }
  const topologyResult = await callJsonAgentWithRepair(
    `你是人物关系拓扑 Agent。请只返回 JSON，不要代码围栏：
{"relations":[{"source":"姓名","target":"姓名","type":"关系类型","direction":"双向|source指向target","description":"关系现状与变化轨迹","interestConflict":"双方利益交集或冲突","evidenceRefs":["event-1|character-canon:姓名|master-outline|synopsis"]}]}

要求：
1. source 和 target 必须来自给定名册，不能新造姓名。
2. 至少输出 ${targetCount} 条有效关系，覆盖亲缘、师徒、盟友、敌对、利用、债务、竞争、隐秘关联等。
3. 人物档案中的 relationships 只是关系意图；必须结合双方档案、事实契约和事件证据统一编译。
4. 关系必须服务总纲，并体现人物各自的利益、欲望和主动选择；没有双方证据的关系不得生成。
5. evidenceRefs 至少提供一个可核验来源；禁止写“推测”“剧情需要”或虚构不存在的事件 ID。`,
    `${context}
人物概要：${JSON.stringify(finalCharacters.map(character => ({
      name: character.name,
      identity: character.identity,
      faction: character.faction,
      desire: character.desire,
      goal: character.goal,
      interests: character.interests,
      relationshipIntents: character.relationships
    })))}
人物事实契约：${JSON.stringify(canon.characterCanon)}`,
    status => onStatus(status, '关系拓扑 Agent', 75),
    '关系拓扑 Agent'
  );
  let relations = normalizeAndHealRelations(topologyResult.relations, finalCharacters, targetCount);
  applyFactionReplacementsToCharacters(finalCharacters, relations, canon, novel);
  if (getNovelStylePolicy(novel).premodern) {
    replaceStoryStyleTerms(finalCharacters, PREMODERN_STYLE_REPLACEMENTS, 'characters');
    replaceStoryStyleTerms(relations, PREMODERN_STYLE_REPLACEMENTS, 'relations');
  }
  if (relations.length < targetCount) {
    console.warn(`人物关系拓扑不足自愈警告：仅有 ${relations.length} 条有效关系，小于要求的 ${targetCount} 条。`);
  }

  if (stateManager) {
    stateManager.updateNodeState('topology', 'completed');
    stateManager.updateNodeState('audit', 'active');
  }

  const auditOnStatus = (status) => {
    let pct = 80;
    const match = status.match(/正在检查第 (\d+)/);
    if (match) {
      const idx = Number(match[1]) - 1;
      pct = 80 + Math.round((idx / finalCharacters.length) * 10);
    }
    onStatus(status, '人物审计 Agent', pct);
  };
  const applyRepairResult = repaired => {
    const repairedReconciliation = reconcileCharactersWithRoster(
      repaired.characters,
      finalRoster,
      requiredFields
    );
    finalCharacters = repairedReconciliation.characters;
    applyCanonicalCharacterTerms(finalCharacters, canon, novel);
    if (getNovelStylePolicy(novel).premodern) {
      replaceStoryStyleTerms(finalCharacters, PREMODERN_STYLE_REPLACEMENTS, 'characters');
    }
    const repairedNames = finalCharacters.map(character => character.name);
    const repairedIncomplete = finalCharacters.filter(character =>
      character.profileQuality === 'fallback' ||
      character.profileQuality === 'incomplete' ||
      (character._autoFilledFields || []).length > 0 ||
      requiredFields.some(field => !character[field]) ||
      !character.storyFunction ||
      character.relationships.length < 3 ||
      (character.hiddenIdentities.length > 0 && character.identityRevealStage === '无')
    );
    if (
      finalCharacters.length < targetCount ||
      new Set(repairedNames).size !== finalCharacters.length ||
      repairedNames.some(name => /(路人[甲乙丙丁]|无名氏|某某|待定)/.test(name)) ||
      repairedIncomplete.length
    ) {
      throw new Error(
        `人物修复结果对齐失败：实际 ${finalCharacters.length}/${targetCount} 人，不完整 ${repairedIncomplete.length} 人。`
      );
    }
    relations = normalizeAndHealRelations(repaired.relations, finalCharacters, targetCount);
    applyFactionReplacementsToCharacters(finalCharacters, relations, canon, novel);
    if (getNovelStylePolicy(novel).premodern) {
      replaceStoryStyleTerms(finalCharacters, PREMODERN_STYLE_REPLACEMENTS, 'characters');
      replaceStoryStyleTerms(relations, PREMODERN_STYLE_REPLACEMENTS, 'relations');
    }
  };

  let staticAudit = runStaticCharacterAudit(finalCharacters, relations, targetCount, canon, novel);
  let audit = await auditCharacterSystem(context, finalCharacters, relations, staticAudit, auditOnStatus);
  let issueLedger = createCharacterIssueLedger([], [
    ...audit.issues,
    ...(staticAudit.semanticIssues || [])
  ]);
  audit.issueLedger = issueLedger;
  audit.issues = issueLedger.filter(issue => issue.status === 'open');
  const isEvidenceBackedCritical = issue =>
    issue.severity === 'critical' &&
    Array.isArray(issue.evidence) &&
    issue.evidence.some(Boolean);
  const needsAutomaticRepair = () => {
    const criticalIssues = audit.issues.filter(isEvidenceBackedCritical);
    return !staticAudit.hardPassed || audit.score < 70 || criticalIssues.length > 0;
  };
  if (needsAutomaticRepair()) {
    const repairOnStatus = status => onStatus(status, '人物修复 Agent', 92);
    const repaired = await repairCharacterSystem(
      `${context}

首轮修复重点：
1. 逐条依据人物事实契约和事件锚点修复，不得引用其他小说的人名、势力或模板。
2. 只修改问题涉及的字段；身份、阵营、命运必须与契约一致。
3. 欲望、目标、利益、弧光、高光、命运和关系必须形成可验证因果，不能只改称谓。`,
      finalCharacters,
      relations,
      audit,
      repairOnStatus
    );
    applyRepairResult(repaired);

    staticAudit = runStaticCharacterAudit(finalCharacters, relations, targetCount, canon, novel);
    const reauditOnStatus = status => onStatus(status, '人物复审 Agent', 95);
    audit = await auditCharacterSystem(context, finalCharacters, relations, staticAudit, reauditOnStatus);
    issueLedger = createCharacterIssueLedger(issueLedger, [
      ...audit.issues,
      ...(staticAudit.semanticIssues || [])
    ]);
    audit.issueLedger = issueLedger;
    audit.issues = issueLedger.filter(issue => issue.status === 'open');
  }

  const isAuditBlocked = () => needsAutomaticRepair();
  const buildEscalatedAudit = currentAudit => ({
    ...currentAudit,
    issues: currentAudit.issues.map(issue => ({
      ...issue,
      severity: [
        '身份矛盾', '势力矛盾', '关系矛盾', '总纲偏离', '背景冲突',
        '人物弧光', '人物高光', '活人感', '工具人化', '命运逻辑', '多重身份'
      ].includes(issue.category)
        ? 'high'
        : issue.severity
    }))
  });

  const repairGuidance = `${context}

自动修复重点：
1. 不降低审计标准，不伪造通过；必须真实重写导致扣分的人物和关系。
2. 严格遵循当前小说的人物事实契约、已确认事件卡、总纲和阵营规划，不得带入任何固定姓名或旧小说设定。
3. 只提交字段级补丁，并为每项修改标注事实契约或事件证据。
4. 修复后不得增加新的确定性问题，不得复制其他人物的经历、欲望、高光或命运。
5. 人物关系必须由双方目标、利益和已发生事件共同证明，允许删除无依据关系。
6. 修复必须形成身份、生平、欲望、行动、弧光、高光和命运的连续因果。`;

  let finalSevereIssues = audit.issues.filter(issue => ['critical', 'high'].includes(issue.severity));
  const maxRepairRounds = 5;
  let repairRounds = 1;
  let stagnantRounds = 0;
  const rankCandidate = (candidateAudit, candidateStaticAudit) => {
    const criticalCount = (candidateAudit.issues || []).filter(isEvidenceBackedCritical).length;
    const hardCount = getHardCharacterAuditIssues(candidateStaticAudit).length;
    return [
      hardCount,
      criticalCount,
      Math.max(0, 70 - Number(candidateAudit.score || 0)),
      (candidateAudit.issues || []).length
    ];
  };
  const isBetterRank = (next, current) => next.some((value, index) =>
    value < current[index] && next.slice(0, index).every((item, prefixIndex) => item === current[prefixIndex])
  );
  let bestCandidate = {
    characters: structuredClone(finalCharacters),
    relations: structuredClone(relations),
    audit: structuredClone(audit),
    staticAudit: structuredClone(staticAudit),
    issueLedger: structuredClone(issueLedger),
    rank: rankCandidate(audit, staticAudit)
  };
  for (let repairRound = 0; repairRound < maxRepairRounds && isAuditBlocked(); repairRound += 1) {
    const roundLabel = repairRound === 0 ? '第二轮' : `第 ${repairRound + 2} 轮`;
    onStatus(
      `复审仍有结构问题，正在执行${roundLabel}针对性修复（当前 ${audit.score} 分）...`,
      '人物修复 Agent',
      Math.min(99, 97 + repairRound)
    );
    const repaired = await repairCharacterSystem(
      repairGuidance,
      finalCharacters,
      relations,
      buildEscalatedAudit(audit),
      status => onStatus(status, repairRound === 0 ? '人物二次修复 Agent' : '人物自动修复 Agent', 98)
    );
    applyRepairResult(repaired);
    staticAudit = runStaticCharacterAudit(finalCharacters, relations, targetCount, canon, novel);
    audit = await auditCharacterSystem(context, finalCharacters, relations, staticAudit, status =>
      onStatus(status, repairRound === maxRepairRounds - 1 ? '人物终复审 Agent' : '人物复审 Agent', 99)
    );
    issueLedger = createCharacterIssueLedger(issueLedger, [
      ...audit.issues,
      ...(staticAudit.semanticIssues || [])
    ]);
    audit.issueLedger = issueLedger;
    audit.issues = issueLedger.filter(issue => issue.status === 'open');
    finalSevereIssues = audit.issues.filter(issue => ['critical', 'high'].includes(issue.severity));
    repairRounds += 1;
    const nextRank = rankCandidate(audit, staticAudit);
    if (isBetterRank(nextRank, bestCandidate.rank)) {
      bestCandidate = {
        characters: structuredClone(finalCharacters),
        relations: structuredClone(relations),
        audit: structuredClone(audit),
        staticAudit: structuredClone(staticAudit),
        issueLedger: structuredClone(issueLedger),
        rank: nextRank
      };
      stagnantRounds = 0;
    } else {
      stagnantRounds += 1;
      if (stagnantRounds >= 2) {
        onStatus('连续两轮没有客观改善，已停止自动修复并恢复当前最佳候选，避免无效循环。', '人物修复 Agent', 99);
        break;
      }
    }
  }

  const currentRank = rankCandidate(audit, staticAudit);
  if (isBetterRank(bestCandidate.rank, currentRank)) {
    finalCharacters = bestCandidate.characters;
    relations = bestCandidate.relations;
    audit = bestCandidate.audit;
    staticAudit = bestCandidate.staticAudit;
    issueLedger = bestCandidate.issueLedger;
  }
  finalSevereIssues = audit.issues.filter(issue => ['critical', 'high'].includes(issue.severity));
  audit.deterministicStable = staticAudit.hardPassed &&
    !finalSevereIssues.some(issue => isEvidenceBackedCritical(issue) && issue.introducedByRepair);

  const finalIncompleteCount = finalCharacters.filter(character =>
    character.profileQuality === 'fallback' ||
    character.profileQuality === 'incomplete' ||
    (character._autoFilledFields || []).length > 0
  ).length;
  const finalGate = finalizeCharacterAuditForReview(
    audit,
    staticAudit,
    finalSevereIssues,
    repairRounds,
    finalIncompleteCount
  );
  audit = finalGate.audit;
  runtime.addQualityGate(
    'character-integrity',
    !finalGate.draftOnly,
    `score=${audit.score}; hardIssues=${finalGate.hardIssues.length}; incomplete=${finalIncompleteCount}; repairRounds=${repairRounds}`
  );
  if (!finalGate.draftOnly && repairRounds > 0 && staticAudit.hardPassed) {
    runtime.addVerifiedExperience({
      trigger: 'character field conflicts detected by deterministic audit',
      resolution: 'apply field-level transactional patches and rerun deterministic character audit',
      evidence: [`repairRounds=${repairRounds}`, `score=${audit.score}`, 'hardPassed=true'],
      deterministicVerified: true
    });
  }
  novel.characterSystemDraft = {
    fingerprint: rosterFingerprint,
    characters: finalCharacters,
    relations,
    audit,
    status: finalGate.draftOnly ? 'quarantined' : 'reviewable',
    updatedAt: new Date().toISOString()
  };

  if (stateManager) {
    stateManager.updateNodeState('audit', 'completed');
    stateManager.updateNodeState('review', 'active');
  }
  if (finalGate.draftOnly) {
    onStatus(`人物体系尚未达到可提交条件，已保存为隔离草稿：${finalGate.hardIssues.slice(0, 3).join('；')}`, '系统', 100);
  } else if (audit.requiresHumanReview) {
    onStatus(`人物体系确定性校验通过，质量评分 ${audit.score} 分，提交用户人工复核。`, '系统', 100);
  } else {
    onStatus(`人物审计通过：${audit.score} 分，协同完成。`, '系统', 100);
  }
  if (!finalGate.draftOnly) {
    delete novel.characterRosterDraft;
    delete novel.characterDeepeningDraft;
  }
  saveState();
  return { characters: finalCharacters, relations, audit };
}

function extractBracketValue(text, label, nextLabel = '') {
  const labelPattern = new RegExp(`${label}\\s*[：:]?\\s*(?=[【\\[])`);
  const labelMatch = labelPattern.exec(text);
  if (!labelMatch) return '';

  const valueStart = labelMatch.index + labelMatch[0].length;
  const remaining = text.slice(valueStart);
  const openIndex = remaining.search(/[【\[]/);
  if (openIndex === -1) return '';

  const contentStart = valueStart + openIndex + 1;
  let contentEnd = text.length;
  if (nextLabel) {
    const nextPattern = new RegExp(`[，,\\s]*${nextLabel}\\s*[：:]?\\s*(?=[【\\[])`, 'g');
    nextPattern.lastIndex = contentStart;
    const nextMatch = nextPattern.exec(text);
    if (nextMatch) {
      const beforeNextLabel = text.slice(contentStart, nextMatch.index);
      const closeIndex = Math.max(beforeNextLabel.lastIndexOf('】'), beforeNextLabel.lastIndexOf(']'));
      contentEnd = closeIndex >= 0 ? contentStart + closeIndex : nextMatch.index;
    }
  } else {
    const closeIndex = Math.max(text.lastIndexOf('】'), text.lastIndexOf(']'));
    contentEnd = closeIndex >= contentStart ? closeIndex : text.length;
  }
  return text.slice(contentStart, contentEnd).trim();
}

function inferAudience(background, synopsis) {
  const combined = `${background}
${synopsis}`;
  const explicitAudience = parseBackgroundSemantics(background).categories.audience[0];
  if (explicitAudience) return explicitAudience;
  if (/(言情|女主|师尊|小师妹|团宠|无cp|无CP)/i.test(combined)) return '女频（根据内容推断）';
  return '未识别';
}

const NOVEL_WORLD_TYPE_PATTERN = /(架空古代|古代|古武都市|现代都市|现代|都市异能|东方玄幻|西方奇幻|西幻魔法|修仙|仙侠|武侠|末世|历史架空|历史古代|现代言情|古代言情|校园|职场|民国|豪门世家|悬疑|无限流)/;

function validateNovelBackground(background, synopsis = '') {
  const issues = [];
  const semanticAnalysis = validateBackgroundSemanticCoherence(background, synopsis);
  if (!semanticAnalysis.profile.categories.audience.length) {
    issues.push('必须明确写出“男频”或“女频”');
  }
  if (!NOVEL_WORLD_TYPE_PATTERN.test(background)) {
    issues.push('必须明确时代或世界类型，例如“架空古代、现代都市、东方玄幻、修仙、民国、西方奇幻”');
  }
  issues.push(...semanticAnalysis.errors);
  return issues;
}

function renderNewNovelBackgroundSemantics() {
  const container = elements.newNovelBackgroundSemantics;
  if (!container) return;
  const background = elements.newNovelBackground?.value.trim() || '';
  const synopsis = elements.newNovelSynopsis?.value.trim() || '';
  if (!background) {
    container.className = 'background-semantic-preview hidden';
    container.textContent = '';
    return;
  }
  const analysis = validateBackgroundSemanticCoherence(background, synopsis);
  const categorySummary = Object.values(analysis.profile.categories)
    .filter(terms => terms.length)
    .map(terms => terms.join('、'))
    .join('；');
  const messages = [
    categorySummary ? `已理解：${categorySummary}` : '尚未识别到标准标签，将结合简介按原意推断。',
    analysis.corrections.length ? `已规范：${analysis.corrections.join('、')}` : '',
    ...analysis.errors.map(message => `冲突：${message}`),
    ...analysis.warnings.map(message => `提示：${message}`)
  ].filter(Boolean);
  container.className = `background-semantic-preview ${
    analysis.errors.length ? 'has-error' : analysis.warnings.length ? 'has-warning' : 'is-valid'
  }`;
  container.textContent = messages.join('\n');
}

function parseNovelBriefInput(rawInput) {
  if (!/背景设定\s*[：:]?\s*[【\[]/.test(rawInput)) {
    return null;
  }
  const hasSynopsis = /简介\s*[：:]?\s*[【\[]/.test(rawInput);
  const background = extractBracketValue(rawInput, '背景设定', hasSynopsis ? '简介' : '');
  const synopsis = hasSynopsis ? extractBracketValue(rawInput, '简介') : '';
  if (!background) return null;
  return {
    background,
    synopsis,
    audience: inferAudience(background, synopsis)
  };
}

function resetDerivedNovelData(novel) {
  novel.assets = [];
  novel.masterOutline = null;
  novel.analysisSummary = '';
  novel.narrativeKernel = null;
  novel.worldPressure = null;
  novel.factionPlans = [];
  novel.eventCards = [];
  novel.promiseLedger = [];
  novel.stateLedger = [];
  novel.outlineAudit = null;
  novel.plotBlueprint = null;
  novel.plotBlueprintDraft = null;
  novel.finalAudit = null;
  novel.finalOutline = null;
  novel.characterBible = [];
  novel.characterRelations = [];
  novel.characterAudit = null;
  novel.characterRosterDraft = null;
  novel.knowledgeGraph = null;
  novel.storyConstitution = null;
  novel.consistencyStatus = null;
  if (novel.activeTarget?.type === 'asset') {
    novel.activeTarget = { type: 'chapter', id: novel.currentChapterId };
  }
}

function sanitizeDownloadFilename(value) {
  return String(value || '未命名小说')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || '未命名小说';
}

async function saveNovelBriefFile(activeNovel, parsedBrief, rawInput) {
  const payload = {
    novelName: activeNovel.name,
    background: parsedBrief.background,
    synopsis: parsedBrief.synopsis,
    audience: parsedBrief.audience,
    rawInput
  };
  const endpoints = ['/api/novel-inputs'];
  if (window.location.port !== '5173') {
    endpoints.push(`${window.location.protocol}//${window.location.hostname}:5173/api/novel-inputs`);
  }

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) return data;
      lastError = new Error(data.error || `HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  return {
    filename: '',
    relativePath: '',
    fallback: true,
    saved: false,
    saveWarning: lastError?.message || '保存接口不可用'
  };
}

function reviewMasterOutline(result) {
  elements.outlineReviewSummary.textContent = result.summary || '暂无作品定位总结';
  elements.outlineReviewBeginning.textContent = result.masterOutline.beginning;
  elements.outlineReviewDevelopment.textContent = result.masterOutline.development;
  elements.outlineReviewClimax.textContent = result.masterOutline.climax;
  elements.outlineReviewEnding.textContent = result.masterOutline.ending;
  elements.outlineReviewModal.classList.remove('hidden');

  return new Promise(resolve => {
    const finish = approved => {
      elements.outlineReviewModal.classList.add('hidden');
      elements.approveOutlineBtn.removeEventListener('click', approve);
      elements.rejectOutlineBtn.removeEventListener('click', reject);
      resolve(approved);
    };
    const approve = () => finish(true);
    const reject = () => finish(false);
    elements.approveOutlineBtn.addEventListener('click', approve);
    elements.rejectOutlineBtn.addEventListener('click', reject);
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function reviewCharacterSystem(result) {
  const factions = new Set(result.characters.map(character => character.faction).filter(Boolean));
  elements.characterReviewCount.textContent = result.characters.length;
  elements.characterReviewRelationCount.textContent = result.relations.length;
  elements.characterReviewFactionCount.textContent = factions.size;
  elements.characterAuditScore.textContent = result.audit?.score || 0;
  const blockers = getCharacterAcceptanceBlockers(
    result.audit,
    result.audit?.staticAudit?.semanticHardIssues || [],
    (result.characters || []).filter(character =>
      character.profileQuality === 'fallback' ||
      character.profileQuality === 'incomplete' ||
      (character._autoFilledFields || []).length > 0
    ).length
  );
  const canApprove = blockers.length === 0 && ['passed', 'review'].includes(result.audit?.qualityGate);
  const requiresHumanReview = result.audit?.qualityGate === 'review';
  const showAllIssues = !canApprove || requiresHumanReview;
  const remainingIssues = showAllIssues
    ? (result.audit?.issues || [])
    : (result.audit?.issues?.filter(issue => ['medium', 'low'].includes(issue.severity)) || []);
  elements.characterAuditReport.classList.toggle('audit-warning', remainingIssues.length > 0 || requiresHumanReview);
  elements.characterAuditReport.innerHTML = `
    <strong>审计结论：</strong>${escapeHtml(result.audit?.summary || '人物体系已通过程序硬审计和 AI 复审。')}
    ${canApprove && requiresHumanReview ? '<div><strong>质量门状态：</strong>确定性事实校验已通过；当前属于质量建议区间，可由用户结合创作目标决定是否提交。</div>' : ''}
    ${!canApprove ? `<div><strong>质量门状态：</strong>当前仅保存为隔离草稿，不会覆盖正式人物库。${blockers.length ? `<br>${blockers.slice(0, 8).map(escapeHtml).join('；')}` : ''}</div>` : ''}
    ${result.audit?.strengths?.length ? `<div><strong>优势：</strong>${result.audit.strengths.map(escapeHtml).join('；')}</div>` : ''}
    ${remainingIssues.length ? `
      <div><strong>${showAllIssues ? '待处理问题' : '剩余建议'}：</strong></div>
      <ul>${remainingIssues.slice(0, 12).map(issue => `<li>[${escapeHtml(issue.severity || 'unknown')}] ${escapeHtml(issue.category)}：${escapeHtml(issue.problem)}</li>`).join('')}</ul>
    ` : '<div><strong>结果：</strong>未发现需要阻断提交的严重问题。</div>'}
  `;
  elements.characterReviewList.innerHTML = result.characters.map((character, index) => `
    <article class="character-review-card">
      <h4>${String(index + 1).padStart(2, '0')}. ${escapeHtml(character.name)}</h4>
      <div class="character-identity">${escapeHtml(character.identity)} · ${escapeHtml(character.faction)}</div>
      <p><b>公开身份：</b>${escapeHtml(character.publicIdentity)}</p>
      <p><b>隐藏身份：</b>${escapeHtml(character.hiddenIdentities?.join('、') || '无')}</p>
      <p><b>身份揭露：</b>${escapeHtml(character.identityRevealStage)}</p>
      <p><b>势力范围：</b>${escapeHtml(character.factionScope)}</p>
      <p><b>性格：</b>${escapeHtml(character.personality)}</p>
      <p><b>欲望与目标：</b>${escapeHtml(character.desire)} / ${escapeHtml(character.goal)}</p>
      <p><b>人物弧光：</b>${escapeHtml(character.arc)}</p>
      <p><b>高光时刻：</b>${escapeHtml(character.highlight)}</p>
      <p><b>最终命运：</b>${escapeHtml(character.fate)}</p>
      <p><b>总纲对应情节：</b>${escapeHtml(character.plotAnchor)}</p>
    </article>
  `).join('');
  elements.characterReviewModal.classList.remove('hidden');
  elements.approveCharactersBtn.disabled = !canApprove;
  elements.approveCharactersBtn.classList.toggle('hidden', !canApprove);

  return new Promise(resolve => {
    const finish = approved => {
      elements.characterReviewModal.classList.add('hidden');
      elements.approveCharactersBtn.removeEventListener('click', approve);
      elements.rejectCharactersBtn.removeEventListener('click', reject);
      resolve(approved);
    };
    const approve = () => {
      if (!canApprove) return;
      finish(true);
    };
    const reject = () => finish(false);
    if (canApprove) elements.approveCharactersBtn.addEventListener('click', approve);
    elements.rejectCharactersBtn.addEventListener('click', reject);
  });
}

function classifyCharacterType(character) {
  if (character.roleTier === '核心主角') return 'main-character';
  if (character.roleTier === '主要人物') return 'major-character';
  const text = `${character.faction} ${character.identity} ${character.storyFunction}`;
  if (/(父|母|兄|姐|弟|妹|家族|养父|养母|亲族)/.test(text)) return 'family-character';
  if (/(旧宗门|师尊|师门|同门|宗门)/.test(text)) return 'former-sect-character';
  if (/(反派|魔族|敌对|仇敌|幕后)/.test(text)) return 'antagonist-character';
  if (/(中立|商会|佣兵|黑市|第三方)/.test(text)) return 'neutral-character';
  if (/(隐藏|隐世|秘密|暗线|潜伏)/.test(text)) return 'hidden-character';
  if (/(凡人|农户|百姓|教书|商贩|城民)/.test(text)) return 'civilian-character';
  return 'supporting-character';
}

function extractMarkdownField(markdown, label) {
  const escapedLabel = String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(markdown || '').match(
    new RegExp(`^-\\s*\\*\\*${escapedLabel}\\*\\*[：:]\\s*([^\\r\\n]*)`, 'm')
  );
  return match ? match[1].trim() : '';
}

function extractMarkdownList(markdown, label) {
  const value = extractMarkdownField(markdown, label);
  if (!value || value === '无') return [];
  return value.split(/[、；;]/).map(item => item.trim()).filter(Boolean);
}

function syncCharacterFromAsset(novel, asset) {
  if (!asset.characterName || !novel.characterBible) return;
  const character = novel.characterBible.find(item => item.name === asset.characterName);
  if (!character) return;
  const fieldMap = {
    identity: '身份',
    publicIdentity: '公开身份',
    identityRevealStage: '身份揭露',
    faction: '阵营',
    factionScope: '势力范围与权限',
    storyFunction: '剧情功能',
    ageAndAppearance: '年龄与外貌',
    personality: '性格',
    desire: '欲望',
    goal: '目标',
    interests: '利益与底线',
    agency: '主观能动性',
    ability: '能力与资源',
    weakness: '缺陷与代价',
    settingBasis: '设定依据',
    plotAnchor: '总纲对应情节',
    foreshadowLink: '伏笔与回收链',
    lifeHistory: '人物生平',
    growthHistory: '成长史',
    arc: '人物弧光',
    highlight: '人物高光',
    fate: '最终命运'
  };
  Object.entries(fieldMap).forEach(([field, label]) => {
    const value = extractMarkdownField(asset.desc, label) ||
      (field === 'plotAnchor' ? extractMarkdownField(asset.desc, '总纲锚点') : '');
    if (value) character[field] = value;
  });
  character.hiddenIdentities = extractMarkdownList(asset.desc, '隐藏身份');
  asset.name = `${character.name}（${character.identity}）`;
  asset.type = classifyCharacterType(character);
  asset.characterData = character;
}

function refreshTopologyAsset(novel) {
  const refreshed = topologyToAsset(novel.characterRelations || [], novel.id);
  const topologyAsset = novel.assets.find(asset => asset.type === 'character-network');
  if (!topologyAsset) {
    novel.assets.push(refreshed);
    return;
  }
  topologyAsset.name = refreshed.name;
  topologyAsset.desc = refreshed.desc;
}

function removeCharacterFromNovel(novel, characterName) {
  novel.characterBible = (novel.characterBible || []).filter(character => character.name !== characterName);
  novel.characterRelations = (novel.characterRelations || []).filter(relation =>
    relation.source !== characterName && relation.target !== characterName
  );
  (novel.characterBible || []).forEach(character => {
    character.relationships = (character.relationships || []).filter(relation => relation.target !== characterName);
  });
  refreshTopologyAsset(novel);
}

function characterToAsset(character, novelId, index) {
  ensureCompleteCharacterProfile(character);
  const relationships = (character.relationships || []).map(relation =>
    `- **${relation.target}｜${relation.type}**：${relation.dynamic}；冲突：${relation.conflict}`
  ).join('\n') || '暂无直接关系';
  return {
    id: `character-${novelId}-${index}-${Date.now()}`,
    group: 'character-growth',
    type: classifyCharacterType(character),
    name: `${character.name}（${character.identity}）`,
    characterName: character.name,
    characterData: character,
    desc: `# ${character.name}

## 身份与定位
- **身份**：${character.identity}
- **公开身份**：${character.publicIdentity}
- **隐藏身份**：${character.hiddenIdentities?.length ? character.hiddenIdentities.join('、') : '无'}
- **身份揭露**：${character.identityRevealStage}
- **阵营**：${character.faction}
- **势力范围与权限**：${character.factionScope}
- **剧情功能**：${character.storyFunction}
- **年龄与外貌**：${character.ageAndAppearance}

## 人物内核
- **性格**：${character.personality}
- **欲望**：${character.desire}
- **目标**：${character.goal}
- **利益与底线**：${character.interests}
- **主观能动性**：${character.agency}
- **能力与资源**：${character.ability}
- **缺陷与代价**：${character.weakness}
- **设定依据**：${character.settingBasis}
- **总纲对应情节**：${character.plotAnchor}
- **伏笔与回收链**：${character.foreshadowLink}

## 人生轨迹
- **人物生平**：${character.lifeHistory}
- **成长史**：${character.growthHistory}
- **人物弧光**：${character.arc}
- **人物高光**：${character.highlight}
- **最终命运**：${character.fate}

## 直接关系
${relationships}`
  };
}

function topologyToAsset(relations, novelId) {
  const relationLines = relations.map((relation, index) =>
    `${index + 1}. **${relation.source} → ${relation.target}｜${relation.type}｜${relation.direction}**
   - 关系：${relation.description}
   - 利益：${relation.interestConflict}
   - 证据：${(relation.evidenceRefs || []).join('、') || '未登记'}`
  ).join('\n');
  return {
    id: `character-network-${novelId}-${Date.now()}`,
    group: 'character-growth',
    type: 'character-network',
    name: `全局人物关系拓扑（${relations.length}条）`,
    desc: `# 全局人物关系拓扑

${relationLines}`
  };
}

function plotSystemToAssets(result, novelId) {
  const now = Date.now();
  const assets = [];
  result.architecture.volumes.forEach((volume, index) => {
    assets.push({
      id: `volume-outline-${novelId}-${index}-${now}`,
      group: 'plot-framework',
      type: 'volume-outline',
      name: `${String(index + 1).padStart(2, '0')}｜${volume.title}（${volume.chapterStart}-${volume.chapterEnd}章）`,
      desc: `卷首状态：${volume.startState}
卷目标：${volume.volumeGoal}
核心冲突：${volume.primaryConflict}
群像线：${volume.ensembleThreads.join('；')}
中点转折：${volume.midpointTurn}
卷低谷：${volume.lowPoint}
卷高潮：${volume.climax}
卷末状态：${volume.endState}
下一卷钩子：${volume.nextHook}`
    });
  });
  result.chapters.forEach(chapter => {
    assets.push({
      id: `chapter-outline-${novelId}-${chapter.chapterNumber}-${now}`,
      group: 'plot-framework',
      type: 'chapter-outline',
      name: `${String(chapter.chapterNumber).padStart(3, '0')}｜${chapter.title}`,
      desc: `时间：${chapter.time}
地点：${chapter.location}
视角：${chapter.viewpoint}
参与人物：${chapter.participants.join('、')}
叙事线：${chapter.threadIds.join('、') || '主线'}
前置章节：${chapter.prerequisiteChapterIds.join('、') || '无'}
章首状态：${chapter.openingState}
人物目标：${chapter.characterGoal}
主动行动：${chapter.characterAction}
阻力：${chapter.opposition}
冲突：${chapter.conflict}
因果理由：${chapter.causalReason}
剧情梗概：${chapter.plotSummary}
转折：${chapter.turn}
代价：${chapter.cost}
资源与道具：${chapter.resourcesUsed.map(resource => `${resource.name}（来源：${resource.origin}；代价：${resource.cost}）`).join('；') || '无'}
新增元素：${chapter.newElements.map(element => `${element.type}｜${element.name}（来源：${element.origin}；用途：${element.purpose}）`).join('；') || '无'}
信息变化：${chapter.knowledgeDelta}
关系变化：${chapter.relationshipDelta}
状态变化：${chapter.stateDelta}
情绪曲线：${chapter.emotionalCurve}
埋设伏笔：${chapter.plantedClues.join('、') || '无'}
回收伏笔：${chapter.paidClues.join('、') || '无'}
章末钩子：${chapter.endingHook}`
    });
  });
  assets.push({
    id: `plot-causal-${novelId}-${now}`,
    group: 'plot-framework',
    type: 'plot-causal-chain',
    name: `全书剧情因果链（${result.chapterCount}章）`,
    desc: result.chapters.map(chapter =>
      `${chapter.id} <- [${chapter.prerequisiteChapterIds.join('、') || '总纲起点'}]｜${chapter.characterAction} -> ${chapter.stateDelta}`
    ).join('\n')
  });
  assets.push({
    id: `plot-timeline-${novelId}-${now}`,
    group: 'plot-framework',
    type: 'plot-timeline',
    name: '时间、空间与群像多线',
    desc: `## 叙事线
${result.architecture.narrativeThreads.map(thread =>
      `- ${thread.name}：${thread.startState} -> ${thread.endState}｜驱动人物：${thread.driverCharacters.join('、')}｜交汇：${thread.intersections.join('；')}`
    ).join('\n')}

## 时空推进
${result.chapters.map(chapter => `- 第${chapter.chapterNumber}章｜${chapter.time}｜${chapter.location}｜${chapter.viewpoint}`).join('\n')}`
  });
  assets.push({
    id: `plot-audit-${novelId}-${now}`,
    group: 'plot-framework',
    type: 'plot-audit',
    name: `剧情审计报告（${result.audit.score}分）`,
    desc: `${result.audit.summary}

${result.audit.issues.map(issue =>
      `- [${issue.severity}] ${issue.category || issue.domain || '综合'}：${issue.problem}｜修复：${issue.repair || issue.repairInstruction || '人工复核'}`
    ).join('\n')}`
  });
  return assets;
}

function finalNovelAuditToAssets(result, novelId) {
  const now = Date.now();
  const outline = result.finalOutline || {};
  return [
    {
      id: `final-outline-${novelId}-${now}`,
      group: 'plot-framework',
      type: 'final-outline',
      name: `最终综合大纲（${result.chapterCount}章）`,
      desc: `# 作品定位
${outline.positioning || ''}

# 开始
${outline.beginning || ''}

# 发展
${outline.development || ''}

# 高潮
${outline.climax || ''}

# 结局
${outline.ending || ''}

# 核心因果链
${outline.coreCausalChain || ''}

# 三幕N线群像结构
${outline.ensembleStructure || ''}

# 悬疑、伏笔与回收
${outline.suspenseAndPayoff || ''}

# 全书情绪曲线
${outline.emotionalCurve || ''}`
    },
    {
      id: `final-audit-${novelId}-${now}`,
      group: 'plot-framework',
      type: 'final-audit',
      name: `全书终审报告（${result.audit.score}分）`,
      desc: `${result.audit.summary}

程序硬校验：通过
程序初检：${result.audit.initialStaticScore}分
全书复审：${result.audit.score}分
人物标注归一化：${result.audit.normalizedReferenceCount || 0}处
伏笔自动补种：${result.audit.autoPlantedClueCount || 0}条
时代风格修正：${result.audit.styleRepairCount || 0}处
定向修复：${result.audit.repairedIssueCount || 0}项
人物：${result.audit.staticAudit.metrics.characterCount}
关系：${result.audit.staticAudit.metrics.relationCount}
章节：${result.audit.staticAudit.metrics.chapterCount}
活跃人物：${result.audit.staticAudit.metrics.activeCharacterCount}
伏笔埋设/回收：${result.audit.staticAudit.metrics.seededClueCount}/${result.audit.staticAudit.metrics.paidClueCount}

${result.audit.issues.map(issue =>
    `- [${issue.severity}] ${issue.domain || issue.category}｜${issue.target || '全局'}：${issue.problem}｜修复：${issue.repairInstruction || issue.repair || '人工复核'}`
  ).join('\n')}`
    }
  ];
}

function reviewPlotSystem(result, mode = 'plot') {
  const finalAuditMode = mode === 'final-audit';
  elements.plotReviewTitle.textContent = finalAuditMode ? '审核全书最终大纲' : '审核章节剧情细纲';
  elements.plotReviewSubtitle.textContent = finalAuditMode
    ? '程序硬校验已通过。确认后才会应用跨域修复，并同步人物、关系、章节、伏笔、知识图谱与最终综合大纲。'
    : '审核通过后，卷纲、章节细纲、因果链、伏笔链与时空多线才会写入左侧设定库。';
  elements.plotReviewChapterCount.textContent = result.chapterCount;
  elements.plotReviewVolumeCount.textContent = result.architecture.volumes.length;
  elements.plotAuditScore.textContent = result.audit.score;
  elements.plotReviewReport.classList.toggle('audit-warning', result.audit.requiresHumanReview);
  elements.plotReviewReport.innerHTML = `
    <strong>${finalAuditMode ? '全书终审结论' : '审计结论'}：</strong>${escapeHtml(result.audit.summary || '章节细纲已完成。')}
    ${finalAuditMode ? `<div><strong>评分：</strong>初检 ${result.audit.initialStaticScore} 分，复审 ${result.audit.score} 分；人物标注归一化 ${result.audit.normalizedReferenceCount || 0} 处，伏笔补种 ${result.audit.autoPlantedClueCount || 0} 条，时代风格修正 ${result.audit.styleRepairCount || 0} 处，定向修复 ${result.audit.repairedIssueCount || 0} 项。</div>` : ''}
    ${result.audit.requiresHumanReview ? '<div><strong>状态：</strong>程序硬校验通过，AI 质量评分未达到自动通过线，请人工审核。</div>' : ''}
    ${result.audit.issues.length ? `<ul>${result.audit.issues.slice(0, 12).map(issue =>
      `<li>[${escapeHtml(issue.severity || 'medium')}] ${escapeHtml(issue.domain || issue.category || '综合')}：${escapeHtml(issue.problem || '')}</li>`
    ).join('')}</ul>` : ''}
  `;
  elements.plotReviewList.innerHTML = result.architecture.volumes.map(volume => {
    const chapters = result.chapters.filter(chapter => chapter.volumeId === volume.id);
    return `<section class="plot-review-volume">
      <h4>${escapeHtml(volume.title)} · 第${volume.chapterStart}-${volume.chapterEnd}章</h4>
      <p><b>目标：</b>${escapeHtml(volume.volumeGoal)}　<b>高潮：</b>${escapeHtml(volume.climax)}</p>
      <div>${chapters.map(chapter =>
        `<article><strong>${String(chapter.chapterNumber).padStart(3, '0')}｜${escapeHtml(chapter.title)}</strong>
        <span>${escapeHtml(chapter.viewpoint)} · ${escapeHtml(chapter.location)}</span>
        <p>${escapeHtml(chapter.plotSummary)}</p>
        <p><b>转折：</b>${escapeHtml(chapter.turn)}　<b>章末：</b>${escapeHtml(chapter.endingHook)}</p></article>`
      ).join('')}</div>
    </section>`;
  }).join('');
  elements.plotReviewModal.classList.remove('hidden');
  return new Promise(resolve => {
    const finish = approved => {
      elements.plotReviewModal.classList.add('hidden');
      elements.approvePlotBtn.removeEventListener('click', approve);
      elements.rejectPlotBtn.removeEventListener('click', reject);
      resolve(approved);
    };
    const approve = () => finish(true);
    const reject = () => finish(false);
    elements.approvePlotBtn.addEventListener('click', approve);
    elements.rejectPlotBtn.addEventListener('click', reject);
  });
}

/* ==========================================================================
   Event Listeners Setup
   ========================================================================== */
function initEvents() {
  // The inline editor must remain available even if an unrelated control fails
  // while the rest of this large event registry is being initialized.
  initInlineRewrite();

  const fillTaskFromWorkflowStep = step => {
    const title = step.querySelector('strong')?.textContent.trim() || '';
    const command = step.querySelector('code')?.textContent.trim() || '';
    const description = step.querySelector('span')?.textContent.trim() || '';
    elements.agentTaskTextarea.value = [title, command, description]
      .filter(Boolean)
      .join('\n\n');
    elements.agentTaskTextarea.style.height = 'auto';
    elements.agentTaskTextarea.style.height = `${elements.agentTaskTextarea.scrollHeight}px`;
    elements.agentTaskTextarea.focus();
    elements.agentTaskTextarea.setSelectionRange(
      elements.agentTaskTextarea.value.length,
      elements.agentTaskTextarea.value.length
    );
  };
  document.querySelectorAll('.workflow-step').forEach(step => {
    step.addEventListener('click', event => {
      if (event.target.closest('[data-no-step-fill]')) return;
      fillTaskFromWorkflowStep(step);
    });
    step.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      fillTaskFromWorkflowStep(step);
    });
  });

  document.querySelectorAll('[data-no-step-fill]').forEach(el => {
    el.addEventListener('click', event => {
      event.stopPropagation();
    });
    el.addEventListener('keydown', event => {
      event.stopPropagation();
    });
  });

  if (elements.referenceNovelFile) {
    elements.referenceNovelFile.addEventListener('change', event => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      
      openReferenceManager(files, async () => {
        const container = elements.referenceNovelFile.closest('.reference-upload');
        container?.classList.remove('is-ready', 'is-error');
        container?.classList.add('is-working');
        elements.referenceNovelFile.disabled = true;
        try {
          const filesToAnalyze = [...pendingReferenceFiles];
          const analyses = await analyzeMultipleReferenceFiles(filesToAnalyze);
          const mergedAnalysis = mergeReferenceAnalyses(analyses);
          const novel = getActiveNovel();
          if (novel && mergedAnalysis) {
            novel.background = mergedAnalysis.suggestedBackground || '';
            novel.synopsis = mergedAnalysis.suggestedSynopsis || '';
            novel.referenceNovelAnalysis = mergedAnalysis;
            upsertReferenceAnalysisAsset(novel, analyses);
            refreshNovelKnowledgeGraph(novel);
            saveState();
            void persistNovelKnowledgeGraph(novel);
            renderNovels();
            openNovelInfoModal(novel, 'file-upload');
          }
          
          if (mergedAnalysis) {
            elements.referenceNovelStatus.textContent = 
              `已拆解 ${filesToAnalyze.length} 个文件：共 ${mergedAnalysis.sourceLength} 字。点击查看或管理。`;
            elements.referenceNovelStatus.style.cursor = 'pointer';
            elements.referenceNovelStatus.style.textDecoration = 'underline';
            container?.classList.add('is-ready');
            
            const username = localStorage.getItem('novel_username') || 'default';
            showToast(`所有原著拆解完成，分析数据已保存至：\n${analyses.map(a => a.savedPath || `data/users/${username}/reference-novels/${a.fileName.replace(/\.txt$/i, '') + '.json'}`).join('\n')}`, 'success');
          }
        } catch (error) {
          elements.referenceNovelStatus.textContent = `分析失败：${error.message}`;
          container?.classList.add('is-error');
          showToast(`原著分析失败：${error.message}`, 'error');
        } finally {
          container?.classList.remove('is-working');
          elements.referenceNovelFile.disabled = false;
        }
      });
      elements.referenceNovelFile.value = '';
    });
  }

  if (elements.referenceNovelStatus) {
    elements.referenceNovelStatus.addEventListener('click', event => {
      event.stopPropagation();
      if (pendingReferenceFiles.length > 0) {
        openReferenceManager([], async () => {
          const container = elements.referenceNovelFile.closest('.reference-upload');
          container?.classList.remove('is-ready', 'is-error');
          container?.classList.add('is-working');
          elements.referenceNovelFile.disabled = true;
          try {
            const filesToAnalyze = [...pendingReferenceFiles];
            const analyses = await analyzeMultipleReferenceFiles(filesToAnalyze);
            const mergedAnalysis = mergeReferenceAnalyses(analyses);
            const novel = getActiveNovel();
            if (novel && mergedAnalysis) {
              novel.background = mergedAnalysis.suggestedBackground || '';
              novel.synopsis = mergedAnalysis.suggestedSynopsis || '';
              novel.referenceNovelAnalysis = mergedAnalysis;
              upsertReferenceAnalysisAsset(novel, analyses);
              refreshNovelKnowledgeGraph(novel);
              saveState();
              void persistNovelKnowledgeGraph(novel);
              renderNovels();
              openNovelInfoModal(novel, 'file-upload');
            }
            
            if (mergedAnalysis) {
              elements.referenceNovelStatus.textContent = 
                `已拆解 ${filesToAnalyze.length} 个文件：共 ${mergedAnalysis.sourceLength} 字。点击查看或管理。`;
              container?.classList.add('is-ready');
              
              const username = localStorage.getItem('novel_username') || 'default';
              showToast(`所有原著拆解完成，分析数据已保存至：\n${analyses.map(a => a.savedPath || `data/users/${username}/reference-novels/${a.fileName.replace(/\.txt$/i, '') + '.json'}`).join('\n')}`, 'success');
            }
          } catch (error) {
            elements.referenceNovelStatus.textContent = `分析失败：${error.message}`;
            container?.classList.add('is-error');
            showToast(`原著分析失败：${error.message}`, 'error');
          } finally {
            container?.classList.remove('is-working');
            elements.referenceNovelFile.disabled = false;
          }
        });
      }
    });
  }

  if (elements.newNovelFile) {
    elements.newNovelFile.addEventListener('change', event => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      
      openReferenceManager(files, async () => {
        elements.newNovelError.classList.add('hidden');
        elements.newNovelProgress.classList.remove('hidden');
        elements.newNovelProgressText.textContent = '正在分段拆解原著人物、剧情、逻辑、伏笔和节奏...';
        elements.newNovelFile.disabled = true;
        elements.createNewNovelBtn.disabled = true;
        elements.closeNewNovelModal.disabled = true;
        elements.btnCancelNewNovel.disabled = true;
        
        try {
          const filesToAnalyze = [...pendingReferenceFiles];
          const analyses = await analyzeMultipleReferenceFiles(filesToAnalyze);
          const mergedAnalysis = mergeReferenceAnalyses(analyses);
          pendingNewNovelAnalyses = analyses;
          
          if (mergedAnalysis) {
            elements.newNovelBackground.value = mergedAnalysis.suggestedBackground || '';
            elements.newNovelSynopsis.value = mergedAnalysis.suggestedSynopsis || '';
            
            const username = localStorage.getItem('novel_username') || 'default';
            showToast(`所有原著分析完成，已保存至：\n${analyses.map(a => a.savedPath || `data/users/${username}/reference-novels/${a.fileName.replace(/\.txt$/i, '') + '.json'}`).join('\n')}`, 'success');
            
            elements.newNovelProgressText.textContent = '已自动填入背景设定与简介。';
            elements.newNovelReferenceStatus.textContent = `已选择 ${filesToAnalyze.length} 个文件：共 ${mergedAnalysis.sourceLength} 字。点击查看或管理。`;
            elements.newNovelReferenceStatus.style.display = 'block';
          }
        } catch (error) {
          showNewNovelError(`分析失败：${error.message}`);
          elements.newNovelProgressText.textContent = `分析失败：${error.message}`;
          showToast(`分析失败：${error.message}`, 'error');
        } finally {
          elements.newNovelProgress.classList.add('hidden');
          elements.newNovelFile.disabled = false;
          elements.createNewNovelBtn.disabled = false;
          elements.closeNewNovelModal.disabled = false;
          elements.btnCancelNewNovel.disabled = false;
        }
      });
      
      elements.newNovelFile.value = '';
    });
  }

  if (elements.newNovelReferenceStatus) {
    elements.newNovelReferenceStatus.addEventListener('click', event => {
      event.stopPropagation();
      if (pendingReferenceFiles.length > 0) {
        openReferenceManager([], async () => {
          elements.newNovelError.classList.add('hidden');
          elements.newNovelProgress.classList.remove('hidden');
          elements.newNovelProgressText.textContent = '正在分段拆解原著人物、剧情、逻辑、伏笔和节奏...';
          elements.newNovelFile.disabled = true;
          elements.createNewNovelBtn.disabled = true;
          elements.closeNewNovelModal.disabled = true;
          elements.btnCancelNewNovel.disabled = true;
          
          try {
            const filesToAnalyze = [...pendingReferenceFiles];
            const analyses = await analyzeMultipleReferenceFiles(filesToAnalyze);
            const mergedAnalysis = mergeReferenceAnalyses(analyses);
            pendingNewNovelAnalyses = analyses;
            
            if (mergedAnalysis) {
              elements.newNovelBackground.value = mergedAnalysis.suggestedBackground || '';
              elements.newNovelSynopsis.value = mergedAnalysis.suggestedSynopsis || '';
              
              const username = localStorage.getItem('novel_username') || 'default';
              showToast(`所有原著分析完成，已保存至：\n${analyses.map(a => a.savedPath || `data/users/${username}/reference-novels/${a.fileName.replace(/\.txt$/i, '') + '.json'}`).join('\n')}`, 'success');
              
              elements.newNovelProgressText.textContent = '已自动填入背景设定与简介。';
              elements.newNovelReferenceStatus.textContent = `已选择 ${filesToAnalyze.length} 个文件：共 ${mergedAnalysis.sourceLength} 字。点击查看或管理。`;
            }
          } catch (error) {
            showNewNovelError(`分析失败：${error.message}`);
            elements.newNovelProgressText.textContent = `分析失败：${error.message}`;
            showToast(`分析失败：${error.message}`, 'error');
          } finally {
            elements.newNovelProgress.classList.add('hidden');
            elements.newNovelFile.disabled = false;
            elements.createNewNovelBtn.disabled = false;
            elements.closeNewNovelModal.disabled = false;
            elements.btnCancelNewNovel.disabled = false;
          }
        });
      }
    });
  }

  // File Manager Modal events
  if (elements.btnManagerAddFile) {
    elements.btnManagerAddFile.addEventListener('click', () => {
      elements.managerAddFileInput.click();
    });
  }

  if (elements.managerAddFileInput) {
    elements.managerAddFileInput.addEventListener('change', event => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      
      const existingNames = new Set(pendingReferenceFiles.map(f => f.name));
      Array.from(files).forEach(file => {
        if (!existingNames.has(file.name)) {
          pendingReferenceFiles.push(file);
        }
      });
      
      renderManagerFileList();
      elements.managerAddFileInput.value = '';
    });
  }

  if (elements.btnCancelReferenceManager) {
    elements.btnCancelReferenceManager.addEventListener('click', () => {
      elements.referenceManagerModal.classList.add('hidden');
    });
  }

  if (elements.btnConfirmReferenceAnalysis) {
    elements.btnConfirmReferenceAnalysis.addEventListener('click', () => {
      elements.referenceManagerModal.classList.add('hidden');
      if (typeof referenceAnalysisCallback === 'function') {
        referenceAnalysisCallback();
      }
    });
  }

  // Progress Modal close button handler
  if (elements.btnCloseReferenceProgress) {
    elements.btnCloseReferenceProgress.addEventListener('click', () => {
      elements.referenceProgressModal.classList.add('hidden');
    });
  }

  const closeGraphEditor = () => elements.graphEditModal.classList.add('hidden');
  elements.closeGraphEditModal.addEventListener('click', closeGraphEditor);
  document.querySelectorAll('.graph-edit-cancel').forEach(button => {
    button.addEventListener('click', closeGraphEditor);
  });
  elements.graphAddRelation.addEventListener('click', () => {
    const novel = getActiveNovel();
    if (!novel?.characterBible?.length) {
      showToast('当前没有可建立关系的人物。', 'error');
      return;
    }
    openRelationGraphEditor(novel, -1);
  });
  elements.graphCharacterForm.addEventListener('submit', event => {
    event.preventDefault();
    const novel = getActiveNovel();
    try {
      updateCharacterGlobally(novel, elements.graphCharacterOriginalName.value, {
        name: elements.graphCharacterName.value.trim(),
        identity: elements.graphCharacterIdentity.value.trim(),
        publicIdentity: elements.graphCharacterPublicIdentity.value.trim(),
        hiddenIdentities: elements.graphCharacterHiddenIdentities.value
          .split(/[、；;,]/)
          .map(value => value.trim())
          .filter(Boolean),
        identityRevealStage: elements.graphCharacterIdentityRevealStage.value.trim(),
        faction: elements.graphCharacterFaction.value.trim(),
        factionScope: elements.graphCharacterFactionScope.value.trim(),
        storyFunction: elements.graphCharacterStoryFunction.value.trim(),
        ageAndAppearance: elements.graphCharacterAgeAppearance.value.trim(),
        personality: elements.graphCharacterPersonality.value.trim(),
        lifeHistory: elements.graphCharacterLifeHistory.value.trim(),
        growthHistory: elements.graphCharacterGrowthHistory.value.trim(),
        desire: elements.graphCharacterDesire.value.trim(),
        goal: elements.graphCharacterGoal.value.trim(),
        interests: elements.graphCharacterInterests.value.trim(),
        agency: elements.graphCharacterAgency.value.trim(),
        ability: elements.graphCharacterAbility.value.trim(),
        weakness: elements.graphCharacterWeakness.value.trim(),
        arc: elements.graphCharacterArc.value.trim(),
        highlight: elements.graphCharacterHighlight.value.trim(),
        fate: elements.graphCharacterFate.value.trim(),
        plotAnchor: elements.graphCharacterPlotAnchor.value.trim(),
        settingBasis: elements.graphCharacterSettingBasis.value.trim(),
        foreshadowLink: elements.graphCharacterForeshadowLink.value.trim()
      });
      closeGraphEditor();
      showToast('人物已修改，并同步到关系、章节细纲和知识图谱。', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  elements.graphRelationForm.addEventListener('submit', event => {
    event.preventDefault();
    const novel = getActiveNovel();
    try {
      const relationIndex = Number(elements.graphRelationIndex.value);
      const existingRelation = novel?.characterRelations?.[relationIndex];
      updateRelationGlobally(novel, relationIndex, {
        source: elements.graphRelationSource.value,
        target: elements.graphRelationTarget.value,
        type: elements.graphRelationType.value.trim(),
        direction: elements.graphRelationDirection.value,
        description: elements.graphRelationDescription.value.trim(),
        interestConflict: elements.graphRelationConflict.value.trim(),
        evidenceRefs: [...new Set([...(existingRelation?.evidenceRefs || []), 'user-confirmed'])]
      });
      closeGraphEditor();
      showToast('人物关系已修改，并同步到人物档案和知识图谱。', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  elements.deleteGraphRelationBtn.addEventListener('click', () => {
    const novel = getActiveNovel();
    const relationIndex = Number(elements.graphRelationIndex.value);
    const relation = novel?.characterRelations?.[relationIndex];
    if (!relation || !confirm(`确定删除“${relation.source} → ${relation.target}”关系吗？`)) return;
    novel.characterRelations.splice(relationIndex, 1);
    commitGraphEdit(novel);
    closeGraphEditor();
    showToast('关系已删除并完成全局同步。', 'success');
  });

  elements.closeNovelInfoModal.addEventListener('click', closeNovelInfoModal);
  elements.cancelNovelInfo.addEventListener('click', closeNovelInfoModal);
  elements.novelInfoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const openedFrom = novelInfoModalOpenedFrom;
    const novel = state.novels.find(item => item.id === elements.novelInfoId.value);
    if (!novel) return;
    const name = elements.novelInfoName.value.trim();
    const background = elements.novelInfoBackground.value.trim();
    const synopsis = elements.novelInfoSynopsis.value.trim();
    if (!name || !background) {
      showToast('小说名称和背景设定不能为空。', 'error');
      return;
    }
    const sourceChanged = novel.background !== background || novel.synopsis !== synopsis;
    novel.name = name;
    novel.background = background;
    novel.synopsis = synopsis;
    novel.storyConstitution = deriveStoryConstitution(background, synopsis, novel.narrativeKernel);
    if (sourceChanged) {
      novel.consistencyStatus = {
        needsReaudit: Boolean(novel.masterOutline || novel.characterBible?.length || novel.plotBlueprint?.chapters?.length),
        reason: '背景设定或作品简介已修改',
        updatedAt: new Date().toISOString()
      };
    }
    upsertStoryConstitutionAsset(novel);
    refreshNovelKnowledgeGraph(novel);
    saveState();
    void persistNovelKnowledgeGraph(novel);
    renderNovels();

    if (openedFrom === 'file-upload') {
      const formattedText = `背景设定【${background}】，简介：【${synopsis}】`;
      if (elements.agentTaskTextarea) {
        elements.agentTaskTextarea.value = formattedText;
        elements.agentTaskTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        elements.agentTaskTextarea.focus();
        elements.agentTaskTextarea.setSelectionRange(formattedText.length, formattedText.length);
      }
      showToast('背景设定与简介已保存并填入任务输入框，可以直接点击“开始执行”。', 'success');
    } else {
      showToast(sourceChanged && novel.consistencyStatus?.needsReaudit
        ? '背景或简介已修改，作品宪法已更新。请重新执行第一步生成总纲。'
        : '小说信息已保存，知识图谱上下文已更新。', sourceChanged ? 'info' : 'success');
    }
    closeNovelInfoModal();
  });

  elements.graphResetView.addEventListener('click', () => {
    const novel = getActiveNovel();
    characterGraphTransform = { x: 0, y: 0, scale: 1 };
    if (novel?.characterBible?.length) renderCharacterGraph(novel);
  });
  elements.graphSearchInput.addEventListener('input', () => {
    const novel = getActiveNovel();
    if (novel?.characterBible?.length) renderCharacterGraph(novel);
  });
  elements.graphFactionFilter.addEventListener('change', () => {
    const novel = getActiveNovel();
    if (novel?.characterBible?.length) renderCharacterGraph(novel);
  });
  elements.graphRelationFilter.addEventListener('change', () => {
    const novel = getActiveNovel();
    if (novel?.characterBible?.length) renderCharacterGraph(novel);
  });

  const submitAgentTask = async () => {
    const task = elements.agentTaskTextarea.value.trim();
    if (!task) return;

    // Intercept if mentions are present
    const hasMentions = /@\[(.*?)\]\((.*?):(.*?)\)/.test(task);
    if (hasMentions) {
      const intercepted = await handleMentionModificationTask(task);
      if (intercepted) return;
    }

    elements.agentTaskSendBtn.disabled = true;
    elements.agentTaskTextarea.disabled = true;
    elements.agentTaskStatus.classList.remove('hidden');
    elements.agentTaskStatusText.textContent = '正在分配任务...';
    lucide.createIcons();

    let stateManager = null;

    try {
      const activeNovel = getActiveNovel();
      const parsedBrief = parseNovelBriefInput(task);
      if (parsedBrief) {
        const backgroundIssues = validateNovelBackground(parsedBrief.background, parsedBrief.synopsis);
        if (backgroundIssues.length) {
          throw new Error(`背景设定不完整：${backgroundIssues.join('；')}。`);
        }
        elements.agentTaskStatusText.textContent = '已识别背景设定与简介，正在保存独立文件...';
        const savedFile = await saveNovelBriefFile(activeNovel, parsedBrief, task);
        resetDerivedNovelData(activeNovel);
        const explicitAudience = parsedBrief.audience.startsWith('女频')
          ? '女频'
          : parsedBrief.audience.startsWith('男频')
            ? '男频'
            : '';
        activeNovel.background = explicitAudience && !/(男频|女频)/.test(parsedBrief.background)
          ? `${explicitAudience}，${parsedBrief.background}`
          : parsedBrief.background;
        activeNovel.synopsis = parsedBrief.synopsis;
        activeNovel.storyConstitution = deriveStoryConstitution(
          activeNovel.background,
          activeNovel.synopsis
        );
        upsertStoryConstitutionAsset(activeNovel);
        activeNovel.sourceBriefFile = savedFile.relativePath || '';
        refreshNovelKnowledgeGraph(activeNovel);
        saveState();
        void persistNovelKnowledgeGraph(activeNovel);
        if (savedFile.fallback) {
          showToast('独立文件保存接口暂不可用，内容已保存在当前项目中，AI 任务继续执行。', 'info');
        } else {
          showToast(`背景设定与简介已保存至 ${savedFile.relativePath}`, 'success');
        }
      }

      if (!state.apiKey) {
        throw new Error('内容已保存，但尚未配置 API Key，无法开始执行。');
      }

      if (isFinalNovelAuditTask(task)) {
        stateManager = new AgentStateManager('final-audit');
        const finalResult = await buildFinalNovelAudit(task, (status, agentName = '全书终审 Agent', progressPercentage) => {
          if (progressPercentage !== undefined) stateManager.updateProgress(progressPercentage);
          const type = status.includes('错误') || status.includes('失败')
            ? 'error'
            : status.includes('完成') || status.includes('通过')
              ? 'success'
              : 'agent';
          stateManager.log(agentName, status, type);
        }, stateManager);
        const finalReviewRuntime = activeAgentRuntime;
        heartbeatState.pendingReview = '全书最终大纲';
        saveHeartbeatState();
        stateManager.success(
          '全书终审完成，等待人工确认',
          `初检 ${finalResult.audit.initialStaticScore} 分，复审 ${finalResult.audit.score} 分；程序硬校验通过，已审查 ${finalResult.characters.length} 个人物、${finalResult.relations.length} 条关系和 ${finalResult.chapterCount} 章细纲。`,
          async () => {
            const approved = await reviewPlotSystem(finalResult, 'final-audit');
            delete heartbeatState.pendingReview;
            saveHeartbeatState();
            if (!approved) {
              finalReviewRuntime?.reject('用户退回全书终审候选结果。');
              recordNarrativeObservation(activeNovel, {
                type: 'final-audit',
                status: 'rejected',
                summary: '全书终审结果被人工退回',
                details: finalResult.audit?.summary || '',
                source: 'reviewPlotSystem'
              });
              saveState();
              showToast('全书终审结果已退回，现有人物和章节未被修改。', 'info');
              return;
            }
            finalReviewRuntime?.assertContextCurrent();
            const finalCharacterBlockers = getCharacterCommitBlockers({
              characters: finalResult.characters,
              relations: finalResult.relations,
              audit: {
                ...finalResult.audit,
                staticAudit: {
                  ...(finalResult.audit?.staticAudit || {}),
                  targetCount: finalResult.characters.length
                }
              }
            }, activeNovel);
            const finalPlotBlockers = getPlotCommitBlockers(finalResult, activeNovel);
            const finalCommitBlockers = [...new Set([...finalCharacterBlockers, ...finalPlotBlockers])];
            if (finalCommitBlockers.length) {
              const gateError = new Error(`全书终审结果未通过正式写入门禁：${finalCommitBlockers.slice(0, 10).join('；')}`);
              finalReviewRuntime?.fail(gateError);
              throw gateError;
            }
            activeNovel.characterBible = finalResult.characters;
            activeNovel.characterRelations = finalResult.relations;
            activeNovel.promiseLedger = finalResult.promiseLedger;
            activeNovel.plotBlueprint = {
              ...activeNovel.plotBlueprint,
              chapterCount: finalResult.chapterCount,
              architecture: finalResult.architecture,
              chapters: finalResult.chapters,
              audit: finalResult.audit,
              finalAudit: finalResult.audit,
              updatedAt: new Date().toISOString()
            };
            const finalOutline = finalResult.finalOutline || {};
            if (finalOutline.positioning) activeNovel.analysisSummary = finalOutline.positioning;
            ['beginning', 'development', 'climax', 'ending'].forEach(stage => {
              if (finalOutline[stage]) activeNovel.masterOutline[stage] = finalOutline[stage];
            });
            activeNovel.finalAudit = finalResult.audit;
            activeNovel.finalOutline = finalOutline;
            recordNarrativeObservation(activeNovel, {
              type: 'final-audit',
              status: 'accepted',
              summary: '全书终审结果已人工确认并提交正式事实',
              details: `人物${finalResult.characters.length}人，关系${finalResult.relations.length}条，章节${finalResult.chapterCount}章`,
              source: 'reviewPlotSystem'
            });
            const plotTypes = new Set([
              'volume-outline', 'chapter-outline', 'plot-causal-chain', 'plot-timeline',
              'plot-audit', 'final-outline', 'final-audit'
            ]);
            activeNovel.assets = [
              ...activeNovel.assets.filter(asset => !plotTypes.has(asset.type)),
              ...plotSystemToAssets(finalResult, activeNovel.id),
              ...finalNovelAuditToAssets(finalResult, activeNovel.id)
            ];
            updateMasterOutlineAsset(activeNovel);
            syncEmbeddedCharacterRelationships(activeNovel);
            rebuildDerivedCharacterAssets(activeNovel);
            consolidatePromiseLedgerAssets(activeNovel);
            extendCategoryOrderForNarrativeCompiler(activeNovel);
            refreshNovelKnowledgeGraph(activeNovel);
            saveState();
            void persistNovelKnowledgeGraph(activeNovel);
            renderNovels();
            elements.agentTaskTextarea.value = '';
            elements.agentTaskTextarea.style.height = 'auto';
            finalReviewRuntime?.complete('全书终审结果已人工批准并写入正式事实。');
            showToast('全书终审修复与最终综合大纲已应用。', 'success');
          }
        );
        return;
      }

      if (isPlotDesignTask(task)) {
        stateManager = new AgentStateManager('plot');
        const plotResult = await buildPlotSystem(task, (status, agentName = '剧情编排 Agent', progressPercentage) => {
          if (progressPercentage !== undefined) stateManager.updateProgress(progressPercentage);
          let type = 'info';
          if (status.includes('失败') || status.includes('硬错误')) type = 'error';
          else if (status.includes('通过') || status.includes('完成') || status.includes('提交人工复核')) type = 'success';
          else type = 'agent';
          stateManager.log(agentName, status, type);
        }, stateManager);
        const plotReviewRuntime = activeAgentRuntime;

        delete heartbeatState.lastFailure;
        delete heartbeatState.lastFailureAt;
        activeNovel.plotBlueprintDraft = {
          chapterCount: plotResult.chapterCount,
          architecture: plotResult.architecture,
          chapters: plotResult.chapters,
          audit: plotResult.audit,
          updatedAt: new Date().toISOString()
        };
        recordNarrativeObservation(activeNovel, {
          type: 'plot-draft',
          status: 'proposed',
          summary: `生成${plotResult.chapterCount}章剧情细纲草案`,
          details: plotResult.audit?.summary || '',
          source: 'buildPlotSystem'
        });
        saveState();
        heartbeatState.pendingReview = `章节剧情细纲（${plotResult.chapterCount} 章）`;
        saveHeartbeatState();
        stateManager.success(
          plotResult.audit.requiresHumanReview ? '章节细纲已生成，需人工复核' : '章节细纲构建成功',
          `已完成 ${plotResult.architecture.volumes.length} 卷、${plotResult.chapterCount} 章细纲，剧情审计 ${plotResult.audit.score} 分。`,
          async () => {
            const approved = await reviewPlotSystem(plotResult);
            delete heartbeatState.pendingReview;
            saveHeartbeatState();
            if (!approved) {
              plotReviewRuntime?.reject('用户退回章节剧情细纲候选结果。');
              recordNarrativeObservation(activeNovel, {
                type: 'plot-draft',
                status: 'rejected',
                summary: '章节剧情细纲被人工退回并隔离',
                details: plotResult.audit?.summary || '',
                source: 'reviewPlotSystem'
              });
              delete activeNovel.plotBlueprintDraft;
              saveState();
              showToast('章节剧情细纲已退回，现有剧情规划未被覆盖。', 'info');
              return;
            }
            plotReviewRuntime?.assertContextCurrent();
            const plotCommitBlockers = getPlotCommitBlockers(plotResult, activeNovel);
            if (plotCommitBlockers.length) {
              const gateError = new Error(`章节剧情细纲未通过正式写入门禁：${plotCommitBlockers.slice(0, 10).join('；')}`);
              plotReviewRuntime?.fail(gateError);
              throw gateError;
            }
            const plotTypes = new Set([
              'volume-outline', 'chapter-outline', 'plot-causal-chain', 'plot-timeline',
              'plot-audit', 'final-outline', 'final-audit'
            ]);
            activeNovel.assets = [
              ...activeNovel.assets.filter(asset => !plotTypes.has(asset.type)),
              ...plotSystemToAssets(plotResult, activeNovel.id)
            ];
            activeNovel.plotBlueprint = {
              chapterCount: plotResult.chapterCount,
              architecture: plotResult.architecture,
              chapters: plotResult.chapters,
              audit: plotResult.audit,
              updatedAt: new Date().toISOString()
            };
            recordNarrativeObservation(activeNovel, {
              type: 'plot',
              status: 'accepted',
              summary: `${plotResult.chapterCount}章剧情细纲已人工确认`,
              details: `共${plotResult.architecture.volumes.length}卷，审计${plotResult.audit.score}分`,
              source: 'reviewPlotSystem'
            });
            delete activeNovel.plotBlueprintDraft;
            extendCategoryOrderForNarrativeCompiler(activeNovel);
            refreshNovelKnowledgeGraph(activeNovel);
            saveState();
            void persistNovelKnowledgeGraph(activeNovel);
            renderNovels();
            plotReviewRuntime?.complete('章节剧情细纲已人工批准并写入正式事实。');
            showToast(`${plotResult.chapterCount} 章剧情细纲已写入左侧设定库。`, 'success');
          }
        );
        return;
      }

      if (isCharacterBuildingTask(task)) {
        stateManager = new AgentStateManager('character');
        const characterResult = await buildCharacterSystem(task, (status, agentName = '人物深化 Agent', progressPercentage) => {
          if (progressPercentage !== undefined) {
            stateManager.updateProgress(progressPercentage);
          }
          let type = 'info';
          if (status.includes('失败') || status.includes('未通过')) type = 'error';
          else if (status.includes('通过') || status.includes('完成') || status.includes('成功') || status.includes('自愈') || status.includes('协同完成')) type = 'success';
          else if (status.includes('Agent') || status.includes('规划') || status.includes('构思') || status.includes('构建') || status.includes('检查') || status.includes('修正')) type = 'agent';
          stateManager.log(agentName, status, type);
        }, stateManager);
        const characterReviewRuntime = activeAgentRuntime;

        delete heartbeatState.lastFailure;
        delete heartbeatState.lastFailureAt;
        heartbeatState.pendingReview = `人物体系（${characterResult.characters.length} 人）`;
        saveHeartbeatState();
        const characterGate = characterResult.audit?.qualityGate || 'blocked';
        stateManager.success(
          ['blocked', 'draft'].includes(characterGate)
            ? '人物体系已保存为隔离草稿'
            : characterResult.audit?.requiresHumanReview
              ? '人物体系已生成，需人工复核'
              : '人物体系构建成功',
          ['blocked', 'draft'].includes(characterGate)
            ? `已保留当前最佳候选，不会覆盖正式人物库；审计 ${characterResult.audit.score} 分，可查看问题后继续修复。`
            : characterResult.audit?.requiresHumanReview
            ? `已生成 ${characterResult.characters.length} 个具名人物与 ${characterResult.relations.length} 条关系；程序硬审计通过，AI 质量评分 ${characterResult.audit.score} 分，请在审核弹窗中确认。`
            : `成功规划并生成了 ${characterResult.characters.length} 个具名人物与 ${characterResult.relations.length} 条全局人物关系。`,
          async () => {
            elements.agentTaskStatusText.textContent = '人物体系已生成，等待用户审核...';
            const approved = await reviewCharacterSystem(characterResult);
            delete heartbeatState.pendingReview;
            saveHeartbeatState();
            if (!approved) {
              characterReviewRuntime?.reject('用户退回人物体系候选结果。');
              recordNarrativeObservation(activeNovel, {
                type: 'character-system',
                status: 'rejected',
                summary: '人物体系被人工退回并隔离',
                details: characterResult.audit?.summary || '',
                source: 'reviewCharacterSystem'
              });
              saveState();
              showToast('人物体系已退回，现有角色数据未被覆盖。', 'info');
              return;
            }
            characterReviewRuntime?.assertContextCurrent();
            const acceptanceBlockers = getCharacterCommitBlockers(characterResult, activeNovel);
            if (acceptanceBlockers.length) {
              const gateError = new Error(`人物体系未通过正式写入门禁：${acceptanceBlockers.slice(0, 8).join('；')}`);
              characterReviewRuntime?.fail(gateError);
              throw gateError;
            }
            if (!['passed', 'review'].includes(characterResult.audit?.qualityGate)) {
              const gateError = new Error('人物体系仍处于隔离草稿状态，不能写入正式人物库。');
              characterReviewRuntime?.fail(gateError);
              throw gateError;
            }

            const derivedPlotTypes = new Set([
              'volume-outline', 'chapter-outline', 'plot-causal-chain', 'plot-timeline',
              'plot-audit', 'final-outline', 'final-audit'
            ]);
            const preservedAssets = activeNovel.assets.filter(asset =>
              !CHARACTER_TYPE_ORDER.includes(asset.type) &&
              !derivedPlotTypes.has(asset.type)
            );
            const characterAssets = characterResult.characters.map((character, index) =>
              characterToAsset(character, activeNovel.id, index)
            );
            activeNovel.assets = [
              ...preservedAssets,
              ...characterAssets,
              topologyToAsset(characterResult.relations, activeNovel.id)
            ];
            activeNovel.characterBible = characterResult.characters;
            activeNovel.characterRelations = characterResult.relations;
            activeNovel.characterAudit = characterResult.audit;
            delete activeNovel.characterSystemDraft;
            recordNarrativeObservation(activeNovel, {
              type: 'character-system',
              status: 'accepted',
              summary: '人物体系已人工确认并提交正式事实',
              details: `${characterResult.characters.length}人，${characterResult.relations.length}条关系`,
              source: 'reviewCharacterSystem'
            });
            activeNovel.plotBlueprint = null;
            if (!activeNovel.categoryOrder) {
              activeNovel.categoryOrder = {};
            }
            activeNovel.categoryOrder['character-growth'] = [...CHARACTER_TYPE_ORDER];
            if (characterResult.audit) {
              upsertCharacterAuditAsset(activeNovel, characterResult.audit);
            }
            if (activeNovel.activeTarget.type === 'asset') {
              activeNovel.activeTarget = { type: 'chapter', id: activeNovel.currentChapterId };
            }
            refreshNovelKnowledgeGraph(activeNovel);
            delete heartbeatState.lastFailure;
            delete heartbeatState.lastFailureAt;
            saveHeartbeatState();
            saveState();
            void persistNovelKnowledgeGraph(activeNovel);
            renderNovels();
            switchEditorTarget(activeNovel.activeTarget.type, activeNovel.activeTarget.id);
            elements.agentTaskTextarea.value = '';
            elements.agentTaskTextarea.style.height = 'auto';
            characterReviewRuntime?.complete('人物体系已人工批准并写入正式事实。');
            showToast(`人物体系已应用：${characterResult.characters.length} 人，${characterResult.relations.length} 条关系。`, 'success');
          }
        );
        return;
      }

      stateManager = new AgentStateManager('outline');
      const result = await executeAgentTask(task, (status, agentName = '协同分析 Agent', progressPercentage) => {
        if (progressPercentage !== undefined) {
          stateManager.updateProgress(progressPercentage);
        }
        let type = 'info';
        if (status.includes('Agent') || status.includes('并行分析') || status.includes('整合')) type = 'agent';
        else if (status.includes('通过') || status.includes('完成') || status.includes('生成')) type = 'success';
        stateManager.log(agentName, status, type);
      }, stateManager);
      const outlineReviewRuntime = activeAgentRuntime;

      delete heartbeatState.lastFailure;
      delete heartbeatState.lastFailureAt;
      heartbeatState.pendingReview = '全书总纲';
      saveHeartbeatState();
      stateManager.success(
        '全书总纲生成成功',
        '系统已完成世界观、角色、剧情、市场定位分析与总编整合。',
        async () => {
          elements.agentTaskStatusText.textContent = '总纲已生成，等待用户审核...';
          const approved = await reviewMasterOutline(result);
          delete heartbeatState.pendingReview;
          saveHeartbeatState();
          if (!approved) {
            outlineReviewRuntime?.reject('用户退回全书总纲候选结果。');
            recordNarrativeObservation(activeNovel, {
              type: 'master-outline',
              status: 'rejected',
              summary: '全书总纲被人工退回并隔离',
              details: result.summary || '',
              source: 'reviewMasterOutline'
            });
            saveState();
            showToast('总纲已退回，现有设定库未被覆盖。', 'info');
            return;
          }
          outlineReviewRuntime?.assertContextCurrent();
          const derivedOutlineTypes = new Set([
            'main-outline', 'volume-outline', 'chapter-outline', 
            'plot-causal-chain', 'plot-timeline', 'plot-audit', 
            'final-outline', 'final-audit'
          ]);
          const preservedAssets = activeNovel.assets.filter(asset =>
            !derivedOutlineTypes.has(asset.type)
          );
          const generatedAssets = activeNovel.characterBible?.length
            ? result.assets.filter(asset => !CHARACTER_TYPE_ORDER.includes(asset.type))
            : result.assets;
          activeNovel.assets = [
            ...generatedAssets,
            ...preservedAssets
          ];
          applyNarrativeBlueprintResult(activeNovel, result);
          recordNarrativeObservation(activeNovel, {
            type: 'master-outline',
            status: 'accepted',
            summary: '全书总纲已人工确认并提交正式事实',
            details: result.summary || '',
            source: 'reviewMasterOutline'
          });
          consolidatePromiseLedgerAssets(activeNovel);
          ensureCharacterDerivedAssets(activeNovel);
          extendCategoryOrderForNarrativeCompiler(activeNovel);
          if (activeNovel.activeTarget.type === 'asset') {
            activeNovel.activeTarget = { type: 'chapter', id: activeNovel.currentChapterId };
          }
          refreshNovelKnowledgeGraph(activeNovel);
          delete heartbeatState.lastFailure;
          delete heartbeatState.lastFailureAt;
          saveHeartbeatState();
          saveState();
          void persistNovelKnowledgeGraph(activeNovel);
          renderNovels();
          switchEditorTarget(activeNovel.activeTarget.type, activeNovel.activeTarget.id);
          elements.agentTaskTextarea.value = '';
          elements.agentTaskTextarea.style.height = 'auto';
          outlineReviewRuntime?.complete('全书总纲已人工批准并写入正式事实。');
          showToast('任务已完成，左侧设定库已更新。', 'success');
        }
      );
    } catch (error) {
      heartbeatState.lastFailure = compactString(error.message, 400);
      heartbeatState.lastFailureAt = new Date().toISOString();
      saveHeartbeatState();
      const failedNovel = getActiveNovel();
      if (failedNovel) {
        recordNarrativeObservation(failedNovel, {
          type: 'agent-failure',
          status: 'quarantined',
          summary: task,
          details: error.message,
          source: stateManager?.taskType || 'agent-task'
        });
        saveState();
      }
      if (stateManager) {
        stateManager.failure(error.message);
      } else {
        showToast(`任务执行失败：${error.message}`, 'error');
      }
    } finally {
      elements.agentTaskSendBtn.disabled = false;
      elements.agentTaskTextarea.disabled = false;
      elements.agentTaskStatus.classList.add('hidden');
      elements.agentTaskTextarea.focus();
    }
  };

  elements.agentTaskTextarea.addEventListener('input', () => {
    elements.agentTaskTextarea.style.height = 'auto';
    elements.agentTaskTextarea.style.height = `${elements.agentTaskTextarea.scrollHeight}px`;
    checkMentions();
  });
  elements.agentTaskTextarea.addEventListener('keydown', (e) => {
    const dropdown = elements.agentMentionDropdown || document.getElementById('agent-mention-dropdown');
    const isDropdownVisible = dropdown && !dropdown.classList.contains('hidden');
    
    if (isDropdownVisible) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedMentionIndex = (selectedMentionIndex + 1) % filteredMentions.length;
        renderMentionSelection();
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedMentionIndex = (selectedMentionIndex - 1 + filteredMentions.length) % filteredMentions.length;
        renderMentionSelection();
        return;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredMentions[selectedMentionIndex]) {
          const val = elements.agentTaskTextarea.value;
          const caretPos = elements.agentTaskTextarea.selectionStart;
          const lastAtIdx = val.lastIndexOf('@', caretPos - 1);
          insertMention(filteredMentions[selectedMentionIndex], lastAtIdx);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideMentionDropdown();
        return;
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitAgentTask();
    }
  });
  elements.agentTaskSendBtn.addEventListener('click', submitAgentTask);

  document.addEventListener('click', (e) => {
    const dropdown = elements.agentMentionDropdown || document.getElementById('agent-mention-dropdown');
    if (dropdown && !dropdown.contains(e.target) && e.target !== elements.agentTaskTextarea) {
      hideMentionDropdown();
    }
  });

  elements.addNovelBtn.addEventListener('click', openNewNovelModal);
  elements.closeNewNovelModal.addEventListener('click', closeNewNovelModal);
  elements.btnCancelNewNovel.addEventListener('click', closeNewNovelModal);
  elements.newNovelBackground.addEventListener('input', renderNewNovelBackgroundSemantics);
  elements.newNovelSynopsis.addEventListener('input', renderNewNovelBackgroundSemantics);
  elements.newNovelForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = elements.newNovelName.value.trim();
    const background = elements.newNovelBackground.value.trim();
    const synopsis = elements.newNovelSynopsis.value.trim();

    elements.newNovelError.classList.add('hidden');
    if (!name) {
      showNewNovelError('请输入小说名称。');
      return;
    }
    if (!background) {
      showNewNovelError('背景设定为必填项。');
      return;
    }
    const backgroundIssues = validateNovelBackground(background, synopsis);
    if (backgroundIssues.length) {
      showNewNovelError(`背景设定不完整：${backgroundIssues.join('；')}。`);
      elements.newNovelBackground.focus();
      return;
    }
    if (!state.apiKey) {
      showNewNovelError('创建新书需要调用 AI。请先在右上角“设置”中配置并验证 API Key。');
      return;
    }

    const newNovelId = `novel-${Date.now()}`;
    const buttonLabel = elements.createNewNovelBtn.querySelector('span');
    elements.createNewNovelBtn.disabled = true;
    elements.closeNewNovelModal.disabled = true;
    elements.btnCancelNewNovel.disabled = true;
    elements.newNovelProgress.classList.remove('hidden');
    buttonLabel.textContent = '分析中...';
    lucide.createIcons();

    try {
      elements.newNovelProgressText.textContent = '正在保存独立文件...';
      const audienceMatch = background.match(/(男频|女频)/);
      const audience = audienceMatch ? audienceMatch[1] : '';
      const parsedBrief = { background, synopsis, audience };
      const tempNovel = { name, id: newNovelId };
      const savedFile = await saveNovelBriefFile(tempNovel, parsedBrief, `背景设定：【${background}】
简介：【${synopsis}】`);
      if (savedFile.fallback) {
        showToast('独立文件保存接口暂不可用，内容将保存在新建小说项目中，不会下载文件。', 'info');
      } else {
        showToast(`背景设定与简介已保存至 ${savedFile.relativePath}`, 'success');
      }

      elements.newNovelProgressText.textContent = pendingNewNovelAnalyses && pendingNewNovelAnalyses.length > 0
        ? '正在根据原著参考深度拆解人物、情节、伏笔并仿写生成总纲...'
        : (synopsis
            ? '四个专业 Agent 正在结合背景与简介并行分析，随后由总编整合...'
            : '四个专业 Agent 正在根据背景设定并行分析，随后由总编整合...');

      const analysis = await analyzeNovelSetup(
        name,
        background,
        synopsis,
        newNovelId,
        pendingNewNovelAnalyses && pendingNewNovelAnalyses.length > 0 ? JSON.stringify(pendingNewNovelAnalyses) : '',
        '创建完整的新书初始化设定库',
        (status, agentName = '总控 Agent') => {
          elements.newNovelProgressText.textContent = `${agentName}：${status}`;
        }
      );
      elements.newNovelProgressText.textContent = '总纲已通过 AI 审核，正在自动写入设定库...';
      delete heartbeatState.lastFailure;
      delete heartbeatState.lastFailureAt;
      delete heartbeatState.pendingReview;
      saveHeartbeatState();
      const chapterTitle = `第一章：${analysis.firstChapterTitle.replace(/^第[一1]章[：:\s]*/, '')}`;
      const newNovel = {
        id: newNovelId,
        name,
        background,
        synopsis,
        sourceBriefFile: savedFile.relativePath || '',
        analysisSummary: analysis.summary,
        masterOutline: analysis.masterOutline,
        narrativeKernel: analysis.narrativeKernel || null,
        worldPressure: analysis.worldPressure || null,
        factionPlans: Array.isArray(analysis.factionPlans) ? analysis.factionPlans : [],
        eventCards: Array.isArray(analysis.eventCards) ? analysis.eventCards : [],
        promiseLedger: Array.isArray(analysis.promiseLedger) ? analysis.promiseLedger : [],
        stateLedger: Array.isArray(analysis.stateLedger) ? analysis.stateLedger : [],
        outlineAudit: analysis.outlineAudit || null,
        storyConstitution: analysis.storyConstitution || deriveStoryConstitution(
          background,
          synopsis,
          analysis.narrativeKernel
        ),
        consistencyStatus: {
          needsReaudit: false,
          reason: '新书已按作品宪法生成并通过总纲审核',
          updatedAt: new Date().toISOString()
        },
        referenceNovelAnalysis: pendingNewNovelAnalyses && pendingNewNovelAnalyses.length > 0 ? mergeReferenceAnalyses(pendingNewNovelAnalyses) : null,
        chapters: [
          {
            id: 'chapter-1',
            title: chapterTitle,
            content: `# ${chapterTitle}

> AI 开篇建议：${analysis.openingGuide}

`
          }
        ],
        assets: analysis.assets,
        currentChapterId: 'chapter-1',
        activeTarget: { type: 'chapter', id: 'chapter-1' },
        categoryOrder: cloneDefault(DEFAULT_CATEGORY_ORDER)
      };
      if (pendingNewNovelAnalyses && pendingNewNovelAnalyses.length > 0) {
        upsertReferenceAnalysisAsset(newNovel, pendingNewNovelAnalyses);
      }
      upsertStoryConstitutionAsset(newNovel);
      const masterOutlineAsset = newNovel.assets.find(asset =>
        asset.type === 'main-outline' &&
        (asset.name.includes('全书总纲') || asset.name.includes('开始-发展-高潮-结局'))
      ) || newNovel.assets.find(asset => asset.type === 'main-outline');
      if (masterOutlineAsset) {
        newNovel.activeTarget = { type: 'asset', id: masterOutlineAsset.id };
      }
      refreshNovelKnowledgeGraph(newNovel);

      state.novels.push(newNovel);
      state.activeNovelId = newNovelId;
      collapsedNovels = state.novels.map(novel => novel.id).filter(id => id !== newNovelId);
      delete heartbeatState.lastFailure;
      delete heartbeatState.lastFailureAt;
      saveHeartbeatState();
      saveState();
      void persistNovelKnowledgeGraph(newNovel);
      renderChapters();
      renderNovels();
      elements.newNovelModal.classList.add('hidden');
      elements.newNovelForm.reset();
      switchEditorTarget(newNovel.activeTarget.type, newNovel.activeTarget.id);
      pendingNewNovelAnalyses = [];
      pendingReferenceFiles = [];
      showToast(`《${name}》已创建。AI 已完成分析、审核和设定库填充，请自行查阅总纲。`, 'success');
    } catch (error) {
      heartbeatState.lastFailure = compactString(error.message, 400);
      heartbeatState.lastFailureAt = new Date().toISOString();
      saveHeartbeatState();
      showNewNovelError(`AI 分析失败：${error.message}`);
      showToast('新书创建失败，未写入任何数据。', 'error');
    } finally {
      elements.createNewNovelBtn.disabled = false;
      elements.closeNewNovelModal.disabled = false;
      elements.btnCancelNewNovel.disabled = false;
      elements.newNovelProgress.classList.add('hidden');
      buttonLabel.textContent = '分析并创建';
      lucide.createIcons();
    }
  });

  elements.assetType.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      elements.assetCustomType.classList.remove('hidden');
      elements.assetCustomType.setAttribute('required', 'true');
      elements.assetCustomType.focus();
    } else {
      elements.assetCustomType.classList.add('hidden');
      elements.assetCustomType.removeAttribute('required');
    }
  });

  elements.assetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = elements.assetId.value || 'asset-' + Date.now();
    let type = elements.assetType.value;
    if (type === 'custom') {
      type = elements.assetCustomType.value.trim();
      if (!type) {
        alert('请输入自定义类别名称！');
        return;
      }
    }
    const name = elements.assetName.value.trim();
    const desc = elements.assetDesc.value.trim();
    const group = elements.assetGroupType.value;

    const activeNovel = getActiveNovel();
    if (!activeNovel) return;

    const existingIndex = activeNovel.assets.findIndex(a => a.id === id);
    const existingAsset = existingIndex > -1 ? activeNovel.assets[existingIndex] : null;
    const newAsset = { ...(existingAsset || {}), id, group, type, name, desc };
    
    if (existingIndex > -1) {
      activeNovel.assets[existingIndex] = newAsset;
      syncCharacterFromAsset(activeNovel, newAsset);
      refreshTopologyAsset(activeNovel);
    } else {
      activeNovel.assets.push(newAsset);
    }

    refreshNovelKnowledgeGraph(activeNovel);
    saveState();
    void persistNovelKnowledgeGraph(activeNovel);
    renderNovels();
    closeAssetModal();
  });

  elements.chapterSelect.addEventListener('change', (e) => {
    switchEditorTarget('chapter', e.target.value);
  });

  elements.addChapterBtn.addEventListener('click', () => {
    const activeNovel = getActiveNovel();
    if (!activeNovel) return;

    const num = activeNovel.chapters.length + 1;
    const newId = 'chapter-' + Date.now();
    const newTitle = `第${num}章：新篇章`;
    const newContent = `# ${newTitle}

在此开始编写第${num}章的内容...`;

    activeNovel.chapters.push({ id: newId, title: newTitle, content: newContent });
    activeNovel.currentChapterId = newId;
    saveState();
    renderChapters();
    switchEditorTarget('chapter', newId);
    elements.editorTextarea.focus();
  });

  elements.backToChapterBtn.addEventListener('click', () => {
    const activeNovel = getActiveNovel();
    if (!activeNovel) return;
    switchEditorTarget('chapter', activeNovel.currentChapterId);
  });

  elements.editorTextarea.addEventListener('input', () => {
    const activeNovel = getActiveNovel();
    if (!activeNovel) return;
    
    if (activeNovel.activeTarget.type === 'chapter') {
      const currentChapter = activeNovel.chapters.find(ch => ch.id === activeNovel.activeTarget.id);
      if (currentChapter) {
        currentChapter.content = elements.editorTextarea.value;
        saveState();
      }
    } else if (activeNovel.activeTarget.type === 'asset') {
      const currentAsset = activeNovel.assets.find(a => a.id === activeNovel.activeTarget.id);
      if (currentAsset) {
        currentAsset.desc = elements.editorTextarea.value;
        syncCharacterFromAsset(activeNovel, currentAsset);
        refreshTopologyAsset(activeNovel);
        refreshNovelKnowledgeGraph(activeNovel);
        saveState();
        void persistNovelKnowledgeGraph(activeNovel);
      }
    }
  });

  elements.closeModal.addEventListener('click', closeAssetModal);
  elements.btnCancelModal.addEventListener('click', closeAssetModal);
  // User Rule 6: Modals cannot close by clicking outside/backdrop. Only Close (X) or Cancel button works.


  // Settings Modal Event Listeners
  if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener('click', openSettingsModal);
  }
  if (elements.closeSettingsModal) {
    elements.closeSettingsModal.addEventListener('click', () => closeSettingsModal(false));
  }
  if (elements.btnCancelSettings) {
    elements.btnCancelSettings.addEventListener('click', () => closeSettingsModal(false));
  }
  if (elements.btnSaveBg) {
    elements.btnSaveBg.addEventListener('click', async () => {
      saveState();
      if (syncTimeout) clearTimeout(syncTimeout);
      await syncUserDataToServer();
      showToast('背景设置已成功保存并同步！', 'success');
      closeSettingsModal(true);
    });
  }
  const toggleApiKeyVisibility = document.getElementById('toggle-api-key-visibility');
  const apiKeyEyeIcon = document.getElementById('api-key-eye-icon');
  if (toggleApiKeyVisibility && apiKeyEyeIcon && elements.apiKeyInput) {
    toggleApiKeyVisibility.addEventListener('click', () => {
      if (elements.apiKeyInput.type === 'password') {
        elements.apiKeyInput.type = 'text';
        apiKeyEyeIcon.setAttribute('data-lucide', 'eye-off');
      } else {
        elements.apiKeyInput.type = 'password';
        apiKeyEyeIcon.setAttribute('data-lucide', 'eye');
      }
      lucide.createIcons();
    });
  }

  const btnSetPrimary = document.getElementById('btn-set-primary-slot');
  if (btnSetPrimary) {
    btnSetPrimary.addEventListener('click', () => {
      if (state.activeApiKeyId) {
        console.log(`[PrimarySlot] Setting primary model slot: active=${state.activeApiKeyId}, oldPrimary=${state.primaryApiKeyId}`);
        state.primaryApiKeyId = state.activeApiKeyId;
        saveState();
        renderSettingsSlots();
        renderTaskApiSwitch();
        showToast('已成功设为主控模型', 'success');
      }
    });
  }

  if (elements.modelInput && elements.apiUrlInput) {
    elements.modelInput.addEventListener('input', (e) => {
      const modelName = e.target.value.trim().toLowerCase();
      if (!modelName) return;

      if (modelName.startsWith('agnes-')) {
        elements.apiUrlInput.value = 'https://apihub.agnes-ai.com/v1';
      } else if (modelName.startsWith('gemini-')) {
        elements.apiUrlInput.value = 'https://generativelanguage.googleapis.com';
      } else if (modelName.startsWith('gpt-')) {
        elements.apiUrlInput.value = 'https://api.openai.com/v1';
      } else if (modelName.startsWith('deepseek-')) {
        elements.apiUrlInput.value = 'https://api.deepseek.com/v1';
      }
    });
  }
  if (elements.settingsForm) {
    elements.settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const apiKey = elements.apiKeyInput.value.trim();
      const apiModel = elements.modelInput.value.trim() || 'gemini-2.0-flash';
      const apiUrl = elements.apiUrlInput.value.trim() || 'https://generativelanguage.googleapis.com';
      
      // Clear previous error messages
      let oldError = document.getElementById('settings-error-msg');
      if (oldError) oldError.remove();

      if (!apiKey) {
        // Save mock mode settings directly
        const activeSlot = state.apiKeys.find(s => s.id === state.activeApiKeyId);
        if (activeSlot) {
          activeSlot.apiKey = '';
          activeSlot.apiModel = apiModel;
          activeSlot.apiUrl = apiUrl;
        }
        syncActiveApiKeyFromSlots();
        saveState();
        closeSettingsModal(true);
        renderTaskApiSwitch();
        showToast('已切换到模拟模式，设置已保存。', 'info');
        return;
      }

      // Show loading status
      const submitBtn = elements.settingsForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = '正在执行真实生成测试...';

      const pendingConfig = { apiKey, apiModel, apiUrl };
      try {
        const textResult = await callConfiguredAI(
          '你是接口连通性测试助手。只回复“连接成功”。',
          '执行一次真实文本生成测试。',
          false,
          pendingConfig,
          3
        );
        if (!textResult) throw new Error('文本生成测试没有返回内容。');

        const jsonResult = await callConfiguredAI(
          '你是结构化输出测试助手。只返回 JSON 对象，不要输出代码围栏。',
          '返回 {"status":"ok"}',
          true,
          pendingConfig,
          3
        );
        const parsed = parseAIJson(jsonResult);
        if (parsed.status !== 'ok') {
          throw new Error('结构化 JSON 生成测试返回了非预期内容。');
        }

        const activeSlot = state.apiKeys.find(s => s.id === state.activeApiKeyId);
        if (activeSlot) {
          activeSlot.apiKey = apiKey;
          activeSlot.apiModel = apiModel;
          activeSlot.apiUrl = apiUrl;
        }
        syncActiveApiKeyFromSlots();
        saveState();
        closeSettingsModal(true);
        renderTaskApiSwitch();
        showToast('设置已保存：文本生成与结构化 JSON 测试均通过。', 'success');
      } catch (err) {
        if (err.transient && err.status >= 500) {
          const activeSlot = state.apiKeys.find(s => s.id === state.activeApiKeyId);
          if (activeSlot) {
            activeSlot.apiKey = apiKey;
            activeSlot.apiModel = apiModel;
            activeSlot.apiUrl = apiUrl;
          }
          syncActiveApiKeyFromSlots();
          saveState();
          closeSettingsModal(true);
          renderTaskApiSwitch();
          showToast(`配置已保存，但模型服务当前繁忙（HTTP ${err.status}），执行任务时会自动重试。`, 'info');
          return;
        }

        const errorContainer = document.createElement('div');
        errorContainer.id = 'settings-error-msg';
        errorContainer.style.color = 'var(--danger-color)';
        errorContainer.style.fontSize = '0.8rem';
        errorContainer.style.marginTop = '12px';
        errorContainer.style.padding = '10px';
        errorContainer.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        errorContainer.style.border = '1px solid var(--danger-color)';
        errorContainer.style.borderRadius = '6px';
        errorContainer.style.lineHeight = '1.4';
        errorContainer.textContent = `真实生成验证失败：${err.message}`;

        const formActions = elements.settingsForm.querySelector('.form-actions');
        elements.settingsForm.insertBefore(errorContainer, formActions);
        showToast('模型真实生成验证失败。', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  if (elements.slotNameInput) {
    elements.slotNameInput.addEventListener('input', (e) => {
      const activeSlot = state.apiKeys.find(s => s.id === state.activeApiKeyId);
      if (activeSlot) {
        activeSlot.name = e.target.value;
        const activeBtn = elements.settingsSlotsContainer.querySelector('.slot-btn.active span');
        if (activeBtn) {
          activeBtn.textContent = activeSlot.name;
        }
        renderTaskApiSwitch();
      }
    });
  }

  if (elements.btnDeleteSlot) {
    elements.btnDeleteSlot.addEventListener('click', () => {
      if (state.apiKeys.length <= 1) return;
      const index = state.apiKeys.findIndex(s => s.id === state.activeApiKeyId);
      if (index !== -1) {
        console.log(`[DeleteSlot] Deleting slot: ${state.activeApiKeyId}`);
        state.apiKeys.splice(index, 1);
        state.activeApiKeyId = state.apiKeys[0].id;
        syncActiveApiKeyFromSlots();
        saveState();
        
        const activeSlot = state.apiKeys[0];
        elements.apiKeyInput.value = activeSlot.apiKey || '';
        elements.apiUrlInput.value = activeSlot.apiUrl || '';
        elements.modelInput.value = activeSlot.apiModel || '';
        elements.slotNameInput.value = activeSlot.name || '';
        
        renderSettingsSlots();
        renderTaskApiSwitch();
      }
    });
  }

  elements.modeEdit.addEventListener('click', () => {
    if (!elements.knowledgeGraphView.classList.contains('hidden')) return;
    state.viewMode = 'edit';
    saveState();
    applyViewMode();
    elements.editorTextarea.focus();
  });

  elements.modePreview.addEventListener('click', () => {
    if (!elements.knowledgeGraphView.classList.contains('hidden')) return;
    state.viewMode = 'preview';
    saveState();
    applyViewMode();
  });

  elements.btnBold.addEventListener('click', () => wrapSelection('**', '**'));
  elements.btnItalic.addEventListener('click', () => wrapSelection('*', '*'));
  elements.btnComment.addEventListener('click', () => wrapSelection('<!-- ', ' -->'));
  elements.btnHeading.addEventListener('click', () => wrapSelection('### ', ''));
  elements.btnCode.addEventListener('click', () => wrapSelection('```\n', '\n```'));

  elements.editorTextarea.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        wrapSelection('**', '**');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        wrapSelection('*', '*');
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        wrapSelection('### ', '');
      }
    }
  });

  elements.editorPreview.addEventListener('click', (e) => {
    const badge = e.target.closest('.ref-badge');
    if (badge) {
      e.stopPropagation();
      showRefPopover(badge);
    }
  });

  document.addEventListener('click', (e) => {
    if (activePopover && !e.target.closest('.ref-popover') && !e.target.closest('.ref-badge')) {
      closeActivePopover();
    }
  });

}

/**
 * AI Selection Inline Rewrite / Polish Bubble Widget
 */
function initInlineRewrite() {
  const textarea = elements.editorTextarea;
  if (!textarea) return;
  if (textarea.dataset.inlineRewriteInitialized === 'true') return;

  const bubble = document.getElementById('editor-ai-bubble');
  const bubbleModel = document.getElementById('editor-ai-bubble-model');
  const bubbleSelection = document.getElementById('editor-ai-bubble-selection');
  const bubbleTextarea = document.getElementById('editor-ai-bubble-textarea');
  const bubbleCancel = document.getElementById('editor-ai-bubble-cancel');
  const bubbleSubmit = document.getElementById('editor-ai-bubble-submit');
  const bubbleLoading = document.getElementById('editor-ai-bubble-loading');
  const bubbleStatus = document.getElementById('editor-ai-bubble-status');
  const toolbarButton = document.getElementById('btn-ai-rewrite');

  if (
    !bubble ||
    !bubbleModel ||
    !bubbleSelection ||
    !bubbleTextarea ||
    !bubbleCancel ||
    !bubbleSubmit ||
    !bubbleLoading ||
    !bubbleStatus
  ) {
    console.warn('[AI Rewrite] Floating bubble elements not found in DOM.');
    return;
  }
  textarea.dataset.inlineRewriteInitialized = 'true';
  document.body.appendChild(bubble);

  let pointerSelecting = false;
  let lastPointerPosition = null;
  let selectionTimer = null;
  let suppressSelectionUntil = 0;
  let lastObservedSelectionKey = '';

  function getSelectionSourceKey() {
    const novel = getActiveNovel();
    const target = novel?.activeTarget;
    return `${novel?.id || ''}:${target?.type || ''}:${target?.id || ''}`;
  }

  function hideAIBubble() {
    state.aiEditSelection = null;
    bubble.style.display = 'none';
    bubble.style.transform = '';
    bubbleSelection.textContent = '';
    bubbleTextarea.value = '';
    bubbleLoading.style.display = 'none';
    bubbleStatus.textContent = '';
    bubbleStatus.className = 'editor-ai-bubble-status';
    bubbleSubmit.disabled = false;
    bubbleCancel.disabled = false;
  }

  function positionAIBubble(pointerPosition = null) {
    const editorRect = textarea.getBoundingClientRect();
    const bubbleWidth = bubble.offsetWidth || 320;
    const bubbleHeight = bubble.offsetHeight || 170;
    let viewportX;
    let viewportY;

    if (pointerPosition) {
      viewportX = pointerPosition.clientX;
      viewportY = pointerPosition.clientY + 12;
      if (viewportY + bubbleHeight > window.innerHeight - 8) {
        viewportY = pointerPosition.clientY - bubbleHeight - 12;
      }
    } else {
      viewportX = editorRect.left + Math.max(16, (editorRect.width - bubbleWidth) / 2);
      viewportY = Math.min(editorRect.top + 40, window.innerHeight - bubbleHeight - 16);
    }

    viewportX = Math.max(16, Math.min(viewportX, window.innerWidth - bubbleWidth - 16));
    viewportY = Math.max(16, Math.min(viewportY, window.innerHeight - bubbleHeight - 16));
    bubble.style.left = `${viewportX}px`;
    bubble.style.top = `${viewportY}px`;
    bubble.style.transform = '';
  }

  function showAIBubbleForSelection(pointerPosition = null) {
    if (Date.now() < suppressSelectionUntil) return;
    window.clearTimeout(selectionTimer);
    selectionTimer = window.setTimeout(() => {
      const text = textarea.value;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = text.substring(start, end);

      if (selected.trim().length > 0) {
        lastObservedSelectionKey = `${getSelectionSourceKey()}:${start}:${end}`;
        state.aiEditSelection = {
          start,
          end,
          text: selected,
          sourceKey: getSelectionSourceKey()
        };
        bubbleModel.textContent = state.apiModel || '未配置模型';
        bubbleModel.title = state.apiModel || '';
        bubbleSelection.textContent = `已选择：${selected.replace(/\s+/g, ' ').trim()}`;
        bubbleSelection.title = selected;
        bubble.style.display = 'flex';
        bubbleStatus.textContent = '';
        bubbleStatus.className = 'editor-ai-bubble-status';
        window.requestAnimationFrame(() => positionAIBubble(pointerPosition));
      } else {
        if (document.activeElement !== bubbleTextarea && !bubble.contains(document.activeElement)) {
          state.aiEditSelection = null;
          hideAIBubble();
        }
      }
    }, 0);
  }

  textarea.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    pointerSelecting = true;
    lastPointerPosition = { clientX: event.clientX, clientY: event.clientY };
  });
  textarea.addEventListener('pointermove', event => {
    if (!pointerSelecting) return;
    lastPointerPosition = { clientX: event.clientX, clientY: event.clientY };
  });
  textarea.addEventListener('pointerup', event => {
    pointerSelecting = false;
    lastPointerPosition = { clientX: event.clientX, clientY: event.clientY };
    showAIBubbleForSelection(lastPointerPosition);
  });
  textarea.addEventListener('pointercancel', () => {
    pointerSelecting = false;
  });
  textarea.addEventListener('select', () => {
    if (!pointerSelecting) showAIBubbleForSelection(lastPointerPosition);
  });
  document.addEventListener('selectionchange', () => {
    if (document.activeElement === textarea && !pointerSelecting) {
      showAIBubbleForSelection(lastPointerPosition);
    }
  });
  textarea.addEventListener('mouseup', event => {
    showAIBubbleForSelection({ clientX: event.clientX, clientY: event.clientY });
  });
  textarea.addEventListener('touchend', () => {
    window.setTimeout(() => showAIBubbleForSelection(null), 30);
  }, { passive: true });
  textarea.addEventListener('keyup', event => {
    if (event.shiftKey || ['Shift', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      showAIBubbleForSelection(null);
    }
  });
  textarea.addEventListener('input', () => {
    if (bubble.style.display === 'flex' && !bubbleSubmit.disabled) {
      state.aiEditSelection = null;
      hideAIBubble();
    }
  });
  toolbarButton?.addEventListener('mousedown', event => {
    // Preserve the textarea selection before the toolbar takes focus.
    event.preventDefault();
  });
  toolbarButton?.addEventListener('click', () => {
    if (textarea.selectionStart === textarea.selectionEnd) {
      showToast('请先在正文中选择需要 AI 修改的文字。', 'info');
      textarea.focus();
      return;
    }
    showAIBubbleForSelection(null);
    window.setTimeout(() => bubbleTextarea.focus(), 30);
  });

  // Touch selection handles and some embedded browsers do not reliably fire
  // select/pointerup. Observe the textarea range directly as a final fallback.
  window.setInterval(() => {
    if (
      document.visibilityState !== 'visible' ||
      textarea.classList.contains('hidden') ||
      Date.now() < suppressSelectionUntil ||
      bubble.contains(document.activeElement)
    ) {
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectionKey = `${getSelectionSourceKey()}:${start}:${end}`;
    if (start !== end && selectionKey !== lastObservedSelectionKey) {
      lastObservedSelectionKey = selectionKey;
      showAIBubbleForSelection(null);
    } else if (start === end) {
      lastObservedSelectionKey = '';
    }
  }, 120);

  // Global click outside to hide bubble
  document.addEventListener('mousedown', (e) => {
    if (bubble.style.display === 'flex' && !bubble.contains(e.target) && e.target !== textarea) {
      hideAIBubble();
    }
  });

  // Cancel button handler
  bubbleCancel.addEventListener('click', hideAIBubble);

  // Submit/Modify button handler
  bubbleSubmit.addEventListener('click', async () => {
    const instruction = bubbleTextarea.value.trim();
    if (!instruction) {
      bubbleStatus.textContent = '请输入修改指令';
      bubbleStatus.className = 'editor-ai-bubble-status error';
      return;
    }

    if (!state.aiEditSelection) {
      bubbleStatus.textContent = '未检测到选中文本';
      bubbleStatus.className = 'editor-ai-bubble-status error';
      return;
    }

    const contextText = textarea.value;
    const selectedText = state.aiEditSelection.text;
    const start = state.aiEditSelection.start;
    const end = state.aiEditSelection.end;
    if (
      state.aiEditSelection.sourceKey !== getSelectionSourceKey() ||
      contextText.substring(start, end) !== selectedText
    ) {
      state.aiEditSelection = null;
      hideAIBubble();
      showToast('当前文件或选中文字已经变化，请重新选择后再修改。', 'warning');
      return;
    }
    const contextRadius = 1500;
    const contextBefore = contextText.slice(Math.max(0, start - contextRadius), start);
    const contextAfter = contextText.slice(end, Math.min(contextText.length, end + contextRadius));

    // Show loading state
    bubbleLoading.style.display = 'flex';
    bubbleStatus.textContent = '';
    bubbleSubmit.disabled = true;
    bubbleCancel.disabled = true;

    try {
      const systemPrompt = `你是一个专业的小说/文档修改与润色助手。你的任务是根据用户对选中词、句、段的修改指令，结合整个文本的上下文，对其进行完美的修改或重写。
  
请严格遵循以下规则：
1. 必须完全结合上下文（完整文档内容）的语气、风格、角色设定和逻辑关系，确保修改后的文字完美无缝融入上下文。
2. 只输出修改后的替换文本。绝对不要包含任何前言、后记、说明、解释，绝对不要使用 Markdown 代码块（如 \`\`\` 或 \`\`\`text）进行包裹！
3. 保持与原被选中文本相称的标点符号协调性。`;

      const userPrompt = `【完整文件上下文内容】
${contextText}

【当前选中的被修改文本】
${selectedText}

【选区前文】
${contextBefore}

【选区后文】
${contextAfter}

【选区字符位置】
${start}-${end}

【用户的修改/重写指令】
${instruction}

请直接输出修改后的替换文本（不要包含任何其他文字或标记）：`;

      // Call configured AI API
      const resultText = await callConfiguredAI(systemPrompt, userPrompt, false);

      if (!resultText) {
        throw new Error('AI 返回了空文本。');
      }

      // Update document content
      const originalText = textarea.value;
      const updatedText = originalText.substring(0, start) + resultText + originalText.substring(end);
      textarea.value = updatedText;

      // Dispatch input event to save to state / database / local storage and trigger rendering
      textarea.dispatchEvent(new Event('input'));

      // Hide bubble
      suppressSelectionUntil = Date.now() + 500;
      hideAIBubble();

      // Focus back and select the newly inserted text
      textarea.focus();
      textarea.selectionStart = start;
      textarea.selectionEnd = start + resultText.length;

      showToast('AI 修改应用成功', 'success');
    } catch (error) {
      console.error('[AI Rewrite Error]', error);
      bubbleStatus.textContent = error.message || '请求失败，请稍后重试';
      bubbleStatus.className = 'editor-ai-bubble-status error';
    } finally {
      bubbleLoading.style.display = 'none';
      bubbleSubmit.disabled = false;
      bubbleCancel.disabled = false;
    }
  });
}

/* ==========================================================================
   Initialization Launcher
   ========================================================================== */
async function loadUserDataAndLaunch(username, token) {
  const userDisplayName = document.getElementById('user-display-name');
  if (userDisplayName) {
    userDisplayName.textContent = username;
  }

  function loadLocalNamespaceData(uname) {
    state.novels = safeJsonParse(localStorage.getItem(`multi_novels_${uname}`), [], `multi_novels_${uname}`);
    state.activeNovelId = localStorage.getItem(`multi_active_novel_id_${uname}`) || '';
    collapsedNovels = safeJsonParse(localStorage.getItem(`collapsed_novels_${uname}`), [], `collapsed_novels_${uname}`);
    state.apiKey = localStorage.getItem(`novel_api_key_${uname}`) || '';
    state.apiModel = localStorage.getItem(`novel_api_model_${uname}`) || 'gemini-2.0-flash';
    state.apiUrl = localStorage.getItem(`novel_api_url_${uname}`) || 'https://generativelanguage.googleapis.com';
    state.viewMode = localStorage.getItem(`novel_view_mode_${uname}`) || 'edit';
    state.bgImage = localStorage.getItem(`novel_bg_image_${uname}`) || 'solid-warm-white';
    heartbeatState = safeJsonParse(localStorage.getItem(`agent_heartbeat_state_${uname}`), {}, `agent_heartbeat_state_${uname}`);
    state.apiKeys = safeJsonParse(localStorage.getItem(`novel_api_keys_${uname}`), [], `novel_api_keys_${uname}`);
    state.activeApiKeyId = localStorage.getItem(`novel_active_api_key_id_${uname}`) || '';
    state.primaryApiKeyId = localStorage.getItem(`novel_primary_api_key_id_${uname}`) || '';
    syncActiveApiKeyFromSlots();
  }

  try {
    const res = await fetch('/api/user/load-data', {
      headers: { 'X-User-Token': token }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && !data.empty) {
        state.novels = data.novels || [];
        state.activeNovelId = data.activeNovelId || '';
        state.apiKey = data.apiKey || '';
        state.apiModel = data.apiModel || 'gemini-2.0-flash';
        state.apiUrl = data.apiUrl || 'https://generativelanguage.googleapis.com';
        state.viewMode = data.viewMode || 'edit';
        state.bgImage = data.bgImage || localStorage.getItem(`novel_bg_image_${username}`) || 'solid-warm-white';
        state.apiKeys = data.apiKeys || [];
        state.activeApiKeyId = data.activeApiKeyId || '';
        state.primaryApiKeyId = data.primaryApiKeyId || '';
        syncActiveApiKeyFromSlots();
        if (data.collapsedNovels) collapsedNovels = data.collapsedNovels;
        if (data.heartbeatState) heartbeatState = data.heartbeatState;
      } else {
        // 数据迁移检查：若云端空，优先检测浏览器老版本全局 LocalStorage 数据
        let migrated = false;
        const legacyNovelsStr = localStorage.getItem('multi_novels');
        if (legacyNovelsStr) {
          const parsedLegacy = safeJsonParse(legacyNovelsStr, []);
          // 只要包含任何资产或章节，就进行迁移
          if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0 && parsedLegacy.some(n => n.assets?.length > 0 || n.chapters?.length > 0)) {
            console.log(`[Migration] 检测到全局历史数据（含 ${parsedLegacy[0].assets?.length} 个设定项），正在迁移至用户: ${username}`);
            state.novels = parsedLegacy;
            state.activeNovelId = localStorage.getItem('multi_active_novel_id') || parsedLegacy[0].id;
            state.apiKey = localStorage.getItem('novel_api_key') || '';
            state.apiModel = localStorage.getItem('novel_api_model') || 'gemini-2.0-flash';
            state.apiUrl = localStorage.getItem('novel_api_url') || 'https://generativelanguage.googleapis.com';
            state.viewMode = localStorage.getItem('novel_view_mode') || 'edit';
            state.bgImage = data.bgImage || localStorage.getItem('novel_bg_image') || 'solid-warm-white';
            state.apiKeys = safeJsonParse(localStorage.getItem('novel_api_keys'), []);
            state.activeApiKeyId = localStorage.getItem('novel_active_api_key_id') || '';
            state.primaryApiKeyId = localStorage.getItem('novel_primary_api_key_id') || '';
            syncActiveApiKeyFromSlots();
            collapsedNovels = safeJsonParse(localStorage.getItem('collapsed_novels'), []);
            heartbeatState = safeJsonParse(localStorage.getItem('agent_heartbeat_state'), {});
            
            // 立即写入带专属后缀的本地存储，并触发 syncUserDataToServer 同步到服务器！
            saveState();
            migrated = true;
          }
        }
        
        if (!migrated) {
          loadLocalNamespaceData(username);
        }
      }
    } else if (res.status === 401) {
      alert('您的登录已过期，请重新登录。');
      localStorage.removeItem('novel_session_token');
      localStorage.removeItem('novel_username');
      location.reload();
      return;
    } else {
      loadLocalNamespaceData(username);
    }
  } catch (err) {
    console.error('从服务器加载数据失败，改用本地缓存：', err);
    loadLocalNamespaceData(username);
  }

  if (!Array.isArray(state.novels) || !state.novels.length) {
    const defaultNovel = cloneDefault(migratedDefaultNovel);
    defaultNovel.id = `novel-${username}-default`;
    state.novels = [defaultNovel];
  }
  if (!state.activeNovelId || !state.novels.some(n => n.id === state.activeNovelId)) {
    state.activeNovelId = state.novels[0].id;
  }
  if (!Array.isArray(collapsedNovels)) {
    collapsedNovels = state.novels.map(n => n.id).filter(id => id !== state.activeNovelId);
  }

  let migratedStyleChangeCount = 0;
  let constitutionMigrationCount = 0;
  let repairedGraphNameCount = 0;
  let hydratedCharacterProfileCount = 0;
  let repairedBackgroundEntityCount = 0;
  state.novels.forEach(novel => {
    const graphRepair = repairNovelCharacterGraphData(novel);
    if (graphRepair.renamed) {
      repairedGraphNameCount += graphRepair.renamed;
      refreshNovelKnowledgeGraph(novel);
    }
    if (graphRepair.hydratedFields) {
      hydratedCharacterProfileCount += graphRepair.hydratedFields;
      rebuildDerivedCharacterAssets(novel);
      refreshNovelKnowledgeGraph(novel);
    }
    const expectedSignature = createSourceSignature(novel.background, novel.synopsis);
    const needsConstitution = novel.storyConstitution?.sourceSignature !== expectedSignature ||
      !(novel.assets || []).some(asset => asset.type === 'story-constitution');
    ensureStoryConstitution(novel);
    upsertStoryConstitutionAsset(novel);
    if (needsConstitution) constitutionMigrationCount += 1;
    const enforcement = enforceNovelStylePolicy(novel);
    if (enforcement.changes.length) {
      migratedStyleChangeCount += enforcement.changes.length;
      refreshNovelKnowledgeGraph(novel);
    }
    const backgroundEntityRepairs = repairNovelBackgroundTagEntities(novel);
    if (backgroundEntityRepairs.length) {
      repairedBackgroundEntityCount += backgroundEntityRepairs.length;
      refreshNovelKnowledgeGraph(novel);
    }
  });
  if (
    migratedStyleChangeCount > 0 ||
    constitutionMigrationCount > 0 ||
    repairedGraphNameCount > 0 ||
    hydratedCharacterProfileCount > 0 ||
    repairedBackgroundEntityCount > 0
  ) {
    saveState();
    const messages = [];
    if (constitutionMigrationCount) messages.push(`为 ${constitutionMigrationCount} 本作品建立了背景与简介宪法`);
    if (migratedStyleChangeCount) messages.push(`修正 ${migratedStyleChangeCount} 处时代越界表达`);
    if (repairedGraphNameCount) messages.push(`修复 ${repairedGraphNameCount} 个人物姓名及其关系端点`);
    if (hydratedCharacterProfileCount) messages.push(`补全人物档案字段`);
    if (repairedBackgroundEntityCount) messages.push(`修复 ${repairedBackgroundEntityCount} 个背景标签实体化名称及其引用`);
    showToast(`已${messages.join('，')}。`, 'info');
  }

  const activeNovel = getActiveNovel();
  renderChapters();
  renderNovels();
  renderTaskApiSwitch();
  applyBackground();
  
  if (activeNovel) {
    switchEditorTarget(activeNovel.activeTarget.type, activeNovel.activeTarget.id);
  }
  
  initEvents();
  startHeartbeatDaemon();
  lucide.createIcons();
  applyViewMode();
}

async function init() {
  const token = localStorage.getItem('novel_session_token');
  const username = localStorage.getItem('novel_username');
  
  const authContainer = document.getElementById('auth-container');
  const appContainer = document.getElementById('app');
  const authForm = document.getElementById('auth-form');
  const authUsernameInput = document.getElementById('auth-username');
  const authPasswordInput = document.getElementById('auth-password');
  const authError = document.getElementById('auth-error');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const logoutBtn = document.getElementById('logout-btn');
  
  let isRegisterMode = false;
  
  tabLogin.addEventListener('click', () => {
    isRegisterMode = false;
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    authSubmitBtn.textContent = '登录';
    authError.classList.add('hidden');
  });
  
  tabRegister.addEventListener('click', () => {
    isRegisterMode = true;
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    authSubmitBtn.textContent = '注册';
    authError.classList.add('hidden');
  });
  
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameVal = authUsernameInput.value.trim();
    const passwordVal = authPasswordInput.value;
    
    authError.classList.add('hidden');
    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = isRegisterMode ? '正在注册...' : '正在登录...';
    
    try {
      if (isRegisterMode) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameVal, password: passwordVal })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '注册失败。');
        }
        showToast('注册成功，请使用新账号登录！', 'success');
        isRegisterMode = false;
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        authSubmitBtn.textContent = '登录';
        authSubmitBtn.disabled = false;
        authPasswordInput.value = '';
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameVal, password: passwordVal })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '登录失败。');
        }
        localStorage.setItem('novel_session_token', data.token);
        localStorage.setItem('novel_username', data.username);
        
        authContainer.classList.add('hidden');
        await loadUserDataAndLaunch(data.username, data.token);
        appContainer.classList.remove('hidden');
        showToast('登录成功！', 'success');
      }
    } catch (err) {
      authError.textContent = err.message;
      authError.classList.remove('hidden');
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = isRegisterMode ? '注册' : '登录';
    }
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('novel_session_token');
    localStorage.removeItem('novel_username');
    location.reload();
  });

  if (token && username) {
    authContainer.classList.add('hidden');
    await loadUserDataAndLaunch(username, token);
    appContainer.classList.remove('hidden');
  } else {
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
}

// Keep the initial DOM hidden until CSS, authentication, and persisted UI state are ready.
init()
  .catch(error => {
    console.error('应用初始化失败：', error);
    document.getElementById('auth-container')?.classList.remove('hidden');
    document.getElementById('app')?.classList.add('hidden');
  })
  .finally(() => {
    document.documentElement.classList.add('ui-ready');
  });
