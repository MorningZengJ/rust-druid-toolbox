#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

function readJson(relativePath) {
  const filePath = path.join(ROOT_DIR, relativePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new Error(`Failed to read ${relativePath}: ${error.message}`);
  }
}

function readText(relativePath) {
  const filePath = path.join(ROOT_DIR, relativePath);
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read ${relativePath}: ${error.message}`);
  }
}

function readCargoVersion() {
  const cargoToml = readText('src-tauri/Cargo.toml');
  // Extract from [package] to next [section] or end of file
  const packageStart = cargoToml.indexOf('[package]');
  if (packageStart === -1) {
    throw new Error('Failed to find [package] in src-tauri/Cargo.toml');
  }
  const afterPackage = cargoToml.slice(packageStart);
  const nextSection = afterPackage.slice('[package]'.length).search(/^\[/m);
  const packageSection = nextSection === -1
    ? afterPackage
    : afterPackage.slice(0, '[package]'.length + nextSection);
  const versionMatch = packageSection.match(/^version\s*=\s*"([^"]+)"/m);

  if (!versionMatch) {
    throw new Error('Failed to find [package].version in src-tauri/Cargo.toml');
  }

  return versionMatch[1];
}

function collectVersions() {
  const frontendPackage = readJson('frontend/package.json');
  const tauriConfig = readJson('src-tauri/tauri.conf.json');
  const updater = readJson('updater.json');

  return {
    'frontend/package.json': frontendPackage.version,
    'src-tauri/Cargo.toml': readCargoVersion(),
    'src-tauri/tauri.conf.json': tauriConfig.version,
    'updater.json': updater.version,
  };
}

function checkUpdaterUrls(version) {
  const updater = readJson('updater.json');
  const issues = [];
  const platforms = updater.platforms || {};

  for (const [platform, info] of Object.entries(platforms)) {
    if (!info || typeof info.url !== 'string') {
      issues.push(`${platform}: missing url`);
      continue;
    }

    if (!info.url.includes(`/v${version}/`)) {
      issues.push(`${platform}: url does not include /v${version}/ (${info.url})`);
    }

    if (!info.url.includes(version)) {
      issues.push(`${platform}: url filename/path does not include ${version} (${info.url})`);
    }

    if (typeof info.signature !== 'string' || info.signature.length === 0) {
      issues.push(`${platform}: missing signature`);
    }
  }

  return issues;
}

function main() {
  const versions = collectVersions();
  const uniqueVersions = Array.from(new Set(Object.values(versions)));

  console.log('\n=== Version consistency check ===\n');
  for (const [source, version] of Object.entries(versions)) {
    console.log(`${source.padEnd(32)} ${version}`);
  }

  const issues = [];
  if (uniqueVersions.length !== 1) {
    issues.push(`Version mismatch: ${uniqueVersions.join(', ')}`);
  }

  if (uniqueVersions.length === 1) {
    issues.push(...checkUpdaterUrls(uniqueVersions[0]));
  }

  if (issues.length > 0) {
    console.log('\n--- Issues ---');
    issues.forEach((issue) => console.log(`- ${issue}`));
    process.exitCode = 1;
    return;
  }

  console.log('\n✓ Versions are consistent.');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { collectVersions, checkUpdaterUrls };
