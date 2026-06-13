const MEMORY_VERSION = 1;
const MAX_FACT_HISTORY = 3000;
const MAX_OBSERVATIONS = 240;

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    ).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashText(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function compact(value, maxLength = 1200) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}…`;
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function makeFact({
  key,
  type,
  subject,
  predicate,
  object,
  sourceRef,
  effectiveOrder = 0,
  mandatory = false,
  tags = []
}) {
  const normalizedObject = compact(object);
  return {
    key,
    type,
    subject: String(subject || ''),
    predicate: String(predicate || ''),
    object: normalizedObject,
    sourceRef: String(sourceRef || ''),
    effectiveOrder: Number(effectiveOrder) || 0,
    mandatory: Boolean(mandatory),
    tags: [...new Set(tags.map(item => String(item || '').trim()).filter(Boolean))],
    contentHash: hashText(stableStringify({
      type,
      subject,
      predicate,
      object: normalizedObject,
      sourceRef,
      effectiveOrder
    }))
  };
}

export function deriveNarrativeFacts(novel) {
  const facts = [];
  const push = fact => facts.push(makeFact(fact));
  const constitution = novel?.storyConstitution;

  if (constitution) {
    push({
      key: 'canon:constitution',
      type: 'constitution',
      subject: novel.id,
      predicate: '受作品宪法约束',
      object: constitution,
      sourceRef: 'storyConstitution',
      mandatory: true,
      tags: ['背景', '世界观', '风格', '禁用概念', constitution.audience]
    });
  }

  normalizeList(novel?.characterCanon?.contracts).forEach(contract => {
    const name = String(contract?.name || '').trim();
    if (!name) return;
    push({
      key: `character-canon:${name}`,
      type: 'character-canon',
      subject: name,
      predicate: '不可擅自改写的人物事实契约',
      object: contract,
      sourceRef: `characterCanon.contracts:${name}`,
      mandatory: true,
      tags: [name, contract.publicIdentity, contract.faction, '人物事实契约', '事实优先级']
    });
  });

  if (novel?.masterOutline) {
    push({
      key: 'canon:master-outline',
      type: 'master-outline',
      subject: novel.id,
      predicate: '已审核总纲',
      object: novel.masterOutline,
      sourceRef: 'masterOutline',
      mandatory: true,
      tags: ['总纲', '人物驱动', '因果', '高潮', '结局']
    });
  }

  if (novel?.plotBlueprint?.architecture) {
    push({
      key: 'canon:ensemble-architecture',
      type: 'ensemble-architecture',
      subject: novel.id,
      predicate: '已审核群像多线结构',
      object: novel.plotBlueprint.architecture,
      sourceRef: 'plotBlueprint.architecture',
      mandatory: true,
      tags: ['群像', '三幕多线', '人物目标', '利益冲突']
    });
  }

  normalizeList(novel?.characterBible).forEach(character => {
    const name = String(character?.name || '').trim();
    if (!name) return;
    push({
      key: `character:${name}:profile`,
      type: 'character',
      subject: name,
      predicate: '人物正式档案',
      object: {
        identity: character.identity,
        publicIdentity: character.publicIdentity,
        hiddenIdentities: character.hiddenIdentities,
        faction: character.faction,
        personality: character.personality,
        lifeHistory: character.lifeHistory,
        growthHistory: character.growthHistory,
        arc: character.arc,
        highlight: character.highlight,
        fate: character.fate,
        desire: character.desire,
        goal: character.goal,
        interests: character.interests,
        agency: character.agency,
        ability: character.ability,
        weakness: character.weakness
      },
      sourceRef: `characterBible:${name}`,
      tags: [name, character.faction, character.identity, '人物', '欲望', '目标', '利益']
    });
  });

  normalizeList(novel?.characterRelations).forEach((relation, index) => {
    const source = String(relation?.source || '').trim();
    const target = String(relation?.target || '').trim();
    if (!source || !target) return;
    push({
      key: `relation:${source}:${target}:${relation.type || index}`,
      type: 'relationship',
      subject: source,
      predicate: relation.type || '关系',
      object: {
        target,
        direction: relation.direction,
        description: relation.description,
        interestConflict: relation.interestConflict
      },
      sourceRef: `characterRelations:${index}`,
      tags: [source, target, relation.type, '人物关系', '利益冲突']
    });
  });

  normalizeList(novel?.eventCards).forEach((event, index) => {
    const id = String(event?.id || `event-${index + 1}`);
    push({
      key: `event:${id}`,
      type: 'event',
      subject: id,
      predicate: '正式事件',
      object: event,
      sourceRef: `eventCards:${id}`,
      effectiveOrder: event.order || index + 1,
      tags: [id, event.title, event.stage, event.protagonistGoal, event.oppositionActor, '因果']
    });
  });

  normalizeList(novel?.stateLedger).forEach((stateItem, index) => {
    const eventId = String(stateItem?.eventId || `event-${index + 1}`);
    push({
      key: `state:${eventId}`,
      type: 'state',
      subject: eventId,
      predicate: '事件后状态',
      object: stateItem,
      sourceRef: `stateLedger:${eventId}`,
      effectiveOrder: index + 1,
      tags: [eventId, '人物状态', '关系状态', '世界状态', '知情状态']
    });
  });

  normalizeList(novel?.promiseLedger).forEach((promise, index) => {
    const id = String(promise?.id || `promise-${index + 1}`);
    push({
      key: `promise:${id}`,
      type: 'promise',
      subject: id,
      predicate: promise.status === 'paid' ? '已回收伏笔' : '未回收伏笔',
      object: promise,
      sourceRef: `promiseLedger:${id}`,
      effectiveOrder: index + 1,
      tags: [id, promise.promiseType, promise.seedEventId, promise.payoffEventId, '伏笔']
    });
  });

  normalizeList(novel?.plotBlueprint?.chapters).forEach((chapter, index) => {
    const number = Number(chapter?.chapterNumber) || index + 1;
    push({
      key: `chapter:${number}`,
      type: 'chapter',
      subject: `第${number}章`,
      predicate: '正式章节细纲',
      object: chapter,
      sourceRef: `plotBlueprint.chapters:${number}`,
      effectiveOrder: number,
      tags: [
        chapter.title,
        chapter.location,
        chapter.viewpoint,
        ...normalizeList(chapter.participants),
        ...normalizeList(chapter.threadIds),
        '时间', '空间', '剧情'
      ]
    });
    normalizeList(chapter.newElements).forEach((element, elementIndex) => {
      if (!element?.name) return;
      push({
        key: `element:${element.name}:introduced:${number}`,
        type: 'resource',
        subject: element.name,
        predicate: '首次引入',
        object: {
          type: element.type,
          origin: element.origin,
          purpose: element.purpose,
          chapterNumber: number
        },
        sourceRef: `plotBlueprint.chapters:${number}.newElements:${elementIndex}`,
        effectiveOrder: number,
        tags: [element.name, element.type, chapter.location, '来源']
      });
    });
  });

  normalizeList(novel?.factionPlans).forEach((plan, index) => {
    const id = String(plan?.id || plan?.name || `faction-${index + 1}`);
    push({
      key: `faction-plan:${id}`,
      type: 'faction-plan',
      subject: plan.name || id,
      predicate: '势力行动计划',
      object: plan,
      sourceRef: `factionPlans:${id}`,
      tags: [plan.name, plan.leader, '势力', '利益', '计划']
    });
  });

  return facts;
}

function createEmptyMemory(novelId) {
  return {
    version: MEMORY_VERSION,
    novelId: String(novelId || ''),
    revision: 0,
    sourceFingerprint: '',
    facts: [],
    observations: [],
    updatedAt: ''
  };
}

export function syncNarrativeMemory(novel, options = {}) {
  if (!novel || typeof novel !== 'object') return createEmptyMemory('');
  const now = options.now || new Date().toISOString();
  const memory = novel.narrativeMemory?.version === MEMORY_VERSION
    ? novel.narrativeMemory
    : createEmptyMemory(novel.id);
  const nextFacts = deriveNarrativeFacts(novel);
  const fingerprint = hashText(stableStringify(nextFacts.map(fact => ({
    key: fact.key,
    contentHash: fact.contentHash
  }))));
  if (memory.sourceFingerprint === fingerprint) {
    novel.narrativeMemory = memory;
    return memory;
  }

  const activeByKey = new Map(
    memory.facts.filter(fact => fact.status === 'active').map(fact => [fact.key, fact])
  );
  const nextKeys = new Set(nextFacts.map(fact => fact.key));
  let revisionChanged = false;

  memory.facts.forEach(fact => {
    if (fact.status === 'active' && !nextKeys.has(fact.key)) {
      fact.status = 'superseded';
      fact.invalidatedAt = now;
      fact.invalidatedReason = options.reason || '正式事实源已删除或替换';
      revisionChanged = true;
    }
  });

  nextFacts.forEach(candidate => {
    const current = activeByKey.get(candidate.key);
    if (current?.contentHash === candidate.contentHash) return;
    if (current) {
      current.status = 'superseded';
      current.invalidatedAt = now;
      current.invalidatedReason = options.reason || '正式事实源发生变化';
    }
    const factVersion = Math.max(
      0,
      ...memory.facts.filter(fact => fact.key === candidate.key).map(fact => Number(fact.factVersion) || 0)
    ) + 1;
    memory.facts.push({
      ...candidate,
      id: `memory-fact-${hashText(`${novel.id}:${candidate.key}:${candidate.contentHash}:${factVersion}`)}`,
      factVersion,
      status: 'active',
      acceptedAt: now,
      acceptedReason: options.reason || '从已审核故事结构同步'
    });
    revisionChanged = true;
  });

  if (revisionChanged) memory.revision = (Number(memory.revision) || 0) + 1;
  memory.version = MEMORY_VERSION;
  memory.novelId = String(novel.id || '');
  memory.sourceFingerprint = fingerprint;
  memory.updatedAt = now;
  if (memory.facts.length > MAX_FACT_HISTORY) {
    const active = memory.facts.filter(fact => fact.status === 'active');
    const history = memory.facts
      .filter(fact => fact.status !== 'active')
      .slice(-(MAX_FACT_HISTORY - active.length));
    memory.facts = [...history, ...active];
  }
  novel.narrativeMemory = memory;
  return memory;
}

export function recordNarrativeObservation(novel, observation = {}) {
  if (!novel) return null;
  const memory = syncNarrativeMemory(novel);
  const createdAt = observation.createdAt || new Date().toISOString();
  const item = {
    id: `memory-observation-${hashText(`${novel.id}:${createdAt}:${observation.type}:${observation.summary}`)}`,
    type: observation.type || 'process',
    status: observation.status || 'recorded',
    summary: compact(observation.summary || '', 600),
    details: compact(observation.details || '', 1800),
    source: String(observation.source || ''),
    contextFingerprint: String(observation.contextFingerprint || ''),
    createdAt
  };
  memory.observations.push(item);
  memory.observations = memory.observations.slice(-MAX_OBSERVATIONS);
  memory.updatedAt = createdAt;
  return item;
}

function tokenize(query) {
  return [...new Set(String(query || '')
    .toLowerCase()
    .split(/[\s，。！？、；：,.!?;:【】（）()\-_]+/)
    .map(term => term.trim())
    .filter(term => term.length >= 2))];
}

export function retrieveNarrativeMemory(novel, query, options = {}) {
  const memory = syncNarrativeMemory(novel);
  const activeFacts = memory.facts.filter(fact => fact.status === 'active');
  const terms = tokenize(query);
  const chapterMatch = String(query || '').match(/第?\s*(\d+)\s*章/);
  const chapterNumber = Number(options.chapterNumber || chapterMatch?.[1]) || 0;
  const mandatory = activeFacts.filter(fact => fact.mandatory);
  const unresolvedPromises = activeFacts.filter(fact =>
    fact.type === 'promise' && fact.predicate !== '已回收伏笔'
  );
  const timeline = chapterNumber
    ? activeFacts.filter(fact =>
      ['chapter', 'state', 'resource', 'event'].includes(fact.type) &&
      fact.effectiveOrder >= Math.max(0, chapterNumber - 3) &&
      fact.effectiveOrder <= chapterNumber
    )
    : [];
  const selectedIds = new Set([...mandatory, ...unresolvedPromises, ...timeline].map(fact => fact.id));
  const relevant = activeFacts
    .filter(fact => !selectedIds.has(fact.id))
    .map(fact => {
      const haystack = `${fact.subject} ${fact.predicate} ${fact.object} ${fact.tags.join(' ')}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 4 : 0), 0)
        + (fact.type === 'character' ? 2 : 0)
        + (fact.type === 'relationship' ? 1 : 0);
      return { fact, score };
    })
    .filter(item => item.score > 0 || (!terms.length && ['character', 'event'].includes(item.fact.type)))
    .sort((left, right) => right.score - left.score || right.fact.effectiveOrder - left.fact.effectiveOrder)
    .slice(0, options.limit || 24)
    .map(item => item.fact);

  return {
    revision: memory.revision,
    mandatory,
    relevant,
    timeline,
    unresolvedPromises: unresolvedPromises.slice(0, 20),
    observations: memory.observations
      .filter(item => item.status !== 'rejected' && item.status !== 'quarantined')
      .slice(-8)
  };
}

