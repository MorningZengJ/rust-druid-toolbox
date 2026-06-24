#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const BASE_LOCALE = 'zh-CN';
const NAMESPACES = ['common', 'rename', 'asciiArt', 'settings', 'errors', 'videoTool'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flattenKeys(obj, prefix = '') {
  let keys = [];
  if (!isPlainObject(obj)) return keys;

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      keys = keys.concat(flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

function loadAllTranslationKeys() {
  const allKeys = new Set();

  for (const namespace of NAMESPACES) {
    const filePath = path.join(LOCALES_DIR, BASE_LOCALE, `${namespace}.json`);
    try {
      const obj = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      flattenKeys(obj).forEach((key) => allKeys.add(`${namespace}:${key}`));
    } catch (error) {
      console.error(`Error loading ${filePath}: ${error.message}`);
    }
  }

  return allKeys;
}

function listSourceFiles(dir = SRC_DIR) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        files.push(...listSourceFiles(fullPath));
      }
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function inferDefaultNamespaces(content) {
  const namespaces = [];
  const useTranslationRegex = /useTranslation\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  let match;

  while ((match = useTranslationRegex.exec(content)) !== null) {
    namespaces.push(match[1]);
  }

  return Array.from(new Set(namespaces));
}

function normalizeKey(rawKey, namespaces) {
  if (rawKey.includes(':')) return rawKey;

  if (namespaces.length === 1) {
    return `${namespaces[0]}:${rawKey}`;
  }

  if (namespaces.length === 0) {
    return `common:${rawKey}`;
  }

  return null;
}

function extractUsedKeys(content) {
  const namespaces = inferDefaultNamespaces(content);
  const used = [];
  const ambiguous = [];
  const tCallRegex = /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;

  while ((match = tCallRegex.exec(content)) !== null) {
    const rawKey = match[1];
    const normalizedKey = normalizeKey(rawKey, namespaces);
    if (normalizedKey) {
      used.push({ rawKey, normalizedKey });
    } else {
      ambiguous.push({ rawKey, namespaces });
    }
  }

  return { used, ambiguous, namespaces };
}

function extractHardcodedChinese(content) {
  const strings = [];
  const chineseRegex = /['"`]([^'"`]*[一-龥]+[^'"`]*)['"`]/g;
  let match;

  while ((match = chineseRegex.exec(content)) !== null) {
    const lineStart = content.lastIndexOf('\n', match.index) + 1;
    const lineEnd = content.indexOf('\n', match.index);
    const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
    const trimmed = line.trimStart();

    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    if (line.includes('import ')) continue;
    if (match[1].includes('@/')) continue;
    if (/languageNames|LANGUAGE_NAMES|Language/.test(line)) continue;

    strings.push({ text: match[1], position: match.index });
  }

  return strings;
}

function scanSourceFiles() {
  const results = {
    usedKeys: new Set(),
    ambiguousKeys: [],
    hardcodedStrings: [],
    files: [],
  };

  for (const filePath of listSourceFiles()) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(SRC_DIR, filePath);
    const { used, ambiguous, namespaces } = extractUsedKeys(content);
    const hardcodedStrings = extractHardcodedChinese(content);

    if (used.length > 0 || ambiguous.length > 0 || hardcodedStrings.length > 0) {
      results.files.push({
        path: relativePath,
        namespaces,
        usedKeys: used,
        ambiguousKeys: ambiguous,
        hardcodedStrings,
      });
    }

    used.forEach((item) => results.usedKeys.add(item.normalizedKey));
    results.ambiguousKeys.push(...ambiguous.map((item) => ({ ...item, file: relativePath })));
    results.hardcodedStrings.push(...hardcodedStrings.map((item) => ({ ...item, file: relativePath })));
  }

  return results;
}

function main() {
  console.log('=== i18n 使用情况深度分析报告 ===\n');

  const allTranslationKeys = loadAllTranslationKeys();
  console.log(`✓ 已加载 ${allTranslationKeys.size} 个翻译 key\n`);

  const scanResults = scanSourceFiles();
  console.log(`✓ 已扫描 ${scanResults.files.length} 个包含 i18n 或中文字符串的文件\n`);

  const usedKeysArray = Array.from(scanResults.usedKeys).sort();
  const missingKeys = usedKeysArray.filter((key) => !allTranslationKeys.has(key));
  const validKeys = usedKeysArray.filter((key) => allTranslationKeys.has(key));

  console.log('--- 使用的 i18n Key 分析 ---\n');
  console.log(`使用的 key 总数: ${usedKeysArray.length}`);
  console.log(`有效的 key: ${validKeys.length}`);
  console.log(`可能缺失的 key: ${missingKeys.length}`);
  console.log(`无法静态判断 namespace 的 key: ${scanResults.ambiguousKeys.length}\n`);

  if (missingKeys.length > 0) {
    console.log('⚠️  可能缺失的 key:');
    missingKeys.slice(0, 120).forEach((key) => console.log(`  - ${key}`));
    if (missingKeys.length > 120) {
      console.log(`  ... 还有 ${missingKeys.length - 120} 个未显示`);
    }
    console.log();
  }

  if (scanResults.ambiguousKeys.length > 0) {
    console.log('⚠️  无法静态判断 namespace 的 key（warning，不作为失败条件）:');
    scanResults.ambiguousKeys.slice(0, 80).forEach((item) => {
      console.log(`  - ${item.file}: ${item.rawKey} namespaces=${item.namespaces.join(',')}`);
    });
    if (scanResults.ambiguousKeys.length > 80) {
      console.log(`  ... 还有 ${scanResults.ambiguousKeys.length - 80} 个未显示`);
    }
    console.log();
  }

  console.log('--- 硬编码中文字符串分析 ---\n');
  console.log(`发现 ${scanResults.hardcodedStrings.length} 个可能的硬编码中文字符串\n`);

  if (scanResults.hardcodedStrings.length > 0) {
    const byFile = new Map();
    for (const item of scanResults.hardcodedStrings) {
      if (!byFile.has(item.file)) byFile.set(item.file, []);
      byFile.get(item.file).push(item.text);
    }

    for (const [file, strings] of byFile) {
      console.log(`  ${file}:`);
      strings.slice(0, 5).forEach((text) => console.log(`    - "${text}"`));
      if (strings.length > 5) {
        console.log(`    ... 还有 ${strings.length - 5} 个`);
      }
    }
  }

  console.log('\n--- 各文件使用统计 ---\n');
  console.log('文件路径'.padEnd(50) + '使用Key数'.padEnd(12) + '中文字符串');
  console.log('-'.repeat(75));

  scanResults.files
    .sort((a, b) => b.usedKeys.length - a.usedKeys.length)
    .forEach((file) => {
      console.log(
        file.path.padEnd(50) +
        String(file.usedKeys.length).padEnd(12) +
        String(file.hardcodedStrings.length),
      );
    });

  console.log('\n=== 改进建议 ===\n');
  console.log('- 缺失 key 应补到对应 namespace 的 locale JSON。');
  console.log('- 无法静态判断 namespace 的 key 可改为 `t("ns:key")`，或拆分组件内多个 `useTranslation`。');
  console.log('- 硬编码中文报告可能包含非 UI 常量，需人工确认后再迁移。');

  process.exitCode = missingKeys.length > 0 ? 1 : 0;
}

if (require.main === module) {
  main();
}

module.exports = { extractUsedKeys, extractHardcodedChinese, loadAllTranslationKeys };
