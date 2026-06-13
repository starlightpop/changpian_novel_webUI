import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendAgentModelCall,
  createAgentCheckpoint,
  createAgentContextFingerprint,
  createAgentPlan,
  createAgentRunRecord,
  estimateTokenCount,
  recordVerifiedExperience,
  replanAgentPlan,
  selectAgentModelRoute,
  updateAgentPlan,
  validateWorkerEnvelope
} from '../src/domain/agent-orchestration.js';

test('Agent 上下文指纹稳定且会随事实源变化', () => {
  const novel = {
    id: 'novel-1',
    background: '女频，架空古代',
    synopsis: '沈月追查家族旧案。',
    masterOutline: { beginning: '旧案重启' },
    characterBible: [{ name: '沈月' }],
    characterRelations: [],
    eventCards: [{ id: 'event-1' }]
  };
  const first = createAgentContextFingerprint(novel, '生成总纲');
  const second = createAgentContextFingerprint(structuredClone(novel), '生成总纲');
  assert.equal(first, second);

  novel.characterBible.push({ name: '顾临' });
  assert.notEqual(createAgentContextFingerprint(novel, '生成总纲'), first);
});

test('人物核心事实、关系证据和事件内容变化都会使上下文指纹失效', () => {
  const novel = {
    id: 'novel-1',
    background: '架空古代',
    synopsis: '沈月追查旧案。',
    characterBible: [{ name: '沈月', identity: '仵作', goal: '查清旧案' }],
    characterRelations: [{ source: '沈月', target: '顾临', type: '合作', evidence: ['event-1'] }],
    eventCards: [{ id: 'event-1', title: '验尸', stateDelta: '确认死因' }],
    promiseLedger: [{ id: 'promise-1', plantEventId: 'event-1', payoffEventId: 'event-3' }]
  };
  const base = createAgentContextFingerprint(novel, '构建人物');

  const changedGoal = structuredClone(novel);
  changedGoal.characterBible[0].goal = '保护家人';
  assert.notEqual(createAgentContextFingerprint(changedGoal, '构建人物'), base);

  const changedEvidence = structuredClone(novel);
  changedEvidence.characterRelations[0].evidence = ['event-2'];
  assert.notEqual(createAgentContextFingerprint(changedEvidence, '构建人物'), base);

  const changedEvent = structuredClone(novel);
  changedEvent.eventCards[0].stateDelta = '误判死因';
  assert.notEqual(createAgentContextFingerprint(changedEvent, '构建人物'), base);
});

test('Worker 信封拒绝无证据结论和非法置信度', () => {
  const errors = validateWorkerEnvelope({
    worker: '人物驱动 Worker',
    summary: '主角应主动调查',
    claims: [{
      conclusion: '主角夜探账房',
      evidence: [],
      confidence: 2
    }],
    risks: [],
    dependencies: []
  }, '人物驱动 Worker');
  assert.ok(errors.some(error => error.includes('evidence')));
  assert.ok(errors.some(error => error.includes('confidence')));

  assert.deepEqual(validateWorkerEnvelope({
    worker: '人物驱动 Worker',
    summary: '主角应主动调查',
    claims: [{
      conclusion: '主角依据旧账主动夜探账房',
      evidence: ['简介明确主角追查家族旧案'],
      confidence: 0.9
    }],
    risks: ['可能提前暴露身份'],
    dependencies: ['世界观 Worker 确认账房守卫规则']
  }, '人物驱动 Worker'), []);
});

test('Agent 运行记录保存模型路由和上下文版本', () => {
  const record = createAgentRunRecord({
    taskType: 'outline',
    task: '生成总纲',
    novel: { id: 'novel-1', background: '男频，武侠', synopsis: '' },
    activeModel: 'worker-model',
    primaryModel: 'primary-model'
  });
  assert.equal(record.status, 'running');
  assert.equal(record.activeModel, 'worker-model');
  assert.equal(record.primaryModel, 'primary-model');
  assert.match(record.contextFingerprint, /^agent-context-/);
});

test('Agent 计划按依赖推进并根据错误类型重规划', () => {
  let plan = createAgentPlan('character');
  assert.equal(plan.find(step => step.id === 'context').status, 'ready');
  plan = updateAgentPlan(plan, 'context', 'running');
  plan = updateAgentPlan(plan, 'context', 'completed');
  assert.equal(plan.find(step => step.id === 'roster').status, 'ready');

  const transient = replanAgentPlan(plan, 'roster', 'HTTP 429 限流');
  assert.equal(transient.action, 'retry');
  assert.equal(transient.plan.find(step => step.id === 'roster').status, 'ready');

  const contract = replanAgentPlan(plan, 'roster', 'JSON schema 字段缺失');
  assert.equal(contract.action, 'repair');

  const semantic = replanAgentPlan(plan, 'roster', '人物动机与总纲根本冲突');
  assert.equal(semantic.action, 'escalate');
  assert.equal(semantic.plan.find(step => step.id === 'roster').status, 'blocked');
});

test('模型路由区分主控和工作模型并声明降级目标', () => {
  const activeSlot = { id: 'worker', apiModel: 'fast-model' };
  const primarySlot = { id: 'primary', apiModel: 'reasoning-model' };
  const worker = selectAgentModelRoute({ jsonMode: false, activeSlot, primarySlot });
  assert.equal(worker.role, 'worker');
  assert.equal(worker.model, 'fast-model');

  const primary = selectAgentModelRoute({ jsonMode: true, activeSlot, primarySlot });
  assert.equal(primary.role, 'primary');
  assert.equal(primary.model, 'reasoning-model');
  assert.equal(primary.fallbackSlotId, 'worker');
});

test('运行记录保存模型遥测、检查点和受控经验候选', () => {
  const run = createAgentRunRecord({
    taskType: 'plot',
    task: '生成细纲',
    novel: { id: 'novel-1' },
    activeModel: 'fast-model',
    primaryModel: 'reasoning-model'
  });
  appendAgentModelCall(run, {
    role: 'worker',
    model: 'fast-model',
    success: true,
    durationMs: 120,
    inputTokens: 30,
    outputTokens: 20
  });
  createAgentCheckpoint(run, { stage: 'chapters', summary: '完成前20章' });
  assert.equal(run.modelCalls.length, 1);
  assert.equal(run.checkpoints[0].stage, 'chapters');
  assert.ok(estimateTokenCount('一段中文提示') > 0);

  assert.deepEqual(recordVerifiedExperience([], {
    trigger: '语义建议',
    resolution: '直接采用',
    deterministicVerified: false
  }), []);
  const experiences = recordVerifiedExperience([], {
    trigger: '幽灵关系',
    resolution: '删除无效边并重跑关系校验',
    evidence: ['ghostRelations=0'],
    deterministicVerified: true
  });
  assert.equal(experiences.length, 1);
  assert.equal(experiences[0].status, 'candidate');
});
