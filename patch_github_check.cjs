const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const githubCheckCode = `
app.get('/api/github/check-updates', async (req, res) => {
  const repo = String(req.query.repo || process.env.VITE_GITHUB_REPO || 'xwxwxxw/Launcher');
  const profileId = String(req.query.profileId || '');

  try {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const gitRes = await fetch(\`https://api.github.com/repos/\${repo}/releases/latest\`, {
      headers: { 'User-Agent': 'Layle-Minecraft-Launcher' }
    });

    if (gitRes.ok) {
      const release = await gitRes.json();
      const tagName = release.tag_name || 'latest';
      
      if (profile.last_sync_tag && profile.last_sync_tag !== tagName) {
        return res.json({ updateAvailable: true, tagName });
      }
      return res.json({ updateAvailable: false, tagName });
    } else {
      const commitRes = await fetch(\`https://api.github.com/repos/\${repo}/commits/main\`, {
        headers: { 'User-Agent': 'Layle-Minecraft-Launcher' }
      });
      if (commitRes.ok) {
        const commit = await commitRes.json();
        const sha = commit.sha;
        if (profile.last_sync_tag && profile.last_sync_tag !== sha) {
          return res.json({ updateAvailable: true, tagName: sha });
        }
        return res.json({ updateAvailable: false, tagName: sha });
      }
    }
    
    res.json({ updateAvailable: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
`;

code = code.replace("// Advanced GitHub profile synchronization with user data preservation", githubCheckCode + "\n// Advanced GitHub profile synchronization with user data preservation");

fs.writeFileSync('server.ts', code);
