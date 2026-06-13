import fs from 'fs';
import path from 'path';

const htmlContent = fs.readFileSync('/Users/tang/PycharmProjects/pythonProject/changpian_novel_webUI/index.html', 'utf8');
const jsContent = fs.readFileSync('/Users/tang/PycharmProjects/pythonProject/changpian_novel_webUI/src/main.js', 'utf8');

// Extract all getElementById and querySelector keys from main.js elements definition
const elementsMatch = jsContent.match(/const elements = \{([\s\S]+?)\};/);
if (!elementsMatch) {
  console.error('Could not find elements definition in main.js');
  process.exit(1);
}

const lines = elementsMatch[1].split('\n');
const missingIds = [];
const missingClasses = [];

for (let line of lines) {
  line = line.trim();
  if (!line || line.startsWith('//')) continue;
  
  const idMatch = line.match(/: \s*document\.getElementById\(['"](.+?)['"]\)/);
  if (idMatch) {
    const id = idMatch[1];
    if (!htmlContent.includes(`id="${id}"`) && !htmlContent.includes(`id='${id}'`)) {
      missingIds.push(id);
    }
  }

  const queryMatch = line.match(/: \s*document\.querySelector\(['"](.+?)['"]\)/);
  if (queryMatch) {
    const selector = queryMatch[1];
    if (selector.startsWith('.')) {
      const className = selector.substring(1);
      if (!htmlContent.includes(`class="${className}"`) && !htmlContent.includes(`class='${className}'`) && !htmlContent.includes(className)) {
        missingClasses.push(selector);
      }
    }
  }
}

console.log('Missing IDs:', missingIds);
console.log('Missing Classes:', missingClasses);
