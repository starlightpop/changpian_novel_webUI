import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findForbiddenStoryConcepts,
  validateEnsembleArchitecture,
  validateGoldenThreeChapters,
  validateMasterOutlineDepth,
  validatePlotIntegrity,
  parsePriorChapterReference,
  parseRelativeDay,
  GLOBAL_FORBIDDEN_STORY_CONCEPTS,
  NOVEL_WORLD_TYPE_PATTERN
} from '../src/domain/novel-integrity.js';

function deepOutlineStage(name) {
  return `【人物驱动】${name}阶段，沈砚因为旧案逼近家人，主动拒绝退让并决定公开证据。
【群像推进】顾行舟为保住商路暗中换走账册，苏芷为保护证人隐瞒藏身处，两人的利益与沈砚发生碰撞。
【悬疑问题】真正改写账册的人是谁，顾行舟为何提前知道灭证时间，这些信息尚未揭底。
【因果升级】因为沈砚公开半页账册，导致州衙开始灭证，迫使各方提前行动并付出资源。
【关键反转】众人以为主簿是幕后人物，却发现他只是替家人顶罪，旧案指向更高层。
【爽点兑现】沈砚利用对方自相矛盾的证词完成反击，夺回调查主动权，但不是无代价获胜。
【阶段代价】证人因此暴露，苏芷失去原有退路，顾行舟与沈砚的临时合作也留下决裂后果。`;
}

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

test('禁用词精确边界匹配——中文插入字符不应误报', () => {
  const hits1 = findForbiddenStoryConcepts({ text: '作者维（护）度假期安排' });
  assert.equal(hits1.length, 0, '插入括号内容不应匹配"作者维度"');

  const hits2 = findForbiddenStoryConcepts({ text: '这里出现了作者维度的概念' });
  assert.ok(hits2.some(h => h.term === '作者维度'), '连续中文应匹配');

  const hits3 = findForbiddenStoryConcepts({ text: 'AI技术改变了世界' });
  assert.ok(hits3.some(h => h.term === 'AI'), '英文AI应匹配');

  const hits4 = findForbiddenStoryConcepts({ text: '我去了SAI工作室' });
  assert.equal(hits4.filter(h => h.term === 'AI').length, 0, 'SAI不应匹配AI');
});

test('NOVEL_WORLD_TYPE_PATTERN 导出且可匹配', () => {
  assert.ok(NOVEL_WORLD_TYPE_PATTERN.test('架空古代'));
  assert.ok(NOVEL_WORLD_TYPE_PATTERN.test('修仙世界'));
  assert.ok(!NOVEL_WORLD_TYPE_PATTERN.test('赛博朋克'));
});

test('总纲深度校验拒绝流水线式四段摘要', () => {
  const issues = validateMasterOutlineDepth({
    beginning: '主角开始调查。',
    development: '矛盾逐渐发展。',
    climax: '双方进入高潮对决。',
    ending: '事情结束。'
  });
  assert.ok(issues.some(issue => issue.includes('【人物驱动】')));
  assert.ok(issues.some(issue => issue.includes('过于简略')));

  assert.deepEqual(validateMasterOutlineDepth({
    beginning: deepOutlineStage('开始'),
    development: deepOutlineStage('发展'),
    climax: deepOutlineStage('高潮'),
    ending: deepOutlineStage('结局')
  }), []);
});

