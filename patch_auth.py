import re

with open('src/components/ElyAuthModal.tsx', 'r') as f:
    content = f.read()

# Add 'offline' to authMethod state
content = content.replace("const [authMethod, setAuthMethod] = useState<'password' | 'oauth'>('password');", 
                          "const [authMethod, setAuthMethod] = useState<'password' | 'oauth' | 'offline'>('offline');")

# Add offline login handler before handleOAuthLogin
offline_handler = """
  const handleOfflineLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 3) {
      setError('Имя должно содержать минимум 3 символа');
      return;
    }
    
    // Для пиратки используем простой accessToken и фейковый UUID
    // В идеале UUID оффлайн игрока - это MD5 хэш от "OfflinePlayer:" + name
    // Но для лаунчера достаточно простого уникального ID
    const offlineId = '00000000-0000-0000-0000-' + trimmed.toLowerCase().padEnd(12, '0').substring(0, 12);
    
    onSuccess({
      name: trimmed,
      id: offlineId,
      accessToken: 'offline-token'
    });
  };
"""
content = content.replace("const handleOAuthLogin = async () => {", offline_handler + "\n  const handleOAuthLogin = async () => {")

# Add the Offline button in the tabs
tabs = """
              <button
                type="button"
                onClick={() => { setAuthMethod('offline'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                  authMethod === 'offline'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    ? 'bg-zinc-800 text-white shadow-sm'
"""
# Need to replace the tab buttons properly.
