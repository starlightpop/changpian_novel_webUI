import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findBackgroundTagEntityIssues,
  parseGroupedBackgroundInput,
  parseBackgroundSemantics,
  repairBackgroundTagEntityNames,
  validateBackgroundSemanticCoherence
} from '../src/domain/background-semantics.js';

test('背景标签被编译为不同语义层级', () => {
  const profile = parseBackgroundSemantics('男频，修仙，系统，热血，爽文，脑洞，智商在线，强者崛起，反套路');
  assert.deepEqual(profile.categories.audience, ['男频']);
  assert.ok(profile.categories.worldType.includes('修仙'));
  assert.ok(profile.categories.mechanism.includes('系统'));
  assert.ok(profile.categories.narrativeStrategy.includes('反套路'));
  assert.ok(profile.categories.qualityConstraint.includes('智商在线'));
  assert.ok(profile.nonEntityTerms.includes('反套路'));
  assert.ok(!profile.nonEntityTerms.includes('系统'));
  assert.ok(!profile.nonEntityTerms.includes('修仙'));
});

test('拒绝叙事策略和质量标签被实体化', () => {
  const profile = parseBackgroundSemantics('男频，修仙，系统，反套路，智商在线');
  const issues = findBackgroundTagEntityIssues({
    assets: [
      { type: 'system', name: '反套路天鉴' },
      { type: 'faction', name: '智商在线宗' }
    ]
  }, profile);
  assert.ok(issues.some(issue => issue.includes('反套路天鉴')));
  assert.ok(issues.some(issue => issue.includes('智商在线宗')));
});

test('实体名称修复会同步所有字符串引用', () => {
  const profile = parseBackgroundSemantics('男频，修仙，反套路');
  const result = {
    assets: [{ name: '反套路天鉴', desc: '反套路天鉴会发布任务' }],
    eventCards: [{ oppositionResources: '反套路天鉴' }]
  };
  const mappings = repairBackgroundTagEntityNames(result, profile);
  assert.deepEqual(mappings, [{ from: '反套路天鉴', to: '天鉴' }]);
  assert.equal(result.assets[0].name, '天鉴');
  assert.equal(result.assets[0].desc, '天鉴会发布任务');
  assert.equal(result.eventCards[0].oppositionResources, '天鉴');
});

test('背景语义守门器不误伤正常世界名称和单字风格词', () => {
  const profile = parseBackgroundSemantics('男频，修仙，甜');
  assert.deepEqual(findBackgroundTagEntityIssues({
    assets: [{ name: '修仙界' }, { name: '甜水镇' }]
  }, profile), []);
});

test('分组标签会纠正常见错字并保持类别边界', () => {
  const groups = parseGroupedBackgroundInput(
    '题材：「男频衍生，现言甜宠」情节：「未日求生，养惠文」角色：「赞婿」情绪：「先虐后甜」背景：「现代」'
  );
  assert.deepEqual(groups.themes, ['男频衍生', '现言甜宠']);
  assert.deepEqual(groups.plotDevices, ['末日求生', '养崽文']);
  assert.deepEqual(groups.characterArchetypes, ['赘婿']);
  const profile = parseBackgroundSemantics('男频衍生，现代，爽文');
  assert.deepEqual(profile.categories.audience, []);
  assert.ok(profile.categories.genre.includes('男频衍生'));
});

test('未知新标签只作为语义约束，不允许被直接实体化', () => {
  const profile = parseBackgroundSemantics('男频，现代都市，清醒沉沦流');
  assert.ok(profile.unknown.includes('清醒沉沦流'));
  assert.ok(profile.nonEntityTerms.includes('清醒沉沦流'));
  assert.ok(findBackgroundTagEntityIssues({
    assets: [{ name: '清醒沉沦流秘典' }]
  }, profile).some(issue => issue.includes('清醒沉沦流秘典')));
});

test('架空不会被错误改写为架空古代', () => {
  const profile = parseBackgroundSemantics('男频，现代都市，架空，商战');
  assert.ok(profile.categories.genre.includes('架空'));
  assert.ok(!profile.categories.worldType.includes('架空古代'));
  assert.ok(profile.executionRules.some(rule => rule.includes('不自动代表古代')));
});

test('语义校验拒绝互斥的世界与关系承诺', () => {
  const analysis = validateBackgroundSemanticCoherence(
    '女频，架空古代，现代，后宫，无CP，纯爱',
    '故事发生在现代都市。'
  );
  assert.ok(analysis.errors.some(message => message.includes('世界背景冲突')));
  assert.ok(analysis.errors.some(message => message.includes('无CP')));
  assert.ok(analysis.errors.some(message => message.includes('后宫与纯爱')));
});

test('语义校验接受单一且完整的创作方向', () => {
  const analysis = validateBackgroundSemanticCoherence(
    '男频，现代都市，系统，热血，爽文，脑洞，智商在线，强者崛起'
  );
  assert.deepEqual(analysis.errors, []);
});

test('语义校验阻止全局禁用题材进入后续 Agent', () => {
  const analysis = validateBackgroundSemanticCoherence('男频，现代都市，科幻，直播');
  assert.ok(analysis.errors.some(message => message.includes('科幻')));
  assert.ok(analysis.errors.some(message => message.includes('直播')));
});
