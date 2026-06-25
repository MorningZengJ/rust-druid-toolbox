import { listen as tauriListen, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * 统一事件订阅包装。
 * 返回稳定 unsubscribe 函数（非 Promise），避免 store/page 直接散落 listen。
 */
export async function subscribe<T = unknown>(
  event: string,
  handler: (payload: T) => void,
): Promise<UnlistenFn> {
  return tauriListen<T>(event, (e) => handler(e.payload));
}

/**
 * 批量订阅一组事件，返回统一取消函数。
 */
export async function subscribeMany(
  subscriptions: Array<{ event: string; handler: (payload: unknown) => void }>,
): Promise<UnlistenFn> {
  const unlisteners = await Promise.all(
    subscriptions.map(({ event, handler }) => subscribe(event, handler)),
  );
  return () => unlisteners.forEach((unlisten) => unlisten());
}
