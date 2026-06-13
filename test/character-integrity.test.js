import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyCharacterPatchTransaction,
  buildCharacterCanonContracts,
  createCharacterIssueLedger,
  evaluateCharacterQualityGate,
  getCharacterAcceptanceBlockers,
  getCharacterFieldHash,
  partitionCharacterIntegrityIssues,
  validateCharacterSemanticIntegrity
} from '../src/domain/character-integrity.js';

function completeCharacter(name = '柳白眉') {
  return {
    name,
    identity: '青云宗宗主',
    publicIdentity: '青云宗宗主',
    hiddenIdentities: ['上古残魂太一的宿主'],
    identityRevealStage: '高潮事件中由证据揭露',
    faction: '青云宗',
    factionScope: '青云宗山门与宗门议事范围',
    storyFunction: '主动推动宗门永生计划并承担失败代价',
    ageAndAppearance: '中年外貌，眉色霜白',
    personality: '克制、傲慢，对宗门秩序近乎偏执',
    desire: '证明自己能够延续宗门',
    goal: '利用宗门资源完成残魂永生计划',
    interests: '宗主权力、宗门资源和个人存续',
    agency: '主动隐瞒残魂身份并策划禁地仪式',
    ability: '宗门调度、阵法知识和政治威望',
    weakness: '无法承认计划会牺牲弟子',
    settingBasis: '依据作品宪法与宗门事件卡',
    plotAnchor: '参与 event-1 与 event-2',
    foreshadowLink: 'event-1 埋设身份，event-2 完成揭露',
    lifeHistory: '继任宗主后长期寻找延续残魂的方法。',
    growthHistory: '从维护宗门转向把宗门当作个人永生工具。',
    arc: '权力扩张使其逐步暴露真实欲望。',
    highlight: '在禁地之战主动启动仪式并迫使各方选择。',
    fate: '在 event-2 的禁地之战中被抹杀。',
    roleTier: '主要人物',
    relationships: [
      { target: '沈砚', type: '死敌', dynamic: '从利用转为公开追杀', conflict: '争夺禁地证据' }
    ],
    profileQuality: 'complete',
    _autoFilledFields: [],
    _invalidRelationshipCount: 0
  };
}

function novelFixture() {
  return {
    storyConstitution: { sourceSignature: 'source-1' },
    eventCards: [
      {
        id: 'event-1',
        title: '身份伏笔',
        protagonistAction: '沈砚调查柳白眉',
        oppositionActor: '柳白眉',
        conflict: '争夺宗门禁卷'
      },
      {
        id: 'event-2',
        title: '禁地之战',
        protagonistAction: '沈砚公开证据',
        oppositionActor: '柳白眉',
        conflict: '柳白眉启动仪式后被天道抹杀'
      }
    ]
  };
}

function canonFixture(novel = novelFixture()) {
  return buildCharacterCanonContracts(novel, {
    canonicalFactions: [{ id: 'faction-qingyun', name: '青云宗', aliases: [] }],
    canonicalCharacters: [{
      name: '柳白眉',
      role: '青云宗宗主',
      publicIdentity: '青云宗宗主',
      hiddenIdentity: '上古残魂太一的宿主',
      faction: '青云宗',
      fate: { status: 'dead', eventId: 'event-2', description: '在禁地之战中被抹杀' },
      eventAnchors: ['event-1', 'event-2'],
      forbiddenClaims: ['失去宗门继承权'],
      sources: ['story-constitution', 'event-2']
    }]
  });
}

test('人物事实契约固定来源优先级并收集事件锚点', () => {
  const novel = novelFixture();
  const canon = canonFixture(novel);
  assert.equal(canon.contracts[0].factionId, 'faction-qingyun');
  assert.deepEqual(canon.contracts[0].eventAnchors, ['event-1', 'event-2']);
  assert.equal(canon.precedence[0], 'user-confirmed-facts');
});

test('确定性语义校验拒绝身份、命运和禁写事实冲突', () => {
  const novel = novelFixture();
  const canon = canonFixture(novel);
  const bad = completeCharacter();
  bad.publicIdentity = '上古残魂宿主';
  bad.lifeHistory = '失去宗门继承权后被逐出核心圈。';
  bad.fate = '战败后继续存活。';
  const partner = completeCharacter('沈砚');
  partner.identity = '地方调查者';
  partner.publicIdentity = '地方调查者';
  partner.hiddenIdentities = [];
  partner.faction = '民间调查组织';
  const issues = validateCharacterSemanticIntegrity({
    characters: [bad, partner],
    relations: [{
      source: '柳白眉',
      target: '沈砚',
      type: '死敌',
      description: '围绕禁地证据持续交锋',
      interestConflict: '一方销毁证据，一方公开证据',
      evidenceRefs: ['event-1']
    }],
    targetCount: 2,
    canon,
    novel
  });
  assert.ok(issues.some(issue => issue.includes('公开身份')));
  assert.ok(issues.some(issue => issue.includes('失去宗门继承权')));
  assert.ok(issues.some(issue => issue.includes('应在契约事件中死亡')));
});

