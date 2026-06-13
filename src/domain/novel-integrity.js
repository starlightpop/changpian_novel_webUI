export const NOVEL_WORLD_TYPE_PATTERN = /(架空古代|古武都市|现代都市|都市异能|东方玄幻|西方奇幻|修仙|仙侠|武侠|末世|历史架空|现代言情|古代言情|校园|职场|悬疑|无限流)/;

export const GLOBAL_FORBIDDEN_STORY_CONCEPTS = [
  '科幻',
  '星际',
  '赛朋博克',
  '赛博朋克',
  'AI',
  '人工智能',
  '程序',
  '物理宇宙',
  '数据流',
  '锚点',
  '外星人',
  '银河系',
  '宇宙',
  '时间旅行',
  '平行世界',
  '维度',
  '位面',
  '量子',
  '直播',
  '奇点',
  '元宇宙',
  '虚拟现实',
  '数字生命',
  '作者维度'
];

export const COMPLETE_CHARACTER_FIELDS = [
  'name',
  'identity',
  'publicIdentity',
  'identityRevealStage',
  'faction',
  'factionScope',
  'storyFunction',
  'ageAndAppearance',
  'personality',
  'desire',
  'goal',
  'interests',
  'agency',
  'ability',
  'weakness',
  'settingBasis',
  'plotAnchor',
  'foreshadowLink',
  'lifeHistory',
  'growthHistory',
  'arc',
  'highlight',
  'fate'
];

const PLACEHOLDER_NAME_PATTERN = /(路人|无名|某某|待定|未命名|角色\d+|守卫[A-Z甲乙丙丁戊己庚辛壬癸\d]*|弟子[A-Z甲乙丙丁戊己庚辛壬癸\d]*|村民[A-Z甲乙丙丁戊己庚辛壬癸\d]*|群众[A-Z甲乙丙丁戊己庚辛壬癸\d]*)/;
const GROUP_NAME_PATTERN = /(其他|若干|众人|诸人|哥哥们|兄弟们|姐妹们|一众|等)$/;
const ROLE_ONLY_NAME_PATTERN = /^(小师妹|师尊|掌门|长老|宗主|老村长|村长|掌柜|店小二|管家|侍卫|护卫|守夜人|父亲|母亲|哥哥|姐姐|弟弟|妹妹|二弟|三弟|四弟|五弟)$/;
const ROLE_PREFIX_PATTERN = /^(大哥|二哥|三哥|四哥|五哥|大姐|二姐|三姐|师兄|师姐)(?=[\u4e00-\u9fff]{2,4}$)/;
const GENERIC_PROFILE_PATTERNS = [
  /依据自身判断主动选择行动，并承担选择造成的后果/,
  /从受既有身份与处境限制，成长为能够主动选择并承担代价的人/,
  /最终结局由其核心欲望、关键选择、人物关系和所付代价共同决定/,
  /具有与其身份和利益一致的多面性格，并能独立判断局势/,
  /从坚持既有认知，到因主动选择承担代价并完成认知变化/,
  /参与总纲开始、发展、高潮或结局中的关键因果节点/,
  /推动剧情发展$/
];
const COMMON_SURNAMES = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗宣丁邓郁单杭洪包诸左石崔吉龚程嵇邢滑裴陆荣翁荀羊甄曲封芮储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶黎乔苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍桑桂濮牛寿通边扈燕冀浦尚农温别庄晏柴瞿阎充慕连茹习艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公';
const ACTION_NAME_PATTERN = new RegExp(`([${COMMON_SURNAMES}][\\u4e00-\\u9fff]{1,2})(?=说|问|答|看|望|走|来|去|离开|决定|命令|阻止|帮助|攻击|追赶|调查|发现|交出|拒绝|同意|赶到|进入)`, 'g');

function isNonEmpty(value) {
  return typeof value === 'string' ? Boolean(value.trim()) : value !== null && value !== undefined;
}

function normalizePair(source, target) {
  return [String(source || '').trim(), String(target || '').trim()].sort().join('|');
}