test('群像校验要求独立人物线、利益和主动行动', () => {
  const characters = [
    completeCharacter('沈砚'),
    completeCharacter('顾行舟'),
    completeCharacter('苏芷')
  ];
  const validThread = (id, name, driver, other) => ({
    id,
    name,
    driverCharacters: [driver],
    independentGoal: `${driver}要保护自身利益`,
    interestConflict: `与${other}争夺关键证据`,
    agencyPlan: `${driver}主动调查并交换条件`,
    startState: '各自行动',
    endState: '承担选择后果',
    intersections: [`与${other}线在审判前交汇`]
  });
  assert.deepEqual(validateEnsembleArchitecture({
    narrativeThreads: [
      validThread('thread-1', '旧案线', '沈砚', '顾行舟'),
      validThread('thread-2', '商路线', '顾行舟', '苏芷'),
      validThread('thread-3', '证人线', '苏芷', '沈砚')
    ]
  }, characters), []);

  const issues = validateEnsembleArchitecture({
    narrativeThreads: [validThread('thread-1', '主角线', '沈砚', '顾行舟')]
  }, characters);
  assert.ok(issues.some(issue => issue.includes('至少需要3条')));
});

test('黄金三章校验要求危机入场、升级兑现和小高潮承诺', () => {
  const chapters = [
    {
      chapterNumber: 1,
      goldenChapterRole: '第一章-危机入场',
      openingState: '父亲旧案证人遭到追杀，账册即将被毁',
      conflict: '沈砚必须在守卫封仓前取证',
      plotSummary: '沈砚主动夜探旧仓',
      characterAction: '沈砚拒绝离开并潜入旧仓',
      turn: '暗格里只有半页账册',
      readerPayoff: '抢在灭证前取得半页证据',
      coreQuestion: '另一半账册被谁拿走',
      endingHook: '账册上出现顾行舟的私印'
    },
    {
      chapterNumber: 2,
      goldenChapterRole: '第二章-升级兑现',
      conflict: '州衙封锁全城',
      characterAction: '沈砚主动利用假账反击主簿',
      turn: '揭穿一名灭证者却发现主簿另有靠山',
      readerPayoff: '第一次打脸并夺回证人',
      coreQuestion: '主簿背后的靠山是谁',
      endingHook: '证人说出死者仍活着',
      stateDelta: '调查由被动逃亡升级为主动取证'
    },
    {
      chapterNumber: 3,
      goldenChapterRole: '第三章-小高潮立承诺',
      conflict: '真假证人同时出现',
      characterAction: '沈砚公开对质',
      turn: '反转揭示被救者才是伪证人',
      readerPayoff: '小高潮中拆穿身份并保住真证人',
      coreQuestion: '幕后势力为何制造十年前的死亡假象',
      endingHook: '真证人提出进入官仓总库的长期目标'
    }
  ];
  assert.deepEqual(validateGoldenThreeChapters(chapters), []);
  assert.ok(validateGoldenThreeChapters(chapters.slice(0, 2)).some(issue => issue.includes('缺少第3章')));
});

test('parseRelativeDay 支持"余"字模糊表达', () => {
  assert.equal(parseRelativeDay('第二十余日'), 20);
  assert.equal(parseRelativeDay('第三天'), 3);
  assert.equal(parseRelativeDay('第100天'), 100);
  assert.equal(parseRelativeDay(''), null);
});

test('parsePriorChapterReference 解析章节引用', () => {
  assert.equal(parsePriorChapterReference('来自第5章的线索'), 5);
  assert.equal(parsePriorChapterReference('chapter-outline-12'), 12);
  assert.equal(parsePriorChapterReference('祖传所得'), null);
});

