import { validateCharacterName } from '../src/domain/novel-integrity.js';

const synopsis = '这是一个在修仙中展开的精彩故事。主角带着坚定的执念，在风云诡谲的世界里步步为营，破解重重迷雾，战胜强大的对手，成就一段传奇。';
const text = String(synopsis || '').trim();

const patterns = [
  /(?:^|[。！？\n，,])([\u4e00-\u9fff]{2,4})是(?:一名|一个|位|个)/g,
  /(?:主角|男主|女主)(?:名为|叫做|叫|是|[：:])\s*([\u4e00-\u9fff]{2,4})/g
];

patterns.forEach((pattern, i) => {
  console.log(`Pattern ${i}:`);
  for (const match of text.matchAll(pattern)) {
    const candidate = match[1];
    const issues = validateCharacterName(candidate);
    console.log(`- Match: ${match[0]}, candidate: ${candidate}, issues:`, issues);
  }
});
