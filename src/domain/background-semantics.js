const CATEGORY_DEFINITIONS = {
  audience: {
    label: '受众定位',
    entityAllowed: false,
    terms: ['男频', '女频', '大众向', '女性向', '男性向']
  },
  worldType: {
    label: '时代与世界',
    entityAllowed: true,
    terms: [
      '架空古代', '历史架空', '古代言情', '现代言情', '现代都市', '古武都市', '都市异能',
      '东方玄幻', '西方奇幻', '修仙', '仙侠', '武侠', '高武', '低武', '玄幻', '奇幻',
      '洪荒', '神话', '聊斋', '志怪', '末世', '废土', '悬疑', '灵异', '惊悚', '推理',
      '校园', '职场', '商战', '娱乐圈', '官场', '军事', '战争', '谍战', '历史', '种田',
      '科举', '宅斗', '宫斗', '年代', '民国', '无限流', '诸天流', '游戏异界',
      '现代', '古代', '豪门世家', '西幻魔法', '西方古典', '西方现代'
    ]
  },
  genre: {
    label: '核心题材',
    entityAllowed: true,
    terms: [
      '升级流', '系统流', '凡人流', '宗门流', '学院流', '领主流', '争霸流', '幕后流',
      '苟道流', '无敌流', '召唤流', '御兽流', '卡牌流', '签到流', '模拟器流', '聊天群',
      '快穿', '穿书', '重生', '穿越', '轮回', '夺舍', '变身', '经营', '基建', '种田文',
      '探案', '破案', '复仇', '救赎', '成长', '群像', '公路文', '家族文', '日常文',
      '婚姻家庭', '男生生活', '虐心婚恋', '男生情感', '悬疑惊悚', '女生生活',
      '现言甜宠', '青春虐恋', '女性成长', '玄幻仙侠', '宫斗宅斗', '女频衍生',
      '纯爱', '古言甜宠', '都市日常', '男频衍生', '古风世情', '男频脑洞',
      '女频脑洞', '古言虐恋', '民国旧影', '历史古代', '架空', '其他'
    ]
  },
  protagonistModel: {
    label: '主角模型',
    entityAllowed: false,
    terms: [
      '强者崛起', '废柴逆袭', '天才流', '草根崛起', '幕后大佬', '老爷爷流', '赘婿',
      '神豪', '学霸', '医生', '律师', '警察', '侦探', '反派主角', '配角逆袭',
      '大女主', '女强', '团宠', '萌宝', '奶爸', '双强', '全能',
      '白月光', '凤凰男', '女配', '替身', '病娇', '万人迷', '糙汉', '霸总',
      '校霸', '校花校草', '影帝影后', '女总裁', '神医', '特种兵', '首富'
    ]
  },
  mechanism: {
    label: '世界内机制或金手指',
    entityAllowed: true,
    terms: [
      '系统', '面板', '签到', '抽奖', '加点', '模拟器', '空间', '随身空间', '金手指',
      '血脉', '传承', '器灵', '异能', '御兽', '召唤', '卡牌', '功德', '气运',
      '熟练度', '复制', '吞噬', '合成', '返还', '选择奖励', '魔法'
    ]
  },
  relationshipMode: {
    label: '关系与感情模式',
    entityAllowed: false,
    terms: [
      '无CP', '无cp', '单女主', '单男主', '多女主', '后宫', '纯爱', '甜宠', '虐恋',
      '先婚后爱', '破镜重圆', '追妻火葬场', '青梅竹马', '欢喜冤家', '双向暗恋',
      '契约婚姻', '带球跑', '姐弟恋', '年下', '师徒恋', '相爱相杀',
      '婆媳', '婚恋', '女性互助', '暗恋', '追夫火葬场'
    ]
  },
  emotionalTone: {
    label: '情绪与风格基调',
    entityAllowed: false,
    terms: [
      '热血', '轻松', '搞笑', '幽默', '治愈', '温馨', '甜', '虐', '暗黑', '压抑',
      '冷峻', '史诗', '悲壮', '燃', '沙雕', '日常', '现实', '古典', '唯美',
      '先虐后甜', '虐文救赎', '励志', '甜宠', '爽文', '惊悚', '沙雕搞笑'
    ]
  },
  readerPromise: {
    label: '读者体验承诺',
    entityAllowed: false,
    terms: [
      '爽文', '高燃', '高甜', '高虐', '快节奏', '慢热', '稳定更新', '打脸', '逆袭',
      '复仇爽文', '升级爽文', '事业爽文', '感情爽文', '智斗', '权谋', '悬念',
      '强者崛起', '无敌', '碾压', '扮猪吃虎', '追妻火葬场', '追夫火葬场',
      '真假千金', '打脸逆袭', '先虐后甜', '虐文救赎'
    ]
  },
  narrativeStrategy: {
    label: '叙事与创意策略',
    entityAllowed: false,
    terms: [
      '反套路', '脑洞', '创新', '反转', '多线叙事', '群像多线', '三幕多线',
      '非线性叙事', '多视角', '单元剧', '公路结构', '悬疑推进', '伏笔流',
      '误导叙事', '身份反转', '认知反转', '规则怪谈', '民间奇闻'
    ]
  },
  qualityConstraint: {
    label: '创作质量约束',
    entityAllowed: false,
    terms: [
      '智商在线', '逻辑严密', '逻辑在线', '人物立体', '人物推动剧情', '无降智',
      '无毒点', '不圣母', '不后宫', '不无脑', '不水文', '不拖沓', '节奏紧凑',
      '有因有果', '伏笔回收', '世界观统一', '战力不崩', '感情自然', '文笔细腻'
    ]
  },
  plotStructure: {
    label: '剧情结构',
    entityAllowed: false,
    terms: [
      '三幕式', '英雄之旅', '起承转合', '单元剧', '卷本结构', '多卷长篇', '百万字长篇',
      '群像多线', '双线叙事', '多线叙事', '时间线', '因果链', '伏笔闭环'
    ]
  }
};

