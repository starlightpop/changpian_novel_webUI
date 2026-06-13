import fs from 'fs';
import { getDerivedDataMismatchReasons } from '../src/domain/novel-integrity.js';

// Let's implement createSourceSignature exactly as in main.js
function createSourceSignature(background, synopsis) {
  const source = `${String(background || '').trim()}\n${String(synopsis || '').trim()}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `constitution-${(hash >>> 0).toString(16)}`;
}

const userDataPath = './data/users/twb-12530/user-data.json';
const data = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));

for (const novel of data.novels || []) {
  if (novel.name === '反套路系统') {
    const history = novel.derivedHistory || [];
    if (history.length > 0) {
      const snap = history[0];
      
      const testNovel = {
        ...novel,
        derivedSourceSignature: snap.sourceSignature, // restore it!
        masterOutline: snap.masterOutline,
        characterBible: snap.characterBible,
        characterRelations: snap.characterRelations,
        plotBlueprint: snap.plotBlueprint,
        finalOutline: snap.finalOutline,
        assets: snap.assets,
        narrativeKernel: snap.narrativeKernel,
        synopsis: novel.synopsis,
        background: novel.background
      };
      
      const realCurrentSignature = createSourceSignature(novel.background, novel.synopsis);
      console.log('Snapshot signature:', snap.sourceSignature);
      console.log('Real current signature:', realCurrentSignature);
      
      const reasons = getDerivedDataMismatchReasons(testNovel, realCurrentSignature);
      console.log('Mismatch reasons with real current signature:', reasons);
    }
  }
}
