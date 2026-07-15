const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

// Add pending auth variable at the top
content = content.replace(
  `const TRANSLATIONS: Record<string, string> = {`,
  `let pendingElyAuth: any = null;\nconst TRANSLATIONS: Record<string, string> = {`
);

// In handleElyCallback, store it
content = content.replace(
  `            const profile = \${JSON.stringify(profile)};`,
  `            const profile = \${JSON.stringify(profile)};\n            fetch('/api/auth/ely/success', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(profile) }).catch(()=>{});`
);

// Add the success and status endpoints
content = content.replace(
  `app.get('/api/auth/ely/callback/', handleElyCallback);`,
  `app.get('/api/auth/ely/callback/', handleElyCallback);\n
app.post('/api/auth/ely/success', express.json(), (req, res) => {
  pendingElyAuth = req.body;
  res.json({ success: true });
});

app.get('/api/auth/ely/status', (req, res) => {
  if (pendingElyAuth) {
    const profile = pendingElyAuth;
    pendingElyAuth = null;
    res.json({ success: true, profile });
  } else {
    res.json({ success: false });
  }
});`
);

fs.writeFileSync('server.ts', content);