const INPUT_GROUP_LABELS = {
  '题材': 'themes',
  '频道': 'themes',
  '情节': 'plotDevices',
  '剧情': 'plotDevices',
  '角色': 'characterArchetypes',
  '人物': 'characterArchetypes',
  '情绪': 'emotions',
  '风格': 'emotions',
  '背景': 'settings',
  '时代': 'settings'
};

const INPUT_GROUP_NAMES = {
  themes: '题材',
  plotDevices: '情节',
  characterArchetypes: '角色',
  emotions: '情绪',
  settings: '背景',
  ungrouped: '未分组'
};

const TAG_ALIASES = {
  '养惠文': '养崽文',
  '养崽': '养崽文',
  '未日求生': '末日求生',
  '末日': '末世',
  '赞婿': '赘婿',
  '民国旧日影': '民国旧影',
  '无cp': '无CP',
  '现言': '现代言情',
  '古言': '古代言情',
  '西幻': '西方奇幻'
};

const PLOT_DEVICE_TERMS = [
  '追妻火葬场', '真假千金', '打脸逆袭', '系统', '大女主', '追夫火葬场',
  '先婚后爱', '破镜重圆', '金手指', '女性互助', '穿越', '暗恋', '权谋',
  '养崽文', '无限流', '重生', '婚恋', '架空古代', '团宠', '末日求生',
  '游戏动漫', '民间奇闻', '科幻', '直播', '外卖', '规则怪谈', '影视', '架空',
  '推理', '升级流', '鉴宝', '黑道', '都市江湖', '都市异能'
];

const CHARACTER_ARCHETYPE_TERMS = [
  '白月光', '婆媳', '姐弟恋', '校花校草', '医生', '霸总', '青梅竹马', '凤凰男',
  '女配', '替身', '病娇', '校霸', '萌宝', '万人迷', '奶爸', '赘婿',
  '影帝影后', '糙汉', '女总裁', '神医', '特种兵', '首富', '魔法',
  '欧美帮派', '吸血鬼', '狼人'
];

const SETTING_TERMS = [
  '家庭', '校园', '现代', '民国', '职场', '娱乐圈', '古代', '豪门世家',
  '西幻魔法', '西方古典', '西方现代'
];

const HARD_FORBIDDEN_INPUT_TERMS = ['科幻', '星际', '直播', '赛博朋克'];

const WORLD_FAMILIES = {
  premodernChinese: ['架空古代', '历史架空', '古代', '古代言情', '修仙', '仙侠', '武侠', '玄幻仙侠', '宫斗宅斗', '古言甜宠', '古言虐恋', '历史古代', '古风世情'],
  modernChinese: ['现代', '现代都市', '现代言情', '现言甜宠', '都市日常', '校园', '职场', '娱乐圈', '豪门世家', '男生生活', '女生生活', '男生情感'],
  republican: ['民国', '民国旧影'],
  westernFantasy: ['西方奇幻', '西幻魔法', '西方古典', '吸血鬼', '狼人', '魔法'],
  westernModern: ['西方现代', '欧美帮派'],
  apocalypse: ['末世', '废土', '末日求生']
};

