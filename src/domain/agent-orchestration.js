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

export function createAgentContextFingerprint(novel, task = '') {
  const canonical = {
    novelId: novel?.id || '',
    task: String(task || '').trim(),
    background: novel?.background || '',
    synopsis: novel?.synopsis || '',
    storyConstitution: novel?.storyConstitution || null,
    masterOutline: novel?.masterOutline || null,
    narrativeKernel: novel?.narrativeKernel || null,
    characterCanon: novel?.characterCanon || null,
    characters: (novel?.characterBible || []).map(character => ({
      name: character?.name || '',
      identity: character?.identity || '',
      publicIdentity: character?.publicIdentity || '',
      hiddenIdentity: character?.hiddenIdentity || '',
      faction: character?.faction || '',
      desire: character?.desire || '',
      goal: character?.goal || '',
      interests: character?.interests || '',
      agency: character?.agency || '',
      fate: character?.fate || '',
      eventAnchors: character?.eventAnchors || []
    })),
    relations: novel?.characterRelations || [],
    events: novel?.eventCards || [],
    promises: novel?.promiseLedger || [],
    plot: novel?.plotBlueprint ? {
      chapterCount: novel.plotBlueprint.chapterCount || 0,
      architecture: novel.plotBlueprint.architecture || null,
      chapters: novel.plotBlueprint.chapters || [],
      updatedAt: novel.plotBlueprint.updatedAt || ''
    } : null,
    sourceSignature: novel?.derivedSourceSignature || novel?.storyConstitution?.sourceSignature || ''
  };
  return `agent-context-${hashText(stableStringify(canonical))}`;
}

export function validateWorkerEnvelope(envelope, expectedWorker = '') {
  const errors = [];
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return ['worker 输出必须是 JSON 对象'];
  }
  if (expectedWorker && String(envelope.worker || '').trim() !== expectedWorker) {
    errors.push(`worker 必须为 ${expectedWorker}`);
  }
  if (!String(envelope.summary || '').trim()) errors.push('缺少 summary');
  if (!Array.isArray(envelope.claims) || !envelope.claims.length) {
    errors.push('claims 必须是非空数组');
  } else {
    envelope.claims.forEach((claim, index) => {
      if (!String(claim?.conclusion || '').trim()) errors.push(`claim ${index + 1} 缺少 conclusion`);
      if (!Array.isArray(claim?.evidence) || !claim.evidence.some(item => String(item || '').trim())) {
        errors.push(`claim ${index + 1} 缺少 evidence`);
      }
      const confidence = Number(claim?.confidence);
      if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
        errors.push(`claim ${index + 1} 的 confidence 必须在 0-1`);
      }
    });
  }
  if (!Array.isArray(envelope.risks)) errors.push('risks 必须是数组');
  if (!Array.isArray(envelope.dependencies)) errors.push('dependencies 必须是数组');
  return errors;
}

