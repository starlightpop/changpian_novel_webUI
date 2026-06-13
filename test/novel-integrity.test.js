import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findForbiddenStoryConcepts,
  getCharacterRosterEntryIssues,
  getCharacterProfileIssues,
  getDerivedDataMismatchReasons,
  getFinalReviewBlockingIssues,
  inferSynopsisProtagonistNames,
  parsePriorChapterReference,
  synchronizePromiseEventReferences,
  validateCharacterName,
  validateCharacterSystemIntegrity,
  validatePlotIntegrity,
  parseRelativeDay
} from '../src/domain/novel-integrity.js';

function completeCharacter(name) {
  return {
    name,
    identity: '调查者',
    publicIdentity: '地方调查者',
    hiddenIdentities: [],
    identityRevealStage: '无',
    faction: '地方民间组织',
    factionScope: '城内案件及相关人际网络',
    storyFunction: '以个人判断推动案件调查并承担选择后果',
    ageAndAppearance: '二十八岁，衣着朴素，神情警觉',
    personality: '谨慎、固执，愿意为弱者承担风险',
    desire: '查清旧案并保护家人',
    goal: '找到失踪证人并公开账册',
    interests: '家人安全、证人安全和自身清白',
    agency: '主动追查证据，在威胁下仍选择公开真相',
    ability: '熟悉地方人情、账目和追踪方法',
    weakness: '过度独断，容易把同伴排除在计划之外',
    settingBasis: '来自背景中的地方旧案与民间调查体系',
    plotAnchor: '负责旧案调查线及其公开审判阶段',
    foreshadowLink: '早期发现的残页在审判阶段完成回收',
    lifeHistory: '少年时因父亲蒙冤离乡，成年后返回故乡调查旧案。',
    growthHistory: '从只信自己到学会公开证据并接受同伴监督。',
    arc: '从孤立调查转向承担公共责任。',
    highlight: '在审判前夜主动公开账册并保护关键证人。',
    fate: '洗清父亲冤屈，同时失去原有安稳生活。'
  };
}

test('拒绝占位、群体、称谓和别名式人物姓名', () => {
  for (const name of ['路人甲', '二弟/三弟等', '小师妹', '老村长', '大哥桑天']) {
    assert.ok(validateCharacterName(name).length, name);
  }
  assert.deepEqual(validateCharacterName('陈默'), []);
});

test('人物名册候选返回可操作的字段与重复拒绝原因', () => {
  assert.deepEqual(getCharacterRosterEntryIssues({
    name: '陈默',
    identity: '地方调查者',
    roleTier: '主要人物',
    faction: '地方民间组织',
    storyFunction: '主动公开账册并承担追责风险'
  }), []);
  const issues = getCharacterRosterEntryIssues({
    name: '路人甲',
    identity: '',
    roleTier: '配角',
    faction: '',
    storyFunction: ''
  }, ['路人甲']);
  assert.ok(issues.includes('姓名是占位标签'));
  assert.ok(issues.includes('缺少具体身份'));
  assert.ok(issues.includes('角色层级无效'));
  assert.ok(issues.includes('缺少所属阵营'));
  assert.ok(issues.includes('缺少不可替代的剧情功能'));
  assert.ok(issues.includes('姓名与现有名册重复'));
});

test('人物硬审计拒绝重复关系和模板人物', () => {
  const first = completeCharacter('陈默');
  const second = completeCharacter('林秋');
  second.profileQuality = 'fallback';
  const issues = validateCharacterSystemIntegrity(
    [first, second],
    [
      { source: '陈默', target: '林秋', type: '盟友', description: '共同追查旧案', interestConflict: '公开时机不同', evidenceRefs: ['master-outline'] },
      { source: '林秋', target: '陈默', type: '盟友', description: '共同追查旧案', interestConflict: '公开时机不同', evidenceRefs: ['master-outline'] }
    ],
    2
  );
  assert.ok(issues.some(issue => issue.includes('兜底模板')));
  assert.ok(issues.some(issue => issue.includes('关系重复')));
});