const EXECUTION_RULES = {
  '反套路': '识别常见预期后，用人物利益、主动选择和前置因果产生合理偏转；不得为了意外而意外。',
  '脑洞': '创新必须落到可解释、可限制、可持续演化的世界规则，不得只换名词。',
  '智商在线': '主要人物必须依据已知信息、能力边界和利益作出可解释决策，禁止为推进剧情集体降智。',
  '爽文': '建立压制、行动、兑现的反馈闭环；爽点必须来自能力、布局或代价，不得机械送奖。',
  '热血': '高潮来自人物为目标承担代价后的主动突破，不等于连续喊口号或无成本越级。',
  '强者崛起': '明确初始短板、阶段目标、资源来源、训练或实战代价和能力边界，成长必须可追溯。',
  '系统': '系统是世界内机制，需要来源、权限、任务逻辑、奖励边界、失败代价和不可绕过的限制。',
  '群像': '每条人物线都要有独立欲望、利益、选择与后果，不能只围绕主角提供功能。',
  '权谋': '行动必须建立在信息差、制度、资源和利益交换上，胜负不能依靠对手突然愚蠢。',
  '悬疑': '谜面、线索、误导与揭示必须可回溯，答案出现前要有足够但不显眼的证据。',
  '架空': '只表示制度、历史或社会结构可虚构，不自动代表古代；具体时代、生产力和社会形态必须由背景标签与简介确定。'
};

const NON_ENTITY_CATEGORY_KEYS = Object.entries(CATEGORY_DEFINITIONS)
  .filter(([, definition]) => !definition.entityAllowed)
  .map(([key]) => key);

function normalizeTag(value) {
  return String(value || '').trim().replace(/\s+/g, '');
}

function canonicalizeTag(value) {
  const normalized = normalizeTag(value);
  return TAG_ALIASES[normalized] || normalized;
}

function splitTags(value) {
  return String(value || '')
    .split(/[，,、；;|\n/]+/)
    .map(tag => tag.trim().replace(/^[「『【\[]+|[」』】\]]+$/g, ''))
    .filter(Boolean);
}

export function parseGroupedBackgroundInput(background) {
  const text = String(background || '');
  const groups = {
    themes: [],
    plotDevices: [],
    characterArchetypes: [],
    emotions: [],
    settings: [],
    ungrouped: []
  };
  const ranges = [];
  const groupPattern = /(题材|频道|情节|剧情|角色|人物|情绪|风格|背景|时代)\s*[：:]\s*[「『【\[]([\s\S]*?)[」』】\]]/g;
  for (const match of text.matchAll(groupPattern)) {
    const groupKey = INPUT_GROUP_LABELS[match[1]];
    groups[groupKey].push(...splitTags(match[2]).map(canonicalizeTag));
    ranges.push([match.index, match.index + match[0].length]);
  }
  let ungroupedText = text;
  ranges.sort((left, right) => right[0] - left[0]).forEach(([start, end]) => {
    ungroupedText = `${ungroupedText.slice(0, start)} ${ungroupedText.slice(end)}`;
  });
  groups.ungrouped = splitTags(ungroupedText).map(canonicalizeTag);
  Object.keys(groups).forEach(key => {
    groups[key] = [...new Set(groups[key])];
  });
  return groups;
}

export function parseBackgroundSemantics(background) {
  const sourceGroups = parseGroupedBackgroundInput(background);
  const rawTags = [...new Set(Object.values(sourceGroups).flat())];
  const categories = Object.fromEntries(Object.keys(CATEGORY_DEFINITIONS).map(key => [key, []]));
  const unknown = [];

  rawTags.forEach(rawTag => {
    const normalized = canonicalizeTag(rawTag);
    let matched = false;
    Object.entries(CATEGORY_DEFINITIONS).forEach(([category, definition]) => {
      definition.terms.forEach(term => {
        const normalizedTerm = canonicalizeTag(term);
        if (normalized === normalizedTerm) {
          categories[category].push(term);
          matched = true;
        }
      });
    });
    if (PLOT_DEVICE_TERMS.includes(normalized)) matched = true;
    if (CHARACTER_ARCHETYPE_TERMS.includes(normalized)) matched = true;
    if (SETTING_TERMS.includes(normalized)) matched = true;
    if (!matched) unknown.push(rawTag);
  });

  Object.keys(categories).forEach(key => {
    categories[key] = [...new Set(categories[key])];
  });
  const executionRules = [...new Set(Object.values(categories).flat())]
    .filter(term => EXECUTION_RULES[term])
    .map(term => `${term}：${EXECUTION_RULES[term]}`);
  const nonEntityTerms = [...new Set([
    ...NON_ENTITY_CATEGORY_KEYS.flatMap(key => categories[key]),
    ...unknown
  ])]
    .filter(term => normalizeTag(term).length >= 2);

  return {
    rawTags,
    sourceGroups,
    categories,
    unknown,
    executionRules,
    nonEntityTerms
  };
}

