const fs = require('fs');

let content = fs.readFileSync('src/components/ElyAuthModal.tsx', 'utf-8');

// We will change handleBrowserAuth
const newBrowserAuth = `  const handleBrowserAuth = async () => {
    setLoading(true);
    setError('');

    try {
      // Build parameters
      const params = new URLSearchParams();
      params.append('origin', window.location.origin);
      if (useCustomOAuth && customClientId) {
        params.append('client_id', customClientId);
      }
      if (useCustomOAuth && customClientSecret) {
        params.append('client_secret', customClientSecret);
      }

      const res = await fetch(\`/api/auth/ely/url?\${params.toString()}\`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось получить ссылку авторизации.');
      }

      if (typeof window !== 'undefined' && (window as any).require) {
        const { shell } = (window as any).require('electron');
        shell.openExternal(data.url);
      } else {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        window.open(data.url, 'ely_oauth_popup', \`width=\${width},height=\${height},top=\${top},left=\${left},scrollbars=yes\`);
      }
      
      // Poll the local server to check if the user completed auth in the system browser
      const checkStatus = setInterval(async () => {
        try {
          const statusRes = await fetch('/api/auth/ely/status');
          const statusData = await statusRes.json();
          if (statusData.success && statusData.profile) {
            clearInterval(checkStatus);
            onSuccess(statusData.profile);
            onClose();
          }
        } catch(e) {}
      }, 1500);

      // Timeout after 5 minutes
      setTimeout(() => clearInterval(checkStatus), 5 * 60 * 1000);

    } catch (err: any) {
      setError(err.message || 'Ошибка запуска браузерной авторизации.');
    } finally {
      setLoading(false);
    }
  };`;

// Replace handleBrowserAuth entirely
content = content.replace(/  const handleBrowserAuth = async \(\) => \{[\s\S]*?\}\s*catch \(err: any\) \{[\s\S]*?setLoading\(false\);\n    \}\n  \};/, newBrowserAuth);

fs.writeFileSync('src/components/ElyAuthModal.tsx', content);
