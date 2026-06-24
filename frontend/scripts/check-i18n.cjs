#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const BASE_LOCALE = 'zh-CN';
const NAMESPACES = ['common', 'rename', 'asciiArt', 'settings', 'errors', 'videoTool'];
const STRICT = process.argv.includes('--strict');
const INTERPOLATION_REGEX = /{{\s*([\w.]+)\s*}}/g;

function readJson(filePath) {
  try {
    return { ok: true, value: JSON.parse(fs.readFileSync(filePath, 'utf-8')) };
  } catch (error) {
    return { ok: false, error };
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flattenLeaves(obj, prefix = '') {
  const leaves = new Map();

  if (!isPlainObject(obj)) {
    return leaves;
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      for (const [childKey, childValue] of flattenLeaves(value, fullKey)) {
        leaves.set(childKey, childValue);
      }
    } else {
      leaves.set(fullKey, value);
    }
  }

  return leaves;
}

function collectInterpolations(value) {
  if (typeof value !== 'string') return [];

  const names = new Set();
  let match;
  while ((match = INTERPOLATION_REGEX.exec(value)) !== null) {
    names.add(match[1]);
  }
  return Array.from(names).sort();
}

function sameStringArray(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function compareNamespace(locale, namespace, baseLeaves, localeLeaves, issues) {
  for (const [key, baseValue] of baseLeaves) {
    const fullKey = `${namespace}:${key}`;

    if (!localeLeaves.has(key)) {
      issues.errors.push({ locale, namespace, key: fullKey, type: 'missing_key' });
      continue;
    }

    const localeValue = localeLeaves.get(key);
    if (typeof localeValue !== typeof baseValue) {
      issues.errors.push({
        locale,
        namespace,
        key: fullKey,
        type: 'type_mismatch',
        expected: typeof baseValue,
        actual: typeof localeValue,
      });
      continue;
    }

    if (typeof localeValue === 'string') {
      if (localeValue.length === 0) {
        issues.warnings.push({ locale, namespace, key: fullKey, type: 'empty_string' });
      } else if (localeValue.trim().length === 0) {
        issues.warnings.push({ locale, namespace, key: fullKey, type: 'blank_string' });
      }

      const baseVars = collectInterpolations(baseValue);
      const localeVars = collectInterpolations(localeValue);
      if (!sameStringArray(baseVars, localeVars)) {
        issues.errors.push({
          locale,
          namespace,
          key: fullKey,
          type: 'interpolation_mismatch',
          expected: baseVars,
          actual: localeVars,
        });
      }
    }
  }

  for (const key of localeLeaves.keys()) {
    if (!baseLeaves.has(key)) {
      issues.warnings.push({ locale, namespace, key: `${namespace}:${key}`, type: 'extra_key' });
    }
  }
}

function loadBaseLeaves(issues) {
  const base = {};

  for (const namespace of NAMESPACES) {
    const filePath = path.join(LOCALES_DIR, BASE_LOCALE, `${namespace}.json`);
    const parsed = readJson(filePath);
    if (!parsed.ok) {
      issues.errors.push({ locale: BASE_LOCALE, namespace, filePath, type: 'invalid_json', message: parsed.error.message });
      base[namespace] = new Map();
      continue;
    }
    base[namespace] = flattenLeaves(parsed.value);
  }

  return base;
}

function checkI18n() {
  const issues = { errors: [], warnings: [] };
  const baseLeavesByNamespace = loadBaseLeaves(issues);
  const locales = fs.readdirSync(LOCALES_DIR)
    .filter((entry) => fs.statSync(path.join(LOCALES_DIR, entry)).isDirectory())
    .sort();

  const summary = {};

  for (const locale of locales) {
    summary[locale] = {
      totalKeys: 0,
      errors: 0,
      warnings: 0,
      missingKeys: 0,
      emptyValues: 0,
    };

    for (const namespace of NAMESPACES) {
      const baseLeaves = baseLeavesByNamespace[namespace] || new Map();
      summary[locale].totalKeys += baseLeaves.size;

      const filePath = path.join(LOCALES_DIR, locale, `${namespace}.json`);
      const parsed = readJson(filePath);
      const beforeErrors = issues.errors.length;
      const beforeWarnings = issues.warnings.length;

      if (!parsed.ok) {
        issues.errors.push({ locale, namespace, filePath, type: 'invalid_json', message: parsed.error.message });
      } else {
        compareNamespace(locale, namespace, baseLeaves, flattenLeaves(parsed.value), issues);
      }

      const newErrors = issues.errors.slice(beforeErrors);
      const newWarnings = issues.warnings.slice(beforeWarnings);
      summary[locale].errors += newErrors.length;
      summary[locale].warnings += newWarnings.length;
      summary[locale].missingKeys += newErrors.filter((issue) => issue.type === 'missing_key').length;
      summary[locale].emptyValues += newWarnings.filter((issue) => issue.type === 'empty_string' || issue.type === 'blank_string').length;
    }
  }

  return { summary, issues };
}

function printIssueList(title, issues, maxItems = 80) {
  if (issues.length === 0) return;

  console.log(`\n--- ${title} (${issues.length}) ---`);
  for (const issue of issues.slice(0, maxItems)) {
    const suffix = issue.message ? `: ${issue.message}` : '';
    const detail = issue.expected || issue.actual
      ? ` expected=${JSON.stringify(issue.expected)} actual=${JSON.stringify(issue.actual)}`
      : '';
    console.log(`  - [${issue.type}] ${issue.locale} ${issue.key || issue.namespace || issue.filePath}${detail}${suffix}`);
  }
  if (issues.length > maxItems) {
    console.log(`  ... 还有 ${issues.length - maxItems} 项未显示`);
  }
}

function main() {
  const report = checkI18n();

  console.log('\n=== i18n 完整性检查报告 ===\n');
  console.log(`基准语言: ${BASE_LOCALE}`);
  console.log(`检查的命名空间: ${NAMESPACES.join(', ')}`);
  console.log(`模式: ${STRICT ? 'strict（warnings 也会失败）' : 'report（warnings 只报告）'}\n`);

  console.log('语言\t\t总Key数\t错误\t警告\t缺失\t空值');
  console.log('-'.repeat(70));
  for (const [locale, item] of Object.entries(report.summary)) {
    console.log(`${locale}\t\t${item.totalKeys}\t${item.errors}\t${item.warnings}\t${item.missingKeys}\t${item.emptyValues}`);
  }

  printIssueList('错误', report.issues.errors);
  printIssueList('警告', report.issues.warnings);

  console.log('\n=== 修复建议 ===\n');
  console.log('- missing_key/type_mismatch/interpolation_mismatch 应优先修复。');
  console.log('- empty_string/blank_string 当前作为 warning 报告；新增翻译时应避免继续增加空值。');
  console.log('- 如需让 warning 也失败，可运行 `node scripts/check-i18n.cjs --strict`。');

  const shouldFail = report.issues.errors.length > 0 || (STRICT && report.issues.warnings.length > 0);
  process.exitCode = shouldFail ? 1 : 0;
}

if (require.main === module) {
  main();
}

module.exports = { checkI18n, flattenLeaves, collectInterpolations };