function getWorldFamilyMatches(profile) {
  const allTags = new Set([
    ...(profile?.rawTags || []),
    ...Object.values(profile?.categories || {}).flat()
  ].map(canonicalizeTag));
  return Object.entries(WORLD_FAMILIES)
    .filter(([, terms]) => terms.some(term => allTags.has(canonicalizeTag(term))))
    .map(([family]) => family);
}

function getSynopsisWorldFamily(synopsis) {
  const text = String(synopsis || '');
  const scores = Object.fromEntries(Object.keys(WORLD_FAMILIES).map(key => [key, 0]));
  Object.entries(WORLD_FAMILIES).forEach(([family, terms]) => {
    terms.forEach(term => {
      if (text.includes(term)) scores[family] += 1;
    });
  });
  const ranked = Object.entries(scores).sort((left, right) => right[1] - left[1]);
  return ranked[0]?.[1] > 0 && ranked[0][1] > (ranked[1]?.[1] || 0) ? ranked[0][0] : '';
}

export function validateBackgroundSemanticCoherence(background, synopsis = '') {
  const profile = parseBackgroundSemantics(background);
  const errors = [];
  const warnings = [];
  const corrections = [];
  const rawNormalized = String(background || '');
  Object.entries(TAG_ALIASES).forEach(([alias, canonical]) => {
    if (rawNormalized.includes(alias) && alias !== canonical) corrections.push(`${alias}→${canonical}`);
  });

  const audiences = new Set(profile.categories.audience);
  if (audiences.has('男频') && audiences.has('女频')) {
    errors.push('受众定位冲突：不能同时选择男频和女频；“男频衍生/女频衍生”应作为题材标签单独填写');
  }

  const worldFamilies = getWorldFamilyMatches(profile);
  const synopsisFamily = getSynopsisWorldFamily(synopsis);
  if (worldFamilies.length > 1) {
    const familyLabels = {
      premodernChinese: '中国古代/修仙',
      modernChinese: '中国现代',
      republican: '民国',
      westernFantasy: '西方奇幻',
      westernModern: '西方现代',
      apocalypse: '末世'
    };
    errors.push(
      `世界背景冲突：同时选择了${worldFamilies.map(family => familyLabels[family]).join('、')}。` +
      `${synopsisFamily ? `简介更接近“${familyLabels[synopsisFamily]}”，但系统不会擅自删除其他背景，请明确保留哪一种。` : '请明确唯一主世界；跨时代内容必须说明穿越起点、终点和边界。'}`
    );
  }

  const relationshipTerms = new Set(profile.categories.relationshipMode.map(canonicalizeTag));
  if (relationshipTerms.has('无CP') && [...relationshipTerms].some(term => [
    '后宫', '单女主', '单男主', '多女主', '先婚后爱', '追妻火葬场', '追夫火葬场',
    '破镜重圆', '甜宠', '虐恋', '姐弟恋', '师徒恋', '暗恋'
  ].includes(term))) {
    errors.push('感情模式冲突：无CP不能同时搭配后宫、明确恋爱对象或婚恋情节');
  }
  if (relationshipTerms.has('后宫') && relationshipTerms.has('纯爱')) {
    errors.push('感情模式冲突：后宫与纯爱不能同时作为核心关系承诺');
  }

  const forbiddenTerms = profile.rawTags.filter(tag =>
    HARD_FORBIDDEN_INPUT_TERMS.includes(canonicalizeTag(tag))
  );
  if (forbiddenTerms.length) {
    errors.push(`包含系统全局禁用题材：${[...new Set(forbiddenTerms)].join('、')}`);
  }

  if (profile.rawTags.length >= 25 && worldFamilies.length >= 3) {
    errors.push('当前输入更像完整标签目录，而不是一本小说的已选背景。请只保留本书实际采用的标签');
  }
  if (profile.unknown.length) {
    warnings.push(`以下标签未进入标准词典，将依据所在分组、简介和相邻标签推断语义，并作为待确认约束；不会直接生成同名实体：${profile.unknown.join('、')}`);
  }

  return {
    profile,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    corrections: [...new Set(corrections)],
    synopsisWorldFamily: synopsisFamily
  };
}