export function validateCharacterName(name) {
  const value = String(name || '').trim();
  const issues = [];
  if (!value) issues.push('姓名为空');
  if (value.length > 12) issues.push('姓名过长');
  if (/[\r\n#*[\]【】/]/.test(value)) issues.push('姓名含结构符号或别名分隔符');
  if (PLACEHOLDER_NAME_PATTERN.test(value)) issues.push('姓名是占位标签');
  if (GROUP_NAME_PATTERN.test(value)) issues.push('姓名指向群体而非单个人物');
  if (ROLE_ONLY_NAME_PATTERN.test(value)) issues.push('姓名只是身份称谓');
  if (ROLE_PREFIX_PATTERN.test(value)) issues.push('姓名混入亲属或门派称谓');
  return issues;
}

export const CHARACTER_ROSTER_ROLE_TIERS = ['核心主角', '主要人物', '重要配角'];

function normalizeRosterNameKey(name) {
  return String(name || '')
    .replace(/\s+/g, '')
    .replace(/[•・]/g, '·')
    .replace(/[·._\-—"'“”‘’（）()【】[\]]/g, '')
    .toLowerCase();
}

export function getCharacterRosterEntryIssues(entry, existingNames = []) {
  const issues = [];
  const name = String(entry?.name || '').trim();
  validateCharacterName(name).forEach(issue => issues.push(issue));
  if (!String(entry?.identity || '').trim()) issues.push('缺少具体身份');
  if (!CHARACTER_ROSTER_ROLE_TIERS.includes(String(entry?.roleTier || '').trim())) {
    issues.push('角色层级无效');
  }
  if (!String(entry?.faction || '').trim()) issues.push('缺少所属阵营');
  if (!String(entry?.storyFunction || '').trim()) issues.push('缺少不可替代的剧情功能');
  const nameKey = normalizeRosterNameKey(name);
  if (nameKey && existingNames.some(existingName => normalizeRosterNameKey(existingName) === nameKey)) {
    issues.push('姓名与现有名册重复');
  }
  return [...new Set(issues)];
}

export function getCharacterProfileIssues(character) {
  const name = String(character?.name || '未命名人物');
  const issues = validateCharacterName(name);
  const missing = COMPLETE_CHARACTER_FIELDS.filter(field => !isNonEmpty(character?.[field]));
  if (missing.length) issues.push(`缺少完整档案字段：${missing.join('、')}`);
  if (!Array.isArray(character?.hiddenIdentities)) issues.push('hiddenIdentities 必须是数组');
  if (character?.profileQuality === 'fallback' || character?.profileQuality === 'incomplete') {
    issues.push('人物档案来自兜底模板，未完成独立深化');
  }
  if (Array.isArray(character?._autoFilledFields) && character._autoFilledFields.length) {
    issues.push(`仍有自动填充字段：${character._autoFilledFields.join('、')}`);
  }
  if (Number(character?._invalidRelationshipCount) > 0) {
    issues.push(`有 ${character._invalidRelationshipCount} 条内嵌关系缺字段或引用库外人物`);
  }
  const profileText = COMPLETE_CHARACTER_FIELDS
    .map(field => String(character?.[field] || ''))
    .join('\n');
  if (GENERIC_PROFILE_PATTERNS.some(pattern => pattern.test(profileText))) {
    issues.push('人物档案仍含通用模板表述');
  }
  return issues;
}

export function validateCharacterSystemIntegrity(characters = [], relations = [], targetCount = 0) {
  const issues = [];
  const names = characters.map(character => String(character?.name || '').trim());
  const nameSet = new Set(names);
  const duplicateNames = names.filter((name, index) => name && names.indexOf(name) !== index);
  duplicateNames.forEach(name => issues.push(`人物重名：${name}`));
  characters.forEach(character => {
    getCharacterProfileIssues(character).forEach(problem => {
      issues.push(`人物“${character?.name || '未命名'}”：${problem}`);
    });
  });
  if (targetCount > 0 && characters.length < targetCount) {
    issues.push(`人物数量不足：${characters.length}/${targetCount}`);
  }

  const degree = new Map(names.map(name => [name, 0]));
  const seenPairs = new Set();
  relations.forEach((relation, index) => {
    const source = String(relation?.source || '').trim();
    const target = String(relation?.target || '').trim();
    if (!nameSet.has(source) || !nameSet.has(target)) {
      issues.push(`关系${index + 1}引用未知人物：${source} → ${target}`);
      return;
    }
    if (source === target) {
      issues.push(`关系${index + 1}形成自环：${source}`);
      return;
    }
    const pair = normalizePair(source, target);
    if (seenPairs.has(pair)) issues.push(`人物关系重复：${source} ↔ ${target}`);
    seenPairs.add(pair);
    degree.set(source, (degree.get(source) || 0) + 1);
    degree.set(target, (degree.get(target) || 0) + 1);
    if (!String(relation?.type || '').trim()) issues.push(`关系${index + 1}缺少关系类型`);
    if (!String(relation?.description || '').trim()) issues.push(`关系${index + 1}缺少关系事实`);
    if (!String(relation?.interestConflict || '').trim()) issues.push(`关系${index + 1}缺少利益冲突`);
    if (!Array.isArray(relation?.evidenceRefs) || !relation.evidenceRefs.some(Boolean)) {
      issues.push(`关系${index + 1}缺少证据引用：${source} ↔ ${target}`);
    }
    if (
      /双方的主动选择在关键剧情节点形成持续影响|在大局起伏中形成的交织线索/.test(
        `${relation?.description || ''} ${relation?.interestConflict || ''}`
      )
    ) {
      issues.push(`关系${index + 1}是自动补边模板：${source} ↔ ${target}`);
    }
  });
  degree.forEach((count, name) => {
    if (name && count === 0) issues.push(`人物未进入关系网：${name}`);
  });
  return [...new Set(issues)];
}

const EXEMPT_KEYS = new Set([
  'id',
  'status',
  'order',
  'stage',
  'volumeId',
  'eventId',
  'seedEventId',
  'payoffEventId',
  'chapterNumber',
  'prerequisiteEventIds',
  'plantedPromises',
  'paidPromises',
  'prerequisiteChapterIds',
  'threadIds',
  'validationFlags',
  'tabooList'
]);

function chineseCharsConsecutive(text, term) {
  const termChars = [...term].filter(ch => /[\u4e00-\u9fff]/.test(ch));
  if (!termChars.length) return false;
  const textChars = [...text].filter(ch => /[\u4e00-\u9fff]/.test(ch));
  let tIdx = 0;
  for (let i = 0; i < textChars.length && tIdx < termChars.length; i++) {
    if (textChars[i] === termChars[tIdx]) {
      tIdx += 1;
    } else if (tIdx > 0) {
      tIdx = textChars[i] === termChars[0] ? 1 : 0;
    }
  }
  return tIdx === termChars.length;
}

function scanForbidden(value, path, hits) {
  if (typeof value === 'string') {
    const normalizedValue = value.toLowerCase();
    GLOBAL_FORBIDDEN_STORY_CONCEPTS.forEach(term => {
      if (/^[a-zA-Z]+$/.test(term)) {
        const regex = new RegExp(`\\b${term}\\b`, 'i');
        if (regex.test(value)) {
          hits.push({ path, term });
        }
      } else {
        if (chineseCharsConsecutive(normalizedValue, term)) {
          hits.push({ path, term });
        }
      }
    });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbidden(item, `${path}[${index}]`, hits));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      if (EXEMPT_KEYS.has(key)) return;
      scanForbidden(item, path ? `${path}.${key}` : key, hits);
    });
  }
}

export function findForbiddenStoryConcepts(value) {
  const hits = [];
  scanForbidden(value, '', hits);
  return hits;
}

const OUTLINE_DEPTH_MARKERS = [
  ['人物驱动', /【人物驱动】/],
  ['群像推进', /【群像推进】/],
  ['悬疑问题', /【悬疑问题】/],
  ['因果升级', /【因果升级】/],
  ['关键反转', /【关键反转】/],
  ['爽点兑现', /【爽点兑现】/],
  ['阶段代价', /【阶段代价】/]
];

export function validateMasterOutlineDepth(masterOutline = {}) {
  const issues = [];
  const stages = [
    ['beginning', '开始'],
    ['development', '发展'],
    ['climax', '高潮'],
    ['ending', '结局']
  ];
  stages.forEach(([key, label]) => {
    const text = String(masterOutline?.[key] || '').trim();
    if (!text) {
      issues.push(`总纲${label}为空`);
      return;
    }
    if (text.length < 240) issues.push(`总纲${label}过于简略，无法承载人物、悬疑、反转和群像因果`);
    OUTLINE_DEPTH_MARKERS.forEach(([marker, pattern]) => {
      if (!pattern.test(text)) issues.push(`总纲${label}缺少结构段【${marker}】`);
    });
    if (!/(因为|导致|因此|迫使|源于|代价|后果)/.test(text)) {
      issues.push(`总纲${label}缺少明确因果连接`);
    }
    if (!/(选择|决定|拒绝|主动|策划|争取|隐瞒|背叛|牺牲)/.test(text)) {
      issues.push(`总纲${label}缺少人物主动选择`);
    }
  });
  return [...new Set(issues)];
}

export function validateEnsembleArchitecture(architecture = {}, characters = []) {
  const issues = [];
  const knownNames = new Set(characters.map(character => String(character?.name || '').trim()).filter(Boolean));
  const threads = Array.isArray(architecture?.narrativeThreads) ? architecture.narrativeThreads : [];
  if (threads.length < 3) issues.push(`默认群像结构至少需要3条独立叙事线，当前${threads.length}条`);
  const allDrivers = new Set();
  threads.forEach((thread, index) => {
    const label = thread?.name || thread?.id || `叙事线${index + 1}`;
    const drivers = Array.isArray(thread?.driverCharacters) ? thread.driverCharacters.filter(Boolean) : [];
    if (!String(thread?.independentGoal || '').trim()) issues.push(`叙事线“${label}”缺少独立目标`);
    if (!String(thread?.interestConflict || '').trim()) issues.push(`叙事线“${label}”缺少利益冲突`);
    if (!String(thread?.agencyPlan || '').trim()) issues.push(`叙事线“${label}”缺少主动行动计划`);
    if (!drivers.length) issues.push(`叙事线“${label}”没有驱动人物`);
    drivers.forEach(name => {
      allDrivers.add(name);
      if (knownNames.size && !knownNames.has(name)) issues.push(`叙事线“${label}”引用未知人物：${name}`);
    });
    const intersections = Array.isArray(thread?.intersections) ? thread.intersections.filter(Boolean) : [];
    if (!intersections.length) issues.push(`叙事线“${label}”没有与其他人物线的因果交汇`);
  });
  if (allDrivers.size < 3) issues.push(`群像至少需要3位不同驱动人物，当前${allDrivers.size}位`);
  if (threads.length >= 3 && [...allDrivers].length === 1) {
    issues.push('所有叙事线都由同一人物驱动，不构成群像');
  }
  return [...new Set(issues)];
}

export function validateGoldenThreeChapters(chapters = []) {
  const issues = [];
  const roles = [
    '第一章-危机入场',
    '第二章-升级兑现',
    '第三章-小高潮立承诺'
  ];
  for (let index = 0; index < 3; index += 1) {
    const chapter = chapters.find(item => Number(item?.chapterNumber) === index + 1);
    const number = index + 1;
    if (!chapter) {
      issues.push(`黄金三章缺少第${number}章`);
      continue;
    }
    if (chapter.goldenChapterRole !== roles[index]) {
      issues.push(`第${number}章黄金三章定位错误，应为“${roles[index]}”`);
    }
    ['readerPayoff', 'coreQuestion'].forEach(field => {
      if (!String(chapter?.[field] || '').trim()) issues.push(`第${number}章缺少 ${field}`);
    });
    if (!String(chapter.characterAction || '').trim()) issues.push(`第${number}章缺少人物主动行动`);
    if (!String(chapter.conflict || '').trim()) issues.push(`第${number}章缺少即时冲突`);
    if (!String(chapter.turn || '').trim()) issues.push(`第${number}章缺少转折`);
    if (!String(chapter.endingHook || '').trim()) issues.push(`第${number}章缺少章末强钩子`);
  }
  const first = chapters.find(item => Number(item?.chapterNumber) === 1);
  const second = chapters.find(item => Number(item?.chapterNumber) === 2);
  const third = chapters.find(item => Number(item?.chapterNumber) === 3);
  if (first && !/(危机|困境|冲突|追杀|逼迫|失去|冤屈|羞辱|倒计时|死亡|破产|驱逐|背叛)/.test(
    `${first.openingState} ${first.conflict} ${first.plotSummary}`
  )) {
    issues.push('第1章没有在开篇快速进入具体危机或核心困境');
  }
  if (second && !/(升级|反击|揭穿|夺回|赢得|扭转|兑现|打脸|脱困|证据|主动)/.test(
    `${second.characterAction} ${second.turn} ${second.readerPayoff} ${second.stateDelta}`
  )) {
    issues.push('第2章缺少冲突升级和第一次明确兑现');
  }
  if (third && !/(反转|真相|原来|却|竟|身份|幕后|代价|选择|承诺|目标)/.test(
    `${third.turn} ${third.coreQuestion} ${third.readerPayoff} ${third.endingHook}`
  )) {
    issues.push('第3章缺少小高潮、有效反转或长线核心承诺');
  }
  return [...new Set(issues)];
}

export function synchronizePromiseEventReferences(blueprint) {
  const events = Array.isArray(blueprint?.eventCards) ? blueprint.eventCards : [];
  const promises = Array.isArray(blueprint?.promiseLedger) ? blueprint.promiseLedger : [];
  const eventCounts = new Map();
  const promiseCounts = new Map();
  events.forEach(event => {
    const id = String(event?.id || '').trim();
    if (id) eventCounts.set(id, (eventCounts.get(id) || 0) + 1);
  });
  promises.forEach(promise => {
    const id = String(promise?.id || '').trim();
    if (id) promiseCounts.set(id, (promiseCounts.get(id) || 0) + 1);
  });
  const eventById = new Map(
    events
      .filter(event => eventCounts.get(String(event?.id || '').trim()) === 1)
      .map(event => [String(event.id).trim(), event])
  );
  const changes = [];

  const addReference = (event, field, promiseId, relation) => {
    if (!Array.isArray(event[field])) event[field] = [];
    if (event[field].includes(promiseId)) return;
    event[field].push(promiseId);
    changes.push(`${event.id}.${field} 补登记 ${promiseId}（${relation}）`);
  };

  const removeConflictingReferences = (field, promiseId, authoritativeEventId, relation) => {
    events.forEach(event => {
      if (!Array.isArray(event[field]) || event.id === authoritativeEventId) return;
      const previousLength = event[field].length;
      event[field] = event[field].filter(id => id !== promiseId);
      if (event[field].length !== previousLength) {
        changes.push(`${event.id}.${field} 移除 ${promiseId}（与台账${relation}事件冲突）`);
      }
    });
  };

  promises.forEach(promise => {
    const promiseId = String(promise?.id || '').trim();
    if (!promiseId || promiseCounts.get(promiseId) !== 1) return;
    const seedEvent = eventById.get(String(promise.seedEventId || '').trim());
    if (seedEvent) {
      removeConflictingReferences('plantedPromises', promiseId, seedEvent.id, '埋设');
      addReference(seedEvent, 'plantedPromises', promiseId, '埋设');
    }

    const payoffEvent = eventById.get(String(promise.payoffEventId || '').trim());
    const seedOrder = Number(seedEvent?.order);
    const payoffOrder = Number(payoffEvent?.order);
    if (
      payoffEvent &&
      Number.isFinite(seedOrder) &&
      Number.isFinite(payoffOrder) &&
      payoffOrder > seedOrder
    ) {
      removeConflictingReferences('paidPromises', promiseId, payoffEvent.id, '回收');
      addReference(payoffEvent, 'paidPromises', promiseId, '回收');
    }
  });

  return changes;
}

export function parsePriorChapterReference(origin) {
  const text = String(origin || '');
  const match = text.match(/chapter-outline-(\d+)|第\s*(\d+)\s*章/);
  return match ? Number(match[1] || match[2]) : null;
}

function chineseNumberToInteger(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/余$/, '');
  if (/^\d+$/.test(cleaned)) return Number(cleaned);
  const digits = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const units = { 十: 10, 百: 100, 千: 1000 };
  let total = 0;
  let current = 0;
  for (const char of cleaned) {
    if (char in digits) {
      current = digits[char];
    } else if (char in units) {
      total += (current || 1) * units[char];
      current = 0;
    } else {
      return null;
    }
  }
  return total + current;
}

