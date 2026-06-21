/**
 * 自动翻译 i18n 文件的脚本
 * 使用英文翻译作为源，为其他语言创建翻译
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const SOURCE_LANG = 'en-US';

// 需要翻译的语言列表
const TARGET_LANGS = [
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'zh-TW', name: 'Traditional Chinese' },
  { code: 'de-DE', name: 'German' },
  { code: 'fr-FR', name: 'French' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'ar-SA', name: 'Arabic' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'th-TH', name: 'Thai' },
  { code: 'vi-VN', name: 'Vietnamese' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'nl-NL', name: 'Dutch' },
  { code: 'pl-PL', name: 'Polish' },
  { code: 'tr-TR', name: 'Turkish' },
];

const NAMESPACES = [
  'common',
  'rename',
  'asciiArt',
  'videoTool',
  'settings',
  'errors',
];

// 简单的翻译映射（实际项目中应该使用翻译 API）
const translations: Record<string, Record<string, string>> = {
  'ja-JP': {
    // common
    'actions.save': '保存',
    'actions.cancel': 'キャンセル',
    'actions.confirm': '確認',
    'actions.delete': '削除',
    'actions.retry': '再試行',
    'actions.rename': '名前を変更',
    'actions.copy': 'コピー',
    'actions.export': 'エクスポート',
    'actions.import': 'インポート',
    'actions.refresh': '更新',
    'actions.reset': 'リセット',
    'actions.add': '追加',
    'actions.remove': '削除',
    'actions.edit': '編集',
    'actions.close': '閉じる',
    'actions.open': '開く',
    'actions.browse': '参照',
    'actions.search': '検索',
    'actions.filter': 'フィルター',
    'actions.clear': 'クリア',
    'actions.undo': '元に戻す',
    'actions.redo': 'やり直し',
    'actions.apply': '適用',
    'actions.check': 'チェック',
    'status.loading': '読み込み中...',
    'status.success': '成功',
    'status.error': 'エラー',
    'status.idle': '準備完了',
    'status.processing': '処理中...',
    'status.completed': '完了',
    'status.cancelled': 'キャンセル済み',
    'status.paused': '一時停止',
    'status.waiting': '待機中...',
    'status.scanning': 'スキャン中...',
    'status.downloading': 'ダウンロード中...',
    'labels.file': 'ファイル',
    'labels.files': 'ファイル',
    'labels.folder': 'フォルダー',
    'labels.folders': 'フォルダー',
    'labels.directory': 'ディレクトリ',
    'labels.path': 'パス',
    'labels.name': '名前',
    'labels.newName': '新しい名前',
    'labels.type': 'タイプ',
    'labels.size': 'サイズ',
    'labels.status': 'ステータス',
    'labels.progress': '進捗',
    'labels.duration': '時間',
    'labels.format': 'フォーマット',
    'labels.quality': '品質',
    'labels.resolution': '解像度',
    'labels.bitrate': 'ビットレート',
    'labels.fps': 'FPS',
    'labels.codec': 'コーデック',
    'labels.encoder': 'エンコーダー',
    'labels.decoder': 'デコーダー',
    'labels.output': '出力',
    'labels.input': '入力',
    'labels.settings': '設定',
    'labels.options': 'オプション',
    'labels.parameters': 'パラメータ',
    'labels.preview': 'プレビュー',
    'labels.log': 'ログ',
    'labels.logs': 'ログ',
    'messages.noData': 'データなし',
    'messages.confirmDelete': '削除を確認しますか？',
    'messages.operationSuccess': '操作が成功しました',
    'messages.operationFailed': '操作が失敗しました',
    'messages.networkError': 'ネットワークエラー、後でもう一度お試しください',
    'messages.selectDirectory': 'ディレクトリを選択',
    'messages.parentDirectory': '親ディレクトリ',
    'messages.selectFile': 'ファイルを選択',
    'messages.selectFolder': 'フォルダーを選択',
    'messages.dropFilesHere': 'ここにファイルをドロップ',
    'messages.dropFolderHere': 'ここにフォルダーをドロップ',
    'messages.orClickToAdd': 'またはクリックして追加',
    'messages.loadingFiles': 'ファイルを読み込み中...',
    'messages.scanningFiles': 'ファイルをスキャン中...',
    'messages.calculatingSize': 'ディレクトリサイズを計算中',
    'messages.noFilesSelected': 'ファイルが選択されていません',
    'messages.noFolderSelected': 'フォルダーが選択されていません',
    'theme.light': 'ライト',
    'theme.dark': 'ダーク',
    'theme.system': 'システム',
    'theme.switchToLight': 'ライトモードに切り替え',
    'theme.switchToDark': 'ダークモードに切り替え',
    'navigation.rename': '名前を変更',
    'navigation.renameDesc': 'バッチファイル名変更',
    'navigation.asciiArt': 'ASCIIアート',
    'navigation.asciiArtDesc': '画像をASCIIアートに変換',
    'navigation.videoTool': 'ビデオツール',
    'navigation.videoToolDesc': 'ビデオ処理ツール',
    'navigation.settings': '設定',
    // settings
    'settings.title': '設定',
    'settings.appearance.title': '表示モード',
    'settings.appearance.light': 'ライト',
    'settings.appearance.dark': 'ダーク',
    'settings.appearance.system': 'システム',
    'settings.theme.title': 'カラーテーマ',
    'settings.theme.customColor': 'カスタムカラー',
    'settings.theme.colorPlaceholder': '#3b82f6 (HEX カラーコード)',
    'settings.theme.apply': '適用',
    'settings.theme.clear': 'クリア',
    'settings.theme.currentCustom': '現在のカスタム: {{color}}',
    'settings.language.title': '言語',
    'settings.language.label': 'インターフェース言語',
    'settings.update.title': 'バージョン情報と更新',
    'settings.update.appDescription': 'バッチ名前変更 / ASCIIアート / ビデオツール',
    'settings.update.currentVersion': '現在のインストールバージョン',
    'settings.update.updateStatus': '更新ステータス',
    'settings.update.autoCheck': '起動時に自動チェック',
    'settings.update.autoCheckDesc': 'アプリ起動時に新しいバージョンを自動チェック',
    'settings.update.status.idle': '下のボタンをクリックして新しいバージョンをチェック',
    'settings.update.status.checking': '更新をチェック中...',
    'settings.update.status.available': '新しいバージョンがあります',
    'settings.update.status.downloading': '更新をダウンロード中...',
    'settings.update.status.downloaded': '更新のダウンロード完了、アプリを再起動します...',
    'settings.update.status.installing': '更新をインストール中...',
    'settings.update.status.notAvailable': '現在のバージョン v{{version}} は最新です',
    'settings.update.status.error': '{{error}}',
    'settings.update.status.errorDefault': '更新のチェックに失敗しました。ネットワーク接続を確認してください',
    'settings.update.actions.checkUpdate': '更新をチェック',
    'settings.update.actions.downloadInstall': 'ダウンロードしてインストール',
    'settings.update.actions.recheck': '再チェック',
    'settings.update.buttons.checking': 'チェック中...',
    'settings.update.buttons.available': '新しいバージョン',
    'settings.update.buttons.downloading': 'ダウンロード中 {{progress}}',
    'settings.update.buttons.downloaded': 'ダウンロード完了',
    'settings.update.buttons.notAvailable': '最新',
    'settings.update.buttons.error': 'チェック失敗',
    'settings.update.buttons.recheck': '再チェック',
    'settings.update.buttons.checkUpdate': '更新をチェック',
  },
  'ko-KR': {
    // Korean translations
    'actions.save': '저장',
    'actions.cancel': '취소',
    'actions.confirm': '확인',
    'actions.delete': '삭제',
    'actions.retry': '재시도',
    'actions.rename': '이름 변경',
    'actions.copy': '복사',
    'actions.export': '내보내기',
    'actions.import': '가져오기',
    'actions.refresh': '새로고침',
    'actions.reset': '초기화',
    'actions.add': '추가',
    'actions.remove': '제거',
    'actions.edit': '편집',
    'actions.close': '닫기',
    'actions.open': '열기',
    'actions.browse': '찾아보기',
    'actions.search': '검색',
    'actions.filter': '필터',
    'actions.clear': '지우기',
    'actions.undo': '실행 취소',
    'actions.redo': '다시 실행',
    'actions.apply': '적용',
    'actions.check': '확인',
    'status.loading': '로딩 중...',
    'status.success': '성공',
    'status.error': '오류',
    'status.idle': '준비',
    'status.processing': '처리 중...',
    'status.completed': '완료',
    'status.cancelled': '취소됨',
    'status.paused': '일시정지',
    'status.waiting': '대기 중...',
    'status.scanning': '스캔 중...',
    'status.downloading': '다운로드 중...',
    'labels.file': '파일',
    'labels.files': '파일',
    'labels.folder': '폴더',
    'labels.folders': '폴더',
    'labels.directory': '디렉토리',
    'labels.path': '경로',
    'labels.name': '이름',
    'labels.newName': '새 이름',
    'labels.type': '유형',
    'labels.size': '크기',
    'labels.status': '상태',
    'labels.progress': '진행',
    'labels.duration': '시간',
    'labels.format': '형식',
    'labels.quality': '품질',
    'labels.resolution': '해상도',
    'labels.bitrate': '비트레이트',
    'labels.fps': 'FPS',
    'labels.codec': '코덱',
    'labels.encoder': '인코더',
    'labels.decoder': '디코더',
    'labels.output': '출력',
    'labels.input': '입력',
    'labels.settings': '설정',
    'labels.options': '옵션',
    'labels.parameters': '매개변수',
    'labels.preview': '미리보기',
    'labels.log': '로그',
    'labels.logs': '로그',
    'messages.noData': '데이터 없음',
    'messages.confirmDelete': '삭제를 확인하시겠습니까?',
    'messages.operationSuccess': '작업 성공',
    'messages.operationFailed': '작업 실패',
    'messages.networkError': '네트워크 오류, 나중에 다시 시도해 주세요',
    'messages.selectDirectory': '디렉토리 선택',
    'messages.parentDirectory': '상위 디렉토리',
    'messages.selectFile': '파일 선택',
    'messages.selectFolder': '폴더 선택',
    'messages.dropFilesHere': '여기에 파일을 드롭하세요',
    'messages.dropFolderHere': '여기에 폴더를 드롭하세요',
    'messages.orClickToAdd': '또는 클릭하여 추가',
    'messages.loadingFiles': '파일 로딩 중...',
    'messages.scanningFiles': '파일 스캔 중...',
    'messages.calculatingSize': '디렉토리 크기 계산 중',
    'messages.noFilesSelected': '파일이 선택되지 않았습니다',
    'messages.noFolderSelected': '폴더가 선택되지 않았습니다',
    'theme.light': '라이트',
    'theme.dark': '다크',
    'theme.system': '시스템',
    'theme.switchToLight': '라이트 모드로 전환',
    'theme.switchToDark': '다크 모드로 전환',
    'navigation.rename': '이름 변경',
    'navigation.renameDesc': '배치 파일 이름 변경',
    'navigation.asciiArt': 'ASCII 아트',
    'navigation.asciiArtDesc': '이미지를 ASCII 아트로 변환',
    'navigation.videoTool': '비디오 도구',
    'navigation.videoToolDesc': '비디오 처리 도구',
    'navigation.settings': '설정',
    // settings
    'settings.title': '설정',
    'settings.appearance.title': '표시 모드',
    'settings.appearance.light': '라이트',
    'settings.appearance.dark': '다크',
    'settings.appearance.system': '시스템',
    'settings.theme.title': '색상 테마',
    'settings.theme.customColor': '사용자 정의 색상',
    'settings.theme.colorPlaceholder': '#3b82f6 (HEX 색상 코드)',
    'settings.theme.apply': '적용',
    'settings.theme.clear': '지우기',
    'settings.theme.currentCustom': '현재 사용자 정의: {{color}}',
    'settings.language.title': '언어',
    'settings.language.label': '인터페이스 언어',
    'settings.update.title': '정보 및 업데이트',
    'settings.update.appDescription': '배치 이름 변경 / ASCII 아트 / 비디오 도구',
    'settings.update.currentVersion': '현재 설치된 버전',
    'settings.update.updateStatus': '업데이트 상태',
    'settings.update.autoCheck': '시작 시 자동 확인',
    'settings.update.autoCheckDesc': '앱 시작 시 새 버전 자동 확인',
    'settings.update.status.idle': '아래 버튼을 클릭하여 새 버전 확인',
    'settings.update.status.checking': '업데이트 확인 중...',
    'settings.update.status.available': '새 버전 사용 가능',
    'settings.update.status.downloading': '업데이트 다운로드 중...',
    'settings.update.status.downloaded': '업데이트 다운로드 완료, 앱을 재시작합니다...',
    'settings.update.status.installing': '업데이트 설치 중...',
    'settings.update.status.notAvailable': '현재 버전 v{{version}}은 최신입니다',
    'settings.update.status.error': '{{error}}',
    'settings.update.status.errorDefault': '업데이트 확인 실패, 네트워크 연결을 확인하세요',
    'settings.update.actions.checkUpdate': '업데이트 확인',
    'settings.update.actions.downloadInstall': '다운로드 및 설치',
    'settings.update.actions.recheck': '다시 확인',
    'settings.update.buttons.checking': '확인 중...',
    'settings.update.buttons.available': '새 버전',
    'settings.update.buttons.downloading': '다운로드 중 {{progress}}',
    'settings.update.buttons.downloaded': '다운로드 완료',
    'settings.update.buttons.notAvailable': '최신',
    'settings.update.buttons.error': '확인 실패',
    'settings.update.buttons.recheck': '다시 확인',
    'settings.update.buttons.checkUpdate': '업데이트 확인',
  },
  // 其他语言的翻译...
};

function translateObject(obj: any, langCode: string): any {
  if (typeof obj === 'string') {
    // 尝试从翻译映射中获取翻译
    const key = obj;
    const langTranslations = translations[langCode];
    if (langTranslations && langTranslations[key]) {
      return langTranslations[key];
    }
    // 如果没有翻译，返回空字符串（骨架）
    return '';
  }
  if (Array.isArray(obj)) {
    return obj.map(item => translateObject(item, langCode));
  }
  if (typeof obj === 'object' && obj !== null) {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = translateObject(obj[key], langCode);
    }
    return result;
  }
  return obj;
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
  console.log('Translating i18n files...');

  // 读取英文翻译作为源
  const sourceDir = path.join(LOCALES_DIR, SOURCE_LANG);

  for (const lang of TARGET_LANGS) {
    const langDir = path.join(LOCALES_DIR, lang.code);

    // 创建语言目录
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    // 为每个命名空间生成翻译文件
    for (const ns of NAMESPACES) {
      const sourceFile = path.join(sourceDir, `${ns}.json`);
      const targetFile = path.join(langDir, `${ns}.json`);

      if (fs.existsSync(sourceFile)) {
        const sourceContent = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
        const translated = translateObject(sourceContent, lang.code);
        fs.writeFileSync(targetFile, JSON.stringify(translated, null, 2), 'utf-8');
        console.log(`Translated: ${lang.code}/${ns}.json`);
      }
    }

    // 生成 index.ts
    const indexContent = generateIndexTs(lang.code);
    fs.writeFileSync(path.join(langDir, 'index.ts'), indexContent, 'utf-8');
    console.log(`Generated: ${lang.code}/index.ts`);
  }

  console.log('Done!');
}

main().catch(console.error);
