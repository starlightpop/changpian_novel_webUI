import './style.css';
import { marked } from 'marked';

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
  'main-character': { name: '核心主角（视角锚点）', icon: 'user' },
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
  'faction-plan': { name: '势力计划', icon: 'network' }
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
    title: '第一章：无风之港',
    content: `# 第一章：无风之港

在静水港的边缘，海风渐渐平息。夕阳将最后一抹残光洒在泛着金属光泽的水面上，海港呈现出一种诡异的宁静。

酒馆里依然喧嚣，关于北方风暴的传闻正在水手与酒客之间悄然蔓延。

“那风暴可不是普通的自然灾害，”年迈的舵手压低声音说道，防备的视线在周围打转，“那是‘风暴使者’的祭礼。他们正在寻找失落的低语档案馆。”
`
  },
  {
    id: 'chapter-2',
    title: '第二章：风暴前夕',
    content: `# 第二章：风暴前夕

风暴使者们已经在暗影中做好了所有的准备。

在静水港高耸的尖塔之上，银翼议会的议员们正进行着激烈的争论。面对日益逼近的黑云，有人主张撤离，而有人则坚持启动尘封的防御卫队。

与此同时，凯伦在一条偏僻的巷子里，感受到了体内那股躁动不安的力量。源能的低吟在他耳边盘旋，提醒着他，终局之战即将拉开序幕。
`
  },
  {
    id: 'chapter-3',
    title: '第三章：低语档案馆',
    content: `# 第三章：低语档案馆

埃拉拉·凡斯站在档案馆的巨大石拱门下。四周弥漫着古老尘埃的味道，无数微光点在幽暗的虚空中闪烁，那正是沉睡千年的低语。

凯伦推开了锈迹斑斑的铜门，冷风夹杂着潮湿的风暴气息在大厅间呼啸，宣告着新秩序的到来。

沉睡的历史正被一点点唤醒。他们需要在这股毁灭性的力量将整个大陆撕裂之前，找到封印的钥匙。
`
  }
];

const DEFAULT_ASSETS = [
  // 世界观设定
  { id: 'ws-loc-1', group: 'world-setting', type: 'location', name: '新手村/启动锚点', desc: '故事的起点，为主角提供最初的安全区与新手任务（如：静水港）。' },
  { id: 'ws-loc-2', group: 'world-setting', type: 'location', name: '核心冲突舞台', desc: '承载中期主线剧情、多方势力交汇的战略要地（如：低语档案馆）。' },
  { id: 'ws-loc-3', group: 'world-setting', type: 'location', name: '高阶禁区/终局之地', desc: '终极秘密的埋藏地，通常与世界观 of 底层逻辑直接挂钩。' },
  { id: 'wf-geo-1', group: 'world-setting', type: 'location', name: '显性地图', desc: '剧情直接发生的物理空间（如：低语档案馆）。' },
  { id: 'wf-geo-2', group: 'world-setting', type: 'location', name: '隐性地图（伏笔位）', desc: '早期被提及但无法进入的区域，通常作为中后期反转的伏笔（如：深渊裂隙）。' },
  
  { id: 'ws-fac-1', group: 'world-setting', type: 'faction', name: '本土/秩序阵营', desc: '维护现有规则或主角最初依附的组织（如：银翼议会）。' },
  { id: 'ws-fac-2', group: 'world-setting', type: 'faction', name: '敌对/反派阵营', desc: '打破现有平衡、制造主要危机的对抗势力（如：风暴使者）。' },
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
  { id: 'tc-pow-1', group: 'themes-core', type: 'core-power', name: '核心能量源', desc: '这个世界最底层的资源、异能或科技载体（如：源能掌控）。' },
  { id: 'tc-pow-2', group: 'themes-core', type: 'core-power', name: '核心心理奖惩机制', desc: '故事带给读者的核心爽点与情绪价值。' },
  { id: 'tv-pow-1', group: 'themes-core', type: 'core-power', name: '源能掌控', desc: '设定世界观中最本质的能量交互方式（如：源能、灵气、算力）。' },
  { id: 'tc-sec-1', group: 'themes-core', type: 'secret-clue', name: '底层埋线（Buried Ledger）', desc: '贯穿全书、涉及世界本质的终极谜题，驱动主角不断打破阶层、探索未知。' },
  { id: 'tv-sec-1', group: 'themes-core', type: 'secret-clue', name: '世界真相', desc: '所有的伏笔最终都指向同一个终极真相（例如：所谓的神其实是某种高维观测者）。' },
  { id: 'tv-sec-2', group: 'themes-core', type: 'secret-clue', name: '因果螺旋', desc: '确保每一卷的结尾都回收了前期的伏笔，同时埋下更高维度的钩子，形成螺旋上升的结构。' },

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
    'narrative-kernel',
    'main-outline',
    'event-card',
    'promise-ledger',
    'state-ledger',
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
  name: '风暴使者手记',
  chapters: safeJsonParse(localStorage.getItem('novel_chapters'), cloneDefault(DEFAULT_CHAPTERS), 'novel_chapters'),
  assets: safeJsonParse(localStorage.getItem('novel_assets'), cloneDefault(DEFAULT_ASSETS), 'novel_assets'),
  currentChapterId: localStorage.getItem('novel_current_chapter') || 'chapter-3',
  activeTarget: safeJsonParse(localStorage.getItem('novel_active_target'), { type: 'chapter', id: 'chapter-3' }, 'novel_active_target'),
  categoryOrder: cloneDefault(DEFAULT_CATEGORY_ORDER)
};

let state = {
  novels: safeJsonParse(localStorage.getItem('multi_novels'), [migratedDefaultNovel], 'multi_novels'),
  activeNovelId: localStorage.getItem('multi_active_novel_id') || 'novel-default',
  apiKey: localStorage.getItem('novel_api_key') || '',
  apiModel: localStorage.getItem('novel_api_model') || 'gemini-2.0-flash',
  apiUrl: localStorage.getItem('novel_api_url') || 'https://generativelanguage.googleapis.com'
};
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

