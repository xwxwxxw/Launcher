with open('src/components/ElyAuthModal.tsx', 'r') as f:
    content = f.read()

handler = """
  const handleOfflineLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 3) {
      setError('Имя должно содержать минимум 3 символа');
      return;
    }
    
    // Для пиратки используем простой accessToken и фейковый UUID
    const offlineId = '00000000-0000-0000-0000-' + trimmed.toLowerCase().padEnd(12, '0').substring(0, 12);
    
    onSuccess({
      name: trimmed,
      id: offlineId,
      accessToken: 'offline-token'
    });
  };

"""

content = content.replace("  const handleOAuthLogin = async () => {", handler + "  const handleOAuthLogin = async () => {")

with open('src/components/ElyAuthModal.tsx', 'w') as f:
    f.write(content)
