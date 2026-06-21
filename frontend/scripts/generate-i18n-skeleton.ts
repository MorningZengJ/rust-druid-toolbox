/**
 * 自动生成 i18n 骨架文件的脚本
 * 使用英文翻译作为模板，为其他语言创建占位符文件
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const SOURCE_LANG = 'en-US';

// 需要生成骨架的语言列表（除了已有的 zh-CN 和 en-US）
const TARGET_LANGS = [
  'ja-JP',
  'ko-KR',
  'zh-TW',
  'de-DE',
  'fr-FR',
  'es-ES',
  'pt-BR',
  'ru-RU',
  'ar-SA',
  'hi-IN',
  'th-TH',
  'vi-VN',
  'it-IT',
  'nl-NL',
  'pl-PL',
  'tr-TR',
];

const NAMESPACES = [
  'common',
  'rename',
  'asciiArt',
  'videoTool',
  'settings',
  'errors',
];

function generateSkeleton(sourceObj: any): any {
  if (typeof sourceObj === 'string') {
    return ''; // 空字符串作为占位符
  }
  if (Array.isArray(sourceObj)) {
    return sourceObj.map(item => generateSkeleton(item));
  }
  if (typeof sourceObj === 'object' && sourceObj !== null) {
    const result: any = {};
    for (const key of Object.keys(sourceObj)) {
      result[key] = generateSkeleton(sourceObj[key]);
    }
    return result;
  }
  return sourceObj;
}

function generateIndexTs(lang: string): string {
  return `import common from './common.json';
import rename from './rename.json';
import asciiArt from './asciiArt.json';
import videoTool from './videoTool.json';
import settings from './settings.json';
import errors from './errors.json';

export default {
  common,
  rename,
  asciiArt,
  videoTool,
  settings,
  errors,
};
`;
}

async function main() {
  console.log('Generating i18n skeleton files...');

  // 读取英文翻译作为源
  const sourceDir = path.join(LOCALES_DIR, SOURCE_LANG);

  for (const lang of TARGET_LANGS) {
    const langDir = path.join(LOCALES_DIR, lang);

    // 创建语言目录
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    // 为每个命名空间生成骨架文件
    for (const ns of NAMESPACES) {
      const sourceFile = path.join(sourceDir, `${ns}.json`);
      const targetFile = path.join(langDir, `${ns}.json`);

      if (fs.existsSync(sourceFile)) {
        const sourceContent = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
        const skeleton = generateSkeleton(sourceContent);
        fs.writeFileSync(targetFile, JSON.stringify(skeleton, null, 2), 'utf-8');
        console.log(`Generated: ${lang}/${ns}.json`);
      }
    }

    // 生成 index.ts
    const indexContent = generateIndexTs(lang);
    fs.writeFileSync(path.join(langDir, 'index.ts'), indexContent, 'utf-8');
    console.log(`Generated: ${lang}/index.ts`);
  }

  console.log('Done!');
}

main().catch(console.error);