export function parseRelativeDay(timeText) {
  const match = String(timeText || '').match(/第\s*([零一二两三四五六七八九十百千\d]+(?:余)?)\s*(?:日|天)/);
  return match ? chineseNumberToInteger(match[1]) : null;
}

function collectSuspiciousUnknownNames(text, knownNames) {
  const hits = new Set();
  for (const match of String(text || '').matchAll(ACTION_NAME_PATTERN)) {
    const name = match[1];
    if (!knownNames.has(name)) hits.add(name);
  }
  return [...hits];
}

function hasInitialProvenance(origin) {
  return /(背景设定|人物生平|随身携带|卷首既有|开篇前|前史|家族传承|职业常备|日常储备)/.test(String(origin || ''));
}

function hasTravelTransition(text) {
  return /(抵达|前往|赶到|转移|进入|离开|回到|来到|启程|赶路|次日|翌日|随后|承接)/.test(String(text || ''));
}

export function validatePlotIntegrity({ chapters = [], architecture = {}, characters = [] } = {}) {
  const issues = [];
  issues.push(...validateEnsembleArchitecture(architecture, characters));
  issues.push(...validateGoldenThreeChapters(chapters));
  const characterNames = new Set(characters.map(character => String(character?.name || '').trim()).filter(Boolean));
  const threads = Array.isArray(architecture?.narrativeThreads) ? architecture.narrativeThreads : [];
  const threadIds = new Set();
  threads.forEach((thread, index) => {
    const id = String(thread?.id || '').trim();
    if (!id) issues.push(`叙事线${index + 1}缺少 id`);
    if (threadIds.has(id)) issues.push(`叙事线 id 重复：${id}`);
    threadIds.add(id);
    if (!String(thread?.name || '').trim()) issues.push(`叙事线${id || index + 1}缺少名称`);
    if (!String(thread?.startState || '').trim() || !String(thread?.endState || '').trim()) {
      issues.push(`叙事线${id || index + 1}缺少起止状态`);
    }
    const drivers = Array.isArray(thread?.driverCharacters) ? thread.driverCharacters : [];
    if (!drivers.length) issues.push(`叙事线${id || index + 1}没有驱动人物`);
    drivers.forEach(name => {
      if (!characterNames.has(name)) issues.push(`叙事线${id || index + 1}引用未知驱动人物：${name}`);
    });
  });
  if (!threads.length) issues.push('缺少三幕多线叙事结构');

  const volumes = Array.isArray(architecture?.volumes) ? architecture.volumes : [];
  const volumeIds = new Set();
  volumes.forEach((volume, index) => {
    const id = String(volume?.id || '').trim();
    if (!id) issues.push(`第${index + 1}卷缺少 id`);
    if (volumeIds.has(id)) issues.push(`卷 id 重复：${id}`);
    volumeIds.add(id);
    ['startState', 'volumeGoal', 'primaryConflict', 'midpointTurn', 'climax', 'lowPoint', 'endState', 'nextHook']
      .forEach(field => {
        if (!String(volume?.[field] || '').trim()) issues.push(`卷${id || index + 1}缺少 ${field}`);
      });
  });

  const usedThreads = new Set();
  const introducedResources = new Map();
  const chapterElementIntroductions = new Map();
  let previousDay = null;
  let previousChapter = null;
  const clueSeeds = new Map();
  const chapterIdToNumber = new Map();
  chapters.forEach((chapter, index) => {
    const id = String(chapter?.id || '').trim();
    const number = Number(chapter?.chapterNumber);
    if (!id) issues.push(`第${number || index + 1}章缺少章节 ID`);
    if (Number.isInteger(number) && id !== `chapter-outline-${number}`) {
      issues.push(`第${number}章 ID 必须为 chapter-outline-${number}`);
    }
    if (chapterIdToNumber.has(id)) issues.push(`章节 ID 重复：${id}`);
    chapterIdToNumber.set(id, number);
  });
  chapters.forEach((chapter, index) => {
    const number = Number(chapter?.chapterNumber);
    if (number !== index + 1) issues.push(`章节序号不连续：期望${index + 1}，实际${number || '空'}`);
    if (!volumeIds.has(String(chapter?.volumeId || ''))) {
      issues.push(`第${number || index + 1}章引用未知卷：${chapter?.volumeId || '空'}`);
    }
    const viewpoint = String(chapter?.viewpoint || '').trim();
    if (!characterNames.has(viewpoint)) issues.push(`第${number || index + 1}章视角人物不存在：${viewpoint || '空'}`);
    const participants = new Set(Array.isArray(chapter?.participants) ? chapter.participants : []);
    participants.forEach(name => {
      if (!characterNames.has(name)) issues.push(`第${number || index + 1}章出现未知人物：${name}`);
    });
    if (viewpoint && !participants.has(viewpoint)) {
      issues.push(`第${number || index + 1}章视角人物未列入参与人物：${viewpoint}`);
    }
    (chapter?.threadIds || []).forEach(id => {
      usedThreads.add(id);
      if (!threadIds.has(id)) issues.push(`第${number || index + 1}章引用未知叙事线：${id}`);
    });
    if (!(chapter?.threadIds || []).length) issues.push(`第${number || index + 1}章未归属任何叙事线`);
    const prerequisites = Array.isArray(chapter?.prerequisiteChapterIds)
      ? chapter.prerequisiteChapterIds
      : [];
    if (number > 1 && !prerequisites.length) {
      issues.push(`第${number || index + 1}章缺少前置章节依赖`);
    }
    prerequisites.forEach(id => {
      const dependencyId = String(id || '').trim();
      const dependencyNumber = chapterIdToNumber.get(dependencyId);
      if (!dependencyId || !chapterIdToNumber.has(dependencyId)) {
        issues.push(`第${number || index + 1}章引用不存在的前置章节：${dependencyId || '空'}`);
      } else if (!dependencyNumber || dependencyNumber >= number) {
        issues.push(`第${number || index + 1}章引用当前或未来章节：${dependencyId}`);
      }
    });

    const requiredFields = [
      'title', 'time', 'location', 'openingState', 'characterGoal', 'characterAction',
      'opposition', 'conflict', 'causalReason', 'plotSummary', 'turn', 'cost',
      'knowledgeDelta', 'relationshipDelta', 'stateDelta', 'emotionalCurve', 'endingHook'
    ];
    requiredFields.forEach(field => {
      if (!String(chapter?.[field] || '').trim()) issues.push(`第${number || index + 1}章缺少 ${field}`);
    });

    const day = parseRelativeDay(chapter?.time);
    if (day !== null && previousDay !== null && day < previousDay) {
      issues.push(`第${number || index + 1}章时间倒退：${chapter.time}`);
    }
    if (day !== null) previousDay = day;
    if (
      previousChapter &&
      previousChapter.location !== chapter?.location &&
      previousChapter.viewpoint === viewpoint &&
      !hasTravelTransition(`${chapter?.openingState || ''} ${chapter?.causalReason || ''}`)
    ) {
      issues.push(`第${number || index + 1}章地点变化缺少移动过程：${previousChapter.location} → ${chapter?.location}`);
    }

    (chapter?.plantedClues || []).forEach(clue => {
      if (!String(clue || '').trim()) {
        issues.push(`第${number || index + 1}章包含空伏笔名称`);
        return;
      }
      if (!clueSeeds.has(clue)) clueSeeds.set(clue, number);
    });
    (chapter?.paidClues || []).forEach(clue => {
      if (!String(clue || '').trim()) {
        issues.push(`第${number || index + 1}章包含空回收项`);
        return;
      }
      const seed = clueSeeds.get(clue);
      if (!seed || seed >= number) issues.push(`第${number || index + 1}章回收未提前埋设的伏笔：${clue}`);
    });

    (chapter?.newElements || []).forEach(element => {
      const name = String(element?.name || '').trim();
      if (!name || !String(element?.origin || '').trim() || !String(element?.purpose || '').trim()) {
        issues.push(`第${number || index + 1}章新增元素缺少名称、来源或用途：${name || '未命名'}`);
        return;
      }
      if (element.type === '人物' && !characterNames.has(name)) {
        issues.push(`第${number || index + 1}章天降人物：${name}`);
      }
      const originChapter = parsePriorChapterReference(element.origin);
      if (
        number > 1 &&
        originChapter === null &&
        !introducedResources.has(name)
      ) {
        issues.push(`第${number || index + 1}章新增元素“${name}”的来源没有指向前置章节`);
      }
      if (originChapter !== null && originChapter >= number) {
        issues.push(`第${number || index + 1}章新增元素“${name}”引用了当前或未来章节`);
      }
      introducedResources.set(name, number);
      if (!chapterElementIntroductions.has(number)) chapterElementIntroductions.set(number, new Set());
      chapterElementIntroductions.get(number).add(name);
    });

    (chapter?.resourcesUsed || []).forEach(resource => {
      const name = String(resource?.name || '').trim();
      if (!name || !String(resource?.origin || '').trim() || !String(resource?.cost || '').trim()) {
        issues.push(`第${number || index + 1}章资源缺少名称、来源或代价：${name || '未命名'}`);
        return;
      }
      const originChapter = parsePriorChapterReference(resource.origin);
      const knownEarlier = introducedResources.has(name) && introducedResources.get(name) < number;
      if (number === 1 && !hasInitialProvenance(resource.origin) && originChapter === null) {
        issues.push(`第1章资源“${name}”缺少前史或人物既有来源`);
      }
      if (number > 1 && originChapter === null && !knownEarlier) {
        issues.push(`第${number}章资源“${name}”的来源没有指向前置章节`);
      }
      if (originChapter !== null && originChapter >= number) {
        issues.push(`第${number}章资源“${name}”引用了当前或未来章节`);
      }
      if (!chapterElementIntroductions.has(number)) chapterElementIntroductions.set(number, new Set());
      chapterElementIntroductions.get(number).add(name);
    });

    (chapter?.newElements || []).forEach(element => {
      const name = String(element?.name || '').trim();
      const originChapter = parsePriorChapterReference(element.origin);
      if (originChapter !== null && originChapter < number) {
        const originElements = chapterElementIntroductions.get(originChapter);
        if (!originElements || !originElements.has(name)) {
          issues.push(`第${number}章引用第${originChapter}章为来源，但该章未引入"${name}"：疑似天降元素`);
        }
      }
    });
    (chapter?.resourcesUsed || []).forEach(resource => {
      const name = String(resource?.name || '').trim();
      const originChapter = parsePriorChapterReference(resource.origin);
      if (originChapter !== null && originChapter < number) {
        const originElements = chapterElementIntroductions.get(originChapter);
        if (!originElements || !originElements.has(name)) {
          issues.push(`第${number}章资源"${name}"声明来自第${originChapter}章，但该章未引入此资源：疑似天降道具`);
        }
      }
    });
    (chapter?.resourcesUsed || []).forEach(resource => {
      const name = String(resource?.name || '').trim();
      const originChapter = parsePriorChapterReference(resource.origin);
      if (originChapter !== null && originChapter < number) {
        const originElements = chapterElementIntroductions.get(originChapter);
        if (originElements && !originElements.has(name)) {
          issues.push(`第${number}章资源“${name}”声明来自第${originChapter}章，但该章未引入此资源：疑似天降道具`);
        }
      }
    });

    const storyText = [
      chapter?.openingState, chapter?.characterGoal, chapter?.characterAction, chapter?.opposition,
      chapter?.conflict, chapter?.causalReason, chapter?.plotSummary, chapter?.turn,
      chapter?.knowledgeDelta, chapter?.relationshipDelta, chapter?.stateDelta, chapter?.endingHook
    ].join('\n');
    characterNames.forEach(name => {
      if (storyText.includes(name) && !participants.has(name)) {
        issues.push(`第${number || index + 1}章正文提及人物但未登记参与：${name}`);
      }
    });
    collectSuspiciousUnknownNames(storyText, characterNames).forEach(name => {
      issues.push(`第${number || index + 1}章疑似出现未登记姓名：${name}`);
    });
    findForbiddenStoryConcepts({ chapter }).forEach(hit => {
      issues.push(`第${number || index + 1}章出现禁用概念“${hit.term}”`);
    });
    previousChapter = chapter;
  });
  threads.forEach(thread => {
    if (thread?.id && !usedThreads.has(thread.id)) {
      issues.push(`叙事线未进入任何章节：${thread.id}`);
    }
    const intersections = Array.isArray(thread.intersections) ? thread.intersections : [];
    intersections.forEach(intersectStr => {
      const otherThread = threads.find(t => t.id !== thread.id && (intersectStr.includes(t.id) || intersectStr.includes(t.name)));
      if (otherThread) {
        const intersectingChapters = chapters.filter(ch => {
          const chThreads = ch.threadIds || [];
          return chThreads.includes(thread.id) && chThreads.includes(otherThread.id);
        });
        if (!intersectingChapters.length) {
          issues.push(`叙事线“${thread.name}”声明与“${otherThread.name}”交汇，但没有章节同时包含这两条线`);
        } else {
          intersectingChapters.forEach(ch => {
            const chParticipants = new Set(ch.participants || []);
            const missingDrivers = [...new Set([...(thread.driverCharacters || []), ...(otherThread.driverCharacters || [])])].filter(d => !chParticipants.has(d));
            if (missingDrivers.length) {
              issues.push(`第${ch.chapterNumber}章为叙事线“${thread.name}”与“${otherThread.name}”的交汇点，但驱动角色“${missingDrivers.join('、')}”未参与该章`);
            }
          });
        }
      }
    });
  });

  clueSeeds.forEach((seedChapterNumber, clue) => {
    const paidChapter = chapters.find(ch => (ch.paidClues || []).includes(clue));
    if (paidChapter) {
      const payChapterNumber = Number(paidChapter.chapterNumber);
      if (payChapterNumber - seedChapterNumber > 30) {
        issues.push(`伏笔“${clue}”在第${seedChapterNumber}章埋设，但直到第${payChapterNumber}章才回收，跨度超过30章，存在被读者遗忘的风险`);
      }
    }
  });

  return [...new Set(issues)];
}

