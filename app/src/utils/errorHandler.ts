/**
 * 统一错误处理工具
 */

/**
 * 显示友好的错误提示
 */
export function showError(message: string): void {
  // 优先使用 alert，后续可替换为 Toast 组件
  alert(message);
}

/**
 * 处理 API 请求错误
 */
export function handleApiError(error: unknown, fallbackMessage: string = '操作失败，请稍后重试'): void {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      showError('请求超时，请检查网络连接');
      return;
    }
    
    // 网络错误
    if (error.message.includes('fetch') || error.message.includes('network')) {
      showError('网络连接失败，请检查网络');
      return;
    }
    
    showError(error.message || fallbackMessage);
  } else {
    showError(fallbackMessage);
  }
}

/**
 * 安全的异步操作包装器
 */
export async function safeAsync<T>(
  asyncFn: () => Promise<T>,
  errorMessage: string = '操作失败'
): Promise<T | null> {
  try {
    return await asyncFn();
  } catch (error) {
    handleApiError(error, errorMessage);
    return null;
  }
}