function saveState() {
  localStorage.setItem('multi_novels', JSON.stringify(state.novels));
  localStorage.setItem('multi_active_novel_id', state.activeNovelId);
  localStorage.setItem('collapsed_novels', JSON.stringify(collapsedNovels));
  localStorage.setItem('novel_api_key', state.apiKey);
  localStorage.setItem('novel_api_model', state.apiModel);
  localStorage.setItem('novel_api_url', state.apiUrl);
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

  // Novel Info Modal
  novelInfoModal: document.getElementById('novel-info-modal'),
  novelInfoForm: document.getElementById('novel-info-form'),
  novelInfoId: document.getElementById('novel-info-id'),
  novelInfoName: document.getElementById('novel-info-name'),
  novelInfoBackground: document.getElementById('novel-info-background'),
  novelInfoSynopsis: document.getElementById('novel-info-synopsis'),
  closeNovelInfoModal: document.getElementById('close-novel-info-modal'),
  cancelNovelInfo: document.getElementById('cancel-novel-info'),

  // Settings Modal
  settingsBtn: document.getElementById('settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  settingsForm: document.getElementById('settings-form'),
  apiUrlInput: document.getElementById('api-url-input'),
  apiKeyInput: document.getElementById('api-key-input'),
  modelInput: document.getElementById('model-input'),
  closeSettingsModal: document.getElementById('close-settings-modal'),
  btnCancelSettings: document.getElementById('btn-cancel-settings')
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
      openNovelInfoModal(novel);
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

function renderAssetsForNovel(novel, sectionContentDiv) {
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

  activeNovel.activeTarget = { type, id };
  saveState();

  if (type === 'chapter') {
    elements.knowledgeGraphView.classList.add('hidden');
    elements.editorTextarea.classList.remove('hidden');
    elements.editorPreview.classList.add('hidden');
    elements.modeEdit.classList.add('active');
    elements.modePreview.classList.remove('active');
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
        elements.knowledgeGraphView.classList.remove('hidden');
        renderCharacterGraph(activeNovel);
        return;
      }
      elements.knowledgeGraphView.classList.add('hidden');
      elements.editorTextarea.classList.remove('hidden');
      elements.editorPreview.classList.add('hidden');
      elements.modeEdit.classList.add('active');
      elements.modePreview.classList.remove('active');
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

let characterGraphTransform = { x: 0, y: 0, scale: 1 };

function renderCharacterGraph(novel) {
  const characters = novel.characterBible || [];
  const relations = novel.characterRelations || [];
  const svg = elements.characterGraphSvg;
  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 1200 760');
  const namespace = 'http://www.w3.org/2000/svg';
  const factions = [...new Set(characters.map(character => character.faction || '未归属'))];
  const relationTypes = [...new Set(relations.map(relation => relation.type).filter(Boolean))].sort();
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
  const visibleRelations = relations.filter(relation =>
    visibleNames.has(relation.source) &&
    visibleNames.has(relation.target) &&
    (!elements.graphRelationFilter.value || relation.type === elements.graphRelationFilter.value)
  );
  const factionMap = new Map(factions.map((faction, index) => [faction, index]));
  const positions = new Map();
  const centerX = 520;
  const centerY = 380;
  const factionRadius = Math.min(300, 165 + factions.length * 12);

  factions.forEach((faction, factionIndex) => {
    const members = visibleCharacters.filter(character => (character.faction || '未归属') === faction);
    if (!members.length) return;
    const factionAngle = (Math.PI * 2 * factionIndex) / factions.length - Math.PI / 2;
    const clusterX = centerX + Math.cos(factionAngle) * factionRadius;
    const clusterY = centerY + Math.sin(factionAngle) * factionRadius;
    const memberRadius = Math.max(55, Math.min(150, members.length * 10));
    members.forEach((character, memberIndex) => {
      const angle = (Math.PI * 2 * memberIndex) / Math.max(members.length, 1);
      positions.set(character.name, {
        x: clusterX + Math.cos(angle) * memberRadius,
        y: clusterY + Math.sin(angle) * memberRadius
      });
    });
  });

  const viewport = document.createElementNS(namespace, 'g');
  viewport.setAttribute('class', 'graph-viewport');
  const edgeLayer = document.createElementNS(namespace, 'g');
  const nodeLayer = document.createElementNS(namespace, 'g');
  const edgeElements = [];
  visibleRelations.forEach(relation => {
    const source = positions.get(relation.source);
    const target = positions.get(relation.target);
    if (!source || !target) return;
    const line = document.createElementNS(namespace, 'line');
    line.setAttribute('x1', source.x);
    line.setAttribute('y1', source.y);
    line.setAttribute('x2', target.x);
    line.setAttribute('y2', target.y);
    line.setAttribute('class', 'graph-edge');
    line.dataset.source = relation.source;
    line.dataset.target = relation.target;
    const title = document.createElementNS(namespace, 'title');
    title.textContent = `${relation.source} → ${relation.target}：${relation.type}`;
    line.appendChild(title);
    edgeLayer.appendChild(line);
    edgeElements.push(line);
  });

  visibleCharacters.forEach(character => {
    const position = positions.get(character.name);
    if (!position) return;
    const group = document.createElementNS(namespace, 'g');
    group.setAttribute('class', 'graph-node');
    group.setAttribute('transform', `translate(${position.x} ${position.y})`);
    group.dataset.name = character.name;

    const circle = document.createElementNS(namespace, 'circle');
    circle.setAttribute('r', character.roleTier === '核心主角' ? '18' : '13');
    circle.setAttribute('fill', getFactionColor(character.faction, factionMap.get(character.faction) || 0));
    group.appendChild(circle);

    const label = document.createElementNS(namespace, 'text');
    label.setAttribute('y', character.roleTier === '核心主角' ? '32' : '27');
    label.textContent = character.name;
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
          <div><dt>性格</dt><dd>${escapeHtml(character.personality)}</dd></div>
          <div><dt>主要经历</dt><dd>${escapeHtml(character.lifeHistory)}</dd></div>
          <div><dt>人物弧光</dt><dd>${escapeHtml(character.arc)}</dd></div>
          <div><dt>高光时刻</dt><dd>${escapeHtml(character.highlight)}</dd></div>
          <div><dt>最终结局</dt><dd>${escapeHtml(character.fate)}</dd></div>
          <div><dt>总纲锚点</dt><dd>${escapeHtml(character.plotAnchor)}</dd></div>
          <div><dt>设定依据</dt><dd>${escapeHtml(character.settingBasis)}</dd></div>
          <div><dt>伏笔与回收</dt><dd>${escapeHtml(character.foreshadowLink)}</dd></div>
          <div><dt>欲望与目标</dt><dd>${escapeHtml(character.desire)}；${escapeHtml(character.goal)}</dd></div>
          <div><dt>利益与主动性</dt><dd>${escapeHtml(character.interests)}；${escapeHtml(character.agency)}</dd></div>
        </dl>
      `;
    });
    nodeLayer.appendChild(group);
  });
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
    if (event.target.closest('.graph-node')) return;
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

  elements.graphSummary.textContent =
    `${visibleCharacters.length}/${characters.length} 人 · ${visibleRelations.length}/${relations.length} 条关系 · ${factions.length} 个势力`;
  elements.graphNodeDetail.innerHTML = '<span>点击人物节点查看身份、势力、主要经历、结局、人物弧光、高光与性格。</span>';
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

function updatePreview() {
  const text = elements.editorTextarea.value;
  elements.editorPreview.innerHTML = marked.parse(text);
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
function openNovelInfoModal(novel) {
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
      { value: 'main-character', text: '核心主角（视角锚点）' },
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
  elements.newNovelModal.classList.remove('hidden');
  elements.newNovelError.classList.add('hidden');
  elements.newNovelProgress.classList.add('hidden');
  elements.newNovelName.focus();
}

function closeNewNovelModal() {
  if (elements.createNewNovelBtn.disabled) return;
  elements.newNovelModal.classList.add('hidden');
  elements.newNovelForm.reset();
  elements.newNovelError.classList.add('hidden');
  elements.newNovelProgress.classList.add('hidden');
}

function showNewNovelError(message) {
  elements.newNovelError.textContent = message;
  elements.newNovelError.classList.remove('hidden');
}

function openSettingsModal() {
  elements.settingsModal.classList.remove('hidden');
  elements.apiKeyInput.value = state.apiKey || '';
  elements.modelInput.value = state.apiModel || 'gemini-2.0-flash';
  elements.apiUrlInput.value = state.apiUrl || 'https://generativelanguage.googleapis.com';
}

function closeSettingsModal() {
  elements.settingsModal.classList.add('hidden');
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

async function callConfiguredAI(systemPrompt, userPrompt, jsonMode = false, config = state, retryCount = 2) {
  const baseUrl = String(config.apiUrl || '').replace(/\/$/, '');
  const isGeminiNative = baseUrl.includes('googleapis.com');
  let response;

  try {
    if (isGeminiNative) {
      const generationConfig = jsonMode
        ? { responseMimeType: 'application/json', temperature: 0.45 }
        : { temperature: 0.7 };
      response = await fetch(`${baseUrl}/v1beta/models/${config.apiModel}:generateContent?key=${config.apiKey}`, {
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
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.apiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: jsonMode ? 0.45 : 0.7
        })
      });
    }
  } catch (error) {
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
      await wait((4 - retryCount) * 1500);
      return callConfiguredAI(systemPrompt, userPrompt, jsonMode, config, retryCount - 1);
    }
    throw createAIError(
      `模型 ${config.apiModel} 请求失败（HTTP ${response.status}）：${errorMessage}`,
      response.status,
      errorMessage
    );
  }

  const data = await response.json();
  if (isGeminiNative) {
    const text = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim();
    if (text) return text;
  } else {
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) return content.trim();
    if (Array.isArray(content)) {
      const text = content.map(item => item?.text || item?.content || '').join('').trim();
      if (text) return text;
    }
  }
  throw new Error(`模型 ${config.apiModel} 返回成功，但响应结构中没有可用文本。`);
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
  const rawText = await callConfiguredAI(systemPrompt, userPrompt, true);
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
      true
    );
    return parseAIJson(repairedRaw);
  }
}

const AGENT_SKILL_INDEX = [
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
  'json-repair': `# json-repair
Use when AI JSON fails parsing.
Repair syntax only: missing commas, quotes, braces, brackets, markdown fences, and truncated tails. Preserve semantics and do not invent story facts.`,
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
    description: '协调者分发多个 worker 并合并结果，适合广泛探索和多维创作。'
  };
}

function buildRuntimeTaskContext({ novel, task, extra = '', graphLimit = 18 }) {
  const graphContext = novel
    ? retrieveGraphContext(novel, task, graphLimit)
    : { context: '暂无图谱数据', edges: [] };
  const assets = compactAssetsForContext(novel?.assets || [], task);
  const context = `任务：${task}
小说名称：${novel?.name || '未命名小说'}
背景设定：${compactString(novel?.background || '未提供', 1800)}
作品简介：${compactString(novel?.synopsis || '未提供', 2600)}
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
轻量设定索引：${JSON.stringify(assets)}
GraphRAG 摘要：${compactString(graphContext.context, AGENT_CONTEXT_BUDGET.maxGraphChars)}
相关链路：${compactString(graphContext.edges.map(edge => `${edge.source} --${edge.type}--> ${edge.target}`).join('\n'), 2600)}
${extra}
${getSkillIndexPrompt()}`;
  return compactString(context, AGENT_CONTEXT_BUDGET.maxPromptChars);
}

function compressAgentMemo(text, maxChars = AGENT_CONTEXT_BUDGET.maxAgentMemoChars) {
  return compactString(text, maxChars);
}

class AgentRuntime {
  constructor(task, novel, onStatus = () => {}) {
    this.task = task;
    this.novel = novel;
    this.onStatus = onStatus;
    this.pattern = selectAgentPattern(task);
    this.startedAt = new Date().toISOString();
  }

  async prepare(explicitSkillNames = []) {
    this.onStatus(`总控 Agent 已选择协作模式：${this.pattern.name}。`, '总控 Agent', 8);
    this.skills = await loadSkillsForTask(this.task, explicitSkillNames);
    this.baseContext = buildRuntimeTaskContext({
      novel: this.novel,
      task: this.task,
      extra: `协作模式：${this.pattern.name}｜${this.pattern.description}\n按需加载技能：\n${this.skills}`
    });
    return this;
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
        true
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
  const rawText = await callConfiguredAI(systemPrompt, userPrompt, true);
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
    "beginning": "开始：交代主角初始处境、核心欲望、触发事件与第一阶段目标，300-600字",
    "development": "发展：主要矛盾升级、关系变化、阶段转折与中段危机，500-1000字",
    "climax": "高潮：终局危机、关键真相、主角抉择、核心对抗与情绪爆发，400-800字",
    "ending": "结局：主要矛盾解决、人物归宿、伏笔回收与主题落点，300-600字"
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

function validateNarrativeBlueprint(blueprint) {
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
  blueprint.promiseLedger.forEach((promise, index) => {
    assets.push({
      id: `promise-ledger-${novelId}-${index}-${now}`,
      group: 'plot-framework',
      type: promise.status === 'paid' ? 'payoff' : 'planting',
      name: `伏笔台账：${promise.id}`,
      desc: `类型：${promise.promiseType}
种子事件：${promise.seedEventId}
预计回收：${promise.expectedPayoffWindow}
回收事件：${promise.payoffEventId || '待后续卷回收'}
状态：${promise.status}
风险：${promise.risk}
读者问题：${promise.readerQuestion}`
    });
  });
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
8. 目标是百万字长篇可扩展大纲，不是短篇梗概。`,
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
  let validation = validateNarrativeBlueprint(blueprint);
  for (let round = 0; round < 2 && !validation.passed; round += 1) {
    blueprint = await repairNarrativeBlueprint(context, blueprint, validation, onStatus);
    validation = validateNarrativeBlueprint(blueprint);
  }
  if (!validation.passed) {
    throw new Error(`叙事蓝图结构校验未通过：${validation.issues.slice(0, 8).join('；')}`);
  }
  onStatus(`叙事蓝图校验通过：${blueprint.eventCards.length} 张事件卡，${blueprint.promiseLedger.length} 条伏笔台账。`, '因果校验 Agent', 62);
  return blueprint;
}

async function compileBlueprintToOutline(name, background, synopsis, task, blueprint, novelId, onStatus = () => {}) {
  onStatus('编译 Agent 正在把事件卡、伏笔台账和状态台账编译成用户可审核总纲...', '编译 Agent', 70);
  const compiled = await callJsonAgentWithRepair(
    `你是长篇小说大纲编译 Agent。只返回 JSON：
{
  "analysisSummary": "100字以内作品定位总结",
  "firstChapterTitle": "第一章标题，不含章节序号",
  "openingGuide": "第一章开篇写作提示，120-250字",
  "masterOutline": {
    "beginning": "开始，300-600字",
    "development": "发展，500-1000字",
    "climax": "高潮，400-800字",
    "ending": "结局，300-600字"
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

要求：总纲必须由事件卡因果链编译，不得新造与叙事内核冲突的大事件。开始/发展/高潮/结局必须清晰，给用户审核时能看出全书方向。`,
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
6. masterOutline 是最关键交付物，必须完整包含 beginning、development、climax、ending，分别对应开始、发展、高潮、结局，且四部分均不得为空。
7. 总纲必须从开篇触发事件一直推演到最终结局，明确核心矛盾如何升级、高潮如何爆发、主要伏笔如何回收。
8. 若专业 Agent 意见冲突，以用户任务和原始背景设定为最高优先级。`;

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

async function auditMasterOutlineQuality(context, result, onStatus = () => {}) {
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
7. critical/high 问题存在时 passed 必须为 false；score 低于 85 时 passed 必须为 false。`,
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
  const severe = issues.some(issue => ['critical', 'high'].includes(issue.severity));
  return {
    passed: Boolean(audit.passed) && score >= 85 && !severe,
    score,
    summary: String(audit.summary || '').trim(),
    issues,
    strengths: Array.isArray(audit.strengths) ? audit.strengths.map(String) : []
  };
}

async function repairMasterOutlineQuality(context, result, audit, novelId, onStatus = () => {}) {
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
3. 保持开始、发展、高潮、结局四段完整，增强因果、人物主动性、伏笔回收和意外性。`,
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
  const context = `小说名称：${name}
背景设定：${background || '未提供'}
作品简介：${synopsis || '未提供'}
用户任务：${task}`;
  let audit = await auditMasterOutlineQuality(context, result, onStatus);
  for (let round = 0; round < 3 && !audit.passed; round += 1) {
    result = await repairMasterOutlineQuality(context, result, audit, novelId, onStatus);
    audit = await auditMasterOutlineQuality(context, result, onStatus);
  }
  result.outlineAudit = audit;
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
  onStatus(`总纲审核通过：${audit.score} 分，准备提交用户审核。`, '总控 Agent', 95);
  return result;
}

async function analyzeNovelSetup(name, background, synopsis, novelId, task = '创建完整的新书初始化设定库', onStatus = () => {}) {
  const runtimeNovel = { id: novelId, name, background, synopsis, assets: [] };
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

function getRequestedCharacterCount(task) {
  const countMatch = task.match(/(?:至少|不少于|生成|构建)?\s*(\d{2,3})\s*(?:个|名|位)?人物/);
  return Math.min(80, Math.max(50, countMatch ? Number(countMatch[1]) : 50));
}

function buildNovelKnowledgeGraph(novel) {
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
  Object.entries(GROUP_METADATA).forEach(([group, label]) => {
    addNode({ id: `group:${group}`, kind: 'group', label, text: label });
    edges.push({ source: 'novel-root', target: `group:${group}`, type: 'contains' });
  });

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
  return {
    graph,
    context: contextNodes.map(node => `【${node.kind}｜${node.label}】${String(node.text || '').slice(0, 900)}`).join('\n'),
    edges: relatedEdges.slice(0, 60)
  };
}

function refreshNovelKnowledgeGraph(novel) {
  novel.knowledgeGraph = buildNovelKnowledgeGraph(novel);
}

async function persistNovelKnowledgeGraph(novel) {
  refreshNovelKnowledgeGraph(novel);
  try {
    const response = await fetch('/api/knowledge-graphs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        novelId: novel.id,
        novelName: novel.name,
        graph: novel.knowledgeGraph
      })
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      novel.knowledgeGraphFile = result.relativePath;
      novel.neo4jSync = result.neo4j || { configured: false, synced: false };
      saveState();
    }
  } catch (error) {
    // LocalStorage graph remains available when the persistence service is offline.
  }
}

function getCharacterContext(novel, task = '构建人物', canon = null) {
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
2. 新人物必须能明确挂接到至少一个既有势力、地点、规则、剧情阶段或伏笔链。
3. 若信息冲突，优先级依次为：角色事实裁决 > 用户最新明确指令 > 背景设定与简介 > 已修正总纲 > 左侧设定库 > 模型推断。
4. 工作区名称不得被推断为小说正式书名，也不得用于否定简介中的主角、势力和情节。
5. 不得擅自改变无 CP、男频/女频、力量规则、终局结局等硬约束。
6. 简介中的“哥哥们/其他哥哥”可以扩展为桑二、桑三、桑四、桑五等具名兄弟；这类扩展必须降权为生活职业或凡人社会职能，具备私欲、缺陷、具体伏笔和独立弧光，不得被判为“未在事实裁决中具名”的冲突。
7. “师尊/掌门/悔恨而死/被重创”这类称谓和命运并存时，优先解释为同一角色的公开伪装、实权身份和连续因果；只有同时出现两个不同姓名或互斥时间线时才判为身份矛盾。`;
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

  const synopsis = `${novel.background || ''}\n${novel.synopsis || ''}\n${JSON.stringify(novel.masterOutline || {})}`;
  if (synopsis.includes('青云宗')) {
    ['天衍宗', '天行宗'].forEach(alias => {
      if (alias !== '青云宗') replacements.push({ from: alias, to: '青云宗' });
    });
  }
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
  "obsoleteTerms": ["已确认错误、后续必须废弃的旧主角名或旧势力名"],
  "canonicalCharacters": [{
    "name":"姓名",
    "role":"身份/关系",
    "faction":"明确阵营；未明确时写待剧情确认",
    "storyFunction":"依据简介确定的不可替代剧情功能",
    "evidence":"简介或背景依据"
  }],
  "canonicalFactions": [{"name":"统一名称","aliases":["应废弃或统一的别名"],"evidence":"依据"}],
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
4. 简介未点名但后续可合理出现的重要凡人/低阶修士，可以作为“边缘证人”进入人物体系；不要因未出现在简介中直接判冲突。
4.1 简介中的复数亲缘称谓（如“哥哥们”“其他哥哥”）可以扩展为具名兄弟；必须把他们写成生活职业、证词、情报、药事、机关、商路等独立支线人物，不能扩展成一组规则级战力。
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
    novel.characterBible = [];
    novel.characterRelations = [];
    novel.assets = (novel.assets || []).filter(asset => !CHARACTER_TYPE_ORDER.includes(asset.type));
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
    obsoleteTerms: Array.isArray(result.obsoleteTerms) ? result.obsoleteTerms : []
  };
  applyFactionReplacementsToNovel(novel, canon);
  refreshNovelKnowledgeGraph(novel);
  saveState();
  void persistNovelKnowledgeGraph(novel);
  return canon;
}

function runStaticCharacterAudit(characters, relations, targetCount) {
  const names = characters.map(character => character.name);
  const nameSet = new Set(names);
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
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
  const protagonistTemplatePollution = characters
    .filter(character =>
      (character.roleTier === '核心主角' || /(主角|女主|男主|核心视角)/.test(`${character.identity} ${character.storyFunction}`)) &&
      /(维护.*清白名声|转嫁过错|伪造问责流程|借.*审判压制异议|保住.*宗门体面|戒律审判)/.test(
        `${character.desire} ${character.goal} ${character.interests} ${character.agency}`
      )
    )
    .map(character => character.name);
  const protagonistIdentityLeaks = characters
    .filter(character => {
      const characterText = `${character.name} ${character.identity} ${character.publicIdentity} ${character.roleTier} ${character.storyFunction}`;
      const isViewpointProtagonist = /(桑杳|桑查)/.test(characterText) ||
        (character.roleTier === '核心主角' && !/(苏清歌|小师妹|气运女主|天命女主)/.test(characterText));
      return !isViewpointProtagonist &&
        /(风暴使者|潜在.*职责|连接情感|羁绊.*觉醒)/.test(`${(character.hiddenIdentities || []).join(' ')} ${character.identityRevealStage || ''}`);
    })
    .map(character => character.name);
  const antagonistIdentityBoundaryIssues = characters
    .filter(character =>
      /(莫离|墨离|魔族|魔将|先锋|反派)/.test(`${character.name} ${character.identity} ${character.publicIdentity} ${character.faction} ${character.storyFunction}`) &&
      /(普通少女|风暴使者|潜在.*职责|连接情感|羁绊.*觉醒)/.test(`${character.identity} ${character.publicIdentity} ${(character.hiddenIdentities || []).join(' ')} ${character.identityRevealStage || ''}`)
    )
    .map(character => character.name);
  const ghostReferences = [...new Set([
    ...relations.flatMap(relation => [relation.source, relation.target]),
    ...characters.flatMap(character => {
      const text = [
        character.identity, character.publicIdentity, character.lifeHistory, character.growthHistory,
        character.arc, character.highlight, character.fate, character.desire, character.goal,
        character.interests, character.agency, character.ability, character.weakness,
        character.settingBasis, character.plotAnchor, character.foreshadowLink,
        ...(character.relationships || []).map(relation => `${relation.target} ${relation.dynamic} ${relation.conflict}`)
      ].join('\n');
      return text.match(/桑[二三四五]/g) || [];
    })
  ])].filter(name => name && !nameSet.has(name));
  const weakFamilyConflicts = relations
    .filter(relation =>
      /(桑杳|桑[二三四五]|桑文渊|桑家|父|母|哥哥|兄弟)/.test(`${relation.source} ${relation.target}`) &&
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
  return {
    passed:
      characters.length >= targetCount &&
      duplicateNames.length === 0 &&
      placeholderNames.length === 0 &&
      isolatedCharacters.length === 0 &&
      missingCoreFields.length === 0 &&
      duplicatedProfiles.length === 0 &&
      protagonistTemplatePollution.length === 0 &&
      protagonistIdentityLeaks.length === 0 &&
      antagonistIdentityBoundaryIssues.length === 0 &&
      ghostReferences.length === 0 &&
      weakFamilyConflicts.length === 0 &&
      relations.length >= targetCount,
    duplicateNames: [...new Set(duplicateNames)],
    placeholderNames,
    isolatedCharacters,
    missingCoreFields,
    duplicatedProfiles,
    protagonistTemplatePollution,
    protagonistIdentityLeaks,
    antagonistIdentityBoundaryIssues,
    ghostReferences,
    weakFamilyConflicts,
    relationCount: relations.length,
    actualCount: characters.length,
    targetCount
  };
}

function getHardCharacterAuditIssues(staticAudit) {
  const issues = [];
  if (!staticAudit) return ['静态审计缺失'];
  if (staticAudit.actualCount < staticAudit.targetCount) {
    issues.push(`人物数量不足：${staticAudit.actualCount}/${staticAudit.targetCount}`);
  }
  if (staticAudit.relationCount < staticAudit.targetCount) {
    issues.push(`关系数量不足：${staticAudit.relationCount}/${staticAudit.targetCount}`);
  }
  [
    ['duplicateNames', '人物重名'],
    ['placeholderNames', '占位姓名'],
    ['missingCoreFields', '核心字段缺失'],
    ['protagonistTemplatePollution', '主角模板污染'],
    ['protagonistIdentityLeaks', '主角专属身份外泄'],
    ['antagonistIdentityBoundaryIssues', '反派身份边界错误'],
    ['ghostReferences', '幽灵人物引用']
  ].forEach(([key, label]) => {
    const values = Array.isArray(staticAudit[key]) ? staticAudit[key] : [];
    if (values.length) {
      issues.push(`${label}：${values.slice(0, 8).join('、')}`);
    }
  });
  return issues;
}

function finalizeCharacterAuditForReview(audit, staticAudit, finalSevereIssues, maxRepairRounds) {
  const hardIssues = getHardCharacterAuditIssues(staticAudit);
  if (hardIssues.length) {
    return {
      blocked: true,
      hardIssues,
      audit: {
        ...audit,
        qualityGate: 'blocked',
        requiresHumanReview: false,
        hardIssues,
        staticAudit
      }
    };
  }

  const severeIssues = Array.isArray(finalSevereIssues) ? finalSevereIssues : [];
  const needsHumanReview = !audit.passed || audit.score < 85 || severeIssues.length > 0;
  return {
    blocked: false,
    hardIssues: [],
    audit: {
      ...audit,
      passed: !needsHumanReview,
      qualityGate: needsHumanReview ? 'needs-human-review' : 'passed',
      requiresHumanReview: needsHumanReview,
      repairRounds: maxRepairRounds + 1,
      hardIssues: [],
      staticAudit,
      summary: needsHumanReview
        ? `自动修复 ${maxRepairRounds + 1} 轮后仍有质量建议，已通过程序硬审计，提交人工审核：${audit.summary || '请重点查看剩余问题。'}`
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
    "repair": "明确修复方案"
  }]
}

检查人物是否符合背景、简介、已修正总纲和角色事实裁决；检查身份、势力、欲望、目标、利益、主动性、人物弧光、高光、命运及关系是否具体自洽。隐藏身份必须有合理揭露条件。工作区名称不是小说正式书名；事实裁决中废弃的别名不是有效设定。简介中的“哥哥们/其他哥哥”可合理拆分为具名兄弟，只要他们有生活职业、私欲、具体伏笔和独立弧光，不得因未在事实裁决中逐一具名而判冲突。只报告可执行的真实问题。`,
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
    "repair": "明确修复方案"
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
10. 简介未点名但功能清晰的凡人、低阶修士、证人、商路、医者等角色可以存在；只有他们制造新的规则体系或抢夺主线因果时才判为背景冲突。
11. 简介中的“哥哥们/其他哥哥”可拆分为具名兄弟；审核重点是是否具备生活职业、私欲、具体伏笔和独立弧光，不能因为事实裁决未逐一列名而直接判冲突。
12. 同一角色同时存在“温和师尊伪装、掌门实权、被重创、悔恨而死”时，应按连续因果检查是否解释清楚；不要把称谓变化自动判为两个人或互斥命运。
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
    characterNames: Array.isArray(issue.characterNames) ? issue.characterNames.map(String) : []
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
      problem: `${name} 的欲望、目标或主动行为被反派/宗门权谋模板污染。`,
      repair: '恢复为符合背景、简介和总纲的核心主角弧光：从受伤逃离到被爱治愈，再到主动守护；不得使用伪造流程、转嫁过错、审判压制异议等反派行为逻辑。'
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
      problem: `${name} 复制了主角专属隐藏身份或觉醒职责。`,
      repair: '删除风暴使者/主角觉醒职责相关隐藏身份，改回该角色自身身份冲突和人物弧光。'
    })),
    ...(audit.staticAudit?.antagonistIdentityBoundaryIssues || []).map(name => ({
      severity: 'high',
      category: '反派身份边界',
      characterNames: [name],
      problem: `${name} 的反派/魔族身份与普通少女或风暴使者职责混杂。`,
      repair: '恢复为魔族或反派阵营角色，删除主角专属职责，明确其力量、动机和洗白边界。'
    })),
    ...(audit.staticAudit?.ghostReferences || []).map(name => ({
      severity: 'high',
      category: '幽灵人物',
      characterNames: [],
      problem: `${name} 被关系或人物档案引用，但没有独立人物档案。`,
      repair: '若是简介复数亲缘称谓扩展出的桑家兄弟，必须补成具名人物；否则删除无档案引用并改为已存在人物。'
    })),
    ...(audit.staticAudit?.weakFamilyConflicts || []).map(pair => ({
      severity: 'high',
      category: '家族关系工具人化',
      characterNames: pair.split('-'),
      problem: `${pair} 的利益冲突过于一致或无冲突，导致团宠关系缺少活人感。`,
      repair: '保留亲情底色，但加入生活选择、保护方式、隐瞒信息、职业原则或风险承担上的真实摩擦。'
    }))
  ];
  const combinedSevereIssues = [...severeIssues, ...staticIssues];
  const affectedNames = [...new Set([...explicitNames, ...mentionedNames, ...staticNames])]
    .filter(name => name && existingNameSet.has(name));
  if (!affectedNames.length && (!audit.passed || audit.score < 85)) {
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
      `你是人物体系修复 Agent。只返回 JSON，不要代码围栏：
{"characters":[完整人物对象]}

保持姓名不变，完整返回指定人物的所有原字段。严格根据审计问题修复身份、多重身份、势力、关系、总纲锚点、人物弧光、高光、命运和活人感。不得通过删除欲望、冲突或自主性来消除矛盾。
每条审计问题只作用于明确点名的人物，严禁把其他角色的欲望、目标、行为、弧光、高光或命运复制到本批人物。主角、家人、反派、证人和中立角色的功能边界不得互换。
本批最多 2 人，必须输出完整闭合 JSON；字段文本保持简洁，避免长段落导致截断。`,
      `${context}
本批定向审计问题：${JSON.stringify(routedIssues)}
待修复人物：${JSON.stringify(names.map(name => characterMap.get(name)).filter(Boolean))}
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
        'characters',
        onStatus,
        '人物体系修复 Agent'
      );
    } catch (error) {
      onStatus(`修复批次 ${names.join('、')} 返回 JSON 无法修复，已保留原人物并继续后续批次：${error.message}`);
      continue;
    }
    if (repaired.recovered) {
      onStatus(`修复批次 JSON 损坏，已保留 ${repaired.characters.length} 个可用人物对象，其余保持原设定进入后续审计。`);
    }
    (Array.isArray(repaired.characters) ? repaired.characters : []).forEach(character => {
      if (characterMap.has(character.name)) {
        characterMap.set(character.name, {
          ...characterMap.get(character.name),
          ...character
        });
      }
    });
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
{"relations":[{"source":"姓名","target":"姓名","type":"关系类型","direction":"双向|source指向target","description":"关系现状与变化轨迹","interestConflict":"利益交集或冲突"}]}
只返回涉及待修复人物的关系。不得删除必要冲突，不得产生不存在的人物，至少保持待修复关系的原数量。`,
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
  return {
    characters: repairedCharacters,
    relations: [...untouchedRelations, ...repairedAffectedRelations]
  };
}

function normalizeCharacterData(character, finalRoster, rosterNameSet, requiredFields) {
  character = character && typeof character === 'object' ? character : {};
  const normalized = {};
  
  // 1. Auto-fill required fields with sensible defaults
  requiredFields.forEach(field => {
    let val = String(character[field] || '').trim();
    if (!val) {
      if (field === 'identityRevealStage') val = '无';
      else if (field === 'settingBasis') val = '依据大纲及背景设定';
      else if (field === 'foreshadowLink') val = '剧情因果关联';
      else if (field === 'storyFunction') {
        val = finalRoster.find(item => item.name === character.name)?.storyFunction || '推动剧情发展';
      }
      else val = '暂无详细设定';
    }
    normalized[field] = val;
  });

  // Hidden identities mapping
  normalized.hiddenIdentities = Array.isArray(character.hiddenIdentities)
    ? character.hiddenIdentities.map(value => String(value).trim()).filter(Boolean)
    : [];

  // Prevent identity reveal stage collision
  if (normalized.hiddenIdentities.length > 0 && normalized.identityRevealStage === '无') {
    normalized.identityRevealStage = '随剧情发展揭露';
  }

  // 2. Fuzzy name matching helper for relationships
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
        type: String(relation.type || '关联').trim(),
        dynamic: String(relation.dynamic || '稳定').trim(),
        conflict: String(relation.conflict || '暂无直接冲突').trim()
      };
    })
    .filter(relation =>
      rosterNameSet.has(relation.target) &&
      relation.target !== normalized.name &&
      relation.type
    );

  // 3. Ensure at least 3 relationships by adding defaults referencing other roster members
  if (normalized.relationships.length < 3) {
    const existingTargets = new Set(normalized.relationships.map(r => r.target));
    const rosterNames = Array.from(rosterNameSet);
    
    for (const candidate of rosterNames) {
      if (normalized.relationships.length >= 3) break;
      if (candidate !== normalized.name && !existingTargets.has(candidate)) {
        normalized.relationships.push({
          target: candidate,
          type: '因果关联',
          dynamic: '随剧情发展演变',
          conflict: '暂无直接冲突'
        });
        existingTargets.add(candidate);
      }
    }
  }

  normalized.roleTier = finalRoster.find(item => item.name === normalized.name)?.roleTier || '重要配角';
  normalized.storyFunction = String(
    normalized.storyFunction ||
    finalRoster.find(item => item.name === normalized.name)?.storyFunction ||
    '推动剧情发展'
  ).trim();

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
    relationships: []
  };
}

function getCanonicalProtagonistNames(canon, novel) {
  const names = new Set();
  (canon?.canonicalCharacters || []).forEach(character => {
    if (/(主角|女主|男主|核心视角)/.test(`${character.role || ''} ${character.storyFunction || ''}`)) {
      names.add(character.name);
    }
  });
  const synopsis = `${novel?.background || ''}\n${novel?.synopsis || ''}\n${JSON.stringify(novel?.masterOutline || {})}`;
  ['桑杳', '桑查'].forEach(name => {
    if (synopsis.includes(name)) names.add(name);
  });
  return names;
}

function isCoreProtagonistCharacter(character, canon, novel) {
  const protagonistNames = getCanonicalProtagonistNames(canon, novel);
  const text = `${character.name} ${character.identity} ${character.publicIdentity} ${character.roleTier} ${character.storyFunction}`;
  const explicitNonViewpoint = /(苏清歌|小师妹|气运女主|天命女主|莫离|墨离|魔族|魔将|先锋|反派|青云宗|旧宗门)/.test(text);
  if (protagonistNames.size > 0) {
    return protagonistNames.has(character.name);
  }
  return !explicitNonViewpoint && (
    /(桑杳|桑查)/.test(text) ||
    (character.roleTier === '核心主角' && /(核心视角|视角锚点|本文主角|故事主角)/.test(text))
  );
}

function isProtectedFromAntagonistRewrite(character, canon, novel) {
  if (isCoreProtagonistCharacter(character, canon, novel)) return true;
  const text = `${character.name} ${character.identity} ${character.publicIdentity} ${character.faction} ${character.storyFunction}`;
  return /(桑家|青溪村普通少女|家人|哥哥|父亲|母亲|凡人社会|教书|药师|木匠|说书人|账房)/.test(text) &&
    !/(反派|魔族|魔将|掌门|长老|执法长老|大师兄|旧案裁决|敌对阵营)/.test(text);
}

function diversifyFamilyCluster(characters) {
  const familyCharacters = characters.filter(character =>
    /(桑家|哥哥|兄长|兄弟|家族|父亲|母亲|养父|养母)/.test(
      `${character.name} ${character.identity} ${character.publicIdentity} ${character.faction} ${character.storyFunction}`
    )
  );
  const siblingCharacters = familyCharacters.filter(character =>
    /(^桑[二三四五]$|哥哥|兄长|兄弟|二哥|三哥|四哥|五哥|弟弟)/.test(
      `${character.name} ${character.identity} ${character.publicIdentity} ${character.lifeHistory}`
    )
  );
  const siblingProfilesByName = {
    '桑二': {
      identity: '凡人账房与村塾代课先生',
      lifeHistory: '桑二从小跟着父亲整理村塾账册和粮册，见过凡人家庭在灾年里如何被一笔错账逼到绝路，因此比任何人都重视证据、粮道和秩序。',
      growthHistory: '他曾以为账册只能记录损失，直到旧案逼近青溪村，才意识到凡人的记录也能成为对抗宗门话术的证据。',
      plotAnchor: '发展期旧案问责与凡人证词线',
      desire: '证明普通人的秩序和账册也能保护家人',
      goal: '建立青溪村粮册、药册和避难路线，减少灾难中的无谓牺牲',
      interests: '维护村民生计、桑家清白和凡人社会的基本秩序',
      agency: '通过组织粮道、说服乡邻和记录证据主动改变局势',
      ability: '算账、记忆、组织物资与辨认宗门文书漏洞',
      weakness: '不擅长正面战斗，过度相信文书规则',
      arc: '从躲在父母羽翼下的记账人，成长为敢向宗门问责的凡人证人',
      highlight: '在发展期用账册证明旧宗门隐瞒灾情，迫使中立势力介入',
      fate: '留在凡人社会重建秩序，成为桑家与普通人的纽带',
      foreshadowLink: '回收“母亲连碾死蚂蚁都要落泪”的善意假象：他用账册证明桑家早已暗中照料青溪村孤弱者。'
    },
    '桑三': {
      identity: '说书人兼市井情报掮客',
      lifeHistory: '桑三常年在茶棚、渡口和庙会说书，表面油滑爱笑，实则记得每一段被强者篡改过的传闻。',
      growthHistory: '他早年把故事当作逃避痛苦的壳，后来发现戏本能让被压下去的真相重新在人群中流动。',
      plotAnchor: '高潮前夕旧宗门舆论反转线',
      desire: '让被强者删改的真相重新被普通人记住',
      goal: '用传闻、戏本和街巷消息撕开旧宗门的名声外衣',
      interests: '维护消息源、百姓判断权和自己的叙事自由',
      agency: '主动经营谣言与真相的边界，引导各势力误判',
      ability: '伪装、口才、情报交换和舆论布局',
      weakness: '习惯把痛苦包装成笑话，难以坦诚求助',
      arc: '从用故事逃避现实，成长为愿为真相承担反噬的见证者',
      highlight: '在高潮前夜散出关键戏本，让反派内线提前暴露',
      fate: '活下来记录全局真相，但失去一部分消息网络作为代价',
      foreshadowLink: '回收“前世同门众星拱月小师妹”的群众视角：他用戏本揭穿青云宗如何制造圣女叙事。'
    },
    '桑四': {
      identity: '沉默木匠与机关修补匠',
      lifeHistory: '桑四跟着村中老匠人学木作，后来在修屋、补桥和修井时摸清青溪村旧机关的凡人工程结构；他的机关术来自手艺、地形和材料判断，不是规则权柄。',
      growthHistory: '他从只会闷头修补门窗的木匠，逐渐学会把自己的发现说出来，让村民共同参与防线建设。',
      plotAnchor: '终局前一哥秘境与青溪村古井机关线',
      desire: '用自己的手艺证明不靠血脉力量也能守住家',
      goal: '修复青溪村古井和地脉机关，给凡人留下退路',
      interests: '维护手艺传承、村中孩子和桑家的安稳生活',
      agency: '独自调查村中旧机关，选择把秘密公开给村民共用',
      ability: '木作、机关、地形判断、承重结构修补和凡人陷阱布置；不能制造重力异常、因果改写或规则级干涉',
      weakness: '表达笨拙，习惯独自承担风险',
      arc: '从只会闷头修补的家人，成长为愿意共享秘密的守护者',
      highlight: '在终局前修复古井机关并打开凡人避难地道，使主战场不再绑架无辜者；全程依靠木作、地形和旧机关，不涉及规则级力量',
      fate: '留守青溪村，成为凡人防线的建造者',
      foreshadowLink: '回收“爹娘说一哥被困在秘境里”的长期伏笔：他修复古井机关时发现秘境入口的凡人工程痕迹。'
    },
    '桑五': {
      identity: '游方药师与伤患照料者',
      lifeHistory: '桑五最怕看见别人疼，却偏偏跟着乡野药师学了最苦的伤患照料；他见过被修士斗法波及的凡人，也见过药方被宗门垄断后的无助。',
      growthHistory: '他曾以为救人就是不问立场地递药，后来学会在救人与不让药方被滥用之间做选择。',
      plotAnchor: '发展期凡人城镇疫瘴与药方线',
      desire: '摆脱只会被保护的家人身份，建立自己的救人原则',
      goal: '寻找能救凡人也能制衡修士的药方',
      interests: '维护伤患、药农和自身医德，不让任何阵营把药方变成控制凡人的工具',
      agency: '选择救治敌我双方伤者，并以药性、证词和救治顺序制衡反派毒瘴',
      ability: '药理、辨毒、急救、山野采药和痛症安抚；只能减轻痛苦和稳定伤情，不能替人承担因果或规则级反噬',
      weakness: '厌恶杀戮，关键时刻容易因救人暴露行踪',
      arc: '从逃避冲突的医者，成长为能承担救人与取舍代价的人',
      highlight: '在中期疫瘴线救下一城凡人，但拒绝把药方交给宗门垄断',
      fate: '继续游历行医，成为主线之外独立的民间传说',
      foreshadowLink: '回收“娘亲柔弱落泪”的反差伏笔：他早年跟随母亲救治凡人，知道桑家力量首先用于救人而非炫技。'
    }
  };

  siblingCharacters.forEach(character => {
    const profile = siblingProfilesByName[character.name] ||
      (/(说书|情报|戏本|传闻)/.test(`${character.identity} ${character.storyFunction}`) ? siblingProfilesByName['桑三'] :
        /(木匠|机关|修补|古井|地道)/.test(`${character.identity} ${character.storyFunction}`) ? siblingProfilesByName['桑四'] :
          /(药|医|伤|痛|疗)/.test(`${character.identity} ${character.storyFunction}`) ? siblingProfilesByName['桑五'] :
            siblingProfilesByName['桑二']);
    character.identity = profile.identity;
    character.publicIdentity = profile.identity;
    character.hiddenIdentities = [];
    character.identityRevealStage = '无';
    character.factionScope = '青溪村与凡人社会范围内的生活、手艺或情报影响力，不具备父母级规则权柄';
    character.lifeHistory = profile.lifeHistory;
    character.growthHistory = profile.growthHistory;
    character.desire = profile.desire;
    character.goal = profile.goal;
    character.interests = profile.interests;
    character.agency = profile.agency;
    character.ability = profile.ability;
    character.weakness = profile.weakness;
    character.arc = profile.arc;
    character.highlight = profile.highlight;
    character.fate = profile.fate;
    character.storyFunction = profile.goal;
    character.plotAnchor = profile.plotAnchor;
    character.foreshadowLink = profile.foreshadowLink;
  });
}

function diversifyAntagonistCluster(characters, canon, novel) {
  const antagonistCharacters = characters.filter(character =>
    !isProtectedFromAntagonistRewrite(character, canon, novel) &&
    (
      /(反派|魔族|魔将|敌对|幕后|先锋)/.test(`${character.identity} ${character.publicIdentity} ${character.faction} ${character.storyFunction}`) ||
      /(青云宗|旧宗门)/.test(`${character.faction}`) && /(掌门|长老|执法|大师兄|师尊|裁决|戒律|同门|宗门高层)/.test(`${character.identity} ${character.publicIdentity} ${character.storyFunction}`)
    )
  );
  const profiles = [
    {
      personality: '表面守礼克制，实则擅长以宗门规训包装私利',
      desire: '维护自己在宗门中的清白名声与继承资格',
      goal: '把前世过错转嫁给失势者，保住青云宗体面',
      interests: '维护宗门声望、个人继承权和同门拥护',
      agency: '主动伪造问责流程，借戒律审判压制异议',
      weakness: '过度依赖正道楷模人设，害怕公开证据链',
      arc: '从笃信名声可遮掩一切，到被凡人证据逼迫亲手撕开伪善外衣',
      highlight: '在发展期设下宗门公审局，几乎反杀桑家证词，却因一个自留后手暴露动机',
      fate: '失去宗门继承权后被逐出核心圈，作为活证人承担后续因果清算'
    },
    {
      personality: '冷静务实，信奉力量秩序但不盲从宗门',
      desire: '证明自己的修行路线比青云宗戒律更真实',
      goal: '夺取能证明宗门虚伪的禁卷，为自己换取独立地位',
      interests: '维护自身修行资源和手下生路，不为掌门派系陪葬',
      agency: '在敌我之间下注，关键时刻泄露一半真相换取退路',
      weakness: '算计过深，难以获得任何阵营真正信任',
      arc: '从只求自保的旁观者，转为愿意用一条退路换取真相公开',
      highlight: '在高潮前交出禁卷目录，迫使青云宗高层内部互相指认',
      fate: '带着残部远走，成为后续卷宗中不稳定的灰色盟友'
    },
    {
      personality: '暴烈直率，厌恶宗门礼法，却被魔族军令束缚',
      desire: '摆脱炮灰先锋身份，拿到能谈判的战功',
      goal: '在凡人城镇制造恐惧，但保留一批可交换的人质',
      interests: '维护部下生存、军功和自己对魔族上层的谈判筹码',
      agency: '选择不执行灭口命令，转而利用混乱逼出隐藏势力',
      weakness: '轻视凡人的组织能力，容易被反向围困',
      arc: '从只认武力的先锋，成长为意识到恐惧无法换来真正秩序的败将',
      highlight: '在中期围城战中识破宗门嫁祸，却因放过凡人而被魔族上层追杀',
      fate: '战败但未被抹除，成为揭露魔族内部裂缝的后续伏笔'
    },
    {
      personality: '温和谨慎，擅长以救人名义掩盖立场摇摆',
      desire: '保住自己曾参与错误诊断的秘密',
      goal: '让旧案被定性为误会，而不是宗门系统性迫害',
      interests: '维护医修名誉、药堂资源和被自己救过的人',
      agency: '主动篡改药案，又在证据逼近时选择交出第二份脉案',
      weakness: '无法承认善意也可能造成伤害',
      arc: '从逃避责任的温和旁观者，转向承认自己是伤害链条的一环',
      highlight: '在终审旧案时公开双份脉案，使青云宗无法继续以病症掩盖迫害',
      fate: '被逐出药堂后行医赎罪，长期承担受害者后续治疗'
    },
    {
      personality: '古板执拗，把戒律看得比人命更重',
      desire: '证明旧戒律没有错，错的是执行者不够彻底',
      goal: '用一次完美执法恢复青云宗威严',
      interests: '维护戒律堂权威、宗门秩序和自身信念',
      agency: '主动封锁案卷并调动戒律弟子围捕关键证人',
      weakness: '无法理解规则之外的人情和代价',
      arc: '从规则至上的执法者，走向亲眼看见规则被权力利用后的信念崩塌',
      highlight: '在高潮期拒绝掌门灭口令，转而开放戒律堂旧案库',
      fate: '保住性命但失去职权，余生重修戒律而非力量'
    }
  ];

  antagonistCharacters.forEach((character, index) => {
    const profile = profiles[index % profiles.length];
    character.personality = profile.personality;
    character.desire = profile.desire;
    character.goal = profile.goal;
    character.interests = profile.interests;
    character.agency = profile.agency;
    character.weakness = profile.weakness;
    character.arc = profile.arc;
    character.highlight = profile.highlight;
    character.fate = profile.fate;
    character.foreshadowLink = `通过${profile.goal}连接旧案、宗门内斗和因果清算，不再作为被秒杀的背景板。`;
  });
}

function stabilizeHiddenRetireeIdentities(characters) {
  characters.forEach(character => {
    const text = `${character.name} ${character.identity} ${character.publicIdentity} ${character.lifeHistory} ${character.hiddenIdentities?.join(' ')}`;
    if (!/(顾清河|自封灵力|低阶弟子|退隐|村塾|教书|凡人)/.test(text)) return;
    if (character.name === '顾清河' || /自封灵力|低阶弟子|退隐/.test(text)) {
      character.identity = '青溪村教书先生与旧案边缘证人';
      character.publicIdentity = '青溪村教书先生';
      character.hiddenIdentities = ['曾短暂入过青云宗外门的低阶弟子'];
      character.identityRevealStage = '发展期通过旧外门名册揭露，只证明他见过旧案流程，不赋予规则级力量';
      character.faction = character.faction && !/青云宗|天衍宗|魔族/.test(character.faction)
        ? character.faction
        : '青溪村/凡人社会';
      character.factionScope = '青溪村学堂、旧外门名册和凡人证词范围内的影响力，不参与桑家规则之力体系';
      character.desire = '用教书和证词弥补当年没有站出来的懦弱';
      character.goal = '保护学生和村民，同时补全旧案中凡人证词缺失的一环';
      character.interests = '维护青溪村孩子、旧案真相和自己平静生活的底线';
      character.agency = '主动交出外门名册并组织村民作证，而不是等待桑家替他解决';
      character.ability = '识字、旧外门流程记忆、教书声望和整理证词的能力';
      character.weakness = '灵力已封且境界低微，面对修士威压会本能退缩';
      character.arc = '从退隐避祸的沉默先生，成长为愿意公开旧身份承担证词风险的人';
      character.highlight = '在发展期用外门名册证明青云宗曾系统性筛选并牺牲低阶弟子';
      character.fate = '留在青溪村继续教书，成为凡人证词线的守护者';
      character.foreshadowLink = '旧外门名册是宗门问责线索，不与桑家父母的规则之力重复。';
    }
  });
}

function stabilizeCoreProtagonistArc(characters, canon, novel) {
  characters.forEach(character => {
    if (!isCoreProtagonistCharacter(character, canon, novel)) return;
    const text = `${character.desire} ${character.goal} ${character.interests} ${character.agency} ${character.arc} ${character.highlight} ${character.hiddenIdentities?.join(' ')}`;
    const poisonedByAntagonistTemplate = /(维护.*清白名声|转嫁过错|伪造问责流程|借.*审判压制异议|保住.*宗门体面|戒律审判)/.test(text);
    const hasAwakeningDuty = /风暴使者|连接情感|羁绊|气运|觉醒/.test(`${text} ${novel?.background || ''} ${novel?.synopsis || ''} ${JSON.stringify(novel?.masterOutline || {})}`);
    if (!poisonedByAntagonistTemplate && !hasAwakeningDuty) return;

    const publicIdentity = /青溪村|农户|普通/.test(`${character.publicIdentity} ${character.identity} ${character.lifeHistory}`)
      ? '青溪村普通少女'
      : character.publicIdentity || '故事核心主角';
    character.publicIdentity = publicIdentity;
    character.identity = character.identity && !/掌门|长老|反派|裁决者/.test(character.identity)
      ? character.identity
      : publicIdentity;
    character.hiddenIdentities = hasAwakeningDuty
      ? ['潜在的风暴使者职责（高潮阶段觉醒，不是前期马甲）']
      : [];
    character.identityRevealStage = hasAwakeningDuty
      ? '前期只是普通少女，切菜、护家等“巧合”表现为潜意识情感共鸣；高潮阶段才自觉承担风暴使者职责'
      : '无';
    character.faction = /青云宗|魔族|反派/.test(character.faction || '')
      ? '青溪村/桑家'
      : character.faction;
    character.factionScope = '青溪村、桑家小院与被她主动守护的凡人生活圈；不掌握宗门权力，也不以审判压制他人';
    character.personality = '受过伤后本能退让，珍惜普通生活；遇到家人和无辜者受害时会变得坚定，但仍保留柔软、犹豫和自省';
    character.desire = '摆脱前世被忽视和被比较的阴影，拥有一个真正接纳自己的家';
    character.goal = '先活成普通人，再在危机逼近时主动守住青溪村、家人和自己认定的羁绊';
    character.interests = '维护家人、凡人生活、旧案真相和不被气运叙事吞没的自我尊严';
    character.agency = '她不靠伪造流程或权力审判取胜，而是通过逃离旧宗门、选择信任家人、保护无辜者和公开真相推动剧情';
    character.ability = hasAwakeningDuty
      ? '前期表现为无意识情感共鸣和对因果异常的直觉，高潮后觉醒为连接羁绊、抵抗掠夺式气运的风暴使者职责'
      : character.ability;
    character.weakness = '害怕再次被抛弃，前期容易把退让误认为安全；觉醒职责后也必须学习把守护和自我边界分开';
    character.arc = '从前世受伤后选择逃离，到在新家被爱治愈，再到危机中主动守护他人，最终确认羁绊不是束缚而是她自己的选择';
    character.highlight = '高潮中她不是用权谋压制对手，而是在家人与凡人的证词、选择和爱意连接中觉醒职责，反证掠夺式气运并非唯一道路';
    character.fate = '保住自我与家，继续以普通少女和觉醒职责并存的方式生活，成为“爱比掠夺更强大”的主题落点';
    character.settingBasis = '依据背景设定、简介中重生逃离旧宗门与被农户家人接纳的核心承诺，以及总纲的治愈与守护主题';
    character.plotAnchor = '开始阶段逃离旧宗门，发展阶段被家人治愈并建立羁绊，高潮阶段由潜意识共鸣转为自觉守护，结局完成自我选择';
    character.foreshadowLink = '前期“切菜切断因果线”等迪化事件不再是纯巧合，而是潜意识情感共鸣的微弱外显；高潮觉醒时统一回收。';
    character.storyFunction = '作为从逃避到守护的核心视角，推动治愈、团宠、反气运掠夺和羁绊主题落地';
  });
}

function stabilizeNonProtagonistIdentityLeaks(characters, canon, novel) {
  characters.forEach(character => {
    const fullText = `${character.name} ${character.identity} ${character.publicIdentity} ${character.faction} ${character.storyFunction} ${character.lifeHistory}`;
    if (isCoreProtagonistCharacter(character, canon, novel) && !/(苏清歌|小师妹|气运女主|天命女主)/.test(fullText)) return;
    const identityText = `${(character.hiddenIdentities || []).join(' ')} ${character.identityRevealStage || ''}`;
    if (!/(风暴使者|潜在.*职责|连接情感|羁绊.*觉醒)/.test(identityText)) return;

    character.hiddenIdentities = [];
    character.identityRevealStage = '无';

    if (/(苏清歌|小师妹|气运女主|天命女主)/.test(fullText)) {
      character.identity = character.identity && !/风暴使者|桑杳/.test(character.identity)
        ? character.identity
        : '青云宗小师妹与原书气运女主';
      character.publicIdentity = '青云宗小师妹';
      character.faction = character.faction || '青云宗';
      character.factionScope = '青云宗弟子、气运叙事受益者与旧宗门偏爱链条范围，不具备风暴使者职责';
      character.desire = '确认自己得到的偏爱究竟源于真实情感，还是气运叙事强加的中心位置';
      character.goal = '维持气运女主身份带来的安全感，同时逃避自己也可能伤害他人的事实';
      character.interests = '维护宗门保护、主角光环带来的资源和自我无辜感，但害怕被证明只是气运容器';
      character.agency = '她会主动争取师门偏爱、回避旧案证据，并在气运反噬时选择面对或继续依附宗门';
      character.weakness = '过度依赖被保护的位置，缺少独立判断旧案真相的勇气';
      character.arc = '从相信自己天然值得被众星拱月，到在气运反噬和真相公开中被迫重建自我认知';
      character.highlight = '在发展后段第一次违背气运叙事做出选择，使青云宗内部偏爱链条出现裂缝';
      character.fate = '失去绝对中心位置后承担旧案后果，是否完成自我重建取决于她能否承认受益者责任';
      character.settingBasis = '依据简介中的小师妹、气运女主和旧宗门偏爱链条；不得复制桑杳的风暴使者职责';
      character.plotAnchor = '开始阶段作为偏爱链条触发点，发展阶段面对旧案证据，高潮阶段承受气运反噬，结局承担受益者后果';
      character.foreshadowLink = '她身上的气运异常用于反衬桑杳的羁绊觉醒：一个是被叙事推上中心，一个是主动选择守护。';
      character.storyFunction = '作为原书气运女主和偏爱链条核心受益者，推动旧宗门不公、气运反噬和自我认知崩塌线';
    } else {
      character.foreshadowLink = replaceAllText(character.foreshadowLink, [
        { from: '风暴使者职责', to: '自身身份秘密' },
        { from: '连接情感', to: '所属关系链' }
      ]);
    }
  });
}

function stabilizeAntagonistIdentityBoundaries(characters) {
  characters.forEach(character => {
    const text = `${character.name} ${character.identity} ${character.publicIdentity} ${character.faction} ${character.storyFunction} ${(character.hiddenIdentities || []).join(' ')} ${character.identityRevealStage || ''}`;
    if (!/(莫离|墨离|魔族|魔将|先锋)/.test(text)) return;
    if (!/(普通少女|风暴使者|潜在.*职责|连接情感|羁绊.*觉醒|青溪村普通少女)/.test(text)) return;

    const canonicalName = /墨离/.test(character.name) ? '墨离' : character.name || '莫离';
    character.name = canonicalName;
    character.identity = '魔族先锋将领';
    character.publicIdentity = '魔族先锋将领';
    character.hiddenIdentities = [];
    character.identityRevealStage = '无';
    character.faction = /魔族/.test(character.faction || '') ? character.faction : '魔族';
    character.factionScope = '魔族先锋军与凡人城镇战场范围，受魔族上层军令约束；不拥有风暴使者职责，也不能直接转化为桑杳羁绊力量';
    character.personality = '冷硬寡言，执行军令时克制残酷，但会记住每一次被上层当作弃子的细节';
    character.lifeHistory = '莫离出身魔族边军，被训练成先锋将领，长期在上层命令和部下生存之间做选择；她不是青溪村普通少女，也不是风暴使者候选。';
    character.growthHistory = '从只相信军功和命令，到在凡人城镇战场看见魔族上层也会牺牲自己人，逐渐产生对军令的怀疑。';
    character.desire = '摆脱被魔族上层当作炮灰的命运，为自己和部下争取真正退路';
    character.goal = '完成阶段战功并保住部下，同时查清凡人城镇行动背后的真实目的';
    character.interests = '维护部下性命、战场信誉、军功筹码和不被上层灭口的底线';
    character.agency = '她会主动调整军令执行方式，保留人质或证据作为谈判筹码，而不是等待桑杳感化';
    character.ability = '魔族军阵、先锋统率、近战压制和战场判断；力量边界是军事与魔气体系，不涉及风暴使者、因果疗愈或羁绊觉醒';
    character.weakness = '轻视凡人的组织力，且长期军令思维使她难以理解非功利的守护';
    character.arc = '从只认军令和战功的先锋，转为意识到恐惧无法换来真正秩序，并为部下选择违抗一次灭口令';
    character.highlight = '在中期围城战中识破魔族上层嫁祸与灭口计划，放走关键凡人证人，但因此被上层追杀';
    character.fate = '战败后失去军职，带残部流亡，成为揭露魔族内部裂缝的后续活线索，而非被机械洗白成主角羁绊';
    character.settingBasis = '依据魔族反派阵营、凡人城镇危机和总纲势力冲突线；明确排除风暴使者职责归属';
    character.plotAnchor = '发展期凡人城镇围困线、高潮前魔族内部裂缝线和后续反派情报线';
    character.foreshadowLink = '她保留的军令和证人用于回收魔族内部矛盾，不承担桑杳风暴使者觉醒线。';
    character.storyFunction = '作为魔族先锋与灰色反派，制造外部危机并暴露魔族上层牺牲下级的秩序裂缝';
  });
}

function stabilizeWuchenziIdentity(characters) {
  characters.forEach(character => {
    const text = `${character.name} ${character.identity} ${character.publicIdentity} ${character.faction} ${character.lifeHistory} ${character.arc} ${character.fate}`;
    if (!/(^|\s)无尘子(\s|$)|青云宗掌门|温和师尊|伪善掌权者/.test(text)) return;
    if (character.name !== '无尘子' && !/无尘子/.test(text)) return;

    character.name = character.name || '无尘子';
    character.identity = '青云宗掌门兼前世旧案裁决者';
    character.publicIdentity = '青云宗掌门';
    character.hiddenIdentities = ['曾以温和师长姿态介入桑杳前世旧案的伪善裁决者'];
    character.identityRevealStage = '发展期旧案重审时揭露：所谓温和师尊只是掌门为完成裁决而使用的亲和伪装，并非另一名人物';
    character.faction = '青云宗';
    character.factionScope = '青云宗掌门权柄范围，掌控戒律堂、内门资源和旧案档案；不具备桑家父母级规则权柄';
    character.personality = '外表温和克制，习惯以师长慈悲包装权力计算；内里重视宗门名声胜过具体人的痛苦';
    character.lifeHistory = '无尘子长期以青云宗掌门身份维持正道门面，前世曾用温和师长姿态接近桑杳并主导旧案裁决，使她误以为自己只是被师门冷落，实则被掌门权柄系统性牺牲。';
    character.growthHistory = '从相信宗门大义可以覆盖个体牺牲，到在证据链公开后被迫承认自己把慈悲变成了权力工具。';
    character.desire = '保住青云宗正道清名，并让自己继续被视为温和公正的掌门';
    character.goal = '把桑杳前世旧案定性为私人误会，阻止凡人证词、账册和外门名册串成宗门追责链';
    character.interests = '维护掌门权威、青云宗名声、戒律堂控制权和自己温和师长人设';
    character.agency = '主动删改旧案档案，纵容弟子偏向小师妹，并在发展期启动宗门公审试图反向定罪桑杳';
    character.ability = '宗门权柄、戒律调度、档案封锁、舆论塑形和高阶修为；其力量来自宗门制度而非桑家规则之力';
    character.weakness = '必须维持温和掌门人设，一旦凡人证词和旧案档案同时公开，他的权力叙事会迅速崩塌';
    character.arc = '从以温和师尊面目掩盖掌门裁决，到证据公开后伪装崩塌，最终明白悔恨无法抵消已经造成的伤害';
    character.highlight = '在高潮前以掌门身份启动宗门公审，几乎把旧案翻成桑杳私怨，却被外门名册、账册和戏本证据链反制';
    character.fate = '被桑家父母重创后失去掌门权柄，亲眼看到青云宗旧案公开，最终在悔恨和权力崩塌中死亡';
    character.settingBasis = '依据简介中的前世师门压迫、已统一的青云宗设定和总纲中的因果清算线';
    character.plotAnchor = '发展期旧案重审、高潮前宗门公审和结局因果清算';
    character.foreshadowLink = '统一“温和师尊/青云宗掌门/被桑家父母重创/悔恨而死”四条描述：温和是伪装，掌门是实权，重创导致权柄崩塌，悔恨死亡是最终结果。';
    character.storyFunction = '作为旧宗门制度性伤害的核心责任人，推动旧案追责、宗门公审和终局因果清算';
  });
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

function diversifyDuplicatedCharacterProfiles(characters) {
  const seen = new Map();
  const duplicateProfiles = [
    {
      personality: '冷硬寡言，执行命令时几乎没有情绪，但会记住每一次被上层舍弃的细节',
      desire: '从被驱使的暴力工具变成能决定自己刀锋去向的人',
      goal: '查清自己被派往凡人城镇的真实目的，并为部下争取活路',
      interests: '维护手下性命、战场信誉和自己不再被当作弃子的底线',
      agency: '在围城线中主动违抗灭口命令，选择留下证据而不是扩大屠杀',
      weakness: '习惯用暴力解决问题，面对普通人的信任会迟疑',
      arc: '从只会执行命令的暴力执行者，转为敢背叛上层命令、承担后果的失败者',
      highlight: '在中期围城战中放走关键凡人证人，使魔族嫁祸青云宗的计划提前露出破绽',
      fate: '战败后失去军职，被迫带着残部流亡，成为后续揭露魔族内斗的活线索'
    },
    {
      personality: '清高自持，表面讲道义，内里把宗门名声看得比弟子伤痛更重',
      desire: '证明自己的宗门路线没有错，错的只是被牺牲者不够懂事',
      goal: '压住旧案证词，保住自己在青云宗体系中的话语权',
      interests: '维护宗门体面、个人威望和弟子体系的稳定',
      agency: '主动组织同门统一口径，却在证据压迫下被迫面对自己曾经的沉默',
      weakness: '无法承认体面本身也可能是加害链条的一部分',
      arc: '从维护体面的宗门代表，到被迫承认自己参与过沉默的加害',
      highlight: '在旧案重审中被凡人证词逼到公开选择：继续护宗门，还是承认旧案有罪',
      fate: '失去宗门声望，被排除出核心权力，余生承担旧案证词的追责'
    },
    {
      personality: '谨慎现实，习惯保留后手，不轻易为任何阵营献忠',
      desire: '在宗门崩塌前保住自己的小势力和关键人脉',
      goal: '用半真半假的情报换取退路',
      interests: '维护自身资源、门下生计和不被清算的筹码',
      agency: '主动向双方释放不同版本的情报，制造谈判空间',
      weakness: '算计太多，关键时刻很难获得真正信任',
      arc: '从只想自保的灰色人物，转为用代价换取局部真相公开',
      highlight: '在高潮前交出被藏起的名单，使旧案追责从个人恩怨变成制度问题',
      fate: '保住性命但失去大半资源，成为不稳定的灰色证人'
    }
  ];

  characters.forEach(character => {
    const signature = getCharacterProfileSignature(character);
    if (!signature || signature.replace(/\|/g, '').length < 30) return;
    if (!seen.has(signature)) {
      seen.set(signature, character.name);
      return;
    }
    const text = `${character.name} ${character.identity} ${character.publicIdentity} ${character.faction} ${character.storyFunction}`;
    const profile = /陆沉舟|暴力|执行|先锋|魔族|魔将/.test(text)
      ? duplicateProfiles[0]
      : /青云子|青云宗|宗门|长老|掌门|师兄|师尊/.test(text)
        ? duplicateProfiles[1]
        : duplicateProfiles[2];
    Object.assign(character, profile);
    character.foreshadowLink = `因“${character.name}”的身份与利益重新拆分人物功能，避免与其他角色共享同一弧光、高光和命运。`;
  });
}

function repairFamilyRelationConflicts(relations) {
  if (!Array.isArray(relations)) return relations;
  const conflictTemplates = [
    '亲情一致，但在“继续躲避旧宗门”还是“公开旧案证据”上存在真实分歧',
    '都想保护桑杳，却因保护方式不同产生摩擦：一方主张隐瞒风险，一方主张让她知道真相',
    '家庭利益一致，但职业原则不同：救人、记账、情报和机关各有底线，不能无代价配合',
    '彼此信任，但对是否动用桑家隐藏资源存在争执，担心过早暴露会牵连凡人',
    '情感上站在同一边，行动上会因恐惧、愧疚或责任分配不均产生冲突'
  ];
  let templateIndex = 0;
  return relations.map(relation => {
    const relationText = `${relation.source} ${relation.target} ${relation.type} ${relation.description} ${relation.interestConflict}`;
    const isFamilyRelation = /(桑杳|桑[二三四五]|桑文渊|桑家|父|母|哥哥|兄弟)/.test(`${relation.source} ${relation.target} ${relation.description}`);
    const weakConflict = /(无实质冲突|利益一致|没有冲突|无冲突|完全一致|共同保护|暂无直接冲突)/.test(relationText);
    if (!isFamilyRelation || !weakConflict) return relation;
    const repaired = { ...relation };
    repaired.interestConflict = conflictTemplates[templateIndex % conflictTemplates.length];
    templateIndex += 1;
    repaired.description = repaired.description && !/摩擦|分歧|代价/.test(repaired.description)
      ? `${repaired.description}；亲情底色下仍保留生活选择和信息透明度的摩擦。`
      : repaired.description;
    return repaired;
  });
}

function stabilizeKeyRelations(relations) {
  if (!Array.isArray(relations)) return relations;
  return repairFamilyRelationConflicts(relations).map(relation => {
    if (relation.source !== '无尘子' && relation.target !== '无尘子') return relation;
    const normalized = { ...relation };
    normalized.type = replaceAllText(normalized.type, [
      { from: '温和师尊', to: '旧案裁决/伪装师承' },
      { from: '师尊', to: '旧案裁决者' }
    ]);
    normalized.description = replaceAllText(normalized.description, [
      { from: '温和师尊', to: '以温和师长姿态伪装的青云宗掌门' },
      { from: '被桑家父母捅穿', to: '被桑家父母重创后权柄崩塌并悔恨而死' },
      { from: '掌门堕魔', to: '掌门伪装崩塌' }
    ]);
    normalized.interestConflict = replaceAllText(normalized.interestConflict, [
      { from: '温和师尊', to: '伪装师长姿态的掌门权力' },
      { from: '掌门堕魔', to: '掌门权力失控' }
    ]);
    return normalized;
  });
}

function applyDeterministicCharacterRepairs(characters, canon, novel) {
  diversifyFamilyCluster(characters);
  diversifyAntagonistCluster(characters, canon, novel);
  stabilizeHiddenRetireeIdentities(characters);
  stabilizeCoreProtagonistArc(characters, canon, novel);
  stabilizeNonProtagonistIdentityLeaks(characters, canon, novel);
  stabilizeAntagonistIdentityBoundaries(characters);
  stabilizeWuchenziIdentity(characters);
  diversifyDuplicatedCharacterProfiles(characters);
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

      const key = `${source}->${target}`;
      const revKey = `${target}->${source}`;
      if (!seenPairs.has(key)) {
        validRelations.push({
          source,
          target,
          type,
          direction,
          description,
          interestConflict
        });
        seenPairs.add(key);
        if (direction === '双向') {
          seenPairs.add(revKey);
        }
      }
    }
  });

  const degree = new Map(characterNames.map(name => [name, 0]));
  validRelations.forEach(relation => {
    degree.set(relation.source, (degree.get(relation.source) || 0) + 1);
    degree.set(relation.target, (degree.get(relation.target) || 0) + 1);
  });

  // Every named character must participate in the global topology. Prefer
  // low-degree counterparts so the repair does not create a single hub.
  characterNames.forEach(source => {
    while ((degree.get(source) || 0) < 2) {
      const target = characterNames
        .filter(name => name !== source)
        .filter(name => {
          const key = `${source}->${name}`;
          const revKey = `${name}->${source}`;
          return !seenPairs.has(key) && !seenPairs.has(revKey);
        })
        .sort((a, b) => (degree.get(a) || 0) - (degree.get(b) || 0))[0];
      if (!target) break;
      validRelations.push({
        source,
        target,
        type: '剧情因果',
        direction: '双向',
        description: '双方的主动选择在关键剧情节点形成持续影响',
        interestConflict: '各自目标与阵营利益既有交集，也存在需要付出代价的分歧'
      });
      seenPairs.add(`${source}->${target}`);
      seenPairs.add(`${target}->${source}`);
      degree.set(source, (degree.get(source) || 0) + 1);
      degree.set(target, (degree.get(target) || 0) + 1);
    }
  });

  if (validRelations.length < targetCount) {
    for (let i = 0; i < characterNames.length; i++) {
      if (validRelations.length >= targetCount) break;
      const source = characterNames[i];
      for (let j = i + 1; j < characterNames.length; j++) {
        if (validRelations.length >= targetCount) break;
        const target = characterNames[j];
        
        const key = `${source}->${target}`;
        const revKey = `${target}->${source}`;
        if (!seenPairs.has(key) && !seenPairs.has(revKey)) {
          validRelations.push({
            source,
            target,
            type: '利益关联',
            direction: '双向',
            description: '在大局起伏中形成的交织线索',
            interestConflict: '在大势所趋下面临不同的立场抉择'
          });
          seenPairs.add(key);
          seenPairs.add(revKey);
        }
      }
    }
  }

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

function inferRosterContext(novelContext = '', task = '', canon = {}) {
  const text = `${novelContext}\n${task}\n${JSON.stringify(canon || {})}`;
  const protagonist = ['桑杳', '桑查'].find(name => text.includes(name)) || '主角';
  const mainFamily = text.includes('桑家') || text.includes('哥哥') || text.includes('爹爹') || text.includes('娘亲')
    ? '桑家/青溪村'
    : '主角原生家庭';
  const formerSect = text.includes('青云宗') ? '青云宗' : text.includes('天衍宗') ? '天衍宗' : '旧宗门';
  const antagonistFaction = text.includes('魔族') ? '魔族' : '反派阵营';
  const village = text.includes('青溪村') ? '青溪村' : '凡人城镇';
  return { protagonist, mainFamily, formerSect, antagonistFaction, village };
}

function createDeterministicRosterEntry(index, existingKeys, canon = {}, rosterContext = {}) {
  const surnames = ['陆', '白', '莫', '沈', '顾', '谢', '林', '秦', '叶', '楚', '云', '姜', '祁', '温', '洛', '韩', '许', '阮', '纪', '宋', '萧', '宁', '封', '明', '寒', '柳', '晏', '池', '岑', '苏'];
  const givenNames = [
    '沉舟', '知微', '见月', '行舟', '闻溪', '青衡', '砚秋', '归荑', '照夜', '扶光',
    '问澜', '疏影', '临渊', '守拙', '怀瑾', '听雪', '观棋', '长缨', '如晦', '折枝',
    '映寒', '止戈', '归鸿', '照林', '兰因', '承霜', '栖梧', '无咎', '景行', '令仪'
  ];
  let name = '';
  for (let offset = 0; offset < surnames.length * givenNames.length; offset += 1) {
    const candidate = `${surnames[(index + offset) % surnames.length]}${givenNames[(index * 7 + offset) % givenNames.length]}`;
    if (!existingKeys.has(getRosterNameKey(candidate))) {
      name = candidate;
      break;
    }
  }
  if (!name) name = `纪元外编${index + 1}`;

  const factionNames = (canon.canonicalFactions || []).map(faction => faction.name).filter(Boolean);
  const factionTemplates = [
    rosterContext.mainFamily || factionNames[0] || '桑家/凡人小院',
    factionNames.find(name => /宗/.test(name)) || rosterContext.formerSect || '旧宗门',
    rosterContext.antagonistFaction || '反派阵营',
    '中立情报势力',
    '隐藏势力',
    rosterContext.village || '凡人城镇',
    '地方秩序阵营',
    '秘境遗留势力'
  ];
  const templates = [
    {
      identity: `${rosterContext.protagonist || '主角'}原生家庭的旧识与生活见证者`,
      roleTier: '重要配角',
      faction: factionTemplates[0],
      storyFunction: '见证主角家庭真相，承担日常温情与身份反差伏笔'
    },
    {
      identity: `${factionTemplates[1]}外门执事`,
      roleTier: '重要配角',
      faction: factionTemplates[1],
      storyFunction: '掌握旧宗门偏见链条，推动前世因果追责'
    },
    {
      identity: `${factionTemplates[2]}斥候统领`,
      roleTier: '重要配角',
      faction: factionTemplates[2],
      storyFunction: '制造阶段性危机，暴露反派组织行动逻辑'
    },
    {
      identity: '中立商路情报人',
      roleTier: '重要配角',
      faction: factionTemplates[3],
      storyFunction: '连接凡人城镇、宗门和反派动向，提供代价型情报'
    },
    {
      identity: '隐秘血脉记录者',
      roleTier: '重要配角',
      faction: factionTemplates[4],
      storyFunction: '保管主角身世与家庭真相的关键证据'
    },
    {
      identity: `${factionTemplates[5]}守夜人`,
      roleTier: '重要配角',
      faction: factionTemplates[5],
      storyFunction: '从普通人视角承接灾难后果，推动主角守护动机'
    },
    {
      identity: '地方秩序仲裁者',
      roleTier: '重要配角',
      faction: factionTemplates[6],
      storyFunction: '在宗门规则与凡人利益之间制造制度冲突'
    },
    {
      identity: '秘境封印看守后裔',
      roleTier: '重要配角',
      faction: factionTemplates[7],
      storyFunction: '关联失踪兄长线索，承担伏笔回收入口'
    }
  ];
  return normalizeRosterEntry({
    name,
    ...templates[index % templates.length]
  });
}

function ensureFamilySiblingRoster(roster, canon, novel, targetCount) {
  const text = `${novel?.background || ''}\n${novel?.synopsis || ''}\n${JSON.stringify(novel?.masterOutline || {})}`;
  if (!/(桑杳|桑查)/.test(text) || !/(哥哥们|其他哥哥|兄弟|哥哥|二哥|三哥|四哥|五哥|桑五)/.test(text)) {
    return roster;
  }
  const canonicalNames = new Set((canon?.canonicalCharacters || []).map(character => character.name).filter(Boolean));
  const requiredSiblings = [
    {
      name: '桑二',
      identity: '桑家二哥，凡人账房与村塾代课先生',
      roleTier: '重要配角',
      faction: '桑家/青溪村',
      storyFunction: '用账册、证词和凡人秩序承接旧案问责线，提供与修士力量不同的解决路径'
    },
    {
      name: '桑三',
      identity: '桑家三哥，说书人兼市井情报掮客',
      roleTier: '重要配角',
      faction: '桑家/青溪村',
      storyFunction: '承担舆论、传闻和真相传播线，推动青云宗偏爱叙事反转'
    },
    {
      name: '桑四',
      identity: '桑家四哥，沉默木匠与机关修补匠',
      roleTier: '重要配角',
      faction: '桑家/青溪村',
      storyFunction: '承担古井机关、凡人退路和一哥秘境伏笔线，但能力边界限定为凡人工程与木作机关'
    },
    {
      name: '桑五',
      identity: '桑家五哥，游方药师与伤患照料者',
      roleTier: '重要配角',
      faction: '桑家/青溪村',
      storyFunction: '承担药事、救人与职业伦理冲突线，补齐被关系引用的关键亲缘角色'
    }
  ];
  const rosterMap = new Map((Array.isArray(roster) ? roster : []).map(entry => [getRosterNameKey(entry.name), entry]));
  requiredSiblings.forEach(sibling => {
    rosterMap.set(getRosterNameKey(sibling.name), normalizeRosterEntry(sibling));
  });
  let nextRoster = [...rosterMap.values()];
  if (nextRoster.length <= targetCount) return nextRoster.slice(0, targetCount);

  const requiredKeys = new Set(requiredSiblings.map(sibling => getRosterNameKey(sibling.name)));
  const protectedRoster = [];
  const flexibleRoster = [];
  nextRoster.forEach(entry => {
    const key = getRosterNameKey(entry.name);
    if (
      requiredKeys.has(key) ||
      canonicalNames.has(entry.name) ||
      /(核心主角|主角|女主|男主|小师妹|气运女主|父|母|师尊|掌门|反派|魔族|青云宗)/.test(`${entry.roleTier} ${entry.identity} ${entry.storyFunction} ${entry.faction}`)
    ) {
      protectedRoster.push(entry);
    } else {
      flexibleRoster.push(entry);
    }
  });
  return [...protectedRoster, ...flexibleRoster].slice(0, targetCount);
}

function completeRosterLocally(rosterMap, targetCount, canon, onStatus, onCheckpoint, context = '', task = '') {
  const existingKeys = new Set(rosterMap.keys());
  const rosterContext = inferRosterContext(context, task, canon);
  let added = 0;
  let index = rosterMap.size;
  while (rosterMap.size < targetCount) {
    const entry = createDeterministicRosterEntry(index, existingKeys, canon, rosterContext);
    const key = getRosterNameKey(entry.name);
    index += 1;
    if (!isValidRosterEntry(entry) || existingKeys.has(key)) continue;
    rosterMap.set(key, entry);
    existingKeys.add(key);
    added += 1;
  }
  onCheckpoint([...rosterMap.values()]);
  onStatus(
    `模型名册补齐停滞，已由本地结构化名册补足 ${added} 位独立人物，当前 ${rosterMap.size}/${targetCount}。`,
    '人物架构 Agent',
    14
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
    if (/(家族|家人|父|母|兄|姐|弟|妹|桑家)/.test(text)) buckets.family.push(character.name);
    if (/(旧宗门|青云宗|天衍宗|师尊|同门|戒律|宗门)/.test(text)) buckets.formerSect.push(character.name);
    if (/(反派|魔族|魔将|敌对|幕后|斥候)/.test(text)) buckets.antagonist.push(character.name);
    if (/(中立|商会|散修|情报|医者|药师|盟友)/.test(text)) buckets.neutral.push(character.name);
    if (/(凡人|村|城镇|百姓|教书|商贩|守夜)/.test(text)) buckets.civilian.push(character.name);
    if (/(隐藏|隐世|秘密|血脉|秘境|封印|潜伏)/.test(text)) buckets.hidden.push(character.name);
  });
  const targets = { core: 1, family: 6, formerSect: 8, antagonist: 8, neutral: 8, civilian: 8, hidden: 5 };
  const labels = {
    core: '核心主角',
    family: '家人与亲缘线',
    formerSect: '旧宗门人物',
    antagonist: '反派阵营',
    neutral: '中立/专业人物',
    civilian: '凡人社会',
    hidden: '隐藏势力与伏笔人物'
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
  const maxAttempts = Math.max(14, Math.ceil(targetCount / 5) + 4);
  const roleFocuses = [
    '主角原生家庭与凡人社会人物',
    '旧宗门中的师长、同门与利益竞争者',
    '反派阵营的决策者、执行者与内部异议者',
    '中立势力、商会、散修、情报与医疗人物',
    '隐藏势力、历史秘密和伏笔回收相关人物',
    '地方治理、宗门基层与普通民众中的关键人物'
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
4. 总名册需要覆盖主角、家人、旧宗门、反派、中立势力、凡人社会和隐藏势力。
5. 人物必须服务背景设定、简介、总纲和左侧设定，不得另起世界观。
6. 桑家父母可以是力量天花板；兄弟姐妹不得拥有父母同等级规则权柄，不得全部以“保护妹妹”为唯一欲望。
7. 本轮重点补充：${roleFocuses[attempt % roleFocuses.length]}。
8. 只生成本轮新增人物，不得复述、改写或补全已有名册人物。
9. 输出保持简洁，每个字段控制在 30 字以内，确保 JSON 完整闭合。
10. 可用世界观锚点：${worldAnchors.join('；')}。`,
        `${context}
用户任务：${task}
禁止使用的已有姓名：${existingNames.length ? JSON.stringify(existingNames) : '无'}
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
      candidates.map(normalizeRosterEntry).forEach(entry => {
        const key = getRosterNameKey(entry.name);
        if (!isValidRosterEntry(entry) || rosterMap.has(key)) return;
        rosterMap.set(key, entry);
        accepted += 1;
      });
      onCheckpoint([...rosterMap.values()]);
      stalledRounds = accepted === 0 ? stalledRounds + 1 : 0;
      lowYieldRounds = accepted > 0 && accepted < Math.min(3, requestCount)
        ? lowYieldRounds + 1
        : 0;
      lastError = rosterResult.recovered
        ? new Error(`JSON 不完整，已抢救 ${candidates.length} 个完整人物对象：${rosterResult.parseError}`)
        : null;
      onStatus(
        `第 ${attempt + 1} 轮返回 ${candidates.length} 人${rosterResult.recovered ? '（JSON 尾部损坏，已容错提取）' : ''}，去重校验后新增 ${accepted} 人，当前 ${rosterMap.size}/${targetCount}。`,
        '人物架构 Agent',
        Math.min(14, progress + 1)
      );
      if ((stalledRounds >= 4 || lowYieldRounds >= 3) && rosterMap.size < targetCount) {
        completeRosterLocally(rosterMap, targetCount, canon, onStatus, onCheckpoint, context, task);
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
        completeRosterLocally(rosterMap, targetCount, canon, onStatus, onCheckpoint, context, task);
        break;
      }
    }
  }

  if (rosterMap.size < targetCount) {
    completeRosterLocally(rosterMap, targetCount, canon, onStatus, onCheckpoint, context, task);
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
    if (!nodeEl) return;
    nodeEl.classList.remove('active', 'completed');
    if (state === 'active') nodeEl.classList.add('active');
    if (state === 'completed') nodeEl.classList.add('completed');
  }

  updateProgress(percentage) {
    this.progress = Math.min(100, Math.max(0, percentage));
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
  finalRoster = ensureFamilySiblingRoster(finalRoster, canon, novel, targetCount);
  onStatus(`名册规划完成：已获得 ${finalRoster.length} 位有效且不重名的人物。`, '人物架构 Agent', 15);
  const rosterReference = JSON.stringify(finalRoster);
  const characters = [];

  if (stateManager) {
    stateManager.updateNodeState('roster', 'completed');
    stateManager.updateNodeState('deepening', 'active');
  }

  for (let index = 0; index < finalRoster.length; index += 5) {
    const batch = finalRoster.slice(index, index + 5);
    const batchNames = batch.map(c => c.name).join('、');
    const startProgress = 15;
    const endProgress = 65;
    const currentProgress = startProgress + Math.round((index / finalRoster.length) * (endProgress - startProgress));
    
    onStatus(`正在构思第 ${index + 1}-${index + batch.length} 位人物（${batchNames}）...`, '人物深化 Agent', currentProgress);
    let detailResult;
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
家族人物约束：父母可保持神秘天花板；兄弟姐妹必须有不同生活职业、不同私欲和不同命运，不得全部是规则级强者，不得所有高光都发生在高潮战斗期，不得全部服务“给桑杳争取时间/治疗/制造混乱”。
本批最多 5 人。字段要具体但保持简洁，严禁长篇散文，必须输出完整闭合 JSON。`,
      `${context}
全体人物名册：${rosterReference}
本批必须深化：${JSON.stringify(batch)}

注意：名册只提供身份骨架，不能照抄为最终档案。必须为本批每个人补出独立生平、具体欲望、利益底线、主动选择、性格缺陷、成长代价、关系压力和高光时刻；同阵营人物不得共享同一人物弧光、同一高光和同一最终命运。`,
        'characters',
        status => onStatus(status, '人物深化 Agent', currentProgress),
        '人物深化 Agent'
      );
    } catch (error) {
      onStatus(
        `第 ${index + 1}-${index + batch.length} 位人物档案 JSON 无法修复，已启用结构化兜底档案，后续审计会继续修正：${error.message}`,
        '人物深化 Agent',
        currentProgress
      );
      detailResult = {
        characters: batch.map(createFallbackCharacter),
        recovered: true,
        parseError: error.message
      };
    }
    const batchCharacters = detailResult.characters;
    if (detailResult.recovered) {
      onStatus(
        `第 ${index + 1}-${index + batch.length} 位人物档案 JSON 已自动修复/抢救，当前保留 ${batchCharacters.length} 个可用档案。`,
        '人物深化 Agent',
        currentProgress
      );
    }
    characters.push(...batchCharacters);
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
  applyDeterministicCharacterRepairs(finalCharacters, canon, novel);
  const incomplete = finalCharacters.filter(character =>
    requiredFields.some(field => !character[field]) ||
    !character.storyFunction ||
    character.relationships.length < 3 ||
    (character.hiddenIdentities.length > 0 && character.identityRevealStage === '无')
  );
  if (initialReconciliation.fallbackCount > 0) {
    onStatus(
      `档案深化有 ${initialReconciliation.fallbackCount} 位人物未被模型完整返回，已按名册生成结构化兜底档案。`,
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
{"relations":[{"source":"姓名","target":"姓名","type":"关系类型","direction":"双向|source指向target","description":"关系现状与变化轨迹","interestConflict":"双方利益交集或冲突"}]}

要求：
1. source 和 target 必须来自给定名册，不能新造姓名。
2. 至少输出 ${targetCount} 条有效关系，覆盖亲缘、师徒、盟友、敌对、利用、债务、竞争、隐秘关联等。
3. 关系必须服务总纲，并体现人物各自的利益、欲望和主动选择。`,
    `${context}
人物概要：${JSON.stringify(finalCharacters.map(character => ({
      name: character.name,
      identity: character.identity,
      faction: character.faction,
      desire: character.desire,
      goal: character.goal,
      interests: character.interests
    })))}`,
    status => onStatus(status, '关系拓扑 Agent', 75),
    '关系拓扑 Agent'
  );
  let relations = normalizeAndHealRelations(topologyResult.relations, finalCharacters, targetCount);
  relations = stabilizeKeyRelations(relations);
  applyFactionReplacementsToCharacters(finalCharacters, relations, canon, novel);
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
    applyDeterministicCharacterRepairs(finalCharacters, canon, novel);
    const repairedNames = finalCharacters.map(character => character.name);
    const repairedIncomplete = finalCharacters.filter(character =>
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
    relations = stabilizeKeyRelations(relations);
    applyFactionReplacementsToCharacters(finalCharacters, relations, canon, novel);
  };

  let staticAudit = runStaticCharacterAudit(finalCharacters, relations, targetCount);
  let audit = await auditCharacterSystem(context, finalCharacters, relations, staticAudit, auditOnStatus);
  const hasSevereIssues = audit.issues.some(issue => ['critical', 'high'].includes(issue.severity));
  if (!staticAudit.passed || !audit.passed || audit.score < 85 || hasSevereIssues) {
    const repairOnStatus = status => onStatus(status, '人物修复 Agent', 92);
    const repaired = await repairCharacterSystem(
      `${context}

首轮修复重点：
1. 无尘子必须统一为青云宗掌门兼前世旧案裁决者；温和师尊是伪装，被重创后悔恨死亡是连续因果。
2. 简介“哥哥们”可拆分为具名兄弟，但必须是生活职业/凡人社会职能人物，不得写成规则级战力组件。
3. 修复要改人物欲望、目标、利益、弧光、高光、命运和关系，不能只改称谓。`,
      finalCharacters,
      relations,
      audit,
      repairOnStatus
    );
    applyRepairResult(repaired);

    staticAudit = runStaticCharacterAudit(finalCharacters, relations, targetCount);
    const reauditOnStatus = status => onStatus(status, '人物复审 Agent', 95);
    audit = await auditCharacterSystem(context, finalCharacters, relations, staticAudit, reauditOnStatus);
  }

  const isAuditBlocked = () => {
    const severeIssues = audit.issues.filter(issue => ['critical', 'high'].includes(issue.severity));
    return !staticAudit.passed || !audit.passed || audit.score < 85 || severeIssues.length > 0;
  };
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
2. 无尘子统一为“青云宗掌门兼前世旧案裁决者”：温和师尊是伪装，掌门是实权，被桑家父母重创导致权柄崩塌，最终悔恨而死。
3. 桑二、桑三、桑四、桑五是从简介“哥哥们”合理拆分出的具名兄弟；他们必须是生活职业或凡人社会职能人物，有私欲、缺陷、代价和具体伏笔，不是规则级战力组件。
4. 桑家父母保持力量天花板；兄弟姐妹不得共享“保护妹妹”作为唯一欲望，不得共享同一高潮战斗高光。
5. 势力名称必须按角色事实裁决统一，天衍宗/天行宗/青云宗不得混用。
6. 修复必须改写人物欲望、目标、利益、弧光、高光、命运和关系，不得只改一句身份。`;

  let finalSevereIssues = audit.issues.filter(issue => ['critical', 'high'].includes(issue.severity));
  const maxRepairRounds = 5;
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
    staticAudit = runStaticCharacterAudit(finalCharacters, relations, targetCount);
    audit = await auditCharacterSystem(context, finalCharacters, relations, staticAudit, status =>
      onStatus(status, repairRound === maxRepairRounds - 1 ? '人物终复审 Agent' : '人物复审 Agent', 99)
    );
    finalSevereIssues = audit.issues.filter(issue => ['critical', 'high'].includes(issue.severity));
  }

  const finalGate = finalizeCharacterAuditForReview(audit, staticAudit, finalSevereIssues, maxRepairRounds);
  audit = finalGate.audit;
  if (finalGate.blocked) {
    throw new Error(`人物体系存在程序硬错误，暂不能提交用户审核：${finalGate.hardIssues.slice(0, 5).join('；')}。`);
  }

  if (stateManager) {
    stateManager.updateNodeState('audit', 'completed');
    stateManager.updateNodeState('review', 'active');
  }
  if (audit.requiresHumanReview) {
    onStatus(`人物体系已通过程序硬审计，但 AI 质量审计仅 ${audit.score} 分，提交用户人工复核。`, '系统', 100);
  } else {
    onStatus(`人物审计通过：${audit.score} 分，协同完成。`, '系统', 100);
  }
  delete novel.characterRosterDraft;
  saveState();
  return { characters: finalCharacters, relations, audit };
}

function extractBracketValue(text, label, nextLabel = '') {
  const labelPattern = new RegExp(`${label}\\s*[：:]`);
  const labelMatch = labelPattern.exec(text);
  if (!labelMatch) return '';

  const valueStart = labelMatch.index + labelMatch[0].length;
  const remaining = text.slice(valueStart);
  const openIndex = remaining.search(/[【\[]/);
  if (openIndex === -1) return '';

  const contentStart = valueStart + openIndex + 1;
  let contentEnd = text.length;
  if (nextLabel) {
    const nextPattern = new RegExp(`[，,\\s]*${nextLabel}\\s*[：:]`, 'g');
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
  if (combined.includes('女频')) return '女频';
  if (combined.includes('男频')) return '男频';
  if (/(言情|女主|师尊|小师妹|团宠|无cp|无CP)/i.test(combined)) return '女频（根据内容推断）';
  return '未识别';
}

function parseNovelBriefInput(rawInput) {
  if (!/背景设定\s*[：:]/.test(rawInput) || !/简介\s*[：:]/.test(rawInput)) {
    return null;
  }
  const background = extractBracketValue(rawInput, '背景设定', '简介');
  const synopsis = extractBracketValue(rawInput, '简介');
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
  novel.characterBible = [];
  novel.characterRelations = [];
  novel.characterAudit = null;
  novel.characterRosterDraft = null;
  novel.knowledgeGraph = null;
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

function buildNovelBriefMarkdown(activeNovel, parsedBrief, rawInput) {
  return `# ${activeNovel.name || '未命名小说'}：原始设定输入

- 保存时间：${new Date().toISOString()}
- 受众识别：${parsedBrief.audience || '未识别'}

## 背景设定

${parsedBrief.background}

## 作品简介

${parsedBrief.synopsis || '未提供'}

## 用户原始输入

\`\`\`text
${rawInput}
\`\`\`
`;
}

function downloadNovelBriefFile(activeNovel, parsedBrief, rawInput) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
  const filename = `${timestamp}-${sanitizeDownloadFilename(activeNovel.name)}.md`;
  const blob = new Blob([buildNovelBriefMarkdown(activeNovel, parsedBrief, rawInput)], {
    type: 'text/markdown;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return {
    filename,
    relativePath: `浏览器下载/${filename}`,
    fallback: true
  };
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

  const fallbackFile = downloadNovelBriefFile(activeNovel, parsedBrief, rawInput);
  fallbackFile.saveWarning = lastError?.message || '保存接口不可用';
  return fallbackFile;
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
  const requiresHumanReview = Boolean(result.audit?.requiresHumanReview);
  const remainingIssues = requiresHumanReview
    ? (result.audit?.issues || [])
    : (result.audit?.issues?.filter(issue => ['medium', 'low'].includes(issue.severity)) || []);
  elements.characterAuditReport.classList.toggle('audit-warning', remainingIssues.length > 0 || requiresHumanReview);
  elements.characterAuditReport.innerHTML = `
    <strong>审计结论：</strong>${escapeHtml(result.audit?.summary || '人物体系已通过程序硬审计和 AI 复审。')}
    ${requiresHumanReview ? '<div><strong>质量门状态：</strong>程序硬审计已通过，但 AI 语义评分未达自动通过线，请人工决定是否接受或退回。</div>' : ''}
    ${result.audit?.strengths?.length ? `<div><strong>优势：</strong>${result.audit.strengths.map(escapeHtml).join('；')}</div>` : ''}
    ${remainingIssues.length ? `
      <div><strong>${requiresHumanReview ? '待人工复核问题' : '剩余建议'}：</strong></div>
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
      <p><b>总纲锚点：</b>${escapeHtml(character.plotAnchor)}</p>
    </article>
  `).join('');
  elements.characterReviewModal.classList.remove('hidden');

  return new Promise(resolve => {
    const finish = approved => {
      elements.characterReviewModal.classList.add('hidden');
      elements.approveCharactersBtn.removeEventListener('click', approve);
      elements.rejectCharactersBtn.removeEventListener('click', reject);
      resolve(approved);
    };
    const approve = () => finish(true);
    const reject = () => finish(false);
    elements.approveCharactersBtn.addEventListener('click', approve);
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
  const match = String(markdown || '').match(new RegExp(`- \\*\\*${label}\\*\\*：([^\
]+)`));
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
    plotAnchor: '总纲锚点',
    foreshadowLink: '伏笔与回收链',
    lifeHistory: '人物生平',
    growthHistory: '成长史',
    arc: '人物弧光',
    highlight: '人物高光',
    fate: '最终命运'
  };
  Object.entries(fieldMap).forEach(([field, label]) => {
    const value = extractMarkdownField(asset.desc, label);
    if (value) character[field] = value;
  });
  character.hiddenIdentities = extractMarkdownList(asset.desc, '隐藏身份');
  asset.name = `${character.name}（${character.identity}）`;
  asset.type = classifyCharacterType(character);
  asset.characterData = character;
}

function refreshTopologyAsset(novel) {
  const topologyAsset = novel.assets.find(asset => asset.type === 'character-network');
  if (!topologyAsset) return;
  const refreshed = topologyToAsset(novel.characterRelations || [], novel.id);
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
  const relationships = character.relationships.map(relation =>
    `- **${relation.target}｜${relation.type}**：${relation.dynamic}；冲突：${relation.conflict}`
  ).join('\n');
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
- **总纲锚点**：${character.plotAnchor}
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
   - 利益：${relation.interestConflict}`
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

/* ==========================================================================
   Event Listeners Setup
   ========================================================================== */
function initEvents() {
  elements.closeNovelInfoModal.addEventListener('click', closeNovelInfoModal);
  elements.cancelNovelInfo.addEventListener('click', closeNovelInfoModal);
  elements.novelInfoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const novel = state.novels.find(item => item.id === elements.novelInfoId.value);
    if (!novel) return;
    const name = elements.novelInfoName.value.trim();
    const background = elements.novelInfoBackground.value.trim();
    const synopsis = elements.novelInfoSynopsis.value.trim();
    if (!name || !background) {
      showToast('小说名称和背景设定不能为空。', 'error');
      return;
    }
    novel.name = name;
    novel.background = background;
    novel.synopsis = synopsis;
    refreshNovelKnowledgeGraph(novel);
    saveState();
    void persistNovelKnowledgeGraph(novel);
    renderNovels();
    closeNovelInfoModal();
    showToast('小说信息已保存，知识图谱上下文已更新。', 'success');
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
        activeNovel.sourceBriefFile = savedFile.relativePath;
        refreshNovelKnowledgeGraph(activeNovel);
        saveState();
        void persistNovelKnowledgeGraph(activeNovel);
        if (savedFile.fallback) {
          showToast(`保存接口不可用，已下载创建 ${savedFile.filename}，AI 任务继续执行。`, 'info');
        } else {
          showToast(`背景设定与简介已保存至 ${savedFile.relativePath}`, 'success');
        }
      }

      if (!state.apiKey) {
        throw new Error('内容已保存，但尚未配置 API Key，无法启动多 Agent。');
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

        delete heartbeatState.lastFailure;
        delete heartbeatState.lastFailureAt;
        heartbeatState.pendingReview = `人物体系（${characterResult.characters.length} 人）`;
        saveHeartbeatState();
        stateManager.success(
          characterResult.audit?.requiresHumanReview ? '人物体系已生成，需人工复核' : '人物体系构建成功',
          characterResult.audit?.requiresHumanReview
            ? `已生成 ${characterResult.characters.length} 个具名人物与 ${characterResult.relations.length} 条关系；程序硬审计通过，AI 质量评分 ${characterResult.audit.score} 分，请在审核弹窗中确认。`
            : `成功规划并生成了 ${characterResult.characters.length} 个具名人物与 ${characterResult.relations.length} 条全局人物关系。`,
          async () => {
            elements.agentTaskStatusText.textContent = '人物体系已生成，等待用户审核...';
            const approved = await reviewCharacterSystem(characterResult);
            delete heartbeatState.pendingReview;
            saveHeartbeatState();
            if (!approved) {
              showToast('人物体系已退回，现有角色数据未被覆盖。', 'info');
              return;
            }

            const preservedAssets = activeNovel.assets.filter(asset =>
              !CHARACTER_TYPE_ORDER.includes(asset.type)
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
            if (!activeNovel.categoryOrder) {
              activeNovel.categoryOrder = {};
            }
            activeNovel.categoryOrder['character-growth'] = [...CHARACTER_TYPE_ORDER];
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

      delete heartbeatState.lastFailure;
      delete heartbeatState.lastFailureAt;
      heartbeatState.pendingReview = '全书总纲';
      saveHeartbeatState();
      stateManager.success(
        '全书总纲生成成功',
        '多 Agent 团队已完成世界观、角色、剧情、市场定位分析与总编整合。',
        async () => {
          elements.agentTaskStatusText.textContent = '总纲已生成，等待用户审核...';
          const approved = await reviewMasterOutline(result);
          delete heartbeatState.pendingReview;
          saveHeartbeatState();
          if (!approved) {
            showToast('总纲已退回，现有设定库未被覆盖。', 'info');
            return;
          }
          activeNovel.assets = result.assets;
          applyNarrativeBlueprintResult(activeNovel, result);
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
          showToast('多 Agent 任务已完成，左侧设定库已更新。', 'success');
        }
      );
    } catch (error) {
      heartbeatState.lastFailure = compactString(error.message, 400);
      heartbeatState.lastFailureAt = new Date().toISOString();
      saveHeartbeatState();
      if (stateManager) {
        stateManager.failure(error.message);
      } else {
        showToast(`多 Agent 任务失败：${error.message}`, 'error');
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
  });
  elements.agentTaskTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitAgentTask();
    }
  });
  elements.agentTaskSendBtn.addEventListener('click', submitAgentTask);

  elements.addNovelBtn.addEventListener('click', openNewNovelModal);
  elements.closeNewNovelModal.addEventListener('click', closeNewNovelModal);
  elements.btnCancelNewNovel.addEventListener('click', closeNewNovelModal);
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
    if (!/(男频|女频)/.test(background)) {
      showNewNovelError('背景设定必须明确写出“男频”或“女频”。');
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
        showToast(`保存接口不可用，已下载创建 ${savedFile.filename}`, 'info');
      } else {
        showToast(`背景设定与简介已保存至 ${savedFile.relativePath}`, 'success');
      }

      elements.newNovelProgressText.textContent = synopsis
        ? '四个专业 Agent 正在结合背景与简介并行分析，随后由总编整合...'
        : '四个专业 Agent 正在根据背景设定并行分析，随后由总编整合...';

      const analysis = await analyzeNovelSetup(
        name,
        background,
        synopsis,
        newNovelId,
        '创建完整的新书初始化设定库',
        (status, agentName = '总控 Agent') => {
          elements.newNovelProgressText.textContent = `${agentName}：${status}`;
        }
      );
      elements.newNovelProgressText.textContent = '总纲已生成，等待用户审核...';
      delete heartbeatState.lastFailure;
      delete heartbeatState.lastFailureAt;
      heartbeatState.pendingReview = '新书总纲';
      saveHeartbeatState();
      const approved = await reviewMasterOutline(analysis);
      delete heartbeatState.pendingReview;
      saveHeartbeatState();
      if (!approved) {
        showNewNovelError('总纲已退回，本次没有创建小说。你可以调整背景设定或简介后重新分析。');
        return;
      }
      const chapterTitle = `第一章：${analysis.firstChapterTitle.replace(/^第[一1]章[：:\s]*/, '')}`;
      const newNovel = {
        id: newNovelId,
        name,
        background,
        synopsis,
        sourceBriefFile: savedFile.relativePath,
        analysisSummary: analysis.summary,
        masterOutline: analysis.masterOutline,
        narrativeKernel: analysis.narrativeKernel || null,
        worldPressure: analysis.worldPressure || null,
        factionPlans: Array.isArray(analysis.factionPlans) ? analysis.factionPlans : [],
        eventCards: Array.isArray(analysis.eventCards) ? analysis.eventCards : [],
        promiseLedger: Array.isArray(analysis.promiseLedger) ? analysis.promiseLedger : [],
        stateLedger: Array.isArray(analysis.stateLedger) ? analysis.stateLedger : [],
        outlineAudit: analysis.outlineAudit || null,
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
      switchEditorTarget('chapter', 'chapter-1');
      renderNovels();
      elements.newNovelModal.classList.add('hidden');
      elements.newNovelForm.reset();
      showToast(`《${name}》已创建，多 Agent 设定库已自动填充。`, 'success');
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
    elements.closeSettingsModal.addEventListener('click', closeSettingsModal);
  }
  if (elements.btnCancelSettings) {
    elements.btnCancelSettings.addEventListener('click', closeSettingsModal);
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
        state.apiKey = '';
        state.apiModel = apiModel;
        state.apiUrl = apiUrl;
        saveState();
        closeSettingsModal();
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

        state.apiKey = apiKey;
        state.apiModel = apiModel;
        state.apiUrl = apiUrl;
        saveState();
        closeSettingsModal();
        showToast('设置已保存：文本生成与结构化 JSON 测试均通过。', 'success');
      } catch (err) {
        if (err.transient && err.status >= 500) {
          state.apiKey = apiKey;
          state.apiModel = apiModel;
          state.apiUrl = apiUrl;
          saveState();
          closeSettingsModal();
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

  elements.modeEdit.addEventListener('click', () => {
    if (!elements.knowledgeGraphView.classList.contains('hidden')) return;
    elements.modeEdit.classList.add('active');
    elements.modePreview.classList.remove('active');
    elements.editorTextarea.classList.remove('hidden');
    elements.editorPreview.classList.add('hidden');
    elements.editorTextarea.focus();
  });

  elements.modePreview.addEventListener('click', () => {
    if (!elements.knowledgeGraphView.classList.contains('hidden')) return;
    elements.modePreview.classList.add('active');
    elements.modeEdit.classList.remove('active');
    elements.editorTextarea.classList.add('hidden');
    elements.editorPreview.classList.remove('hidden');
    updatePreview();
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

}

/* ==========================================================================
   Initialization Launcher
   ========================================================================== */
function init() {
  const activeNovel = getActiveNovel();
  
  renderChapters();
  renderNovels();
  
  if (activeNovel) {
    switchEditorTarget(activeNovel.activeTarget.type, activeNovel.activeTarget.id);
  }
  
  initEvents();
  startHeartbeatDaemon();
  lucide.createIcons();
}

// Ensure init runs after HTML load
init();
