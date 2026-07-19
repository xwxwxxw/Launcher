const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const githubCheckCode = `
  const [githubUpdateAvailable, setGithubUpdateAvailable] = useState(false);
  const [checkingGithub, setCheckingGithub] = useState(false);

  const checkGithubUpdates = async (profileToCheck: any) => {
    if (!profileToCheck || (profileToCheck.syncSource !== 'github' && !profileToCheck.is_github_sync && profileToCheck.id !== 'GDSync')) {
      setGithubUpdateAvailable(false);
      return;
    }

    // Skip if it's explicitly GDrive
    if (profileToCheck.syncSource === 'gdrive') {
      setGithubUpdateAvailable(false);
      return;
    }

    setCheckingGithub(true);
    try {
      const repo = (import.meta as any).env.VITE_GITHUB_REPO || 'xwxwxxw/Launcher';
      const res = await fetch(\`/api/github/check-updates?profileId=\${encodeURIComponent(profileToCheck.id)}&repo=\${encodeURIComponent(repo)}\`);
      
      if (res.ok) {
        const data = await res.json();
        if (data.updateAvailable) {
          setGithubUpdateAvailable(true);
          
          const autoSync = localStorage.getItem('launcher_github_auto_sync') !== 'false';
          if (autoSync) {
            setShowSyncModal(true);
          }
        } else {
          setGithubUpdateAvailable(false);
        }
      }
    } catch (e) {
      console.error('Error checking Github updates:', e);
    } finally {
      setCheckingGithub(false);
    }
  };
`;

code = code.replace("const fetchProfiles = async () => {", githubCheckCode + "\n  const fetchProfiles = async () => {");

fs.writeFileSync('src/App.tsx', code);
