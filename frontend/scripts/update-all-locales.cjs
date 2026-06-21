#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');

// 新增的翻译key（英文作为基准）
const newKeys = {
  videoTool: {
    errors: {
      addFilesFirst: "Please add files to convert",
      batchConvertFailed: "Batch convert failed: {{error}}",
      selectFolderFirst: "Please select image folder first",
      noImagesInFolder: "No images found in folder",
      setOutputPath: "Please set output path",
      minTwoVideos: "At least two video files are required"
    },
    codecSelector: {
      title: "Codec",
      qualityPreset: "Quality Preset",
      customBitrate: "Custom Bitrate (optional, overrides preset)",
      bitratePlaceholder: "e.g.: 2000k, 5M"
    },
    common: {
      mediaFiles: "Media Files",
      releaseToAdd: "Release to add files",
      formatConversion: "Format Conversion",
      inputFiles: "Input Files ({{count}})",
      add: "Add",
      log: "Log",
      logEmpty: "No logs"
    }
  },
  common: {
    colors: {
      default: "Default",
      blue: "Blue",
      green: "Green",
      purple: "Purple",
      orange: "Orange",
      rose: "Rose"
    },
    time: {
      seconds: "{{count}}s",
      minutesSeconds: "{{minutes}}m {{seconds}}s",
      minutes: "{{minutes}}m"
    },
    fileTypes: {
      image: "Image",
      video: "Video",
      audio: "Audio",
      media: "Media"
    }
  },
  errors: {
    loadImageFailed: "Failed to load image: {{error}}",
    convertFailed: "Conversion failed: {{error}}",
    copyFailed: "Copy failed: {{error}}",
    exportFailed: "Export failed: {{error}}",
    loadFilesFailed: "Failed to load files: {{error}}",
    applyTemplateFailed: "Failed to apply template: {{error}}",
    detectConflictsFailed: "Failed to detect conflicts: {{error}}",
    executeRenameFailed: "Failed to execute rename: {{error}}",
    selectDirectoryFailed: "Failed to select directory: {{error}}",
    getParentFailed: "Failed to get parent directory: {{error}}",
    openFileFailed: "Failed to open file: {{error}}"
  }
};

// 递归合并对象
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// 获取所有语言目录
const locales = fs.readdirSync(LOCALES_DIR).filter(dir => {
  return fs.statSync(path.join(LOCALES_DIR, dir)).isDirectory();
});

console.log('开始更新所有语言文件...\n');

for (const locale of locales) {
  // 跳过已更新的基准语言
  if (locale === 'zh-CN' || locale === 'en-US') {
    console.log(`⏭️  跳过 ${locale} (已更新)`);
    continue;
  }

  console.log(`正在更新 ${locale}...`);

  // 更新 videoTool.json
  const videoToolPath = path.join(LOCALES_DIR, locale, 'videoTool.json');
  try {
    const videoTool = JSON.parse(fs.readFileSync(videoToolPath, 'utf-8'));
    const updatedVideoTool = deepMerge(videoTool, newKeys.videoTool);
    fs.writeFileSync(videoToolPath, JSON.stringify(updatedVideoTool, null, 2) + '\n');
    console.log(`  ✓ videoTool.json 已更新`);
  } catch (error) {
    console.log(`  ✗ videoTool.json 更新失败: ${error.message}`);
  }

  // 更新 common.json
  const commonPath = path.join(LOCALES_DIR, locale, 'common.json');
  try {
    const common = JSON.parse(fs.readFileSync(commonPath, 'utf-8'));
    const updatedCommon = deepMerge(common, newKeys.common);
    fs.writeFileSync(commonPath, JSON.stringify(updatedCommon, null, 2) + '\n');
    console.log(`  ✓ common.json 已更新`);
  } catch (error) {
    console.log(`  ✗ common.json 更新失败: ${error.message}`);
  }

  // 更新 errors.json
  const errorsPath = path.join(LOCALES_DIR, locale, 'errors.json');
  try {
    const errors = JSON.parse(fs.readFileSync(errorsPath, 'utf-8'));
    const updatedErrors = deepMerge(errors, newKeys.errors);
    fs.writeFileSync(errorsPath, JSON.stringify(updatedErrors, null, 2) + '\n');
    console.log(`  ✓ errors.json 已更新`);
  } catch (error) {
    console.log(`  ✗ errors.json 更新失败: ${error.message}`);
  }
}

console.log('\n✓ 所有语言文件更新完成！');
console.log('\n注意：新增的key使用英文作为占位符，建议后续进行人工翻译优化。');
