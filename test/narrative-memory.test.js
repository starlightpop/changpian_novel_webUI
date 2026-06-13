import test from 'node:test';
import assert from 'node:assert/strict';

import {
  auditNarrativeMemory,
  formatNarrativeMemoryContext,
  recordNarrativeObservation,
  retrieveNarrativeMemory,
  syncNarrativeMemory
} from '../src/domain/narrative-memory.js';

function createNovel() {
  return {
    id: 'novel-memory-1',
    storyConstitution: {
      audience: '男频',
      immutableBackground: '男频，架空古代，权谋',
      hardConstraints: ['保持架空古代世界'],
      prohibitedMutations: ['禁止改变时代']
    },
    characterBible: [{
      name: '沈砚',
      identity: '寒门书吏',
      faction: '州衙',
      personality: '谨慎而固执',
      lifeHistory: '幼年因旧案失去父亲。',
      growthHistory: '从独自追查到承担公共责任。',
      arc: '由复仇者成长为制度改革者。',
      highlight: '公开官仓账册。',
      fate: '洗清旧案后留任地方。',
      desire: '查清父亲旧案',
      goal: '找到被藏匿的官仓账册',
      interests: '家人安全与自身清白',
      agency: '主动潜入账房取证',
      ability: '熟悉账目',
      weakness: '不信任同伴'
    }],
    characterRelations: [],
    eventCards: [{
      id: 'event-1',
      order: 1,
      title: '账册失踪',
      protagonistGoal: '找到原始账册',
      protagonistAction: '夜探旧仓',
      stateDelta: '确认州衙内有人灭证'
    }],
    stateLedger: [{
      eventId: 'event-1',
      protagonistState: '掌握半页账册',
      relationshipState: '尚无盟友',
      worldState: '州衙开始灭证',
      readerState: '怀疑主簿'
    }],
    promiseLedger: [{
      id: 'promise-1',
      promiseType: '旧案伏笔',
      seedEventId: 'event-1',
      payoffEventId: 'event-5',
      status: 'seeded',
      readerQuestion: '谁改写了账册？'
    }],
    plotBlueprint: {
      chapters: [{
        chapterNumber: 1,
        title: '夜探旧仓',
        location: '州衙旧仓',
        viewpoint: '沈砚',
        participants: ['沈砚'],
        newElements: [{
          type: '证物',
          name: '半页官仓账册',
          origin: '旧仓暗格',
          purpose: '证明亏空'
        }]
      }]
    },
    factionPlans: []
  };
}

test('正式事实变化会保留旧版本并只激活新版本', () => {
  const novel = createNovel();
  const first = syncNarrativeMemory(novel, {
    now: '2026-01-01T00:00:00.000Z',
    reason: '初次提交'
  });
  const firstCharacterFact = first.facts.find(fact => fact.key === 'character:沈砚:profile');
  assert.equal(firstCharacterFact.status, 'active');

  novel.characterBible[0].goal = '公开原始账册并保护证人';
  const second = syncNarrativeMemory(novel, {
    now: '2026-01-02T00:00:00.000Z',
    reason: '人物目标经审核修改'
  });
  const versions = second.facts.filter(fact => fact.key === 'character:沈砚:profile');
  assert.equal(versions.length, 2);
  assert.equal(versions.filter(fact => fact.status === 'active').length, 1);
  assert.equal(versions.find(fact => fact.status === 'superseded').invalidatedReason, '人物目标经审核修改');
});

test('渐进式检索强制返回作品宪法、相关人物、时间邻域和未回收伏笔', () => {
  const novel = createNovel();
  const result = retrieveNarrativeMemory(novel, '生成第1章，沈砚在旧仓寻找账册');
  assert.ok(result.mandatory.some(fact => fact.type === 'constitution'));
  assert.ok(result.relevant.some(fact => fact.type === 'character' && fact.subject === '沈砚'));
  assert.ok(result.timeline.some(fact => fact.type === 'chapter'));
  assert.ok(result.unresolvedPromises.some(fact => fact.subject === 'promise-1'));
  const formatted = formatNarrativeMemoryContext(result);
  assert.match(formatted, /只能把 status=active 的正式事实作为故事事实/);
  assert.match(formatted, /memory-fact-/);
});

test('人物事实契约与群像结构进入最高优先级全局记忆', () => {
  const novel = createNovel();
  novel.characterCanon = {
    contracts: [{
      name: '沈砚',
      publicIdentity: '寒门书吏',
      faction: '州衙',
      eventAnchors: ['event-1']
    }]
  };
  novel.plotBlueprint.architecture = {
    narrativeThreads: [{
      id: 'thread-1',
      driverCharacters: ['沈砚'],
      independentGoal: '查清旧案'
    }]
  };
  novel.masterOutline = { beginning: '旧案重启' };
  const result = retrieveNarrativeMemory(novel, '继续设计沈砚人物线');
  assert.ok(result.mandatory.some(fact => fact.type === 'character-canon'));
  assert.ok(result.mandatory.some(fact => fact.type === 'master-outline'));
  assert.ok(result.mandatory.some(fact => fact.type === 'ensemble-architecture'));
});

test('失败和退回记录不会作为正式上下文注入', () => {
  const novel = createNovel();
  recordNarrativeObservation(novel, {
    type: 'plot-draft',
    status: 'rejected',
    summary: '错误草案',
    details: '让未登记人物突然出现'
  });
  recordNarrativeObservation(novel, {
    type: 'plot',
    status: 'accepted',
    summary: '正式审计通过',
    details: '人物和道具来源完整'
  });
  const result = retrieveNarrativeMemory(novel, '继续剧情');
  assert.ok(result.observations.some(item => item.summary === '正式审计通过'));
  assert.ok(!result.observations.some(item => item.summary === '错误草案'));
});

test('记忆审计发现关系与章节引用的未登记人物', () => {
  const novel = createNovel();
  novel.characterRelations.push({
    source: '沈砚',
    target: '神秘人',
    type: '敌对'
  });
  novel.plotBlueprint.chapters[0].participants.push('路人甲');
  const issues = auditNarrativeMemory(novel);
  assert.ok(issues.some(issue => issue.includes('神秘人')));
  assert.ok(issues.some(issue => issue.includes('路人甲')));
});

test('不同小说的正式事实严格隔离', () => {
  const firstNovel = createNovel();
  const secondNovel = createNovel();
  secondNovel.id = 'novel-memory-2';
  secondNovel.characterBible[0].name = '顾行舟';
  secondNovel.plotBlueprint.chapters[0].viewpoint = '顾行舟';
  secondNovel.plotBlueprint.chapters[0].participants = ['顾行舟'];

  const first = retrieveNarrativeMemory(firstNovel, '沈砚');
  const second = retrieveNarrativeMemory(secondNovel, '顾行舟');
  assert.ok(first.relevant.some(fact => fact.subject === '沈砚'));
  assert.ok(!first.relevant.some(fact => fact.subject === '顾行舟'));
  assert.ok(second.relevant.some(fact => fact.subject === '顾行舟'));
  assert.ok(!second.relevant.some(fact => fact.subject === '沈砚'));
});
