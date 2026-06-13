import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  getDerivedDataMismatchReasons
} from '../src/domain/novel-integrity.js';

const root = process.cwd();
const usersDir = path.join(root, 'data', 'users');
const dryRun = process.argv.includes('--dry-run');

function createSourceSignature(background, synopsis) {
  const source = `${String(background || '').trim()}\n${String(synopsis || '').trim()}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `constitution-${(hash >>> 0).toString(16)}`;
}

function hasDerivedData(novel) {
  return Boolean(
    novel?.masterOutline ||
    novel?.characterBible?.length ||
    novel?.characterRelations?.length ||
    novel?.plotBlueprint ||
    novel?.finalOutline ||
    novel?.assets?.some(asset => !['story-constitution', 'reference-analysis'].includes(asset?.type))
  );
}

function quarantineNovel(novel, reasons) {
  if (!hasDerivedData(novel)) return false;
  const snapshot = {
    archivedAt: new Date().toISOString(),
    sourceSignature: novel.derivedSourceSignature || novel.storyConstitution?.sourceSignature || '',
    reasons,
    analysisSummary: novel.analysisSummary,
    masterOutline: novel.masterOutline,
    narrativeKernel: novel.narrativeKernel,
    worldPressure: novel.worldPressure,
    factionPlans: novel.factionPlans,
    eventCards: novel.eventCards,
    promiseLedger: novel.promiseLedger,
    chapterPromiseLedger: novel.chapterPromiseLedger,
    stateLedger: novel.stateLedger,
    outlineAudit: novel.outlineAudit,
    plotBlueprint: novel.plotBlueprint,
    plotBlueprintDraft: novel.plotBlueprintDraft,
    finalAudit: novel.finalAudit,
    finalOutline: novel.finalOutline,
    characterBible: novel.characterBible,
    characterRelations: novel.characterRelations,
    characterAudit: novel.characterAudit,
    characterRosterDraft: novel.characterRosterDraft,
    chapters: novel.chapters,
    currentChapterId: novel.currentChapterId,
    activeTarget: novel.activeTarget,
    assets: novel.assets,
    knowledgeGraph: novel.knowledgeGraph
  };
  const preservedAssets = (novel.assets || []).filter(asset => asset?.type === 'reference-analysis');
  novel.derivedHistory = [...(Array.isArray(novel.derivedHistory) ? novel.derivedHistory : []), snapshot];
  novel.chapters = [{
    id: 'chapter-1',
    title: '第一章：新故事开端',
    content: '# 第一章：新故事开端\n\n'
  }];
  novel.currentChapterId = 'chapter-1';
  novel.activeTarget = { type: 'chapter', id: 'chapter-1' };
  novel.assets = preservedAssets;
  novel.masterOutline = null;
  novel.analysisSummary = '';
  novel.narrativeKernel = null;
  novel.worldPressure = null;
  novel.factionPlans = [];
  novel.eventCards = [];
  novel.promiseLedger = [];
  novel.chapterPromiseLedger = [];
  novel.stateLedger = [];
  novel.outlineAudit = null;
  novel.plotBlueprint = null;
  novel.plotBlueprintDraft = null;
  novel.finalAudit = null;
  novel.finalOutline = null;
  novel.characterBible = [];
  novel.characterRelations = [];
  novel.characterAudit = null;
  novel.characterRosterDraft = null;
  novel.knowledgeGraph = null;
  novel.derivedSourceSignature = null;
  novel.consistencyStatus = {
    needsReaudit: true,
    reason: reasons.join('；'),
    updatedAt: new Date().toISOString()
  };
  return true;
}

function minimalGraph(novel) {
  const nodes = [{
    id: 'novel-root',
    kind: 'novel',
    label: novel.name,
    text: `${novel.background || ''}\n${novel.synopsis || ''}`
  }];
  if (novel.storyConstitution) {
    nodes.push({
      id: 'constitution:story',
      kind: 'story-constitution',
      label: '作品宪法',
      text: JSON.stringify(novel.storyConstitution)
    });
  }
  return {
    novelId: novel.id,
    novelName: novel.name,
    version: 1,
    nodes,
    edges: novel.storyConstitution
      ? [{ source: 'novel-root', target: 'constitution:story', type: 'defines' }]
      : [],
    updatedAt: new Date().toISOString()
  };
}

if (!existsSync(usersDir)) {
  console.log('没有用户数据目录，无需迁移。');
  process.exit(0);
}

let migratedCount = 0;
for (const username of await readdir(usersDir)) {
  const userDir = path.join(usersDir, username);
  const dataPath = path.join(userDir, 'user-data.json');
  if (!existsSync(dataPath)) continue;
  const data = JSON.parse(await readFile(dataPath, 'utf8'));
  let changed = false;
  for (const novel of data.novels || []) {
    const signature = createSourceSignature(novel.background, novel.synopsis);
    const reasons = getDerivedDataMismatchReasons(novel, signature);
    const quarantined = reasons.length ? quarantineNovel(novel, reasons) : false;
    if (quarantined) {
      changed = true;
      migratedCount += 1;
      console.log(`${username}/${novel.name}: ${reasons.join('；')}`);
    }
    const graphPath = path.join(userDir, 'knowledge-graphs', `${novel.id}.json`);
    if (
      existsSync(path.dirname(graphPath)) &&
      (quarantined || (novel.consistencyStatus?.needsReaudit && novel.derivedHistory?.length))
    ) {
      if (!dryRun) {
        await writeFile(graphPath, `${JSON.stringify(minimalGraph(novel), null, 2)}\n`, 'utf8');
      }
    }
  }
  if (changed && !dryRun) {
    await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }
}

console.log(`${dryRun ? '迁移预演' : '迁移完成'}：隔离 ${migratedCount} 本作品的陈旧派生数据。`);
