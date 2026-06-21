import i18n from '@/i18n';

/// 应用错误接口
export interface AppError {
  code: string;
  message: string;
  params?: Record<string, unknown>;
}

/// 检查是否为应用错误
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

/// 获取翻译后的错误消息
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    // 尝试从翻译文件获取消息
    const translated = i18n.t(`errors.${error.code}`, error.params);
    // 如果翻译 key 不存在，返回原始消息
    if (translated === `errors.${error.code}`) {
      return error.message;
    }
    return translated;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return i18n.t('errors.UNKNOWN_ERROR');
}

/// 格式化错误消息（用于显示）
export function formatError(error: unknown): string {
  const message = getErrorMessage(error);
  return message || i18n.t('errors.UNKNOWN_ERROR');
}

/// 记录错误到控制台
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, error);
}

/// 处理 Tauri 命令错误
export function handleCommandError(command: string, error: unknown): string {
  logError(command, error);
  return getErrorMessage(error);
}
