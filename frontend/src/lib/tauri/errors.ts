/**
 * 前端 API 层统一错误。
 * 目前保持简单；后续可扩展 error code 枚举。
 */
export class ApiError extends Error {
  readonly command?: string;
  readonly cause?: unknown;

  constructor(message: string, command?: string, cause?: unknown) {
    super(message);
    this.name = "ApiError";
    this.command = command;
    this.cause = cause;
  }

  /** 从 unknown throwable 创建 ApiError */
  static from(command: string, err: unknown): ApiError {
    const message = err instanceof Error ? err.message : String(err);
    return new ApiError(`[${command}] ${message}`, command, err);
  }
}
