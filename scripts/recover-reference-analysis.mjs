import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const usersDir = path.join(root, 'data', 'users');

if (!existsSync(usersDir)) {
  console.log('没有用户数据目录，无需恢复。');
  process.exit(0);
}

let recoveredCount = 0;
for (const username of await readdir(usersDir)) {
  const userDir = path.join(usersDir, username);
  const dataPath = path.join(userDir, 'user-data.json');
  if (!existsSync(dataPath)) continue;
  
  const data = JSON.parse(await readFile(dataPath, 'utf8'));
  let changed = false;
  
  for (const novel of data.novels || []) {
    if (!novel.assets) novel.assets = [];
    const hasReferenceAnalysis = novel.assets.some(asset => asset?.type === 'reference-analysis');
    if (!hasReferenceAnalysis && Array.isArray(novel.derivedHistory)) {
      for (let i = novel.derivedHistory.length - 1; i >= 0; i--) {
        const snapshot = novel.derivedHistory[i];
        if (snapshot && Array.isArray(snapshot.assets)) {
          const refAsset = snapshot.assets.find(asset => asset?.type === 'reference-analysis');
          if (refAsset) {
            novel.assets.push(refAsset);
            recoveredCount += 1;
            changed = true;
            console.log(`已成功恢复 ${username}/${novel.name} 的原著结构拆解数据。`);
            break;
          }
        }
      }
    }
  }
  
  if (changed) {
    await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }
}

console.log(`恢复完成：共恢复了 ${recoveredCount} 本作品的原著结构拆解数据。`);