export function createAgentRunRecord({ taskType, task, novel, activeModel, primaryModel }) {
  const now = new Date().toISOString();
  return {
    id: `agent-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    taskType,
    task: String(task || '').trim(),
    novelId: novel?.id || '',
    contextFingerprint: createAgentContextFingerprint(novel, task),
    activeModel: activeModel || '',
    primaryModel: primaryModel || '',
    status: 'running',
    stage: 'initializing',
    progress: 0,
    workers: [],
    qualityGates: [],
    errors: [],
    modelCalls: [],
    checkpoints: [],
    replans: [],
    experienceCandidates: [],
    startedAt: now,
    updatedAt: now
  };
}

const PLAN_TEMPLATES = {
  outline: [
    ['context', '冻结作品宪法与上下文', []],
    ['analysis', '构建叙事蓝图与因果链', ['context']],
    ['integration', '编译总纲与设定资产', ['analysis']],
    ['audit', '执行确定性与语义审计', ['integration']],
    ['review', '提交人工审核', ['audit']]
  ],
  character: [
    ['context', '冻结人物事实契约', []],
    ['roster', '生成具名人物名册', ['context']],
    ['deepening', '分批深化人物档案', ['roster']],
    ['topology', '编译人物关系拓扑', ['deepening']],
    ['audit', '执行人物完整性审计', ['topology']],
    ['review', '提交人工审核', ['audit']]
  ],
  plot: [
    ['context', '冻结人物、总纲与世界状态', []],
    ['architecture', '规划卷级群像结构', ['context']],
    ['chapters', '生成章节细纲', ['architecture']],
    ['validation', '执行因果与来源审计', ['chapters']],
    ['review', '提交人工审核', ['validation']]
  ],
  'final-audit': [
    ['hard-check', '运行跨域确定性校验', []],
    ['cross-audit', '执行全书语义终审', ['hard-check']],
    ['repair', '应用最小字段修复', ['cross-audit']],
    ['final-review', '复验修复结果', ['repair']],
    ['review', '提交人工审核', ['final-review']]
  ]
};

export function createAgentPlan(taskType = 'outline') {
  const template = PLAN_TEMPLATES[taskType] || PLAN_TEMPLATES.outline;
  return template.map(([id, title, dependsOn], index) => ({
    id,
    title,
    dependsOn,
    order: index + 1,
    status: index === 0 ? 'ready' : 'pending',
    attempts: 0,
    lastError: ''
  }));
}

export function updateAgentPlan(plan = [], stepId, status, error = '') {
  const next = structuredClone(plan);
  const step = next.find(item => item.id === stepId);
  if (!step) return next;
  step.status = status;
  step.lastError = String(error || '');
  if (status === 'running') step.attempts = Number(step.attempts || 0) + 1;
  if (status === 'completed') {
    next.forEach(item => {
      if (
        item.status === 'pending' &&
        item.dependsOn.every(id => next.find(candidate => candidate.id === id)?.status === 'completed')
      ) {
        item.status = 'ready';
      }
    });
  }
  return next;
}

export function replanAgentPlan(plan = [], failedStepId, error = '') {
  const next = structuredClone(plan);
  const failed = next.find(step => step.id === failedStepId);
  if (!failed) return { plan: next, action: 'abort', reason: 'failed-step-not-found' };
  const message = String(error || '').toLowerCase();
  const transient = /(timeout|network|cors|429|408|5\d\d|连接|限流|超时)/.test(message);
  const contractFailure = /(json|schema|契约|校验|字段|引用|格式)/.test(message);
  const action = transient
    ? 'retry'
    : contractFailure
      ? 'repair'
      : 'escalate';
  failed.status = action === 'escalate' ? 'blocked' : 'ready';
  failed.lastError = String(error || '');
  next.forEach(step => {
    if (step.dependsOn.includes(failedStepId) && step.status !== 'completed') step.status = 'pending';
  });
  return { plan: next, action, reason: transient ? 'transient' : contractFailure ? 'contract' : 'semantic' };
}

export function selectAgentModelRoute({
  role = 'auto',
  jsonMode = false,
  activeSlot = null,
  primarySlot = null
} = {}) {
  const resolvedRole = role === 'auto' ? (jsonMode ? 'primary' : 'worker') : role;
  const selected = resolvedRole === 'primary' ? (primarySlot || activeSlot) : (activeSlot || primarySlot);
  return {
    role: resolvedRole,
    slotId: selected?.id || '',
    model: selected?.apiModel || '',
    config: selected || null,
    fallbackSlotId: resolvedRole === 'primary' && activeSlot?.id !== selected?.id ? activeSlot?.id || '' : ''
  };
}

export function estimateTokenCount(...values) {
  const characters = values.reduce((total, value) => total + String(value || '').length, 0);
  return Math.max(1, Math.ceil(characters / 3));
}

export function appendAgentModelCall(run, call, limit = 160) {
  if (!run) return run;
  const next = {
    ...call,
    id: call.id || `model-call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    recordedAt: call.recordedAt || new Date().toISOString()
  };
  run.modelCalls = [...(run.modelCalls || []), next].slice(-limit);
  run.updatedAt = new Date().toISOString();
  return run;
}

export function createAgentCheckpoint(run, { stage, summary = '', payloadRef = '', contextFingerprint = '' }) {
  const checkpoint = {
    id: `checkpoint-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    stage,
    summary,
    payloadRef,
    contextFingerprint: contextFingerprint || run?.contextFingerprint || '',
    createdAt: new Date().toISOString()
  };
  if (run) {
    run.checkpoints = [...(run.checkpoints || []), checkpoint].slice(-40);
    run.stage = stage;
    run.updatedAt = checkpoint.createdAt;
  }
  return checkpoint;
}

export function recordVerifiedExperience(store = [], candidate = {}) {
  if (!candidate.deterministicVerified || !candidate.trigger || !candidate.resolution) return store;
  const key = hashText(stableStringify({
    trigger: candidate.trigger,
    resolution: candidate.resolution
  }));
  const existing = store.find(item => item.key === key);
  if (existing) {
    existing.verifiedSuccessCount = Number(existing.verifiedSuccessCount || 0) + 1;
    existing.lastVerifiedAt = new Date().toISOString();
    return store;
  }
  return [...store, {
    key,
    trigger: candidate.trigger,
    resolution: candidate.resolution,
    evidence: Array.isArray(candidate.evidence) ? candidate.evidence : [],
    verifiedSuccessCount: 1,
    status: 'candidate',
    createdAt: new Date().toISOString()
  }].slice(-100);
}