test('正式人物关系必须登记可追溯证据', () => {
  const issues = validateCharacterSystemIntegrity(
    [completeCharacter('陈默'), completeCharacter('林秋')],
    [{
      source: '陈默',
      target: '林秋',
      type: '盟友',
      description: '共同追查旧案',
      interestConflict: '公开时机不同'
    }],
    2
  );
  assert.ok(issues.some(issue => issue.includes('缺少证据引用')));
});

test('人物档案拒绝静默丢弃无效内嵌关系', () => {
  const character = completeCharacter('陈默');
  character._invalidRelationshipCount = 1;
  assert.ok(getCharacterProfileIssues(character).some(issue => issue.includes('内嵌关系')));
});

test('禁用概念在所有题材中都被识别', () => {
  const hits = findForbiddenStoryConcepts({
    background: '现代悬疑',
    outline: '主角通过AI和数据流追查外星人。'
  });
  assert.deepEqual(hits.map(hit => hit.term).sort(), ['AI', '外星人', '数据流'].sort());
  
  const falseHits = findForbiddenStoryConcepts({
    background: '修仙',
    outline: '这章 paid 了，主角继续在 main 殿修炼。',
    promiseLedger: [
      { id: 'promise-1', status: 'paid' }
    ]
  });
  assert.deepEqual(falseHits, []);
});

test('伏笔台账能确定性补齐合法的事件双向登记', () => {
  const blueprint = {
    eventCards: [
      { id: 'event-1', order: 1, plantedPromises: [], paidPromises: ['promise-1'] },
      { id: 'event-2', order: 2, plantedPromises: [], paidPromises: [] },
      { id: 'event-3', order: 3, plantedPromises: ['promise-1'], paidPromises: [] }
    ],
    promiseLedger: [
      { id: 'promise-1', seedEventId: 'event-1', payoffEventId: 'event-2' },
      { id: 'promise-invalid', seedEventId: 'event-2', payoffEventId: 'event-1' },
      { id: 'promise-unknown', seedEventId: 'event-x', payoffEventId: 'event-2' }
    ]
  };

  const changes = synchronizePromiseEventReferences(blueprint);

  assert.deepEqual(blueprint.eventCards[0].plantedPromises, ['promise-1']);
  assert.deepEqual(blueprint.eventCards[0].paidPromises, []);
  assert.deepEqual(blueprint.eventCards[1].paidPromises, ['promise-1']);
  assert.deepEqual(blueprint.eventCards[1].plantedPromises, ['promise-invalid']);
  assert.deepEqual(blueprint.eventCards[2].plantedPromises, []);
  assert.ok(!blueprint.eventCards[0].paidPromises.includes('promise-invalid'));
  assert.ok(!blueprint.eventCards[1].paidPromises.includes('promise-unknown'));
  assert.equal(changes.length, 5);
});

