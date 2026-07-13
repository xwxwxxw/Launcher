const fs = require('fs');
const path = require('path');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `app.get('/api/minecraft/status', (req, res) => {`;

const logsScreensEndpoints = `
// ==================== LOGS & SCREENSHOTS ====================

app.get('/api/minecraft/logs', (req, res) => {
  const { profileId } = req.query;
  const profile = profiles.find(p => p.id === profileId);
  const profileDir = path.resolve(process.cwd(), \`./profiles/\${profileId || '1'}/.minecraft\`);
  
  const logPath = path.join(profileDir, 'logs', 'latest.log');
  
  if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, 'utf8');
    res.json({ content });
  } else {
    // Check crash reports?
    const crashDir = path.join(profileDir, 'crash-reports');
    if (fs.existsSync(crashDir)) {
      const files = fs.readdirSync(crashDir).filter(f => f.endsWith('.txt')).sort();
      if (files.length > 0) {
        const crashPath = path.join(crashDir, files[files.length - 1]);
        const crashContent = fs.readFileSync(crashPath, 'utf8');
        return res.json({ content: \`Лог latest.log не найден.\\nПоследний краш-репорт:\\n\\n\${crashContent}\` });
      }
    }
    res.json({ content: 'Лог-файл не найден. Запустите игру хотя бы один раз.' });
  }
});

app.post('/api/minecraft/open-logs-folder', async (req, res) => {
  const { profileId } = req.query;
  const profileDir = path.resolve(process.cwd(), \`./profiles/\${profileId || '1'}/.minecraft\`);
  const logsDir = path.join(profileDir, 'logs');
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Use Electron shell.openPath if available, otherwise just try to open it somehow
  try {
    const { shell } = require('electron');
    if (shell) await shell.openPath(logsDir);
  } catch (e) {
    // maybe it's just web?
  }
  res.json({ success: true });
});

app.get('/api/minecraft/screenshots', (req, res) => {
  const { profileId, globalPath } = req.query;
  // Minecraft usually saves screenshots in isolated dir or global if not isolated.
  const profileDir = path.resolve(process.cwd(), \`./profiles/\${profileId || '1'}/.minecraft\`);
  const screenshotsDir = path.join(profileDir, 'screenshots');
  
  if (!fs.existsSync(screenshotsDir)) {
    return res.json({ screenshots: [] });
  }
  
  try {
    const files = fs.readdirSync(screenshotsDir)
      .filter(f => f.endsWith('.png'))
      .map(f => {
        const filePath = path.join(screenshotsDir, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          date: stats.mtimeMs,
          // We can read it and send as base64 to display in UI
          url: 'data:image/png;base64,' + fs.readFileSync(filePath, 'base64')
        };
      })
      .sort((a, b) => b.date - a.date);
      
    res.json({ screenshots: files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/minecraft/screenshots/delete', (req, res) => {
  const { paths } = req.body;
  if (Array.isArray(paths)) {
    for (const p of paths) {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    }
  }
  res.json({ success: true });
});

app.post('/api/minecraft/open-screenshots-folder', async (req, res) => {
  const { profileId } = req.query;
  const profileDir = path.resolve(process.cwd(), \`./profiles/\${profileId || '1'}/.minecraft\`);
  const dir = path.join(profileDir, 'screenshots');
  
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  try {
    const { shell } = require('electron');
    if (shell) await shell.openPath(dir);
  } catch (e) {}
  res.json({ success: true });
});

app.post('/api/minecraft/open-game-folder', async (req, res) => {
  const { profileId } = req.query;
  const profileDir = path.resolve(process.cwd(), \`./profiles/\${profileId || '1'}/.minecraft\`);
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
  try {
    const { shell } = require('electron');
    if (shell) await shell.openPath(profileDir);
  } catch (e) {}
  res.json({ success: true });
});

// ============================================================

app.get('/api/minecraft/status', (req, res) => {`;

code = code.replace(target, logsScreensEndpoints);
fs.writeFileSync('server.ts', code);