export function formatNarrativeMemoryContext(result) {
  if (!result) return '暂无叙事记忆';
  const renderFacts = facts => facts.map(fact =>
    `[${fact.id}|${fact.sourceRef}] ${fact.subject} ${fact.predicate}：${fact.object}`
  ).join('\n') || '无';
  return `【全局叙事记忆 revision=${result.revision}】
最高优先级事实：
${renderFacts(result.mandatory)}

任务相关事实：
${renderFacts(result.relevant)}

当前时间邻域：
${renderFacts(result.timeline)}

未回收伏笔：
${renderFacts(result.unresolvedPromises)}

使用规则：只能把 status=active 的正式事实作为故事事实；过程记录不能覆盖正式事实；如发生冲突，必须引用事实 ID 和来源并停止擅自改写。`;
}

export function auditNarrativeMemory(novel) {
  const memory = syncNarrativeMemory(novel);
  const issues = [];
  const activeFacts = memory.facts.filter(fact => fact.status === 'active');
  const activeKeys = new Set();
  activeFacts.forEach(fact => {
    if (activeKeys.has(fact.key)) issues.push(`存在多个有效版本：${fact.key}`);
    activeKeys.add(fact.key);
  });
  const names = new Set(normalizeList(novel?.characterBible).map(character => character?.name).filter(Boolean));
  normalizeList(novel?.characterRelations).forEach(relation => {
    if (!names.has(relation.source)) issues.push(`关系引用未知人物：${relation.source}`);
    if (!names.has(relation.target)) issues.push(`关系引用未知人物：${relation.target}`);
  });
  normalizeList(novel?.plotBlueprint?.chapters).forEach(chapter => {
    normalizeList(chapter.participants).forEach(name => {
      if (!names.has(name)) issues.push(`第${chapter.chapterNumber}章出现未登记人物：${name}`);
    });
  });
  return [...new Set(issues)];
}
