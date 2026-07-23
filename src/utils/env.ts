const DEFAULT_FALLBACKS: Record<string, string> = {
  VITE_GDRIVE_API_KEY: 'AIzaSyAvBduoyDjqZu3t_S8w7i8Qdl5e3SoHcok',
  GDRIVE_API_KEY: 'AIzaSyAvBduoyDjqZu3t_S8w7i8Qdl5e3SoHcok',
  VITE_GDRIVE_FOLDER_ID: '1QaiLoo_bUEENvwkBogWPeerAU_VxrTFz',
  GDRIVE_FOLDER_ID: '1QaiLoo_bUEENvwkBogWPeerAU_VxrTFz',
  VITE_GITHUB_REPO: 'xwxwxxw/Launcher',
  GITHUB_REPO: 'xwxwxxw/Launcher'
};

export const getEnv = (key: string): string => {
  let val = '';
  let source = 'none';

  if (typeof window !== 'undefined' && (window as any).electron?.process?.env?.[key]) {
    val = (window as any).electron.process.env[key];
    source = 'electron.process.env';
  } else if ((import.meta.env as any)?.[key]) {
    val = (import.meta.env as any)[key];
    source = 'import.meta.env';
  } else if (DEFAULT_FALLBACKS[key]) {
    val = DEFAULT_FALLBACKS[key];
    source = 'default_fallback';
  }

  if (typeof window !== 'undefined') {
    console.log(`[getEnv] Key "${key}" -> Resolved from [${source}]: ${val ? 'PRESENT' : 'EMPTY'}`);
  }

  return val || '';
};