export function formatBackgroundSemanticsForPrompt(profile) {
  if (!profile) return '';
  const categoryLines = Object.entries(profile.categories || {})
    .filter(([, terms]) => terms.length)
    .map(([key, terms]) => `${CATEGORY_DEFINITIONS[key].label}：${terms.join('、')}`);
  return [
    '【背景标签语义编译结果】',
    ...categoryLines,
    profile.sourceGroups
      ? `输入分组：${Object.entries(profile.sourceGroups)
        .filter(([, terms]) => terms.length)
        .map(([key, terms]) => `${INPUT_GROUP_NAMES[key] || key}=${terms.join('、')}`)
        .join('；')}`
      : '',
    profile.unknown?.length
      ? `待推断标签：${profile.unknown.join('、')}。先根据输入分组确定它描述的是题材、情节、角色、情绪还是背景，再结合简介和相邻标签写出一句可执行定义；不得按字面造同名实体。`
      : '',
    profile.executionRules?.length ? `执行规则：${profile.executionRules.join('；')}` : '',
    profile.nonEntityTerms?.length
      ? `非实体标签：${profile.nonEntityTerms.join('、')}。这些词只能作为创作约束，严禁直接拼入人物、势力、地点、法宝、功法、境界、系统或事件名称。`
      : ''
  ].filter(Boolean).join('\n');
}

function collectEntityNameIssues(value, nonEntityTerms, path = '', issues = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectEntityNameIssues(item, nonEntityTerms, `${path}[${index}]`, issues));
    return issues;
  }
  if (!value || typeof value !== 'object') return issues;
  Object.entries(value).forEach(([key, child]) => {
    const childPath = path ? `${path}.${key}` : key;
    if (key === 'name' && typeof child === 'string') {
      nonEntityTerms.forEach(term => {
        if (child.includes(term)) issues.push(`叙事标签“${term}”被错误实体化为“${child}”（${childPath}）`);
      });
    } else if (key === 'canonTerms' && Array.isArray(child)) {
      child.forEach((termValue, index) => {
        nonEntityTerms.forEach(term => {
          if (String(termValue).includes(term)) {
            issues.push(`叙事标签“${term}”被错误登记为统一术语“${termValue}”（${childPath}[${index}]）`);
          }
        });
      });
    } else {
      collectEntityNameIssues(child, nonEntityTerms, childPath, issues);
    }
  });
  return issues;
}

export function findBackgroundTagEntityIssues(value, profile) {
  return [...new Set(collectEntityNameIssues(value, profile?.nonEntityTerms || []))];
}

export function repairBackgroundTagEntityNames(value, profile) {
  const mappings = [];
  const nonEntityTerms = profile?.nonEntityTerms || [];

  function visit(node) {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== 'object') return;
    Object.entries(node).forEach(([key, child]) => {
      if (key === 'name' && typeof child === 'string') {
        let repaired = child;
        nonEntityTerms.forEach(term => {
          repaired = repaired.replaceAll(term, '');
        });
        repaired = repaired.replace(/^[·：:—\-_\s]+|[·：:—\-_\s]+$/g, '').trim();
        if (repaired && repaired !== child) {
          mappings.push({ from: child, to: repaired });
          node[key] = repaired;
        }
      } else {
        visit(child);
      }
    });
  }

  visit(value);
  const uniqueMappings = [...new Map(mappings.map(item => [`${item.from}\u0000${item.to}`, item])).values()];
  uniqueMappings.forEach(({ from, to }) => {
    function replaceReferences(node) {
      if (Array.isArray(node)) {
        node.forEach(replaceReferences);
      } else if (node && typeof node === 'object') {
        Object.keys(node).forEach(key => {
          if (typeof node[key] === 'string') node[key] = node[key].replaceAll(from, to);
          else replaceReferences(node[key]);
        });
      }
    }
    replaceReferences(value);
  });
  return uniqueMappings;
}

export { CATEGORY_DEFINITIONS as WEB_NOVEL_BACKGROUND_TAXONOMY };