export function inferSynopsisProtagonistNames(synopsis) {
  const text = String(synopsis || '').trim();
  const names = new Set();
  const patterns = [
    /(?:^|[。！？\n，,])([\u4e00-\u9fff]{2,4})是(?:一名|一个|位|个)/g,
    /(?:主角|男主|女主)(?:名为|叫做|叫|是|[：:])\s*([\u4e00-\u9fff]{2,4})/g
  ];
  patterns.forEach(pattern => {
    for (const match of text.matchAll(pattern)) {
      if (!validateCharacterName(match[1]).length) names.add(match[1]);
    }
  });
  return [...names];
}

export function getDerivedDataMismatchReasons(novel, sourceSignature) {
  const reasons = [];
  const hasDerivedData = Boolean(
    novel?.masterOutline ||
    novel?.characterBible?.length ||
    novel?.characterRelations?.length ||
    novel?.plotBlueprint ||
    novel?.finalOutline ||
    novel?.assets?.some(asset => !['story-constitution', 'reference-analysis'].includes(asset?.type))
  );
  if (!hasDerivedData) return reasons;
  if (!novel?.derivedSourceSignature) {
    reasons.push('派生数据缺少来源签名，无法证明与当前背景简介一致');
  } else if (novel.derivedSourceSignature !== sourceSignature) {
    reasons.push('派生数据来源签名与当前背景简介不一致');
  }
  if (
    novel?.storyConstitution?.sourceSignature &&
    novel.storyConstitution.sourceSignature !== sourceSignature
  ) {
    reasons.push('作品宪法来源签名与当前背景简介不一致');
  }
  const protagonists = inferSynopsisProtagonistNames(novel?.synopsis);
  const characterNames = new Set((novel?.characterBible || []).map(character => character?.name));
  if (protagonists.length && novel?.characterBible?.length && !protagonists.some(name => characterNames.has(name))) {
    reasons.push(`简介主角未进入人物库：${protagonists.join('、')}`);
  }
  const kernelProtagonist = String(novel?.narrativeKernel?.protagonist || '').trim();
  if (kernelProtagonist && protagonists.length && !protagonists.some(name => kernelProtagonist.includes(name))) {
    reasons.push('叙事内核主角与当前简介主角不一致');
  }
  return reasons;
}

export function getFinalReviewBlockingIssues(review, integrityStatus = null) {
  const issues = Array.isArray(review?.issues) ? review.issues : [];
  const severe = issues.filter(issue => ['critical', 'high'].includes(issue?.severity));
  const score = Number(review?.score) || 0;
  const blockers = severe.map(issue => `${issue?.target || '全局'}：${issue?.problem || '严重问题'}`);
  if (score < 85) blockers.push(`全书复审评分不足：${score}/85`);
  if (integrityStatus?.needsReaudit) {
    blockers.push(integrityStatus.reason || '人物或关系已修改，章节剧情需要重新审计');
  }
  return blockers;
}