test('validatePlotIntegrity 检测天降道具——引用章未引入该元素', () => {
  const characters = [completeCharacter('陈默')];
  const architecture = {
    narrativeThreads: [{
      id: 'thread-1', name: '主线', driverCharacters: ['陈默'],
      startState: '起', endState: '止'
    }],
    volumes: [{
      id: 'v1', startState: '起', volumeGoal: '目', primaryConflict: '冲',
      midpointTurn: '转', climax: '高', lowPoint: '低', endState: '止', nextHook: '钩'
    }]
  };
  const chapters = [
    {
      id: 'chapter-outline-1', chapterNumber: 1, volumeId: 'v1', title: '章一',
      time: '第1天', location: '旧宅', viewpoint: '陈默', participants: ['陈默'],
      threadIds: ['thread-1'], prerequisiteChapterIds: [],
      openingState: '开', characterGoal: '目', characterAction: '动',
      opposition: '阻', conflict: '冲', causalReason: '因', plotSummary: '梗',
      turn: '转', cost: '代', resourcesUsed: [], newElements: [],
      knowledgeDelta: '知', relationshipDelta: '变', stateDelta: '结',
      emotionalCurve: '情', plantedClues: [], paidClues: [], endingHook: '钩'
    },
    {
      id: 'chapter-outline-2', chapterNumber: 2, volumeId: 'v1', title: '章二',
      time: '第2天', location: '旧宅', viewpoint: '陈默', participants: ['陈默'],
      threadIds: ['thread-1'], prerequisiteChapterIds: ['chapter-outline-1'],
      openingState: '继', characterGoal: '目', characterAction: '动',
      opposition: '阻', conflict: '冲', causalReason: '因', plotSummary: '梗',
      turn: '转', cost: '代',
      resourcesUsed: [{ name: '玄铁剑', origin: 'chapter-outline-1', cost: '消耗灵力' }],
      newElements: [],
      knowledgeDelta: '知', relationshipDelta: '变', stateDelta: '结',
      emotionalCurve: '情', plantedClues: [], paidClues: [], endingHook: '钩'
    }
  ];
  const issues = validatePlotIntegrity({ chapters, architecture, characters });
  assert.ok(issues.some(i => i.includes('天降道具') && i.includes('玄铁剑')), '第1章未引入玄铁剑应报天降道具');
});

test('validatePlotIntegrity 通过——引用章确实引入了该元素', () => {
  const characters = [completeCharacter('陈默')];
  const architecture = {
    narrativeThreads: [{
      id: 'thread-1', name: '主线', driverCharacters: ['陈默'],
      startState: '起', endState: '止'
    }],
    volumes: [{
      id: 'v1', startState: '起', volumeGoal: '目', primaryConflict: '冲',
      midpointTurn: '转', climax: '高', lowPoint: '低', endState: '止', nextHook: '钩'
    }]
  };
  const chapters = [
    {
      id: 'chapter-outline-1', chapterNumber: 1, volumeId: 'v1', title: '章一',
      time: '第1天', location: '旧宅', viewpoint: '陈默', participants: ['陈默'],
      threadIds: ['thread-1'], prerequisiteChapterIds: [],
      openingState: '开', characterGoal: '目', characterAction: '动',
      opposition: '阻', conflict: '冲', causalReason: '因', plotSummary: '梗',
      turn: '转', cost: '代', resourcesUsed: [],
      newElements: [{ type: '道具', name: '玄铁剑', origin: '背景设定', purpose: '战斗' }],
      knowledgeDelta: '知', relationshipDelta: '变', stateDelta: '结',
      emotionalCurve: '情', plantedClues: [], paidClues: [], endingHook: '钩'
    },
    {
      id: 'chapter-outline-2', chapterNumber: 2, volumeId: 'v1', title: '章二',
      time: '第2天', location: '旧宅', viewpoint: '陈默', participants: ['陈默'],
      threadIds: ['thread-1'], prerequisiteChapterIds: ['chapter-outline-1'],
      openingState: '继', characterGoal: '目', characterAction: '动',
      opposition: '阻', conflict: '冲', causalReason: '因', plotSummary: '梗',
      turn: '转', cost: '代',
      resourcesUsed: [{ name: '玄铁剑', origin: 'chapter-outline-1', cost: '消耗灵力' }],
      newElements: [],
      knowledgeDelta: '知', relationshipDelta: '变', stateDelta: '结',
      emotionalCurve: '情', plantedClues: [], paidClues: [], endingHook: '钩'
    }
  ];
  const issues = validatePlotIntegrity({ chapters, architecture, characters });
  assert.ok(!issues.some(i => i.includes('天降道具')), '第1章已引入玄铁剑不应报天降道具');
});