test('字段级补丁通过旧值哈希校验并禁止整对象覆盖', () => {
  const novel = novelFixture();
  const canon = canonFixture(novel);
  const character = completeCharacter();
  const repairedLife = '继任青云宗宗主后，主动利用宗门资源推进残魂永生计划。';
  const result = applyCharacterPatchTransaction({
    characters: [character],
    patches: [{
      issueId: 'character-issue-life',
      characterName: '柳白眉',
      changes: [{
        field: 'lifeHistory',
        oldHash: getCharacterFieldHash(character.lifeHistory),
        newValue: repairedLife,
        evidence: ['event-1']
      }]
    }],
    canon,
    novel,
    relations: [],
    targetCount: 1
  });
  assert.equal(result.committed, true);
  assert.equal(result.characters[0].lifeHistory, repairedLife);
  assert.equal(result.characters[0].goal, character.goal);
});

test('字段哈希过期时事务整体回滚', () => {
  const novel = novelFixture();
  const character = completeCharacter();
  const result = applyCharacterPatchTransaction({
    characters: [character],
    patches: [{
      issueId: 'character-issue-stale',
      characterName: '柳白眉',
      changes: [{
        field: 'lifeHistory',
        oldHash: 'deadbeef',
        newValue: '无证据覆盖',
        evidence: []
      }]
    }],
    canon: canonFixture(novel),
    novel,
    relations: [],
    targetCount: 1
  });
  assert.equal(result.committed, false);
  assert.equal(result.characters[0].lifeHistory, character.lifeHistory);
});

test('问题台账使用稳定ID并记录复发', () => {
  const first = createCharacterIssueLedger([], [{
    severity: 'high',
    category: '身份矛盾',
    problem: '柳白眉身份不一致',
    characterNames: ['柳白眉']
  }]);
  const second = createCharacterIssueLedger(first, [{
    severity: 'high',
    category: '身份矛盾',
    problem: '柳白眉身份不一致',
    characterNames: ['柳白眉']
  }]);
  assert.equal(first[0].id, second[0].id);
  assert.equal(second[0].recurrenceCount, 1);
});

test('质量门区分确定性硬阻断、人工审核和自动通过', () => {
  const evidenceCriticalGate = evaluateCharacterQualityGate({
    audit: {
      score: 90,
      issues: [{
        severity: 'critical',
        category: '身份矛盾',
        problem: '身份冲突',
        evidence: ['characterCanon.publicIdentity']
      }]
    }
  });
  assert.equal(evidenceCriticalGate.level, 'review');
  assert.equal(evidenceCriticalGate.canCommit, true);
  assert.equal(evaluateCharacterQualityGate({
    audit: { score: 90, issues: [] },
    deterministicIssues: ['事实契约冲突：柳白眉公开身份错误']
  }).level, 'blocked');
  const lowScoreGate = evaluateCharacterQualityGate({
    audit: { score: 62, issues: [] }
  });
  assert.equal(lowScoreGate.level, 'review');
  assert.equal(lowScoreGate.canCommit, true);
  const reviewGate = evaluateCharacterQualityGate({
    audit: {
      score: 80,
      issues: [{ severity: 'high', category: '人物弧光', problem: '弧光可继续深化' }]
    }
  });
  assert.equal(reviewGate.level, 'review');
  assert.equal(reviewGate.canCommit, true);
  assert.equal(evaluateCharacterQualityGate({
    audit: {
      score: 90,
      issues: [{ severity: 'critical', category: '人物弧光', problem: '缺少证据的主观判断' }]
    }
  }).level, 'review');
  assert.equal(evaluateCharacterQualityGate({
    audit: { score: 90, issues: [] }
  }).level, 'passed');
});

test('incomplete 与确定性硬错误阻断，但质量建议不冒充事实错误', () => {
  assert.ok(getCharacterAcceptanceBlockers(
    { score: 90, issues: [] },
    ['人物事实契约冲突'],
    1
  ).length >= 2);
  const partition = partitionCharacterIntegrityIssues([
    '事实契约冲突：柳白眉身份错误',
    '人物档案高度相似：柳白眉 ↔ 沈砚（80%）',
    '人物“沈砚”的主观能动性没有具体行动'
  ]);
  assert.equal(partition.hard.length, 1);
  assert.equal(partition.quality.length, 2);
});