test('剧情校验拒绝天降人物、未来资源、未铺伏笔和未知叙事线', () => {
  const characters = [completeCharacter('陈默'), completeCharacter('林秋')];
  const architecture = {
    narrativeThreads: [{
      id: 'thread-1',
      name: '旧案线',
      driverCharacters: ['陈默'],
      startState: '旧案沉寂',
      endState: '旧案公开'
    }],
    volumes: [{
      id: 'volume-1',
      startState: '证据缺失',
      volumeGoal: '找到证人',
      primaryConflict: '权势阻挠',
      midpointTurn: '证人失踪',
      climax: '公开账册',
      lowPoint: '同伴被捕',
      endState: '形成证据链',
      nextHook: '幕后主使现身'
    }]
  };
  const chapters = [{
    chapterNumber: 1,
    volumeId: 'volume-1',
    title: '旧信',
    time: '事发后第一日',
    location: '陈家旧宅',
    viewpoint: '陈默',
    participants: ['陈默'],
    threadIds: ['thread-x'],
    openingState: '陈默收到旧信',
    characterGoal: '确认旧信来源',
    characterAction: '陈默检查信纸',
    opposition: '线索被人涂改',
    conflict: '必须在天亮前找到寄信人',
    causalReason: '旧宅即将被拆除',
    plotSummary: '陈默查验旧信，王强决定抢走账册。',
    turn: '发现暗记',
    cost: '暴露行踪',
    resourcesUsed: [{ name: '铜钥匙', origin: '第2章取得', cost: '只能使用一次' }],
    newElements: [{ type: '人物', name: '王强', origin: '突然出现', purpose: '抢走账册' }],
    knowledgeDelta: '陈默知道旧信来自城南',
    relationshipDelta: '陈默开始怀疑旧友',
    stateDelta: '调查正式启动',
    emotionalCurve: '疑惑到警觉',
    plantedClues: [],
    paidClues: ['残页'],
    endingHook: '门外传来脚步声'
  }];
  const issues = validatePlotIntegrity({ chapters, architecture, characters });
  assert.ok(issues.some(issue => issue.includes('缺少章节 ID')));
  assert.ok(issues.some(issue => issue.includes('未知叙事线')));
  assert.ok(issues.some(issue => issue.includes('天降人物')));
  assert.ok(issues.some(issue => issue.includes('未来章节')));
  assert.ok(issues.some(issue => issue.includes('未提前埋设')));
  assert.ok(issues.some(issue => issue.includes('未登记姓名')));
});

test('来源引用只能指向此前章节', () => {
  assert.equal(parsePriorChapterReference('来自第12章的旧账册'), 12);
  assert.equal(parsePriorChapterReference('chapter-outline-8'), 8);
  assert.equal(parsePriorChapterReference('祖传所得'), null);
});

test('剧情校验拒绝缺失、未知和未来章节依赖', () => {
  const characters = [completeCharacter('陈默'), completeCharacter('林秋')];
  const architecture = {
    narrativeThreads: [{
      id: 'thread-1',
      name: '旧案线',
      driverCharacters: ['陈默'],
      startState: '旧案沉寂',
      endState: '旧案公开',
      intersections: []
    }],
    volumes: [{
      id: 'volume-1',
      startState: '证据缺失',
      volumeGoal: '找到证人',
      primaryConflict: '权势阻挠',
      midpointTurn: '证人失踪',
      climax: '公开账册',
      lowPoint: '同伴被捕',
      endState: '形成证据链',
      nextHook: '幕后主使现身'
    }]
  };
  const base = {
    volumeId: 'volume-1',
    title: '旧案',
    time: '第一日',
    location: '旧宅',
    viewpoint: '陈默',
    participants: ['陈默'],
    threadIds: ['thread-1'],
    openingState: '收到旧信',
    characterGoal: '确认来源',
    characterAction: '检查信纸',
    opposition: '线索被涂改',
    conflict: '必须找到寄信人',
    causalReason: '旧宅即将被拆',
    plotSummary: '陈默检查旧信',
    turn: '发现暗记',
    cost: '暴露行踪',
    resourcesUsed: [],
    newElements: [],
    knowledgeDelta: '知道来信方向',
    relationshipDelta: '开始怀疑旧友',
    stateDelta: '调查启动',
    emotionalCurve: '疑惑到警觉',
    plantedClues: [],
    paidClues: [],
    endingHook: '门外传来脚步'
  };
  const chapters = [
    { ...base, id: 'chapter-outline-1', chapterNumber: 1, prerequisiteChapterIds: [] },
    { ...base, id: 'chapter-outline-2', chapterNumber: 2, prerequisiteChapterIds: [] },
    { ...base, id: 'chapter-outline-3', chapterNumber: 3, prerequisiteChapterIds: ['chapter-outline-4'] },
    { ...base, id: 'chapter-outline-4', chapterNumber: 4, prerequisiteChapterIds: ['chapter-outline-99'] }
  ];
  const issues = validatePlotIntegrity({ chapters, architecture, characters });
  assert.ok(issues.some(issue => issue.includes('第2章缺少前置章节依赖')));
  assert.ok(issues.some(issue => issue.includes('第3章引用当前或未来章节')));
  assert.ok(issues.some(issue => issue.includes('第4章引用不存在的前置章节')));
});

