import {
  COMPLETE_CHARACTER_FIELDS,
  getCharacterProfileIssues,
  validateCharacterSystemIntegrity
} from './novel-integrity.js';

export const CHARACTER_ACCEPTANCE_SCORE = 85;

export const CHARACTER_MUTABLE_FIELDS = new Set([
  ...COMPLETE_CHARACTER_FIELDS.filter(field => field !== 'name'),
  'hiddenIdentities',
  'relationships',
  'roleTier'
]);

const DEATH_PATTERN = /(死亡|身死|被杀|被处死|被抹杀|陨落|牺牲|殒命|伏诛|不治身亡)/;
const SURVIVAL_PATTERN = /(存活|幸存|活着|生还|退隐|归隐|继续生活|重获新生)/;
const GENERIC_AGENCY_PATTERN = /(推动剧情|根据新信息独立决策|通过行动影响|随剧情发展|承担选择造成的后果)/;
const HARD_INTEGRITY_PATTERN = /(事实契约|上游事实冲突|未知人物|未知事件|事件锚点不存在|人物事件引用不存在|命运冲突|死亡事件后|阵营变化缺少事件依据|人物重名|占位|姓名为空|缺少完整档案字段|兜底模板|自动填充字段|内嵌关系缺字段|引用库外人物|形成自环|关系\d+缺少证据引用)/;

function text(value) {
  if (Array.isArray(value)) return value.map(text).join('\n');
  if (value && typeof value === 'object') return Object.values(value).map(text).join('\n');
  return String(value || '').trim();
}

function uniqueStrings(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(item => String(item || '').trim()).filter(Boolean))];
}

