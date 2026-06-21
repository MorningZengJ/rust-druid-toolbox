#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const BASE_LOCALE = 'zh-CN';

// 提取代码中使用的i18n key
function extractUsedKeys(content) {
  const keys = new Set();

  // 匹配 t('key') 或 t("key") 或 t(`key`)
  const tCallRegex = /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = tCallRegex.exec(content)) !== null) {
    keys.add(match[1]);
  }

  return Array.from(keys);
}

// 提取可能的硬编码中文字符串
function extractHardcodedChinese(content) {
  const strings = [];

  // 匹配引号中的中文字符串
  const chineseRegex = /['"`]([^'"`]*[一-龥]+[^'"`]*)['"`]/g;
  let match;
  while ((match = chineseRegex.exec(content)) !== null) {
    // 排除import语句和注释
    const lineStart = content.lastIndexOf('\n', match.index) + 1;
    const line = content.substring(lineStart, match.index + match[0].length);
    if (!line.trimStart().startsWith('//') &&
        !line.trimStart().startsWith('*') &&
        !line.includes('import ') &&
        !match[1].includes('@/')) {
      strings.push({
        text: match[1],
        position: match.index
      });
    }
  }

  return strings;
}

// 递归获取所有翻译key
function getTranslationKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getTranslationKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// 加载所有翻译key
function loadAllTranslationKeys() {
  const allKeys = new Set();
  const namespaces = ['common', 'rename', 'asciiArt', 'settings', 'errors', 'videoTool'];

  for (const ns of namespaces) {
    const filePath = path.join(LOCALES_DIR, BASE_LOCALE, `${ns}.json`);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const obj = JSON.parse(content);
      const keys = getTranslationKeys(obj);
      keys.forEach(k => allKeys.add(`${ns}:${k}`));
    } catch (error) {
      console.error(`Error loading ${filePath}:`, error.message);
    }
  }

  return allKeys;
}

// 扫描所有源文件
function scanSourceFiles() {
  const results = {
    usedKeys: new Set(),
    hardcodedStrings: [],
    files: []
  };

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'dist'].includes(entry.name)) {
          scanDir(fullPath);
        }
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const usedKeys = extractUsedKeys(content);
        const hardcoded = extractHardcodedChinese(content);

        if (usedKeys.length > 0 || hardcoded.length > 0) {
          results.files.push({
            path: path.relative(SRC_DIR, fullPath),
            usedKeys,
            hardcodedStrings: hardcoded
          });

          usedKeys.forEach(k => results.usedKeys.add(k));
          results.hardcodedStrings.push(...hardcoded.map(s => ({
            ...s,
            file: path.relative(SRC_DIR, fullPath)
          })));
        }
      }
    }
  }

  scanDir(SRC_DIR);
  return results;
}

// 主检查函数
function main() {
  console.log('=== i18n 使用情况深度分析报告 ===\n');

  // 1. 加载所有翻译key
  const allTranslationKeys = loadAllTranslationKeys();
  console.log(`✓ 已加载 ${allTranslationKeys.size} 个翻译key\n`);

  // 2. 扫描源文件
  const scanResults = scanSourceFiles();
  console.log(`✓ 已扫描 ${scanResults.files.length} 个文件\n`);

  // 3. 分析使用的key
  console.log('--- 使用的i18n Key分析 ---\n');

  const usedKeysArray = Array.from(scanResults.usedKeys);
  const missingKeys = usedKeysArray.filter(k => !allTranslationKeys.has(k));
  const validKeys = usedKeysArray.filter(k => allTranslationKeys.has(k));

  console.log(`使用的key总数: ${usedKeysArray.length}`);
  console.log(`有效的key: ${validKeys.length}`);
  console.log(`可能缺失的key: ${missingKeys.length}\n`);

  if (missingKeys.length > 0) {
    console.log('⚠️  可能缺失的key:');
    missingKeys.forEach(k => console.log(`  - ${k}`));
    console.log();
  }

  // 4. 分析硬编码字符串
  console.log('--- 硬编码中文字符串分析 ---\n');
  console.log(`发现 ${scanResults.hardcodedStrings.length} 个硬编码中文字符串\n`);

  if (scanResults.hardcodedStrings.length > 0) {
    console.log('文件位置:');
    const byFile = {};
    scanResults.hardcodedStrings.forEach(s => {
      if (!byFile[s.file]) byFile[s.file] = [];
      byFile[s.file].push(s.text);
    });

    for (const [file, strings] of Object.entries(byFile)) {
      console.log(`\n  ${file}:`);
      strings.slice(0, 5).forEach(s => console.log(`    - "${s}"`));
      if (strings.length > 5) {
        console.log(`    ... 还有 ${strings.length - 5} 个`);
      }
    }
  }

  // 5. 按文件统计
  console.log('\n\n--- 各文件使用统计 ---\n');

  const fileStats = scanResults.files
    .filter(f => f.usedKeys.length > 0 || f.hardcodedStrings.length > 0)
    .sort((a, b) => b.usedKeys.length - a.usedKeys.length);

  console.log('文件路径'.padEnd(50) + '使用Key数'.padEnd(12) + '硬编码数');
  console.log('-'.repeat(75));

  fileStats.forEach(f => {
    console.log(
      f.path.padEnd(50) +
      String(f.usedKeys.length).padEnd(12) +
      String(f.hardcodedStrings.length)
    );
  });

  // 6. 生成建议
  console.log('\n\n=== 改进建议 ===\n');

  if (missingKeys.length > 0) {
    console.log('1. 添加缺失的翻译key:');
    console.log('   - 检查是否是命名空间前缀错误');
    console.log('   - 确认key是否真的需要\n');
  }

  if (scanResults.hardcodedStrings.length > 0) {
    console.log('2. 替换硬编码字符串:');
    console.log('   - 将中文字符串提取到翻译文件');
    console.log('   - 使用t()函数进行国际化\n');
  }

  console.log('3. 最佳实践:');
  console.log('   - 使用命名空间区分模块: t("rename:key")');
  console.log('   - 为复杂字符串使用插值: t("key", { value })');
  console.log('   - 定期运行此脚本检查完整性\n');
}

main();
