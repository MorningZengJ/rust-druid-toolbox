#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const BASE_LOCALE = 'zh-CN';
const NAMESPACES = ['common', 'rename', 'asciiArt', 'settings', 'errors', 'videoTool'];

// 递归获取所有key
function getKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// 检查单个文件
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// 主检查函数
function checkI18n() {
  const results = {
    summary: {},
    details: {}
  };

  // 获取基准语言的所有key
  const baseKeys = {};
  for (const ns of NAMESPACES) {
    const baseFile = path.join(LOCALES_DIR, BASE_LOCALE, `${ns}.json`);
    const baseObj = checkFile(baseFile);
    if (baseObj) {
      baseKeys[ns] = getKeys(baseObj);
    }
  }

  // 检查每个语言
  const locales = fs.readdirSync(LOCALES_DIR).filter(dir => {
    return fs.statSync(path.join(LOCALES_DIR, dir)).isDirectory();
  });

  for (const locale of locales) {
    if (locale === BASE_LOCALE) continue;

    results.details[locale] = {};
    let totalMissing = 0;
    let totalKeys = 0;

    for (const ns of NAMESPACES) {
      const filePath = path.join(LOCALES_DIR, locale, `${ns}.json`);
      const obj = checkFile(filePath);

      if (!obj) {
        results.details[locale][ns] = {
          status: 'missing_file',
          missingKeys: baseKeys[ns] || []
        };
        totalMissing += (baseKeys[ns] || []).length;
        totalKeys += (baseKeys[ns] || []).length;
        continue;
      }

      const localeKeys = getKeys(obj);
      const missingKeys = (baseKeys[ns] || []).filter(k => !localeKeys.includes(k));

      results.details[locale][ns] = {
        status: missingKeys.length === 0 ? 'complete' : 'incomplete',
        missingKeys,
        extraKeys: localeKeys.filter(k => !(baseKeys[ns] || []).includes(k))
      };

      totalMissing += missingKeys.length;
      totalKeys += (baseKeys[ns] || []).length;
    }

    const coverage = totalKeys > 0 ? ((totalKeys - totalMissing) / totalKeys * 100).toFixed(2) : 100;
    results.summary[locale] = {
      totalKeys,
      missingKeys: totalMissing,
      coverage: `${coverage}%`
    };
  }

  return results;
}

// 运行检查并输出报告
const report = checkI18n();

console.log('\n=== i18n 完整性检查报告 ===\n');
console.log(`基准语言: ${BASE_LOCALE}`);
console.log(`检查的命名空间: ${NAMESPACES.join(', ')}\n`);

console.log('--- 总体摘要 ---\n');
console.log('语言\t\t总Key数\t缺失数\t覆盖率');
console.log('-'.repeat(50));

for (const [locale, summary] of Object.entries(report.summary)) {
  console.log(`${locale}\t\t${summary.totalKeys}\t${summary.missingKeys}\t${summary.coverage}`);
}

console.log('\n--- 详细缺失信息 ---\n');

for (const [locale, details] of Object.entries(report.details)) {
  const hasMissing = Object.values(details).some(d => d.missingKeys && d.missingKeys.length > 0);
  if (!hasMissing) continue;

  console.log(`\n### ${locale} ###`);

  for (const [ns, detail] of Object.entries(details)) {
    if (detail.missingKeys && detail.missingKeys.length > 0) {
      console.log(`\n[${ns}] 缺失 ${detail.missingKeys.length} 个key:`);
      detail.missingKeys.forEach(key => console.log(`  - ${key}`));
    }
  }
}

// 生成修复建议
console.log('\n\n=== 修复建议 ===\n');
for (const [locale, summary] of Object.entries(report.summary)) {
  if (summary.missingKeys > 0) {
    console.log(`${locale}: 需要补充 ${summary.missingKeys} 个翻译key`);
  }
}

module.exports = { checkI18n };
