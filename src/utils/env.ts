export const getEnv = (key: string): string => {
  if (typeof window !== 'undefined' && (window as any).electron?.process?.env?.[key]) {
    return (window as any).electron.process.env[key];
  }
  return (import.meta.env as any)[key] || '';
};