function stableHash(value) {
  const source = typeof value === 'string' ? value : JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeFate(rawFate, fallbackText = '') {
  const source = rawFate && typeof rawFate === 'object' ? rawFate : {};
  const combined = `${text(source)} ${fallbackText}`;
  let status = String(source.status || '').trim().toLowerCase();
  if (!['alive', 'dead', 'unknown'].includes(status)) {
    status = DEATH_PATTERN.test(combined)
      ? 'dead'
      : SURVIVAL_PATTERN.test(combined)
        ? 'alive'
        : 'unknown';
  }
  return {
    status,
    eventId: String(source.eventId || '').trim(),
    description: String(source.description || fallbackText || '').trim()
  };
}

function eventText(event) {
  return text({
    title: event?.title,
    trigger: event?.trigger,
    protagonistGoal: event?.protagonistGoal,
    protagonistAction: event?.protagonistAction,
    oppositionActor: event?.oppositionActor,
    oppositionMotive: event?.oppositionMotive,
    conflict: event?.conflict,
    cost: event?.cost,
    gain: event?.gain,
    stateDelta: event?.stateDelta,
    characterArcDelta: event?.characterArcDelta
  });
}

function factionIdForName(factions, name) {
  const target = String(name || '').trim();
  if (!target) return '';
  const match = factions.find(faction =>
    faction.name === target || uniqueStrings(faction.aliases).includes(target)
  );
  return String(match?.id || match?.name || target).trim();
}

export function buildCharacterCanonContracts(novel = {}, adjudication = {}) {
  const events = Array.isArray(novel.eventCards) ? novel.eventCards : [];
  const eventIds = new Set(events.map(event => String(event?.id || '').trim()).filter(Boolean));
  const factionSources = [
    ...(Array.isArray(adjudication.canonicalFactions) ? adjudication.canonicalFactions : []),
    ...(Array.isArray(novel.factionPlans) ? novel.factionPlans : [])
  ];
  const factions = factionSources
    .map((faction, index) => ({
      id: String(faction?.id || `faction-${index + 1}`).trim(),
      name: String(faction?.name || '').trim(),
      aliases: uniqueStrings(faction?.aliases)
    }))
    .filter(faction => faction.name)
    .filter((faction, index, items) => items.findIndex(item => item.name === faction.name) === index);
  const sourceCharacters = Array.isArray(adjudication.canonicalCharacters)
    ? adjudication.canonicalCharacters
    : [];
  const contracts = sourceCharacters.map(character => {
    const name = String(character?.name || '').trim();
    const inferredEventAnchors = events
      .filter(event => eventText(event).includes(name))
      .map(event => String(event.id || '').trim())
      .filter(Boolean);
    const eventAnchors = uniqueStrings([
      ...(Array.isArray(character?.eventAnchors) ? character.eventAnchors : []),
      ...inferredEventAnchors
    ]).filter(id => eventIds.has(id));
    const faction = String(character?.faction || '').trim();
    return {
      name,
      publicIdentity: String(character?.publicIdentity || character?.role || '').trim(),
      hiddenIdentity: String(
        character?.hiddenIdentity ||
        (Array.isArray(character?.hiddenIdentities) ? character.hiddenIdentities[0] : '') ||
        ''
      ).trim(),
      faction,
      factionId: String(character?.factionId || factionIdForName(factions, faction)).trim(),
      goals: uniqueStrings(character?.goals || (character?.goal ? [character.goal] : [])),
      fate: normalizeFate(character?.fate, character?.fateDescription || ''),
      eventAnchors,
      forbiddenClaims: uniqueStrings(character?.forbiddenClaims),
      sources: uniqueStrings(character?.sources?.length ? character.sources : ['character-adjudication']),
      immutableFields: uniqueStrings(character?.immutableFields?.length
        ? character.immutableFields
        : ['name', 'publicIdentity', 'hiddenIdentity', 'faction', 'fate'])
    };
  }).filter(contract => contract.name);
  return {
    version: 1,
    sourceSignature: String(novel?.storyConstitution?.sourceSignature || novel?.derivedSourceSignature || '').trim(),
    precedence: [
      'user-confirmed-facts',
      'character-canon',
      'approved-event-cards',
      'master-outline',
      'faction-plans',
      'agent-inference'
    ],
    factions,
    contracts,
    upstreamConflicts: uniqueStrings(adjudication.unresolvedContradictions),
    createdAt: new Date().toISOString()
  };
}

export function extendCharacterCanonContracts(canon = {}, roster = [], novel = {}) {
  const next = structuredClone(canon || {});
  const byName = new Map((next.contracts || []).map(contract => [contract.name, contract]));
  const events = Array.isArray(novel.eventCards) ? novel.eventCards : [];
  roster.forEach(entry => {
    const name = String(entry?.name || '').trim();
    if (!name || byName.has(name)) return;
    const eventAnchors = events
      .filter(event => eventText(event).includes(name))
      .map(event => String(event.id || '').trim())
      .filter(Boolean);
    byName.set(name, {
      name,
      publicIdentity: String(entry?.identity || '').trim(),
      hiddenIdentity: '',
      faction: String(entry?.faction || '').trim(),
      factionId: factionIdForName(next.factions || [], entry?.faction),
      goals: [],
      fate: normalizeFate(null, ''),
      eventAnchors,
      forbiddenClaims: [],
      sources: ['approved-character-roster'],
      immutableFields: ['name', 'publicIdentity', 'faction']
    });
  });
  next.contracts = [...byName.values()];
  next.updatedAt = new Date().toISOString();
  return next;
}

export function getCharacterCanonUpstreamIssues(canon = {}, novel = {}) {
  const issues = [];
  const eventIds = new Set((novel.eventCards || []).map(event => String(event?.id || '').trim()).filter(Boolean));
  const factionIds = new Set((canon.factions || []).flatMap(faction => [
    String(faction?.id || '').trim(),
    String(faction?.name || '').trim()
  ]).filter(Boolean));
  const seenNames = new Set();
  (canon.contracts || []).forEach(contract => {
    if (seenNames.has(contract.name)) issues.push(`人物事实契约重名：${contract.name}`);
    seenNames.add(contract.name);
    if (!contract.publicIdentity) issues.push(`人物事实契约缺少公开身份：${contract.name}`);
    if (contract.factionId && factionIds.size && !factionIds.has(contract.factionId)) {
      issues.push(`人物事实契约引用未知势力：${contract.name} → ${contract.factionId}`);
    }
    contract.eventAnchors.forEach(eventId => {
      if (!eventIds.has(eventId)) issues.push(`人物事实契约引用未知事件：${contract.name} → ${eventId}`);
    });
    if (contract.fate?.eventId && !eventIds.has(contract.fate.eventId)) {
      issues.push(`人物命运引用未知事件：${contract.name} → ${contract.fate.eventId}`);
    }
    if (contract.fate?.status === 'dead' && contract.fate?.eventId) {
      const event = (novel.eventCards || []).find(item => item.id === contract.fate.eventId);
      if (event && !DEATH_PATTERN.test(eventText(event))) {
        issues.push(`人物死亡契约与事件内容不一致：${contract.name} → ${contract.fate.eventId}`);
      }
    }
  });
  (canon.upstreamConflicts || []).forEach(problem => issues.push(`上游事实冲突：${problem}`));
  return [...new Set(issues)];
}

function tokenizeProfile(character) {
  return new Set(text({
    identity: character?.identity,
    publicIdentity: character?.publicIdentity,
    faction: character?.faction,
    personality: character?.personality,
    desire: character?.desire,
    goal: character?.goal,
    interests: character?.interests,
    agency: character?.agency,
    lifeHistory: character?.lifeHistory,
    growthHistory: character?.growthHistory,
    arc: character?.arc,
    highlight: character?.highlight,
    fate: character?.fate
  }).split(/[，。；、：:\s/]+/).map(token => token.trim()).filter(token => token.length >= 2));
}

function profileSimilarity(first, second) {
  const a = tokenizeProfile(first);
  const b = tokenizeProfile(second);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  a.forEach(token => {
    if (b.has(token)) intersection += 1;
  });
  return intersection / Math.min(a.size, b.size);
}

function contractIssues(character, contract, novel) {
  if (!contract) return [];
  const issues = [];
  if (contract.publicIdentity && !String(character.publicIdentity || '').includes(contract.publicIdentity)) {
    issues.push(`事实契约冲突：${character.name} 的公开身份应包含“${contract.publicIdentity}”`);
  }
  if (contract.hiddenIdentity) {
    const hiddenText = text(character.hiddenIdentities);
    if (!hiddenText.includes(contract.hiddenIdentity)) {
      issues.push(`事实契约冲突：${character.name} 缺少隐藏身份“${contract.hiddenIdentity}”`);
    }
  }
  if (contract.faction && !String(character.faction || '').includes(contract.faction)) {
    issues.push(`事实契约冲突：${character.name} 的阵营应为“${contract.faction}”`);
  }
  const profileText = text(character);
  contract.forbiddenClaims.forEach(claim => {
    if (claim && profileText.includes(claim)) issues.push(`事实契约冲突：${character.name} 出现禁写事实“${claim}”`);
  });
  if (contract.fate?.status === 'dead' && !DEATH_PATTERN.test(character.fate || '')) {
    issues.push(`命运冲突：${character.name} 应在契约事件中死亡`);
  }
  if (contract.fate?.status === 'alive' && DEATH_PATTERN.test(character.fate || '')) {
    issues.push(`命运冲突：${character.name} 的契约状态为存活`);
  }
  const eventIds = new Set((novel.eventCards || []).map(event => String(event?.id || '').trim()).filter(Boolean));
  contract.eventAnchors.forEach(eventId => {
    if (!eventIds.has(eventId)) issues.push(`事件锚点不存在：${character.name} → ${eventId}`);
  });
  const referencedEventIds = uniqueStrings(
    text({
      plotAnchor: character.plotAnchor,
      highlight: character.highlight,
      fate: character.fate,
      foreshadowLink: character.foreshadowLink
    }).match(/\bevent-\d+\b/g) || []
  );
  referencedEventIds.forEach(eventId => {
    if (!eventIds.has(eventId)) issues.push(`人物事件引用不存在：${character.name} → ${eventId}`);
  });
  if (/[→/]|转投|脱离|叛出|改投/.test(character.faction || '') && referencedEventIds.length === 0) {
    issues.push(`阵营变化缺少事件依据：${character.name}`);
  }
  if (contract.fate?.status === 'dead' && contract.fate?.eventId) {
    const deathEvent = (novel.eventCards || []).find(event => event.id === contract.fate.eventId);
    const deathOrder = Number(deathEvent?.order);
    referencedEventIds.forEach(eventId => {
      const referenced = (novel.eventCards || []).find(event => event.id === eventId);
      if (Number.isFinite(deathOrder) && Number(referenced?.order) > deathOrder) {
        issues.push(`人物在死亡事件后仍参与事件：${character.name} → ${eventId}`);
      }
    });
  }
  return issues;
}

export function validateCharacterSemanticIntegrity({
  characters = [],
  relations = [],
  targetCount = 0,
  canon = {},
  novel = {}
} = {}) {
  const issues = validateCharacterSystemIntegrity(characters, relations, targetCount);
  issues.push(...getCharacterCanonUpstreamIssues(canon, novel));
  const contractByName = new Map((canon.contracts || []).map(contract => [contract.name, contract]));
  const eventIds = new Set((novel.eventCards || []).map(event => String(event?.id || '').trim()).filter(Boolean));
  const allowedGlobalEvidence = new Set(['user-confirmed', 'master-outline', 'synopsis', 'story-constitution']);
  relations.forEach((relation, index) => {
    uniqueStrings(relation?.evidenceRefs).forEach(reference => {
      if (allowedGlobalEvidence.has(reference)) return;
      if (reference.startsWith('event-') && !eventIds.has(reference)) {
        issues.push(`关系${index + 1}引用未知事件：${relation.source} ↔ ${relation.target} → ${reference}`);
      } else if (reference.startsWith('character-canon:')) {
        const name = reference.slice('character-canon:'.length);
        if (!contractByName.has(name)) {
          issues.push(`关系${index + 1}引用未知人物事实契约：${relation.source} ↔ ${relation.target} → ${reference}`);
        }
      } else if (!reference.startsWith('event-') && !reference.startsWith('character-canon:')) {
        issues.push(`关系${index + 1}使用不可核验证据：${relation.source} ↔ ${relation.target} → ${reference}`);
      }
    });
  });
  characters.forEach(character => {
    contractIssues(character, contractByName.get(character?.name), novel).forEach(issue => issues.push(issue));
    if (GENERIC_AGENCY_PATTERN.test(`${character?.agency || ''} ${character?.storyFunction || ''}`)) {
      issues.push(`人物“${character?.name || '未命名'}”缺少可验证的主动决策`);
    }
    if (!/(选择|决定|拒绝|隐瞒|争取|策划|背叛|保护|调查|交换|承担|阻止|公开)/.test(character?.agency || '')) {
      issues.push(`人物“${character?.name || '未命名'}”的主观能动性没有具体行动`);
    }
    getCharacterProfileIssues(character).forEach(issue => {
      const full = `人物“${character?.name || '未命名'}”：${issue}`;
      if (!issues.includes(full)) issues.push(full);
    });
  });
  for (let first = 0; first < characters.length; first += 1) {
    for (let second = first + 1; second < characters.length; second += 1) {
      const similarity = profileSimilarity(characters[first], characters[second]);
      if (similarity >= 0.78) {
        issues.push(`人物档案高度相似：${characters[first].name} ↔ ${characters[second].name}（${Math.round(similarity * 100)}%）`);
      }
    }
  }
  return [...new Set(issues)];
}

export function partitionCharacterIntegrityIssues(issues = []) {
  const hard = [];
  const quality = [];
  [...new Set(issues.filter(Boolean))].forEach(issue => {
    (HARD_INTEGRITY_PATTERN.test(issue) ? hard : quality).push(issue);
  });
  return { hard, quality };
}

export function createCharacterIssueLedger(previousLedger = [], issues = []) {
  const previousById = new Map((previousLedger || []).map(issue => [issue.id, issue]));
  const activeIds = new Set();
  const next = issues.map(issue => {
    const normalized = typeof issue === 'string'
      ? { severity: 'high', category: '确定性校验', problem: issue, characterNames: [] }
      : {
          severity: String(issue?.severity || 'medium').toLowerCase(),
          category: String(issue?.category || '语义审计'),
          problem: String(issue?.problem || '').trim(),
          repair: String(issue?.repair || '').trim(),
          characterNames: uniqueStrings(issue?.characterNames),
          evidence: uniqueStrings(issue?.evidence)
        };
    const id = `character-issue-${stableHash({
      category: normalized.category,
      problem: normalized.problem,
      characterNames: normalized.characterNames
    })}`;
    activeIds.add(id);
    const previous = previousById.get(id);
    return {
      ...normalized,
      id,
      status: 'open',
      recurrenceCount: previous ? Number(previous.recurrenceCount || 0) + 1 : 0,
      introducedByRepair: Boolean(previous?.status === 'closed'),
      beforeValue: previous?.beforeValue || null,
      afterValue: null,
      updatedAt: new Date().toISOString()
    };
  });
  (previousLedger || []).forEach(previous => {
    if (!activeIds.has(previous.id)) {
      next.push({
        ...previous,
        status: 'closed',
        afterValue: previous.afterValue || '校验已通过',
        updatedAt: new Date().toISOString()
      });
    }
  });
  return next;
}

export function evaluateCharacterQualityGate({
  audit = {},
  deterministicIssues = [],
  incompleteCount = 0
} = {}) {
  const hardBlockers = [...new Set(deterministicIssues.filter(Boolean))];
  if (incompleteCount > 0) hardBlockers.push(`仍有 ${incompleteCount} 位 incomplete 人物`);
  const issues = Array.isArray(audit.issues) ? audit.issues : [];
  const highIssues = issues.filter(issue =>
    String(issue?.severity || '').toLowerCase() === 'high' ||
    String(issue?.severity || '').toLowerCase() === 'critical'
  );
  const score = Math.max(0, Math.min(100, Number(audit.score) || 0));
  if (hardBlockers.length) {
    return {
      level: 'blocked',
      canCommit: false,
      requiresHumanReview: false,
      score,
      blockers: [...new Set(hardBlockers)],
      advisories: highIssues
    };
  }
  if (score < CHARACTER_ACCEPTANCE_SCORE || highIssues.length) {
    return {
      level: 'review',
      canCommit: true,
      requiresHumanReview: true,
      score,
      blockers: [],
      advisories: highIssues
    };
  }
  return {
    level: 'passed',
    canCommit: true,
    requiresHumanReview: false,
    score,
    blockers: [],
    advisories: []
  };
}

export function getCharacterAcceptanceBlockers(audit = {}, deterministicIssues = [], incompleteCount = 0) {
  return evaluateCharacterQualityGate({
    audit,
    deterministicIssues,
    incompleteCount
  }).blockers;
}

export function applyCharacterPatchTransaction({
  characters = [],
  patches = [],
  canon = {},
  novel = {},
  relations = [],
  targetCount = 0
} = {}) {
  const original = structuredClone(characters);
  const byName = new Map(original.map(character => [character.name, structuredClone(character)]));
  const contractByName = new Map((canon.contracts || []).map(contract => [contract.name, contract]));
  const applied = [];
  const rejected = [];
  (patches || []).forEach(patch => {
    const character = byName.get(String(patch?.characterName || '').trim());
    if (!character) {
      rejected.push(`${patch?.issueId || '未知问题'}：人物不存在`);
      return;
    }
    const draft = structuredClone(character);
    const contract = contractByName.get(character.name);
    const immutableFields = new Set(contract?.immutableFields || []);
    for (const change of Array.isArray(patch?.changes) ? patch.changes : []) {
      const field = String(change?.field || '').trim();
      if (!CHARACTER_MUTABLE_FIELDS.has(field) || field === 'name') {
        rejected.push(`${patch?.issueId || '未知问题'}：字段 ${field || '空'} 不允许修改`);
        return;
      }
      if (immutableFields.has(field)) {
        const expected = field === 'hiddenIdentity'
          ? contract?.hiddenIdentity
          : field === 'fate'
            ? contract?.fate?.description
            : contract?.[field];
        if (expected && !text(change.newValue).includes(text(expected))) {
          rejected.push(`${patch?.issueId || '未知问题'}：字段 ${field} 受事实契约保护`);
          return;
        }
      }
      if (change.oldHash && stableHash(draft[field]) !== change.oldHash) {
        rejected.push(`${patch?.issueId || '未知问题'}：字段 ${field} 已变化，拒绝覆盖`);
        return;
      }
      draft[field] = structuredClone(change.newValue);
    }
    const localIssues = [
      ...getCharacterProfileIssues(draft),
      ...contractIssues(draft, contract, novel)
    ];
    if (localIssues.length) {
      rejected.push(`${patch?.issueId || '未知问题'}：${localIssues.join('；')}`);
      return;
    }
    byName.set(character.name, draft);
    applied.push(String(patch?.issueId || '').trim());
  });
  const nextCharacters = original.map(character => byName.get(character.name));
  const beforeIssues = validateCharacterSemanticIntegrity({ characters, relations, targetCount, canon, novel });
  const afterIssues = validateCharacterSemanticIntegrity({ characters: nextCharacters, relations, targetCount, canon, novel });
  if (afterIssues.length > beforeIssues.length || rejected.length) {
    return {
      committed: false,
      characters: original,
      applied: [],
      rejected,
      beforeIssues,
      afterIssues
    };
  }
  return {
    committed: true,
    characters: nextCharacters,
    applied,
    rejected: [],
    beforeIssues,
    afterIssues
  };
}

export function getCharacterFieldHash(value) {
  return stableHash(value);
}