test('简介主角与旧人物库不一致时判定派生数据过期', () => {
  const novel = {
    synopsis: '在旧城深处，陈默是一名调查者。',
    characterBible: [completeCharacter('桑杳')],
    assets: [{ type: 'chapter-outline' }]
  };
  assert.deepEqual(inferSynopsisProtagonistNames(novel.synopsis), ['陈默']);
  assert.ok(getDerivedDataMismatchReasons(novel, 'new-signature').some(reason => reason.includes('陈默')));
  assert.deepEqual(inferSynopsisProtagonistNames('主角带着坚定的执念进入旧城。'), []);
});

test('终审低分或存在严重问题时阻断', () => {
  const blockers = getFinalReviewBlockingIssues({
    score: 92,
    issues: [{ severity: 'high', target: '第20章', problem: '道具无来源' }]
  });
  assert.equal(blockers.length, 1);
  assert.ok(blockers[0].includes('道具无来源'));
  assert.ok(getFinalReviewBlockingIssues({ score: 80, issues: [] }).length);
  assert.ok(getFinalReviewBlockingIssues(
    { score: 95, issues: [] },
    { needsReaudit: true, reason: '人物档案已修改' }
  ).some(issue => issue.includes('人物档案已修改')));
});

test('多线交汇与伏笔衰减校验', () => {
  const characters = [completeCharacter('陈默'), completeCharacter('林秋')];
  const architecture = {
    narrativeThreads: [
      {
        id: 'thread-1',
        name: '线1',
        driverCharacters: ['陈默'],
        startState: '起',
        endState: '止',
        intersections: ['thread-2']
      },
      {
        id: 'thread-2',
        name: '线2',
        driverCharacters: ['林秋'],
        startState: '起',
        endState: '止',
        intersections: []
      }
    ],
    volumes: [{ id: 'volume-1', startState: '起', volumeGoal: '目', primaryConflict: '冲', midpointTurn: '转', climax: '高', lowPoint: '低', endState: '止', nextHook: '钩' }]
  };
  
  const chapters = [];
  for (let i = 1; i <= 33; i++) {
    chapters.push({
      chapterNumber: i,
      volumeId: 'volume-1',
      title: '章',
      time: `第${i}天`,
      location: '地点',
      viewpoint: '陈默',
      participants: ['陈默', '林秋'],
      threadIds: ['thread-1'],
      openingState: '开',
      characterGoal: '目',
      characterAction: '动',
      opposition: '阻',
      conflict: '冲',
      causalReason: '因',
      plotSummary: '梗',
      turn: '转',
      cost: '代',
      resourcesUsed: [],
      newElements: [],
      knowledgeDelta: '知',
      relationshipDelta: '变',
      stateDelta: '结',
      emotionalCurve: '情',
      plantedClues: i === 1 ? ['clue-1'] : [],
      paidClues: i === 33 ? ['clue-1'] : [],
      endingHook: '钩'
    });
  }
  
  const issues = validatePlotIntegrity({ chapters, architecture, characters });
  assert.ok(issues.some(issue => issue.includes('交汇')));
  assert.ok(issues.some(issue => issue.includes('跨度超过30章')));
});

test('parseRelativeDay 支持模糊中文数字天数（含“余”字）', () => {
  assert.equal(parseRelativeDay('第十天'), 10);
  assert.equal(parseRelativeDay('第二十日'), 20);
  assert.equal(parseRelativeDay('第二十余天'), 20);
  assert.equal(parseRelativeDay('第十五余日'), 15);
  assert.equal(parseRelativeDay('第十二余天'), 12);
  assert.equal(parseRelativeDay('第10余天'), 10);
});
