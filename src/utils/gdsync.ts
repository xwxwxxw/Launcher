/**
 * GDSync Service & Utility Functions
 * Handles Google Drive synchronization states, environment detection, and robust API communications with timeouts.
 */

export interface EnvInfo {
  isElectron: boolean;
  isAIStudio: boolean;
  isWeb: boolean;
  environmentName: 'AI Studio Preview' | 'Electron Desktop Client' | 'Web Browser';
}

/**
 * Explicitly detects and returns information about the current runtime environment.
 * Helps distinguish between AI Studio (web applet preview/iframe) and the local Electron executable.
 */
export const getEnvironmentInfo = (): EnvInfo => {
  const isElectron = typeof window !== 'undefined' && !!(window as any).electron;
  
  // AI Studio runs in Google Cloud Run container URLs like ais-dev-*.run.app or ais-pre-*.run.app
  const isAIStudio = typeof window !== 'undefined' && 
    !isElectron && 
    (window.location.hostname.includes('run.app') || 
     window.location.hostname.includes('aistudio') || 
     window.location.hostname.includes('localhost') && !isElectron);

  const isWeb = !isElectron;

  return {
    isElectron,
    isAIStudio,
    isWeb,
    environmentName: isElectron 
      ? 'Electron Desktop Client' 
      : (isAIStudio ? 'AI Studio Preview' : 'Web Browser')
  };
};

/**
 * Performs a standard fetch operation with an explicit request timeout.
 * Prevents UI hanging or indefinite pending states during API calls to Google Drive.
 */
export const fetchWithTimeout = async (
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> => {
  const { timeout = 10000, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Превышено время ожидания ответа от сервера (${timeout / 1000} сек).`);
    }
    throw error;
  }
};

export interface SyncState {
  isSyncing: boolean;
  progress: number;
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastError: string | null;
  lastSyncTime: string | null;
}

type SyncStateListener = (state: SyncState) => void;

/**
 * Shared synchronization state class to bridge UI components and processes.
 */
class GDSyncStateManager {
  private state: SyncState = {
    isSyncing: false,
    progress: 0,
    status: 'idle',
    lastError: null,
    lastSyncTime: null
  };
  
  private listeners = new Set<SyncStateListener>();

  public getState(): SyncState {
    return { ...this.state };
  }

  public updateState(newState: Partial<SyncState>) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  public subscribe(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    // Initial call
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = { ...this.state };
    this.listeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('Error notifying GDSync state listener:', err);
      }
    });
  }
}

export const gdsyncState = new GDSyncStateManager();

/**
 * Checks for GDSync updates with robust error handling and timeout.
 */
export const checkGDriveUpdatesWithTimeout = async (
  profile: any,
  checkEnabled: boolean,
  minecraftPath: string
): Promise<{ hasUpdates: boolean; error?: string }> => {
  if (!checkEnabled || !profile || (profile.syncSource !== 'gdrive' && profile.id !== 'GDSync')) {
    return { hasUpdates: false };
  }

  const folderId = profile.gdriveFolderId || '';
  const clientToken = (import.meta as any).env.VITE_GDRIVE_API_KEY || '';
  
  // Build query params
  const query = new URLSearchParams({
    folderId,
    token: clientToken,
    profileId: profile.id,
    minecraftPath,
    _t: Date.now().toString()
  });

  const url = `/api/gdrive/check-updates?${query.toString()}`;

  let attempts = 3;
  let delay = 1000;
  let lastError: any = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      // Check with a robust 12 seconds timeout to handle slow Google API response or server wakeups
      const response = await fetchWithTimeout(url, { timeout: 12000 });
      const text = await response.text();

      // If the response is not ok (e.g. 500, 401, 502, etc.)
      if (!response.ok) {
        let serverErrorMsg = '';
        try {
          const errObj = JSON.parse(text);
          serverErrorMsg = errObj.error || errObj.message || '';
        } catch {
          // Not JSON (e.g. gateway HTML page)
        }
        
        // Don't retry client-side config errors like 401 Unauthorized or 404 Not Found
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          return {
            hasUpdates: false,
            error: serverErrorMsg 
              ? `Ошибка аутентификации или настройки: ${serverErrorMsg}`
              : `Ошибка ${response.status} при обращении к серверу.`
          };
        }

        const details = serverErrorMsg ? `: ${serverErrorMsg}` : ` (код ${response.status})`;
        throw new Error(`Сервер вернул ошибку проверки обновлений${details}`);
      }

      // Try to parse JSON from the response text
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        console.warn(`[GDSync] Response is not valid JSON on attempt ${attempt}:`, text.substring(0, 150));
        throw new Error('Сервер вернул некорректный ответ (не JSON). Возможно, сервер перезагружается.');
      }

      // Success!
      return { hasUpdates: !!data.updateAvailable };

    } catch (error: any) {
      lastError = error;
      console.warn(`[GDSync] Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < attempts) {
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5;
      }
    }
  }

  // All attempts failed
  return {
    hasUpdates: false,
    error: lastError ? lastError.message : 'Не удалось получить обновления после нескольких попыток.'
  };
};
